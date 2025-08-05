// 테스트 설정 파일

import { beforeEach, afterEach, vi } from 'vitest';

// 전역 설정
beforeEach(() => {
  // 각 테스트 전에 실행할 설정
  vi.clearAllMocks();
  vi.clearAllTimers();
  
  // 콘솔 로그 출력 제한 (테스트 실행 시 노이즈 감소)
  if (process.env.NODE_ENV === 'test') {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  }
});

afterEach(() => {
  // 각 테스트 후에 실행할 정리
  vi.restoreAllMocks();
});

// WebSocket 모킹
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}));

// localStorage 모킹
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Date.now 모킹 (테스트 일관성을 위해)
const mockDateNow = vi.fn(() => 1234567890000);
vi.stubGlobal('Date', {
  ...Date,
  now: mockDateNow
});