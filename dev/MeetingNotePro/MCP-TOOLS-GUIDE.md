# 🚀 MCP Tools 使用ガイド

## セットアップ完了内容

### ✅ インストール済みツール
- **XcodeBuildMCP**: Xcode自動ビルド・テスト
- **iOS Simulator MCP**: シミュレーター自動化・UI操作
- **IDB**: iOS Device Bridge (Facebook)

### 📁 設定ファイル
- `~/.claude-code/mcp/claude_desktop_config.json`: Claude Code MCP設定
- `mcp-project-config.json`: プロジェクト固有設定

## 🔧 XcodeBuildMCP 使用方法

### 基本コマンド
```bash
# プロジェクトビルド
npx xcodebuildmcp build --project MeetingNotePro.xcodeproj --scheme MeetingNotePro

# テスト実行
npx xcodebuildmcp test --project MeetingNotePro.xcodeproj --scheme MeetingNotePro

# クリーンビルド
npx xcodebuildmcp clean --project MeetingNotePro.xcodeproj

# プロジェクト情報取得
npx xcodebuildmcp project-info --project MeetingNotePro.xcodeproj
```

### 自動化機能
- **ビルドエラー自動修正**: コンパイルエラーの自動検出・修正提案
- **依存関係管理**: SPM依存関係の自動解決
- **設定最適化**: ビルド設定の自動調整

## 📱 iOS Simulator MCP 使用方法

### シミュレーター制御
```bash
# 起動中シミュレーター取得
npx ios-simulator-mcp get-booted-simulator

# UI要素説明
npx ios-simulator-mcp describe-elements

# スクリーンショット撮影
npx ios-simulator-mcp screenshot

# 指定座標タップ
npx ios-simulator-mcp tap --x 200 --y 400

# テキスト入力
npx ios-simulator-mcp input-text "テストテキスト"

# スワイプ操作
npx ios-simulator-mcp swipe --from-x 100 --from-y 300 --to-x 300 --to-y 300
```

### UI自動化シナリオ
- **アクセシビリティチェック**: 全UI要素の検証
- **ユーザーフロー自動化**: 録音→文字起こし→要約の自動テスト
- **スクリーンショット自動撮影**: テスト結果の視覚的確認

## 🤖 Claude Code統合

### 自動開発ワークフロー
1. **コード生成**: Claude CodeによるSwift実装
2. **自動ビルド**: XcodeBuildMCPによる即座ビルド・エラー検証
3. **UI自動テスト**: iOS Simulator MCPによる動作確認
4. **スクリーンショット**: 実装結果の視覚的記録

### エラー修正フロー
1. Claude Codeがコード実装
2. XcodeBuildMCPが自動ビルド
3. エラー検出時、Claude Codeが自動修正
4. iOS Simulator MCPで動作テスト
5. 成功するまで自動繰り返し

## 🎯 MeetingNotePro向け活用例

### 1. 録音機能テスト
```bash
# 録音画面へ自動遷移
npx ios-simulator-mcp tap --x 200 --y 600  # 録音ボタン

# 録音開始確認
npx ios-simulator-mcp screenshot

# 録音停止テスト
npx ios-simulator-mcp tap --x 200 --y 700  # 停止ボタン
```

### 2. AskAI機能テスト
```bash
# AskAI画面遷移
npx ios-simulator-mcp tap --x 300 --y 800

# 質問入力
npx ios-simulator-mcp input-text "この会議の重要なポイントは？"

# 送信ボタンタップ
npx ios-simulator-mcp tap --x 350 --y 900
```

### 3. 自動回帰テスト
- 全機能の自動操作テスト
- スクリーンショット比較
- パフォーマンス測定
- エラー自動検出

## 🔍 トラブルシューティング

### XcodeBuildMCP
- **ビルドエラー**: `npx xcodebuildmcp clean` → 再ビルド
- **依存関係エラー**: SPM設定自動修正
- **コード署名**: Development Team設定確認

### iOS Simulator MCP
- **シミュレーター未起動**: 手動でシミュレーター起動
- **IDBエラー**: `brew reinstall idb-companion`
- **UI要素見つからない**: アクセシビリティ設定確認

## 📈 次のステップ

1. **バックエンド統合**: MCPツールでAVFoundation実装テスト
2. **Speech Framework**: 文字起こし機能の自動化テスト
3. **Gemini API**: AI機能の統合テスト
4. **本格的UI/UXテスト**: 全機能の包括的テスト

---

**🎉 MCP Tools統合完了！Claude Codeで最高効率の開発を始めましょう！**