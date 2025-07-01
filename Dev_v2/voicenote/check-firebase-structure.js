const { chromium } = require('playwright');

async function checkFirebaseStructure() {
  console.log('🔍 Checking Firebase Structure');
  console.log('==============================');

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

    console.log('🔧 3. Checking Firebase object structure...');
    
    // Check Firebase structure
    const firebaseInfo = await page.evaluate(() => {
      const info = {
        windowFirebase: !!window.firebase,
        windowFirebaseKeys: window.firebase ? Object.keys(window.firebase) : [],
        windowFirebaseFirestore: !!(window.firebase && window.firebase.firestore),
        windowGlobal: Object.keys(window).filter(key => key.includes('firebase') || key.includes('Firebase')),
        navigatorGlobal: Object.keys(navigator).filter(key => key.includes('firebase') || key.includes('Firebase'))
      };
      
      // Try to access database
      try {
        if (window.firebase && window.firebase.firestore) {
          const db = window.firebase.firestore();
          info.firestoreDbCreated = true;
          info.firestoreDbType = typeof db;
        }
      } catch (e) {
        info.firestoreError = e.message;
      }
      
      return info;
    });

    console.log('📊 Firebase Structure Info:');
    console.log(JSON.stringify(firebaseInfo, null, 2));

    // Try simple status update
    console.log('🧪 4. Testing simple Firebase operation...');
    const testResult = await page.evaluate(async () => {
      try {
        if (!window.firebase || !window.firebase.firestore) {
          return { success: false, error: 'Firebase firestore not available' };
        }
        
        const db = window.firebase.firestore();
        const userId = 'FN6nqfpPm1QypewehpoHOTsOiE62';
        
        // Simple read test
        const doc = await db.collection('audios').doc(userId).collection('files').limit(1).get();
        
        return { 
          success: true, 
          docCount: doc.size,
          docs: doc.docs.map(d => ({ id: d.id, fileName: d.data().fileName, status: d.data().status }))
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    if (testResult.success) {
      console.log('✅ Firebase test successful');
      console.log(`📁 Found ${testResult.docCount} documents`);
      testResult.docs.forEach(doc => {
        console.log(`  - ${doc.fileName}: ${doc.status}`);
      });
    } else {
      console.log(`❌ Firebase test failed: ${testResult.error}`);
    }

  } catch (error) {
    console.log(`💥 Error: ${error.message}`);
  } finally {
    await browser.close();
    console.log('✅ Check completed');
  }
}

checkFirebaseStructure().catch(console.error);