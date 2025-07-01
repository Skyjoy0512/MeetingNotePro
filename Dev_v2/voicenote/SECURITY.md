# セキュリティガイドライン

## 🔐 API キーの管理

### ⚠️ 重要な注意事項
- **APIキーは絶対にGitリポジトリにコミットしないでください**
- **APIキーはコードにハードコーディングしないでください**
- **APIキーは環境変数やFirestoreの暗号化されたフィールドでのみ管理してください**

### 🔄 接続テストの最適化
- **初回設定時のみ**: 自動的にAPI接続テストを実行
- **保存済みの場合**: 自動テストをスキップ（パフォーマンス向上）
- **手動テスト**: 必要な時にユーザーが「手動接続テスト」ボタンで実行可能

### 💾 API キーの保存場所
- **フロントエンド**: ユーザーのブラウザlocalStorageとFirestore（暗号化）
- **バックエンド**: Firebase Functions環境変数またはFirestore
- **開発環境**: `.env.local`ファイル（`.gitignore`に含まれている）

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