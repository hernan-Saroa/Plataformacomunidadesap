import { hoyColombiaISO } from './rundPeriodoPrueba';

/** HU 2349 — Ciclo de estados del docente (`ciclo` en el listado del Banco de Docentes). */
export type EtapaCiclo = 'CARGADO' | 'VALIDADO_CUMPLE' | 'VALIDADO_NO_CUMPLE' | 'ACTIVO' | 'INACTIVO';

export interface DecisionIncorporacion {
  resultado: 'FAVORABLE' | 'NO_FAVORABLE';
  resultadoEtiqueta: string;
  fechaComite: string;
  motivo: string | null;
  observacion: string | null;
  soporteNombre: string | null;
}

export interface CicloDocenteInfo {
  etapa: EtapaCiclo;
  etapaEtiqueta: string;
  puedeRegistrarComite: boolean;
  decision: DecisionIncorporacion | null;
}

export type EstadoRecategorizacion = 'EN_REVISION' | 'EN_COMITE' | 'APROBADA' | 'RECHAZADA';

export interface Recategorizacion {
  id: string;
  estado: EstadoRecategorizacion;
  estadoEtiqueta: string;
  justificacion: string;
  propuesta: { escalafon?: string; puntajeSalarial?: number | null };
  soporteIds: string[];
  revision: { resultado: 'CUMPLE' | 'NO_CUMPLE'; observacion: string | null; revisadoPor?: string; revisadoEn?: string } | null;
  decisionComite: { resultado: 'APROBADA' | 'RECHAZADA'; fechaComite: string; motivo: string | null; soporteNombre: string | null } | null;
  createdAt?: string;
}

export const MAX_SOPORTES_RECATEGORIZACION = 10;

export const RESULTADOS_INCORPORACION_OPCIONES = [
  { value: 'FAVORABLE', label: 'Decisión favorable: apto para incorporación' },
  { value: 'NO_FAVORABLE', label: 'Decisión no favorable' },
] as const;

const ETIQUETAS: Record<EtapaCiclo, string> = {
  CARGADO: 'Cargado / Elegible',
  VALIDADO_CUMPLE: 'Validado – Cumple',
  VALIDADO_NO_CUMPLE: 'Validado – No cumple',
  ACTIVO: 'Apto para incorporación / Activo',
  INACTIVO: 'Inactivo',
};

/** Colores del distintivo de etapa (fondo, texto, borde). */
export const ETAPA_COLORES: Record<EtapaCiclo, { bg: string; fg: string; border: string }> = {
  CARGADO: { bg: '#F3F4F6', fg: '#374151', border: '#D1D5DB' },
  VALIDADO_CUMPLE: { bg: '#EFF6FF', fg: '#1E40AF', border: '#BFDBFE' },
  VALIDADO_NO_CUMPLE: { bg: '#FEF2F2', fg: '#991B1B', border: '#FECACA' },
  ACTIVO: { bg: '#ECFDF5', fg: '#065F46', border: '#10B981' },
  INACTIVO: { bg: '#F3F4F6', fg: '#374151', border: '#D1D5DB' },
};

/** Etapa que devuelve el servidor; si falta (respuesta antigua), se deduce de lo que trae el listado. */
export function cicloDeDocente(docente: any): CicloDocenteInfo {
  const ciclo = docente?.ciclo;
  if (ciclo && ETIQUETAS[ciclo.etapa as EtapaCiclo]) {
    return { etapa: ciclo.etapa, etapaEtiqueta: ciclo.etapaEtiqueta || ETIQUETAS[ciclo.etapa as EtapaCiclo], puedeRegistrarComite: Boolean(ciclo.puedeRegistrarComite), decision: ciclo.decision ?? null };
  }
  const inactivo = String(docente?.estado || (docente?.activo === false ? 'INACTIVO' : 'ACTIVO')).toUpperCase() === 'INACTIVO';
  const aprobacion = String(docente?.estadoAprobacion || '').toUpperCase();
  const etapa: EtapaCiclo = inactivo ? 'INACTIVO' : aprobacion === 'ACTIVO_RUND' ? 'VALIDADO_CUMPLE' : aprobacion === 'DEVUELTO' ? 'VALIDADO_NO_CUMPLE' : 'CARGADO';
  return { etapa, etapaEtiqueta: ETIQUETAS[etapa], puedeRegistrarComite: etapa === 'VALIDADO_CUMPLE', decision: null };
}

