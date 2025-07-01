#!/usr/bin/env python3
"""
Cloud Run音声処理サービスのローカルテスト
pyannote.audioとPyTorchの動作確認
"""

import os
import sys
import logging
import asyncio
from typing import Dict, Any

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_imports():
    """必要なライブラリのインポートテスト"""
    logger.info("🔍 ライブラリインポートテスト開始")
    
    try:
        # 基本ライブラリ
        import torch
        import librosa
        import numpy as np
        logger.info("✅ 基本ライブラリ (torch, librosa, numpy) インポート成功")
        
        # pyannote.audio
        from pyannote.audio import Model
        from pyannote.audio.pipelines.speaker_verification import PretrainedSpeakerEmbedding
        logger.info("✅ pyannote.audio インポート成功")
        
        # Google Cloud
        from google.cloud import firestore, storage
        logger.info("✅ Google Cloud ライブラリインポート成功")
        
        # FastAPI
        from fastapi import FastAPI
        logger.info("✅ FastAPI インポート成功")
        
        return True
        
    except ImportError as e:
        logger.error(f"❌ インポートエラー: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ 予期しないエラー: {e}")
        return False

async def test_pytorch():
    """PyTorch動作テスト"""
    logger.info("🔍 PyTorch動作テスト開始")
    
    try:
        import torch
        
        # バージョン確認
        logger.info(f"📋 PyTorch version: {torch.__version__}")
        
        # CUDA確認
        if torch.cuda.is_available():
            logger.info(f"🚀 CUDA available: {torch.cuda.device_count()} devices")
            logger.info(f"   Device: {torch.cuda.get_device_name(0)}")
        else:
            logger.info("💻 CUDA not available, using CPU")
        
        # CPU設定
        torch.set_num_threads(4)
        logger.info(f"🔧 CPU threads set to: {torch.get_num_threads()}")
        
        # 簡単なテンソル操作
        x = torch.randn(10, 10)
        y = torch.mm(x, x.t())
        logger.info(f"✅ PyTorch tensor operation successful: {y.shape}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ PyTorch テストエラー: {e}")
        return False

async def test_audio_processing():
    """音声処理ライブラリテスト"""
    logger.info("🔍 音声処理ライブラリテスト開始")
    
    try:
        import librosa
        import numpy as np
        from scipy import signal
        
        # バージョン確認
        logger.info(f"📋 librosa version: {librosa.__version__}")
        
        # ダミー音声データ生成
        sr = 16000
        duration = 5  # 5秒
        t = np.linspace(0, duration, sr * duration)
        audio = 0.5 * np.sin(2 * np.pi * 440 * t)  # 440Hz sine wave
        
        logger.info(f"✅ ダミー音声生成: {len(audio)} samples, {sr} Hz")
        
        # 基本的な音声解析
        mfcc = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=13)
        logger.info(f"✅ MFCC抽出成功: {mfcc.shape}")
        
        # スペクトログラム
        stft = librosa.stft(audio)
        logger.info(f"✅ STFT計算成功: {stft.shape}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 音声処理テストエラー: {e}")
        return False

async def test_pyannote_models():
    """pyannote.audioモデルテスト"""
    logger.info("🔍 pyannote.audioモデルテスト開始")
    
    try:
        from pyannote.audio.pipelines.speaker_verification import PretrainedSpeakerEmbedding
        import torch
        import tempfile
        import soundfile as sf
        import numpy as np
        
        # ダミー音声ファイル作成
        sr = 16000
        duration = 3
        audio = 0.5 * np.sin(2 * np.pi * 440 * np.linspace(0, duration, sr * duration))
        
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            sf.write(tmp_file.name, audio, sr)
            
            logger.info("✅ ダミー音声ファイル作成成功")
            
            # Speaker embedding モデル初期化（軽量モデル）
            try:
                embedding_model = PretrainedSpeakerEmbedding(
                    "speechbrain/spkrec-ecapa-voxceleb",
                    device=torch.device("cpu")  # CPUを強制使用
                )
                logger.info("✅ Speaker embedding モデル初期化成功")
                
                # Embedding抽出テスト
                embedding = embedding_model(tmp_file.name)
                logger.info(f"✅ Embedding抽出成功: shape {embedding.shape}")
                
                # 一時ファイル削除
                os.unlink(tmp_file.name)
                
                return True
                
            except Exception as model_error:
                logger.warning(f"⚠️ モデル初期化失敗（認証またはネットワークエラーの可能性）: {model_error}")
                os.unlink(tmp_file.name)
                return False
        
    except Exception as e:
        logger.error(f"❌ pyannote.audioテストエラー: {e}")
        return False

async def test_google_cloud():
    """Google Cloud接続テスト"""
    logger.info("🔍 Google Cloud接続テスト開始")
    
    try:
        from google.cloud import firestore
        
        # Firestore接続テスト（認証チェック）
        try:
            db = firestore.Client()
            logger.info("✅ Firestore クライアント初期化成功")
            
            # 簡単な操作テスト（読み取り専用）
            # Note: 実際のプロジェクトが設定されていない場合はエラーになる
            collections = db.collections()
            logger.info("✅ Firestore接続テスト成功")
            
            return True
            
        except Exception as gcp_error:
            logger.warning(f"⚠️ Google Cloud接続失敗（認証設定が必要）: {gcp_error}")
            return False
        
    except Exception as e:
        logger.error(f"❌ Google Cloudテストエラー: {e}")
        return False

async def test_fastapi_server():
    """FastAPIサーバーテスト"""
    logger.info("🔍 FastAPIサーバーテスト開始")
    
    try:
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        
        # シンプルなFastAPIアプリ作成
        app = FastAPI()
        
        @app.get("/health")
        async def health_check():
            return {"status": "healthy", "service": "voicenote-audio-processor"}
        
        # テストクライアント作成
        client = TestClient(app)
        
        # ヘルスチェックテスト
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        
        logger.info("✅ FastAPI サーバーテスト成功")
        return True
        
    except Exception as e:
        logger.error(f"❌ FastAPI テストエラー: {e}")
        return False

async def main():
    """メインテスト実行"""
    logger.info("🚀 VoiceNote Cloud Run ローカルテスト開始")
    logger.info("=" * 60)
    
    tests = [
        ("ライブラリインポート", test_imports),
        ("PyTorch動作", test_pytorch),
        ("音声処理ライブラリ", test_audio_processing),
        ("pyannote.audioモデル", test_pyannote_models),
        ("Google Cloud接続", test_google_cloud),
        ("FastAPI サーバー", test_fastapi_server)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        logger.info(f"\n🧪 {test_name}テスト実行中...")
        try:
            result = await test_func()
            results[test_name] = result
            status = "✅ 成功" if result else "❌ 失敗"
            logger.info(f"   {status}")
        except Exception as e:
            logger.error(f"   ❌ エラー: {e}")
            results[test_name] = False
    
    # 結果サマリー
    logger.info("\n" + "=" * 60)
    logger.info("📊 テスト結果サマリー")
    logger.info("=" * 60)
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        logger.info(f"   {test_name:<25} {status}")
    
    logger.info("-" * 60)
    logger.info(f"   総合結果: {passed}/{total} tests passed")
    
    if passed == total:
        logger.info("🎉 全テスト成功！Cloud Runデプロイ準備完了")
        return 0
    else:
        logger.warning(f"⚠️  {total - passed}個のテストが失敗しました")
        logger.info("💡 失敗したテストを確認してから Cloud Run デプロイを実行してください")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())