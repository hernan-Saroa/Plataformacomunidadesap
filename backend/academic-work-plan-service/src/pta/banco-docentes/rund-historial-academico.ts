import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'crypto';

/** REQ-RUND-F016 — Reglas puras del historial académico que el PTA escribe en el RUND. */
export const RUND_HISTORIAL_MAX_REGISTROS = 200;
export const RUND_HISTORIAL_MAX_TEXTO = 300;
export const RUND_HISTORIAL_PERMISSION = 'banco-docentes.rund.historial.write';

export interface RundHistorialRegistro {
  setup: string | null;
  territorial: string | null;
  programa: string;
  asignaturaCodigo: string | null;
  asignatura: string;
  nucleoTematico: string | null;
  clave: string;
}

export function normalizarTextoHistorial(value: unknown): string {
  return String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ').toUpperCase();
}

/** «En Firme», «EN_FIRME» o «en  firme» → 'EN_FIRME'. */
export function normalizarEstadoPta(value: unknown): string {
  return typeof value === 'string' ? normalizarTextoHistorial(value).replace(/\s+/g, '_') : '';
}

export function esEstadoPtaEnFirme(value: unknown): boolean {
  return normalizarEstadoPta(value) === 'EN_FIRME';
}

export function validarCedulaHistorial(cedula: unknown): string {
  if (typeof cedula !== 'string' || !/^\d{1,20}$/.test(cedula)) {
    throw new BadRequestException({ statusCode: 400, code: 'RUND_CEDULA_INVALIDA', message: 'La cédula debe contener entre 1 y 20 dígitos, sin separadores.' });
  }
  return cedula;
}

export function validarPeriodoHistorial(periodo: unknown): string {
  if (typeof periodo !== 'string' || !/^\d{4}-[12]$/.test(periodo)) {
    throw new BadRequestException({ statusCode: 400, code: 'RUND_PERIODO_INVALIDO', message: 'El periodo debe tener formato AAAA-1 o AAAA-2.' });
  }
  return periodo;
}

/** El RUND solo acepta el historial de un PTA «En Firme»; cualquier otro estado se rechaza sin guardar nada. */
export function exigirPtaEnFirme(estado: unknown): void {
  if (typeof estado !== 'string' || !estado.trim()) {
    throw new BadRequestException({ statusCode: 400, code: 'RUND_HISTORIAL_ESTADO_REQUERIDO', message: 'Debe indicar el estado del PTA (estado_pta).' });
  }
  if (!esEstadoPtaEnFirme(estado)) {
    throw new UnprocessableEntityException({
      statusCode: 422, code: 'RUND_HISTORIAL_PTA_NO_EN_FIRME',
      message: 'El RUND solo recibe el historial académico de un PTA en estado «En Firme».',
    });
  }
}

function textoOpcional(value: unknown, campo: string, indice: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new BadRequestException({ statusCode: 400, code: 'RUND_HISTORIAL_REGISTRO_INVALIDO', message: `registros[${indice}].${campo} debe ser texto.` });
  }
  // PostgreSQL no admite NUL en texto: sin esta validación el envío terminaría en un 500.
  if (value.includes('\u0000')) {
    throw new BadRequestException({ statusCode: 400, code: 'RUND_HISTORIAL_REGISTRO_INVALIDO', message: `registros[${indice}].${campo} contiene caracteres no válidos.` });
  }
  const limpio = value.trim().replace(/\s+/g, ' ');
  if (limpio.length > RUND_HISTORIAL_MAX_TEXTO) {
    throw new BadRequestException({ statusCode: 400, code: 'RUND_HISTORIAL_REGISTRO_INVALIDO', message: `registros[${indice}].${campo} supera ${RUND_HISTORIAL_MAX_TEXTO} caracteres.` });
  }
  return limpio || null;
}

function textoObligatorio(value: unknown, campo: string, indice: number): string {
  const texto = textoOpcional(value, campo, indice);
  if (!texto) {
    throw new BadRequestException({ statusCode: 400, code: 'RUND_HISTORIAL_REGISTRO_INVALIDO', message: `registros[${indice}].${campo} es obligatorio.` });
  }
  return texto;
}

/** Clave de idempotencia: el mismo docente, periodo, sede, programa y asignatura nunca se duplica. */
export function claveIdempotenciaHistorial(
  cedula: string, periodo: string,
  r: { setup: string | null; programa: string; asignaturaCodigo: string | null; asignatura: string },
): string {
  const asignatura = normalizarTextoHistorial(r.asignaturaCodigo || r.asignatura);
  const partes = [cedula, periodo, normalizarTextoHistorial(r.setup), normalizarTextoHistorial(r.programa), asignatura];
  return createHash('sha256').update(partes.join('|')).digest('hex');
}

/** Valida y normaliza `registros`; repetidos dentro del mismo envío se consolidan (el último gana). */
export function normalizarRegistrosHistorial(cedula: string, periodo: string, registros: unknown): RundHistorialRegistro[] {
  if (!Array.isArray(registros) || registros.length === 0) {
    throw new BadRequestException({ statusCode: 400, code: 'RUND_HISTORIAL_REGISTROS_REQUERIDOS', message: 'Debe enviar al menos un registro en «registros».' });
  }
  if (registros.length > RUND_HISTORIAL_MAX_REGISTROS) {
    throw new BadRequestException({ statusCode: 400, code: 'RUND_HISTORIAL_REGISTROS_EXCEDIDOS', message: `Máximo ${RUND_HISTORIAL_MAX_REGISTROS} registros por envío.` });
  }
  const porClave = new Map<string, RundHistorialRegistro>();
  registros.forEach((raw, i) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new BadRequestException({ statusCode: 400, code: 'RUND_HISTORIAL_REGISTRO_INVALIDO', message: `registros[${i}] debe ser un objeto.` });
    }
    const r = raw as Record<string, unknown>;
    const base = {
      setup: textoOpcional(r.setup, 'setup', i),
      territorial: textoOpcional(r.territorial, 'territorial', i),
      programa: textoObligatorio(r.programa, 'programa', i),
      asignaturaCodigo: textoOpcional(r.asignatura_codigo, 'asignatura_codigo', i),
      asignatura: textoObligatorio(r.asignatura, 'asignatura', i),
      nucleoTematico: textoOpcional(r.nucleo_tematico, 'nucleo_tematico', i),
    };
    const clave = claveIdempotenciaHistorial(cedula, periodo, base);
    porClave.set(clave, { ...base, clave });
  });
  // Orden estable por clave: dos envíos concurrentes bloquean las filas en el mismo orden (sin interbloqueos).
  return [...porClave.values()].sort((a, b) => (a.clave < b.clave ? -1 : a.clave > b.clave ? 1 : 0));
}
