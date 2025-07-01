'use client'

import { useState, useEffect } from 'react';

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
  // 即座にデモユーザーを返す（ローディング無し）
  const demoUser: AuthUser = {
    uid: 'demo-user-123',
    email: 'demo@voicenote.com',
    displayName: 'デモユーザー',
    photoURL: null,
  };

  const [state] = useState<AuthState>({
    user: demoUser,
    loading: false, // 即座にロード完了
    error: null
  });

  const signInWithEmail = async (email: string, password: string) => {
    console.log('🎭 useAuth: Demo signInWithEmail called');
    // デモモードでは何もしない
  };

  const signUpWithEmail = async (email: string, password: string) => {
    console.log('🎭 useAuth: Demo signUpWithEmail called');
    // デモモードでは何もしない
  };

  const signInWithGoogle = async () => {
    console.log('🎭 useAuth: Demo signInWithGoogle called');
    // デモモードでは何もしない
  };

  const logout = async () => {
    console.log('🎭 useAuth: Demo logout called');
    // デモモードでは何もしない
  };

  const clearError = () => {
    console.log('🎭 useAuth: Demo clearError called');
    // デモモードでは何もしない
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