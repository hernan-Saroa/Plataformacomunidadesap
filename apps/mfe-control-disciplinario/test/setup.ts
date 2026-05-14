import '@testing-library/jest-dom';
import { vi } from 'vitest';

Object.defineProperty(window, 'crypto', {
  configurable: true,
  value: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i += 1) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
});

Object.defineProperty(globalThis, 'crypto', {
  configurable: true,
  value: window.crypto,
});

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
