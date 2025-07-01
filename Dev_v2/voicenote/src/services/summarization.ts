import { AudioFile, Summary, Transcription } from '@/types';

// LLM プロバイダーの設定
export interface SummarizationConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'azure' | 'aws' | 'cohere' | 'groq' | 'deepseek';
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

// 要約結果
export interface SummarizationResult {
  overall: string;
  speakerSummaries: Record<string, string>;
  keyPoints: string[];
  actionItems: string[];
  topics: string[];
}

export class SummarizationService {
  private static instance: SummarizationService;

  static getInstance(): SummarizationService {
    if (!SummarizationService.instance) {
      SummarizationService.instance = new SummarizationService();
    }
    return SummarizationService.instance;
  }

  // デモ用の要約結果生成
  private generateDemoSummary(audioFile: AudioFile, transcription: Transcription): SummarizationResult {
    console.log('🎭 Summarization: Generating demo summary for:', audioFile.fileName);
    
    const overall = `${audioFile.fileName.includes('会議') ? '会議' : 'インタビュー'}では新しいプロジェクトについて議論され、具体的な進行計画と担当者の役割分担が決定されました。参加者間で活発な意見交換が行われ、今後の方向性について合意に至りました。`;

    const speakerSummaries: Record<string, string> = {};
    transcription.speakers.forEach((speaker, index) => {
      switch (speaker) {
        case 'あなた':
          speakerSummaries[speaker] = '会議の司会を務め、プロジェクトの概要説明と進行管理を行った。重要な決定事項について確認を取りながら議論を進めた。';
          break;
        case 'Aさん':
          speakerSummaries[speaker] = 'プロジェクトの詳細な技術仕様について説明し、実装方法や予算調整案を提示した。専門的な観点から貴重な意見を提供した。';
          break;
        case 'Bさん':
          speakerSummaries[speaker] = 'スケジュールと予算について質問を行い、プロジェクトの実現可能性について検討した。現実的な視点から課題を指摘した。';
          break;
        default:
          speakerSummaries[speaker] = `${speaker}は議論に積極的に参加し、重要な観点から意見を述べた。`;
      }
    });

    const keyPoints = [
      'プロジェクト開始日は来月の第一週に設定',
      '予算は前回提案から20%削減することで合意',
      '開発チームは5名体制で進行することを決定',
      '品質維持と効率化の両立を目指すアプローチを採用'
    ];

    const actionItems = [
      '来週までに詳細な要件定義書を作成（Aさん担当）',
      '予算の最終承認を取得（あなた担当）',
      'チームメンバーのアサインを完了（Bさん担当）',
      '次回会議の日程調整を行う'
    ];

    const topics = ['プロジェクト計画', '予算調整', 'チーム編成', 'スケジュール管理'];

    return {
      overall,
      speakerSummaries,
      keyPoints,
      actionItems,
      topics
    };
  }

  // OpenAI GPT での要約
  private async summarizeWithOpenAI(
    transcription: Transcription,
    config: SummarizationConfig
  ): Promise<SummarizationResult> {
    try {
      // 実際のOpenAI API呼び出しはここに実装
      // プロンプトを構築してAPI呼び出し
      throw new Error('OpenAI API implementation needed');
    } catch (error) {
      console.error('OpenAI summarization failed:', error);
      throw error;
    }
  }

  // Anthropic Claude での要約
  private async summarizeWithAnthropic(
    transcription: Transcription,
    config: SummarizationConfig
  ): Promise<SummarizationResult> {
    try {
      // 実際のClaude API呼び出しはここに実装
      throw new Error('Anthropic API implementation needed');
    } catch (error) {
      console.error('Anthropic summarization failed:', error);
      throw error;
    }
  }

  // Google Gemini での要約
  private async summarizeWithGoogle(
    transcription: Transcription,
    config: SummarizationConfig
  ): Promise<SummarizationResult> {
    try {
      // 実際のGemini API呼び出しはここに実装
      throw new Error('Google API implementation needed');
    } catch (error) {
      console.error('Google summarization failed:', error);
      throw error;
    }
  }

  // Deepseek での要約
  private async summarizeWithDeepseek(
    transcription: Transcription,
    config: SummarizationConfig
  ): Promise<SummarizationResult> {
    try {
      // 実際のDeepseek API呼び出しはここに実装
      throw new Error('Deepseek API implementation needed');
    } catch (error) {
      console.error('Deepseek summarization failed:', error);
      throw error;
    }
  }

