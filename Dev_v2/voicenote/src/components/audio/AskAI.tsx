'use client'

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, 
  Send, 
  Trash2, 
  Bot, 
  User, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAskAI } from '@/hooks/useAskAI';
import { useAuth } from '@/hooks/useAuth';
import { AudioFile, ChatMessage } from '@/types';
import { formatTime } from '@/lib/utils';

interface AskAIProps {
  audioFile: AudioFile | null;
  className?: string;
}

export const AskAI = ({ audioFile, className }: AskAIProps) => {
  const { user } = useAuth();
  const [question, setQuestion] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    isLoading,
    error,
    chatHistory,
    askQuestion,
    clearHistory,
    clearError,
    isReady
  } = useAskAI(user?.uid || '', audioFile);

  // 新しいメッセージが追加されたら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading || !isReady) return;

    await askQuestion(question);
    setQuestion('');
  };

  const handleClearHistory = async () => {
    if (window.confirm('チャット履歴を削除しますか？')) {
      await clearHistory();
    }
  };

  const suggestedQuestions = [
    'この会議の重要な決定事項は何ですか？',
    '各参加者の主な発言内容を教えてください',
    'アクションアイテムと担当者を教えてください',
    '次回までに準備すべきことは？'
  ];

  if (!audioFile) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Ask AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">
            音声ファイルを選択してください
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isReady) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Ask AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 space-y-2">
            <AlertCircle className="h-8 w-8 mx-auto" />
            <div>音声の処理が完了していません</div>
            <div className="text-sm">
              文字起こしと要約が完了すると、AIに質問できるようになります
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Ask AI
          </CardTitle>
          {chatHistory.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearHistory}
              className="h-8"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              履歴削除
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* チャット履歴 */}
        <ScrollArea className="h-96 w-full border rounded-md p-4">
          <div className="space-y-4">
            {chatHistory.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <div className="text-lg font-medium mb-2">AIに質問してみましょう</div>
                <div className="text-sm">
                  音声の内容について何でもお聞きください
                </div>
              </div>
            ) : (
              chatHistory.map((message) => (
                <ChatMessageItem key={message.id} message={message} />
              ))
            )}
            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span className="text-gray-500">AI が回答を生成中...</span>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* エラー表示 */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearError}
              className="ml-auto h-6 px-2"
            >
              ×
            </Button>
          </div>
        )}

        {/* 質問入力フォーム */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="音声の内容について質問してください..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={!question.trim() || isLoading}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* 提案質問（履歴がない場合のみ表示） */}
          {chatHistory.length === 0 && (
            <div className="space-y-2">
              <div className="text-sm text-gray-600 font-medium">提案された質問:</div>
              <div className="grid grid-cols-1 gap-2">
                {suggestedQuestions.map((suggestedQ, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setQuestion(suggestedQ)}
                    disabled={isLoading}
                    className="justify-start text-left h-auto py-2 px-3"
                  >
                    <span className="text-xs truncate">{suggestedQ}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* 利用制限の表示 */}
        <div className="text-xs text-gray-500 text-center">
          ✨ デモモードでは模擬的な回答を表示します
        </div>
      </CardContent>
    </Card>
  );
};

// チャットメッセージアイテム
const ChatMessageItem = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>
        
        <div className={`rounded-lg px-4 py-3 ${
          isUser 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-100 text-gray-900'
        }`}>
          <div className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </div>
          <div className={`text-xs mt-2 ${
            isUser ? 'text-blue-100' : 'text-gray-500'
          }`}>
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
};