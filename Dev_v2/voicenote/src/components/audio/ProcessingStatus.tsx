'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Pause, 
  Play, 
  Square,
  Clock,
  Users,
  FileAudio
} from 'lucide-react';
import { useAudioProcessing, AudioProcessingState } from '@/hooks/useAudioProcessing';
import { cn } from '@/lib/utils';

interface ProcessingStatusProps {
  audioId: string;
  autoStart?: boolean;
  showDetails?: boolean;
  onComplete?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export default function ProcessingStatus({
  audioId,
  autoStart = true,
  showDetails = true,
  onComplete,
  onError,
  className
}: ProcessingStatusProps) {
  const {
    state,
    startProcessing,
    cancelProcessing,
    pauseMonitoring,
    resumeMonitoring,
    startMonitoring
  } = useAudioProcessing({
    autoStartMonitoring: autoStart,
    onComplete,
    onError
  });

  // ステータスアイコン
  const getStatusIcon = (state: AudioProcessingState) => {
    if (state.isError) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    if (state.isCompleted) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (state.isProcessing) {
      return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
    }
    return <Clock className="h-5 w-5 text-gray-400" />;
  };

  // ステータスバッジ
  const getStatusBadge = (state: AudioProcessingState) => {
    if (state.isError) {
      return <Badge variant="destructive">エラー</Badge>;
    }
    if (state.isCompleted) {
      return <Badge variant="default" className="bg-green-500">完了</Badge>;
    }
    if (state.isProcessing) {
      return <Badge variant="default" className="bg-blue-500">処理中</Badge>;
    }
    if (state.isPaused) {
      return <Badge variant="secondary">一時停止</Badge>;
    }
    return <Badge variant="outline">待機中</Badge>;
  };

  // 処理開始ハンドラー
  const handleStart = async () => {
    await startProcessing(audioId, {
      enableSpeakerSeparation: true,
      maxSpeakers: 5,
      useUserEmbedding: true,
      language: 'ja'
    });
  };

  // キャンセルハンドラー
  const handleCancel = async () => {
    await cancelProcessing(audioId);
  };

  // 一時停止/再開ハンドラー
  const handlePauseResume = () => {
    if (state.isPaused) {
      resumeMonitoring();
    } else {
      pauseMonitoring();
    }
  };

  // 経過時間計算
  const getElapsedTime = () => {
    if (!state.processingStartedAt) return '';
    
    const elapsed = Date.now() - state.processingStartedAt.getTime();
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // 残り時間推定
  const getEstimatedTimeRemaining = () => {
    if (!state.estimatedTimeRemaining) return '';
    
    const minutes = Math.floor(state.estimatedTimeRemaining / 60);
    const seconds = state.estimatedTimeRemaining % 60;
    
    if (minutes > 0) {
      return `約${minutes}分${seconds > 0 ? `${seconds}秒` : ''}`;
    }
    return `約${seconds}秒`;
  };

  // チャンク進捗表示
  const getChunkProgress = () => {
    if (!state.totalChunks || !state.currentChunk) return null;
    
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <FileAudio className="h-4 w-4" />
        <span>チャンク {state.currentChunk} / {state.totalChunks}</span>
      </div>
    );
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(state)}
            <span>音声処理状況</span>
          </div>
          {getStatusBadge(state)}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 進捗バー */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{state.stage}</span>
            <span>{state.progress}%</span>
          </div>
          <Progress 
            value={state.progress} 
            className={cn(
              "h-2",
              state.isError && "bg-red-100",
              state.isCompleted && "bg-green-100"
            )}
          />
        </div>

        {/* メッセージ */}
        {state.message && (
          <p className="text-sm text-gray-600">{state.message}</p>
        )}

        {/* エラーメッセージ */}
        {state.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{state.error}</p>
          </div>
        )}

        {/* 詳細情報 */}
        {showDetails && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            {/* 経過時間 */}
            {state.processingStartedAt && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>経過時間: {getElapsedTime()}</span>
              </div>
            )}

            {/* 残り時間 */}
            {state.estimatedTimeRemaining && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>残り時間: {getEstimatedTimeRemaining()}</span>
              </div>
            )}

            {/* チャンク進捗 */}
            {getChunkProgress()}

            {/* 最終更新時間 */}
            {state.lastUpdated && (
              <div className="text-xs text-gray-500 col-span-2">
                最終更新: {state.lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        )}

        {/* 操作ボタン */}
        <div className="flex gap-2 pt-2">
          {!state.isProcessing && !state.isCompleted && !state.isError && (
            <Button onClick={handleStart} size="sm">
              <Play className="h-4 w-4 mr-2" />
              処理開始
            </Button>
          )}

          {state.isProcessing && (
            <>
              <Button 
                onClick={handlePauseResume} 
                variant="outline" 
                size="sm"
              >
                {state.isPaused ? (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    再開
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    一時停止
                  </>
                )}
              </Button>

              <Button 
                onClick={handleCancel} 
                variant="destructive" 
                size="sm"
              >
                <Square className="h-4 w-4 mr-2" />
                キャンセル
              </Button>
            </>
          )}

          {(state.isCompleted || state.isError) && (
            <Button 
              onClick={() => startMonitoring(audioId)} 
              variant="outline" 
              size="sm"
            >
              <Loader2 className="h-4 w-4 mr-2" />
              状況確認
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}