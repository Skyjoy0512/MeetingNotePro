'use client'

import { useState, useCallback } from 'react';
import { storageService } from '@/services/storage';
import { databaseService } from '@/services/database';
import { validateAudioFile } from '@/lib/utils';
import { AudioFile } from '@/types';

export interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  uploadedFile: AudioFile | null;
}

export const useAudioUpload = (userId: string) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    uploadedFile: null
  });

  const uploadFile = useCallback(async (file: File): Promise<AudioFile | null> => {
    console.log('📋 Starting upload for file:', file.name, 'Size:', file.size, 'Type:', file.type);
    console.log('👤 User ID:', userId);
    
    // ファイル検証
    const validation = validateAudioFile(file);
    console.log('🔍 File validation result:', validation);
    
    if (!validation.valid) {
      const errorMsg = validation.error || '無効なファイルです';
      console.error('❌ File validation failed:', errorMsg);
      setUploadState(prev => ({ ...prev, error: errorMsg }));
      return null;
    }

    setUploadState({
      isUploading: true,
      progress: 0,
      error: null,
      uploadedFile: null
    });

    try {
      console.log('💾 Creating audio file record in database...');
      
      // 音声ファイル情報をDBに先に作成
      const audioId = await databaseService.createAudioFile(userId, {
        fileName: file.name,
        fileUrl: '', // 後で更新
        duration: 0, // 音声処理時に更新
        status: 'uploaded',
        audioQuality: {
          snr: 0,
          noiseLevel: 0,
          volumeLevel: 0,
          format: file.name.split('.').pop() || 'unknown',
          sampleRate: 0,
          channels: 0
        }
      });
      
      console.log('✅ Audio file record created with ID:', audioId);

      // ストレージにアップロード
      const fileUrl = await storageService.uploadAudioFile(
        userId,
        audioId,
        file,
        {
          onProgress: (progress) => {
            setUploadState(prev => ({ ...prev, progress: progress.progress }));
          },
          metadata: {
            originalSize: file.size.toString(),
            uploadStartTime: new Date().toISOString()
          }
        }
      );

      // DBのfileUrlを更新
      await databaseService.updateAudioFile(userId, audioId, {
        fileUrl,
        status: 'uploaded'
      });

      // 完成したファイル情報を取得
      const uploadedFile = await databaseService.getAudioFile(userId, audioId);

      setUploadState({
        isUploading: false,
        progress: 100,
        error: null,
        uploadedFile
      });

      return uploadedFile;
    } catch (error) {
      console.error('Upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'アップロードに失敗しました';
      
      setUploadState({
        isUploading: false,
        progress: 0,
        error: errorMessage,
        uploadedFile: null
      });

      return null;
    }
  }, [userId]);

  const clearError = useCallback(() => {
    setUploadState(prev => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null,
      uploadedFile: null
    });
  }, []);

  return {
    ...uploadState,
    uploadFile,
    clearError,
    reset
  };
};