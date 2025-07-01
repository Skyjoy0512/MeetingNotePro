# VoiceNote Firebase Hosting デプロイガイド

## 📋 前提条件

- Firebase CLI がインストールされていること
- Google アカウントでFirebase にアクセス可能
- voicenote-dev プロジェクトの Owner 権限

## 🚀 手動デプロイ手順

### 1. Firebase CLI ログイン

```bash
firebase login
```

### 2. プロジェクト設定確認

```bash
firebase projects:list
firebase use voicenote-dev
```

### 3. ビルド & デプロイ

```bash
# ビルド
npm run build

# デプロイ
firebase deploy --only hosting
```

## 🌐 デプロイ後のURL

デプロイが完了すると以下のURLでアクセス可能：

- **本番URL**: https://voicenote-dev.web.app
- **カスタムドメイン**: https://voicenote-dev.firebaseapp.com

## 🔧 環境設定

### 本番環境変数 (.env.production)

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBxOQjfgdQHY7ak06TGMNm8egw5Q2OrIqU
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=voicenote-dev.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=voicenote-dev
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=voicenote-dev.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=189229317369
NEXT_PUBLIC_FIREBASE_APP_ID=1:189229317369:web:1f87fd39ce1110eff23628
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-4SDYM7H0WZ
NEXT_PUBLIC_AUDIO_PROCESSOR_URL=https://voicenote-processor-asia-northeast1.run.app
```

## 📦 ビルド設定

Next.js は静的エクスポート (`output: 'export'`) で設定済み：

- 出力ディレクトリ: `out/`
- Firebase Hosting 設定: `firebase.json`
- 画像最適化: 無効 (`images.unoptimized: true`)

## 🚀 CI/CD (GitHub Actions)

GitHub リポジトリにプッシュすると自動デプロイ：

- ワークフロー: `.github/workflows/firebase-hosting.yml`
- トリガー: `main` ブランチへのプッシュ
- 必要なシークレット:
  - `FIREBASE_SERVICE_ACCOUNT_VOICENOTE_DEV`
  - Firebase環境変数 (`NEXT_PUBLIC_*`)

## 🔍 デプロイ確認

デプロイ後に確認すべき項目：

1. ✅ **アプリケーション起動** - ページが正常に表示される
2. ✅ **Firebase認証** - ログイン・新規登録が動作する
3. ✅ **音声録音** - マイクアクセスと録音が動作する
4. ✅ **ファイルアップロード** - Firebase Storage への保存が動作する
5. ✅ **Firestore連携** - データベース読み書きが動作する

## 🛠️ トラブルシューティング

### よくある問題

1. **404 エラー**: Firebase Hosting の rewrite 設定確認
2. **Firebase接続エラー**: 環境変数の設定確認
3. **CORS エラー**: Firebase Security Rules の確認
4. **ビルドエラー**: 依存関係の更新

### デバッグ方法

```bash
# ローカルでのホスティングテスト
firebase serve --only hosting

# ビルドログの確認
npm run build -- --debug

# Firebase エミュレーター
firebase emulators:start
```

## 📊 パフォーマンス最適化

- **画像最適化**: 自動最適化は無効、手動で WebP 使用推奨
- **バンドルサイズ**: 現在 ~300KB (First Load JS)
- **キャッシュ**: Firebase Hosting の自動キャッシュ有効

## 🔒 セキュリティ

- **Firebase Rules**: Firestore・Storage のセキュリティルール設定済み
- **HTTPS**: Firebase Hosting により自動適用
- **CSP**: 将来的に Content Security Policy 導入予定