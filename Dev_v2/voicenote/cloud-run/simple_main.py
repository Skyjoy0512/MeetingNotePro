import os
import logging
import base64
import tempfile
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# 音声処理
import openai
from google.cloud import firestore, storage

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Firebase クライアント初期化（認証がない場合はスキップ）
db = None
storage_client = None
try:
    if os.getenv('GOOGLE_APPLICATION_CREDENTIALS') or os.getenv('GOOGLE_CLOUD_PROJECT'):
        db = firestore.Client()
        storage_client = storage.Client()
        logger.info("✅ Firebase clients initialized")
    else:
        logger.info("📝 Firebase clients not initialized (running in demo mode)")
except Exception as e:
    logger.warning(f"⚠️ Firebase initialization failed (demo mode): {e}")
    db = None
    storage_client = None

# FastAPI アプリ作成
app = FastAPI(
    title="VoiceNote Simple Audio Processing",
    description="簡易音声文字起こしサービス",
    version="1.0.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# リクエストモデル
class ProcessAudioRequest(BaseModel):
    user_id: str
    audio_id: str
    config: Dict[str, Any] = {}

# ヘルスチェック
@app.get("/health")
async def health_check():
    """ヘルスチェックエンドポイント"""
    return {
        "status": "healthy",
        "service": "voicenote-simple-processor",
        "version": "1.0.0",
        "firebase": "available" if db else "unavailable",
        "endpoints": ["/health", "/process-audio", "/test-whisper"]
    }

# テスト用エンドポイント
@app.post("/test-whisper")
async def test_whisper_endpoint(request: dict):
    """Whisper APIテスト用エンドポイント"""
    try:
        api_key = request.get('api_key', '')
        test_text = request.get('test_text', 'これはテスト音声です。')
        
        if not api_key:
            raise HTTPException(status_code=400, detail="APIキーが必要です")
        
        # OpenAI APIキーのフォーマットチェック
        if not api_key.startswith('sk-'):
            raise HTTPException(status_code=400, detail="無効なAPIキー形式です")
        
        # テスト結果を返す（実際のAPIは呼ばない）
        return {
            "status": "success",
            "message": "APIキー形式は正常です",
            "api_key_format": "valid",
            "test_mode": True,
            "mock_result": {
                "text": test_text,
                "language": "ja",
                "confidence": 0.95
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Test endpoint failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 音声処理開始
@app.post("/process-audio")
async def process_audio(request: ProcessAudioRequest):
    """音声処理開始エンドポイント"""
    try:
        logger.info(f"Starting simple audio processing for user {request.user_id}, audio {request.audio_id}")
        
        # APIキーの確認
        speech_api_key = request.config.get('speech_api_key', '')
        if not speech_api_key:
            raise HTTPException(status_code=400, detail="音声認識APIキーが設定されていません")
        
        # OpenAI APIクライアント設定
        openai.api_key = speech_api_key
        
        # 音声ファイルをFirebase Storageから取得
        audio_url = await get_audio_file_url(request.user_id, request.audio_id)
        if not audio_url:
            raise HTTPException(status_code=404, detail="音声ファイルが見つかりません")
        
        # 音声ファイルをダウンロード
        audio_file_path = await download_audio_file(audio_url)
        
        # OpenAI Whisperで文字起こし
        transcript_result = await transcribe_with_whisper(audio_file_path, speech_api_key)
        
        # 結果をFirestoreに保存
        await save_transcription_result(request.user_id, request.audio_id, transcript_result)
        
        # 一時ファイルを削除
        os.unlink(audio_file_path)
        
        return {
            "status": "completed",
            "message": f"音声処理が完了しました: {request.audio_id}",
            "user_id": request.user_id,
            "audio_id": request.audio_id,
            "result": transcript_result
        }
        
    except Exception as e:
        logger.error(f"Failed to process audio: {e}")
        
        # エラーをFirestoreに記録
        if db:
            try:
                await update_audio_status(request.user_id, request.audio_id, "error", 0, {"error": str(e)})
            except:
                pass
        
        raise HTTPException(status_code=500, detail=str(e))

async def get_audio_file_url(user_id: str, audio_id: str) -> Optional[str]:
    """Firestoreから音声ファイルのURLを取得"""
    try:
        if not db:
            # デモモード：ダミーURLを返す
            logger.info(f"Demo mode: returning mock URL for {user_id}/{audio_id}")
            return "https://sample-audio-files.s3.amazonaws.com/test.mp3"
            
        doc_ref = db.collection('audios').document(user_id).collection('files').document(audio_id)
        doc = doc_ref.get()
        
        if doc.exists:
            data = doc.to_dict()
            return data.get('fileUrl')
        
        return None
        
    except Exception as e:
        logger.error(f"Failed to get audio file URL: {e}")
        return None

async def download_audio_file(audio_url: str) -> str:
    """音声ファイルをダウンロード"""
    import httpx
    
    # 一時ファイル作成
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
    temp_file_path = temp_file.name
    temp_file.close()
    
    # ファイルをダウンロード
    async with httpx.AsyncClient() as client:
        response = await client.get(audio_url)
        response.raise_for_status()
        
        with open(temp_file_path, 'wb') as f:
            f.write(response.content)
    
    return temp_file_path

async def transcribe_with_whisper(audio_file_path: str, api_key: str) -> Dict[str, Any]:
    """OpenAI Whisperで音声を文字起こし"""
    try:
        # OpenAI クライアント設定
        client = openai.OpenAI(api_key=api_key)
        
        # 音声ファイルを開いて文字起こし
        with open(audio_file_path, 'rb') as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="ja",
                response_format="verbose_json"
            )
        
        # 結果を整形
        result = {
            "text": transcript.text,
            "language": transcript.language if hasattr(transcript, 'language') else 'ja',
            "duration": transcript.duration if hasattr(transcript, 'duration') else 0,
            "segments": transcript.segments if hasattr(transcript, 'segments') else [],
            "provider": "openai",
            "model": "whisper-1"
        }
        
        # 簡易的な話者分離シミュレーション（実際の実装ではpyannote.audioを使用）
        segments = []
        if hasattr(transcript, 'segments') and transcript.segments:
            for i, segment in enumerate(transcript.segments):
                segments.append({
                    "id": i,
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text,
                    "speaker": "あなた" if i % 2 == 0 else "Aさん",  # 交互に話者を割り当て（デモ用）
                    "confidence": 0.9
                })
        else:
            # セグメント情報がない場合は全体を1つのセグメントとして扱う
            segments.append({
                "id": 0,
                "start": 0,
                "end": result["duration"],
                "text": result["text"],
                "speaker": "あなた",
                "confidence": 0.9
            })
        
        result["segments"] = segments
        
        # 簡易要約生成（実際のLLM APIを使用する場合）
        result["summary"] = {
            "overall": f"音声の文字起こしが完了しました。総文字数: {len(result['text'])}文字",
            "speakers": {
                "あなた": "主な発言者として会話に参加",
                "Aさん": "対話相手として会話に参加"
            },
            "topics": ["会話", "音声認識", "文字起こし"]
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Whisper transcription failed: {e}")
        raise Exception(f"音声文字起こしに失敗しました: {str(e)}")

async def save_transcription_result(user_id: str, audio_id: str, result: Dict[str, Any]):
    """文字起こし結果をFirestoreに保存"""
    try:
        if not db:
            logger.info(f"Demo mode: would save transcription for {user_id}/{audio_id}")
            logger.info(f"Result preview: {result.get('text', '')[:100]}...")
            return
            
        doc_ref = db.collection('audios').document(user_id).collection('files').document(audio_id)
        
        update_data = {
            'status': 'completed',
            'processingProgress': 100,
            'transcription': result,
            'summary': result.get('summary', {}),
            'updatedAt': firestore.SERVER_TIMESTAMP
        }
        
        doc_ref.update(update_data)
        logger.info(f"Transcription result saved for {user_id}/{audio_id}")
        
    except Exception as e:
        logger.error(f"Failed to save transcription result: {e}")
        raise

async def update_audio_status(user_id: str, audio_id: str, status: str, 
                            progress: int, additional_data: Dict[str, Any] = None):
    """音声ファイルの状態更新"""
    try:
        if not db:
            logger.info(f"Demo mode: would update status {user_id}/{audio_id} -> {status} ({progress}%)")
            return
            
        doc_ref = db.collection('audios').document(user_id).collection('files').document(audio_id)
        
        update_data = {
            'status': status,
            'processingProgress': progress,
            'updatedAt': firestore.SERVER_TIMESTAMP
        }
        
        if additional_data:
            update_data.update(additional_data)
        
        doc_ref.update(update_data)
        
    except Exception as e:
        logger.error(f"Failed to update audio status: {e}")

# メイン実行
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    
    uvicorn.run(
        "simple_main:app",
        host="0.0.0.0",
        port=port,
        log_level="info"
    )