# 🔥 Firebase プロジェクト作成ガイド

## Step 1: Firebase Console でプロジェクト作成

### 1-1. プロジェクト基本情報
```
プロジェクト名: MeetingNotePro
プロジェクトID: meetingnotepro-firebase-[ランダム文字列]
```

### 1-2. Google Analytics 設定
```
✅ Google Analytics を有効にする
アカウント: Default Account for Firebase
```

## Step 2: iOS アプリの追加

### 2-1. アプリ登録
```
バンドルID: com.meetingnotepro.app
アプリのニックネーム: MeetingNotePro iOS
App Store ID: (後で設定)
```

### 2-2. GoogleService-Info.plist
1. ダウンロードしたファイルを確認
2. 以下の重要な値をメモ：

```plist
CLIENT_ID: [YOUR_CLIENT_ID].apps.googleusercontent.com
REVERSED_CLIENT_ID: com.googleusercontent.apps.[YOUR_CLIENT_ID]
API_KEY: [YOUR_API_KEY]
PROJECT_ID: meetingnotepro-firebase-[suffix]
```

## Step 3: Firebase サービス設定

### 3-1. Authentication 設定

**Firebase Console > Authentication > Sign-in method**

#### Google サインイン
```
1. Google を有効にする
2. プロジェクトのサポートメールを設定
3. ウェブSDKの設定（自動）
```

#### Apple サインイン
```
1. Apple を有効にする
2. Apple Developer チーム設定
   - Team ID: [Apple Developer Team ID]
   - Bundle ID: com.meetingnotepro.app
```

### 3-2. Firestore Database 設定

**Firebase Console > Firestore Database**

#### データベース作成
```
モード: 本番環境モードで開始
ロケーション: asia-northeast1 (東京)
```

#### セキュリティルール設定
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザープロファイル
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // ユーザー設定サブコレクション
      match /settings/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // カスタムテンプレート
    match /templates/{templateId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
    }
    
    // アプリ統計（読み取り専用）
    match /app_stats/{document=**} {
      allow read: if request.auth != null;
    }
  }
}
```

### 3-3. Cloud Storage 設定

**Firebase Console > Storage**

#### ストレージ作成
```
モード: 本番環境モードで開始
ロケーション: asia-northeast1 (東京)
```

#### セキュリティルール設定
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // ユーザーファイル（将来の機能拡張用）
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && 
        request.auth.uid == userId &&
        request.resource.size < 100 * 1024 * 1024; // 100MB制限
    }
    
    // エクスポートファイル（一時的）
    match /exports/{userId}/{fileName} {
      allow read, write: if request.auth != null && 
        request.auth.uid == userId &&
        request.resource.size < 50 * 1024 * 1024; // 50MB制限
    }
  }
}
```

## Step 4: プロジェクト設定の最適化

### 4-1. プロジェクト設定 > 全般

```
プロジェクト名: MeetingNotePro
パブリック名: MeetingNotePro
プロジェクトID: meetingnotepro-firebase-[suffix]
ウェブAPI キー: [自動生成]
```

#### サポートメール設定
```
サポートメール: your-email@domain.com
（Apple Sign-In で必須）
```

### 4-2. プロジェクト設定 > 使用量と請求

#### 料金プラン
```
現在: Spark プラン（無料）
推奨: Blaze プラン（従量課金）
理由: Cloud Functions とより多くのAPI呼び出しに対応
```

#### 使用量アラート設定
```
Firestore 読み取り: 50,000回/日
Firestore 書き込み: 20,000回/日
Authentication: 10,000回/月
Storage: 1GB
```

## Step 5: GoogleService-Info.plist の配置

### 5-1. ファイルの置き換え

現在のテンプレートファイル:
```
/MeetingNotePro/Resources/GoogleService-Info.plist
```

新しいファイルで置き換える際の確認ポイント:
```plist
✅ PROJECT_ID が正しい
✅ BUNDLE_ID が com.meetingnotepro.app
✅ API_KEY が設定されている
✅ CLIENT_ID が設定されている
✅ REVERSED_CLIENT_ID が設定されている
```

### 5-2. Xcode プロジェクトへの追加

1. Xcode で MeetingNotePro プロジェクトを開く
2. Resources フォルダに GoogleService-Info.plist をドラッグ
3. **「Copy items if needed」** をチェック
4. **「Add to target: MeetingNotePro」** をチェック

## Step 6: Info.plist の更新

### 6-1. URL Scheme の設定

GoogleService-Info.plist の `REVERSED_CLIENT_ID` をコピーして、Info.plist を更新:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>GoogleSignIn</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.googleusercontent.apps.[YOUR_CLIENT_ID]</string>
        </array>
    </dict>
</array>
```

## Step 7: 動作確認

### 7-1. Firebase 接続テスト

アプリを起動して以下を確認:

```swift
// Firebase 初期化確認
print("Firebase configured: \(FirebaseApp.app() != nil)")

// Authentication 確認
print("Auth ready: \(Auth.auth().currentUser != nil)")

// Firestore 接続確認
Firestore.firestore().collection("test").document("connection").setData([
    "status": "connected",
    "timestamp": FieldValue.serverTimestamp()
])
```

### 7-2. 認証フローテスト

1. Google Sign-In ボタンをタップ
2. Google 認証画面が表示される
3. 認証成功後、ユーザー情報が表示される
4. Apple Sign-In でも同様にテスト

## トラブルシューティング

### よくある問題と解決方法

#### 1. Google Sign-In が動作しない
```
原因: REVERSED_CLIENT_ID が正しく設定されていない
解決: Info.plist の URL Scheme を確認
```

#### 2. Firestore 接続エラー
```
原因: セキュリティルールが厳しすぎる
解決: テスト用に一時的にルールを緩める
```

#### 3. GoogleService-Info.plist が認識されない
```
原因: ファイルがBundle に含まれていない
解決: Xcode で Target Membership を確認
```

#### 4. API キーエラー
```
原因: API キーの制限設定
解決: Firebase Console で API キー制限を確認
```

この手順で Firebase プロジェクトが完全に設定され、MeetingNotePro アプリと統合されます！