const { chromium } = require('playwright');

async function resetAudioStatus() {
  console.log('🔄 Resetting Audio File Status for Testing');
  console.log('==========================================');

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

    console.log('🔧 3. Resetting audio file status to enable reprocessing...');
    
    // Execute JavaScript in the browser to reset status
    const resetResult = await page.evaluate(async () => {
      try {
        // Access Firebase (check different possible locations)
        let getFirestore, collection, getDocs, doc, updateDoc, deleteField;
        let db;
        
        if (window.firebase && window.firebase.firestore) {
          // Firebase v8 style
          const firebase = window.firebase;
          db = firebase.firestore();
          collection = (db, path) => db.collection(path);
          getDocs = (ref) => ref.get();
          doc = (db, ...pathSegments) => db.doc(pathSegments.join('/'));
          updateDoc = (ref, data) => ref.update(data);
          deleteField = () => window.firebase.firestore.FieldValue.delete();
        } else if (window.initializeApp) {
          // Firebase v9 modular style
          const { getFirestore: getFirestoreV9, collection: collectionV9, getDocs: getDocsV9, doc: docV9, updateDoc: updateDocV9, deleteField: deleteFieldV9 } = await import('firebase/firestore');
          getFirestore = getFirestoreV9;
          collection = collectionV9;
          getDocs = getDocsV9;
          doc = docV9;
          updateDoc = updateDocV9;
          deleteField = deleteFieldV9;
          db = getFirestore();
        } else {
          throw new Error('Firebase not found in window object');
        }
        
        const userId = 'FN6nqfpPm1QypewehpoHOTsOiE62';
        const audioCollection = collection(db, 'audios', userId, 'files');
        const snapshot = await getDocs(audioCollection);
        
        console.log(`📁 Found ${snapshot.size} audio files`);
        
        const results = [];
        for (const docSnapshot of snapshot.docs) {
          const data = docSnapshot.data();
          console.log(`📋 File: ${data.fileName} - Current Status: ${data.status}`);
          
          // Reset to uploaded status and remove demo data
          const docRef = doc(db, 'audios', userId, 'files', docSnapshot.id);
          
          const resetData = {
            status: 'uploaded',
            processingProgress: 0,
            updatedAt: new Date()
          };
          
          // Remove existing transcription and summary data
          if (data.transcription) {
            resetData.transcription = deleteField();
          }
          if (data.summary) {
            resetData.summary = deleteField();
          }
          
          await updateDoc(docRef, resetData);
          console.log(`✅ Reset ${data.fileName} to 'uploaded' status`);
          results.push(`Reset ${data.fileName}`);
        }
        
        return { success: true, results };
      } catch (error) {
        console.error('❌ Reset failed:', error);
        return { success: false, error: error.message };
      }
    });

    if (resetResult.success) {
      console.log('✅ Successfully reset audio file statuses');
      resetResult.results.forEach(result => console.log(`  - ${result}`));
      
      // Refresh page to see changes
      console.log('🔄 4. Refreshing page to verify reset...');
      await page.reload();
      await page.waitForTimeout(5000);
      
      // Check for audio files and their status
      const audioCards = await page.$$('.cursor-pointer');
      console.log(`📁 Found ${audioCards.length} audio files after reset`);
      
      if (audioCards.length > 0) {
        console.log('🎯 5. Testing first audio file after reset...');
        await audioCards[0].click();
        await page.waitForTimeout(3000);
        
        // Check if process button is now available
        const processButton = await page.$('button:has-text("文字起こし"), button:has-text("開始"), button:has-text("再試行")');
        if (processButton) {
          console.log('✅ Process button is now available for reprocessing!');
          console.log('🚀 Now the real API test can begin...');
        } else {
          console.log('⚠️ Process button still not found');
        }
      }
      
    } else {
      console.log(`❌ Reset failed: ${resetResult.error}`);
    }

    await page.screenshot({ path: 'audio-status-reset.png', fullPage: true });

  } catch (error) {
    console.log(`💥 Error: ${error.message}`);
    await page.screenshot({ path: 'audio-status-reset-error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('✅ Reset session completed');
  }
}

resetAudioStatus().catch(console.error);