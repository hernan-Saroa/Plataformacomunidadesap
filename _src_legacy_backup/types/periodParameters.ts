/**
 * Sistema de Parámetros de Período - ESAP PTA
 * Implementa REQ-MOD-PTA-002: Parametrización de periodicidad (semestral/anual)
 */

export type TipoPeriodo = 'SEMESTRAL' | 'ANUAL';

export interface ParametroPeriodo {
  id: string;
  tipoPeriodo: TipoPeriodo;
  horasTotales: number; // 800 para semestral, 1600 para anual
  periodoAcademico: string; // Ej: "2025-1", "2025-2", "2025"
  fechaInicio: Date;
  fechaFin: Date;
  activo: boolean;
  descripcion?: string;
  creadoPor: string;
  fechaCreacion: Date;
  modificadoPor?: string;
  fechaModificacion?: Date;
}

export interface ConfiguracionPeriodo {
  parametroActivo: ParametroPeriodo | null;
  historicoParametros: ParametroPeriodo[];
}

export interface RangosComponente {
  docencia: { min: number; max: number };
  investigacion: { min: number; max: number };
  extension: { min: number; max: number };
  complementarias: { min: number; max: number };
}

// Rangos por defecto según normativa ESAP
export const RANGOS_SEMESTRAL: RangosComponente = {
  docencia: { min: 40, max: 80 },
  investigacion: { min: 10, max: 50 },
  extension: { min: 5, max: 30 },
  complementarias: { min: 5, max: 25 },
};

export const RANGOS_ANUAL: RangosComponente = {
  docencia: { min: 40, max: 80 },
  investigacion: { min: 10, max: 50 },
  extension: { min: 5, max: 30 },
  complementarias: { min: 5, max: 25 },
};

export const HORAS_SEMESTRAL = 800;
export const HORAS_ANUAL = 1600;
