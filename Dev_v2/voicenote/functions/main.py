import os
import json
import tempfile
import asyncio
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime

import functions_framework
from flask import Request, jsonify
import firebase_admin
from firebase_admin import credentials, firestore, storage
from google.cloud import tasks_v2
import torch
import torchaudio
import librosa
import numpy as np
import noisereduce as nr
from pydub import AudioSegment

# Firebase初期化
if not firebase_admin._apps:
    cred = credentials.ApplicationDefault()
    firebase_admin.initialize_app(cred)

db = firestore.client()
bucket = storage.bucket()

@dataclass
class AudioQuality:
    snr: float
    noise_level: float
    volume_level: float
    sample_rate: int
    channels: int
    duration: float

@dataclass
class ProcessingConfig:
    enable_speaker_separation: bool = True
    max_speakers: int = 5
    use_user_embedding: bool = True
    language: str = "ja"
    chunk_duration: int = 30  # 分
    overlap_duration: int = 5  # 分

class AudioProcessor:
    """音声処理メインクラス"""
    
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Using device: {self.device}")
        
    async def process_audio(self, user_id: str, audio_id: str, config: ProcessingConfig) -> Dict[str, Any]:
        """音声処理メイン関数"""
        try:
            # 処理開始をFirestoreに記録
            await self._update_status(user_id, audio_id, "preprocessing", 0)
            
            # Phase 0: 音声前処理
            processed_audio_path = await self._preprocess_audio(user_id, audio_id)
            
            # Phase 1: 話者分離
            speaker_analysis = await self._analyze_speakers(user_id, audio_id, processed_audio_path, config)
            
            # Phase 2: 長時間音声のチャンク処理または直接処理
            transcription_result = await self._process_transcription(
                user_id, audio_id, processed_audio_path, speaker_analysis, config
            )
            
            # Phase 3: 要約生成
            summary_result = await self._generate_summary(user_id, audio_id, transcription_result)
            
            # 最終結果の保存
            await self._save_final_results(user_id, audio_id, transcription_result, summary_result)
            
            return {
                "status": "completed",
                "transcription": transcription_result,
                "summary": summary_result
            }
            
        except Exception as e:
            print(f"Audio processing failed: {str(e)}")
            await self._update_status(user_id, audio_id, "error", 0)
            raise
    
    async def _preprocess_audio(self, user_id: str, audio_id: str) -> str:
        """Phase 0: 音声前処理"""
        await self._update_status(user_id, audio_id, "preprocessing", 10)
        
        # 音声ファイルをダウンロード
        audio_path = await self._download_audio(user_id, audio_id)
        
        # 音声品質分析
        quality = await self._analyze_audio_quality(audio_path)
        
        # ノイズ除去
        await self._update_status(user_id, audio_id, "preprocessing", 15, "ノイズ除去中...")
        processed_path = await self._noise_reduction(audio_path)
        
        # 音量正規化
        await self._update_status(user_id, audio_id, "preprocessing", 20, "音量正規化中...")
        normalized_path = await self._normalize_volume(processed_path)
        
        # 品質情報をFirestoreに保存
        await self._save_audio_quality(user_id, audio_id, quality)
        
        return normalized_path
    
    async def _analyze_speakers(self, user_id: str, audio_id: str, audio_path: str, config: ProcessingConfig) -> Dict[str, Any]:
        """Phase 1: 話者分離"""
        await self._update_status(user_id, audio_id, "speaker_analysis", 25, "話者分離開始...")
        
        # 音声時間チェック
        duration = await self._get_audio_duration(audio_path)
        
        if duration > config.chunk_duration * 60:  # 30分以上の場合
            return await self._analyze_speakers_with_chunking(user_id, audio_id, audio_path, config)
        else:
            return await self._analyze_speakers_direct(user_id, audio_id, audio_path, config)
    
    async def _analyze_speakers_direct(self, user_id: str, audio_id: str, audio_path: str, config: ProcessingConfig) -> Dict[str, Any]:
        """直接話者分離（30分以下）"""
        try:
            # pyannote.audioを使用した話者分離（実装予定）
            # 現在はモック実装
            await asyncio.sleep(2)  # 処理時間シミュレート
            
            # モック結果
            speakers_result = {
                "speaker_count": 3,
                "segments": [
                    {"start": 0.0, "end": 5.2, "speaker": "SPEAKER_00", "confidence": 0.95},
                    {"start": 5.2, "end": 12.8, "speaker": "SPEAKER_01", "confidence": 0.92},
                    {"start": 12.8, "end": 18.5, "speaker": "SPEAKER_00", "confidence": 0.89},
                ],
                "global_speakers": [
                    {"id": "SPEAKER_00", "name": "あなた", "confidence": 0.88},
                    {"id": "SPEAKER_01", "name": "Aさん", "confidence": 0.85},
                    {"id": "SPEAKER_02", "name": "Bさん", "confidence": 0.82},
                ]
            }
            
            await self._update_status(user_id, audio_id, "speaker_analysis", 40, f"{speakers_result['speaker_count']}名の話者を検出")
            
            return speakers_result
            
        except Exception as e:
            print(f"Speaker analysis failed: {str(e)}")
            raise
    
    async def _analyze_speakers_with_chunking(self, user_id: str, audio_id: str, audio_path: str, config: ProcessingConfig) -> Dict[str, Any]:
        """チャンク分割での話者分離（長時間音声）"""
        await self._update_status(user_id, audio_id, "chunk_processing", 30, "長時間音声をチャンク分割中...")
        
        # 音声をチャンクに分割
        chunks = await self._split_audio_to_chunks(audio_path, config.chunk_duration, config.overlap_duration)
        total_chunks = len(chunks)
        
        # Firestoreにチャンク情報を保存
        await self._update_audio_chunks_info(user_id, audio_id, total_chunks)
        
        # 各チャンクを並列処理
        chunk_results = []
        for i, chunk_path in enumerate(chunks):
            await self._update_status(
                user_id, audio_id, "chunk_processing", 
                30 + (i / total_chunks) * 30,
                f"チャンク {i+1}/{total_chunks} を処理中..."
            )
            
            # チャンク毎の話者分離
            chunk_result = await self._process_chunk_speakers(chunk_path, i, config)
            chunk_results.append(chunk_result)
            
            # 進捗をFirestoreに保存
            await self._update_processed_chunks(user_id, audio_id, i + 1)
        
        # グローバル話者マッピング
        global_result = await self._merge_chunk_speakers(chunk_results)
        
        await self._update_status(user_id, audio_id, "speaker_analysis", 60, "話者統合完了")
        
        return global_result
    
    async def _process_transcription(self, user_id: str, audio_id: str, audio_path: str, 
                                   speaker_analysis: Dict[str, Any], config: ProcessingConfig) -> Dict[str, Any]:
        """Phase 2: 文字起こし処理"""
        await self._update_status(user_id, audio_id, "transcribing", 65, "文字起こし開始...")
        
        # ユーザーのAPI設定を取得
        api_config = await self._get_user_api_config(user_id)
        
        # セグメント毎に文字起こし
        transcription_segments = []
        total_segments = len(speaker_analysis["segments"])
        
        for i, segment in enumerate(speaker_analysis["segments"]):
            progress = 65 + (i / total_segments) * 25
            await self._update_status(
                user_id, audio_id, "transcribing", 
                progress, f"セグメント {i+1}/{total_segments} を文字起こし中..."
            )
            
            # セグメント音声を抽出
            segment_audio = await self._extract_segment_audio(audio_path, segment["start"], segment["end"])
            
            # API呼び出しで文字起こし
            text = await self._transcribe_segment(segment_audio, api_config)
            
            transcription_segments.append({
                "start": segment["start"],
                "end": segment["end"],
                "text": text,
                "speaker": segment["speaker"],
                "confidence": segment["confidence"]
            })
        
        # 話者ラベルをマッピング
        labeled_segments = await self._apply_speaker_labels(transcription_segments, speaker_analysis["global_speakers"])
        
        result = {
            "text": " ".join([seg["text"] for seg in labeled_segments]),
            "segments": labeled_segments,
            "speakers": [speaker["name"] for speaker in speaker_analysis["global_speakers"]],
            "language": config.language,
            "confidence": np.mean([seg["confidence"] for seg in labeled_segments]),
            "processing_time": 0,  # 実際の処理時間を記録
            "api_provider": api_config.get("provider", "openai"),
            "model": api_config.get("model", "whisper-1")
        }
        
        await self._update_status(user_id, audio_id, "transcribing", 90, "文字起こし完了")
        
        return result
    
    async def _generate_summary(self, user_id: str, audio_id: str, transcription: Dict[str, Any]) -> Dict[str, Any]:
        """Phase 3: 要約生成"""
        await self._update_status(user_id, audio_id, "integrating", 92, "AI要約生成中...")
        
        # ユーザーのLLM API設定を取得
        llm_config = await self._get_user_llm_config(user_id)
        
        # 要約生成（実装予定）
        await asyncio.sleep(3)  # 処理時間シミュレート
        
        # モック要約結果
        summary_result = {
            "overall": "この音声では重要な議論が行われ、具体的な行動計画が策定されました。",
            "speaker_summaries": {
                speaker: f"{speaker}の主要な発言内容をまとめました。" 
                for speaker in transcription["speakers"]
            },
            "key_points": [
                "重要ポイント1",
                "重要ポイント2", 
                "重要ポイント3"
            ],
            "action_items": [
                "アクションアイテム1",
                "アクションアイテム2"
            ],
            "topics": ["トピック1", "トピック2"],
            "api_provider": llm_config.get("provider", "openai"),
            "model": llm_config.get("model", "gpt-4"),
            "generated_at": datetime.now().isoformat()
        }
        
        await self._update_status(user_id, audio_id, "integrating", 98, "最終統合中...")
        
        return summary_result
    
    # ユーティリティメソッド
    async def _update_status(self, user_id: str, audio_id: str, status: str, progress: int, message: str = ""):
        """処理状況をFirestoreに更新"""
        try:
            doc_ref = db.collection('audios').document(user_id).collection('files').document(audio_id)
            await doc_ref.update({
                'status': status,
                'processingProgress': progress,
                'statusMessage': message,
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
        except Exception as e:
            print(f"Failed to update status: {str(e)}")
    
    async def _download_audio(self, user_id: str, audio_id: str) -> str:
        """Storageから音声ファイルをダウンロード"""
        # 実装予定
        pass
    
    async def _analyze_audio_quality(self, audio_path: str) -> AudioQuality:
        """音声品質分析"""
        # 実装予定
        pass
    
    async def _noise_reduction(self, audio_path: str) -> str:
        """ノイズ除去処理"""
        # 実装予定
        pass
    
    async def _normalize_volume(self, audio_path: str) -> str:
        """音量正規化"""
        # 実装予定
        pass

# Cloud Functions エントリーポイント
@functions_framework.http
def process_audio_http(request: Request):
    """HTTP経由での音声処理開始"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        audio_id = data.get('audio_id')
        config_data = data.get('config', {})
        
        if not user_id or not audio_id:
            return jsonify({"error": "user_id and audio_id are required"}), 400
        
        config = ProcessingConfig(**config_data)
        
        # 非同期処理をバックグラウンドで開始
        processor = AudioProcessor()
        
        # Cloud Tasksを使用してバックグラウンド処理
        task_client = tasks_v2.CloudTasksClient()
        project = os.environ.get('GCP_PROJECT')
        queue = 'audio-processing-queue'
        location = 'asia-northeast1'
        
        queue_path = task_client.queue_path(project, location, queue)
        
        task = {
            'http_request': {
                'http_method': tasks_v2.HttpMethod.POST,
                'url': f'https://{location}-{project}.cloudfunctions.net/process_audio_task',
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'user_id': user_id,
                    'audio_id': audio_id,
                    'config': config_data
                }).encode()
            }
        }
        
        task_client.create_task(parent=queue_path, task=task)
        
        return jsonify({
            "status": "processing_started",
            "message": "音声処理がバックグラウンドで開始されました"
        })
        
    except Exception as e:
        print(f"Error starting audio processing: {str(e)}")
        return jsonify({"error": str(e)}), 500

@functions_framework.http
def process_audio_task(request: Request):
    """Cloud Tasksからの音声処理実行"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        audio_id = data.get('audio_id')
        config_data = data.get('config', {})
        
        config = ProcessingConfig(**config_data)
        processor = AudioProcessor()
        
        # 非同期処理を実行
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        result = loop.run_until_complete(
            processor.process_audio(user_id, audio_id, config)
        )
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Audio processing task failed: {str(e)}")
        return jsonify({"error": str(e)}), 500