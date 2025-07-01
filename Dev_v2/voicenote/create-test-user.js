// Firebase Auth REST APIを使ってテストユーザーを作成
const https = require('https');

const FIREBASE_API_KEY = 'AIzaSyBxOQjfgdQHY7ak06TGMNm8egw5Q2OrIqU'; // 実際のAPIキー

function createTestUser() {
  const postData = JSON.stringify({
    email: 'admin@example.com',
    password: 'admin123456',
    returnSecureToken: true
  });

  const options = {
    hostname: 'identitytoolkit.googleapis.com',
    port: 443,
    path: `/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('🔧 Creating test user via Firebase REST API...');

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      const response = JSON.parse(data);
      
      if (res.statusCode === 200) {
        console.log('✅ Test user created successfully!');
        console.log('📧 Email:', response.email);
        console.log('🆔 UID:', response.localId);
        console.log('🔑 ID Token:', response.idToken?.substring(0, 20) + '...');
      } else {
        console.log('❌ Failed to create user:');
        console.log('Status:', res.statusCode);
        console.log('Response:', response);
        
        if (response.error?.message === 'EMAIL_EXISTS') {
          console.log('ℹ️  User already exists - this is fine for testing');
        }
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Request error:', e.message);
  });

  req.write(postData);
  req.end();
}

createTestUser();