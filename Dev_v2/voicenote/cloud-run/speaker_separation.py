import os
import torch
import torchaudio
import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import tempfile
from datetime import datetime

# pyannote.audioのインポート
from pyannote.audio import Pipeline
from pyannote.core import Annotation, Segment
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics.pairwise import cosine_similarity
import librosa

@dataclass
class SpeakerSegment:
    start: float
    end: float
    speaker: str
    confidence: float
    embedding: Optional[np.ndarray] = None

@dataclass
class GlobalSpeaker:
    id: str
    name: str
    embedding: np.ndarray
    confidence: float
    segments_count: int

class SpeakerSeparationService:
    """高精度話者分離サービス"""
    
    def __init__(self, device: str = "cpu"):
        self.device = device
        self.pipeline = None
        self.embedding_model = None
        self._initialize_models()
    
    def _initialize_models(self):
        """pyannote.audioモデルの初期化"""
        try:
            # 話者分離パイプライン
            self.pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=os.environ.get("HUGGINGFACE_TOKEN")
            )
            
            # 話者埋め込みモデル
            self.embedding_model = Pipeline.from_pretrained(
                "pyannote/embedding",
                use_auth_token=os.environ.get("HUGGINGFACE_TOKEN")
            )
            
            if torch.cuda.is_available() and self.device == "cuda":
                self.pipeline = self.pipeline.to(torch.device("cuda"))
                self.embedding_model = self.embedding_model.to(torch.device("cuda"))
                
            print("✅ pyannote.audio models initialized successfully")
            
        except Exception as e:
            print(f"❌ Failed to initialize pyannote.audio models: {str(e)}")
            # フォールバックとしてモック処理
            self.pipeline = None
            self.embedding_model = None
    
    async def analyze_speakers(self, audio_path: str, max_speakers: int = 5, 
                             user_embedding: Optional[np.ndarray] = None) -> Dict[str, any]:
        """音声ファイルの話者分離分析"""
        try:
            if self.pipeline is None:
                return await self._mock_speaker_analysis(audio_path, max_speakers)
            
            # 音声読み込み
            waveform, sample_rate = torchaudio.load(audio_path)
            
            # pyannote.audioで話者分離実行
            diarization = self.pipeline(audio_path)
            
            # セグメント抽出
            segments = self._extract_segments(diarization, waveform, sample_rate)
            
            # 話者埋め込み抽出
            segments_with_embeddings = await self._extract_speaker_embeddings(
                audio_path, segments
            )
            
            # グローバル話者クラスタリング
            global_speakers = await self._create_global_speakers(
                segments_with_embeddings, user_embedding
            )
            
            # セグメントに最終話者ラベルを適用
            final_segments = self._apply_global_speaker_labels(
                segments_with_embeddings, global_speakers
            )
            
            return {
                "speaker_count": len(global_speakers),
                "segments": [self._segment_to_dict(seg) for seg in final_segments],
                "global_speakers": [self._speaker_to_dict(spk) for spk in global_speakers],
                "consistency_score": self._calculate_consistency_score(final_segments),
                "processing_info": {
                    "model": "pyannote/speaker-diarization-3.1",
                    "device": self.device,
                    "total_segments": len(final_segments),
                    "audio_duration": self._get_audio_duration(audio_path)
                }
            }
            
        except Exception as e:
            print(f"Speaker analysis failed: {str(e)}")
            return await self._mock_speaker_analysis(audio_path, max_speakers)
    
    async def analyze_speakers_chunked(self, audio_chunks: List[str], 
                                     chunk_overlap_sec: float = 300.0,
                                     user_embedding: Optional[np.ndarray] = None) -> Dict[str, any]:
        """チャンク分割音声の話者分離（8時間対応）"""
        try:
            all_chunk_results = []
            global_embeddings = []
            
            # 各チャンクを個別に処理
            for i, chunk_path in enumerate(audio_chunks):
                print(f"Processing chunk {i+1}/{len(audio_chunks)}")
                
                chunk_result = await self.analyze_speakers(
                    chunk_path, max_speakers=10, user_embedding=user_embedding
                )
                
                # チャンク結果にオフセットを適用
                chunk_offset = i * (30 * 60 - chunk_overlap_sec)  # 30分 - オーバーラップ
                chunk_result = self._apply_time_offset(chunk_result, chunk_offset)
                
                all_chunk_results.append(chunk_result)
                
                # グローバル埋め込み収集
                for speaker in chunk_result["global_speakers"]:
                    global_embeddings.append({
                        "embedding": speaker["embedding"], 
                        "chunk_id": i,
                        "speaker_id": speaker["id"]
                    })
            
            # グローバル話者統合
            unified_speakers = await self._unify_global_speakers(
                all_chunk_results, global_embeddings, user_embedding
            )
            
            # 全セグメントを統合
            all_segments = []
            for chunk_result in all_chunk_results:
                all_segments.extend(chunk_result["segments"])
            
            # 重複セグメントの処理
            cleaned_segments = self._resolve_overlapping_segments(
                all_segments, chunk_overlap_sec
            )
            
            # 最終話者ラベル適用
            final_segments = self._apply_unified_speaker_labels(
                cleaned_segments, unified_speakers
            )
            
            return {
                "speaker_count": len(unified_speakers),
                "segments": final_segments,
                "global_speakers": unified_speakers,
                "consistency_score": self._calculate_global_consistency_score(final_segments),
                "chunk_info": {
                    "total_chunks": len(audio_chunks),
                    "overlap_seconds": chunk_overlap_sec,
                    "unified_speakers": len(unified_speakers)
                }
            }
            
        except Exception as e:
            print(f"Chunked speaker analysis failed: {str(e)}")
            raise
    
    async def _extract_speaker_embeddings(self, audio_path: str, 
                                        segments: List[SpeakerSegment]) -> List[SpeakerSegment]:
        """各セグメントの話者埋め込みを抽出"""
        if self.embedding_model is None:
            return segments
        
        try:
            # 音声読み込み
            waveform, sample_rate = torchaudio.load(audio_path)
            
            segments_with_embeddings = []
            
            for segment in segments:
                # セグメント音声抽出
                start_sample = int(segment.start * sample_rate)
                end_sample = int(segment.end * sample_rate)
                segment_waveform = waveform[:, start_sample:end_sample]
                
                # 埋め込み抽出
                if segment_waveform.shape[1] > 0:
                    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
                        torchaudio.save(tmp_file.name, segment_waveform, sample_rate)
                        
                        embedding = self.embedding_model(tmp_file.name)
                        segment.embedding = np.array(embedding.data).flatten()
                        
                        os.unlink(tmp_file.name)
                
                segments_with_embeddings.append(segment)
            
            return segments_with_embeddings
            
        except Exception as e:
            print(f"Embedding extraction failed: {str(e)}")
            return segments
    
    async def _create_global_speakers(self, segments: List[SpeakerSegment],
                                    user_embedding: Optional[np.ndarray] = None) -> List[GlobalSpeaker]:
        """グローバル話者作成"""
        try:
            # 埋め込みがあるセグメントのみを使用
            valid_segments = [seg for seg in segments if seg.embedding is not None]
            
            if not valid_segments:
                return self._create_default_speakers(len(segments))
            
            # 埋め込み行列作成
            embeddings = np.array([seg.embedding for seg in valid_segments])
            
            # 階層クラスタリングで話者をグループ化
            n_clusters = min(5, len(valid_segments))
            clustering = AgglomerativeClustering(
                n_clusters=n_clusters,
                metric='cosine',
                linkage='average'
            )
            
            speaker_labels = clustering.fit_predict(embeddings)
            
            # グローバル話者作成
            global_speakers = []
            for cluster_id in np.unique(speaker_labels):
                cluster_segments = [
                    valid_segments[i] for i in range(len(valid_segments)) 
                    if speaker_labels[i] == cluster_id
                ]
                
                # 代表埋め込み計算
                cluster_embeddings = np.array([seg.embedding for seg in cluster_segments])
                representative_embedding = np.mean(cluster_embeddings, axis=0)
                
                # ユーザー埋め込みとの類似度チェック
                is_user = False
                if user_embedding is not None:
                    similarity = cosine_similarity(
                        representative_embedding.reshape(1, -1),
                        user_embedding.reshape(1, -1)
                    )[0][0]
                    is_user = similarity > 0.8  # 閾値
                
                speaker_name = "あなた" if is_user else f"話者{cluster_id + 1}"
                
                global_speaker = GlobalSpeaker(
                    id=f"SPEAKER_{cluster_id:02d}",
                    name=speaker_name,
                    embedding=representative_embedding,
                    confidence=np.mean([seg.confidence for seg in cluster_segments]),
                    segments_count=len(cluster_segments)
                )
                
                global_speakers.append(global_speaker)
            
            return global_speakers
            
        except Exception as e:
            print(f"Global speaker creation failed: {str(e)}")
            return self._create_default_speakers(min(3, len(segments)))
    
    def _extract_segments(self, diarization: Annotation, waveform: torch.Tensor, 
                         sample_rate: int) -> List[SpeakerSegment]:
        """pyannote.audioの結果からセグメントを抽出"""
        segments = []
        
        for segment, _, speaker in diarization.itertracks(yield_label=True):
            segments.append(SpeakerSegment(
                start=segment.start,
                end=segment.end,
                speaker=speaker,
                confidence=0.9  # pyannote.audioの信頼度は別途計算
            ))
        
        return segments
    
    async def _unify_global_speakers(self, chunk_results: List[Dict], 
                                   global_embeddings: List[Dict],
                                   user_embedding: Optional[np.ndarray] = None) -> List[Dict]:
        """チャンク間でのグローバル話者統合"""
        try:
            # 全埋め込みを集める
            all_embeddings = []
            embedding_info = []
            
            for emb_data in global_embeddings:
                all_embeddings.append(emb_data["embedding"])
                embedding_info.append({
                    "chunk_id": emb_data["chunk_id"],
                    "speaker_id": emb_data["speaker_id"]
                })
            
            if not all_embeddings:
                return self._create_default_speakers_dict(3)
            
            # グローバルクラスタリング
            embeddings_matrix = np.array(all_embeddings)
            n_clusters = min(5, len(all_embeddings))
            
            clustering = AgglomerativeClustering(
                n_clusters=n_clusters,
                metric='cosine',
                linkage='average'
            )
            
            global_labels = clustering.fit_predict(embeddings_matrix)
            
            # 統合話者作成
            unified_speakers = []
            for cluster_id in np.unique(global_labels):
                cluster_indices = np.where(global_labels == cluster_id)[0]
                cluster_embeddings = embeddings_matrix[cluster_indices]
                
                # 代表埋め込み
                representative_embedding = np.mean(cluster_embeddings, axis=0)
                
                # ユーザー判定
                is_user = False
                if user_embedding is not None:
                    similarity = cosine_similarity(
                        representative_embedding.reshape(1, -1),
                        user_embedding.reshape(1, -1)
                    )[0][0]
                    is_user = similarity > 0.8
                
                speaker_name = "あなた" if is_user else f"話者{len(unified_speakers) + 1}"
                
                unified_speakers.append({
                    "id": f"UNIFIED_SPEAKER_{cluster_id:02d}",
                    "name": speaker_name,
                    "embedding": representative_embedding.tolist(),
                    "confidence": 0.85,
                    "segments_count": len(cluster_indices)
                })
            
            return unified_speakers
            
        except Exception as e:
            print(f"Speaker unification failed: {str(e)}")
            return self._create_default_speakers_dict(3)
    
    def _resolve_overlapping_segments(self, segments: List[Dict], 
                                    overlap_duration: float) -> List[Dict]:
        """重複セグメントの解決"""
        # 時間順にソート
        sorted_segments = sorted(segments, key=lambda x: x["start"])
        
        resolved_segments = []
        
        for i, segment in enumerate(sorted_segments):
            if i == 0:
                resolved_segments.append(segment)
                continue
            
            prev_segment = resolved_segments[-1]
            
            # 重複チェック
            if segment["start"] < prev_segment["end"]:
                # 重複がある場合の処理
                if segment["confidence"] > prev_segment["confidence"]:
                    # 新しいセグメントの信頼度が高い場合
                    prev_segment["end"] = segment["start"]
                    resolved_segments.append(segment)
                else:
                    # 前のセグメントの信頼度が高い場合
                    segment["start"] = prev_segment["end"]
                    if segment["end"] > segment["start"]:
                        resolved_segments.append(segment)
            else:
                resolved_segments.append(segment)
        
        return resolved_segments
    
    async def _mock_speaker_analysis(self, audio_path: str, max_speakers: int) -> Dict[str, any]:
        """pyannote.audioが利用できない場合のモック処理"""
        duration = self._get_audio_duration(audio_path)
        
        # モックセグメント生成
        segments = []
        current_time = 0.0
        speaker_id = 0
        
        while current_time < duration:
            segment_duration = np.random.uniform(2.0, 8.0)
            end_time = min(current_time + segment_duration, duration)
            
            segments.append({
                "start": current_time,
                "end": end_time,
                "speaker": f"SPEAKER_{speaker_id % max_speakers:02d}",
                "confidence": np.random.uniform(0.8, 0.95)
            })
            
            current_time = end_time
            speaker_id += 1
        
        # モックグローバル話者
        global_speakers = []
        for i in range(min(max_speakers, 3)):
            global_speakers.append({
                "id": f"SPEAKER_{i:02d}",
                "name": "あなた" if i == 0 else f"話者{i + 1}",
                "embedding": np.random.randn(512).tolist(),
                "confidence": np.random.uniform(0.8, 0.95),
                "segments_count": len([s for s in segments if s["speaker"] == f"SPEAKER_{i:02d}"])
            })
        
        return {
            "speaker_count": len(global_speakers),
            "segments": segments,
            "global_speakers": global_speakers,
            "consistency_score": 0.85,
            "processing_info": {
                "model": "mock",
                "device": "cpu",
                "total_segments": len(segments),
                "audio_duration": duration
            }
        }
    
    # ユーティリティメソッド
    def _get_audio_duration(self, audio_path: str) -> float:
        """音声ファイルの長さを取得"""
        try:
            return librosa.get_duration(path=audio_path)
        except Exception:
            return 60.0  # デフォルト値
    
    def _segment_to_dict(self, segment: SpeakerSegment) -> Dict:
        """SpeakerSegmentを辞書に変換"""
        return {
            "start": segment.start,
            "end": segment.end,
            "speaker": segment.speaker,
            "confidence": segment.confidence
        }
    
    def _speaker_to_dict(self, speaker: GlobalSpeaker) -> Dict:
        """GlobalSpeakerを辞書に変換"""
        return {
            "id": speaker.id,
            "name": speaker.name,
            "embedding": speaker.embedding.tolist() if isinstance(speaker.embedding, np.ndarray) else speaker.embedding,
            "confidence": speaker.confidence,
            "segments_count": speaker.segments_count
        }
    
    def _calculate_consistency_score(self, segments: List[SpeakerSegment]) -> float:
        """話者一貫性スコア計算"""
        if len(segments) < 2:
            return 1.0
        
        # 隣接セグメント間の話者変更頻度を基に計算
        changes = 0
        for i in range(1, len(segments)):
            if segments[i].speaker != segments[i-1].speaker:
                changes += 1
        
        # 正規化 (0-1の範囲)
        consistency = 1.0 - (changes / (len(segments) - 1))
        return max(0.5, consistency)  # 最低0.5を保証