import os
import json
import tempfile
import asyncio
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
from abc import ABC, abstractmethod
import aiohttp
import logging

# API クライアント
import openai
from azure.cognitiveservices.speech import SpeechConfig, SpeechRecognizer, AudioConfig
from google.cloud import speech
import assemblyai as aai
from deepgram import DeepgramClient, PrerecordedOptions

@dataclass
class TranscriptionResult:
    text: str
    confidence: float
    segments: List[Dict[str, Any]]
    language: str
    processing_time: float
    provider: str
    model: str
    word_timestamps: List[Dict[str, Any]] = None

@dataclass
class APIConfig:
    provider: str
    api_key: str
    model: str
    language: str = "ja-JP"
    settings: Dict[str, Any] = None

class TranscriptionAPI(ABC):
    """音声認識API基底クラス"""
    
    def __init__(self, config: APIConfig):
        self.config = config
        self.logger = logging.getLogger(f"{self.__class__.__name__}")
    
    @abstractmethod
    async def transcribe(self, audio_path: str) -> TranscriptionResult:
        """音声ファイルを文字起こし"""
        pass
    
    @abstractmethod
    async def transcribe_segment(self, audio_path: str, start_time: float, end_time: float) -> TranscriptionResult:
        """音声セグメントを文字起こし"""
        pass
    
    def _extract_audio_segment(self, audio_path: str, start_time: float, end_time: float) -> str:
        """音声セグメントを抽出"""
        from pydub import AudioSegment
        
        audio = AudioSegment.from_file(audio_path)
        start_ms = int(start_time * 1000)
        end_ms = int(end_time * 1000)
        segment = audio[start_ms:end_ms]
        
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            segment.export(tmp_file.name, format="wav")
            return tmp_file.name

class OpenAIWhisperAPI(TranscriptionAPI):
    """OpenAI Whisper API"""
    
    def __init__(self, config: APIConfig):
        super().__init__(config)
        self.client = openai.AsyncOpenAI(api_key=config.api_key)
    
    async def transcribe(self, audio_path: str) -> TranscriptionResult:
        """音声ファイル全体を文字起こし"""
        try:
            start_time = asyncio.get_event_loop().time()
            
            with open(audio_path, "rb") as audio_file:
                response = await self.client.audio.transcriptions.create(
                    model=self.config.model,
                    file=audio_file,
                    language="ja",
                    response_format="verbose_json",
                    timestamp_granularities=["word", "segment"]
                )
            
            processing_time = asyncio.get_event_loop().time() - start_time
            
            # セグメント情報の変換
            segments = []
            if hasattr(response, 'segments') and response.segments:
                segments = [
                    {
                        "start": seg.start,
                        "end": seg.end,
                        "text": seg.text,
                        "confidence": getattr(seg, 'avg_logprob', 0.0) + 1.0  # logprobを0-1に正規化
                    }
                    for seg in response.segments
                ]
            
            # ワードタイムスタンプ
            word_timestamps = []
            if hasattr(response, 'words') and response.words:
                word_timestamps = [
                    {
                        "word": word.word,
                        "start": word.start,
                        "end": word.end,
                        "confidence": getattr(word, 'probability', 0.9)
                    }
                    for word in response.words
                ]
            
            return TranscriptionResult(
                text=response.text,
                confidence=0.9,  # Whisperのデフォルト信頼度
                segments=segments,
                language=getattr(response, 'language', 'ja'),
                processing_time=processing_time,
                provider="openai",
                model=self.config.model,
                word_timestamps=word_timestamps
            )
            
        except Exception as e:
            self.logger.error(f"OpenAI Whisper transcription failed: {str(e)}")
            raise
    
    async def transcribe_segment(self, audio_path: str, start_time: float, end_time: float) -> TranscriptionResult:
        """音声セグメントを文字起こし"""
        segment_path = self._extract_audio_segment(audio_path, start_time, end_time)
        try:
            result = await self.transcribe(segment_path)
            return result
        finally:
            os.unlink(segment_path)

