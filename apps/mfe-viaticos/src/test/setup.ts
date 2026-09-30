import '@testing-library/jest-dom';

if (typeof window !== 'undefined' && typeof window.indexedDB === 'undefined') {
  (window as any).indexedDB = {
    open: () => {
      const req: any = {};
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess({ target: req });
      }, 0);
      return req;
    },
  };
  (globalThis as any).indexedDB = (window as any).indexedDB;
}
