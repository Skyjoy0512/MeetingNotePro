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
// import { useToast } from '@/hooks/use-toast';
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
  console.log('🚀 HomePage v4.0: FORCE CACHE CLEAR - ' + Date.now() + ' - BUILD:' + process.env.NODE_ENV);
  
  const { user, loading: authLoading } = useAuth();
  // const { toast } = useToast();
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);



  // データ読み込み処理
  useEffect(() => {
    let isMounted = true;
    
    const loadAudioFiles = async () => {
      // 認証中またはユーザーがいない場合はスキップ
      if (authLoading || !user?.uid) {
        console.log('🔄 HomePage: Skipping load - authLoading or no user', { authLoading, userId: user?.uid });
        return;
      }
      
      // すでにデータが読み込まれている場合はスキップ
      if (dataLoaded) {
        console.log('🔄 HomePage: Data already loaded, skipping');
        return;
      }
      
      try {
        console.log('📊 HomePage: Loading audio files for user:', user.uid);
        setLoading(true);
        
        const files = await databaseService.getAudioFiles(user.uid);
        
        if (!isMounted) return; // コンポーネントがアンマウントされている場合は処理を中止
        
        console.log('✅ HomePage: Loaded', files.length, 'audio files');
        
        // デモユーザーの場合はモックデータと組み合わせ
        if (user.uid === 'demo-user-123') {
          const allFiles = [...files, ...mockAudioFiles];
          setAudioFiles(allFiles);
        } else {
          setAudioFiles(files);
        }
        
        setDataLoaded(true);
        
      } catch (error) {
        if (!isMounted) return;
        
        console.error('❌ HomePage: Failed to load audio files:', error);
        console.error('Error: 音声ファイルの読み込みに失敗しました');
        // toast({
        //   title: 'エラー',
        //   description: '音声ファイルの読み込みに失敗しました',
        //   variant: 'destructive',
        // });
        
        // エラー時はモックデータを表示（デモユーザーの場合）
        if (user.uid === 'demo-user-123') {
          setAudioFiles(mockAudioFiles);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadAudioFiles();
    
    // クリーンアップ関数
    return () => {
      isMounted = false;
    };
  }, [authLoading, user?.uid, dataLoaded]);

  // プルダウンリフレッシュ
  const handleRefresh = useCallback(async () => {
    console.log('🔄 HomePage: Manual refresh triggered');
    
    if (!user?.uid) {
      console.log('🔄 HomePage: No user for refresh');
      return;
    }
    
    try {
      setRefreshing(true);
      setDataLoaded(false); // データを再読み込みできるようにリセット
      
      const files = await databaseService.getAudioFiles(user.uid);
      console.log('🔄 HomePage: Refresh loaded', files.length, 'files');
      
      if (user.uid === 'demo-user-123') {
        const allFiles = [...files, ...mockAudioFiles];
        setAudioFiles(allFiles);
      } else {
        setAudioFiles(files);
      }
      
      setDataLoaded(true);
      
    } catch (error) {
      console.error('❌ HomePage: Refresh failed:', error);
      console.error('Error: 音声ファイルの更新に失敗しました');
      // toast({
      //   title: 'エラー',
      //   description: '音声ファイルの更新に失敗しました',
      //   variant: 'destructive',
      // });
    } finally {
      setRefreshing(false);
    }
  }, [user?.uid]);

  // ファイル削除
  const handleDeleteFile = useCallback(async (audioId: string) => {
    console.log('🗑️ Delete file:', audioId);
    
    if (!user?.uid) {
      console.error('❌ No user for delete operation');
      return;
    }
    
    try {
      // 実際のデータベースから削除
      await databaseService.deleteAudioFile(user.uid, audioId);
      
      // UIから即座に削除
      setAudioFiles(prev => prev.filter(file => file.id !== audioId));
      
      console.log('✅ 削除完了: 音声ファイルを削除しました');
      // toast({
      //   title: '削除完了',
      //   description: '音声ファイルを削除しました',
      // });
    } catch (error) {
      console.error('❌ Delete failed:', error);
      console.error('Error: ファイルの削除に失敗しました');
      // toast({
      //   title: 'エラー',
      //   description: 'ファイルの削除に失敗しました',
      //   variant: 'destructive',
      // });
    }
  }, [user?.uid]);

  // ファイルアップロード成功時のコールバック
  const handleUploadSuccess = useCallback((file: AudioFile) => {
    console.log('📤 HomePage: Upload success:', file);
    
    // 即座にUIを更新
    setAudioFiles(prev => [file, ...prev]);
    setUploadDialogOpen(false);
    
    console.log(`✅ アップロード完了: ${file.fileName} のアップロードが完了しました`);
    // toast({
    //   title: 'アップロード完了',
    //   description: `${file.fileName} のアップロードが完了しました`,
    // });
    
    // バックグラウンドでリフレッシュ（UI更新は既に完了しているので、重複更新を避ける）
    setTimeout(() => {
      setDataLoaded(false);
    }, 1000);
    
  }, []);

  // 録音完了時のコールバック
  const handleRecordingComplete = useCallback((file: AudioFile) => {
    console.log('🎤 HomePage: Recording complete:', file);
    
    // 即座にUIを更新
    setAudioFiles(prev => [file, ...prev]);
    setRecordDialogOpen(false);
    
    console.log(`✅ 録音完了: ${file.fileName} の録音が完了しました`);
    // toast({
    //   title: '録音完了',
    //   description: `${file.fileName} の録音が完了しました`,
    // });
    
    // バックグラウンドでリフレッシュ
    setTimeout(() => {
      setDataLoaded(false);
    }, 1000);
    
  }, []);

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

  console.log('🏠 HomePage: Current state', {
    authLoading,
    user: user ? { uid: user.uid } : null,
    audioFilesCount: audioFiles.length,
    loading,
    dataLoaded
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <MobileHeader 
        title="VoiceNote" 
        showSettings={true}
        rightAction={null}
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