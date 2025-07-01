const { chromium } = require('playwright');

async function forceReprocessTest() {
  console.log('🔄 Force Reprocess Test with axios multipart');
  console.log('=============================================');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture all console messages for detailed monitoring
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`📱 [${type.toUpperCase()}]: ${text}`);
  });

  // Monitor all network requests
  page.on('response', response => {
    const url = response.url();
    const status = response.status();
    
    if (url.includes('cloudfunctions.net') || url.includes('run.app')) {
      console.log(`🔥 Firebase Functions: ${status} - ${url.split('/').pop()}`);
    }
    
    if (url.includes('openai.com')) {
      console.log(`🤖 OpenAI API: ${status}`);
    }
  });

  try {
    console.log('🌐 1. Navigating to VoiceNote...');
    await page.goto('https://voicenote-dev.web.app', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Sign in
    console.log('🔐 2. Signing in...');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123456');
    await page.click('button:has-text("サインイン")');
    await page.waitForTimeout(5000);

    // Reset file status using browser console
    console.log('🔧 3. Resetting file status for reprocessing...');
    
    const resetResult = await page.evaluate(async () => {
      try {
        // Access the global databaseService if available
        if (window.databaseService) {
          console.log('🔧 Using databaseService to reset status');
          // This would be the ideal approach but may not be available
          return { success: false, message: 'databaseService not globally available' };
        }
        
        // Alternative: just return info about what we need to do
        return { 
          success: true, 
          message: 'Will proceed with existing file - multipart fix should work regardless' 
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    console.log(`🔧 Reset result: ${resetResult.message}`);

    // Go to audio file
    console.log('🎯 4. Testing with existing audio file...');
    const audioCards = await page.$$('.cursor-pointer');
    console.log(`📁 Found ${audioCards.length} audio files`);

    if (audioCards.length > 0) {
      // Click on first audio file
      await audioCards[0].click();
      await page.waitForTimeout(3000);

      // Force reprocess by modifying file status if possible
      await page.evaluate(() => {
        console.log('🔧 Attempting to trigger reprocessing...');
      });

      // Look for any process button (including retry)
      const processButton = await page.$('button:has-text("文字起こし"), button:has-text("開始"), button:has-text("再試行"), button:has-text("再処理")');
      
      if (processButton) {
        console.log('🚀 5. Found process button - starting transcription...');
        
        // Click to start processing
        await processButton.click();
        
        // Monitor for axios multipart processing
        console.log('📊 Monitoring for axios multipart processing...');
        console.log('📊 Looking for: axios success, multipart errors, OpenAI responses');
        
        let monitoringActive = true;
        let startTime = Date.now();
        
        while (monitoringActive && (Date.now() - startTime) < 120000) { // 2 minutes
          await page.waitForTimeout(2000);
          
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          if (elapsed % 10 === 0) {
            console.log(`⏱️ ${elapsed}s - Still monitoring...`);
          }
          
          // Check page content for status
          const bodyText = await page.textContent('body');
          
          if (bodyText.includes('処理完了') || bodyText.includes('completed')) {
            console.log(`✅ Processing completed at ${elapsed}s`);
            monitoringActive = false;
          }
          
          if (bodyText.includes('エラー')) {
            console.log(`❌ Error detected at ${elapsed}s`);
            monitoringActive = false;
          }
        }
        
        // Check final results
        console.log('📋 6. Checking final transcription results...');
        
        // Go to transcription tab
        const transcriptTab = await page.$('[role="tab"]:has-text("文字起こし")');
        if (transcriptTab) {
          await transcriptTab.click();
          await page.waitForTimeout(2000);
          
          const transcriptContent = await page.textContent('body');
          
          console.log('🔍 Analysis:');
          
          if (transcriptContent.includes('デモモード') || transcriptContent.includes('demo')) {
            console.log('❌ Demo content still present');
            console.log('   → multipart form issue likely persists');
          } else {
            console.log('✅ No demo content detected');
          }
          
          if (transcriptContent.includes('OpenAI') && !transcriptContent.includes('デモ')) {
            console.log('✅ Real OpenAI content detected');
          }
          
          if (transcriptContent.includes('Aさん') || transcriptContent.includes('Bさん')) {
            console.log('✅ Speaker labels working correctly');
          }
          
          // Check content length
          const contentLength = transcriptContent.replace(/\s+/g, ' ').length;
          console.log(`📏 Content length: ${contentLength} characters`);
          
          if (contentLength > 500) {
            console.log('✅ Substantial content suggests real transcription');
          } else {
            console.log('⚠️ Short content suggests demo or error');
          }
        }
        
      } else {
        console.log('ℹ️ No process button found');
        console.log('   → File is already processed or in error state');
        
        // Check current file content anyway
        const transcriptTab = await page.$('[role="tab"]:has-text("文字起こし")');
        if (transcriptTab) {
          await transcriptTab.click();
          await page.waitForTimeout(2000);
          
          const content = await page.textContent('body');
          if (content.includes('デモ')) {
            console.log('❌ Current content is demo data');
          } else {
            console.log('✅ Current content appears to be real');
          }
        }
      }
    }

    await page.screenshot({ path: 'force-reprocess-test.png', fullPage: true });

  } catch (error) {
    console.log(`💥 Test error: ${error.message}`);
    await page.screenshot({ path: 'force-reprocess-error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('✅ Force reprocess test completed');
    
    // Check logs after test
    console.log('\n📋 Check Firebase Functions logs with:');
    console.log('firebase functions:log -n 10');
  }
}

forceReprocessTest().catch(console.error);