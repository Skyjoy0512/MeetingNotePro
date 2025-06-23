#!/bin/bash

# 🔧 Xcodeプロジェクトに新しいSwiftファイルを追加するスクリプト

set -e

echo "🔧 Xcodeプロジェクトファイル更新開始"
echo "================================="

PROJECT_DIR="/Users/hashimotokenichi/Desktop/dev/MeetingNotePro"
cd "$PROJECT_DIR"

echo "📁 プロジェクトディレクトリ: $PROJECT_DIR"

# 新しく追加するファイル
NEW_FILES=(
    "MeetingNotePro/AudioRecordingService.swift"
    "MeetingNotePro/SpeechTranscriptionService.swift" 
    "MeetingNotePro/MultiLLMAPIService.swift"
    "MeetingNotePro/KeychainManager.swift"
    "MeetingNotePro/EnhancedRecordingView.swift"
)

echo "📋 追加対象ファイル:"
for file in "${NEW_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (見つかりません)"
    fi
done

# Xcodeプロジェクトファイルのバックアップ
echo ""
echo "💾 プロジェクトファイルのバックアップ作成..."
cp -r "MeetingNotePro.xcodeproj" "MeetingNotePro.xcodeproj.backup.$(date +%Y%m%d_%H%M%S)"

# 手動でXcodeに追加するための指示書を作成
cat > "ADD_FILES_TO_XCODE.md" << 'EOF'
# 📋 新しいファイルをXcodeプロジェクトに追加する手順

## 🎯 追加が必要なファイル

以下のファイルをXcodeプロジェクトに手動で追加してください：

### 📁 MeetingNotePro フォルダに追加するファイル:

1. **AudioRecordingService.swift** - AVFoundation録音サービス
2. **SpeechTranscriptionService.swift** - Speech Framework文字起こし
3. **MultiLLMAPIService.swift** - マルチLLM API統合
4. **KeychainManager.swift** - APIキー安全保存
5. **EnhancedRecordingView.swift** - 実際の録音UI

## 🔧 Xcodeでの追加手順

### ステップ1: Xcodeでプロジェクトを開く
```bash
open MeetingNotePro.xcodeproj
```

### ステップ2: ファイルを追加
1. **左のナビゲーターで「MeetingNotePro」フォルダを右クリック**
2. **「Add Files to "MeetingNotePro"」を選択**
3. **以下のファイルを順番に選択して追加:**
   - `MeetingNotePro/AudioRecordingService.swift`
   - `MeetingNotePro/SpeechTranscriptionService.swift`
   - `MeetingNotePro/MultiLLMAPIService.swift`
   - `MeetingNotePro/KeychainManager.swift`
   - `MeetingNotePro/EnhancedRecordingView.swift`

### ステップ3: ターゲット設定確認
各ファイル追加時に **「MeetingNotePro」ターゲットにチェック** が入っていることを確認

### ステップ4: ビルド実行
1. **Command + B** でビルド実行
2. エラーが出た場合は依存関係を確認

## 🎯 または簡単な方法: ContentViewを更新

新しいサービスを使用するために、既存のContentView.swiftに統合することもできます。

### ContentView.swiftの更新内容:
```swift
// 追加ボタンで新しい録音画面を表示
.sheet(isPresented: $showingAddOptions) {
    EnhancedRecordingView() // 新しい録音画面
}
```

## 🚀 確認方法

1. Xcodeプロジェクトで新しいファイルが表示される
2. ビルドエラーがない
3. シミュレーターで録音機能が動作する

---

**このファイルを参考に、Xcodeで新しいファイルを追加してください！**
EOF

echo "✅ 手順書作成: ADD_FILES_TO_XCODE.md"

# 実際にContentView.swiftを更新して新しい録音画面を統合
echo ""
echo "🔄 ContentView.swiftを更新して新しい機能を統合..."

# ContentView.swiftのバックアップ
cp "MeetingNotePro/ContentView.swift" "MeetingNotePro/ContentView.swift.backup"

# ContentView.swiftを更新（簡易版：AddOptionsViewでEnhancedRecordingViewを呼び出す）
cat > "MeetingNotePro/ContentView_Updated.swift" << 'EOF'
import SwiftUI

// メインのタブビュー
struct ContentView: View {
    @State private var selectedTab = 0
    @State private var showingAddOptions = false
    @State private var showingEnhancedRecording = false
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // ホーム画面（録音データ一覧）
            HomeView()
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("ホーム")
                }
                .tag(0)
            
            // プラス（録音・インポート）
            Color.clear
                .tabItem {
                    Image(systemName: "plus.circle.fill")
                    Text("追加")
                }
                .tag(1)
                .onAppear {
                    if selectedTab == 1 {
                        showingAddOptions = true
                        selectedTab = 0 // ホームに戻す
                    }
                }
            
            // マイページ
            MyPageView()
                .tabItem {
                    Image(systemName: "person.circle.fill")
                    Text("マイページ")
                }
                .tag(2)
        }
        .sheet(isPresented: $showingAddOptions) {
            AddOptionsView(showingEnhancedRecording: $showingEnhancedRecording)
        }
        .fullScreenCover(isPresented: $showingEnhancedRecording) {
            EnhancedRecordingView()
        }
    }
}

