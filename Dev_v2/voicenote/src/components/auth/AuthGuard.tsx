'use client'

import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from './AuthForm';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, loading } = useAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">VoiceNote</h1>
            <p className="text-gray-600">AI音声文字起こし・話者分離サービス</p>
          </div>
          <AuthForm 
            mode={authMode} 
            onToggleMode={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};