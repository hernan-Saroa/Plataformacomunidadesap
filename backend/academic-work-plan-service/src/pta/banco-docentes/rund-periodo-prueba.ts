import { BadRequestException } from '@nestjs/common';

/**
 * HU 2424 — Periodo de prueba docente y decisión del Comité Docente.
 * Reglas puras (sin base de datos) para que el listado, la alerta y el registro de la decisión
 * calculen siempre lo mismo.
 */

/** Código con el que el RUND guarda la vinculación «Periodo de prueba» (`normalizeTipoVinculacionCode`). */
export const PERIODO_PRUEBA_CODIGO = 'PERIODO_DE_PRUEBA';

/** Soporte de la decisión: mismo tipo técnico que el cambio de estado (acto administrativo o certificación). */
export const PERIODO_PRUEBA_TIPO_SOPORTE = 'soporte_cambio_estado_perfil';

/** Acción registrada en el historial del docente. */
export const PERIODO_PRUEBA_ACCION_AUDITORIA = 'DECISION_COMITE_PRUEBA';

export const RESULTADOS_COMITE = {
  SUPERA: 'Supera el periodo de prueba',
  NO_SUPERA: 'No supera el periodo de prueba',
} as const;

export type ResultadoComite = keyof typeof RESULTADOS_COMITE;

export interface DecisionPeriodoPrueba {
  resultado: ResultadoComite;
  resultadoEtiqueta: string;
  fechaComite: string;
  motivo: string | null;
  observacion: string | null;
  soporteId: string;
  soporteNombre: string | null;
  registradoPor: string;
  registradoEn: string;
  /** Valores previos a la decisión; permiten corregirla sin perder el punto de partida. */
  vinculacionAnterior: { codigo: string; etiqueta: string | null; regimenNormativo: string | null };
  estadoAnterior: string;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Acepta `YYYY-MM-DD` o un ISO completo y devuelve la fecha calendario válida (sin zona horaria). */
export function soloFecha(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  // `timestamp` sin zona: pg lo entrega como Date en hora local, así que se leen los componentes locales.
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  const text = String(value).trim();
  const match = ISO_DATE.exec(text.slice(0, 10));
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (date.getUTCFullYear() !== Number(y) || date.getUTCMonth() !== Number(m) - 1 || date.getUTCDate() !== Number(d)) return null;
  return `${y}-${m}-${d}`;
}

/** Fecha de hoy en Colombia (la zona operativa de la ESAP), no la del servidor. */
export function hoyColombia(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return parts;
}

/** RN-02 / CA-02: un año calendario después del inicio. El 29-feb pasa al 28-feb (igual que Postgres). */
export function fechaCumplimientoPrueba(inicio: unknown): string | null {
  const start = soloFecha(inicio);
  if (!start) return null;
  const [y, m, d] = start.split('-').map(Number);
  const year = y + 1;
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return `${year}-${String(m).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`;
}

/** Días entre hoy y la fecha de cumplimiento: positivo faltan, 0 es hoy, negativo ya venció. */
export function diasRestantesPrueba(cumplimiento: string | null, hoy: string = hoyColombia()): number | null {
  const end = soloFecha(cumplimiento);
  const today = soloFecha(hoy);
  if (!end || !today) return null;
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

export function esVinculacionPrueba(codigo: unknown): boolean {
  return String(codigo ?? '').trim().toUpperCase() === PERIODO_PRUEBA_CODIGO;
}

/** RN-03: pendiente = en prueba, activo, año cumplido y sin decisión registrada. */
export function pendienteDecisionComite(input: {
  vinculacionCodigo: unknown;
  estado: unknown;
  inicio: unknown;
  decision?: unknown;
  hoy?: string;
}): boolean {
  if (!esVinculacionPrueba(input.vinculacionCodigo)) return false;
  if (String(input.estado ?? 'ACTIVO').trim().toUpperCase() !== 'ACTIVO') return false;
  if (input.decision) return false;
  const dias = diasRestantesPrueba(fechaCumplimientoPrueba(input.inicio), input.hoy);
  return dias !== null && dias <= 0;
}

export interface DecisionComiteEntrada {
  resultado: ResultadoComite;
  fechaComite: string;
  motivo: string | null;
  observacion: string | null;
  soporteId: string;
}

/**
 * RN-04 / RN-05 / CA-06 / CA-07: valida la decisión y nombra TODOS los campos obligatorios que faltan.
 */
export function validarDecisionComite(body: any, hoy: string = hoyColombia()): DecisionComiteEntrada {
  const resultadoRaw = String(body?.resultado ?? '').trim().toUpperCase();
  const resultado = (['SUPERA', 'NO_SUPERA'] as const).find((code) => code === resultadoRaw);
  const fechaRaw = String(body?.fechaComite ?? '').trim();
  const fechaComite = soloFecha(fechaRaw);
  const motivo = String(body?.motivo ?? '').trim();
  const observacion = String(body?.observacion ?? '').trim();
  const soporteId = String(body?.soporteId ?? '').trim();

  const faltantes: string[] = [];
  if (!resultado) faltantes.push('resultado de la decisión');
  if (!fechaRaw) faltantes.push('fecha del comité');
  if (!soporteId) faltantes.push('soporte (acto administrativo o certificación)');
  if (resultado === 'NO_SUPERA' && motivo.length === 0) faltantes.push('motivo');
  if (faltantes.length) {
    const soloMotivo = faltantes.length === 1 && faltantes[0] === 'motivo';
    throw new BadRequestException({
      message: soloMotivo
        ? 'El motivo es obligatorio cuando el docente no supera el periodo de prueba.'
        : `Faltan campos obligatorios: ${faltantes.join(', ')}.`,
      columna: 'DECISION_COMITE_PRUEBA',
      camposFaltantes: faltantes,
      valorEsperado: 'Resultado, fecha del comité, soporte y, si no supera, motivo',
    });
  }
  if (!fechaComite) {
    throw new BadRequestException({
      message: 'La fecha del comité no es válida. Use el formato AAAA-MM-DD.',
      columna: 'FECHA_COMITE',
      datoErrado: fechaRaw,
      valorEsperado: 'Fecha válida AAAA-MM-DD',
    });
  }
  if (fechaComite > hoy) {
    throw new BadRequestException({
      message: 'La fecha del comité no puede ser posterior a hoy.',
      columna: 'FECHA_COMITE',
      datoErrado: fechaComite,
      valorEsperado: `Fecha igual o anterior a ${hoy}`,
    });
  }
  if (motivo.length > 1000 || observacion.length > 1000) {
    throw new BadRequestException('El motivo y la observación admiten máximo 1000 caracteres.');
  }
  return {
    resultado: resultado as ResultadoComite,
    fechaComite,
    motivo: motivo || null,
    observacion: observacion || null,
    soporteId,
  };
}
