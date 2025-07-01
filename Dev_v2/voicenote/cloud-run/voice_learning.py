"""
音声学習サービス
ユーザー音声のembedding学習と話者識別を行う
"""

import os
import logging
import numpy as np
from typing import Dict, Any, List, Optional
import librosa
import torch
from pyannote.audio import Model
from pyannote.audio.pipelines.speaker_verification import PretrainedSpeakerEmbedding
from google.cloud import firestore, storage
import tempfile

logger = logging.getLogger(__name__)

class VoiceLearningService:
    """音声学習サービス"""
    
    def __init__(self):
        """初期化"""
        # Firestore クライアント
        self.db = firestore.Client()
        
        # Storage クライアント
        self.storage_client = storage.Client()
        
        # Speaker embedding モデル
        self.embedding_model = PretrainedSpeakerEmbedding(
            "speechbrain/spkrec-ecapa-voxceleb",
            device=torch.device("cuda" if torch.cuda.is_available() else "cpu")
        )
        
        logger.info("VoiceLearningService initialized")
    
    async def extract_user_embedding(
        self, 
        audio_path: str, 
        user_id: str,
        duration_limit: int = 600  # 10分制限
    ) -> Dict[str, Any]:
        """ユーザー音声からembeddingを抽出"""
        try:
            logger.info(f"Extracting user embedding for user_id: {user_id}")
            
            # 音声読み込み
            audio, sr = librosa.load(audio_path, sr=16000)
            
            # 音声長制限チェック
            max_samples = duration_limit * sr
            if len(audio) > max_samples:
                logger.warning(f"Audio too long, trimming to {duration_limit}s")
                audio = audio[:max_samples]
            
            # 音声品質チェック
            quality_score = await self._analyze_audio_quality(audio, sr)
            if quality_score < 0.6:
                raise ValueError(f"Audio quality too low: {quality_score}")
            
            # Embedding抽出
            embedding = self._extract_embedding(audio, sr)
            
            # 既存embeddingとの統合
            final_embedding = await self._integrate_with_existing_embedding(
                user_id, embedding, quality_score
            )
            
            # Firestoreに保存
            await self._save_user_embedding(user_id, final_embedding, quality_score)
            
            return {
                "embedding": final_embedding.tolist(),
                "quality_score": quality_score,
                "audio_duration": len(audio) / sr,
                "status": "success"
            }
            
        except Exception as e:
            logger.error(f"User embedding extraction failed: {e}")
            raise
    
    async def compare_speaker_with_user(
        self, 
        speaker_embedding: np.ndarray, 
        user_id: str,
        threshold: float = 0.75
    ) -> Dict[str, Any]:
        """話者embeddingとユーザーembeddingを比較"""
        try:
            # ユーザーembedding取得
            user_embedding = await self._get_user_embedding(user_id)
            if user_embedding is None:
                return {
                    "is_user": False,
                    "confidence": 0.0,
                    "reason": "No user embedding found"
                }
            
            # コサイン類似度計算
            similarity = self._compute_cosine_similarity(
                speaker_embedding, 
                user_embedding
            )
            
            is_user = similarity >= threshold
            
            return {
                "is_user": is_user,
                "confidence": float(similarity),
                "threshold": threshold,
                "status": "success"
            }
            
        except Exception as e:
            logger.error(f"Speaker comparison failed: {e}")
            return {
                "is_user": False,
                "confidence": 0.0,
                "error": str(e)
            }
    
    async def update_user_embedding(
        self, 
        user_id: str, 
        new_audio_path: str
    ) -> Dict[str, Any]:
        """ユーザーembeddingを新しい音声で更新"""
        try:
            logger.info(f"Updating user embedding for user_id: {user_id}")
            
            # 新しいembedding抽出
            new_result = await self.extract_user_embedding(new_audio_path, user_id)
            
            return {
                "status": "updated",
                "new_quality_score": new_result["quality_score"],
                "audio_duration": new_result["audio_duration"]
            }
            
        except Exception as e:
            logger.error(f"User embedding update failed: {e}")
            raise
    
    def _extract_embedding(self, audio: np.ndarray, sr: int) -> np.ndarray:
        """音声からembeddingを抽出"""
        try:
            # 一時ファイルに保存
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
                import soundfile as sf
                sf.write(tmp_file.name, audio, sr)
                
                # Embedding抽出
                embedding = self.embedding_model(tmp_file.name)
                
                # 一時ファイル削除
                os.unlink(tmp_file.name)
                
                return embedding.detach().cpu().numpy()
                
        except Exception as e:
            logger.error(f"Embedding extraction failed: {e}")
            raise
    
    async def _analyze_audio_quality(
        self, 
        audio: np.ndarray, 
        sr: int
    ) -> float:
        """音声品質分析"""
        try:
            # SNR計算
            energy = np.mean(audio ** 2)
            noise_threshold = np.percentile(np.abs(audio), 10)
            snr = 10 * np.log10(energy / (noise_threshold ** 2 + 1e-10))
            
            # 音声アクティビティ検出
            frame_length = int(0.025 * sr)  # 25ms
            hop_length = int(0.01 * sr)     # 10ms
            
            rms = librosa.feature.rms(
                y=audio, 
                frame_length=frame_length,
                hop_length=hop_length
            )[0]
            
            # 音声/無音区間の比率
            silence_threshold = np.percentile(rms, 30)
            voice_ratio = np.sum(rms > silence_threshold) / len(rms)
            
            # 総合品質スコア
            quality_score = min(
                1.0,
                max(0.0, (snr + 10) / 30) * 0.6 +  # SNR component
                voice_ratio * 0.4                   # Voice activity component
            )
            
            return quality_score
            
        except Exception as e:
            logger.error(f"Audio quality analysis failed: {e}")
            return 0.5  # デフォルト品質
    
    async def _integrate_with_existing_embedding(
        self, 
        user_id: str, 
        new_embedding: np.ndarray,
        quality_score: float
    ) -> np.ndarray:
        """既存embeddingとの統合"""
        try:
            existing_embedding = await self._get_user_embedding(user_id)
            
            if existing_embedding is None:
                logger.info("No existing embedding, using new embedding")
                return new_embedding
            
            # 既存データの取得
            doc_ref = self.db.collection('userEmbeddings').document(user_id)
            doc = doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                existing_quality = data.get('quality_score', 0.5)
                audio_count = data.get('audio_count', 1)
                
                # 品質重み付き平均
                total_weight = existing_quality * audio_count + quality_score
                new_weight = quality_score / total_weight
                existing_weight = (existing_quality * audio_count) / total_weight
                
                # Embedding統合
                integrated_embedding = (
                    existing_weight * existing_embedding + 
                    new_weight * new_embedding
                )
                
                # 正規化
                integrated_embedding = integrated_embedding / np.linalg.norm(integrated_embedding)
                
                logger.info(f"Integrated embedding with {audio_count} existing audios")
                return integrated_embedding
            else:
                return new_embedding
                
        except Exception as e:
            logger.error(f"Embedding integration failed: {e}")
            return new_embedding
    
    async def _save_user_embedding(
        self, 
        user_id: str, 
        embedding: np.ndarray,
        quality_score: float
    ):
        """ユーザーembeddingをFirestoreに保存"""
        try:
            doc_ref = self.db.collection('userEmbeddings').document(user_id)
            doc = doc_ref.get()
            
            if doc.exists:
                # 既存データ更新
                data = doc.to_dict()
                audio_count = data.get('audio_count', 0) + 1
                avg_quality = (data.get('quality_score', 0) + quality_score) / 2
            else:
                # 新規データ
                audio_count = 1
                avg_quality = quality_score
            
            doc_ref.set({
                'embedding': embedding.tolist(),
                'quality_score': avg_quality,
                'audio_count': audio_count,
                'lastUpdated': firestore.SERVER_TIMESTAMP
            })
            
            logger.info(f"User embedding saved for user_id: {user_id}")
            
        except Exception as e:
            logger.error(f"Embedding save failed: {e}")
            raise
    
    async def _get_user_embedding(self, user_id: str) -> Optional[np.ndarray]:
        """ユーザーembeddingをFirestoreから取得"""
        try:
            doc_ref = self.db.collection('userEmbeddings').document(user_id)
            doc = doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                embedding_list = data.get('embedding')
                if embedding_list:
                    return np.array(embedding_list)
            
            return None
            
        except Exception as e:
            logger.error(f"User embedding retrieval failed: {e}")
            return None
    
    def _compute_cosine_similarity(
        self, 
        embedding1: np.ndarray, 
        embedding2: np.ndarray
    ) -> float:
        """コサイン類似度計算"""
        try:
            # 正規化
            norm1 = np.linalg.norm(embedding1)
            norm2 = np.linalg.norm(embedding2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            normalized1 = embedding1 / norm1
            normalized2 = embedding2 / norm2
            
            # コサイン類似度
            similarity = np.dot(normalized1, normalized2)
            
            return float(similarity)
            
        except Exception as e:
            logger.error(f"Cosine similarity computation failed: {e}")
            return 0.0
    
    async def get_user_learning_stats(self, user_id: str) -> Dict[str, Any]:
        """ユーザー学習統計取得"""
        try:
            doc_ref = self.db.collection('userEmbeddings').document(user_id)
            doc = doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                return {
                    "has_embedding": True,
                    "audio_count": data.get('audio_count', 0),
                    "quality_score": data.get('quality_score', 0),
                    "last_updated": data.get('lastUpdated'),
                    "status": "available"
                }
            else:
                return {
                    "has_embedding": False,
                    "audio_count": 0,
                    "quality_score": 0,
                    "status": "not_available"
                }
                
        except Exception as e:
            logger.error(f"User learning stats retrieval failed: {e}")
            return {
                "has_embedding": False,
                "error": str(e),
                "status": "error"
            }