'use client';

import { useState, useEffect } from 'react';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { BottomNavigation } from '@/components/navigation/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { 
  BarChart3, 
  FileAudio, 
  Clock, 
  DollarSign,
  TrendingUp,
  Calendar,
  Zap,
  Users
} from 'lucide-react';

interface StatsData {
  totalFiles: number;
  totalDuration: number;
  successRate: number;
  thisMonthFiles: number;
  thisMonthDuration: number;
  apiCalls: {
    speech: number;
    llm: number;
  };
  costs: {
    speech: number;
    llm: number;
    total: number;
  };
  limits: {
    monthlyFiles: number;
    monthlyHours: number;
  };
}

export default function StatsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsData>({
    totalFiles: 12,
    totalDuration: 15.5 * 3600, // 15.5時間を秒に変換
    successRate: 95,
    thisMonthFiles: 5,
    thisMonthDuration: 2.5 * 3600, // 2.5時間を秒に変換
    apiCalls: {
      speech: 47,
      llm: 128
    },
    costs: {
      speech: 8.50,
      llm: 12.30,
      total: 20.80
    },
    limits: {
      monthlyFiles: 20,
      monthlyHours: 40
    }
  });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    }
    return `${minutes}分`;
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <MobileHeader 
        title="使用統計" 
        showBack={true}
      />
      
      <main className="pt-14 px-4 pb-4">
        {/* 今月の使用状況 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              今月の使用状況
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>処理ファイル数</span>
                  <span>{stats.thisMonthFiles} / {stats.limits.monthlyFiles}</span>
                </div>
                <Progress 
                  value={(stats.thisMonthFiles / stats.limits.monthlyFiles) * 100} 
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>処理時間</span>
                  <span>{formatDuration(stats.thisMonthDuration)} / {stats.limits.monthlyHours}時間</span>
                </div>
                <Progress 
                  value={(stats.thisMonthDuration / (stats.limits.monthlyHours * 3600)) * 100} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 全期間統計 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              全期間統計
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center bg-blue-50 rounded-lg p-3">
                <div className="flex items-center justify-center mb-1">
                  <FileAudio className="h-4 w-4 text-blue-500 mr-1" />
                </div>
                <div className="text-xl font-bold text-blue-600">{stats.totalFiles}</div>
                <div className="text-xs text-gray-500">総処理ファイル</div>
              </div>
              <div className="text-center bg-green-50 rounded-lg p-3">
                <div className="flex items-center justify-center mb-1">
                  <Clock className="h-4 w-4 text-green-500 mr-1" />
                </div>
                <div className="text-xl font-bold text-green-600">{formatDuration(stats.totalDuration)}</div>
                <div className="text-xs text-gray-500">総処理時間</div>
              </div>
              <div className="text-center bg-purple-50 rounded-lg p-3">
                <div className="flex items-center justify-center mb-1">
                  <TrendingUp className="h-4 w-4 text-purple-500 mr-1" />
                </div>
                <div className="text-xl font-bold text-purple-600">{stats.successRate}%</div>
                <div className="text-xs text-gray-500">成功率</div>
              </div>
              <div className="text-center bg-orange-50 rounded-lg p-3">
                <div className="flex items-center justify-center mb-1">
                  <Users className="h-4 w-4 text-orange-500 mr-1" />
                </div>
                <div className="text-xl font-bold text-orange-600">2.3</div>
                <div className="text-xs text-gray-500">平均話者数</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API使用量 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              API使用量（今月）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-sm">音声認識API</div>
                  <div className="text-xs text-gray-500">{stats.apiCalls.speech} 回呼び出し</div>
                </div>
                <Badge variant="secondary">{formatCurrency(stats.costs.speech)}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-sm">LLM API</div>
                  <div className="text-xs text-gray-500">{stats.apiCalls.llm} 回呼び出し</div>
                </div>
                <Badge variant="secondary">{formatCurrency(stats.costs.llm)}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* コスト統計 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              コスト統計
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-4">
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.costs.total)}</div>
              <div className="text-sm text-gray-500">今月の総コスト</div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">音声認識</span>
                <div className="flex items-center">
                  <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(stats.costs.speech / stats.costs.total) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(stats.costs.speech)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">LLM・要約</span>
                <div className="flex items-center">
                  <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${(stats.costs.llm / stats.costs.total) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(stats.costs.llm)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-xs text-yellow-800">
                <strong>コスト節約のヒント:</strong>
                <br />• 短い音声ファイルは結合してから処理
                <br />• Deepgramなど低コストAPIの活用
                <br />• 不要な処理の削除
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      
      <BottomNavigation />
    </div>
  );
}