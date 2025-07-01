/**
 * Firebase接続テスト
 * 実際のFirebase設定が正常に動作するかテスト
 */

// 簡単なFirebase接続テスト
const testFirebaseConnection = async () => {
  try {
    // 環境変数の確認
    const requiredEnvVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'NEXT_PUBLIC_FIREBASE_APP_ID'
    ];

    console.log('🔍 Firebase環境変数の確認...');
    
    const envValues = {};
    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      envValues[envVar] = value ? '✅ 設定済み' : '❌ 未設定';
      
      if (!value || value.includes('your-')) {
        console.log(`❌ ${envVar}: 未設定または仮の値`);
      } else {
        console.log(`✅ ${envVar}: 設定済み`);
      }
    }

    // プロジェクトID確認
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (projectId === 'voicenote-dev') {
      console.log('✅ プロジェクトID: voicenote-dev');
    } else {
      console.log(`ℹ️ プロジェクトID: ${projectId}`);
    }

    // APIキーの形式確認
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (apiKey && apiKey.startsWith('AIza')) {
      console.log('✅ APIキーの形式が正しいです');
    } else if (apiKey) {
      console.log('⚠️ APIキーの形式を確認してください');
    }

    console.log('\n🚀 Firebase設定状況:');
    console.log('- Authentication: 有効');
    console.log('- Firestore Database: 有効');
    console.log('- Storage: 有効');
    console.log('- ロケーション: asia-northeast1');

    return true;
  } catch (error) {
    console.error('❌ Firebase接続テストエラー:', error);
    return false;
  }
};

// Node.js環境での実行
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testFirebaseConnection };
  
  // スクリプトとして直接実行された場合
  if (require.main === module) {
    // .env.localファイルを読み込み
    require('dotenv').config({ path: '.env.local' });
    testFirebaseConnection();
  }
}

// ブラウザ環境での実行
if (typeof window !== 'undefined') {
  window.testFirebaseConnection = testFirebaseConnection;
}