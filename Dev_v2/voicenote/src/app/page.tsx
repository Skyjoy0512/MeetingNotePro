'use client'

import { useState, useEffect, useCallback } from 'react';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { BottomNavigation } from '@/components/navigation/BottomNavigation';
import { AudioFileListItem } from '@/components/audio/AudioFileListItem';
import { AudioUpload } from '@/components/audio/AudioUpload';
import { AudioRecording } from '@/components/audio/AudioRecording';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, Mic, Plus } from 'lucide-react';
import { AudioFile } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { databaseService } from '@/services/database';
import { DebugPanel } from '@/components/debug/DebugPanel';

// モックデータ（後でFirestoreから取得）
const mockAudioFiles: AudioFile[] = [
  {
    id: '1',
    userId: 'user1',
    fileName: '会議録音_2024-06-30.mp3',
    fileUrl: '/audio/meeting1.mp3',
    duration: 1800, // 30分
    status: 'completed',
    createdAt: new Date('2024-06-30T10:00:00'),
    updatedAt: new Date('2024-06-30T10:30:00'),
    transcription: {
      text: 'これはサンプル文字起こし結果です...',
      segments: [],
      speakers: ['あなた', 'Aさん', 'Bさん'],
      language: 'ja',
      confidence: 0.95,
      processingTime: 300,
      apiProvider: 'openai',
      model: 'whisper-1'
    },
    summary: {
      overall: '会議の要約です...',
      speakerSummaries: {},
      keyPoints: [],
      actionItems: [],
      topics: [],
      apiProvider: 'openai',
      model: 'gpt-4',
      generatedAt: new Date()
    }
  },
  {
    id: '2',
    userId: 'user1',
    fileName: 'インタビュー音声_2024-06-29.wav',
    fileUrl: '/audio/interview1.wav',
    duration: 2400, // 40分
    status: 'processing',
    createdAt: new Date('2024-06-29T14:00:00'),
    updatedAt: new Date('2024-06-29T14:15:00'),
    totalChunks: 4,
    processedChunks: 2,
    processingProgress: 50
  }
];

export default function HomePage() {
  console.log('🏠 Home: Component initialized');
  
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);


  // 実際のFirestoreからデータを取得する関数
  const loadAudioFiles = useCallback(async (isRefresh = false) => {
    console.log('🔄 loadAudioFiles called', { userUid: user?.uid, isRefresh, mounted });
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    // 常にデモデータを使用（シンプル化）
    console.log('🎭 Setting demo data');
    setAudioFiles(mockAudioFiles);
    
    // 短い遅延でローディング状態を解除
    setTimeout(() => {
      setLoading(false);
      setRefreshing(false);
    }, 100);
  }, [user?.uid]);

  // マウント時の初期化
  useEffect(() => {
    setMounted(true);
    console.log('🏠 Home: Component mounted, loading initial data');
    loadAudioFiles();
  }, []);

  // プルダウンリフレッシュ
  const handleRefresh = useCallback(() => {
    console.log('🔄 Refresh triggered');
    loadAudioFiles(true);
  }, [loadAudioFiles]);

  // ファイル削除
  const handleDeleteFile = useCallback(async (audioId: string) => {
    console.log('🗑️ Delete file:', audioId);
    
    try {
      // デモモードでは配列から削除するだけ
      setAudioFiles(prev => prev.filter(file => file.id !== audioId));
      
      toast({
        title: '削除完了',
        description: '音声ファイルを削除しました',
      });
    } catch (error) {
      console.error('❌ Delete failed:', error);
      toast({
        title: 'エラー',
        description: 'ファイルの削除に失敗しました',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // ファイルアップロード成功時のコールバック
  const handleUploadSuccess = useCallback((file: AudioFile) => {
    console.log('📤 Upload success:', file);
    setAudioFiles(prev => [file, ...prev]);
    setUploadDialogOpen(false);
    toast({
      title: 'アップロード完了',
      description: `${file.fileName} のアップロードが完了しました`,
    });
  }, [toast]);

  // 録音完了時のコールバック
  const handleRecordingComplete = useCallback((file: AudioFile) => {
    console.log('🎤 Recording complete:', file);
    setAudioFiles(prev => [file, ...prev]);
    setRecordDialogOpen(false);
    toast({
      title: '録音完了',
      description: `${file.fileName} の録音が完了しました`,
    });
  }, [toast]);

  const handleFileClick = (file: AudioFile) => {
    console.log('📁 File clicked:', {
      id: file.id,
      fileName: file.fileName,
      status: file.status,
      userId: file.userId
    });
    
    // 実際のIDを使ってナビゲーション
    const navigateId = file.id;
    console.log('🔄 Navigating to audio detail with ID:', navigateId);
    
    // URLを構築
    const url = `/audio-detail?id=${encodeURIComponent(navigateId)}`;
    console.log('🔄 Navigation URL:', url);
    
    // ナビゲーション実行
    window.location.href = url;
  };

  console.log('🏠 Home: Current state', {
    authLoading,
    user: user ? { uid: user.uid } : null,
    audioFilesCount: audioFiles.length,
    loading,
    mounted
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <MobileHeader 
        title="VoiceNote" 
        showSettings={true}
        rightAction={
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <Upload className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Upload className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>音声ファイルをアップロード</DialogTitle>
                </DialogHeader>
                <AudioUpload 
                  onUploadSuccess={handleUploadSuccess}
                  onClose={() => setUploadDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Mic className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>音声を録音</DialogTitle>
                </DialogHeader>
                <AudioRecording 
                  onRecordingComplete={handleRecordingComplete}
                  onClose={() => setRecordDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        }
      />
      
      <main className="pt-14 px-4 pb-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-500">音声ファイルを読み込み中...</p>
            </div>
          </div>
        ) : audioFiles.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm border p-8">
              <Mic className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">音声ファイルがありません</h3>
              <p className="text-gray-500 mb-6">
                音声ファイルをアップロードするか、新しく録音を開始してください
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => setUploadDialogOpen(true)} className="flex items-center">
                  <Upload className="h-4 w-4 mr-2" />
                  ファイルをアップロード
                </Button>
                <Button onClick={() => setRecordDialogOpen(true)} variant="outline" className="flex items-center">
                  <Mic className="h-4 w-4 mr-2" />
                  録音を開始
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ファイル一覧 */}
            <div className="grid gap-3">
              {audioFiles.map((file) => (
                <AudioFileListItem 
                  key={file.id} 
                  audioFile={file}
                  onDelete={handleDeleteFile}
                />
              ))}
            </div>

            {/* 新規作成ボタン */}
            <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors">
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center text-center">
                  <Plus className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-600 font-medium mb-4">新しい音声を追加</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={() => setUploadDialogOpen(true)} size="sm" className="flex items-center">
                      <Upload className="h-4 w-4 mr-2" />
                      アップロード
                    </Button>
                    <Button onClick={() => setRecordDialogOpen(true)} variant="outline" size="sm" className="flex items-center">
                      <Mic className="h-4 w-4 mr-2" />
                      録音
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* デバッグパネル（開発モードでのみ表示） */}
        {process.env.NODE_ENV === 'development' && (
          <DebugPanel 
            user={user}
            audioFiles={audioFiles}
            loading={loading}
          />
        )}
      </main>
      
      <BottomNavigation />
    </div>
  );
}