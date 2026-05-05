/**
 * usePTARealtimeSync — Hook de sincronización en tiempo real para el módulo PTA
 * 
 * Estrategia: Lightweight polling con smart-diff
 * - Consulta /pta/sync/status cada N segundos (un GET liviano)
 * - Si el counter cambió desde la última vez, dispara onDataChanged
 * - Opcional: obtiene eventos recientes para mostrar toast/notificaciones
 * 
 * Usado tanto por Backoffice como por Portal Docente para detectar
 * cambios cruzados en tiempo real.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getPTASyncStatus, getPTARecentEvents, markPTAEventsRead } from '../services/api/ptaApi';

export interface PTASyncEvent {
  id: string;
  tipo: string;
  pta_id: string;
  docente_id?: string;
  docente_nombre?: string;
  estado_anterior?: string;
  estado_nuevo: string;
  actor: string;
  actor_rol: string;
  sistema_origen: string;
  mensaje?: string;
  timestamp: string;
  leido_backoffice: boolean;
  leido_portal: boolean;
}

export interface UsePTARealtimeSyncOptions {
  /** 'backoffice' | 'portal' */
  sistema: 'backoffice' | 'portal';
  /** Polling interval in ms (default: 10000 = 10s) */
  interval?: number;
  /** Only fetch events for this docente (portal mode) */
  docenteId?: string;
  /** Callback when new data is detected */
  onDataChanged?: (events: PTASyncEvent[]) => void;
  /** Whether sync is enabled */
  enabled?: boolean;
}

export interface PTASyncState {
  /** Whether the sync system is actively polling */
  isConnected: boolean;
  /** Last known sync counter */
  lastCounter: number;
  /** Recent unread events */
  unreadEvents: PTASyncEvent[];
  /** Total unread count */
  unreadCount: number;
  /** Last sync timestamp */
  lastSyncTime: string | null;
  /** Time since last successful poll in seconds */
  secondsSinceLastSync: number;
  /** Whether currently polling */
  isPolling: boolean;
  /** Force refresh */
  forceRefresh: () => void;
  /** Mark events as read */
  markRead: (eventIds: string[]) => void;
  /** Mark all as read */
  markAllRead: () => void;
}

