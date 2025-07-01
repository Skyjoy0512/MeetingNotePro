# VoiceNote Playwright MCP デバッグシステム実装提案

## 1. Playwright MCP 利用可能機能調査結果

### 1.1 Microsoft Playwright MCP サーバー機能

#### 基本ブラウザ操作ツール
- **browser_navigate**: URLへの移動
- **browser_click**: 要素クリック操作
- **browser_type**: テキスト入力
- **browser_hover**: マウスホバー
- **browser_select_option**: ドロップダウン選択
- **browser_press_key**: キーボード操作
- **browser_file_upload**: ファイルアップロード
- **browser_handle_dialog**: ブラウザダイアログ処理

#### スクリーンショット・ドキュメント機能
- **browser_take_screenshot**: ページスクリーンショット取得
- **browser_pdf_save**: PDF生成
- **browser_resize**: ブラウザウィンドウリサイズ

#### ナビゲーション機能
- **browser_navigate_back**: 戻る操作
- **browser_navigate_forward**: 進む操作

#### タブ管理機能
- **browser_tab_list**: タブ一覧表示
- **browser_tab_new**: 新しいタブ作成
- **browser_tab_select**: タブ切り替え
- **browser_tab_close**: タブ閉じる

#### リソース監視機能
- **browser_network_requests**: ネットワークリクエスト監視
- **browser_console_messages**: コンソールログ取得

#### ブラウザ管理機能
- **browser_install**: ブラウザインストール
- **browser_close**: ブラウザセッション終了

### 1.2 動作モード
- **Snapshot Mode（推奨）**: アクセシビリティスナップショットベース
- **Vision Mode**: スクリーンショットベースの視覚的操作

## 2. VoiceNoteアプリケーション テスト可能要素分析

### 2.1 確認済み技術スタック
- **フレームワーク**: Next.js（React）
- **言語**: 日本語（ja）
- **レンダリング**: クライアントサイドレンダリング
- **レスポンシブデザイン**: モバイル対応

### 2.2 推定UI要素（要件定義書より）
#### ホームページ
- 音声ファイル一覧（2カラムグリッド）
- 録音ボタン
- アップロードボタン
- 処理ステータス表示

#### 録音ページ
- 録音開始/停止ボタン
- 音声レベル可視化
- 録音時間表示
- 一時停止/再開ボタン

#### API設定ページ
- プロバイダー選択ドロップダウン
- APIキー入力フィールド
- モデル選択
- 保存ボタン

#### 音声詳細ページ
- 音声プレーヤー
- タブ切り替え（文字起こし/要約/Ask AI）
- 話者ラベル編集機能
- テキスト編集エリア

## 3. 自動テストパターン設計

### 3.1 基本機能テスト

#### ページ読み込みテスト
```typescript
// ホームページ読み込み確認
await browser_navigate('https://voicenote-dev.web.app');
await browser_take_screenshot(); // 初期状態確認
// タイトル検証
// レスポンシブデザイン確認
await browser_resize(375, 667); // iPhone SE
await browser_take_screenshot();
await browser_resize(1920, 1080); // デスクトップ
await browser_take_screenshot();
```

#### ナビゲーションテスト
```typescript
// メニュー操作確認
await browser_click('[data-testid="recording-menu"]');
await browser_take_screenshot();
await browser_click('[data-testid="api-settings-menu"]');
await browser_take_screenshot();
```

### 3.2 録音機能テスト

#### 録音UI操作テスト
```typescript
// 録音ページへ移動
await browser_navigate('/recording');
await browser_take_screenshot();

// 録音開始ボタンクリック
await browser_click('[data-testid="start-recording"]');
await browser_take_screenshot(); // 録音中状態確認

// 音声レベル表示確認
// 録音時間表示確認
// 停止ボタン操作
await browser_click('[data-testid="stop-recording"]');
await browser_take_screenshot();
```

### 3.3 ファイルアップロード機能テスト

#### アップロード操作テスト
```typescript
// アップロードページ移動
await browser_navigate('/upload');
await browser_take_screenshot();

// ファイル選択
await browser_file_upload('test-audio.mp3');
await browser_take_screenshot(); // ファイル選択後状態

// アップロード実行
await browser_click('[data-testid="upload-button"]');
// 進捗表示確認
await browser_take_screenshot();

// ネットワークリクエスト監視
const requests = await browser_network_requests();
// アップロード進捗確認
```

### 3.4 API設定機能テスト

#### API設定画面操作テスト
```typescript
// API設定ページ移動
await browser_navigate('/api-settings');
await browser_take_screenshot();

// 音声認識プロバイダー選択
await browser_select_option('[data-testid="speech-provider"]', 'openai');
await browser_take_screenshot();

// APIキー入力
await browser_type('[data-testid="api-key-input"]', 'test-api-key');
await browser_take_screenshot();

// 設定保存
await browser_click('[data-testid="save-settings"]');
await browser_take_screenshot();

// 保存確認メッセージ表示確認
```

