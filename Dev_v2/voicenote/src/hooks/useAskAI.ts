'use client'

import { useState, useCallback } from 'react';
import { llmService } from '@/services/llm';
import { databaseService } from '@/services/database';
import { AudioFile, ChatMessage } from '@/types';

export interface AskAIState {
  isLoading: boolean;
  error: string | null;
  chatHistory: ChatMessage[];
}

export const useAskAI = (userId: string, audioFile: AudioFile | null) => {
  const [state, setState] = useState<AskAIState>({
    isLoading: false,
    error: null,
    chatHistory: audioFile?.askAIChats || []
  });

  // 質問送信
  const askQuestion = useCallback(async (question: string): Promise<void> => {
    if (!audioFile || !question.trim()) {
      return;
    }

    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null
      }));

      // ユーザーメッセージを追加
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: question.trim(),
        timestamp: new Date()
      };

      setState(prev => ({
        ...prev,
        chatHistory: [...prev.chatHistory, userMessage]
      }));

      // LLMサービスに質問を送信
      const response = await llmService.askAIWithHistory(
        userId,
        audioFile,
        question.trim(),
        state.chatHistory
      );

      // アシスタントメッセージを追加
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        timestamp: new Date()
      };

      const updatedHistory = [...state.chatHistory, userMessage, assistantMessage];

      setState(prev => ({
        ...prev,
        isLoading: false,
        chatHistory: updatedHistory
      }));

      // データベースに保存
      try {
        await databaseService.updateAudioFile(userId, audioFile.id, {
          askAIChats: updatedHistory
        });
      } catch (dbError) {
        console.warn('Failed to save chat history to database:', dbError);
        // チャットの継続は可能なので、エラーは表示しない
      }

    } catch (error) {
      console.error('Ask AI failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'AI応答の生成に失敗しました';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
    }
  }, [userId, audioFile, state.chatHistory]);

  // チャット履歴クリア
  const clearHistory = useCallback(async () => {
    if (!audioFile) return;

    try {
      setState(prev => ({
        ...prev,
        chatHistory: [],
        error: null
      }));

      // データベースからも削除
      await databaseService.updateAudioFile(userId, audioFile.id, {
        askAIChats: []
      });
    } catch (error) {
      console.error('Failed to clear chat history:', error);
      setState(prev => ({
        ...prev,
        error: 'チャット履歴の削除に失敗しました'
      }));
    }
  }, [userId, audioFile]);

  // エラークリア
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // 履歴の再読み込み
  const reloadHistory = useCallback(async () => {
    if (!audioFile) return;

    try {
      const updatedAudioFile = await databaseService.getAudioFile(userId, audioFile.id);
      if (updatedAudioFile?.askAIChats) {
        setState(prev => ({
          ...prev,
          chatHistory: updatedAudioFile.askAIChats,
          error: null
        }));
      }
    } catch (error) {
      console.error('Failed to reload chat history:', error);
    }
  }, [userId, audioFile]);

  // 処理完了状態の確認
  const isReady = audioFile?.status === 'completed' && 
                  (audioFile.transcription || audioFile.summary);

  return {
    ...state,
    askQuestion,
    clearHistory,
    clearError,
    reloadHistory,
    isReady
  };
};