  // 要約プロンプトの生成
  private generateSummaryPrompt(transcription: Transcription): string {
    const speakerList = transcription.speakers.join('、');
    const segmentText = transcription.segments
      .map(seg => `【${seg.speaker}】${seg.text}`)
      .join('\n');

    return `以下の会議・音声の文字起こし結果を分析して、構造化された要約を作成してください。

話者: ${speakerList}

文字起こし内容:
${segmentText}

以下の形式でJSONとして出力してください:
{
  "overall": "全体的な要約（200文字程度）",
  "speakerSummaries": {
    "話者名": "その話者の発言要約"
  },
  "keyPoints": ["重要なポイント1", "重要なポイント2", "..."],
  "actionItems": ["アクションアイテム1", "アクションアイテム2", "..."],
  "topics": ["トピック1", "トピック2", "..."]
}

日本語で出力し、内容は簡潔で分かりやすくまとめてください。`;
  }

  // メイン要約関数
  async summarizeTranscription(
    audioFile: AudioFile,
    transcription: Transcription,
    config?: SummarizationConfig
  ): Promise<Summary> {
    console.log('📝 Starting summarization for:', audioFile.fileName);
    
    // デモモードまたは設定がない場合
    if (audioFile.userId === 'demo-user-123' || !config) {
      console.log('🎭 Using demo summarization');
      const demoResult = this.generateDemoSummary(audioFile, transcription);
      
      return {
        overall: demoResult.overall,
        speakerSummaries: demoResult.speakerSummaries,
        keyPoints: demoResult.keyPoints,
        actionItems: demoResult.actionItems,
        topics: demoResult.topics,
        apiProvider: 'demo',
        model: 'demo-gpt',
        generatedAt: new Date()
      };
    }

    const startTime = Date.now();
    let result: SummarizationResult;

    try {
      // プロバイダーに応じて適切なAPIを呼び出し
      switch (config.provider) {
        case 'openai':
          result = await this.summarizeWithOpenAI(transcription, config);
          break;
        case 'anthropic':
          result = await this.summarizeWithAnthropic(transcription, config);
          break;
        case 'google':
          result = await this.summarizeWithGoogle(transcription, config);
          break;
        case 'deepseek':
          result = await this.summarizeWithDeepseek(transcription, config);
          break;
        default:
          throw new Error(`Unsupported provider: ${config.provider}`);
      }

      return {
        overall: result.overall,
        speakerSummaries: result.speakerSummaries,
        keyPoints: result.keyPoints,
        actionItems: result.actionItems,
        topics: result.topics,
        apiProvider: config.provider,
        model: config.model || 'default',
        generatedAt: new Date()
      };

    } catch (error) {
      console.error('❌ Summarization failed:', error);
      
      // エラー時はデモデータにフォールバック
      console.log('🔄 Falling back to demo summarization');
      const demoResult = this.generateDemoSummary(audioFile, transcription);
      
      return {
        overall: demoResult.overall,
        speakerSummaries: demoResult.speakerSummaries,
        keyPoints: demoResult.keyPoints,
        actionItems: demoResult.actionItems,
        topics: demoResult.topics,
        apiProvider: 'demo-fallback',
        model: 'demo-gpt',
        generatedAt: new Date()
      };
    }
  }

  // 段階的要約（長時間音声用）
  async summarizeInChunks(
    audioFile: AudioFile,
    transcriptions: Transcription[],
    config?: SummarizationConfig
  ): Promise<Summary> {
    console.log('📝 Starting chunked summarization for:', audioFile.fileName);
    
    // 各チャンクを個別に要約
    const chunkSummaries: Summary[] = [];
    for (const transcription of transcriptions) {
      const chunkSummary = await this.summarizeTranscription(audioFile, transcription, config);
      chunkSummaries.push(chunkSummary);
    }

    // チャンク要約を統合
    return this.mergeSummaries(chunkSummaries, config);
  }

  // 複数の要約を統合
  private async mergeSummaries(
    summaries: Summary[],
    config?: SummarizationConfig
  ): Promise<Summary> {
    console.log('🔗 Merging', summaries.length, 'summaries');
    
    // デモ実装：最初の要約をベースに統合
    const baseSummary = summaries[0];
    const allKeyPoints = summaries.flatMap(s => s.keyPoints);
    const allActionItems = summaries.flatMap(s => s.actionItems);
    const allTopics = summaries.flatMap(s => s.topics);

    return {
      overall: `統合された要約: ${baseSummary.overall}（${summaries.length}つのセクションから統合）`,
      speakerSummaries: baseSummary.speakerSummaries,
      keyPoints: [...new Set(allKeyPoints)].slice(0, 10), // 重複除去して最大10個
      actionItems: [...new Set(allActionItems)].slice(0, 10),
      topics: [...new Set(allTopics)].slice(0, 8),
      apiProvider: baseSummary.apiProvider,
      model: baseSummary.model,
      generatedAt: new Date()
    };
  }
}

export const summarizationService = SummarizationService.getInstance();