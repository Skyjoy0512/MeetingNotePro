/**
 * Jest テスト セットアップ
 */

import { beforeAll, afterAll } from '@jest/globals';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill for Node.js environment
global.TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Fetch polyfill for Node.js
if (!global.fetch) {
  global.fetch = require('node-fetch');
}

// Mock Firebase in test environment
jest.mock('../src/lib/firebase', () => ({
  app: {},
  auth: {},
  db: {},
  storage: {},
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Test environment configuration
beforeAll(() => {
  // Set test environment variables
  Object.assign(process.env, {
    NODE_ENV: 'test',
    NEXT_PUBLIC_AUDIO_PROCESSOR_URL: 'http://localhost:8080'
  });
  
  console.log('🧪 Test environment initialized');
});

afterAll(() => {
  console.log('🧪 Test environment cleaned up');
});