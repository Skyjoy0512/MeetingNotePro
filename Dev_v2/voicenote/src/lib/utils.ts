import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getAudioFormat(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension || 'unknown';
}

export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  try {
    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
    const allowedTypes = [
      'audio/mpeg', 
      'audio/wav', 
      'audio/x-m4a', 
      'audio/aac', 
      'audio/ogg',
      'audio/webm',  // 録音用
      'audio/mp4',   // 一部ブラウザ
      'audio/x-wav', // 一部ブラウザ
      'audio/flac'   // 高音質用
    ];
    const allowedExtensions = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'webm', 'mp4', 'flac'];
    
    if (!file || file.size === 0) {
      return { valid: false, error: 'ファイルが選択されていないか、空のファイルです' };
    }
    
    if (file.size > maxSize) {
      return { valid: false, error: 'ファイルサイズが5GBを超えています' };
    }
    
    const extension = file.name?.split('.').pop()?.toLowerCase();
    
    if (!extension || !allowedExtensions.includes(extension)) {
      return { valid: false, error: `サポートされていないファイル形式です (${extension || 'unknown'})` };
    }
    
    // MIMEタイプチェック（空文字列の場合は拡張子で判定）
    if (file.type && !allowedTypes.includes(file.type)) {
      return { valid: false, error: `サポートされていないファイル形式です (${file.type})` };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('File validation error:', error);
    return { valid: false, error: 'ファイルの検証中にエラーが発生しました' };
  }
}
