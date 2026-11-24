import { BadRequestException } from '@nestjs/common';
import { hoyColombia, soloFecha } from './rund-periodo-prueba';

/**
 * HU 2349 — Ciclo de estados del docente.
 * Cargado / Elegible → (revisión documental del GGP) → Validado → Comité Docente → Apto para incorporación / Activo.
 * Un docente activo puede pasar a Inactivo y reactivarse; la recategorización pasa por revisión y comité.
 * Reglas puras (sin base de datos) para que el listado, los endpoints y la interfaz calculen siempre lo mismo.
 */

/** Soporte de la decisión: mismo tipo técnico que el cambio de estado (acto administrativo o certificación). */
export const CICLO_TIPO_SOPORTE = 'soporte_cambio_estado_perfil';

export const CICLO_ACCIONES_AUDITORIA = {
  COMITE_INCORPORACION: 'DECISION_COMITE_INCORPORACION',
  RECATEGORIZACION_INICIAR: 'RECATEGORIZACION_INICIADA',
  RECATEGORIZACION_REVISAR: 'RECATEGORIZACION_REVISADA',
  RECATEGORIZACION_DECIDIR: 'RECATEGORIZACION_DECISION_COMITE',
} as const;

export const ETAPAS_CICLO = {
  CARGADO: 'Cargado / Elegible',
  VALIDADO_CUMPLE: 'Validado – Cumple',
  VALIDADO_NO_CUMPLE: 'Validado – No cumple',
  ACTIVO: 'Apto para incorporación / Activo',
  INACTIVO: 'Inactivo',
} as const;

export type EtapaCiclo = keyof typeof ETAPAS_CICLO;

export const RESULTADOS_INCORPORACION = {
  FAVORABLE: 'Decisión favorable: apto para incorporación',
  NO_FAVORABLE: 'Decisión no favorable',
} as const;

export type ResultadoIncorporacion = keyof typeof RESULTADOS_INCORPORACION;

export interface DecisionComiteIncorporacion {
  resultado: ResultadoIncorporacion;
  resultadoEtiqueta: string;
  fechaComite: string;
  motivo: string | null;
  observacion: string | null;
  soporteId: string;
  soporteNombre: string | null;
  registradoPor: string;
  registradoEn: string;
  /** Estado que tenía el docente antes de la decisión. */
  estadoAnterior: string;
}

export interface CicloDocenteInfo {
  etapa: EtapaCiclo;
  etapaEtiqueta: string;
  /** Validado – Cumple, sin decisión favorable y activo: ya se puede registrar el comité. */
  puedeRegistrarComite: boolean;
  decision: DecisionComiteIncorporacion | null;
}

const normalizarEstado = (estado: unknown): 'ACTIVO' | 'INACTIVO' =>
  String(estado ?? 'ACTIVO').trim().toUpperCase() === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO';

/**
 * Etapa del docente. `estado` (ACTIVO/INACTIVO) manda: un inactivo se muestra como Inactivo aunque esté validado.
 * `estadoAprobacion` es el resultado de la revisión documental del GGP (ACTIVO_RUND = Validado – Cumple).
 */
export function etapaCicloDocente(input: { estado: unknown; estadoAprobacion?: unknown; decision?: unknown }): EtapaCiclo {
  if (normalizarEstado(input.estado) === 'INACTIVO') return 'INACTIVO';
  if ((input.decision as DecisionComiteIncorporacion | null)?.resultado === 'FAVORABLE') return 'ACTIVO';
  const aprobacion = String(input.estadoAprobacion ?? '').trim().toUpperCase();
  if (aprobacion === 'ACTIVO_RUND') return 'VALIDADO_CUMPLE';
  if (aprobacion === 'DEVUELTO') return 'VALIDADO_NO_CUMPLE';
  return 'CARGADO';
}

export function cicloDocenteInfo(input: { estado: unknown; estadoAprobacion?: unknown; decision?: unknown }): CicloDocenteInfo {
  const etapa = etapaCicloDocente(input);
  return {
    etapa,
    etapaEtiqueta: ETAPAS_CICLO[etapa],
    puedeRegistrarComite: etapa === 'VALIDADO_CUMPLE',
    decision: (input.decision as DecisionComiteIncorporacion | null) ?? null,
  };
}

export interface DecisionIncorporacionEntrada {
  resultado: ResultadoIncorporacion;
  fechaComite: string;
  motivo: string | null;
  observacion: string | null;
  soporteId: string;
}

