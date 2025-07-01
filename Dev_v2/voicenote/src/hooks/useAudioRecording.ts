'use client'

import { useState, useRef, useCallback, useEffect } from 'react';

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevel: number;
  error: string | null;
  recordedBlob: Blob | null;
}

export const useAudioRecording = () => {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioLevel: 0,
    error: null,
    recordedBlob: null
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<number | null>(null);
  const levelAnimationRef = useRef<number | null>(null);

  // 音声レベル監視
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const normalizedLevel = Math.min(100, (average / 128) * 100);
    
    setState(prev => ({ ...prev, audioLevel: normalizedLevel }));
    
    levelAnimationRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  // 録音開始
  const startRecording = useCallback(async () => {
    try {
      console.log('Starting recording...');
      
      // 既存の録音データをクリア
      chunksRef.current = [];
      setState(prev => ({ 
        ...prev, 
        error: null, 
        recordedBlob: null,
        duration: 0,
        audioLevel: 0 
      }));

      // ブラウザ対応チェック
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('このブラウザは音声録音に対応していません');
      }

      console.log('Requesting microphone access...');
      
      // マイクアクセス
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      console.log('Microphone access granted');

      streamRef.current = stream;

      // 音声解析セットアップ
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // MediaRecorderセットアップ - ブラウザ対応形式を確認
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/wav';
          }
        }
      }

      console.log('Using MIME type:', mimeType);
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setState(prev => ({ ...prev, recordedBlob: blob }));
      };

      // 録音開始
      mediaRecorder.start(1000); // 1秒間隔でデータを取得
      startTimeRef.current = Date.now();

      setState(prev => ({ 
        ...prev, 
        isRecording: true,
        isPaused: false
      }));

      // 時間更新を開始
      durationIntervalRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setState(prev => ({ ...prev, duration: elapsed }));
      }, 100);

      // 音声レベル監視を開始
      const startLevelMonitoring = () => {
        if (analyserRef.current && state.isRecording && !state.isPaused) {
          updateAudioLevel();
        }
      };
      startLevelMonitoring();

    } catch (error) {
      console.error('Recording start failed:', error);
      
      let errorMessage = '録音の開始に失敗しました';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'マイクへのアクセスが拒否されました。ブラウザの設定でマイクアクセスを許可してください。';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'マイクが見つかりません。マイクが接続されているか確認してください。';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'このブラウザは音声録音に対応していません。';
        } else {
          errorMessage = error.message;
        }
      }
      
      setState(prev => ({ ...prev, error: errorMessage }));
    }
  }, [updateAudioLevel]);

  // 録音停止
  const stopRecording = useCallback(() => {
    console.log('Stopping recording...');
    
    if (mediaRecorderRef.current && (state.isRecording || mediaRecorderRef.current.state === 'recording')) {
      mediaRecorderRef.current.stop();
    }

    // ストリームを停止
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // AudioContextを閉じる
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // タイマーをクリア
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // アニメーションをクリア
    if (levelAnimationRef.current) {
      cancelAnimationFrame(levelAnimationRef.current);
      levelAnimationRef.current = null;
    }

    setState(prev => ({ 
      ...prev, 
      isRecording: false,
      isPaused: false,
      audioLevel: 0
    }));
  }, []);

  // 録音一時停止
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
      mediaRecorderRef.current.pause();
      setState(prev => ({ ...prev, isPaused: true }));
      
      // タイマーを停止
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  }, [state.isRecording, state.isPaused]);

  // 録音再開
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && state.isPaused) {
      mediaRecorderRef.current.resume();
      setState(prev => ({ ...prev, isPaused: false }));
      
      // タイマーを再開
      const pausedTime = state.duration;
      startTimeRef.current = Date.now() - (pausedTime * 1000);
      
      durationIntervalRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setState(prev => ({ ...prev, duration: elapsed }));
      }, 100);

      // 音声レベル監視を再開
      updateAudioLevel();
    }
  }, [state.isRecording, state.isPaused, state.duration, updateAudioLevel]);

  // Blobをファイルに変換
  const createAudioFile = useCallback((filename: string = 'recording.webm'): File | null => {
    if (!state.recordedBlob) return null;
    
    return new File([state.recordedBlob], filename, {
      type: 'audio/webm',
      lastModified: Date.now()
    });
  }, [state.recordedBlob]);

  // リセット
  const reset = useCallback(() => {
    stopRecording();
    chunksRef.current = [];
    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioLevel: 0,
      error: null,
      recordedBlob: null
    });
  }, [stopRecording]);

  // エラークリア
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    createAudioFile,
    reset,
    clearError
  };
};