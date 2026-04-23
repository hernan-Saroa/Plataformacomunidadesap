// apps/shell/src/services/api/syncEngine.ts

import { offlineCache } from './offlineCache';
import { toast } from 'sonner';

class SyncEngine {
  private isSyncing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
    }
  }

  private handleOnline() {
    console.log('SyncEngine: Conexión restaurada, intentando sincronizar...');
    this.syncOfflineMutations();
  }

  async syncOfflineMutations() {
    if (this.isSyncing) return;
    
    // Si no hay conexión real, abortar
    if (!navigator.onLine) return;

    this.isSyncing = true;

    try {
      const queue = await offlineCache.getQueuedMutations();
      
      if (queue.length === 0) {
        this.isSyncing = false;
        return;
      }

      console.log(`SyncEngine: Sincronizando ${queue.length} peticiones encoladas...`);
      toast.info('Restaurando conexión', {
        description: `Sincronizando ${queue.length} cambios pendientes...`
      });

      let successCount = 0;
      let errorCount = 0;

      for (const mutation of queue) {
        try {
          // Re-enviar la petición original usando fetch directamente
          // para no pasar de nuevo por el interceptor del apiClient
          const response = await fetch(mutation.url, {
            method: mutation.method,
            body: mutation.body,
            headers: mutation.headers,
          });

          if (response.ok) {
            // Eliminar de la cola si fue exitosa
            await offlineCache.clearMutation(mutation.id);
            successCount++;
          } else {
            // Si el backend da un 4xx/5xx, aún así la sacamos de la cola
            // porque no queremos bloquear la cola por siempre con una petición inválida
            console.error('SyncEngine: Petición rechazada por el servidor', mutation.url, response.status);
            await offlineCache.clearMutation(mutation.id);
            errorCount++;
          }
        } catch (e) {
          // Si el fetch falla (ej. se volvió a caer el internet), abortar el ciclo
          console.error('SyncEngine: Falló la conexión durante la sincronización', e);
          this.isSyncing = false;
          return; // Salimos de la función, se intentará de nuevo en el próximo evento 'online'
        }
      }

      if (successCount > 0) {
        toast.success('Sincronización completada', {
          description: `Se han sincronizado ${successCount} cambios con el servidor.`,
          duration: 5000
        });
      }
      if (errorCount > 0) {
        toast.warning('Sincronización parcial', {
          description: `Hubo problemas al guardar ${errorCount} cambios. Verifica tus datos recientes.`
        });
      }

    } catch (e) {
      console.error('SyncEngine: Error grave durante sincronización', e);
    } finally {
      this.isSyncing = false;
      // Emitir un evento para que las vistas puedan refrescar sus datos si es necesario
      window.dispatchEvent(new CustomEvent('esap:sync_completed'));
    }
  }
}

export const syncEngine = new SyncEngine();
