'use client'

import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AudioFile } from '@/types';

export interface ProcessingStage {
  stage: 'preprocessing' | 'speaker_analysis' | 'chunk_processing' | 'transcribing' | 'integrating';
  progress: number;
  message?: string;
  currentChunk?: number;
  totalChunks?: number;
  estimatedTimeRemaining?: number;
}

export interface ProcessingProgressState {
  isProcessing: boolean;
  currentStage: ProcessingStage | null;
  audioFile: AudioFile | null;
  error: string | null;
  stages: ProcessingStage[];
  overallProgress: number;
}

export const useProcessingProgress = (userId: string, audioId: string) => {
  const [state, setState] = useState<ProcessingProgressState>({
    isProcessing: false,
    currentStage: null,
    audioFile: null,
    error: null,
    stages: [],
    overallProgress: 0
  });

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Firestoreリアルタイム監視
  useEffect(() => {
    if (!userId || !audioId) return;

    const audioDocRef = doc(db, 'audios', userId, 'files', audioId);
    
    const unsubscribe = onSnapshot(audioDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        const audioFile = {
          ...data,
          id: audioId,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as AudioFile;

        // 処理開始時刻の記録
        if (audioFile.status !== 'completed' && audioFile.status !== 'error' && !startTimeRef.current) {
          startTimeRef.current = Date.now();
        }

        // 進捗情報の更新
        const currentStage = createStageFromAudioFile(audioFile);
        const overallProgress = calculateOverallProgress(audioFile);
        const estimatedTimeRemaining = calculateEstimatedTime(audioFile, startTimeRef.current);

        setState(prev => {
          const newStages = updateStageHistory(prev.stages, currentStage);
          
          return {
            isProcessing: isProcessingStatus(audioFile.status),
            currentStage: currentStage ? { ...currentStage, estimatedTimeRemaining } : null,
            audioFile,
            error: audioFile.status === 'error' ? 'Processing failed' : null,
            stages: newStages,
            overallProgress
          };
        });

        // 完了時の処理
        if (audioFile.status === 'completed' || audioFile.status === 'error') {
          startTimeRef.current = null;
        }
      }
    }, (error) => {
      console.error('Processing progress subscription error:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to monitor processing progress',
        isProcessing: false
      }));
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [userId, audioId]);

  // 処理開始
  const startProcessing = useCallback(async (processingConfig?: any) => {
    if (!userId || !audioId) return;

    try {
      setState(prev => ({ ...prev, error: null }));
      
      // Cloud Functions呼び出し（実装予定）
      const response = await fetch('/api/start-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          audioId,
          config: processingConfig
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start processing');
      }

      startTimeRef.current = Date.now();
      
    } catch (error) {
      console.error('Failed to start processing:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to start processing',
        isProcessing: false
      }));
    }
  }, [userId, audioId]);

  // 処理キャンセル
  const cancelProcessing = useCallback(async () => {
    if (!userId || !audioId) return;

    try {
      const response = await fetch('/api/cancel-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          audioId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to cancel processing');
      }

      startTimeRef.current = null;
      
    } catch (error) {
      console.error('Failed to cancel processing:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to cancel processing'
      }));
    }
  }, [userId, audioId]);

  // エラークリア
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // 進捗手動更新
  const refreshProgress = useCallback(async () => {
    // Firestoreは自動更新されるため、ここでは追加のアクションは不要
    // 必要に応じてサーバーサイドの状態確認API呼び出し
  }, []);

  return {
    ...state,
    startProcessing,
    cancelProcessing,
    clearError,
    refreshProgress
  };
};

// ユーティリティ関数
function createStageFromAudioFile(audioFile: AudioFile): ProcessingStage | null {
  const status = audioFile.status;
  const progress = audioFile.processingProgress || 0;
  const message = (audioFile as any).statusMessage || '';

  const stageMap: Record<string, ProcessingStage['stage']> = {
    'preprocessing': 'preprocessing',
    'speaker_analysis': 'speaker_analysis',
    'chunk_processing': 'chunk_processing',
    'transcribing': 'transcribing',
    'integrating': 'integrating'
  };

  const stage = stageMap[status];
  if (!stage) return null;

  return {
    stage,
    progress,
    message,
    currentChunk: audioFile.processedChunks,
    totalChunks: audioFile.totalChunks
  };
}

function calculateOverallProgress(audioFile: AudioFile): number {
  const status = audioFile.status;
  const progress = audioFile.processingProgress || 0;

  // ステージごとの重み
  const stageWeights = {
    'uploaded': 0,
    'preprocessing': 20,
    'speaker_analysis': 40, 
    'chunk_processing': 60,
    'transcribing': 85,
    'integrating': 95,
    'completed': 100,
    'error': 0
  };

  const baseProgress = stageWeights[status as keyof typeof stageWeights] || 0;
  
  // 現在ステージ内での進捗を加算
  if (status === 'completed') {
    return 100;
  } else if (status === 'error') {
    return 0;
  } else {
    // ステージ内進捗を全体進捗に反映
    const stageWeight = 20; // 各ステージの重み
    const stageProgress = (progress / 100) * stageWeight;
    return Math.min(95, baseProgress + stageProgress);
  }
}

function calculateEstimatedTime(audioFile: AudioFile, startTime: number | null): number | undefined {
  if (!startTime || audioFile.status === 'completed' || audioFile.status === 'error') {
    return undefined;
  }

  const elapsed = (Date.now() - startTime) / 1000; // 秒
  const progress = calculateOverallProgress(audioFile);
  
  if (progress <= 5) {
    // 初期段階では推定できない
    return undefined;
  }

  const estimatedTotal = elapsed / (progress / 100);
  const remaining = estimatedTotal - elapsed;
  
  return Math.max(0, remaining);
}

function updateStageHistory(stages: ProcessingStage[], newStage: ProcessingStage | null): ProcessingStage[] {
  if (!newStage) return stages;

  const existingIndex = stages.findIndex(s => s.stage === newStage.stage);
  
  if (existingIndex >= 0) {
    // 既存ステージの更新
    const updated = [...stages];
    updated[existingIndex] = newStage;
    return updated;
  } else {
    // 新しいステージの追加
    return [...stages, newStage];
  }
}

function isProcessingStatus(status: string): boolean {
  const processingStatuses = [
    'preprocessing',
    'speaker_analysis', 
    'chunk_processing',
    'transcribing',
    'integrating'
  ];
  
  return processingStatuses.includes(status);
}

// ステージ名の日本語化
export function getStageDisplayName(stage: ProcessingStage['stage']): string {
  const stageNames = {
    'preprocessing': '音声前処理',
    'speaker_analysis': '話者分析',
    'chunk_processing': 'チャンク処理',
    'transcribing': '文字起こし',
    'integrating': '統合処理'
  };
  
  return stageNames[stage] || stage;
}

// 推定時間のフォーマット
export function formatEstimatedTime(seconds: number): string {
  if (seconds < 60) {
    return `約${Math.round(seconds)}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.round(seconds / 60);
    return `約${minutes}分`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `約${hours}時間${minutes > 0 ? minutes + '分' : ''}`;
  }
}