'use client';

import { Button } from '@/components/ui/button';
import { Settings, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  showSettings?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const MobileHeader = ({ 
  title, 
  showBack = false, 
  showSettings = false,
  onBack,
  rightAction
}: MobileHeaderProps) => {
  const router = useRouter();

  const handleBack = () => {
    console.log('🔙 MobileHeader: Back button clicked');
    if (onBack) {
      console.log('🔙 MobileHeader: Using custom onBack callback');
      onBack();
    } else {
      console.log('🔙 MobileHeader: Navigating to home');
      window.location.href = '/';
    }
  };

  const handleSettings = () => {
    console.log('⚙️ MobileHeader: Settings button clicked');
    window.location.href = '/settings';
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40">
      <div className="flex items-center justify-between px-4 py-3 h-14">
        <div className="flex items-center">
          {showBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="p-2 mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            {title}
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          {rightAction}
          {showSettings && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSettings}
              className="p-2"
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};