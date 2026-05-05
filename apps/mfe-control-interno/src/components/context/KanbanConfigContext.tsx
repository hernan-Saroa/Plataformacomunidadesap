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
import { AUDITORIA_KANBAN_ETAPAS } from '../config/auditoriaKanbanCatalog';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface KanbanVisualConfig {
  mostrarContadores: boolean;
  mostrarTiempos: boolean;
  compactarVista: boolean;
}

export interface EtapaSLAConfig {
  nombre: string;
  slaDias: number;
  alertaPrevia: number; // Días antes de vencimiento para alertar
  notificacionesActivas: boolean;
  limiteWIP: number; // 999 = sin límite
  color: string;
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

// SLA defaults (matching current hardcoded etapas in ConfiguracionKanbanModule)
const SLA_DEFAULTS: Record<string, EtapaSLAConfig> = {
  'Plan Anual':                { nombre: 'Plan Anual',             slaDias: 15, alertaPrevia: 3, notificacionesActivas: true,  limiteWIP: 999, color: '#3B82F6' },
  'Planificación':             { nombre: 'Planificación',          slaDias: 15, alertaPrevia: 3, notificacionesActivas: true,  limiteWIP: 5,   color: '#3B82F6' },
  'Planeación':                { nombre: 'Planeación',             slaDias: 15, alertaPrevia: 3, notificacionesActivas: true,  limiteWIP: 5,   color: '#3B82F6' },
  'Ejecución':                 { nombre: 'Ejecución',              slaDias: 30, alertaPrevia: 5, notificacionesActivas: true,  limiteWIP: 5,   color: '#10B981' },
  'Comunicación Preliminar':   { nombre: 'Comunicación Preliminar',slaDias: 10, alertaPrevia: 2, notificacionesActivas: true,  limiteWIP: 999, color: '#F59E0B' },
  'Comunicación':              { nombre: 'Comunicación',           slaDias: 10, alertaPrevia: 2, notificacionesActivas: true,  limiteWIP: 999, color: '#F59E0B' },
  'Respuesta del Auditado':    { nombre: 'Respuesta del Auditado', slaDias: 15, alertaPrevia: 3, notificacionesActivas: true,  limiteWIP: 999, color: '#8B5CF6' },
  'Seguimiento':               { nombre: 'Seguimiento',            slaDias: 15, alertaPrevia: 3, notificacionesActivas: true,  limiteWIP: 999, color: '#8B5CF6' },
  'Informe Final':             { nombre: 'Informe Final',          slaDias: 10, alertaPrevia: 2, notificacionesActivas: true,  limiteWIP: 999, color: '#EC4899' },
  'Finalizada':                { nombre: 'Finalizada',             slaDias: 0,  alertaPrevia: 0, notificacionesActivas: false, limiteWIP: 999, color: '#6B7280' },
};

const STORAGE_KEY_VISUAL = 'kanban_config_general';
const STORAGE_KEY_SLA = 'kanban_sla_config';
const STORAGE_KEY_ETAPAS = 'kanban_etapas_config';

const ETAPAS_TABLERO_DEFAULT: EtapaKanbanTableroConfig[] = AUDITORIA_KANBAN_ETAPAS.map(
  (e, idx) => ({
    id: e.id,
    nombre: e.titulo,
    orden: idx + 1,
    color: e.accentColor,
    slaDias: e.diasEstimados,
  }),
);

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
  const [etapasKanban, setEtapasKanban] = useState<EtapaKanbanTableroConfig[]>(ETAPAS_TABLERO_DEFAULT);
  const [loaded, setLoaded] = useState(false);