class AzureSpeechAPI(TranscriptionAPI):
    """Azure Speech Services API"""
    
    def __init__(self, config: APIConfig):
        super().__init__(config)
        self.speech_config = SpeechConfig(
            subscription=config.api_key,
            region=config.settings.get("region", "japaneast")
        )
        self.speech_config.speech_recognition_language = config.language
    
    async def transcribe(self, audio_path: str) -> TranscriptionResult:
        """音声ファイル全体を文字起こし"""
        try:
            start_time = asyncio.get_event_loop().time()
            
            # Azure Speech APIは同期処理のため、別スレッドで実行
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, self._sync_transcribe, audio_path)
            
            processing_time = asyncio.get_event_loop().time() - start_time
            
            return TranscriptionResult(
                text=result["text"],
                confidence=result["confidence"],
                segments=result["segments"],
                language=self.config.language,
                processing_time=processing_time,
                provider="azure",
                model="azure-speech"
            )
            
        except Exception as e:
            self.logger.error(f"Azure Speech transcription failed: {str(e)}")
            raise
    
    def _sync_transcribe(self, audio_path: str) -> Dict[str, Any]:
        """同期音声認識"""
        audio_config = AudioConfig(filename=audio_path)
        recognizer = SpeechRecognizer(
            speech_config=self.speech_config, 
            audio_config=audio_config
        )
        
        result = recognizer.recognize_once()
        
        return {
            "text": result.text,
            "confidence": 0.85,  # Azure Speech の平均信頼度
            "segments": [
                {
                    "start": 0.0,
                    "end": 0.0,  # Azure Speech では詳細タイムスタンプが限定的
                    "text": result.text,
                    "confidence": 0.85
                }
            ]
        }
    
    async def transcribe_segment(self, audio_path: str, start_time: float, end_time: float) -> TranscriptionResult:
        """音声セグメントを文字起こし"""
        segment_path = self._extract_audio_segment(audio_path, start_time, end_time)
        try:
            result = await self.transcribe(segment_path)
            return result
        finally:
            os.unlink(segment_path)

class GoogleSpeechAPI(TranscriptionAPI):
    """Google Cloud Speech-to-Text API"""
    
    def __init__(self, config: APIConfig):
        super().__init__(config)
        self.client = speech.SpeechClient()
    
    async def transcribe(self, audio_path: str) -> TranscriptionResult:
        """音声ファイル全体を文字起こし"""
        try:
            start_time = asyncio.get_event_loop().time()
            
            with open(audio_path, "rb") as audio_file:
                content = audio_file.read()
            
            audio = speech.RecognitionAudio(content=content)
            config = speech.RecognitionConfig(
                encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
                sample_rate_hertz=16000,
                language_code=self.config.language,
                enable_word_time_offsets=True,
                enable_word_confidence=True,
                enable_automatic_punctuation=True,
                model="latest_long"
            )
            
            # 非同期実行
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None, self.client.recognize, config, audio
            )
            
            processing_time = asyncio.get_event_loop().time() - start_time
            
            # 結果の処理
            text_parts = []
            segments = []
            word_timestamps = []
            
            for result in response.results:
                alternative = result.alternatives[0]
                text_parts.append(alternative.transcript)
                
                # セグメント情報
                segments.append({
                    "start": 0.0,  # Google Speech では結果レベルでのタイムスタンプ
                    "end": 0.0,
                    "text": alternative.transcript,
                    "confidence": alternative.confidence
                })
                
                # ワードタイムスタンプ
                for word_info in alternative.words:
                    word_timestamps.append({
                        "word": word_info.word,
                        "start": word_info.start_time.total_seconds(),
                        "end": word_info.end_time.total_seconds(),
                        "confidence": word_info.confidence
                    })
            
            return TranscriptionResult(
                text=" ".join(text_parts),
                confidence=response.results[0].alternatives[0].confidence if response.results else 0.8,
                segments=segments,
                language=self.config.language,
                processing_time=processing_time,
                provider="google",
                model="latest_long",
                word_timestamps=word_timestamps
            )
            
        except Exception as e:
            self.logger.error(f"Google Speech transcription failed: {str(e)}")
            raise
    
    async def transcribe_segment(self, audio_path: str, start_time: float, end_time: float) -> TranscriptionResult:
        """音声セグメントを文字起こし"""
        segment_path = self._extract_audio_segment(audio_path, start_time, end_time)
        try:
            result = await self.transcribe(segment_path)
            return result
        finally:
            os.unlink(segment_path)