function validarFecha(fechaRaw: string, hoy: string): string {
  const fecha = soloFecha(fechaRaw);
  if (!fecha) {
    throw new BadRequestException({
      message: 'La fecha del comité no es válida. Use el formato AAAA-MM-DD.',
      columna: 'FECHA_COMITE', datoErrado: fechaRaw, valorEsperado: 'Fecha válida AAAA-MM-DD',
    });
  }
  if (fecha > hoy) {
    throw new BadRequestException({
      message: 'La fecha del comité no puede ser posterior a hoy.',
      columna: 'FECHA_COMITE', datoErrado: fecha, valorEsperado: `Fecha igual o anterior a ${hoy}`,
    });
  }
  return fecha;
}

/**
 * CA-01: la decisión del comité exige resultado, fecha y soporte; si no es favorable, también el motivo.
 * Nombra TODOS los campos obligatorios que faltan.
 */
export function validarDecisionIncorporacion(body: any, hoy: string = hoyColombia()): DecisionIncorporacionEntrada {
  const resultadoRaw = String(body?.resultado ?? '').trim().toUpperCase();
  const resultado = (['FAVORABLE', 'NO_FAVORABLE'] as const).find((code) => code === resultadoRaw);
  const fechaRaw = String(body?.fechaComite ?? '').trim();
  const motivo = String(body?.motivo ?? '').trim();
  const observacion = String(body?.observacion ?? '').trim();
  const soporteId = String(body?.soporteId ?? '').trim();

  const faltantes: string[] = [];
  if (!resultado) faltantes.push('resultado de la decisión');
  if (!fechaRaw) faltantes.push('fecha del comité');
  if (!soporteId) faltantes.push('soporte de la decisión del comité');
  if (resultado === 'NO_FAVORABLE' && !motivo) faltantes.push('motivo');
  if (faltantes.length) {
    throw new BadRequestException({
      message: `Faltan campos obligatorios: ${faltantes.join(', ')}.`,
      columna: 'DECISION_COMITE_INCORPORACION',
      camposFaltantes: faltantes,
      valorEsperado: 'Resultado, fecha del comité, soporte y, si no es favorable, motivo',
    });
  }
  const fechaComite = validarFecha(fechaRaw, hoy);
  if (motivo.length > 1000 || observacion.length > 1000) {
    throw new BadRequestException('El motivo y la observación admiten máximo 1000 caracteres.');
  }
  return { resultado: resultado as ResultadoIncorporacion, fechaComite, motivo: motivo || null, observacion: observacion || null, soporteId };
}

/** Devuelve el motivo por el que NO se puede registrar la decisión del comité (o null si se puede). */
export function decisionIncorporacionPermitida(input: { etapa: EtapaCiclo; previa?: DecisionComiteIncorporacion | null }): string | null {
  if (input.previa?.resultado === 'FAVORABLE') return null; // reenvío idéntico: lo resuelve el servicio.
  if (input.etapa === 'INACTIVO') {
    return 'El perfil está inactivo: reactívelo con su motivo y soporte antes de registrar la decisión del comité.';
  }
  if (input.etapa === 'CARGADO' || input.etapa === 'VALIDADO_NO_CUMPLE') {
    return 'El docente debe estar Validado – Cumple (revisión documental aprobada por el GGP) antes de pasar al comité.';
  }
  return null;
}

/* ───────────────────────────── Recategorización ───────────────────────────── */

export const ESTADOS_RECATEGORIZACION = {
  EN_REVISION: 'En revisión',
  EN_COMITE: 'En comité',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
} as const;

export type EstadoRecategorizacion = keyof typeof ESTADOS_RECATEGORIZACION;

export interface PropuestaRecategorizacion {
  escalafon: string;
  puntajeSalarial: number | null;
}

export interface RecategorizacionEntrada {
  justificacion: string;
  propuesta: PropuestaRecategorizacion;
  soporteIds: string[];
}

export const MAX_SOPORTES_RECATEGORIZACION = 10;