  // Cargar configuración desde localStorage + backend
  useEffect(() => {
    // 1) Config visual
    try {
      const raw = localStorage.getItem(STORAGE_KEY_VISUAL);
      if (raw) {
        const parsed = JSON.parse(raw);
        setConfig({
          mostrarContadores: parsed.mostrarContadores ?? CONFIG_VISUAL_DEFAULT.mostrarContadores,
          mostrarTiempos: parsed.mostrarTiempos ?? CONFIG_VISUAL_DEFAULT.mostrarTiempos,
          compactarVista: parsed.compactarVista ?? CONFIG_VISUAL_DEFAULT.compactarVista,
        });
      }
    } catch {
      // Usar defaults
    }

    // 2) SLA config — load from localStorage (backed by ConfiguracionKanbanModule saves)
    try {
      const rawSLA = localStorage.getItem(STORAGE_KEY_SLA);
      if (rawSLA) {
        const parsed = JSON.parse(rawSLA) as Record<string, EtapaSLAConfig>;
        const map = new Map<string, EtapaSLAConfig>();
        Object.entries(parsed).forEach(([key, val]) => map.set(key, val));
        setSlasPorEtapa(map);
      } else {
        // Use defaults
        const map = new Map<string, EtapaSLAConfig>();
        Object.entries(SLA_DEFAULTS).forEach(([key, val]) => map.set(key, val));
        setSlasPorEtapa(map);
      }
    } catch {
      const map = new Map<string, EtapaSLAConfig>();
      Object.entries(SLA_DEFAULTS).forEach(([key, val]) => map.set(key, val));
      setSlasPorEtapa(map);
    }

    // 3) Etapas de tablero (ordenadas)
    try {
      const rawEtapas = localStorage.getItem(STORAGE_KEY_ETAPAS);
      if (rawEtapas) {
        const parsed = JSON.parse(rawEtapas) as EtapaKanbanTableroConfig[];
        const etapasOrdenadas = [...parsed].sort((a, b) => a.orden - b.orden);
        setEtapasKanban(etapasOrdenadas);
      } else {
        setEtapasKanban(ETAPAS_TABLERO_DEFAULT);
      }
    } catch {
      setEtapasKanban(ETAPAS_TABLERO_DEFAULT);
    }

    setLoaded(true);

    // Listen for storage changes from Config module
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_VISUAL && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setConfig(prev => ({ ...prev, ...parsed }));
        } catch { /* ignore */ }
      }
      if (e.key === STORAGE_KEY_SLA && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as Record<string, EtapaSLAConfig>;
          const map = new Map<string, EtapaSLAConfig>();
          Object.entries(parsed).forEach(([key, val]) => map.set(key, val));
          setSlasPorEtapa(map);
        } catch { /* ignore */ }
      }
      if (e.key === STORAGE_KEY_ETAPAS && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as EtapaKanbanTableroConfig[];
          setEtapasKanban([...parsed].sort((a, b) => a.orden - b.orden));
        } catch { /* ignore */ }
      }
    };

    window.addEventListener('storage', handleStorage);

    // Also listen for custom events (same-tab updates)
    const handleCustom = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_VISUAL);
        if (raw) setConfig(prev => ({ ...prev, ...JSON.parse(raw) }));
      } catch { /* ignore */ }
      try {
        const rawSLA = localStorage.getItem(STORAGE_KEY_SLA);
        if (rawSLA) {
          const parsed = JSON.parse(rawSLA) as Record<string, EtapaSLAConfig>;
          const map = new Map<string, EtapaSLAConfig>();
          Object.entries(parsed).forEach(([key, val]) => map.set(key, val));
          setSlasPorEtapa(map);
        }
      } catch { /* ignore */ }
      try {
        const rawEtapas = localStorage.getItem(STORAGE_KEY_ETAPAS);
        if (rawEtapas) {
          const parsed = JSON.parse(rawEtapas) as EtapaKanbanTableroConfig[];
          setEtapasKanban([...parsed].sort((a, b) => a.orden - b.orden));
        }
      } catch { /* ignore */ }
    };

    window.addEventListener('kanban-config-updated', handleCustom);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('kanban-config-updated', handleCustom);
    };
  }, []);

  // Calcular semáforo SLA para una auditoría
  const calcularSemaforoSLA = useCallback((etapaNombre: string, diasEnEtapa: number): SemaforoSLA => {
    // Normalizar el nombre buscando coincidencia parcial
    let slaConfig: EtapaSLAConfig | undefined;
    
    // Buscar exact match primero
    slaConfig = slasPorEtapa.get(etapaNombre);
    
    // Si no hay match exacto, buscar por inclusión parcial
    if (!slaConfig) {
      for (const [key, val] of slasPorEtapa.entries()) {
        if (etapaNombre.toLowerCase().includes(key.toLowerCase()) ||
            key.toLowerCase().includes(etapaNombre.toLowerCase())) {
          slaConfig = val;
          break;
        }
      }
    }

    // Si no encontramos config, buscar en defaults
    if (!slaConfig) {
      slaConfig = SLA_DEFAULTS[etapaNombre];
    }

    // Sin config → verde por defecto
    if (!slaConfig || slaConfig.slaDias <= 0) return 'verde';

    const diasRestantes = slaConfig.slaDias - diasEnEtapa;

    if (diasRestantes < 0) {
      return 'rojo'; // SLA vencido
    } else if (diasRestantes <= slaConfig.alertaPrevia) {
      return 'amarillo'; // Dentro del período de alerta
    }
    return 'verde'; // Dentro del tiempo
  }, [slasPorEtapa]);

  // Verificar WIP
  const verificarWIP = useCallback((etapaNombre: string, cantidadActual: number) => {
    let slaConfig: EtapaSLAConfig | undefined;
    slaConfig = slasPorEtapa.get(etapaNombre);
    
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
    // Fallback — return defaults when used outside provider
    return {
      config: CONFIG_VISUAL_DEFAULT,
      slasPorEtapa: new Map(Object.entries(SLA_DEFAULTS)),
      etapasKanban: ETAPAS_TABLERO_DEFAULT,
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
