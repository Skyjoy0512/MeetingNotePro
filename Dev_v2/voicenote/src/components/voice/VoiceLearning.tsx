'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AudioRecording } from '@/components/audio/AudioRecording';
import { Mic, Brain, CheckCircle, AlertCircle, Play, Pause } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface VoiceLearningProps {
  onLearningComplete?: () => void;
}

export const VoiceLearning = ({ onLearningComplete }: VoiceLearningProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'intro' | 'recording' | 'processing' | 'completed'>('intro');
  const [recordings, setRecordings] = useState<Array<{
    id: string;
    name: string;
    duration: number;
    audioUrl: string;
    isRecorded: boolean;
  }>>([
    { id: '1', name: '自己紹介', duration: 0, audioUrl: '', isRecorded: false },
    { id: '2', name: '日常会話', duration: 0, audioUrl: '', isRecorded: false },
    { id: '3', name: '読み上げ', duration: 0, audioUrl: '', isRecorded: false },
  ]);
  const [currentRecording, setCurrentRecording] = useState<string | null>(null);
  const [totalDuration, setTotalDuration] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);

  const prompts = {
    '1': {
      title: '自己紹介（2-3分）',
      description: 'お名前、お仕事、趣味について自由にお話しください',
      example: '例：「私の名前は田中です。IT関係の仕事をしており、休日は読書や映画鑑賞を楽しんでいます。」'
    },
    '2': {
      title: '日常会話（2-3分）',
      description: '昨日の出来事や今日の予定について話してください',
      example: '例：「昨日は友人と美味しいレストランに行きました。今日は会議が3つ予定されています。」'
    },
    '3': {
      title: '読み上げ（1-2分）',
      description: '以下の文章を自然に読み上げてください',
      example: '「人工知能の発展により、音声認識技術は飛躍的に向上しました。これにより、より自然で正確な文字起こしが可能になっています。」'
    }
  };

  const handleRecordingComplete = (audioId: string) => {
    const recording = recordings.find(r => r.id === currentRecording);
    if (recording) {
      const updatedRecordings = recordings.map(r =>
        r.id === currentRecording
          ? { ...r, isRecorded: true, audioUrl: audioId, duration: 120 } // 仮の長さ
          : r
      );
      setRecordings(updatedRecordings);
      setTotalDuration(prev => prev + 120);
      
      toast({
        title: '録音完了',
        description: `${recording.name}の録音が完了しました`,
      });
    }
    setCurrentRecording(null);
  };

  const handleRecordingError = (error: string) => {
    toast({
      title: 'エラー',
      description: `録音中にエラーが発生しました: ${error}`,
      variant: 'destructive',
    });
    setCurrentRecording(null);
  };

  const startRecording = (recordingId: string) => {
    setCurrentRecording(recordingId);
  };

  const cancelRecording = () => {
    setCurrentRecording(null);
  };

  const startProcessing = async () => {
    setStep('processing');
    
    // 仮の処理進捗シミュレーション
    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setStep('completed');
          toast({
            title: '学習完了',
            description: '音声学習が完了しました。より精度の高い話者分離が可能になります。',
          });
          if (onLearningComplete) {
            onLearningComplete();
          }
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const canProcess = recordings.every(r => r.isRecorded) && totalDuration >= 300; // 5分以上

  if (step === 'intro') {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Brain className="h-5 w-5 mr-2 text-purple-500" />
              音声学習について
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                あなたの声を学習することで、より高精度な話者分離が可能になります。
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-blue-900 mb-2">学習内容</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• 3種類の音声を録音（合計5-8分）</li>
                  <li>• 静かな環境で録音してください</li>
                  <li>• 自然な話し方で録音してください</li>
                  <li>• 一度学習すると精度が大幅に向上します</li>
                </ul>
              </div>
              <Button 
                onClick={() => setStep('recording')} 
                className="w-full"
              >
                音声学習を開始
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'recording') {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">音声録音</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span>進捗</span>
                <span>{recordings.filter(r => r.isRecorded).length} / 3</span>
              </div>
              <Progress 
                value={(recordings.filter(r => r.isRecorded).length / 3) * 100} 
                className="h-2"
              />
            </div>

            <div className="space-y-3">
              {recordings.map((recording) => {
                const prompt = prompts[recording.id as keyof typeof prompts];
                const isCurrentlyRecording = currentRecording === recording.id;
                
                return (
                  <Card key={recording.id} className={`${recording.isRecorded ? 'bg-green-50 border-green-200' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{prompt.title}</h4>
                        {recording.isRecorded && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-600 mb-2">{prompt.description}</p>
                      
                      <div className="bg-gray-100 rounded p-2 mb-3">
                        <p className="text-xs text-gray-700">{prompt.example}</p>
                      </div>

                      {isCurrentlyRecording ? (
                        <div className="space-y-3">
                          <AudioRecording
                            onRecordingComplete={handleRecordingComplete}
                            onError={handleRecordingError}
                          />
                          <Button 
                            variant="outline" 
                            onClick={cancelRecording}
                            className="w-full"
                          >
                            キャンセル
                          </Button>
                        </div>
                      ) : recording.isRecorded ? (
                        <div className="text-sm text-green-600 font-medium">
                          録音完了 ({Math.floor(recording.duration / 60)}分{recording.duration % 60}秒)
                        </div>
                      ) : (
                        <Button
                          onClick={() => startRecording(recording.id)}
                          variant="outline"
                          className="w-full"
                          disabled={currentRecording !== null}
                        >
                          <Mic className="h-4 w-4 mr-2" />
                          録音開始
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {canProcess && (
              <div className="mt-6">
                <Button onClick={startProcessing} className="w-full">
                  <Brain className="h-4 w-4 mr-2" />
                  音声学習を実行
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="mb-4">
            <Brain className="h-12 w-12 mx-auto text-purple-500 animate-pulse" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            音声を学習中です
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            音声パターンを分析し、あなたの声の特徴を学習しています
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>学習進捗</span>
              <span>{processingProgress}%</span>
            </div>
            <Progress value={processingProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'completed') {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="mb-4">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            音声学習が完了しました
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            今後の音声処理で、より高精度な話者分離が可能になります
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-green-900 mb-1">学習結果</h4>
            <ul className="text-xs text-green-700 space-y-1">
              <li>• 総録音時間: {Math.floor(totalDuration / 60)}分{totalDuration % 60}秒</li>
              <li>• 学習済み音声パターン: 3種類</li>
              <li>• 話者分離精度: 向上しました</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};