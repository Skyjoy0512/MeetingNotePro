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
    try {
      if (!file) {
        throw new Error('ファイルが選択されていません');
      }

      // ファイル検証
      const validation = validateAudioFile(file);
      
      if (!validation.valid) {
        const errorMsg = validation.error || '無効なファイルです';
        setUploadState(prev => ({ ...prev, error: errorMsg }));
        return null;
      }

      setUploadState({
        isUploading: true,
        progress: 0,
        error: null,
        uploadedFile: null
      });

      // デモモードの場合はシンプルなモックアップロード
      if (userId === 'demo-user-123') {
        // アップロード進捗をシミュレート
        for (let i = 0; i <= 100; i += 20) {
          setUploadState(prev => ({ ...prev, progress: i }));
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // デモ用のファイル情報を作成
        const demoFile: AudioFile = {
          id: `demo-upload-${Date.now()}`,
          userId: 'demo-user-123',
          fileName: file.name,
          fileUrl: `/demo/uploads/${file.name}`, // 安全なダミーURL
          duration: Math.floor(Math.random() * 3600) + 300, // 5分-1時間のランダム
          status: 'uploaded',
          createdAt: new Date(),
          updatedAt: new Date(),
          audioQuality: {
            snr: 25,
            noiseLevel: 0.1,
            volumeLevel: 0.8,
            format: file.name.split('.').pop() || 'unknown',
            sampleRate: 44100,
            channels: 2
          }
        };

        setUploadState({
          isUploading: false,
          progress: 100,
          error: null,
          uploadedFile: demoFile
        });

        return demoFile;
      }
      
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