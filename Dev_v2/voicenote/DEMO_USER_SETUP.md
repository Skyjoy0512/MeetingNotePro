# VoiceNote デモユーザー設定手順

## Firebase Consoleでのユーザー作成

### 1. Firebase Console にアクセス
1. [Firebase Console](https://console.firebase.google.com/) を開く
2. プロジェクト「voicenote-dev」を選択

### 2. Authentication設定
1. 左メニューから「Authentication」を選択
2. 「Users」タブをクリック
3. 「Add user」ボタンをクリック

### 3. デモユーザー作成
以下の情報でユーザーを作成：

**Email:** `admin@example.com`
**Password:** `admin123456`
**User UID:** 自動生成されたUIDをコピーしておく

### 4. デモデータ作成
1. 作成されたユーザーのUIDをコピー
2. `setup-demo-data.js`ファイルの`demoUserId`を実際のUIDに更新
3. スクリプト実行: `node setup-demo-data.js`

## テスト用ログイン手順

### 1. VoiceNoteにアクセス
- URL: https://voicenote-dev.web.app

### 2. ログイン
- Email: `admin@example.com`
- Password: `admin123456`

### 3. テスト項目
- [x] ホームページの表示
- [x] API設定ページのアクセス
- [ ] API設定の保存・復元
- [ ] 音声ファイルのアップロード
- [ ] 文字起こし機能

## 自動テスト対応

認証済み状態でのテストを行うには：

1. Playwrightで一度手動ログインを行う
2. セッション状態を保存
3. 以降のテストでセッション状態を復元

```javascript
// セッション保存例
await context.storageState({ path: 'auth-state.json' });

// セッション復元例  
const context = await browser.newContext({ storageState: 'auth-state.json' });
```

## Firebase Authentication 設定確認

### 必要な設定
- [x] Email/Password認証が有効
- [x] Google認証が有効（オプション）
- [x] ドメイン承認済み: voicenote-dev.web.app

### セキュリティルール
Firestoreのセキュリティルールで認証済みユーザーのみアクセス可能に設定済み。