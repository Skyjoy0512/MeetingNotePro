import { ChatMessage, AudioFile } from '@/types';
import { isDemoMode } from '@/lib/firebase';

export interface AskAIRequest {
  audioId: string;
  question: string;
  context?: string;
}

export interface AskAIResponse {
  answer: string;
  sources?: string[];
  confidence?: number;
}

export class LLMService {
  private static instance: LLMService;

  static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  // Ask AI機能 - 音声コンテンツに関する質問応答
  async askAI(
    userId: string,
    audioFile: AudioFile,
    question: string
  ): Promise<AskAIResponse> {
    try {
      // デモモード用の処理
      if (isDemoMode || userId === 'demo-user-123') {
        console.log('🎭 LLM: Demo mode Ask AI simulation');
        
        // デモ用のレスポンス生成
        const demoAnswer = this.generateDemoAnswer(question, audioFile);
        
        // リアルな遅延をシミュレート
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        return {
          answer: demoAnswer,
          sources: ['文字起こし結果', '要約内容'],
          confidence: 0.85
        };
      }

      // 実際のLLM API呼び出し（実装時に追加）
      const context = this.buildContext(audioFile);
      const response = await this.callLLMAPI(question, context, userId);
      
      return response;
    } catch (error) {
      console.error('Ask AI failed:', error);
      throw new Error('AI応答の生成に失敗しました');
    }
  }

  // 音声内容からコンテキストを構築
  private buildContext(audioFile: AudioFile): string {
    let context = '';
    
    // 文字起こし結果を追加
    if (audioFile.transcription) {
      context += `## 文字起こし結果\n${audioFile.transcription.text}\n\n`;
      
      if (audioFile.transcription.segments && audioFile.transcription.segments.length > 0) {
        context += `## 話者別発言内容\n`;
        audioFile.transcription.segments.forEach((segment, index) => {
          context += `${segment.speaker}: ${segment.text}\n`;
        });
        context += '\n';
      }
    }
    
    // 要約を追加
    if (audioFile.summary) {
      context += `## 全体要約\n${audioFile.summary.overall}\n\n`;
      
      if (audioFile.summary.keyPoints && audioFile.summary.keyPoints.length > 0) {
        context += `## 重要ポイント\n`;
        audioFile.summary.keyPoints.forEach((point, index) => {
          context += `${index + 1}. ${point}\n`;
        });
        context += '\n';
      }
      
      if (audioFile.summary.actionItems && audioFile.summary.actionItems.length > 0) {
        context += `## アクションアイテム\n`;
        audioFile.summary.actionItems.forEach((item, index) => {
          context += `${index + 1}. ${item}\n`;
        });
        context += '\n';
      }
    }
    
    return context;
  }

