const { chromium } = require('playwright');

async function fixApiSettings() {
  console.log('🔧 Fixing API Settings and Testing Transcription');
  console.log('===============================================');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Monitor console for API-related messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('API') || text.includes('test') || text.includes('connection') || 
        text.includes('Firebase Functions') || msg.type() === 'error') {
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

    console.log('⚙️ 2. Configuring API settings...');
    await page.goto('https://voicenote-dev.web.app/settings/api');
    await page.waitForTimeout(3000);

    // Configure Speech API
    console.log('🎤 Setting up Speech API...');
    const speechTab = await page.$('[role="tab"]:has-text("音声認識API")');
    if (speechTab) {
      await speechTab.click();
      await page.waitForTimeout(2000);
      
      const speechKeyField = await page.$('#speechApiKey');
      if (speechKeyField) {
        const currentSpeechValue = await speechKeyField.inputValue();
        console.log(`Current speech API key: ${currentSpeechValue ? currentSpeechValue.substring(0, 20) + '...' : 'empty'}`);
        
        if (!currentSpeechValue || currentSpeechValue.includes('test')) {
          // Use a real OpenAI API key format (you need to replace with actual key)
          await speechKeyField.fill('sk-proj-your-real-openai-api-key-here');
          console.log('🔑 Set speech API key');
        }
      }
    }

    // Configure LLM API  
    console.log('🧠 Setting up LLM API...');
    const llmTab = await page.$('[role="tab"]:has-text("LLM")');
    if (llmTab) {
      await llmTab.click();
      await page.waitForTimeout(2000);
      
      const llmKeyField = await page.$('#llmApiKey');
      if (llmKeyField) {
        const currentLlmValue = await llmKeyField.inputValue();
        console.log(`Current LLM API key: ${currentLlmValue ? currentLlmValue.substring(0, 20) + '...' : 'empty'}`);
        
        if (!currentLlmValue || currentLlmValue.includes('test')) {
          // Use the same OpenAI API key for LLM
          await llmKeyField.fill('sk-proj-your-real-openai-api-key-here');
          console.log('🔑 Set LLM API key');
        }
      }
    }

    // Save settings
    console.log('💾 Saving API settings...');
    const saveButton = await page.$('button:has-text("設定を保存")');
    if (saveButton) {
      await saveButton.click();
      await page.waitForTimeout(3000);
      console.log('✅ Settings saved');
    }

    // Test transcription functionality
    console.log('🔄 3. Testing transcription functionality...');
    await page.goto('https://voicenote-dev.web.app');
    await page.waitForTimeout(3000);

    // Find audio files
    const audioCards = await page.$$('.cursor-pointer');
    console.log(`📁 Found ${audioCards.length} audio files`);
    
    if (audioCards.length > 0) {
      // Click on the sample meeting audio file
      console.log('🎯 Clicking on sample meeting audio...');
      await audioCards[0].click();
      await page.waitForTimeout(3000);

      // Check file status and button state
      const pageContent = await page.textContent('body');
      console.log(`📊 Page contains:
        - 文字起こし button: ${pageContent.includes('文字起こし')}
        - 再試行 button: ${pageContent.includes('再試行')}
        - Error status: ${pageContent.includes('エラー')}`);

      // Try to find transcription button
      const transcriptButtons = await page.$$('button');
      let transcriptButton = null;
      
      for (const button of transcriptButtons) {
        const buttonText = await button.textContent();
        const isEnabled = await button.isEnabled();
        console.log(`🔘 Button: "${buttonText.trim()}" (${isEnabled ? 'enabled' : 'disabled'})`);
        
        if (buttonText.includes('文字起こし') || buttonText.includes('再試行')) {
          transcriptButton = button;
          console.log(`🎯 Found transcription button: "${buttonText.trim()}" (${isEnabled ? 'enabled' : 'disabled'})`);
          break;
        }
      }

      if (transcriptButton) {
        const isEnabled = await transcriptButton.isEnabled();
        
        if (isEnabled) {
          console.log('🚀 Starting transcription...');
          await transcriptButton.click();
          
          // Monitor transcription process
          console.log('📊 Monitoring transcription progress...');
          let processStarted = false;
          
          for (let i = 0; i < 60; i++) {
            await page.waitForTimeout(1000);
            const bodyText = await page.textContent('body');
            
            if (bodyText.includes('Firebase Functions で処理を開始')) {
              if (!processStarted) {
                console.log(`📍 ${i}s: ✅ Firebase Functions processing started!`);
                processStarted = true;
              }
            }
            
            if (bodyText.includes('処理中')) {
              console.log(`📍 ${i}s: Processing in progress...`);
            }
            
            if (bodyText.includes('完了')) {
              console.log(`📍 ${i}s: ✅ Processing completed!`);
              break;
            }
            
            if (bodyText.includes('エラー') && i > 5) {
              console.log(`📍 ${i}s: ❌ Error detected during processing`);
              break;
            }
            
            if (i % 10 === 0 && i > 0) {
              console.log(`⏱️ ${i}s elapsed...`);
            }
          }
          
          // Check final results
          console.log('🔍 Checking final transcription results...');
          await page.waitForTimeout(3000);
          
          const finalContent = await page.textContent('body');
          if (finalContent.includes('Aさん') || finalContent.includes('Bさん')) {
            console.log('✅ Real transcription with speaker recognition detected!');
          } else if (finalContent.includes('デモ')) {
            console.log('⚠️ Still showing demo content');
          } else {
            console.log('📄 Transcription status unclear, checking tabs...');
            
            // Try to click transcription tab
            const transcriptTab = await page.$('[role="tab"]:has-text("文字起こし")');
            if (transcriptTab) {
              await transcriptTab.click();
              await page.waitForTimeout(2000);
              
              const transcriptContent = await page.textContent('body');
              console.log(`📄 Transcript content preview: ${transcriptContent.substring(0, 200)}...`);
            }
          }
          
        } else {
          console.log('❌ Transcription button is disabled');
          console.log('🔧 This likely means API keys are not properly configured or validated');
        }
      } else {
        console.log('❌ No transcription button found');
      }
    } else {
      console.log('❌ No audio files found');
    }

    await page.screenshot({ path: 'fix-api-settings-result.png', fullPage: true });

  } catch (error) {
    console.log(`💥 Error: ${error.message}`);
    await page.screenshot({ path: 'fix-api-settings-error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('✅ API settings fix and transcription test completed');
    
    console.log('\n📋 Next steps:');
    console.log('1. Replace placeholder API keys with real OpenAI API keys');
    console.log('2. Verify API keys are valid and have sufficient credits');
    console.log('3. Check Firebase Functions logs if transcription fails');
  }
}

fixApiSettings().catch(console.error);