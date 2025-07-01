// API設定関連の型定義
export interface ApiSettings {
  speechProvider: string;
  speechApiKey: string;
  speechModel: string;
  speechSettings?: Record<string, any>;
  llmProvider: string;
  llmApiKey: string;
  llmModel: string;
  llmSettings?: Record<string, any>;
  summaryLlmProvider?: string;
  summaryLlmModel?: string;
  fallbackConfigs?: Array<{
    type: 'speech' | 'llm';
    provider: string;
    apiKey: string;
    model: string;
  }>;
  updatedAt: Date;
}

// 音声ファイル関連の型定義
export interface AudioFile {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  processedAudioUrl?: string;
  duration: number;
  audioQuality?: AudioQuality;
  status: AudioProcessingStatus;
  createdAt: Date;
  updatedAt: Date;
  transcription?: TranscriptionResult;
  summary?: SummaryResult;
  summaryStatus?: 'generating' | 'completed' | 'error';
  summaryProgress?: number;
  summaryError?: string;
  askAIChats?: ChatMessage[];
  // 長時間音声処理用
  totalChunks?: number;
  processedChunks?: number;
  processingProgress?: number;
  chunks?: ProcessingChunk[];
  // 話者分離関連
  globalSpeakers?: GlobalSpeaker[];
  speakerConsistencyScore?: number;
  overlapAnalysis?: OverlapAnalysis;
  speakerEditHistory?: SpeakerEditHistory[];
  customSpeakerNames?: Record<string, string>;
}

export type AudioProcessingStatus = 
  | 'uploaded' 
  | 'preprocessing' 
  | 'speaker_analysis' 
  | 'chunk_processing' 
  | 'transcribing' 
  | 'integrating' 
  | 'completed' 
  | 'error';

export interface AudioQuality {
  snr: number; // Signal-to-Noise Ratio
  noiseLevel: number;
  volumeLevel: number;
  format: string;
  sampleRate: number;
  channels: number;
}

// 話者分離関連
export interface SpeakerSegment {
  start: number;
  end: number;
  speaker: string;
  confidence: number;
  text?: string;
}

export interface GlobalSpeaker {
  id: string;
  name: string;
  embedding: number[];
  confidence: number;
  segments: number; // このスピーカーのセグメント数
}

export interface OverlapAnalysis {
  totalOverlapTime: number;
  overlapSegments: Array<{
    start: number;
    end: number;
    speakers: string[];
  }>;
}

export interface SpeakerEditHistory {
  timestamp: Date;
  action: 'rename' | 'merge' | 'split';
  oldValue: string;
  newValue: string;
  affectedSegments: number[];
}

// 処理チャンク関連
export interface ProcessingChunk {
  id: string;
  chunkIndex: number;
  startTime: number;
  endTime: number;
  overlapStart?: number;
  overlapEnd?: number;
  chunkUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: ChunkProcessingResult;
  speakerMapping?: Record<string, string>;
  consistencyCheck?: ConsistencyCheck;
}

export interface ChunkProcessingResult {
  speakers: SpeakerSegment[];
  transcription: string;
  confidence: number;
}

export interface ConsistencyCheck {
  previousChunkSimilarity: number;
  nextChunkSimilarity: number;
  speakerContinuity: boolean;
}

// 文字起こし関連
export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  speakers: string[];
  language: string;
  confidence: number;
  processingTime: number;
  apiProvider: string;
  model: string;
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  speaker: string;
  confidence: number;
  words?: WordTimestamp[];
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

// 要約関連
export interface SummaryResult {
  overall: string;
  speakerSummaries: Record<string, string>;
  keyPoints: string[];
  actionItems: string[];
  topics: string[];
  apiProvider: string;
  model: string;
  generatedAt: Date;
}

// チャット関連
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ユーザー関連
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Date;
  learningAudioCount: number;
  embeddingLastUpdated?: Date;
  speechApiConfig: SpeechApiConfig;
  llmApiConfig: LLMApiConfig;
  apiUsageStats: ApiUsageStats;
}

// API設定関連
export interface SpeechApiConfig {
  provider: SpeechProvider;
  apiKey?: string;
  model: string;
  settings: Record<string, any>;
  fallbackProvider?: SpeechProvider;
}

export type SpeechProvider = 
  | 'openai' 
  | 'azure' 
  | 'google' 
  | 'assembly' 
  | 'deepgram';

export interface LLMApiConfig {
  provider: LLMProvider;
  apiKey?: string;
  model: string;
  summaryProvider?: LLMProvider;
  summaryModel?: string;
  settings: Record<string, any>;
  fallbackProvider?: LLMProvider;
}

export type LLMProvider = 
  | 'openai' 
  | 'anthropic' 
  | 'google' 
  | 'azure' 
  | 'aws' 
  | 'cohere' 
  | 'groq'
  | 'deepseek';

export interface ApiUsageStats {
  speechApiCalls: number;
  speechTokens: number;
  speechCost: number;
  llmApiCalls: number;
  llmTokens: number;
  llmCost: number;
  lastReset: Date;
}

// 学習音声関連
export interface LearningAudio {
  id: string;
  userId: string;
  audioUrl: string;
  duration: number;
  createdAt: Date;
  qualityScore: number;
  status: 'processing' | 'completed' | 'failed';
}

export interface UserEmbedding {
  userId: string;
  embedding: number[];
  lastUpdated: Date;
  audioCount: number;
  confidenceScore: number;
}