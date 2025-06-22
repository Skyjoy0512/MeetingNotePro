# MeetingNote Pro - 議事録作成アプリ

## 重要: Claude Codeへの指示

**すべてのコード生成、説明、コメント、ドキュメントは日本語で記述してください。**
- コード内のコメントは日本語
- 変数名・関数名は英語（Swift標準に従う）
- エラーメッセージは日本語
- ログ出力は日本語
- README、ドキュメント類は日本語
- Claude Codeとの対話は日本語で行う

## プロジェクト概要

ビジネスパーソン向けの議事録作成支援iOSアプリ。ウィジェットからの簡単録音開始、高精度ローカル文字起こし、AI要約機能、AskAI機能を組み合わせ、効率的な議事録作成を実現する有料アプリ。

## 技術スタック

- **言語**: Swift
- **フレームワーク**: SwiftUI, UIKit
- **対象**: iOS 15.0+
- **アーキテクチャ**: MVVM + Clean Architecture
- **データ管理**: Core Data (ローカル), CloudKit (設定同期), Firebase (認証・ユーザー管理)

## 主要機能

1. **録音機能**: ウィジェット・アプリ内からの録音、バックグラウンド対応
2. **文字起こし**: iOS Speech Frameworkによるローカル処理
3. **話者識別**: iOS標準機能、困難な場合はGemini 1.5 Flash使用
4. **AI要約**: ユーザーテンプレート選択 → Gemini APIで要約処理
5. **AskAI**: 文字起こし・要約内容への質問・回答機能
6. **アカウント管理**: Google/Apple ID必須サインアップ
7. **ウィジェット**: ホーム画面・コントロールセンター対応
8. **広告**: 無料プラン向けAdMob統合

## 料金プラン

- **無料**: 録音・文字起こしのみ（月10回制限）、広告表示あり
- **ユーザーAPI**: ¥300/月（自分のAPIキー使用、無制限）
- **アプリ内蔵API**: ¥500/月（要約50回、AskAI100回制限）

## 開発方針

1. **プライバシー重視**: 録音データは完全ローカル保存
2. **iOS標準準拠**: Human Interface Guidelines遵守
3. **段階的リリース**: MVP → 機能拡張の順次展開
4. **コスト最適化**: ランニングコスト最小限設計

## 外部API・SDK

- Firebase Authentication & Firestore
- Google Sign-In SDK
- AuthenticationServices (Sign in with Apple)
- Gemini API (要約・AskAI・話者識別)
- GoogleMobileAds (AdMob)
- Speech Framework (iOS標準)
- AVFoundation (録音)
- WidgetKit (ウィジェット)

## データ構造

### ローカルデータ (Core Data)
- Recording: 録音データ・メタデータ
- Transcript: 文字起こし結果・話者情報
- Summary: AI要約結果
- AskAIConversation: チャット履歴
- CustomTemplate: カスタムプロンプトテンプレート

### クラウドデータ (Firebase)
- User: ユーザー情報・サブスクリプション状況
- UserSettings: APIキー・設定情報
- Templates: カスタムテンプレート同期

## セキュリティ

- APIキー: Keychain安全保存
- 認証: Touch ID/Face ID対応
- データ暗号化: ローカルデータ保護
- プライバシー: 録音データ外部送信なし

## 開発フェーズ

### ✅ Phase 1 (MVP) - 実装済み
- ✅ 基本認証機能（Google/Apple Sign-In）
- ✅ AVFoundation録音機能（バックグラウンド対応）
- ✅ Core Dataデータ管理
- ✅ Firebase Authentication統合
- ✅ Clean Architecture + MVVM構造
- ✅ 基本UI（認証、ダッシュボード、録音画面）

### 🔄 Phase 2 - 進行中
- 🔄 Speech Framework文字起こし機能
- 🔄 Gemini API統合・AI要約機能
- 話者識別機能
- AskAI機能
- カスタムテンプレート

### Phase 3 - 未実装
- ウィジェット実装
- 広告統合
- 高度な検索・分類
- エクスポート機能強化
- パフォーマンス最適化

## 現在の実装状況

### プロジェクト構造
```
MeetingNotePro/
├── App/
│   └── MeetingNoteProApp.swift     # ✅ アプリエントリーポイント
├── Core/
│   ├── Constants/AppConstants.swift # ✅ アプリ定数
│   ├── Extensions/                  # ✅ Date, String拡張
│   └── Utilities/                   # ✅ Logger, KeychainManager
├── Data/
│   ├── Models/                      # ✅ Core Dataモデル完成
│   ├── DataSources/
│   │   ├── Local/CoreDataManager.swift      # ✅ 実装済み
│   │   ├── Remote/FirebaseManager.swift     # ✅ 実装済み
│   │   └── Device/AudioRecordingService.swift # ✅ 実装済み
│   └── CoreData/                    # ✅ スキーマ定義済み
├── Presentation/
│   ├── Views/
│   │   ├── Auth/                    # ✅ WelcomeView, SignInView
│   │   ├── Dashboard/               # ✅ DashboardView
│   │   ├── Recording/               # ✅ RecordingView
│   │   └── Settings/                # ✅ SettingsView (基本)
│   └── ViewModels/                  # ✅ AuthViewModel, RecordingViewModel
└── Resources/
    └── Info.plist                   # ✅ 権限・設定完了
```

## 重要な実装ポイント

1. **バックグラウンド録音**: AVAudioSession適切設定
2. **メモリ管理**: 長時間録音時のメモリリーク対策
3. **API呼び出し最適化**: トークン使用量の効率化
4. **エラーハンドリング**: ネットワーク・API制限の適切な処理
5. **UX配慮**: 処理中のローディング表示・進捗管理

## App Store対策

- キーワード: 議事録、文字起こし、AI要約、会議、録音
- 年齢制限: 4+
- カテゴリ: ビジネス、生産性
- サブスクリプション: App Store Connect適切設定
