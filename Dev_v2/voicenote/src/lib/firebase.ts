import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import config from './config';

// Firebase設定（設定ファイルから取得）
const firebaseConfig = config.firebase;

// Firebase初期化
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

// 設定の有効性チェック
const hasValidConfig = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'demo-api-key' &&
  firebaseConfig.projectId && 
  firebaseConfig.projectId !== 'voicenote-demo'
);

const isDevMode = process.env.NODE_ENV === 'development';
const isDemoMode = !hasValidConfig;

if (hasValidConfig) {
  try {
    console.log('🚀 Initializing Firebase with real configuration');
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    // フォールバック: デモモード
    console.log('🎭 Falling back to demo mode');
    app = {} as FirebaseApp;
    auth = {} as Auth;
    db = {} as Firestore;
    storage = {} as FirebaseStorage;
  }
} else {
  console.log('🎭 Running in demo mode - Firebase features disabled');
  console.log('🎭 Set NEXT_PUBLIC_FIREBASE_API_KEY to enable real Firebase');
  
  // デモモード用のダミー初期化
  app = {} as FirebaseApp;
  auth = {} as Auth;
  db = {} as Firestore;
  storage = {} as FirebaseStorage;
}

export { app, auth, db, storage, hasValidConfig, isDemoMode };
export default app;