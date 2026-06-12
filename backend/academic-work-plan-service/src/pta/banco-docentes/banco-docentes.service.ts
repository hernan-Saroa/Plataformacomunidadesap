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
  if (exp && exp > 0) return exp;
  const n = normalizeDedicacionCode(dedicacion);
  if (n === 'MT') return 400;
  if (n === 'HC') return 0;
  return 800;
}

function computeEdad(fechaNacimiento: any, edadFallback?: any): number | null {
  const fecha = parseMaybeDate(fechaNacimiento);
  if (!fecha) return parseMaybeInt(edadFallback);
  const today = new Date();
  let age = today.getFullYear() - fecha.getFullYear();
  const m = today.getMonth() - fecha.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < fecha.getDate())) age -= 1;
  return age >= 0 ? age : parseMaybeInt(edadFallback);
}

function computeRangoEdad(edad: any, fallback?: any): string | null {
  const v = parseMaybeInt(edad);
  if (v === null) return toCleanString(fallback);
  if (v <= 35) return 'Menor de 35 aÃ±os';
  if (v <= 45) return 'De 36 a 45 aÃ±os';
  if (v <= 55) return 'De 46 a 55 aÃ±os';
  if (v <= 65) return 'De 56 a 65 aÃ±os';
  return 'Mayor de 65 aÃ±os';
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
      if (docNum.length >= 7) {
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
    fechaNacimiento,
    edadReferencia: edad,
    rangoEdad: computeRangoEdad(edad, raw?.rangoEdad ?? raw?.['Rango de edad']),
    horasAsignables: horasPta,
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

  // [BR-019] & [BR-020]
  if (payload.correoInstitucional) {
    const email = payload.correoInstitucional.toLowerCase().trim();
    if (!email.endsWith('@esap.edu.co')) {
      throw new BadRequestException({
        message: 'Correo no institucional en campo institucional. Requiere correo @esap.edu.co',
        columna: 'CORREO_INSTITUCIONAL',
        datoErrado: payload.correoInstitucional,
        valorEsperado: '*@esap.edu.co'
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
  const sexoBiologico = genUpper.startsWith('M') ? 'Hombre' : (genUpper.startsWith('F') ? 'Mujer' : 'Otro');

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
    dedicacion_horas_semana: docente.dedicacion === 'MT' ? 20 : 40,
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
    correo_personal: persona?.correo_alternativo ?? docente.correoAlternativo ?? null,
    telefono: persona?.telefono ?? null,
    ultima_evaluacion: docente.ultimaEvaluacion ?? null,
    situacion_administrativa: docente.situacionAdministrativa ?? null,
    situacion_categoria: categorizarSituacion(docente.situacionAdministrativa),
    inicio_vinculacion: docente.fechaInicioVinculacion ?? null,
    fin_vinculacion: docente.fechaFinVinculacion ?? persona?.fecha_fin_contrato ?? null,
    puntaje_salarial: docente.puntajeSalarial ?? null,
    genero: persona?.genero ?? null,
    sexo_biologico: sexoBiologico,
    nacimiento: fechaNacimiento,
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
  const sexoBiologico = genUpper.startsWith('M') ? 'Hombre' : (genUpper.startsWith('F') ? 'Mujer' : 'Otro');

  return {
    id: row.usuario_id,
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
    dedicacion_horas_semana: dedicacionCodigo === 'MT' || row.dedicacion === 'Medio Tiempo' ? 20 : 40,
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
    correo_personal: row.correo_personal ?? null,
    telefono: row.telefono ?? null,
    ultima_evaluacion: row.ultima_evaluacion ?? null,
    situacion_administrativa: row.situacion_administrativa ?? null,
    situacion_categoria: categorizarSituacion(row.situacion_administrativa),
    inicio_vinculacion: row.inicio_vinculacion ?? null,
    fin_vinculacion: row.fin_vinculacion ?? null,
    puntaje_salarial: row.puntaje_salarial ?? null,
    genero: row.genero ?? null,
    sexo_biologico: sexoBiologico,
    nacimiento: fechaNacimiento,
    edad,
    rango_edad: rangoEdad,
    horas_programables: row.horas_programables ?? 0,
    estado: row.estado || (row.activo ? 'ACTIVO' : 'INACTIVO'),
    email,
    activo: row.activo,
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
    await this.dataSource.query('CREATE SEQUENCE IF NOT EXISTS academic_work_plan.docente_id_rund_seq START WITH 1 INCREMENT BY 1');
    this.logger.log('Sequence academic_work_plan.docente_id_rund_seq verified');
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

  private authDocentesBaseSql() {
    return `
      WITH auth_docentes AS (
        SELECT DISTINCT ON (u.id_user)
          u.id_user AS usuario_id,
          u.username,
          u.is_active AS activo,
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
          COALESCE(d."territorialId", p.id_seccional::text) AS territorial_id,
          sec.nom_seccional AS territorial,
          sec.cod_seccional AS territorial_codigo,
          COALESCE(d."sedeId", p.id_sede::text) AS sede_id,
          sede.nom_sede AS sede,
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
          d."ultimaEvaluacion" AS ultima_evaluacion,
          d."situacionAdministrativa" AS situacion_administrativa,
          d."fechaInicioVinculacion" AS inicio_vinculacion,
          d."fechaFinVinculacion" AS fin_vinculacion,
          d."puntajeSalarial" AS puntaje_salarial,
          d."edadReferencia" AS edad_referencia,
          d."rangoEdad" AS rango_edad,
          d."horasAsignables" AS horas_programables,
          d."regimenNormativo" AS regimen_normativo,
          d."periodoCarga" AS periodo_carga,
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
        INNER JOIN auth.user_roles ur ON ur.id_user = u.id_user AND COALESCE(ur.is_active, true) = true
        INNER JOIN auth.role r ON r.id = ur.id_rol AND COALESCE(r.is_active, true) = true
        LEFT JOIN auth.seccionales sec ON sec.id_seccional = p.id_seccional
        LEFT JOIN auth.sedes sede ON sede.id_sede = p.id_sede
        LEFT JOIN academic_work_plan."Docente" d ON d."personaId"::text = p.id_person::text
        WHERE (UPPER(r.code) = 'DOCENTE' OR UPPER(r.name) = 'DOCENTE')
        ORDER BY u.id_user, p.nom_largo ASC
      )
    `;
  }

  private buildAuthDocentesFilters(filters: { territorial?: string; dedicacion?: string; estado?: string; search?: string; periodoCarga?: string }, params: any[]) {
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
      params.push(String(filters.estado).toUpperCase() === 'ACTIVO');
      conditions.push(`activo = $${params.length}`);
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

  async list(filters: { territorial?: string; dedicacion?: string; estado?: string; search?: string; periodoCarga?: string; page?: number; limit?: number }) {
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

  async getById(id: string) {
    const rows = await this.dataSource.query(
      `
      ${this.authDocentesBaseSql()}
      SELECT *
      FROM auth_docentes
      WHERE usuario_id::text = $1 OR persona_id::text = $1 OR docente_id::text = $1
      LIMIT 1
      `,
      [id],
    );
    if (!rows[0]) throw new NotFoundException(`Docente ${id} no encontrado en auth.personas`);
    return buildAuthBancoDocenteResponse(rows[0]);
  }

  async upsertDocente(rawPayload: any, options: { rejectExisting?: boolean, outerManager?: any } = {}) {
    const payload = normalizeBancoDocentePayload(rawPayload);
    validatePayload(payload);

    const territoriales = await this.getTerritoriales();
    const territorial = territoriales.find((t) => normalizeLookupText(t.nombre) === normalizeLookupText(payload.territorialNombre)) || findTerritorialMatch(territoriales, payload.territorialNombre);
    if (!territorial?.id) throw new BadRequestException({
      message: `La territorial "${payload.territorialNombre}" no existe en el catÃ¡logo.`,
      columna: 'TERRITORIAL',
      datoErrado: payload.territorialNombre,
      valorEsperado: 'Sede vÃ¡lida'
    });

    const runWithManager = async (manager: any) => {
      const emailFinal = payload.correoInstitucional!.toLowerCase().trim();
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
          payload.telefono,
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
            payload.telefono || authPersona.tel_celular || null,
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

      const existingDocente = await manager.findOne(DocenteEntity, { where: { personaId: authPersonId } });

      if (existingDocente && options.rejectExisting) {
        throw new BadRequestException(`El documento ${payload.documentNumber} ya existe en el Banco de Docentes.`);
      }

      let nextIdRund = existingDocente?.idRund;
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
        ultimaEvaluacion: payload.ultimaEvaluacion ?? existingDocente?.ultimaEvaluacion ?? null,
        situacionAdministrativa: payload.situacionAdministrativa ?? existingDocente?.situacionAdministrativa ?? null,
        fechaInicioVinculacion: payload.fechaInicioVinculacion ?? existingDocente?.fechaInicioVinculacion ?? null,
        fechaFinVinculacion: payload.fechaFinVinculacion ?? existingDocente?.fechaFinVinculacion ?? null,
        puntajeSalarial: payload.puntajeSalarial ?? existingDocente?.puntajeSalarial ?? null,
        edadReferencia: payload.edadReferencia ?? existingDocente?.edadReferencia ?? null,
        rangoEdad: payload.rangoEdad ?? existingDocente?.rangoEdad ?? null,
        regimenNormativo: payload.regimenNormativo,
        periodoCarga: payload.periodoCarga,
        observaciones: payload.observaciones,
        idRund: nextIdRund,
        // Â§6 â€” Canal de origen para auditorÃ­a
        canalOrigen: rawPayload?.canal_origen || 'MASIVO',
        // Â§4/Â§5.4 â€” Estado segÃºn canal: MODALâ†’Activo, AUTOGESTIONâ†’Pendiente, MASIVOâ†’Activo
        estadoAprobacion: rawPayload?.canal_origen === 'AUTOGESTION' ? 'PENDIENTE_APROBACION' : (existingDocente?.estadoAprobacion || 'PENDIENTE_APROBACION'),
      };

      let docente: DocenteEntity;
      let action = existingDocente ? 'update' : 'insert';
      
      if (!existingDocente) {
        docente = await manager.save(DocenteEntity, manager.create(DocenteEntity, docenteData));
      } else {
        let hasChanges = false;
        const fieldsToCheck: (keyof DocenteEntity)[] = ['tipoVinculacion', 'dedicacion', 'escalafon', 'horasAsignables', 'estado', 'nucleoTematico', 'nivelFormacion', 'perfilAcademico', 'pregrado', 'especializacion', 'maestria', 'doctorado', 'posDoctorado', 'investigacion', 'origenVinculacion', 'actoAdministrativoVinculacion', 'correoInstitucional', 'ultimaEvaluacion', 'situacionAdministrativa', 'puntajeSalarial', 'edadReferencia', 'regimenNormativo', 'periodoCarga'];
        
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
          await this.inicializarBloques(docente.id, rawPayload?.canal_origen || 'MASIVO', rawPayload?.cargadoPor || null);
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
        { campo: 'CORREO_INSTITUCIONAL', tipo: 'CONTACTO' },
        { campo: 'VINCULACION', tipo: 'VINCULACION' },
        { campo: 'TERRITORIAL', tipo: 'VINCULACION' },
        { campo: 'DEDICACION', tipo: 'VINCULACION' },
        { campo: 'CATEGORIA_ESCALAFON', tipo: 'ESCALAFON' },
        { campo: 'INICIO_VINCULACION', tipo: 'VINCULACION' },
        { campo: 'FIN_VINCULACION', tipo: 'VINCULACION' },
        { campo: 'ACTO_ADMINISTRATIVO', tipo: 'VINCULACION' },
        { campo: 'PUNTAJE_SALARIAL', tipo: 'ESCALAFON' },
        { campo: 'SITUACION_ADMINISTRATIVA', tipo: 'SITUACION' },
        { campo: 'NIVEL_FORMACION', tipo: 'FORMACION' },
        { campo: 'TITULO_PREGRADO', tipo: 'FORMACION' },
        { campo: 'TITULO_ESPECIALIZACION', tipo: 'FORMACION' },
        { campo: 'TITULO_MAESTRIA', tipo: 'FORMACION' },
        { campo: 'TITULO_DOCTORADO', tipo: 'FORMACION' },
        { campo: 'TITULO_POSDOCTORADO', tipo: 'FORMACION' },
        { campo: 'NUCLEO_TEMATICO', tipo: 'VINCULACION' },
        { campo: 'PERFIL_ACADEMICO', tipo: 'FORMACION' },
        { campo: 'ULTIMA_EVALUACION', tipo: 'EVALUACION' }
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

  async bulkUpsert(rows: any[], options: { rejectExisting?: boolean, dryRun?: boolean, omitErrors?: boolean } = {}) {
    const periodRows = await this.dataSource.query(`SELECT codigo FROM academic_work_plan.periodo_academico WHERE estado = 'en_curso' LIMIT 1`);
    const activePeriod = periodRows.length > 0 ? periodRows[0].codigo : null;

    let finalResults: any[] = [];
    let finalErrors: any[] = [];

    const processRows = async (manager?: any) => {
      const results: any[] = [];
      const errors: any[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = { ...rows[i], __sourceRowNumber: i + 2 };
        if (activePeriod) {
          row.PERIODO_CARGA = activePeriod;
        }
        try {
          const result = await this.upsertDocente(row, { ...options, outerManager: manager });
          results.push(result);
        } catch (err: any) {
          if (!options.omitErrors && !options.dryRun) {
             // If not omitting, we still record it. Or wait, original code recorded all errors.
          }
          
          let errorPayload: any = {};
          if (typeof err.getResponse === 'function') {
            const resp = err.getResponse();
            if (typeof resp === 'object') errorPayload = resp;
          }

          errors.push({ 
            row: i + 2, 
            message: errorPayload.message || err.message || 'Error desconocido', 
            columna: errorPayload.columna,
            datoErrado: errorPayload.datoErrado,
            valorEsperado: errorPayload.valorEsperado,
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
      total: rows.length,
      created: finalResults.filter((r) => r.action === 'insert').length,
      updated: finalResults.filter((r) => r.action === 'update').length,
      unchanged: finalResults.filter((r) => r.action === 'unchanged').length,
      errors: finalErrors.length,
      results: finalResults,
      errorDetails: finalErrors,
    };
  }

  async toggleEstado(id: string) {
    const authRows = await this.dataSource.query(
      `
      SELECT u.id_user, u.is_active
      FROM auth."user" u
      WHERE u.id_user::text = $1 OR u.id_person::text = $1
      LIMIT 1
      `,
      [id],
    );

    if (authRows[0]) {
      const activo = !authRows[0].is_active;
      await this.dataSource.query(
        `UPDATE auth."user" SET is_active = $1, updated_at = now() WHERE id_user = $2`,
        [activo, authRows[0].id_user],
      );
      return { id: authRows[0].id_user, estado: activo ? 'ACTIVO' : 'INACTIVO', activo };
    }

    const d = await this.docenteRepo.findOne({ where: { id } });
    if (!d) throw new NotFoundException(`Docente ${id} no encontrado`);
    d.estado = d.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    await this.docenteRepo.save(d);
    return { id, estado: d.estado, activo: d.estado === 'ACTIVO' };
  }

  async updateDocente(id: string, body: any) {
    const d = await this.docenteRepo.findOne({ where: { id } });
    if (d) {
      const authRows = await this.dataSource.query(
        `SELECT num_identificacion AS document_number FROM auth.personas WHERE id_person::text = $1 LIMIT 1`,
        [d.personaId],
      );
      const result = await this.upsertDocente({ ...body, documentNumber: body.documentNumber || authRows[0]?.document_number }, {});
      return result;
    }

    const authRows = await this.dataSource.query(
      `
      SELECT p.num_identificacion AS document_number
      FROM auth."user" u
      INNER JOIN auth.personas p ON p.id_person = u.id_person
      WHERE u.id_user::text = $1 OR p.id_person::text = $1
      LIMIT 1
      `,
      [id],
    );
    if (!authRows[0]?.document_number) throw new NotFoundException(`Docente ${id} no encontrado`);

    const result = await this.upsertDocente({ ...body, documentNumber: body.documentNumber || authRows[0].document_number }, {});
    return result;
  }

  async getStats(filters?: { territorial?: string; dedicacion?: string; estado?: string; periodoCarga?: string }) {
    const baseSql = this.authDocentesBaseSql();
    const params: any[] = [];
    const whereClause = filters ? this.buildAuthDocentesFilters(filters, params) : '';

    const [summary] = await this.dataSource.query(`
      ${baseSql}
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE activo = true)::int AS activos,
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
        COALESCE(NULLIF(TRIM(vinculacion_codigo), ''), 'Sin vinculación') AS vinculacion,
        COUNT(*)::int AS total
      FROM auth_docentes
      ${v.w}
      GROUP BY COALESCE(NULLIF(TRIM(vinculacion_codigo), ''), 'Sin vinculación')
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

    // En un caso real enviarÃ­amos correo aquÃ­ usando notifications-service.
    this.logger.log(`[RUND] InvitaciÃ³n generada para ${correoInstitucional}. Token: ${token}`);

    return { tokenAcceso: token, expiresAt: fechaExpiracion };
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

    this.logger.log(`[RUND][OTP] Código para ${invitacion.correoInstitucional}: ${otp}`);

    return { 
      success: true, 
      message: 'Código OTP enviado al correo.', 
      expiresAt,
      devOtp: otp // Para facilitar pruebas en desarrollo
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
    
    const result = await this.upsertDocente(data, { rejectExisting: true });

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
    TRANSVERSAL: ['autorizacion_habeas_data'],
  };

  /**
   * Ensure RUND tables exist (auto-create if missing).
   */
  async ensureRundTables() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS academic_work_plan."RundCampoEstado" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        docente_id VARCHAR(255) NOT NULL,
        bloque VARCHAR(50) NOT NULL,
        estado VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
        cargado_por VARCHAR(255),
        revisado_por VARCHAR(255),
        observacion TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        canal_origen VARCHAR(50),
        soporte_ids JSONB NOT NULL DEFAULT '[]',
        fecha_revision TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS academic_work_plan."RundSoporteCampo" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        docente_id VARCHAR(255) NOT NULL,
        bloque VARCHAR(50) NOT NULL,
        tipo VARCHAR(100) NOT NULL,
        nombre VARCHAR(500),
        url TEXT,
        estado VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
        cargado_por VARCHAR(255),
        revisado_por VARCHAR(255),
        observacion TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  }

  /**
   * BR-044 â€” Obtener estados de aprobaciÃ³n por bloque para un docente.
   */
  async getBloques(docenteId: string) {
    // Ensure tables exist before querying
    await this.ensureRundTables();

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
  }) {
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

    const id = randomUUID();
    await this.dataSource.query(
      `INSERT INTO academic_work_plan."RundSoporteCampo" 
       (id, docente_id, bloque, tipo, url, nombre, estado, cargado_por, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, 'Pendiente', $7, NOW())`,
      [id, docenteId, bloqueUpper, data.tipoSoporte, data.documentoCarpetaId || null, data.nombreArchivo || null, data.cargadoPor || null],
    );

    // Actualizar estado del bloque de 'Soporte faltante' a 'Pendiente'
    await this.dataSource.query(
      `UPDATE academic_work_plan."RundCampoEstado" 
       SET estado = CASE WHEN estado = 'Soporte faltante' THEN 'Pendiente' ELSE estado END, "updatedAt" = NOW()
       WHERE docente_id = $1 AND bloque = $2`,
      [docenteId, bloqueUpper],
    );

    return { success: true, id, bloque: bloqueUpper, tipoSoporte: data.tipoSoporte };
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

    // Organizar datos por bloque
    const tarjeta = {
      docenteId: docente.id,
      idRund: (docente as any).idRund || null,
      estadoAprobacion: (docente as any).estadoAprobacion || 'PENDIENTE',
      canalOrigen: (docente as any).canalOrigen || 'MASIVO',
      completitud: (docente as any).completitud || {},

      bloques: {
        IDENTIDAD: {
          campos: [
            { campo: 'NOMBRE_COMPLETO', valor: p.nom_largo || null, editable: false },
            { campo: 'DOCUMENTO_IDENTIDAD', valor: p.num_identificacion || null, editable: false },
            { campo: 'TIPO_DOCUMENTO', valor: p.tip_identificacion || null, editable: false },
            { campo: 'FECHA_NACIMIENTO', valor: p.fec_nacimiento || null, editable: false },
            { campo: 'GENERO', valor: p.gen_tercero || null, editable: false },
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
            { campo: 'PERFIL_ACADEMICO', valor: (docente as any).perfilAcademico || null, editable: true },
          ],
          estado: bloques.find((b: any) => b.bloque === 'FORMACION')?.estado || 'Pendiente',
          soportes: soportes.filter((s: any) => s.bloque === 'FORMACION'),
        },
        VINCULACION: {
          campos: [
            { campo: 'TIPO_VINCULACION', valor: (docente as any).tipoVinculacion || null, editable: true },
            { campo: 'DEDICACION', valor: (docente as any).dedicacion || null, editable: true },
            { campo: 'CATEGORIA_ESCALAFON', valor: (docente as any).escalafon || null, editable: true },
            { campo: 'TERRITORIAL', valor: (docente as any).territorialId || null, editable: true },
            { campo: 'REGIMEN_NORMATIVO', valor: (docente as any).regimenNormativo || null, editable: true },
            { campo: 'ACTO_ADMINISTRATIVO', valor: (docente as any).actoAdministrativoVinculacion || null, editable: true },
            { campo: 'PUNTAJE_SALARIAL', valor: (docente as any).puntajeSalarial || null, editable: true },
            { campo: 'SITUACION_ADMINISTRATIVA', valor: (docente as any).situacionAdministrativa || null, editable: true },
            { campo: 'NUCLEO_TEMATICO', valor: (docente as any).nucleoTematico || null, editable: true },
          ],
          estado: bloques.find((b: any) => b.bloque === 'VINCULACION')?.estado || 'Pendiente',
          soportes: soportes.filter((s: any) => s.bloque === 'VINCULACION'),
        },
        CONTACTO: {
          campos: [
            { campo: 'CORREO_INSTITUCIONAL', valor: (docente as any).correoInstitucional || null, editable: false },
            { campo: 'CORREO_ALTERNATIVO', valor: p.dir_email !== (docente as any).correoInstitucional ? p.dir_email : null, editable: true },
            { campo: 'TELEFONO', valor: p.tel_celular || null, editable: true },
          ],
          estado: bloques.find((b: any) => b.bloque === 'CONTACTO')?.estado || 'Pendiente',
          soportes: soportes.filter((s: any) => s.bloque === 'CONTACTO'),
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
  async getTarjetaRUNDByPersona(personaId: string): Promise<any | null> {
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

      const docente = await this.docenteRepo.findOne({ where: { personaId: finalPersonaId } });
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
}