export interface DecisionIncorporacionForm {
  resultado: string;
  fechaComite: string;
  motivo: string;
  tieneSoporte: boolean;
}

/** Mismos mensajes y reglas que el backend (CA-01: el soporte es obligatorio). */
export function validarDecisionIncorporacionForm(form: DecisionIncorporacionForm, hoy: string = hoyColombiaISO()): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.resultado !== 'FAVORABLE' && form.resultado !== 'NO_FAVORABLE') errors.resultado = 'Seleccione el resultado de la decisión.';
  if (!form.fechaComite) errors.fechaComite = 'La fecha del comité es obligatoria.';
  else if (form.fechaComite > hoy) errors.fechaComite = 'La fecha del comité no puede ser posterior a hoy.';
  if (!form.tieneSoporte) errors.soporte = 'Adjunte el soporte de la decisión del comité.';
  if (form.resultado === 'NO_FAVORABLE' && !form.motivo.trim()) errors.motivo = 'El motivo es obligatorio cuando la decisión no es favorable.';
  return errors;
}

export interface RecategorizacionForm {
  justificacion: string;
  escalafon: string;
  puntajeSalarial: string;
  cantidadSoportes: number;
}

export function validarRecategorizacionForm(form: RecategorizacionForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.justificacion.trim().length < 10) errors.justificacion = 'Explique la justificación con mínimo 10 caracteres.';
  if (!form.escalafon.trim()) errors.escalafon = 'Indique la categoría o escalafón propuesto.';
  if (form.cantidadSoportes < 1) errors.soportes = 'Adjunte al menos un soporte nuevo.';
  else if (form.cantidadSoportes > MAX_SOPORTES_RECATEGORIZACION) errors.soportes = `Máximo ${MAX_SOPORTES_RECATEGORIZACION} soportes por recategorización.`;
  const puntaje = form.puntajeSalarial.trim();
  if (puntaje) {
    const value = Number(puntaje.replace(',', '.'));
    if (!Number.isFinite(value) || value < 0 || value > 100000) errors.puntajeSalarial = 'El puntaje debe ser un número entre 0 y 100000.';
  }
  return errors;
}

/** Puntaje escrito por la persona → número (acepta coma decimal) o null si está vacío. */
export function parsePuntaje(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  const parsed = Number(text.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Solicitud abierta (en revisión o en comité) de una lista de recategorizaciones. */
export function recategorizacionAbierta(lista: Recategorizacion[] | null | undefined): Recategorizacion | null {
  return (lista || []).find((item) => item.estado === 'EN_REVISION' || item.estado === 'EN_COMITE') || null;
}

export interface DecisionRecategorizacionForm {
  resultado: string;
  fechaComite: string;
  motivo: string;
  tieneSoporte: boolean;
}

export function validarDecisionRecategorizacionForm(form: DecisionRecategorizacionForm, hoy: string = hoyColombiaISO()): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.resultado !== 'APROBADA' && form.resultado !== 'RECHAZADA') errors.resultado = 'Seleccione el resultado de la decisión.';
  if (!form.fechaComite) errors.fechaComite = 'La fecha del comité es obligatoria.';
  else if (form.fechaComite > hoy) errors.fechaComite = 'La fecha del comité no puede ser posterior a hoy.';
  if (!form.tieneSoporte) errors.soporte = 'Adjunte el soporte de la decisión del comité.';
  if (form.resultado === 'RECHAZADA' && !form.motivo.trim()) errors.motivo = 'El motivo es obligatorio cuando se rechaza la recategorización.';
  return errors;
}
