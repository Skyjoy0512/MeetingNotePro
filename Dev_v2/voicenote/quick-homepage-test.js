const { chromium } = require('playwright');

async function quickHomepageTest() {
  console.log('🚀 Quick VoiceNote Homepage Test');
  console.log('================================');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture all errors
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`📝 [${type.toUpperCase()}]: ${text}`);
  });

  page.on('pageerror', error => {
    console.log(`💥 PAGE ERROR: ${error.message}`);
    console.log(`📍 Stack: ${error.stack}`);
  });

  try {
    console.log('🌐 1. Loading homepage...');
    await page.goto('https://voicenote-dev.web.app', { waitUntil: 'networkidle' });
    
    console.log('⏱️  2. Waiting 5 seconds...');
    await page.waitForTimeout(5000);
    
    console.log('📄 3. Checking page title...');
    const title = await page.title();
    console.log(`Title: ${title}`);
    
    console.log('🔍 4. Looking for any error messages...');
    const errorText = await page.evaluate(() => {
      const bodyText = document.body.textContent || '';
      const errorPatterns = [
        'Application error',
        'client-side exception',
        'Cannot read properties',
        'undefined',
        'Error:'
      ];
      
      const foundErrors = [];
      errorPatterns.forEach(pattern => {
        if (bodyText.includes(pattern)) {
          foundErrors.push(pattern);
        }
      });
      
      return {
        hasErrors: foundErrors.length > 0,
        foundPatterns: foundErrors,
        bodyLength: bodyText.length,
        sampleText: bodyText.substring(0, 200)
      };
    });
    
    console.log('📊 Error check results:', errorText);
    
    if (errorText.hasErrors) {
      console.log('❌ Found error patterns:', errorText.foundPatterns);
    } else {
      console.log('✅ No error patterns found in page content');
    }
    
    console.log('🔐 5. Checking auth state...');
    const authElements = await page.evaluate(() => {
      const signInButton = document.querySelector('button:contains("サインイン")') || 
                          document.querySelector('text=サインイン') ||
                          document.querySelector('[text*="サインイン"]') ||
                          document.querySelector('button[data-testid="sign-in"]');
      
      const signOutButton = document.querySelector('button:contains("サインアウト")') || 
                           document.querySelector('text=サインアウト') ||
                           document.querySelector('[text*="サインアウト"]') ||
                           document.querySelector('button[data-testid="sign-out"]');
      
      return {
        hasSignIn: !!signInButton,
        hasSignOut: !!signOutButton,
        signInText: signInButton?.textContent,
        signOutText: signOutButton?.textContent
      };
    });
    
    console.log('🔐 Auth state:', authElements);
    
    if (authElements.hasSignIn) {
      console.log('🔐 User not signed in - showing sign in form');
    } else if (authElements.hasSignOut) {
      console.log('✅ User is signed in - showing main app');
    } else {
      console.log('❓ Auth state unclear');
    }
    
    console.log('📸 6. Taking screenshot...');
    await page.screenshot({ path: 'quick-homepage-test.png', fullPage: true });
    
    console.log('🏁 Test completed successfully');
    
  } catch (error) {
    console.log(`💥 Test failed: ${error.message}`);
    await page.screenshot({ path: 'quick-homepage-error.png', fullPage: true });
  }

  await browser.close();
  console.log('✅ Browser closed');
}

quickHomepageTest().catch(console.error);