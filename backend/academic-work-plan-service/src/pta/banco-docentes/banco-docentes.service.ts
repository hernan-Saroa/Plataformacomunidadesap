import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Like, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { DocenteEntity } from '../entities/docente.entity';
import { PersonaEntity } from '../entities/persona.entity';
import { UsuarioEntity } from '../entities/usuario.entity';
import { sanitizeText } from '../utils/text-sanitizer';
import { OFFICIAL_TERRITORIALES_ESAP } from '../catalogos/territoriales-cetaps-esap';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

type AuthSeccionalTerritorial = {
  id: string;
  nombre: string;
  codigo: string | null;
};

// ─── text helpers ─────────────────────────────────────────────────────────────

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
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
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

// ─── dedican / vinculacion codes ──────────────────────────────────────────────

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
  if (n === 'HC') return 'Hora Cátedra';
  if (n === 'TC') return 'Tiempo Completo';
  return toCleanString(code);
}

export function normalizeTipoVinculacionCode(value: any): string {
  const n = normalizeLookupText(value);
  if (!n) return 'OCASIONAL';
  if (n.includes('carrera') || n.includes('prueba') || n.includes('periodo')) return 'CARRERA';
  if (n.includes('ocasional') || n.includes('provisional')) return 'OCASIONAL';
  if (n.includes('catedra')) return 'CATEDRA';
  if (n.includes('visitante')) return 'VISITANTE';
  if (n.includes('especial')) return 'ESPECIAL';
  return (toCleanString(value) || 'OCASIONAL').toUpperCase().replace(/\s+/g, '_');
}

function isSupportedTipoVinculacion(value: any): boolean {
  const n = normalizeLookupText(value);
  return n.includes('carrera') || n.includes('prueba') || n.includes('periodo') || n.includes('provisional') || n.includes('ocasional') || n.includes('catedra') || n.includes('visitante') || n.includes('especial');
}

export function getTipoVinculacionLabel(code: any, fallback?: any): string | null {
  const fb = toCleanString(fallback);
  if (fb) return fb;
  const n = normalizeTipoVinculacionCode(code);
  if (n === 'CARRERA') return 'Carrera';
  if (n === 'OCASIONAL') return 'Ocasional';
  if (n === 'CATEDRA') return 'Hora Cátedra';
  if (n === 'VISITANTE') return 'Visitante';
  if (n === 'ESPECIAL') return 'Especial';
  if (n === 'PERIODO_DE_PRUEBA') return 'Período de Prueba';
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
  if (v <= 25) return 'Hasta 25 años';
  if (v <= 35) return 'De 26 a 35 años';
  if (v <= 45) return 'De 36 a 45 años';
  if (v <= 55) return 'De 46 a 55 años';
  if (v <= 65) return 'De 56 a 65 años';
  return '66 años o más';
}

// ─── territorial resolution ───────────────────────────────────────────────────

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

// ─── payload normalization ────────────────────────────────────────────────────

