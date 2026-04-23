// apps/shell/src/services/api/offlineCache.ts

const DB_NAME = 'esap_offline_db';
const CACHE_STORE = 'api_cache';
const MUTATION_STORE = 'mutation_queue';
const DB_VERSION = 1;

export interface QueuedMutation {
  id: string;
  url: string;
  method: string;
  body: string;
  headers: Record<string, string>;
  timestamp: number;
}

class OfflineCacheManager {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('OfflineCache: Error al abrir IndexedDB', event);
        reject('IndexedDB Error');
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Almacén para caché de GET (clave: url de la API)
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE, { keyPath: 'url' });
        }
        
        // Almacén para cola de mutaciones POST/PUT/PATCH/DELETE
        if (!db.objectStoreNames.contains(MUTATION_STORE)) {
          db.createObjectStore(MUTATION_STORE, { keyPath: 'id' });
        }
      };
    });

    return this.dbPromise;
  }

  // ==========================================================================
  // CACHÉ DE RESPUESTAS (GET)
  // ==========================================================================

  async getCache(url: string): Promise<any | null> {
    try {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([CACHE_STORE], 'readonly');
        const store = transaction.objectStore(CACHE_STORE);
        const request = store.get(url);

        request.onsuccess = () => {
          resolve(request.result ? request.result.data : null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('OfflineCache: Error obteniendo caché', e);
      return null;
    }
  }

  async setCache(url: string, data: any): Promise<void> {
    try {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([CACHE_STORE], 'readwrite');
        const store = transaction.objectStore(CACHE_STORE);
        
        const record = {
          url,
          data,
          timestamp: Date.now()
        };
        
        const request = store.put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('OfflineCache: Error guardando en caché', e);
    }
  }

  // ==========================================================================
  // COLA DE MUTACIONES OFFLINE
  // ==========================================================================

  async queueMutation(url: string, method: string, body: any, headers: any): Promise<void> {
    try {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([MUTATION_STORE], 'readwrite');
        const store = transaction.objectStore(MUTATION_STORE);
        
        const mutation: QueuedMutation = {
          id: `mutation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url,
          method,
          body: typeof body === 'string' ? body : JSON.stringify(body),
          headers,
          timestamp: Date.now()
        };
        
        const request = store.put(mutation);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('OfflineCache: Error encolando mutación', e);
    }
  }

  async getQueuedMutations(): Promise<QueuedMutation[]> {
    try {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([MUTATION_STORE], 'readonly');
        const store = transaction.objectStore(MUTATION_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
          // Devolver ordenados por timestamp ascendente (FIFO)
          const results = request.result || [];
          results.sort((a, b) => a.timestamp - b.timestamp);
          resolve(results);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('OfflineCache: Error obteniendo cola de mutaciones', e);
      return [];
    }
  }

  async clearMutation(id: string): Promise<void> {
    try {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([MUTATION_STORE], 'readwrite');
        const store = transaction.objectStore(MUTATION_STORE);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('OfflineCache: Error limpiando mutación', e);
    }
  }
}

export const offlineCache = new OfflineCacheManager();
