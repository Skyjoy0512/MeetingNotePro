# 🔧 コード署名エラーの解決方法

## ❌ 現在のエラー
```
Signing for "MeetingNotePro" requires a development team. 
Select a development team in the Signing & Capabilities editor.
```

## ✅ 解決手順

### 方法1: Xcodeでの設定（推奨）

1. **プロジェクトナビゲーターでプロジェクトを選択**
   - 左側の "MeetingNotePro" プロジェクトファイル（青いアイコン）をクリック

2. **ターゲット選択**
   - 中央のエディタで "MeetingNotePro" ターゲットを選択

3. **Signing & Capabilities タブを開く**
   - 上部の "Signing & Capabilities" タブをクリック

4. **開発チームを設定**
   - "Team" ドロップダウンメニューから以下のいずれかを選択：
     - 個人Apple ID（例: "Your Name (Personal Team)"）
     - 有料Developer Program（持っている場合）

5. **Bundle Identifierを変更**
   - "Bundle Identifier" を一意の値に変更：
   ```
   com.yourname.meetingnotepro
   （例: com.hashimoto.meetingnotepro）
   ```

### 方法2: 自動管理を有効化

1. **"Automatically manage signing" にチェック**
   - このオプションがオンになっていることを確認

2. **Apple IDでサインイン**
   - Xcode → Preferences → Accounts
   - "+" ボタンで Apple ID を追加（まだの場合）

## 🆔 Bundle Identifier の設定

現在: `com.meetingnotepro.app`
変更例: `com.[あなたの名前].meetingnotepro`

### 推奨パターン:
```
com.hashimoto.meetingnotepro
com.yourname.meetingnotepro
com.developer.meetingnotepro
```

## 🔄 設定完了後の確認

1. **エラーが消えることを確認**
   - "Signing & Capabilities" に警告がないこと

2. **再ビルド実行**
   - ⌘+R でビルド・実行

## 💡 補足情報

### Apple IDについて
- **無料**: 個人用Apple IDで7日間有効な証明書
- **有料**: Apple Developer Program（年間$99）で1年間有効

### 実機テスト
- 無料Apple IDでも実機テスト可能
- ただし7日ごとに再署名が必要

### シミュレータ
- コード署名は不要
- 設定後はシミュレータで問題なく動作

## 🚨 トラブルシューティング

### "No signing certificate found" エラーの場合:
1. Xcode → Preferences → Accounts
2. Apple ID を選択 → "Download Manual Profiles"

### Bundle Identifier が重複している場合:
```
com.[あなたの名前].meetingnotepro.test
com.[あなたの名前].meetingnotepro.dev
```
など、より具体的な名前に変更

## ✅ 成功の確認

設定完了後、以下が表示されるはずです：
```
✅ Team: Your Name (Personal Team)
✅ Bundle Identifier: com.yourname.meetingnotepro
✅ Provisioning Profile: Xcode Managed Profile
```

設定が完了したら、**⌘+R** で再度ビルドしてください！