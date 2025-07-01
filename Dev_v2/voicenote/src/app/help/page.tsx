'use client';

import { MobileHeader } from '@/components/layout/MobileHeader';
import { BottomNavigation } from '@/components/navigation/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  HelpCircle, 
  FileText, 
  MessageSquare, 
  Mail,
  ExternalLink,
  PlayCircle,
  Settings,
  Mic,
  Brain,
  ChevronRight
} from 'lucide-react';

interface HelpSection {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  items: Array<{
    question: string;
    answer: string;
  }>;
}

export default function HelpPage() {
  const helpSections: HelpSection[] = [
    {
      id: 'getting-started',
      icon: PlayCircle,
      title: '使い方',
      description: '基本的な使い方について',
      items: [
        {
          question: '音声ファイルをアップロードするには？',
          answer: 'ホーム画面の「音声ファイルをアップロード」ボタンをタップし、MP3、WAV、M4A、AAC、OGGファイルを選択してください。'
        },
        {
          question: '録音するには？',
          answer: '「録音」タブから録音ボタンをタップして開始できます。マイクへのアクセス許可が必要です。'
        },
        {
          question: '処理にどのくらい時間がかかりますか？',
          answer: '音声の長さによりますが、通常は音声長の2-3倍程度です。8時間の音声でも処理可能です。'
        }
      ]
    },
    {
      id: 'voice-learning',
      icon: Brain,
      title: '音声学習',
      description: '話者分離の精度向上について',
      items: [
        {
          question: '音声学習とは何ですか？',
          answer: 'あなたの声を事前に学習することで、話者分離の精度を大幅に向上させる機能です。'
        },
        {
          question: '音声学習に必要な時間は？',
          answer: '3種類の音声（自己紹介、日常会話、読み上げ）で合計5-8分程度の録音が必要です。'
        },
        {
          question: '学習後の効果は？',
          answer: '会議録音などで「あなた」の発言を高精度で識別できるようになります。'
        }
      ]
    },
    {
      id: 'api-settings',
      icon: Settings,
      title: 'API設定',
      description: 'APIキーと設定について',
      items: [
        {
          question: 'APIキーはどこで取得できますか？',
          answer: 'OpenAI、Anthropic、Google、Azure等の各プロバイダーの公式サイトで取得してください。'
        },
        {
          question: 'どのAPIがおすすめですか？',
          answer: '音声認識はOpenAI Whisper、要約はClaude-3.5-SonnetまたはGPT-4がおすすめです。'
        },
        {
          question: 'コストを抑えるには？',
          answer: 'DeepgramやDeepseekなどの低コストAPIを活用することをおすすめします。'
        }
      ]
    }
  ];

  const contactOptions = [
    {
      icon: Mail,
      title: 'メールサポート',
      description: 'support@voicenote.com',
      action: () => window.open('mailto:support@voicenote.com')
    },
    {
      icon: MessageSquare,
      title: 'チャットサポート',
      description: 'リアルタイムでサポート',
      action: () => alert('チャットサポートは準備中です')
    },
    {
      icon: FileText,
      title: 'ドキュメント',
      description: '詳細なマニュアル',
      action: () => window.open('https://docs.voicenote.com', '_blank')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <MobileHeader 
        title="ヘルプ・サポート" 
        showBack={true}
      />
      
      <main className="pt-14 px-4 pb-4">
        {/* よくある質問 */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">よくある質問</h2>
          
          {helpSections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.id} className="mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center">
                    <Icon className="h-4 w-4 mr-2" />
                    {section.title}
                  </CardTitle>
                  <p className="text-sm text-gray-600">{section.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {section.items.map((item, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-3">
                        <h4 className="font-medium text-sm text-gray-900 mb-1">
                          {item.question}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {item.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* お問い合わせ */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">お問い合わせ</h2>
          
          <div className="space-y-3">
            {contactOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Card key={option.title} className="cursor-pointer hover:bg-gray-50">
                  <CardContent 
                    className="p-4"
                    onClick={option.action}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Icon className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{option.title}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* 利用規約・プライバシー */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">法的情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => window.open('/terms', '_blank')}
              >
                利用規約
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => window.open('/privacy', '_blank')}
              >
                プライバシーポリシー
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* アプリ情報 */}
        <div className="mt-8 text-center">
          <div className="text-sm text-gray-500">
            <p>VoiceNote v1.0.0</p>
            <p className="mt-1">AI音声文字起こし・話者分離サービス</p>
            <p className="mt-2">© 2024 VoiceNote. All rights reserved.</p>
          </div>
        </div>
      </main>
      
      <BottomNavigation />
    </div>
  );
}