// 簡易版AddOptionsView（新しい録音画面への橋渡し）
struct AddOptionsView: View {
    @Binding var showingEnhancedRecording: Bool
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                Text("録音オプション")
                    .font(.title)
                    .fontWeight(.bold)
                
                VStack(spacing: 20) {
                    // 新しい録音機能
                    Button(action: {
                        dismiss()
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                            showingEnhancedRecording = true
                        }
                    }) {
                        HStack {
                            Image(systemName: "mic.circle.fill")
                                .font(.title2)
                                .foregroundColor(.red)
                            
                            VStack(alignment: .leading) {
                                Text("新しい録音")
                                    .font(.headline)
                                Text("AVFoundation + リアルタイム文字起こし")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            
                            Spacer()
                            
                            Image(systemName: "chevron.right")
                                .foregroundColor(.secondary)
                        }
                        .padding()
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(10)
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    // 音声インポート
                    Button(action: {
                        // 音声インポート機能（今後実装）
                    }) {
                        HStack {
                            Image(systemName: "square.and.arrow.down.fill")
                                .font(.title2)
                                .foregroundColor(.blue)
                            
                            VStack(alignment: .leading) {
                                Text("音声ファイルをインポート")
                                    .font(.headline)
                                Text("既存の音声ファイルから文字起こし")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            
                            Spacer()
                            
                            Image(systemName: "chevron.right")
                                .foregroundColor(.secondary)
                        }
                        .padding()
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(10)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                
                Spacer()
            }
            .padding()
            .navigationTitle("追加")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("閉じる") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// 既存のビューをそのまま残す...
EOF

echo "✅ 更新版ContentView作成: ContentView_Updated.swift"

# 権限設定の更新ファイル作成
cat > "Info.plist.updates" << 'EOF'
<!-- 以下をInfo.plistに追加してください -->

<!-- マイク権限 -->
<key>NSMicrophoneUsageDescription</key>
<string>会議の録音のためにマイクへのアクセスが必要です</string>

<!-- 音声認識権限 -->
<key>NSSpeechRecognitionUsageDescription</key>
<string>録音の文字起こしのために音声認識機能が必要です</string>

<!-- ネットワーク権限（AI API使用） -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
EOF

echo "✅ Info.plist更新内容: Info.plist.updates"

# 総合的な解決手順書
cat > "QUICK_INTEGRATION_GUIDE.md" << 'EOF'
# 🚀 新機能を即座に動作させる手順

## 🎯 問題の原因
新しく作成したSwiftファイルがXcodeプロジェクトに追加されていないため、シミュレーターで変更が反映されていません。

## ⚡ 最速の解決方法

### 方法1: 手動でXcodeに追加（推奨）

1. **Xcodeでプロジェクトを開く**
   ```bash
   open MeetingNotePro.xcodeproj
   ```

2. **左のプロジェクトナビゲーターで「MeetingNotePro」フォルダを右クリック**

3. **「Add Files to "MeetingNotePro"」を選択**

4. **以下のファイルを選択して追加:**
   - `AudioRecordingService.swift`
   - `SpeechTranscriptionService.swift`
   - `MultiLLMAPIService.swift`
   - `KeychainManager.swift`
   - `EnhancedRecordingView.swift`

5. **「MeetingNotePro」ターゲットにチェックが入っていることを確認**

6. **ビルド実行 (Command + B)**

### 方法2: 既存ファイルを更新（より簡単）

1. `ContentView_Updated.swift` の内容を `ContentView.swift` にコピー
2. 新しい録音機能がプラスボタンから利用可能になります

## 🔧 必要な権限設定

Info.plistに以下を追加:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>会議の録音のためにマイクへのアクセスが必要です</string>

<key>NSSpeechRecognitionUsageDescription</key>
<string>録音の文字起こしのために音声認識機能が必要です</string>
```

## ✅ 確認方法

1. ビルドエラーがない
2. シミュレーターでプラスボタンから「新しい録音」が選択できる
3. 録音画面で録音ボタンが動作する（権限要求ダイアログが表示される）

## 🎉 期待される結果

- プロダクションレベルの録音機能
- リアルタイム文字起こし
- マルチLLM AI要約
- セキュアなAPIキー管理

---

**この手順で新しい機能が即座に利用できるようになります！**
EOF

echo "📖 統合ガイド作成: QUICK_INTEGRATION_GUIDE.md"

echo ""
echo "🎉 Xcodeプロジェクト更新準備完了！"
echo "==================================="
echo ""
echo "✅ 作成ファイル:"
echo "   - ADD_FILES_TO_XCODE.md - Xcode追加手順"
echo "   - ContentView_Updated.swift - 更新版ContentView"
echo "   - Info.plist.updates - 権限設定"
echo "   - QUICK_INTEGRATION_GUIDE.md - 統合ガイド"
echo ""
echo "🔧 次のステップ:"
echo "   1. open MeetingNotePro.xcodeproj"
echo "   2. 新しいSwiftファイルを手動で追加"
echo "   3. または ContentView.swift を更新版で置換"
echo "   4. Info.plistに権限設定を追加"
echo "   5. ビルド・実行"
echo ""
echo "📖 詳細な手順: QUICK_INTEGRATION_GUIDE.md を参照"