  // 実際のLLM API呼び出し（Firebase Functions経由）
  private async callLLMAPI(question: string, context: string, userId?: string): Promise<AskAIResponse> {
    try {
      console.log('🤖 LLM API call via Firebase Functions:', { question, contextLength: context.length });
      
      // Firebase Functions のaskAIエンドポイントを呼び出し
      const response = await fetch('https://us-central1-voicenote-dev.cloudfunctions.net/askAI', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          context,
          user_id: userId || 'anonymous',
        })
      });

      if (!response.ok) {
        throw new Error(`Ask AI API failed: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        answer: result.answer || 'AI応答を取得できませんでした',
        sources: result.sources || ['音声コンテンツ'],
        confidence: result.confidence || 0.8
      };
    } catch (error) {
      console.error('LLM API call failed:', error);
      
      // フォールバック: 基本的な応答を生成
      return {
        answer: `申し訳ございませんが、AI応答の生成中にエラーが発生しました。

質問内容: ${question}

利用可能な情報:
${context.substring(0, 500)}...

設定でAPIキーが正しく設定されているか確認してください。`,
        confidence: 0.2
      };
    }
  }

  // デモ用の回答生成
  private generateDemoAnswer(question: string, audioFile: AudioFile): string {
    const lowerQuestion = question.toLowerCase();
    
    // 質問の内容に応じてデモ回答を生成
    if (lowerQuestion.includes('決定') || lowerQuestion.includes('決まった')) {
      return `この会議では以下の重要な決定がなされました：

1. プロジェクト開始日を来月第一週に設定
2. 予算を前回提案から20%削減することで合意
3. 開発チーム5名体制で進行することを決定
4. 次回リリースの日程を2週間後ろ倒しすることで合意

これらの決定は参加者全員の合意により決定されました。`;
    }
    
    if (lowerQuestion.includes('重要') || lowerQuestion.includes('ポイント')) {
      return `この音声の重要なポイントは以下の通りです：

• プロジェクトの進捗は概ね順調で、予定の80%が完了
• 品質向上のための新しいテスト手法の導入を決定
• リソース不足の解決のため、追加メンバーの採用を検討
• チーム間のコミュニケーション改善が必要

特に品質管理の強化が今後の重要課題として挙げられています。`;
    }
    
    if (lowerQuestion.includes('アクション') || lowerQuestion.includes('タスク') || lowerQuestion.includes('やること')) {
      return `以下のアクションアイテムが決定されました：

📋 **即座に実行**
• 新しいテスト手法の詳細仕様書作成（Aさん担当、期限：来週金曜）
• リリーススケジュールの関係部署への通知（あなた担当、期限：明日）

📋 **今月中**
• 採用計画の作成と承認取得（Bさん担当、期限：今月末）
• 次回会議の日程調整（あなた担当、期限：今週中）

各担当者は期限を守って実行してください。`;
    }
    
    if (lowerQuestion.includes('誰') || lowerQuestion.includes('だれ') || lowerQuestion.includes('話者')) {
      const speakers = audioFile.transcription?.speakers || ['あなた', 'Aさん', 'Bさん'];
      return `この音声には${speakers.length}名の話者が参加しています：

${speakers.map((speaker, index) => 
  `**${speaker}**: ${this.getSpeakerDescription(speaker)}`
).join('\n')}

話者分離により、各参加者の発言を明確に区別できています。`;
    }
    
    // デフォルトの回答
    return `ご質問「${question}」についてお答えします。

この音声コンテンツ（${audioFile.fileName}）を分析した結果、以下の情報をお伝えできます：

• 音声時間: ${Math.floor(audioFile.duration / 60)}分${audioFile.duration % 60}秒
• 話者数: ${audioFile.transcription?.speakers?.length || 3}名
• 処理状況: ${audioFile.status === 'completed' ? '完了' : '処理中'}

より具体的な質問をいただければ、詳細な情報をお答えできます。例えば：
- 「この会議の決定事項は？」
- 「重要なポイントを教えて」
- 「アクションアイテムは？」`;
  }

  // 話者の説明を生成
  private getSpeakerDescription(speaker: string): string {
    const descriptions: Record<string, string> = {
      'あなた': '会議の司会者として進行管理と全体調整を担当',
      'Aさん': '技術面のリードとして専門的な分析と提案を実施',
      'Bさん': 'プロジェクト管理の観点からスケジュールとリソース管理を担当',
      'Cさん': 'マーケティング視点からの要求分析と市場動向の報告を担当',
      'Dさん': '品質保証の専門家として製品品質とテスト戦略を担当'
    };
    
    return descriptions[speaker] || '重要な意見と建設的な提案を提供';
  }

  // チャット履歴を使用したコンテキスト付き応答
  async askAIWithHistory(
    userId: string,
    audioFile: AudioFile,
    question: string,
    chatHistory: ChatMessage[]
  ): Promise<AskAIResponse> {
    try {
      // デモモード用の処理
      if (isDemoMode || userId === 'demo-user-123') {
        console.log('🎭 LLM: Demo mode Ask AI with history');
        
        const response = await this.askAI(userId, audioFile, question);
        
        // 履歴を考慮した回答の調整
        if (chatHistory.length > 0) {
          const lastQuestion = chatHistory[chatHistory.length - 1]?.content;
          if (lastQuestion && question.includes('詳しく') || question.includes('もう少し')) {
            response.answer = `先ほどの質問「${lastQuestion}」に関連して、さらに詳しくお答えします。\n\n${response.answer}`;
          }
        }
        
        return response;
      }

      // 実際の実装ではチャット履歴も含めてコンテキストを構築
      const context = this.buildContextWithHistory(audioFile, chatHistory);
      const response = await this.callLLMAPI(question, context, userId);
      
      return response;
    } catch (error) {
      console.error('Ask AI with history failed:', error);
      throw new Error('AI応答の生成に失敗しました');
    }
  }

  // チャット履歴を含むコンテキスト構築
  private buildContextWithHistory(audioFile: AudioFile, chatHistory: ChatMessage[]): string {
    let context = this.buildContext(audioFile);
    
    if (chatHistory.length > 0) {
      context += `## 過去の質問と回答\n`;
      chatHistory.slice(-5).forEach((message, index) => { // 直近5件のみ
        context += `${message.role === 'user' ? 'Q' : 'A'}: ${message.content}\n`;
      });
      context += '\n';
    }
    
    return context;
  }
}

export const llmService = LLMService.getInstance();