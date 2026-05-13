import '@testing-library/jest-dom';

// Polyfill crypto for Node 16 compatibility
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
});

Object.defineProperty(globalThis, 'crypto', {
  value: window.crypto,
});