/** CA-03: justificación obligatoria, categoría propuesta y al menos un soporte nuevo. */
export function validarRecategorizacion(body: any): RecategorizacionEntrada {
  const justificacion = String(body?.justificacion ?? '').trim();
  const escalafon = String(body?.propuesta?.escalafon ?? body?.escalafon ?? '').trim();
  const puntajeRaw = body?.propuesta?.puntajeSalarial ?? body?.puntajeSalarial;
  const soporteIds = Array.isArray(body?.soporteIds)
    ? [...new Set<string>(body.soporteIds.map((id: unknown) => String(id ?? '').trim()).filter(Boolean))]
    : [];

  const faltantes: string[] = [];
  if (!justificacion) faltantes.push('justificación');
  if (!escalafon) faltantes.push('categoría o escalafón propuesto');
  if (!soporteIds.length) faltantes.push('al menos un soporte nuevo');
  if (faltantes.length) {
    throw new BadRequestException({
      message: `Faltan campos obligatorios: ${faltantes.join(', ')}.`,
      columna: 'RECATEGORIZACION', camposFaltantes: faltantes,
      valorEsperado: 'Justificación, categoría propuesta y soportes nuevos',
    });
  }
  if (justificacion.length < 10) throw new BadRequestException('Explique la justificación con mínimo 10 caracteres.');
  if (justificacion.length > 1000) throw new BadRequestException('La justificación admite máximo 1000 caracteres.');
  if (escalafon.length > 200 || /[\u0000-\u001f\u007f]/.test(escalafon)) {
    throw new BadRequestException('La categoría propuesta admite máximo 200 caracteres y sin caracteres de control.');
  }
  if (soporteIds.length > MAX_SOPORTES_RECATEGORIZACION) {
    throw new BadRequestException(`Una recategorización admite máximo ${MAX_SOPORTES_RECATEGORIZACION} soportes.`);
  }
  let puntajeSalarial: number | null = null;
  if (puntajeRaw !== undefined && puntajeRaw !== null && String(puntajeRaw).trim() !== '') {
    puntajeSalarial = Number(String(puntajeRaw).replace(',', '.'));
    if (!Number.isFinite(puntajeSalarial) || puntajeSalarial < 0 || puntajeSalarial > 100000) {
      throw new BadRequestException('El puntaje salarial propuesto debe ser un número entre 0 y 100000.');
    }
  }
  return { justificacion, propuesta: { escalafon, puntajeSalarial }, soporteIds };
}

export interface RevisionRecategorizacionEntrada {
  resultado: 'CUMPLE' | 'NO_CUMPLE';
  observacion: string | null;
}

/** La revisión de los soportes la hace el responsable operativo del GGP: cumple pasa a comité; no cumple exige el motivo. */
export function validarRevisionRecategorizacion(body: any): RevisionRecategorizacionEntrada {
  const resultadoRaw = String(body?.resultado ?? '').trim().toUpperCase();
  const resultado = (['CUMPLE', 'NO_CUMPLE'] as const).find((code) => code === resultadoRaw);
  const observacion = String(body?.observacion ?? '').trim();
  if (!resultado) throw new BadRequestException('Indique el resultado de la revisión: cumple o no cumple.');
  if (resultado === 'NO_CUMPLE' && !observacion) {
    throw new BadRequestException('El motivo es obligatorio cuando los soportes no cumplen.');
  }
  if (observacion.length > 1000) throw new BadRequestException('La observación admite máximo 1000 caracteres.');
  return { resultado, observacion: observacion || null };
}

export interface DecisionRecategorizacionEntrada {
  resultado: 'APROBADA' | 'RECHAZADA';
  fechaComite: string;
  motivo: string | null;
  soporteId: string;
}

export function validarDecisionRecategorizacion(body: any, hoy: string = hoyColombia()): DecisionRecategorizacionEntrada {
  const resultadoRaw = String(body?.resultado ?? '').trim().toUpperCase();
  const resultado = (['APROBADA', 'RECHAZADA'] as const).find((code) => code === resultadoRaw);
  const fechaRaw = String(body?.fechaComite ?? '').trim();
  const motivo = String(body?.motivo ?? '').trim();
  const soporteId = String(body?.soporteId ?? '').trim();

  const faltantes: string[] = [];
  if (!resultado) faltantes.push('resultado de la decisión');
  if (!fechaRaw) faltantes.push('fecha del comité');
  if (!soporteId) faltantes.push('soporte de la decisión del comité');
  if (resultado === 'RECHAZADA' && !motivo) faltantes.push('motivo');
  if (faltantes.length) {
    throw new BadRequestException({
      message: `Faltan campos obligatorios: ${faltantes.join(', ')}.`,
      columna: 'DECISION_COMITE_RECATEGORIZACION', camposFaltantes: faltantes,
      valorEsperado: 'Resultado, fecha del comité, soporte y, si se rechaza, motivo',
    });
  }
  const fechaComite = validarFecha(fechaRaw, hoy);
  if (motivo.length > 1000) throw new BadRequestException('El motivo admite máximo 1000 caracteres.');
  return { resultado: resultado as 'APROBADA' | 'RECHAZADA', fechaComite, motivo: motivo || null, soporteId };
}

/** Solo un docente activo puede recategorizarse y solo si no tiene otra solicitud abierta. */
export function recategorizacionPermitida(input: { estado: unknown; abierta: boolean }): string | null {
  if (normalizarEstado(input.estado) !== 'ACTIVO') return 'Solo un docente activo puede iniciar la recategorización.';
  if (input.abierta) return 'El docente ya tiene una recategorización en curso. Termínela antes de iniciar otra.';
  return null;
}
