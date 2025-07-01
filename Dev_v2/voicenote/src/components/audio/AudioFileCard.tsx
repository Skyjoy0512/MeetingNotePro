'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AudioFile } from '@/types';
import { Play, Clock, Users, FileText, MessageSquare, Zap } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

interface AudioFileCardProps {
  audioFile: AudioFile;
  onPlay?: () => void;
  onViewTranscription?: () => void;
  onViewSummary?: () => void;
  onAskAI?: () => void;
  onStartProcessing?: () => void;
}

const getStatusColor = (status: AudioFile['status']) => {
  switch (status) {
    case 'completed':
      return 'bg-green-500';
    case 'error':
      return 'bg-red-500';
    case 'processing':
    case 'transcribing':
    case 'speaker_analysis':
    case 'chunk_processing':
    case 'integrating':
      return 'bg-blue-500';
    default:
      return 'bg-gray-500';
  }
};

const getStatusText = (status: AudioFile['status']) => {
  switch (status) {
    case 'uploaded':
      return 'アップロード済み';
    case 'preprocessing':
      return '前処理中';
    case 'speaker_analysis':
      return '話者分析中';
    case 'chunk_processing':
      return 'チャンク処理中';
    case 'transcribing':
      return '文字起こし中';
    case 'integrating':
      return '統合中';
    case 'completed':
      return '完了';
    case 'error':
      return 'エラー';
    default:
      return '不明';
  }
};

export const AudioFileCard = ({
  audioFile,
  onPlay,
  onViewTranscription,
  onViewSummary,
  onAskAI,
  onStartProcessing
}: AudioFileCardProps) => {
  const isProcessing = ['preprocessing', 'speaker_analysis', 'chunk_processing', 'transcribing', 'integrating'].includes(audioFile.status);
  const isCompleted = audioFile.status === 'completed';
  const hasError = audioFile.status === 'error';
  const isUploaded = audioFile.status === 'uploaded';

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-medium line-clamp-2">
            {audioFile.fileName}
          </CardTitle>
          <Badge 
            variant="secondary" 
            className={`${getStatusColor(audioFile.status)} text-white text-xs`}
          >
            {getStatusText(audioFile.status)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            {formatDuration(audioFile.duration)}
          </div>
          {audioFile.transcription && (
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              {audioFile.transcription.speakers.length}名
            </div>
          )}
        </div>

        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>処理進捗</span>
              <span>{audioFile.processingProgress || 0}%</span>
            </div>
            <Progress value={audioFile.processingProgress || 0} className="h-2" />
            {audioFile.totalChunks && audioFile.processedChunks && (
              <div className="text-xs text-muted-foreground">
                チャンク: {audioFile.processedChunks}/{audioFile.totalChunks}
              </div>
            )}
          </div>
        )}

        {isUploaded && (
          <Button
            onClick={onStartProcessing}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            <Zap className="h-4 w-4 mr-2" />
            文字起こし・要約を開始
          </Button>
        )}

        {isCompleted && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onPlay}
                className="flex items-center justify-center"
              >
                <Play className="h-4 w-4 mr-1" />
                再生
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onViewTranscription}
                className="flex items-center justify-center"
              >
                <FileText className="h-4 w-4 mr-1" />
                文字起こし
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onViewSummary}
                className="flex items-center justify-center"
              >
                <FileText className="h-4 w-4 mr-1" />
                要約
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onAskAI}
                className="flex items-center justify-center"
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Ask AI
              </Button>
            </div>
          </div>
        )}

        {hasError && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            処理中にエラーが発生しました
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          {new Date(audioFile.createdAt).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </CardContent>
    </Card>
  );
};