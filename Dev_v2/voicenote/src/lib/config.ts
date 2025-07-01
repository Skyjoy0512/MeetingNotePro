/**
 * アプリケーション設定
 * 環境変数と定数の管理
 */

// Firebase設定
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "voicenote-demo.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "voicenote-demo",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "voicenote-demo.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:demo",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-DEMO123"
};

// 環境設定
export const isDev = process.env.NODE_ENV === 'development';
export const isProd = process.env.NODE_ENV === 'production';
export const isDemo = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

// API エンドポイント
export const apiEndpoints = {
  audioProcessor: process.env.NEXT_PUBLIC_AUDIO_PROCESSOR_URL || 
                 (isDev ? '' : 'https://voicenote-audio-processor-189229317369.asia-northeast1.run.app'),
};

// 音声処理制限
export const audioLimits = {
  maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
  maxDurationHours: 8, // 8時間
  maxFilesPerDay: 2, // 1日2ファイル
  supportedFormats: ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'],
  chunkDurationMinutes: 30,
  overlapDurationMinutes: 5,
  maxParallelChunks: 3
};

// UI設定
export const uiConfig = {
  recordingMaxDuration: 7200, // 2時間（秒）
  progressUpdateInterval: 1000, // 1秒
  autoSaveInterval: 30000, // 30秒
  maxAskAIRequestsPerDay: 20,
  speakerColors: [
    '#3B82F6', // blue
    '#EF4444', // red
    '#10B981', // green
    '#F59E0B', // yellow
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#84CC16', // lime
  ]
};

// API プロバイダー設定
export const apiProviders = {
  speech: {
    openai: {
      name: 'OpenAI Whisper',
      models: ['whisper-1'],
      languages: ['ja', 'en', 'zh', 'ko'],
      maxFileSize: 25 * 1024 * 1024, // 25MB
      pricing: '$0.006/分'
    },
    azure: {
      name: 'Azure Speech Services',
      models: ['latest'],
      languages: ['ja-JP', 'en-US', 'zh-CN', 'ko-KR'],
      maxFileSize: 100 * 1024 * 1024, // 100MB
      pricing: '$1.0/時間'
    },
    google: {
      name: 'Google Cloud Speech-to-Text',
      models: ['latest_long', 'latest_short'],
      languages: ['ja-JP', 'en-US', 'zh-CN', 'ko-KR'],
      maxFileSize: 1024 * 1024 * 1024, // 1GB
      pricing: '$1.44/時間'
    },
    assemblyai: {
      name: 'AssemblyAI',
      models: ['best', 'nano'],
      languages: ['ja', 'en'],
      maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
      pricing: '$0.65/時間'
    },
    deepgram: {
      name: 'Deepgram',
      models: ['nova-2', 'enhanced'],
      languages: ['ja', 'en', 'zh', 'ko'],
      maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
      pricing: '$0.31/時間'
    }
  },
  llm: {
    openai: {
      name: 'OpenAI GPT',
      models: ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo'],
      pricing: {
        'gpt-4o': { input: '$2.5/1M tokens', output: '$10/1M tokens' },
        'gpt-4': { input: '$30/1M tokens', output: '$60/1M tokens' },
        'gpt-3.5-turbo': { input: '$0.5/1M tokens', output: '$1.5/1M tokens' }
      }
    },
    anthropic: {
      name: 'Anthropic Claude',
      models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
      pricing: {
        'claude-3-5-sonnet-20241022': { input: '$3/1M tokens', output: '$15/1M tokens' },
        'claude-3-haiku-20240307': { input: '$0.25/1M tokens', output: '$1.25/1M tokens' }
      }
    },
    google: {
      name: 'Google Gemini',
      models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
      pricing: {
        'gemini-1.5-pro': { input: '$3.5/1M tokens', output: '$10.5/1M tokens' },
        'gemini-1.5-flash': { input: '$0.075/1M tokens', output: '$0.3/1M tokens' }
      }
    },
    deepseek: {
      name: 'DeepSeek',
      models: ['deepseek-chat', 'deepseek-coder'],
      pricing: {
        'deepseek-chat': { input: '$0.14/1M tokens', output: '$0.28/1M tokens' },
        'deepseek-coder': { input: '$0.14/1M tokens', output: '$0.28/1M tokens' }
      }
    },
    groq: {
      name: 'Groq',
      models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant'],
      pricing: {
        'llama-3.1-70b-versatile': { input: '$0.59/1M tokens', output: '$0.79/1M tokens' },
        'llama-3.1-8b-instant': { input: '$0.05/1M tokens', output: '$0.08/1M tokens' }
      }
    }
  }
};

// コスト最適化設定
export const costOptimization = {
  // 無料枠制限
  freeTierLimits: {
    speechMinutesPerMonth: 200, // Deepgram無料枠
    llmTokensPerMonth: 50000, // 概算
    storageGB: 5, // Firebase Storage無料枠
    firestoreReads: 20000, // 1日あたり
    firestoreWrites: 20000 // 1日あたり
  },
  
  // 推奨設定（コスト重視）
  recommended: {
    speechProvider: 'deepgram', // 最安
    llmProvider: 'deepseek', // 最安
    summaryModel: 'deepseek-chat',
    chatModel: 'deepseek-chat'
  },
  
  // 月間予算（検証用）
  monthlyBudget: {
    total: 100, // $100
    speech: 70, // $70 (70%)
    llm: 20, // $20 (20%)
    infrastructure: 10 // $10 (10%)
  }
};

// セキュリティ設定
export const security = {
  allowedOrigins: process.env.NEXT_PUBLIC_ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'https://voicenote.example.com'
  ],
  encryptionKey: process.env.ENCRYPTION_KEY || 'demo-key-change-in-production',
  sessionTimeout: 24 * 60 * 60 * 1000, // 24時間
  maxLoginAttempts: 5,
  rateLimits: {
    apiCalls: 100, // 1時間あたり
    uploads: 10, // 1時間あたり
    askAI: 20 // 1日あたり
  }
};

// 機能フラグ
export const features = {
  enableVoiceLearning: true,
  enableAskAI: true,
  enableSpeakerSeparation: true,
  enableRealtimeProgress: true,
  enableChunkProcessing: true,
  enableAutoSave: true,
  enableOfflineMode: false, // 将来対応予定
  enableAdvancedAnalytics: false, // 将来対応予定
  useLocalStorage: true // Firebase Storage の代わりにローカルストレージ使用
};

// デバッグ設定
export const debug = {
  enableLogging: isDev,
  enableMockData: isDemo,
  skipAuthentication: false,
  simulateSlowNetwork: false,
  verboseErrorMessages: isDev
};

// エクスポート
export default {
  firebase: firebaseConfig,
  api: apiEndpoints,
  audio: audioLimits,
  ui: uiConfig,
  providers: apiProviders,
  cost: costOptimization,
  security,
  features,
  debug,
  isDev,
  isProd,
  isDemo
};