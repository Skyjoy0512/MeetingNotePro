# 🔧 Xcodeプロジェクトにファイルを追加

## ❌ 現在のエラー
```
Cannot find 'RecordingView' in scope
Cannot find 'TranscriptView' in scope  
Cannot find 'SummaryView' in scope
Cannot find 'AskAIView' in scope
```

## ✅ 解決方法

### 方法1: Xcodeで手動追加（推奨）

1. **Xcodeでプロジェクトを開く**
   ```bash
   open MeetingNotePro.xcodeproj
   ```

2. **ファイルを追加**
   - Project Navigator（左側）で "MeetingNotePro" フォルダを右クリック
   - "Add Files to 'MeetingNotePro'..." を選択

3. **以下のファイルを選択して追加**
   ```
   MeetingNotePro/RecordingView.swift
   MeetingNotePro/TranscriptView.swift  
   MeetingNotePro/SummaryView.swift
   MeetingNotePro/AskAIView.swift
   ```

4. **追加設定**
   - "Added folders" → "Create groups" を選択
   - "Add to target" → "MeetingNotePro" にチェック
   - "Add" ボタンをクリック

### 方法2: ドラッグ＆ドロップ

1. **Finderでファイルを選択**
   ```
   MeetingNotePro/RecordingView.swift
   MeetingNotePro/TranscriptView.swift  
   MeetingNotePro/SummaryView.swift
   MeetingNotePro/AskAIView.swift
   ```

2. **Xcodeのプロジェクトナビゲーターにドラッグ**
   - 左側の "MeetingNotePro" フォルダにドロップ

3. **設定確認**
   - "Copy items if needed" にチェック
   - "Create groups" を選択
   - "MeetingNotePro" ターゲットにチェック

## 🔍 追加後の確認

### Project Navigatorに表示されているか確認:
```
📁 MeetingNotePro
  📄 MeetingNoteProApp.swift
  📄 ContentView.swift
  📄 RecordingView.swift     ← 追加
  📄 TranscriptView.swift    ← 追加  
  📄 SummaryView.swift       ← 追加
  📄 AskAIView.swift         ← 追加
  📁 Preview Content
```

### ビルド確認:
- **⌘+B** でビルド実行
- エラーが消えることを確認
- **⌘+R** でアプリを実行

## 🚨 トラブルシューティング

### ファイルが見つからない場合:
```bash
# ファイルの存在確認
ls -la MeetingNotePro/*.swift
```

### まだエラーが出る場合:
1. **Clean Build Folder**: Product → Clean Build Folder
2. **Derived Data削除**: Xcode → Preferences → Locations → Derived Data → Delete
3. **プロジェクト再起動**: Xcodeを再起動

### ターゲットに追加されていない場合:
1. ファイルを選択 → File Inspector（右側）
2. "Target Membership" で "MeetingNotePro" にチェック

## ✅ 成功の確認

追加完了後、以下が動作するはずです:
- ✅ ビルドエラーが解消
- ✅ 各ボタンをタップで画面遷移
- ✅ 録音、文字起こし、AI要約、AskAI画面が表示
- ✅ デモ機能が動作

ファイル追加後、**⌘+R** で実行してください！