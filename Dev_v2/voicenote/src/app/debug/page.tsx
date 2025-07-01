'use client';

import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // コンソールログをキャプチャ
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      originalLog(...args);
      setLogs(prev => [...prev, `[LOG] ${new Date().toISOString()}: ${args.join(' ')}`]);
    };

    console.error = (...args) => {
      originalError(...args);
      setErrors(prev => [...prev, `[ERROR] ${new Date().toISOString()}: ${args.join(' ')}`]);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      setErrors(prev => [...prev, `[WARN] ${new Date().toISOString()}: ${args.join(' ')}`]);
    };

    // エラーイベントをキャプチャ
    window.addEventListener('error', (event) => {
      setErrors(prev => [...prev, `[JS ERROR] ${event.error?.message || event.message} at ${event.filename}:${event.lineno}`]);
    });

    window.addEventListener('unhandledrejection', (event) => {
      setErrors(prev => [...prev, `[PROMISE ERROR] ${event.reason}`]);
    });

    // 初期ログ
    console.log('Debug page initialized');
    console.log('Current URL:', window.location.href);
    console.log('User Agent:', navigator.userAgent);

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  const copyDebugInfo = () => {
    const debugInfo = `
=== VoiceNote Debug Info ===
Timestamp: ${new Date().toISOString()}
URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}
User Agent: ${typeof window !== 'undefined' ? navigator.userAgent : 'N/A'}
Mounted: ${mounted}

=== Console Logs ===
${logs.join('\n')}

=== Errors/Warnings ===
${errors.join('\n')}

=== End Debug Info ===
    `.trim();

    navigator.clipboard.writeText(debugInfo).then(() => {
      alert('デバッグ情報をクリップボードにコピーしました');
    }).catch(() => {
      // フォールバック: テキストエリアを使用
      const textarea = document.createElement('textarea');
      textarea.value = debugInfo;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('デバッグ情報をクリップボードにコピーしました（フォールバック）');
    });
  };

  const testNavigation = (url: string) => {
    console.log(`Testing navigation to: ${url}`);
    try {
      window.location.href = url;
    } catch (error) {
      console.error(`Navigation failed: ${error}`);
    }
  };

  if (!mounted) {
    return <div>Loading debug page...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', fontSize: '14px' }}>
      <h1>VoiceNote デバッグページ</h1>
      
      <button 
        onClick={copyDebugInfo}
        style={{ 
          padding: '10px 20px', 
          backgroundColor: '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        📋 デバッグ情報をコピー
      </button>

      <h2>ナビゲーションテスト</h2>
      <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={() => testNavigation('/settings/api')}
          style={{ 
            padding: '10px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔧 /settings/api をテスト
        </button>
        
        <button 
          onClick={() => testNavigation('/profile')}
          style={{ 
            padding: '10px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          👤 /profile をテスト
        </button>
        
        <button 
          onClick={() => testNavigation('/')}
          style={{ 
            padding: '10px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🏠 / (ホーム) をテスト
        </button>
      </div>

      <h2>基本情報</h2>
      <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
        <p><strong>URL:</strong> {window.location.href}</p>
        <p><strong>Pathname:</strong> {window.location.pathname}</p>
        <p><strong>Origin:</strong> {window.location.origin}</p>
        <p><strong>Mounted:</strong> {mounted ? 'Yes' : 'No'}</p>
        <p><strong>User Agent:</strong> {navigator.userAgent}</p>
        <p><strong>Current Time:</strong> {new Date().toISOString()}</p>
      </div>

      <h2>コンソールログ ({logs.length})</h2>
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '15px', 
        borderRadius: '4px',
        maxHeight: '200px',
        overflowY: 'auto',
        marginBottom: '20px',
        border: '1px solid #dee2e6'
      }}>
        {logs.length === 0 ? (
          <p style={{ color: '#6c757d' }}>ログはありません</p>
        ) : (
          logs.map((log, index) => (
            <div key={index} style={{ marginBottom: '5px', fontSize: '12px' }}>
              {log}
            </div>
          ))
        )}
      </div>

      <h2>エラー・警告 ({errors.length})</h2>
      <div style={{ 
        backgroundColor: '#fff3cd', 
        padding: '15px', 
        borderRadius: '4px',
        maxHeight: '200px',
        overflowY: 'auto',
        marginBottom: '20px',
        border: '1px solid #ffeaa7'
      }}>
        {errors.length === 0 ? (
          <p style={{ color: '#856404' }}>エラーはありません</p>
        ) : (
          errors.map((error, index) => (
            <div key={index} style={{ marginBottom: '5px', fontSize: '12px', color: '#721c24' }}>
              {error}
            </div>
          ))
        )}
      </div>

      <h2>直接リンクテスト</h2>
      <div style={{ marginBottom: '20px' }}>
        <a 
          href="/settings/api" 
          style={{ 
            display: 'block', 
            padding: '10px', 
            backgroundColor: '#e7f3ff', 
            border: '1px solid #0066cc',
            borderRadius: '4px',
            textDecoration: 'none',
            color: '#0066cc',
            marginBottom: '10px'
          }}
          onClick={() => console.log('Direct link clicked: /settings/api')}
        >
          🔗 /settings/api (直接リンク)
        </a>
        
        <a 
          href="/profile" 
          style={{ 
            display: 'block', 
            padding: '10px', 
            backgroundColor: '#e7f3ff', 
            border: '1px solid #0066cc',
            borderRadius: '4px',
            textDecoration: 'none',
            color: '#0066cc',
            marginBottom: '10px'
          }}
          onClick={() => console.log('Direct link clicked: /profile')}
        >
          🔗 /profile (直接リンク)
        </a>
      </div>

      <h2>デバッグ手順</h2>
      <ol>
        <li>上記のボタンやリンクをクリック</li>
        <li>「デバッグ情報をコピー」ボタンでログを取得</li>
        <li>問題が発生した場合、コピーした情報を確認</li>
      </ol>
    </div>
  );
}