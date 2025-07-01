'use client';

import { useState } from 'react';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { BottomNavigation } from '@/components/navigation/BottomNavigation';
import { AudioRecording } from '@/components/audio/AudioRecording';
import { AudioUpload } from '@/components/audio/AudioUpload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, Upload, FileAudio } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function RecordPage() {
  console.log('🎤 RecordPage v2.0: Component initialized - ' + Date.now());
  
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('record');

  const handleRecordingComplete = (file: any) => {
    console.log('✅ Recording completed:', file);
    toast({
      title: '録音完了',
      description: '音声の録音が完了しました',
    });
    
    // ホーム画面に戻る
    window.location.href = '/';
  };

  const handleUploadSuccess = (file: any) => {
    console.log('✅ Upload completed:', file);
    toast({
      title: 'アップロード完了',
      description: '音声ファイルのアップロードが完了しました',
    });
    
    // ホーム画面に戻る
    window.location.href = '/';
  };

  const handleError = (error: string) => {
    console.error('Error:', error);
    toast({
      title: 'エラー',
      description: error,
      variant: 'destructive',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <MobileHeader 
        title="音声入力" 
        showBack={true}
      />
      
      <main className="pt-14 px-4 pb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="record" className="flex items-center">
              <Mic className="h-4 w-4 mr-2" />
              録音
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center">
              <Upload className="h-4 w-4 mr-2" />
              アップロード
            </TabsTrigger>
          </TabsList>

          {/* 録音タブ */}
          <TabsContent value="record">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <Mic className="h-5 w-5 mr-2 text-red-500" />
                  音声録音
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    録音ボタンを押して音声の録音を開始してください
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-blue-900 mb-1">録音のコツ</h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• 静かな環境で録音してください</li>
                      <li>• マイクから15-30cm程度の距離を保ってください</li>
                      <li>• 話者が変わる際は少し間を空けてください</li>
                    </ul>
                  </div>
                </div>
                
                <AudioRecording 
                  onRecordingComplete={handleRecordingComplete}
                  onError={handleError}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* アップロードタブ */}
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <FileAudio className="h-5 w-5 mr-2 text-blue-500" />
                  ファイルアップロード
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    音声ファイルをアップロードしてください
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-green-900 mb-1">対応形式</h4>
                    <ul className="text-xs text-green-700 space-y-1">
                      <li>• MP3, WAV, M4A, AAC, OGG</li>
                      <li>• 最大ファイルサイズ: 5GB</li>
                      <li>• 最大音声長: 8時間</li>
                    </ul>
                  </div>
                </div>
                
                <AudioUpload 
                  onUploadSuccess={handleUploadSuccess}
                  onClose={() => {}}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 使用量情報 */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-900 mb-2">今月の使用状況</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500">処理済み音声</div>
                  <div className="text-lg font-semibold text-gray-900">5 / 20</div>
                  <div className="text-gray-500">ファイル</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500">処理時間</div>
                  <div className="text-lg font-semibold text-gray-900">2.5 / 40</div>
                  <div className="text-gray-500">時間</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      
      <BottomNavigation />
    </div>
  );
}