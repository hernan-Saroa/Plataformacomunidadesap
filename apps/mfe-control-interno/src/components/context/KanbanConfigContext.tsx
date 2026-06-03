/**
 * ═══════════════════════════════════════════════════════════════════════════
 * KANBAN CONFIG CONTEXT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Context que conecta la Configuración del Kanban con el tablero real.
 * Lee la configuración de localStorage + SLAs del backend y la expone
 * para que GestionAuditoriasKanbanSimple.tsx la consuma.
 *
 * Configuraciones soportadas:
 * - mostrarContadores: muestra/oculta el conteo de tarjetas por columna
 * - mostrarTiempos: muestra/oculta los días que lleva cada auditoría en su etapa
 * - compactarVista: reduce el tamaño de las tarjetas
 * - SLA por etapa: usado para calcular el semáforo dinámico
 * - WIP por etapa: indica límites de trabajo en progreso
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useConfiguracionKanban } from '../services/useConfiguracionKanban';

// Tipos base para SLA (migrados desde useConfiguracionKanban si es necesario o definidos aquí)
export interface EtapaSLAConfig {
  nombre: string;
  slaDias: number;
  alertaPrevia: number;
  notificacionesActivas: boolean;
  limiteWIP: number;
  color: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface KanbanVisualConfig {
  mostrarContadores: boolean;
  mostrarTiempos: boolean;
  compactarVista: boolean;
}

export interface EtapaKanbanTableroConfig {
  id: string;
  nombre: string;
  orden: number;
  color: string;
  slaDias: number;
}

export type SemaforoSLA = 'verde' | 'amarillo' | 'rojo';

export interface KanbanConfigContextType {
  // Configuración visual
  config: KanbanVisualConfig;

  // SLA por etapa (mapa: nombreEtapa → config)
  slasPorEtapa: Map<string, EtapaSLAConfig>;

  // Etapas/columnas del tablero (ordenadas desde configuración backend)
  etapasKanban: EtapaKanbanTableroConfig[];

  // Función para calcular semáforo de una auditoría según su etapa y días en ella
  calcularSemaforoSLA: (etapaNombre: string, diasEnEtapa: number) => SemaforoSLA;

  // Función para verificar si una columna excede su WIP
  verificarWIP: (etapaNombre: string, cantidadActual: number) => { excede: boolean; limite: number; porcentaje: number };

  // Estado
  loaded: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG_VISUAL_DEFAULT: KanbanVisualConfig = {
  mostrarContadores: true,
  mostrarTiempos: true,
  compactarVista: false,
};

const STORAGE_KEY_VISUAL = 'kanban_config_general';

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const KanbanConfigContext = createContext<KanbanConfigContextType | null>(null);

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

export function KanbanConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<KanbanVisualConfig>(CONFIG_VISUAL_DEFAULT);
  const [slasPorEtapa, setSlasPorEtapa] = useState<Map<string, EtapaSLAConfig>>(new Map());
  const [etapasKanban, setEtapasKanban] = useState<EtapaKanbanTableroConfig[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Cargar configuración desde backend
  const cargarDesdeBackend = useCallback(async () => {
    try {
      // Cargar tablero y etapas desde la API backend
      const { tablerosKanbanService, TipoTablero } = await import('../../../../services/api/tablerosKanbanService');
      const tablero = await tablerosKanbanService.getByTipo(TipoTablero.AUDITORIAS);

      if (tablero) {
        // Cargar config visual (si existe en BD)
        if (tablero.configuracionVisual) {
          setConfig(prev => ({ ...prev, ...tablero.configuracionVisual }));
        }

        if (tablero.etapas) {
          const etapasOrdenadas = [...tablero.etapas].sort((a, b) => a.orden - b.orden);
        
        // Mapear al config de SLAs y Columnas
        const nuevoSlas = new Map<string, EtapaSLAConfig>();
        const nuevasColumnas: EtapaKanbanTableroConfig[] = [];

        for (const e of etapasOrdenadas) {
          if (e.visible === false) continue;

          // Convertir decimal de vuelta a días
          const slaDias = Math.floor(e.tiempoSLA);
          
          nuevoSlas.set(e.nombre, {
            nombre: e.nombre,
            slaDias: slaDias,
            alertaPrevia: e.diasAnticipacionAlerta,
            notificacionesActivas: e.notificarVencimiento,
            limiteWIP: e.limiteWIP || 999,
            color: e.color
          });

          nuevasColumnas.push({
            id: e.id,
            nombre: e.nombre,
            orden: e.orden,
            color: e.color,
            slaDias: slaDias
          });
        }

        setSlasPorEtapa(nuevoSlas);
        setEtapasKanban(nuevasColumnas);
        }
      }
    } catch (err) {
      console.error('Error cargando KanbanConfigContext desde backend', err);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    cargarDesdeBackend();

    // Refresh when config module broadcasts an update
    const handleCustom = () => cargarDesdeBackend();
    window.addEventListener('kanban-config-updated', handleCustom);
    
    return () => {
      window.removeEventListener('kanban-config-updated', handleCustom);
    };
  }, [cargarDesdeBackend]);

  // Calcular semáforo SLA para una auditoría
  const calcularSemaforoSLA = useCallback((etapaNombre: string, diasEnEtapa: number): SemaforoSLA => {
    let slaConfig = slasPorEtapa.get(etapaNombre);
    
    if (!slaConfig) {
      for (const [key, val] of slasPorEtapa.entries()) {
        if (etapaNombre.toLowerCase().includes(key.toLowerCase()) ||
            key.toLowerCase().includes(etapaNombre.toLowerCase())) {
          slaConfig = val;
          break;
        }
      }
    }

    if (!slaConfig || slaConfig.slaDias <= 0) return 'verde';

    const diasRestantes = slaConfig.slaDias - diasEnEtapa;

    if (diasRestantes < 0) return 'rojo'; // SLA vencido
    if (diasRestantes <= slaConfig.alertaPrevia) return 'amarillo'; // Dentro del período de alerta
    return 'verde'; // Dentro del tiempo
  }, [slasPorEtapa]);

  // Verificar WIP
  const verificarWIP = useCallback((etapaNombre: string, cantidadActual: number) => {
    let slaConfig = slasPorEtapa.get(etapaNombre);
    
    if (!slaConfig) {
      for (const [key, val] of slasPorEtapa.entries()) {
        if (etapaNombre.toLowerCase().includes(key.toLowerCase()) ||
            key.toLowerCase().includes(etapaNombre.toLowerCase())) {
          slaConfig = val;
          break;
        }
      }
    }

    const limite = slaConfig?.limiteWIP ?? 999;
    const porcentaje = limite < 999 ? Math.round((cantidadActual / limite) * 100) : 0;

    return {
      excede: limite < 999 && cantidadActual >= limite,
      limite,
      porcentaje,
    };
  }, [slasPorEtapa]);

  return (
    <KanbanConfigContext.Provider value={{ config, slasPorEtapa, etapasKanban, calcularSemaforoSLA, verificarWIP, loaded }}>
      {children}
    </KanbanConfigContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useKanbanConfig(): KanbanConfigContextType {
  const ctx = useContext(KanbanConfigContext);
  if (!ctx) {
    return {
      config: CONFIG_VISUAL_DEFAULT,
      slasPorEtapa: new Map(),
      etapasKanban: [],
      calcularSemaforoSLA: () => 'verde',
      verificarWIP: () => ({ excede: false, limite: 999, porcentaje: 0 }),
      loaded: false,
    };
  }
  return ctx;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Dispatch config update from Config module
// ═══════════════════════════════════════════════════════════════════════════

export function notificarCambioConfigKanban() {
  window.dispatchEvent(new CustomEvent('kanban-config-updated'));
}
