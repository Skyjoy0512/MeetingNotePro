const { chromium } = require('playwright');

async function resetAndTestFix() {
  console.log('🔄 Reset File Status and Test ReadableStream Fix');
  console.log('===============================================');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Monitor detailed console output
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('multipart') || text.includes('Whisper') || text.includes('OpenAI') || 
        text.includes('API call successful') || text.includes('demo') || text.includes('Processing') ||
        text.includes('Firebase Functions') || text.includes('Form headers') || 
        text.includes('Audio file size') || msg.type() === 'error') {
      console.log(`📱 [${msg.type().toUpperCase()}]: ${text}`);
    }
  });

  // Monitor Firebase Functions calls
  page.on('response', response => {
    const url = response.url();
    if (url.includes('cloudfunctions.net') || url.includes('run.app')) {
      console.log(`🔥 Firebase Functions: ${response.status()} - ${url}`);
    }
    if (url.includes('openai.com')) {
      console.log(`🤖 OpenAI API: ${response.status()} - ${url}`);
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

    console.log('🔧 2. Resetting file status for testing...');
    
    // Navigate to the database console and reset a file's status
    const resetResult = await page.evaluate(async () => {
      try {
        // Access Firebase from the global window object
        if (window.firebase && window.firebase.firestore) {
          const db = window.firebase.firestore();
          const userId = "GKRsua4TbbbzRJvJgCKRHl1waq52"; // Admin user ID
          const audioId = "FQBRLxmb0QnuGugYkhX4"; // First file ID
          
          console.log(`🔧 Resetting file status for ${audioId}`);
          
          await db.collection('audios')
                  .doc(userId)
                  .collection('files')
                  .doc(audioId)
                  .update({
                    status: 'uploaded',
                    processingProgress: 0,
                    transcription: null,
                    summary: null,
                    updatedAt: new Date()
                  });
          
          return { success: true, message: 'File status reset successfully' };
        } else {
          return { success: false, message: 'Firebase not available' };
        }
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    console.log(`🔧 Reset result: ${resetResult.success ? resetResult.message : resetResult.error}`);
    
    if (resetResult.success) {
      // Wait a moment for the reset to propagate
      await page.waitForTimeout(3000);
      
      console.log('🎯 3. Testing with reset audio file...');
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      
      const audioCards = await page.$$('.cursor-pointer');
      
      if (audioCards.length > 0) {
        await audioCards[0].click();
        await page.waitForTimeout(3000);

        const processButton = await page.$('button:has-text("文字起こし"), button:has-text("開始")');
        
        if (processButton) {
          console.log('🚀 4. Starting transcription with ReadableStream fix...');
          await processButton.click();
          
          console.log('📊 Monitoring for multipart parsing results...');
          
          let multipartSuccess = false;
          let multipartError = false;
          
          for (let i = 0; i < 120; i++) {
            await page.waitForTimeout(1000);
            
            const bodyText = await page.textContent('body');
            
            if (bodyText.includes('OpenAI Whisper API call successful')) {
              console.log(`✅ ${i}s: OpenAI API call successful - ReadableStream fix worked!`);
              multipartSuccess = true;
              break;
            }
            
            if (bodyText.includes('Could not parse multipart form')) {
              console.log(`❌ ${i}s: Multipart form error still persists - need different approach`);
              multipartError = true;
              break;
            }
            
            if (bodyText.includes('Falling back to demo')) {
              console.log(`⚠️ ${i}s: Falling back to demo (checking reason...)`);
            }
            
            if (bodyText.includes('処理完了') || bodyText.includes('completed')) {
              console.log(`📍 ${i}s: Processing completed - checking if real or demo`);
              break;
            }
            
            if (i % 15 === 0) {
              console.log(`⏱️ ${i}s elapsed...`);
            }
          }
          
          // Check final result
          console.log('📋 5. Checking final transcription result...');
          const transcriptTab = await page.$('[role="tab"]:has-text("文字起こし")');
          if (transcriptTab) {
            await transcriptTab.click();
            await page.waitForTimeout(2000);
            
            const content = await page.textContent('body');
            
            if (content.includes('デモモード')) {
              console.log('❌ Still showing demo content - multipart issue persists');
            } else if (content.includes('provider":"openai"') && !content.includes('デモ')) {
              console.log('✅ Real OpenAI transcription detected - ReadableStream fix successful!');
            } else if (content.includes('Aさん') || content.includes('Bさん')) {
              console.log('✅ Updated speaker labels working correctly');
            }
            
            // Get content length for analysis
            const contentLength = content.replace(/\s+/g, ' ').length;
            console.log(`📏 Content length: ${contentLength} characters`);
            
            if (contentLength > 500 && !content.includes('デモ')) {
              console.log('✅ Substantial content suggests real transcription');
            }
          }
        } else {
          console.log('⚠️ No process button found - file may still be processed');
        }
      }
    }

    await page.screenshot({ path: 'reset-and-test-fix.png', fullPage: true });

  } catch (error) {
    console.log(`💥 Error: ${error.message}`);
  } finally {
    await browser.close();
    console.log('✅ Reset and test completed');
    
    console.log('\\n📋 Next steps:');
    console.log('1. Check Firebase Functions logs with: firebase functions:log -n 10');
    console.log('2. Look for "multipart form" errors or "API call successful" messages');
  }
}

resetAndTestFix().catch(console.error);