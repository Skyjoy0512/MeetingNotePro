import { AudioFile, TranscriptionResult, SummaryResult, SpeakerSegment } from '@/types';
import { databaseService } from './database';
import { storageService } from './storage';
import { audioProcessingClient, ProcessingConfig } from './audioProcessingClient';

export interface ProcessingOptions {
  enableSpeakerSeparation?: boolean;
  maxSpeakers?: number;
  useUserEmbedding?: boolean;
  language?: string;
}

export interface ProcessingProgress {
  stage: 'preprocessing' | 'speaker_analysis' | 'chunk_processing' | 'transcribing' | 'integrating';
  progress: number;
  currentChunk?: number;
  totalChunks?: number;
  message?: string;
}

export class AudioProcessingService {
  private static instance: AudioProcessingService;

  static getInstance(): AudioProcessingService {
    if (!AudioProcessingService.instance) {
      AudioProcessingService.instance = new AudioProcessingService();
    }
    return AudioProcessingService.instance;
  }

  // メイン処理関数
  async processAudio(
    userId: string,
    audioId: string,
    options: ProcessingOptions = {},
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<AudioFile> {
    try {
      // 処理設定の変換
      const config: ProcessingConfig = {
        enableSpeakerSeparation: options.enableSpeakerSeparation ?? true,
        maxSpeakers: options.maxSpeakers ?? 5,
        useUserEmbedding: options.useUserEmbedding ?? true,
        language: options.language ?? 'ja',
        chunkDuration: 30,
        overlapDuration: 5
      };

      // Cloud Runサービスに処理を委託
      const response = await audioProcessingClient.startProcessingWithRetry(
        userId, 
        audioId, 
        config
      );

      if (response.status !== 'processing_started') {
        throw new Error(`Failed to start processing: ${response.message}`);
      }

      // 進捗監視を開始（オプション）
      if (onProgress) {
        this.monitorProgress(userId, audioId, onProgress);
      }

      // 処理完了まで待機またはすぐに戻る（設定に依存）
      return await this.waitForCompletion(userId, audioId);

    } catch (error) {
      console.error('Audio processing failed:', error);
      
      await databaseService.updateAudioFile(userId, audioId, {
        status: 'error',
        processingProgress: 0
      });

      throw error;
    }
  }

  // 進捗監視（非同期）
  private async monitorProgress(
    userId: string,
    audioId: string,
    onProgress: (progress: ProcessingProgress) => void
  ): Promise<void> {
    try {
      for await (const status of audioProcessingClient.monitorProcessingProgress(userId, audioId)) {
        const progress: ProcessingProgress = {
          stage: this.mapStatusToStage(status.status),
          progress: status.progress,
          message: status.message,
          currentChunk: status.currentChunk,
          totalChunks: status.totalChunks
        };
        
        onProgress(progress);

        if (status.status === 'completed' || status.status === 'error') {
          break;
        }
      }
    } catch (error) {
      console.error('Progress monitoring failed:', error);
    }
  }

  // 処理完了待機
  private async waitForCompletion(userId: string, audioId: string): Promise<AudioFile> {
    // Firestoreのリアルタイム更新に依存
    // または定期的にステータスをチェック
    let attempts = 0;
    const maxAttempts = 360; // 30分間監視（5秒間隔）

    while (attempts < maxAttempts) {
      const audioFile = await databaseService.getAudioFile(userId, audioId);
      
      if (audioFile?.status === 'completed') {
        return audioFile;
      } else if (audioFile?.status === 'error') {
        throw new Error('Audio processing failed on server');
      }

      await new Promise(resolve => setTimeout(resolve, 5000)); // 5秒待機
      attempts++;
    }

    throw new Error('Audio processing timeout');
  }

  // ステータスをステージにマッピング
  private mapStatusToStage(status: string): ProcessingProgress['stage'] {
    const stageMap: Record<string, ProcessingProgress['stage']> = {
      'preprocessing': 'preprocessing',
      'speaker_analysis': 'speaker_analysis', 
      'chunk_processing': 'chunk_processing',
      'transcribing': 'transcribing',
      'integrating': 'integrating'
    };
    
    return stageMap[status] || 'preprocessing';
  }

  // Phase 0: 音声前処理
  private async preprocessAudio(
    userId: string,
    audioId: string,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<void> {
    onProgress?.({
      stage: 'preprocessing',
      progress: 10,
      message: 'ノイズ除去処理中...'
    });

    // モック処理（実際はPythonサービスで実行）
    await new Promise(resolve => setTimeout(resolve, 2000));

    onProgress?.({
      stage: 'preprocessing',
      progress: 20,
      message: '音量正規化中...'
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 音声品質情報を更新
    await databaseService.updateAudioFile(userId, audioId, {
      audioQuality: {
        snr: 25.5, // Signal-to-Noise Ratio
        noiseLevel: 0.1,
        volumeLevel: 0.8,
        format: 'mp3',
        sampleRate: 44100,
        channels: 2
      }
    });
  }

  // Phase 1: 話者分析
  private async analyzeSpeakers(
    userId: string,
    audioId: string,
    options: ProcessingOptions,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<{
    speakerCount: number;
    segments: SpeakerSegment[];
    globalSpeakers: any[];
  }> {
    await databaseService.updateAudioFile(userId, audioId, {
      status: 'speaker_analysis',
      processingProgress: 25
    });

    onProgress?.({
      stage: 'speaker_analysis',
      progress: 25,
      message: 'グローバル話者分析中...'
    });

    // モック話者分離処理
    await new Promise(resolve => setTimeout(resolve, 3000));

    const mockSegments: SpeakerSegment[] = [
      { start: 0.0, end: 5.2, speaker: 'Speaker_0', confidence: 0.95 },
      { start: 5.2, end: 12.8, speaker: 'Speaker_1', confidence: 0.92 },
      { start: 12.8, end: 18.5, speaker: 'Speaker_0', confidence: 0.89 },
      { start: 18.5, end: 25.1, speaker: 'Speaker_2', confidence: 0.91 },
      { start: 25.1, end: 32.0, speaker: 'Speaker_1', confidence: 0.94 }
    ];

    const globalSpeakers = [
      { id: 'Speaker_0', name: 'あなた', embedding: [], confidence: 0.88 },
      { id: 'Speaker_1', name: 'Aさん', embedding: [], confidence: 0.85 },
      { id: 'Speaker_2', name: 'Bさん', embedding: [], confidence: 0.82 }
    ];

    onProgress?.({
      stage: 'speaker_analysis',
      progress: 40,
      message: `${globalSpeakers.length}名の話者を検出しました`
    });

    return {
      speakerCount: globalSpeakers.length,
      segments: mockSegments,
      globalSpeakers
    };
  }

  // Phase 2: 文字起こし処理
  private async processTranscription(
    userId: string,
    audioId: string,
    speakerAnalysis: any,
    options: ProcessingOptions,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<TranscriptionResult> {
    await databaseService.updateAudioFile(userId, audioId, {
      status: 'transcribing',
      processingProgress: 50
    });

    // 長時間音声の場合のチャンク処理をシミュレート
    const shouldChunk = speakerAnalysis.segments.length > 20; // 仮の条件
    
    if (shouldChunk) {
      return await this.processWithChunks(userId, audioId, speakerAnalysis, options, onProgress);
    } else {
      return await this.processDirectTranscription(userId, audioId, speakerAnalysis, options, onProgress);
    }
  }

  // チャンク分割処理
  private async processWithChunks(
    userId: string,
    audioId: string,
    speakerAnalysis: any,
    options: ProcessingOptions,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<TranscriptionResult> {
    const totalChunks = 8; // 8時間音声を30分ずつ分割
    
    await databaseService.updateAudioFile(userId, audioId, {
      status: 'chunk_processing',
      totalChunks,
      processedChunks: 0,
      processingProgress: 50
    });

    onProgress?.({
      stage: 'chunk_processing',
      progress: 50,
      currentChunk: 0,
      totalChunks,
      message: 'チャンク分割処理を開始しています...'
    });

    // 各チャンクを順次処理
    const allSegments: any[] = [];
    
    for (let i = 0; i < totalChunks; i++) {
      onProgress?.({
        stage: 'chunk_processing',
        progress: 50 + (i / totalChunks) * 25,
        currentChunk: i + 1,
        totalChunks,
        message: `チャンク ${i + 1}/${totalChunks} を処理中...`
      });

      // チャンク処理のシミュレート
      await new Promise(resolve => setTimeout(resolve, 1500));

      // チャンク結果をマージ
      const chunkSegments = speakerAnalysis.segments.slice(
        Math.floor(i * speakerAnalysis.segments.length / totalChunks),
        Math.floor((i + 1) * speakerAnalysis.segments.length / totalChunks)
      );

      allSegments.push(...chunkSegments);

      await databaseService.updateAudioFile(userId, audioId, {
        processedChunks: i + 1,
        processingProgress: 50 + ((i + 1) / totalChunks) * 25
      });
    }

    return this.createTranscriptionResult(allSegments, speakerAnalysis.globalSpeakers);
  }

  // 直接文字起こし処理
  private async processDirectTranscription(
    userId: string,
    audioId: string,
    speakerAnalysis: any,
    options: ProcessingOptions,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<TranscriptionResult> {
    onProgress?.({
      stage: 'transcribing',
      progress: 60,
      message: '音声認識処理中...'
    });

    // モック文字起こし処理
    await new Promise(resolve => setTimeout(resolve, 4000));

    return this.createTranscriptionResult(speakerAnalysis.segments, speakerAnalysis.globalSpeakers);
  }

  // 文字起こし結果作成
  private createTranscriptionResult(segments: SpeakerSegment[], globalSpeakers: any[]): TranscriptionResult {
    const mockText = `
これは会議の音声文字起こし結果のサンプルです。実際の音声認識APIが統合されると、
ここに正確な文字起こし結果が表示されます。話者分離により、各発言者の発言を
明確に区別することができます。8時間までの長時間音声にも対応しており、
高精度な処理が可能です。
    `.trim();

    const transcriptionSegments = segments.map((segment, index) => ({
      start: segment.start,
      end: segment.end,
      text: `セグメント${index + 1}の文字起こし内容です。${segment.speaker}の発言。`,
      speaker: globalSpeakers.find(s => s.id === segment.speaker)?.name || segment.speaker,
      confidence: segment.confidence,
      words: []
    }));

    return {
      text: mockText,
      segments: transcriptionSegments,
      speakers: globalSpeakers.map(s => s.name),
      language: 'ja',
      confidence: 0.92,
      processingTime: 180,
      apiProvider: 'openai',
      model: 'whisper-1'
    };
  }

  // Phase 3: 要約生成
  private async generateSummary(
    userId: string,
    audioId: string,
    transcription: TranscriptionResult,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<SummaryResult> {
    await databaseService.updateAudioFile(userId, audioId, {
      status: 'integrating',
      processingProgress: 80
    });

    onProgress?.({
      stage: 'integrating',
      progress: 80,
      message: 'AI要約を生成中...'
    });

    // モック要約生成
    await new Promise(resolve => setTimeout(resolve, 3000));

    onProgress?.({
      stage: 'integrating',
      progress: 95,
      message: '最終統合処理中...'
    });

    const mockSummary: SummaryResult = {
      overall: `
この会議では、プロジェクトの進捗状況と今後の計画について話し合われました。
主要な議題として、開発スケジュールの見直し、リソース配分、品質管理について
議論されました。参加者全員が建設的な意見交換を行い、具体的な行動計画が策定されました。
      `.trim(),
      speakerSummaries: {
        'あなた': 'プロジェクトの全体進捗について報告し、課題点を整理して解決策を提案しました。',
        'Aさん': '技術的な観点から詳細な分析を提供し、実装方針について具体的な提案を行いました。',
        'Bさん': 'スケジュール管理とリソース配分について専門的な見解を示し、最適化案を提示しました。'
      },
      keyPoints: [
        'プロジェクトの進捗は概ね順調で、予定の80%が完了',
        '品質向上のための新しいテスト手法の導入を決定',
        'リソース不足の解決のため、追加メンバーの採用を検討',
        '次回リリースの日程を2週間後ろ倒しすることで合意'
      ],
      actionItems: [
        '新しいテスト手法の詳細仕様書作成（担当：Aさん、期限：来週金曜）',
        '採用計画の作成と承認取得（担当：Bさん、期限：今月末）',
        'リリーススケジュールの関係部署への通知（担当：あなた、期限：明日）',
        '次回会議の日程調整（担当：あなた、期限：今週中）'
      ],
      topics: [
        'プロジェクト進捗報告',
        '品質管理手法の改善',
        'リソース配分の最適化',
        'スケジュール調整',
        '次回リリース計画'
      ],
      apiProvider: 'openai',
      model: 'gpt-4',
      generatedAt: new Date()
    };

    return mockSummary;
  }

  // 処理状況の取得
  async getProcessingStatus(userId: string, audioId: string): Promise<{
    status: AudioFile['status'];
    progress: number;
    currentChunk?: number;
    totalChunks?: number;
  } | null> {
    try {
      const audioFile = await databaseService.getAudioFile(userId, audioId);
      if (!audioFile) return null;

      return {
        status: audioFile.status,
        progress: audioFile.processingProgress || 0,
        currentChunk: audioFile.processedChunks,
        totalChunks: audioFile.totalChunks
      };
    } catch (error) {
      console.error('Failed to get processing status:', error);
      return null;
    }
  }

  // 処理のキャンセル
  async cancelProcessing(userId: string, audioId: string): Promise<void> {
    try {
      await databaseService.updateAudioFile(userId, audioId, {
        status: 'error',
        processingProgress: 0
      });

      // 関連ファイルの削除
      await storageService.deleteAudioFiles(userId, audioId);
    } catch (error) {
      console.error('Failed to cancel processing:', error);
      throw error;
    }
  }
}

export const audioProcessingService = AudioProcessingService.getInstance();