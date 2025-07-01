/**
 * ローカルストレージサービス
 * Firebase Storage の代替として使用
 */

export interface LocalAudioFile {
  id: string;
  name: string;
  size: number;
  type: string;
  data: string; // Base64エンコードされた音声データ
  uploadedAt: Date;
  userId: string;
}

export class LocalStorageService {
  private static instance: LocalStorageService;
  private storageKey = 'voicenote-audio-files';

  static getInstance(): LocalStorageService {
    if (!LocalStorageService.instance) {
      LocalStorageService.instance = new LocalStorageService();
    }
    return LocalStorageService.instance;
  }

  // 音声ファイル保存
  async saveAudioFile(
    userId: string,
    fileId: string,
    file: File
  ): Promise<string> {
    try {
      // ファイルをBase64に変換
      const base64Data = await this.fileToBase64(file);
      
      const audioFile: LocalAudioFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        data: base64Data,
        uploadedAt: new Date(),
        userId
      };

      // 既存ファイル一覧取得
      const existingFiles = this.getStoredFiles();
      existingFiles.push(audioFile);

      // localStorage に保存
      localStorage.setItem(this.storageKey, JSON.stringify(existingFiles));

      console.log(`Audio file saved locally: ${fileId}`);
      return `local://${fileId}`;
    } catch (error) {
      console.error('Failed to save audio file locally:', error);
      throw error;
    }
  }

  // 音声ファイル取得
  async getAudioFile(userId: string, fileId: string): Promise<LocalAudioFile | null> {
    try {
      const files = this.getStoredFiles();
      const file = files.find(f => f.id === fileId && f.userId === userId);
      return file || null;
    } catch (error) {
      console.error('Failed to get audio file:', error);
      return null;
    }
  }

  // 音声ファイル削除
  async deleteAudioFile(userId: string, fileId: string): Promise<void> {
    try {
      const files = this.getStoredFiles();
      const filteredFiles = files.filter(f => !(f.id === fileId && f.userId === userId));
      
      localStorage.setItem(this.storageKey, JSON.stringify(filteredFiles));
      console.log(`Audio file deleted locally: ${fileId}`);
    } catch (error) {
      console.error('Failed to delete audio file:', error);
      throw error;
    }
  }

  // ユーザーの全ファイル取得
  async getUserAudioFiles(userId: string): Promise<LocalAudioFile[]> {
    try {
      const files = this.getStoredFiles();
      return files.filter(f => f.userId === userId);
    } catch (error) {
      console.error('Failed to get user audio files:', error);
      return [];
    }
  }

  // ファイルサイズ制限チェック
  checkStorageQuota(): { used: number; available: number; percentage: number } {
    try {
      const files = this.getStoredFiles();
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      
      // 仮想的な制限（実際のlocalStorageの制限は5-10MB程度）
      const maxSize = 100 * 1024 * 1024; // 100MB
      
      return {
        used: totalSize,
        available: maxSize - totalSize,
        percentage: (totalSize / maxSize) * 100
      };
    } catch (error) {
      console.error('Failed to check storage quota:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  // 古いファイルの自動削除
  async cleanupOldFiles(daysOld: number = 30): Promise<number> {
    try {
      const files = this.getStoredFiles();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const validFiles = files.filter(file => 
        new Date(file.uploadedAt) > cutoffDate
      );

      const deletedCount = files.length - validFiles.length;
      
      if (deletedCount > 0) {
        localStorage.setItem(this.storageKey, JSON.stringify(validFiles));
        console.log(`Cleaned up ${deletedCount} old audio files`);
      }

      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup old files:', error);
      return 0;
    }
  }

  // プライベートメソッド
  private getStoredFiles(): LocalAudioFile[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to parse stored files:', error);
      return [];
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  // Base64からBlobに変換
  base64ToBlob(base64Data: string): Blob {
    const [header, data] = base64Data.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'audio/wav';
    
    const byteCharacters = atob(data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  // ストレージ統計
  getStorageStats(): {
    totalFiles: number;
    totalSize: number;
    oldestFile?: Date;
    newestFile?: Date;
  } {
    const files = this.getStoredFiles();
    
    if (files.length === 0) {
      return { totalFiles: 0, totalSize: 0 };
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const dates = files.map(f => new Date(f.uploadedAt));
    
    return {
      totalFiles: files.length,
      totalSize,
      oldestFile: new Date(Math.min(...dates.map(d => d.getTime()))),
      newestFile: new Date(Math.max(...dates.map(d => d.getTime())))
    };
  }
}

export const localStorageService = LocalStorageService.getInstance();