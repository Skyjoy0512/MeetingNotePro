/**
 * 音声処理フック
 * 音声処理の状態管理とリアルタイム進捗監視
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient, ProcessingStatus } from '@/lib/apiClient';
import { useAuth } from './useAuth';
import config from '@/lib/config';

export interface UseAudioProcessingOptions {
  autoStartMonitoring?: boolean;
  monitoringInterval?: number;
  onProgressUpdate?: (status: ProcessingStatus) => void;
  onComplete?: (status: ProcessingStatus) => void;
  onError?: (error: string) => void;
}

export interface AudioProcessingState {
  // 処理状態
  isProcessing: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  isError: boolean;
  
  // 進捗情報
  progress: number;
  stage: string;
  message: string;
  currentChunk?: number;
  totalChunks?: number;
  estimatedTimeRemaining?: number;
  
  // メタデータ
  processingStartedAt?: Date;
  lastUpdated?: Date;
  error?: string;
}

export interface UseAudioProcessingReturn {
  // 状態
  state: AudioProcessingState;
  
  // 操作
  startProcessing: (audioId: string, options?: {
    enableSpeakerSeparation?: boolean;
    maxSpeakers?: number;
    useUserEmbedding?: boolean;
    language?: string;
  }) => Promise<boolean>;
  
  cancelProcessing: (audioId: string) => Promise<boolean>;
  pauseMonitoring: () => void;
  resumeMonitoring: () => void;
  
  // 進捗監視
  startMonitoring: (audioId: string) => void;
  stopMonitoring: () => void;
  
  // 状態確認
  checkStatus: (audioId: string) => Promise<ProcessingStatus | null>;
  
  // バッチ操作
  checkBatchStatus: (audioIds: string[]) => Promise<ProcessingStatus[]>;
}

export function useAudioProcessing(options: UseAudioProcessingOptions = {}): UseAudioProcessingReturn {
  const { user } = useAuth();
  const [state, setState] = useState<AudioProcessingState>({
    isProcessing: false,
    isPaused: false,
    isCompleted: false,
    isError: false,
    progress: 0,
    stage: '',
    message: ''
  });

  const [currentAudioId, setCurrentAudioId] = useState<string>('');
  const [monitoringController, setMonitoringController] = useState<AbortController | null>(null);

  // 状態更新ヘルパー
  const updateState = useCallback((updates: Partial<AudioProcessingState>) => {
    setState(prev => ({
      ...prev,
      ...updates,
      lastUpdated: new Date()
    }));
  }, []);

  // 進捗状況から状態を更新
  const updateFromStatus = useCallback((status: ProcessingStatus) => {
    const isCompleted = status.status === 'completed';
    const isError = status.status === 'error';
    const isProcessing = !isCompleted && !isError && status.status !== 'cancelled';

    updateState({
      isProcessing,
      isCompleted,
      isError,
      progress: status.progress,
      stage: status.stage,
      message: status.message || '',
      currentChunk: status.currentChunk,
      totalChunks: status.totalChunks,
      error: isError ? status.message : undefined
    });

    // コールバック呼び出し
    if (options.onProgressUpdate) {
      options.onProgressUpdate(status);
    }

    if (isCompleted && options.onComplete) {
      options.onComplete(status);
    }

    if (isError && options.onError) {
      options.onError(status.message || 'Unknown error');
    }
  }, [options, updateState]);

  // 音声処理開始
  const startProcessing = useCallback(async (
    audioId: string,
    processingOptions: {
      enableSpeakerSeparation?: boolean;
      maxSpeakers?: number;
      useUserEmbedding?: boolean;
      language?: string;
    } = {}
  ): Promise<boolean> => {
    if (!user) {
      console.error('User not authenticated');
      return false;
    }

    try {
      updateState({
        isProcessing: true,
        isCompleted: false,
        isError: false,
        progress: 0,
        stage: '処理開始中...',
        message: '音声処理を開始しています...',
        processingStartedAt: new Date(),
        error: undefined
      });

      const result = await apiClient.startAudioProcessing(
        user.uid,
        audioId,
        {
          enableSpeakerSeparation: processingOptions.enableSpeakerSeparation ?? true,
          maxSpeakers: processingOptions.maxSpeakers ?? 5,
          useUserEmbedding: processingOptions.useUserEmbedding ?? true,
          language: processingOptions.language ?? 'ja'
        }
      );

      if (result.success) {
        setCurrentAudioId(audioId);
        
        // 自動監視開始
        if (options.autoStartMonitoring !== false) {
          startMonitoring(audioId);
        }
        
        return true;
      } else {
        updateState({
          isProcessing: false,
          isError: true,
          error: result.error || 'Failed to start processing'
        });
        
        if (options.onError) {
          options.onError(result.error || 'Failed to start processing');
        }
        
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      updateState({
        isProcessing: false,
        isError: true,
        error: errorMessage
      });
      
      if (options.onError) {
        options.onError(errorMessage);
      }
      
      return false;
    }
  }, [user, options, updateState]);

  // 進捗監視開始
  const startMonitoring = useCallback((audioId: string) => {
    if (!user) return;

    // 既存の監視を停止
    if (monitoringController) {
      monitoringController.abort();
    }

    const controller = new AbortController();
    setMonitoringController(controller);
    setCurrentAudioId(audioId);

    (async () => {
      try {
        for await (const status of apiClient.monitorProcessing(
          user.uid,
          audioId,
          options.monitoringInterval || config.ui.progressUpdateInterval
        )) {
          if (controller.signal.aborted) break;

          updateFromStatus(status);

          // 完了またはエラー時は監視終了
          if (status.status === 'completed' || status.status === 'error' || status.status === 'cancelled') {
            break;
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Monitoring failed:', error);
          updateState({
            isError: true,
            error: 'Progress monitoring failed'
          });
        }
      } finally {
        setMonitoringController(null);
      }
    })();
  }, [user, options, updateFromStatus, updateState, monitoringController]);

  // 進捗監視停止
  const stopMonitoring = useCallback(() => {
    if (monitoringController) {
      monitoringController.abort();
      setMonitoringController(null);
    }
  }, [monitoringController]);

  // 処理キャンセル
  const cancelProcessing = useCallback(async (audioId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const result = await apiClient.cancelProcessing(user.uid, audioId);
      
      if (result.success) {
        stopMonitoring();
        updateState({
          isProcessing: false,
          isCompleted: false,
          stage: 'キャンセル済み',
          message: '処理がキャンセルされました'
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Cancel failed:', error);
      return false;
    }
  }, [user, stopMonitoring, updateState]);

  // 監視一時停止
  const pauseMonitoring = useCallback(() => {
    updateState({ isPaused: true });
    stopMonitoring();
  }, [updateState, stopMonitoring]);

  // 監視再開
  const resumeMonitoring = useCallback(() => {
    updateState({ isPaused: false });
    if (currentAudioId) {
      startMonitoring(currentAudioId);
    }
  }, [updateState, currentAudioId, startMonitoring]);

  // 状態確認
  const checkStatus = useCallback(async (audioId: string): Promise<ProcessingStatus | null> => {
    if (!user) return null;

    try {
      const result = await apiClient.getProcessingStatus(user.uid, audioId);
      
      if (result.success && result.data) {
        updateFromStatus(result.data);
        return result.data;
      }
      
      return null;
    } catch (error) {
      console.error('Status check failed:', error);
      return null;
    }
  }, [user, updateFromStatus]);

  // バッチ状態確認
  const checkBatchStatus = useCallback(async (audioIds: string[]): Promise<ProcessingStatus[]> => {
    if (!user) return [];

    try {
      const result = await apiClient.getBatchProcessingStatus(user.uid, audioIds);
      return result.success ? result.data || [] : [];
    } catch (error) {
      console.error('Batch status check failed:', error);
      return [];
    }
  }, [user]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (monitoringController) {
        monitoringController.abort();
      }
    };
  }, [monitoringController]);

  return {
    state,
    startProcessing,
    cancelProcessing,
    pauseMonitoring,
    resumeMonitoring,
    startMonitoring,
    stopMonitoring,
    checkStatus,
    checkBatchStatus
  };
}