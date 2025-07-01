// Firebase Functions を使ってデモデータを作成するスクリプト
// 本番環境では使用しない、開発・テスト専用

const admin = require('firebase-admin');

// Initialize Firebase Admin with project credentials
admin.initializeApp({
  projectId: 'voicenote-dev'
});

const db = admin.firestore();

async function setupDemoData() {
  console.log('🚀 Setting up demo data for VoiceNote...');
  
  try {
    // デモユーザーのFirestoreドキュメント作成
    const demoUserId = 'demo-user-id'; // 実際のFirebase AuthのUIDを使用
    
    // ユーザードキュメント
    await db.collection('users').doc(demoUserId).set({
      email: 'demo@example.com',
      displayName: 'Demo User',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      learningAudioCount: 0
    });
    
    // API設定のサンプル
    await db.collection('apiConfigs').doc(demoUserId).set({
      speechProvider: 'openai',
      speechApiKey: '', // 空のまま
      speechModel: 'whisper-1',
      llmProvider: 'openai', 
      llmApiKey: '', // 空のまま
      llmModel: 'gpt-4',
      summaryLlmProvider: '',
      summaryLlmModel: '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // サンプル音声ファイル（メタデータのみ）
    const sampleAudioId = 'sample-audio-1';
    await db.collection('audios').doc(demoUserId).collection('files').doc(sampleAudioId).set({
      fileName: 'サンプル会議録音.mp3',
      fileUrl: 'https://example.com/sample.mp3',
      duration: 300, // 5分
      status: 'completed',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      transcription: {
        speakers: [
          { id: 'user', name: 'あなた' },
          { id: 'speaker1', name: 'Aさん' }
        ],
        segments: [
          {
            speaker: 'あなた',
            start: 0,
            end: 10,
            text: 'こんにちは、今日の会議を始めさせていただきます。'
          },
          {
            speaker: 'Aさん',
            start: 11,
            end: 25,
            text: 'よろしくお願いします。今日のアジェンダについて確認させてください。'
          }
        ]
      },
      summary: {
        overall: 'これは会議の開始部分のサンプル要約です。参加者同士の挨拶と、アジェンダ確認について話し合われました。',
        keyPoints: [
          '会議の開始',
          'アジェンダの確認'
        ],
        actionItems: [
          'アジェンダの詳細確認'
        ]
      }
    });
    
    console.log('✅ Demo data setup completed!');
    console.log(`   User ID: ${demoUserId}`);
    console.log(`   Audio ID: ${sampleAudioId}`);
    console.log('');
    console.log('🔧 Next steps:');
    console.log('1. Create a user in Firebase Auth Console with the email demo@example.com');
    console.log('2. Copy the user UID and update this script with the actual UID');
    console.log('3. Re-run this script to create the demo data');
    
  } catch (error) {
    console.error('❌ Error setting up demo data:', error);
  }
  
  process.exit(0);
}

setupDemoData();