### 3.5 レスポンシブデザインテスト

#### 各デバイスでの表示確認
```typescript
const devices = [
  { width: 375, height: 667, name: 'iPhone SE' },
  { width: 414, height: 896, name: 'iPhone 11' },
  { width: 768, height: 1024, name: 'iPad' },
  { width: 1920, height: 1080, name: 'Desktop' }
];

for (const device of devices) {
  await browser_resize(device.width, device.height);
  await browser_take_screenshot(); // デバイス別レイアウト確認
  
  // 各デバイスでの操作性確認
  await browser_click('[data-testid="menu-button"]');
  await browser_take_screenshot();
}
```

## 4. エラーハンドリング・デバッグテスト

### 4.1 エラー状態テスト
```typescript
// 404ページ確認
await browser_navigate('/non-existent-page');
await browser_take_screenshot();

// ネットワークエラー状態確認
// API エラー状態確認
await browser_console_messages(); // コンソールエラー確認
```

### 4.2 パフォーマンステスト
```typescript
// ページ読み込み時間測定
const requests = await browser_network_requests();
// 読み込み完了確認

// 大容量ファイルアップロード時の動作確認
// 長時間処理時のUI応答性確認
```

## 5. 自動化可能デバッグ作業範囲

### 5.1 完全自動化可能な作業
- **UIレイアウト検証**: 各ページの表示確認
- **レスポンシブデザインテスト**: 複数デバイスサイズでの動作確認
- **基本操作フロー**: ナビゲーション、ボタンクリック、フォーム入力
- **エラーページ表示**: 404、500エラーの表示確認
- **スクリーンショット比較**: UI変更の視覚的確認
- **コンソールログ監視**: JavaScript エラーの自動検出

### 5.2 半自動化可能な作業
- **音声機能テスト**: マイクアクセス許可が必要（手動承認）
- **ファイルアップロード**: 実際のファイルが必要（事前準備）
- **API連携テスト**: 実際のAPIキーが必要（設定準備）
- **認証フロー**: Firebase認証の手動承認

### 5.3 手動確認が必要な作業
- **音声品質確認**: 実際の音声入出力
- **文字起こし精度**: AIによる処理結果
- **話者分離精度**: AI機能の品質評価
- **セキュリティ監査**: 認証・認可の詳細確認

## 6. Playwright MCP 実装戦略

### 6.1 段階的実装アプローチ

#### Phase 1: 基本テスト環境構築
1. Playwright MCP サーバーセットアップ
2. 基本ページ読み込みテスト実装
3. スクリーンショット取得機能確認

#### Phase 2: UI操作テスト実装
1. ナビゲーションテスト
2. フォーム操作テスト
3. レスポンシブデザインテスト

#### Phase 3: 高度な機能テスト
1. ファイルアップロードテスト
2. API設定テスト
3. エラーハンドリングテスト

### 6.2 テストデータ管理
```typescript
// テスト用音声ファイル準備
const testFiles = {
  shortAudio: 'test-short-1min.mp3',
  mediumAudio: 'test-medium-10min.mp3',
  longAudio: 'test-long-60min.mp3',
  invalidFile: 'test-invalid.txt'
};

// テスト用APIキー（モック）
const testApiKeys = {
  openai: 'test-openai-key',
  azure: 'test-azure-key',
  google: 'test-google-key'
};
```

### 6.3 継続的テスト実行
```typescript
// 定期実行スケジュール
const testSchedule = {
  daily: ['basic-ui-test', 'responsive-test'],
  weekly: ['full-user-flow', 'api-integration-test'],
  onDeploy: ['smoke-test', 'critical-path-test']
};
```

## 7. 期待される効果

### 7.1 開発効率向上
- **自動UI検証**: 手動確認時間を80%削減
- **リグレッション検出**: デプロイ前の自動品質確認
- **クロスブラウザテスト**: 複数ブラウザでの動作保証

### 7.2 品質向上
- **視覚的品質管理**: スクリーンショット比較による UI変更検出
- **パフォーマンス監視**: 読み込み速度の定量測定
- **エラー検出**: コンソールエラーの早期発見

### 7.3 運用効率化
- **継続的監視**: 本番環境の定期ヘルスチェック
- **デバッグ支援**: 問題発生時の状況再現
- **ドキュメント自動生成**: テスト結果による機能確認書

## 8. 実装優先度

### 高優先度（即時実装）
1. 基本ページ読み込みテスト
2. スクリーンショット取得機能
3. レスポンシブデザインテスト

### 中優先度（フェーズ2）
1. ナビゲーション操作テスト
2. フォーム入力テスト
3. エラーページテスト

### 低優先度（フェーズ3）
1. 音声機能テスト
2. API連携テスト
3. パフォーマンステスト

この実装提案により、VoiceNoteアプリケーションの品質向上と開発効率化を実現できます。