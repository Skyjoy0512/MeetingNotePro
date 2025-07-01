'use client'

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Clock, 
  Users, 
  FileText, 
  MessageSquare,
  Download,
  Settings,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { databaseService } from '@/services/database';
import { AudioFile } from '@/types';
import { formatDuration, formatFileSize } from '@/lib/utils';
import { AskAI } from '@/components/audio/AskAI';

export default function AudioDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('transcript');
  
  const audioId = searchParams?.get('id');

  useEffect(() => {
    if (!audioId || !user?.uid) {
      setError('音声ファイルが見つかりません');
      setLoading(false);
      return;
    }

    loadAudioFile();
  }, [audioId, user?.uid]);

  const loadAudioFile = async () => {
    if (!audioId || !user?.uid) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Loading audio file:', audioId);
      const file = await databaseService.getAudioFile(user.uid, audioId);
      
      if (!file) {
        setError('音声ファイルが見つかりません');
        return;
      }
      
      console.log('✅ Audio file loaded:', file);
      setAudioFile(file);
    } catch (err) {
      console.error('❌ Failed to load audio file:', err);
      setError('音声ファイルの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

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
    const statusMap = {
      'uploaded': 'アップロード済み',
      'preprocessing': '前処理中',
      'speaker_analysis': '話者分析中',
      'chunk_processing': 'チャンク処理中',
      'transcribing': '文字起こし中',
      'integrating': '統合中',
      'completed': '完了',
      'error': 'エラー'
    };
    return statusMap[status] || '不明';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <div>音声ファイルを読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error || !audioFile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <div className="text-lg font-medium">エラーが発生しました</div>
          <div className="text-gray-600">{error}</div>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
        </div>
      </div>
    );
  }

  const isProcessingComplete = audioFile.status === 'completed';
  const hasTranscription = audioFile.transcription;
  const hasSummary = audioFile.summary;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={handleBack} className="p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="text-lg font-semibold truncate mx-4 flex-1">
              {audioFile.fileName}
            </div>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* ファイル情報カード */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                ファイル情報
              </CardTitle>
              <Badge className={getStatusColor(audioFile.status)}>
                {getStatusText(audioFile.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>再生時間: {formatDuration(audioFile.duration)}</span>
                </div>
                {hasTranscription && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>話者数: {audioFile.transcription!.speakers.length}名</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div>作成日: {audioFile.createdAt.toLocaleDateString('ja-JP')}</div>
                <div>更新日: {audioFile.updatedAt.toLocaleDateString('ja-JP')}</div>
              </div>
            </div>

            {/* 処理中の場合は進捗表示 */}
            {!isProcessingComplete && audioFile.processingProgress !== undefined && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>処理進捗</span>
                  <span>{Math.round(audioFile.processingProgress)}%</span>
                </div>
                <Progress value={audioFile.processingProgress} className="h-2" />
                {audioFile.totalChunks && audioFile.processedChunks !== undefined && (
                  <div className="text-xs text-gray-500">
                    チャンク処理: {audioFile.processedChunks}/{audioFile.totalChunks}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* メインコンテンツタブ */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transcript" disabled={!hasTranscription}>
              文字起こし
            </TabsTrigger>
            <TabsTrigger value="summary" disabled={!hasSummary}>
              要約
            </TabsTrigger>
            <TabsTrigger value="askai" disabled={!isProcessingComplete}>
              Ask AI
            </TabsTrigger>
          </TabsList>

          {/* 文字起こしタブ */}
          <TabsContent value="transcript" className="space-y-4">
            {hasTranscription ? (
              <Card>
                <CardHeader>
                  <CardTitle>文字起こし結果</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96 w-full">
                    <div className="space-y-4">
                      {audioFile.transcription!.segments?.map((segment, index) => (
                        <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{segment.speaker}</Badge>
                            <span className="text-sm text-gray-500">
                              {formatDuration(segment.start)} - {formatDuration(segment.end)}
                            </span>
                          </div>
                          <div className="text-gray-900">{segment.text}</div>
                        </div>
                      )) || (
                        <div className="text-center py-8">
                          <div className="text-gray-500">
                            セグメント情報がありません
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <div className="text-gray-500">
                    {audioFile.status === 'completed' 
                      ? '文字起こし結果がありません' 
                      : '文字起こし処理中です'}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 要約タブ */}
          <TabsContent value="summary" className="space-y-4">
            {hasSummary ? (
              <div className="space-y-4">
                {/* 全体要約 */}
                <Card>
                  <CardHeader>
                    <CardTitle>全体要約</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-wrap">{audioFile.summary!.overall}</div>
                  </CardContent>
                </Card>

                {/* 重要ポイント */}
                {audioFile.summary!.keyPoints && audioFile.summary!.keyPoints.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>重要ポイント</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {audioFile.summary!.keyPoints.map((point, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-blue-500 font-bold">{index + 1}.</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* アクションアイテム */}
                {audioFile.summary!.actionItems && audioFile.summary!.actionItems.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>アクションアイテム</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {audioFile.summary!.actionItems.map((item, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-green-500 font-bold">□</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <div className="text-gray-500">
                    {audioFile.status === 'completed' 
                      ? '要約結果がありません' 
                      : '要約生成中です'}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Ask AI タブ */}
          <TabsContent value="askai">
            <AskAI audioFile={audioFile} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}