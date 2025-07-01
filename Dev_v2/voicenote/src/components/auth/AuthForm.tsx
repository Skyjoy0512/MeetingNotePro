'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Mail } from 'lucide-react';

interface AuthFormProps {
  mode?: 'signin' | 'signup';
  onToggleMode?: () => void;
}

export const AuthForm = ({ mode = 'signin', onToggleMode }: AuthFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, loading, error, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (mode === 'signin') {
      await signInWithEmail(email, password);
    } else {
      await signUpWithEmail(email, password);
    }
  };

  const handleGoogleSignIn = async () => {
    clearError();
    await signInWithGoogle();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">
          {mode === 'signin' ? 'サインイン' : 'アカウント作成'}
        </CardTitle>
        <CardDescription className="text-center">
          {mode === 'signin' 
            ? 'VoiceNoteにサインインしてください' 
            : '新しいアカウントを作成してください'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
          </div>
          
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                処理中...
              </>
            ) : (
              mode === 'signin' ? 'サインイン' : 'アカウント作成'
            )}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">または</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <Mail className="mr-2 h-4 w-4" />
          Googleでサインイン
        </Button>

        <div className="text-center text-sm">
          {mode === 'signin' ? (
            <>
              アカウントをお持ちでない方は{' '}
              <button
                type="button"
                className="text-primary hover:underline font-medium"
                onClick={onToggleMode}
              >
                アカウント作成
              </button>
            </>
          ) : (
            <>
              既にアカウントをお持ちの方は{' '}
              <button
                type="button"
                className="text-primary hover:underline font-medium"
                onClick={onToggleMode}
              >
                サインイン
              </button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};