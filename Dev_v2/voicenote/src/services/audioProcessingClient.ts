import { AudioFile } from '@/types';

export interface ProcessingConfig {
  enableSpeakerSeparation?: boolean;
  maxSpeakers?: number;
  useUserEmbedding?: boolean;
  language?: string;
  chunkDuration?: number;
  overlapDuration?: number;
  // API設定
  speechProvider?: string;
  speechApiKey?: string;
  speechModel?: string;
  speechSettings?: any;
  llmProvider?: string;
  llmApiKey?: string;
  llmModel?: string;
  llmSettings?: any;
}

export interface ProcessingResponse {
  status: 'processing_started' | 'success' | 'error';
  message: string;
  userId?: string;
  audioId?: string;
  result?: any;
}

export interface ProcessingStatus {
  status: string;
  progress: number;
  message?: string;
  currentChunk?: number;
  totalChunks?: number;
  updatedAt?: Date;
}

export class AudioProcessingClient {
  private static instance: AudioProcessingClient;
  private baseUrl: string;

  constructor() {
    // Firebase Functions URLを使用
    this.baseUrl = process.env.NEXT_PUBLIC_AUDIO_PROCESSOR_URL || 
                   'https://us-central1-voicenote-dev.cloudfunctions.net/processAudio';
    
    console.log('🔧 Audio processor URL configured:', this.baseUrl);
  }

  static getInstance(): AudioProcessingClient {
    if (!AudioProcessingClient.instance) {
      AudioProcessingClient.instance = new AudioProcessingClient();
    }
    return AudioProcessingClient.instance;
  }

  // 音声処理開始
  async startProcessing(
    userId: string, 
    audioId: string, 
    config: ProcessingConfig = {}
  ): Promise<ProcessingResponse> {
    try {
      // バックエンドURLが未設定の場合はエラーを投げる
      if (!this.baseUrl) {
        throw new Error('Audio processing backend is not configured. Backend deployment is in progress.');
      }
      
      const response = await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          audio_id: audioId,
          config: {
            enable_speaker_separation: config.enableSpeakerSeparation ?? true,
            max_speakers: config.maxSpeakers ?? 5,
            use_user_embedding: config.useUserEmbedding ?? true,
            language: config.language ?? 'ja',
            chunk_duration: config.chunkDuration ?? 30,
            overlap_duration: config.overlapDuration ?? 5,
            // API設定を追加
            speech_provider: config.speechProvider,
            speech_api_key: config.speechApiKey,
            speech_model: config.speechModel,
            speech_settings: config.speechSettings,
            llm_provider: config.llmProvider,
            llm_api_key: config.llmApiKey,
            llm_model: config.llmModel,
            llm_settings: config.llmSettings
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to start audio processing:', error);
      throw error;
    }
  }

  // 処理状況確認
  async getProcessingStatus(userId: string, audioId: string): Promise<ProcessingStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/processing-status/${userId}/${audioId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        status: data.status,
        progress: data.progress,
        message: data.message,
        currentChunk: data.current_chunk,
        totalChunks: data.total_chunks,
        updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
      };
    } catch (error) {
      console.error('Failed to get processing status:', error);
      throw error;
    }
  }

  // 処理キャンセル
  async cancelProcessing(userId: string, audioId: string): Promise<ProcessingResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/cancel-processing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          audio_id: audioId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to cancel processing:', error);
      throw error;
    }
  }

  // 話者分離のみ実行
  async speakerSeparation(
    userId: string, 
    audioId: string, 
    config: ProcessingConfig = {}
  ): Promise<ProcessingResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/speaker-separation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          audio_id: audioId,
          config: {
            max_speakers: config.maxSpeakers ?? 5,
            use_user_embedding: config.useUserEmbedding ?? true,
            use_chunking: (config.chunkDuration ?? 30) > 0
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to perform speaker separation:', error);
      throw error;
    }
  }

  // 文字起こしのみ実行
  async transcription(
    userId: string,
    audioPath: string,
    apiConfig: {
      provider: string;
      apiKey: string;
      model: string;
      language?: string;
      settings?: any;
    },
    segments?: Array<{ start: number; end: number }>
  ): Promise<ProcessingResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/transcription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          audio_path: audioPath,
          api_config: apiConfig,
          segments: segments
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to perform transcription:', error);
      throw error;
    }
  }

  // 音声学習
  async voiceLearning(
    userId: string,
    audioData: string, // Base64エンコードされた音声データ
    sessionId: string
  ): Promise<ProcessingResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/voice-learning`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          audio_data: audioData,
          session_id: sessionId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to perform voice learning:', error);
      throw error;
    }
  }

  // ヘルスチェック
  async healthCheck(): Promise<{ status: string; service: string; version: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // バッチ処理状況監視
  async* monitorProcessingProgress(
    userId: string, 
    audioId: string, 
    intervalMs: number = 5000
  ): AsyncGenerator<ProcessingStatus, void, unknown> {
    while (true) {
      try {
        const status = await this.getProcessingStatus(userId, audioId);
        yield status;

        // 完了またはエラー時は監視終了
        if (status.status === 'completed' || status.status === 'error' || status.status === 'cancelled') {
          break;
        }

        // 指定された間隔で待機
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      } catch (error) {
        console.error('Error monitoring processing progress:', error);
        // エラーが発生しても監視を継続（ネットワークエラー等）
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
  }

  // リトライ機能付きリクエスト
  private async requestWithRetry<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          break;
        }

        // 指数バックオフで待機
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  // 処理開始（リトライ付き）
  async startProcessingWithRetry(
    userId: string, 
    audioId: string, 
    config: ProcessingConfig = {}
  ): Promise<ProcessingResponse> {
    return this.requestWithRetry(
      () => this.startProcessing(userId, audioId, config),
      3,
      2000
    );
  }
}

export const audioProcessingClient = AudioProcessingClient.getInstance();