export default function ApiSettingsPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>API設定ページ</h1>
      <p>このページが表示されればAPI設定ページは動作しています</p>
      <a href="/settings" style={{ color: 'blue', textDecoration: 'underline' }}>
        設定ページに戻る
      </a>
    </div>
  );
}