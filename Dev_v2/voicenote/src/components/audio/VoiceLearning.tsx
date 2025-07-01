'use client'

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Mic, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  User,
  Brain,
  TrendingUp
} from 'lucide-react';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { useAudioUpload } from '@/hooks/useAudioUpload';
import { useAuth } from '@/hooks/useAuth';
import { formatDuration } from '@/lib/utils';

interface VoiceLearningProps {
  onLearningComplete?: (learningId: string) => void;
  onError?: (error: string) => void;
}

interface LearningSession {
  id: string;
  audioUrl: string;
  duration: number;
  quality: number;
  status: 'processing' | 'completed' | 'failed';
  createdAt: Date;
}

export const VoiceLearning = ({ onLearningComplete, onError }: VoiceLearningProps) => {
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState<'record' | 'upload' | null>(null);
  const [learningSessions, setLearningSessions] = useState<LearningSession[]>([]);
  const [learningProgress, setLearningProgress] = useState(0);
  const [embeddingQuality, setEmbeddingQuality] = useState(0);
  
  const {
    isRecording,
    isPaused,
    duration,
    audioLevel,
    error: recordingError,
    recordedBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    createAudioFile,
    reset: resetRecording
  } = useAudioRecording();

  const {
    isUploading,
    progress: uploadProgress,
    error: uploadError,
    uploadFile,
    clearError: clearUploadError
  } = useAudioUpload(user?.uid || '');

  // 学習セッション開始
  const startLearningSession = useCallback((type: 'record' | 'upload') => {
    setCurrentSession(type);
    clearUploadError();
    resetRecording();
  }, [clearUploadError, resetRecording]);

  // 録音完了後の処理
  const handleRecordingComplete = useCallback(async () => {
    if (!recordedBlob) return;

    try {
      const audioFile = createAudioFile(`voice_learning_${Date.now()}.webm`);
      if (!audioFile) {
        throw new Error('録音データの作成に失敗しました');
      }

      // 学習音声として処理
      await processLearningAudio(audioFile);
      
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '録音処理中にエラーが発生しました');
    }
  }, [recordedBlob, createAudioFile, onError]);

  // ファイルアップロード完了後の処理
  const handleFileUpload = useCallback(async (file: File) => {
    try {
      await processLearningAudio(file);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'ファイル処理中にエラーが発生しました');
    }
  }, [onError]);

  // 学習音声の処理
  const processLearningAudio = useCallback(async (audioFile: File) => {
    try {
      // 音声品質チェック
      const quality = await analyzeAudioQuality(audioFile);
      
      if (quality < 0.6) {
        throw new Error('音質が低すぎます。ノイズの少ない環境で録音してください。');
      }

      // 学習セッション作成
      const session: LearningSession = {
        id: `session_${Date.now()}`,
        audioUrl: URL.createObjectURL(audioFile),
        duration: await getAudioDuration(audioFile),
        quality,
        status: 'processing',
        createdAt: new Date()
      };

      setLearningSessions(prev => [...prev, session]);

      // サーバーサイドで学習処理（実装予定）
      await submitLearningAudio(audioFile, session.id);

      // 学習完了
      setLearningSessions(prev => 
        prev.map(s => s.id === session.id ? { ...s, status: 'completed' } : s)
      );

      // 埋め込み品質更新
      await updateEmbeddingQuality();

      onLearningComplete?.(session.id);
      setCurrentSession(null);

    } catch (error) {
      console.error('Learning audio processing failed:', error);
      throw error;
    }
  }, [onLearningComplete]);

  // 音声品質分析（モック）
  const analyzeAudioQuality = useCallback(async (audioFile: File): Promise<number> => {
    // 実際の実装では音声解析ライブラリを使用
    return new Promise((resolve) => {
      setTimeout(() => {
        // ファイルサイズとデュレーションから簡易品質推定
        const sizeQuality = Math.min(1.0, audioFile.size / (1024 * 1024)); // 1MB以上で高品質
        const baseQuality = 0.7 + Math.random() * 0.25; // 0.7-0.95の範囲
        resolve(Math.min(0.95, sizeQuality * baseQuality));
      }, 1000);
    });
  }, []);

  // 音声長取得（モック）
  const getAudioDuration = useCallback(async (audioFile: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
      };
      audio.src = URL.createObjectURL(audioFile);
    });
  }, []);

  // 学習音声提出（モック）
  const submitLearningAudio = useCallback(async (audioFile: File, sessionId: string) => {
    // 実際の実装ではAPI呼び出し
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setLearningProgress(prev => Math.min(100, prev + 20));
        resolve();
      }, 2000);
    });
  }, []);

  // 埋め込み品質更新（モック）
  const updateEmbeddingQuality = useCallback(async () => {
    const totalSessions = learningSessions.filter(s => s.status === 'completed').length + 1;
    const avgQuality = learningSessions.reduce((sum, s) => sum + s.quality, 0) / totalSessions;
    setEmbeddingQuality(avgQuality * 100);
  }, [learningSessions]);

  return (
    <div className="space-y-6">
      {/* 学習状況概要 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            音声学習状況
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{learningSessions.length}</div>
              <div className="text-sm text-gray-500">学習セッション</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{Math.round(learningProgress)}%</div>
              <div className="text-sm text-gray-500">学習進捗</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{Math.round(embeddingQuality)}%</div>
              <div className="text-sm text-gray-500">認識精度</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>音声学習進捗</span>
              <span>{Math.round(learningProgress)}%</span>
            </div>
            <Progress value={learningProgress} className="h-2" />
            <div className="text-xs text-gray-500">
              推奨: 5-10分の学習音声で高精度な話者識別が可能になります
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 学習セッション開始 */}
      {!currentSession && (
        <Card>
          <CardHeader>
            <CardTitle>新しい学習セッション</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={() => startLearningSession('record')}
                className="h-20 flex-col gap-2"
              >
                <Mic className="h-6 w-6" />
                音声を録音
              </Button>
              <Button 
                onClick={() => startLearningSession('upload')}
                variant="outline"
                className="h-20 flex-col gap-2"
              >
                <Upload className="h-6 w-6" />
                ファイルアップロード
              </Button>
            </div>
            
            <div className="text-sm text-gray-600 space-y-1">
              <div>• 静かな環境で明瞭に話してください</div>
              <div>• 異なる話し方や感情で録音すると精度が向上します</div>
              <div>• 1回の学習は2-5分程度が最適です</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 録音セッション */}
      {currentSession === 'record' && (
        <Card>
          <CardHeader>
            <CardTitle>音声録音学習</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 録音状態表示 */}
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center w-20 h-20 mb-4">
                <div 
                  className={`absolute inset-0 rounded-full transition-all duration-100 ${
                    isRecording && !isPaused ? 'bg-red-500 animate-pulse' : 'bg-gray-300'
                  }`}
                  style={{ 
                    transform: `scale(${1 + (audioLevel / 500)})`,
                    opacity: isRecording && !isPaused ? 0.6 : 1
                  }}
                />
                <div className="relative z-10 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <Mic className={`h-6 w-6 ${isRecording ? 'text-red-500' : 'text-gray-400'}`} />
                </div>
              </div>

              <div className="text-xl font-mono font-bold mb-2">
                {formatDuration(duration)}
              </div>

              <div className="text-sm text-gray-500">
                {!isRecording && '録音開始ボタンを押してください'}
                {isRecording && !isPaused && '録音中... 明瞭に話してください'}
                {isRecording && isPaused && '一時停止中'}
                {!isRecording && recordedBlob && '録音完了'}
              </div>
            </div>

            {/* 音声レベル */}
            {isRecording && !isPaused && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>音声レベル</span>
                  <span>{Math.round(audioLevel)}%</span>
                </div>
                <Progress value={audioLevel} className="h-1" />
              </div>
            )}

            {/* 操作ボタン */}
            <div className="flex gap-2 justify-center">
              {!isRecording && !recordedBlob && (
                <Button onClick={startRecording}>
                  <Mic className="h-4 w-4 mr-2" />
                  録音開始
                </Button>
              )}

              {isRecording && (
                <>
                  <Button onClick={isPaused ? resumeRecording : pauseRecording} variant="outline">
                    {isPaused ? '再開' : '一時停止'}
                  </Button>
                  <Button onClick={stopRecording} variant="destructive">
                    停止
                  </Button>
                </>
              )}

              {!isRecording && recordedBlob && (
                <>
                  <Button onClick={resetRecording} variant="outline">
                    やり直し
                  </Button>
                  <Button onClick={handleRecordingComplete}>
                    学習に使用
                  </Button>
                </>
              )}
            </div>

            {/* キャンセル */}
            <div className="text-center">
              <Button 
                variant="ghost" 
                onClick={() => setCurrentSession(null)}
                size="sm"
              >
                キャンセル
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* アップロードセッション */}
      {currentSession === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>音声ファイル学習</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-4" />
              <div className="space-y-2">
                <div className="text-lg font-medium">学習用音声ファイルを選択</div>
                <div className="text-sm text-gray-500">
                  MP3, WAV, M4A形式対応 • 推奨: 2-5分の明瞭な音声
                </div>
              </div>
              
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
                id="learning-audio-upload"
              />
              <Label htmlFor="learning-audio-upload" className="cursor-pointer">
                <Button className="mt-4">ファイル選択</Button>
              </Label>
            </div>

            <div className="text-center">
              <Button 
                variant="ghost" 
                onClick={() => setCurrentSession(null)}
                size="sm"
              >
                キャンセル
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 学習履歴 */}
      {learningSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              学習履歴
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {learningSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {session.status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : session.status === 'processing' ? (
                      <Clock className="h-4 w-4 text-blue-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    
                    <div>
                      <div className="text-sm font-medium">
                        学習セッション {session.id.split('_')[1]}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDuration(session.duration)} • 品質: {Math.round(session.quality * 100)}%
                      </div>
                    </div>
                  </div>

                  <Badge variant={
                    session.status === 'completed' ? 'secondary' :
                    session.status === 'processing' ? 'default' : 'destructive'
                  }>
                    {session.status === 'completed' ? '完了' :
                     session.status === 'processing' ? '処理中' : '失敗'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* エラー表示 */}
      {(recordingError || uploadError) && (
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {recordingError || uploadError}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};