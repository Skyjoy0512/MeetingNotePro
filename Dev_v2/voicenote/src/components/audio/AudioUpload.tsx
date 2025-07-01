'use client'

import { useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useAudioUpload } from '@/hooks/useAudioUpload';
import { useAuth } from '@/hooks/useAuth';
import { formatFileSize } from '@/lib/utils';
import { AudioFile } from '@/types';

interface AudioUploadProps {
  onUploadSuccess?: (file: AudioFile) => void;
  onClose?: () => void;
}

export const AudioUpload = ({ onUploadSuccess, onClose }: AudioUploadProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    isUploading,
    progress,
    error,
    uploadedFile,
    uploadFile,
    clearError,
    reset
  } = useAudioUpload(user?.uid || '');

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const result = await uploadFile(file);
      if (result) {
        onUploadSuccess?.(result);
        onClose?.();
      }
    } catch (error) {
      console.error('File select error:', error);
    } finally {
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [uploadFile, onUploadSuccess, onClose]);

  const handleUploadClick = useCallback(() => {
    if (isUploading) return;
    fileInputRef.current?.click();
  }, [isUploading]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const files = Array.from(event.dataTransfer.files);
    const audioFile = files.find(file => file.type.startsWith('audio/'));
    
    if (audioFile) {
      const result = await uploadFile(audioFile);
      if (result) {
        onUploadComplete?.(result.id);
      } else if (error) {
        onUploadError?.(error);
      }
    }
  }, [uploadFile, error, onUploadComplete, onUploadError]);

  const handleReset = useCallback(() => {
    reset();
    clearError();
  }, [reset, clearError]);

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isUploading ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${error ? 'border-red-300 bg-red-50' : ''}
            ${uploadedFile ? 'border-green-300 bg-green-50' : ''}
          `}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!isUploading && !uploadedFile && !error && (
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <Upload className="h-6 w-6 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  音声ファイルをアップロード
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  ファイルをドラッグ&ドロップするか、クリックしてファイルを選択
                </p>
                <Button onClick={handleUploadClick}>
                  ファイルを選択
                </Button>
              </div>
              <div className="text-xs text-gray-400">
                対応形式: MP3, WAV, M4A, AAC, OGG<br />
                最大ファイルサイズ: 5GB • 最大音声長: 8時間
              </div>
            </div>
          )}

          {isUploading && (
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <File className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  アップロード中...
                </h3>
                <div className="max-w-xs mx-auto">
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>進捗</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {uploadedFile && (
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  アップロード完了
                </h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="font-medium">{uploadedFile.fileName}</div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(0)} • {uploadedFile.audioQuality?.format?.toUpperCase()}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleReset}
                  className="mt-3"
                >
                  別のファイルをアップロード
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-red-900 mb-2">
                  アップロードエラー
                </h3>
                <p className="text-sm text-red-600 mb-4">
                  {error}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleReset}
                  >
                    <X className="h-4 w-4 mr-1" />
                    リセット
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleUploadClick}
                  >
                    再試行
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {!isUploading && !uploadedFile && (
          <div className="mt-4 text-center">
            <div className="text-xs text-gray-500">
              最大処理時間: 8時間音声の場合約16-24時間<br />
              処理中は画面を閉じても処理は継続されます
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};