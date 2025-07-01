const { chromium } = require('playwright');

async function uploadAndTestRealProcessing() {
  console.log('🎯 Upload and Test Real Processing with axios');
  console.log('==============================================');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture detailed processing logs
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    
    console.log(`📱 Console [${type.toUpperCase()}]: ${text}`);
  });

  // Monitor Firebase Functions calls
  page.on('response', response => {
    const url = response.url();
    const status = response.status();
    
    if (url.includes('cloudfunctions.net') || url.includes('run.app')) {
      console.log(`🔥 Firebase Functions: ${status} - ${url}`);
    }
    
    if (url.includes('openai.com')) {
      console.log(`🤖 OpenAI API: ${status} - ${url}`);
    }
    
    if (!response.ok() && status >= 400) {
      console.log(`❌ HTTP Error: ${status} - ${url}`);
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

    // Upload new audio file
    console.log('📤 3. Uploading sample audio file...');
    
    // Go to upload page or find upload button
    const uploadButton = await page.$('button:has-text("録音"), button:has-text("アップロード"), input[type="file"]');
    
    if (!uploadButton) {
      // Try to find upload via other means
      const addButton = await page.$('button:has-text("+"), [data-testid="upload-button"]');
      if (addButton) {
        await addButton.click();
        await page.waitForTimeout(2000);
      }
    }

    // Look for file input
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      const audioFilePath = '/Users/hashimotokenichi/Downloads/サンプル会議音声 [Vbwl01D7Y3Y].mp3';
      console.log(`📁 Uploading file: ${audioFilePath}`);
      
      await fileInput.setInputFiles(audioFilePath);
      await page.waitForTimeout(3000);
      
      // Wait for upload completion
      console.log('⏱️ Waiting for upload to complete...');
      await page.waitForTimeout(10000);
      
    } else {
      console.log('⚠️ File input not found - testing with existing file');
      
      // Reset existing file status for testing
      console.log('🔄 Resetting file status for testing...');
      
      // Find an audio file and reset its status
      const audioCards = await page.$$('.cursor-pointer');
      if (audioCards.length > 0) {
        await audioCards[0].click();
        await page.waitForTimeout(3000);
        
        // Reset via browser console (if needed)
        await page.evaluate(() => {
          console.log('🔧 Attempting to reset file status via browser...');
        });
      }
    }

    // Find the uploaded/reset audio file
    console.log('🎯 4. Finding audio file to process...');
    await page.goto('https://voicenote-dev.web.app');
    await page.waitForTimeout(3000);

    const audioCards = await page.$$('.cursor-pointer');
    console.log(`📁 Found ${audioCards.length} audio files`);

    if (audioCards.length > 0) {
      // Click on the first (most recent) audio file
      await audioCards[0].click();
      await page.waitForTimeout(3000);

      // Look for process button
      const processButton = await page.$('button:has-text("文字起こし"), button:has-text("開始"), button:has-text("再試行")');
      
      if (processButton) {
        console.log('🚀 5. Starting transcription with axios multipart...');
        
        // Click process button
        await processButton.click();
        
        // Monitor processing in detail
        console.log('📊 Monitoring processing with axios...');
        
        let multipartErrorCount = 0;
        let axiosSuccessDetected = false;
        let apiSuccessDetected = false;
        
        for (let i = 0; i < 180; i++) { // 3 minutes
          await page.waitForTimeout(1000);
          
          if (i % 10 === 0) {
            console.log(`⏱️ ${i}s elapsed...`);
          }
          
          const bodyText = await page.textContent('body');
          
          // Check for processing status updates
          if (bodyText.includes('Firebase Functions で処理を開始')) {
            console.log(`📍 ${i}s: 🔥 Firebase Functions processing initiated`);
          }
          
          if (bodyText.includes('音声認識処理中')) {
            console.log(`📍 ${i}s: 🎤 Speech recognition in progress`);
          }
          
          if (bodyText.includes('完了') || bodyText.includes('completed')) {
            console.log(`📍 ${i}s: ✅ Processing completed`);
            break;
          }
          
          if (bodyText.includes('エラー')) {
            console.log(`📍 ${i}s: ❌ Error detected`);
            break;
          }
        }
        
        // Check results
        console.log('📋 6. Checking transcription results...');
        
        const transcriptTab = await page.$('[role="tab"]:has-text("文字起こし")');
        if (transcriptTab) {
          await transcriptTab.click();
          await page.waitForTimeout(2000);
          
          const transcriptContent = await page.textContent('body');
          
          if (transcriptContent.includes('デモモード') || transcriptContent.includes('demo')) {
            console.log('❌ Still showing demo content');
            console.log('   - multipart form issue may still exist');
            console.log('   - or API key authentication issue');
          } else if (transcriptContent.includes('OpenAI') && !transcriptContent.includes('デモ')) {
            console.log('✅ Real OpenAI transcription detected!');
          } else if (transcriptContent.includes('Aさん') || transcriptContent.includes('Bさん')) {
            console.log('✅ Speaker labels working');
          }
          
          // Check for actual transcription content
          if (transcriptContent.length > 100 && !transcriptContent.includes('デモ')) {
            console.log('✅ Substantial transcription content found - likely real');
          }
        }
        
      } else {
        console.log('⚠️ Process button not found - file may already be processed');
      }
    }

    await page.screenshot({ path: 'upload-and-test-processing.png', fullPage: true });

    // Check Firebase Functions logs
    console.log('📋 7. Checking Firebase Functions logs for this session...');
    
  } catch (error) {
    console.log(`💥 Test error: ${error.message}`);
    await page.screenshot({ path: 'upload-test-error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('✅ Upload and test completed');
  }
}

uploadAndTestRealProcessing().catch(console.error);