import os
import logging
import asyncio
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Google Cloud
from google.cloud import firestore, storage, logging as cloud_logging

# pyannote.audio認証設定
import torch
from huggingface_hub import login
from dotenv import load_dotenv

# 自作モジュール
from audio_processor import AudioProcessor
from speaker_separation import SpeakerSeparationService
from transcription_apis import TranscriptionService, APIConfig
from voice_learning import VoiceLearningService

# 環境変数読み込み
load_dotenv()

def setup_pyannote_authentication():
    """pyannote.audio認証設定"""
    try:
        hf_token = os.getenv('HUGGINGFACE_TOKEN')
        if hf_token:
            login(token=hf_token)
            logger.info("✅ Hugging Face authentication successful")
        else:
            logger.warning("⚠️ HUGGINGFACE_TOKEN not found - some models may not be accessible")
    except Exception as e:
        logger.error(f"❌ Hugging Face authentication failed: {e}")

def setup_pytorch_settings():
    """PyTorch設定最適化"""
    try:
        # CPUのみでの動作を設定（Cloud Run環境）
        torch.set_num_threads(4)  # Cloud Runの4vCPUに最適化
        
        # メモリ効率化
        if torch.cuda.is_available():
            logger.info("🚀 CUDA available - GPU acceleration enabled")
        else:
            logger.info("💻 Using CPU for audio processing")
            
        logger.info("✅ PyTorch settings configured")
    except Exception as e:
        logger.error(f"❌ PyTorch setup failed: {e}")

# ログ設定
if os.getenv('GOOGLE_CLOUD_PROJECT'):
    # Cloud Runでの実行時
    client = cloud_logging.Client()
    client.setup_logging()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 認証・設定初期化
setup_pyannote_authentication()
setup_pytorch_settings()

# Firebase クライアント初期化
db = firestore.Client()
storage_client = storage.Client()

