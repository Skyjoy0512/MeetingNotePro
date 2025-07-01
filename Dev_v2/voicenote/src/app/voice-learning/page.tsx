'use client';

import { MobileHeader } from '@/components/layout/MobileHeader';
import { BottomNavigation } from '@/components/navigation/BottomNavigation';
import { VoiceLearning } from '@/components/voice/VoiceLearning';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function VoiceLearningPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleLearningComplete = () => {
    toast({
      title: '音声学習完了',
      description: '音声学習が完了しました。話者分離の精度が向上します。',
    });
    
    // 3秒後にマイページに戻る
    setTimeout(() => {
      router.push('/profile');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <MobileHeader 
        title="音声学習" 
        showBack={true}
      />
      
      <main className="pt-14 px-4 pb-4">
        <VoiceLearning onLearningComplete={handleLearningComplete} />
      </main>
      
      <BottomNavigation />
    </div>
  );
}