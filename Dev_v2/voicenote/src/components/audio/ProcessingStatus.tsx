'use client'

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Waveform, 
  Users, 
  FileText, 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  X,
  Clock,
  Cpu
} from 'lucide-react';
import { AudioFile } from '@/types';
import { databaseService } from '@/services/database';
import { audioProcessingService } from '@/services/audioProcessing';

interface ProcessingStatusProps {
  userId: string;
  audioId: string;
  audioFile?: AudioFile;
  onProcessingComplete?: (audioFile: AudioFile) => void;
  onCancel?: () => void;
}

export const ProcessingStatus = ({
  userId,
  audioId,
  audioFile: initialAudioFile,
  onProcessingComplete,
  onCancel
}: ProcessingStatusProps) => {
  const [audioFile, setAudioFile] = useState<AudioFile | null>(initialAudioFile || null);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  // リアルタイム更新の監視
  useEffect(() => {
    if (!userId || !audioId || !isMonitoring) return;

    let intervalId: NodeJS.Timeout;

    const monitorProgress = async () => {
      try {
        const updatedFile = await databaseService.getAudioFile(userId, audioId);
        if (updatedFile) {
          setAudioFile(updatedFile);
          setLastUpdated(new Date());

          // 処理完了またはエラー時は監視を停止
          if (updatedFile.status === 'completed' || updatedFile.status === 'error') {
            setIsMonitoring(false);
            if (updatedFile.status === 'completed' && onProcessingComplete) {
              onProcessingComplete(updatedFile);
            }
          }
        }
      } catch (err) {
        console.error('Failed to monitor processing progress:', err);
        setError('処理状況の監視に失敗しました');
      }
    };

    // 初回実行
    monitorProgress();

    // 5秒間隔で更新
    intervalId = setInterval(monitorProgress, 5000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [userId, audioId, isMonitoring, onProcessingComplete]);

  // 処理キャンセル
  const handleCancel = async () => {
    try {
      await audioProcessingService.cancelProcessing(userId, audioId);
      setIsMonitoring(false);
      onCancel?.();
    } catch (err) {
      console.error('Failed to cancel processing:', err);
      setError('処理のキャンセルに失敗しました');
    }
  };

  if (!audioFile) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-gray-500">処理状況を読み込み中...</p>
        </CardContent>
      </Card>
    );
  }

  const getStageInfo = (status: AudioFile['status']) => {
    const stages = {
      'uploaded': { 
        icon: CheckCircle, 
        label: 'アップロード完了', 
        description: '音声ファイルのアップロードが完了しました',
        color: 'bg-green-100 text-green-800'
      },
      'preprocessing': { 
        icon: Waveform, 
        label: '音声前処理', 
        description: 'ノイズ除去と音量正規化を実行中',
        color: 'bg-blue-100 text-blue-800'
      },
      'speaker_analysis': { 
        icon: Users, 
        label: '話者分析', 
        description: 'グローバル話者分離とクラスタリングを実行中',
        color: 'bg-purple-100 text-purple-800'
      },
      'chunk_processing': { 
        icon: Cpu, 
        label: 'チャンク処理', 
        description: '長時間音声を分割してバッチ処理中',
        color: 'bg-yellow-100 text-yellow-800'
      },
      'transcribing': { 
        icon: FileText, 
        label: '文字起こし', 
        description: '音声認識APIで文字起こしを実行中',
        color: 'bg-orange-100 text-orange-800'
      },
      'integrating': { 
        icon: Brain, 
        label: 'AI要約生成', 
        description: 'AIによる要約とキーポイント抽出を実行中',
        color: 'bg-indigo-100 text-indigo-800'
      },
      'completed': { 
        icon: CheckCircle, 
        label: '処理完了', 
        description: 'すべての処理が正常に完了しました',
        color: 'bg-green-100 text-green-800'
      },
      'error': { 
        icon: AlertCircle, 
        label: '処理エラー', 
        description: '処理中にエラーが発生しました',
        color: 'bg-red-100 text-red-800'
      }
    };

    return stages[status] || stages['uploaded'];
  };

  const currentStage = getStageInfo(audioFile.status);
  const progress = audioFile.processingProgress || 0;
  const isProcessing = !['completed', 'error'].includes(audioFile.status);
  const showChunkProgress = audioFile.totalChunks && audioFile.totalChunks > 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <currentStage.icon className="h-6 w-6 text-gray-600" />
            <div>
              <CardTitle className="text-lg">{audioFile.fileName}</CardTitle>
              <CardDescription>
                音声処理 • {Math.round((audioFile.duration || 0) / 60)}分
              </CardDescription>
            </div>
          </div>
          <Badge className={currentStage.color}>
            {currentStage.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 処理ステータス */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              処理進捗
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-gray-600 mt-2">
            {currentStage.description}
          </p>
        </div>

        {/* チャンク処理進捗 */}
        {showChunkProgress && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                チャンク処理
              </span>
              <span className="text-sm text-gray-500">
                {audioFile.processedChunks || 0} / {audioFile.totalChunks}
              </span>
            </div>
            <Progress 
              value={((audioFile.processedChunks || 0) / (audioFile.totalChunks || 1)) * 100} 
              className="h-1.5" 
            />
            <p className="text-xs text-gray-500 mt-1">
              長時間音声を30分チャンクに分割して並列処理中
            </p>
          </div>
        )}

        {/* 処理時間情報 */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>最終更新: {lastUpdated.toLocaleTimeString()}</span>
          </div>
          {audioFile.createdAt && (
            <div className="flex items-center gap-1">
              <span>開始: {new Date(audioFile.createdAt).toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* エラー表示 */}
        {(error || audioFile.status === 'error') && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700">処理エラー</p>
                <p className="text-sm text-red-600 mt-1">
                  {error || 'API設定が不完全です。設定ページで音声認識APIとLLM APIの設定を完了してください。'}
                </p>
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.location.href = '/settings/api'}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    API設定ページへ
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-xs text-gray-500">
            {isProcessing ? (
              <span>処理中は画面を閉じても処理は継続されます</span>
            ) : (
              <span>処理が完了しました</span>
            )}
          </div>

          <div className="flex gap-2">
            {isProcessing && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4 mr-1" />
                キャンセル
              </Button>
            )}
            
            {!isProcessing && audioFile.status === 'completed' && (
              <Button
                size="sm"
                onClick={() => onProcessingComplete?.(audioFile)}
              >
                結果を表示
              </Button>
            )}
            
            {!isProcessing && audioFile.status === 'error' && (
              <Button
                size="sm"
                onClick={() => onProcessingComplete?.(audioFile)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                再試行
              </Button>
            )}
          </div>
        </div>

        {/* 長時間処理の場合の推定時間 */}
        {isProcessing && audioFile.duration && audioFile.duration > 3600 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="text-blue-700 font-medium">長時間音声処理</p>
                <p className="text-blue-600 text-xs">
                  {Math.round(audioFile.duration / 3600)}時間の音声は約{Math.round(audioFile.duration / 3600 * 2)}〜{Math.round(audioFile.duration / 3600 * 3)}時間で処理完了予定です
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};