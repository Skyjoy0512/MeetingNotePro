'use client'

import { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth, hasValidConfig, isDemoMode } from '@/lib/firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  // Firebase認証状態の監視
  useEffect(() => {
    if (isDemoMode) {
      // デモモード: 即座にデモユーザーを設定
      const demoUser: AuthUser = {
        uid: 'demo-user-123',
        email: 'demo@voicenote.com',
        displayName: 'デモユーザー',
        photoURL: null,
      };
      
      setState({
        user: demoUser,
        loading: false,
        error: null
      });
      
      console.log('🎭 Demo mode: Using demo user');
      return;
    }

    // 実際のFirebase認証
    console.log('🔐 Setting up Firebase auth listener');
    
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      console.log('🔐 Auth state changed:', user ? user.uid : 'no user');
      
      if (user) {
        const authUser: AuthUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        };
        
        setState({
          user: authUser,
          loading: false,
          error: null
        });
      } else {
        setState({
          user: null,
          loading: false,
          error: null
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    if (isDemoMode) {
      console.log('🎭 Demo mode: Simulating email sign-in');
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Email sign-in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'ログインに失敗しました';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (isDemoMode) {
      console.log('🎭 Demo mode: Simulating email sign-up');
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Email sign-up error:', error);
      const errorMessage = error instanceof Error ? error.message : 'アカウント作成に失敗しました';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
    }
  };

  const signInWithGoogle = async () => {
    if (isDemoMode) {
      console.log('🎭 Demo mode: Simulating Google sign-in');
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Google sign-in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Googleログインに失敗しました';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
    }
  };

  const logout = async () => {
    if (isDemoMode) {
      console.log('🎭 Demo mode: Simulating logout');
      return;
    }

    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'ログアウトに失敗しました';
      setState(prev => ({ ...prev, error: errorMessage }));
    }
  };

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  return {
    ...state,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    logout,
    clearError
  };
};