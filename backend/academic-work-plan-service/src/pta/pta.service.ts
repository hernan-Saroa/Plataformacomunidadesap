import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PlanTrabajoAcademicoEntity } from './entities/plan-trabajo-academico.entity';
import { HistorialEstadoPtaEntity } from './entities/historial-estado-pta.entity';
import { PtaEvidenciaEntity } from './entities/pta-evidencia.entity';
import { SolicitudPtaEntity } from './entities/solicitud-pta.entity';
import { PtaConfiguracionEntity } from './entities/pta-configuracion.entity';
import { PtaUserDataEntity } from './entities/pta-user-data.entity';
import { ProgramaEntity } from './entities/programa.entity';
import { AsignaturaEntity } from './entities/asignatura.entity';
import { TerritorialEntity } from './entities/territorial.entity';
import { SedeEntity } from './entities/sede.entity';
import { DocenteEntity } from './entities/docente.entity';
import { PersonaEntity } from './entities/persona.entity';
import { UsuarioEntity } from './entities/usuario.entity';
import { AprobacionJefaturaEntity } from './entities/aprobacion-jefatura.entity';
import { PtaEventoEntity } from './entities/pta-evento.entity';
import { PtaComponentApprovalEntity } from './entities/pta-component-approval.entity';
import type { PtaAuthenticatedUser } from './auth/pta-auth.guard';
import { COMPONENT_PERMISSION } from './auth/pta-permissions.constants';
import { PtaNotificationsService } from './notifications/pta-notifications.service';

type SavePtaInput = Record<string, any>;

function coalesceString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function coalesceLookupKey(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (typeof value === 'bigint') return value.toString();
  }
  return null;
}

function normalizeEstadoFilter(value: unknown): string {
  const raw = coalesceString(value);
  return raw
    ? raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase().replace(/\s+/g, '_')
    : '';
}

function getGroupedPtaEstados(value: unknown): string[] | null {
  const key = normalizeEstadoFilter(value);
  if (!key) return null;

  if (key === 'BORRADOR' || key === 'BORRADORES') {
    return ['Borrador', 'BORRADOR'];
  }

  if (key === 'PENDIENTES' || key === 'APROBACION') {
    return [
      'Pendiente Jefatura',
      'Pendiente Decanatura',
      'Pendiente Gesti\u00f3n Profesoral',
      'PENDIENTE_JEFATURA',
      'PENDIENTE_DECANATURA',
      'PENDIENTE_GESTION_PROFESORAL',
      'PENDIENTE_APROBACION',
      'CONCERTADO',
    ];
  }

  if (key === 'CONCERTACION') {
    return [
      'EN_CONCERTACION',
      'OBJETADO_DOCENTE',
      'MODIFICADO_DOCENTE',
      'DEVUELTO',
      'Devuelto',
      'PROPUESTO_POR_DIRECCION',
      'NOTIFICADO_DOCENTE',
    ];
  }

  if (key === 'SNA') return ['ESCALADO_SNA', 'Escalado SNA'];
  if (key === 'APROBADO' || key === 'APROBADOS') return ['Aprobado', 'APROBADO'];
  if (key === 'SEGUIMIENTO') return ['En Firme', 'EN_FIRME', 'RADICADO', 'EN_EJECUCION', 'EN_EJECUCI\u00d3N'];

  return null;
}

const ROLE_APPROVALS = [
  { nivel: 1, key: 'role_jefatura', label: 'Jefatura', revision: 'REVISION_DOCENTE_N1' },
  { nivel: 2, key: 'role_decanatura', label: 'Decanatura', revision: 'REVISION_DOCENTE_N2' },
  { nivel: 3, key: 'role_gestion_profesoral', label: 'Gestión Profesoral', revision: 'REVISION_DOCENTE_N3' },
];

const ROLE_APPROVAL_KEYS = new Set(ROLE_APPROVALS.map(item => item.key));
const PENDING_ROLE_APPROVAL_STATES = new Set([
  'PENDIENTE_APROBACION',
  'PENDIENTE_JEFATURA',
  'PENDIENTE_DECANATURA',
  'PENDIENTE_GESTION_PROFESORAL',
]);

const COMPONENT_APPROVAL_KEYS = [
  'academica',
  'investigacion',
  'ext_capacitacion',
  'ext_procesos',
  'ext_fortalecimiento',
  'ext_gobierno',
  'complementarias',
];

// AADM se fusionó dentro de 'complementarias' (sección academico_administrativas).
// Se conserva la clave legacy solo para poder limpiar filas viejas de aprobación.
const LEGACY_COMPONENT_APPROVAL_KEYS = ['academicas_admin'];

// Secciones fijas de Complementarias (espejo de ConfiguracionReglasPTA.tsx FIXED_COMP_SECCIONES).
// Se usan como default del catálogo agrupado cuando la config no trae comp_secciones.
const FIXED_COMP_SECCIONES = [
  { key: 'complementarias_docencia', label: 'ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA', color: '#D97706', orden: 1, multiplicador: 1, columnas: ['_items_'] },
  { key: 'academico_administrativas', label: 'ACTIVIDADES ACADÉMICO-ADMINISTRATIVAS', color: '#2563EB', orden: 2, multiplicador: 1, columnas: ['_items_'] },
];

const COMPONENT_APPROVAL_KEY_SET = new Set(COMPONENT_APPROVAL_KEYS);

const EXTENSION_COMPONENT_BY_SECTION: Record<string, string> = {
  capacitacion: 'ext_capacitacion',
  seleccion: 'ext_procesos',
  fortalecimiento: 'ext_fortalecimiento',
  alto_gobierno: 'ext_gobierno',
  laboratorio_innovacion: 'ext_fortalecimiento',
  investigacion_aplicada: 'ext_fortalecimiento',
};

const COMPONENT_REVISION_STATE: Record<string, string> = {
  academica: 'REVISION_DOCENTE_N1',
  complementarias: 'REVISION_DOCENTE_N1',
  investigacion: 'REVISION_DOCENTE_N2',
  ext_capacitacion: 'REVISION_DOCENTE_N2',
  ext_procesos: 'REVISION_DOCENTE_N2',
  ext_fortalecimiento: 'REVISION_DOCENTE_N2',
  ext_gobierno: 'REVISION_DOCENTE_N2',
};

type ExtensionCatalogActivity = {
  id: string;
  nombre: string;
  items?: Array<{ nombre: string; tipo?: string; horas: number; min?: number }>;
  max_horas?: number;
  min_horas?: number;
};

const FIXED_EXTENSION_SECTIONS = [
  { key: 'capacitacion', label: '3.1.1. Dirección de Capacitación', color: '#059669', orden: 1, multiplicador: 2 },
  { key: 'seleccion', label: '3.1.2. Dirección de Procesos de Selección', color: '#0284C7', orden: 2, multiplicador: 1 },
  { key: 'fortalecimiento', label: '3.1.3. Dirección de Fortalecimiento y Apoyo a la Gestión Estatal', color: '#7C3AED', orden: 3, multiplicador: 1 },
  { key: 'alto_gobierno', label: '3.2. Escuela de Alto Gobierno', color: '#B45309', orden: 4, multiplicador: 1 },
];

const EXTENSION_SECTION_ALIASES: Record<string, string> = {
  laboratorio_innovacion: 'fortalecimiento',
  investigacion_aplicada: 'fortalecimiento',
};

function normalizeExtensionSectionKey(section: unknown): string {
  const key = String(section || '');
  if (FIXED_EXTENSION_SECTIONS.some(s => s.key === key)) return key;
  return EXTENSION_SECTION_ALIASES[key] || 'fortalecimiento';
}

function normalizeExtensionSections(raw: any): any[] {
  const savedByKey = new Map<string, any>();
  if (Array.isArray(raw)) {
    for (const section of raw) {
      const key = normalizeExtensionSectionKey(section?.key);
      if (!savedByKey.has(key)) savedByKey.set(key, section);
    }
  }

  return FIXED_EXTENSION_SECTIONS.map(section => {
    const previous = savedByKey.get(section.key);
    const savedMult = Number(previous?.multiplicador);
    return {
      ...section,
      color: previous?.color || section.color,
      columnas: Array.isArray(previous?.columnas) ? previous.columnas : (section as any).columnas,
      // El multiplicador (×Factor) es configurable por el admin y debe persistir en guardado/lectura.
      multiplicador: Number.isFinite(savedMult) && savedMult > 0 ? savedMult : section.multiplicador,
    };
  });
}

function canonicalizeExtensionActivities(raw: any): Record<string, any[]> {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const result: Record<string, any[]> = {};

  for (const [sectionKey, value] of Object.entries(source)) {
    if (!Array.isArray(value)) continue;
    const targetKey = normalizeExtensionSectionKey(sectionKey);
    result[targetKey] = [
      ...(result[targetKey] || []),
      ...value.map((act: any) => ({ ...act })),
    ];
  }

  return result;
}

const EXTENSION_ACTIVITY_COMPLETIONS: Record<string, ExtensionCatalogActivity[]> = {
  laboratorio_innovacion: [
    { id: 'LAB_01', nombre: 'Componente Fijo — Espacios de participación y representación', max_horas: 100, items: [{ nombre: 'Participación, representación y apoyo al Laboratorio', tipo: 'hasta', horas: 100 }] },
    { id: 'LAB_02', nombre: 'Componente Fijo — Aspectos administrativos y gestión', max_horas: 120, items: [{ nombre: 'Coordinación, planeación, seguimiento y control del Laboratorio', tipo: 'hasta', horas: 120 }] },
    { id: 'LAB_03', nombre: 'Componente Variable — Elaborar documentos técnicos en el marco de las iniciativas', max_horas: 80, items: [{ nombre: 'Documento técnico académico elaborado', tipo: 'hasta', horas: 80 }] },
    { id: 'LAB_04', nombre: 'Componente Variable — Preparar y compilar documentos técnicos para publicación', max_horas: 40, items: [{ nombre: 'Documento técnico preparado o compilado', tipo: 'hasta', horas: 40 }] },
    { id: 'LAB_05', nombre: 'Componente Variable — Elaborar documentos soporte de ejecución de iniciativas', max_horas: 80, items: [{ nombre: 'Documento soporte de ejecución', tipo: 'hasta', horas: 80 }] },
    { id: 'LAB_06', nombre: 'Componente Variable — Diseñar, ejecutar y/o liderar iniciativas innovadoras', max_horas: 120, items: [{ nombre: 'Informe académico de ejecución de la iniciativa', tipo: 'hasta', horas: 120 }] },
    { id: 'LAB_07', nombre: 'Componente Variable — Ejecutar trabajo de campo', max_horas: 40, items: [{ nombre: 'Informe ejecutivo del trabajo de campo', tipo: 'hasta', horas: 40 }] },
    { id: 'LAB_08', nombre: 'Componente Variable — Acompañamiento en planeación de eventos', max_horas: 20, items: [{ nombre: 'Acompañamiento y planeación de eventos', tipo: 'hasta', horas: 20 }] },
    { id: 'LAB_09', nombre: 'Componente Variable — Acompañamiento en trabajo de campo', max_horas: 40, items: [{ nombre: 'Acompañamiento y planeación del trabajo de campo', tipo: 'hasta', horas: 40 }] },
    { id: 'LAB_10', nombre: 'Componente Variable — Representar a la ESAP en espacios consultivos', max_horas: 20, items: [{ nombre: 'Representación institucional en espacios consultivos', tipo: 'hasta', horas: 20 }] },
    { id: 'LAB_11', nombre: 'Componente Variable — Charlas y conferencias (formación)', max_horas: 20, items: [{ nombre: 'Charlas, conferencias o paneles de formación', tipo: 'hasta', horas: 20 }] },
    { id: 'LAB_12', nombre: 'Componente Variable — Coordinar enlace de capacitación en temáticas del Lab.', max_horas: 60, items: [{ nombre: 'Coordinación y enlace de iniciativas de capacitación', tipo: 'hasta', horas: 60 }] },
    { id: 'LAB_13', nombre: 'Componente Variable — Diseño de estrategias de gestión social del conocimiento', max_horas: 60, items: [{ nombre: 'Documento de estrategia e informe de gestión', tipo: 'hasta', horas: 60 }] },
  ],
  investigacion_aplicada: [
    { id: 'INV_AP_01', nombre: 'Documentos técnicos (informe, análisis temático)', min_horas: 40, max_horas: 60, items: [{ nombre: 'Documento técnico', tipo: 'intervalo', min: 40, horas: 60 }] },
    { id: 'INV_AP_02', nombre: 'Plan de Trabajo de Investigación Aplicada', min_horas: 2, max_horas: 6, items: [{ nombre: 'Plan de trabajo', tipo: 'intervalo', min: 2, horas: 6 }] },
    { id: 'INV_AP_03', nombre: 'Productos de Generación de Nuevo Conocimiento (SNCTI)', min_horas: 40, max_horas: 60, items: [{ nombre: 'Producto de generación de nuevo conocimiento', tipo: 'intervalo', min: 40, horas: 60 }] },
    { id: 'INV_AP_04', nombre: 'Productos de Desarrollo Tecnológico e Innovación (SNCTI)', min_horas: 40, max_horas: 60, items: [{ nombre: 'Producto de desarrollo tecnológico e innovación', tipo: 'intervalo', min: 40, horas: 60 }] },
    { id: 'INV_AP_05', nombre: 'Productos de Apropiación Social del Conocimiento (SNCTI)', min_horas: 40, max_horas: 60, items: [{ nombre: 'Producto de apropiación social del conocimiento', tipo: 'intervalo', min: 40, horas: 60 }] },
    { id: 'INV_AP_06', nombre: 'Productos de Formación de Recurso Humano para CTeI (SNCTI)', min_horas: 40, max_horas: 60, items: [{ nombre: 'Producto de formación de recurso humano para CTeI', tipo: 'intervalo', min: 40, horas: 60 }] },
    { id: 'INV_AP_07', nombre: 'Asistencia a eventos académicos / representación Grupo Inv. Aplicada', max_horas: 8, items: [{ nombre: 'Asistencia o representación académica', tipo: 'hasta', horas: 8 }] },
    { id: 'INV_AP_08', nombre: 'Procesos de evaluación de desempeño y productos', max_horas: 4, items: [{ nombre: 'Evaluación de desempeño o productos generados', tipo: 'hasta', horas: 4 }] },
  ],
  alto_gobierno: [
    { id: 'EAG_01', nombre: 'Coaching directivo', min_horas: 80, max_horas: 200, items: [{ nombre: 'Coaching directivo', tipo: 'intervalo', min: 80, horas: 200 }] },
    { id: 'EAG_02', nombre: 'Formación estratégica a la alta gerencia', min_horas: 80, max_horas: 200, items: [{ nombre: 'Diseño y formación estratégica', tipo: 'intervalo', min: 80, horas: 200 }] },
    { id: 'EAG_03', nombre: 'Gestión del conocimiento', min_horas: 80, max_horas: 200, items: [{ nombre: 'Diseño y formación en gestión del conocimiento', tipo: 'intervalo', min: 80, horas: 200 }] },
    { id: 'EAG_04', nombre: 'Desarrollo de contenidos', min_horas: 40, max_horas: 120, items: [{ nombre: 'Diseño y desarrollo de contenidos', tipo: 'intervalo', min: 40, horas: 120 }] },
  ],
};

function isRoleApprovalComponent(componente?: string | null): boolean {
  return ROLE_APPROVAL_KEYS.has(String(componente || ''));
}

function componentKeyForExtensionSection(section: unknown): string {
  return EXTENSION_COMPONENT_BY_SECTION[normalizeExtensionSectionKey(section)] || 'ext_fortalecimiento';
}

function isPendingRoleApprovalState(estado?: string | null): boolean {
  return PENDING_ROLE_APPROVAL_STATES.has(normalizeEstadoFilter(estado));
}

function pendingApprovalState(estado?: string | null): string {
  return normalizeEstadoFilter(estado) === 'PENDIENTE_APROBACION'
    ? 'Pendiente Jefatura'
    : (coalesceString(estado) || 'Pendiente Jefatura');
}

function roleApprovalMetaByLevel(nivel: number) {
  return ROLE_APPROVALS.find(item => item.nivel === nivel);
}

function approvalLevelFromRole(role?: string | null): number {
  const key = normalizeEstadoFilter(role);
  if (key.includes('JEFATURA')) return 1;
  if (key.includes('DECAN')) return 2;
  if (key.includes('GESTION_PROFESORAL') || key.includes('GESTION_PROF') || key.includes('PROFESORAL')) return 3;
  return 0;
}

@Injectable()
export class PtaService {
  private readonly otpStore = new Map<string, { code: string; expiresAt: Date }>();
  private readonly logger = new Logger(PtaService.name);

  // Timestamp del último barrido de PTAs vencidos (para throttling del sweep perezoso).
  private lastPurgeAt = 0;

  // MOCK de firma OTP: mientras esté activo, cualquier código de 6 dígitos es válido
  // para avanzar (no se valida contra el código generado). Se desactiva con
  // PTA_MOCK_FIRMA_OTP=false. Por ahora viene mockeado por defecto para pruebas.
  private readonly MOCK_FIRMA_OTP = process.env.PTA_MOCK_FIRMA_OTP !== 'false';

  constructor(
    @InjectRepository(PlanTrabajoAcademicoEntity)
    private readonly ptaRepo: Repository<PlanTrabajoAcademicoEntity>,
    @InjectRepository(HistorialEstadoPtaEntity)
    private readonly historialRepo: Repository<HistorialEstadoPtaEntity>,
    @InjectRepository(PtaEvidenciaEntity)
    private readonly evidenciaRepo: Repository<PtaEvidenciaEntity>,
    @InjectRepository(SolicitudPtaEntity)
    private readonly solicitudRepo: Repository<SolicitudPtaEntity>,
    @InjectRepository(PtaConfiguracionEntity)
    private readonly configuracionRepo: Repository<PtaConfiguracionEntity>,
    @InjectRepository(PtaUserDataEntity)
    private readonly userDataRepo: Repository<PtaUserDataEntity>,
    @InjectRepository(ProgramaEntity)
    private readonly programaRepo: Repository<ProgramaEntity>,
    @InjectRepository(AsignaturaEntity)
    private readonly asignaturaRepo: Repository<AsignaturaEntity>,
    @InjectRepository(TerritorialEntity)
    private readonly territorialRepo: Repository<TerritorialEntity>,
    @InjectRepository(SedeEntity)
    private readonly sedeRepo: Repository<SedeEntity>,
    @InjectRepository(DocenteEntity)
    private readonly docenteRepo: Repository<DocenteEntity>,
    @InjectRepository(AprobacionJefaturaEntity)
    private readonly aprobacionJefaturaRepo: Repository<AprobacionJefaturaEntity>,
    @InjectRepository(PtaEventoEntity)
    private readonly eventoRepo: Repository<PtaEventoEntity>,
    @InjectRepository(PtaComponentApprovalEntity)
    private readonly ptaComponentApprovalRepo: Repository<PtaComponentApprovalEntity>,
    private readonly ptaNotifications: PtaNotificationsService,
  ) {}

  private safeUsuario(usuario: any) {
    if (!usuario || typeof usuario !== 'object') return null;
    const { password: _pw, ...rest } = usuario as any;
    return rest;
  }

  private readonly columnCache = new Map<string, boolean>();

