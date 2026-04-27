import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Like, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { DocenteEntity } from '../entities/docente.entity';
import { PersonaEntity } from '../entities/persona.entity';
import { UsuarioEntity } from '../entities/usuario.entity';
import { TerritorialEntity } from '../entities/territorial.entity';
import { SedeEntity } from '../entities/sede.entity';
import { sanitizeText } from '../utils/text-sanitizer';
import { OFFICIAL_TERRITORIALES_ESAP } from '../catalogos/territoriales-cetaps-esap';

const DEFAULT_PASSWORD = 'changeme123';
const DEFAULT_EMAIL_DOMAIN = 'esap.local';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

let cachedPasswordHash: string | null = null;

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

function findTerritorialMatch(territoriales: TerritorialEntity[], rawValue: any): TerritorialEntity | null {
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

export function resolveTerritorial(territoriales: TerritorialEntity[], rawValue: any): TerritorialEntity | null {
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
    documentNumber: firstNonEmpty(raw?.documentNumber, raw?.identificacion, raw?.document, raw?.documento, raw?.['Documento de identidad']),
    documentType: firstNonEmpty(raw?.tipo_identificacion, raw?.documentType, raw?.tipoDocumento, 'CC'),
    fullName,
    primer_nombre: firstNonEmpty(raw?.primer_nombre, raw?.primerNombre, splitName.primer_nombre),
    segundo_nombre: firstNonEmpty(raw?.segundo_nombre, raw?.segundoNombre, splitName.segundo_nombre),
    primer_apellido: firstNonEmpty(raw?.primer_apellido, raw?.primerApellido, splitName.primer_apellido),
    segundo_apellido: firstNonEmpty(raw?.segundo_apellido, raw?.segundoApellido, splitName.segundo_apellido),
    territorialNombre: firstNonEmpty(raw?.territorialNombre, raw?.territorial, raw?.['Territorial']),
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
    correoInstitucional: extractFirstEmail(firstNonEmpty(raw?.correoInstitucional, raw?.['Correo Institucional'], raw?.['Correo\nInstitucional'], raw?.email)),
    correoAlternativo: extractFirstEmail(firstNonEmpty(raw?.correoAlternativo, raw?.correo_alternativo, raw?.correoPersonal, raw?.['Correo personal'])),
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

// ─── service ──────────────────────────────────────────────────────────────────

@Injectable()
export class BancoDocentesService {
  constructor(
    @InjectRepository(DocenteEntity)
    private readonly docenteRepo: Repository<DocenteEntity>,
    @InjectRepository(PersonaEntity)
    private readonly personaRepo: Repository<PersonaEntity>,
    @InjectRepository(UsuarioEntity)
    private readonly usuarioRepo: Repository<UsuarioEntity>,
    @InjectRepository(TerritorialEntity)
    private readonly territorialRepo: Repository<TerritorialEntity>,
    @InjectRepository(SedeEntity)
    private readonly sedeRepo: Repository<SedeEntity>,
    private readonly dataSource: DataSource,
  ) {}

  private async getTerritoriales(): Promise<TerritorialEntity[]> {
    return this.territorialRepo.find({ order: { nombre: 'ASC' } });
  }

  private async getDefaultPasswordHash(): Promise<string> {
    if (!cachedPasswordHash) {
      cachedPasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    }
    return cachedPasswordHash;
  }

  private async ensureUniqueEmail(baseEmail: string, documentNumber: string, currentUserId?: string): Promise<string> {
    let email = baseEmail.toLowerCase();
    let suffix = 1;
    while (true) {
      const existing = await this.usuarioRepo.findOne({ where: { email } });
      if (!existing || existing.id === currentUserId) return email;
      const [local, domain = DEFAULT_EMAIL_DOMAIN] = baseEmail.toLowerCase().split('@');
      email = `${local}.${documentNumber}.${suffix}@${domain}`;
      suffix++;
    }
  }

  async list(filters: { territorial?: string; dedicacion?: string; estado?: string; search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(200, Math.max(1, filters.limit || 50));
    const skip = (page - 1) * limit;

    const qb = this.docenteRepo.createQueryBuilder('d')
      .leftJoinAndSelect('d.persona', 'p')
      .leftJoinAndSelect('p.usuario', 'u')
      .leftJoinAndSelect('d.territorial', 't')
      .leftJoinAndSelect('d.sede', 's')
      .orderBy('d.ordenListado', 'ASC', 'NULLS LAST')
      .addOrderBy('p.primer_apellido', 'ASC');

    if (filters.territorial) qb.andWhere('d.territorialId = :tid', { tid: filters.territorial });
    if (filters.dedicacion) qb.andWhere('d.dedicacion = :ded', { ded: filters.dedicacion });
    if (filters.estado) qb.andWhere('d.estado = :est', { est: filters.estado });
    if (filters.search) {
      qb.andWhere('(p.identificacion ILIKE :q OR p.primer_nombre ILIKE :q OR p.primer_apellido ILIKE :q OR u.nombre ILIKE :q)', { q: `%${filters.search}%` });
    }

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return { data: items.map(buildBancoDocenteResponse), total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getById(id: string) {
    const d = await this.docenteRepo.findOne({
      where: { id },
      relations: ['persona', 'persona.usuario', 'territorial', 'sede'],
    });
    if (!d) throw new NotFoundException(`Docente ${id} no encontrado`);
    return buildBancoDocenteResponse(d as any);
  }

  async upsertDocente(rawPayload: any, options: { rejectExisting?: boolean } = {}) {
    const payload = normalizeBancoDocentePayload(rawPayload);
    validatePayload(payload);

    const territoriales = await this.getTerritoriales();
    const territorial = territoriales.find((t) => normalizeLookupText(t.nombre) === normalizeLookupText(payload.territorialNombre)) || findTerritorialMatch(territoriales, payload.territorialNombre);
    if (!territorial?.id) throw new BadRequestException(`La territorial "${payload.territorialNombre}" no existe en el catálogo.`);

    return this.dataSource.transaction(async (manager) => {
      const existingPersona = await manager.findOne(PersonaEntity, {
        where: { identificacion: payload.documentNumber! },
        relations: ['usuario'],
      });
      const existingDocente = existingPersona ? await manager.findOne(DocenteEntity, { where: { personaId: existingPersona.id } }) : null;

      if (existingDocente && options.rejectExisting) {
        throw new BadRequestException(`El documento ${payload.documentNumber} ya existe en el Banco de Docentes.`);
      }

      const finalFullName = payload.fullName || [payload.primer_nombre, payload.segundo_nombre, payload.primer_apellido, payload.segundo_apellido].filter(Boolean).join(' ').trim();
      if (!finalFullName) throw new BadRequestException(`No se pudo construir el nombre del docente ${payload.documentNumber}.`);

      if (payload.correoInstitucional) {
        const ownerUser = await manager.findOne(UsuarioEntity, { where: { email: payload.correoInstitucional.toLowerCase() } });
        if (ownerUser && ownerUser.id !== existingPersona?.usuarioId) {
          throw new BadRequestException(`El correo ${payload.correoInstitucional} ya está en uso por otro usuario.`);
        }
      }

      const emailBase = payload.correoInstitucional || existingPersona?.usuario?.email || `docente.${payload.documentNumber}@${DEFAULT_EMAIL_DOMAIN}`;
      const emailFinal = await this.ensureUniqueEmail(emailBase, payload.documentNumber!, existingPersona?.usuarioId);

      let usuario: UsuarioEntity;
      if (!existingPersona?.usuario) {
        usuario = manager.create(UsuarioEntity, {
          email: emailFinal,
          nombre: finalFullName,
          password: await this.getDefaultPasswordHash(),
          activo: true,
        });
        usuario = await manager.save(UsuarioEntity, usuario);
      } else {
        usuario = await manager.save(UsuarioEntity, { ...existingPersona.usuario, email: emailFinal, nombre: finalFullName, activo: true });
      }

      const personaData: Partial<PersonaEntity> = {
        usuarioId: usuario.id,
        primer_nombre: payload.primer_nombre ?? existingPersona?.primer_nombre ?? null,
        segundo_nombre: payload.segundo_nombre ?? existingPersona?.segundo_nombre ?? null,
        primer_apellido: payload.primer_apellido ?? existingPersona?.primer_apellido ?? null,
        segundo_apellido: payload.segundo_apellido ?? existingPersona?.segundo_apellido ?? null,
        identificacion: payload.documentNumber!,
        tipo_identificacion: payload.documentType || existingPersona?.tipo_identificacion || 'CC',
        genero: payload.genero ?? existingPersona?.genero ?? null,
        fecha_nacimiento: payload.fechaNacimiento ?? existingPersona?.fecha_nacimiento ?? null,
        telefono: payload.telefono ?? existingPersona?.telefono ?? null,
        correo_alternativo: payload.correoAlternativo ?? existingPersona?.correo_alternativo ?? null,
        direccion: territorial.nombre,
        tipo_usuario: 'Docente',
        fecha_fin_contrato: payload.fechaFinVinculacion ?? (existingPersona as any)?.fecha_fin_contrato ?? null,
      };

      let persona: PersonaEntity;
      if (!existingPersona) {
        persona = await manager.save(PersonaEntity, manager.create(PersonaEntity, personaData));
      } else {
        persona = await manager.save(PersonaEntity, { ...existingPersona, ...personaData });
      }

      const docenteData: Partial<DocenteEntity> = {
        personaId: persona.id,
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
        correoInstitucional: payload.correoInstitucional ?? existingDocente?.correoInstitucional ?? usuario.email ?? null,
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
        personaId: persona.id,
        docenteId: docente.id,
        usuarioId: usuario.id,
        documentNumber: payload.documentNumber,
        fullName: finalFullName,
        email: emailFinal,
        territorialNombre: territorial.nombre,
        message: action === 'insert' ? 'Docente creado correctamente.' : 'Docente actualizado correctamente.',
      };
    });
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
    const d = await this.docenteRepo.findOne({ where: { id } });
    if (!d) throw new NotFoundException(`Docente ${id} no encontrado`);
    d.estado = d.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    await this.docenteRepo.save(d);
    return { id, estado: d.estado };
  }

  async updateDocente(id: string, body: any) {
    const d = await this.docenteRepo.findOne({ where: { id }, relations: ['persona', 'persona.usuario', 'territorial', 'sede'] });
    if (!d) throw new NotFoundException(`Docente ${id} no encontrado`);
    const result = await this.upsertDocente({ ...body, documentNumber: body.documentNumber || d.persona?.identificacion }, {});
    return result;
  }

  async getStats() {
    const total = await this.docenteRepo.count();
    const activos = await this.docenteRepo.count({ where: { estado: 'ACTIVO' } });
    const porDedicacion = await this.docenteRepo.createQueryBuilder('d')
      .select('d.dedicacion', 'dedicacion')
      .addSelect('COUNT(*)', 'total')
      .groupBy('d.dedicacion')
      .getRawMany();
    const porTerritorial = await this.docenteRepo.createQueryBuilder('d')
      .leftJoin('d.territorial', 't')
      .select('t.nombre', 'territorial')
      .addSelect('COUNT(*)', 'total')
      .groupBy('t.nombre')
      .orderBy('total', 'DESC')
      .getRawMany();
    return { total, activos, inactivos: total - activos, por_dedicacion: porDedicacion, por_territorial: porTerritorial };
  }

  async syncToAuthService(authServiceUrl: string) {
    const docentes = await this.docenteRepo.find({
      relations: ['persona', 'persona.usuario'],
    });

    let created = 0;
    let skipped = 0;
    let failed = 0;
    const errors: { email: string; error: string }[] = [];

    for (const docente of docentes) {
      const persona = docente.persona;
      const usuario = persona?.usuario;
      if (!usuario?.email) { skipped++; continue; }

      const firstName = persona?.primer_nombre || usuario.nombre?.split(' ')[0] || 'Docente';
      const lastName = persona?.primer_apellido || usuario.nombre?.split(' ').slice(1).join(' ') || 'ESAP';
      const documentNumber = persona?.identificacion || docente.id;
      const email = usuario.email.toLowerCase().trim();

      try {
        const res = await fetch(`${authServiceUrl}/new-person`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName,
            lastName,
            documentNumber,
            email,
            username: email,
            password: 'changeme123',
            roles: ['USER'],
          }),
        });

        if (res.ok) {
          created++;
        } else {
          const body = await res.json().catch(() => ({}));
          const msg = (body as any)?.message || res.statusText;
          // 409 = ya existe — no es un error, es idempotente
          if (res.status === 409 || String(msg).includes('ya existe') || String(msg).includes('already')) {
            skipped++;
          } else {
            failed++;
            errors.push({ email, error: msg });
          }
        }
      } catch (err: any) {
        failed++;
        errors.push({ email, error: err?.message || 'fetch error' });
      }
    }

    return { total: docentes.length, created, skipped, failed, errors: errors.slice(0, 20) };
  }
}
