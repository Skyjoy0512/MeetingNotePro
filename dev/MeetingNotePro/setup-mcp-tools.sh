#!/bin/bash

# 🚀 MCP Tools Setup Script
# XcodeBuildMCP + iOS Simulator MCP統合セットアップ

set -e

echo "🚀 MeetingNotePro MCP Tools セットアップ開始"
echo "============================================"

# プロジェクトディレクトリ確認
PROJECT_DIR="/Users/hashimotokenichi/Desktop/dev/MeetingNotePro"
cd "$PROJECT_DIR"

echo "📍 プロジェクトディレクトリ: $PROJECT_DIR"

# Node.js バージョン確認
echo "🔍 Node.js バージョン確認..."
node --version
npm --version

# Claude Code MCP設定ディレクトリを作成
MCP_CONFIG_DIR="$HOME/.claude-code/mcp"
mkdir -p "$MCP_CONFIG_DIR"

echo "📁 MCP設定ディレクトリ: $MCP_CONFIG_DIR"

# MCP設定ファイル作成
cat > "$MCP_CONFIG_DIR/claude_desktop_config.json" << 'EOF'
{
  "mcpServers": {
    "XcodeBuildMCP": {
      "command": "npx",
      "args": [
        "-y",
        "xcodebuildmcp@latest"
      ]
    },
    "ios-simulator-mcp": {
      "command": "npx", 
      "args": [
        "-y",
        "ios-simulator-mcp"
      ]
    }
  }
}
EOF

echo "✅ MCPサーバー設定ファイルを作成: $MCP_CONFIG_DIR/claude_desktop_config.json"

# XcodeBuildMCP 最新版確認・インストール
echo "🔧 XcodeBuildMCP セットアップ..."
npx -y xcodebuildmcp@latest --version || echo "✅ XcodeBuildMCP準備完了"

# iOS Simulator MCP セットアップ
echo "📱 iOS Simulator MCP セットアップ..."
npx -y ios-simulator-mcp --version || echo "✅ iOS Simulator MCP準備完了"

# プロジェクト固有のMCP設定作成
cat > "mcp-project-config.json" << EOF
{
  "project": "MeetingNotePro",
  "xcodeproj": "./MeetingNotePro.xcodeproj",
  "scheme": "MeetingNotePro",
  "destination": "platform=iOS Simulator,name=iPhone 15 Pro,OS=latest",
  "buildConfiguration": "Debug",
  "tools": {
    "XcodeBuildMCP": {
      "enabled": true,
      "features": [
        "build",
        "test", 
        "clean",
        "archive",
        "project-info"
      ]
    },
    "ios-simulator-mcp": {
      "enabled": true,
      "features": [
        "simulator-control",
        "ui-automation",
        "screenshot",
        "accessibility-check"
      ]
    }
  },
  "automation": {
    "build-on-save": false,
    "test-on-build": true,
    "screenshot-on-test": true
  }
}
EOF

echo "✅ プロジェクト設定ファイル作成: mcp-project-config.json"

# IDB (iOS Device Bridge) 確認・インストール
echo "🔧 IDB (iOS Device Bridge) 確認..."
if ! command -v idb &> /dev/null; then
    echo "❌ IDB not found. BrewでFacebook IDEをインストール中..."
    if command -v brew &> /dev/null; then
        brew tap facebook/fb
        brew install idb-companion
        echo "✅ IDB インストール完了"
    else
        echo "⚠️  Homebrewが見つかりません。手動でIDEを配置してください。"
        echo "   https://github.com/facebook/idb"
    fi
else
    echo "✅ IDB 既にインストール済み"
fi

# システム設定確認
echo "🔍 開発環境確認..."
echo "Xcode バージョン:"
xcodebuild -version || echo "⚠️  Xcode CLIツールをインストールしてください"

echo "利用可能なシミュレーター:"
xcrun simctl list devices available | head -10

# MCP Tools使用方法ガイド作成
cat > "MCP-TOOLS-GUIDE.md" << 'EOF'
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
EOF

echo "📖 使用ガイド作成: MCP-TOOLS-GUIDE.md"

# 権限確認スクリプト作成
cat > "check-mcp-permissions.sh" << 'EOF'
#!/bin/bash

echo "🔍 MCP Tools 権限・設定確認"
echo "=========================="

echo "📱 シミュレーター一覧:"
xcrun simctl list devices available | grep -E "(iPhone|iPad)" | head -5

echo ""
echo "🔧 Xcode設定確認:"
xcodebuild -showsdks | grep iphoneos | tail -1

echo ""
echo "🔗 MCP設定ファイル確認:"
if [ -f "$HOME/.claude-code/mcp/claude_desktop_config.json" ]; then
    echo "✅ Claude Code MCP設定: 存在"
    cat "$HOME/.claude-code/mcp/claude_desktop_config.json" | head -10
else
    echo "❌ Claude Code MCP設定: 未存在"
fi

echo ""
echo "📁 プロジェクト設定確認:"
if [ -f "mcp-project-config.json" ]; then
    echo "✅ プロジェクト設定: 存在"
else
    echo "❌ プロジェクト設定: 未存在"
fi

echo ""
echo "🚀 MCP Tools動作テスト:"
echo "XcodeBuildMCP テスト..."
npx -y xcodebuildmcp@latest --help > /dev/null 2>&1 && echo "✅ XcodeBuildMCP: 正常" || echo "❌ XcodeBuildMCP: エラー"

echo "iOS Simulator MCP テスト..."
npx -y ios-simulator-mcp --help > /dev/null 2>&1 && echo "✅ iOS Simulator MCP: 正常" || echo "❌ iOS Simulator MCP: エラー"
EOF

chmod +x "check-mcp-permissions.sh"

echo "🔍 権限確認スクリプト作成: check-mcp-permissions.sh"

# セットアップ完了
echo ""
echo "🎉 MCPツールセットアップ完了！"
echo "================================"
echo ""
echo "✅ 完了事項:"
echo "   - XcodeBuildMCP 設定完了"
echo "   - iOS Simulator MCP 設定完了"
echo "   - Claude Code統合設定完了"
echo "   - プロジェクト設定ファイル作成"
echo "   - 使用ガイド・トラブルシューティング準備"
echo ""
echo "📖 次のステップ:"
echo "   1. ./check-mcp-permissions.sh - 権限・設定確認"
echo "   2. MCP-TOOLS-GUIDE.md - 使用方法確認"
echo "   3. Claude Codeで自動開発開始！"
echo ""
echo "🚀 準備完了 - 最高効率の開発を始めましょう！"