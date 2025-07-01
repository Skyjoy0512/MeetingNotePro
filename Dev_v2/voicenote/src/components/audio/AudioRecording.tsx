'use client'

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  RotateCcw, 
  Upload,
  AlertCircle 
} from 'lucide-react';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { useAudioUpload } from '@/hooks/useAudioUpload';
import { useAuth } from '@/hooks/useAuth';
import { formatDuration } from '@/lib/utils';

interface AudioRecordingProps {
  onRecordingComplete?: (audioId: string) => void;
  onError?: (error: string) => void;
}

export const AudioRecording = ({ onRecordingComplete, onError }: AudioRecordingProps) => {
  const { user } = useAuth();
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
    reset,
    clearError
  } = useAudioRecording();

  const {
    isUploading,
    progress: uploadProgress,
    error: uploadError,
    uploadFile,
    clearError: clearUploadError
  } = useAudioUpload(user?.uid || '');

  const handleStartRecording = useCallback(async () => {
    clearError();
    clearUploadError();
    await startRecording();
  }, [startRecording, clearError, clearUploadError]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handlePauseResume = useCallback(() => {
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  }, [isPaused, resumeRecording, pauseRecording]);

  const handleUploadRecording = useCallback(async () => {
    console.log('🎵 Starting upload process...');
    console.log('📊 Recorded blob:', recordedBlob);
    console.log('👤 User:', user);
    
    const audioFile = createAudioFile(`recording_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.webm`);
    console.log('📁 Created audio file:', audioFile);
    
    if (!audioFile) {
      const errorMsg = '録音データが見つかりません';
      console.error('❌', errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (!user) {
      const errorMsg = 'ユーザーがログインしていません';
      console.error('❌', errorMsg);
      onError?.(errorMsg);
      return;
    }

    console.log('🚀 Starting file upload...');
    const result = await uploadFile(audioFile);
    console.log('📤 Upload result:', result);
    
    if (result) {
      console.log('✅ Upload successful, audio ID:', result.id);
      onRecordingComplete?.(result.id);
      reset();
    } else {
      const errorMsg = uploadError || 'アップロードに失敗しました';
      console.error('❌ Upload failed:', errorMsg);
      onError?.(errorMsg);
    }
  }, [createAudioFile, uploadFile, uploadError, onRecordingComplete, onError, reset, recordedBlob, user]);

  const handleReset = useCallback(() => {
    reset();
    clearUploadError();
  }, [reset, clearUploadError]);

  const currentError = recordingError || uploadError;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          音声録音
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 録音状態表示 */}
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center w-24 h-24 mb-4">
            {/* 音声レベルの可視化 */}
            <div 
              className={`
                absolute inset-0 rounded-full transition-all duration-100
                ${isRecording && !isPaused 
                  ? 'bg-red-500 animate-pulse' 
                  : 'bg-gray-300'
                }
              `}
              style={{ 
                transform: `scale(${1 + (audioLevel / 500)})`,
                opacity: isRecording && !isPaused ? 0.6 : 1
              }}
            />
            <div className="relative z-10 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
              <Mic className={`h-8 w-8 ${isRecording ? 'text-red-500' : 'text-gray-400'}`} />
            </div>
          </div>

          {/* 録音時間 */}
          <div className="text-2xl font-mono font-bold text-gray-900 mb-2">
            {formatDuration(duration)}
          </div>

          {/* 状態表示 */}
          <div className="text-sm text-gray-500">
            {!isRecording && !recordedBlob && '録音開始ボタンを押してください'}
            {isRecording && !isPaused && '録音中...'}
            {isRecording && isPaused && '一時停止中'}
            {!isRecording && recordedBlob && '録音完了'}
            {isUploading && 'アップロード中...'}
          </div>
        </div>

        {/* 音声レベルバー */}
        {(isRecording && !isPaused) && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>音声レベル</span>
              <span>{Math.round(audioLevel)}%</span>
            </div>
            <Progress value={audioLevel} className="h-2" />
          </div>
        )}

        {/* アップロード進捗 */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>アップロード進捗</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* エラー表示 */}
        {currentError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700">{currentError}</span>
          </div>
        )}

        {/* 操作ボタン */}
        <div className="flex gap-2 justify-center">
          {!isRecording && !recordedBlob && !isUploading && (
            <Button onClick={handleStartRecording} size="lg">
              <Mic className="h-4 w-4 mr-2" />
              録音開始
            </Button>
          )}

          {isRecording && (
            <>
              <Button 
                onClick={handlePauseResume} 
                variant="outline"
                size="lg"
              >
                {isPaused ? (
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
                onClick={handleStopRecording} 
                variant="destructive"
                size="lg"
              >
                <Square className="h-4 w-4 mr-2" />
                停止
              </Button>
            </>
          )}

          {!isRecording && recordedBlob && !isUploading && (
            <>
              <Button onClick={handleReset} variant="outline" size="lg">
                <RotateCcw className="h-4 w-4 mr-2" />
                やり直し
              </Button>
              
              <Button onClick={handleUploadRecording} size="lg">
                <Upload className="h-4 w-4 mr-2" />
                アップロード
              </Button>
            </>
          )}
        </div>

        {/* 録音の説明 */}
        <div className="text-xs text-gray-500 text-center space-y-1">
          <div>高品質な録音のために静かな環境での録音をお勧めします</div>
          <div>録音時間に制限はありません（最大8時間まで処理可能）</div>
        </div>
      </CardContent>
    </Card>
  );
};