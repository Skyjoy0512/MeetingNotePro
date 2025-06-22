# ✅ MeetingNotePro クイックスタート チェックリスト

## 🔥 Firebase 設定 (必須)

### Step 1: Firebase プロジェクト作成
- [ ] [Firebase Console](https://console.firebase.google.com/) でプロジェクト作成
- [ ] プロジェクト名: `MeetingNotePro`
- [ ] Google Analytics を有効化

### Step 2: iOS アプリ追加
- [ ] バンドルID: `com.meetingnotepro.app`
- [ ] GoogleService-Info.plist をダウンロード
- [ ] テンプレートファイルと置き換え

### Step 3: Authentication 設定
- [ ] Google Sign-In を有効化
- [ ] Apple Sign-In を有効化
- [ ] サポートメールを設定

### Step 4: Firestore Database
- [ ] データベースを作成（本番モード）
- [ ] セキュリティルールを設定
- [ ] ロケーション: asia-northeast1

### Step 5: Cloud Storage
- [ ] ストレージを作成（本番モード）
- [ ] セキュリティルールを設定

## 🤖 Gemini API 設定

### Step 6: API キー取得
- [ ] [Google AI Studio](https://aistudio.google.com/) でAPIキー作成
- [ ] APIキーをメモまたはコピー

### Step 7: アプリ内設定
- [ ] Settings画面でAPIキーを入力
- [ ] Keychain保存の確認

## 📱 Xcode 統合

### Step 8: パッケージ依存関係
- [ ] Firebase iOS SDK を追加
- [ ] Google Sign-In SDK を追加
- [ ] Google Generative AI SDK を追加

### Step 9: プロジェクト設定
- [ ] Bundle Identifier: `com.meetingnotepro.app`
- [ ] Info.plist の URL Scheme 更新
- [ ] Sign in with Apple capability 追加

### Step 10: ファイル配置
- [ ] GoogleService-Info.plist を正しい場所に配置
- [ ] Xcode で Target Membership 確認

## 🧪 動作テスト

### Step 11: 基本機能確認
- [ ] アプリが起動する
- [ ] Firebase接続が成功する
- [ ] Google Sign-In が動作する
- [ ] Apple Sign-In が動作する

### Step 12: 音声機能確認
- [ ] マイク権限が正しく要求される
- [ ] 録音が開始・停止できる
- [ ] 音声レベルが表示される
- [ ] ファイルが保存される

### Step 13: AI機能確認
- [ ] 文字起こしが実行される
- [ ] AI要約が生成される
- [ ] AskAI機能が動作する
- [ ] APIエラーハンドリングが正常

## 📋 完了後の確認項目

### セキュリティ
- [ ] APIキーがKeychainに安全に保存されている
- [ ] 録音データが端末内にのみ保存されている
- [ ] Firestore/Storageのアクセス権限が適切

### パフォーマンス
- [ ] 長時間録音でメモリリークが発生しない
- [ ] 大きなファイルの処理が正常
- [ ] UI応答性が良好

### エラーハンドリング
- [ ] ネットワークエラー時の対応
- [ ] API制限時の表示
- [ ] 権限拒否時の案内

## 🚀 App Store 準備（オプション）

### 開発証明書
- [ ] Apple Developer アカウント
- [ ] App ID作成
- [ ] プロビジョニングプロファイル

### App Store Connect
- [ ] アプリ登録
- [ ] メタデータ設定
- [ ] スクリーンショット準備

## 📞 サポート情報

### 問題が発生した場合

1. **Firebase接続エラー**
   - GoogleService-Info.plist の配置確認
   - Bundle ID の一致確認
   - セキュリティルールの確認

2. **認証エラー**
   - URL Scheme の設定確認
   - サポートメールの設定確認
   - Apple Developer設定確認

3. **API エラー**
   - Gemini APIキーの有効性確認
   - ネットワーク接続確認
   - API使用量制限確認

4. **音声機能エラー**
   - マイク権限の確認
   - 音声認識権限の確認
   - バックグラウンドモード設定確認

### デバッグ用コマンド

```swift
// Firebase接続確認
print("Firebase app: \(FirebaseApp.app()?.name ?? "not configured")")

// 認証状態確認
print("Auth user: \(Auth.auth().currentUser?.uid ?? "not signed in")")

// Firestore接続確認
Firestore.firestore().enableNetwork { error in
    print("Firestore network: \(error?.localizedDescription ?? "connected")")
}

// パフォーマンス監視
let report = PerformanceMonitor.shared.generatePerformanceReport()
print("Performance: \(report)")
```

## 🎉 完了！

全ての項目をチェックしたら、MeetingNoteProアプリが完全に動作可能になります。

高品質な議事録作成体験をお楽しみください！