  private async hasColumn(schema: string, table: string, column: string): Promise<boolean> {
    const cacheKey = `${schema}.${table}.${column}`;
    const cached = this.columnCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const rows = await this.ptaRepo.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_schema = $1
         AND table_name = $2
         AND column_name = $3
       LIMIT 1`,
      [schema, table, column],
    );
    const exists = Array.isArray(rows) && rows.length > 0;
    this.columnCache.set(cacheKey, exists);
    return exists;
  }

  private async fetchAuthDocenteInfo(docenteKey: string, options?: { adminEdit?: boolean }): Promise<{ personId: string, email: string | null, fullName: string }> {
    const key = coalesceString(docenteKey);
    if (!key) throw new BadRequestException('docente_id es requerido');

    const [personasHasIdPerson, personasHasIdTercero, userHasIdPerson, userHasIdTercero] = await Promise.all([
      this.hasColumn('auth', 'personas', 'id_person'),
      this.hasColumn('auth', 'personas', 'id_tercero'),
      this.hasColumn('auth', 'user', 'id_person'),
      this.hasColumn('auth', 'user', 'id_tercero'),
    ]);

    let joinUserPersonas: string;
    if (personasHasIdPerson && userHasIdPerson) {
      joinUserPersonas = `u.id_person = p.id_person`;
    } else if (personasHasIdTercero && userHasIdTercero) {
      joinUserPersonas = `u.id_tercero = p.id_tercero`;
    } else {
      throw new BadRequestException(
        'No se pudo resolver el esquema auth: faltan columnas para relacionar auth."user" con auth.personas.',
      );
    }

    const keyPredicates = [
      personasHasIdPerson ? `p.id_person::text = $1` : null,
      personasHasIdTercero ? `p.id_tercero::text = $1` : null,
      `u.id_user::text = $1`,
    ].filter(Boolean);

    const roleFilter = options?.adminEdit
      ? ''
      : `JOIN auth.user_roles ur ON ur.id_user = u.id_user AND COALESCE(ur.is_active, true) = true
      JOIN auth.role r ON r.id = ur.id_rol AND COALESCE(r.is_active, true) = true
        AND (UPPER(COALESCE(r.code, '')) = 'DOCENTE' OR UPPER(COALESCE(r.name, '')) = 'DOCENTE')`;

    const sql = `
      SELECT
        ${personasHasIdPerson ? 'p.id_person::text' : 'NULL'} as person_id,
        ${personasHasIdTercero ? 'p.id_tercero::text' : 'NULL'} as tercero_id,
        p.dir_email as email,
        p.nom_largo as nom_largo,
        p.nom_tercero as primer_nombre,
        NULL as segundo_nombre,
        p.pri_apellido as primer_apellido,
        p.seg_apellido as segundo_apellido
      FROM auth.personas p
      JOIN auth."user" u ON ${joinUserPersonas}
      ${roleFilter}
      WHERE (${keyPredicates.join(' OR ')})
      LIMIT 1
    `;

    const rows = await this.ptaRepo.query(sql, [key]);
    const authRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!authRow) {
      if (options?.adminEdit) {
        // No está en auth.personas pero es una edición admin: usar el key directamente
        // para que resolveDocenteCompleto lo busque en academic_work_plan."Docente"
        return { personId: key, email: null, fullName: 'Docente ESAP' };
      }
      throw new BadRequestException('La persona no tiene el rol DOCENTE (auth.role.code) o no existe en auth.personas.');
    }

    const personId = coalesceString(authRow.person_id, authRow.tercero_id) || key;
    const email = coalesceString(authRow.email);
    // Preferir nom_largo (nombre completo) sobre la concatenación de campos parciales
    const fullNameFromParts = [
      authRow.primer_nombre,
      authRow.segundo_nombre,
      authRow.primer_apellido,
      authRow.segundo_apellido,
    ].filter(Boolean).join(' ');
    const fullName = coalesceString(authRow.nom_largo, fullNameFromParts) || 'Docente ESAP';

    return { personId, email, fullName };
  }

  private async resolveDocenteCompleto(docenteKey: string, options?: { fallbackTerritorial?: string; adminEdit?: boolean }): Promise<{ personId: string, email: string | null, fullName: string }> {
    const { personId, email, fullName } = await this.fetchAuthDocenteInfo(docenteKey, { adminEdit: options?.adminEdit });

    // Mapear a academic_work_plan."Docente" (para mantener compatibilidad con FK de PTA).
    const byId = await this.docenteRepo.findOne({ where: { id: personId } as any });
    if (byId) return { personId: byId.id, email, fullName };

    const byPersonaId = await this.docenteRepo.findOne({ where: { personaId: personId } as any });
    if (byPersonaId) return { personId: byPersonaId.id, email, fullName };

    if (email) {
      const byCorreo = await this.docenteRepo.findOne({ where: { correoInstitucional: email } as any });
      if (byCorreo) return { personId: byCorreo.id, email, fullName };

      // Buscar por email en auth.personas → academic_work_plan."Docente"
      const byUsuarioEmail = await this.docenteRepo
        .createQueryBuilder('d')
        .where(
          `EXISTS (
            SELECT 1
            FROM auth.personas p
            WHERE p.id_person = d."personaId"
              AND LOWER(p.dir_email) = LOWER(:email)
          )`,
          { email },
        )
        .getOne();
      if (byUsuarioEmail) return { personId: byUsuarioEmail.id, email, fullName };
    }

    // Buscar por num_identificacion en auth.personas vs identificacion en academic_work_plan."Persona"
    const authPersonaRows = await this.ptaRepo.manager.query(
      `SELECT p.num_identificacion FROM auth.personas p WHERE p.id_person = $1 LIMIT 1`,
      [personId],
    );
    if (authPersonaRows?.length > 0) {
      const numId = authPersonaRows[0]?.num_identificacion;
      if (numId) {
        const byDoc = await this.docenteRepo
          .createQueryBuilder('d')
          .where(
            `EXISTS (
              SELECT 1
              FROM academic_work_plan."Persona" p
              WHERE p.id = d."personaId"::text
                AND p.identificacion = :numId
            )`,
            { numId },
          )
          .getOne();
        if (byDoc) return { personId: byDoc.id, email, fullName };
      }
    }

    // Si no existe, auto-aprovisionamos el docente para no violar la FK al guardar el PTA
    const fallbackTerritorial = options?.fallbackTerritorial || (await this.ptaRepo.manager.query(`SELECT id_seccional::text AS id FROM auth.seccionales LIMIT 1`))?.[0]?.id;

    if (fallbackTerritorial) {
      console.warn(`[PTA] Auto-aprovisionando Docente ${personId} en academic_work_plan."Docente" para evitar error de FK.`);
      try {
        const usuarioRepo = this.ptaRepo.manager.getRepository(UsuarioEntity);
        // Usar upsert para evitar QueryFailedError por duplicidad de llaves en condiciones de carrera
        const now = new Date();
        await usuarioRepo.upsert({ id: personId, email: email || 'docente@esap.edu.co', password: 'N/A', updatedAt: now, createdAt: now }, ['id']);

        const personaRepoLocal = this.ptaRepo.manager.getRepository(PersonaEntity);
        // Buscar primero por usuarioId para evitar violación del constraint UNIQUE(usuarioId)
        const personaExistente = await personaRepoLocal.findOne({ where: { usuarioId: personId } as any });
        if (!personaExistente) {
          await personaRepoLocal.upsert({ id: personId, usuarioId: personId, updatedAt: now, createdAt: now }, ['id']);
        }

        const nuevoDocente = this.docenteRepo.create({
          id: personId,
          personaId: personId,
          territorialId: fallbackTerritorial,
          tipoVinculacion: 'CARRERA_003',
          dedicacion: 'Tiempo Completo',
          estado: 'ACTIVO',
          horasAsignables: 800,
          correoInstitucional: email,
          updatedAt: now,
          createdAt: now,
        });
        await this.docenteRepo.upsert(nuevoDocente, ['id']);
        return { personId, email, fullName };
      } catch (err) {
        console.error('[PTA] Error aprovisionando docente dummy:', err);
      }
    }

    console.warn(
      `[PTA] Persona ${personId} tiene rol DOCENTE en auth, pero no se encontró mapeo en academic_work_plan."Docente". Usando personId como docenteId.`,
    );
    return { personId, email, fullName };
  }

  // Cache de resolución de docente (TTL 30s) para evitar queries repetidas en la misma sesión
  private readonly docenteCache = new Map<string, { result: { personId: string; email: string | null; fullName: string }; expiresAt: number }>();

  private async resolveDocenteIdCached(docenteKey: string, options?: { fallbackTerritorial?: string; adminEdit?: boolean }): Promise<{ personId: string; email: string | null; fullName: string }> {
    const cacheKey = `${docenteKey}:${options?.adminEdit ? 'admin' : 'normal'}`;
    const cached = this.docenteCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.result;

    const result = await this.resolveDocenteCompleto(docenteKey, options);
    this.docenteCache.set(cacheKey, { result, expiresAt: Date.now() + 30_000 });
    return result;
  }

  private async resolveDocenteId(docenteKey: string, options?: { fallbackTerritorial?: string }): Promise<string> {
    const res = await this.resolveDocenteIdCached(docenteKey, options);
    return res.personId;
  }

  private isMedioTiempo(dedicacionRaw: any): boolean {
    const d = String(dedicacionRaw || '').toLowerCase();
    return d.includes('medio') || d === 'mt' || d === 'medio_tiempo' || d === 'medio tiempo';
  }

  async calcHorasProgramables(input: { tipo_vinculacion?: any; dedicacion?: any; semanas_vinculacion?: any }) {
    const tipo = coalesceString(input?.tipo_vinculacion) || 'CARRERA_003';
    const esMT = this.isMedioTiempo(input?.dedicacion);
    const semanas = Number(input?.semanas_vinculacion) || 16;

    // Lee las horas base configuradas (Términos Generales). Fallback a los valores normativos.
    let rules: any = {};
    try {
      rules = (await this.getConfiguracionPTAGlobal()) || {};
    } catch {
      rules = {}; // config no disponible: usa los valores normativos por defecto
    }
    const base009 = Number(rules.horas_base_carrera_009) || 720;
    const base003 = Number(rules.horas_base_carrera_003) || 800;
    const hSemTC = Number(rules.horas_semanales_tc) || 40;
    const hSemMT = Number(rules.horas_semanales_mt) || 20;

    if (tipo === 'CARRERA_009') {
      return esMT ? Math.round(base009 / 2) : base009;
    }
    if (tipo === 'CARRERA_003' || tipo === 'PERIODO_PRUEBA') {
      return esMT ? Math.round(base003 / 2) : base003;
    }

    const hSem = esMT ? hSemMT : hSemTC;
    return hSem * semanas;
  }

  // ── Multiplicadores de secciones de extensión (config-driven) ──────────────
  // Antes el ×2 de Capacitación estaba hardcodeado. Ahora se lee de la config
  // (ext_secciones[].multiplicador). Se cachea y se invalida al guardar config.
  private extMultCache: Record<string, number> | null = null;

  private async getExtMultiplicadores(): Promise<Record<string, number>> {
    if (this.extMultCache) return this.extMultCache;
    let rules: any = {};
    try {
      rules = (await this.getConfiguracionPTAGlobal()) || {};
    } catch {
      // Config no disponible aún (p.ej. tabla no creada en este ambiente): fallback sin cachear.
      return { capacitacion: 2 };
    }
    // Multiplicadores normativos por defecto (cuando la config no trae el campo).
    const DEFAULTS: Record<string, number> = { capacitacion: 2 };
    const secciones = Array.isArray((rules as any).ext_secciones) ? (rules as any).ext_secciones : null;
    const map: Record<string, number> = {};
    if (secciones && secciones.length) {
      for (const s of secciones) {
        const key = normalizeExtensionSectionKey(s?.key);
        if (!key) continue;
        // Respeta el multiplicador explícito (incluido 1); si falta, usa el default normativo de la sección.
        map[key] = Number(s?.multiplicador) > 0 ? Number(s.multiplicador) : (DEFAULTS[key] ?? 1);
      }
    } else {
      this.extMultCache = { ...DEFAULTS };
      return this.extMultCache;
    }
    this.extMultCache = map;
    return map;
  }

  private multiplicadorDeExt(a: any, mult: Record<string, number>): number {
    const actId = String(a?.actividad_id || a?.id || '');
    let seccion = String(a?.seccion || '');
    if (!seccion && actId.startsWith('CAP_')) seccion = 'capacitacion';
    else seccion = normalizeExtensionSectionKey(seccion);
    const m = Number(mult?.[seccion]);
    return m > 0 ? m : 1;
  }

  // Normaliza la clave de sección de una actividad complementaria. AADM ahora es
  // la sección 'academico_administrativas' dentro de complementarias.
  private normalizeCompSeccion(seccion: unknown, item?: any): 'complementarias_docencia' | 'academico_administrativas' {
    const s = String(seccion || '');
    if (s === 'academico_administrativas' || s === 'complementarias_docencia') return s;
    // Heurística legacy: un ítem que vivía en academico_admin trae consumeTotalidad definido.
    if (item && item.consumeTotalidad !== undefined && s === '') return 'academico_administrativas';
    return 'complementarias_docencia';
  }

  // Lee complementarias separando por sección y fusionando cualquier array legacy
  // `academico_admin` (PTAs no migrados o saves en tránsito). Mantiene separadas las
  // dos sumas para que el prorrateo/topes por sección no se mezclen.
  private readComplementariasSecciones(ds: any): { all: any[]; docencia: any[]; aadm: any[] } {
    const comp = Array.isArray(ds?.complementarias) ? ds.complementarias : [];
    const legacyAadm = Array.isArray(ds?.academico_admin) ? ds.academico_admin : [];
    const tagged = [
      ...comp.map((a: any) => ({ ...a, seccion: this.normalizeCompSeccion(a?.seccion, a) })),
      // Fusiona el array legacy academico_admin evitando duplicar lo ya migrado a complementarias.
      ...legacyAadm
        .filter((a: any) => !comp.some((c: any) =>
          (c?.actividad_id ?? c?.id) === (a?.actividad_id ?? a?.id) &&
          this.normalizeCompSeccion(c?.seccion, c) === 'academico_administrativas'))
        .map((a: any) => ({ ...a, seccion: 'academico_administrativas' as const })),
    ];
    const docencia = tagged.filter(a => a.seccion !== 'academico_administrativas');
    const aadm = tagged.filter(a => a.seccion === 'academico_administrativas');
    return { all: tagged, docencia, aadm };
  }

  private computeHorasTotales(body: any, extMult: Record<string, number> = { capacitacion: 2 }) {
    const asignaturas = Array.isArray(body?.asignaturas) ? body.asignaturas : [];
    const sumDocencia = asignaturas.reduce((sum: number, a: any) => sum + Number(a?.total_horas ?? a?.horas ?? 0), 0);

    const invActs = Array.isArray(body?.investigacion_actividades) ? body.investigacion_actividades : [];
    const invProyectoHoras = Number(body?.investigacion_proyecto?.horas_solicitadas || 0);
    const horasActividadesInv = invActs.reduce(
      (sum: number, a: any) => sum + (Number(a?.horas) || Number(a?.horas_total) || 0),
      0,
    );
    const sumInv = invProyectoHoras > 0 ? invProyectoHoras : horasActividadesInv;

    const extActsRaw = Array.isArray(body?.extension_actividades) ? body.extension_actividades : [];
    const extActs = extActsRaw.map((a: any) => {
      const m = this.multiplicadorDeExt(a, extMult);
      if (m === 1) return a;
      const horasEjec = Number(a?.horas_ejecutadas ?? a?.horas ?? 0);
      return { ...a, horas: horasEjec * m };
    });
    const sumExt = extActs.reduce((sum: number, a: any) => sum + Number(a?.horas || 0), 0);

    // Complementarias = una sola colección con dos secciones. Las horas se separan
    // por sección para conservar reglas/topes/prorrateo distintos.
    const { docencia: compDocencia, aadm: compAadm } = this.readComplementariasSecciones(body);
    const sumComp = compDocencia.reduce((sum: number, a: any) => sum + Number(a?.horas || 0), 0);
    const sumAcad = compAadm.reduce((sum: number, a: any) => sum + Number(a?.horas || 0), 0);

    const total = sumDocencia + sumInv + sumExt + sumComp + sumAcad;
    return { sumDocencia, sumInv, sumExt, sumComp, sumAcad, total };
  }

  private mergeExtensionActivity(defaultAct: ExtensionCatalogActivity, savedAct?: any): any {
    if (!savedAct) return defaultAct;
    const merged = { ...defaultAct, ...savedAct };

    // Un arreglo `items` vacío es una eliminación deliberada del usuario; solo rellenar
    // cuando el guardado no trae el arreglo en absoluto (config legacy sin ítems).
    if (!Array.isArray(savedAct.items) && Array.isArray(defaultAct.items) && defaultAct.items.length > 0) {
      merged.items = defaultAct.items;
    }
    if ((savedAct.max_horas === undefined || savedAct.max_horas === null) && defaultAct.max_horas !== undefined) {
      merged.max_horas = defaultAct.max_horas;
    }
    if ((savedAct.min_horas === undefined || savedAct.min_horas === null) && defaultAct.min_horas !== undefined) {
      merged.min_horas = defaultAct.min_horas;
    }

    return merged;
  }

  private normalizeExtensionActivities(raw: any): Record<string, any[]> {
    const savedRecord = canonicalizeExtensionActivities(raw);
    const defaultRecord = canonicalizeExtensionActivities(EXTENSION_ACTIVITY_COMPLETIONS);
    const result: Record<string, any[]> = {};

    const sectionKeys = new Set<string>([
      ...FIXED_EXTENSION_SECTIONS.map(s => s.key),
      ...Object.keys(savedRecord),
    ]);

    for (const sectionKey of sectionKeys) {
      const defaults = defaultRecord[sectionKey] || [];
      const defaultById = new Map(defaults.map((act: any) => [act.id, act]));

      // Si la sección ya fue guardada, el arreglo guardado es la fuente de verdad: se
      // respetan las eliminaciones del usuario y NO se re-agregan las actividades por
      // defecto ya borradas. Los defaults solo siembran secciones aún no configuradas.
      if (Object.prototype.hasOwnProperty.call(savedRecord, sectionKey)) {
        const savedActivities = Array.isArray(savedRecord[sectionKey]) ? savedRecord[sectionKey] : [];
        result[sectionKey] = savedActivities.map((savedAct: any) =>
          this.mergeExtensionActivity(defaultById.get(savedAct?.id) || savedAct, savedAct),
        );
      } else {
        result[sectionKey] = defaults.map(act => ({ ...act }));
      }
    }

    return result;
  }

  private normalizePtaRules(rules: any): any {
    if (!rules || typeof rules !== 'object') return rules;
    const maxExtensionGlobal = Number(rules.max_horas_extension_global ?? rules.ext_max_horas_enlace ?? 200);
    const normalized = {
      ...rules,
      max_horas_extension_global: Number.isFinite(maxExtensionGlobal) ? maxExtensionGlobal : 200,
      ext_max_horas_enlace: Number.isFinite(maxExtensionGlobal) ? maxExtensionGlobal : 200,
      comp_anexo1_validado: Boolean(rules.comp_anexo1_validado ?? false),
      comp_anexo1_fuente: String(rules.comp_anexo1_fuente || 'Pendiente de cotejo contra Anexo 1'),
      ext_secciones: normalizeExtensionSections(rules.ext_secciones),
    };

    if (rules.ext_actividades === undefined || rules.ext_actividades === null) return normalized;
    return {
      ...normalized,
      ext_actividades: this.normalizeExtensionActivities(rules.ext_actividades),
    };
  }

  private getRuleNumber(rules: any, key: string, fallback: number): number {
    const value = Number(rules?.[key]);
    return Number.isFinite(value) ? value : fallback;
  }

  private getPositiveRuleNumber(rules: any, key: string, fallback: number): number {
    const value = Number(rules?.[key]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private getInvestigacionLimit(body: any, rules: any, horasAProgramar: number): number {
    const rolRaw = coalesceString(body?.investigacion_proyecto?.rol);
    if (!rolRaw) {
      const maxHoras = this.getRuleNumber(rules, 'max_horas_inv_fomento', 200);
      const maxPct = this.getRuleNumber(rules, 'max_pct_inv_fomento', 25) / 100;
      return Math.min(maxHoras, Math.round(horasAProgramar * maxPct));
    }

    const rolKey = normalizeEstadoFilter(rolRaw);
    const configuredRoles = Array.isArray(rules?.inv_roles) ? rules.inv_roles : [];
    const configured = configuredRoles.find((r: any) => {
      const nameKey = normalizeEstadoFilter(r?.nombre);
      return nameKey === rolKey || nameKey.includes(rolKey) || rolKey.includes(nameKey);
    });

    let maxRol = Number(configured?.horas_max);
    if (!Number.isFinite(maxRol) || maxRol <= 0) {
      if (rolKey.includes('COINVESTIGADOR')) maxRol = this.getRuleNumber(rules, 'max_horas_inv_coinvestigador', 300);
      else if (rolKey.includes('ASISTENTE')) maxRol = this.getRuleNumber(rules, 'max_horas_inv_asistente', 200);
      else maxRol = this.getRuleNumber(rules, 'max_horas_inv_lider', 400);
    }

    let rolLimit = maxRol;
    const tipo = normalizeEstadoFilter(body?.tipo_vinculacion ?? body?.tipoVinculacion);
    if (tipo !== 'CARRERA_009') {
      const base800 = this.getRuleNumber(rules, 'horas_base_carrera_003', 800);
      rolLimit = Math.round(maxRol * (horasAProgramar / base800));
    }

    return Math.min(this.getRuleNumber(rules, 'max_horas_investigacion_global', 400), rolLimit);
  }

  private validatePtaForSubmission(body: any, horas: ReturnType<PtaService['computeHorasTotales']>, horasAProgramar: number, rules: any) {
    const { aadm: compAadm } = this.readComplementariasSecciones(body);
    const tieneTotalidad = compAadm.some((a: any) => a?.consumeTotalidad === true);

    if (!tieneTotalidad && horas.total === 0) {
      throw new BadRequestException('El PTA no tiene horas programadas (0h). Guarda el PTA con tus actividades antes de enviarlo a aprobacion.');
    }

    // El envio se valida por topes individuales de componente, no por suma global.
    if (tieneTotalidad) return;

    const maxDocencia = this.getPositiveRuleNumber(
      rules,
      'max_horas_docencia_global',
      this.getPositiveRuleNumber(rules, 'horas_base_carrera_003', 800),
    );
    const maxInvestigacion = this.getPositiveRuleNumber(rules, 'max_horas_investigacion_global', 400);
    const maxExtension = this.getPositiveRuleNumber(
      rules,
      'max_horas_extension_global',
      this.getPositiveRuleNumber(rules, 'ext_max_horas_enlace', 200),
    );
    const maxComplementarias = this.getPositiveRuleNumber(rules, 'max_horas_complementarias_global', 200);

    const assertComponentLimit = (label: string, value: number, limit: number) => {
      if (value > limit) {
        throw new BadRequestException(`El componente ${label} excede el limite permitido: ${value}h / ${limit}h.`);
      }
    };

    assertComponentLimit('Docencia', horas.sumDocencia, maxDocencia);
    assertComponentLimit('Investigacion', horas.sumInv, maxInvestigacion);
    assertComponentLimit('Extension', horas.sumExt, maxExtension);
    assertComponentLimit('Complementarias', horas.sumComp, maxComplementarias);

    const asignaturas = Array.isArray(body?.asignaturas)
      ? body.asignaturas.filter((a: any) => a?.asignatura_id)
      : [];

    if (asignaturas.length === 0) {
      throw new BadRequestException('Debe incluir al menos una asignatura valida antes de enviar el PTA a aprobacion.');
    }

    const minCreditos = this.getRuleNumber(rules, 'min_creditos_docencia', 3);
    if (!asignaturas.some((a: any) => Number(a?.creditos) >= minCreditos)) {
      throw new BadRequestException(`Debe incluir al menos una asignatura de minimo ${minCreditos} creditos antes de enviar el PTA.`);
    }

    for (const [idx, asig] of asignaturas.entries()) {
      const label = asig.asignatura_nombre || `Asignatura ${idx + 1}`;
      if (!asig.programa_id) {
        throw new BadRequestException(`Complete el programa de ${label} antes de enviar el PTA.`);
      }
      if (!asig.fecha_inicio || !asig.fecha_fin) {
        throw new BadRequestException(`Complete las fechas de inicio y fin de ${label} antes de enviar el PTA.`);
      }
      const inicio = new Date(`${asig.fecha_inicio}T00:00:00`);
      const fin = new Date(`${asig.fecha_fin}T00:00:00`);
      if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin < inicio) {
        throw new BadRequestException(`El rango de fechas de ${label} no es valido.`);
      }
      const horasAsignatura = Number(asig.total_horas ?? asig.horas);
      if (!Number.isFinite(horasAsignatura) || horasAsignatura <= 0) {
        throw new BadRequestException(`La asignatura ${label} no tiene horas calculadas.`);
      }
    }

    const tipo = normalizeEstadoFilter(body?.tipo_vinculacion ?? body?.tipoVinculacion);
    if (['OCASIONAL', 'VISITANTE', 'ESPECIAL'].some(t => tipo.includes(t))) {
      const minDocencia = horasAProgramar * (this.getRuleNumber(rules, 'min_pct_docencia_no_vinculados', 50) / 100);
      if (horas.sumDocencia < minDocencia) {
        throw new BadRequestException(`Los docentes no vinculados deben dedicar al menos ${minDocencia}h a docencia (${rules?.min_pct_docencia_no_vinculados ?? 50}% del PTA).`);
      }
    }

    if (horas.sumComp <= 0) {
      throw new BadRequestException('El PTA debe incluir actividades complementarias a la docencia antes de enviarse.');
    }

    if (horas.sumInv <= 0 && horas.sumExt <= 0) {
      throw new BadRequestException('El PTA debe incluir al menos una funcion misional adicional: Investigacion o Extension.');
    }

    const maxAadm = Math.min(
      this.getRuleNumber(rules, 'max_horas_aadm_global', 200),
      horasAProgramar * (this.getRuleNumber(rules, 'max_pct_aadm', 25) / 100),
    );
    if (horas.sumAcad > maxAadm) {
      throw new BadRequestException(`Actividades academico-administrativas superan el tope permitido: ${horas.sumAcad}h / ${maxAadm}h.`);
    }

  }

  private toPtaDto(entity: PlanTrabajoAcademicoEntity, extMult: Record<string, number> = { capacitacion: 2 }) {
    const {
      id: _id, pta_id: _ptaId, ptaId: _ptaId2,
      estado: _estado, periodo: _periodo, version: _version,
      docente_id: _docId,
      ...extra
    } = (entity.datosEstructurados && typeof entity.datosEstructurados === 'object'
      ? entity.datosEstructurados
      : {}) as Record<string, any>;

    // Calcular horas por componente desde datosEstructurados para la tabla del backoffice
    const ds = entity.datosEstructurados as any || {};
    const asignaturas: any[] = Array.isArray(ds.asignaturas) ? ds.asignaturas : [];
    const invActs: any[] = Array.isArray(ds.investigacion_actividades) ? ds.investigacion_actividades : [];
    const extActs: any[] = Array.isArray(ds.extension_actividades) ? ds.extension_actividades : [];
    const { docencia: compDocencia, aadm: compAadm } = this.readComplementariasSecciones(ds);

    const hDocencia = asignaturas.reduce((s: number, a: any) => s + (Number(a?.total_horas ?? a?.horas) || 0), 0);
    const hInv = Number(ds.investigacion_proyecto?.horas_solicitadas || 0) ||
      invActs.reduce((s: number, a: any) => s + (Number(a?.horas_total ?? a?.horas) || 0), 0);
    // Aplicar multiplicador de sección (config-driven) para mantener consistencia con computeHorasTotales
    const extActsNorm = extActs.map((a: any) => {
      const m = this.multiplicadorDeExt(a, extMult);
      if (m === 1) return a;
      const horasEjec = Number(a?.horas_ejecutadas ?? a?.horas ?? 0);
      return { ...a, horas: horasEjec * m };
    });
    const hExt = extActsNorm.reduce((s: number, a: any) => s + (Number(a?.horas) || 0), 0);
    const hCompDocencia = compDocencia.reduce((s: number, a: any) => s + (Number(a?.horas) || 0), 0);
    const hAcad = compAadm.reduce((s: number, a: any) => s + (Number(a?.horas) || 0), 0);
    // Complementarias unificado = sección docencia + sección académico-administrativa.
    const hComp = hCompDocencia + hAcad;
    const horasTotal = entity.horasTotales || (hDocencia + hInv + hExt + hComp);
    const horasAsignables = (entity as any).horasAsignables || Number(ds.horas_a_programar) || 800;

    return {
      id: entity.id,
      docente_id: entity.docenteId,
      periodo: entity.periodo,
      estado: entity.estado === 'BORRADOR' ? 'Borrador' : entity.estado,
      version: entity.version,
      horas_totales: horasTotal,
      // Aliases usados por la tabla del backoffice
      total_horas_programadas: horasTotal,
      horas_a_programar: horasAsignables,
      horas_asignables: horasAsignables,
      // Horas por componente para barras de color
      horas_docencia: hDocencia,
      horas_investigacion: hInv,
      horas_extension: hExt,
      // Complementarias unificado incluye la sección académico-administrativa.
      horas_complementarias: hComp,
      // Desglose por sección (nuevo) — para vistas que quieran diferenciar.
      complementarias_secciones: {
        complementarias_docencia: hCompDocencia,
        academico_administrativas: hAcad,
      },
      // Alias deprecado (compat con consumidores que aún leen horas_acad_admin).
      horas_acad_admin: hAcad,
      num_asignaturas: asignaturas.length,
      motivo_devolucion: entity.motivoDevolucion,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      dedicacion: (entity as any).dedicacion,
      tipo_vinculacion: (entity as any).tipoVinculacion,
      semanas_vinculacion: (entity as any).semanasVinculacion,
      ...extra,
      pta_id: entity.id,
      ptaId: entity.id,
    };
  }

  private compactNameList(names: string[]): string | undefined {
    const unique = [...new Set(names.map(n => n.trim()).filter(Boolean))];
    if (unique.length === 0) return undefined;
    if (unique.length <= 2) return unique.join(', ');
    return `${unique[0]} +${unique.length - 1}`;
  }

  private async enrichPtaSummaries(dtos: any[]): Promise<any[]> {
    if (!dtos.length) return dtos;

    const programaKeys = new Set<string>();
    const territorialKeys = new Set<string>();
    const cetapKeys = new Set<string>();

    for (const dto of dtos) {
      const asignaturas = Array.isArray(dto.asignaturas) ? dto.asignaturas : [];
      const dtoPrograma = coalesceLookupKey(dto.programa_id, dto.programaId);
      const dtoTerritorial = coalesceLookupKey(dto.territorial_id, dto.territorialId);
      if (dtoPrograma) programaKeys.add(dtoPrograma);
      if (dtoTerritorial) territorialKeys.add(dtoTerritorial);

      for (const asig of asignaturas) {
        const programaId = coalesceLookupKey(asig?.programa_id, asig?.programaId, asig?.programa?.id);
        const territorialId = coalesceLookupKey(asig?.territorial_id, asig?.territorialId, asig?.territorial?.id);
        const cetapId = coalesceLookupKey(asig?.cetap_id, asig?.cetapId, asig?.sede_id, asig?.sedeId);
        if (programaId) programaKeys.add(programaId);
        if (territorialId) territorialKeys.add(territorialId);
        if (cetapId) cetapKeys.add(cetapId);
      }
    }

    const programaMap = new Map<string, { id: string; codigo?: string; nombre: string; nombreCorto?: string }>();
    const territorialMap = new Map<string, { id: string; codigo?: string; nombre: string }>();
    const cetapMap = new Map<string, { id: string; codigo?: string; nombre: string }>();

    if (programaKeys.size > 0) {
      try {
        const rows = await this.ptaRepo.manager.query(
          `
          SELECT id::text AS id, codigo, nombre, nombre_corto AS "nombreCorto"
          FROM academic_work_plan.programa
          WHERE id::text = ANY($1::text[]) OR codigo::text = ANY($1::text[])
          `,
          [[...programaKeys]],
        );
        for (const row of rows) {
          const item = {
            id: String(row.id),
            codigo: row.codigo ? String(row.codigo) : undefined,
            nombre: row.nombreCorto || row.nombre,
            nombreCorto: row.nombreCorto || undefined,
          };
          programaMap.set(item.id, item);
          if (item.codigo) programaMap.set(item.codigo, item);
        }
      } catch (err: any) {
        this.logger.warn(`No se pudieron resolver nombres de programas PTA: ${err?.message || err}`);
      }
    }

    if (territorialKeys.size > 0) {
      try {
        const rows = await this.ptaRepo.manager.query(
          `
          SELECT id_seccional::text AS id, cod_seccional::text AS codigo, nom_seccional AS nombre
          FROM auth.seccionales
          WHERE id_seccional::text = ANY($1::text[]) OR cod_seccional::text = ANY($1::text[])
          `,
          [[...territorialKeys]],
        );
        for (const row of rows) {
          const item = {
            id: String(row.id),
            codigo: row.codigo ? String(row.codigo) : undefined,
            nombre: row.nombre,
          };
          territorialMap.set(item.id, item);
          if (item.codigo) territorialMap.set(item.codigo, item);
        }
      } catch (err: any) {
        this.logger.warn(`No se pudieron resolver nombres de territoriales PTA: ${err?.message || err}`);
      }
    }

    if (cetapKeys.size > 0) {
      try {
        const rows = await this.ptaRepo.manager.query(
          `
          SELECT id_sede::text AS id, cod_sede::text AS codigo, nom_sede AS nombre
          FROM auth.sedes
          WHERE id_sede::text = ANY($1::text[]) OR cod_sede::text = ANY($1::text[])
          `,
          [[...cetapKeys]],
        );
        for (const row of rows) {
          const item = {
            id: String(row.id),
            codigo: row.codigo ? String(row.codigo) : undefined,
            nombre: row.nombre,
          };
          cetapMap.set(item.id, item);
          if (item.codigo) cetapMap.set(item.codigo, item);
        }
      } catch (err: any) {
        this.logger.warn(`No se pudieron resolver nombres de CETAP/sedes PTA: ${err?.message || err}`);
      }
    }

    for (const dto of dtos) {
      const asignaturas = Array.isArray(dto.asignaturas) ? dto.asignaturas : [];
      const programaNames: string[] = [];
      const territorialNames: string[] = [];
      const cetapNames: string[] = [];

      for (const asig of asignaturas) {
        const programaId = coalesceLookupKey(asig?.programa_id, asig?.programaId, asig?.programa?.id);
        const territorialId = coalesceLookupKey(asig?.territorial_id, asig?.territorialId, asig?.territorial?.id);
        const cetapId = coalesceLookupKey(asig?.cetap_id, asig?.cetapId, asig?.sede_id, asig?.sedeId);

        const programaNombre = coalesceString(asig?.programa_nombre, asig?.programa?.nombre, asig?.programa?.nombreCorto)
          || (programaId ? programaMap.get(programaId)?.nombre : null);
        const territorialNombre = coalesceString(asig?.territorial_nombre, asig?.territorial?.nombre)
          || (territorialId ? territorialMap.get(territorialId)?.nombre : null);
        const cetapNombre = coalesceString(asig?.cetap_nombre, asig?.sede_nombre, asig?.cetap?.nombre, asig?.sede?.nombre)
          || (cetapId ? cetapMap.get(cetapId)?.nombre : null);

        if (programaNombre) {
          asig.programa_nombre = programaNombre;
          programaNames.push(programaNombre);
        }
        if (territorialNombre) {
          asig.territorial_nombre = territorialNombre;
          territorialNames.push(territorialNombre);
        }
        if (cetapNombre) {
          asig.cetap_nombre = cetapNombre;
          cetapNames.push(cetapNombre);
        }
      }

      const programaResumen = coalesceString(dto.programa_academico, dto.programa, dto.programa_nombre)
        || this.compactNameList(programaNames);
      const territorialResumen = coalesceString(dto.territorial, dto.territorial_nombre)
        || this.compactNameList(territorialNames);
      const cetapResumen = coalesceString(dto.cetap, dto.cetap_nombre, dto.sede)
        || this.compactNameList(cetapNames);

      if (programaResumen) {
        dto.programa = programaResumen;
        dto.programa_nombre = dto.programa_nombre || programaResumen;
      }
      if (territorialResumen) {
        dto.territorial = territorialResumen;
        dto.territorial_nombre = dto.territorial_nombre || territorialResumen;
      }
      if (cetapResumen) {
        dto.cetap = cetapResumen;
        dto.cetap_nombre = dto.cetap_nombre || cetapResumen;
      }

      dto.programasAsignaturas = [...new Set(programaNames)];
      dto.territorialesAsignaturas = [...new Set(territorialNames)];
      dto.cetapsAsignaturas = [...new Set(cetapNames)];
      dto.num_programas = dto.programasAsignaturas.length;
      dto.num_territoriales = dto.territorialesAsignaturas.length;
    }

    // Solo lectura y aditivo: si algo falla, la lista sigue funcionando igual (sin conteos).
    try {
      await this.attachComponentApprovalProgress(dtos);
    } catch (err: any) {
      this.logger.warn(`Avance de aprobación por componente omitido: ${err?.message || err}`);
    }
    return dtos;
  }

  /**
   * Adjunta a cada DTO de la lista el avance de aprobación por componente
   * (componentes_aprobados / componentes_total), usando el mismo criterio que el
   * panel de detalle: 4 componentes base (Docencia, Investigación, Complementarias,
   * Acad-Admin) siempre + las sub-secciones de Extensión que tengan horas > 0.
   * Es SOLO LECTURA (no persiste ni auto-aprueba) y tolerante a fallos: si algo falla,
   * simplemente no adjunta los conteos y el front cae al rótulo de estado.
   */
  private async attachComponentApprovalProgress(dtos: any[]): Promise<void> {
    const ids = dtos.map(d => d?.id).filter(Boolean);
    if (!ids.length) return;

    let approvals: PtaComponentApprovalEntity[] = [];
    try {
      approvals = await this.ptaComponentApprovalRepo.find({ where: { ptaId: In(ids) } });
    } catch (err: any) {
      this.logger.warn(`No se pudo cargar el avance de aprobación por componente: ${err?.message || err}`);
      return;
    }

    const estadoByPta = new Map<string, Map<string, string>>();
    for (const a of approvals) {
      if (!a?.ptaId || !a?.componente || isRoleApprovalComponent(a.componente)) continue;
      if (!estadoByPta.has(a.ptaId)) estadoByPta.set(a.ptaId, new Map());
      estadoByPta.get(a.ptaId)!.set(a.componente, String(a.estado || 'pendiente'));
    }

    const BASE_KEYS = ['academica', 'investigacion', 'complementarias'];
    const EXT_SUB_SECTIONS: Record<string, string[]> = {
      ext_capacitacion: ['capacitacion'],
      ext_procesos: ['seleccion'],
      ext_fortalecimiento: ['fortalecimiento', 'laboratorio_innovacion', 'investigacion_aplicada'],
      ext_gobierno: ['alto_gobierno'],
    };

    for (const dto of dtos) {
      try {
        const extActs = Array.isArray(dto?.extension_actividades) ? dto.extension_actividades : [];
        const extHoras = (secs: string[]) => extActs
          .filter((a: any) => secs.includes(normalizeExtensionSectionKey(a?.seccion)))
          .reduce((s: number, a: any) => s + (Number(a?.horas_ejecutadas ?? a?.horas ?? 0) || 0), 0);

        const horasPorComp: Record<string, number> = {
          academica: Number(dto?.horas_docencia || 0),
          investigacion: Number(dto?.horas_investigacion || 0),
          // horas_complementarias ya incluye la sección académico-administrativa.
          complementarias: Number(dto?.horas_complementarias || 0),
          ext_capacitacion: extHoras(EXT_SUB_SECTIONS.ext_capacitacion),
          ext_procesos: extHoras(EXT_SUB_SECTIONS.ext_procesos),
          ext_fortalecimiento: extHoras(EXT_SUB_SECTIONS.ext_fortalecimiento),
          ext_gobierno: extHoras(EXT_SUB_SECTIONS.ext_gobierno),
        };

        const hayActividades = Object.values(horasPorComp).some(h => h > 0);
        const recs = estadoByPta.get(dto.id) || new Map<string, string>();
        // Un componente cuenta como aprobado si su registro está aprobado o si está vacío
        // (auto-aprobación cuando el PTA tiene actividades) — consistente con getComponentesAprobacion.
        const estaAprobado = (k: string) => recs.get(k) === 'aprobado' || (hayActividades && (horasPorComp[k] || 0) === 0);

        // Componentes de ALTO NIVEL que ve el administrador (5): Docencia, Investigación,
        // Extensión (UNA sola, NO desglosada en sus 4 subsecciones), Complementarias, Acad-Admin.
        const EXT_KEYS = ['ext_capacitacion', 'ext_procesos', 'ext_fortalecimiento', 'ext_gobierno'];
        let total = 0;
        let aprobados = 0;
        for (const c of BASE_KEYS) {
          total++;
          if (estaAprobado(c)) aprobados++;
        }
        // Extensión colapsada: cuenta como 1 si tiene horas; aprobada solo si TODAS sus subsecciones lo están.
        const extTieneHoras = EXT_KEYS.reduce((s, k) => s + (horasPorComp[k] || 0), 0) > 0;
        if (extTieneHoras) {
          total++;
          if (EXT_KEYS.every(k => estaAprobado(k))) aprobados++;
        }

        dto.componentes_total = total;
        dto.componentes_aprobados = aprobados;
      } catch {
        // No romper la lista por un DTO problemático.
      }
    }
  }

  private toEvidenciaDto(entity: PtaEvidenciaEntity) {
    return {
      id: entity.id,
      ptaId: entity.ptaId,
      pta_id: entity.ptaId,
      nombre: entity.nombre,
      tipoArchivo: entity.tipoArchivo,
      tipo_archivo: entity.tipoArchivo,
      tamanioBytes: entity.tamanioBytes,
      tamanio_bytes: entity.tamanioBytes,
      tamanio: entity.tamanioBytes,
      categoria: entity.categoria,
      componentePta: entity.componentePta,
      componente_pta: entity.componentePta,
      horasAvance: entity.horasAvance,
      horas_avance: entity.horasAvance,
      storageUrl: entity.storageUrl,
      storage_url: entity.storageUrl,
      subidoPor: entity.subidoPor,
      subido_por: entity.subidoPor,
      descripcion: entity.descripcion,
      estado: entity.estado,
      estadoRevision: entity.estadoRevision,
      estado_revision: entity.estadoRevision,
      revisadoPor: entity.revisadoPor,
      revisado_por: entity.revisadoPor,
      comentarioRevision: entity.comentarioRevision,
      comentario_revision: entity.comentarioRevision,
      createdAt: entity.createdAt,
      created_at: entity.createdAt,
      updatedAt: entity.updatedAt,
      updated_at: entity.updatedAt,
      fecha_subida: entity.createdAt,
    };
  }

  async getAllPTAs(filters: any) {
    // Sweep perezoso: elimina PTAs vencidos (sin aprobar dentro del plazo) al
    // consultar el listado del backoffice, como máximo una vez por hora.
    this.purgarPtasVencidosThrottled();

    const qb = this.ptaRepo.createQueryBuilder('pta');

    const estadoFilter = coalesceString(filters?.estado);
    if (estadoFilter) {
      const groupedEstados = getGroupedPtaEstados(estadoFilter);
      if (groupedEstados?.length) {
        qb.andWhere('pta.estado IN (:...estados)', { estados: groupedEstados });
      } else {
        qb.andWhere('pta.estado = :estado', { estado: estadoFilter });
      }
    }
    if (filters?.periodo) {
      qb.andWhere('pta.periodo = :periodo', { periodo: String(filters.periodo) });
    }

    qb.orderBy('pta.updatedAt', 'DESC');
    qb.take(Math.min(Number(filters?.limit || 200), 500));

    const rows = await qb.getMany();
    const extMult = await this.getExtMultiplicadores();
    return this.enrichPtaSummaries(rows.map((row) => this.toPtaDto(row, extMult)));
  }

  async getPTAsByDocente(docenteId: string, periodo?: string | undefined) {
    const resolved = await this.resolveDocenteId(docenteId);
    const qb = this.ptaRepo.createQueryBuilder('pta');
    qb.andWhere('pta.docenteId = :docenteId', { docenteId: resolved });
    if (periodo) qb.andWhere('pta.periodo = :periodo', { periodo });
    qb.orderBy('pta.updatedAt', 'DESC');
    const rows = await qb.getMany();
    const extMult = await this.getExtMultiplicadores();
    return this.enrichPtaSummaries(rows.map((row) => this.toPtaDto(row, extMult)));
  }

  async getPTAById(id: string) {
    const pta = await this.ptaRepo.findOne({ where: { id } });
    if (!pta) throw new NotFoundException('PTA no encontrado');

    const [evidencias, historial] = await Promise.all([
      this.evidenciaRepo.find({ where: { ptaId: id }, order: { createdAt: 'DESC' } }),
      this.historialRepo.find({ where: { ptaId: id }, order: { createdAt: 'DESC' } }),
    ]);

    const [dto] = await this.enrichPtaSummaries([
      this.toPtaDto(pta, await this.getExtMultiplicadores()) as any,
    ]);

    if (dto.asignaturas && Array.isArray(dto.asignaturas)) {
      const asigIds = dto.asignaturas.map((a: any) => a.asignatura_id).filter(Boolean);
      if (asigIds.length > 0) {
        try {
          const subjects = await this.asignaturaRepo.query(
            `SELECT a.id, nt.nombre AS nucleo 
             FROM academic_work_plan.asignatura a
             LEFT JOIN academic_work_plan.nucleo_tematico nt ON nt.id = a.id_nucleo_tematico
             WHERE a.id::text IN (${asigIds.map((_, idx) => `$${idx + 1}`).join(', ')})`,
            asigIds.map(id => String(id))
          );
          const subjectMap = new Map(subjects.map((s: any) => [String(s.id), s.nucleo]));
          dto.asignaturas = dto.asignaturas.map((a: any) => {
            const nucleoNombre = subjectMap.get(String(a.asignatura_id));
            if (nucleoNombre) {
              return {
                ...a,
                nucleo_tematico: nucleoNombre,
              };
            }
            return a;
          });
        } catch (err) {
          console.error('[getPTAById] Error resolving nucleo tematico names:', err);
        }
      }
    }

    return {
      ...dto,
      evidencias: evidencias.map((e) => this.toEvidenciaDto(e)),
      historialEstados: historial,
    };
  }

  private mergeRestrictedAdminEditInput(
    input: SavePtaInput,
    existing: PlanTrabajoAcademicoEntity,
    allowedComponentKeys: string[],
  ): SavePtaInput {
    const existingData = existing.datosEstructurados && typeof existing.datosEstructurados === 'object'
      ? existing.datosEstructurados as Record<string, any>
      : {};
    const allowed = new Set(allowedComponentKeys.map(key => String(key)));
    const merged: SavePtaInput = { ...input };

    const preserveField = (field: string) => {
      if (Object.prototype.hasOwnProperty.call(existingData, field)) {
        merged[field] = existingData[field];
      }
    };

    merged.id = existing.id;
    merged.docente_id = existing.docenteId;
    merged.periodo = existing.periodo;
    merged.estado = existing.estado;
    ['docente_nombre', 'dedicacion', 'tipo_vinculacion', 'semanas_vinculacion', 'semanas_prorrateo', 'horas_a_programar'].forEach(preserveField);

    if (!allowed.has('academica')) {
      preserveField('asignaturas');
    }
    if (!allowed.has('investigacion')) {
      preserveField('investigacion_proyecto');
      preserveField('investigacion_actividades');
    }
    if (!allowed.has('complementarias')) {
      // Complementarias ahora incluye la sección académico-administrativa; se preserva
      // también el array legacy academico_admin para PTAs no migrados.
      preserveField('complementarias');
      preserveField('academico_admin');
    }

    const hasAnyExtensionPermission = COMPONENT_APPROVAL_KEYS
      .filter(key => key.startsWith('ext_'))
      .some(key => allowed.has(key));
    if (!hasAnyExtensionPermission) {
      preserveField('extension_actividades');
    } else {
      const submittedExt = Array.isArray(input?.extension_actividades) ? input.extension_actividades : [];
      const existingExt = Array.isArray(existingData?.extension_actividades) ? existingData.extension_actividades : [];
      const submittedAllowed = submittedExt.filter((act: any) => allowed.has(componentKeyForExtensionSection(act?.seccion)));
      const preservedUnauthorized = existingExt.filter((act: any) => !allowed.has(componentKeyForExtensionSection(act?.seccion)));
      merged.extension_actividades = [...preservedUnauthorized, ...submittedAllowed];
    }

    return merged;
  }

  async savePTA(input: SavePtaInput) {
    let id = coalesceString(input?.id);
    const isAdminEdit = Boolean(input?._adminEdit);
    const allowedComponentKeys = Array.isArray(input?._allowed_component_keys)
      ? input._allowed_component_keys
        .map((key: unknown) => String(key))
        .filter((key: string) => COMPONENT_APPROVAL_KEY_SET.has(key))
      : [];
    if (isAdminEdit && id && allowedComponentKeys.length > 0) {
      const existingForRestrictedEdit = await this.ptaRepo.findOne({ where: { id } });
      if (!existingForRestrictedEdit) {
        throw new NotFoundException('PTA no encontrado');
      }
      input = this.mergeRestrictedAdminEditInput(input, existingForRestrictedEdit, allowedComponentKeys);
      id = existingForRestrictedEdit.id;
    }

    const docenteKey = coalesceString(
      input?.docente_id,
      input?.docenteId,
      input?.docente?.id,
      input?.docente?.personaId,
    );
    const fallbackTerritorial = Array.isArray(input?.asignaturas) && input.asignaturas.length > 0 ? input.asignaturas[0].territorial_id : undefined;
    const { personId: docenteId, fullName: dbName } = await this.resolveDocenteIdCached(docenteKey || '', { fallbackTerritorial, adminEdit: isAdminEdit });

    // Enrich identity if missing
    if (!input.docente_nombre) {
      input.docente_nombre = dbName;
    }

    const periodo = coalesceString(input?.periodo) || '2026-1';
    let estado = coalesceString(input?.estado) || 'BORRADOR';

    // Normalize state case
    if (estado.toLowerCase() === 'borrador') estado = 'Borrador';

    // Solicitud aprobada que habilita este segundo PTA; se consume tras crearlo
    // (estado → 'gestionada') para que el permiso no quede abierto indefinidamente.
    let solicitudUsada: SolicitudPtaEntity | null = null;

    // Regla legacy: máximo 1 PTA activo salvo solicitud aprobada.
    if (!id && !isAdminEdit) {
      const ESTADOS_ACTIVOS = [
        'BORRADOR',
        'Borrador',
        'PROPUESTO_POR_DIRECCION',
        'NOTIFICADO_DOCENTE',
        'ACEPTADO_DOCENTE',
        'MODIFICADO_DOCENTE',
        'OBJETADO_DOCENTE',
        'EN_CONCERTACION',
        'CONCERTADO',
        'ESCALADO_SNA',
        'Pendiente Jefatura',
        'Pendiente Decanatura',
        'Pendiente Gestión Profesoral',
        'PENDIENTE_APROBACION',
        'REVISION_DOCENTE_N1',
        'REVISION_DOCENTE_N2',
        'REVISION_DOCENTE_N3',
        'Devuelto',
        'Aprobado',
      ];

      const ptaActivo = await this.ptaRepo.findOne({
        where: { docenteId, estado: In(ESTADOS_ACTIVOS as any) } as any,
        select: { id: true, estado: true } as any,
      });

      if (ptaActivo) {
        const estadoActivo = String(ptaActivo.estado || '').toLowerCase();
        // Si el único PTA activo es un BORRADOR, el docente lo está editando/enviando:
        // reutilizamos su id para ACTUALIZARLO en vez de bloquear (el front a veces no
        // reenvía el id al guardar). Solo bloqueamos si ya hay un PTA enviado/en proceso.
        if (estadoActivo === 'borrador') {
          id = ptaActivo.id;
        } else {
          const solicitud = await this.solicitudRepo.findOne({
            where: { docenteId, estado: 'aprobado' } as any,
            order: { resolucionFecha: 'DESC' as any, updatedAt: 'DESC' as any } as any,
          });
          if (!solicitud) {
            throw new BadRequestException(
              'Ya tienes un Plan de Trabajo en ejecución. Finalizá o esperá su aprobación antes de crear uno nuevo.',
            );
          }
          solicitudUsada = solicitud;
        }
      }
    }

    // [BR-010] Bloqueo por Modalidad "Por Definir": no se puede concertar asignaturas
    // que tengan requiere_revision_modalidad = TRUE en la base de datos.
    const asignaturasInput: any[] = Array.isArray(input?.asignaturas) ? input.asignaturas : [];
    if (asignaturasInput.length > 0) {
      const codigosAsignaturas = asignaturasInput
        .map((a: any) => coalesceString(a?.codigo, a?.codigo_asignatura, a?.asignatura_codigo))
        .filter(Boolean);

      if (codigosAsignaturas.length > 0) {
        const placeholders = codigosAsignaturas.map((_: any, i: number) => `$${i + 1}`).join(', ');
        const bloqueadas = await this.ptaRepo.manager.query(
          `SELECT codigo, nombre FROM academic_work_plan.asignatura 
           WHERE codigo IN (${placeholders}) AND requiere_revision_modalidad = TRUE`,
          codigosAsignaturas,
        );

        if (bloqueadas.length > 0) {
          const nombresBloqueadas = bloqueadas.map((b: any) => `${b.codigo} (${b.nombre})`).join(', ');
          throw new BadRequestException(
            `[BR-010] No se puede concertar el PTA: ${bloqueadas.length} asignatura(s) tienen modalidad "Por Definir" pendiente de revisión directiva: ${nombresBloqueadas}. ` +
            `Contacte al nivel directivo para que defina la modalidad exacta (Presencial, Virtual, etc.) antes de incluirlas en el PTA.`
          );
        }
      }
    }

    const extMult = await this.getExtMultiplicadores();
    const horas = this.computeHorasTotales(input, extMult);
    const horasAProgramar =
      Number(input?.horas_a_programar ?? input?.horasAsignables ?? input?.horas_asignables) ||
      (await this.calcHorasProgramables({
        tipo_vinculacion: input?.tipo_vinculacion,
        dedicacion: input?.dedicacion,
        semanas_vinculacion: input?.semanas_vinculacion,
      }));

    if (isPendingRoleApprovalState(estado)) {
      this.validatePtaForSubmission(input, horas, horasAProgramar, (await this.getConfiguracionPTAGlobal()) || {});
    }

    const patch: Partial<PlanTrabajoAcademicoEntity> = {
      docenteId,
      periodo,
      estado,
      motivoDevolucion: input?.motivo_devolucion ?? input?.motivoDevolucion ?? null,
      observaciones: input?.observaciones_docente ?? input?.observaciones ?? null,
      datosEstructurados: input,
      horasTotales: horas.total,
      dedicacion: coalesceString(input?.dedicacion) as any,
      horasAsignables: Number.isFinite(horasAProgramar) ? Number(horasAProgramar) : null,
      semanasVinculacion: input?.semanas_vinculacion != null ? Number(input?.semanas_vinculacion) : null,
      tipoVinculacion: coalesceString(input?.tipo_vinculacion) as any,
    };

    let saved: PlanTrabajoAcademicoEntity;
    let estadoAnteriorSave: string | null = null;

    if (id) {
      const existing = await this.ptaRepo.findOne({ where: { id } });
      if (!existing) {
        saved = await this.ptaRepo.save(this.ptaRepo.create({ ...patch, id, version: 1 }));
      } else {
        estadoAnteriorSave = existing.estado;
        saved = await this.ptaRepo.save({ ...existing, ...patch });
      }
    } else {
      saved = await this.ptaRepo.save(this.ptaRepo.create({ ...patch, version: 1 }));
    }

    // Registrar en historial cuando hay creación, cambio de estado, o edición admin.
    // La edición admin (misma etapa, sin cambio de estado) también se registra para que
    // quede trazada en la pestaña "Trazabilidad" con actor "Administrador" y su snapshot R-XX.
    const tipoAccionSave = !estadoAnteriorSave ? 'CREACION'
      : estado !== estadoAnteriorSave ? 'CAMBIO_ESTADO'
      : isAdminEdit ? 'EDICION_ADMIN'
      : 'GUARDADO';
    if (!estadoAnteriorSave || estado !== estadoAnteriorSave || !id || isAdminEdit) {
      await this.historialRepo.save(this.historialRepo.create({
        ptaId: saved.id,
        estadoAnterior: estadoAnteriorSave,
        estadoNuevo: saved.estado,
        actorId: coalesceString(input?.docente_id, input?.docenteId),
        actorRol: isAdminEdit ? 'Administrador' : 'Docente',
        tipoAccion: tipoAccionSave,
        comentarios: input?.observaciones_docente || null,
        snapshotPta: input,
        version: saved.version,
      }));
    }

    // Evento para realtime sync
    await this.logEvento({
      ptaId: saved.id,
      tipo: tipoAccionSave === 'CREACION' ? 'notificacion' : tipoAccionSave === 'CAMBIO_ESTADO' ? 'cambio_estado' : 'guardado',
      docenteId: coalesceString(input?.docente_id, input?.docenteId),
      docenteNombre: coalesceString(input?.docente_nombre),
      estadoAnterior: estadoAnteriorSave,
      estadoNuevo: saved.estado,
      actor: coalesceString(input?.docente_id, input?.docenteId),
      actorRol: isAdminEdit ? 'Administrador' : 'Docente',
      sistemaOrigen: isAdminEdit ? 'backoffice' : 'portal',
      mensaje: tipoAccionSave === 'CREACION' ? 'PTA creado' : tipoAccionSave === 'CAMBIO_ESTADO' ? `Estado: ${estadoAnteriorSave} → ${saved.estado}` : 'PTA guardado',
    });

    // Consumir la solicitud aprobada que habilitó este segundo PTA: pasa a 'gestionada'
    // para que `tienePermisoEspecial` (que solo cuenta 'aprobado') se limpie y el docente
    // no pueda crear PTAs adicionales sin una nueva solicitud aprobada.
    if (solicitudUsada) {
      try {
        solicitudUsada.estado = 'gestionada';
        solicitudUsada.notificacionLeida = true;
        await this.solicitudRepo.save(solicitudUsada);
      } catch (e: any) {
        this.logger.warn(`No se pudo consumir la solicitud ${solicitudUsada.id}: ${e?.message || e}`);
      }
    }

    return this.toPtaDto(saved, extMult);
  }

  async updatePTAStatus(
    ptaId: string,
    body: any,
    auth?: PtaAuthenticatedUser,
  ) {
    const existing = await this.ptaRepo.findOne({ where: { id: ptaId } });
    if (!existing) throw new NotFoundException('PTA no encontrado');
    if (['Terminado', 'TERMINADO'].includes(String(existing.estado))) {
      throw new BadRequestException('El PTA está terminado (solo lectura) y no admite cambios de estado.');
    }

    const accion = coalesceString(body?.accion, body?.tipoAccion);
    let nuevoEstado = coalesceString(body?.estado);
    let parallelApprovalResult: any = null;

    // ── Autorización server-side de la aprobación global (vía estado) ───────────
    // Modelo POR COMPONENTE: la aprobación granular se hace vía aprobar-componente.
    // La aprobación/devolución GLOBAL del PTA por estado (flujo masivo/por nivel, del
    // modelo anterior) queda reservada al aprobador integral (superusuario del sistema
    // o rol con pta.approve.all). Un aprobador por componente debe aprobar cada
    // componente individualmente. Se ignora cualquier isSuperUser/aprobarTodas del body.
    // `auth` es undefined en llamadas internas (p.ej. firma OTP), que nunca usan
    // acción "aprobar"/"devolver".
    const accionLower = (accion || '').toLowerCase();
    const esAccionAprobacion = accionLower === 'aprobar' || accionLower === 'devolver';
    if (esAccionAprobacion) {
      if (!auth) {
        throw new ForbiddenException('No autenticado para aprobar/devolver el PTA.');
      }
      if (auth.approvesAll) {
        // Aprobador integral: aprueba/devuelve todos los niveles del PTA.
        body.isSuperUser = true;
      } else {
        if (!auth.allowedComponents || auth.allowedComponents.length === 0) {
          throw new ForbiddenException('No tiene permisos de aprobación de PTA.');
        }
        // Aprobador por componente: nunca aprobación integral. Sólo puede actuar en
        // los niveles de sus componentes (derivados server-side), no en cualquiera.
        body.isSuperUser = false;
        body.aprobarTodas = false;
        const requested = Number(body?.nivelAprobacion ?? body?.nivel_aprobacion ?? body?.nivel);
        const validRequested = [1, 2, 3].includes(requested) ? requested : null;
        if (validRequested && !auth.approvalLevels.includes(validRequested)) {
          throw new ForbiddenException(
            `No tiene permiso para ${accionLower === 'aprobar' ? 'aprobar' : 'devolver'} en el nivel ${validRequested}. ` +
              `Niveles autorizados: ${auth.approvalLevels.join(', ') || 'ninguno'}.`,
          );
        }
        body.nivelAprobacion = validRequested ?? auth.approvalLevels[0];
        // Fijar la identidad del actor desde el token (integridad de auditoría).
        if (auth.userId) body.actorId = auth.userId;
      }
    }

    // Máquina de estados: calcula el siguiente estado según el actual y la acción.
    if (!nuevoEstado && accion) {
      const a = accion.toLowerCase();
      const estadoActual = existing.estado;

      if (a === 'aprobar') {
        // Aprobación paralela por roles: cada aprobador registra su aval sin
        // avanzar en cadena. El estado solo cambia a Aprobado cuando todos avalan.
        if (isPendingRoleApprovalState(estadoActual)) {
          nuevoEstado = pendingApprovalState(estadoActual);
        } else {
          // fallback para estados legacy
          nuevoEstado = 'Aprobado';
        }
      } else if (a === 'devolver') {
        // En flujo paralelo, el rol que devuelve determina el nivel de revisión.
        if (isPendingRoleApprovalState(estadoActual)) {
          nuevoEstado = pendingApprovalState(estadoActual);
        } else {
          nuevoEstado = 'Devuelto';
        }
      } else if (a.includes('rechaz')) {
        nuevoEstado = 'Rechazado';
      } else if (a === 'reenviar_corregido') {
        // Docente reenvía tras revisión: vuelve a la fase paralela de aprobación.
        nuevoEstado = 'Pendiente Jefatura';
      } else if (a.includes('reenviar')) {
        nuevoEstado = 'Pendiente Jefatura';
      } else if (a === 'avanzar_sin_cambios') {
        // Docente acepta los cambios del revisor sin modificar nada: reabre la
        // aprobación paralela para que todos los roles avalen la versión vigente.
        nuevoEstado = 'Pendiente Jefatura';
      }
    }

    if (!nuevoEstado) {
      nuevoEstado = existing.estado;
    }

    const a = accion?.toLowerCase() || '';
    const hasExplicitEstado = !!coalesceString(body?.estado);
    if (!hasExplicitEstado && (a === 'aprobar' || a === 'devolver') && isPendingRoleApprovalState(existing.estado)) {
      parallelApprovalResult = await this.applyParallelRoleApproval(existing, body, a);
      nuevoEstado = parallelApprovalResult.nuevoEstado;
    }

    if (nuevoEstado === 'Aprobado' && existing.estado !== 'Aprobado') {
      const validation = await this.getRUNDDocente(existing.docenteId);
      const criticos = ['DOCUMENTO_IDENTIDAD', 'VINCULACION', 'DEDICACION', 'ACTO_ADMINISTRATIVO'];
      const noValidados = validation.validaciones.filter(v =>
        criticos.includes(v.campo_rund) && v.estado_documento !== 'Aceptado'
      );

      if (noValidados.length > 0) {
        const nombresFaltantes = noValidados.map(v => v.campo_rund).join(', ');
        // Temporarily deactivated - not blocking PTA approval
        console.warn(
          `[RUND] Aprobación permitida de forma no bloqueante. Faltan validar soportes críticos: ${nombresFaltantes}`
        );
      }
    }

    // ── Lógica multi-jefatura territorial ──────────────────────────────────────
    if (body?.flujoSecuencial === true && existing.estado === 'Pendiente Jefatura' && (a === 'aprobar' || a === 'devolver')) {
      const aprobaciones = await this.aprobacionJefaturaRepo.find({ where: { ptaId } });

      // Limpiar filas huérfanas: si hay >1 fila para la misma territorial, borrar duplicadas
      const byTerritorial = new Map<string, typeof aprobaciones>();
      for (const ap of aprobaciones) {
        const key = ap.territorialId || '__sin_territorial__';
        if (!byTerritorial.has(key)) byTerritorial.set(key, []);
        byTerritorial.get(key)!.push(ap);
      }
      for (const [, filas] of byTerritorial.entries()) {
        if (filas.length <= 1) continue;
        // Conservar la aprobada si existe, si no la última; borrar el resto
        const keeper = filas.find(f => f.decision !== 'pendiente') || filas[filas.length - 1];
        const toDelete = filas.filter(f => f.id !== keeper.id);
        if (toDelete.length > 0) {
          await this.aprobacionJefaturaRepo.delete(toDelete.map(f => f.id));
        }
      }

      // Releer post-limpieza
      const aprobacionesLimpias = await this.aprobacionJefaturaRepo.find({ where: { ptaId } });
      const territoriales = [...new Set(aprobacionesLimpias.map(ap => ap.territorialId).filter(Boolean))];
      const aprobacionesPendientes = aprobacionesLimpias.filter(ap => ap.decision === 'pendiente');

      // Solo aplica flujo multi-jefatura si hay 2+ territoriales DISTINTAS pendientes
      if (territoriales.length >= 2 && aprobacionesPendientes.length >= 2) {
        const actorId = coalesceString(body?.actorId, body?.actor_id);
        const isSuperUser = !!body?.isSuperUser;
        const aprobarTodas = !!body?.aprobarTodas;
        const observaciones = coalesceString(body?.observaciones, body?.comentarios);
        const hayCambios = body?.camposModificados && Object.keys(body.camposModificados).length > 0;

        // Resolver territorialId del actor
        let actorTerritorialId: string | null = coalesceString(body?.actorTerritorialId);
        if (!actorTerritorialId && actorId) {
          const docenteRow = await this.docenteRepo.findOne({ where: { id: actorId } as any });
          if ((docenteRow as any)?.territorialId) actorTerritorialId = (docenteRow as any).territorialId;
        }
        if (!actorTerritorialId && actorId) {
          const prevAprobacion = aprobacionesLimpias.find(ap => ap.jefaturaUserId === actorId);
          if (prevAprobacion) actorTerritorialId = prevAprobacion.territorialId;
        }

        if (a === 'devolver') {
          // Una devolución devuelve todas las aprobaciones
          const toUpdate = actorTerritorialId
            ? aprobacionesLimpias.filter(ap => ap.territorialId === actorTerritorialId)
            : aprobacionesLimpias;
          for (const ap of toUpdate) {
            await this.aprobacionJefaturaRepo.save({ ...ap, decision: 'devuelto', jefaturaUserId: actorId || '', comentarios: observaciones });
          }
          nuevoEstado = 'REVISION_DOCENTE_N1';
        } else {
          // aprobar
          const decision = hayCambios ? 'aprobado_con_cambios' : 'aprobado';
          if (isSuperUser || aprobarTodas || !actorTerritorialId) {
            // Sin territorial asignada o superuser → aprueba todas las pendientes
            for (const ap of aprobacionesLimpias.filter(x => x.decision === 'pendiente')) {
              await this.aprobacionJefaturaRepo.save({ ...ap, decision, jefaturaUserId: actorId || '', comentarios: observaciones || `Aprobado por ${actorId}` });
            }
          } else if (actorTerritorialId) {
            // Buscar por territorial exacta, o por usuario si ya registró antes
            const apRow = aprobacionesLimpias.find(ap => ap.decision === 'pendiente' && (ap.territorialId === actorTerritorialId || ap.jefaturaUserId === actorId));
            if (apRow) await this.aprobacionJefaturaRepo.save({ ...apRow, decision, jefaturaUserId: actorId || '', comentarios: observaciones });
          } else {
            // Fallback: aprobar la primera pendiente (con o sin jefatura asignada)
            const primero = aprobacionesLimpias.find(ap => ap.decision === 'pendiente');
            if (primero) await this.aprobacionJefaturaRepo.save({ ...primero, decision, jefaturaUserId: actorId || '', comentarios: observaciones });
          }

          // Verificar si quedan pendientes
          const pendientes = await this.aprobacionJefaturaRepo.find({ where: { ptaId } });
          const aunPendientes = pendientes.filter(ap => ap.decision !== 'aprobado' && ap.decision !== 'aprobado_con_cambios');

          if (aunPendientes.length > 0) {
            // Aprobación parcial — registrar historial y retornar sin cambiar estado
            await this.historialRepo.save(this.historialRepo.create({
              ptaId, estadoAnterior: existing.estado, estadoNuevo: existing.estado,
              actorId, actorRol: coalesceString(body?.actorRol) || 'Jefatura de Zona',
              tipoAccion: 'APROBACION_PARCIAL_JEFATURA',
              comentarios: observaciones,
              snapshotPta: existing.datosEstructurados ?? null,
              version: existing.version,
            }));
            return {
              parcial: true,
              message: 'Tu aprobación fue registrada. Esperando aprobación de otras jefaturas.',
              nuevoEstado: existing.estado,
              aprobaciones: pendientes,
              pta: this.toPtaDto(existing, await this.getExtMultiplicadores()),
            };
          }

          // Todas aprobaron → determinar siguiente estado
          const algunaConCambios = pendientes.some(ap => ap.decision === 'aprobado_con_cambios');
          nuevoEstado = algunaConCambios ? 'REVISION_DOCENTE_N1' : 'Pendiente Decanatura';
        }
      }
    }

    // ── Bloquear envío a aprobación cuando el PTA no tiene horas programadas ──────────────────────────
    if (isPendingRoleApprovalState(nuevoEstado)) {
      const ds = existing.datosEstructurados as any || {};
      const tieneTotalidad = this.readComplementariasSecciones(ds).aadm
        .some((a: any) => a?.consumeTotalidad === true);
      const horasActuales = existing.horasTotales || 0;
      if (!tieneTotalidad && horasActuales === 0) {
        throw new BadRequestException(
          'El PTA no tiene horas programadas (0h). Guarda el PTA con tus actividades antes de enviarlo a aprobación.',
        );
      }
    }

    // ── Cuando el PTA llega a aprobación, validar datos completos ──────────────────────────
    if (isPendingRoleApprovalState(nuevoEstado)) {
      const ds = existing.datosEstructurados as any || {};
      const tieneTotalidad = this.readComplementariasSecciones(ds).aadm
        .some((a: any) => a?.consumeTotalidad === true);
      if (!tieneTotalidad) {
        const asignaturas = Array.isArray(ds.asignaturas)
          ? ds.asignaturas.filter((a: any) => a?.asignatura_id)
          : [];
        if (asignaturas.length === 0) {
          throw new BadRequestException('Debe incluir al menos una asignatura válida antes de enviar el PTA a aprobación.');
        }
        for (const [idx, asig] of asignaturas.entries()) {
          const label = asig.asignatura_nombre || `Asignatura ${idx + 1}`;
          if (!asig.programa_id) {
            throw new BadRequestException(`Complete el programa de ${label} antes de enviar el PTA.`);
          }
          if (!asig.fecha_inicio || !asig.fecha_fin) {
            throw new BadRequestException(`Complete las fechas de inicio y fin de ${label} antes de enviar el PTA.`);
          }
          const inicio = new Date(`${asig.fecha_inicio}T00:00:00`);
          const fin = new Date(`${asig.fecha_fin}T00:00:00`);
          if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin < inicio) {
            throw new BadRequestException(`El rango de fechas de ${label} no es válido.`);
          }
          const horasAsignatura = Number(asig.total_horas ?? asig.horas);
          if (!Number.isFinite(horasAsignatura) || horasAsignatura <= 0) {
            throw new BadRequestException(`La asignatura ${label} no tiene horas calculadas.`);
          }
        }
      }
    }

    if (isPendingRoleApprovalState(nuevoEstado)) {
      const ds = existing.datosEstructurados as any || {};
      const extMult = await this.getExtMultiplicadores();
      const horas = this.computeHorasTotales(ds, extMult);
      const horasAProgramar =
        Number((existing as any).horasAsignables ?? ds?.horas_a_programar ?? ds?.horasAsignables ?? ds?.horas_asignables) ||
        (await this.calcHorasProgramables({
          tipo_vinculacion: ds?.tipo_vinculacion,
          dedicacion: ds?.dedicacion,
          semanas_vinculacion: ds?.semanas_vinculacion,
        }));
      this.validatePtaForSubmission(ds, horas, horasAProgramar, (await this.getConfiguracionPTAGlobal()) || {});
    }

    const estadoFinal = nuevoEstado || existing.estado || 'Borrador';

    const debeInicializarAprobacionesJefatura =
      isPendingRoleApprovalState(estadoFinal) &&
      (!isPendingRoleApprovalState(existing.estado) ||
        (existing.estado === 'PENDIENTE_APROBACION' && estadoFinal === 'Pendiente Jefatura'));
    if (debeInicializarAprobacionesJefatura && !parallelApprovalResult) {
      await this.resetParallelApprovalWorkflow(ptaId, existing.datosEstructurados);
      await this.resetComponentApprovalWorkflow(ptaId);
    }

    const estadoAnterior = existing.estado;
    const nextVersion = (existing.version || 1) + 1;

    const updated = await this.ptaRepo.save({
      ...existing,
      estado: estadoFinal,
      version: nextVersion,
      motivoDevolucion: body?.motivo_devolucion ?? body?.motivoDevolucion ?? existing.motivoDevolucion,
      datosEstructurados: existing.datosEstructurados,
    });

    await this.historialRepo.save(
      this.historialRepo.create({
        ptaId,
        estadoAnterior,
        estadoNuevo: estadoFinal,
        actorId: coalesceString(body?.actorId, body?.aprobador_id, body?.resueltoPor, body?.actor_id),
        actorRol: coalesceString(body?.actorRol, body?.aprobador_rol, body?.actor_rol),
        tipoAccion: accion,
        comentarios: coalesceString(body?.observaciones, body?.comentarios),
        detallesTransicion: coalesceString(body?.detallesTransicion, body?.detalles_transicion),
        snapshotPta: updated.datosEstructurados ?? null,
        version: updated.version,
      }),
    );

    const ds = existing.datosEstructurados as any;
    await this.logEvento({
      ptaId,
      tipo: 'cambio_estado',
      docenteId: existing.docenteId,
      docenteNombre: coalesceString(ds?.docente_nombre),
      estadoAnterior,
      estadoNuevo: estadoFinal,
      actor: coalesceString(body?.actorId, body?.actor_id),
      actorRol: coalesceString(body?.actorRol, body?.actor_rol),
      sistemaOrigen: body?.sistemaOrigen ?? 'backoffice',
      mensaje: `${estadoAnterior} → ${estadoFinal}`,
      metadata: { accion, observaciones: coalesceString(body?.observaciones, body?.comentarios) },
    });

    // ── Notificación: PTA entró a revisión → avisar a los aprobadores de cada
    // componente pendiente (según su permiso pta.approve.<componente>). Best-effort.
    if (debeInicializarAprobacionesJefatura) {
      try {
        const componentes = await this.getComponentesAprobacion(ptaId);
        const pendientes = componentes
          .filter((c) => c.estado === 'pendiente')
          .map((c) => c.componente);
        if (pendientes.length > 0) {
          await this.ptaNotifications.notifyApproversPtaEnRevision({
            ptaId,
            docenteNombre: coalesceString(ds?.docente_nombre),
            periodo: coalesceString((existing as any).periodo, (ds as any)?.periodo),
            componentes: pendientes,
          });
        }
      } catch (error: any) {
        this.logger.warn(`No se pudo notificar a aprobadores del PTA ${ptaId}: ${error?.message}`);
      }
    }

    return {
      ...(parallelApprovalResult || {}),
      version: updated.version,
      nuevoEstado: estadoFinal,
      pta: this.toPtaDto(updated, await this.getExtMultiplicadores()),
    };
  }

  async getAprobacionesJefatura(ptaId: string) {
    return this.aprobacionJefaturaRepo.find({ where: { ptaId }, order: { createdAt: 'ASC' } });
  }

  private resolveApprovalLevel(body: any): number {
    const explicit = Number(body?.nivelAprobacion ?? body?.nivel_aprobacion ?? body?.nivel);
    if ([1, 2, 3].includes(explicit)) return explicit;
    return approvalLevelFromRole(coalesceString(body?.actorRol, body?.aprobador_rol, body?.actor_rol));
  }

  private async ensureRoleApprovalRows(ptaId: string) {
    const existing = await this.ptaComponentApprovalRepo.find({ where: { ptaId } });
    const existingKeys = new Set(existing.map(row => row.componente));
    const missing = ROLE_APPROVALS
      .filter(item => !existingKeys.has(item.key))
      .map(item => this.ptaComponentApprovalRepo.create({
        ptaId,
        componente: item.key,
        estado: 'pendiente',
        aprobadorRol: item.label,
        scope: 'nivel_aprobacion',
        scopeId: String(item.nivel),
      }));

    if (missing.length > 0) {
      await this.ptaComponentApprovalRepo.save(missing);
    }

    return this.getRoleApprovalRows(ptaId);
  }

  private async getRoleApprovalRows(ptaId: string) {
    const rows = await this.ptaComponentApprovalRepo.find({ where: { ptaId } });
    return rows
      .filter(row => isRoleApprovalComponent(row.componente))
      .sort((a, b) => {
        const na = Number(roleApprovalMetaByLevel(Number(a.scopeId))?.nivel || ROLE_APPROVALS.find(x => x.key === a.componente)?.nivel || 0);
        const nb = Number(roleApprovalMetaByLevel(Number(b.scopeId))?.nivel || ROLE_APPROVALS.find(x => x.key === b.componente)?.nivel || 0);
        return na - nb;
      });
  }

  private async resetParallelApprovalWorkflow(ptaId: string, datosEstructurados: any) {
    await this.ptaComponentApprovalRepo.delete({
      ptaId,
      componente: In([...ROLE_APPROVAL_KEYS]),
    } as any);
    await this.aprobacionJefaturaRepo.delete({ ptaId });
    await this.ensureRoleApprovalRows(ptaId);
    await this.initAprobacionesJefatura(ptaId, datosEstructurados);
  }

  private async resetComponentApprovalWorkflow(ptaId: string) {
    await this.ptaComponentApprovalRepo.delete({
      ptaId,
      // Incluye claves legacy (academicas_admin) para limpiar filas de PTAs no migrados.
      componente: In([...COMPONENT_APPROVAL_KEYS, ...LEGACY_COMPONENT_APPROVAL_KEYS]),
    } as any);
    await this.getComponentesAprobacion(ptaId);
  }

  private async registerJefaturaTerritorialApproval(
    ptaId: string,
    body: any,
    estado: 'aprobado' | 'aprobado_con_cambios' | 'devuelto',
  ) {
    const actorId = coalesceString(body?.actorId, body?.aprobador_id, body?.actor_id) || '';
    const observaciones = coalesceString(body?.observaciones, body?.comentarios);
    const isSuperUser = !!body?.isSuperUser;
    const aprobarTodas = !!body?.aprobarTodas;

    let rows = await this.aprobacionJefaturaRepo.find({ where: { ptaId } });
    if (rows.length === 0) {
      return { complete: true, rows };
    }

    let actorTerritorialId = coalesceString(body?.actorTerritorialId, body?.actor_territorial_id);
    if (!actorTerritorialId && actorId) {
      const docenteRow = await this.docenteRepo.findOne({ where: { id: actorId } as any });
      if ((docenteRow as any)?.territorialId) actorTerritorialId = (docenteRow as any).territorialId;
    }
    if (!actorTerritorialId && actorId) {
      const previous = rows.find(ap => ap.jefaturaUserId === actorId);
      if (previous) actorTerritorialId = previous.territorialId;
    }

    const updateRows = estado === 'devuelto'
      ? (isSuperUser || aprobarTodas
        ? rows
        : actorTerritorialId
          ? rows.filter(ap => ap.territorialId === actorTerritorialId)
          : rows.slice(0, 1))
      : (isSuperUser || aprobarTodas
        ? rows.filter(ap => ap.decision === 'pendiente')
        : actorTerritorialId
          ? rows.filter(ap => ap.decision === 'pendiente' && ap.territorialId === actorTerritorialId)
          : rows.filter(ap => ap.decision === 'pendiente').slice(0, 1));

    const effectiveRows = updateRows.length > 0
      ? updateRows
      : (estado === 'devuelto' ? rows : rows.filter(ap => ap.decision === 'pendiente').slice(0, 1));

    for (const ap of effectiveRows) {
      await this.aprobacionJefaturaRepo.save({
        ...ap,
        decision: estado,
        jefaturaUserId: actorId,
        comentarios: observaciones,
      });
    }

    rows = await this.aprobacionJefaturaRepo.find({ where: { ptaId } });
    const complete = rows.length === 0 || rows.every(ap => ['aprobado', 'aprobado_con_cambios'].includes(ap.decision));
    return { complete, rows };
  }

  private async applyParallelRoleApproval(existing: PlanTrabajoAcademicoEntity, body: any, action: 'aprobar' | 'devolver') {
    const ptaId = existing.id;
    const isSuperUser = !!body?.isSuperUser;
    const aprobarTodas = !!body?.aprobarTodas;
    const actorId = coalesceString(body?.actorId, body?.aprobador_id, body?.actor_id);
    const actorNombre = coalesceString(body?.aprobador_nombre, body?.actorNombre, body?.actor_nombre, body?.actorRol);
    const actorRol = coalesceString(body?.actorRol, body?.aprobador_rol, body?.actor_rol);
    const observaciones = coalesceString(body?.observaciones, body?.comentarios);
    const hayCambios = body?.camposModificados &&
      typeof body.camposModificados === 'object' &&
      Object.keys(body.camposModificados).length > 0;

    await this.ensureRoleApprovalRows(ptaId);

    const level = this.resolveApprovalLevel(body);
    if (!isSuperUser && !aprobarTodas && ![1, 2, 3].includes(level)) {
      throw new BadRequestException('No se pudo determinar el nivel de aprobación del usuario.');
    }

    if (action === 'devolver') {
      const targetLevel = isSuperUser || aprobarTodas ? (level || 1) : level;
      const meta = roleApprovalMetaByLevel(targetLevel) || roleApprovalMetaByLevel(1)!;
      const row = await this.ptaComponentApprovalRepo.findOne({ where: { ptaId, componente: meta.key } });
      if (row) {
        await this.ptaComponentApprovalRepo.save({
          ...row,
          estado: 'devuelto',
          aprobadorId: actorId,
          aprobadorNombre: actorNombre,
          aprobadorRol: actorRol || meta.label,
          comentarios: observaciones,
          fechaAprobacion: new Date(),
          scope: 'nivel_aprobacion',
          scopeId: String(meta.nivel),
        });
      }
      if (meta.nivel === 1) {
        await this.registerJefaturaTerritorialApproval(ptaId, body, 'devuelto');
      }
      return {
        nuevoEstado: meta.revision,
        parcial: false,
        message: `PTA devuelto por ${meta.label}.`,
        aprobacionesNiveles: await this.getRoleApprovalRows(ptaId),
        aprobacionesJefatura: await this.getAprobacionesJefatura(ptaId),
      };
    }

    const targetLevels = isSuperUser || aprobarTodas ? [1, 2, 3] : [level];
    const decision = hayCambios ? 'aprobado_con_cambios' : 'aprobado';

    for (const targetLevel of targetLevels) {
      const meta = roleApprovalMetaByLevel(targetLevel);
      if (!meta) continue;

      if (targetLevel === 1) {
        const jefatura = await this.registerJefaturaTerritorialApproval(ptaId, body, decision);
        if (!jefatura.complete) {
          continue;
        }
      }

      const row = await this.ptaComponentApprovalRepo.findOne({ where: { ptaId, componente: meta.key } });
      if (row) {
        await this.ptaComponentApprovalRepo.save({
          ...row,
          estado: 'aprobado',
          aprobadorId: actorId,
          aprobadorNombre: actorNombre,
          aprobadorRol: actorRol || meta.label,
          comentarios: observaciones,
          fechaAprobacion: new Date(),
          scope: 'nivel_aprobacion',
          scopeId: String(meta.nivel),
        });
      }
    }

    const roleRows = await this.getRoleApprovalRows(ptaId);
    const allApproved = roleRows.length === ROLE_APPROVALS.length && roleRows.every(row => row.estado === 'aprobado');
    const anyReturned = roleRows.some(row => row.estado === 'devuelto');

    if (anyReturned) {
      const returned = roleRows.find(row => row.estado === 'devuelto');
      const meta = ROLE_APPROVALS.find(item => item.key === returned?.componente) || ROLE_APPROVALS[0];
      return {
        nuevoEstado: meta.revision,
        parcial: false,
        message: `PTA devuelto por ${meta.label}.`,
        aprobacionesNiveles: roleRows,
        aprobacionesJefatura: await this.getAprobacionesJefatura(ptaId),
      };
    }

    return {
      nuevoEstado: allApproved ? 'Aprobado' : pendingApprovalState(existing.estado),
      parcial: !allApproved,
      message: allApproved
        ? 'Todas las aprobaciones requeridas fueron registradas. PTA aprobado.'
        : 'Tu aprobación fue registrada. El PTA queda pendiente de las demás aprobaciones.',
      aprobacionesNiveles: roleRows,
      aprobacionesJefatura: await this.getAprobacionesJefatura(ptaId),
    };
  }

  private async initAprobacionesJefatura(ptaId: string, datosEstructurados: any) {
    // Extraer territoriales únicas de las asignaturas del PTA
    const asignaturas: any[] = datosEstructurados?.asignaturas || [];
    const territorialesIds = [...new Set(
      asignaturas.map((a: any) => a.territorial_id).filter(Boolean) as string[]
    )];

    if (territorialesIds.length <= 1) return; // Solo multi-territorial requiere registros

    for (const tId of territorialesIds) {
      const [territorial] = await this.ptaRepo.manager.query(
        `SELECT nom_seccional AS nombre FROM auth.seccionales WHERE id_seccional::text = $1 LIMIT 1`,
        [tId],
      );
      await this.aprobacionJefaturaRepo
        .createQueryBuilder()
        .insert()
        .values({
          ptaId,
          territorialId: tId,
          territorialNombre: (territorial as any)?.nombre || null,
          decision: 'pendiente',
          jefaturaUserId: '',
        })
        .orIgnore() // ON CONFLICT DO NOTHING (unique ptaId+territorialId)
        .execute()
        .catch(() => {});
    }
  }

  // ── Eventos / Realtime sync ────────────────────────────────────────────────

  private async logEvento(opts: {
    ptaId: string; tipo: string; docenteId?: string | null; docenteNombre?: string | null;
    estadoAnterior?: string | null; estadoNuevo?: string | null;
    actor?: string | null; actorRol?: string | null;
    sistemaOrigen?: string; mensaje?: string | null; metadata?: any;
  }) {
    try {
      await this.eventoRepo.save(this.eventoRepo.create({
        ptaId: opts.ptaId,
        tipo: opts.tipo,
        docenteId: opts.docenteId ?? null,
        docenteNombre: opts.docenteNombre ?? null,
        estadoAnterior: opts.estadoAnterior ?? null,
        estadoNuevo: opts.estadoNuevo ?? null,
        actor: opts.actor ?? null,
        actorRol: opts.actorRol ?? null,
        sistemaOrigen: opts.sistemaOrigen ?? 'sistema',
        mensaje: opts.mensaje ?? null,
        leidoBackoffice: false,
        leidoPortal: false,
        metadata: opts.metadata ?? null,
      }));
    } catch { /* non-critical */ }
  }

  async getSyncStatus() {
    const total = await this.eventoRepo.count();
    const unread = await this.eventoRepo.count({ where: { leidoBackoffice: false } as any });
    return { connected: true, counter: total, pending: unread, last_sync: new Date().toISOString() };
  }

  async getRecentEvents(query: any) {
    const qb = this.eventoRepo.createQueryBuilder('ev')
      .orderBy('ev.createdAt', 'DESC')
      .take(50);

    if (query?.docente_id) qb.andWhere('ev.docenteId = :did', { did: query.docente_id });
    if (query?.sistema_origen) qb.andWhere('ev.sistemaOrigen = :so', { so: query.sistema_origen });
    if (query?.since) qb.andWhere('ev.createdAt > :since', { since: new Date(query.since) });

    const rows = await qb.getMany();
    return rows.map(e => ({
      id: e.id,
      tipo: e.tipo,
      pta_id: e.ptaId,
      docente_id: e.docenteId,
      docente_nombre: e.docenteNombre,
      estado_anterior: e.estadoAnterior,
      estado_nuevo: e.estadoNuevo,
      actor: e.actor,
      actor_rol: e.actorRol,
      sistema_origen: e.sistemaOrigen,
      mensaje: e.mensaje,
      leido_backoffice: e.leidoBackoffice,
      leido_portal: e.leidoPortal,
      timestamp: e.createdAt,
      metadata: e.metadata,
    }));
  }

  async markEventsRead(eventIds: string[], sistema: string) {
    if (!eventIds?.length) return;
    const field = sistema === 'portal' ? 'leidoPortal' : 'leidoBackoffice';
    await this.eventoRepo
      .createQueryBuilder()
      .update()
      .set({ [field]: true } as any)
      .where('id IN (:...ids)', { ids: eventIds })
      .execute();
  }

  async getReporteSeguimiento(filters: any) {
    const qb = this.ptaRepo.createQueryBuilder('pta').orderBy('pta.updatedAt', 'DESC').take(500);
    if (filters?.periodo) qb.andWhere('pta.periodo = :periodo', { periodo: String(filters.periodo) });
    if (filters?.estado) qb.andWhere('pta.estado = :estado', { estado: String(filters.estado) });

    const ptas = await qb.getMany();
    const now = Date.now();

    const extMult = await this.getExtMultiplicadores();
    const detalle = ptas.map(p => {
      const dto = this.toPtaDto(p, extMult);
      const diasSinMovimiento = p.updatedAt ? Math.floor((now - new Date(p.updatedAt).getTime()) / 86400000) : 0;
      return { ...dto, diasSinMovimiento };
    });

    const alertas = {
      sinMovimiento7d: detalle.filter(p => p.diasSinMovimiento >= 7 && !['Aprobado','Rechazado','Borrador'].includes(p.estado)).length,
      sobrecarga: detalle.filter(p => (p.total_horas_programadas || 0) > (p.horas_a_programar || 800)).length,
      sinHoras: detalle.filter(p => (p.total_horas_programadas || 0) === 0 && p.estado !== 'Borrador').length,
      escaladosSNA: detalle.filter(p => p.estado === 'ESCALADO_SNA').length,
    };

    return { alertas, detalle, total: detalle.length, generadoEn: new Date().toISOString() };
  }

  async getEvidenciasPTA(ptaId: string) {
    const rows = await this.evidenciaRepo.find({ where: { ptaId }, order: { createdAt: 'DESC' } });
    return rows.map((row) => this.toEvidenciaDto(row));
  }

  async registrarEvidenciaPTA(ptaId: string, body: any) {
    const nombre = coalesceString(body?.nombre, body?.originalName, body?.filename) || 'evidencia';
    const tipoArchivo = coalesceString(body?.tipoArchivo, body?.tipo_archivo, body?.tipo) || 'pdf';
    const tamanioBytes = Number(body?.tamanioBytes ?? body?.tamanio_bytes ?? body?.size ?? 0) || 0;
    const storageUrl = coalesceString(body?.storageUrl, body?.storage_url, body?.url);

    const entity = this.evidenciaRepo.create({
      ptaId,
      nombre,
      tipoArchivo,
      tamanioBytes,
      categoria: coalesceString(body?.categoria) as any,
      componentePta: coalesceString(body?.componentePta, body?.componente_pta) as any,
      horasAvance: Number(body?.horasAvance ?? body?.horas_avance ?? 0) || 0,
      storageUrl: storageUrl,
      subidoPor: coalesceString(body?.subidoPor, body?.subido_por) as any,
      descripcion: coalesceString(body?.descripcion) as any,
      estado: coalesceString(body?.estado) || 'activo',
      estadoRevision: coalesceString(body?.estadoRevision, body?.estado_revision) || 'pendiente',
    });

    const saved = await this.evidenciaRepo.save(entity);
    return this.toEvidenciaDto(saved);
  }

  async eliminarEvidenciaPTA(ptaId: string, evidenciaId: string) {
    await this.evidenciaRepo.delete({ id: evidenciaId, ptaId });
    return { deleted: true };
  }

  async revisarEvidenciaPTA(ptaId: string, evidenciaId: string, body: any) {
    const existing = await this.evidenciaRepo.findOne({ where: { id: evidenciaId, ptaId } });
    if (!existing) throw new NotFoundException('Evidencia no encontrada');

    const decision = coalesceString(body?.decision, body?.estado_revision, body?.estadoRevision);
    const estadoRevision =
      decision === 'aprobado' || decision === 'aprobada'
        ? 'aprobado'
        : decision === 'rechazado' || decision === 'rechazada'
          ? 'rechazado'
          : existing.estadoRevision;

    const updated = await this.evidenciaRepo.save({
      ...existing,
      estadoRevision,
      revisadoPor: coalesceString(body?.revisado_por, body?.revisadoPor) ?? existing.revisadoPor,
      comentarioRevision: coalesceString(body?.observaciones, body?.comentario, body?.comentarioRevision) ?? existing.comentarioRevision,
    });

    return this.toEvidenciaDto(updated);
  }

  async crearSolicitudPTA(body: any) {
    const resolvedDocenteId = await this.resolveDocenteId(coalesceString(body?.docenteId, body?.docente_id) || '');
    const entity = this.solicitudRepo.create({
      docenteId: resolvedDocenteId,
      docenteNombre: coalesceString(body?.docenteNombre, body?.docente_nombre) || '',
      docenteEmail: coalesceString(body?.docenteEmail, body?.docente_email) as any,
      caso: coalesceString(body?.caso) || '',
      razon: coalesceString(body?.razon) || '',
      justificacion: coalesceString(body?.justificacion) || '',
      casoLibre: coalesceString(body?.casoLibre, body?.caso_libre) as any,
      archivos: body?.archivos ?? null,
      estado: 'pendiente',
    });

    return await this.solicitudRepo.save(entity);
  }

  async getMisSolicitudesPTA(docenteId: string) {
    const resolved = await this.resolveDocenteId(docenteId);
    return await this.solicitudRepo.find({ where: { docenteId: resolved }, order: { createdAt: 'DESC' } });
  }

  async marcarSolicitudLeida(solicitudId: string) {
    const existing = await this.solicitudRepo.findOne({ where: { id: solicitudId } });
    if (!existing) throw new NotFoundException('Solicitud no encontrada');
    existing.notificacionLeida = true;
    await this.solicitudRepo.save(existing);
    return { ok: true };
  }

  async resolverSolicitudPTA(solicitudId: string, body: any) {
    const existing = await this.solicitudRepo.findOne({ where: { id: solicitudId } });
    if (!existing) throw new NotFoundException('Solicitud no encontrada');

    existing.estado = coalesceString(body?.decision) === 'aprobado' ? 'aprobado' : coalesceString(body?.decision) === 'denegado' ? 'denegado' : existing.estado;
    existing.resolucionMotivo = coalesceString(body?.motivo) as any;
    existing.resolucionAccion = coalesceString(body?.accion) as any;
    existing.territorialNueva = coalesceString(body?.territorialNueva) as any;
    existing.horasPtaOriginal = body?.horasPtaOriginal ?? existing.horasPtaOriginal;
    existing.horasPtaNuevo = body?.horasPtaNuevo ?? existing.horasPtaNuevo;
    existing.resueltoPor = coalesceString(body?.resueltoPor) as any;
    await this.solicitudRepo.save(existing);
    return existing;
  }

  async getSolicitudesPTA(filters?: { estado?: string }) {
    const qb = this.solicitudRepo.createQueryBuilder('s');
    const estado = coalesceString(filters?.estado)?.toLowerCase();
    if (estado) {
      qb.andWhere('LOWER(s.estado) = :estado', { estado });
    }
    qb.orderBy('s.createdAt', 'DESC');
    qb.take(500);
    return qb.getMany();
  }

  async deletePTA(ptaId: string) {
    await Promise.all([
      this.evidenciaRepo.delete({ ptaId }),
      this.historialRepo.delete({ ptaId }),
    ]);
    await this.ptaRepo.delete({ id: ptaId });
    return { deleted: true };
  }

  // ── Cierre de PTAs al poner "en curso" un nuevo período académico ───────────
  // Cuando un período se activa (estado 'en_curso'), todos los PTA de períodos
  // anteriores pasan a 'Terminado' (solo lectura / observación), incluso los que
  // están en seguimiento. No se tocan los que ya están en un estado terminal.
  async finalizarPtasPorNuevoPeriodo(nuevoCodigo?: string | null): Promise<{ finalizados: number }> {
    const codigo = coalesceString(nuevoCodigo) || '';
    const terminales = ['Terminado', 'TERMINADO', 'Rechazado', 'RECHAZADO'];

    const qb = this.ptaRepo
      .createQueryBuilder()
      .update(PlanTrabajoAcademicoEntity)
      .set({ estado: 'Terminado', updatedAt: () => 'NOW()' })
      .where('estado NOT IN (:...terminales)', { terminales });

    // No finalizar los PTA del propio período recién creado (si llegaran a existir).
    if (codigo) {
      qb.andWhere('(periodo IS DISTINCT FROM :codigo)', { codigo });
    }

    const result = await qb.execute();
    const finalizados = result.affected || 0;
    if (finalizados > 0) {
      this.logger.log(
        `[Período ${codigo || 'nuevo'}] ${finalizados} PTA(s) pasaron a 'Terminado' (solo lectura).`,
      );
    }
    return { finalizados };
  }

  // ── Límite de aprobación: PTAs no aprobados dentro del plazo se eliminan ─────
  // El plazo (en semanas) es configurable vía la regla 'semanas_limite_aprobacion_pta'
  // (Configuraciones PTA). Se cuenta desde la fecha de inicio del PTA (createdAt).
  // Los PTA aprobados, en ejecución o terminales quedan a salvo.
  async purgarPtasVencidos(): Promise<{ eliminados: number; ids: string[]; semanas: number }> {
    const rules = (await this.getConfiguracionPTAGlobal()) || {};
    const semanas = this.getRuleNumber(rules, 'semanas_limite_aprobacion_pta', 4);
    if (!Number.isFinite(semanas) || semanas <= 0) {
      return { eliminados: 0, ids: [], semanas: 0 };
    }

    const cutoff = new Date(Date.now() - semanas * 7 * 24 * 60 * 60 * 1000);

    // Estados "a salvo": aprobado / en ejecución / terminal. El resto (borrador,
    // pendientes de aprobación, devuelto, revisión, concertación, escalado) es
    // elegible para purga si superó el plazo.
    const safe = [
      'Aprobado', 'APROBADO', 'En Firme', 'EN_FIRME', 'RADICADO',
      'EN_EJECUCION', 'EN_EJECUCIÓN', 'Terminado', 'TERMINADO', 'Rechazado', 'RECHAZADO',
    ];

    const vencidos = await this.ptaRepo
      .createQueryBuilder('pta')
      .where('pta.estado NOT IN (:...safe)', { safe })
      .andWhere('pta.createdAt < :cutoff', { cutoff })
      .getMany();

    const ids: string[] = [];
    for (const pta of vencidos) {
      try {
        await this.deletePTA(pta.id);
        ids.push(pta.id);
      } catch (error: any) {
        this.logger.warn(`No se pudo eliminar PTA vencido ${pta.id}: ${error?.message}`);
      }
    }

    this.lastPurgeAt = Date.now();
    if (ids.length > 0) {
      this.logger.log(
        `Purga PTA: ${ids.length} plan(es) eliminados por superar ${semanas} semana(s) sin aprobación.`,
      );
    }
    return { eliminados: ids.length, ids, semanas };
  }

  /** Ejecuta la purga de vencidos como máximo una vez por hora (sweep perezoso). */
  private purgarPtasVencidosThrottled(): void {
    const UNA_HORA = 60 * 60 * 1000;
    if (Date.now() - this.lastPurgeAt < UNA_HORA) return;
    this.lastPurgeAt = Date.now(); // marcar de inmediato para evitar barridos concurrentes
    this.purgarPtasVencidos().catch((error) =>
      this.logger.warn(`Purga PTA (sweep) falló: ${error?.message}`),
    );
  }

  async getAllPtasConEvidencias(periodo?: string) {
    const qb = this.ptaRepo.createQueryBuilder('pta');
    if (periodo) qb.andWhere('pta.periodo = :periodo', { periodo });
    qb.orderBy('pta.updatedAt', 'DESC');
    qb.take(500);
    const ptas = await qb.getMany();
    if (ptas.length === 0) return [];

    const ids = ptas.map((p) => p.id);
    const evidencias = await this.evidenciaRepo
      .createQueryBuilder('ev')
      .where('ev.ptaId IN (:...ids)', { ids })
      .orderBy('ev.createdAt', 'DESC')
      .getMany();

    const evidenciasByPta: Record<string, any[]> = {};
    for (const ev of evidencias) {
      evidenciasByPta[ev.ptaId] ||= [];
      evidenciasByPta[ev.ptaId].push(this.toEvidenciaDto(ev));
    }

    const extMult = await this.getExtMultiplicadores();
    return ptas.map((pta) => ({
      ...this.toPtaDto(pta, extMult),
      evidencias: evidenciasByPta[pta.id] || [],
    }));
  }

  async getConfiguracionPTAGlobal() {
    const keys = ['pta_rules_v2', 'global'];
    for (const key of keys) {
      const row = await this.configuracionRepo.findOne({ where: { id: key } });
      if (row?.rules != null) return this.normalizePtaRules(row.rules);
    }
    return null;
  }

  async saveConfiguracionPTAGlobal(rules: any, userId?: string) {
    this.extMultCache = null; // invalidar caché de multiplicadores al cambiar la config
    const key = 'pta_rules_v2';
    rules = this.normalizePtaRules(rules);

    // ── R7: Lock check ──────────────────────────────────────────────────
    const existing = await this.configuracionRepo.findOne({ where: { id: key } });
    if (existing?.rules?.config_bloqueada && rules?.config_bloqueada !== false) {
      return { _error: 'Configuración bloqueada. Desbloquee antes de guardar.', _warnings: [] };
    }

    // ── R3: Validación de rangos normativos (Circular 003/2025) ──────────
    const warnings: string[] = [];
    const NORMATIVE_RANGES: Record<string, { min: number; max: number; label: string }> = {
      max_pct_investigacion: { min: 0, max: 50, label: 'Tope máx. Investigación' },
      max_horas_investigacion_global: { min: 0, max: 400, label: 'Tope global Investigación' },
      max_pct_extension: { min: 0, max: 25, label: 'Tope máx. Extensión' },
      max_horas_extension_global: { min: 0, max: 200, label: 'Tope global Extensión' },
      max_pct_complementarias: { min: 0, max: 25, label: 'Tope máx. Complementarias' },
      max_horas_complementarias_global: { min: 0, max: 200, label: 'Tope global Complementarias' },
      max_pct_aadm: { min: 0, max: 25, label: 'Tope máx. AADM' },
      max_horas_aadm_global: { min: 0, max: 200, label: 'Tope global AADM' },
      max_pct_inv_ext_combinado: { min: 0, max: 50, label: 'Tope cruzado Inv+Ext' },
      horas_base_carrera_009: { min: 600, max: 800, label: 'Horas base Acuerdo 009' },
      horas_base_carrera_003: { min: 600, max: 900, label: 'Horas base Acuerdo 003' },
      horas_semanales_tc: { min: 20, max: 48, label: 'Horas semanales TC' },
      horas_semanales_mt: { min: 10, max: 24, label: 'Horas semanales MT' },
      min_creditos_docencia: { min: 1, max: 10, label: 'Mín. créditos docencia' },
      min_pct_docencia_no_vinculados: { min: 30, max: 70, label: 'Mín. % docencia no vinculados' },
      criterio_multiplicador_docencia: { min: 1, max: 5, label: 'Multiplicador docencia' },
      dias_cierre_concertacion: { min: 1, max: 30, label: 'Días cierre concertación' },
      dias_limite_radicacion_ggp: { min: 1, max: 30, label: 'Días radicar GGP' },
      dias_verificacion_posterior: { min: 1, max: 30, label: 'Días verificación' },
      sla_consolidacion_nacional: { min: 5, max: 30, label: 'SLA consolidación nacional' },
    };

    if (rules && typeof rules === 'object') {
      const rangeErrors: string[] = [];
      for (const [field, range] of Object.entries(NORMATIVE_RANGES)) {
        const val = rules[field];
        if (val !== undefined && val !== null && val !== '') {
          const numericVal = Number(val);
          if (Number.isFinite(numericVal) && (numericVal < range.min || numericVal > range.max)) {
            rangeErrors.push(`${range.label} (${field}): valor ${numericVal} fuera del rango normativo [${range.min}-${range.max}]`);
          }
        }
      }

      const circularVersion = normalizeEstadoFilter(rules?.circular_version);
      const isCircular003 = circularVersion.includes('003') && circularVersion.includes('2025');
      if (rangeErrors.length > 0) {
        if (isCircular003) {
          return {
            _error: 'Configuracion Circular 003/2025 fuera de rango. No se guardaron los cambios.',
            _warnings: rangeErrors,
          };
        }
        warnings.push(...rangeErrors);
      }

      // ── R8: Cross-validation ────────────────────────────────────────────
      const pctSum = (rules.max_pct_investigacion || 0) + (rules.max_pct_extension || 0) + (rules.max_pct_complementarias || 0);
      if (pctSum > 100) {
        warnings.push(`Suma de porcentajes Inv(${rules.max_pct_investigacion}%) + Ext(${rules.max_pct_extension}%) + Comp(${rules.max_pct_complementarias}%) = ${pctSum}% excede 100%`);
      }
      if ((rules.horas_semanales_mt || 0) >= (rules.horas_semanales_tc || 40)) {
        warnings.push(`Horas MT (${rules.horas_semanales_mt}) deben ser menores que TC (${rules.horas_semanales_tc})`);
      }
      if ((rules.sla_consolidacion_nacional || 0) <= (rules.dias_limite_radicacion_ggp || 0)) {
        warnings.push(`SLA consolidación (${rules.sla_consolidacion_nacional}) debe ser > plazo radicación GGP (${rules.dias_limite_radicacion_ggp})`);
      }
    }

    // ── R5: Audit trail — calcular campos modificados ────────────────────
    const changedFields: string[] = [];
    if (existing?.rules && rules && typeof rules === 'object') {
      const AUDIT_SKIP = ['config_changelog', 'config_snapshots', 'fecha_inicio_semestre', 'fecha_fin_semestre'];
      for (const k of Object.keys(rules)) {
        if (AUDIT_SKIP.includes(k)) continue;
        const oldVal = existing.rules[k];
        const newVal = rules[k];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changedFields.push(k);
        }
      }
    }

    // ── R12: Save snapshot before applying changes ───────────────────────
    if (changedFields.length > 0 && existing?.rules) {
      const snapshots = Array.isArray(rules.config_snapshots) ? [...rules.config_snapshots] : [];
      const { config_snapshots: _cs, config_changelog: _cl, ...snapshotData } = existing.rules;
      snapshots.push({
        fecha: new Date().toISOString().slice(0, 19).replace('T', ' '),
        usuario: userId || 'sistema',
        snapshot: snapshotData,
        label: `Antes de ${changedFields.length} cambio(s)`,
      });
      // Keep only last 10 snapshots
      rules.config_snapshots = snapshots.slice(-10);
    }

    // Append changelog entry if there are actual changes
    if (changedFields.length > 0) {
      const changelog = Array.isArray(rules.config_changelog) ? [...rules.config_changelog] : [];
      changelog.push({
        fecha: new Date().toISOString().slice(0, 19).replace('T', ' '),
        usuario: userId || 'sistema',
        campos_modificados: changedFields,
        nota: warnings.length > 0 ? `⚠ ${warnings.length} advertencia(s) normativa(s)` : undefined,
      });
      // Keep only last 50 entries
      rules.config_changelog = changelog.slice(-50);
    }

    const saved = await this.configuracionRepo.save(
      existing
        ? { ...existing, rules: rules ?? null }
        : this.configuracionRepo.create({ id: key, rules: rules ?? null }),
    );

    // ── R13: Notify on config change (fire-and-forget) ──────────────────
    if (changedFields.length > 0) {
      this.notifyConfigChange(userId || 'sistema', changedFields, warnings).catch(() => {});
    }

    // ── R14: SLA alerts check (fire-and-forget) ─────────────────────────
    if (rules?.fecha_inicio_semestre) {
      this.checkSLADeadlines(rules).catch(() => {});
    }

    return { ...(saved.rules ?? {}), _warnings: warnings.length > 0 ? warnings : undefined };
  }

  // ── R13: Notify stakeholders of config changes ──────────────────────────
  private async notifyConfigChange(usuario: string, campos: string[], warnings: string[]) {
    try {
      const payload = {
        type: 'config_pta_change',
        title: 'Configuración PTA actualizada',
        message: `${usuario} modificó ${campos.length} campo(s): ${campos.slice(0, 5).join(', ')}${campos.length > 5 ? '...' : ''}`,
        severity: warnings.length > 0 ? 'warning' : 'info',
        metadata: { campos, warnings, usuario, fecha: new Date().toISOString() },
      };
      await fetch('http://localhost:3009/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {}); // non-blocking
    } catch { /* non-critical */ }
  }

  // ── R14: Check SLA deadlines and generate alerts ────────────────────────
  private async checkSLADeadlines(rules: any) {
    try {
      const fechaInicio = rules.fecha_inicio_semestre ? new Date(rules.fecha_inicio_semestre) : null;
      if (!fechaInicio || isNaN(fechaInicio.getTime())) return;

      const hoy = new Date();
      const slaFields = [
        { key: 'dias_cierre_concertacion', label: 'Cierre de concertación', dias: rules.dias_cierre_concertacion },
        { key: 'dias_limite_radicacion_ggp', label: 'Radicación GGP', dias: rules.dias_limite_radicacion_ggp },
        { key: 'sla_consolidacion_nacional', label: 'Consolidación nacional', dias: rules.sla_consolidacion_nacional },
      ];

      for (const sla of slaFields) {
        if (!sla.dias) continue;
        const deadline = new Date(fechaInicio);
        deadline.setDate(deadline.getDate() + (sla.dias * 7 / 5)); // business days to calendar days approx
        const daysLeft = Math.ceil((deadline.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft > 0 && daysLeft <= 7) {
          await fetch('http://localhost:3009/notifications/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'sla_alert',
              title: `⏰ SLA próximo a vencer: ${sla.label}`,
              message: `Faltan ${daysLeft} día(s) para el ${sla.label} (${deadline.toLocaleDateString()})`,
              severity: daysLeft <= 3 ? 'critical' : 'warning',
            }),
          }).catch(() => {});
        }
      }
    } catch { /* non-critical */ }
  }

  async getPTAUserData(userId: string) {
    const row = await this.userDataRepo.findOne({ where: { userId } });
    if (!row) return null;
    return {
      pinned_pta_ids: Array.isArray(row.pinned) ? row.pinned : [],
      saved_tags: Array.isArray(row.tags) ? row.tags : [],
      notes: row.notes && typeof row.notes === 'object' ? row.notes : {},
      favorite_views: Array.isArray(row.priority) ? row.priority : [],
    };
  }

  async savePTAUserData(userId: string, data: any) {
    const existing = await this.userDataRepo.findOne({ where: { userId } });
    const next = {
      pinned: data?.pinned_pta_ids ?? existing?.pinned ?? [],
      tags: data?.saved_tags ?? existing?.tags ?? [],
      notes: data?.notes ?? existing?.notes ?? {},
      priority: data?.favorite_views ?? existing?.priority ?? [],
    };

    const saved = await this.userDataRepo.save(
      existing
        ? { ...existing, ...next }
        : this.userDataRepo.create({ userId, ...next }),
    );

    return {
      pinned_pta_ids: Array.isArray(saved.pinned) ? saved.pinned : [],
      saved_tags: Array.isArray(saved.tags) ? saved.tags : [],
      notes: saved.notes && typeof saved.notes === 'object' ? saved.notes : {},
      favorite_views: Array.isArray(saved.priority) ? saved.priority : [],
    };
  }

  async seedPTAs() {
    const docentes = await this.docenteRepo.find({ take: 3, order: { createdAt: 'DESC' } });
    const periodo = '2026-1';
    const estados = ['BORRADOR', 'Pendiente Jefatura', 'Aprobado'];
    let created = 0;

    for (let i = 0; i < docentes.length; i++) {
      const docenteId = docentes[i]?.id;
      if (!docenteId) continue;
      const estado = estados[i % estados.length];
      await this.savePTA({
        docente_id: docenteId,
        periodo,
        estado,
        _adminEdit: true,
        docente_nombre: `Docente ${i + 1}`,
        programa: 'Programa Demo',
        territorial: 'Territorial Demo',
        horas_totales: 40,
      });
      created += 1;
    }

    return { created };
  }

  // ─────────────────────────────
  // Catálogos (migración legacy)
  // ─────────────────────────────
  async getCatalogoProgramas() {
    const progs = await this.programaRepo.find({ order: { nombre: 'ASC' } });
    const nivelFormacionMap: Record<string, string> = {
      pregrado: 'Pregrado',
      especializacion: 'Especialización',
      maestria: 'Maestría',
    };
    return progs.map((p: any) => ({
      ...p,
      nivel: nivelFormacionMap[p.tipo] || p.tipo || 'Pregrado',
    }));
  }

  async getCatalogoAsignaturas(query?: any) {
    const q = query || {};
    const programaId = coalesceString(q.programaId, q.programa_id);
    const completo = String(q.completo || '').toLowerCase() === 'true';

    const params: any[] = [];
    const where = !completo && programaId
      ? (() => {
          params.push(programaId);
          return `WHERE a.id_programa::text = $1 OR p.id::text = $1 OR p.codigo = $1`;
        })()
      : '';

    const rows = await this.asignaturaRepo.query(
      `
      SELECT
        a.id,
        a.id_programa AS "programaId",
        a.nombre,
        a.codigo,
        a.creditos,
        a.horas_fijas_pta AS horas,
        a.id_nucleo_tematico AS "nucleoTematico",
        nt.nombre AS "nucleoTematicoNombre",
        a.id_ubicacion_semestral AS semestre_id,
        us.etiqueta AS semestre_etiqueta,
        a.modalidad,
        a.tipo_excepcion AS tipo,
        a.created_at AS "createdAt",
        a.updated_at AS "updatedAt",
        p.id AS programa_real_id,
        p.codigo AS programa_codigo,
        p.nombre AS programa_nombre,
        p.tipo AS programa_nivel,
        p.activo AS programa_estado,
        p.id_facultad AS programa_facultad,
        p.modalidad AS programa_modalidad
      FROM academic_work_plan.asignatura a
      LEFT JOIN academic_work_plan.programa p
        ON p.id = a.id_programa
      LEFT JOIN academic_work_plan.ubicacion_semestral us
        ON us.id = a.id_ubicacion_semestral
      LEFT JOIN academic_work_plan.nucleo_tematico nt
        ON nt.id = a.id_nucleo_tematico
      ${where}
      ORDER BY a.nombre ASC
      LIMIT 5000
      `,
      params,
    );

    return rows.map((a: any) => ({
      id: a.id,
      programaId: a.programaId,
      programa_id: a.programa_real_id || a.programaId,
      nombre: a.nombre,
      codigo: a.codigo,
      creditos: a.creditos,
      horas: a.horas,
      nucleoTematico: a.nucleoTematicoNombre || a.nucleoTematico,
      nucleo: a.nucleoTematicoNombre || 'General',
      semestre: a.semestre_etiqueta || a.semestre_id,
      modalidad: a.modalidad,
      tipo: a.tipo,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      programa: a.programa_real_id ? {
        id: a.programa_real_id,
        codigo: a.programa_codigo,
        nombre: a.programa_nombre,
        descripcion: a.programa_descripcion,
        estado: a.programa_estado,
        nivel: a.programa_nivel,
        facultad: a.programa_facultad,
        modalidad: a.programa_modalidad,
      } : null,
    }));
  }

  async getCatalogoTerritoriales(periodo?: string) {
    const params: any[] = [];
    let queryStr = '';

    if (periodo) {
      params.push(periodo);
      queryStr = `
        WITH active_sedes AS (
           SELECT DISTINCT s.id_sede
           FROM (
             SELECT mapping.id_sede
             FROM auth.sede_cetap_mapping mapping
             INNER JOIN academic_work_plan.periodo_cetap pc ON pc.id_cetap = mapping.id_cetap AND pc.activo = TRUE
             INNER JOIN academic_work_plan.periodo_academico per ON per.id = pc.id_periodo_academico AND per.codigo = $1
             UNION
             SELECT sede.id_sede
             FROM auth.sedes sede
             INNER JOIN academic_work_plan.cetap cetap ON cetap.codigo = sede.cod_sede
             INNER JOIN academic_work_plan.periodo_cetap pc ON pc.id_cetap = cetap.id AND pc.activo = TRUE
             INNER JOIN academic_work_plan.periodo_academico per ON per.id = pc.id_periodo_academico AND per.codigo = $1
           ) s
        )
        SELECT
          sec.id_seccional::text AS id,
          sec.nom_seccional AS nombre,
          sec.cod_seccional AS codigo,
          COALESCE(
            json_agg(
              json_build_object(
                'id', sede.id_sede::text,
                'territorialId', sec.id_seccional::text,
                'nombre', sede.nom_sede,
                'municipio', NULL,
                'codigo', sede.cod_sede
              )
              ORDER BY sede.nom_sede
            ) FILTER (WHERE sede.id_sede IS NOT NULL AND sede.id_sede IN (SELECT id_sede FROM active_sedes)),
            '[]'::json
          ) AS sedes
        FROM auth.seccionales sec
        INNER JOIN auth.sedes sede ON sede.id_seccional = sec.id_seccional
        WHERE sede.id_sede IN (SELECT id_sede FROM active_sedes)
        GROUP BY sec.id_seccional, sec.nom_seccional, sec.cod_seccional
        ORDER BY sec.nom_seccional ASC
      `;
    } else {
      queryStr = `
        SELECT
          sec.id_seccional::text AS id,
          sec.nom_seccional AS nombre,
          sec.cod_seccional AS codigo,
          COALESCE(
            json_agg(
              json_build_object(
                'id', sede.id_sede::text,
                'territorialId', sec.id_seccional::text,
                'nombre', sede.nom_sede,
                'municipio', NULL,
                'codigo', sede.cod_sede
              )
              ORDER BY sede.nom_sede
            ) FILTER (WHERE sede.id_sede IS NOT NULL),
            '[]'::json
          ) AS sedes
        FROM auth.seccionales sec
        LEFT JOIN auth.sedes sede ON sede.id_seccional = sec.id_seccional
        GROUP BY sec.id_seccional, sec.nom_seccional, sec.cod_seccional
        ORDER BY sec.nom_seccional ASC
      `;
    }

    return await this.ptaRepo.manager.query(queryStr, params);
  }

  async getCatalogoCetaps(query?: any) {
    const territorialId = coalesceString(query?.territorial_id, query?.territorialId);
    const periodo = coalesceString(query?.periodo);

    const params: any[] = [];
    let queryStr = '';

    if (periodo) {
      params.push(periodo); // $1
      let whereTerritorial = '';
      if (territorialId) {
        params.push(territorialId); // $2
        whereTerritorial = 'AND sede.id_seccional::text = $2';
      }
      queryStr = `
        WITH active_sedes AS (
           SELECT DISTINCT s.id_sede
           FROM (
             SELECT mapping.id_sede
             FROM auth.sede_cetap_mapping mapping
             INNER JOIN academic_work_plan.periodo_cetap pc ON pc.id_cetap = mapping.id_cetap AND pc.activo = TRUE
             INNER JOIN academic_work_plan.periodo_academico per ON per.id = pc.id_periodo_academico AND per.codigo = $1
             UNION
             SELECT sede.id_sede
             FROM auth.sedes sede
             INNER JOIN academic_work_plan.cetap cetap ON cetap.codigo = sede.cod_sede
             INNER JOIN academic_work_plan.periodo_cetap pc ON pc.id_cetap = cetap.id AND pc.activo = TRUE
             INNER JOIN academic_work_plan.periodo_academico per ON per.id = pc.id_periodo_academico AND per.codigo = $1
           ) s
        )
        SELECT
          sede.id_sede::text AS id,
          sede.id_seccional::text AS "territorialId",
          sede.nom_sede AS nombre,
          NULL AS municipio,
          sede.cod_sede AS codigo
        FROM auth.sedes sede
        WHERE sede.id_sede IN (SELECT id_sede FROM active_sedes)
        ${whereTerritorial}
        ORDER BY sede.nom_sede ASC
      `;
    } else {
      let whereTerritorial = '';
      if (territorialId) {
        params.push(territorialId); // $1
        whereTerritorial = 'WHERE sede.id_seccional::text = $1';
      }
      queryStr = `
        SELECT
          sede.id_sede::text AS id,
          sede.id_seccional::text AS "territorialId",
          sede.nom_sede AS nombre,
          NULL AS municipio,
          sede.cod_sede AS codigo
        FROM auth.sedes sede
        ${whereTerritorial}
        ORDER BY sede.nom_sede ASC
      `;
    }

    return await this.ptaRepo.manager.query(queryStr, params);
  }

  /**
   * CETAPs filtrados por programa (via oferta_cetap_programa).
   * Retorna solo los CETAPs que tienen oferta activa para el programa dado.
   * Opcionalmente filtra por territorial (dirección territorial del cetap).
   */
  async getCetapsPorPrograma(query?: any) {
    const programaId = coalesceString(query?.programa_id, query?.programaId);
    const territorialId = coalesceString(query?.territorial_id, query?.territorialId);

    if (!programaId) {
      // Sin programa, retorna vacío (el frontend debería pasar siempre el programa)
      return [];
    }

    const params: any[] = [programaId];
    let whereExtra = '';
    if (territorialId) {
      params.push(territorialId);
      whereExtra = `AND dt.id::text = $${params.length}`;
    }

    return await this.ptaRepo.manager.query(
      `
      SELECT
        c.id::text AS id,
        c.codigo,
        c.nombre,
        c.id_direccion_territorial::text AS "territorialId",
        dt.nombre AS "territorialNombre",
        ocp.cupos_estimados AS "cuposEstimados",
        ocp.id::text AS "ofertaId"
      FROM academic_work_plan.oferta_cetap_programa ocp
      JOIN academic_work_plan.cetap c ON c.id = ocp.id_cetap
      JOIN academic_work_plan.direccion_territorial dt ON dt.id = c.id_direccion_territorial
      WHERE ocp.id_programa::text = $1
        AND ocp.activa = true
        AND c.activo = true
        ${whereExtra}
      ORDER BY c.nombre ASC
      `,
      params,
    );
  }

  /**
   * Programas ofertados en un CETAP dado.
   * Acepta TANTO auth.sedes.id_sede COMO academic_work_plan.cetap.id como cetapId.
   *
   * Strategy: Single query that handles both ID spaces:
   *   - Direct: cetap.id = $1  (if the caller passes academic_work_plan.cetap.id)
   *   - Bridge: auth.sedes.id_sede = $1 → match by cod_sede → cetap.codigo
   */
  async getProgramasPorSede(query?: any) {
    const sedeId = coalesceString(query?.cetap_id, query?.sede_id, query?.cetapId);
    const periodoCodigo = query?.periodo;

    if (!sedeId) {
      return [];
    }

    const params: any[] = [sedeId];
    let joinPeriodo = '';
    
    if (periodoCodigo) {
      params.push(periodoCodigo);
      joinPeriodo = `
        INNER JOIN academic_work_plan.periodo_academico per
          ON ocp.id_periodo_academico = per.id AND per.codigo = $2
      `;
    }

    console.log('[BACKEND DEBUG] getProgramasPorSede params:', { sedeId, periodoCodigo, params });

    // Single query: try direct cetap.id match OR bridge via auth.sedes.cod_sede
    const raw = await this.ptaRepo.manager.query(
      `
      SELECT DISTINCT
        p.id::text AS id,
        p.codigo,
        p.nombre,
        p.nombre_corto AS "nombreCorto",
        p.tipo,
        p.modalidad,
        p.horas_base_por_credito AS "horasBasePorCredito",
        p.horas_pregrado_central AS "horasPregradoCentral"
      FROM academic_work_plan.programa p
      INNER JOIN academic_work_plan.oferta_cetap_programa ocp
        ON ocp.id_programa = p.id AND ocp.activa = true
      ${joinPeriodo}
      INNER JOIN academic_work_plan.cetap c
        ON c.id = ocp.id_cetap AND c.activo = true
      WHERE p.activo = true
        AND (
          -- Match 1: direct cetap.id
          c.id::text = $1
          -- Match 2: bridge via auth.sedes.cod_sede -> cetap.codigo
          OR c.codigo IN (
            SELECT s.cod_sede FROM auth.sedes s WHERE s.id_sede::text = $1
          )
          -- Match 3: bridge via auth.sedes name (accent-insensitive fallback)
          OR translate(LOWER(c.nombre), 'áéíóúÁÉÍÓÚ', 'aeiouaeiou')
             = translate(LOWER((SELECT s.nom_sede FROM auth.sedes s WHERE s.id_sede::text = $1 LIMIT 1)), 'áéíóúÁÉÍÓÚ', 'aeiouaeiou')
        )
      ORDER BY p.nombre ASC
      `,
      params,
    );

    const nivelFormacionMap: Record<string, string> = {
      pregrado: 'Pregrado',
      especializacion: 'Especialización',
      maestria: 'Maestría',
    };
    return raw.map((p: any) => ({
      ...p,
      nivel: nivelFormacionMap[p.tipo] || p.tipo || 'Pregrado',
    }));
  }

  /**
   * Obtiene cupos_estimados para la combinación CETAP + Programa.
   * Usado para auto-llenar el campo "Estudiantes" en el formulario PTA.
   * Acepta auth.sedes.id_sede o academic_work_plan.cetap.id como cetapId.
   */
  async getOfertaCetapPrograma(query?: any) {
    const cetapId = coalesceString(query?.cetap_id, query?.cetapId);
    const programaId = coalesceString(query?.programa_id, query?.programaId);

    if (!cetapId || !programaId) {
      return { cupos_estimados: null };
    }

    const rows = await this.ptaRepo.manager.query(
      `
      SELECT ocp.cupos_estimados
      FROM academic_work_plan.oferta_cetap_programa ocp
      JOIN academic_work_plan.cetap c ON c.id = ocp.id_cetap
      WHERE ocp.id_programa::text = $2
        AND ocp.activa = true
        AND (
          c.id::text = $1
          OR c.codigo IN (SELECT s.cod_sede FROM auth.sedes s WHERE s.id_sede::text = $1)
        )
      LIMIT 1
      `,
      [cetapId, programaId],
    );

    return {
      cupos_estimados: rows.length > 0 ? rows[0].cupos_estimados : null,
    };
  }

  async getDocentesDisponibles(query?: any) {
    const periodo = coalesceString(query?.periodo);
    const docentes = await this.ptaRepo.manager.query(`
      SELECT
        d.*,
        json_build_object(
          'id', p.id_person,
          'identificacion', p.num_identificacion,
          'tipo_identificacion', p.tip_identificacion,
          'primer_nombre', p.nom_tercero,
          'primer_apellido', p.pri_apellido,
          'segundo_apellido', p.seg_apellido,
          'telefono', p.tel_celular,
          'genero', p.gen_tercero,
          'fecha_nacimiento', p.fec_nacimiento,
          'correo_alternativo', NULL,
          'usuario', json_build_object(
            'id', u.id_user,
            'email', u.username,
            'nombre', p.nom_largo,
            'activo', u.is_active
          )
        ) AS persona,
        json_build_object(
          'id', sec.id_seccional::text,
          'nombre', sec.nom_seccional,
          'codigo', sec.cod_seccional
        ) AS territorial,
        CASE
          WHEN sede.id_sede IS NULL THEN NULL
          ELSE json_build_object(
            'id', sede.id_sede::text,
            'territorialId', sede.id_seccional::text,
            'nombre', sede.nom_sede,
            'codigo', sede.cod_sede
          )
        END AS sede
      FROM academic_work_plan."Docente" d
      LEFT JOIN auth.personas p ON p.id_person = d."personaId"
      LEFT JOIN auth."user" u ON u.id_person = p.id_person
      LEFT JOIN auth.seccionales sec ON sec.id_seccional::text = COALESCE(d."territorialId", p.id_seccional::text)
      LEFT JOIN auth.sedes sede ON sede.id_sede::text = COALESCE(d."sedeId", p.id_sede::text)
      ORDER BY d."ordenListado" ASC NULLS LAST, d."createdAt" DESC
      LIMIT 5000
    `);

    const docenteIds = docentes.map((d) => d.id);
    const ptas = docenteIds.length
      ? await this.ptaRepo.find({
          where: {
            docenteId: In(docenteIds),
            ...(periodo ? { periodo } : {}),
          } as any,
          order: { updatedAt: 'DESC' },
          take: 5000,
        })
      : [];

    const extMult = await this.getExtMultiplicadores();
    const ptasByDocente: Record<string, any[]> = {};
    for (const pta of ptas) {
      ptasByDocente[pta.docenteId] ||= [];
      ptasByDocente[pta.docenteId].push(this.toPtaDto(pta, extMult));
    }

    return docentes.map((d: any) => ({
      ...d,
      persona: d.persona
        ? {
            ...d.persona,
            usuario: this.safeUsuario(d.persona.usuario),
          }
        : null,
      territorial: d.territorial ?? null,
      sede: d.sede ?? null,
      ptas: ptasByDocente[d.id] || [],
    }));
  }

  async getOfertaAcademica(_query?: any) {
    return await this.asignaturaRepo.find({
      relations: { programaRel: true },
      order: { nombre: 'ASC' },
      take: 5000,
    });
  }

  async getCatalogoRolesInvestigacion() {
    const rules = (await this.getConfiguracionPTAGlobal()) as any;
    if (Array.isArray(rules?.inv_roles) && rules.inv_roles.length > 0) return rules.inv_roles;
    return [
      { id: 'ROL_001', nombre: 'INVESTIGADOR LÍDER DE PROYECTO', horas_max: 400, pct_max: 50 },
      { id: 'ROL_002', nombre: 'COINVESTIGADOR', horas_max: 300, pct_max: 37.5 },
      { id: 'ROL_003', nombre: 'ASISTENTE DE INVESTIGACIÓN NIVEL II', horas_max: 200, pct_max: 25 },
    ];
  }

  async getCatalogoActividadesExtension() {
    const rules = (await this.getConfiguracionPTAGlobal()) as any;
    if (rules?.ext_actividades && typeof rules.ext_actividades === 'object' && Object.keys(rules.ext_actividades).length > 0) {
      return this.normalizeExtensionActivities(rules.ext_actividades);
    }
    // Fallback: actividades por defecto idénticas a defaultPTARules
    return this.normalizeExtensionActivities({
      capacitacion: [
        { id: 'CAP_01', nombre: 'Orientación de Talleres', max_horas: 16 },
        { id: 'CAP_02', nombre: 'Orientación de Seminarios', max_horas: 32 },
        { id: 'CAP_03', nombre: 'Orientación de Cursos', max_horas: 64 },
        { id: 'CAP_04', nombre: 'Orientación de Diplomados', max_horas: 160 },
      ],
      seleccion: [
        {
          id: 'SEL_01',
          nombre: 'Revisión y validación de estructuras de prueba',
          items: [
            { nombre: 'Capacitación sobre la prueba', tipo: 'fija', horas: 1 },
            { nombre: 'Sesiones de validación', tipo: 'hasta', horas: 2 },
          ],
        },
        {
          id: 'SEL_02',
          nombre: 'Definición y operacionalización de constructos',
          items: [
            { nombre: 'Capacitación sobre la prueba', tipo: 'fija', horas: 1 },
            { nombre: 'Sesiones de validación', tipo: 'hasta', horas: 2 },
          ],
        },
        {
          id: 'SEL_03',
          nombre: 'Construcción y validación de casos',
          items: [
            { nombre: 'Capacitación', tipo: 'fija', horas: 2 },
            { nombre: 'Construcción de casos', tipo: 'hasta', horas: 4 },
            { nombre: 'Sesiones de revisión de casos', tipo: 'hasta', horas: 3 },
            { nombre: 'Sesiones de validación de casos', tipo: 'hasta', horas: 3 },
          ],
        },
        {
          id: 'SEL_04',
          nombre: 'Validación de ítems',
          items: [
            { nombre: 'Capacitación', tipo: 'fija', horas: 2 },
            { nombre: 'Sesiones de revisión', tipo: 'hasta', horas: 1 },
          ],
        },
        {
          id: 'SEL_05',
          nombre: 'Análisis de evidencias de validez en instrumentos de medición',
          items: [
            { nombre: 'Capacitación sobre la prueba', tipo: 'fija', horas: 1 },
            { nombre: 'Sesiones de revisión', tipo: 'hasta', horas: 1.5 },
          ],
        },
        {
          id: 'SEL_06',
          nombre: 'Grupos de discusión sobre instrumentos de medición',
          items: [
            { nombre: 'Capacitación sobre la prueba', tipo: 'fija', horas: 1 },
            { nombre: 'Sesiones de revisión', tipo: 'hasta', horas: 1.5 },
          ],
        },
        {
          id: 'SEL_07',
          nombre: 'Jurados — Prueba de Conocimientos (Componente escrito)',
          items: [
            { nombre: 'Asistir a capacitación virtual para la Jornada', tipo: 'fija', horas: 2 },
            { nombre: 'Asistir y fungir como Jurado (Jornada completa)', tipo: 'fija', horas: 12 },
          ],
        },
        {
          id: 'SEL_08',
          nombre: 'Jurados — Prueba de Conocimientos (Pruebas de ejecución / oral)',
          items: [
            { nombre: 'Asistir a capacitación virtual para la Jornada', tipo: 'fija', horas: 2 },
            { nombre: 'Asistir y fungir como Jurado (Jornada completa)', tipo: 'fija', horas: 12 },
          ],
        },
        {
          id: 'SEL_09',
          nombre: 'Jurados — Valoración de Antecedentes',
          items: [
            { nombre: 'Asistir a capacitación virtual para la Jornada', tipo: 'fija', horas: 2 },
            { nombre: 'Revisión y validación de hojas de vida', tipo: 'hasta', horas: 1.5 },
          ],
        },
        {
          id: 'SEL_10',
          nombre: 'Jurados — Entrevista',
          items: [
            { nombre: 'Asistir a capacitación virtual para la Jornada', tipo: 'fija', horas: 2 },
            { nombre: 'Aplicación y registro de entrevistas', tipo: 'hasta', horas: 1.5 },
          ],
        },
        {
          id: 'SEL_11',
          nombre: 'Jurados — Reclamaciones / Recursos de reposición',
          items: [
            { nombre: 'Asistir a capacitación virtual para la Jornada', tipo: 'fija', horas: 2 },
            { nombre: 'Revisión y respuesta a reclamaciones', tipo: 'hasta', horas: 2 },
          ],
        },
      ],
      fortalecimiento: [
        {
          id: 'FOR_01',
          nombre: 'Retroalimentación línea temática (Asistencia Técnica)',
          items: [
            { nombre: 'Análisis de anexos técnicos de las líneas temáticas', tipo: 'hasta', horas: 80 }
          ]
        },
        {
          id: 'FOR_02',
          nombre: 'Batería de indicadores (Asistencia Técnica)',
          items: [
            { nombre: 'Proponer/presentar batería de indicadores', tipo: 'hasta', horas: 80 }
          ]
        },
        {
          id: 'FOR_03',
          nombre: 'Planeación del desarrollo del proyecto (Rediseño)',
          items: [
            { nombre: 'Análisis de info primaria e instrumentos de recolección', tipo: 'hasta', horas: 40 },
            { nombre: 'Organización y presentación del plan de trabajo', tipo: 'hasta', horas: 40 }
          ]
        },
        {
          id: 'FOR_04',
          nombre: 'Análisis y diagnóstico institucional (Rediseño)',
          items: [
            { nombre: 'Recolección, análisis y control de info en campo', tipo: 'hasta', horas: 80 },
            { nombre: 'Análisis de factores externos e internos', tipo: 'hasta', horas: 80 },
            { nombre: 'Análisis de info asociada a la producción (cargas de trabajo)', tipo: 'hasta', horas: 100 }
          ]
        },
        {
          id: 'FOR_05',
          nombre: 'Arquitectura institucional (Rediseño)',
          items: [
            { nombre: 'Análisis de procesos, productos, estructura, planta y manual', tipo: 'hasta', horas: 100 }
          ]
        },
        {
          id: 'FOR_06',
          nombre: 'Actos administrativos y acompañamiento (Rediseño)',
          items: [
            { nombre: 'Elaboración de actos administrativos y orientación de trámite', tipo: 'hasta', horas: 40 }
          ]
        }
      ],
      // Estas sub-secciones traen sus ítems reales desde el catálogo de completaciones
      // (antes venían con items:[] y dependían del backfill; ahora son autosuficientes).
      laboratorio_innovacion: EXTENSION_ACTIVITY_COMPLETIONS.laboratorio_innovacion,
      investigacion_aplicada: EXTENSION_ACTIVITY_COMPLETIONS.investigacion_aplicada,
      alto_gobierno: EXTENSION_ACTIVITY_COMPLETIONS.alto_gobierno,
    });
  }

  async getCatalogoSeccionesExtension() {
    const rules = (await this.getConfiguracionPTAGlobal()) as any;
    if (Array.isArray(rules?.ext_secciones) && rules.ext_secciones.length > 0) return rules.ext_secciones;
    // Fallback: secciones fijas segun Circular 003/2025.
    return normalizeExtensionSections(null);
  }

  async getCatalogoActividadesInvestigacion() {
    const rules = (await this.getConfiguracionPTAGlobal()) as any;
    if (Array.isArray(rules?.inv_actividades) && rules.inv_actividades.length > 0) {
      return rules.inv_actividades.map((a: any) => ({ ...a, max_horas: a.horas_max }));
    }
    // Fallback normativo — Tabla 4, Circular 003/2025
    return [
      { id: 'INV_ACT_001', nombre: 'Líder de Semillero de Investigación reconocido por la SNI', horas_max: 120, max_horas: 120 },
      { id: 'INV_ACT_002', nombre: 'Enlace Territorial de Investigaciones', horas_max: 200, max_horas: 200, pct_max: 25 },
      { id: 'INV_ACT_003', nombre: 'Líder o Director de Grupo de Investigación (avalado por SNI)', horas_max: 200, max_horas: 200, pct_max: 25 },
      { id: 'INV_ACT_004', nombre: 'Par Evaluador de Propuestas de Proyecto de Investigación', horas_max: 20, max_horas: 20, por_unidad: true },
      { id: 'INV_ACT_005', nombre: 'Par Evaluador de Resultados y/o Productos de Investigación', horas_max: 20, max_horas: 20, por_unidad: true },
      { id: 'INV_ACT_006', nombre: 'Diseño de Cursos de Formación en Investigación (PNFI)', horas_max: 32, max_horas: 32, por_unidad: true },
      { id: 'INV_ACT_007', nombre: 'Capacitador en Cursos de Formación en Investigación (PNFI)', horas_max: 32, max_horas: 32, por_unidad: true },
      { id: 'INV_ACT_008', nombre: 'Producción Individual de Artículo Científico (proyecto finalizado)', horas_max: 96, max_horas: 96, por_unidad: true },
      { id: 'INV_ACT_009', nombre: 'Producción Individual de Libro (mín. 3 capítulos, proyecto finalizado)', horas_max: 144, max_horas: 144, por_unidad: true },
    ];
  }

  // Aplana una actividad de comp_actividades_v2 al shape plano que consume el catálogo
  // ({ id, nombre, max_horas, min_horas?, consumeTotalidad }).
  private flattenCompV2Activity(a: any): any {
    const itemHours = Array.isArray(a?.items)
      ? a.items.map((it: any) => Number(it?.horas || 0)).filter((n: number) => Number.isFinite(n))
      : [];
    const maxHoras = a?.max_horas ?? (itemHours.length ? Math.max(...itemHours) : 0);
    return {
      id: a?.id,
      nombre: a?.nombre,
      max_horas: a?.consumeTotalidad ? null : maxHoras,
      min_horas: a?.min_horas,
      consumeTotalidad: Boolean(a?.consumeTotalidad),
    };
  }

  private flattenCompV2Section(rules: any, sectionKey: string): any[] {
    const v2 = rules?.comp_actividades_v2;
    const arr = v2 && typeof v2 === 'object' ? v2[sectionKey] : null;
    return Array.isArray(arr) ? arr.map((a: any) => this.flattenCompV2Activity(a)) : [];
  }

  async getCatalogoActividadesComplementarias() {
    const rules = (await this.getConfiguracionPTAGlobal()) as any;
    if (Array.isArray(rules?.comp_actividades) && rules.comp_actividades.length > 0) return rules.comp_actividades;
    // Fallback: derivar de la sección v2 (por si dejan de escribirse los arrays legacy).
    return this.flattenCompV2Section(rules, 'complementarias_docencia');
  }

  async getCatalogoActividadesAcademicoAdmin() {
    const rules = (await this.getConfiguracionPTAGlobal()) as any;
    if (Array.isArray(rules?.aadm_actividades) && rules.aadm_actividades.length > 0) return rules.aadm_actividades;
    return this.flattenCompV2Section(rules, 'academico_administrativas');
  }

  // Catálogo agrupado por sección para la pestaña unificada de Complementarias del docente.
  // Devuelve las secciones (parametrizables desde config) y sus actividades.
  async getCatalogoComplementariasAgrupado() {
    const rules = (await this.getConfiguracionPTAGlobal()) as any;
    const secciones = Array.isArray(rules?.comp_secciones) && rules.comp_secciones.length > 0
      ? rules.comp_secciones
      : FIXED_COMP_SECCIONES;
    const actividades: Record<string, any[]> = {};
    for (const sec of secciones) {
      const key = sec?.key;
      if (!key) continue;
      if (key === 'complementarias_docencia') {
        actividades[key] = await this.getCatalogoActividadesComplementarias();
      } else if (key === 'academico_administrativas') {
        actividades[key] = await this.getCatalogoActividadesAcademicoAdmin();
      } else {
        actividades[key] = this.flattenCompV2Section(rules, key);
      }
    }
    return { secciones, actividades };
  }

  async getEstadisticas(periodo?: string | null) {
    const qb = this.ptaRepo.createQueryBuilder('pta').select(['pta.estado']);
    if (periodo) qb.andWhere('pta.periodo = :periodo', { periodo });
    const ptas = await qb.getMany();

    const total = ptas.length;
    const estadoCounts: Record<string, number> = {};
    for (const p of ptas) {
      const e = (p as any).estado || 'SIN_ESTADO';
      estadoCounts[e] = (estadoCounts[e] || 0) + 1;
    }

    const totalAprobados = (estadoCounts['Aprobado'] || 0) + (estadoCounts['APROBADO'] || 0);
    const totalRechazados = (estadoCounts['Rechazado'] || 0) + (estadoCounts['RECHAZADO'] || 0) + (estadoCounts['Devuelto'] || 0);
    const totalPendientes = total - totalAprobados - totalRechazados;

    const totalDocentes = await this.docenteRepo.count();

    return {
      totalDocentes,
      totalAprobados,
      totalPendientes,
      totalRechazados,
      porPrograma: [],
      porSede: [],
      total,
      estadoCounts,
      periodo: periodo || null,
    };
  }

  // ─────────────────────────────
  // OTP (firma electrónica) — migración legacy
  // ─────────────────────────────
  private resolveNotificationsBaseUrl(): string {
    const direct = process.env.NOTIFICATIONS_SERVICE_URL || process.env.NOTIFICATION_SERVICE_URL;
    if (direct) return direct.replace(/\/$/, '');
    if ((process.env.NODE_ENV || 'development') !== 'production') return 'http://localhost:3009';
    return 'http://notifications-service:3009';
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 3))}@${domain}`;
  }

  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private async sendFirmaOtpEmail(input: {
    to: string;
    code: string;
    fullName: string;
    periodo?: string | null;
    etapaLabel?: string | null;
    expiresAt: Date;
  }): Promise<void> {
    const baseUrl = this.resolveNotificationsBaseUrl();
    const subject = 'Código de validación - Plan de Trabajo Académico ESAP';
    const minutes = Math.max(1, Math.round((input.expiresAt.getTime() - Date.now()) / 60000));
    const fullName = this.escapeHtml(input.fullName || 'docente');
    const periodo = input.periodo ? this.escapeHtml(input.periodo) : null;
    const etapaLabel = input.etapaLabel ? this.escapeHtml(input.etapaLabel) : null;
    const code = this.escapeHtml(input.code);
    const text = [
      `Hola ${input.fullName || 'docente'},`,
      '',
      `Tu código de validación para firmar el PTA es: ${input.code}`,
      input.periodo ? `Periodo: ${input.periodo}` : null,
      input.etapaLabel ? `Proceso: ${input.etapaLabel}` : null,
      `Este código vence en ${minutes} minutos.`,
      '',
      'Si no solicitaste este código, ignora este mensaje.',
    ].filter(Boolean).join('\n');
    const html = `
      <div style="margin:0;padding:32px 16px;background-color:#eef2f7;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#111827;">
        <table width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
          <tr>
            <td align="center">
              <table width="560" cellspacing="0" cellpadding="0" border="0" role="presentation" style="width:100%;max-width:560px;background-color:#ffffff;border:1px solid #dbe3ef;border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="height:6px;background-color:#3b82f6;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="background-color:#0f49b5;padding:26px 28px 22px 28px;">
                    <table width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
                      <tr>
                        <td>
                          <div style="font-size:21px;font-weight:800;line-height:1;color:#ffffff;letter-spacing:0.2px;">ESAP</div>
                          <div style="margin-top:6px;font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:#bfdbfe;">Plan de Trabajo Académico</div>
                        </td>
                        <td align="right" style="vertical-align:middle;">
                          <span style="display:inline-block;padding:5px 14px;border-radius:999px;background-color:rgba(255,255,255,0.18);color:#ffffff;font-size:11px;font-weight:700;">Firma PTA</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px 28px 10px 28px;">
                    <h1 style="margin:0 0 10px 0;font-size:22px;line-height:1.25;font-weight:800;color:#111827;">Código de validación</h1>
                    <p style="margin:0 0 26px 0;font-size:14px;line-height:1.65;color:#667085;">
                      Hola ${fullName}. Ingresa este código para continuar con la firma de tu Plan de Trabajo Académico. Es de un solo uso y tiene vigencia limitada.
                    </p>

                    <table width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
                      <tr>
                        <td align="center">
                          <div style="display:inline-block;min-width:210px;padding:18px 16px;border-radius:9px;border:2px solid #bfdbfe;background-color:#eff6ff;text-align:center;">
                            <span style="font-size:30px;line-height:1;font-weight:800;letter-spacing:10px;color:#1d4ed8;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">${code}</span>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <table width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation" style="margin-top:24px;margin-bottom:20px;">
                      ${periodo ? `
                      <tr>
                        <td style="padding:4px 0;font-size:14px;line-height:1.5;color:#374151;">
                          <strong style="color:#111827;">Periodo:</strong> ${periodo}
                        </td>
                      </tr>` : ''}
                      ${etapaLabel ? `
                      <tr>
                        <td style="padding:4px 0;font-size:14px;line-height:1.5;color:#374151;">
                          <strong style="color:#111827;">Proceso:</strong> ${etapaLabel}
                        </td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding:4px 0;font-size:14px;line-height:1.5;color:#374151;">
                          <strong style="color:#111827;">Vigencia:</strong> ${minutes} minutos
                        </td>
                      </tr>
                    </table>

                    <table width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation" style="margin:0 0 24px 0;background-color:#fffbeb;border:1px solid #fcd34d;border-radius:8px;">
                      <tr>
                        <td style="padding:12px 16px;font-size:13px;line-height:1.5;color:#92400e;">
                          <strong>Importante:</strong> Si no solicitaste este código, puedes ignorar este mensaje con seguridad.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 28px 18px 28px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:12px;line-height:1.5;color:#98a2b3;">ESAP — Escuela Superior de Administración Pública</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;

    try {
      const response = await fetch(`${baseUrl}/api/v1/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: input.to, subject, text, html }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`notifications-service ${response.status}: ${body}`);
      }
    } catch (error: any) {
      const message = error?.message || String(error);
      this.logger.warn(`No se pudo enviar OTP de firma PTA a ${input.to}: ${message}`);
      throw new InternalServerErrorException('No se pudo enviar el código de validación al correo registrado.');
    }
  }

  private buildFirmaOtpKey(input: { verificationId?: string | null; ptaId?: string | null; docenteId?: string | null }): string {
    const verificationId = coalesceString(input.verificationId);
    if (verificationId) return verificationId;

    const ptaId = coalesceString(input.ptaId);
    if (ptaId) return `pta:${ptaId}`;

    const docenteId = coalesceString(input.docenteId);
    if (docenteId) return `docente:${docenteId}`;

    throw new BadRequestException('Se requiere ptaId o docenteId para generar el código de firma.');
  }

  async requestFirmaDocenteOtp(payload: {
    ptaId?: string | null;
    docenteId?: string | null;
    periodo?: string | null;
    etapaLabel?: string | null;
  }) {
    const docenteId = coalesceString(payload?.docenteId);
    if (!docenteId) throw new BadRequestException('docenteId es requerido para enviar el código de firma.');

    const docente = await this.fetchAuthDocenteInfo(docenteId);
    if (!docente.email && !this.MOCK_FIRMA_OTP) {
      throw new BadRequestException('El docente no tiene correo registrado para enviar el código de validación.');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const verificationId = this.buildFirmaOtpKey({ ptaId: payload?.ptaId, docenteId });

    this.logger.log(`🔑 [PRUEBAS] Código de firma generado para ${docente.email || 'docente sin correo'}: ${code}`);

    // En modo mock no intentamos enviar correo (cualquier código sirve igual).
    if (!this.MOCK_FIRMA_OTP && docente.email) {
      try {
        await this.sendFirmaOtpEmail({
          to: docente.email,
          code,
          fullName: docente.fullName,
          periodo: payload?.periodo,
          etapaLabel: payload?.etapaLabel,
          expiresAt,
        });
      } catch (emailError) {
        const isDev = (process.env.NODE_ENV || 'development') !== 'production';
        if (isDev) {
          this.logger.warn(`⚠️  [DEV] Email de firma OTP falló — código OTP para ${docente.email}: ${code}`);
          this.logger.warn(`⚠️  [DEV] Usa este código para firmar en desarrollo local.`);
        } else {
          throw emailError;
        }
      }
    }

    this.otpStore.set(verificationId, { code, expiresAt });

    return {
      verificationId,
      expiresAt: expiresAt.toISOString(),
      email: docente.email ? this.maskEmail(docente.email) : 'correo no registrado',
      devCode: code,
    };
  }

  verifyFirmaDocenteOtp(payload: { verificationId?: string | null; code?: string | null }) {
    const verificationId = coalesceString(payload?.verificationId);
    if (!verificationId) throw new BadRequestException('verificationId es requerido.');
    this.verifyOtp(verificationId, String(payload?.code || ''), { consume: true });
    return { verified: true };
  }

  generateOtp(ptaId: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    this.otpStore.set(ptaId, { code, expiresAt });
    // En producción esto debería enviarse por correo/SMS. Por ahora se loguea para dev.
    // eslint-disable-next-line no-console
    console.log(`[OTP][PTA] ${ptaId} → código: ${code} | expira: ${expiresAt.toISOString()}`);
    return { expiresAt: expiresAt.toISOString() };
  }

  verifyOtp(ptaId: string, otp: string, { consume }: { consume: boolean }) {
    if (!otp || String(otp).length !== 6) {
      throw new Error('OTP inválido. Debe tener 6 dígitos.');
    }

    // MOCK: cualquier código de 6 dígitos avanza el flujo. No se valida contra
    // el código generado ni la expiración. Útil para pruebas mientras el envío
    // real de correo no esté disponible.
    if (this.MOCK_FIRMA_OTP) {
      this.logger.warn(`[MOCK-OTP] Validación de firma mockeada para "${ptaId}" — cualquier código de 6 dígitos es aceptado.`);
      if (consume) this.otpStore.delete(ptaId);
      return true;
    }

    const stored = this.otpStore.get(ptaId);
    if (!stored) {
      throw new Error('No hay código activo para este PTA. Genera uno nuevo.');
    }
    if (new Date() > stored.expiresAt) {
      this.otpStore.delete(ptaId);
      throw new Error('El código expiró (5 min). Genera uno nuevo.');
    }
    if (stored.code !== String(otp)) {
      throw new Error('Código incorrecto. Verifica e intenta de nuevo.');
    }

    if (consume) this.otpStore.delete(ptaId);
    return true;
  }

  async signWithOtp(ptaId: string, payload: { otp: string; nuevoEstado?: string }) {
    this.verifyOtp(ptaId, payload?.otp, { consume: true });

    const existing = await this.ptaRepo.findOne({ where: { id: ptaId } });
    if (!existing) throw new NotFoundException('PTA no encontrado');

    const estadoDestino = coalesceString(payload?.nuevoEstado) || 'Pendiente Jefatura';
    const updated = await this.updatePTAStatus(ptaId, { estado: estadoDestino, actorId: existing.docenteId, actorRol: 'Docente' });

    const certNumber =
      'CERT-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString().slice(-4);

    return {
      pta: updated.pta,
      certificado: certNumber,
      signedAt: new Date().toISOString(),
    };
  }

  async getComponentesAprobacion(ptaId: string) {
    const list = await this.ptaComponentApprovalRepo.find({ where: { ptaId } });
    const componentList = list.filter(item => !isRoleApprovalComponent(item.componente));

    // Fetch PTA content to determine which components have hours
    const ptaEntity = await this.ptaRepo.findOne({ where: { id: ptaId } });
    const ds = (ptaEntity?.datosEstructurados as any) || {};

    const asignaturas: any[] = Array.isArray(ds.asignaturas) ? ds.asignaturas : [];
    const invActs: any[] = Array.isArray(ds.investigacion_actividades) ? ds.investigacion_actividades : [];
    const extActs: any[] = Array.isArray(ds.extension_actividades) ? ds.extension_actividades : [];
    const { docencia: compDocencia, aadm: compAadm } = this.readComplementariasSecciones(ds);

    const hDocencia = asignaturas.reduce((s: number, a: any) => s + (Number(a?.total_horas ?? a?.horas) || 0), 0);
    const hInv = Number(ds.investigacion_proyecto?.horas_solicitadas || 0) ||
      invActs.reduce((s: number, a: any) => s + (Number(a?.horas_total ?? a?.horas) || 0), 0);
    // Complementarias unificado = sección docencia + sección académico-administrativa.
    const hComp = compDocencia.reduce((s: number, a: any) => s + (Number(a?.horas) || 0), 0)
      + compAadm.reduce((s: number, a: any) => s + (Number(a?.horas) || 0), 0);

    const extMult = await this.getExtMultiplicadores();
    const extBySeccion = (secciones: string[]) =>
      extActs
        .filter((a: any) => secciones.includes(normalizeExtensionSectionKey(a?.seccion)))
        .reduce((s: number, a: any) => {
          const m = this.multiplicadorDeExt(a, extMult);
          const h = m === 1
            ? Number(a?.horas ?? 0)
            : Number(a?.horas_ejecutadas ?? a?.horas ?? 0) * m;
          return s + h;
        }, 0);

    // Nota: las actividades de extensión se canonizan a las 4 secciones fijas
    // (normalizeExtensionSectionKey mapea cualquier sección desconocida a
    // 'fortalecimiento'), por lo que no existe componente comodín "otras".

    const horasPorComponente: Record<string, number> = {
      academica: hDocencia,
      investigacion: hInv,
      ext_capacitacion: extBySeccion(['capacitacion']),
      ext_procesos: extBySeccion(['seleccion']),
      ext_fortalecimiento: extBySeccion(['fortalecimiento']),
      ext_gobierno: extBySeccion(['alto_gobierno']),
      complementarias: hComp,
    };

    const todosComponentes = Object.keys(horasPorComponente);

    // Si todos los arrays están vacíos, probablemente hay un problema de datos
    // (e.g. actividades filtradas incorrectamente al guardar). No auto-aprobar nada.
    const totalActividades =
      asignaturas.length + invActs.length + extActs.length + compDocencia.length + compAadm.length;
    const hayActividades = totalActividades > 0;

    const byComponent = new Map(componentList.map(item => [item.componente, item]));
    const toSave: PtaComponentApprovalEntity[] = [];

    for (const c of todosComponentes) {
      const tieneHoras = horasPorComponente[c] > 0;
      const autoAprobar = hayActividades && !tieneHoras;
      const existing = byComponent.get(c);

      if (!existing) {
        const item = this.ptaComponentApprovalRepo.create({
          ptaId,
          componente: c,
          estado: autoAprobar ? 'aprobado' : 'pendiente',
          ...(autoAprobar ? {
            aprobadorNombre: 'Sistema',
            comentarios: 'Sin actividades - aprobacion automatica',
            fechaAprobacion: new Date(),
          } : {}),
        });
        byComponent.set(c, item);
        toSave.push(item);
        continue;
      }

      if (autoAprobar && existing.estado === 'pendiente') {
        existing.estado = 'aprobado';
        existing.aprobadorNombre = existing.aprobadorNombre || 'Sistema';
        existing.comentarios = existing.comentarios || 'Sin actividades - aprobacion automatica';
        existing.fechaAprobacion = existing.fechaAprobacion || new Date();
        toSave.push(existing);
      }
    }

    if (toSave.length > 0) {
      await this.ptaComponentApprovalRepo.save(toSave);
    }

    return todosComponentes
      .map(c => byComponent.get(c))
      .filter((item): item is PtaComponentApprovalEntity => !!item);
  }

  async aprobarComponente(ptaId: string, body: any, auth?: PtaAuthenticatedUser) {
    const componente = coalesceString(body?.componente);
    const estado = coalesceString(body?.estado); // 'aprobado' o 'devuelto'
    if (!componente || !estado) {
      throw new BadRequestException('Componente y estado son requeridos');
    }
    if (!COMPONENT_APPROVAL_KEY_SET.has(componente)) {
      throw new BadRequestException(`Componente PTA no soportado: ${componente}`);
    }

    // ── Autorización server-side ──────────────────────────────────────────────
    // La autorización se resuelve desde los permisos reales del usuario (auth.ptaAuth,
    // poblado por PtaAuthGuard a partir de auth.role_permissions), NO desde el body.
    // Esto impide que un cliente se auto-otorgue permisos enviando isSuperUser=true
    // o componentesAutorizados manipulados.
    if (!auth) {
      // Defensa en profundidad: el guard debería haber poblado esto siempre.
      throw new ForbiddenException('No autenticado para aprobar componentes del PTA.');
    }
    if (!auth.isSuperUser && !auth.allowedComponents.includes(componente as any)) {
      const permisoRequerido = COMPONENT_PERMISSION[componente as keyof typeof COMPONENT_PERMISSION];
      throw new ForbiddenException(
        `No tiene permisos para aprobar el componente "${componente}" del PTA.` +
          (permisoRequerido ? ` Se requiere el permiso: ${permisoRequerido}.` : ''),
      );
    }

    const existingPta = await this.ptaRepo.findOne({ where: { id: ptaId } });
    if (!existingPta) {
      throw new NotFoundException('PTA no encontrado');
    }
    if (['Terminado', 'TERMINADO'].includes(String(existingPta.estado))) {
      throw new BadRequestException('El PTA está terminado (solo lectura) y no admite cambios.');
    }

    let approval = await this.ptaComponentApprovalRepo.findOne({ where: { ptaId, componente } });
    if (!approval) {
      approval = this.ptaComponentApprovalRepo.create({
        ptaId,
        componente,
        estado: 'pendiente',
      });
    }

    approval.estado = estado;
    // La identidad del aprobador proviene del token (integridad de auditoría), con
    // fallback al body para compatibilidad.
    approval.aprobadorId = auth.userId || coalesceString(body?.aprobadorId, body?.aprobador_id);
    approval.aprobadorNombre = auth.name || coalesceString(body?.aprobadorNombre, body?.aprobador_nombre);
    approval.aprobadorRol = coalesceString(body?.aprobadorRol, body?.aprobador_rol) || (auth.roles || []).join(', ') || null;
    approval.comentarios = coalesceString(body?.comentarios, body?.observaciones);
    approval.scope = coalesceString(body?.scope);
    approval.scopeId = coalesceString(body?.scopeId, body?.scope_id);
    approval.fechaAprobacion = new Date();

    await this.ptaComponentApprovalRepo.save(approval);

    // Recalcular estado consolidado del PTA
    const todosComponentes = await this.getComponentesAprobacion(ptaId);
    
    const estadoActualPta = existingPta.estado;
    let nuevoEstadoPta = estadoActualPta;
    const hayDevueltos = todosComponentes.some(c => c.estado === 'devuelto');
    const todosAprobados = todosComponentes.every(c => c.estado === 'aprobado');

    if (hayDevueltos) {
      nuevoEstadoPta = COMPONENT_REVISION_STATE[componente] || 'Devuelto';
    } else if (todosAprobados) {
      nuevoEstadoPta = isPendingRoleApprovalState(estadoActualPta) ? 'Aprobado' : estadoActualPta;
    }

    if (existingPta.estado !== nuevoEstadoPta) {
      const estadoAnterior = existingPta.estado;
      existingPta.estado = nuevoEstadoPta;
      existingPta.version = (existingPta.version || 1) + 1;
      
      if (hayDevueltos) {
        existingPta.motivoDevolucion = `Componente ${componente} devuelto: ${approval.comentarios || 'Sin comentarios'}`;
      }

      if (nuevoEstadoPta === 'Pendiente Jefatura') {
        await this.initAprobacionesJefatura(ptaId, existingPta.datosEstructurados);
      }

      await this.ptaRepo.save(existingPta);

      // Registrar historial de estados
      await this.historialRepo.save(
        this.historialRepo.create({
          ptaId,
          estadoAnterior,
          estadoNuevo: nuevoEstadoPta,
          actorId: approval.aprobadorId || 'sistema',
          actorRol: approval.aprobadorRol || 'Aprobador',
          tipoAccion: estado === 'aprobado' ? 'APROBACION_COMPONENTE' : 'DEVOLUCION_COMPONENTE',
          comentarios: approval.comentarios,
          snapshotPta: existingPta.datosEstructurados ?? null,
          version: existingPta.version,
        }),
      );

      // Registrar evento realtime
      const ds = existingPta.datosEstructurados as any;
      await this.logEvento({
        ptaId,
        tipo: 'cambio_estado',
        docenteId: existingPta.docenteId,
        docenteNombre: coalesceString(ds?.docente_nombre),
        estadoAnterior,
        estadoNuevo: nuevoEstadoPta,
        actor: approval.aprobadorId,
        actorRol: approval.aprobadorRol,
        sistemaOrigen: 'backoffice',
        mensaje: `Componente ${componente} ${estado}. Estado general: ${nuevoEstadoPta}`,
        metadata: { componente, estado, comentarios: approval.comentarios },
      });
    } else {
      // Registrar evento de actualización de componente sin cambiar estado global
      const ds = existingPta.datosEstructurados as any;
      await this.logEvento({
        ptaId,
        tipo: 'actualizacion_componente',
        docenteId: existingPta.docenteId,
        docenteNombre: coalesceString(ds?.docente_nombre),
        estadoAnterior: existingPta.estado,
        estadoNuevo: existingPta.estado,
        actor: approval.aprobadorId,
        actorRol: approval.aprobadorRol,
        sistemaOrigen: 'backoffice',
        mensaje: `Componente ${componente} actualizado a ${estado}`,
        metadata: { componente, estado, comentarios: approval.comentarios },
      });
    }

    // ── Notificación de vuelta al profesor cuando el componente fue APROBADO.
    // Texto: "Esta componente ha sido aprobada por [Nombre del aprobador]". Best-effort.
    if (estado === 'aprobado') {
      try {
        await this.ptaNotifications.notifyProfesorComponenteAprobado({
          ptaId,
          docenteId: existingPta.docenteId,
          componente,
          aprobadorNombre: approval.aprobadorNombre,
        });
      } catch (error: any) {
        this.logger.warn(`No se pudo notificar al profesor del PTA ${ptaId}: ${error?.message}`);
      }
    }

    return {
      approval,
      estadoGeneral: nuevoEstadoPta,
    };
  }

  async getRUNDDocente(docenteId: string) {
    let docente = await this.docenteRepo.findOne({
      where: [{ id: docenteId }, { personaId: docenteId }]
    });

    if (!docente) {
      try {
        const info = await this.fetchAuthDocenteInfo(docenteId, { adminEdit: true });
        if (info && info.personId) {
          docente = await this.docenteRepo.findOne({
            where: [{ id: info.personId }, { personaId: info.personId }]
          });
        }
      } catch (err) {
        // ignore
      }
    }

    if (!docente) {
      throw new NotFoundException(`Docente ${docenteId} no encontrado`);
    }

    const valRows = await this.ptaRepo.manager.query(
      `SELECT * FROM academic_work_plan.validacion_documental WHERE docente_id = $1`,
      [docente.id]
    );

    if (valRows.length === 0) {
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
        await this.ptaRepo.manager.query(
          `INSERT INTO academic_work_plan.validacion_documental (docente_id, campo_rund, tipo_documento_soporte, estado_documento)
           VALUES ($1, $2, $3, 'Sin cargar')
           ON CONFLICT (docente_id, campo_rund) DO NOTHING`,
          [docente.id, item.campo, item.tipo]
        );
      }

      const reQuery = await this.ptaRepo.manager.query(
        `SELECT * FROM academic_work_plan.validacion_documental WHERE docente_id = $1`,
        [docente.id]
      );
      valRows.push(...reQuery);
    }

    const total = valRows.length;
    const aceptados = valRows.filter((r: any) => r.estado_documento === 'Aceptado').length;
    const completitud = total > 0 ? Math.round((aceptados / total) * 100) : 0;

    return {
      docenteId: docente.id,
      personaId: docente.personaId,
      completitud,
      validaciones: valRows.map((r: any) => ({
        id: r.id,
        campo_rund: r.campo_rund,
        tipo_documento_soporte: r.tipo_documento_soporte,
        estado_documento: r.estado_documento,
        fecha_carga: r.fecha_carga,
        fecha_validacion: r.fecha_validacion,
        validado_por: r.validado_por,
        observacion: r.observacion
      }))
    };
  }

  async syncRUNDDocuments(docenteId: string, documentos: any[]) {
    let docente = await this.docenteRepo.findOne({
      where: [{ id: docenteId }, { personaId: docenteId }]
    });

    if (!docente) {
      try {
        const info = await this.fetchAuthDocenteInfo(docenteId, { adminEdit: true });
        if (info && info.personId) {
          docente = await this.docenteRepo.findOne({
            where: [{ id: info.personId }, { personaId: info.personId }]
          });
        }
      } catch (err) {
        // ignore
      }
    }

    if (!docente) {
      throw new NotFoundException(`Docente ${docenteId} no encontrado`);
    }

    await this.getRUNDDocente(docente.id);

    const catMap: Record<string, string> = {
      personal: 'IDENTIDAD',
      contacto: 'CONTACTO',
      academico: 'FORMACION',
      formacion: 'FORMACION',
      laboral: 'VINCULACION',
      vinculacion: 'VINCULACION',
      certificados: 'ESCALAFON',
      escalafon: 'ESCALAFON',
      administrativo: 'SITUACION',
      situacion: 'SITUACION',
      otros: 'EVALUACION',
      evaluacion: 'EVALUACION'
    };

    const stateMap: Record<string, string> = {
      validado: 'Aceptado',
      aprobado: 'Aceptado',
      aceptado: 'Aceptado',
      pendiente: 'Pendiente',
      rechazado: 'Rechazado',
      vencido: 'Rechazado',
      'sin cargar': 'Sin cargar',
      'no aplica': 'No aplica'
    };

    for (const doc of documentos) {
      const cat = String(doc.categoria || '').toLowerCase().trim();
      const rawState = String(doc.estado || '').toLowerCase().trim();
      const targetSupportType = catMap[cat];
      const targetState = stateMap[rawState] || 'Sin cargar';

      if (targetSupportType) {
        await this.ptaRepo.manager.query(
          `UPDATE academic_work_plan.validacion_documental
           SET estado_documento = $1,
               id_documento_carpeta = $2,
               fecha_carga = COALESCE($3, fecha_carga),
               fecha_validacion = COALESCE($4, fecha_validacion),
               validado_por = COALESCE($5, validado_por),
               observacion = COALESCE($6, observacion),
               updated_at = now()
           WHERE docente_id = $7 AND tipo_documento_soporte = $8`,
          [
            targetState,
            doc.id || null,
            doc.fecha_subida || new Date().toISOString(),
            doc.fecha_validacion || (targetState === 'Aceptado' ? new Date().toISOString() : null),
            doc.validado_por || null,
            doc.comentarios || null,
            docente.id,
            targetSupportType
          ]
        );
      }
    }

    return this.getRUNDDocente(docente.id);
  }

  // ═══════════════════════════════════════════════════════════════════
  // Dashboard KPIs — real data from PTAs
  // ═══════════════════════════════════════════════════════════════════
  async getDashboardKPIs(periodo?: string): Promise<any> {
    const targetPeriodo = periodo || '2025-2';

    // 1. Fetch all PTAs for the period
    const ptas = await this.ptaRepo.find({ where: { periodo: targetPeriodo } });

    // 2. Pipeline counts
    const pipeline = {
      borrador: 0,
      propuestos: 0,
      concertacion: 0,
      pendienteJefatura: 0,
      pendienteDecanatura: 0,
      pendienteGestion: 0,
      aprobados: 0,
      rechazados: 0,
    };
    const estadoCounts: Record<string, number> = {};

    for (const pta of ptas) {
      const est = pta.estado || 'BORRADOR';
      estadoCounts[est] = (estadoCounts[est] || 0) + 1;

      if (est === 'BORRADOR' || est === 'Borrador') pipeline.borrador++;
      else if (est === 'PROPUESTO' || est === 'Propuesto') pipeline.propuestos++;
      else if (est === 'EN_CONCERTACION') pipeline.concertacion++;
      else if (est === 'Pendiente Jefatura') pipeline.pendienteJefatura++;
      else if (est === 'Pendiente Decanatura') pipeline.pendienteDecanatura++;
      else if (est === 'Pendiente Gestión Profesoral') pipeline.pendienteGestion++;
      else if (est === 'Aprobado') pipeline.aprobados++;
      else if (est === 'Rechazado' || est === 'Devuelto') pipeline.rechazados++;
    }

    // 3. Hours statistics from datosEstructurados
    let totalDocencia = 0, totalInv = 0, totalExt = 0, totalComp = 0;
    let totalHorasAsignables = 0, totalHorasProgramadas = 0;

    for (const pta of ptas) {
      const ds = pta.datosEstructurados || {};
      const asig = Array.isArray(ds.asignaturas) ? ds.asignaturas : [];
      const inv = Array.isArray(ds.investigacion) ? ds.investigacion : [];
      const ext = Array.isArray(ds.extension) ? ds.extension : [];
      const comp = Array.isArray(ds.complementarias) ? ds.complementarias : [];

      const hDoc = asig.reduce((s: number, a: any) => s + (Number(a?.horas) || 0), 0);
      const hInv = inv.reduce((s: number, a: any) => s + (Number(a?.horas) || 0), 0);
      const hExt = ext.reduce((s: number, a: any) => s + (Number(a?.horas) || 0), 0);
      const hComp = comp.reduce((s: number, a: any) => s + (Number(a?.horas) || 0), 0);
      const hTotal = pta.horasTotales || (hDoc + hInv + hExt + hComp);
      const hAsign = pta.horasAsignables || Number(ds.horas_a_programar) || 800;

      totalDocencia += hDoc;
      totalInv += hInv;
      totalExt += hExt;
      totalComp += hComp;
      totalHorasProgramadas += hTotal;
      totalHorasAsignables += hAsign;
    }

    const promedioUtilizacion = totalHorasAsignables > 0
      ? Math.round((totalHorasProgramadas / totalHorasAsignables) * 100)
      : 0;

    const horasStats = {
      docenciaHoras: totalDocencia,
      investigacionHoras: totalInv,
      extensionHoras: totalExt,
      complementariasHoras: totalComp,
      totalProgramadas: totalHorasProgramadas,
      totalAsignables: totalHorasAsignables,
      promedioUtilizacion,
    };

    // 4. Weekly trend (last 8 weeks)
    const weeklyTrend: Array<{ semana: string; creados: number; aprobados: number }> = [];
    const now = new Date();
    for (let w = 7; w >= 0; w--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (w * 7 + weekStart.getDay()));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const creados = ptas.filter(p => {
        const d = new Date(p.createdAt);
        return d >= weekStart && d < weekEnd;
      }).length;

      const aprobados = ptas.filter(p => {
        const d = new Date(p.updatedAt);
        return p.estado === 'Aprobado' && d >= weekStart && d < weekEnd;
      }).length;

      const label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
      weeklyTrend.push({ semana: label, creados, aprobados });
    }

    // 5. Top docentes by hours
    const docenteHoras: Record<string, { id: string; horas: number; estado: string }> = {};
    for (const pta of ptas) {
      const h = pta.horasTotales || 0;
      if (!docenteHoras[pta.docenteId] || docenteHoras[pta.docenteId].horas < h) {
        docenteHoras[pta.docenteId] = { id: pta.docenteId, horas: h, estado: pta.estado };
      }
    }
    const topDocentes = Object.values(docenteHoras)
      .sort((a, b) => b.horas - a.horas)
      .slice(0, 10)
      .map((d, i) => ({ rank: i + 1, docenteId: d.id, nombre: `Docente ${d.id.slice(0, 6)}`, horas: d.horas, estado: d.estado }));

    // 6. Average approval time (days from creation to 'Aprobado')
    const aprobados = ptas.filter(p => p.estado === 'Aprobado');
    let tiempoPromedioAprobacion = 0;
    if (aprobados.length > 0) {
      const totalDays = aprobados.reduce((sum, p) => {
        const diff = (new Date(p.updatedAt).getTime() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return sum + diff;
      }, 0);
      tiempoPromedioAprobacion = Math.round(totalDays / aprobados.length);
    }

    // 7. Catalog info
    let totalProgramas = 0;
    let totalAsignaturas = 0;
    try {
      totalProgramas = await this.programaRepo.count();
      totalAsignaturas = await this.asignaturaRepo.count();
    } catch { /* tables may not exist */ }

    return {
      total: ptas.length,
      pipeline,
      horasStats,
      estadoCounts,
      weeklyTrend,
      topDocentes,
      tiempoPromedioAprobacion,
      catalogoInfo: { totalProgramas, totalAsignaturas },
    };
  }
}
