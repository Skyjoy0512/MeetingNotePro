import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Firebase設定（直接設定を読み込み）
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "voicenote-demo.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "voicenote-demo",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "voicenote-demo.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:demo",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-DEMO123"
};

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