class AssemblyAIAPI(TranscriptionAPI):
    """AssemblyAI API"""
    
    def __init__(self, config: APIConfig):
        super().__init__(config)
        aai.settings.api_key = config.api_key
    
    async def transcribe(self, audio_path: str) -> TranscriptionResult:
        """音声ファイル全体を文字起こし"""
        try:
            start_time = asyncio.get_event_loop().time()
            
            # AssemblyAIの設定
            transcriber_config = aai.TranscriptionConfig(
                language_code="ja",
                speaker_labels=True,
                word_boost=["会議", "議論", "計画", "プロジェクト"],
                boost_param="high"
            )
            
            transcriber = aai.Transcriber(config=transcriber_config)
            
            # 非同期実行
            loop = asyncio.get_event_loop()
            transcript = await loop.run_in_executor(
                None, transcriber.transcribe, audio_path
            )
            
            processing_time = asyncio.get_event_loop().time() - start_time
            
            # セグメント情報
            segments = []
            if transcript.utterances:
                segments = [
                    {
                        "start": utterance.start / 1000.0,  # msを秒に変換
                        "end": utterance.end / 1000.0,
                        "text": utterance.text,
                        "confidence": utterance.confidence
                    }
                    for utterance in transcript.utterances
                ]
            
            # ワードタイムスタンプ
            word_timestamps = []
            if transcript.words:
                word_timestamps = [
                    {
                        "word": word.text,
                        "start": word.start / 1000.0,
                        "end": word.end / 1000.0,
                        "confidence": word.confidence
                    }
                    for word in transcript.words
                ]
            
            return TranscriptionResult(
                text=transcript.text,
                confidence=transcript.confidence,
                segments=segments,
                language="ja",
                processing_time=processing_time,
                provider="assemblyai",
                model="best",
                word_timestamps=word_timestamps
            )
            
        except Exception as e:
            self.logger.error(f"AssemblyAI transcription failed: {str(e)}")
            raise
    
    async def transcribe_segment(self, audio_path: str, start_time: float, end_time: float) -> TranscriptionResult:
        """音声セグメントを文字起こし"""
        segment_path = self._extract_audio_segment(audio_path, start_time, end_time)
        try:
            result = await self.transcribe(segment_path)
            return result
        finally:
            os.unlink(segment_path)

class DeepgramAPI(TranscriptionAPI):
    """Deepgram API"""
    
    def __init__(self, config: APIConfig):
        super().__init__(config)
        self.client = DeepgramClient(config.api_key)
    
    async def transcribe(self, audio_path: str) -> TranscriptionResult:
        """音声ファイル全体を文字起こし"""
        try:
            start_time = asyncio.get_event_loop().time()
            
            with open(audio_path, "rb") as audio_file:
                buffer_data = audio_file.read()
            
            payload = {"buffer": buffer_data}
            
            options = PrerecordedOptions(
                model="nova-2",
                language="ja",
                smart_format=True,
                punctuate=True,
                diarize=True,
                utterances=True,
                words=True
            )
            
            response = await self.client.listen.asyncprerecorded.v("1").transcribe_file(
                payload, options
            )
            
            processing_time = asyncio.get_event_loop().time() - start_time
            
            # 結果の処理
            result = response["results"]["channels"][0]["alternatives"][0]
            
            # セグメント情報
            segments = []
            if "utterances" in response["results"]:
                segments = [
                    {
                        "start": utterance["start"],
                        "end": utterance["end"],
                        "text": utterance["transcript"],
                        "confidence": utterance["confidence"]
                    }
                    for utterance in response["results"]["utterances"]
                ]
            
            # ワードタイムスタンプ
            word_timestamps = []
            if "words" in result:
                word_timestamps = [
                    {
                        "word": word["word"],
                        "start": word["start"],
                        "end": word["end"],
                        "confidence": word["confidence"]
                    }
                    for word in result["words"]
                ]
            
            return TranscriptionResult(
                text=result["transcript"],
                confidence=result["confidence"],
                segments=segments,
                language="ja",
                processing_time=processing_time,
                provider="deepgram",
                model="nova-2",
                word_timestamps=word_timestamps
            )
            
        except Exception as e:
            self.logger.error(f"Deepgram transcription failed: {str(e)}")
            raise
    
    async def transcribe_segment(self, audio_path: str, start_time: float, end_time: float) -> TranscriptionResult:
        """音声セグメントを文字起こし"""
        segment_path = self._extract_audio_segment(audio_path, start_time, end_time)
        try:
            result = await self.transcribe(segment_path)
            return result
        finally:
            os.unlink(segment_path)