# サービス初期化
audio_processor = AudioProcessor()
speaker_service = SpeakerSeparationService()
transcription_service = TranscriptionService()
voice_learning_service = VoiceLearningService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションライフサイクル管理"""
    logger.info("🚀 VoiceNote Audio Processing Service starting...")
    
    # 初期化処理
    try:
        await audio_processor.initialize()
        logger.info("✅ Audio processor initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize audio processor: {e}")
    
    yield
    
    # クリーンアップ処理
    logger.info("🔄 Shutting down VoiceNote Audio Processing Service...")

# FastAPI アプリ作成
app = FastAPI(
    title="VoiceNote Audio Processing Service",
    description="高精度音声文字起こし・話者分離サービス",
    version="1.0.0",
    lifespan=lifespan
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では適切なオリジンを設定
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# リクエストモデル
class ProcessAudioRequest(BaseModel):
    user_id: str
    audio_id: str
    config: Dict[str, Any] = {}

class VoiceLearningRequest(BaseModel):
    user_id: str
    audio_data: str  # Base64エンコードされた音声データ
    session_id: str

class TranscriptionRequest(BaseModel):
    user_id: str
    audio_path: str
    api_config: Dict[str, Any]
    segments: Optional[list] = None

# ヘルスチェック
@app.get("/health")
async def health_check():
    """ヘルスチェックエンドポイント"""
    return {
        "status": "healthy",
        "service": "voicenote-audio-processor",
        "version": "1.0.0"
    }

# 音声処理開始
@app.post("/process-audio")
async def process_audio(request: ProcessAudioRequest, background_tasks: BackgroundTasks):
    """音声処理開始エンドポイント"""
    try:
        logger.info(f"Starting audio processing for user {request.user_id}, audio {request.audio_id}")
        
        # バックグラウンドタスクとして処理を開始
        background_tasks.add_task(
            run_audio_processing,
            request.user_id,
            request.audio_id,
            request.config
        )
        
        return {
            "status": "processing_started",
            "message": f"音声処理を開始しました: {request.audio_id}",
            "user_id": request.user_id,
            "audio_id": request.audio_id
        }
        
    except Exception as e:
        logger.error(f"Failed to start audio processing: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def run_audio_processing(user_id: str, audio_id: str, config: Dict[str, Any]):
    """音声処理実行（バックグラウンド）"""
    try:
        logger.info(f"Running audio processing: {user_id}/{audio_id}")
        
        # 処理設定（API設定を含む）
        processing_config = {
            "enable_speaker_separation": config.get("enable_speaker_separation", True),
            "max_speakers": config.get("max_speakers", 5),
            "use_user_embedding": config.get("use_user_embedding", True),
            "language": config.get("language", "ja"),
            "chunk_duration": config.get("chunk_duration", 30),
            "overlap_duration": config.get("overlap_duration", 5),
            # API設定を追加
            "transcription_config": {
                "provider": config.get("speech_provider", "openai"),
                "api_key": config.get("speech_api_key", ""),
                "model": config.get("speech_model", "whisper-1"),
                "settings": config.get("speech_settings", {})
            },
            "llm_config": {
                "provider": config.get("llm_provider", "openai"),
                "api_key": config.get("llm_api_key", ""),
                "model": config.get("llm_model", "gpt-4"),
                "settings": config.get("llm_settings", {})
            }
        }
        
        logger.info(f"Processing config: {dict(processing_config, transcription_config={'provider': processing_config['transcription_config']['provider'], 'api_key': '***masked***'}, llm_config={'provider': processing_config['llm_config']['provider'], 'api_key': '***masked***'})}")
        
        # 音声処理実行
        result = await audio_processor.process_audio(
            user_id=user_id,
            audio_id=audio_id,
            config=processing_config
        )
        
        logger.info(f"Audio processing completed: {user_id}/{audio_id}")
        
        # 処理完了をFirestoreに記録
        await update_audio_status(user_id, audio_id, "completed", 100, result)
        
    except Exception as e:
        logger.error(f"Audio processing failed: {user_id}/{audio_id} - {e}")
        
        # エラーをFirestoreに記録
        await update_audio_status(user_id, audio_id, "error", 0, {"error": str(e)})

# 話者分離
@app.post("/speaker-separation")
async def speaker_separation(request: ProcessAudioRequest):
    """話者分離エンドポイント"""
    try:
        # 音声ファイルの取得
        audio_path = await download_audio_file(request.user_id, request.audio_id)
        
        # ユーザー埋め込みの取得
        user_embedding = await get_user_embedding(request.user_id)
        
        # 話者分離実行
        if request.config.get("use_chunking", False):
            # チャンク分割処理
            chunks = await split_audio_to_chunks(audio_path, request.config)
            result = await speaker_service.analyze_speakers_chunked(
                chunks, 
                user_embedding=user_embedding
            )
        else:
            # 直接処理
            result = await speaker_service.analyze_speakers(
                audio_path,
                max_speakers=request.config.get("max_speakers", 5),
                user_embedding=user_embedding
            )
        
        return {
            "status": "success",
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Speaker separation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 文字起こし
@app.post("/transcription")
async def transcription(request: TranscriptionRequest):
    """文字起こしエンドポイント"""
    try:
        # API設定作成
        api_config = APIConfig(
            provider=request.api_config["provider"],
            api_key=request.api_config["api_key"],
            model=request.api_config["model"],
            language=request.api_config.get("language", "ja-JP"),
            settings=request.api_config.get("settings", {})
        )
        
        if request.segments:
            # セグメント毎の文字起こし
            results = await transcription_service.transcribe_segments_batch(
                request.audio_path,
                request.segments,
                api_config
            )
        else:
            # 全体文字起こし
            api_client = transcription_service.create_api_client(api_config)
            result = await api_client.transcribe(request.audio_path)
            results = [result]
        
        return {
            "status": "success",
            "results": [
                {
                    "text": r.text,
                    "confidence": r.confidence,
                    "segments": r.segments,
                    "language": r.language,
                    "processing_time": r.processing_time,
                    "provider": r.provider,
                    "model": r.model
                }
                for r in results
            ]
        }
        
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 音声学習
@app.post("/voice-learning")
async def voice_learning(request: VoiceLearningRequest):
    """音声学習エンドポイント"""
    try:
        result = await voice_learning_service.process_learning_audio(
            user_id=request.user_id,
            audio_data=request.audio_data,
            session_id=request.session_id
        )
        
        return {
            "status": "success",
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Voice learning failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 処理キャンセル
@app.post("/cancel-processing")
async def cancel_processing(request: ProcessAudioRequest):
    """音声処理キャンセル"""
    try:
        await update_audio_status(
            request.user_id, 
            request.audio_id, 
            "cancelled", 
            0, 
            {"cancelled_at": firestore.SERVER_TIMESTAMP}
        )
        
        return {
            "status": "cancelled",
            "message": "処理をキャンセルしました"
        }
        
    except Exception as e:
        logger.error(f"Failed to cancel processing: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 処理状況確認
@app.get("/processing-status/{user_id}/{audio_id}")
async def get_processing_status(user_id: str, audio_id: str):
    """処理状況確認"""
    try:
        doc_ref = db.collection('audios').document(user_id).collection('files').document(audio_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        data = doc.to_dict()
        
        return {
            "status": data.get("status", "unknown"),
            "progress": data.get("processingProgress", 0),
            "message": data.get("statusMessage", ""),
            "current_chunk": data.get("processedChunks"),
            "total_chunks": data.get("totalChunks"),
            "updated_at": data.get("updatedAt")
        }
        
    except Exception as e:
        logger.error(f"Failed to get processing status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ユーティリティ関数
async def update_audio_status(user_id: str, audio_id: str, status: str, 
                            progress: int, additional_data: Dict[str, Any] = None):
    """音声ファイルの状態更新"""
    try:
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
        raise

async def download_audio_file(user_id: str, audio_id: str) -> str:
    """Cloud Storageから音声ファイルをダウンロード"""
    # 実装予定
    pass

async def get_user_embedding(user_id: str) -> Optional[list]:
    """ユーザー音声埋め込みを取得"""
    try:
        doc_ref = db.collection('userEmbeddings').document(user_id)
        doc = doc_ref.get()
        
        if doc.exists:
            data = doc.to_dict()
            return data.get('embedding')
        
        return None
        
    except Exception as e:
        logger.error(f"Failed to get user embedding: {e}")
        return None

async def split_audio_to_chunks(audio_path: str, config: Dict[str, Any]) -> list:
    """音声をチャンクに分割"""
    # 実装予定
    pass

# メイン実行
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        workers=1  # Cloud Runでは1ワーカー推奨
    )