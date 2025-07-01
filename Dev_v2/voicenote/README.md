# VoiceNote - AI音声文字起こし・話者分離サービス

高精度な話者分離機能を持つAI音声文字起こし・要約サービス。最大8時間の音声ファイルを処理可能。

## 🚀 主な機能

### 📝 高精度文字起こし
- **多言語対応**: 日本語を中心とした高精度音声認識
- **複数API対応**: OpenAI Whisper、Azure Speech、Google Cloud Speech等
- **長時間音声**: 最大8時間（480分）の音声処理対応

### 👥 話者分離・学習
- **AI話者分離**: pyannote.audioによる業界最高水準の精度
- **ユーザー音声学習**: 事前学習による高精度な話者識別
- **リアルタイム処理**: オーバーラップ分割による高速処理

### 🤖 AI要約・チャット
- **自動要約**: 複数LLM APIによる高品質要約生成
- **Ask AI**: 音声内容に基づくインテリジェントチャット
- **話者別分析**: 各話者の発言内容個別分析

### 🔧 企業向け機能
- **API管理**: 複数プロバイダーの統合管理・フォールバック
- **コスト最適化**: 使用量追跡・予算管理機能
- **セキュリティ**: エンタープライズレベルのデータ保護

## 🏗️ 技術スタック

### フロントエンド
- **Next.js 14**: App Router + TypeScript
- **shadcn/ui**: モダンなUIコンポーネント
- **Tailwind CSS**: レスポンシブデザイン
- **Firebase Auth**: 認証・ユーザー管理

### バックエンド
- **Google Cloud Run**: Python音声処理サービス
- **Firebase Functions**: 軽量API処理
- **Cloud Tasks**: 分散タスク処理
- **Firebase Firestore**: NoSQLデータベース
- **Firebase Storage**: 音声ファイル保存

### AI・音声処理
- **pyannote.audio**: 話者分離
- **複数音声認識API**: OpenAI、Azure、Google等
- **複数LLM API**: GPT、Claude、Gemini等
- **音声前処理**: ノイズ除去・音量正規化

## 🛠️ セットアップ

### 前提条件
- Node.js 18.0以上
- npm または yarn
- Firebaseプロジェクト
- 各種API キー（音声認識・LLM）

### 1. リポジトリクローン
```bash
git clone <repository-url>
cd voicenote
npm install
```

### 2. 環境変数設定
`.env.local`ファイルを作成:
```bash
cp .env.local.example .env.local
```

必要な環境変数を設定:
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# API Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
# ... その他必要なAPI キー
```

### 3. Firebaseセットアップ
```bash
npm install -g firebase-tools
firebase login
firebase init
```

### 4. 開発サーバー起動
```bash
npm run dev
```

`http://localhost:3000`でアプリケーションにアクセス

### 5. Firebase Emulator（開発用）
```bash
firebase emulators:start
```

## 📁 プロジェクト構造

```
voicenote/
├── src/
│   ├── app/                 # Next.js App Router
│   ├── components/          # UIコンポーネント
│   │   ├── auth/           # 認証関連
│   │   ├── audio/          # 音声処理UI
│   │   └── layout/         # レイアウト
│   ├── hooks/              # カスタムhooks
│   ├── lib/                # ユーティリティ
│   ├── services/           # ビジネスロジック
│   └── types/              # TypeScript型定義
├── firestore.rules         # Firestoreセキュリティルール
├── storage.rules           # Storageセキュリティルール
├── firebase.json           # Firebase設定
└── README.md
```

## 🔐 セキュリティ

### データ保護
- **ユーザー毎分離**: 完全なマルチテナント設計
- **暗号化**: 保存時・転送時の暗号化
- **アクセス制御**: きめ細かい権限管理

### プライバシー
- **自動削除**: 30日後の自動ファイル削除
- **ローカル処理**: 音声学習データのローカル保存
- **匿名化**: 音声データの個人情報除去

## 💰 コスト最適化

### 無料枠活用
- **Firebase**: 無料枠でのフル機能利用
- **各種API**: プロバイダー無料枠の最大活用
- **自動制限**: 予算超過防止機能

### 推奨構成（月額$70〜）
- **音声認識**: Deepgram（無料枠）+ Whisper
- **LLM**: Deepseek（格安）+ フォールバック
- **インフラ**: Firebase + Cloud Run 無料枠

## 🚀 デプロイ

### Firebase Hosting
```bash
npm run build
firebase deploy --only hosting
```

### Cloud Run（音声処理）
```bash
# Python音声処理サービスのデプロイ
gcloud run deploy voicenote-processor \
  --source . \
  --platform managed \
  --region asia-northeast1 \
  --memory 16Gi \
  --cpu 4
```

## 📊 監視・運用

### パフォーマンス
- **処理時間**: 音声長の2-3倍以内
- **同時処理**: 100ユーザー対応
- **稼働率**: 99.0%以上

### 制限（検証版）
- **ファイルサイズ**: 最大5GB
- **音声長**: 最大8時間
- **1日制限**: 2ファイル/ユーザー
- **保存期間**: 30日自動削除

## 🔄 開発ロードマップ

### Phase 1: MVP ✅
- [x] 基本認証・UI
- [x] 音声アップロード・録音
- [x] モック処理パイプライン
- [x] Firebase統合

### Phase 2: 高精度処理 ✅
- [x] pyannote.audio統合
- [x] 複数API統合
- [x] リアルタイム処理
- [x] ユーザー音声学習
- [x] Cloud Run音声処理サービス
- [x] API統合クライアント

### Phase 3: AI機能 📋
- [ ] Ask AI機能
- [ ] 高度な要約生成
- [ ] パフォーマンス最適化
- [ ] 企業向け機能

## 🤝 コントリビューション

1. フォークを作成
2. 機能ブランチを作成 (`git checkout -b feature/AmazingFeature`)
3. コミット (`git commit -m 'Add some AmazingFeature'`)
4. プッシュ (`git push origin feature/AmazingFeature`)
5. Pull Request作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で提供されています。

## 📞 サポート

- **Issue**: GitHub Issues
- **ドキュメント**: [Wiki](link-to-wiki)
- **API Reference**: [docs](link-to-docs)

---

**VoiceNote** - 次世代AI音声処理プラットフォーム