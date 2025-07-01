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

// 常にデモモードで動作
const isDevMode = true;
const hasValidConfig = false;

console.log('🎭 Running in demo mode - Firebase features disabled');
console.log('🎭 All Firebase operations will be mocked');

// デモモード用のダミー初期化
app = {} as FirebaseApp;
auth = {} as Auth;
db = {} as Firestore;
storage = {} as FirebaseStorage;

export { app, auth, db, storage };
export default app;