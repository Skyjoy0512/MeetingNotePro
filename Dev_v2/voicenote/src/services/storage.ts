import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  UploadTask,
  UploadTaskSnapshot
} from 'firebase/storage';
import { storage } from '@/lib/firebase';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  onError?: (error: Error) => void;
  onComplete?: (downloadURL: string) => void;
  metadata?: Record<string, string>;
}

export class StorageService {
  private static instance: StorageService;

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // 音声ファイルのアップロード
  async uploadAudioFile(
    userId: string,
    audioId: string,
    file: File,
    options?: UploadOptions
  ): Promise<string> {
    const fileName = `${Date.now()}_${file.name}`;
    const audioRef = ref(storage, `audios/${userId}/${audioId}/${fileName}`);
    
    const metadata = {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        fileSize: file.size.toString(),
        duration: '0', // 音声処理時に更新
        ...options?.metadata
      }
    };

    try {
      if (options?.onProgress) {
        // 進捗付きアップロード
        const uploadTask = uploadBytesResumable(audioRef, file, metadata);
        
        return new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot: UploadTaskSnapshot) => {
              const progress = {
                bytesTransferred: snapshot.bytesTransferred,
                totalBytes: snapshot.totalBytes,
                progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              };
              options.onProgress?.(progress);
            },
            (error) => {
              console.error('Upload error:', error);
              options.onError?.(error);
              reject(error);
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                options.onComplete?.(downloadURL);
                resolve(downloadURL);
              } catch (error) {
                reject(error);
              }
            }
          );
        });
      } else {
        // シンプルアップロード
        const snapshot = await uploadBytes(audioRef, file, metadata);
        return await getDownloadURL(snapshot.ref);
      }
    } catch (error) {
      console.error('Failed to upload audio file:', error);
      throw error;
    }
  }

  // 学習音声のアップロード
  async uploadLearningAudio(
    userId: string,
    learningId: string,
    file: File,
    options?: UploadOptions
  ): Promise<string> {
    const fileName = `${Date.now()}_${file.name}`;
    const learningRef = ref(storage, `learning-audios/${userId}/${learningId}/${fileName}`);
    
    const metadata = {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        fileSize: file.size.toString(),
        ...options?.metadata
      }
    };

    try {
      const snapshot = await uploadBytes(learningRef, file, metadata);
      return await getDownloadURL(snapshot.ref);
    } catch (error) {
      console.error('Failed to upload learning audio:', error);
      throw error;
    }
  }

  // 処理済み音声の保存
  async saveProcessedAudio(
    userId: string,
    audioId: string,
    audioBlob: Blob,
    fileName: string
  ): Promise<string> {
    const processedRef = ref(storage, `audios/${userId}/${audioId}/processed_${fileName}`);
    
    const metadata = {
      contentType: 'audio/wav',
      customMetadata: {
        processedAt: new Date().toISOString(),
        fileSize: audioBlob.size.toString(),
        type: 'processed'
      }
    };

    try {
      const snapshot = await uploadBytes(processedRef, audioBlob, metadata);
      return await getDownloadURL(snapshot.ref);
    } catch (error) {
      console.error('Failed to save processed audio:', error);
      throw error;
    }
  }

  // チャンクファイルの保存
  async saveChunk(
    userId: string,
    audioId: string,
    chunkId: string,
    chunkBlob: Blob
  ): Promise<string> {
    const chunkRef = ref(storage, `chunks/${userId}/${audioId}/${chunkId}.wav`);
    
    const metadata = {
      contentType: 'audio/wav',
      customMetadata: {
        createdAt: new Date().toISOString(),
        fileSize: chunkBlob.size.toString(),
        type: 'chunk'
      }
    };

    try {
      const snapshot = await uploadBytes(chunkRef, chunkBlob, metadata);
      return await getDownloadURL(snapshot.ref);
    } catch (error) {
      console.error('Failed to save chunk:', error);
      throw error;
    }
  }

  // ファイルのダウンロードURL取得
  async getDownloadURL(filePath: string): Promise<string> {
    try {
      const fileRef = ref(storage, filePath);
      return await getDownloadURL(fileRef);
    } catch (error) {
      console.error('Failed to get download URL:', error);
      throw error;
    }
  }

  // ファイル削除
  async deleteFile(filePath: string): Promise<void> {
    try {
      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  // 音声ファイル関連のすべてのファイルを削除
  async deleteAudioFiles(userId: string, audioId: string): Promise<void> {
    try {
      const audioFolderRef = ref(storage, `audios/${userId}/${audioId}/`);
      const chunkFolderRef = ref(storage, `chunks/${userId}/${audioId}/`);
      
      // メインフォルダ内のファイルを削除
      const audioList = await listAll(audioFolderRef);
      const audioDeletePromises = audioList.items.map(item => deleteObject(item));
      
      // チャンクフォルダ内のファイルを削除
      const chunkList = await listAll(chunkFolderRef);
      const chunkDeletePromises = chunkList.items.map(item => deleteObject(item));
      
      await Promise.all([...audioDeletePromises, ...chunkDeletePromises]);
    } catch (error) {
      console.error('Failed to delete audio files:', error);
      throw error;
    }
  }

  // 学習音声削除
  async deleteLearningAudio(userId: string, learningId: string): Promise<void> {
    try {
      const learningFolderRef = ref(storage, `learning-audios/${userId}/${learningId}/`);
      const fileList = await listAll(learningFolderRef);
      const deletePromises = fileList.items.map(item => deleteObject(item));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Failed to delete learning audio:', error);
      throw error;
    }
  }

  // ファイルのメタデータ取得
  async getFileMetadata(filePath: string): Promise<any> {
    try {
      const fileRef = ref(storage, filePath);
      return await getMetadata(fileRef);
    } catch (error) {
      console.error('Failed to get file metadata:', error);
      throw error;
    }
  }

  // ユーザーのストレージ使用量計算
  async calculateStorageUsage(userId: string): Promise<{
    totalSize: number;
    audioFiles: number;
    learningFiles: number;
    chunkFiles: number;
  }> {
    try {
      const audioFolderRef = ref(storage, `audios/${userId}/`);
      const learningFolderRef = ref(storage, `learning-audios/${userId}/`);
      const chunkFolderRef = ref(storage, `chunks/${userId}/`);
      
      const [audioList, learningList, chunkList] = await Promise.all([
        listAll(audioFolderRef),
        listAll(learningFolderRef),
        listAll(chunkFolderRef)
      ]);
      
      let totalSize = 0;
      
      // 各ファイルのサイズを取得
      const metadataPromises = [
        ...audioList.items.map(item => getMetadata(item)),
        ...learningList.items.map(item => getMetadata(item)),
        ...chunkList.items.map(item => getMetadata(item))
      ];
      
      const metadataList = await Promise.all(metadataPromises);
      totalSize = metadataList.reduce((sum, metadata) => sum + metadata.size, 0);
      
      return {
        totalSize,
        audioFiles: audioList.items.length,
        learningFiles: learningList.items.length,
        chunkFiles: chunkList.items.length
      };
    } catch (error) {
      console.error('Failed to calculate storage usage:', error);
      return {
        totalSize: 0,
        audioFiles: 0,
        learningFiles: 0,
        chunkFiles: 0
      };
    }
  }

  // 古いファイルのクリーンアップ（30日経過）
  async cleanupOldFiles(userId: string, daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    try {
      const audioFolderRef = ref(storage, `audios/${userId}/`);
      const audioList = await listAll(audioFolderRef);
      
      const deletePromises = audioList.items.map(async (item) => {
        const metadata = await getMetadata(item);
        const uploadDate = new Date(metadata.timeCreated);
        
        if (uploadDate < cutoffDate) {
          console.log(`Deleting old file: ${item.fullPath}`);
          return deleteObject(item);
        }
      });
      
      await Promise.all(deletePromises.filter(Boolean));
    } catch (error) {
      console.error('Failed to cleanup old files:', error);
      throw error;
    }
  }
}

export const storageService = StorageService.getInstance();