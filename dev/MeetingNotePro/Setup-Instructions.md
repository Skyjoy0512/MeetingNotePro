# MeetingNotePro セットアップガイド

## 🔥 Firebase プロジェクト設定

### 1. Firebase Console でプロジェクト作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. **新しいプロジェクトを作成**
   - プロジェクト名: `MeetingNotePro`
   - プロジェクトID: `meetingnotepro-firebase`
   - Google Analytics: 有効化

### 2. iOS アプリの追加

1. **iOS アプリを追加**をクリック
2. **バンドルID**: `com.meetingnotepro.app`
3. **アプリのニックネーム**: `MeetingNotePro iOS`
4. **GoogleService-Info.plist** をダウンロード
5. `Resources/GoogleService-Info.plist` を実際のファイルに置き換え

### 3. Firebase サービスの有効化

#### Authentication
```bash
# Firebase Console > Authentication > Sign-in method
1. Google サインインを有効化
2. Apple サインインを有効化
3. プロジェクト設定 > 全般 > サポートメール を設定
```

#### Firestore Database
```bash
# Firebase Console > Firestore Database
1. データベースを作成
2. 本番環境モードで開始
3. ロケーション: asia-northeast1 (東京)
```

#### Storage
```bash
# Firebase Console > Storage
1. ストレージを開始
2. 本番環境モードで開始
3. ロケーション: asia-northeast1 (東京)
```

### 4. セキュリティルールの設定

#### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーデータ - 認証済みユーザーのみアクセス可能
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // カスタムテンプレート - ユーザー自身のみアクセス可能
    match /templates/{templateId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // その他のコレクションは拒否
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

#### Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // ユーザーファイル - 認証済みユーザーのみアクセス可能
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🤖 Gemini API 設定

### 1. Google AI Studio でAPIキー取得

1. [Google AI Studio](https://aistudio.google.com/) にアクセス
2. **API key** を作成
3. アプリ内でKeychainに安全に保存

### 2. APIキーの設定方法

```swift
// アプリ起動時またはSettings画面で設定
KeychainManager.shared.store("YOUR_GEMINI_API_KEY", for: .geminiAPIKey)
```

## 📱 Xcode プロジェクト設定

### 1. Package Dependencies の追加

1. Xcode で **File > Add Package Dependencies**
2. 以下のURLを順番に追加：

```
https://github.com/firebase/firebase-ios-sdk.git
https://github.com/google/GoogleSignIn-iOS.git
https://github.com/google/generative-ai-swift.git
```

### 2. Info.plist の URL Scheme 更新

GoogleService-Info.plist の `REVERSED_CLIENT_ID` を確認し、Info.plist を更新：

```xml
<key>CFBundleURLSchemes</key>
<array>
    <string>com.googleusercontent.apps.YOUR_CLIENT_ID</string>
</array>
```

### 3. Build Settings

#### Bundle Identifier
```
com.meetingnotepro.app
```

#### Capabilities
- Sign in with Apple
- Push Notifications (将来の機能拡張用)

### 4. Core Data の初期化

プロジェクト初回起動時にCore Dataスキーマを作成：

```swift
// AppDelegate または MeetingNoteProApp で実行
CoreDataManager.shared.initializeSchema()
```

## 🔐 セキュリティ設定

### 1. APIキーの管理

```swift
// Keychain に保存
KeychainManager.shared.store("api_key_value", for: .geminiAPIKey)

// 取得
let apiKey = KeychainManager.shared.retrieve(for: .geminiAPIKey)
```

### 2. プライバシー設定

Info.plist の NSMicrophoneUsageDescription と NSSpeechRecognitionUsageDescription が正しく設定されていることを確認。

## 🧪 テスト手順

### 1. 基本機能テスト

1. **認証**: Google/Apple Sign-In
2. **録音**: 音声レベル表示とファイル保存
3. **文字起こし**: リアルタイム処理と結果表示
4. **AI要約**: テンプレート選択と要約生成
5. **AskAI**: コンテキスト選択とチャット機能

### 2. エラーハンドリングテスト

1. **ネットワーク切断**時の動作
2. **API制限**到達時の表示
3. **マイク権限拒否**時の案内
4. **長時間録音**時のメモリ使用量

### 3. パフォーマンステスト

1. **大きなファイル**の文字起こし
2. **長時間録音**の処理
3. **複数セッション**の同時実行
4. **メモリ使用量**の監視

## 📦 App Store 準備

### 1. プロビジョニングプロファイル

1. Apple Developer Portal でApp IDを作成
2. Capabilities を設定:
   - Sign in with Apple
   - Background Modes (Audio)

### 2. アプリアイコンとスクリーンショット

- アプリアイコン: 1024x1024px
- スクリーンショット: iPhone/iPad 各サイズ
- プライバシーポリシー URL

### 3. App Store Connect 設定

- アプリ説明文（日本語・英語）
- キーワード設定
- サブスクリプション設定（StoreKit 2）
- プライバシー情報の申告

## 🚀 デプロイ手順

### 1. ビルド設定

```bash
# Release ビルド
xcodebuild -scheme MeetingNotePro -configuration Release
```

### 2. TestFlight アップロード

1. Xcode から Archive
2. TestFlight にアップロード
3. 内部テスター招待

### 3. 本番リリース

1. App Store Connect でレビュー申請
2. App Store Review Guidelines 準拠確認
3. リリース承認後の公開

## 📞 サポート情報

### 問題が発生した場合

1. **Xcode Console** でエラーログを確認
2. **Firebase Console** で認証・データベースエラーを確認
3. **Performance Monitor** でパフォーマンス問題を分析

### デバッグに役立つログ

```swift
// パフォーマンス監視
PerformanceMonitor.shared.generatePerformanceReport()

// エラー履歴
ErrorManager.shared.getRecentErrors()

// キャッシュ状態
CacheManager.shared.cacheStats
```

これで MeetingNotePro が完全に動作可能になります！