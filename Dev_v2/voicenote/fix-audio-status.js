// Firebase Admin SDK を使ってFirestoreのデータを直接修正
const admin = require('firebase-admin');

// Firebase Admin SDK の初期化
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'voicenote-dev'
  });
}

const db = admin.firestore();

async function fixAudioStatus() {
  console.log('🔧 Fixing Audio File Status');
  console.log('===========================');

  try {
    const userId = 'FN6nqfpPm1QypewehpoHOTsOiE62';
    
    // すべての音声ファイルを取得
    const audioCollection = db.collection('audios').doc(userId).collection('files');
    const snapshot = await audioCollection.get();
    
    console.log(`📁 Found ${snapshot.size} audio files`);
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      console.log(`📋 File: ${data.fileName} - Status: ${data.status}`);
      
      // statusが undefined または error の場合は uploaded に設定
      if (!data.status || data.status === 'error' || data.status === 'processing') {
        await doc.ref.update({
          status: 'uploaded',
          processingProgress: 0,
          updatedAt: admin.firestore.Timestamp.now()
        });
        console.log(`✅ Updated ${data.fileName} status to 'uploaded'`);
      }
    }
    
    console.log('🎉 All audio files status fixed');
    
  } catch (error) {
    console.error('❌ Error fixing status:', error);
  }
}

fixAudioStatus();