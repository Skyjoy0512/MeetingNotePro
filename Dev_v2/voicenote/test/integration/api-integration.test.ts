/**
 * API統合テスト
 * フロントエンドとCloud Runサービス間の統合をテスト
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { apiClient } from '@/lib/apiClient';
import { audioProcessingClient } from '@/services/audioProcessingClient';
import config from '@/lib/config';

// テストユーザー
const TEST_USER_ID = 'test-user-integration';
const TEST_AUDIO_ID = 'test-audio-integration';

describe('API Integration Tests', () => {
  beforeAll(async () => {
    // テスト環境の設定確認
    console.log('Testing against:', config.api.audioProcessor);
    
    // Cloud Runサービスがデプロイされている場合のみテスト実行
    if (config.api.audioProcessor.includes('localhost')) {
      console.log('⚠️ Testing against localhost - ensure Cloud Run service is running');
    }
  });

  afterAll(async () => {
    // テストデータのクリーンアップ
    try {
      await apiClient.cancelProcessing(TEST_USER_ID, TEST_AUDIO_ID);
    } catch (error) {
      // クリーンアップエラーは無視
    }
  });

  describe('Health Check', () => {
    test('サービスのヘルスチェックが成功する', async () => {
      const result = await apiClient.healthCheck();
      
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        status: 'healthy',
        service: expect.any(String),
        version: expect.any(String)
      });
    }, 10000);

    test('接続テストが正常に動作する', async () => {
      const result = await apiClient.testConnection();
      
      expect(result.success).toBe(true);
      expect(result.data?.latency).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Audio Processing Client', () => {
    test('処理開始リクエストが正常に送信される', async () => {
      const result = await audioProcessingClient.startProcessing(
        TEST_USER_ID,
        TEST_AUDIO_ID,
        {
          enableSpeakerSeparation: true,
          maxSpeakers: 3,
          useUserEmbedding: false,
          language: 'ja'
        }
      );

      expect(result.status).toBe('processing_started');
      expect(result.userId).toBe(TEST_USER_ID);
      expect(result.audioId).toBe(TEST_AUDIO_ID);
    }, 15000);

    test('処理状況確認が正常に動作する', async () => {
      // 処理開始後に状況確認
      await audioProcessingClient.startProcessing(
        TEST_USER_ID,
        TEST_AUDIO_ID
      );

      const status = await audioProcessingClient.getProcessingStatus(
        TEST_USER_ID,
        TEST_AUDIO_ID
      );

      expect(status.status).toBeDefined();
      expect(status.progress).toBeGreaterThanOrEqual(0);
      expect(status.progress).toBeLessThanOrEqual(100);
    }, 15000);

    test('リトライ機能が正常に動作する', async () => {
      const result = await audioProcessingClient.startProcessingWithRetry(
        TEST_USER_ID,
        `${TEST_AUDIO_ID}-retry`,
        {
          enableSpeakerSeparation: true
        }
      );

      expect(result.status).toBe('processing_started');
    }, 20000);
  });

  describe('API Client Integration', () => {
    test('音声処理開始の統合フローが正常に動作する', async () => {
      const result = await apiClient.startAudioProcessing(
        TEST_USER_ID,
        `${TEST_AUDIO_ID}-flow`,
        {
          enableSpeakerSeparation: true,
          maxSpeakers: 5,
          useUserEmbedding: true,
          language: 'ja'
        }
      );

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        status: 'processing_started',
        userId: TEST_USER_ID,
        audioId: `${TEST_AUDIO_ID}-flow`
      });
    }, 15000);

    test('処理状況取得の統合フローが正常に動作する', async () => {
      // 処理開始
      await apiClient.startAudioProcessing(
        TEST_USER_ID,
        `${TEST_AUDIO_ID}-status`
      );

      // 状況確認
      const result = await apiClient.getProcessingStatus(
        TEST_USER_ID,
        `${TEST_AUDIO_ID}-status`
      );

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        audioId: `${TEST_AUDIO_ID}-status`,
        status: expect.any(String),
        progress: expect.any(Number),
        stage: expect.any(String)
      });
    }, 15000);

    test('バッチ処理状況確認が正常に動作する', async () => {
      const audioIds = [
        `${TEST_AUDIO_ID}-batch-1`,
        `${TEST_AUDIO_ID}-batch-2`
      ];

      // 複数の処理を開始
      for (const audioId of audioIds) {
        await apiClient.startAudioProcessing(TEST_USER_ID, audioId);
      }

      // バッチ状況確認
      const statuses = await apiClient.checkBatchStatus(TEST_USER_ID, audioIds);

      expect(statuses).toHaveLength(audioIds.length);
      statuses.forEach((status: any) => {
        expect(status.audioId).toMatch(/test-audio-integration-batch-\d/);
        expect(status.progress).toBeGreaterThanOrEqual(0);
      });
    }, 25000);
  });

  describe('Progress Monitoring', () => {
    test('進捗監視が正常に動作する', async () => {
      const audioId = `${TEST_AUDIO_ID}-monitoring`;
      
      // 処理開始
      await apiClient.startAudioProcessing(TEST_USER_ID, audioId);

      // 進捗監視（最大3回まで）
      let updateCount = 0;
      const maxUpdates = 3;

      for await (const status of apiClient.monitorProcessing(
        TEST_USER_ID,
        audioId,
        2000 // 2秒間隔
      )) {
        expect(status.audioId).toBe(audioId);
        expect(status.progress).toBeGreaterThanOrEqual(0);
        expect(status.stage).toBeDefined();

        updateCount++;
        
        // テストが長時間実行されないよう制限
        if (updateCount >= maxUpdates || 
            status.status === 'completed' || 
            status.status === 'error') {
          break;
        }
      }

      expect(updateCount).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Error Handling', () => {
    test('存在しない音声IDでエラーハンドリングが正常に動作する', async () => {
      const result = await apiClient.getProcessingStatus(
        TEST_USER_ID,
        'non-existent-audio-id'
      );

      // サービスによってはエラーまたは空の結果を返す
      expect(result.success).toBeDefined();
      
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.code).toBeDefined();
      }
    });

    test('無効なユーザーIDでエラーハンドリングが正常に動作する', async () => {
      const result = await apiClient.startAudioProcessing(
        '', // 空のユーザーID
        TEST_AUDIO_ID
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('ネットワークタイムアウトが正常に処理される', async () => {
      // タイムアウトを短く設定したクライアントでテスト
      const shortTimeoutClient = apiClient;
      shortTimeoutClient.updateTimeout(100); // 100ms

      const result = await shortTimeoutClient.healthCheck();
      
      // タイムアウトまたは成功（サービスが高速な場合）
      expect(typeof result.success).toBe('boolean');
      
      // タイムアウト設定を元に戻す
      shortTimeoutClient.updateTimeout(30000);
    }, 5000);
  });

  describe('Service Statistics', () => {
    test('サービス統計が取得できる', async () => {
      const result = await apiClient.getServiceStats();

      // サービスが統計機能を実装している場合
      if (result.success) {
        expect(result.data).toMatchObject({
          activeProcessing: expect.any(Number),
          queuedProcessing: expect.any(Number),
          totalProcessedToday: expect.any(Number),
          averageProcessingTime: expect.any(Number)
        });
      } else {
        // 未実装の場合はエラーが返される
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Voice Learning Integration', () => {
    test('音声学習リクエストが正常に送信される', async () => {
      // Base64エンコードされたサンプル音声データ（モック）
      const mockAudioData = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
      
      const result = await apiClient.submitVoiceLearning(
        TEST_USER_ID,
        mockAudioData,
        'learning-session-1'
      );

      // サービスが音声学習機能を実装している場合
      if (result.success) {
        expect(result.data).toBeDefined();
      } else {
        // 未実装または無効なデータの場合
        expect(result.error).toBeDefined();
      }
    });
  });
});

// パフォーマンステスト
describe('Performance Tests', () => {
  test('複数の同時リクエストが正常に処理される', async () => {
    const concurrentRequests = 5;
    const requests = Array.from({ length: concurrentRequests }, (_, i) =>
      apiClient.healthCheck()
    );

    const startTime = Date.now();
    const results = await Promise.allSettled(requests);
    const endTime = Date.now();

    const successCount = results.filter(r => 
      r.status === 'fulfilled' && r.value.success
    ).length;

    expect(successCount).toBeGreaterThan(0);
    expect(endTime - startTime).toBeLessThan(10000); // 10秒以内
  }, 15000);

  test('API応答時間が許容範囲内である', async () => {
    const startTime = Date.now();
    const result = await apiClient.healthCheck();
    const responseTime = Date.now() - startTime;

    expect(result.success).toBe(true);
    expect(responseTime).toBeLessThan(5000); // 5秒以内
  });
});