export function normalizeBancoDocentePayload(raw: any) {
  const fullName = firstNonEmpty(raw?.nombreCompleto, raw?.nombre_completo, raw?.nombre, raw?.['Nombre completo']);
  const splitName = splitFullName(fullName);
  const fechaNacimiento = parseMaybeDate(raw?.fechaNacimiento ?? raw?.fecha_nacimiento ?? raw?.nacimiento ?? raw?.['Nacimiento']);
  const edad = computeEdad(fechaNacimiento, raw?.edad ?? raw?.edadReferencia ?? raw?.['Edad']);

  return {
    orderIndex: parseMaybeInt(raw?.ordenListado ?? raw?.orderIndex),
    documentNumber: firstNonEmpty(raw?.documentNumber, raw?.documento_identidad, raw?.identificacion, raw?.document, raw?.documento, raw?.['Documento de identidad']),
    documentType: firstNonEmpty(raw?.tipo_identificacion, raw?.tipo_documento, raw?.documentType, raw?.tipoDocumento, 'CC'),
    fullName,
    primer_nombre: firstNonEmpty(raw?.primer_nombre, raw?.primerNombre, splitName.primer_nombre),
    segundo_nombre: firstNonEmpty(raw?.segundo_nombre, raw?.segundoNombre, splitName.segundo_nombre),
    primer_apellido: firstNonEmpty(raw?.primer_apellido, raw?.primerApellido, splitName.primer_apellido),
    segundo_apellido: firstNonEmpty(raw?.segundo_apellido, raw?.segundoApellido, splitName.segundo_apellido),
    territorialNombre: firstNonEmpty(raw?.territorialNombre, raw?.territorial, raw?.territorial_nombre, raw?.['Territorial']),
    vinculacionLabel: firstNonEmpty(raw?.vinculacion, raw?.vinculacionDisplay, raw?.tipoVinculacionDisplay, raw?.['Vinculación'], raw?.tipoVinculacion),
    tipoVinculacion: normalizeTipoVinculacionCode(raw?.tipoVinculacion ?? raw?.vinculacion ?? raw?.['Vinculación']),
    dedicacionLabel: firstNonEmpty(raw?.dedicacionLabel, raw?.dedicacion, raw?.['Dedicación']),
    dedicacion: normalizeDedicacionCode(raw?.dedicacion ?? raw?.dedicacionLabel ?? raw?.['Dedicación']),
    escalafon: firstNonEmpty(raw?.escalafon, raw?.categoriaEscalafon, raw?.categoria, raw?.['Categoría']),
    nucleoTematico: firstNonEmpty(raw?.nucleoTematico, raw?.['Núcleo Temático']),
    nivelFormacion: firstNonEmpty(raw?.nivelFormacion, raw?.['Nivel de Formación']),
    perfilAcademicoPro: firstNonEmpty(raw?.perfilAcademicoPro, raw?.['Perfil académico PRO']),
    perfilAcademico: firstNonEmpty(raw?.perfilAcademico, raw?.['Perfil académico']),
    pregrado: firstNonEmpty(raw?.pregrado, raw?.['Pregrado']),
    especializacion: firstNonEmpty(raw?.especializacion, raw?.['Especialización']),
    maestria: firstNonEmpty(raw?.maestria, raw?.['Maestría']),
    doctorado: firstNonEmpty(raw?.doctorado, raw?.['Doctorado']),
    posDoctorado: firstNonEmpty(raw?.posDoctorado, raw?.posdoctorado, raw?.['PosDoctorado']),
    investigacion: firstNonEmpty(raw?.investigacion, raw?.investigacion2025, raw?.['Investigación'], raw?.['Investigación 2025']),
    origenVinculacion: firstNonEmpty(raw?.origenVinculacion, raw?.['Origen de vinculación']),
    actoAdministrativoVinculacion: firstNonEmpty(raw?.actoAdministrativoVinculacion, raw?.actoAdministrativo, raw?.['Acto Administrativo de Vinculación'], raw?.['Acto Administrativo de Vinculación ']),
    correoInstitucional: extractFirstEmail(firstNonEmpty(raw?.correoInstitucional, raw?.correo_institucional, raw?.['Correo Institucional'], raw?.['Correo\nInstitucional'], raw?.email)),
    correoAlternativo: extractFirstEmail(firstNonEmpty(raw?.correoAlternativo, raw?.correo_alternativo, raw?.correo_personal, raw?.correoPersonal, raw?.['Correo personal'])),
    telefono: firstNonEmpty(raw?.telefono, raw?.phone, raw?.['Telefono']),
    ultimaEvaluacion: firstNonEmpty(raw?.ultimaEvaluacion, raw?.['Última Evaluación']),
    situacionAdministrativa: firstNonEmpty(raw?.situacionAdministrativa, raw?.['Situación Administrativa']),
    fechaInicioVinculacion: parseMaybeDate(raw?.fechaInicioVinculacion ?? raw?.inicioVinculacion ?? raw?.['Inicio de Vinculación']),
    fechaFinVinculacion: parseMaybeDate(raw?.fechaFinVinculacion ?? raw?.finVinculacion ?? raw?.['Fin de Vinculación']),
    puntajeSalarial: parseMaybeFloat(raw?.puntajeSalarial ?? raw?.['Puntaje Salarial']),
    genero: firstNonEmpty(raw?.genero, raw?.['Género']),
    fechaNacimiento,
    edadReferencia: edad,
    rangoEdad: firstNonEmpty(raw?.rangoEdad, raw?.['Rango de edad'], computeRangoEdad(edad, null)),
    horasAsignables: getHorasAsignablesFromDedicacion(raw?.dedicacion ?? raw?.['Dedicación'], raw?.horasAsignables ?? raw?.horas_programables),
  };
}

