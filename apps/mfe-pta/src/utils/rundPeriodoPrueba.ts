/** HU 2424 — Datos del periodo de prueba que devuelve el listado del Banco de Docentes (`periodo_prueba`). */
export interface PeriodoPruebaDecision {
  resultado: 'SUPERA' | 'NO_SUPERA';
  resultadoEtiqueta: string;
  fechaComite: string;
  motivo: string | null;
  observacion: string | null;
  soporteNombre: string | null;
  registradoPor?: string;
  registradoEn?: string;
}

export interface PeriodoPruebaInfo {
  en_periodo_prueba: boolean;
  inicio: string | null;
  cumplimiento: string | null;
  dias_restantes: number | null;
  pendiente_decision: boolean;
  decision: PeriodoPruebaDecision | null;
}

export const RESULTADOS_COMITE_OPCIONES = [
  { value: 'SUPERA', label: 'Supera el periodo de prueba' },
  { value: 'NO_SUPERA', label: 'No supera el periodo de prueba' },
] as const;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

/** `2026-11-15` → `15/11/2026`. Sin usar Date para no mover el día por la zona horaria. */
export function formatFechaPrueba(value: string | null | undefined): string {
  const match = ISO_DATE.exec(String(value ?? ''));
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '—';
}

/** Texto de los días restantes: «Faltan 3 días», «Se cumple hoy», «Vencido hace 2 días». */
export function diasRestantesTexto(dias: number | null | undefined): string {
  if (dias === null || dias === undefined || Number.isNaN(dias)) return 'Sin fecha de inicio';
  if (dias === 0) return 'Se cumple hoy';
  const abs = Math.abs(dias);
  const unidad = abs === 1 ? 'día' : 'días';
  return dias > 0 ? `Faltan ${abs} ${unidad}` : `Vencido hace ${abs} ${unidad}`;
}

/** Fecha de hoy en Colombia en formato AAAA-MM-DD (tope de la fecha del comité). */
export function hoyColombiaISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export interface DecisionComiteForm {
  resultado: string;
  fechaComite: string;
  motivo: string;
  tieneSoporte: boolean;
}

/** Mismos mensajes que el backend (RN-05, CA-06, CA-07). Devuelve un mapa campo → mensaje. */
export function validarDecisionComiteForm(form: DecisionComiteForm, hoy: string = hoyColombiaISO()): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.resultado !== 'SUPERA' && form.resultado !== 'NO_SUPERA') errors.resultado = 'Seleccione el resultado de la decisión.';
  if (!form.fechaComite) errors.fechaComite = 'La fecha del comité es obligatoria.';
  else if (form.fechaComite > hoy) errors.fechaComite = 'La fecha del comité no puede ser posterior a hoy.';
  if (!form.tieneSoporte) errors.soporte = 'Adjunte el soporte (acto administrativo o certificación).';
  if (form.resultado === 'NO_SUPERA' && !form.motivo.trim()) errors.motivo = 'El motivo es obligatorio cuando el docente no supera el periodo de prueba.';
  return errors;
}
