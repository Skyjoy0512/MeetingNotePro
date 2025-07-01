'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { databaseService } from '@/services/database';

export const DebugPanel = () => {
  const [audioId, setAudioId] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const { user } = useAuth();
  const router = useRouter();

  const handleSearch = async () => {
    if (!user?.uid || !audioId) return;

    try {
      console.log('🐛 Debug search for:', audioId);
      const result = await databaseService.getAudioFile(user.uid, audioId);
      setSearchResult(result);
      console.log('🐛 Search result:', result);
    } catch (error) {
      console.error('🐛 Search error:', error);
      setSearchResult({ error: String(error) });
    }
  };

  const handleNavigate = () => {
    if (!audioId) return;
    const encodedId = encodeURIComponent(audioId);
    router.push(`/audio-detail?id=${encodedId}`);
  };

  return (
    <Card className="mt-4 bg-yellow-50 border-yellow-200">
      <CardHeader>
        <CardTitle className="text-sm text-yellow-800">デバッグパネル</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex space-x-2">
          <Input
            placeholder="音声ファイルID"
            value={audioId}
            onChange={(e) => setAudioId(e.target.value)}
            className="text-xs"
          />
          <Button onClick={handleSearch} size="sm" variant="outline">
            検索
          </Button>
          <Button onClick={handleNavigate} size="sm">
            遷移
          </Button>
        </div>
        
        {searchResult && (
          <div className="bg-white p-2 rounded border text-xs">
            <pre>{JSON.stringify(searchResult, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};