/**
 * 統合APIクライアント
 * フロントエンドとCloud Runサービス間の通信を管理
 */

import config from './config';
import { audioProcessingClient } from '@/services/audioProcessingClient';

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  uptime?: number;
  memory?: {
    used: number;
    total: number;
  };
}

export interface ProcessingStatus {
  audioId: string;
  status: string;
  progress: number;
  stage: string;
  message?: string;
  currentChunk?: number;
  totalChunks?: number;
  estimatedTimeRemaining?: number;
  processingStartedAt?: Date;
  updatedAt?: Date;
}

export class APIClient {
  private static instance: APIClient;
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = config.api.audioProcessor;
    this.timeout = 30000; // 30秒
  }

  static getInstance(): APIClient {
    if (!APIClient.instance) {
      APIClient.instance = new APIClient();
    }
    return APIClient.instance;
  }

  // ヘルスチェック
  async healthCheck(): Promise<APIResponse<HealthStatus>> {
    try {
      const response = await this.fetch('/health', {
        method: 'GET',
        timeout: 5000
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error),
        code: 'HEALTH_CHECK_FAILED'
      };
    }
  }

  // 音声処理開始
  async startAudioProcessing(
    userId: string,
    audioId: string,
    options: {
      enableSpeakerSeparation?: boolean;
      maxSpeakers?: number;
      useUserEmbedding?: boolean;
      language?: string;
    } = {}
  ): Promise<APIResponse> {
    try {
      const result = await audioProcessingClient.startProcessingWithRetry(
        userId,
        audioId,
        {
          enableSpeakerSeparation: options.enableSpeakerSeparation,
          maxSpeakers: options.maxSpeakers,
          useUserEmbedding: options.useUserEmbedding,
          language: options.language,
          chunkDuration: config.audio.chunkDurationMinutes,
          overlapDuration: config.audio.overlapDurationMinutes
        }
      );

      return {
        success: result.status === 'processing_started',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error),
        code: 'PROCESSING_START_FAILED'
      };
    }
  }

  // 処理状況確認
  async getProcessingStatus(
    userId: string,
    audioId: string
  ): Promise<APIResponse<ProcessingStatus>> {
    try {
      const status = await audioProcessingClient.getProcessingStatus(userId, audioId);

      const processedStatus: ProcessingStatus = {
        audioId,
        status: status.status,
        progress: status.progress,
        stage: this.mapStatusToStage(status.status),
        message: status.message,
        currentChunk: status.currentChunk,
        totalChunks: status.totalChunks,
        updatedAt: status.updatedAt
      };

      return {
        success: true,
        data: processedStatus
      };
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error),
        code: 'STATUS_CHECK_FAILED'
      };
    }
  }

  // 処理キャンセル
  async cancelProcessing(
    userId: string,
    audioId: string
  ): Promise<APIResponse> {
    try {
      const result = await audioProcessingClient.cancelProcessing(userId, audioId);

      return {
        success: result.status === 'success',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error),
        code: 'CANCEL_FAILED'
      };
    }
  }

  // 音声学習
  async submitVoiceLearning(
    userId: string,
    audioData: string,
    sessionId: string
  ): Promise<APIResponse> {
    try {
      const result = await audioProcessingClient.voiceLearning(
        userId,
        audioData,
        sessionId
      );

      return {
        success: result.status === 'success',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error),
        code: 'VOICE_LEARNING_FAILED'
      };
    }
  }

  // 進捗監視（非同期ジェネレーター）
  async* monitorProcessing(
    userId: string,
    audioId: string,
    intervalMs: number = 5000
  ): AsyncGenerator<ProcessingStatus, void, unknown> {
    try {
      for await (const status of audioProcessingClient.monitorProcessingProgress(
        userId, 
        audioId, 
        intervalMs
      )) {
        yield {
          audioId,
          status: status.status,
          progress: status.progress,
          stage: this.mapStatusToStage(status.status),
          message: status.message,
          currentChunk: status.currentChunk,
          totalChunks: status.totalChunks,
          updatedAt: status.updatedAt
        };

        if (status.status === 'completed' || status.status === 'error' || status.status === 'cancelled') {
          break;
        }
      }
    } catch (error) {
      console.error('Progress monitoring failed:', error);
      throw error;
    }
  }

  // バッチ進捗確認（複数音声）
  async checkBatchStatus(
    userId: string,
    audioIds: string[]
  ): Promise<ProcessingStatus[]> {
    try {
      const statusPromises = audioIds.map(audioId =>
        this.getProcessingStatus(userId, audioId)
      );

      const results = await Promise.allSettled(statusPromises);
      const statuses = results
        .filter((result): result is PromiseFulfilledResult<APIResponse<ProcessingStatus>> => 
          result.status === 'fulfilled' && result.value.success
        )
        .map(result => result.value.data!);

      return statuses;
    } catch (error) {
      console.error('Batch status check failed:', error);
      return [];
    }
  }

  // サービス統計取得
  async getServiceStats(): Promise<APIResponse<{
    activeProcessing: number;
    queuedProcessing: number;
    totalProcessedToday: number;
    averageProcessingTime: number;
  }>> {
    try {
      const response = await this.fetch('/stats', {
        method: 'GET'
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error),
        code: 'STATS_FAILED'
      };
    }
  }

  // プライベートメソッド
  private async fetch(
    endpoint: string,
    options: {
      method: string;
      headers?: Record<string, string>;
      body?: any;
      timeout?: number;
    }
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private mapStatusToStage(status: string): string {
    const stageMap: Record<string, string> = {
      'uploaded': 'アップロード完了',
      'preprocessing': '前処理中',
      'speaker_analysis': '話者分析中',
      'chunk_processing': 'チャンク処理中',
      'transcribing': '文字起こし中',
      'integrating': '統合処理中',
      'completed': '完了',
      'error': 'エラー',
      'cancelled': 'キャンセル済み'
    };

    return stageMap[status] || status;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  // デバッグ用メソッド
  async testConnection(): Promise<APIResponse<{ latency: number }>> {
    const startTime = Date.now();
    const healthResult = await this.healthCheck();
    const latency = Date.now() - startTime;

    if (healthResult.success) {
      return {
        success: true,
        data: { latency }
      };
    } else {
      return {
        success: false,
        error: healthResult.error,
        code: 'CONNECTION_TEST_FAILED'
      };
    }
  }

  // 設定更新
  updateBaseUrl(newUrl: string) {
    this.baseUrl = newUrl;
  }

  updateTimeout(newTimeout: number) {
    this.timeout = newTimeout;
  }
}

// シングルトンインスタンス
export const apiClient = APIClient.getInstance();

// デフォルトエクスポート
export default apiClient;