import '@testing-library/jest-dom';

// authService (usado por varios componentes) importa transitivamente el apiClient del shell,
// cuyo OfflineCacheManager llama a indexedDB.open() apenas se carga el módulo. JSDOM no trae
// indexedDB, así que sin este stub esa importación lanza un ReferenceError como unhandled
// rejection ajeno al test que esté corriendo en ese momento.
if (!('indexedDB' in globalThis)) {
  (globalThis as any).indexedDB = { open: () => ({}) };
}
