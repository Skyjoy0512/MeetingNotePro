'use client'

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Users, 
  FileText, 
  Zap, 
  AlertCircle, 
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { 
  useProcessingProgress, 
  getStageDisplayName, 
  formatEstimatedTime,
  ProcessingStage 
} from '@/hooks/useProcessingProgress';
import { useAuth } from '@/hooks/useAuth';

interface ProcessingProgressProps {
  audioId: string;
  onProcessingComplete?: () => void;
  onProcessingError?: (error: string) => void;
  showDetailedProgress?: boolean;
}

export const ProcessingProgress = ({ 
  audioId, 
  onProcessingComplete, 
  onProcessingError,
  showDetailedProgress = true 
}: ProcessingProgressProps) => {
  const { user } = useAuth();
  const [showDetails, setShowDetails] = useState(false);
  
  const {
    isProcessing,
    currentStage,
    audioFile,
    error,
    stages,
    overallProgress,
    startProcessing,
    cancelProcessing,
    clearError,
    refreshProgress
  } = useProcessingProgress(user?.uid || '', audioId);

  // 処理完了・エラー時のコールバック
  useEffect(() => {
    if (audioFile?.status === 'completed' && onProcessingComplete) {
      onProcessingComplete();
    }
    
    if (error && onProcessingError) {
      onProcessingError(error);
    }
  }, [audioFile?.status, error, onProcessingComplete, onProcessingError]);

  // ステージアイコンの取得
  const getStageIcon = (stage: ProcessingStage['stage'], isActive: boolean, isCompleted: boolean) => {
    const iconProps = { 
      className: `h-4 w-4 ${isActive ? 'text-blue-500' : isCompleted ? 'text-green-500' : 'text-gray-400'}` 
    };

    switch (stage) {
      case 'preprocessing':
        return <Zap {...iconProps} />;
      case 'speaker_analysis':
        return <Users {...iconProps} />;
      case 'chunk_processing':
        return <RefreshCw {...iconProps} />;
      case 'transcribing':
        return <FileText {...iconProps} />;
      case 'integrating':
        return <CheckCircle2 {...iconProps} />;
      default:
        return <Clock {...iconProps} />;
    }
  };

  // ステージの状態判定
  const getStageStatus = (stage: ProcessingStage['stage']) => {
    if (!currentStage) return 'pending';
    
    const stageOrder = ['preprocessing', 'speaker_analysis', 'chunk_processing', 'transcribing', 'integrating'];
    const currentIndex = stageOrder.indexOf(currentStage.stage);
    const stageIndex = stageOrder.indexOf(stage);
    
    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'active';
    return 'pending';
  };

  if (!isProcessing && !audioFile) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-gray-500">音声ファイル情報を読み込み中...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            ) : audioFile?.status === 'completed' ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : audioFile?.status === 'error' ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : (
              <Clock className="h-5 w-5 text-gray-400" />
            )}
            音声処理進捗
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Badge variant={isProcessing ? "default" : audioFile?.status === 'completed' ? "secondary" : "destructive"}>
              {isProcessing ? '処理中' : audioFile?.status === 'completed' ? '完了' : 'エラー'}
            </Badge>
            
            {showDetailedProgress && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? '簡易表示' : '詳細表示'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 全体進捗 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">全体進捗</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>

        {/* 現在のステージ情報 */}
        {currentStage && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {getStageIcon(currentStage.stage, true, false)}
              <span className="font-medium">{getStageDisplayName(currentStage.stage)}</span>
              {currentStage.estimatedTimeRemaining && (
                <span className="text-sm text-gray-500">
                  残り{formatEstimatedTime(currentStage.estimatedTimeRemaining)}
                </span>
              )}
            </div>
            
            {currentStage.message && (
              <div className="text-sm text-gray-600 pl-6">
                {currentStage.message}
              </div>
            )}

            {/* チャンク処理進捗 */}
            {currentStage.stage === 'chunk_processing' && currentStage.totalChunks && (
              <div className="pl-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>チャンク進捗</span>
                  <span>{currentStage.currentChunk || 0} / {currentStage.totalChunks}</span>
                </div>
                <Progress 
                  value={((currentStage.currentChunk || 0) / currentStage.totalChunks) * 100} 
                  className="h-2" 
                />
              </div>
            )}

            {/* ステージ内進捗 */}
            <div className="pl-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span>ステージ進捗</span>
                <span>{Math.round(currentStage.progress)}%</span>
              </div>
              <Progress value={currentStage.progress} className="h-2" />
            </div>
          </div>
        )}

        {/* 詳細進捗表示 */}
        {showDetails && showDetailedProgress && (
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-medium text-sm">処理ステージ</h4>
            <div className="space-y-2">
              {['preprocessing', 'speaker_analysis', 'chunk_processing', 'transcribing', 'integrating'].map((stage) => {
                const status = getStageStatus(stage as ProcessingStage['stage']);
                const stageData = stages.find(s => s.stage === stage);
                
                return (
                  <div key={stage} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                    {getStageIcon(
                      stage as ProcessingStage['stage'], 
                      status === 'active', 
                      status === 'completed'
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${
                          status === 'active' ? 'text-blue-700' : 
                          status === 'completed' ? 'text-green-700' : 
                          'text-gray-500'
                        }`}>
                          {getStageDisplayName(stage as ProcessingStage['stage'])}
                        </span>
                        
                        {stageData && (
                          <span className="text-xs text-gray-500">
                            {Math.round(stageData.progress)}%
                          </span>
                        )}
                      </div>
                      
                      {stageData?.message && status === 'active' && (
                        <div className="text-xs text-gray-600 mt-1">
                          {stageData.message}
                        </div>
                      )}
                    </div>

                    {status === 'completed' && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-red-800">
                処理エラーが発生しました
              </div>
              <div className="text-sm text-red-600 mt-1">
                {error}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={clearError}>
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* 音声ファイル情報 */}
        {audioFile && (
          <div className="border-t pt-4">
            <h4 className="font-medium text-sm mb-3">ファイル情報</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">ファイル名:</span>
                <div className="font-medium truncate">{audioFile.fileName}</div>
              </div>
              <div>
                <span className="text-gray-500">音声長:</span>
                <div className="font-medium">{formatEstimatedTime(audioFile.duration)}</div>
              </div>
              
              {audioFile.totalChunks && (
                <div>
                  <span className="text-gray-500">チャンク数:</span>
                  <div className="font-medium">{audioFile.totalChunks}</div>
                </div>
              )}
              
              {audioFile.transcription?.speakers && (
                <div>
                  <span className="text-gray-500">検出話者数:</span>
                  <div className="font-medium">{audioFile.transcription.speakers.length}名</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex gap-2 pt-4 border-t">
          {isProcessing && (
            <Button variant="outline" onClick={cancelProcessing} size="sm">
              処理をキャンセル
            </Button>
          )}
          
          <Button variant="ghost" onClick={refreshProgress} size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            更新
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};