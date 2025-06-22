# ✈️ TestFlight 動作確認 - クイックスタート

## 🎯 目的: TestFlightで実機動作確認

App Storeリリース前に、実機でMeetingNoteProの動作を確認します。

## ⚡ 最短手順（30分で完了）

### 1. TestFlight自動化セットアップ（2分）
```bash
cd /Users/hashimotokenichi/Desktop/dev/MeetingNotePro
./testflight-setup.sh
```

### 2. Apple Developer設定（10分）
1. **[App Store Connect](https://appstoreconnect.apple.com/)** にログイン
2. **「マイApp」** → **「+」** → **「新規App」**
3. 設定値:
   ```
   プラットフォーム: iOS
   名前: MeetingNotePro
   プライマリ言語: 日本語
   バンドルID: com.meetingnotepro.app (新規作成)
   SKU: meetingnotepro-2024
   ```

### 3. Fastlane設定（5分）
```bash
# Appfile を編集
nano fastlane/Appfile
```

以下の内容に更新:
```ruby
app_identifier("com.meetingnotepro.app")
apple_id("あなたのApple ID")  # 例: developer@company.com
team_id("あなたのTeam ID")    # App Store Connect → Membership で確認
```

### 4. Firebase設定確認（3分）
```bash
./check-firebase-setup.sh
```
- ❌ が表示される項目があれば、Firebase設定を完了してください

### 5. 初回TestFlightビルド（10分）
```bash
# 内部テスト用ビルド
fastlane testflight_dev
```

## 📱 テスト手順

### 1. TestFlightアプリインストール
- App Storeから **「TestFlight」** をダウンロード
- Apple IDでログイン

### 2. 内部テスターとして自分を追加
1. App Store Connect → TestFlight → 内部テスト
2. **「内部テスターを追加」** で自分のApple IDを追加

### 3. アプリインストール・テスト
1. TestFlightから **「MeetingNotePro」** をインストール
2. 基本動作確認:
   ```
   ✅ アプリ起動
   ✅ Google/Apple Sign-In
   ✅ マイク権限許可
   ✅ 30秒録音
   ✅ 文字起こし実行
   ✅ AI要約生成
   ✅ AskAI質問
   ```

### 4. フィードバック送信
- TestFlightアプリ内でフィードバック送信
- スクリーンショット付きでバグ報告

## 🔄 継続的テストフロー

### 開発サイクル
```bash
# 1. コード修正
# 2. テスト実行
./run-tests.sh

# 3. TestFlight配布
fastlane testflight_dev

# 4. 実機テスト
# 5. フィードバック反映
```

### 段階的配布
```bash
# Phase 1: 内部テスト（開発チーム）
fastlane testflight_dev

# Phase 2: 外部ベータテスト
fastlane testflight_beta

# Phase 3: App Store申請準備
fastlane testflight_beta  # 最終版
```

## 🧪 重要テストシナリオ

### 基本機能テスト（必須）
- [ ] 認証機能
- [ ] 録音機能（バックグラウンド含む）
- [ ] 文字起こし精度
- [ ] AI要約品質
- [ ] AskAI応答性

### 実用テスト（推奨）
- [ ] 実際の会議で30分録音
- [ ] 複数話者の識別
- [ ] ネットワーク不安定時の動作
- [ ] 長時間使用時のバッテリー消費

### エラーハンドリング（重要）
- [ ] 権限拒否時の案内
- [ ] API制限到達時の表示
- [ ] ストレージ不足時の対応

## 🚨 トラブルシューティング

### よくある問題

#### 1. ビルドが失敗する
```bash
# 証明書の問題を解決
fastlane sync_certificates

# 依存関係を再インストール
./install-dependencies.sh
```

#### 2. TestFlightにアプリが表示されない
- App Store Connect で処理完了を確認（最大30分）
- 内部テスターとして正しく追加されているか確認

#### 3. 実機で機能が動作しない
- Firebase設定の確認: `./check-firebase-setup.sh`
- API キーの設定確認
- デバイス権限設定の確認

### デバッグ情報の確認
```swift
// Xcode Console で確認
print("Firebase: \(FirebaseApp.app()?.name ?? "未設定")")
print("Auth: \(Auth.auth().currentUser?.uid ?? "未認証")")
print("API Key: \(KeychainManager.shared.retrieve(for: .geminiAPIKey) != nil)")
```

## 📊 成功基準

### TestFlight配布成功
- [ ] ビルドがApp Store Connectに表示
- [ ] TestFlightからインストール可能
- [ ] アプリが実機で起動

### 機能動作成功
- [ ] 基本ワークフロー（録音→文字起こし→要約→AskAI）が完動
- [ ] クラッシュなし
- [ ] 重要なエラーなし

### App Store申請準備
- [ ] 外部ベータテストで安定動作
- [ ] テスターからの肯定的フィードバック
- [ ] 重要バグの修正完了

## 🎉 次のステップ

TestFlightでの動作確認が完了したら:

1. **外部ベータテスター募集**
2. **本格的なユーザーテスト**
3. **App Store審査申請**
4. **一般リリース**

これでMeetingNoteProが実機で完全に動作することを確認できます！