export function usePTARealtimeSync(options: UsePTARealtimeSyncOptions): PTASyncState {
  const {
    sistema,
    interval = 10000,
    docenteId,
    onDataChanged,
    enabled = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastCounter, setLastCounter] = useState(0);
  const [unreadEvents, setUnreadEvents] = useState<PTASyncEvent[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [secondsSinceLastSync, setSecondsSinceLastSync] = useState(0);
  const [isPolling, setIsPolling] = useState(false);

  const counterRef = useRef(0);
  const lastEventTimestampRef = useRef<string>('');
  const pollIntervalRef = useRef<any>(null);
  const tickIntervalRef = useRef<any>(null);
  const onDataChangedRef = useRef(onDataChanged);
  const abortControllerRef = useRef<AbortController | null>(null);
  const consecutiveFailuresRef = useRef(0);
  const mountedRef = useRef(true);
  onDataChangedRef.current = onDataChanged;

  const checkForUpdates = useCallback(async () => {
    if (!enabled || !mountedRef.current) return;

    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsPolling(true);
    try {
      const res = await getPTASyncStatus(controller.signal);

      // If component unmounted during fetch, bail out
      if (!mountedRef.current || controller.signal.aborted) return;

      if (res.success && res.data) {
        const serverCounter = res.data.counter || 0;
        setIsConnected(true);
        setLastSyncTime(new Date().toISOString());
        setSecondsSinceLastSync(0);
        consecutiveFailuresRef.current = 0; // Reset backoff on success

        // Detect changes
        if (serverCounter !== counterRef.current && counterRef.current > 0) {
          console.log(`[PTA Sync] Change detected! Counter: ${counterRef.current} → ${serverCounter}`);

          // Fetch recent events
          const eventsRes = await getPTARecentEvents(
            lastEventTimestampRef.current || undefined,
            docenteId,
            controller.signal
          );

          if (!mountedRef.current || controller.signal.aborted) return;

          if (eventsRes.success && eventsRes.data?.events?.length > 0) {
            const newEvents = eventsRes.data.events as PTASyncEvent[];
            // Filter out events from our own system if needed
            const crossSystemEvents = newEvents.filter(e => e.sistema_origen !== sistema);

            if (crossSystemEvents.length > 0) {
              setUnreadEvents(prev => {
                const existingIds = new Set(prev.map(e => e.id));
                const truly_new = crossSystemEvents.filter(e => !existingIds.has(e.id));
                return [...truly_new, ...prev].slice(0, 50);
              });

              // Callback
              onDataChangedRef.current?.(crossSystemEvents);
            }

            // Update timestamp reference
            if (newEvents[0]?.timestamp) {
              lastEventTimestampRef.current = newEvents[0].timestamp;
            }
          }
        }

        counterRef.current = serverCounter;
        setLastCounter(serverCounter);
      } else if (res._networkError) {
        // Network error — apply backoff
        consecutiveFailuresRef.current += 1;
        setIsConnected(false);
      }
    } catch (error: any) {
      if (error?.name === 'AbortError' || !mountedRef.current) return;
      console.warn('[PTA Sync] Poll error:', error?.message);
      consecutiveFailuresRef.current += 1;
      setIsConnected(false);
    } finally {
      if (mountedRef.current) {
        setIsPolling(false);
      }
    }
  }, [enabled, sistema, docenteId]);

  // Start polling with adaptive interval (backoff on failures)
  useEffect(() => {
    if (!enabled) return;
    mountedRef.current = true;

    // Initial check with a small delay to let the app settle
    const initialDelay = setTimeout(() => {
      if (mountedRef.current) checkForUpdates();
    }, 1500);

    // Adaptive polling: increase interval on consecutive failures (max 60s)
    const getEffectiveInterval = () => {
      const failures = consecutiveFailuresRef.current;
      if (failures === 0) return interval;
      // Exponential backoff: 10s, 20s, 40s, capped at 60s
      return Math.min(interval * Math.pow(2, failures), 60000);
    };

    // Use a recursive setTimeout instead of setInterval for adaptive timing
    let pollTimeout: any = null;
    const schedulePoll = () => {
      const effectiveInterval = getEffectiveInterval();
      pollTimeout = setTimeout(() => {
        if (mountedRef.current) {
          checkForUpdates().finally(() => {
            if (mountedRef.current) schedulePoll();
          });
        }
      }, effectiveInterval);
    };

    // Start the adaptive polling chain after initial check
    const startPolling = setTimeout(() => {
      if (mountedRef.current) schedulePoll();
    }, 2000 + interval);

    // Set up seconds counter
    tickIntervalRef.current = setInterval(() => {
      setSecondsSinceLastSync(prev => prev + 1);
    }, 1000);

    return () => {
      mountedRef.current = false;
      clearTimeout(initialDelay);
      clearTimeout(startPolling);
      if (pollTimeout) clearTimeout(pollTimeout);
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [enabled, interval, checkForUpdates]);

  const forceRefresh = useCallback(() => {
    consecutiveFailuresRef.current = 0; // Reset backoff on manual refresh
    checkForUpdates();
  }, [checkForUpdates]);

  const markRead = useCallback(async (eventIds: string[]) => {
    await markPTAEventsRead(eventIds, sistema);
    setUnreadEvents(prev => prev.filter(e => !eventIds.includes(e.id)));
  }, [sistema]);

  const markAllRead = useCallback(async () => {
    const ids = unreadEvents.map(e => e.id);
    if (ids.length > 0) {
      await markPTAEventsRead(ids, sistema);
    }
    setUnreadEvents([]);
  }, [unreadEvents, sistema]);

  return {
    isConnected,
    lastCounter,
    unreadEvents,
    unreadCount: unreadEvents.length,
    lastSyncTime,
    secondsSinceLastSync,
    isPolling,
    forceRefresh,
    markRead,
    markAllRead,
  };
}