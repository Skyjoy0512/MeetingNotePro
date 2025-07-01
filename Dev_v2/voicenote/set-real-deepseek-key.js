const { chromium } = require('playwright');

async function setRealDeepSeekKey() {
  console.log('🔑 Setting Real DeepSeek API Key');
  console.log('================================');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Monitor console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('API') || text.includes('Database') || text.includes('Generated')) {
      console.log(`📱 [${msg.type().toUpperCase()}]: ${text}`);
    }
  });

  try {
    console.log('🌐 1. Navigating and signing in...');
    await page.goto('https://voicenote-dev.web.app', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123456');
    await page.click('button:has-text("サインイン")');
    await page.waitForTimeout(4000);

    console.log('⚙️ 2. Setting real DeepSeek API key...');
    await page.goto('https://voicenote-dev.web.app/settings/api');
    await page.waitForTimeout(3000);

    // Set LLM to DeepSeek with real API key
    const llmTab = await page.$('[role="tab"]:has-text("LLM")');
    if (llmTab) {
      await llmTab.click();
      await page.waitForTimeout(2000);
      
      // Set provider to DeepSeek
      const providerButton = await page.$('[role="combobox"]');
      if (providerButton) {
        await providerButton.click();
        await page.waitForTimeout(1000);
        
        const deepseekOption = await page.$('[role="option"]:has-text("DeepSeek"), [role="option"]:has-text("deepseek")');
        if (deepseekOption) {
          await deepseekOption.click();
          await page.waitForTimeout(2000);
          console.log('✅ Provider set to DeepSeek');
        }
      }
      
      // Set real DeepSeek API key
      const llmKeyField = await page.$('#llmApiKey');
      if (llmKeyField) {
        await llmKeyField.fill('');
        await llmKeyField.type('sk-341866912d0b4c96a098830f66f9b19e');
        console.log('🔑 Set real DeepSeek API key: sk-341866...b19e');
      }
      
      // Save settings
      const saveButton = await page.$('button:has-text("設定を保存")');
      if (saveButton) {
        await saveButton.click();
        await page.waitForTimeout(5000);
        console.log('💾 Settings saved with real DeepSeek API key');
      }
    }

    console.log('🚀 3. Testing summary generation with real DeepSeek API...');
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
          console.log('🚀 Clicking summary generation button with real DeepSeek API...');
          await summaryButton.click();

          // Monitor for success/failure
          console.log('📊 Monitoring real DeepSeek API summary generation...');
          
          for (let i = 0; i < 120; i++) { // 2 minutes timeout
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
              if (i % 10 === 0) {
                console.log(`📍 ${i}s: 📊 Summary generation in progress`);
              }
            }
            
            // Check for specific errors
            if (bodyText.includes('401') || bodyText.includes('Unauthorized')) {
              console.log(`📍 ${i}s: ❌ API authentication error (401)`);
              break;
            }
            
            if (bodyText.includes('500')) {
              console.log(`📍 ${i}s: ❌ Server error (500)`);
              break;
            }
            
            if (i % 15 === 0 && i > 0) {
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
          console.log(`  - Has 500 error: ${finalContent.includes('500')}`);
          console.log(`  - Has success message: ${finalContent.includes('要約生成完了')}`);
          
          // Look for actual summary content
          if (finalContent.includes('全体要約')) {
            console.log('🎉 SUCCESS: Summary was generated successfully!');
            
            // Extract a bit of the summary content
            const summaryMatch = finalContent.match(/全体要約[\s\S]{0,200}/);
            if (summaryMatch) {
              console.log(`📄 Summary preview: ${summaryMatch[0].substring(0, 100)}...`);
            }
          }
          
        } else {
          console.log('❌ Summary button not found or disabled');
        }
      } else {
        console.log('❌ Summary tab not found or disabled');
      }
    }

    await page.screenshot({ path: 'set-real-deepseek-key.png', fullPage: true });

  } catch (error) {
    console.log(`💥 Error: ${error.message}`);
    await page.screenshot({ path: 'set-real-deepseek-key-error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('✅ Real DeepSeek API key test completed');
  }
}

setRealDeepSeekKey().catch(console.error);