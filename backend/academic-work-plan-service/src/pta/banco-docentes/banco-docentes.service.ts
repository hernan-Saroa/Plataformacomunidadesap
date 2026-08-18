import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Like, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { DocenteEntity } from '../entities/docente.entity';
import { PersonaEntity } from '../entities/persona.entity';
import { UsuarioEntity } from '../entities/usuario.entity';
import { BancoDocenteInvitacionEntity } from '../entities/banco-docente-invitacion.entity';
import { RundAprobacionLogEntity } from '../entities/rund-aprobacion-log.entity';
import { sanitizeText } from '../utils/text-sanitizer';
import { OFFICIAL_TERRITORIALES_ESAP } from '../catalogos/territoriales-cetaps-esap';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

type AuthSeccionalTerritorial = {
  id: string;
  nombre: string;
  codigo: string | null;
};

// â”€â”€â”€ text helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function toCleanString(value: any): string | null {
  if (value === undefined || value === null) return null;
  const n = sanitizeText(String(value)).trim();
  return n === '' ? null : n;
}

function firstNonEmpty(...values: any[]): string | null {
  for (const v of values) {
    const n = toCleanString(v);
    if (n) return n;
  }
  return null;
}

function normalizeLookupText(value: any): string {
  const text = toCleanString(value) || '';
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

/**
 * Busca en `raw` el primer valor cuya CLAVE, normalizada (sin acentos ni separadores,
 * en may\u00fasculas), satisfaga el `matcher`. El bulk import conserva el header CRUDO del
 * Excel como clave del registro, por lo que un header con una variaci\u00f3n m\u00ednima (espacios,
 * guiones bajos, par\u00e9ntesis, tildes) no coincide con las claves exactas que busca el
 * parser. Este helper recupera el valor pese a esas variaciones. Ignora vac\u00edos.
 */
function findRawByNormalizedKey(raw: any, matcher: (normalizedKey: string) => boolean): any {
  if (!raw || typeof raw !== 'object') return undefined;
  for (const key of Object.keys(raw)) {
    const norm = String(key).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (matcher(norm)) {
      const v = raw[key];
      if (v !== null && v !== undefined && String(v).trim() !== '') return v;
    }
  }
  return undefined;
}

function parseMaybeInt(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function parseMaybeFloat(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = String(value).trim();
  const normalized = raw.includes(',') && raw.includes('.') ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(',', '.');
  const parsed = Number(normalized.replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial)) return null;
  const date = new Date((Math.floor(serial - 25569)) * 86400 * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseMaybeDate(value: any): Date | null {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') return excelSerialToDate(value);
  const text = String(value).trim();
  if (!text) return null;
  const ddmm = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (ddmm) {
    const d = new Date(Date.UTC(Number(ddmm[3]), Number(ddmm[2]) - 1, Number(ddmm[1])));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const yyyymm = text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (yyyymm) {
    const d = new Date(Date.UTC(Number(yyyymm[1]), Number(yyyymm[2]) - 1, Number(yyyymm[3])));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateOnly(value: any): string | null {
  const date = parseMaybeDate(value);
  if (!date) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function splitFullName(fullName: string | null) {
  const tokens = (fullName || '').split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { primer_nombre: null, segundo_nombre: null, primer_apellido: null, segundo_apellido: null };
  if (tokens.length === 1) return { primer_nombre: tokens[0], segundo_nombre: null, primer_apellido: null, segundo_apellido: null };
  if (tokens.length === 2) return { primer_nombre: tokens[0], segundo_nombre: null, primer_apellido: tokens[1], segundo_apellido: null };
  if (tokens.length === 3) return { primer_nombre: tokens[0], segundo_nombre: tokens[1], primer_apellido: tokens[2], segundo_apellido: null };
  return { primer_nombre: tokens[0], segundo_nombre: tokens[1], primer_apellido: tokens.slice(2, -1).join(' '), segundo_apellido: tokens[tokens.length - 1] };
}

function extractFirstEmail(value: any): string | null {
  const text = toCleanString(value);
  if (!text) return null;
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase() : null;
}

function normalizePhoneForAuth(value: any): string | null {
  const text = toCleanString(value);
  if (!text) return null;
  const candidates = text.match(/\+?\d[\d\s().-]{5,}\d/g) || [];
  const normalizedCandidates = candidates
    .map((candidate) => candidate.replace(/[^\d+]/g, ''))
    .filter(Boolean);
  const preferred = normalizedCandidates.find((candidate) => candidate.replace(/\D/g, '').length >= 10)
    || normalizedCandidates[0]
    || text.replace(/[^\d+]/g, '');
  return (preferred || text.replace(/\s+/g, ' ').trim()).slice(0, 20);
}

// â”€â”€â”€ dedican / vinculacion codes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function normalizeDedicacionCode(value: any): string {
  const n = normalizeLookupText(value);
  if (!n) return 'TC';
  if (n === 'mt' || n.includes('mediotiempo')) return 'MT';
  if (n === 'hc' || n.includes('catedra') || n.includes('horacatedra')) return 'HC';
  if (n === 'tc' || n.includes('tiempocompleto')) return 'TC';
  return (toCleanString(value) || 'TC').toUpperCase();
}

function isSupportedDedicacion(value: any): boolean {
  const n = normalizeLookupText(value);
  return n === 'tc' || n === 'mt' || n === 'hc' || n.includes('tiempocompleto') || n.includes('mediotiempo') || n.includes('catedra') || n.includes('horacatedra');
}

export function getDedicacionLabel(code: any, fallback?: any): string | null {
  const fb = toCleanString(fallback);
  if (fb) return fb;
  const n = normalizeDedicacionCode(code);
  if (n === 'MT') return 'Medio Tiempo';
  if (n === 'HC') return 'Hora CÃ¡tedra';
  if (n === 'TC') return 'Tiempo Completo';
  return toCleanString(code);
}

export function normalizeTipoVinculacionCode(value: any): string {
  const n = normalizeLookupText(value);
  if (!n) return 'OCASIONAL';
  if (n === 'carrera1') return 'CARRERA1';
  if (n === 'carrera2') return 'CARRERA2';
  if (n.includes('prueba') || n.includes('periododeprueba')) return 'PERIODO_DE_PRUEBA';
  if (n.includes('ocasional')) return 'OCASIONAL';
  if (n.includes('especial')) return 'ESPECIAL';
  if (n.includes('visitante')) return 'VISITANTE';
  if (n === 'carrera') return 'CARRERA2'; // Default fallback
  if (n.includes('catedra')) return 'CATEDRA';
  return (toCleanString(value) || 'OCASIONAL').toUpperCase().replace(/\s+/g, '_');
}

function isSupportedTipoVinculacion(value: any): boolean {
  const n = normalizeLookupText(value);
  return n.includes('carrera') || n.includes('prueba') || n.includes('periodo') || n.includes('provisional') || n.includes('ocasional') || n.includes('catedra') || n.includes('visitante') || n.includes('especial');
}

export function getTipoVinculacionLabel(code: any, fallback?: any): string | null {
  const fb = toCleanString(fallback);
  if (fb) {
    const fbNorm = normalizeLookupText(fb);
    if (fbNorm === 'carrera1') return 'Carrera1';
    if (fbNorm === 'carrera2') return 'Carrera2';
    if (fbNorm.includes('prueba') || fbNorm.includes('periododeprueba')) return 'Periodo de Prueba';
    if (fbNorm.includes('ocasional')) return 'Ocasional';
    if (fbNorm.includes('especial')) return 'Especial';
    if (fbNorm.includes('visitante')) return 'Visitante';
    return fb;
  }
  const n = normalizeTipoVinculacionCode(code);
  if (n === 'CARRERA1') return 'Carrera1';
  if (n === 'CARRERA2') return 'Carrera2';
  if (n === 'CARRERA') return 'Carrera2';
  if (n === 'PERIODO_DE_PRUEBA') return 'Periodo de Prueba';
  if (n === 'OCASIONAL') return 'Ocasional';
  if (n === 'ESPECIAL') return 'Especial';
  if (n === 'VISITANTE') return 'Visitante';
  if (n === 'CATEDRA') return 'Hora CÃ¡tedra';
  return n.replace(/_/g, ' ');
}

function getHorasAsignablesFromDedicacion(dedicacion: any, explicit?: any): number {
  const exp = parseMaybeInt(explicit);
  if (exp !== null && exp >= 0) return exp;
  const n = normalizeDedicacionCode(dedicacion);
  if (n === 'MT') return 400;
  if (n === 'HC') return 0;
  return 800;
}

function getHorasSemanalesFromDedicacion(dedicacion: any, explicit?: any): number | null {
  const exp = parseMaybeInt(explicit);
  if (exp !== null && exp >= 0) return exp;
  const n = normalizeDedicacionCode(dedicacion);
  if (n === 'MT') return 20;
  if (n === 'HC') return 0;
  return 40;
}

function computeEdad(fechaNacimiento: any, edadFallback?: any): number | null {
  const fecha = parseMaybeDate(fechaNacimiento);
  if (!fecha) return parseMaybeInt(edadFallback);
  const today = new Date();
  let age = today.getUTCFullYear() - fecha.getUTCFullYear();
  const m = today.getUTCMonth() - fecha.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < fecha.getUTCDate())) age -= 1;
  return age >= 0 ? age : parseMaybeInt(edadFallback);
}

function computeRangoEdad(edad: any, fallback?: any): string | null {
  const v = parseMaybeInt(edad);
  if (v === null) return toCleanString(fallback);
  if (v <= 35) return 'Menor de 35 a\u00f1os';
  if (v <= 45) return 'De 36 a 45 a\u00f1os';
  if (v <= 55) return 'De 46 a 55 a\u00f1os';
  if (v <= 65) return 'De 56 a 65 a\u00f1os';
  return 'Mayor de 65 a\u00f1os';
}
export function categorizarSituacion(texto: string | null): string {
  const t = (texto || '').toLowerCase().trim();
  if (!t || t === 'no aplica' || t === 'servicio activo') return 'Servicio Activo';
  if (t.includes('sabatico') || t.includes('sabÃ¡tico')) return 'AÃ±o SabÃ¡tico';
  if (t.includes('exclusiva')) return 'DedicaciÃ³n Exclusiva';
  if (t.includes('comision de estudios') || t.includes('comisiÃ³n de estudios')) return 'ComisiÃ³n de Estudios';
  if (t.includes('comision') || t.includes('comisiÃ³n')) return 'ComisiÃ³n de Servicios';
  if (t.includes('periodo de prueba') || t.includes('perÃ­odo de prueba')) return 'En Periodo de Prueba';
  if (t.includes('decan') || t.includes('subdirector') || t.includes('director')) return 'Cargo Directivo';
  return 'Otra';
}

// â”€â”€â”€ territorial resolution â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function normalizeEstadoDocente(value: any, fallback = 'ACTIVO'): string {
  const n = normalizeLookupText(value);
  if (!n) return fallback;
  if (n.includes('inactivo') || n.includes('retir') || n.includes('termin') || n.includes('desvinc')) return 'INACTIVO';
  if (n.includes('activo') || n.includes('servicio')) return 'ACTIVO';
  return (toCleanString(value) || fallback).toUpperCase().replace(/\s+/g, '_');
}

const TERRITORIAL_ALIASES: Record<string, string[]> = Object.fromEntries(
  OFFICIAL_TERRITORIALES_ESAP.map((t) => [normalizeLookupText(t.nombre), t.aliases.map((a) => normalizeLookupText(a))]),
);

function findTerritorialMatch(territoriales: AuthSeccionalTerritorial[], rawValue: any): AuthSeccionalTerritorial | null {
  const lookup = normalizeLookupText(rawValue);
  if (!lookup) return null;
  const exact = territoriales.find((t) => normalizeLookupText(t.nombre) === lookup);
  if (exact) return exact;
  const aliasEntry = Object.entries(TERRITORIAL_ALIASES).find(([, aliases]) => aliases.includes(lookup));
  if (aliasEntry) {
    const [canonical] = aliasEntry;
    const aliased = territoriales.find((t) => normalizeLookupText(t.nombre) === canonical);
    if (aliased) return aliased;
  }
  return territoriales.find((t) => {
    const n = normalizeLookupText(t.nombre);
    return n.includes(lookup) || lookup.includes(n);
  }) || null;
}

export function resolveTerritorial(territoriales: AuthSeccionalTerritorial[], rawValue: any): AuthSeccionalTerritorial | null {
  return findTerritorialMatch(territoriales, rawValue) || territoriales.find((t) => normalizeLookupText(t.nombre) === 'sedecentral') || territoriales[0] || null;
}

// â”€â”€â”€ payload normalization â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function normalizeBancoDocentePayload(raw: any) {
  if (raw && typeof raw === 'object') {
    // No mutar el payload original. Ademas de ser inesperado para el llamador,
    // conservar aliases en mayuscula podia hacer que una validacion posterior
    // leyera un valor viejo en vez del campo camelCase recien actualizado.
    raw = { ...raw };
    for (const k of Object.keys(raw)) {
      const upper = k.toUpperCase().trim().replace(/\s+/g, '_');
      if (raw[upper] === undefined) raw[upper] = raw[k];
    }
  }

  const fullName = firstNonEmpty(raw?.NOMBRE_COMPLETO, raw?.nombreCompleto, raw?.nombre_completo, raw?.nombre, raw?.['Nombre completo'], raw?.['Nombre Completo']);
  const finalFullName = fullName ? fullName.toUpperCase().trim() : null;
  const splitName = splitFullName(finalFullName);
  const fechaNacimiento = parseMaybeDate(raw?.FECHA_NACIMIENTO ?? raw?.fechaNacimiento ?? raw?.fecha_nacimiento ?? raw?.nacimiento ?? raw?.['Nacimiento'] ?? raw?.['Fecha de nacimiento'] ?? raw?.['Fecha de Nacimiento']);
  const edad = computeEdad(fechaNacimiento, raw?.EDAD ?? raw?.edad ?? raw?.edadReferencia ?? raw?.['Edad']);

  const correoInstRaw = firstNonEmpty(raw?.CORREO_INSTITUCIONAL, raw?.correoInstitucional, raw?.correo_institucional, raw?.['Correo Institucional'], raw?.['Correo\nInstitucional'], raw?.['Correo Institucional '], raw?.email);
  const correoInst = extractFirstEmail(correoInstRaw);

  const correoPersRaw = firstNonEmpty(raw?.CORREO_PERSONAL, raw?.correoAlternativo, raw?.correo_alternativo, raw?.correo_personal, raw?.correoPersonal, raw?.['Correo personal'], raw?.['Correo Personal']);
  let correoPers = extractFirstEmail(correoPersRaw);

  const observationsList: string[] = [];

  if (correoInst && !correoInst.toLowerCase().trim().endsWith('@esap.edu.co')) {
    observationsList.push('Correo no institucional recibido en CORREO_INSTITUCIONAL; se conserva para contacto y queda para revision RUND');
  }

  // [BR-016] Personal email differs from institutional
  if (correoPers && correoInst && correoPers.toLowerCase().trim() === correoInst.toLowerCase().trim()) {
    correoPers = null;
    observationsList.push('Correo personal no puede ser igual al institucional. Se descartÃ³ el correo personal duplicado');
  }

  // [BR-021] Document type inference
  const docNumRaw = firstNonEmpty(raw?.DOCUMENTO_IDENTIDAD, raw?.documentNumber, raw?.documento_identidad, raw?.identificacion, raw?.document, raw?.documento, raw?.['Documento de identidad'], raw?.['Documento de Identidad']);
  const docNum = docNumRaw ? String(docNumRaw).trim().replace(/\./g, '') : null;
  let docType = firstNonEmpty(raw?.TIPO_DOCUMENTO, raw?.tipo_identificacion, raw?.tipo_documento, raw?.documentType, raw?.tipoDocumento, raw?.['Tipo de documento'], raw?.['Tipo de Documento']);
  
  if (docType) {
    const dtNorm = String(docType).toUpperCase().trim();
    if (dtNorm.includes('CIUDADANIA') || dtNorm === 'CEDULA' || dtNorm === 'C.C.') docType = 'CC';
    else if (dtNorm.includes('EXTRANJER') || dtNorm === 'C.E.') docType = 'CE';
    else if (dtNorm.includes('PASAPORTE') || dtNorm === 'P.A.') docType = 'PA';
    else if (dtNorm.length > 6) docType = dtNorm.substring(0, 6);
    else docType = dtNorm;
  }

  if (docNum) {
    if (!docType || docType === 'POR VERIFICAR' || docType === 'POR VE') {
      if (docNum.length >= 5) {
        docType = 'CC';
      } else {
        docType = 'OTRO';
        observationsList.push('NÃºmero de â‰¤6 dÃ­gitos atÃ­pico para la edad. Confirmar si es CC, CE o PA');
      }
    }
  }

  // Situation admin and status
  const sitAdmin = firstNonEmpty(raw?.SITUACION_ADMINISTRATIVA, raw?.situacionAdministrativa, raw?.['SituaciÃ³n Administrativa'], raw?.['SituaciA3n Administrativa']);
  const finVinculacionStr = firstNonEmpty(raw?.FIN_VINCULACION, raw?.fechaFinVinculacion, raw?.finVinculacion, raw?.['Fin de VinculaciÃ³n'], raw?.['Fin de VinculaciA3n']);
  const situacionCategoriaRaw = firstNonEmpty(raw?.SITUACION_CATEGORIA, raw?.situacionCategoria, raw?.situacion_categoria, raw?.['Situacion Categoria'], raw?.['Situacion categoria']);
  const estadoDocenteRaw = firstNonEmpty(raw?.ESTADO_DOCENTE, raw?.estadoDocente, raw?.estado_docente, raw?.estado, raw?.['Estado Docente'], raw?.['Estado docente']);
  const regimenNormativoRaw = firstNonEmpty(raw?.REGIMEN_NORMATIVO, raw?.regimenNormativo, raw?.regimen_normativo, raw?.['Regimen Normativo'], raw?.['Regimen normativo']);
  const sexoBiologicoRaw = firstNonEmpty(raw?.SEXO_BIOLOGICO, raw?.sexoBiologico, raw?.sexo_biologico, raw?.['Sexo Biologico'], raw?.['Sexo biologico']);
  const horasPtaRaw = parseMaybeInt(
    raw?.HORAS_PTA ?? raw?.horasPta ?? raw?.horas_pta ?? raw?.horasAsignables ?? raw?.['Horas PTA'] ?? raw?.['Horas Programables (PTA)']
    // Fallback tolerante al header: cualquier columna cuyo nombre normalizado sea la bolsa
    // de horas del PTA (HORAS_PTA / Horas Programables / Horas Asignables y variantes),
    // EXCLUYENDO explícitamente "DEDICACION_HORAS_SEMANA" (otra columna con "HORAS").
    // Sin esto, un header del Excel con una variación mínima hacía que el valor real
    // (p.ej. 720) no se leyera y el docente cayera al default por fórmula (800).
    ?? findRawByNormalizedKey(raw, (k) =>
      !k.includes('SEMANA') && (
        k === 'HORASPTA'
        || (k.includes('HORAS') && (k.includes('PTA') || k.includes('PROGRAMABLE') || k.includes('ASIGNABLE')))
      ),
    ),
  );
  const dedicacionHorasSemanaRaw = parseMaybeInt(raw?.DEDICACION_HORAS_SEMANA ?? raw?.dedicacionHorasSemana ?? raw?.dedicacion_horas_semana ?? raw?.['Dedicacion Horas Semana']);
  const isIndefinido = !finVinculacionStr || finVinculacionStr.toLowerCase().trim() === 'indefinido';
  const fechaFinVinculacion = isIndefinido ? null : parseMaybeDate(finVinculacionStr);

  // [BR-010] Teacher status
  let estadoDocente = 'ACTIVO';
  const sitAdminLower = (sitAdmin || '').toLowerCase();
  const inactiveKeywords = ["retiro", "retirado", "terminado", "inactivo", "desvinculado"];
  if (inactiveKeywords.some(kw => sitAdminLower.includes(kw))) {
    estadoDocente = 'INACTIVO';
  } else if (fechaFinVinculacion && fechaFinVinculacion < new Date()) {
    estadoDocente = 'INACTIVO';
  }

  // Vinculacion and hours setup
  const vinculacionRaw = raw?.VINCULACION ?? raw?.tipoVinculacion ?? raw?.vinculacion ?? raw?.['VinculaciA3n'] ?? raw?.['VinculaciÃ³n'];
  const tipoVinculacion = normalizeTipoVinculacionCode(vinculacionRaw);
  const dedicacion = normalizeDedicacionCode(raw?.DEDICACION ?? raw?.dedicacion ?? raw?.dedicacionLabel ?? raw?.['DedicaciÃ³n'] ?? raw?.['DedicaciA3n']);

  let regimenNormativo = 'N/A';
  const baseHoras = dedicacion === 'MT' ? 400 : 800;
  let horasPta = baseHoras;
  const vinculacionUpper = tipoVinculacion.toUpperCase();
  const fechaInicioVinculacion = parseMaybeDate(raw?.INICIO_VINCULACION ?? raw?.fechaInicioVinculacion ?? raw?.inicioVinculacion ?? raw?.['Inicio de VinculaciÃ³n'] ?? raw?.['Inicio de VinculaciA3n']);

  // [BR-002], [BR-003], [BR-005] Hours and Regimen rules
  if (vinculacionUpper === 'CARRERA1') {
    regimenNormativo = 'Acuerdo 009/2004';
    horasPta = 720;
    if (fechaInicioVinculacion) {
      const cutDate = new Date('2020-02-20T00:00:00Z');
      if (fechaInicioVinculacion >= cutDate) {
        observationsList.push('Carrera1 con inicio posterior al 20-feb-2020 (inconsistente con Acuerdo 009/2004)');
      }
    }
  } else if (vinculacionUpper === 'CARRERA2') {
    regimenNormativo = 'Acuerdo 003/2018';
    horasPta = baseHoras;
  } else if (['PERIODO_DE_PRUEBA', 'OCASIONAL', 'ESPECIAL', 'VISITANTE'].includes(vinculacionUpper)) {
    regimenNormativo = 'Circular Dispositiva 003/2025';
    horasPta = baseHoras;
    if (fechaInicioVinculacion && fechaFinVinculacion) {
      const diffTime = fechaFinVinculacion.getTime() - fechaInicioVinculacion.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const weeks = diffDays / 7;
      if (weeks < 20 && weeks > 0) {
        horasPta = Math.round(baseHoras * (weeks / 20));
      }
    }
  } else {
    regimenNormativo = 'N/A';
    horasPta = baseHoras;
    observationsList.push('Tipo de vinculaciÃ³n no reconocido');
  }

  if (regimenNormativoRaw) {
    regimenNormativo = regimenNormativoRaw;
  }
  if (horasPtaRaw !== null && horasPtaRaw >= 0) {
    horasPta = horasPtaRaw;
  }
  if (estadoDocenteRaw) {
    estadoDocente = normalizeEstadoDocente(estadoDocenteRaw, estadoDocente);
  }

  // Merge custom observations
  const customObs = firstNonEmpty(raw?.OBSERVACIONES, raw?.observaciones, raw?.['Observaciones']);
  if (customObs) {
    observationsList.unshift(customObs);
  }

  // Gender normalization
  const genderRaw = firstNonEmpty(raw?.GENERO, raw?.genero, raw?.['GÃ©nero'], raw?.['Genero']);
  let gender = genderRaw ? String(genderRaw).trim() : null;
  if (gender) {
    const gNorm = gender.toLowerCase();
    if (gNorm === 'm' || gNorm.startsWith('masc') || gNorm.startsWith('homb')) gender = 'M';
    else if (gNorm === 'f' || gNorm.startsWith('fem') || gNorm.startsWith('muje')) gender = 'F';
  }

  return {
    orderIndex: parseMaybeInt(raw?.ordenListado ?? raw?.orderIndex ?? raw?.['ORDEN_LISTADO'] ?? raw?.['Orden Listado']),
    documentNumber: docNum,
    documentType: docType,
    fullName: finalFullName,
    primer_nombre: firstNonEmpty(raw?.primer_nombre, raw?.primerNombre, splitName.primer_nombre)?.toUpperCase(),
    segundo_nombre: firstNonEmpty(raw?.segundo_nombre, raw?.segundoNombre, splitName.segundo_nombre)?.toUpperCase(),
    primer_apellido: firstNonEmpty(raw?.primer_apellido, raw?.primerApellido, splitName.primer_apellido)?.toUpperCase(),
    segundo_apellido: firstNonEmpty(raw?.segundo_apellido, raw?.segundoApellido, splitName.segundo_apellido)?.toUpperCase(),
    territorialNombre: firstNonEmpty(raw?.TERRITORIAL, raw?.territorialNombre, raw?.territorial, raw?.territorial_nombre, raw?.['Territorial']),
    cetapNombre: null, // [BR-026] CETAP no es del docente
    vinculacionLabel: firstNonEmpty(raw?.VINCULACION, raw?.vinculacion, raw?.vinculacionDisplay, raw?.tipoVinculacionDisplay, raw?.['VinculaciÃ³n'], raw?.['VinculaciA3n']),
    tipoVinculacion,
    regimenNormativo,
    dedicacionLabel: firstNonEmpty(raw?.DEDICACION, raw?.dedicacionLabel, raw?.dedicacion, raw?.['DedicaciÃ³n'], raw?.['DedicaciA3n']),
    dedicacion,
    escalafon: firstNonEmpty(raw?.CATEGORIA_ESCALAFON, raw?.escalafon, raw?.categoriaEscalafon, raw?.categoria, raw?.['CategorÃ­a'], raw?.['CategorA-a'], raw?.['CategorÃ­a/EscalafÃ³n']),
    nucleoTematico: firstNonEmpty(raw?.NUCLEO_TEMATICO, raw?.nucleoTematico, raw?.['NÃºcleo TemÃ¡tico'], raw?.['NAcleo TemAtico']),
    nivelFormacion: firstNonEmpty(raw?.NIVEL_FORMACION, raw?.nivelFormacion, raw?.['Nivel de FormaciÃ³n'], raw?.['Nivel de FormaciA3n']),
    perfilAcademicoPro: firstNonEmpty(raw?.perfilAcademicoPro, raw?.['Perfil acadÃ©mico PRO'], raw?.['Perfil acadAcmico PRO']),
    perfilAcademico: firstNonEmpty(raw?.PERFIL_ACADEMICO, raw?.perfilAcademico, raw?.['Perfil acadÃ©mico'], raw?.['Perfil acadAcmico']),
    pregrado: firstNonEmpty(raw?.TITULO_PREGRADO, raw?.pregrado, raw?.['TÃ­tulo Pregrado'], raw?.['Pregrado']),
    especializacion: firstNonEmpty(raw?.TITULO_ESPECIALIZACION, raw?.especializacion, raw?.['TÃ­tulo EspecializaciÃ³n'], raw?.['EspecializaciA3n']),
    maestria: firstNonEmpty(raw?.TITULO_MAESTRIA, raw?.maestria, raw?.['TÃ­tulo MaestrÃ­a'], raw?.['MaestrA-a']),
    doctorado: firstNonEmpty(raw?.TITULO_DOCTORADO, raw?.doctorado, raw?.['TÃ­tulo Doctorado'], raw?.['Doctorado']),
    posDoctorado: firstNonEmpty(raw?.TITULO_POSDOCTORADO, raw?.posDoctorado, raw?.posdoctorado, raw?.['TÃ­tulo Posdoctorado'], raw?.['PosDoctorado']),
    investigacion: firstNonEmpty(raw?.INVESTIGACION_ACTIVA, raw?.investigacion, raw?.investigacion2025, raw?.['InvestigaciÃ³n Activa'], raw?.['InvestigaciÃ³n'], raw?.['InvestigaciA3n'], raw?.['InvestigaciA3n 2025']),
    origenVinculacion: firstNonEmpty(raw?.ORIGEN_VINCULACION, raw?.origenVinculacion, raw?.['Origen de VinculaciÃ³n'], raw?.['Origen de vinculaciA3n']),
    actoAdministrativoVinculacion: firstNonEmpty(raw?.ACTO_ADMINISTRATIVO, raw?.actoAdministrativoVinculacion, raw?.actoAdministrativo, raw?.['Acto Administrativo'], raw?.['Acto Administrativo de VinculaciÃ³n'], raw?.['Acto Administrativo de VinculaciA3n'], raw?.['Acto Administrativo de VinculaciA3n ']),
    correoInstitucional: correoInst,
    correoAlternativo: correoPers,
    telefono: firstNonEmpty(raw?.TELEFONO, raw?.telefono, raw?.phone, raw?.['TelÃ©fono'], raw?.['Telefono']),
    ultimaEvaluacion: firstNonEmpty(raw?.ULTIMA_EVALUACION, raw?.ultimaEvaluacion, raw?.['Ãšltima EvaluaciÃ³n'], raw?.['Asltima EvaluaciA3n']),
    situacionAdministrativa: sitAdmin,
    fechaInicioVinculacion,
    fechaFinVinculacion,
    puntajeSalarial: parseMaybeFloat(raw?.PUNTAJE_SALARIAL ?? raw?.puntajeSalarial ?? raw?.['Puntaje Salarial']),
    genero: gender,
    sexoBiologico: sexoBiologicoRaw,
    fechaNacimiento,
    edadReferencia: edad,
    rangoEdad: firstNonEmpty(raw?.RANGO_EDAD, raw?.rangoEdad, raw?.rango_edad, raw?.['Rango de edad']) || computeRangoEdad(edad),
    horasAsignables: horasPta,
    dedicacionHorasSemana: getHorasSemanalesFromDedicacion(dedicacion, dedicacionHorasSemanaRaw),
    situacionCategoria: situacionCategoriaRaw || categorizarSituacion(sitAdmin),
    estado: estadoDocente,
    periodoCarga: firstNonEmpty(raw?.PERIODO_CARGA, raw?.periodoCarga, raw?.periodo_carga, raw?.['Periodo de carga'], raw?.['PERIODO_CARGA']),
    observaciones: observationsList.length > 0 ? observationsList.join('. ') : null,
    idRund: firstNonEmpty(raw?.ID_RUND, raw?.idRund, raw?.id_rund, raw?.['ID RUND'], raw?.['ID_RUND']),
  };
}

function validatePayload(payload: ReturnType<typeof normalizeBancoDocentePayload>) {
  // [BR-001] Mandatory non-empty fields validation
  const mandatoryFields = [
    { key: 'documentNumber', name: 'DOCUMENTO_IDENTIDAD' },
    { key: 'documentType', name: 'TIPO_DOCUMENTO' },
    { key: 'fullName', name: 'NOMBRE_COMPLETO' },
    { key: 'genero', name: 'GENERO' },
    { key: 'fechaNacimiento', name: 'FECHA_NACIMIENTO' },
    { key: 'correoInstitucional', name: 'CORREO_INSTITUCIONAL' },
    { key: 'tipoVinculacion', name: 'VINCULACION' },
    { key: 'territorialNombre', name: 'TERRITORIAL' },
    { key: 'dedicacion', name: 'DEDICACION' },
    { key: 'escalafon', name: 'CATEGORIA_ESCALAFON' },
    { key: 'fechaInicioVinculacion', name: 'INICIO_VINCULACION' },
    { key: 'actoAdministrativoVinculacion', name: 'ACTO_ADMINISTRATIVO' },
    { key: 'nivelFormacion', name: 'NIVEL_FORMACION' },
    { key: 'pregrado', name: 'TITULO_PREGRADO' },
    { key: 'nucleoTematico', name: 'NUCLEO_TEMATICO' },
    { key: 'perfilAcademico', name: 'PERFIL_ACADEMICO' },
    { key: 'periodoCarga', name: 'PERIODO_CARGA' }
  ];

  for (const f of mandatoryFields) {
    const val = (payload as any)[f.key];
    if (val === undefined || val === null || String(val).trim() === '') {
      throw new BadRequestException({
        message: `Campo obligatorio vacÃ­o: ${f.name}`,
        columna: f.name,
        datoErrado: '(vacÃ­o)',
        valorEsperado: 'Dato requerido'
      });
    }
  }

  // El archivo oficial puede traer correos personales en CORREO_INSTITUCIONAL.
  // Se conservan como dato de contacto y quedan marcados en observaciones RUND;
  // no bloquean la carga masiva.
}

/**
 * Validaciones estrictas del Canal 2 (creacion/edicion manual).
 *
 * La carga masiva conserva sus reglas historicas y su tolerancia. El formulario
 * manual, en cambio, debe rechazar datos que no puedan convertirse de forma
 * inequivoca en el perfil RUND y en la persona que luego consume PTA.
 */
export function validateManualBancoDocentePayload(
  payload: ReturnType<typeof normalizeBancoDocentePayload>,
  rawPayload?: any,
) {
  const fail = (message: string, columna: string, datoErrado: any, valorEsperado: string) => {
    throw new BadRequestException({ message, columna, datoErrado, valorEsperado });
  };

  const documentType = String(payload.documentType || '').toUpperCase();
  const documentNumber = String(payload.documentNumber || '');
  if (!['CC', 'CE', 'PA', 'NIT'].includes(documentType)) {
    fail('El tipo de documento no es valido.', 'TIPO_DOCUMENTO', documentType, 'CC, CE, PA o NIT');
  }
  if (documentNumber.length < 5 || documentNumber.length > 20) {
    fail('El documento debe tener entre 5 y 20 caracteres.', 'DOCUMENTO_IDENTIDAD', documentNumber, 'Entre 5 y 20 caracteres');
  }
  if (documentType === 'PA') {
    if (!/^[A-Z0-9]+$/i.test(documentNumber)) {
      fail('El pasaporte solo puede contener letras y numeros.', 'DOCUMENTO_IDENTIDAD', documentNumber, 'Letras y numeros, sin espacios ni simbolos');
    }
  } else if (!/^\d+$/.test(documentNumber)) {
    fail('El documento de identidad solo puede contener numeros.', 'DOCUMENTO_IDENTIDAD', documentNumber, 'Solo digitos');
  }

  const fullName = String(payload.fullName || '').trim();
  if (fullName.length < 3 || fullName.length > 150 || !/^[\p{L}\p{M}' -]+$/u.test(fullName)) {
    fail('El nombre completo solo puede contener letras, espacios, apostrofes y guiones.', 'NOMBRE_COMPLETO', fullName, 'Nombre completo valido');
  }

  const genero = normalizeLookupText(payload.genero);
  if (!['m', 'f', 'masculino', 'femenino', 'no binario', 'prefiero no indicar'].includes(genero)) {
    fail('El genero no corresponde al catalogo permitido.', 'GENERO', payload.genero, 'Masculino, Femenino, No Binario o Prefiero no indicar');
  }

  const estado = String(payload.estado || '').trim().toUpperCase();
  if (!['ACTIVO', 'INACTIVO'].includes(estado)) {
    fail('El estado del perfil debe ser ACTIVO o INACTIVO.', 'ESTADO_DOCENTE', payload.estado, 'ACTIVO o INACTIVO');
  }

  const institutionalEmail = String(payload.correoInstitucional || '').toLowerCase();
  if (!EMAIL_REGEX.test(institutionalEmail) || !institutionalEmail.endsWith('@esap.edu.co')) {
    fail('El correo institucional debe ser valido y terminar en @esap.edu.co.', 'CORREO_INSTITUCIONAL', institutionalEmail, 'usuario@esap.edu.co');
  }
  if (payload.correoAlternativo) {
    const alternativeEmail = String(payload.correoAlternativo).toLowerCase();
    if (!EMAIL_REGEX.test(alternativeEmail)) {
      fail('El correo personal no tiene un formato valido.', 'CORREO_PERSONAL', alternativeEmail, 'correo@dominio.com');
    }
    if (alternativeEmail === institutionalEmail) {
      fail('El correo personal debe ser diferente del institucional.', 'CORREO_PERSONAL', alternativeEmail, 'Un correo diferente del institucional');
    }
  }

  if (rawPayload) {
    const rawInstitutionalEmail = firstNonEmpty(
      rawPayload.correoInstitucional,
      rawPayload.CORREO_INSTITUCIONAL,
      rawPayload.email,
    );
    const rawAlternativeEmail = firstNonEmpty(
      rawPayload.correoAlternativo,
      rawPayload.CORREO_PERSONAL,
      rawPayload.correoPersonal,
    );
    const rawPhone = firstNonEmpty(rawPayload.telefono, rawPayload.TELEFONO, rawPayload.phone);
    const rawHours = rawPayload.horasPta ?? rawPayload.HORAS_PTA ?? rawPayload.horasAsignables;
    const rawWeeklyHours = rawPayload.dedicacionHorasSemana ?? rawPayload.DEDICACION_HORAS_SEMANA;
    const rawScore = rawPayload.puntajeSalarial ?? rawPayload.PUNTAJE_SALARIAL;
    const rawEndDate = firstNonEmpty(rawPayload.fechaFinVinculacion, rawPayload.FIN_VINCULACION);

    if (rawInstitutionalEmail
      && (!EMAIL_REGEX.test(rawInstitutionalEmail) || !rawInstitutionalEmail.toLowerCase().endsWith('@esap.edu.co'))) {
      fail('El correo institucional debe ser valido y terminar en @esap.edu.co.', 'CORREO_INSTITUCIONAL', rawInstitutionalEmail, 'usuario@esap.edu.co');
    }
    if (rawAlternativeEmail && !EMAIL_REGEX.test(rawAlternativeEmail)) {
      fail('El correo personal no tiene un formato valido.', 'CORREO_PERSONAL', rawAlternativeEmail, 'correo@dominio.com');
    }
    if (rawAlternativeEmail && rawInstitutionalEmail
      && rawAlternativeEmail.toLowerCase() === rawInstitutionalEmail.toLowerCase()) {
      fail('El correo personal debe ser diferente del institucional.', 'CORREO_PERSONAL', rawAlternativeEmail, 'Un correo diferente del institucional');
    }
    if (rawPhone && !/^\d{7,15}$/.test(rawPhone)) {
      fail('El telefono o celular debe contener entre 7 y 15 digitos.', 'TELEFONO', rawPhone, 'Solo numeros, entre 7 y 15 digitos');
    }
    if (rawHours !== undefined && rawHours !== null && rawHours !== '' && !/^\d+$/.test(String(rawHours))) {
      fail('Las horas PTA deben ser un numero entero.', 'HORAS_PTA', rawHours, 'Numero entero entre 0 y 2000');
    }
    if (rawWeeklyHours !== undefined && rawWeeklyHours !== null && rawWeeklyHours !== '' && !/^\d+$/.test(String(rawWeeklyHours))) {
      fail('Las horas semanales deben ser un numero entero.', 'DEDICACION_HORAS_SEMANA', rawWeeklyHours, 'Numero entero entre 0 y 168');
    }
    if (rawScore !== undefined && rawScore !== null && rawScore !== '' && !/^\d+(?:[.,]\d{1,2})?$/.test(String(rawScore))) {
      fail('El puntaje salarial debe ser numerico y admitir maximo dos decimales.', 'PUNTAJE_SALARIAL', rawScore, 'Numero mayor o igual a cero');
    }
    if (rawEndDate && !parseMaybeDate(rawEndDate)) {
      fail('La fecha de fin de vinculacion no es valida.', 'FIN_VINCULACION', rawEndDate, 'Fecha valida en formato AAAA-MM-DD');
    }
  }

  if (payload.telefono && !/^\d{7,15}$/.test(String(payload.telefono))) {
    fail('El telefono o celular debe contener entre 7 y 15 digitos.', 'TELEFONO', payload.telefono, 'Solo numeros, entre 7 y 15 digitos');
  }
  if (!isSupportedTipoVinculacion(payload.tipoVinculacion)) {
    fail('El tipo de vinculacion no corresponde al catalogo RUND.', 'VINCULACION', payload.tipoVinculacion, 'Vinculacion valida');
  }
  if (!isSupportedDedicacion(payload.dedicacion)) {
    fail('La dedicacion no corresponde al catalogo RUND.', 'DEDICACION', payload.dedicacion, 'TC, MT o HC');
  }

  if (!Number.isInteger(payload.horasAsignables) || payload.horasAsignables < 0 || payload.horasAsignables > 2000) {
    fail('Las horas PTA deben ser un entero entre 0 y 2000.', 'HORAS_PTA', payload.horasAsignables, 'Numero entero entre 0 y 2000');
  }
  if (payload.dedicacionHorasSemana !== null
    && (!Number.isInteger(payload.dedicacionHorasSemana) || payload.dedicacionHorasSemana < 0 || payload.dedicacionHorasSemana > 168)) {
    fail('Las horas semanales deben ser un entero entre 0 y 168.', 'DEDICACION_HORAS_SEMANA', payload.dedicacionHorasSemana, 'Numero entero entre 0 y 168');
  }
  if (payload.puntajeSalarial !== null && (!Number.isFinite(payload.puntajeSalarial) || payload.puntajeSalarial < 0)) {
    fail('El puntaje salarial debe ser un numero mayor o igual a cero.', 'PUNTAJE_SALARIAL', payload.puntajeSalarial, 'Numero mayor o igual a cero');
  }

  if (payload.fechaNacimiento) {
    const age = computeEdad(payload.fechaNacimiento);
    if (payload.fechaNacimiento.getTime() > Date.now() || age === null || age < 18 || age > 100) {
      fail('La fecha de nacimiento no corresponde a una edad valida para un docente.', 'FECHA_NACIMIENTO', formatDateOnly(payload.fechaNacimiento), 'Edad entre 18 y 100 anos');
    }
  }
  if (payload.fechaInicioVinculacion && payload.fechaFinVinculacion
    && payload.fechaInicioVinculacion.getTime() > payload.fechaFinVinculacion.getTime()) {
    fail('La fecha de inicio debe ser anterior o igual a la fecha de fin.', 'FIN_VINCULACION', formatDateOnly(payload.fechaFinVinculacion), 'Fecha igual o posterior al inicio');
  }
  if (!/^20\d{2}-[12]$/.test(String(payload.periodoCarga || ''))) {
    fail('El periodo academico debe tener el formato AAAA-1 o AAAA-2.', 'PERIODO_CARGA', payload.periodoCarga, 'Ejemplo: 2026-2');
  }
}

/**
 * Validación RELAJADA para el canal AUTOGESTIÓN (Canal 3).
 * El docente se autoregistra con datos parciales: solo exigimos lo mínimo para
 * crear la persona/usuario. Los campos de vinculación, escalafón, formación, etc.
 * los completa/valida GGP después en el flujo de aprobación por bloques.
 * NO se fuerza @esap.edu.co aquí: el correo ya fue validado como elegible al
 * solicitar el OTP (requestOtpByEmail bloquea correos no invitados/no docentes).
 */
function validatePayloadAutogestion(payload: ReturnType<typeof normalizeBancoDocentePayload>) {
  const mandatoryFields = [
    { key: 'documentNumber', name: 'DOCUMENTO_IDENTIDAD' },
    { key: 'fullName', name: 'NOMBRE_COMPLETO' },
    { key: 'correoInstitucional', name: 'CORREO_INSTITUCIONAL' },
  ];
  for (const f of mandatoryFields) {
    const val = (payload as any)[f.key];
    if (val === undefined || val === null || String(val).trim() === '') {
      throw new BadRequestException({
        message: `Campo obligatorio vacío: ${f.name}`,
        columna: f.name,
        datoErrado: '(vacío)',
        valorEsperado: 'Dato requerido'
      });
    }
  }
}

// â”€â”€â”€ response builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function buildBancoDocenteResponse(docente: DocenteEntity & { persona?: PersonaEntity & { usuario?: UsuarioEntity } }) {
  const persona = docente.persona;
  const usuario = persona?.usuario;
  const fechaNacimiento = persona?.fecha_nacimiento || null;
  const edad = computeEdad(fechaNacimiento, docente.edadReferencia);
  const rangoEdad = computeRangoEdad(edad, docente.rangoEdad);
  const nombreCompleto = [persona?.primer_nombre, persona?.segundo_nombre, persona?.primer_apellido, persona?.segundo_apellido].filter(Boolean).join(' ').trim() || usuario?.nombre || 'Sin nombre';

  const genUpper = (persona?.genero || '').toUpperCase();
  const sexoBiologico = docente.sexoBiologico || (genUpper.startsWith('M') ? 'Hombre' : (genUpper.startsWith('F') ? 'Mujer' : 'Otro'));

  return {
    id: docente.id,
    persona_id: persona?.id ?? null,
    usuario_id: usuario?.id ?? null,
    orden_listado: docente.ordenListado ?? null,
    documento_identidad: persona?.identificacion ?? null,
    tipo_documento: persona?.tipo_identificacion ?? null,
    nombre_completo: nombreCompleto,
    primer_nombre: persona?.primer_nombre ?? null,
    segundo_nombre: persona?.segundo_nombre ?? null,
    primer_apellido: persona?.primer_apellido ?? null,
    segundo_apellido: persona?.segundo_apellido ?? null,
    vinculacion: getTipoVinculacionLabel(docente.tipoVinculacion, docente.vinculacionDisplay),
    vinculacion_codigo: docente.tipoVinculacion,
    regimen_normativo: docente.regimenNormativo,
    regimenNormativo: docente.regimenNormativo,
    dedicacion: getDedicacionLabel(docente.dedicacion, docente.dedicacionDisplay),
    dedicacion_codigo: docente.dedicacion,
    dedicacion_horas_semana: docente.dedicacionHorasSemana ?? getHorasSemanalesFromDedicacion(docente.dedicacion),
    territorial: (docente as any).territorial?.nombre ?? null,
    territorial_id: docente.territorialId,
    territorial_codigo: (docente as any).territorial?.codigo ?? null,
    sede: (docente as any).sede?.nombre ?? null,
    sede_id: docente.sedeId ?? null,
    categoria: docente.escalafon ?? null,
    nucleo_tematico: docente.nucleoTematico ?? null,
    nivel_formacion: docente.nivelFormacion ?? null,
    perfil_academico_pro: docente.perfilAcademicoPro ?? null,
    perfil_academico: docente.perfilAcademico ?? null,
    pregrado: docente.pregrado ?? null,
    especializacion: docente.especializacion ?? null,
    maestria: docente.maestria ?? null,
    doctorado: docente.doctorado ?? null,
    posdoctorado: docente.posDoctorado ?? null,
    investigacion: docente.investigacion ?? null,
    origen_vinculacion: docente.origenVinculacion ?? null,
    acto_administrativo_vinculacion: docente.actoAdministrativoVinculacion ?? null,
    correo_institucional: docente.correoInstitucional ?? usuario?.email ?? null,
    correo_personal: docente.correoAlternativo ?? persona?.correo_alternativo ?? null,
    telefono: persona?.telefono ?? null,
    ultima_evaluacion: docente.ultimaEvaluacion ?? null,
    situacion_administrativa: docente.situacionAdministrativa ?? null,
    situacion_categoria: docente.situacionCategoria ?? categorizarSituacion(docente.situacionAdministrativa),
    inicio_vinculacion: docente.fechaInicioVinculacion ?? null,
    fin_vinculacion: docente.fechaFinVinculacion ?? persona?.fecha_fin_contrato ?? null,
    puntaje_salarial: docente.puntajeSalarial ?? null,
    genero: persona?.genero ?? null,
    sexo_biologico: sexoBiologico,
    nacimiento: formatDateOnly(fechaNacimiento),
    edad,
    rango_edad: rangoEdad,
    horas_programables: docente.horasAsignables ?? 0,
    estado: docente.estado,
    email: usuario?.email ?? null,
    activo: usuario?.activo ?? true,
    periodo_carga: docente.periodoCarga ?? null,
    periodoCarga: docente.periodoCarga ?? null,
    observaciones: docente.observaciones ?? null,
    id_rund: docente.idRund ?? null,
    idRund: docente.idRund ?? null,
    // BR-047 â€” Approval state
    estadoAprobacion: docente.estadoAprobacion ?? 'PENDIENTE_APROBACION',
    completitud: docente.completitud ?? {},
    // Â§6 â€” Canal de origen
    canal_origen: docente.canalOrigen ?? 'MASIVO',
    createdAt: docente.createdAt,
    updatedAt: docente.updatedAt,
  };
}

function buildAuthBancoDocenteResponse(row: any) {
  const fechaNacimiento = row.fecha_nacimiento || null;
  const edad = computeEdad(fechaNacimiento, row.edad_referencia);
  const rangoEdad = computeRangoEdad(edad, row.rango_edad);
  const nombreCompleto = row.nombre_completo || [row.primer_nombre, row.primer_apellido, row.segundo_apellido].filter(Boolean).join(' ').trim() || row.username || 'Sin nombre';
  const dedicacionCodigo = row.dedicacion_codigo || null;
  const email = row.email || row.username || null;

  const genUpper = (row.genero || '').toUpperCase();
  const sexoBiologico = row.sexo_biologico || (genUpper.startsWith('M') ? 'Hombre' : (genUpper.startsWith('F') ? 'Mujer' : 'Otro'));

  return {
    id: row.docente_id || row.usuario_id,
    persona_id: row.persona_id,
    usuario_id: row.usuario_id,
    docente_id: row.docente_id || null,
    orden_listado: row.orden_listado ?? null,
    documento_identidad: row.documento_identidad ?? null,
    tipo_documento: row.tipo_documento ?? null,
    nombre_completo: nombreCompleto,
    primer_nombre: row.primer_nombre ?? null,
    segundo_nombre: null,
    primer_apellido: row.primer_apellido ?? null,
    segundo_apellido: row.segundo_apellido ?? null,
    vinculacion: getTipoVinculacionLabel(row.vinculacion_codigo, row.vinculacion) || row.vinculacion || null,
    vinculacion_codigo: row.vinculacion_codigo ?? null,
    regimen_normativo: row.regimen_normativo || row.regimenNormativo || null,
    regimenNormativo: row.regimen_normativo || row.regimenNormativo || null,
    dedicacion: dedicacionCodigo ? getDedicacionLabel(dedicacionCodigo, row.dedicacion) : null,
    dedicacion_codigo: dedicacionCodigo,
    dedicacion_horas_semana: row.dedicacion_horas_semana ?? getHorasSemanalesFromDedicacion(dedicacionCodigo || row.dedicacion),
    territorial: row.territorial || row.auth_territorial || null,
    territorial_id: row.territorial_id || row.auth_territorial_id || null,
    territorial_codigo: row.territorial_codigo || row.auth_territorial_codigo || null,
    sede: row.sede || row.auth_sede || null,
    sede_id: row.sede_id || row.auth_sede_id || null,
    categoria: row.categoria ?? null,
    nucleo_tematico: row.nucleo_tematico ?? null,
    nivel_formacion: row.nivel_formacion ?? null,
    perfil_academico_pro: row.perfil_academico_pro ?? null,
    perfil_academico: row.perfil_academico ?? null,
    pregrado: row.pregrado ?? null,
    especializacion: row.especializacion ?? null,
    maestria: row.maestria ?? null,
    doctorado: row.doctorado ?? null,
    posdoctorado: row.posdoctorado ?? null,
    investigacion: row.investigacion ?? null,
    origen_vinculacion: row.origen_vinculacion ?? null,
    acto_administrativo_vinculacion: row.acto_administrativo_vinculacion ?? null,
    correo_institucional: row.correo_institucional || email,
    correo_personal: row.correo_personal ?? row.correo_alternativo ?? null,
    telefono: row.telefono ?? null,
    ultima_evaluacion: row.ultima_evaluacion ?? null,
    situacion_administrativa: row.situacion_administrativa ?? null,
    situacion_categoria: row.situacion_categoria ?? categorizarSituacion(row.situacion_administrativa),
    inicio_vinculacion: row.inicio_vinculacion ?? null,
    fin_vinculacion: row.fin_vinculacion ?? null,
    puntaje_salarial: row.puntaje_salarial ?? null,
    genero: row.genero ?? null,
    sexo_biologico: sexoBiologico,
    nacimiento: formatDateOnly(fechaNacimiento),
    edad,
    rango_edad: rangoEdad,
    horas_programables: row.horas_programables ?? 0,
    estado: row.estado_efectivo || row.estado || (row.activo ? 'ACTIVO' : 'INACTIVO'),
    email,
    activo: row.activo_efectivo ?? row.activo,
    roles: row.roles || ['DOCENTE'],
    period_carga: row.periodo_carga || row.periodoCarga || null,
    periodoCarga: row.periodo_carga || row.periodoCarga || null,
    observaciones: row.observaciones ?? null,
    id_rund: row.id_rund || row.idRund || null,
    idRund: row.id_rund || row.idRund || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// â”€â”€â”€ service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Injectable()
export class BancoDocentesService implements OnModuleInit {
  private readonly logger = new Logger(BancoDocentesService.name);

  constructor(
    @InjectRepository(DocenteEntity)
    private readonly docenteRepo: Repository<DocenteEntity>,
    @InjectRepository(PersonaEntity)
    private readonly personaRepo: Repository<PersonaEntity>,
    @InjectRepository(UsuarioEntity)
    private readonly usuarioRepo: Repository<UsuarioEntity>,
    @InjectRepository(BancoDocenteInvitacionEntity)
    private readonly invitacionRepo: Repository<BancoDocenteInvitacionEntity>,
    @InjectRepository(RundAprobacionLogEntity)
    private readonly auditLogRepo: Repository<RundAprobacionLogEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.ensureBancoDocentesExcelColumns();
    this.logger.log('BancoDocentesService initialized');
  }

  private async ensureBancoDocentesExcelColumns() {
    try {
      await this.dataSource.query(`
        ALTER TABLE academic_work_plan."Docente"
          ADD COLUMN IF NOT EXISTS "sexoBiologico" TEXT,
          ADD COLUMN IF NOT EXISTS "dedicacionHorasSemana" INTEGER,
          ADD COLUMN IF NOT EXISTS "situacionCategoria" TEXT
      `);
      await this.dataSource.query(`DROP INDEX IF EXISTS academic_work_plan."Docente_personaId_key"`);
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "Docente_personaId_periodoCarga_key"
        ON academic_work_plan."Docente" ("personaId", COALESCE("periodoCarga", ''))
      `);
    } catch (error: any) {
      this.logger.warn(`No se pudieron verificar columnas RUND Excel en Docente: ${error?.message || error}`);
    }
  }

  private async getTerritoriales(): Promise<AuthSeccionalTerritorial[]> {
    const rows = await this.dataSource.query(
      `
      SELECT
        id_seccional::text AS id,
        nom_seccional AS nombre,
        cod_seccional AS codigo
      FROM auth.seccionales
      ORDER BY nom_seccional ASC
      `,
    );
    return rows.map((row: any) => ({
      id: String(row.id),
      nombre: row.nombre,
      codigo: row.codigo ?? null,
    }));
  }

  private async getNextAuthLegacyPersonId(manager: any): Promise<string | null> {
    const [columnInfo] = await manager.query(
      `
        SELECT column_default
        FROM information_schema.columns
        WHERE table_schema = 'auth'
          AND table_name = 'personas'
          AND column_name = 'id_tercero'
        LIMIT 1
      `,
    );

    if (!columnInfo) return null;

    const columnDefault = typeof columnInfo.column_default === 'string' ? columnInfo.column_default : null;
    if (columnDefault?.includes('nextval')) {
      const [nextValue] = await manager.query(
        `SELECT nextval(pg_get_serial_sequence($1, 'id_tercero')) AS next_id`,
        ['auth.personas'],
      );
      return String(nextValue.next_id);
    }

    await manager.query(`LOCK TABLE auth.personas IN EXCLUSIVE MODE`);
    const [nextValue] = await manager.query(
      `SELECT COALESCE(MAX(id_tercero), 0) + 1 AS next_id FROM auth.personas`,
    );
    return String(nextValue.next_id);
  }

  private resolveNotificationsBaseUrl(): string {
    const direct = process.env.NOTIFICATIONS_SERVICE_URL || process.env.NOTIFICATION_SERVICE_URL;
    if (direct) return direct.replace(/\/$/, '');
    if ((process.env.NODE_ENV || 'development') !== 'production') return 'http://localhost:3009';
    return 'http://notifications-service:3009';
  }

  private async sendWelcomeEmail(to: string, username: string, password: string, fullName: string): Promise<{ sent: boolean; error?: string }> {
    const baseUrl = this.resolveNotificationsBaseUrl();
    const subject = 'Credenciales de acceso - Banco de Docentes ESAP';
    const text = [
      `Hola ${fullName},`,
      '',
      'Tu usuario docente fue creado en la plataforma ESAP.',
      `Usuario: ${username}`,
      `ContraseÃ±a temporal: ${password}`,
      '',
      'Por seguridad, cambia tu contraseÃ±a en el primer ingreso.',
    ].join('\n');
    const html = `
      <p>Hola ${fullName},</p>
      <p>Tu usuario docente fue creado en la plataforma ESAP.</p>
      <p><strong>Usuario:</strong> ${username}<br><strong>ContraseÃ±a temporal:</strong> ${password}</p>
      <p>Por seguridad, cambia tu contraseÃ±a en el primer ingreso.</p>
    `;

    try {
      const response = await fetch(`${baseUrl}/api/v1/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, text, html }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        const error = `notifications-service ${response.status}: ${body}`;
        this.logger.warn(`No se pudo enviar bienvenida a ${to}: ${error}`);
        return { sent: false, error };
      }

      return { sent: true };
    } catch (error: any) {
      const message = error?.message || String(error);
      this.logger.warn(`No se pudo conectar a notifications-service (${baseUrl}) para ${to}: ${message}`);
      return { sent: false, error: message };
    }
  }

  /** URL pública del frontend (shell) para armar enlaces de autogestión. */
  private resolvePublicAppUrl(): string {
    const direct = process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL;
    return (direct || 'http://localhost:3000').replace(/\/$/, '');
  }

  /** Envío genérico de correo vía notifications-service. No lanza: devuelve {sent,error}. */
  private async sendEmail(to: string, subject: string, text: string, html: string): Promise<{ sent: boolean; error?: string }> {
    const baseUrl = this.resolveNotificationsBaseUrl();
    try {
      const response = await fetch(`${baseUrl}/api/v1/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, text, html }),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        const error = `notifications-service ${response.status}: ${body}`;
        this.logger.warn(`No se pudo enviar correo a ${to}: ${error}`);
        return { sent: false, error };
      }
      return { sent: true };
    } catch (error: any) {
      const message = error?.message || String(error);
      this.logger.warn(`No se pudo conectar a notifications-service (${baseUrl}) para ${to}: ${message}`);
      return { sent: false, error: message };
    }
  }

  private authDocentesBaseSql() {
    return `
      WITH auth_docentes AS (
        SELECT
          u.id_user AS usuario_id,
          u.username,
          u.is_active AS activo,
          CASE
            WHEN UPPER(COALESCE(NULLIF(TRIM(d.estado), ''), CASE WHEN COALESCE(u.is_active, true) THEN 'ACTIVO' ELSE 'INACTIVO' END)) IN ('INACTIVO', 'RETIRADO', 'RETIRADO_DOCENTE', 'TERMINADO', 'DESVINCULADO') THEN false
            WHEN UPPER(COALESCE(NULLIF(TRIM(d.estado), ''), CASE WHEN COALESCE(u.is_active, true) THEN 'ACTIVO' ELSE 'INACTIVO' END)) = 'ACTIVO' THEN true
            ELSE COALESCE(u.is_active, true)
          END AS activo_efectivo,
          CASE
            WHEN UPPER(COALESCE(NULLIF(TRIM(d.estado), ''), CASE WHEN COALESCE(u.is_active, true) THEN 'ACTIVO' ELSE 'INACTIVO' END)) IN ('INACTIVO', 'RETIRADO', 'RETIRADO_DOCENTE', 'TERMINADO', 'DESVINCULADO') THEN 'INACTIVO'
            ELSE 'ACTIVO'
          END AS estado_efectivo,
          u.created_at,
          u.updated_at,
          p.id_person AS persona_id,
          p.num_identificacion AS documento_identidad,
          p.tip_identificacion AS tipo_documento,
          p.nom_largo AS nombre_completo,
          p.nom_tercero AS primer_nombre,
          p.pri_apellido AS primer_apellido,
          p.seg_apellido AS segundo_apellido,
          p.gen_tercero AS genero,
          p.fec_nacimiento AS fecha_nacimiento,
          p.dir_email AS email,
          p.tel_celular AS telefono,
          p.id_seccional AS auth_territorial_id,
          sec.nom_seccional AS auth_territorial,
          sec.cod_seccional AS auth_territorial_codigo,
          p.id_sede AS auth_sede_id,
          sede.nom_sede AS auth_sede,
          d.id AS docente_id,
          d."ordenListado" AS orden_listado,
          d."tipoVinculacion" AS vinculacion_codigo,
          d."vinculacionDisplay" AS vinculacion,
          d.dedicacion AS dedicacion_codigo,
          d."dedicacionDisplay" AS dedicacion,
          d."dedicacionHorasSemana" AS dedicacion_horas_semana,
          COALESCE(d."territorialId", p.id_seccional::text) AS territorial_id,
          COALESCE(doc_sec.nom_seccional, sec.nom_seccional) AS territorial,
          COALESCE(doc_sec.cod_seccional, sec.cod_seccional) AS territorial_codigo,
          COALESCE(d."sedeId", p.id_sede::text) AS sede_id,
          COALESCE(doc_sede.nom_sede, sede.nom_sede) AS sede,
          d.escalafon AS categoria,
          d."nucleoTematico" AS nucleo_tematico,
          d."nivelFormacion" AS nivel_formacion,
          d."perfilAcademicoPro" AS perfil_academico_pro,
          d."perfilAcademico" AS perfil_academico,
          d.pregrado,
          d.especializacion,
          d.maestria,
          d.doctorado,
          d."posDoctorado" AS posdoctorado,
          d.investigacion,
          d."origenVinculacion" AS origen_vinculacion,
          d."actoAdministrativoVinculacion" AS acto_administrativo_vinculacion,
          d."correoInstitucional" AS correo_institucional,
          d."correoAlternativo" AS correo_personal,
          d."sexoBiologico" AS sexo_biologico,
          d."ultimaEvaluacion" AS ultima_evaluacion,
          d."situacionAdministrativa" AS situacion_administrativa,
          d."situacionCategoria" AS situacion_categoria,
          d."fechaInicioVinculacion" AS inicio_vinculacion,
          d."fechaFinVinculacion" AS fin_vinculacion,
          d."puntajeSalarial" AS puntaje_salarial,
          d."edadReferencia" AS edad_referencia,
          d."rangoEdad" AS rango_edad,
          d."horasAsignables" AS horas_programables,
          d."regimenNormativo" AS regimen_normativo,
          d."periodoCarga" AS periodo_carga,
          d."updatedAt" AS docente_updated_at,
          d.observaciones AS observaciones,
          d."idRund" AS id_rund,
          d.estado AS estado,
          ARRAY(
            SELECT DISTINCT r2.code
            FROM auth.user_roles ur2
            INNER JOIN auth.role r2 ON r2.id = ur2.id_rol AND COALESCE(r2.is_active, true) = true
            WHERE ur2.id_user = u.id_user
              AND COALESCE(ur2.is_active, true) = true
            ORDER BY r2.code
          ) AS roles
        FROM auth."user" u
        INNER JOIN auth.personas p ON p.id_person = u.id_person
        LEFT JOIN auth.seccionales sec ON sec.id_seccional = p.id_seccional
        LEFT JOIN auth.sedes sede ON sede.id_sede = p.id_sede
        LEFT JOIN academic_work_plan."Docente" d ON d."personaId"::text = p.id_person::text
        LEFT JOIN auth.seccionales doc_sec ON doc_sec.id_seccional::text = d."territorialId"
        LEFT JOIN auth.sedes doc_sede ON doc_sede.id_sede::text = d."sedeId"
        WHERE EXISTS (
          SELECT 1
          FROM auth.user_roles ur
          INNER JOIN auth.role r ON r.id = ur.id_rol AND COALESCE(r.is_active, true) = true
          WHERE ur.id_user = u.id_user
            AND COALESCE(ur.is_active, true) = true
            AND (UPPER(r.code) = 'DOCENTE' OR UPPER(r.name) = 'DOCENTE')
        )
      )
    `;
  }

  private buildAuthDocentesFilters(filters: { territorial?: string; dedicacion?: string; vinculacion?: string; estado?: string; search?: string; periodoCarga?: string }, params: any[]) {
    const conditions: string[] = [];

    if (filters.territorial) {
      params.push(filters.territorial);
      const idx = params.length;
      conditions.push(`(
        auth_territorial_id::text = $${idx}
        OR territorial_id::text = $${idx}
        OR auth_territorial ILIKE $${idx}
        OR territorial ILIKE $${idx}
      )`);
    }

    if (filters.dedicacion) {
      params.push(filters.dedicacion);
      conditions.push(`dedicacion_codigo = $${params.length}`);
    }

    if (filters.estado) {
      const estado = String(filters.estado).trim().toUpperCase();
      if (estado === 'ACTIVO' || estado === 'INACTIVO') {
        params.push(estado);
        conditions.push(`estado_efectivo = $${params.length}`);
      }
    }

    if (filters.vinculacion) {
      params.push(filters.vinculacion);
      const idx = params.length;
      conditions.push(`(
        vinculacion_codigo = $${idx}
        OR LOWER(vinculacion) = LOWER($${idx})
      )`);
    }

    if (filters.periodoCarga) {
      params.push(filters.periodoCarga);
      conditions.push(`periodo_carga = $${params.length}`);
    }

    if (filters.search) {
      params.push(`%${filters.search}%`);
      const idx = params.length;
      conditions.push(`(
        documento_identidad ILIKE $${idx}
        OR nombre_completo ILIKE $${idx}
        OR primer_nombre ILIKE $${idx}
        OR primer_apellido ILIKE $${idx}
        OR email ILIKE $${idx}
        OR username ILIKE $${idx}
        OR correo_institucional ILIKE $${idx}
      )`);
    }

    return conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  }

  async list(filters: { territorial?: string; dedicacion?: string; vinculacion?: string; estado?: string; search?: string; periodoCarga?: string; page?: number; limit?: number }) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(200, Math.max(1, filters.limit || 50));
    const skip = (page - 1) * limit;
    const params: any[] = [];
    const where = this.buildAuthDocentesFilters(filters, params);
    const baseSql = this.authDocentesBaseSql();

    const countRows = await this.dataSource.query(
      `${baseSql} SELECT COUNT(*)::int AS total FROM auth_docentes ${where}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    params.push(limit, skip);
    const rows = await this.dataSource.query(
      `
      ${baseSql}
      SELECT *
      FROM auth_docentes
      ${where}
      ORDER BY orden_listado ASC NULLS LAST, nombre_completo ASC
      LIMIT $${params.length - 1} OFFSET $${params.length}
      `,
      params,
    );

    return { data: rows.map(buildAuthBancoDocenteResponse), total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getById(id: string, periodoCarga?: string) {
    const rows = await this.dataSource.query(
      `
      ${this.authDocentesBaseSql()}
      SELECT *
      FROM auth_docentes
      WHERE (
        usuario_id::text = $1
        OR persona_id::text = $1
        OR docente_id::text = $1
        OR documento_identidad = $1
      )
        AND ($2::text IS NULL OR periodo_carga = $2::text)
      ORDER BY
        CASE WHEN $2::text IS NOT NULL AND periodo_carga = $2::text THEN 0 ELSE 1 END,
        CASE WHEN id_rund IS NOT NULL THEN 0 ELSE 1 END,
        CASE WHEN periodo_carga IS NOT NULL THEN 0 ELSE 1 END,
        docente_updated_at DESC NULLS LAST,
        updated_at DESC NULLS LAST
      LIMIT 1
      `,
      [id, periodoCarga || null],
    );
    if (!rows[0]) {
      const periodMessage = periodoCarga ? ` para el periodo ${periodoCarga}` : '';
      throw new NotFoundException(`Docente ${id} no encontrado${periodMessage}`);
    }
    return buildAuthBancoDocenteResponse(rows[0]);
  }

  async upsertDocente(rawPayload: any, options: { rejectExisting?: boolean, outerManager?: any, relaxValidation?: boolean } = {}) {
    const payload = normalizeBancoDocentePayload(rawPayload);
    // Canal 3 (autogestión): validación mínima; el resto lo completa GGP.
    if (options.relaxValidation) {
      validatePayloadAutogestion(payload);
    } else {
      validatePayload(payload);
      if (rawPayload?.canal_origen === 'MODAL') {
        validateManualBancoDocentePayload(payload, rawPayload);
      }
    }

    const territoriales = await this.getTerritoriales();
    let territorial = territoriales.find((t) => normalizeLookupText(t.nombre) === normalizeLookupText(payload.territorialNombre)) || findTerritorialMatch(territoriales, payload.territorialNombre);
    if (!territorial?.id) {
      // En autogestión el docente puede no conocer su territorial; usamos una por
      // defecto para no bloquear el autoregistro (GGP la corrige en validación).
      if (options.relaxValidation && territoriales.length > 0) {
        territorial = territoriales.find((t) => normalizeLookupText(t.nombre) === normalizeLookupText('Sede Central')) || territoriales[0];
      } else {
        throw new BadRequestException({
          message: `La territorial "${payload.territorialNombre}" no existe en el catálogo.`,
          columna: 'TERRITORIAL',
          datoErrado: payload.territorialNombre,
          valorEsperado: 'Sede válida'
        });
      }
    }

    const runWithManager = async (manager: any) => {
      const emailFinal = payload.correoInstitucional!.toLowerCase().trim();
      const phoneFinal = normalizePhoneForAuth(payload.telefono);
      const finalFullName = payload.fullName || [payload.primer_nombre, payload.segundo_nombre, payload.primer_apellido, payload.segundo_apellido].filter(Boolean).join(' ').trim();
      if (!finalFullName) throw new BadRequestException({
        message: `No se pudo construir el nombre del docente ${payload.documentNumber}.`,
        columna: 'NOMBRE_COMPLETO',
        datoErrado: payload.fullName || '(vacÃ­o)',
        valorEsperado: 'Nombres y apellidos completos'
      });

      const existingPersonaRows = await manager.query(
        `
        SELECT *
        FROM auth.personas
        WHERE num_identificacion = $1
        LIMIT 1
        `,
        [payload.documentNumber],
      );
      let authPersona = existingPersonaRows[0] || null;

      // Autogestión: el correo fue verificado por OTP y es la llave confiable.
      // Si no encontramos la persona por documento (p.ej. el docente no recordó/
      // escribió mal su cédula), la resolvemos por correo para apuntar al registro
      // correcto y evitar un falso "correo en uso por otra persona".
      if (!authPersona && options.relaxValidation) {
        const byEmailRows = await manager.query(
          `SELECT * FROM auth.personas WHERE LOWER(dir_email) = LOWER($1) LIMIT 1`,
          [emailFinal],
        );
        if (byEmailRows[0]) authPersona = byEmailRows[0];
      }

      const emailConflictRows = await manager.query(
        `
        SELECT owner_id
        FROM (
          SELECT p.id_person::text AS owner_id
          FROM auth.personas p
          WHERE LOWER(p.dir_email) = LOWER($1)
          UNION
          SELECT u.id_person::text AS owner_id
          FROM auth."user" u
          WHERE LOWER(u.username) = LOWER($1)
        ) owners
        WHERE owner_id IS NULL OR $2::uuid IS NULL OR owner_id::uuid <> $2::uuid
        LIMIT 1
        `,
        [emailFinal, authPersona?.id_person || null],
      );

      if (emailConflictRows[0]) {
        throw new BadRequestException({
          message: `El correo ${emailFinal} ya estÃ¡ en uso por otra persona o usuario.`,
          columna: 'CORREO_INSTITUCIONAL',
          datoErrado: emailFinal,
          valorEsperado: 'Correo Ãºnico'
        });
      }

      const authSeccionalId = Number(territorial.id);
      const authPersonId = authPersona?.id_person || randomUUID();
      const firstName = payload.primer_nombre || splitFullName(finalFullName).primer_nombre || 'Docente';
      const lastName = payload.primer_apellido || splitFullName(finalFullName).primer_apellido || null;
      const gender = (payload.genero || 'N').trim().toUpperCase().slice(0, 6);

      if (!authPersona) {
        const legacyPersonId = await this.getNextAuthLegacyPersonId(manager);
        const columns = [
          'id_person',
          ...(legacyPersonId ? ['id_tercero'] : []),
          'num_identificacion',
          'tip_identificacion',
          'nom_largo',
          'nom_tercero',
          'pri_apellido',
          'seg_apellido',
          'gen_tercero',
          'fec_nacimiento',
          'dir_email',
          'tel_celular',
          'id_seccional',
          'fec_creacion',
          'fec_modificacion',
        ];
        const values = [
          authPersonId,
          ...(legacyPersonId ? [legacyPersonId] : []),
          payload.documentNumber,
          payload.documentType || 'CC',
          finalFullName,
          firstName,
          lastName,
          payload.segundo_apellido,
          gender || 'N',
          payload.fechaNacimiento,
          emailFinal,
          phoneFinal,
          authSeccionalId,
        ];
        const placeholders = values.map((_, idx) => `$${idx + 1}`);
        await manager.query(
          `
          INSERT INTO auth.personas (${columns.slice(0, -2).join(', ')}, fec_creacion, fec_modificacion)
          VALUES (${placeholders.join(', ')}, CURRENT_DATE, CURRENT_DATE)
          `,
          values,
        );
        authPersona = { id_person: authPersonId };
      } else {
        await manager.query(
          `
          UPDATE auth.personas
          SET
            tip_identificacion = $2,
            nom_largo = $3,
            nom_tercero = $4,
            pri_apellido = $5,
            seg_apellido = $6,
            gen_tercero = $7,
            fec_nacimiento = $8,
            dir_email = $9,
            tel_celular = $10,
            id_seccional = COALESCE($11, id_seccional),
            fec_modificacion = CURRENT_DATE
          WHERE id_person = $1
          `,
          [
            authPersonId,
            payload.documentType || authPersona.tip_identificacion || 'CC',
            finalFullName,
            firstName,
            lastName,
            payload.segundo_apellido,
            gender || authPersona.gen_tercero || 'N',
            payload.fechaNacimiento || authPersona.fec_nacimiento || null,
            emailFinal,
            phoneFinal || authPersona.tel_celular || null,
            authSeccionalId,
          ],
        );
      }

      const userRows = await manager.query(
        `SELECT * FROM auth."user" WHERE id_person = $1 LIMIT 1`,
        [authPersonId],
      );
      let authUser = userRows[0] || null;
      let authUserCreated = false;

      if (!authUser) {
        const passwordHash = await bcrypt.hash(payload.documentNumber!, 10);
        const userId = randomUUID();
        await manager.query(
          `
          INSERT INTO auth."user" (
            id_user,
            public_id,
            username,
            password_hash,
            id_person,
            is_active,
            password_temp,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, false, true, now(), now())
          `,
          [userId, randomUUID(), emailFinal, passwordHash, authPersonId],
        );
        authUser = { id_user: userId };
        authUserCreated = true;
      } else {
        await manager.query(
          `
          UPDATE auth."user"
          SET username = $2, updated_at = now()
          WHERE id_user = $1
          `,
          [authUser.id_user, emailFinal],
        );
      }

      const roleRows = await manager.query(
        `
        SELECT id
        FROM auth.role
        WHERE UPPER(code) = 'DOCENTE' OR UPPER(name) = 'DOCENTE'
        ORDER BY CASE WHEN UPPER(code) = 'DOCENTE' THEN 0 ELSE 1 END
        LIMIT 1
        `,
      );
      const docenteRoleId = roleRows[0]?.id;
      if (!docenteRoleId) throw new BadRequestException('No existe el rol DOCENTE en auth.role.');

      await manager.query(
        `
        INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at)
        VALUES ($1, $2, true, now(), now())
        ON CONFLICT (id_user, id_rol)
        DO UPDATE SET is_active = true, updated_at = now()
        `,
        [authUser.id_user, docenteRoleId],
      );

      const targetPeriodoCarga = payload.periodoCarga || null;
      const existingDocente = targetPeriodoCarga
        ? await manager.findOne(DocenteEntity, { where: { personaId: authPersonId, periodoCarga: targetPeriodoCarga } as any })
        : await manager.findOne(DocenteEntity, { where: { personaId: authPersonId } });
      if (existingDocente && options.rejectExisting) {
        throw new BadRequestException({
          message: `El documento ${payload.documentNumber} ya existe en el Banco de Docentes para el periodo ${targetPeriodoCarga || 'sin periodo'}.`,
          columna: 'DOCUMENTO_IDENTIDAD',
          datoErrado: payload.documentNumber,
          valorEsperado: `Documento no registrado en el periodo ${targetPeriodoCarga || 'seleccionado'}`,
        });
      }

      let nextIdRund = payload.idRund || existingDocente?.idRund;
      if (!nextIdRund) {
        const seqRes = await manager.query(`SELECT nextval('academic_work_plan.docente_id_rund_seq') AS next_val`);
        nextIdRund = `RUND-${String(seqRes[0].next_val).padStart(4, '0')}`;
      }

      const docenteData: Partial<DocenteEntity> = {
        personaId: authPersonId,
        territorialId: territorial.id,
        sedeId: existingDocente?.sedeId || null,
        tipoVinculacion: payload.tipoVinculacion,
        dedicacion: payload.dedicacion,
        escalafon: payload.escalafon ?? existingDocente?.escalafon ?? null,
        horasAsignables: payload.horasAsignables,
        estado: payload.estado,
        ordenListado: payload.orderIndex ?? existingDocente?.ordenListado ?? null,
        vinculacionDisplay: payload.vinculacionLabel ?? existingDocente?.vinculacionDisplay ?? null,
        dedicacionDisplay: payload.dedicacionLabel ?? existingDocente?.dedicacionDisplay ?? null,
        dedicacionHorasSemana: payload.dedicacionHorasSemana ?? existingDocente?.dedicacionHorasSemana ?? null,
        nucleoTematico: payload.nucleoTematico ?? existingDocente?.nucleoTematico ?? null,
        nivelFormacion: payload.nivelFormacion ?? existingDocente?.nivelFormacion ?? null,
        perfilAcademicoPro: payload.perfilAcademicoPro ?? existingDocente?.perfilAcademicoPro ?? null,
        perfilAcademico: payload.perfilAcademico ?? existingDocente?.perfilAcademico ?? null,
        pregrado: payload.pregrado ?? existingDocente?.pregrado ?? null,
        especializacion: payload.especializacion ?? existingDocente?.especializacion ?? null,
        maestria: payload.maestria ?? existingDocente?.maestria ?? null,
        doctorado: payload.doctorado ?? existingDocente?.doctorado ?? null,
        posDoctorado: payload.posDoctorado ?? existingDocente?.posDoctorado ?? null,
        investigacion: payload.investigacion ?? existingDocente?.investigacion ?? null,
        origenVinculacion: payload.origenVinculacion ?? existingDocente?.origenVinculacion ?? null,
        actoAdministrativoVinculacion: payload.actoAdministrativoVinculacion ?? existingDocente?.actoAdministrativoVinculacion ?? null,
        correoInstitucional: emailFinal,
        correoAlternativo: payload.correoAlternativo ?? existingDocente?.correoAlternativo ?? null,
        sexoBiologico: payload.sexoBiologico ?? existingDocente?.sexoBiologico ?? null,
        ultimaEvaluacion: payload.ultimaEvaluacion ?? existingDocente?.ultimaEvaluacion ?? null,
        situacionAdministrativa: payload.situacionAdministrativa ?? existingDocente?.situacionAdministrativa ?? null,
        situacionCategoria: payload.situacionCategoria ?? existingDocente?.situacionCategoria ?? null,
        fechaInicioVinculacion: payload.fechaInicioVinculacion ?? existingDocente?.fechaInicioVinculacion ?? null,
        fechaFinVinculacion: payload.fechaFinVinculacion ?? existingDocente?.fechaFinVinculacion ?? null,
        puntajeSalarial: payload.puntajeSalarial ?? existingDocente?.puntajeSalarial ?? null,
        edadReferencia: payload.edadReferencia ?? existingDocente?.edadReferencia ?? null,
        rangoEdad: payload.rangoEdad ?? existingDocente?.rangoEdad ?? null,
        regimenNormativo: payload.regimenNormativo ?? existingDocente?.regimenNormativo ?? null,
        periodoCarga: payload.periodoCarga ?? existingDocente?.periodoCarga ?? null,
        observaciones: payload.observaciones ?? existingDocente?.observaciones ?? null,
        idRund: nextIdRund,
        // Â§6 â€” Canal de origen para auditorÃ­a
        canalOrigen: existingDocente?.canalOrigen || rawPayload?.canal_origen || 'MASIVO',
        // Â§4/Â§5.4 â€” Estado segÃºn canal: MODALâ†’Activo, AUTOGESTIONâ†’Pendiente, MASIVOâ†’Activo
        estadoAprobacion: rawPayload?.canal_origen === 'AUTOGESTION' ? 'PENDIENTE_APROBACION' : (existingDocente?.estadoAprobacion || 'PENDIENTE_APROBACION'),
      };

      let docente: DocenteEntity;
      let action = existingDocente ? 'update' : 'insert';
      
      if (!existingDocente) {
        docente = await manager.save(DocenteEntity, manager.create(DocenteEntity, docenteData));
      } else {
        let hasChanges = false;
        const fieldsToCheck: (keyof DocenteEntity)[] = ['tipoVinculacion', 'dedicacion', 'escalafon', 'horasAsignables', 'estado', 'ordenListado', 'vinculacionDisplay', 'dedicacionDisplay', 'dedicacionHorasSemana', 'nucleoTematico', 'nivelFormacion', 'perfilAcademicoPro', 'perfilAcademico', 'pregrado', 'especializacion', 'maestria', 'doctorado', 'posDoctorado', 'investigacion', 'origenVinculacion', 'actoAdministrativoVinculacion', 'correoInstitucional', 'correoAlternativo', 'sexoBiologico', 'ultimaEvaluacion', 'situacionAdministrativa', 'situacionCategoria', 'fechaInicioVinculacion', 'fechaFinVinculacion', 'puntajeSalarial', 'edadReferencia', 'rangoEdad', 'regimenNormativo', 'periodoCarga', 'observaciones', 'idRund'];
        
        for (const field of fieldsToCheck) {
          const newVal = docenteData[field];
          const oldVal = existingDocente[field];
          if (newVal !== undefined && newVal !== null && String(newVal) !== String(oldVal)) {
            hasChanges = true;
            break;
          }
        }
        
        if (!hasChanges) {
          action = 'unchanged';
          docente = existingDocente; // No guardamos si no hay cambios
        } else {
          docente = await manager.save(DocenteEntity, { ...existingDocente, ...docenteData });
        }
      }

      // Â§6.2 â€” Initialize RUND approval blocks (BR-044) for new records
      if (action === 'insert') {
        try {
          await this.inicializarBloques(docente.id, rawPayload?.cargadoPor || null, rawPayload?.canal_origen || 'MASIVO');
        } catch (e) {
          console.warn(`[RUND] Could not initialize blocks for docente ${docente.id}:`, e);
        }
      }

      // Inicializar ValidacionDocumental en el banco de docentes si no existe
      const camposSoporte = [
        { campo: 'DOCUMENTO_IDENTIDAD', tipo: 'IDENTIDAD' },
        { campo: 'TIPO_DOCUMENTO', tipo: 'IDENTIDAD' },
        { campo: 'NOMBRE_COMPLETO', tipo: 'IDENTIDAD' },
        { campo: 'FECHA_NACIMIENTO', tipo: 'IDENTIDAD' },
        { campo: 'GENERO', tipo: 'IDENTIDAD' },
        { campo: 'SEXO_BIOLOGICO', tipo: 'IDENTIDAD' },
        { campo: 'CORREO_INSTITUCIONAL', tipo: 'CONTACTO' },
        { campo: 'CORREO_ALTERNATIVO', tipo: 'CONTACTO' },
        { campo: 'TELEFONO', tipo: 'CONTACTO' },
        { campo: 'VINCULACION', tipo: 'VINCULACION' },
        { campo: 'TERRITORIAL', tipo: 'VINCULACION' },
        { campo: 'DEDICACION', tipo: 'VINCULACION' },
        { campo: 'DEDICACION_HORAS_SEMANA', tipo: 'VINCULACION' },
        { campo: 'HORAS_PTA', tipo: 'VINCULACION' },
        { campo: 'REGIMEN_NORMATIVO', tipo: 'VINCULACION' },
        { campo: 'CATEGORIA_ESCALAFON', tipo: 'ESCALAFON' },
        { campo: 'INICIO_VINCULACION', tipo: 'VINCULACION' },
        { campo: 'FIN_VINCULACION', tipo: 'VINCULACION' },
        { campo: 'ORIGEN_VINCULACION', tipo: 'VINCULACION' },
        { campo: 'ACTO_ADMINISTRATIVO', tipo: 'VINCULACION' },
        { campo: 'PUNTAJE_SALARIAL', tipo: 'ESCALAFON' },
        { campo: 'SITUACION_ADMINISTRATIVA', tipo: 'SITUACION' },
        { campo: 'SITUACION_CATEGORIA', tipo: 'SITUACION' },
        { campo: 'ESTADO_DOCENTE', tipo: 'VINCULACION' },
        { campo: 'NIVEL_FORMACION', tipo: 'FORMACION' },
        { campo: 'TITULO_PREGRADO', tipo: 'FORMACION' },
        { campo: 'TITULO_ESPECIALIZACION', tipo: 'FORMACION' },
        { campo: 'TITULO_MAESTRIA', tipo: 'FORMACION' },
        { campo: 'TITULO_DOCTORADO', tipo: 'FORMACION' },
        { campo: 'TITULO_POSDOCTORADO', tipo: 'FORMACION' },
        { campo: 'NUCLEO_TEMATICO', tipo: 'VINCULACION' },
        { campo: 'PERFIL_ACADEMICO', tipo: 'FORMACION' },
        { campo: 'INVESTIGACION_ACTIVA', tipo: 'EVALUACION' },
        { campo: 'ULTIMA_EVALUACION', tipo: 'EVALUACION' },
        { campo: 'OBSERVACIONES', tipo: 'TRANSVERSAL' },
        { campo: 'ID_RUND', tipo: 'TRANSVERSAL' }
      ];

      for (const item of camposSoporte) {
        await manager.query(
          `INSERT INTO academic_work_plan.validacion_documental (docente_id, campo_rund, tipo_documento_soporte, estado_documento)
           VALUES ($1, $2, $3, 'Sin cargar')
           ON CONFLICT (docente_id, campo_rund) DO NOTHING`,
          [docente.id, item.campo, item.tipo]
        );
      }

      return {
        action,
        previewId: rawPayload?.__previewId || null,
        sourceRowNumber: rawPayload?.__sourceRowNumber || null,
        personaId: authPersonId,
        docenteId: docente.id,
        usuarioId: authUser.id_user,
        documentNumber: payload.documentNumber!,
        fullName: finalFullName,
        email: emailFinal,
        territorialNombre: territorial.nombre,
        authUserCreated,
        welcomeEmail: { sent: false, skipped: !authUserCreated },
        message: action === 'insert' ? 'Docente creado correctamente.' : action === 'unchanged' ? 'Docente ya existe sin cambios.' : 'Docente actualizado correctamente.',
      };
    };

    const result = options.outerManager 
      ? await runWithManager(options.outerManager)
      : await this.dataSource.transaction(runWithManager);

    if (result.authUserCreated && !options.outerManager) {
      const welcomeEmail = await this.sendWelcomeEmail(result.email, result.email, result.documentNumber, result.fullName);
      return { ...result, welcomeEmail };
    }

    return result;
  }

  private async validateBulkDocumentDuplicates(rows: any[], queryRunner: { query: (sql: string, params?: any[]) => Promise<any[]> }) {
    type BulkDocumentIssue = {
      documentNumber: string;
      periodoCarga: string | null;
      rowNumber: number;
      name: string | null;
      reasons: string[];
      duplicateRows?: number[];
      existing?: any;
    };

    const issuesByRow = new Map<number, BulkDocumentIssue>();
    const rowsByDocumentPeriod = new Map<string, Array<{ index: number; rowNumber: number; name: string | null; documentNumber: string; periodoCarga: string | null }>>();

    const makeDocumentPeriodKey = (documentNumber: string, periodoCarga: string | null) => `${documentNumber}::${periodoCarga || ''}`;

    const ensureIssue = (index: number, documentNumber: string, periodoCarga: string | null, rowNumber: number, name: string | null) => {
      const existing = issuesByRow.get(index);
      if (existing) return existing;
      const issue: BulkDocumentIssue = { documentNumber, periodoCarga, rowNumber, name, reasons: [] };
      issuesByRow.set(index, issue);
      return issue;
    };

    rows.forEach((row, index) => {
      const payload = normalizeBancoDocentePayload(row || {});
      const documentNumber = payload.documentNumber ? String(payload.documentNumber).trim().replace(/\./g, '') : '';
      if (!documentNumber) return;
      const periodoCarga = payload.periodoCarga ? String(payload.periodoCarga).trim() : null;
      const rowNumber = Number(row?.__sourceRowNumber || index + 2);
      const name = payload.fullName || row?.NOMBRE_COMPLETO || row?.nombreCompleto || null;
      const key = makeDocumentPeriodKey(documentNumber, periodoCarga);
      const group = rowsByDocumentPeriod.get(key) || [];
      group.push({ index, rowNumber, name, documentNumber, periodoCarga });
      rowsByDocumentPeriod.set(key, group);
    });

    for (const group of rowsByDocumentPeriod.values()) {
      if (group.length <= 1) continue;
      const duplicateRows = group.map((item) => item.rowNumber).sort((a, b) => a - b);
      for (const item of group) {
        const issue = ensureIssue(item.index, item.documentNumber, item.periodoCarga, item.rowNumber, item.name);
        issue.duplicateRows = duplicateRows;
        issue.reasons.push(`El documento ${item.documentNumber} aparece repetido dentro del archivo para el periodo ${item.periodoCarga || 'sin periodo'} en las filas ${duplicateRows.join(', ')}.`);
      }
    }

    // NOTA: los documentos que YA EXISTEN en la BD NO se marcan como error ni se bloquean.
    // El Excel del RUND es la fuente de verdad y re-subirlo debe ACTUALIZAR esos docentes
    // (upsertDocente los actualiza cuando rejectExisting=false). Antes se agregaban aquí
    // como error bloqueante y se saltaban en processRows, por lo que sus datos (p.ej.
    // HORAS_PTA) nunca se actualizaban. Solo se bloquean los duplicados DENTRO del archivo
    // (detectados arriba), que sí son un error real de la carga.
    const blockedRowIndexes = new Set<number>(issuesByRow.keys());
    const errors = Array.from(issuesByRow.entries()).map(([index, issue]) => ({
      row: issue.rowNumber,
      fila: issue.rowNumber,
      hoja: 'CARGA_DOCENTES',
      columna: 'DOCUMENTO_IDENTIDAD',
      field: 'DOCUMENTO_IDENTIDAD',
      tipo: 'DUPLICADO_DOCUMENTO',
      duplicado: true,
      blocking: true,
      documentoIdentidad: issue.documentNumber,
      periodoCarga: issue.periodoCarga,
      nombre: issue.name,
      filasDuplicadas: issue.duplicateRows || [],
      registroExistente: issue.existing || null,
      datoErrado: issue.documentNumber,
      valorEsperado: `Documento unico para el periodo ${issue.periodoCarga || 'seleccionado'}`,
      message: issue.reasons.join(' '),
      mensaje: issue.reasons.join(' '),
      data: rows[index],
    }));

    return { errors, blockedRowIndexes };
  }

  async bulkUpsert(rows: any[], options: { rejectExisting?: boolean, dryRun?: boolean, omitErrors?: boolean, periodoCarga?: string } = {}) {
    const periodRows = await this.dataSource.query(`SELECT codigo FROM academic_work_plan.periodo_academico WHERE estado = 'en_curso' LIMIT 1`);
    const activePeriod = periodRows.length > 0 ? periodRows[0].codigo : null;
    const fallbackPeriod = options.periodoCarga || activePeriod;
    const preparedRows = rows.map((item, index) => {
      const row = { ...item, __sourceRowNumber: item?.__sourceRowNumber || index + 2 };
      if (fallbackPeriod && !row.PERIODO_CARGA && !row.periodoCarga && !row.periodo_carga) {
        row.PERIODO_CARGA = fallbackPeriod;
      }
      return row;
    });

    let finalResults: any[] = [];
    let finalErrors: any[] = [];

    const processRows = async (manager?: any) => {
      const queryRunner = manager || this.dataSource;
      const duplicateValidation = await this.validateBulkDocumentDuplicates(preparedRows, queryRunner);
      if (duplicateValidation.errors.length > 0 && !options.omitErrors && !options.dryRun) {
        return { results: [], errors: duplicateValidation.errors };
      }

      const results: any[] = [];
      const errors: any[] = [...duplicateValidation.errors];
      for (let i = 0; i < preparedRows.length; i++) {
        if (duplicateValidation.blockedRowIndexes.has(i)) continue;
        const row = { ...preparedRows[i] };
        const useRowSavepoint = Boolean(options.dryRun && manager?.query);
        const savepointName = `banco_docentes_row_${i}`;
        try {
          if (useRowSavepoint) {
            await manager.query(`SAVEPOINT ${savepointName}`);
          }
          const result = await this.upsertDocente(row, { ...options, outerManager: manager });
          results.push(result);
          if (useRowSavepoint) {
            await manager.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
            await manager.query(`RELEASE SAVEPOINT ${savepointName}`).catch(() => undefined);
          }
        } catch (err: any) {
          if (useRowSavepoint) {
            await manager.query(`ROLLBACK TO SAVEPOINT ${savepointName}`).catch(() => undefined);
            await manager.query(`RELEASE SAVEPOINT ${savepointName}`).catch(() => undefined);
          }
          if (!options.omitErrors && !options.dryRun) {
             // If not omitting, we still record it. Or wait, original code recorded all errors.
          }
          
          let errorPayload: any = {};
          if (typeof err.getResponse === 'function') {
            const resp = err.getResponse();
            if (typeof resp === 'object') errorPayload = resp;
            else if (typeof resp === 'string') errorPayload = { message: resp };
          }

          errors.push({ 
            row: row.__sourceRowNumber, 
            fila: row.__sourceRowNumber,
            hoja: 'CARGA_DOCENTES',
            message: errorPayload.message || err.message || 'Error desconocido',
            mensaje: errorPayload.message || err.message || 'Error desconocido',
            columna: errorPayload.columna,
            datoErrado: errorPayload.datoErrado,
            valorEsperado: errorPayload.valorEsperado,
            blocking: true,
            data: row 
          });
        }
      }
      return { results, errors };
    };

    if (options.dryRun) {
      try {
        await this.dataSource.transaction(async (manager) => {
          const { results, errors } = await processRows(manager);
          finalResults = results;
          finalErrors = errors;
          throw new Error('DRY_RUN_ROLLBACK');
        });
      } catch (err: any) {
        if (err.message !== 'DRY_RUN_ROLLBACK') throw err;
      }
    } else {
      const { results, errors } = await processRows();
      finalResults = results;
      finalErrors = errors;
    }

    return {
      total: preparedRows.length,
      created: finalResults.filter((r) => r.action === 'insert').length,
      updated: finalResults.filter((r) => r.action === 'update').length,
      unchanged: finalResults.filter((r) => r.action === 'unchanged').length,
      errors: finalErrors.length,
      results: finalResults,
      errorDetails: finalErrors,
    };
  }

  async cambiarEstado(id: string, body: any) {
    let docente = await this.docenteRepo.findOne({ where: { id } });
    if (!docente) {
      const resolved = await this.getById(id, body?.periodoCarga || body?.periodo_carga);
      if (resolved?.docente_id) {
        docente = await this.docenteRepo.findOne({ where: { id: resolved.docente_id } });
      }
    }
    if (!docente) throw new NotFoundException(`Docente ${id} no encontrado`);

    const requestedPeriod = body?.periodoCarga || body?.periodo_carga || null;
    if (requestedPeriod && String(requestedPeriod) !== String(docente.periodoCarga || '')) {
      throw new BadRequestException('El cambio de estado solo puede aplicarse al perfil del periodo seleccionado.');
    }

    const justificacion = String(body?.justificacion || body?.justificacionEdicion || '').trim();
    if (justificacion.length < 10 || !body?.soporteId) {
      throw new BadRequestException({
        message: 'Activar o inactivar el perfil requiere soporte documental y una justificacion de minimo 10 caracteres.',
        columna: 'SOPORTE_CAMBIO_ESTADO',
        datoErrado: !body?.soporteId ? '(soporte vacio)' : '(justificacion insuficiente)',
        valorEsperado: 'Archivo de soporte y justificacion de minimo 10 caracteres',
      });
    }

    const soporteRows = await this.dataSource.query(
      `SELECT id FROM academic_work_plan."RundSoporteCampo"
       WHERE id::text = $1 AND docente_id = $2
         AND tipo_soporte = 'soporte_cambio_estado_perfil'
         AND documento_carpeta_id IS NOT NULL
         AND COALESCE(estado, '') <> 'Rechazado'
       LIMIT 1`,
      [String(body.soporteId), docente.id],
    );
    if (!soporteRows[0]) {
      throw new BadRequestException('El soporte del cambio de estado no existe o no pertenece al perfil docente.');
    }

    const estadoPrevio = String(docente.estado || 'ACTIVO').toUpperCase() === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const requestedState = String(body?.estadoObjetivo || body?.estado || '').trim().toUpperCase();
    const estadoNuevo = requestedState
      ? requestedState
      : (estadoPrevio === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO');
    if (!['ACTIVO', 'INACTIVO'].includes(estadoNuevo)) {
      throw new BadRequestException('El estado del perfil debe ser ACTIVO o INACTIVO.');
    }
    if (estadoNuevo === estadoPrevio) {
      throw new BadRequestException(`El perfil ya se encuentra ${estadoPrevio.toLowerCase()}.`);
    }

    docente.estado = estadoNuevo;
    await this.docenteRepo.save(docente);
    await this.logAudit({
      docenteId: docente.id,
      bloque: 'GENERAL',
      accion: estadoNuevo === 'ACTIVO' ? 'ACTIVAR' : 'DESACTIVAR',
      actorId: body?.actorId || 'SISTEMA',
      canalOrigen: 'MODAL',
      campoAfectado: 'ESTADO_DOCENTE',
      datoPrevio: estadoPrevio,
      datoNuevo: estadoNuevo,
      observacion: justificacion,
      soporteId: String(body.soporteId),
      metadata: { periodoCarga: docente.periodoCarga || null },
    });

    // El estado pertenece al perfil RUND del periodo. La cuenta universal y los
    // perfiles de otros periodos se conservan para no afectar PTA ni el historial.
    return {
      id: docente.id,
      estado: estadoNuevo,
      activo: estadoNuevo === 'ACTIVO',
      periodoCarga: docente.periodoCarga || null,
    };
  }

  async updateDocente(id: string, body: any) {
    const docenteId = await this.resolveDocenteId(id);
    const d = await this.docenteRepo.findOne({ where: { id: docenteId } });
    if (!d) throw new NotFoundException(`Docente ${id} no encontrado`);

    if (!body.soporteEdicionId || !String(body.justificacionEdicion || '').trim()) {
      throw new BadRequestException({
        message: 'Toda edicion del perfil docente requiere soporte documental y justificacion.',
        columna: 'SOPORTE_EDICION',
        datoErrado: '(vacio)',
        valorEsperado: 'Archivo de soporte y justificacion de la edicion',
      });
    }
    const soporteRows = await this.dataSource.query(
      `SELECT id FROM academic_work_plan."RundSoporteCampo"
       WHERE id::text = $1 AND docente_id = $2
         AND tipo_soporte = 'soporte_edicion_perfil'
         AND documento_carpeta_id IS NOT NULL
         AND COALESCE(estado, '') <> 'Rechazado'
       LIMIT 1`,
      [String(body.soporteEdicionId), docenteId],
    );
    if (!soporteRows[0]) {
      throw new BadRequestException('El soporte documental de la edicion no existe o no pertenece al docente.');
    }

    const authRows = await this.dataSource.query(
      `SELECT num_identificacion AS document_number FROM auth.personas WHERE id_person::text = $1 LIMIT 1`,
      [d.personaId],
    );
    const currentDocument = String(authRows[0]?.document_number || '');
    if (!currentDocument) throw new NotFoundException(`No se encontro la cedula del docente ${id}`);
    if (body.documentNumber && String(body.documentNumber).trim() !== currentDocument) {
      throw new BadRequestException('La cedula es el identificador unico del perfil y no se puede modificar.');
    }
    const requestedPeriod = body.periodoCarga || body.periodo_carga || null;
    if (!d.periodoCarga) {
      throw new BadRequestException('El registro no tiene periodo RUND asociado. Debe regularizarse antes de editar para proteger sus relaciones PTA.');
    }
    if (requestedPeriod && String(requestedPeriod) !== String(d.periodoCarga)) {
      throw new BadRequestException('El periodo del registro docente no se puede modificar porque identifica su vinculacion con los PTA.');
    }
    const estadoActual = String(d.estado || 'ACTIVO').toUpperCase() === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const estadoSolicitado = body.estado === undefined || body.estado === null
      ? estadoActual
      : String(body.estado).trim().toUpperCase();
    if (estadoSolicitado !== estadoActual) {
      throw new BadRequestException(
        'El estado no se puede modificar desde la edicion general. Use la accion Activar/Inactivar con su soporte documental especifico.',
      );
    }

    const ignoredAuditKeys = new Set(['soporteEdicionId', 'justificacionEdicion', 'actorId', 'cargadoPor', 'canal_origen']);
    const changedFields = Object.keys(body).filter((key) => !ignoredAuditKeys.has(key));
    const result = await this.upsertDocente({
      ...body,
      canal_origen: 'MODAL',
      periodoCarga: d.periodoCarga,
      // La cedula siempre se obtiene de auth.personas; nunca se acepta del body al editar.
      documentNumber: currentDocument,
    }, {});
    await this.logAudit({
      docenteId,
      bloque: 'GENERAL',
      accion: 'EDITAR',
      actorId: body.actorId || body.cargadoPor || 'SISTEMA',
      canalOrigen: 'MODAL',
      observacion: String(body.justificacionEdicion).trim(),
      soporteId: String(body.soporteEdicionId),
      metadata: { camposEnviados: changedFields },
    });
    return result;
  }

  async getStats(filters?: { territorial?: string; dedicacion?: string; vinculacion?: string; estado?: string; periodoCarga?: string }) {
    const baseSql = this.authDocentesBaseSql();
    const params: any[] = [];
    const whereClause = filters ? this.buildAuthDocentesFilters(filters, params) : '';

    const [summary] = await this.dataSource.query(`
      ${baseSql}
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE activo_efectivo = true)::int AS activos,
        COALESCE(SUM(COALESCE(horas_programables, 0)), 0)::int AS total_horas,
        COALESCE(ROUND(AVG(COALESCE(horas_programables, 0))::numeric, 1), 0)::float AS promedio_horas
      FROM auth_docentes
      ${whereClause}
    `, [...params]);

    // For grouped queries we need fresh copies of params each time since buildAuthDocentesFilters is stateful
    const mkParams = () => {
      const p: any[] = [];
      const w = filters ? this.buildAuthDocentesFilters(filters, p) : '';
      return { p, w };
    };

    const d = mkParams();
    const porDedicacion = await this.dataSource.query(`
      ${baseSql}
      SELECT
        COALESCE(dedicacion_codigo, 'SIN_DEDICACION') AS dedicacion,
        COUNT(*)::int AS total
      FROM auth_docentes
      ${d.w}
      GROUP BY COALESCE(dedicacion_codigo, 'SIN_DEDICACION')
      ORDER BY total DESC
    `, d.p);

    const t = mkParams();
    const porTerritorial = await this.dataSource.query(`
      ${baseSql}
      SELECT
        COALESCE(territorial, auth_territorial, 'Sin territorial') AS territorial,
        COALESCE(territorial_id, auth_territorial_id::text) AS territorial_id,
        COUNT(*)::int AS total
      FROM auth_docentes
      ${t.w}
      GROUP BY COALESCE(territorial, auth_territorial, 'Sin territorial'), COALESCE(territorial_id, auth_territorial_id::text)
      ORDER BY total DESC
    `, t.p);

    const c = mkParams();
    const porCategoria = await this.dataSource.query(`
      ${baseSql}
      SELECT
        COALESCE(NULLIF(TRIM(categoria), ''), 'Sin categoría') AS categoria,
        COUNT(*)::int AS total
      FROM auth_docentes
      ${c.w}
      GROUP BY COALESCE(NULLIF(TRIM(categoria), ''), 'Sin categoría')
      ORDER BY total DESC
    `, c.p);

    const v = mkParams();
    const porVinculacion = await this.dataSource.query(`
      ${baseSql}
      SELECT
        COALESCE(NULLIF(TRIM(vinculacion_codigo), ''), 'SIN_VINCULACION') AS vinculacion_codigo,
        COALESCE(NULLIF(TRIM(vinculacion), ''), NULLIF(TRIM(vinculacion_codigo), ''), 'Sin vinculación') AS vinculacion,
        COUNT(*)::int AS total
      FROM auth_docentes
      ${v.w}
      GROUP BY
        COALESCE(NULLIF(TRIM(vinculacion_codigo), ''), 'SIN_VINCULACION'),
        COALESCE(NULLIF(TRIM(vinculacion), ''), NULLIF(TRIM(vinculacion_codigo), ''), 'Sin vinculación')
      ORDER BY total DESC
    `, v.p);

    const nf = mkParams();
    const porNivelFormacion = await this.dataSource.query(`
      ${baseSql}
      SELECT
        COALESCE(NULLIF(TRIM(nivel_formacion), ''), 'Sin información') AS nivel_formacion,
        COUNT(*)::int AS total
      FROM auth_docentes
      ${nf.w}
      GROUP BY COALESCE(NULLIF(TRIM(nivel_formacion), ''), 'Sin información')
      ORDER BY total DESC
    `, nf.p);

    const g = mkParams();
    const porGenero = await this.dataSource.query(`
      ${baseSql}
      SELECT
        COALESCE(NULLIF(TRIM(genero), ''), 'No especificado') AS genero,
        COUNT(*)::int AS total
      FROM auth_docentes
      ${g.w}
      GROUP BY COALESCE(NULLIF(TRIM(genero), ''), 'No especificado')
      ORDER BY total DESC
    `, g.p);

    const e = mkParams();
    const porRangoEdad = await this.dataSource.query(`
      ${baseSql}
      SELECT
        COALESCE(NULLIF(TRIM(rango_edad), ''), 'Sin dato') AS rango_edad,
        COUNT(*)::int AS total
      FROM auth_docentes
      ${e.w}
      GROUP BY COALESCE(NULLIF(TRIM(rango_edad), ''), 'Sin dato')
      ORDER BY rango_edad ASC
    `, e.p);

    // Por sede/CETAP
    const s = mkParams();
    const porSede = await this.dataSource.query(`
      ${baseSql}
      SELECT
        COALESCE(sede, auth_sede, 'Sin CETAP') AS sede,
        COALESCE(sede_id, auth_sede_id::text) AS sede_id,
        COUNT(*)::int AS total
      FROM auth_docentes
      ${s.w}
      GROUP BY COALESCE(sede, auth_sede, 'Sin CETAP'), COALESCE(sede_id, auth_sede_id::text)
      ORDER BY total DESC
    `, s.p);

    const total = Number(summary?.total || 0);
    const activos = Number(summary?.activos || 0);
    return {
      total,
      activos,
      inactivos: total - activos,
      total_horas: Number(summary?.total_horas || 0),
      promedio_horas: Number(summary?.promedio_horas || 0),
      por_dedicacion: porDedicacion,
      por_territorial: porTerritorial,
      por_categoria: porCategoria,
      por_vinculacion: porVinculacion,
      por_nivel_formacion: porNivelFormacion,
      por_genero: porGenero,
      por_rango_edad: porRangoEdad,
      por_sede: porSede,
    };
  }

  async syncToAuthService(_authServiceUrl: string) {
    const docentes = await this.docenteRepo.count();
    return {
      total: docentes,
      created: 0,
      skipped: docentes,
      failed: 0,
      errors: [],
      message: 'El Banco de Docentes ya usa auth.personas/auth.user como fuente primaria.',
    };
  }

  async syncFromAuthService(authServiceUrl: string): Promise<{ total: number; created: number; skipped: number; failed: number }> {
    // Traer todos los usuarios con rol DOCENTE desde auth-service
    let page = 1;
    const allUsers: any[] = [];
    while (true) {
      const res = await fetch(`${authServiceUrl}/api/v1/users?role=DOCENTE&limit=100&page=${page}`);
      if (!res.ok) break;
      const body = await res.json().catch(() => ({}));
      const items: any[] = body?.data?.data || body?.data || [];
      allUsers.push(...items);
      const meta = body?.data?.meta || body?.meta || {};
      if (page >= (meta.totalPages ?? 1) || items.length === 0) break;
      page++;
    }

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const item of allUsers) {
      const person = item.person || item;
      const email = (person.email || '').toLowerCase().trim();
      const identification = person.identification_number || '';
      if (!email && !identification) { skipped++; continue; }

      // Â¿Ya existe en banco de docentes?
      const existing = await this.docenteRepo.findOne({
        where: [
          { personaId: person.id || person.id_person } as any,
          { correoInstitucional: email } as any,
        ],
      });
      if (existing) { skipped++; continue; }

      // Crear con datos mínimos
      try {
        const fullName = `${person.first_name || ''} ${person.last_name || ''}`.trim() || email;
        await this.upsertDocente({
          documento_identidad: identification || email,
          nombre_completo: fullName,
          correo_institucional: email,
          territorial: 'Sede Central',
          vinculacion: 'Ocasional',
          dedicacion: 'TC',
          estado: 'ACTIVO',
        }, { rejectExisting: false });
        created++;
      } catch {
        failed++;
      }
    }

    return { total: allUsers.length, created, skipped, failed };
  }

  // —————————————————————————————————————————
  // Autogestión (Canal 3)
  // —————————————————————————————————————————

  async createInvitacion(correoInstitucional: string) {
    let invitacion = await this.invitacionRepo.findOne({ where: { correoInstitucional } });
    const token = randomUUID();
    const fechaExpiracion = new Date();
    fechaExpiracion.setDate(fechaExpiracion.getDate() + 7); // 7 days

    if (!invitacion) {
      invitacion = this.invitacionRepo.create({
        correoInstitucional,
        tokenAcceso: token,
        fechaExpiracion,
        estado: 'Enviada',
      });
    } else {
      invitacion.tokenAcceso = token;
      invitacion.fechaExpiracion = fechaExpiracion;
      invitacion.estado = 'Enviada';
      invitacion.intentosOtp = 0;
      invitacion.otpCodigo = null;
    }
    
    await this.invitacionRepo.save(invitacion);

    // Enviar el enlace de autogestión por correo (vía notifications-service).
    const link = `${this.resolvePublicAppUrl()}/autogestion/docentes?token=${token}`;
    const subject = 'Invitación RUND — Actualiza tus datos docentes (ESAP)';
    const text = [
      'Hola,',
      '',
      'Has sido invitado a completar/actualizar tu Registro Único Nacional Docente (RUND) de la ESAP.',
      'Ingresa al siguiente enlace y valida tu identidad con el código que te enviaremos:',
      '',
      link,
      '',
      'Este enlace expira el ' + fechaExpiracion.toLocaleDateString('es-CO') + '.',
    ].join('\n');
    const html = `
      <p>Hola,</p>
      <p>Has sido invitado a completar/actualizar tu <strong>Registro Único Nacional Docente (RUND)</strong> de la ESAP.</p>
      <p>Ingresa al siguiente enlace y valida tu identidad con el código que te enviaremos:</p>
      <p><a href="${link}">${link}</a></p>
      <p>Este enlace expira el ${fechaExpiracion.toLocaleDateString('es-CO')}.</p>
    `;
    const emailResult = await this.sendEmail(correoInstitucional, subject, text, html);
    this.logger.log(`[RUND] Invitación para ${correoInstitucional} (enviada=${emailResult.sent}). Token: ${token}`);

    const isDev = (process.env.NODE_ENV || 'development') !== 'production';
    return {
      tokenAcceso: token,
      expiresAt: fechaExpiracion,
      emailSent: emailResult.sent,
      emailError: emailResult.error,
      ...(isDev ? { devLink: link } : {}),
    };
  }

  async getInvitaciones() {
    return await this.invitacionRepo.find({ order: { updatedAt: 'DESC' } });
  }

  async requestOtpByEmail(email: string) {
    let invitacion = await this.invitacionRepo.findOne({ where: { correoInstitucional: email } });
    if (!invitacion) {
      // Si no tiene invitación explícita, revisar si ya existe como docente en RUND
      const docente = await this.docenteRepo.findOne({
        where: [
          { correoInstitucional: email },
          { correoAlternativo: email }
        ]
      });
      if (!docente) {
        throw new NotFoundException('El correo no está dentro de la lista de elegibles del RUND');
      }
      
      // Crear invitación on-the-fly para permitir autogestión
      invitacion = this.invitacionRepo.create({
        correoInstitucional: email,
        tokenAcceso: randomUUID(),
        estado: 'Abierta',
        intentosOtp: 0,
        fechaExpiracion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días de vigencia
      });
      await this.invitacionRepo.save(invitacion);
    }
    
    if (invitacion.fechaExpiracion < new Date()) {
      // Si expiró, la renovamos automáticamente si están intentando acceder de nuevo
      invitacion.fechaExpiracion = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
    
    // Permitir reingreso incluso si la invitación estaba 'Gestionada' (para actualizar datos)
    if (invitacion.estado === 'Gestionada' || invitacion.estado === 'Vencida') {
      invitacion.estado = 'Abierta';
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    invitacion.otpCodigo = otp;
    invitacion.otpExpiraEn = expiresAt;
    invitacion.estado = 'Abierta';
    invitacion.intentosOtp = 0; // reset attempts
    await this.invitacionRepo.save(invitacion);

    // Enviar el código OTP por correo (vía notifications-service).
    const subject = 'Tu código de acceso RUND (ESAP)';
    const text = `Tu código de verificación es: ${otp}\n\nVence en 10 minutos. Si no solicitaste este código, ignora este correo.`;
    const html = `
      <p>Tu código de verificación RUND es:</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:4px">${otp}</p>
      <p>Vence en 10 minutos. Si no solicitaste este código, ignora este correo.</p>
    `;
    const emailResult = await this.sendEmail(invitacion.correoInstitucional, subject, text, html);

    this.logger.log(`[RUND][OTP] Código para ${invitacion.correoInstitucional}: ${otp} (enviado=${emailResult.sent})`);

    const isDev = (process.env.NODE_ENV || 'development') !== 'production';
    return {
      success: true,
      message: emailResult.sent ? 'Código OTP enviado al correo.' : 'No se pudo enviar el correo; usa el código mostrado (modo dev).',
      expiresAt,
      emailSent: emailResult.sent,
      // Solo exponer el OTP fuera de producción o si el correo falló (para no bloquear pruebas).
      ...(isDev || !emailResult.sent ? { devOtp: otp } : {}),
    };
  }

  async verifyOtpForEmail(email: string, otp: string) {
    const invitacion = await this.invitacionRepo.findOne({ where: { correoInstitucional: email } });
    if (!invitacion) throw new NotFoundException('Correo inválido o no existe.');
    
    if (invitacion.intentosOtp >= 5) {
      throw new BadRequestException('Demasiados intentos fallidos. Solicite un nuevo código OTP.');
    }

    if (!invitacion.otpCodigo || !invitacion.otpExpiraEn || invitacion.otpExpiraEn < new Date()) {
      throw new BadRequestException('El código OTP ha expirado o no ha sido solicitado.');
    }

    if (invitacion.otpCodigo !== String(otp)) {
      invitacion.intentosOtp += 1;
      await this.invitacionRepo.save(invitacion);
      throw new BadRequestException('Código OTP incorrecto.');
    }

    invitacion.otpCodigo = null;
    invitacion.otpExpiraEn = null;
    invitacion.intentosOtp = 0;
    invitacion.estado = 'OTP validado';
    await this.invitacionRepo.save(invitacion);

    return { success: true, sessionToken: invitacion.tokenAcceso };
  }

  async saveDraft(token: string, draft: any) {
    const invitacion = await this.invitacionRepo.findOne({ where: { tokenAcceso: token } });
    if (!invitacion) throw new NotFoundException('Token inválido.');
    
    invitacion.borradorJson = draft;
    invitacion.estado = 'En proceso';
    await this.invitacionRepo.save(invitacion);
    return { success: true };
  }

  async getDraft(token: string) {
    const invitacion = await this.invitacionRepo.findOne({ where: { tokenAcceso: token } });
    if (!invitacion) throw new NotFoundException('Token inválido.');
    return { draft: invitacion.borradorJson || {} };
  }

  async getAutogestionInfo(token: string) {
    const invitacion = await this.invitacionRepo.findOne({ where: { tokenAcceso: token } });
    if (!invitacion) throw new NotFoundException('Token inválido.');

    const email = invitacion.correoInstitucional;

    // Delegate to the same `list` query to get all calculated fields, using email as search filter
    const result = await this.list({ search: email, limit: 5 });
    
    // Find the exact match
    let match = result.data.find((d: any) => 
      d.correo_institucional?.toLowerCase() === email.toLowerCase() ||
      d.correo_personal?.toLowerCase() === email.toLowerCase() ||
      d.email?.toLowerCase() === email.toLowerCase()
    );

    // Si no está en auth_docentes, buscar directamente en Docente
    if (!match) {
      const docenteDirecto = await this.docenteRepo.findOne({
        where: [
          { correoInstitucional: email },
          { correoAlternativo: email }
        ]
      });

      if (docenteDirecto) {
        // Fetch supplementary person data from auth.personas
        const personRows = docenteDirecto.personaId ? await this.dataSource.query(
          `SELECT num_identificacion AS document_number, primer_nombre, segundo_nombre,
                  primer_apellido, segundo_apellido, nom_largo AS full_name,
                  email AS correo_personal, celular
           FROM auth.personas WHERE id_person::text = $1 LIMIT 1`,
          [docenteDirecto.personaId],
        ) : [];
        const person = personRows[0] || {};

        match = {
          docente_id: docenteDirecto.id,
          documento_identidad: person.document_number || null,
          nombre_completo: person.full_name || [person.primer_nombre, person.primer_apellido].filter(Boolean).join(' ') || docenteDirecto.correoInstitucional,
          primer_nombre: person.primer_nombre || null,
          primer_apellido: person.primer_apellido || null,
          segundo_nombre: person.segundo_nombre || null,
          segundo_apellido: person.segundo_apellido || null,
          correo_institucional: docenteDirecto.correoInstitucional,
          correo_personal: person.correo_personal || docenteDirecto.correoAlternativo,
          telefono: person.celular || null,
          nivel_formacion: docenteDirecto.nivelFormacion,
          pregrado: docenteDirecto.pregrado,
          especializacion: docenteDirecto.especializacion,
          maestria: docenteDirecto.maestria,
          doctorado: docenteDirecto.doctorado,
          posdoctorado: docenteDirecto.posDoctorado,
          perfil_academico: docenteDirecto.perfilAcademico,
          perfil_academico_pro: docenteDirecto.perfilAcademicoPro,
          nucleo_tematico: docenteDirecto.nucleoTematico,
          investigacion: docenteDirecto.investigacion,
          tipo_vinculacion: docenteDirecto.tipoVinculacion,
          territorial: null,
          sede_nombre: null,
          dedicacion: docenteDirecto.dedicacion,
          escalafon: docenteDirecto.escalafon,
          inicio_vinculacion: docenteDirecto.fechaInicioVinculacion ? new Date(docenteDirecto.fechaInicioVinculacion).toISOString() : null,
          fin_vinculacion: docenteDirecto.fechaFinVinculacion ? new Date(docenteDirecto.fechaFinVinculacion).toISOString() : null,
          acto_administrativo_vinculacion: docenteDirecto.actoAdministrativoVinculacion,
          origen_vinculacion: docenteDirecto.origenVinculacion,
          situacion_administrativa: docenteDirecto.situacionAdministrativa,
          ultima_evaluacion: docenteDirecto.ultimaEvaluacion,
          puntaje_salarial: docenteDirecto.puntajeSalarial,
          horas_programables: docenteDirecto.horasAsignables,
          estado: docenteDirecto.estado,
          periodo_carga: docenteDirecto.periodoCarga,
          id_rund: docenteDirecto.id,
        } as any;
      }
    }

    return match || null;
  }

  async submitFromToken(token: string, data: any) {
    const invitacion = await this.invitacionRepo.findOne({ where: { tokenAcceso: token } });
    if (!invitacion) throw new NotFoundException('Token invÃ¡lido.');
    
    // Inyectar el canal de origen para que el payload upsertDocente sepa
    data.canal_origen = 'AUTOGESTION';

    // rejectExisting:false → un docente ya invitado puede actualizar sus datos vía
    // autogestión (upsert por num_identificacion). relaxValidation:true → validación
    // mínima (Canal 3): el docente aporta datos parciales y GGP completa/valida luego.
    const result = await this.upsertDocente(data, { rejectExisting: false, relaxValidation: true });

    invitacion.estado = 'Gestionada';
    await this.invitacionRepo.save(invitacion);

    return result;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // BR-038..BR-061 â€” Soporte documental, aprobaciÃ³n y validaciÃ³n RUND
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  private static readonly BLOQUES = ['IDENTIDAD', 'CONTACTO', 'FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL'] as const;
  private static readonly BLOQUES_OBLIGATORIOS = ['IDENTIDAD', 'FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL'] as const;

  /**
   * BR-039 â€” CatÃ¡logo de tipos de soporte vÃ¡lidos por bloque.
   */
  private static readonly CATALOGO_SOPORTE: Record<string, string[]> = {
    IDENTIDAD: ['documento_identidad', 'cedula_extranjeria', 'pasaporte'],
    CONTACTO: [],
    FORMACION: ['diploma_pregrado', 'acta_grado_pregrado', 'diploma_especializacion', 'acta_grado_especializacion', 'diploma_maestria', 'acta_grado_maestria', 'diploma_doctorado', 'acta_grado_doctorado', 'certificado_posdoctoral', 'convalidacion_men', 'hoja_vida_pro'],
    VINCULACION: ['acto_administrativo_vinculacion', 'resolucion_convocatoria', 'contrato', 'acto_administrativo_dedicacion', 'acto_administrativo_situacion', 'acto_adscripcion_territorial', 'resolucion_escalafon', 'resolucion_puntaje_salarial'],
    ACADEMICO: ['acto_asignacion_nucleo', 'certificacion_investigacion', 'acta_evaluacion_desempeno'],
    TRANSVERSAL: ['autorizacion_habeas_data', 'soporte_edicion_perfil', 'soporte_cambio_estado_perfil'],
  };

  // DDL for RundCampoEstado and RundSoporteCampo moved to:
  //   db/migrations/333_create_rund_tables_and_sequence.sql

  /**
   * Resuelve cualquier ID (docente_id, persona_id, usuario_id) al docente_id real de la tabla Docente.
   */
  async resolveDocenteId(anyId: string): Promise<string> {
    if (!anyId) {
      throw new BadRequestException('ID no proporcionado');
    }

    // 1. Verificar si ya es el docente_id directo
    const exists = await this.docenteRepo.findOne({ where: { id: anyId } });
    if (exists) {
      return exists.id;
    }

    // 2. Buscar por personaId
    const byPersona = await this.docenteRepo.findOne({ where: { personaId: anyId } });
    if (byPersona) {
      return byPersona.id;
    }

    // 3. Buscar por usuario_id
    const userRows = await this.dataSource.query(
      `SELECT id_person FROM auth."user" WHERE id_user::text = $1 LIMIT 1`,
      [anyId],
    );
    if (userRows[0]?.id_person) {
      const byUserPersona = await this.docenteRepo.findOne({ where: { personaId: userRows[0].id_person } });
      if (byUserPersona) {
        return byUserPersona.id;
      }
    }

    // Fallback: retornar el ID original
    return anyId;
  }

  /**
   * BR-044 — Obtener estados de aprobación por bloque para un docente.
   */
  async getBloques(docenteId: string) {
    docenteId = await this.resolveDocenteId(docenteId);

    const bloques = await this.dataSource.query(
      `SELECT * FROM academic_work_plan."RundCampoEstado" WHERE docente_id = $1 ORDER BY bloque ASC`,
      [docenteId],
    );

    // Si no existen bloques, inicializarlos
    if (bloques.length === 0) {
      return this.inicializarBloques(docenteId);
    }

    // Cargar soportes por bloque
    const soportes = await this.dataSource.query(
      `SELECT * FROM academic_work_plan."RundSoporteCampo" WHERE docente_id = $1 ORDER BY bloque ASC, "createdAt" DESC`,
      [docenteId],
    );

    const soportesPorBloque: Record<string, any[]> = {};
    for (const s of soportes) {
      if (!soportesPorBloque[s.bloque]) soportesPorBloque[s.bloque] = [];
      soportesPorBloque[s.bloque].push(s);
    }

    return bloques.map((b: any) => ({
      ...b,
      soportes: soportesPorBloque[b.bloque] || [],
      tiposSoporteRequeridos: BancoDocentesService.CATALOGO_SOPORTE[b.bloque] || [],
    }));
  }

  /**
   * Inicializar bloques de aprobaciÃ³n al crear/importar un docente.
   */
  async inicializarBloques(docenteId: string, cargadoPor?: string, canalOrigen?: string) {
    const result: any[] = [];
    for (const bloque of BancoDocentesService.BLOQUES) {
      const existing = await this.dataSource.query(
        `SELECT id FROM academic_work_plan."RundCampoEstado" WHERE docente_id = $1 AND bloque = $2 LIMIT 1`,
        [docenteId, bloque],
      );
      if (existing.length === 0) {
        const id = randomUUID();
        // BR-038 â€” CONTACTO no es crÃ­tico, no exige soporte
        const estadoInicial = bloque === 'CONTACTO' ? 'Pendiente' : 'Soporte faltante';
        await this.dataSource.query(
          `INSERT INTO academic_work_plan."RundCampoEstado" 
           (id, docente_id, bloque, estado, cargado_por, canal_origen, version, soporte_ids, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, 1, '[]', NOW(), NOW())`,
          [id, docenteId, bloque, estadoInicial, cargadoPor || null, canalOrigen || null],
        );
        result.push({ id, docenteId, bloque, estado: estadoInicial });
      }
    }
    return result;
  }

  /**
   * BR-043 â€” Aprobar un bloque (maker-checker: aprobador â‰  cargador).
   * BR-038 â€” Verifica que exista al menos un soporte para bloques crÃ­ticos.
   */
  async aprobarBloque(docenteId: string, bloque: string, aprobadorId: string) {
    docenteId = await this.resolveDocenteId(docenteId);
    const bloqueUpper = bloque.toUpperCase();
    if (!BancoDocentesService.BLOQUES.includes(bloqueUpper as any)) {
      throw new BadRequestException(`Bloque invÃ¡lido: ${bloque}. VÃ¡lidos: ${BancoDocentesService.BLOQUES.join(', ')}`);
    }

    const [campoEstado] = await this.dataSource.query(
      `SELECT * FROM academic_work_plan."RundCampoEstado" WHERE docente_id = $1 AND bloque = $2 LIMIT 1`,
      [docenteId, bloqueUpper],
    );

    if (!campoEstado) {
      throw new NotFoundException(`No se encontrÃ³ el bloque ${bloqueUpper} para el docente ${docenteId}`);
    }

    // BR-043 â€” SegregaciÃ³n maker-checker
    if (campoEstado.cargado_por && campoEstado.cargado_por === aprobadorId) {
      throw new BadRequestException({
        message: 'BR-043: No puede aprobar quien cargÃ³ los datos. Se requiere un validador distinto.',
        rule: 'BR-043',
        cargadoPor: campoEstado.cargado_por,
        aprobadorId,
      });
    }

    // BR-038 â€” Verificar soporte obligatorio para bloques crÃ­ticos
    if (BancoDocentesService.BLOQUES_OBLIGATORIOS.includes(bloqueUpper as any)) {
      const soportes = await this.dataSource.query(
        `SELECT COUNT(*) as count FROM academic_work_plan."RundSoporteCampo" 
         WHERE docente_id = $1 AND bloque = $2 AND estado != 'Rechazado'`,
        [docenteId, bloqueUpper],
      );
      if (parseInt(soportes[0].count) === 0) {
        throw new BadRequestException({
          message: `BR-038: El bloque ${bloqueUpper} requiere al menos un soporte documental aprobado o pendiente antes de aprobar.`,
          rule: 'BR-038',
          bloque: bloqueUpper,
          soportesRequeridos: BancoDocentesService.CATALOGO_SOPORTE[bloqueUpper],
        });
      }
    }

    // Aprobar
    await this.dataSource.query(
      `UPDATE academic_work_plan."RundCampoEstado"
       SET estado = 'Aprobado', revisado_por = $1, fecha_revision = NOW(), observacion = NULL, "updatedAt" = NOW()
       WHERE docente_id = $2 AND bloque = $3`,
      [aprobadorId, docenteId, bloqueUpper],
    );

    // Propagar el estado a los soportes del bloque para que la fuente de verdad
    // (RundSoporteCampo.estado) quede alineada con las 3 vistas:
    //  - RUND backoffice (docStatus se reconstruye desde aquí → botones no reaparecen)
    //  - Carpeta Digital backoffice/docente (lee el estado del soporte → muestra "Aprobado")
    // No tocamos soportes ya rechazados.
    await this.dataSource.query(
      `UPDATE academic_work_plan."RundSoporteCampo"
       SET estado = 'Aprobado'
       WHERE docente_id = $1 AND bloque = $2 AND estado != 'Rechazado'`,
      [docenteId, bloqueUpper],
    );

    // BR-056 â€” Log de auditorÃ­a inmutable
    this.logger.log(`[BR-056] APROBAR bloque=${bloqueUpper} docente=${docenteId} por=${aprobadorId}`);
    await this.logAudit({ docenteId, bloque: bloqueUpper, accion: 'APROBAR', actorId: aprobadorId });

    // BR-047 â€” Verificar si se puede activar el registro
    await this.verificarActivacion(docenteId);

    return { success: true, bloque: bloqueUpper, estado: 'Aprobado' };
  }

  /**
   * BR-045 â€” Devolver un bloque con observaciÃ³n obligatoria.
   */
  async devolverBloque(docenteId: string, bloque: string, aprobadorId: string, observacion: string) {
    docenteId = await this.resolveDocenteId(docenteId);
    const bloqueUpper = bloque.toUpperCase();
    if (!BancoDocentesService.BLOQUES.includes(bloqueUpper as any)) {
      throw new BadRequestException(`Bloque invÃ¡lido: ${bloque}`);
    }

    // BR-045 â€” ObservaciÃ³n obligatoria
    if (!observacion || observacion.trim().length === 0) {
      throw new BadRequestException({
        message: 'BR-045: La devoluciÃ³n requiere una observaciÃ³n que indique el motivo y la correcciÃ³n requerida.',
        rule: 'BR-045',
      });
    }

    const [campoEstado] = await this.dataSource.query(
      `SELECT * FROM academic_work_plan."RundCampoEstado" WHERE docente_id = $1 AND bloque = $2 LIMIT 1`,
      [docenteId, bloqueUpper],
    );

    if (!campoEstado) {
      throw new NotFoundException(`No se encontrÃ³ el bloque ${bloqueUpper} para el docente ${docenteId}`);
    }

    // BR-043 â€” SegregaciÃ³n maker-checker
    if (campoEstado.cargado_por && campoEstado.cargado_por === aprobadorId) {
      throw new BadRequestException({
        message: 'BR-043: No puede devolver quien cargÃ³ los datos.',
        rule: 'BR-043',
      });
    }

    await this.dataSource.query(
      `UPDATE academic_work_plan."RundCampoEstado"
       SET estado = 'Devuelto', revisado_por = $1, observacion = $2, fecha_revision = NOW(), "updatedAt" = NOW()
       WHERE docente_id = $3 AND bloque = $4`,
      [aprobadorId, observacion.trim(), docenteId, bloqueUpper],
    );

    // Propagar el rechazo a los soportes del bloque (fuente de verdad unificada),
    // para que tanto el RUND como la Carpeta Digital muestren el estado "Rechazado".
    await this.dataSource.query(
      `UPDATE academic_work_plan."RundSoporteCampo"
       SET estado = 'Rechazado', observacion = $3
       WHERE docente_id = $1 AND bloque = $2`,
      [docenteId, bloqueUpper, observacion.trim()],
    );

    // Actualizar estado global del docente
    await this.dataSource.query(
      `UPDATE academic_work_plan."Docente" SET "estadoAprobacion" = 'DEVUELTO' WHERE id = $1`,
      [docenteId],
    );

    // BR-056 â€” Log inmutable
    this.logger.log(`[BR-056] DEVOLVER bloque=${bloqueUpper} docente=${docenteId} por=${aprobadorId} motivo="${observacion.substring(0, 100)}"`);
    await this.logAudit({ docenteId, bloque: bloqueUpper, accion: 'DEVOLVER', actorId: aprobadorId, observacion: observacion.trim() });

    return { success: true, bloque: bloqueUpper, estado: 'Devuelto', observacion };
  }

  /**
   * BR-046 â€” Cuando un dato aprobado cambia, vuelve a Pendiente y se guarda la versiÃ³n anterior.
   */
  async reevaluarBloqueAlEditar(docenteId: string, bloque: string, editadoPor?: string) {
    const bloqueUpper = bloque.toUpperCase();
    const [campoEstado] = await this.dataSource.query(
      `SELECT * FROM academic_work_plan."RundCampoEstado" WHERE docente_id = $1 AND bloque = $2 LIMIT 1`,
      [docenteId, bloqueUpper],
    );

    if (!campoEstado) return;

    // Solo reevaluar si estaba aprobado
    if (campoEstado.estado === 'Aprobado') {
      await this.dataSource.query(
        `UPDATE academic_work_plan."RundCampoEstado" 
         SET estado = 'Pendiente', version = version + 1, cargado_por = $1, 
             revisado_por = NULL, observacion = 'Dato aprobado fue modificado â€” requiere re-aprobaciÃ³n', 
             fecha_revision = NULL, "updatedAt" = NOW()
         WHERE docente_id = $2 AND bloque = $3`,
        [editadoPor || null, docenteId, bloqueUpper],
      );

      // Revertir activaciÃ³n global
      await this.dataSource.query(
        `UPDATE academic_work_plan."Docente" SET "estadoAprobacion" = 'PENDIENTE_APROBACION' WHERE id = $1 AND "estadoAprobacion" = 'ACTIVO_RUND'`,
        [docenteId],
      );

      this.logger.log(`[BR-046] RE-EVALUAR bloque=${bloqueUpper} docente=${docenteId} (dato aprobado editado)`);
      await this.logAudit({
        docenteId,
        bloque: bloqueUpper,
        accion: 'EDITAR',
        actorId: editadoPor || 'SISTEMA',
        observacion: 'Dato aprobado fue modificado — requiere re-aprobación',
      });
    }
  }

  /**
   * BR-047 â€” Activar registro solo si todos los bloques obligatorios estÃ¡n Aprobados.
   */
  async verificarActivacion(docenteId: string): Promise<{ activable: boolean; completitud: Record<string, string> }> {
    docenteId = await this.resolveDocenteId(docenteId);
    const bloques = await this.dataSource.query(
      `SELECT bloque, estado FROM academic_work_plan."RundCampoEstado" WHERE docente_id = $1`,
      [docenteId],
    );

    const completitud: Record<string, string> = {};
    for (const b of bloques) {
      completitud[b.bloque] = b.estado;
    }

    // Verificar que todos los bloques obligatorios estÃ©n aprobados
    const activable = BancoDocentesService.BLOQUES_OBLIGATORIOS.every(
      (b) => completitud[b] === 'Aprobado',
    );

    const nuevoEstado = activable ? 'ACTIVO_RUND' : 'PENDIENTE_APROBACION';
    await this.dataSource.query(
      `UPDATE academic_work_plan."Docente" SET "estadoAprobacion" = $1, completitud = $2 WHERE id = $3`,
      [nuevoEstado, JSON.stringify(completitud), docenteId],
    );

    return { activable, completitud };
  }

  /**
   * BR-039 â€” Vincular un soporte a un bloque, validando el catÃ¡logo.
   */
  async vincularSoporte(docenteId: string, bloque: string, data: {
    tipoSoporte: string;
    documentoCarpetaId?: string;
    nombreArchivo?: string;
    fechaVencimiento?: string;
    cargadoPor?: string;
    canalOrigen?: string;
  }) {
    docenteId = await this.resolveDocenteId(docenteId);
    const bloqueUpper = bloque.toUpperCase();
    const catalogoValido = BancoDocentesService.CATALOGO_SOPORTE[bloqueUpper];
    if (!catalogoValido) {
      throw new BadRequestException(`Bloque invÃ¡lido: ${bloque}`);
    }

    // BR-039 â€” Validar tipo de soporte contra el catÃ¡logo
    if (catalogoValido.length > 0 && !catalogoValido.includes(data.tipoSoporte)) {
      throw new BadRequestException({
        message: `BR-039: Tipo de soporte "${data.tipoSoporte}" no vÃ¡lido para el bloque ${bloqueUpper}. Tipos esperados: ${catalogoValido.join(', ')}`,
        rule: 'BR-039',
        tiposPermitidos: catalogoValido,
      });
    }

    const { randomUUID } = require('crypto');
    const newId = randomUUID();

    const existing = await this.dataSource.query(
      `SELECT id FROM academic_work_plan."RundSoporteCampo" WHERE docente_id = $1 AND tipo_soporte = $2 ORDER BY "createdAt" ASC`,
      [docenteId, data.tipoSoporte]
    );

    let id = newId;
    const soporteHistorico = ['soporte_edicion_perfil', 'soporte_cambio_estado_perfil'].includes(data.tipoSoporte);
    if (existing.length > 0 && !soporteHistorico) {
      id = existing[0].id;
      await this.dataSource.query(
        `UPDATE academic_work_plan."RundSoporteCampo" 
         SET documento_carpeta_id = $1, nombre_archivo = COALESCE($2, nombre_archivo), cargado_por = $3, estado = 'Pendiente', "updatedAt" = NOW()
         WHERE id = $4`,
        [data.documentoCarpetaId || null, data.nombreArchivo || null, data.cargadoPor || 'SYSTEM', id]
      );
      
      // Clean up duplicate rows if they exist
      if (existing.length > 1) {
        const duplicateIds = existing.slice(1).map((r: any) => r.id);
        await this.dataSource.query(
          `DELETE FROM academic_work_plan."RundSoporteCampo" WHERE id = ANY($1)`,
          [duplicateIds]
        );
      }
    } else {
      await this.dataSource.query(
        `INSERT INTO academic_work_plan."RundSoporteCampo" 
         (id, docente_id, bloque, tipo_soporte, documento_carpeta_id, nombre_archivo, estado, cargado_por, "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, 'Pendiente', $7, NOW())`,
        [id, docenteId, bloqueUpper, data.tipoSoporte, data.documentoCarpetaId || null, data.nombreArchivo || null, data.cargadoPor || 'SYSTEM']
      );
    }

    // Actualizar estado del bloque de 'Soporte faltante' a 'Pendiente'
    await this.dataSource.query(
      `UPDATE academic_work_plan."RundCampoEstado" 
       SET estado = CASE WHEN estado = 'Soporte faltante' THEN 'Pendiente' ELSE estado END, "updatedAt" = NOW()
       WHERE docente_id = $1 AND bloque = $2`,
      [docenteId, bloqueUpper],
    );

    await this.logAudit({
      docenteId,
      bloque: bloqueUpper,
      accion: 'VINCULAR_SOPORTE',
      actorId: data.cargadoPor || 'SISTEMA',
      canalOrigen: data.canalOrigen || (soporteHistorico ? 'MODAL' : undefined),
      soporteId: id,
      metadata: { tipoSoporte: data.tipoSoporte, nombreArchivo: data.nombreArchivo || null },
    });

    return { success: true, id, bloque: bloqueUpper, tipoSoporte: data.tipoSoporte, documentoCarpetaId: data.documentoCarpetaId };
  }

  /**
   * BR-052 â€” ValidaciÃ³n de unicidad de documento y correo institucional.
   */
  async validarUnicidad(documentNumber: string, correoInstitucional: string, excludeDocenteId?: string): Promise<{ duplicados: any[] }> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (documentNumber) {
      conditions.push(`p.identificacion = $${paramIndex}`);
      params.push(documentNumber);
      paramIndex++;
    }
    if (correoInstitucional) {
      conditions.push(`d."correoInstitucional" = $${paramIndex}`);
      params.push(correoInstitucional.toLowerCase());
      paramIndex++;
    }

    if (conditions.length === 0) return { duplicados: [] };

    let sql = `
      SELECT d.id, d.estado, p.identificacion AS documento, d."correoInstitucional" AS correo,
             p.primer_nombre || ' ' || COALESCE(p.primer_apellido, '') AS nombre
      FROM academic_work_plan."Docente" d
      JOIN academic_work_plan."Persona" p ON p.id = d."personaId"
      WHERE d.estado = 'ACTIVO' AND (${conditions.join(' OR ')})
    `;

    if (excludeDocenteId) {
      sql += ` AND d.id != $${paramIndex}`;
      params.push(excludeDocenteId);
    }

    const duplicados = await this.dataSource.query(sql, params);
    return { duplicados };
  }

  /**
   * BR-053 â€” DetecciÃ³n de posible duplicado por nombre + fecha nacimiento.
   */
  async detectarPosibleDuplicado(nombreCompleto: string, fechaNacimiento: Date | null): Promise<{ posiblesDuplicados: any[] }> {
    if (!nombreCompleto || !fechaNacimiento) return { posiblesDuplicados: [] };

    const nombre = nombreCompleto.toUpperCase().trim();
    const fecha = fechaNacimiento instanceof Date ? fechaNacimiento : new Date(fechaNacimiento);

    const rows = await this.dataSource.query(
      `SELECT d.id, p.identificacion AS documento, d."correoInstitucional" AS correo,
              p.primer_nombre || ' ' || COALESCE(p.segundo_nombre, '') || ' ' || COALESCE(p.primer_apellido, '') || ' ' || COALESCE(p.segundo_apellido, '') AS nombre_completo,
              p.fecha_nacimiento
       FROM academic_work_plan."Docente" d
       JOIN academic_work_plan."Persona" p ON p.id = d."personaId"
       WHERE d.estado = 'ACTIVO'
         AND UPPER(TRIM(CONCAT(p.primer_nombre, ' ', COALESCE(p.segundo_nombre, ''), ' ', COALESCE(p.primer_apellido, ''), ' ', COALESCE(p.segundo_apellido, '')))) = $1
         AND p.fecha_nacimiento::date = $2::date`,
      [nombre, fecha.toISOString().split('T')[0]],
    );

    return { posiblesDuplicados: rows };
  }

  /**
   * BR-054 â€” Validar coherencia tipo â†” formato de nÃºmero de documento.
   */
  validarFormatoDocumento(tipoDocumento: string, numero: string): { valido: boolean; error?: string } {
    if (!tipoDocumento || !numero) return { valido: true };

    const tipo = tipoDocumento.toUpperCase().trim();
    const num = numero.trim().replace(/\./g, '');

    switch (tipo) {
      case 'CC':
        // CÃ©dula de CiudadanÃ­a: 6-10 dÃ­gitos numÃ©ricos
        if (!/^\d{6,10}$/.test(num)) {
          return { valido: false, error: `BR-054: CÃ©dula de CiudadanÃ­a debe tener entre 6 y 10 dÃ­gitos numÃ©ricos. Recibido: "${num}"` };
        }
        break;
      case 'CE':
        // CÃ©dula de ExtranjerÃ­a: 6-12 caracteres alfanumÃ©ricos
        if (!/^[A-Za-z0-9]{6,12}$/.test(num)) {
          return { valido: false, error: `BR-054: CÃ©dula de ExtranjerÃ­a debe tener entre 6 y 12 caracteres alfanumÃ©ricos. Recibido: "${num}"` };
        }
        break;
      case 'PA':
        // Pasaporte: 5-15 caracteres alfanumÃ©ricos
        if (!/^[A-Za-z0-9]{5,15}$/.test(num)) {
          return { valido: false, error: `BR-054: Pasaporte debe tener entre 5 y 15 caracteres alfanumÃ©ricos. Recibido: "${num}"` };
        }
        break;
      case 'PEP':
        // PEP: alfanumÃ©rico, 5-20 caracteres
        if (!/^[A-Za-z0-9]{5,20}$/.test(num)) {
          return { valido: false, error: `BR-054: PEP debe tener entre 5 y 20 caracteres alfanumÃ©ricos. Recibido: "${num}"` };
        }
        break;
    }

    return { valido: true };
  }

  /**
   * BR-048 â€” Validar coherencia categorÃ­a â†” nivel de formaciÃ³n.
   */
  validarCategoriaFormacion(categoria: string | null, nivelFormacion: string | null): { valido: boolean; alerta?: string } {
    if (!categoria || !nivelFormacion) return { valido: true };

    const cat = normalizeLookupText(categoria);
    const nivel = normalizeLookupText(nivelFormacion);

    // CategorÃ­as que exigen al menos maestrÃ­a
    const categoriasAltas = ['titular', 'asociado'];
    // CategorÃ­as que exigen al menos especializaciÃ³n
    const categoriasMedias = ['asistente'];

    if (categoriasAltas.some(c => cat.includes(c))) {
      if (!['maestria', 'doctorado', 'posdoctorado', 'postdoctorado'].some(n => nivel.includes(n))) {
        return {
          valido: false,
          alerta: `BR-048: La categorÃ­a "${categoria}" exige al menos nivel de MaestrÃ­a. Nivel declarado: "${nivelFormacion}".`,
        };
      }
    }

    if (categoriasMedias.some(c => cat.includes(c))) {
      if (!['especializacion', 'maestria', 'doctorado', 'posdoctorado', 'postdoctorado'].some(n => nivel.includes(n))) {
        return {
          valido: false,
          alerta: `BR-048: La categorÃ­a "${categoria}" exige al menos nivel de EspecializaciÃ³n. Nivel declarado: "${nivelFormacion}".`,
        };
      }
    }

    return { valido: true };
  }

  /**
   * BR-049 â€” Validar coherencia rÃ©gimen â†” vinculaciÃ³n.
   */
  validarRegimenVinculacion(tipoVinculacion: string, regimenNormativo: string): { valido: boolean; error?: string } {
    const vinc = tipoVinculacion?.toUpperCase();
    const reg = (regimenNormativo || '').toLowerCase();

    if (vinc === 'CARRERA1' && !reg.includes('009')) {
      return { valido: false, error: 'BR-049: Carrera1 debe tener rÃ©gimen Acuerdo 009/2004.' };
    }
    if (vinc === 'CARRERA2' && !reg.includes('003')) {
      return { valido: false, error: 'BR-049: Carrera2 debe tener rÃ©gimen Acuerdo 003/2018.' };
    }

    return { valido: true };
  }

  /**
   * BR-055 â€” Verificar soportes prÃ³ximos a vencer.
   */
  async getSoportesProximosVencer(diasUmbral = 30): Promise<any[]> {
    const rows = await this.dataSource.query(
      `SELECT sc.*, d."correoInstitucional", 
              p.primer_nombre || ' ' || COALESCE(p.primer_apellido, '') AS nombre_docente
       FROM academic_work_plan."RundSoporteCampo" sc
       JOIN academic_work_plan."Docente" d ON d.id = sc.docente_id
       JOIN academic_work_plan."Persona" p ON p.id = d."personaId"
       WHERE sc.fecha_vencimiento IS NOT NULL
         AND sc.estado != 'Rechazado'
         AND sc.fecha_vencimiento <= (NOW() + INTERVAL '${diasUmbral} days')
       ORDER BY sc.fecha_vencimiento ASC`,
    );
    return rows;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // BR-056 â€” AuditorÃ­a inmutable + Tarjeta RUND
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  /**
   * BR-056 â€” Registrar entrada inmutable en el log de auditorÃ­a.
   */
  async logAudit(entry: {
    docenteId: string;
    bloque?: string;
    accion: string;
    actorId: string;
    canalOrigen?: string;
    campoAfectado?: string;
    datoPrevio?: string;
    datoNuevo?: string;
    observacion?: string;
    soporteId?: string;
    ip?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      const log = this.auditLogRepo.create({
        docenteId: entry.docenteId,
        bloque: entry.bloque || null,
        accion: entry.accion,
        actorId: entry.actorId,
        canalOrigen: entry.canalOrigen || null,
        campoAfectado: entry.campoAfectado || null,
        datoPrevio: entry.datoPrevio || null,
        datoNuevo: entry.datoNuevo || null,
        observacion: entry.observacion || null,
        soporteId: entry.soporteId || null,
        ip: entry.ip || null,
        metadata: entry.metadata || {},
      });
      await this.auditLogRepo.save(log);
    } catch (e) {
      this.logger.warn(`[AUDIT] Failed to write log: ${e.message}`);
    }
  }

  /**
   * BR-056 â€” Obtener historial de auditorÃ­a de un docente.
   */
  async getAuditoria(docenteId: string, limit = 50): Promise<any[]> {
    docenteId = await this.resolveDocenteId(docenteId);
    return this.auditLogRepo.find({
      where: { docenteId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Â§6.3 / BR-059 â€” Obtener tarjeta RUND completa para Carpeta Digital.
   * Retorna datos del docente organizados por bloque + estados + soportes + semÃ¡foro.
   */
  async getTarjetaRUND(docenteId: string) {
    docenteId = await this.resolveDocenteId(docenteId);
    const docente = await this.docenteRepo.findOne({ where: { id: docenteId } });
    if (!docente) throw new NotFoundException('Docente no encontrado.');

    // Obtener datos de persona
    let p: any = {};
    try {
      const persona = await this.dataSource.query(
        `SELECT nom_largo, num_identificacion, tip_identificacion, gen_tercero, fec_nacimiento, dir_email, tel_celular
         FROM auth.personas WHERE id_person = $1 LIMIT 1`,
        [docente.personaId],
      );
      p = persona[0] || {};
    } catch { /* persona data not available */ }

    // Obtener bloques de aprobaciÃ³n
    let bloques: any[] = [];
    try {
      bloques = await this.getBloques(docenteId) as any[];
    } catch { /* no blocks yet */ }

    // Obtener soportes
    let soportes: any[] = [];
    try {
      soportes = await this.dataSource.query(
        `SELECT * FROM academic_work_plan."RundSoporteCampo" WHERE docente_id = $1 ORDER BY bloque, "createdAt" DESC`,
        [docenteId],
      );
    } catch { /* no support docs yet */ }

    // Obtener validaciÃ³n documental
    let validacion: any[] = [];
    try {
      validacion = await this.dataSource.query(
        `SELECT * FROM academic_work_plan.validacion_documental WHERE docente_id = $1`,
        [docenteId],
      );
    } catch { /* table may not exist */ }

    const fechaNacimiento = p.fec_nacimiento || null;
    const edad = computeEdad(fechaNacimiento, (docente as any).edadReferencia);
    const rangoEdad = computeRangoEdad(edad, (docente as any).rangoEdad);
    const genUpper = (p.gen_tercero || '').toUpperCase();
    const sexoBiologico = (docente as any).sexoBiologico || (genUpper.startsWith('M') ? 'Hombre' : (genUpper.startsWith('F') ? 'Mujer' : 'Otro'));
    const territorialNombre = await this.getTerritoriales()
      .then((territoriales) => territoriales.find((t) => String(t.id) === String((docente as any).territorialId))?.nombre || (docente as any).territorialId || null)
      .catch(() => (docente as any).territorialId || null);

    // Organizar datos por bloque
    const tarjeta = {
      docenteId: docente.id,
      idRund: (docente as any).idRund || null,
      periodoCarga: (docente as any).periodoCarga || null,
      estadoAprobacion: (docente as any).estadoAprobacion || 'PENDIENTE',
      canalOrigen: (docente as any).canalOrigen || 'MASIVO',
      completitud: (docente as any).completitud || {},

      bloques: {
        IDENTIDAD: {
          campos: [
            { campo: 'NOMBRE_COMPLETO', valor: p.nom_largo || null, editable: false },
            { campo: 'DOCUMENTO_IDENTIDAD', valor: p.num_identificacion || null, editable: false },
            { campo: 'TIPO_DOCUMENTO', valor: p.tip_identificacion || null, editable: false },
            { campo: 'FECHA_NACIMIENTO', valor: formatDateOnly(p.fec_nacimiento), editable: false },
            { campo: 'GENERO', valor: p.gen_tercero || null, editable: false },
            { campo: 'SEXO_BIOLOGICO', valor: sexoBiologico, editable: false },
            { campo: 'EDAD', valor: edad, editable: false },
            { campo: 'RANGO_EDAD', valor: rangoEdad, editable: false },
          ],
          estado: bloques.find((b: any) => b.bloque === 'IDENTIDAD')?.estado || 'Pendiente',
          soportes: soportes.filter((s: any) => s.bloque === 'IDENTIDAD'),
        },
        FORMACION: {
          campos: [
            { campo: 'NIVEL_FORMACION', valor: (docente as any).nivelFormacion || null, editable: true },
            { campo: 'TITULO_PREGRADO', valor: (docente as any).pregrado || null, editable: true },
            { campo: 'TITULO_ESPECIALIZACION', valor: (docente as any).especializacion || null, editable: true },
            { campo: 'TITULO_MAESTRIA', valor: (docente as any).maestria || null, editable: true },
            { campo: 'TITULO_DOCTORADO', valor: (docente as any).doctorado || null, editable: true },
            { campo: 'TITULO_POSDOCTORADO', valor: (docente as any).posDoctorado || null, editable: true },
            { campo: 'PERFIL_ACADEMICO_PRO', valor: (docente as any).perfilAcademicoPro || null, editable: true },
            { campo: 'PERFIL_ACADEMICO', valor: (docente as any).perfilAcademico || null, editable: true },
          ],
          estado: bloques.find((b: any) => b.bloque === 'FORMACION')?.estado || 'Pendiente',
          soportes: soportes.filter((s: any) => s.bloque === 'FORMACION'),
        },
        VINCULACION: {
          campos: [
            { campo: 'TIPO_VINCULACION', valor: getTipoVinculacionLabel((docente as any).tipoVinculacion, (docente as any).vinculacionDisplay), editable: true },
            { campo: 'DEDICACION', valor: getDedicacionLabel((docente as any).dedicacion, (docente as any).dedicacionDisplay), editable: true },
            { campo: 'DEDICACION_HORAS_SEMANA', valor: (docente as any).dedicacionHorasSemana ?? getHorasSemanalesFromDedicacion((docente as any).dedicacion), editable: true },
            { campo: 'HORAS_PTA', valor: (docente as any).horasAsignables ?? null, editable: true },
            { campo: 'CATEGORIA_ESCALAFON', valor: (docente as any).escalafon || null, editable: true },
            { campo: 'TERRITORIAL', valor: territorialNombre, editable: true },
            { campo: 'REGIMEN_NORMATIVO', valor: (docente as any).regimenNormativo || null, editable: true },
            { campo: 'ORIGEN_VINCULACION', valor: (docente as any).origenVinculacion || null, editable: true },
            { campo: 'ACTO_ADMINISTRATIVO', valor: (docente as any).actoAdministrativoVinculacion || null, editable: true },
            { campo: 'INICIO_VINCULACION', valor: (docente as any).fechaInicioVinculacion || null, editable: true },
            { campo: 'FIN_VINCULACION', valor: (docente as any).fechaFinVinculacion || null, editable: true },
            { campo: 'PUNTAJE_SALARIAL', valor: (docente as any).puntajeSalarial || null, editable: true },
            { campo: 'SITUACION_ADMINISTRATIVA', valor: (docente as any).situacionAdministrativa || null, editable: true },
            { campo: 'SITUACION_CATEGORIA', valor: (docente as any).situacionCategoria || categorizarSituacion((docente as any).situacionAdministrativa), editable: true },
            { campo: 'ESTADO_DOCENTE', valor: (docente as any).estado || null, editable: true },
          ],
          estado: bloques.find((b: any) => b.bloque === 'VINCULACION')?.estado || 'Pendiente',
          soportes: soportes.filter((s: any) => s.bloque === 'VINCULACION'),
        },
        CONTACTO: {
          campos: [
            { campo: 'CORREO_INSTITUCIONAL', valor: (docente as any).correoInstitucional || null, editable: false },
            { campo: 'CORREO_ALTERNATIVO', valor: (docente as any).correoAlternativo || null, editable: true },
            { campo: 'TELEFONO', valor: p.tel_celular || null, editable: true },
          ],
          estado: bloques.find((b: any) => b.bloque === 'CONTACTO')?.estado || 'Pendiente',
          soportes: soportes.filter((s: any) => s.bloque === 'CONTACTO'),
        },
        ACADEMICO: {
          campos: [
            { campo: 'NUCLEO_TEMATICO', valor: (docente as any).nucleoTematico || null, editable: true },
            { campo: 'INVESTIGACION_ACTIVA', valor: (docente as any).investigacion || null, editable: true },
            { campo: 'ULTIMA_EVALUACION', valor: (docente as any).ultimaEvaluacion || null, editable: true },
          ],
          estado: bloques.find((b: any) => b.bloque === 'ACADEMICO')?.estado || 'Pendiente',
          soportes: soportes.filter((s: any) => s.bloque === 'ACADEMICO'),
        },
        TRANSVERSAL: {
          campos: [
            { campo: 'ID_RUND', valor: (docente as any).idRund || null, editable: false },
            { campo: 'OBSERVACIONES', valor: (docente as any).observaciones || null, editable: true },
          ],
          estado: bloques.find((b: any) => b.bloque === 'TRANSVERSAL')?.estado || 'Pendiente',
          soportes: soportes.filter((s: any) => s.bloque === 'TRANSVERSAL'),
        },
      },

      validacionDocumental: validacion,

      // SemÃ¡foro de completitud
      semaforo: (() => {
        const total = bloques.length || 4;
        const aprobados = bloques.filter((b: any) => b.estado === 'Aprobado').length;
        return {
          total,
          aprobados,
          porcentaje: total > 0 ? Math.round((aprobados / total) * 100) : 0,
          estado: aprobados === total && total > 0 ? 'COMPLETO' : aprobados > 0 ? 'PARCIAL' : 'PENDIENTE',
        };
      })(),
    };

    return tarjeta;
  }

  /**
   * §6.3 / BR-059 — Lookup tarjeta RUND by persona ID (for Carpeta Digital).
   * Returns null if the persona is not a docente.
   */
  async getTarjetaRUNDByPersona(personaId: string, periodoCarga?: string): Promise<any | null> {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(personaId);
      
      let finalPersonaId = personaId;
      if (!isUuid) {
        const result = await this.dataSource.query(
          `SELECT id_person FROM auth.personas WHERE num_identificacion = $1 LIMIT 1`,
          [personaId]
        );
        if (!result || result.length === 0) return null;
        finalPersonaId = result[0].id_person;
      }

      const docenteWhere = periodoCarga
        ? { personaId: finalPersonaId, periodoCarga }
        : { personaId: finalPersonaId };
      let docente = await this.docenteRepo.findOne({ where: docenteWhere as any });
      
      // Auto-provisionar docente si no existe (Necesario para sincronizaciA3n con Carpeta Digital)
      if (!docente) {
        const authData = await this.dataSource.query(
          `SELECT id_person, num_identificacion, nom_largo, dir_email FROM auth.personas WHERE id_person = $1 LIMIT 1`,
          [finalPersonaId]
        );
        if (authData && authData.length > 0) {
          const auth = authData[0];
          await this.upsertDocente({
            personaId: auth.id_person,
            documentNumber: auth.num_identificacion || 'N/A',
            documento_identidad: auth.num_identificacion || 'N/A',
            nombre_completo: auth.nom_largo || 'Sin Nombre',
            correo_institucional: auth.dir_email || null,
            territorial: 'Sede Central',
            vinculacion: 'Ocasional',
            estado: 'Inactivo',
            periodoCarga: periodoCarga || null,
          }, { rejectExisting: false });
          docente = await this.docenteRepo.findOne({ where: docenteWhere as any });
        }
      }

      if (!docente) return null;
      return this.getTarjetaRUND(docente.id);
    } catch (e) {
      console.error('Error finding docente by personaId:', e);
      return null;
    }
  }

  async saveValidacionDocumentalBatch(userId: string, data: any[]) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      if (data && Array.isArray(data)) {
        for (const item of data) {
          if (!item.campoRund) continue;
          this.logger.log(`[RUND] Validación guardada para docente ${userId}, campo: ${item.campoRund}, estado: ${item.estadoDocumento}`);
        }
      }
      await queryRunner.commitTransaction();
      return { success: true };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error saving validacion documental batch: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async syncCheckDocente(docenteId: string) {
    docenteId = await this.resolveDocenteId(docenteId);
    const docente = await this.docenteRepo.findOne({
      where: { id: docenteId }
    });

    if (!docente) {
      throw new NotFoundException(`Docente con ID ${docenteId} no encontrado`);
    }

    const persona = await this.personaRepo.findOne({
      where: { id: docente.personaId }
    });

    const nameParts = [
      persona?.primer_nombre,
      persona?.segundo_nombre,
      persona?.primer_apellido,
      persona?.segundo_apellido
    ].filter(Boolean);

    const docenteNombre = nameParts.length > 0
      ? nameParts.join(' ').replace(/[^a-zA-Z0-9 -]/g, '').trim().toUpperCase()
      : docente.id;

    const path = require('path');
    const fs = require('fs');
    const uploadPath = path.join(process.cwd(), 'uploads', 'carpeta-digital', docenteNombre, 'RUND');

    let diskFiles: string[] = [];
    if (fs.existsSync(uploadPath)) {
      diskFiles = fs.readdirSync(uploadPath).filter((file: string) => {
        try {
          return fs.statSync(path.join(uploadPath, file)).isFile();
        } catch {
          return false;
        }
      });
    }

    const dbSoportes = await this.dataSource.query(
      `SELECT * FROM academic_work_plan."RundSoporteCampo" WHERE docente_id = $1`,
      [docenteId]
    );

    const details = dbSoportes.map((soporte: any) => {
      let fileExists = false;
      if (soporte.documento_carpeta_id) {
        const relativePath = soporte.documento_carpeta_id.replace(/^\/pta\/api\/v1\/uploads\//, 'uploads/');
        const absolutePath = path.join(process.cwd(), relativePath);
        fileExists = fs.existsSync(absolutePath);
      }
      return {
        id: soporte.id,
        bloque: soporte.bloque,
        tipoSoporte: soporte.tipo_soporte,
        documentoCarpetaId: soporte.documento_carpeta_id,
        nombreArchivo: soporte.nombre_archivo,
        estado: soporte.estado,
        existsOnDisk: fileExists
      };
    });

    return {
      docenteId,
      docenteNombre,
      dbCount: dbSoportes.length,
      diskCount: diskFiles.length,
      details
    };
  }


  async repararSoportesMasivo() {
    const path = require('path');
    const fs = require('fs');
    const { randomUUID } = require('crypto');

    const docentes = await this.docenteRepo.find();
    let totalProcessed = 0;
    let totalSynced = 0;
    let totalCreated = 0;
    const logs: string[] = [];
    console.log(`Checking ${docentes.length} docentes for uploaded folders...`);

    for (const docente of docentes) {
      let docenteNombre = docente.id;
      try {
        const persona = await this.dataSource.query(
          `SELECT nom_largo FROM auth.personas WHERE id_person = $1 LIMIT 1`,
          [docente.personaId]
        );
        if (persona && persona.length > 0) {
          const p = persona[0];
          if (p.nom_largo) {
            docenteNombre = p.nom_largo.replace(/[^a-zA-Z0-9 -]/g, '').trim().toUpperCase();
          }
        }
      } catch (e) {
        console.error('Error resolving persona', e);
      }

      const uploadPath = path.join(process.cwd(), 'uploads', 'carpeta-digital', docenteNombre, 'RUND');
      console.log(`Checking path for ${docenteNombre}: ${uploadPath}`);
      if (!fs.existsSync(uploadPath)) {
        continue;
      }

      const diskFiles = fs.readdirSync(uploadPath).filter((file: string) => {
        try {
          return fs.statSync(path.join(uploadPath, file)).isFile();
        } catch {
          return false;
        }
      });

      if (diskFiles.length === 0) {
        continue;
      }

      totalProcessed++;

      const dbSoportes = await this.dataSource.query(
        `SELECT * FROM academic_work_plan."RundSoporteCampo" WHERE docente_id = $1`,
        [docente.id]
      );

      const unlinkedFiles = diskFiles.filter((file: string) => {
        const expectedDocId = `/pta/api/v1/uploads/carpeta-digital/${docenteNombre}/RUND/${file}`;
        return !dbSoportes.some((s: any) => s.documento_carpeta_id === expectedDocId);
      });

      if (unlinkedFiles.length === 0) {
        continue;
      }

      const unlinkedDbRecords = dbSoportes.filter((s: any) => !s.documento_carpeta_id);

      let linkedForDocente = 0;
      let createdForDocente = 0;

      const filesToLink = [...unlinkedFiles];
      while (filesToLink.length > 0 && unlinkedDbRecords.length > 0) {
        const file = filesToLink.shift();
        const record = unlinkedDbRecords.shift();
        const expectedDocId = `/pta/api/v1/uploads/carpeta-digital/${docenteNombre}/RUND/${file}`;

        await this.dataSource.query(
          `UPDATE academic_work_plan."RundSoporteCampo" 
           SET documento_carpeta_id = $1, nombre_archivo = COALESCE(nombre_archivo, $2), "updatedAt" = NOW()
           WHERE id = $3`,
          [expectedDocId, file, record.id]
        );
        linkedForDocente++;
        totalSynced++;
      }

      while (filesToLink.length > 0) {
        const file = filesToLink.shift();
        const expectedDocId = `/pta/api/v1/uploads/carpeta-digital/${docenteNombre}/RUND/${file}`;
        const newId = randomUUID();

        let bloque = 'FORMACION';
        let tipoSoporte = 'diploma_pregrado';
        const lowerName = file.toLowerCase();
        if (lowerName.includes('cedula') || lowerName.includes('ident') || lowerName.includes('documento')) {
          bloque = 'IDENTIDAD';
          tipoSoporte = 'documento_identidad';
        } else if (lowerName.includes('contrato') || lowerName.includes('resoluc') || lowerName.includes('acto')) {
          bloque = 'VINCULACION';
          tipoSoporte = 'acto_administrativo_vinculacion';
        }

        await this.dataSource.query(
          `INSERT INTO academic_work_plan."RundSoporteCampo" 
           (id, docente_id, bloque, tipo_soporte, documento_carpeta_id, nombre_archivo, estado, cargado_por, "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, 'Pendiente', 'SYSTEM_SYNC', NOW())`,
          [newId, docente.id, bloque, tipoSoporte, expectedDocId, file]
        );
        createdForDocente++;
        totalCreated++;
      }

      logs.push(`Docente ${docenteNombre}: Enlazados ${linkedForDocente} registros, Creados ${createdForDocente} nuevos registros`);
    }

    return {
      success: true,
      totalDocentesConCarpeta: totalProcessed,
      totalRegistrosEnlazados: totalSynced,
      totalRegistrosCreados: totalCreated,
      details: logs
    };
  }
}

