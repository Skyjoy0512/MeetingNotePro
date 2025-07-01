const { chromium } = require('playwright');

async function fixStatusInBrowser() {
  console.log('🔧 Fixing Audio Status via Browser');
  console.log('==================================');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

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

    console.log('🔧 3. Fixing audio file statuses...');
    
    // Execute JavaScript in the browser to fix the status
    const fixResult = await page.evaluate(async () => {
      try {
        // Access Firebase Firestore
        const { getFirestore, collection, getDocs, doc, updateDoc } = window.firebase.firestore;
        const db = getFirestore();
        
        const userId = 'FN6nqfpPm1QypewehpoHOTsOiE62';
        const audioCollection = collection(db, 'audios', userId, 'files');
        const snapshot = await getDocs(audioCollection);
        
        console.log(`📁 Found ${snapshot.size} audio files`);
        
        const results = [];
        for (const docSnapshot of snapshot.docs) {
          const data = docSnapshot.data();
          console.log(`📋 File: ${data.fileName} - Status: ${data.status}`);
          
          // Update status to 'uploaded' if needed
          if (!data.status || data.status === 'error' || data.status === 'processing') {
            const docRef = doc(db, 'audios', userId, 'files', docSnapshot.id);
            await updateDoc(docRef, {
              status: 'uploaded',
              processingProgress: 0,
              updatedAt: new Date()
            });
            console.log(`✅ Updated ${data.fileName} status to 'uploaded'`);
            results.push(`Updated ${data.fileName}`);
          }
        }
        
        return { success: true, results };
      } catch (error) {
        console.error('❌ Fix failed:', error);
        return { success: false, error: error.message };
      }
    });

    if (fixResult.success) {
      console.log('✅ Successfully fixed audio statuses');
      fixResult.results.forEach(result => console.log(`  - ${result}`));
      
      // Refresh and test
      console.log('🔄 4. Refreshing page to test...');
      await page.reload();
      await page.waitForTimeout(5000);
      
      // Check for audio files
      const audioCards = await page.$$('.cursor-pointer, [data-testid="audio-card"]');
      console.log(`📁 Found ${audioCards.length} audio files after fix`);
      
      if (audioCards.length > 0) {
        console.log('🎯 5. Testing first audio file...');
        await audioCards[0].click();
        await page.waitForTimeout(3000);
        
        // Check if process button is now available
        const processButton = await page.$('button:has-text("文字起こし"), button:has-text("開始"), button:has-text("再試行")');
        if (processButton) {
          console.log('✅ Process button is now available!');
        } else {
          console.log('⚠️ Process button still not found');
        }
      }
      
    } else {
      console.log(`❌ Fix failed: ${fixResult.error}`);
    }

    await page.screenshot({ path: 'status-fix-result.png', fullPage: true });

  } catch (error) {
    console.log(`💥 Error: ${error.message}`);
    await page.screenshot({ path: 'status-fix-error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('✅ Fix session completed');
  }
}

fixStatusInBrowser().catch(console.error);