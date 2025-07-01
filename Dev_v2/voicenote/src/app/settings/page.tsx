'use client';

import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log('Settings: Component mounted');
    setMounted(true);
  }, []);

  console.log('Settings: Rendering', { mounted });

  if (!mounted) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>読み込み中...</h1>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>設定ページ</h1>
      <p>マウント完了: {mounted ? 'はい' : 'いいえ'}</p>
      <a href="/settings/api" style={{ color: 'blue', textDecoration: 'underline' }}>
        API設定ページへ
      </a>
      <br />
      <a href="/" style={{ color: 'blue', textDecoration: 'underline' }}>
        ホームに戻る
      </a>
    </div>
  );
}