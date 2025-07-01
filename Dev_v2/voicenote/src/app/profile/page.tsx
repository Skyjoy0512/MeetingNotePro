'use client';

import { MobileHeader } from '@/components/layout/MobileHeader';
import { BottomNavigation } from '@/components/navigation/BottomNavigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Brain, BarChart3, HelpCircle, User, Crown, Clock, FileAudio } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function ProfilePage() {
  const { user } = useAuth();

  const quickActions = [
    {
      icon: Settings,
      title: 'API設定',
      description: '音声認識・AI要約の設定',
      href: '/settings/api',
      color: 'text-blue-600'
    },
    {
      icon: Brain,
      title: '音声学習',
      description: 'あなたの声を学習',
      href: '/voice-learning',
      color: 'text-purple-600'
    },
    {
      icon: BarChart3,
      title: '使用統計',
      description: '処理状況とコスト',
      href: '/stats',
      color: 'text-green-600'
    },
    {
      icon: HelpCircle,
      title: 'ヘルプ',
      description: '使い方とサポート',
      href: '/help',
      color: 'text-orange-600'
    }
  ];

  const handleActionClick = (href: string) => {
    window.location.href = href;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <MobileHeader 
        title="マイページ" 
        showSettings={false}
      />
      
      <main className="pt-14 px-4 pb-4 space-y-6">
        {/* ユーザー情報カード */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">
                  {user?.displayName || 'デモユーザー'}
                </h2>
                <p className="text-gray-500 text-sm">
                  {user?.email || 'demo@voicenote.com'}
                </p>
                <div className="flex items-center mt-2">
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                    <Crown className="h-3 w-3 mr-1" />
                    無料プラン
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 使用統計カード */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">使用統計</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <FileAudio className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-600">12</div>
                <div className="text-sm text-gray-600">総処理ファイル数</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-600">15.5時間</div>
                <div className="text-sm text-gray-600">総処理時間</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* クイックアクション */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">クイックアクション</h3>
            <div className="grid gap-3">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={index}
                    variant="ghost"
                    className="h-auto p-4 justify-start hover:bg-gray-50 border border-gray-200"
                    onClick={() => handleActionClick(action.href)}
                  >
                    <div className="flex items-center space-x-3 w-full">
                      <div className={`p-2 rounded-lg bg-gray-100 ${action.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-900">{action.title}</div>
                        <div className="text-sm text-gray-500">{action.description}</div>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 最近のアクティビティ */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">最近のアクティビティ</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileAudio className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">会議録音を処理完了</p>
                  <p className="text-xs text-gray-500">2時間前</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Brain className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">音声学習データを更新</p>
                  <p className="text-xs text-gray-500">1日前</p>
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