function validatePayload(payload: ReturnType<typeof normalizeBancoDocentePayload>) {
  if (!payload.documentNumber) throw new BadRequestException('Cada docente debe incluir un número de documento.');
  if (!payload.fullName && !payload.primer_nombre && !payload.primer_apellido)
    throw new BadRequestException(`El docente ${payload.documentNumber} debe incluir nombre completo.`);
  if (!payload.correoInstitucional) throw new BadRequestException(`El docente ${payload.documentNumber} debe incluir correo institucional.`);
  if (!payload.territorialNombre) throw new BadRequestException(`El docente ${payload.documentNumber} debe incluir la territorial.`);
  if (!isSupportedTipoVinculacion(payload.vinculacionLabel || payload.tipoVinculacion))
    throw new BadRequestException(`La vinculación del docente ${payload.documentNumber} no es válida.`);
  if (!isSupportedDedicacion(payload.dedicacionLabel || payload.dedicacion))
    throw new BadRequestException(`La dedicación del docente ${payload.documentNumber} no es válida.`);
  if (payload.correoInstitucional && !EMAIL_REGEX.test(payload.correoInstitucional))
    throw new BadRequestException(`El correo institucional del docente ${payload.documentNumber} no tiene formato válido.`);
}

// ─── response builder ─────────────────────────────────────────────────────────

