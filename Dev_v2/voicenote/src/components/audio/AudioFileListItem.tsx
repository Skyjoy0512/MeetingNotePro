'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { AudioFile } from '@/types';
import { Clock, Users, ChevronRight, Trash2 } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface AudioFileListItemProps {
  audioFile: AudioFile;
  onDelete?: (audioId: string) => void;
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

export const AudioFileListItem = ({
  audioFile,
  onDelete
}: AudioFileListItemProps) => {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const isProcessing = ['preprocessing', 'speaker_analysis', 'chunk_processing', 'transcribing', 'integrating'].includes(audioFile.status);
  const hasError = audioFile.status === 'error';

  const handleItemClick = () => {
    console.log('🔄 Audio file clicked:', audioFile.id);
    console.log('🔄 File name:', audioFile.fileName);
    console.log('🔄 File status:', audioFile.status);
    
    // 安全なIDを使用（特殊文字チェック）
    const safeId = audioFile.id;
    console.log('🔄 ID analysis:', {
      originalId: safeId,
      hasSpecialChars: /[^a-zA-Z0-9_-]/.test(safeId),
      length: safeId.length
    });
    
    // URLエンコーディングを適用
    const encodedId = encodeURIComponent(safeId);
    const targetUrl = `/audio-detail?id=${encodedId}`;
    
    console.log('🔄 Navigation details:', {
      originalId: safeId,
      encodedId: encodedId,
      targetUrl: targetUrl
    });
    
    try {
      // 全ての状態で詳細ページに遷移
      router.push(targetUrl);
      console.log('✅ Navigation initiated');
    } catch (error) {
      console.error('❌ Navigation failed:', error);
      // フォールバック：直接URLを変更
      window.location.href = targetUrl;
    }
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // カード全体のクリックイベントを停止
    
    if (!onDelete) return;
    
    const confirmed = window.confirm(`「${audioFile.fileName}」を削除しますか？\nこの操作は元に戻せません。`);
    if (!confirmed) return;
    
    setDeleting(true);
    try {
      await onDelete(audioFile.id);
    } catch (error) {
      console.error('削除に失敗しました:', error);
      alert('削除に失敗しました。もう一度お試しください。');
    } finally {
      setDeleting(false);
    }
  };


  return (
    <Card className="mb-3 cursor-pointer" onClick={handleItemClick}>
      <CardContent className="p-4">
        <div>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate text-sm">
                {audioFile.fileName}
              </h3>
              <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDuration(audioFile.duration)}
                </div>
                {audioFile.transcription && audioFile.transcription.speakers && Array.isArray(audioFile.transcription.speakers) && audioFile.transcription.speakers.length > 0 && (
                  <div className="flex items-center">
                    <Users className="h-3 w-3 mr-1" />
                    {audioFile.transcription.speakers.length}名
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge 
                variant="secondary" 
                className={`${getStatusColor(audioFile.status)} text-white text-xs`}
              >
                {getStatusText(audioFile.status)}
              </Badge>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                  onClick={handleDeleteClick}
                  disabled={deleting}
                  title="ファイルを削除"
                >
                  <Trash2 className={`h-4 w-4 ${deleting ? 'animate-spin' : ''}`} />
                </Button>
              )}
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          </div>

          {isProcessing && (
            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-xs text-gray-500">
                <span>処理進捗</span>
                <span>{audioFile.processingProgress || 0}%</span>
              </div>
              <Progress value={audioFile.processingProgress || 0} className="h-1.5" />
              {audioFile.totalChunks && audioFile.processedChunks && (
                <div className="text-xs text-gray-500">
                  チャンク: {audioFile.processedChunks}/{audioFile.totalChunks}
                </div>
              )}
            </div>
          )}


          {hasError && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded mt-2">
              処理中にエラーが発生しました（クリックして詳細表示・再試行）
            </div>
          )}

          <div className="text-xs text-gray-400 mt-2">
            {new Date(audioFile.createdAt).toLocaleDateString('ja-JP', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};