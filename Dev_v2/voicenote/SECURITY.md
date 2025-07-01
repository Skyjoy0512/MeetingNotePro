# セキュリティガイド

## 🔐 APIキー管理

### 重要事項
- **絶対にAPIキーをコードに直書きしないでください**
- **環境変数ファイル（.env.local）をGitにコミットしないでください**
- **APIキーが公開された場合は即座に無効化してください**

### 設定手順

1. **環境変数ファイルの作成**
   ```bash
   cp .env.example .env.local
   ```

2. **Firebase APIキーの取得**
   - Firebase Console: https://console.firebase.google.com/
   - プロジェクト設定 → 全般 → SDKの設定と構成
   - ウェブアプリの構成をコピー

3. **環境変数の設定**
   ```bash
   # .env.local ファイルを編集
   NEXT_PUBLIC_FIREBASE_API_KEY=your-actual-api-key
   ```

### セキュリティ設定

#### Firebase セキュリティルール
```javascript
// Firestore Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーは自分のデータのみアクセス可能
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /audios/{userId}/files/{fileId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

#### Storage セキュリティルール
```javascript
// Storage Rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /audios/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### APIキーが漏洩した場合の対処法

1. **Firebase Console でAPIキーを即座に無効化**
2. **新しいAPIキーを生成**
3. **環境変数を更新**
4. **Git履歴からAPIキーを削除**（必要に応じて）

### 開発時の注意点

- デモモードでは模擬APIキーが使用されます
- 本番環境では必ず実際のFirebaseプロジェクトを使用してください
- 定期的にAPIキーをローテーションしてください

### 連絡先

セキュリティに関する問題を発見した場合は、以下まで報告してください：
- GitHub Issues（機密でない問題）
- Email（機密性の高い問題）