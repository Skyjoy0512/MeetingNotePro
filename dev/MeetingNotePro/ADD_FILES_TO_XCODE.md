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
