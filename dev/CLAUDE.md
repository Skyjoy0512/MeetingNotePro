# CLAUDE.md

この議事録作成アプリ「MeetingNotePro」の開発において、Claude Codeへの指示です。

## 重要: 日本語での開発

**すべてのコード生成、説明、コメント、ドキュメントは日本語で記述してください。**

## プロジェクト概要

ビジネスパーソン向けの本格的な議事録作成支援iOSアプリ。Clean Architecture + MVVMで設計された、録音・文字起こし・AI要約機能を持つプロフェッショナルアプリです。

## 開発コマンド

### ビルド・実行
```bash
# Xcodeで開く
open MeetingNotePro/MeetingNotePro.xcodeproj

# または直接ビルド・実行（Cmd+R）
```

### 通知機能
```bash
# Claude開発用通知スクリプト
./notify-claude.sh "メッセージ" [タイプ]

# 使用例
./notify-claude.sh "ビルドが完了しました" completed
./notify-claude.sh "次の実装方針を確認してください" question  
./notify-claude.sh "エラーが発生しました" error
./notify-claude.sh "情報をお知らせします" info
```

### 対象環境
- iOS 15.0+
- Xcode 15+
- Swift 5.9+

## 現在の実装状況

### ✅ 完了済み (MVP Phase 1)
1. **プロジェクト基盤**
   - Clean Architecture + MVVM構造
   - Core Data データモデル完成
   - Firebase Authentication統合

2. **認証機能**
   - Google Sign-In
   - Sign in with Apple
   - ユーザー設定同期（Firebase）

3. **録音機能**
   - AVFoundation高品質録音
   - バックグラウンド録音対応
   - 音声レベルビジュアライザー
   - 録音メタデータ管理

4. **UI/UX**
   - ウェルカム・オンボーディング
   - 認証フロー（WelcomeView, SignInView）
   - メインタブナビゲーション
   - ダッシュボード・統計表示
   - 録音画面（リアルタイム表示）

### ✅ 完了済み (Phase 2)
- Speech Framework文字起こし機能
- Gemini API統合・AI要約機能
- AskAI機能

### ✅ 完了済み (Phase 3)
- ホーム画面ウィジェット（小・中・大サイズ対応）
- コントロールセンターウィジェット
- WidgetKit + App Intent統合
- Deep Link連携機能
- App Store サブスクリプション完全実装
  - 3つのプラン（無料/ユーザーAPI/アプリ内蔵API）
  - 使用量制限・追跡機能
  - プラン管理UI
- 高度な話者識別機能
  - 音声特徴量解析（F0, フォルマント, MFCC）
  - K-meansクラスタリング
  - 感度設定（低/中/高）
  - 音声タイプ分類
- AdMob広告統合完全実装
  - バナー・インタースティシャル・リワード広告
  - 表示頻度制御（5分間隔、日次制限）
  - サブスクリプション連携
  - 広告統計・設定UI

### 📋 今後の実装
- パフォーマンス最適化
- エラーハンドリング改善
- UI/UXポリッシュ

## プロジェクト構造

```
MeetingNotePro/
├── App/                           # アプリケーション層
├── Core/                          # 共通機能
│   ├── Constants/                 # 定数
│   ├── Extensions/                # 拡張機能
│   └── Utilities/                 # ユーティリティ
├── Data/                          # データ層
│   ├── Models/                    # Core Dataモデル
│   ├── DataSources/              # データソース
│   └── CoreData/                 # Core Dataスキーマ
├── Presentation/                  # プレゼンテーション層
│   ├── Views/                     # SwiftUI Views
│   ├── ViewModels/               # MVVM ViewModels
│   └── Components/               # 再利用コンポーネント
└── Resources/                     # リソース
```

## アーキテクチャ

- **Clean Architecture**: レイヤー分離
- **MVVM Pattern**: データバインディング
- **Core Data**: ローカル永続化
- **Firebase**: クラウド認証・同期
- **Combine**: リアクティブプログラミング

## セキュリティ・プライバシー

- 録音データは端末内保存（外部送信なし）
- APIキーはKeychain保存
- Firebase認証によるセキュアなユーザー管理
- プライバシー重視設計

## 開発時の注意点

1. **日本語優先**: すべての出力は日本語で
2. **Clean Architecture遵守**: レイヤー間の依存関係を保つ
3. **プライバシー重視**: 録音データの取り扱いに注意
4. **段階的実装**: MVPから順次機能追加

詳細な開発計画は `MeetingNotePro/docs/development_plan.md` を参照してください。