class TranscriptionService:
    """音声認識API統合サービス"""
    
    def __init__(self):
        self.providers = {
            "openai": OpenAIWhisperAPI,
            "azure": AzureSpeechAPI,
            "google": GoogleSpeechAPI,
            "assemblyai": AssemblyAIAPI,
            "deepgram": DeepgramAPI
        }
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def create_api_client(self, config: APIConfig) -> TranscriptionAPI:
        """API設定からクライアントを作成"""
        provider_class = self.providers.get(config.provider)
        if not provider_class:
            raise ValueError(f"Unsupported provider: {config.provider}")
        
        return provider_class(config)
    
    async def transcribe_with_fallback(self, audio_path: str, 
                                     primary_config: APIConfig,
                                     fallback_configs: List[APIConfig] = None) -> TranscriptionResult:
        """フォールバック付き音声認識"""
        configs = [primary_config]
        if fallback_configs:
            configs.extend(fallback_configs)
        
        last_error = None
        
        for i, config in enumerate(configs):
            try:
                self.logger.info(f"Attempting transcription with {config.provider} (attempt {i+1})")
                
                api_client = self.create_api_client(config)
                result = await api_client.transcribe(audio_path)
                
                self.logger.info(f"Transcription successful with {config.provider}")
                return result
                
            except Exception as e:
                last_error = e
                self.logger.warning(f"Transcription failed with {config.provider}: {str(e)}")
                
                if i < len(configs) - 1:
                    self.logger.info(f"Trying fallback provider...")
                    continue
        
        # 全てのプロバイダーで失敗
        raise Exception(f"All transcription providers failed. Last error: {str(last_error)}")
    
    async def transcribe_segments_batch(self, audio_path: str, 
                                      segments: List[Dict[str, float]],
                                      config: APIConfig,
                                      batch_size: int = 5) -> List[TranscriptionResult]:
        """セグメントのバッチ文字起こし"""
        api_client = self.create_api_client(config)
        results = []
        
        # バッチ処理
        for i in range(0, len(segments), batch_size):
            batch = segments[i:i + batch_size]
            
            # 並列実行
            tasks = [
                api_client.transcribe_segment(
                    audio_path, seg["start"], seg["end"]
                )
                for seg in batch
            ]
            
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for j, result in enumerate(batch_results):
                if isinstance(result, Exception):
                    self.logger.error(f"Segment {i+j} transcription failed: {str(result)}")
                    # エラーセグメントには空の結果を追加
                    results.append(TranscriptionResult(
                        text="[転写エラー]",
                        confidence=0.0,
                        segments=[],
                        language=config.language,
                        processing_time=0.0,
                        provider=config.provider,
                        model=config.model
                    ))
                else:
                    results.append(result)
        
        return results
    
    async def optimize_provider_selection(self, audio_characteristics: Dict[str, Any]) -> str:
        """音声特性に基づく最適プロバイダー選択"""
        duration = audio_characteristics.get("duration", 0)
        noise_level = audio_characteristics.get("noise_level", 0.5)
        speaker_count = audio_characteristics.get("speaker_count", 1)
        language = audio_characteristics.get("language", "ja")
        
        # 最適化ロジック
        if duration > 3600:  # 1時間以上
            if noise_level > 0.7:
                return "assemblyai"  # ノイズ耐性が高い
            else:
                return "deepgram"    # 長時間処理に最適
        elif speaker_count > 3:
            return "assemblyai"      # 話者分離が得意
        elif noise_level > 0.6:
            return "openai"          # Whisperのノイズ耐性
        else:
            return "deepgram"        # 高速・高精度
    
    def get_cost_estimate(self, duration_minutes: float, provider: str) -> float:
        """コスト見積もり"""
        # 分あたりのコスト（USD）
        cost_per_minute = {
            "openai": 0.006,      # $0.006/分
            "azure": 0.02,        # $1.20/時間
            "google": 0.024,      # $1.44/時間
            "assemblyai": 0.0065, # $0.39/時間
            "deepgram": 0.0043    # $0.258/時間
        }
        
        return duration_minutes * cost_per_minute.get(provider, 0.01)