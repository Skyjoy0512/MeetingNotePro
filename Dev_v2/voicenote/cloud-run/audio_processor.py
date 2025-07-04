"""
音声処理の統合クラス
全体の処理フローを管理し、各段階を協調させる
"""
import asyncio
import logging
import time
from typing import Dict, Any, Optional, List
from pathlib import Path

from google.cloud import firestore, storage
from pydantic import BaseModel

from speaker_separation import SpeakerSeparationService
from transcription_apis import TranscriptionService, APIConfig
from voice_learning import VoiceLearningService

logger = logging.getLogger(__name__)

class ProcessingProgress(BaseModel):
    stage: str
    progress: int
    message: str
    current_chunk: Optional[int] = None
    total_chunks: Optional[int] = None

class ProcessingResult(BaseModel):
    transcription: Dict[str, Any]
    speaker_analysis: Dict[str, Any]
    processing_time: float
    total_chunks: Optional[int] = None

class AudioProcessor:
    """音声処理統合クラス"""
    
    def __init__(self):
        self.db = firestore.Client()
        self.storage_client = storage.Client()
        self.speaker_service = SpeakerSeparationService()
        self.transcription_service = TranscriptionService()
        self.voice_learning_service = VoiceLearningService()
        self.initialized = False
    
    async def initialize(self):
        """サービス初期化"""
        if self.initialized:
            return
            
        try:
            logger.info("Initializing AudioProcessor...")
            await self.speaker_service.initialize()
            await self.transcription_service.initialize()
            await self.voice_learning_service.initialize()
            self.initialized = True
            logger.info("AudioProcessor initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize AudioProcessor: {e}")
            raise
    
    async def process_audio(
        self, 
        user_id: str, 
        audio_id: str, 
        config: Dict[str, Any]
    ) -> ProcessingResult:
        """メイン音声処理フロー"""
        start_time = time.time()
        
        try:
            await self._update_status(user_id, audio_id, "preprocessing", 5, "前処理を開始しています...")
            
            # Phase 0: 音声前処理
            audio_path = await self._download_audio_file(user_id, audio_id)
            processed_audio_path = await self._preprocess_audio(audio_path, user_id, audio_id)
            
            await self._update_status(user_id, audio_id, "speaker_analysis", 20, "話者分析を開始しています...")
            
            # Phase 1: 話者分析
            speaker_analysis = await self._analyze_speakers(
                processed_audio_path, 
                user_id, 
                audio_id, 
                config
            )
            
            # Phase 2: 音声長によって処理方式を決定
            audio_duration = await self._get_audio_duration(processed_audio_path)
            should_chunk = audio_duration > config.get("chunk_threshold", 1800)  # 30分
            
            if should_chunk:
                await self._update_status(user_id, audio_id, "chunk_processing", 40, "チャンク分割処理を開始しています...")
                transcription_result = await self._process_with_chunks(
                    processed_audio_path,
                    speaker_analysis,
                    user_id,
                    audio_id,
                    config
                )
            else:
                await self._update_status(user_id, audio_id, "transcribing", 60, "文字起こしを開始しています...")
                transcription_result = await self._process_direct_transcription(
                    processed_audio_path,
                    speaker_analysis,
                    user_id,
                    audio_id,
                    config
                )
            
            await self._update_status(user_id, audio_id, "integrating", 90, "最終統合処理中...")
            
            # Phase 3: 結果統合
            final_result = await self._integrate_results(
                transcription_result,
                speaker_analysis,
                user_id,
                audio_id
            )
            
            processing_time = time.time() - start_time
            
            result = ProcessingResult(
                transcription=final_result["transcription"],
                speaker_analysis=final_result["speaker_analysis"],
                processing_time=processing_time,
                total_chunks=final_result.get("total_chunks")
            )
            
            await self._update_status(user_id, audio_id, "completed", 100, "処理が完了しました")
            
            return result
            
        except Exception as e:
            logger.error(f"Audio processing failed: {e}")
            await self._update_status(user_id, audio_id, "error", 0, f"処理中にエラーが発生しました: {str(e)}")
            raise
    
    async def _download_audio_file(self, user_id: str, audio_id: str) -> str:
        """Cloud Storageから音声ファイルをダウンロード"""
        try:
            bucket_name = "voicenote-audio-storage"
            file_path = f"users/{user_id}/audios/{audio_id}"
            
            bucket = self.storage_client.bucket(bucket_name)
            blob = bucket.blob(file_path)
            
            local_path = f"/tmp/{audio_id}"
            blob.download_to_filename(local_path)
            
            logger.info(f"Downloaded audio file: {local_path}")
            return local_path
            
        except Exception as e:
            logger.error(f"Failed to download audio file: {e}")
            raise
    
    async def _preprocess_audio(self, audio_path: str, user_id: str, audio_id: str) -> str:
        """音声前処理（ノイズ除去、正規化等）"""
        try:
            import librosa
            import noisereduce as nr
            import soundfile as sf
            
            await self._update_status(user_id, audio_id, "preprocessing", 10, "ノイズ除去中...")
            
            # 音声読み込み
            audio_data, sample_rate = librosa.load(audio_path, sr=None)
            
            # ノイズ除去
            reduced_noise = nr.reduce_noise(y=audio_data, sr=sample_rate)
            
            await self._update_status(user_id, audio_id, "preprocessing", 15, "音量正規化中...")
            
            # 音量正規化
            normalized_audio = librosa.util.normalize(reduced_noise)
            
            # 処理済み音声保存
            processed_path = audio_path.replace('.', '_processed.')
            sf.write(processed_path, normalized_audio, sample_rate)
            
            logger.info(f"Audio preprocessing completed: {processed_path}")
            return processed_path
            
        except Exception as e:
            logger.error(f"Audio preprocessing failed: {e}")
            raise
    
    async def _analyze_speakers(
        self, 
        audio_path: str, 
        user_id: str, 
        audio_id: str, 
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """話者分析実行"""
        try:
            # ユーザー埋め込み取得
            user_embedding = await self._get_user_embedding(user_id)
            
            # 話者分離実行
            speaker_result = await self.speaker_service.analyze_speakers(
                audio_path,
                max_speakers=config.get("max_speakers", 5),
                user_embedding=user_embedding
            )
            
            # グローバル話者情報をFirestoreに保存
            await self._save_global_speakers(user_id, audio_id, speaker_result)
            
            return speaker_result
            
        except Exception as e:
            logger.error(f"Speaker analysis failed: {e}")
            raise
    
    async def _process_with_chunks(
        self,
        audio_path: str,
        speaker_analysis: Dict[str, Any],
        user_id: str,
        audio_id: str,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """チャンク分割処理"""
        try:
            chunk_duration = config.get("chunk_duration", 30)  # 30分
            overlap_duration = config.get("overlap_duration", 5)  # 5分
            
            # チャンク分割
            chunks = await self._split_audio_to_chunks(
                audio_path, 
                chunk_duration, 
                overlap_duration
            )
            
            total_chunks = len(chunks)
            await self._update_status(
                user_id, 
                audio_id, 
                "chunk_processing", 
                50, 
                f"{total_chunks}個のチャンクに分割しました",
                total_chunks=total_chunks
            )
            
            # 各チャンクを並列処理
            chunk_results = []
            for i, chunk_path in enumerate(chunks):
                await self._update_status(
                    user_id,
                    audio_id,
                    "chunk_processing",
                    50 + (i / total_chunks) * 30,
                    f"チャンク {i + 1}/{total_chunks} を処理中...",
                    current_chunk=i + 1,
                    total_chunks=total_chunks
                )
                
                # チャンク毎の文字起こし
                chunk_result = await self._transcribe_chunk(
                    chunk_path,
                    speaker_analysis,
                    config
                )
                chunk_results.append(chunk_result)
            
            # チャンク結果統合
            integrated_result = await self._integrate_chunk_results(chunk_results, speaker_analysis)
            
            return integrated_result
            
        except Exception as e:
            logger.error(f"Chunk processing failed: {e}")
            raise
    
    async def _process_direct_transcription(
        self,
        audio_path: str,
        speaker_analysis: Dict[str, Any],
        user_id: str,
        audio_id: str,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """直接文字起こし処理"""
        try:
            # API設定取得
            api_config = await self._get_transcription_api_config(user_id)
            
            # 話者セグメントに基づく文字起こし
            segments = speaker_analysis.get("segments", [])
            transcription_results = await self.transcription_service.transcribe_segments_batch(
                audio_path,
                segments,
                api_config
            )
            
            return {
                "transcription_results": transcription_results,
                "speaker_analysis": speaker_analysis,
                "processing_method": "direct"
            }
            
        except Exception as e:
            logger.error(f"Direct transcription failed: {e}")
            raise
    
    async def _split_audio_to_chunks(
        self, 
        audio_path: str, 
        chunk_duration_minutes: int, 
        overlap_minutes: int
    ) -> List[str]:
        """音声をチャンクに分割"""
        try:
            from pydub import AudioSegment
            
            audio = AudioSegment.from_file(audio_path)
            chunk_duration_ms = chunk_duration_minutes * 60 * 1000
            overlap_ms = overlap_minutes * 60 * 1000
            
            chunks = []
            start = 0
            chunk_index = 0
            
            while start < len(audio):
                end = min(start + chunk_duration_ms, len(audio))
                chunk = audio[start:end]
                
                chunk_path = f"/tmp/chunk_{chunk_index}.wav"
                chunk.export(chunk_path, format="wav")
                chunks.append(chunk_path)
                
                chunk_index += 1
                start += (chunk_duration_ms - overlap_ms)
            
            logger.info(f"Split audio into {len(chunks)} chunks")
            return chunks
            
        except Exception as e:
            logger.error(f"Audio splitting failed: {e}")
            raise
    
    async def _transcribe_chunk(
        self,
        chunk_path: str,
        speaker_analysis: Dict[str, Any],
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """単一チャンクの文字起こし"""
        try:
            logger.info(f"Transcribing chunk: {chunk_path}")
            
            # API設定取得
            api_config = config.get("transcription_config")
            if not api_config:
                raise ValueError("Transcription API config not found")
            
            # チャンク内の話者セグメント取得
            chunk_segments = speaker_analysis.get("segments", [])
            
            # セグメント毎に文字起こし実行
            transcription_results = []
            
            for segment in chunk_segments:
                try:
                    # セグメント文字起こし
                    result = await self.transcription_service.transcribe_segment(
                        chunk_path,
                        segment.get("start", 0),
                        segment.get("end", 0),
                        api_config
                    )
                    
                    # 話者ラベル付与
                    result_with_speaker = {
                        "text": result.text,
                        "confidence": result.confidence,
                        "start_time": segment.get("start"),
                        "end_time": segment.get("end"),
                        "speaker_id": segment.get("speaker"),
                        "provider": result.provider,
                        "word_timestamps": result.word_timestamps
                    }
                    
                    transcription_results.append(result_with_speaker)
                    
                except Exception as e:
                    logger.error(f"Segment transcription failed: {e}")
                    # エラーセグメントもログに残す
                    transcription_results.append({
                        "text": "",
                        "confidence": 0.0,
                        "start_time": segment.get("start"),
                        "end_time": segment.get("end"),
                        "speaker_id": segment.get("speaker"),
                        "error": str(e)
                    })
            
            return {
                "chunk_path": chunk_path,
                "transcription_results": transcription_results,
                "speaker_analysis": speaker_analysis,
                "status": "completed"
            }
            
        except Exception as e:
            logger.error(f"Chunk transcription failed: {e}")
            return {
                "chunk_path": chunk_path,
                "transcription_results": [],
                "error": str(e),
                "status": "failed"
            }
    
    async def _integrate_chunk_results(
        self,
        chunk_results: List[Dict[str, Any]],
        speaker_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """チャンク結果の統合"""
        try:
            logger.info(f"Integrating {len(chunk_results)} chunk results")
            
            # グローバル話者マッピング取得
            global_speaker_mapping = speaker_analysis.get("global_speaker_mapping", {})
            
            # 統合された転写結果
            integrated_segments = []
            
            # チャンク毎の結果を統合
            for chunk_result in chunk_results:
                if chunk_result.get("status") != "completed":
                    logger.warning(f"Skipping failed chunk: {chunk_result.get('error')}")
                    continue
                
                chunk_transcriptions = chunk_result.get("transcription_results", [])
                
                for segment in chunk_transcriptions:
                    # オーバーラップ重複除去チェック
                    if self._is_duplicate_segment(segment, integrated_segments):
                        logger.debug(f"Skipping duplicate segment at {segment.get('start_time')}")
                        continue
                    
                    # グローバル話者IDマッピング適用
                    local_speaker_id = segment.get("speaker_id")
                    global_speaker_id = global_speaker_mapping.get(
                        local_speaker_id, local_speaker_id
                    )
                    
                    # 統合セグメント作成
                    integrated_segment = {
                        "text": segment.get("text", ""),
                        "start_time": segment.get("start_time", 0),
                        "end_time": segment.get("end_time", 0),
                        "speaker_id": global_speaker_id,
                        "confidence": segment.get("confidence", 0.0),
                        "provider": segment.get("provider", "unknown"),
                        "word_timestamps": segment.get("word_timestamps", [])
                    }
                    
                    integrated_segments.append(integrated_segment)
            
            # 時間順でソート
            integrated_segments.sort(key=lambda x: x.get("start_time", 0))
            
            # 話者別統計計算
            speaker_stats = self._calculate_speaker_statistics(integrated_segments)
            
            # 品質統計計算
            quality_stats = self._calculate_quality_statistics(integrated_segments)
            
            return {
                "segments": integrated_segments,
                "speaker_statistics": speaker_stats,
                "quality_statistics": quality_stats,
                "total_segments": len(integrated_segments),
                "processing_method": "chunk_integrated",
                "status": "completed"
            }
            
        except Exception as e:
            logger.error(f"Chunk results integration failed: {e}")
            raise
    
    async def _integrate_results(
        self,
        transcription_result: Dict[str, Any],
        speaker_analysis: Dict[str, Any],
        user_id: str,
        audio_id: str
    ) -> Dict[str, Any]:
        """最終結果統合"""
        try:
            # Firestoreに結果保存
            result_data = {
                "transcription": transcription_result,
                "speaker_analysis": speaker_analysis,
                "updatedAt": firestore.SERVER_TIMESTAMP
            }
            
            doc_ref = self.db.collection('audios').document(user_id).collection('files').document(audio_id)
            doc_ref.update(result_data)
            
            return result_data
            
        except Exception as e:
            logger.error(f"Result integration failed: {e}")
            raise
    
    def _is_duplicate_segment(
        self, 
        segment: Dict[str, Any], 
        existing_segments: List[Dict[str, Any]],
        overlap_threshold: float = 0.8
    ) -> bool:
        """セグメントの重複チェック（オーバーラップ除去用）"""
        try:
            segment_start = segment.get("start_time", 0)
            segment_end = segment.get("end_time", 0)
            segment_duration = segment_end - segment_start
            
            if segment_duration <= 0:
                return False
            
            for existing in existing_segments:
                existing_start = existing.get("start_time", 0)
                existing_end = existing.get("end_time", 0)
                existing_duration = existing_end - existing_start
                
                if existing_duration <= 0:
                    continue
                
                # オーバーラップ範囲計算
                overlap_start = max(segment_start, existing_start)
                overlap_end = min(segment_end, existing_end)
                overlap_duration = max(0, overlap_end - overlap_start)
                
                # オーバーラップ率計算
                overlap_ratio = overlap_duration / min(segment_duration, existing_duration)
                
                if overlap_ratio >= overlap_threshold:
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Duplicate segment check failed: {e}")
            return False
    
    def _calculate_speaker_statistics(
        self, 
        segments: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """話者別統計計算"""
        try:
            speaker_stats = {}
            
            for segment in segments:
                speaker_id = segment.get("speaker_id", "unknown")
                duration = segment.get("end_time", 0) - segment.get("start_time", 0)
                
                if speaker_id not in speaker_stats:
                    speaker_stats[speaker_id] = {
                        "total_duration": 0.0,
                        "segment_count": 0,
                        "avg_confidence": 0.0,
                        "total_confidence": 0.0
                    }
                
                speaker_stats[speaker_id]["total_duration"] += duration
                speaker_stats[speaker_id]["segment_count"] += 1
                speaker_stats[speaker_id]["total_confidence"] += segment.get("confidence", 0.0)
                speaker_stats[speaker_id]["avg_confidence"] = (
                    speaker_stats[speaker_id]["total_confidence"] / 
                    speaker_stats[speaker_id]["segment_count"]
                )
            
            return speaker_stats
            
        except Exception as e:
            logger.error(f"Speaker statistics calculation failed: {e}")
            return {}
    
    def _calculate_quality_statistics(
        self, 
        segments: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """品質統計計算"""
        try:
            if not segments:
                return {
                    "avg_confidence": 0.0,
                    "min_confidence": 0.0,
                    "max_confidence": 0.0,
                    "total_segments": 0,
                    "low_confidence_segments": 0
                }
            
            confidences = [segment.get("confidence", 0.0) for segment in segments]
            low_threshold = 0.7
            
            return {
                "avg_confidence": sum(confidences) / len(confidences),
                "min_confidence": min(confidences),
                "max_confidence": max(confidences),
                "total_segments": len(segments),
                "low_confidence_segments": len([c for c in confidences if c < low_threshold])
            }
            
        except Exception as e:
            logger.error(f"Quality statistics calculation failed: {e}")
            return {}
    
    async def _get_audio_duration(self, audio_path: str) -> float:
        """音声時間（秒）を取得"""
        try:
            import librosa
            duration = librosa.get_duration(path=audio_path)
            return duration
        except Exception as e:
            logger.error(f"Failed to get audio duration: {e}")
            return 0.0
    
    async def _get_user_embedding(self, user_id: str) -> Optional[List[float]]:
        """ユーザー音声埋め込み取得"""
        try:
            doc_ref = self.db.collection('userEmbeddings').document(user_id)
            doc = doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                return data.get('embedding')
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get user embedding: {e}")
            return None
    
    async def _get_transcription_api_config(self, user_id: str) -> APIConfig:
        """ユーザーの文字起こしAPI設定取得"""
        try:
            doc_ref = self.db.collection('apiConfigs').document(user_id)
            doc = doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                return APIConfig(
                    provider=data.get('speechProvider', 'openai'),
                    api_key=data.get('speechApiKey', ''),
                    model=data.get('speechModel', 'whisper-1'),
                    language=data.get('language', 'ja-JP'),
                    settings=data.get('speechSettings', {})
                )
            
            # デフォルト設定
            return APIConfig(
                provider='openai',
                api_key='',
                model='whisper-1',
                language='ja-JP'
            )
            
        except Exception as e:
            logger.error(f"Failed to get API config: {e}")
            raise
    
    async def _save_global_speakers(
        self, 
        user_id: str, 
        audio_id: str, 
        speaker_result: Dict[str, Any]
    ):
        """グローバル話者情報をFirestoreに保存"""
        try:
            doc_ref = self.db.collection('globalSpeakers').document(audio_id)
            doc_ref.set({
                "userId": user_id,
                "speakerClusters": speaker_result.get("global_speakers", []),
                "userSpeakerMapping": speaker_result.get("user_mapping", {}),
                "speakersCount": speaker_result.get("speaker_count", 0),
                "confidenceScores": speaker_result.get("confidence_scores", []),
                "createdAt": firestore.SERVER_TIMESTAMP
            })
            
        except Exception as e:
            logger.error(f"Failed to save global speakers: {e}")
            raise
    
    async def _update_status(
        self,
        user_id: str,
        audio_id: str,
        status: str,
        progress: int,
        message: str,
        current_chunk: Optional[int] = None,
        total_chunks: Optional[int] = None
    ):
        """処理ステータス更新"""
        try:
            doc_ref = self.db.collection('audios').document(user_id).collection('files').document(audio_id)
            
            update_data = {
                'status': status,
                'processingProgress': progress,
                'statusMessage': message,
                'updatedAt': firestore.SERVER_TIMESTAMP
            }
            
            if current_chunk is not None:
                update_data['processedChunks'] = current_chunk
            if total_chunks is not None:
                update_data['totalChunks'] = total_chunks
            
            doc_ref.update(update_data)
            
            logger.info(f"Status updated: {user_id}/{audio_id} - {status} ({progress}%): {message}")
            
        except Exception as e:
            logger.error(f"Failed to update status: {e}")
            # ステータス更新失敗は処理を止めない