export function buildBancoDocenteResponse(docente: DocenteEntity & { persona?: PersonaEntity & { usuario?: UsuarioEntity } }) {
  const persona = docente.persona;
  const usuario = persona?.usuario;
  const fechaNacimiento = persona?.fecha_nacimiento || null;
  const edad = computeEdad(fechaNacimiento, docente.edadReferencia);
  const rangoEdad = computeRangoEdad(edad, docente.rangoEdad);
  const nombreCompleto = [persona?.primer_nombre, persona?.segundo_nombre, persona?.primer_apellido, persona?.segundo_apellido].filter(Boolean).join(' ').trim() || usuario?.nombre || 'Sin nombre';

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
    dedicacion: getDedicacionLabel(docente.dedicacion, docente.dedicacionDisplay),
    dedicacion_codigo: docente.dedicacion,
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
    correo_personal: persona?.correo_alternativo ?? null,
    telefono: persona?.telefono ?? null,
    ultima_evaluacion: docente.ultimaEvaluacion ?? null,
    situacion_administrativa: docente.situacionAdministrativa ?? null,
    inicio_vinculacion: docente.fechaInicioVinculacion ?? null,
    fin_vinculacion: docente.fechaFinVinculacion ?? persona?.fecha_fin_contrato ?? null,
    puntaje_salarial: docente.puntajeSalarial ?? null,
    genero: persona?.genero ?? null,
    nacimiento: fechaNacimiento,
    edad,
    rango_edad: rangoEdad,
    horas_programables: docente.horasAsignables ?? 0,
    estado: docente.estado,
    email: usuario?.email ?? null,
    activo: usuario?.activo ?? true,
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
    dedicacion: dedicacionCodigo ? getDedicacionLabel(dedicacionCodigo, row.dedicacion) : null,
    dedicacion_codigo: dedicacionCodigo,
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
    inicio_vinculacion: row.inicio_vinculacion ?? null,
    fin_vinculacion: row.fin_vinculacion ?? null,
    puntaje_salarial: row.puntaje_salarial ?? null,
    genero: row.genero ?? null,
    nacimiento: fechaNacimiento,
    edad,
    rango_edad: rangoEdad,
    horas_programables: row.horas_programables ?? 0,
    estado: row.activo ? 'ACTIVO' : 'INACTIVO',
    email,
    activo: row.activo,
    roles: row.roles || ['DOCENTE'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── service ──────────────────────────────────────────────────────────────────

@Injectable()
export class BancoDocentesService {
  private readonly logger = new Logger(BancoDocentesService.name);

  constructor(
    @InjectRepository(DocenteEntity)
    private readonly docenteRepo: Repository<DocenteEntity>,
    @InjectRepository(PersonaEntity)
    private readonly personaRepo: Repository<PersonaEntity>,
    @InjectRepository(UsuarioEntity)
    private readonly usuarioRepo: Repository<UsuarioEntity>,
    private readonly dataSource: DataSource,
  ) {}

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
      `Contraseña temporal: ${password}`,
      '',
      'Por seguridad, cambia tu contraseña en el primer ingreso.',
    ].join('\n');
    const html = `
      <p>Hola ${fullName},</p>
      <p>Tu usuario docente fue creado en la plataforma ESAP.</p>
      <p><strong>Usuario:</strong> ${username}<br><strong>Contraseña temporal:</strong> ${password}</p>
      <p>Por seguridad, cambia tu contraseña en el primer ingreso.</p>
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

  private buildAuthDocentesFilters(filters: { territorial?: string; dedicacion?: string; estado?: string; search?: string }, params: any[]) {
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
      )`);
    }

    return conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  }

  async list(filters: { territorial?: string; dedicacion?: string; estado?: string; search?: string; page?: number; limit?: number }) {
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

  async upsertDocente(rawPayload: any, options: { rejectExisting?: boolean } = {}) {
    const payload = normalizeBancoDocentePayload(rawPayload);
    validatePayload(payload);

    const territoriales = await this.getTerritoriales();
    const territorial = territoriales.find((t) => normalizeLookupText(t.nombre) === normalizeLookupText(payload.territorialNombre)) || findTerritorialMatch(territoriales, payload.territorialNombre);
    if (!territorial?.id) throw new BadRequestException(`La territorial "${payload.territorialNombre}" no existe en el catálogo.`);

    const result = await this.dataSource.transaction(async (manager) => {
      const emailFinal = payload.correoInstitucional!.toLowerCase().trim();
      const finalFullName = payload.fullName || [payload.primer_nombre, payload.segundo_nombre, payload.primer_apellido, payload.segundo_apellido].filter(Boolean).join(' ').trim();
      if (!finalFullName) throw new BadRequestException(`No se pudo construir el nombre del docente ${payload.documentNumber}.`);

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
        throw new BadRequestException(`El correo ${emailFinal} ya está en uso por otra persona o usuario.`);
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

      const docenteData: Partial<DocenteEntity> = {
        personaId: authPersonId,
        territorialId: territorial.id,
        sedeId: existingDocente?.sedeId || null,
        tipoVinculacion: payload.tipoVinculacion,
        dedicacion: payload.dedicacion,
        escalafon: payload.escalafon ?? existingDocente?.escalafon ?? null,
        horasAsignables: payload.horasAsignables,
        estado: 'ACTIVO',
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
      };

      let docente: DocenteEntity;
      const action = existingDocente ? 'update' : 'insert';
      if (!existingDocente) {
        docente = await manager.save(DocenteEntity, manager.create(DocenteEntity, docenteData));
      } else {
        docente = await manager.save(DocenteEntity, { ...existingDocente, ...docenteData });
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
        message: action === 'insert' ? 'Docente creado correctamente.' : 'Docente actualizado correctamente.',
      };
    });

    if (result.authUserCreated) {
      const welcomeEmail = await this.sendWelcomeEmail(result.email, result.email, result.documentNumber, result.fullName);
      return { ...result, welcomeEmail };
    }

    return result;
  }

  async bulkUpsert(rows: any[], options: { rejectExisting?: boolean } = {}) {
    const results: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = { ...rows[i], __sourceRowNumber: i + 2 };
      try {
        const result = await this.upsertDocente(row, options);
        results.push(result);
      } catch (err: any) {
        errors.push({ row: i + 2, message: err.message || 'Error desconocido', data: row });
      }
    }

    return {
      total: rows.length,
      created: results.filter((r) => r.action === 'insert').length,
      updated: results.filter((r) => r.action === 'update').length,
      errors: errors.length,
      results,
      errorDetails: errors,
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

  async getStats() {
    const baseSql = this.authDocentesBaseSql();
    const [summary] = await this.dataSource.query(`
      ${baseSql}
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE activo = true)::int AS activos
      FROM auth_docentes
    `);

    const porDedicacion = await this.dataSource.query(`
      ${baseSql}
      SELECT
        COALESCE(dedicacion_codigo, 'SIN_DEDICACION') AS dedicacion,
        COUNT(*)::int AS total
      FROM auth_docentes
      GROUP BY COALESCE(dedicacion_codigo, 'SIN_DEDICACION')
      ORDER BY total DESC
    `);

    const porTerritorial = await this.dataSource.query(`
      ${baseSql}
      SELECT
        COALESCE(territorial, auth_territorial, 'Sin territorial') AS territorial,
        COUNT(*)::int AS total
      FROM auth_docentes
      GROUP BY COALESCE(territorial, auth_territorial, 'Sin territorial')
      ORDER BY total DESC
    `);

    const total = Number(summary?.total || 0);
    const activos = Number(summary?.activos || 0);
    return { total, activos, inactivos: total - activos, por_dedicacion: porDedicacion, por_territorial: porTerritorial };
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

      // ¿Ya existe en banco de docentes?
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
}
