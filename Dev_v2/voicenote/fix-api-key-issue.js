const { chromium } = require('playwright');

async function fixApiKeyIssue() {
  console.log('🔑 Fixing API Key Issue for Summary Generation');
  console.log('===============================================');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Monitor console messages
  page.on('console', msg => {
    const text = msg.text();
    console.log(`📱 [${msg.type().toUpperCase()}]: ${text}`);
  });

  try {
    console.log('🌐 1. Navigating and signing in...');
    await page.goto('https://voicenote-dev.web.app', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123456');
    await page.click('button:has-text("サインイン")');
    await page.waitForTimeout(4000);

    console.log('⚙️ 2. Setting valid API keys in settings...');
    await page.goto('https://voicenote-dev.web.app/settings/api');
    await page.waitForTimeout(3000);

    // Set Speech API (first check if already set)
    const speechTab = await page.$('[role="tab"]:has-text("音声認識API")');
    if (speechTab) {
      await speechTab.click();
      await page.waitForTimeout(2000);
      
      const speechKeyField = await page.$('#speechApiKey');
      if (speechKeyField) {
        const currentValue = await speechKeyField.inputValue();
        console.log(`🎤 Current speech API key: ${currentValue.substring(0, 10)}...`);
        
        if (!currentValue.startsWith('sk-proj-') && !currentValue.startsWith('sk-') || currentValue.length < 40) {
          await speechKeyField.fill('');
          await speechKeyField.type('sk-proj-valid-openai-api-key-for-testing-purposes-only-12345678');
          console.log('🎤 Updated speech API key');
        }
      }
    }

    // Set LLM API (this is the critical one for summary)
    const llmTab = await page.$('[role="tab"]:has-text("LLM")');
    if (llmTab) {
      await llmTab.click();
      await page.waitForTimeout(2000);
      
      const llmKeyField = await page.$('#llmApiKey');
      if (llmKeyField) {
        const currentValue = await llmKeyField.inputValue();
        console.log(`🧠 Current LLM API key: ${currentValue.substring(0, 10)}...`);
        
        // Always update the LLM key since it's failing
        await llmKeyField.fill('');
        await llmKeyField.type('sk-proj-valid-openai-api-key-for-testing-purposes-only-12345678');
        console.log('🧠 Updated LLM API key');
      }
    }

    // Save settings
    const saveButton = await page.$('button:has-text("設定を保存")');
    if (saveButton) {
      await saveButton.click();
      await page.waitForTimeout(5000); // Wait longer for saving
      console.log('💾 Settings saved');
    }

    console.log('🔬 3. Testing summary generation with new API key...');
    await page.goto('https://voicenote-dev.web.app');
    await page.waitForTimeout(3000);

    // Find and click audio file
    const audioCards = await page.$$('.cursor-pointer');
    if (audioCards.length > 0) {
      await audioCards[0].click();
      await page.waitForTimeout(3000);

      // Click summary tab
      const summaryTab = await page.$('[role="tab"]:has-text("要約")');
      if (summaryTab && await summaryTab.isEnabled()) {
        await summaryTab.click();
        await page.waitForTimeout(2000);

        // Click summary generation button
        const summaryButton = await page.$('button:has-text("要約を生成")');
        if (summaryButton && await summaryButton.isEnabled()) {
          console.log('🚀 Clicking summary generation button...');
          await summaryButton.click();

          // Monitor for success/failure
          console.log('📊 Monitoring summary generation...');
          
          for (let i = 0; i < 60; i++) { // Increased timeout to 60 seconds
            await page.waitForTimeout(1000);
            
            const bodyText = await page.textContent('body');
            
            if (bodyText.includes('要約生成でエラー')) {
              console.log(`📍 ${i}s: ❌ Summary generation error detected`);
              break;
            }
            
            if (bodyText.includes('要約生成完了')) {
              console.log(`📍 ${i}s: ✅ Summary generation completed successfully!`);
              break;
            }
            
            if (bodyText.includes('全体要約')) {
              console.log(`📍 ${i}s: ✅ Summary content detected!`);
              break;
            }
            
            if (bodyText.includes('要約生成中')) {
              console.log(`📍 ${i}s: 📊 Summary generation in progress`);
            }
            
            // Check for API authentication errors
            if (bodyText.includes('401') || bodyText.includes('Unauthorized')) {
              console.log(`📍 ${i}s: ❌ API authentication error (401)`);
              break;
            }
            
            if (i % 10 === 0 && i > 0) {
              console.log(`⏱️ ${i}s elapsed - still monitoring...`);
            }
          }
          
          // Check final result
          await page.waitForTimeout(3000);
          const finalContent = await page.textContent('body');
          
          console.log('📋 Final Analysis:');
          console.log(`  - Has error message: ${finalContent.includes('エラー')}`);
          console.log(`  - Has summary content: ${finalContent.includes('全体要約')}`);
          console.log(`  - Has 401 error: ${finalContent.includes('401')}`);
          console.log(`  - Has success message: ${finalContent.includes('要約生成完了')}`);
          
        } else {
          console.log('❌ Summary button not found or disabled');
        }
      } else {
        console.log('❌ Summary tab not found or disabled');
      }
    }

    await page.screenshot({ path: 'fix-api-key-issue.png', fullPage: true });

  } catch (error) {
    console.log(`💥 Error: ${error.message}`);
    await page.screenshot({ path: 'fix-api-key-issue-error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('✅ API key fix test completed');
    
    console.log('\n🔑 Next Steps:');
    console.log('1. If still failing, need to set a real valid OpenAI API key');
    console.log('2. Check if the API key is being properly saved to Firestore');
    console.log('3. Verify Firebase Functions is reading the updated API key');
  }
}

fixApiKeyIssue().catch(console.error);