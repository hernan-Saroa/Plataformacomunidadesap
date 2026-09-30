import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException, OnModuleInit, Optional, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, Between, In, IsNull, Not } from 'typeorm';
import type ExcelJSType from 'exceljs';
import type PdfPrinterType from 'pdfmake';
import type archiverType from 'archiver';
import { PassThrough, Readable } from 'node:stream';
import { SolicitudMantenimiento } from './mantenimiento.entity.js';
import { CreateMantenimientoDto, UpdateMantenimientoEstadoDto, RemitirATIDto, IniciarValoracionDto, GuardarValoracionCompletaDto, ConfirmarRecepcionInsumosDto } from './dto/create-mantenimiento.dto.js';
import { CerrarTecnicamenteDto, CierreTecnicoResponse } from './dto/cerrar-tecnicamente.dto.js';
import { ConfirmarConformidadDto } from './dto/confirmar-conformidad.dto.js';
import { RechazarConformidadDto } from './dto/rechazar-conformidad.dto.js';
import { Sede } from '../sedes/sede.entity.js';
import { CatalogoItem } from './catalogo-item.entity.js';
import { SolicitudEvidencia } from './solicitud-evidencia.entity.js';
import { SolicitudValoracion } from './solicitud-valoracion.entity.js';
import { SolicitudValoracionInsumo } from './solicitud-valoracion-insumo.entity.js';
import { StorageService } from './storage.service.js';
import { NotificationClientService, SendNotificationDto } from '../common/notification-client.service.js';
import { AuthUser } from '../auth/types.js';
import { requirePermission, userHasPermission } from '../auth/permissions.helper.js';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}
function userIdUuidOrNull(userId: unknown): string | null {
  return isUuid(userId) ? userId : null;
}

const PLAZO_CONFORMIDAD_HORAS_DEFAULT = 72;
const REAPERTURA_NUEVO_SLA_HORAS = 24;

// ===== EFDS-1738 RF-INF-009 Calificación del Servicio Recibido =====
// OQ-1 default: true (OPCIONAL). Si mañana se aprueba OBLIGATORIA, cambiar a false.
const CALIFICACION_SERVICIO_OPCIONAL_DEFAULT = true as const;
const CALIFICACIONES_VALIDAS: readonly (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5] as const;
type CalificacionServicioValida = (typeof CALIFICACIONES_VALIDAS)[number];
function esCalificacionValida(v: unknown): v is CalificacionServicioValida {
  return typeof v === 'number' && Number.isInteger(v) && CALIFICACIONES_VALIDAS.includes(v as CalificacionServicioValida);
}

// Tipos públicos para el endpoint consolidados calificaciones (EFDS-1738)
export type AgrupacionCalificacion = 'tecnico' | 'categoria' | 'area' | 'global';
export interface DistribucionCalificacion {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}
export interface ConsolidadoCalificacionItem {
  tipoGrupo: AgrupacionCalificacion;
  idGrupo: number | string | null;
  nombreGrupo: string;
  numeroCalificaciones: number;
  sumaCalificaciones: number;
  promedio: number;
  distribucion: DistribucionCalificacion;
}
export interface FiltrosConsolidadoCalificacion {
  por?: AgrupacionCalificacion;
  fechaDesde?: string | Date | null;
  fechaHasta?: string | Date | null;
  idCategoria?: number | string | null;
  codigoTecnico?: string | null;
  idAreaSolicitante?: string | null;
}

// ===== EFDS-1739 RF-INF-010 Reportes e Indicadores de Gestión =====
export type AreaFiltroReporte = 'UMI' | 'TI' | 'TODAS';
export interface FiltrosReporteGestionParams {
  fechaDesde?: string | Date | null;
  fechaHasta?: string | Date | null;
  idSede?: string | null;
  idCategoria?: number | string | null;
  areaResponsable?: AreaFiltroReporte | string | null;
  codigoTecnico?: string | null;
  estado?: string | null;
}
export interface ReportePeriodoDelta {
  valorActual: number;
  valorAnterior: number;
  variacionAbsoluta: number;
  variacionPorcentual: number;
}
export interface ReporteGestionTotalCasos {
  totalRadicados: ReportePeriodoDelta;
  porEstado: Array<{ estado: string; cantidad: number; porcentaje: number }>;
  porTipoAtencion: Array<{ tipoAtencion: string; cantidad: number; porcentaje: number }>;
}
export interface ReporteGestionPorCategoriaItem {
  idCategoria: number | null;
  codigoCategoria?: string | null;
  nombreCategoria: string;
  radicados: number;
  completados: number;
  enCurso: number;
  vencidos: number;
  promedioCalificacion: number;
  color?: string | null;
}
export interface ReporteGestionPorTecnicoItem {
  codigoTecnico: string | null;
  nombreTecnico: string;
  asignados: number;
  completados: number;
  enCurso: number;
  promedioCalificacion: number;
  cargaVigente: number;
}
export interface ReporteGestionTiemposAtencionItem {
  idCategoria: number | null;
  nombreCategoria: string;
  metaSlaDias: number;
  casosCumplenSLA: number;
  casosExcedenSLA: number;
  porcentajeCumplimiento: number;
  promedioRealDias: number;
}
export interface ReporteGestionPercepcionServicio {
  promedioGlobal: number;
  totalCalificaciones: number;
  porDistribucion: DistribucionCalificacion;
  porCategoria: ConsolidadoCalificacionItem[];
  porTecnico: ConsolidadoCalificacionItem[];
}
export interface ReporteGestionRollupGeograficoItem {
  idSede: string | null;
  nombreSede: string;
  radicados: number;
  completados: number;
  enCurso: number;
  porPiso?: Array<{ piso: string; cantidad: number }>;
}
export interface ReporteGestionDto {
  periodo: {
    fechaDesdeISO: string | null;
    fechaHastaISO: string | null;
    fechaDesdeAnteriorISO: string | null;
    fechaHastaAnteriorISO: string | null;
  };
  totalCasos: ReporteGestionTotalCasos;
  porCategoria: ReporteGestionPorCategoriaItem[];
  porTecnico: ReporteGestionPorTecnicoItem[];
  tiemposAtencionVsMeta: ReporteGestionTiemposAtencionItem[];
  percepcionServicio: ReporteGestionPercepcionServicio;
  rollupGeografico: ReporteGestionRollupGeograficoItem[];
}

function usuarioEsBypassConsolidados(user?: AuthUser | null): boolean {
  if (!user || !Array.isArray(user.roles) || user.roles.length === 0) return false;
  const fallbackLegacy = (user.roles || []).map((r) => String(r).toUpperCase())
    .some((r) => [
      'SUPER_ADMIN',
      'GESTOR_MANTENIMIENTO',
      'ADMINISTRADOR_FUNCIONAL',
      'ADMINISTRADOR_FUNCIONAL_INFRA',
      'COORDINADOR_INFRAESTRUCTURA',
      'CONSULTA_CALIDAD_INFRA',
    ].includes(r));
  return fallbackLegacy || userHasPermission('infraestructura.reportes.consolidados', user) || userHasPermission('infraestructura.reportes.gestion', user);
}
function parsearFechaUTCNullable(val: unknown): Date | null {
  if (val == null || val === '') return null;
  try {
    const d = new Date(val as string);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}
function distribucionVacia(): DistribucionCalificacion {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}
const SEPARADOR_TECNICO = ' · ';

function nuevoItemRemision(args: {
  usuarioId?: string;
  usuarioEmail?: string;
  origenArea: 'UMI' | 'FORMULARIO' | 'TI' | 'PENDIENTE_CLASIFICACION';
  destinoArea: 'UMI' | 'TI';
  motivo: string;
  canalRemision?: string;
  consecutivoCruzadoTi?: string;
  estadoRemision?: string;
}): Record<string, any> {
  return {
    fecha: new Date().toISOString(),
    usuario_id: args.usuarioId ?? null,
    usuario_email: args.usuarioEmail ?? null,
    origen_area: args.origenArea,
    destino_area: args.destinoArea,
    motivo: args.motivo,
    canal_remision: args.canalRemision ?? 'EMAIL_SIN_INTEGRAR',
    consecutivo_cruzado_ti: args.consecutivoCruzadoTi ?? null,
    estado_remision: args.estadoRemision ?? 'PENDIENTE_CONFIRMACION_TI',
  };
}

const ESTADOS_CARGA_VIGENTE: readonly string[] = ['RECIBIDA','ASIGNADA','EN_PROGRESO','EN_ANALISIS'] as const;

const TECNICO_MANTENIMIENTO = 'TECNICO_MANTENIMIENTO';
const REGLA_ESCALAMIENTO = 'REGLA_ESCALAMIENTO';
const PARAMETRO_UMI = 'PARAMETRO_UMI';
const COD_TIEMPO_GLOBAL = 'TIEMPO_RESPUESTA_DIAS';
const PREFIX_TIEMPO_CAT = 'TIEMPO_RESP_DIAS_CAT_';
const PERMISO_ASIGNAR_SOLICITUD = 'infraestructura.solicitud.assign';
const PERMISO_VER_BANDEJA_GENERAL = 'infraestructura.view_all';
const PERMISO_VER_INCLUIDO_TI = 'infraestructura.view_all_ti';

@Injectable()
export class MantenimientoService implements OnModuleInit {
  private readonly notifLogger = new Logger(`${MantenimientoService.name}.notificaciones`);
  constructor(
    @InjectRepository(SolicitudMantenimiento)
    private readonly mantenimientoRepo: Repository<SolicitudMantenimiento>,
    @InjectRepository(Sede)
    private readonly sedeRepo: Repository<Sede>,
    @InjectRepository(CatalogoItem)
    private readonly catalogoRepo: Repository<CatalogoItem>,
    @InjectRepository(SolicitudEvidencia)
    private readonly evidenciaRepo: Repository<SolicitudEvidencia>,
    @InjectRepository(SolicitudValoracion)
    private readonly valoracionRepo: Repository<SolicitudValoracion>,
    @InjectRepository(SolicitudValoracionInsumo)
    private readonly valoracionInsumoRepo: Repository<SolicitudValoracionInsumo>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly storage: StorageService,
    @Optional() @Inject(forwardRef(() => NotificationClientService))
    private readonly notificaciones?: NotificationClientService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.asegurarSeedTiemposPorCategoria();
      await this.cargarParametroCache();
    } catch {}
  }

  private async asegurarSeedTiemposPorCategoria(): Promise<void> {
    const catalogo8: Array<{ id_cat: number; cod_cs: string; nombre: string; orden: number }> = [
      { id_cat: 47, cod_cs: 'CS_001', nombre: 'Cerrajería y Carpintería', orden: 1 },
      { id_cat: 48, cod_cs: 'CS_002', nombre: 'Eléctricas y Electrónicas', orden: 2 },
      { id_cat: 49, cod_cs: 'CS_003', nombre: 'Adecuación de Espacios y Apoyo a Eventos', orden: 3 },
      { id_cat: 50, cod_cs: 'CS_004', nombre: 'Plomería y Fontanería', orden: 4 },
      { id_cat: 51, cod_cs: 'CS_005', nombre: 'Mantenimiento Infraestructura Física y Obras Menores', orden: 5 },
      { id_cat: 52, cod_cs: 'CS_006', nombre: 'Mantenimiento Zonas Exteriores y Jardinería', orden: 6 },
      { id_cat: 53, cod_cs: 'CS_007', nombre: 'Traslados de Mobiliario y Bienes', orden: 7 },
      { id_cat: 54, cod_cs: 'CS_008', nombre: 'Revisión y Mantenimiento Preventivo Equipos Críticos', orden: 8 },
    ];
    for (const c of catalogo8) {
      const cod = this.codigoParamTiempoCat(c.id_cat);
      const exists = await this.catalogoRepo.findOne({
        where: { catalogo: PARAMETRO_UMI, codigo: cod },
      });
      if (exists) continue;
      try {
        const seed = this.catalogoRepo.create({
          catalogo: PARAMETRO_UMI,
          codigo: cod,
          nombre: `Tiempo respuesta ${c.nombre} (días naturales 1..3)`,
          descripcion: 'Seed automático módulo init EFDS-1733-bis RF-INF-004. Modificable desde panel parámetros UMI.',
          orden: 100 + c.orden,
          isActivo: true,
          metadata: this.metadataTiempoDefaults(c.id_cat),
        });
        await this.catalogoRepo.save(seed as any);
      } catch {}
    }
  }

  private usuarioTieneRolUMI(user?: AuthUser | null): boolean {
    if (!user || !Array.isArray(user.roles)) return false;
    const fallbackLegacy = (user.roles || []).map((r) => String(r).toLowerCase())
      .some((r) => ['super_admin', 'admin', 'umi', 'infraestructura', 'coordinador_infraestructura', 'gestor_mantenimiento'].includes(r));
    return fallbackLegacy || userHasPermission(PERMISO_VER_BANDEJA_GENERAL, user);
  }

  private readonly loggerFindAll = new Logger('MantenimientoFindAll');
  async findAll(
    estado?: string,
    prioridad?: string,
    incluirTI: boolean = false,
    idCategoria?: number,
    user?: AuthUser | null,
  ): Promise<SolicitudMantenimiento[]> {
    this.loggerFindAll.log(`==== INICIO findAll ====`);
    this.loggerFindAll.log(`  incluirTI=${String(incluirTI)}, estado=${String(estado || 'undef')}, idCategoria=${String(idCategoria || 'undef')}`);
    this.loggerFindAll.log(`  user.userId=${String(user?.userId || 'UNDEF')}, user.email=${String(user?.email || '')}`);
    this.loggerFindAll.log(`  user.roles RAW=${JSON.stringify(user?.roles || [])}`);
    this.loggerFindAll.log(`  user.permissions size=${String((user?.permissions as Set<string> | undefined)?.size || 0)}`);

    const query = this.mantenimientoRepo.createQueryBuilder('solicitud')
      .leftJoinAndSelect('solicitud.sede', 'sede')
      .leftJoinAndSelect('solicitud.espacio', 'espacio')
      .leftJoinAndSelect('espacio.bloque', 'bloque')
      .leftJoinAndSelect('solicitud.evidencias', 'evidencias');

    if (estado) {
      query.andWhere('solicitud.estado = :estado', { estado });
    }
    if (prioridad) {
      query.andWhere('solicitud.prioridad = :prioridad', { prioridad });
    }
    if (Number.isInteger(idCategoria) && (idCategoria as number) > 0) {
      query.andWhere('solicitud.idCategoria = :idCategoria', { idCategoria });
    }

    const normRole = (s: any) => {
      if (s === null || s === undefined) return '';
      if (typeof s === 'string') return s.trim().toUpperCase();
      if (typeof s === 'object') {
        const cands = [s.code, s.codigo, s.role, s.rol, s.name, s.nombre, s.key];
        for (const c of cands) if (typeof c === 'string') { const n = c.trim().toUpperCase(); if (n) return n; }
      }
      return '';
    };
    const userRolesNorm = new Set((user?.roles || []).map(normRole).filter(Boolean));
    this.loggerFindAll.log(`  userRolesNorm=${JSON.stringify([...userRolesNorm])}`);

    const esSUPER_ADMIN = userRolesNorm.has('SUPER_ADMIN');
    const bypassBandejaGeneralPorRol =
      esSUPER_ADMIN ||
      userRolesNorm.has('ADMIN') ||
      userRolesNorm.has('GESTOR_MANTENIMIENTO') ||
      userRolesNorm.has('ADMINISTRADOR_FUNCIONAL') ||
      userRolesNorm.has('ADMINISTRADOR_FUNCIONAL_INFRA') ||
      userRolesNorm.has('COORDINADOR_INFRAESTRUCTURA') ||
      userRolesNorm.has('UMI') ||
      userRolesNorm.has('INFRAESTRUCTURA') ||
      userRolesNorm.has('ANALISTA_ASIGNADOR_UMI');
    const bypassRemitidasTIPorRol =
      esSUPER_ADMIN ||
      userRolesNorm.has('ADMIN') ||
      userRolesNorm.has('GESTOR_MANTENIMIENTO') ||
      userRolesNorm.has('ADMINISTRADOR_FUNCIONAL') ||
      userRolesNorm.has('ADMINISTRADOR_FUNCIONAL_INFRA') ||
      userRolesNorm.has('COORDINADOR_INFRAESTRUCTURA') ||
      userRolesNorm.has('UMI') ||
      userRolesNorm.has('INFRAESTRUCTURA') ||
      userRolesNorm.has('ANALISTA_ASIGNADOR_UMI') ||
      userRolesNorm.has('CONSULTA_CALIDAD_INFRA');
    this.loggerFindAll.log(`  bypassBandejaGeneralPorRol=${String(bypassBandejaGeneralPorRol)}, bypassRemitidasTIPorRol=${String(bypassRemitidasTIPorRol)}`);

    const puedeVerTodo =
      bypassBandejaGeneralPorRol ||
      userHasPermission(PERMISO_VER_BANDEJA_GENERAL, user) ||
      userHasPermission('infraestructura.solicitud.read_all', user) ||
      userHasPermission('infraestructura.reportes.gestion', user) ||
      userHasPermission('infraestructura.reportes.consolidados', user);
    const puedeVerIncluidoTI =
      bypassRemitidasTIPorRol ||
      userHasPermission(PERMISO_VER_INCLUIDO_TI, user) ||
      userHasPermission('infraestructura.solicitud.read_ti', user) ||
      userHasPermission('infraestructura.solicitud.ti_tracing_full', user);
    this.loggerFindAll.log(`  puedeVerTodo=${String(puedeVerTodo)}, puedeVerIncluidoTI=${String(puedeVerIncluidoTI)}`);

    if (incluirTI === true) {
      if (puedeVerIncluidoTI) {
        query.andWhere('solicitud.areaResponsableActual = :areaTI', { areaTI: 'TI' });
        this.loggerFindAll.log(`  APLICADO FILTRO: areaResponsableActual = TI`);
      } else {
        query.andWhere('FALSE');
        this.loggerFindAll.log(`  APLICADO FALSE (sin permiso para ver TI)`);
      }
    } else {
      query.andWhere("solicitud.areaResponsableActual IN (:...areasUMI)", { areasUMI: ['UMI', 'PENDIENTE'] });
      this.loggerFindAll.log(`  APLICADO FILTRO: areaResponsableActual IN (UMI, PENDIENTE)`);
    }

    if (!puedeVerTodo) {
      if (!user?.userId) {
        query.andWhere('FALSE');
        this.loggerFindAll.log(`  APLICADO FALSE (sin puedeVerTodo ni userId)`);
      } else {
        const needlesRaw: string[] = [];
        const emailLower = String(user.email || '').trim().toLowerCase();
        if (emailLower) needlesRaw.push(emailLower);
        if (user.userId) needlesRaw.push(String(user.userId).trim().toLowerCase());
        const usernameRaw = typeof (user as any).username === 'string' ? String((user as any).username).trim().toLowerCase() : '';
        if (usernameRaw) needlesRaw.push(usernameRaw);
        const nameRaw = typeof (user as any).name === 'string' ? String((user as any).name).trim().toLowerCase() : '';
        if (nameRaw) needlesRaw.push(nameRaw);
        const codTec = typeof (user as any).codigoTecnico === 'string' ? String((user as any).codigoTecnico).trim().toUpperCase() : '';
        if (codTec) needlesRaw.push(codTec);

        if (emailLower || user.userId) {
          try {
            const qCat = this.catalogoRepo.createQueryBuilder('c')
              .select(['c.codigo', 'c.nombre'])
              .where("c.catalogo = 'TECNICO_MANTENIMIENTO'")
              .andWhere('c.isActivo = :act', { act: true });
            const orsCat: string[] = [];
            const parsCat: any = {};
            if (emailLower) {
              parsCat.e = emailLower;
              orsCat.push("LOWER(c.metadata->>'email') = :e");
              orsCat.push("c.metadata->'correos' @> to_jsonb(CAST(ARRAY[:e] AS text[]))::jsonb");
              orsCat.push("LOWER(c.metadata->>'correo') = :e");
            }
            if (user.userId) {
              parsCat.uid = String(user.userId);
              orsCat.push("c.metadata->>'usuarioIdAutorizado' = :uid");
              orsCat.push("c.metadata->'usuarioIdsAutorizados' @> to_jsonb(CAST(ARRAY[:uid] AS text[]))::jsonb");
            }
            if (orsCat.length) qCat.andWhere(`(${orsCat.join(' OR ')})`, parsCat);
            const tecnicosVinc = await qCat.getMany();
            for (const t of tecnicosVinc) {
              if (t?.codigo) needlesRaw.push(String(t.codigo).trim().toUpperCase());
              if (t?.nombre) needlesRaw.push(String(t.nombre).trim().toLowerCase());
            }
            this.loggerFindAll.log(`  CATALOGO tecnicos vinculados al usuario encontrados: ${tecnicosVinc.length}`);
          } catch (errCat: any) {
            this.loggerFindAll.warn(`  Fallo busqueda catalogo tecnicos: ${errCat?.message || String(errCat)}`);
          }
        }

        const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        const uidEsUuidValido = UUID_RE.test(String(user.userId || ''));
        const params: any = {};
        if (uidEsUuidValido) params.usuarioId = user.userId;
        let pIdx = 0;
        const likeParts: string[] = [];
        for (const n of needlesRaw) {
          if (!n || n.length < 3) continue;
          const k = `needle_${pIdx}`;
          params[k] = `%${n}%`;
          likeParts.push(`LOWER(solicitud.responsableAsignado) LIKE :${k}`);
          pIdx++;
        }
        const partesOr: string[] = [];
        if (uidEsUuidValido) partesOr.push(`solicitud.usuarioSolicitanteId = :usuarioId`);
        if (likeParts.length > 0) partesOr.push(`(${likeParts.join(' OR ')})`);
        const orClause = partesOr.length > 0
          ? `(${partesOr.join(' OR ')})`
          : `FALSE`;
        query.andWhere(orClause, params);
        this.loggerFindAll.log(`  APLICADO FILTRO TECNICO/SOLICITANTE OR: uidValido=${String(uidEsUuidValido)}; needles=${JSON.stringify(needlesRaw)}; cond=${orClause}`);
      }
    }

    const sqlPreview = query.getSql();
    this.loggerFindAll.log(`  SQL PREVIEW (primeros 600 chars): ${sqlPreview.slice(0, 600)}`);

    try {
      const rows = await query.orderBy('solicitud.fechaRadicacion', 'DESC').getMany();
      this.loggerFindAll.log(`==== FIN findAll: ${rows.length} filas ====`);
      return rows;
    } catch (err: any) {
      this.loggerFindAll.error(`==== ERROR findAll: ${err?.message || String(err)} ====`);
      throw err;
    }
  }

  async findByUsuario(usuarioId: string | undefined): Promise<SolicitudMantenimiento[]> {
    if (!usuarioId) {
      return [];
    }
    return this.mantenimientoRepo.createQueryBuilder('solicitud')
      .leftJoinAndSelect('solicitud.sede', 'sede')
      .leftJoinAndSelect('solicitud.espacio', 'espacio')
      .leftJoinAndSelect('espacio.bloque', 'bloque')
      .leftJoinAndSelect('solicitud.evidencias', 'evidencias')
      .where('solicitud.usuarioSolicitanteId = :usuarioId', { usuarioId })
      .orderBy('solicitud.fechaRadicacion', 'DESC')
      .getMany();
  }

  async findById(id: string): Promise<SolicitudMantenimiento> {
    const solicitud = await this.mantenimientoRepo.findOne({
      where: { idSolicitud: id },
      relations: ['sede', 'espacio', 'espacio.bloque', 'evidencias'],
    });
    if (!solicitud) {
      throw new NotFoundException(`Solicitud de mantenimiento ${id} no encontrada`);
    }
    return solicitud;
  }

  async create(dto: CreateMantenimientoDto, user: AuthUser): Promise<SolicitudMantenimiento> {
    if (!user || !user.userId) {
      throw new ForbiddenException('Usuario autenticado requerido para radicar solicitud');
    }

    const sede = await this.sedeRepo.findOne({
      where: { idSede: dto.idSede },
    });
    if (!sede) {
      throw new BadRequestException(`Sede ${dto.idSede} no existe o no está registrada`);
    }
    if (!sede.isActivo) {
      throw new BadRequestException(`La sede ${sede.nombre} está inactiva y no permite radicación`);
    }

    const areaResp: 'UMI' | 'TI' = dto.tipoAtencion === 'TECNOLOGICA' ? 'TI' : 'UMI';

    if (dto.tipoAtencion === 'TECNOLOGICA' && areaResp !== 'TI') {
      throw new BadRequestException(
        'Clasificación TECNOLÓGICA NO puede quedar radicada como responsabilidad de UMI. Area debe ser TI.',
      );
    }

    const anioActual = new Date().getFullYear();
    const inicioAnio = new Date(anioActual, 0, 1);
    const finAnio = new Date(anioActual, 11, 31, 23, 59, 59, 999);

    const countAnio = await this.mantenimientoRepo.count({
      where: {
        fechaRadicacion: Between(inicioAnio, finAnio),
      },
    });

    const consecutivo = 'MNT-' + anioActual + '-' + String(countAnio + 1).padStart(4, '0');

    const ahora = new Date();

    const remisionesIniciales: Record<string, any>[] = [];
    if (dto.tipoAtencion === 'TECNOLOGICA') {
      remisionesIniciales.push(
        nuevoItemRemision({
          usuarioId: userIdUuidOrNull(user.userId) ?? undefined,
          usuarioEmail: user.email,
          origenArea: 'FORMULARIO',
          destinoArea: 'TI',
          motivo: 'Clasificación TECNOLÓGICA seleccionada por el solicitante en el formulario de radicación (EFDS-1731)',
          canalRemision: 'EMAIL_SIN_INTEGRAR',
          estadoRemision: 'PENDIENTE_CONFIRMACION_TI',
        }),
      );
    }

    const solicitudData: Partial<SolicitudMantenimiento> = {
      idSede: dto.idSede,
      idEspacio: dto.idEspacio,
      idAreaSolicitante: dto.idAreaSolicitante,
      nombreAreaSolicitante: dto.nombreAreaSolicitante,
      piso: dto.piso,
      salon: dto.salon,
      ubicacionDetalle: dto.ubicacionDetalle,
      tipoMantenimiento: dto.tipoMantenimiento,
      tipoAtencion: dto.tipoAtencion,
      areaResponsableActual: areaResp,
      remisiones: remisionesIniciales,
      prioridad: dto.prioridad ?? 'MEDIA',
      idCategoria: dto.idCategoria,
      idSubcategoria: dto.idSubcategoria,
      descripcion: dto.descripcion,
      consecutivo: consecutivo,
      estado: 'RECIBIDA',
      fechaRadicacion: ahora,
      fechaLimiteAtencion: this.aplicarFechaLimite(ahora, dto.idCategoria ?? null),
      asignaciones: [],
      usuarioSolicitanteId: userIdUuidOrNull(user.userId) ?? undefined,
      usuarioSolicitanteEmail: user.email,
      solicitanteNombre: user.username ?? dto.nombreAreaSolicitante,
      solicitanteEmail: user.email || (user.username || 'solicitante') + '@esap.edu.co',
      evidenciaInicialUrl: dto.evidenciaInicialUrl,
    };

    const saved = await this.mantenimientoRepo.save(solicitudData as any);

    if (dto.uploadedEvidenciaIds && dto.uploadedEvidenciaIds.length > 0) {
      const pendientes = await this.evidenciaRepo.findBy({
        idEvidencia: In(dto.uploadedEvidenciaIds),
      });
      const actualizados = pendientes
        .filter((e) => !e.idSolicitud || e.idSolicitud === saved.idSolicitud)
        .map((e, i) => ({
          ...e,
          idSolicitud: saved.idSolicitud,
          orden: e.orden || i + 1,
          usuarioQueSubioId: e.usuarioQueSubioId || userIdUuidOrNull(user.userId) || undefined,
          usuarioQueSubioEmail: e.usuarioQueSubioEmail || user.email,
        }));
      if (actualizados.length > 0) {
        await this.evidenciaRepo.save(actualizados as any);
      }
      saved.evidencias = await this.evidenciaRepo.findBy({ idSolicitud: saved.idSolicitud });
    } else {
      saved.evidencias = [];
    }

    return saved;
  }

  async updateEstado(id: string, dto: UpdateMantenimientoEstadoDto): Promise<SolicitudMantenimiento> {
    const solicitud = await this.findById(id);
    solicitud.estado = dto.estado;
    if (dto.responsableAsignado) solicitud.responsableAsignado = dto.responsableAsignado;
    if (dto.observaciones) solicitud.observaciones = dto.observaciones;
    if (dto.fechaEjecucion) solicitud.fechaEjecucion = dto.fechaEjecucion;

    return this.mantenimientoRepo.save(solicitud);
  }

  // ---------------------------------------------------------------------------
  // EFDS-1731: Remisión formal a TI + trazabilidad
  // ---------------------------------------------------------------------------
  async remitirATI(
    id: string,
    dto: RemitirATIDto,
    user: AuthUser,
  ): Promise<SolicitudMantenimiento> {
    if (!user?.userId) {
      throw new ForbiddenException('Usuario autenticado requerido para remitir a TI');
    }
    const solicitud = await this.findById(id);

    if (!['RECIBIDA', 'EN_ANALISIS'].includes(solicitud.estado)) {
      throw new BadRequestException(
        'Solo se puede remitir a TI solicitudes en estado RECIBIDA o EN_ANALISIS. Estado actual: ' + String(solicitud.estado),
      );
    }
    if (solicitud.areaResponsableActual === 'TI') {
      throw new BadRequestException('La solicitud ya tiene área responsable TI. No es necesario reenviar.');
    }

    const item = nuevoItemRemision({
      usuarioId: user.userId,
      usuarioEmail: user.email,
      origenArea: 'UMI',
      destinoArea: 'TI',
      motivo: dto.motivo,
      canalRemision: dto.canalRemision,
      consecutivoCruzadoTi: dto.consecutivoCruzadoTi,
      estadoRemision: 'PENDIENTE_CONFIRMACION_TI',
    });

    solicitud.tipoAtencion = 'TECNOLOGICA';
    solicitud.areaResponsableActual = 'TI';
    solicitud.remisiones = [...(Array.isArray(solicitud.remisiones) ? solicitud.remisiones : []), item];

    return this.mantenimientoRepo.save(solicitud);
  }

  async getRemisionesById(id: string): Promise<Array<Record<string, any>>> {
    const solicitud = await this.findById(id);
    const lista = Array.isArray(solicitud.remisiones) ? solicitud.remisiones : [];
    return lista
      .slice()
      .sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime());
  }

  // ---------------------------------------------------------------------------
  // Catálogos
  // ---------------------------------------------------------------------------
  async getCatalogo(catalogo: string, soloActivos = true): Promise<CatalogoItem[]> {
    const where: any = { catalogo };
    if (soloActivos) where.isActivo = true;
    return this.catalogoRepo.find({ where, order: { orden: 'ASC', idCatalogo: 'ASC' } });
  }

  // ---------------------------------------------------------------------------
  // CRUD MINI categorías de servicio (EFDS-1732 mini)
  // Operaciones simples sin blindaje: listar/crear/editar/eliminar/toggle.
  // Usa la misma tabla catalogo_item schema infrastructure-management.
  // ---------------------------------------------------------------------------

  async listarCategoriasServicio(soloActivos?: boolean): Promise<CatalogoItem[]> {
    const where: any = { catalogo: 'CATEGORIA_SERVICIO' };
    if (soloActivos === true) where.isActivo = true;
    return this.catalogoRepo.find({ where, order: { orden: 'ASC', idCatalogo: 'ASC' } });
  }

  // ---------------------------------------------------------------------------
  // Catálogo cross-schema dependencias (auth.dependencias)
  // Se usa para seleccionar el Área/Dependencia solicitante al radicar mantenimiento.
  // No hay entity en UMI porque pertenece al dominio auth; ejecuta query raw seguro.
  // ---------------------------------------------------------------------------
  async listarDependenciasCatalogo(): Promise<Array<{
    idDependencia: number;
    codDependencia: string;
    nomDependencia: string;
    idSede: number | null;
    sedeUmiId: string | null;
    sedeCodigo: string | null;
    sedeNombre: string | null;
  }>> {
    try {
      const rows = await this.dataSource.query<Array<{
        id_dependencia: string | number;
        cod_dependencia: string;
        nom_dependencia: string;
        id_sede: string | number | null;
        sede_umi_id: string | null;
        sede_codigo: string | null;
        sede_nombre: string | null;
      }>>(`
        SELECT d.id_dependencia,
               d.cod_dependencia,
               d.nom_dependencia,
               d.id_sede,
               d.sede_umi_id,
               s.codigo  AS sede_codigo,
               s.nombre  AS sede_nombre
        FROM auth.dependencias d
        LEFT JOIN "infrastructure-management".sede s
               ON s.id_sede = d.sede_umi_id
        WHERE d.activo = TRUE
        ORDER BY d.nom_dependencia ASC
      `);
      return (rows || []).map((r) => ({
        idDependencia: typeof r.id_dependencia === 'number' ? r.id_dependencia : parseInt(String(r.id_dependencia), 10),
        codDependencia: String(r.cod_dependencia || '').trim(),
        nomDependencia: String(r.nom_dependencia || '').trim(),
        idSede: r.id_sede === null || r.id_sede === undefined ? null : (typeof r.id_sede === 'number' ? r.id_sede : parseInt(String(r.id_sede), 10)),
        sedeUmiId: r.sede_umi_id ? String(r.sede_umi_id).trim() : null,
        sedeCodigo: r.sede_codigo ? String(r.sede_codigo).trim() : null,
        sedeNombre: r.sede_nombre ? String(r.sede_nombre).trim() : null,
      })).filter((r) => r.nomDependencia.length > 0);
    } catch (err: any) {
      this.notifLogger.warn(`[catalogos.dependencias] Falló consulta auth.dependencias: ${err?.message || String(err)}`);
      return [];
    }
  }

  async crearCategoriaServicio(data: {
    codigo: string;
    nombre: string;
    descripcion?: string;
    orden?: number;
    isActivo?: boolean;
    color?: string;
  }): Promise<CatalogoItem> {
    const cod = (data.codigo || '').trim();
    const nom = (data.nombre || '').trim();
    if (cod.length < 2) throw new BadRequestException('Código debe tener mínimo 2 caracteres.');
    if (nom.length < 3) throw new BadRequestException('Nombre debe tener mínimo 3 caracteres.');

    const existe = await this.catalogoRepo.findOne({
      where: { catalogo: 'CATEGORIA_SERVICIO', codigo: cod },
    });
    if (existe) {
      throw new ConflictException(
        `Código ${cod} ya existe en categoría #${existe.idCatalogo} "${existe.nombre}"`,
      );
    }

    const maxOrden = await this.catalogoRepo
      .createQueryBuilder('c')
      .where("c.catalogo = 'CATEGORIA_SERVICIO'")
      .select('COALESCE(MAX(c.orden), 0)', 'max')
      .getRawOne<{ max: string }>();
    const orden =
      data.orden && Number.isInteger(data.orden) && data.orden > 0
        ? data.orden
        : (Number(maxOrden?.max || 0) + 1);

    const desc = data.descripcion?.trim();
    const nuevo = this.catalogoRepo.create({
      catalogo: 'CATEGORIA_SERVICIO',
      codigo: cod,
      nombre: nom,
      descripcion: desc ? desc : undefined,
      orden,
      isActivo: data.isActivo ?? true,
      metadata: {
        tipo: 'CATEGORIA_PRINCIPAL',
        fase2: true,
        color: data.color || 'bg-slate-100 text-slate-800 border border-slate-200',
      },
    });
    const [guardado] = await this.catalogoRepo.save([nuevo as any]);
    return guardado as CatalogoItem;
  }

  async actualizarCategoriaServicio(
    idCatalogo: number,
    data: {
      nombre?: string;
      descripcion?: string;
      orden?: number;
      codigo?: string;
      isActivo?: boolean;
      color?: string;
    },
  ): Promise<CatalogoItem> {
    const it = await this.catalogoRepo.findOne({ where: { idCatalogo, catalogo: 'CATEGORIA_SERVICIO' } });
    if (!it) throw new NotFoundException(`Categoría #${idCatalogo} no existe.`);

    if (data.codigo !== undefined) {
      const cod = data.codigo.trim();
      if (cod.length < 2) throw new BadRequestException('Código mínimo 2 caracteres.');
      const dup = await this.catalogoRepo.findOne({
        where: { catalogo: 'CATEGORIA_SERVICIO', codigo: cod },
      });
      if (dup && dup.idCatalogo !== idCatalogo) {
        throw new ConflictException(`Código ${cod} ya existe en #${dup.idCatalogo}.`);
      }
      it.codigo = cod;
    }

    if (data.nombre !== undefined) {
      const nom = data.nombre.trim();
      if (nom.length < 3) throw new BadRequestException('Nombre mínimo 3 caracteres.');
      it.nombre = nom;
    }

    if (data.descripcion !== undefined) {
      const d = data.descripcion.trim();
      it.descripcion = d.length > 0 ? d : undefined;
    }

    if (data.orden !== undefined) it.orden = data.orden;
    if (data.isActivo !== undefined) it.isActivo = !!data.isActivo;
    if (data.color !== undefined && it.metadata && typeof it.metadata === 'object') {
      (it.metadata as any).color = data.color;
    } else if (data.color !== undefined && (!it.metadata || typeof it.metadata !== 'object')) {
      it.metadata = { color: data.color } as any;
    }

    return this.catalogoRepo.save(it);
  }

  async toggleCategoriaServicio(idCatalogo: number): Promise<CatalogoItem> {
    const it = await this.catalogoRepo.findOne({ where: { idCatalogo, catalogo: 'CATEGORIA_SERVICIO' } });
    if (!it) throw new NotFoundException(`Categoría #${idCatalogo} no existe.`);
    it.isActivo = !it.isActivo;
    return this.catalogoRepo.save(it);
  }

  async eliminarCategoriaServicio(idCatalogo: number): Promise<{ idCatalogo: number; eliminado: boolean }> {
    const it = await this.catalogoRepo.findOne({ where: { idCatalogo, catalogo: 'CATEGORIA_SERVICIO' } });
    if (!it) throw new NotFoundException(`Categoría #${idCatalogo} no existe.`);
    await this.catalogoRepo.delete({ idCatalogo });
    return { idCatalogo, eliminado: true };
  }

  // ---------------------------------------------------------------------------
  // EFDS-1733 BIS (HUECO 1 RF-INF-004): Tiempo de respuesta POR CATEGORÍA
  // Antes: 1 global único. Ahora: 8 filas TIEMPO_RESP_DIAS_CAT_47..CAT_54.
  // ---------------------------------------------------------------------------
  private clampDias(d: number): number {
    if (!Number.isFinite(d)) return 2;
    return Math.max(1, Math.min(3, Math.trunc(d)));
  }

  private codigoParamTiempoCat(idCategoria: number | null | undefined): string {
    if (!Number.isInteger(idCategoria as any)) return '';
    return PREFIX_TIEMPO_CAT + String(Math.trunc(Number(idCategoria))).padStart(2, '0');
  }

  private metadataTiempoDefaults(idCategoria: number): Record<string, any> {
    const MAPA_CS: Record<number, { cod: string; nombre: string }> = {
      47: { cod: 'CS_001', nombre: 'Cerrajería y Carpintería' },
      48: { cod: 'CS_002', nombre: 'Eléctricas y Electrónicas' },
      49: { cod: 'CS_003', nombre: 'Adecuación de Espacios y Apoyo a Eventos' },
      50: { cod: 'CS_004', nombre: 'Plomería y Fontanería' },
      51: { cod: 'CS_005', nombre: 'Mantenimiento Infraestructura Física y Obras Menores' },
      52: { cod: 'CS_006', nombre: 'Mantenimiento Zonas Exteriores y Jardinería' },
      53: { cod: 'CS_007', nombre: 'Traslados de Mobiliario y Bienes' },
      54: { cod: 'CS_008', nombre: 'Revisión y Mantenimiento Preventivo Equipos Críticos' },
    };
    const info = MAPA_CS[idCategoria] || { cod: 'CS_' + String(idCategoria).padStart(3, '0'), nombre: 'Categoría ' + idCategoria };
    return {
      idCategoria: Math.trunc(Number(idCategoria)),
      codCategoriaCS: info.cod,
      nombreCategoriaCS: info.nombre,
      min: 1,
      max: 3,
      default: 2,
      actual: 2,
      unidad: 'DIAS_NATURALES',
      modificadoPor: 'FALLBACK_SERVICE_EFDS_1733_BIS',
      fechaModificacion: new Date().toISOString(),
    };
  }

  private paramCacheTiempoPorCategoria = new Map<number, number>();
  private paramCacheGlobalFallback: number = 2;

  private aplicarCacheConDefaults(row: CatalogoItem | undefined | null, idCategoria: number): number {
    let actual = 2;
    if (row && row.metadata && typeof row.metadata === 'object') {
      const metaActual = Number((row.metadata as any).actual);
      actual = this.clampDias(isFinite(metaActual) ? metaActual : 2);
    }
    this.paramCacheTiempoPorCategoria.set(Math.trunc(Number(idCategoria)), actual);
    return actual;
  }

  async listarParametrosTiempoPorCategoria(): Promise<CatalogoItem[]> {
    const rows = await this.catalogoRepo
      .createQueryBuilder('c')
      .where('c.catalogo = :cat', { cat: PARAMETRO_UMI })
      .andWhere('c.codigo LIKE :pref', { pref: PREFIX_TIEMPO_CAT + '%' })
      .orderBy('c.orden', 'ASC')
      .addOrderBy('c.idCatalogo', 'ASC')
      .getMany();

    if (rows && rows.length > 0) {
      for (const r of rows) {
        const idCat = Number(r.metadata && typeof r.metadata === 'object' ? (r.metadata as any).idCategoria : null);
        if (Number.isInteger(idCat)) this.aplicarCacheConDefaults(r, idCat);
      }
      return rows;
    }
    // Fallback: si la migración 010_02 NO se ejecutó (no hay data), creamos los 8 on-the-fly
    const catalogo8: Array<{ id_cat: number; cod_cs: string; nombre: string; orden: number }> = [
      { id_cat: 47, cod_cs: 'CS_001', nombre: 'Cerrajería y Carpintería', orden: 1 },
      { id_cat: 48, cod_cs: 'CS_002', nombre: 'Eléctricas y Electrónicas', orden: 2 },
      { id_cat: 49, cod_cs: 'CS_003', nombre: 'Adecuación de Espacios y Apoyo a Eventos', orden: 3 },
      { id_cat: 50, cod_cs: 'CS_004', nombre: 'Plomería y Fontanería', orden: 4 },
      { id_cat: 51, cod_cs: 'CS_005', nombre: 'Mantenimiento Infraestructura Física y Obras Menores', orden: 5 },
      { id_cat: 52, cod_cs: 'CS_006', nombre: 'Mantenimiento Zonas Exteriores y Jardinería', orden: 6 },
      { id_cat: 53, cod_cs: 'CS_007', nombre: 'Traslados de Mobiliario y Bienes', orden: 7 },
      { id_cat: 54, cod_cs: 'CS_008', nombre: 'Revisión y Mantenimiento Preventivo Equipos Críticos', orden: 8 },
    ];
    const creados: CatalogoItem[] = [];
    for (const c of catalogo8) {
      const seed = this.catalogoRepo.create({
        catalogo: PARAMETRO_UMI,
        codigo: this.codigoParamTiempoCat(c.id_cat),
        nombre: `Tiempo respuesta ${c.nombre} (días naturales 1..3)`,
        orden: 100 + c.orden,
        isActivo: true,
        metadata: this.metadataTiempoDefaults(c.id_cat),
      });
      try {
        const saved = await this.catalogoRepo.save(seed as any);
        creados.push(saved as CatalogoItem);
        this.aplicarCacheConDefaults(saved as any, c.id_cat);
      } catch {
        // ignore dup (race)
        const found = await this.catalogoRepo.findOne({
          where: { catalogo: PARAMETRO_UMI, codigo: this.codigoParamTiempoCat(c.id_cat) },
        });
        if (found) {
          creados.push(found as CatalogoItem);
          this.aplicarCacheConDefaults(found as any, c.id_cat);
        }
      }
    }
    // Fallback doble: si creados.length < 8 (por save fallo / restriccion / race no dup), hacemos REFRESH find de nuevo,
    // y si sigue <8 generamos 8 IN-MEMORY sin persistir para garantizar al UI 8 categorías renderizadas.
    // El usuario al Guardar una categoría (PATCH) SÍ persiste correctamente el item individual (obtenerParametroTiempo sí crea OK).
    if (creados.length < 8) {
      const refrescados = await this.catalogoRepo
        .createQueryBuilder('c')
        .where('c.catalogo = :cat', { cat: PARAMETRO_UMI })
        .andWhere('c.codigo LIKE :pref', { pref: PREFIX_TIEMPO_CAT + '%' })
        .orderBy('c.orden', 'ASC')
        .addOrderBy('c.idCatalogo', 'ASC')
        .getMany();
      if (refrescados && refrescados.length >= 8) return refrescados;
      const creadosMap = new Map<string, CatalogoItem>();
      for (const x of [...(refrescados || []), ...creados]) {
        if (x?.codigo) creadosMap.set(String(x.codigo), x);
      }
      for (const c of catalogo8) {
        const cod = this.codigoParamTiempoCat(c.id_cat);
        if (!creadosMap.has(cod)) {
          const temp = this.catalogoRepo.create({
            catalogo: PARAMETRO_UMI,
            codigo: cod,
            nombre: `Tiempo respuesta ${c.nombre} (días 1..3) · IN-MEMORY FALLBACK ejecutar migración 010_02`,
            descripcion: 'Generado on-the-fly IN-MEMORY (fallback) por EFDS-1733-bis. Al dar GUARDAR se persiste; se recomienda ejecutar la migración 010_02 para el seed permanente.',
            orden: 100 + c.orden,
            isActivo: true,
            metadata: { ...this.metadataTiempoDefaults(c.id_cat), __flag: 'FALLBACK_MEM_PENDING_MIG_010_02' },
          });
          creadosMap.set(cod, temp as CatalogoItem);
          creados.push(temp as CatalogoItem);
          this.aplicarCacheConDefaults(temp as any, c.id_cat);
        }
      }
    }
    creados.sort((a, b) => {
      const ia = Number((a.metadata as any)?.idCategoria ?? 99);
      const ib = Number((b.metadata as any)?.idCategoria ?? 99);
      return ia - ib;
    });
    return creados;
  }

  async obtenerParametroTiempoRespuesta(idCategoria?: number): Promise<CatalogoItem> {
    const idCat = Number(idCategoria);
    const tieneIdCatValido = Number.isInteger(idCat) && idCat >= 47 && idCat <= 54;
    if (tieneIdCatValido) {
      const cod = this.codigoParamTiempoCat(idCat);
      let row = await this.catalogoRepo.findOne({ where: { catalogo: PARAMETRO_UMI, codigo: cod } });
      if (!row) {
        const seed = this.catalogoRepo.create({
          catalogo: PARAMETRO_UMI,
          codigo: cod,
          nombre: `Tiempo respuesta (CATEGORÍA ${idCat})`,
          descripcion: 'Creado on-demand por PATCH actualizarParametroTiempoRespuesta (EFDS-1733-bis).',
          orden: 100 + (idCat - 46),
          isActivo: true,
          metadata: this.metadataTiempoDefaults(idCat),
        });
        row = await this.catalogoRepo.save(seed);
      }
      this.aplicarCacheConDefaults(row as any, idCat);
      return row;
    }
    // Fallback si NO se envía idCategoria (legacy): leemos el param global
    // TIEMPO_RESPUESTA_DIAS si existe, sino retornamos un objeto IN-MEMORY
    // (NO persistimos desde aquí para no confundir con params por categoría).
    const globalRow = await this.catalogoRepo.findOne({
      where: { catalogo: PARAMETRO_UMI, codigo: COD_TIEMPO_GLOBAL },
    });
    if (globalRow) return globalRow;
    const temp = this.catalogoRepo.create({
      catalogo: PARAMETRO_UMI,
      codigo: COD_TIEMPO_GLOBAL,
      nombre: 'Tiempo máximo respuesta (días naturales) · FALLBACK GLOBAL LEGACY',
      orden: 99,
      isActivo: true,
      metadata: {
        tipo: 'FALLBACK_LEGACY',
        nota: 'Use listarParametrosTiempoPorCategoria para consultar los 8 parámetros por categoría (RF-INF-004 L104 EFDS-1733-bis).',
        min: 1, max: 3, default: 2, actual: this.paramCacheGlobalFallback, unidad: 'DIAS_NATURALES',
      },
    });
    return temp;
  }

  async actualizarParametroTiempoRespuesta(idCategoria: number | undefined, dias: number): Promise<CatalogoItem> {
    const idCat = Math.trunc(Number(idCategoria));
    if (!Number.isInteger(idCat) || idCat < 47 || idCat > 54) {
      throw new BadRequestException(
        'Parámetro tiempo-respuesta ahora POR CATEGORÍA (EFDS-1733-bis HUECO 1). Indique idCategoria en rango [47..54].',
      );
    }
    if (!Number.isInteger(dias)) {
      throw new BadRequestException('Los días del tiempo de respuesta deben ser un número entero.');
    }
    if (dias < 1 || dias > 3) {
      throw new BadRequestException('Tiempo de respuesta: fuera de rango. Rango permitido 1 a 3 días naturales.');
    }
    const cod = this.codigoParamTiempoCat(idCat);
    let row = await this.catalogoRepo.findOne({ where: { catalogo: PARAMETRO_UMI, codigo: cod } });
    if (!row) {
      const seed = this.catalogoRepo.create({
        catalogo: PARAMETRO_UMI,
        codigo: cod,
        nombre: `Tiempo respuesta (CATEGORÍA ${idCat})`,
        descripcion: 'Creado on-demand por PATCH actualizarParametroTiempoRespuesta (EFDS-1733-bis).',
        orden: 100 + (idCat - 46),
        isActivo: true,
        metadata: this.metadataTiempoDefaults(idCat),
      });
      row = await this.catalogoRepo.save(seed);
    }
    row.metadata = {
      ...((row.metadata && typeof row.metadata === 'object') ? row.metadata : {}),
      actual: Math.trunc(Number(dias)),
      fechaModificacion: new Date().toISOString(),
      modificadoPor: 'PATCH_PANEL_ADMIN_PARAMETROS_UMI',
      marcaAgua: 'EFDS_1733_BIS__FIX_CAP1_OK__CODIGO_NUEVO_CARGADO__V2_' + Date.now(),
    };
    const saved = await this.catalogoRepo.save(row);
    this.aplicarCacheConDefaults(saved, idCat);
    console.log('\n==============================================================');
    console.log('[FIX_CAP1_PATCH_TIEMPO_OK] idCategoria=', idCat, 'dias=', dias);
    console.log('[FIX_CAP1_PATCH_TIEMPO_OK] row.codigo=', saved.codigo, 'idCatalogo=', saved.idCatalogo);
    console.log('[FIX_CAP1_PATCH_TIEMPO_OK] metadata.actual=', (saved.metadata as any)?.actual, 'modificadoPor=', (saved.metadata as any)?.modificadoPor);
    console.log('[FIX_CAP1_PATCH_TIEMPO_OK] SI VES ESTE LOG EN TERMINAL => NEST CARGO EL NUEVO CODIGO (NO idCatalogo 80)');
    console.log('==============================================================\n');
    return saved;
  }

  private obtenerDiasPorCategoria(idCategoria: number | null | undefined): number {
    if (Number.isInteger(idCategoria as any)) {
      const idCat = Math.trunc(Number(idCategoria));
      const cached = this.paramCacheTiempoPorCategoria.get(idCat);
      if (Number.isInteger(cached as any)) return this.clampDias(Number(cached));
    }
    return this.clampDias(this.paramCacheGlobalFallback);
  }

  aplicarFechaLimite(fechaRadicacion: Date | null | undefined, idCategoria?: number | null): Date | undefined {
    if (!fechaRadicacion) return undefined;
    const dias = this.obtenerDiasPorCategoria(idCategoria ?? null);
    const f = new Date(fechaRadicacion.getTime());
    f.setDate(f.getDate() + dias);
    return f;
  }

  async cargarParametroCache(): Promise<void> {
    try {
      const lista = await this.listarParametrosTiempoPorCategoria();
      for (const p of lista) {
        const idCat = Number(p.metadata && typeof p.metadata === 'object' ? (p.metadata as any).idCategoria : null);
        if (Number.isInteger(idCat)) this.aplicarCacheConDefaults(p, idCat);
      }
    } catch {
      this.paramCacheTiempoPorCategoria.clear();
      this.paramCacheGlobalFallback = 2;
    }
  }

  // ---------------------------------------------------------------------------
  // EFDS-1733: Técnicos mantenimiento (catálogo TECNICO_MANTENIMIENTO)
  // ---------------------------------------------------------------------------
  async listarTecnicos(soloActivos: boolean = true): Promise<CatalogoItem[]> {
    // Modo SOLO activos (motor asignación, sugerencia, reglas): where estricto catalogo = TECNICO_MANTENIMIENTO
    if (soloActivos) {
      return this.catalogoRepo.find({
        where: { catalogo: TECNICO_MANTENIMIENTO, isActivo: true },
        order: { orden: 'ASC', idCatalogo: 'ASC' },
      });
    }
    // Modo TODOS (Admin CRUD): filtro flexible catalogo = TECNICO_MANTENIMIENTO OR catalogo LIKE %TECNICO% para incluir seeds legacy
    // (soluciona CAP2/CAP3: técnicos creados con catalogo distinto al canonical se veían en PG pero NO en listado Admin)
    const qb = this.catalogoRepo
      .createQueryBuilder('c')
      .where('(c.catalogo = :catExacto OR upper(c.catalogo) LIKE :catFlex)', {
        catExacto: TECNICO_MANTENIMIENTO,
        catFlex: '%TECNICO%',
      })
      .orderBy('c.orden', 'ASC')
      .addOrderBy('c.idCatalogo', 'ASC');
    return qb.getMany();
  }

  async calcularCargaVigenteTecnico(
    tecnicoCodigo: string,
    fechaReferencia: Date = new Date(),
  ): Promise<number> {
    if (!tecnicoCodigo) return 0;
    const likePat = '%' + tecnicoCodigo + '%';
    const count = await this.mantenimientoRepo
      .createQueryBuilder('s')
      .where('s.responsable_asignado LIKE :pat', { pat: likePat })
      .andWhere('s.estado IN (:...estados)', { estados: ESTADOS_CARGA_VIGENTE as any })
      .andWhere("s.area_responsable_actual IN ('UMI','PENDIENTE_CLASIFICACION')")
      .andWhere(
        "(s.fecha_programada IS NULL OR DATE(s.fecha_programada) >= DATE(:ref) OR s.estado IN ('RECIBIDA','ASIGNADA','EN_ANALISIS'))",
        { ref: fechaReferencia.toISOString() },
      )
      .getCount();
    return count;
  }

  async listarTecnicosConCargaVigente(incluirInactivos: boolean = false): Promise<Array<CatalogoItem & { cargaVigente: number }>> {
    const tecnicos = await this.listarTecnicos(!incluirInactivos);
    const out = [] as Array<CatalogoItem & { cargaVigente: number }>;
    for (const t of tecnicos) {
      const carga = t.isActivo
        ? await this.calcularCargaVigenteTecnico(t.codigo)
        : 0;
      out.push({ ...t, cargaVigente: carga });
    }
    return out;
  }

  async crearTecnico(data: {
    codigo: string;
    nombre: string;
    email?: string;
    telefono?: string;
    especialidades?: string[];
    orden?: number;
    isActivo?: boolean;
  }): Promise<CatalogoItem> {
    const cod = (data.codigo || '').trim();
    const nom = (data.nombre || '').trim();
    if (cod.length < 4) throw new BadRequestException('Código técnico debe tener mínimo 4 caracteres.');
    if (nom.length < 4) throw new BadRequestException('Nombre técnico debe tener mínimo 4 caracteres.');
    const dup = await this.catalogoRepo.findOne({ where: { catalogo: TECNICO_MANTENIMIENTO, codigo: cod } });
    if (dup) throw new ConflictException(`Código técnico ${cod} ya existe.`);

    const maxRow = await this.catalogoRepo
      .createQueryBuilder('c')
      .where('c.catalogo = :cat', { cat: TECNICO_MANTENIMIENTO })
      .select('COALESCE(MAX(c.orden),0)', 'm')
      .getRawOne<{ m: string }>();
    const orden = Number.isInteger(data.orden as any) && (data.orden as any) > 0
      ? (data.orden as any)
      : (Number(maxRow?.m || 0) + 1);
    const esp = Array.isArray(data.especialidades)
      ? data.especialidades.map((e) => String(e).trim()).filter((e) => e.length > 0)
      : [];
    const meta: Record<string, any> = {};
    if (data.email) meta.email = data.email.trim();
    if (data.telefono) meta.telefono = data.telefono.trim();
    if (esp.length) meta.especialidades = esp;

    const it = this.catalogoRepo.create({
      catalogo: TECNICO_MANTENIMIENTO,
      codigo: cod,
      nombre: nom,
      orden,
      isActivo: data.isActivo ?? true,
      metadata: meta,
    });
    return this.catalogoRepo.save(it);
  }

  async actualizarTecnico(
    idCatalogo: number,
    data: {
      codigo?: string;
      nombre?: string;
      email?: string;
      telefono?: string;
      especialidades?: string[];
      orden?: number;
      isActivo?: boolean;
    },
  ): Promise<CatalogoItem> {
    const it = await this.catalogoRepo.findOne({ where: { idCatalogo, catalogo: TECNICO_MANTENIMIENTO } });
    if (!it) throw new NotFoundException(`Técnico #${idCatalogo} no existe.`);
    if (data.codigo !== undefined) {
      const cod = data.codigo.trim();
      if (cod.length < 4) throw new BadRequestException('Código mínimo 4 caracteres.');
      const dup = await this.catalogoRepo.findOne({ where: { catalogo: TECNICO_MANTENIMIENTO, codigo: cod } });
      if (dup && dup.idCatalogo !== idCatalogo) throw new ConflictException(`Código ${cod} duplicado.`);
      it.codigo = cod;
    }
    if (data.nombre !== undefined) {
      const n = data.nombre.trim();
      if (n.length < 4) throw new BadRequestException('Nombre mínimo 4 caracteres.');
      it.nombre = n;
    }
    if (data.orden !== undefined) it.orden = Number(data.orden);
    if (data.isActivo !== undefined) it.isActivo = !!data.isActivo;
    if (!it.metadata || typeof it.metadata !== 'object') it.metadata = {};
    if (data.email !== undefined) (it.metadata as any).email = data.email?.trim() ?? null;
    if (data.telefono !== undefined) (it.metadata as any).telefono = data.telefono?.trim() ?? null;
    if (data.especialidades !== undefined) {
      const esp = Array.isArray(data.especialidades)
        ? data.especialidades.map((e) => String(e).trim()).filter(Boolean)
        : [];
      (it.metadata as any).especialidades = esp;
    }
    return this.catalogoRepo.save(it);
  }

  async toggleTecnico(idCatalogo: number): Promise<CatalogoItem> {
    const it = await this.catalogoRepo.findOne({ where: { idCatalogo, catalogo: TECNICO_MANTENIMIENTO } });
    if (!it) throw new NotFoundException(`Técnico #${idCatalogo} no existe.`);
    it.isActivo = !it.isActivo;
    return this.catalogoRepo.save(it);
  }

  async eliminarTecnico(idCatalogo: number): Promise<{ idCatalogo: number; eliminado: boolean }> {
    const it = await this.catalogoRepo.findOne({ where: { idCatalogo, catalogo: TECNICO_MANTENIMIENTO } });
    if (!it) throw new NotFoundException(`Técnico #${idCatalogo} no existe.`);
    await this.catalogoRepo.delete({ idCatalogo });
    return { idCatalogo, eliminado: true };
  }

  // ---------------------------------------------------------------------------
  // EFDS-1733: Reglas escalamiento
  // ---------------------------------------------------------------------------
  async listarReglasEscalamiento(): Promise<CatalogoItem[]> {
    return this.catalogoRepo.find({
      where: { catalogo: REGLA_ESCALAMIENTO },
      order: { orden: 'ASC', idCatalogo: 'ASC' },
    });
  }

  async actualizarReglaEscalamiento(
    idCatalogo: number,
    data: { tecnicoCodigo?: string | null; isActivo?: boolean; metadata?: Record<string, any> },
  ): Promise<CatalogoItem> {
    const it = await this.catalogoRepo.findOne({ where: { idCatalogo, catalogo: REGLA_ESCALAMIENTO } });
    if (!it) throw new NotFoundException(`Regla #${idCatalogo} no existe.`);
    if (!it.metadata || typeof it.metadata !== 'object') it.metadata = {};
    if (data.tecnicoCodigo !== undefined) {
      if (data.tecnicoCodigo === null || data.tecnicoCodigo === '') {
        (it.metadata as any).tecnicoCodigo = null;
        (it.metadata as any).tecnicoNombreDisplay = null;
      } else {
        const tec = await this.catalogoRepo.findOne({
          where: { catalogo: TECNICO_MANTENIMIENTO, codigo: data.tecnicoCodigo },
        });
        if (!tec) throw new BadRequestException(`Técnico ${data.tecnicoCodigo} no existe.`);
        (it.metadata as any).tecnicoCodigo = tec.codigo;
        (it.metadata as any).tecnicoNombreDisplay = tec.nombre;
      }
    }
    if (data.metadata !== undefined && typeof data.metadata === 'object') {
      it.metadata = { ...(it.metadata as any), ...(data.metadata as any) };
    }
    if (data.isActivo !== undefined) it.isActivo = !!data.isActivo;
    (it.metadata as any).fechaModificacion = new Date().toISOString();
    return this.catalogoRepo.save(it);
  }

  // ---------------------------------------------------------------------------
  // EFDS-1733: Motor sugerir asignación
  //   AC-01 Eléctricas (48) => regla ESPECIALIZACION obligatoria
  //   AC-02 Resto 7 categorías => EQUIDAD_DISPONIBILIDAD_CARGA_MENOR
  // ---------------------------------------------------------------------------
  async sugerirAsignacion(
    idSolicitud: string,
  ): Promise<{
    regla: 'ESPECIALIZACION' | 'EQUIDAD_DISPONIBILIDAD_CARGA_MENOR' | 'SIN_REGLA';
    idCategoria: number | null;
    sugerido: (CatalogoItem & { cargaVigente: number }) | null;
    obligatorio: boolean;
    opciones: Array<CatalogoItem & { cargaVigente: number }>;
    advertencia?: string;
  }> {
    const solicitud = await this.findById(idSolicitud);
    const idCategoria = solicitud.idCategoria ?? null;
    let regla: 'ESPECIALIZACION' | 'EQUIDAD_DISPONIBILIDAD_CARGA_MENOR' | 'SIN_REGLA' = 'SIN_REGLA';
    let sugerido: (CatalogoItem & { cargaVigente: number }) | null = null;
    let obligatorio = false;
    let advertencia: string | undefined = undefined;

    const opciones = await this.listarTecnicosConCargaVigente();

    if (solicitud.areaResponsableActual === 'TI') {
      return {
        regla: 'SIN_REGLA',
        idCategoria,
        sugerido: null,
        obligatorio: false,
        opciones: [],
        advertencia: 'Las solicitudes de responsabilidad TI se gestionan por remisión a Coordinación TIC, no por este motor de asignación UMI.',
      };
    }

    if (idCategoria === 48) {
      // CS_002 Eléctricas y Electrónicas → regla 001 ESPECIALIZACION OBLIGATORIA
      regla = 'ESPECIALIZACION';
      obligatorio = true;
      const regla001 = await this.catalogoRepo.findOne({
        where: { catalogo: REGLA_ESCALAMIENTO, codigo: 'REG_001_CATEGORIA_48_ELECTRICAS' },
      });
      const codigoTec = regla001 && regla001.metadata ? (regla001.metadata as any).tecnicoCodigo : null;
      if (!codigoTec) {
        advertencia = 'Regla eléctricas activa pero el técnico especialista aún no está configurado. Asigna uno desde Panel > Parámetros UMI > Reglas.';
      } else {
        const encontrado = opciones.find((t) => t.codigo === codigoTec);
        if (encontrado) {
          sugerido = encontrado;
        } else {
          advertencia = `Técnico especialista configurado (${codigoTec}) no existe o está inactivo.`;
        }
      }
      return { regla, idCategoria, sugerido, obligatorio, opciones, advertencia };
    }

    // AC-02 Resto 7 categorías o idCategoria sin configurar: EQUIDAD
    regla = 'EQUIDAD_DISPONIBILIDAD_CARGA_MENOR';
    obligatorio = false;
    if (opciones.length === 0) {
      advertencia = 'No hay técnicos activos en el catálogo. Da de alta al menos uno desde Parámetros UMI > Técnicos.';
    } else {
      const sorted = [...opciones].sort((a, b) => {
        if (a.cargaVigente !== b.cargaVigente) return a.cargaVigente - b.cargaVigente;
        return (a.nombre || '').localeCompare(b.nombre || '');
      });
      sugerido = sorted[0] || null;
    }
    return { regla, idCategoria, sugerido, obligatorio, opciones, advertencia };
  }

  // ---------------------------------------------------------------------------
  // EFDS-1734 RF-INF-005: Asignación (aprobar / rechazar / redistribuir)
  // Guard clause D6: solo SUPER_ADMIN o GESTOR_MANTENIMIENTO pueden ejecutar.
  // Histórico: pushAsignacion añade entry al JSONB asignaciones[] sin overw.
  // ---------------------------------------------------------------------------
  private validarRolesAsignador(user: AuthUser | null | undefined): { permitido: boolean; errorMsg?: string } {
    if (!user || !Array.isArray(user.roles) || user.roles.length === 0) {
      return { permitido: false, errorMsg: 'Usuario autenticado requerido para aprobar/rechazar/redistribuir solicitudes UMI.' };
    }
    try {
      requirePermission(PERMISO_ASIGNAR_SOLICITUD, user);
      return { permitido: true };
    } catch (err: any) {
      const msg =
        (err?.message && typeof err.message === 'string')
          ? err.message
          : 'Permiso insuficiente. Requiere permiso infraestructura.solicitud.assign para aprobar, rechazar o redistribuir solicitudes UMI.';
      return { permitido: false, errorMsg: msg };
    }
  }

  private pushAsignacion(
    solicitud: SolicitudMantenimiento,
    args: {
      accion:
        | 'APROBADA_Y_ASIGNADA'
        | 'APROBADA_REMISION_TI'
        | 'RECHAZADA'
        | 'REDISTRIBUIDA'
        | 'INICIO_VALORACION'
        | 'FINALIZA_VALORACION_CON_DISPONIBLES'
        | 'FINALIZA_VALORACION_EN_ESPERA'
        | 'EXTENSION_SLA_POR_INSUMOS'
        | 'RECEPCION_MATERIALES_Y_PASO_A_EJECUCION'
        | 'EDICION_VALORACION_POR_ENCARGADO'
        | 'INICIO_EJECUCION_DIRECTA'
        | 'CIERRE_TECNICO'
        | 'CONFORMIDAD_CONFIRMADA'
        | 'CONFORMIDAD_SIN_RESPUESTA'
        | 'CONFORMIDAD_RECHAZADA_Y_REABIERTA';
      tecnicoCodigo?: string | null;
      tecnicoNombreDisplay?: string | null;
      motivo?: string | null;
      observaciones?: string | null;
      user: AuthUser;
    },
  ): void {
    const historial = Array.isArray(solicitud.asignaciones) ? solicitud.asignaciones : [];
    historial.push({
      id:
        typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function'
          ? (crypto as any).randomUUID()
          : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10),
      fecha: new Date().toISOString(),
      accion: args.accion,
      tecnico_codigo: args.tecnicoCodigo ?? null,
      tecnico_nombre_display: args.tecnicoNombreDisplay ?? null,
      motivo: args.motivo ?? null,
      observaciones: args.observaciones ?? null,
      usuario_id: args.user.userId ?? null,
      usuario_email: args.user.email ?? null,
      usuario_roles: Array.isArray(args.user.roles) ? args.user.roles.join(',') : null,
    });
    solicitud.asignaciones = historial;
  }

  private async resolverTecnicoActivo(
    tecnicoCodigo: string,
  ): Promise<CatalogoItem> {
    const cod = (tecnicoCodigo || '').trim();
    if (!cod) {
      throw new BadRequestException('Código técnico es obligatorio para asignar / redistribuir.');
    }
    const tec = await this.catalogoRepo.findOne({
      where: { catalogo: TECNICO_MANTENIMIENTO, codigo: cod },
    });
    if (!tec) {
      throw new BadRequestException(`Técnico código ${cod} no existe en el catálogo TECNICO_MANTENIMIENTO.`);
    }
    if (!tec.isActivo) {
      throw new BadRequestException(`Técnico ${cod} está inactivo. No se puede asignar o redistribuir a un técnico inactivo.`);
    }
    return tec;
  }

  async aprobarYAsignar(
    idSolicitud: string,
    args: { tecnicoCodigo?: string | null; observaciones?: string | null },
    user: AuthUser | null | undefined,
  ): Promise<SolicitudMantenimiento & { __meta?: { warning?: string } }> {
    const vr = this.validarRolesAsignador(user);
    if (!vr.permitido) throw new ForbiddenException(vr.errorMsg);

    const solicitud = await this.findById(idSolicitud);
    const esTI = (solicitud.areaResponsableActual || '').toUpperCase() === 'TI';
    const codTec = (args.tecnicoCodigo || '').trim();

    // EFDS-1734: Validar estado permitido para primera aprobación (no permite N veces sobre ASIGNADA).
    // Si la solicitud ya fue aprobada y asignada, para cambiar técnico usar REDISTRIBUIR.
    const ESTADOS_PERMITIDOS_APROBAR = esTI
      ? ['RECIBIDA', 'PENDIENTE_APROBACION', 'EN_ANALISIS']
      : ['RECIBIDA', 'EN_ANALISIS', 'PENDIENTE_CLASIFICACION', 'PENDIENTE_APROBACION'];
    if (!ESTADOS_PERMITIDOS_APROBAR.includes(solicitud.estado || '')) {
      throw new ConflictException(
        esTI
          ? `Solo se puede aprobar la remisión a TI en estados RECIBIDA, PENDIENTE_APROBACION o EN_ANALISIS. Estado actual: ${solicitud.estado}. Para reasignar técnico utilice Redistribuir.`
          : `Solo se puede aprobar y asignar la primera vez en estados: ${ESTADOS_PERMITIDOS_APROBAR.join(', ')}. Estado actual: ${solicitud.estado}. Para cambiar técnico responsable utilice Redistribuir (acción permitida).`,
      );
    }

    if (!esTI && !codTec) {
      throw new BadRequestException('Código técnico es obligatorio para asignar / redistribuir solicitudes UMI físicas.');
    }

    let warning: string | undefined = undefined;
    let tec: CatalogoItem | null = null;

    if (esTI) {
      solicitud.estado = 'REMITIDA_TI';
      solicitud.responsableAsignado = 'Oficina de Tecnologías de la Información (TI)';
      solicitud.motivoRechazo = undefined;
      if (Array.isArray(solicitud.remisiones) && solicitud.remisiones.length > 0) {
        const ultima = solicitud.remisiones[solicitud.remisiones.length - 1];
        if (ultima && typeof ultima === 'object') {
          ultima.estado_remision = 'CONFIRMADA_RECEPCION_TI';
          ultima.fecha_confirmacion_recepcion = new Date().toISOString();
          ultima.usuario_confirma_recepcion_id = (user as AuthUser)?.userId ?? null;
          ultima.usuario_confirma_recepcion_email = (user as AuthUser)?.email ?? null;
        }
      }
      this.pushAsignacion(solicitud, {
        accion: 'APROBADA_REMISION_TI',
        tecnicoCodigo: null,
        tecnicoNombreDisplay: null,
        motivo: 'Confirmación de recepción de la remisión por la Oficina TI. Flujo interno TIC a partir de este punto.',
        observaciones: args.observaciones ?? null,
        user: user as AuthUser,
      });
    } else {
      tec = await this.resolverTecnicoActivo(codTec);
      solicitud.estado = 'ASIGNADA';
      solicitud.responsableAsignado = `${tec.codigo} · ${tec.nombre}`;
      solicitud.motivoRechazo = undefined;

      if (Number(solicitud.idCategoria) === 48) {
        const regla001 = await this.catalogoRepo.findOne({
          where: { catalogo: REGLA_ESCALAMIENTO, codigo: 'REG_001_CATEGORIA_48_ELECTRICAS' },
        });
        const esperadoCodigo =
          regla001?.metadata && typeof regla001.metadata === 'object' ? (regla001.metadata as any).tecnicoCodigo : null;
        if (esperadoCodigo && String(esperadoCodigo).trim() !== '' && String(esperadoCodigo).trim() !== tec.codigo) {
          warning =
            '⚠️ Aprobación manual: la solicitud pertenece a categoría Eléctricas (CS_002). Regla ESPECIALIZACIÓN sugiere: ' +
            String(esperadoCodigo).trim() +
            '. Usted asignó: ' +
            tec.codigo +
            '. Queda registrada en historial para auditoría.';
        }
      }

      this.pushAsignacion(solicitud, {
        accion: 'APROBADA_Y_ASIGNADA',
        tecnicoCodigo: tec.codigo,
        tecnicoNombreDisplay: tec.nombre,
        motivo: null,
        observaciones: args.observaciones ?? null,
        user: user as AuthUser,
      });
    }

    const saved = await this.mantenimientoRepo.save(solicitud);
    if (warning) (saved as any).__meta = { warning };
    return saved as any;
  }

  async rechazar(
    idSolicitud: string,
    args: { motivo: string; observaciones?: string | null },
    user: AuthUser | null | undefined,
  ): Promise<SolicitudMantenimiento> {
    const vr = this.validarRolesAsignador(user);
    if (!vr.permitido) throw new ForbiddenException(vr.errorMsg);

    const motivo = (args.motivo || '').trim();
    if (motivo.length === 0) {
      throw new BadRequestException('Motivo de rechazo es obligatorio y no puede estar vacío.');
    }
    if (motivo.length < 10) {
      throw new BadRequestException('Motivo de rechazo requiere al menos 10 caracteres.');
    }

    const solicitud = await this.findById(idSolicitud);
    const esTI = (solicitud.areaResponsableActual || '').toUpperCase() === 'TI';

    // EFDS-1734: Rechazo solo tiene sentido pre-aprobación.
    const ESTADOS_PERMITIDOS_RECHAZAR = esTI
      ? ['PENDIENTE_APROBACION', 'EN_ANALISIS']
      : ['RECIBIDA', 'EN_ANALISIS', 'PENDIENTE_CLASIFICACION', 'PENDIENTE_APROBACION'];
    if (!ESTADOS_PERMITIDOS_RECHAZAR.includes(solicitud.estado || '')) {
      throw new ConflictException(
        `Solo se puede rechazar en estados previos a la aprobación: ${ESTADOS_PERMITIDOS_RECHAZAR.join(', ')}. Estado actual: ${solicitud.estado}. La solicitud ya fue aprobada y asignada; no se puede rechazar retroactivamente.`,
      );
    }

    solicitud.estado = 'RECHAZADA';
    solicitud.motivoRechazo = motivo;
    solicitud.responsableAsignado = null as any;

    if (esTI) {
      solicitud.areaResponsableActual = 'UMI';
      solicitud.tipoAtencion = 'FISICA';
      if (Array.isArray(solicitud.remisiones) && solicitud.remisiones.length > 0) {
        const ultima = solicitud.remisiones[solicitud.remisiones.length - 1];
        if (ultima && typeof ultima === 'object') {
          ultima.estado_remision = 'RECHAZADA_POR_UMI';
          ultima.fecha_rechazo_recepcion = new Date().toISOString();
          ultima.usuario_rechaza_recepcion_id = (user as AuthUser)?.userId ?? null;
          ultima.usuario_rechaza_recepcion_email = (user as AuthUser)?.email ?? null;
        }
      }
    }

    this.pushAsignacion(solicitud, {
      accion: 'RECHAZADA',
      tecnicoCodigo: null,
      tecnicoNombreDisplay: null,
      motivo: motivo,
      observaciones: args.observaciones ?? null,
      user: user as AuthUser,
    });

    return this.mantenimientoRepo.save(solicitud);
  }

  async redistribuir(
    idSolicitud: string,
    args: { tecnicoCodigo: string; motivoRedistribucion?: string | null; observaciones?: string | null },
    user: AuthUser | null | undefined,
  ): Promise<SolicitudMantenimiento> {
    const vr = this.validarRolesAsignador(user);
    if (!vr.permitido) throw new ForbiddenException(vr.errorMsg);

    const solicitud = await this.findById(idSolicitud);

    // EFDS-1734: Redistribuir se permite solo cuando la solicitud no está cerrada/rechazada/remitida.
    const ESTADOS_NO_PERMITIDOS = [
      'COMPLETADA',
      'CERRADA',
      'CERRADA_SIN_ATENCION',
      'RECHAZADA',
      'REMITIDA_TI',
    ];
    if (ESTADOS_NO_PERMITIDOS.includes(solicitud.estado || '')) {
      throw new ConflictException(
        `No se puede redistribuir una solicitud en estado ${solicitud.estado}. Estados no permitidos: ${ESTADOS_NO_PERMITIDOS.join(', ')}.`,
      );
    }

    const tec = await this.resolverTecnicoActivo(args.tecnicoCodigo);
    // D10: si estaba RECIBIDA pasa a ASIGNADA. Si ASIGNADA/EN_ANALISIS/EN_PROGRESO se mantiene el estado actual.
    if (solicitud.estado === 'RECIBIDA' || !solicitud.estado) {
      solicitud.estado = 'ASIGNADA';
    }
    solicitud.responsableAsignado = `${tec.codigo} · ${tec.nombre}`;
    if (solicitud.estado !== 'RECHAZADA') solicitud.motivoRechazo = undefined;

    this.pushAsignacion(solicitud, {
      accion: 'REDISTRIBUIDA',
      tecnicoCodigo: tec.codigo,
      tecnicoNombreDisplay: tec.nombre,
      motivo: (args.motivoRedistribucion || '').trim() || null,
      observaciones: args.observaciones ?? null,
      user: user as AuthUser,
    });

    return this.mantenimientoRepo.save(solicitud);
  }

  // ---------------------------------------------------------------------------
  // EFDS-1735 RF-INF-006. Valoración en campo y registro de insumos requeridos
  // ---------------------------------------------------------------------------

  private usuarioEsSuperAdminOAsignador(user: AuthUser | null | undefined): boolean {
    if (!user || !Array.isArray(user.roles)) return false;
    const roles = user.roles.map((r) => String(r || '').toUpperCase());
    return (
      roles.includes('SUPER_ADMIN') ||
      roles.includes('GESTOR_MANTENIMIENTO') ||
      roles.includes('ADMINISTRADOR_FUNCIONAL')
    );
  }

  // EFDS-1737 L17: bypass conformidad/devolver = SUPER_ADMIN + ADMINISTRADOR_FUNCIONAL + ADMINISTRADOR_FUNCIONAL_INFRA.
  // NUNCA pasa P2 (ANALISTA_ASIGNADOR_UMI), NUNCA pasa P3/P4 TECNICOS, NUNCA pasa P7 CALIDAD.
  // Alineado 1:1 al frontend DetalleSolicitudModal.tsx esBypassConformidadValido.
  private bypassConformidadAutorizado(user: AuthUser | null | undefined): boolean {
    if (!user || !Array.isArray(user.roles)) return false;
    const roles = user.roles.map((r) => String(r || '').toUpperCase());
    return (
      roles.includes('SUPER_ADMIN') ||
      roles.includes('GESTOR_MANTENIMIENTO') ||
      roles.includes('ADMINISTRADOR_FUNCIONAL') ||
      roles.includes('ADMINISTRADOR_FUNCIONAL_INFRA')
    );
  }

  private extraerTecnicoCodigoDesdeResponsable(
    solicitud: SolicitudMantenimiento,
  ): { codigo: string | null; nombre: string | null } {
    const s = String(solicitud.responsableAsignado || '').trim();
    if (!s || s.indexOf(' · ') < 0) return { codigo: null, nombre: s || null };
    const [cod, ...rest] = s.split(' · ');
    return { codigo: (cod || '').trim() || null, nombre: rest.join(' · ').trim() || null };
  }

  private async usuarioPuedeOperarComoTecnicoAsignado(
    solicitud: SolicitudMantenimiento,
    user: AuthUser | null | undefined,
  ): Promise<{ puede: boolean; tecnicoCodigo?: string | null; tecnicoNombre?: string | null }> {
    if (!user) return { puede: false };
    const roles = (user.roles || []).map((r) => String(r).toUpperCase());
    if (this.usuarioEsSuperAdminOAsignador(user)) {
      const t = this.extraerTecnicoCodigoDesdeResponsable(solicitud);
      return { puede: true, tecnicoCodigo: t.codigo, tecnicoNombre: t.nombre };
    }
    const t = this.extraerTecnicoCodigoDesdeResponsable(solicitud);
    if (!t.codigo) return { puede: false };
    const tecnico = await this.catalogoRepo.findOne({
      where: { catalogo: TECNICO_MANTENIMIENTO, codigo: t.codigo, isActivo: true },
    });
    if (!tecnico || !tecnico.metadata || typeof tecnico.metadata !== 'object') {
      return { puede: false };
    }
    const md = tecnico.metadata as any;
    const correos = Array.isArray(md.correos) ? md.correos : [];
    const ids = Array.isArray(md.usuarioIdsAutorizados) ? md.usuarioIdsAutorizados : [];
    const coincide =
      correos.some((c: string) => String(c).toLowerCase() === String(user.email || '').toLowerCase()) ||
      ids.some((id: string) => String(id) === String(user.userId || ''));
    if (coincide) {
      return { puede: true, tecnicoCodigo: t.codigo, tecnicoNombre: t.nombre };
    }
    return { puede: false };
  }

  private async validarEspecializacionCS002(
    solicitud: SolicitudMantenimiento,
    per: { puede: boolean; tecnicoCodigo?: string | null; tecnicoNombre?: string | null },
    user: AuthUser | null | undefined,
  ): Promise<void> {
    if (Number(solicitud.idCategoria) !== 48) return;
    if (this.usuarioEsSuperAdminOAsignador(user)) return;
    const tecnicoAsignadoCodigo = per.tecnicoCodigo;
    if (!tecnicoAsignadoCodigo) return;
    const ID_CS_002 = 48;
    const tecnico = await this.catalogoRepo.findOne({
      where: { catalogo: TECNICO_MANTENIMIENTO, codigo: tecnicoAsignadoCodigo, isActivo: true },
    });
    let tecnicoEsElectricoValido = false;
    if (tecnico && tecnico.metadata && typeof tecnico.metadata === 'object') {
      const md = tecnico.metadata as any;
      const categoriasPermitidasIds = Array.isArray(md.categoriasPermitidasIds)
        ? (md.categoriasPermitidasIds as any[]).map((x) => Number(x))
        : [];
      const especialidadesIds = Array.isArray(md.especialidadesIds)
        ? (md.especialidadesIds as any[]).map((x) => Number(x))
        : [];
      const categoriasExcluidasIds = Array.isArray(md.categoriasExcluidasIds)
        ? (md.categoriasExcluidasIds as any[]).map((x) => Number(x))
        : [];
      if (categoriasExcluidasIds.includes(ID_CS_002)) {
        tecnicoEsElectricoValido = false;
      } else if (
        categoriasPermitidasIds.includes(ID_CS_002) ||
        especialidadesIds.includes(ID_CS_002) ||
        tecnico.codigo.toUpperCase().startsWith('TEC-ELEC')
      ) {
        tecnicoEsElectricoValido = true;
      }
    }
    if (tecnicoEsElectricoValido) return;

    const regla001 = await this.catalogoRepo.findOne({
      where: { catalogo: REGLA_ESCALAMIENTO, codigo: 'REG_001_CATEGORIA_48_ELECTRICAS' },
    });
    const esp =
      regla001?.metadata && typeof regla001.metadata === 'object'
        ? String((regla001.metadata as any).tecnicoCodigo || '').trim()
        : '';
    if (esp && tecnicoAsignadoCodigo === esp) return;
    throw new ForbiddenException(
      'La categoría CS_002 Eléctricas requiere el técnico especializado configurado en la regla 001.',
    );
  }

  async iniciarEjecucionDirecta(
    idSolicitud: string,
    user: AuthUser | null | undefined,
  ): Promise<SolicitudMantenimiento> {
    const solicitud = await this.findById(idSolicitud);
    const esTI = (solicitud.areaResponsableActual || '').toUpperCase() === 'TI';
    if (esTI) {
      throw new BadRequestException('Las solicitudes TI no pasan por valoración o ejecución física UMI.');
    }
    const per = await this.usuarioPuedeOperarComoTecnicoAsignado(solicitud, user);
    if (!per.puede) {
      throw new ForbiddenException('No está autorizado para iniciar la ejecución de esta solicitud.');
    }
    await this.validarEspecializacionCS002(solicitud, per, user);
    if (solicitud.estado !== 'ASIGNADA') {
      throw new ConflictException(
        `La solicitud debe estar en estado ASIGNADA para iniciar ejecución directa. Estado actual: ${solicitud.estado}`,
      );
    }
    solicitud.estadoValoracion = 'NO_APLICA';
    solicitud.estado = 'EN_PROGRESO';
    solicitud.fechaInicioValoracion = undefined;
    solicitud.fechaFinValoracion = undefined;

    this.pushAsignacion(solicitud, {
      accion: 'INICIO_EJECUCION_DIRECTA',
      tecnicoCodigo: per.tecnicoCodigo ?? null,
      tecnicoNombreDisplay: per.tecnicoNombre ?? null,
      motivo: 'Inicio de ejecución sin valoración previa (alcance evidente).',
      observaciones: null,
      user: user as AuthUser,
    });

    return this.mantenimientoRepo.save(solicitud);
  }

  async iniciarValoracion(
    idSolicitud: string,
    _dto: IniciarValoracionDto | null | undefined,
    user: AuthUser | null | undefined,
  ): Promise<{ solicitud: SolicitudMantenimiento; valoracion: SolicitudValoracion }> {
    const solicitud = await this.findById(idSolicitud);
    const esTI = (solicitud.areaResponsableActual || '').toUpperCase() === 'TI';
    if (esTI) {
      throw new BadRequestException('Las solicitudes TI no pasan por valoración física UMI.');
    }
    const per = await this.usuarioPuedeOperarComoTecnicoAsignado(solicitud, user);
    if (!per.puede) {
      throw new ForbiddenException('No está autorizado para registrar la valoración de esta solicitud.');
    }
    await this.validarEspecializacionCS002(solicitud, per, user);
    if (!['ASIGNADA', 'EN_CAMPO_VALORACION'].includes(solicitud.estado || '')) {
      throw new ConflictException(
        `La solicitud debe estar ASIGNADA o EN_CAMPO_VALORACION para registrar valoración. Estado actual: ${solicitud.estado}`,
      );
    }

    const ahora = new Date();
    solicitud.estado = 'EN_CAMPO_VALORACION';
    solicitud.estadoValoracion = 'EN_CURSO';
    solicitud.fechaInicioValoracion = solicitud.fechaInicioValoracion ?? ahora;

    let valoracion = await this.valoracionRepo.findOne({
      where: {
        idSolicitudMantenimiento: solicitud.idSolicitud,
        estadoAlFinalizar: undefined as any,
      },
      order: { createdAt: 'DESC' },
    });
    if (!valoracion) {
      valoracion = this.valoracionRepo.create({
        idSolicitudMantenimiento: solicitud.idSolicitud,
        idTecnicoValorador: user?.userId ?? undefined,
        tecnicoCodigo: per.tecnicoCodigo ?? undefined,
        tecnicoNombre: per.tecnicoNombre || (user?.username || 'Usuario sin nombre'),
        diagnostico: 'Visita técnica en curso…',
        alcanceIdentificado: 'Pendiente diligenciar durante la visita.',
        tiempoEstimadoHoras: 1,
        nivelRiesgo: 'BAJO',
        requiereApagadoElectrico: false,
        evidencias: [],
        estadoAlFinalizar: 'EN_PROGRESO',
        fechaInicioValoracion: solicitud.fechaInicioValoracion ?? ahora,
        fechaFinValoracion: ahora,
      });
      valoracion = await this.valoracionRepo.save(valoracion as any);
    }

    const valoracionNonNull = valoracion!;
    this.pushAsignacion(solicitud, {
      accion: 'INICIO_VALORACION',
      tecnicoCodigo: per.tecnicoCodigo ?? null,
      tecnicoNombreDisplay: per.tecnicoNombre ?? null,
      motivo: 'Inicio de visita de valoración en campo.',
      observaciones: `idValoracion=${valoracionNonNull.idValoracion}`,
      user: user as AuthUser,
    });

    const savedSol = await this.mantenimientoRepo.save(solicitud);
    return { solicitud: savedSol, valoracion: valoracionNonNull };
  }

  async guardarValoracionCompleta(
    idValoracion: string,
    dto: GuardarValoracionCompletaDto,
    user: AuthUser | null | undefined,
  ): Promise<{ solicitud: SolicitudMantenimiento; valoracion: SolicitudValoracion }> {
    const valoracion = await this.valoracionRepo.findOne({
      where: { idValoracion },
      relations: ['solicitud'],
    });
    if (!valoracion) {
      throw new NotFoundException(`Valoración ${idValoracion} no encontrada.`);
    }
    const solicitud = valoracion.solicitud;
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada para la valoración.');

    const per = await this.usuarioPuedeOperarComoTecnicoAsignado(solicitud, user);
    if (!per.puede) {
      throw new ForbiddenException('No está autorizado para guardar la valoración.');
    }
    await this.validarEspecializacionCS002(solicitud, per, user);
    if (solicitud.estado !== 'EN_CAMPO_VALORACION' && solicitud.estado !== 'ASIGNADA') {
      throw new ConflictException(
        `No se puede editar la valoración con la solicitud en estado ${solicitud.estado}.`,
      );
    }

    const diagnostico = (dto.diagnostico || '').trim();
    const alcance = (dto.alcanceIdentificado || '').trim();
    if (diagnostico.length < 10) {
      throw new BadRequestException('El diagnóstico debe contener al menos 10 caracteres.');
    }
    if (alcance.length < 10) {
      throw new BadRequestException('El alcance identificado debe contener al menos 10 caracteres.');
    }
    if (!dto.tiempoEstimadoHoras || Number(dto.tiempoEstimadoHoras) < 0.25) {
      throw new BadRequestException('El tiempo estimado de ejecución debe ser >= 0.25 horas.');
    }
    if (!['BAJO', 'MEDIO', 'ALTO'].includes(dto.nivelRiesgo || '')) {
      throw new BadRequestException("Nivel de riesgo inválido. Use 'BAJO', 'MEDIO' o 'ALTO'.");
    }
    const esElectrico = Number(solicitud.idCategoria) === 48;
    if (esElectrico && dto.requiereApagadoElectrico === null || dto.requiereApagadoElectrico === undefined) {
      throw new BadRequestException(
        'Para CS_002 Eléctricas debe marcar si requiere apagado/aislamiento eléctrico.',
      );
    }

    const insumos = Array.isArray(dto.insumos) ? dto.insumos : [];
    let totalEstimado = 0;
    let maxDiasAdquisicion = 0;
    let hayNoDisponible = false;
    for (const it of insumos) {
      const nombre = (it.nombre || '').trim();
      if (nombre.length < 2) throw new BadRequestException('Cada insumo debe tener un nombre de al menos 2 caracteres.');
      if (!it.cantidad || Number(it.cantidad) <= 0) {
        throw new BadRequestException(`Cantidad inválida para el insumo ${nombre}.`);
      }
      const disp = (it.disponibilidad || '').toUpperCase();
      if (!['DISPONIBLE_EN_BODEGA', 'NO_DISPONIBLE_A_SOLICITAR'].includes(disp)) {
        throw new BadRequestException(
          `Disponibilidad inválida para el insumo ${nombre}. Valores permitidos: DISPONIBLE_EN_BODEGA, NO_DISPONIBLE_A_SOLICITAR.`,
        );
      }
      if (disp === 'NO_DISPONIBLE_A_SOLICITAR') {
        if (it.tiempoAdquisicionDias === undefined || it.tiempoAdquisicionDias === null) {
          throw new BadRequestException(
            `Insumo ${nombre}: para disponibilidad NO_DISPONIBLE_A_SOLICITAR, indique tiempo de adquisición en días.`,
          );
        }
        const d = Number(it.tiempoAdquisicionDias);
        if (!Number.isFinite(d) || d < 0 || d > 90) {
          throw new BadRequestException(`Insumo ${nombre}: tiempo de adquisición inválido (0-90 días).`);
        }
        hayNoDisponible = true;
        if (d > maxDiasAdquisicion) maxDiasAdquisicion = d;
      }
      totalEstimado += Number(it.cantidad) * Number(it.costoUnitarioCop || 0);
    }

    // Actualizar valoración
    valoracion.diagnostico = diagnostico;
    valoracion.alcanceIdentificado = alcance;
    valoracion.tiempoEstimadoHoras = Number(dto.tiempoEstimadoHoras);
    valoracion.nivelRiesgo = dto.nivelRiesgo as any;
    valoracion.requiereApagadoElectrico = esElectrico ? Boolean(dto.requiereApagadoElectrico) : false;
    valoracion.observaciones = (dto.observaciones || '').trim() || undefined;
    valoracion.evidencias = Array.isArray(dto.evidencias) ? dto.evidencias : [];
    valoracion.fechaFinValoracion = new Date();

    const estadoFinal: 'EN_PROGRESO' | 'EN_ESPERA_DE_INSUMOS' = hayNoDisponible
      ? 'EN_ESPERA_DE_INSUMOS'
      : 'EN_PROGRESO';
    valoracion.estadoAlFinalizar = estadoFinal;

    const savedValoracion = await this.valoracionRepo.save(valoracion as any);

    // Reemplazar insumos
    await this.valoracionInsumoRepo.delete({ idValoracion });
    if (insumos.length > 0) {
      const rows = insumos.map((it, idx) =>
        this.valoracionInsumoRepo.create({
          idValoracion: savedValoracion.idValoracion,
          codigoInsumo: (it.codigoInsumo || '').trim() || undefined,
          nombre: (it.nombre || '').trim(),
          cantidad: Number(it.cantidad),
          unidadMedida: it.unidadMedida || 'un',
          costoUnitarioCop: Number(it.costoUnitarioCop || 0),
          disponibilidad: (it.disponibilidad || '').toUpperCase() as any,
          tiempoAdquisicionDias:
            it.disponibilidad &&
            String(it.disponibilidad).toUpperCase() === 'NO_DISPONIBLE_A_SOLICITAR'
              ? Number(it.tiempoAdquisicionDias)
              : undefined,
          ordenItem: idx + 1,
        } as any),
      );
      await this.valoracionInsumoRepo.save(rows as any);
    }

    // Actualizar solicitud
    solicitud.estadoValoracion = 'FINALIZADA';
    solicitud.fechaFinValoracion = savedValoracion.fechaFinValoracion;
    solicitud.riesgoValoracion = savedValoracion.nivelRiesgo;
    solicitud.requiereApagadoElectrico = savedValoracion.requiereApagadoElectrico;
    solicitud.totalEstimadoInsumosCop = totalEstimado;
    solicitud.estado = estadoFinal;
    solicitud.esperaInsumosFlag = hayNoDisponible;

    if (hayNoDisponible && maxDiasAdquisicion > 0) {
      if (solicitud.fechaLimiteAtencion) {
        solicitud.fechaLimiteOriginalAntesExtension =
          solicitud.fechaLimiteOriginalAntesExtension ?? solicitud.fechaLimiteAtencion;
        const original = new Date(solicitud.fechaLimiteOriginalAntesExtension).getTime();
        const nueva = new Date(original + maxDiasAdquisicion * 24 * 60 * 60 * 1000);
        solicitud.fechaLimiteAtencion = nueva;
        const diffMs = nueva.getTime() - new Date(solicitud.fechaLimiteOriginalAntesExtension).getTime();
        solicitud.diasExtendidosPorInsumos = Math.max(
          solicitud.diasExtendidosPorInsumos || 0,
          Math.round(diffMs / (24 * 60 * 60 * 1000)),
        );
        this.pushAsignacion(solicitud, {
          accion: 'EXTENSION_SLA_POR_INSUMOS',
          tecnicoCodigo: null,
          tecnicoNombreDisplay: null,
          motivo: `Se extiende la fecha límite en ${solicitud.diasExtendidosPorInsumos} días por materiales pendientes.`,
          observaciones: JSON.stringify({
            fechaOriginal: solicitud.fechaLimiteOriginalAntesExtension,
            fechaNueva: nueva.toISOString(),
            diasAdicionales: maxDiasAdquisicion,
          }),
          user: user as AuthUser,
        });
      }
    }

    this.pushAsignacion(solicitud, {
      accion: hayNoDisponible
        ? 'FINALIZA_VALORACION_EN_ESPERA'
        : 'FINALIZA_VALORACION_CON_DISPONIBLES',
      tecnicoCodigo: per.tecnicoCodigo ?? null,
      tecnicoNombreDisplay: per.tecnicoNombre ?? null,
      motivo: hayNoDisponible
        ? 'Valoración finalizada con insumos pendientes por solicitar.'
        : 'Valoración finalizada; todos los insumos están en bodega. Inicia ejecución.',
      observaciones: `idValoracion=${savedValoracion.idValoracion} · totalEstimado=$${Math.round(totalEstimado).toLocaleString('es-CO')} COP`,
      user: user as AuthUser,
    });

    const savedSol = await this.mantenimientoRepo.save(solicitud);
    return { solicitud: savedSol, valoracion: savedValoracion };
  }

  async confirmarRecepcionInsumos(
    idSolicitud: string,
    dto: ConfirmarRecepcionInsumosDto,
    user: AuthUser | null | undefined,
  ): Promise<SolicitudMantenimiento> {
    const vr = this.validarRolesAsignador(user);
    if (!vr.permitido) throw new ForbiddenException(vr.errorMsg);
    const solicitud = await this.findById(idSolicitud);
    if (solicitud.estado !== 'EN_ESPERA_DE_INSUMOS') {
      throw new ConflictException(
        `Solo se puede confirmar recepción de insumos en estado EN_ESPERA_DE_INSUMOS. Estado actual: ${solicitud.estado}`,
      );
    }
    solicitud.estado = 'EN_PROGRESO';
    solicitud.esperaInsumosFlag = false;
    const t = this.extraerTecnicoCodigoDesdeResponsable(solicitud);
    this.pushAsignacion(solicitud, {
      accion: 'RECEPCION_MATERIALES_Y_PASO_A_EJECUCION',
      tecnicoCodigo: t.codigo ?? null,
      tecnicoNombreDisplay: t.nombre ?? null,
      motivo: (dto?.observaciones || '').trim() || 'Materiales recibidos. Inicia ejecución del trabajo.',
      observaciones: null,
      user: user as AuthUser,
    });
    return this.mantenimientoRepo.save(solicitud);
  }

  async obtenerCierreTecnico(
    idSolicitud: string,
    _user: AuthUser | null | undefined,
  ): Promise<CierreTecnicoResponse> {
    const solicitud = await this.findById(idSolicitud);
    return {
      cerrado: !!solicitud.fechaCierreTecnico,
      idSolicitud: solicitud.idSolicitud,
      consecutivo: solicitud.consecutivo,
      fechaCierreTecnico: solicitud.fechaCierreTecnico,
      usuarioCierreTecnicoId: solicitud.usuarioCierreTecnicoId,
      responsableCierreDisplay: solicitud.responsableCierreDisplay,
      trabajoRealizado: solicitud.trabajoRealizado,
      observacionesCierre: solicitud.observacionesCierre,
      costoFinalEfectivoCop: Number(solicitud.costoFinalEfectivoCop || 0),
      evidenciasCierre: Array.isArray(solicitud.evidenciasCierre) ? solicitud.evidenciasCierre : [],
      requiereSeguimiento: !!solicitud.requiereSeguimiento,
    };
  }

  // ---------------------------------------------------------------------------
  // Notificaciones EFDS-1737 RF-INF-008 — módulo campanita + correo electrónico
  // Patrón singleton fire-and-forget; si NotificationClientService no está
  // inyectado (entorno Jest/spec) se convierte en no-op sin romper nada.
  // ---------------------------------------------------------------------------

  private readonly UMI_APP_FRONT_URL: string = (process.env.WEB_APP_URL ?? 'https://app.esap.edu.co').replace(/\/$/, '');

  private solicitudAccionUrl(solicitud: SolicitudMantenimiento): string {
    return `${this.UMI_APP_FRONT_URL}/umi/solicitudes/${encodeURIComponent(solicitud.idSolicitud)}`;
  }

  private async notificarAlSolicitante(
    solicitud: SolicitudMantenimiento,
    payload: {
      tipo: string;
      titulo: string;
      mensaje: string;
      icono?: string;
      color?: string;
      prioridad?: SendNotificationDto['prioridad'];
      textoAccion?: string;
      emailHtml: string;
      emailSubject: string;
    },
  ): Promise<void> {
    if (!this.notificaciones) return;
    try {
      const destinatarioId = String(solicitud.usuarioSolicitanteId || '').trim();
      const destinatarioEmail = String(solicitud.usuarioSolicitanteEmail ?? solicitud.solicitanteEmail ?? '').trim();
      if (!destinatarioId && !destinatarioEmail) {
        this.notifLogger.debug(`[${solicitud.idSolicitud}] sin solicitante para notificar evento ${payload.tipo}`);
        return;
      }
      const descripcion = `Solicitud #${solicitud.consecutivo ?? solicitud.idSolicitud.slice(0, 8)} · Radicada: ${String(solicitud.createdAt ?? '').slice(0, 10) || 'N/A'}`;
      const url = this.solicitudAccionUrl(solicitud);
      if (destinatarioId) {
        const dtoApp: Omit<SendNotificationDto, 'id_usuario_destinatario'> = {
          tipo_notificacion: payload.tipo,
          titulo: payload.titulo,
          mensaje: payload.mensaje,
          descripcion_corta: descripcion,
          icono: payload.icono ?? 'ClipboardCheck',
          color: payload.color ?? '#0f766e',
          prioridad: payload.prioridad ?? 'Media',
          categoria: 'UMI-MANTENIMIENTO',
          tiene_accion: true,
          texto_boton_accion: payload.textoAccion ?? 'Ver solicitud',
          url_accion: url,
          datos_adicionales: { modulo: 'UMI', idSolicitud: solicitud.idSolicitud, estado: solicitud.estado, tipo: payload.tipo },
        };
        const emailOpts = destinatarioEmail ? { subject: payload.emailSubject, html: payload.emailHtml } : undefined;
        await this.notificaciones.notifyUserById(destinatarioId, dtoApp, emailOpts);
        this.notifLogger.verbose(`[${solicitud.idSolicitud}] notificación "${payload.tipo}" enviada a solicitante ${destinatarioId}`);
      } else if (destinatarioEmail) {
        // Caso legacy sin usuario registrado (sólo email)
        await this.notificaciones.sendEmail(destinatarioEmail, payload.emailSubject, payload.emailHtml);
        this.notifLogger.verbose(`[${solicitud.idSolicitud}] correo "${payload.tipo}" enviado a ${destinatarioEmail} (sin id_user)`);
      }
    } catch (err: any) {
      this.notifLogger.warn(`[${solicitud.idSolicitud}] notificación "${payload.tipo}" falló: ${err?.message ?? err}`);
    }
  }

  private async notificarTecnicoAsignado(
    solicitud: SolicitudMantenimiento,
    args: {
      tipo: string;
      titulo: string;
      mensaje: string;
      color?: string;
      icono?: string;
      prioridad?: SendNotificationDto['prioridad'];
      textoAccion?: string;
      emailSubject: string;
      emailHtml: string;
    },
  ): Promise<void> {
    if (!this.notificaciones) return;
    try {
      const t = this.extraerTecnicoCodigoDesdeResponsable(solicitud);
      const codigoTec = (t.codigo || '').toString();
      if (!codigoTec) return;
      const catalogo = await this.catalogoRepo.findOne({
        where: { catalogo: TECNICO_MANTENIMIENTO, codigo: codigoTec, isActivo: true },
      });
      const tecUserId: string | undefined =
        (catalogo?.metadata as any)?.usuarioIdsAutorizados?.[0] ?? (catalogo?.metadata as any)?.usuarioIdAutorizado;
      const tecEmail: string | undefined = (catalogo?.metadata as any)?.correos?.[0];
      if (!tecUserId && !tecEmail) return;
      const url = this.solicitudAccionUrl(solicitud);
      const descripcion = `#${solicitud.consecutivo ?? solicitud.idSolicitud.slice(0, 8)} · ${solicitud.estado ?? 'N/A'}`;
      if (tecUserId) {
        const dto: Omit<SendNotificationDto, 'id_usuario_destinatario'> = {
          tipo_notificacion: args.tipo,
          titulo: args.titulo,
          mensaje: args.mensaje,
          descripcion_corta: descripcion,
          icono: args.icono ?? 'Wrench',
          color: args.color ?? '#0369a1',
          prioridad: args.prioridad ?? 'Media',
          categoria: 'UMI-MANTENIMIENTO',
          tiene_accion: true,
          texto_boton_accion: args.textoAccion ?? 'Ver solicitud',
          url_accion: url,
          datos_adicionales: { modulo: 'UMI', idSolicitud: solicitud.idSolicitud, estado: solicitud.estado },
        };
        await this.notificaciones.notifyUserById(tecUserId, dto, tecEmail ? { subject: args.emailSubject, html: args.emailHtml } : undefined);
      } else if (tecEmail) {
        await this.notificaciones.sendEmail(tecEmail, args.emailSubject, args.emailHtml);
      }
    } catch (err: any) {
      this.notifLogger.warn(`[${solicitud.idSolicitud}] notificación técnico falló: ${err?.message ?? err}`);
    }
  }

  private async notificarTecnicoAsignadoReapertura(
    solicitud: SolicitudMantenimiento,
    args: { obs: string; conteo: number; slaHoras: number },
  ): Promise<void> {
    if (!this.notificaciones) return;
    const url = this.solicitudAccionUrl(solicitud);
    const html = `<div style="font-family:Segoe UI,Segoe,sans-serif;max-width:720px">
<h3 style="margin:0 0 8px">Solicitud UMI reabierta tras rechazo de conformidad</h3>
<p style="margin:0 0 8px"><strong>Solicitud:</strong> #${solicitud.consecutivo ?? solicitud.idSolicitud}</p>
<p style="margin:0 0 8px"><strong>Motivo rechazo conformidad:</strong> ${args.obs}</p>
<p style="margin:0 0 8px"><strong>Nuevo SLA:</strong> ${args.slaHoras} horas a partir de ahora.</p>
<p style="margin:0 0 16px"><a href="${url}" style="display:inline-block;padding:6px 14px;background:#b45309;color:#fff;border-radius:6px;text-decoration:none">Ir a la solicitud</a></p>
</div>`;
    await this.notificarTecnicoAsignado(solicitud, {
      tipo: 'UMI_CONFORMIDAD_RECHAZADA_Y_REABIERTA_TECNICO',
      titulo: 'Solicitud UMI reabierta tras rechazo de conformidad',
      mensaje: `El área solicitante rechazó el cierre técnico y la solicitud ha vuelto a EN_PROGRESO. Motivo del rechazo: ${args.obs}`,
      icono: 'RotateCcw',
      color: '#b45309',
      prioridad: 'Alta',
      textoAccion: 'Gestionar reapertura',
      emailSubject: `[UMI] Reapertura solicitud #${solicitud.consecutivo ?? solicitud.idSolicitud.slice(0, 8)} (rechazo #${args.conteo})`,
      emailHtml: html,
    });
  }

  private plantillaEmailCierreTecnico(solicitud: SolicitudMantenimiento, args: { displayTecnico: string; resumen: string; plazoH: number }): { subject: string; html: string } {
    const url = this.solicitudAccionUrl(solicitud);
    const subject = `[UMI] Cierre técnico de solicitud #${solicitud.consecutivo ?? solicitud.idSolicitud.slice(0, 8)} — Plazo para conformidad ${args.plazoH}h`;
    const html = `<div style="font-family:Segoe UI,Segoe,sans-serif;max-width:720px">
<h3 style="margin:0 0 8px;color:#0f766e">Cierre técnico registrado</h3>
<p style="margin:0 0 8px"><strong>Solicitud:</strong> #${solicitud.consecutivo ?? solicitud.idSolicitud}</p>
<p style="margin:0 0 8px"><strong>Categoría:</strong> ${(solicitud as any).categoriaNombre ?? 'Categoría UMI'} · <strong>Técnico responsable:</strong> ${args.displayTecnico}</p>
<p style="margin:0 0 8px"><strong>Resumen:</strong> ${args.resumen}</p>
<p style="margin:0 0 16px">Tienes <strong>${args.plazoH} horas hábiles</strong> para revisar el trabajo realizado y dar conformidad o rechazar indicando las observaciones. Vencido el plazo la solicitud se cerrará automáticamente como <em>sin respuesta del área</em>.</p>
<p style="margin:0 0 16px"><a href="${url}" style="display:inline-block;padding:6px 14px;background:#0f766e;color:#fff;border-radius:6px;text-decoration:none">Revisar conformidad</a></p>
</div>`;
    return { subject, html };
  }

  private plantillaEmailConfirmacion(solicitud: SolicitudMantenimiento, args: { usuario: string }): { subject: string; html: string } {
    const url = this.solicitudAccionUrl(solicitud);
    const subject = `[UMI] Solicitud #${solicitud.consecutivo ?? solicitud.idSolicitud.slice(0, 8)} cerrada a satisfacción`;
    const html = `<div style="font-family:Segoe UI,Segoe,sans-serif;max-width:720px">
<h3 style="margin:0 0 8px;color:#115e59">Solicitud cerrada</h3>
<p style="margin:0 0 8px">El área solicitante (<strong>${args.usuario}</strong>) confirmó conformidad con el trabajo realizado.</p>
<p style="margin:0 0 16px"><a href="${url}" style="display:inline-block;padding:6px 14px;background:#115e59;color:#fff;border-radius:6px;text-decoration:none">Ver solicitud cerrada</a></p>
</div>`;
    return { subject, html };
  }

  private plantillaEmailRechazoYReapertura(solicitud: SolicitudMantenimiento, args: { usuario: string; obs: string; slaH: number; conteo: number }): { subject: string; html: string } {
    const url = this.solicitudAccionUrl(solicitud);
    const subject = `[UMI] Solicitud #${solicitud.consecutivo ?? solicitud.idSolicitud.slice(0, 8)} reabierta (rechazo #${args.conteo})`;
    const html = `<div style="font-family:Segoe UI,Segoe,sans-serif;max-width:720px">
<h3 style="margin:0 0 8px;color:#b45309">Conformidad rechazada — solicitud reabierta</h3>
<p style="margin:0 0 8px"><strong>Usuario:</strong> ${args.usuario}</p>
<p style="margin:0 0 8px"><strong>Observaciones del rechazo:</strong> ${args.obs}</p>
<p style="margin:0 0 8px">La solicitud ha regresado al estado <strong>EN_PROGRESO</strong> con un nuevo SLA de <strong>${args.slaH} horas</strong>.</p>
<p style="margin:0 0 16px"><a href="${url}" style="display:inline-block;padding:6px 14px;background:#b45309;color:#fff;border-radius:6px;text-decoration:none">Gestionar reapertura</a></p>
</div>`;
    return { subject, html };
  }

  private plantillaEmailSinRespuesta(solicitud: SolicitudMantenimiento): { subject: string; html: string } {
    const url = this.solicitudAccionUrl(solicitud);
    const subject = `[UMI] Solicitud #${solicitud.consecutivo ?? solicitud.idSolicitud.slice(0, 8)} cerrada automáticamente (sin respuesta)`;
    const html = `<div style="font-family:Segoe UI,Segoe,sans-serif;max-width:720px">
<h3 style="margin:0 0 8px;color:#475569">Cierre por vencimiento del plazo de conformidad</h3>
<p style="margin:0 0 8px">No se recibió respuesta del área solicitante dentro del plazo establecido. La solicitud ha sido cerrada automáticamente con el resultado <strong>Sin respuesta</strong>.</p>
<p style="margin:0 0 16px"><a href="${url}" style="display:inline-block;padding:6px 14px;background:#475569;color:#fff;border-radius:6px;text-decoration:none">Consultar solicitud cerrada</a></p>
</div>`;
    return { subject, html };
  }

  async cerrarTecnicamente(
    idSolicitud: string,
    dto: CerrarTecnicamenteDto,
    user: AuthUser | null | undefined,
  ): Promise<SolicitudMantenimiento> {
    const solicitud = await this.findById(idSolicitud);
    const esTI = (solicitud.areaResponsableActual || '').toUpperCase() === 'TI';
    if (esTI) {
      throw new BadRequestException('Las solicitudes TI no pasan por cierre técnico físico UMI.');
    }
    const per = await this.usuarioPuedeOperarComoTecnicoAsignado(solicitud, user);
    if (!per.puede) {
      throw new ForbiddenException('No está autorizado para cerrar técnicamente esta solicitud.');
    }
    await this.validarEspecializacionCS002(solicitud, per, user);
    if (solicitud.estado !== 'EN_PROGRESO') {
      throw new ConflictException(
        `La solicitud debe estar en estado EN_PROGRESO para cerrar técnicamente. Estado actual: ${solicitud.estado}`,
      );
    }

    const ahora = new Date();
    const costo = Number(dto.costoFinalEfectivoCop || 0);
    const nEvidencias = Array.isArray(dto.evidencias) ? dto.evidencias.length : 0;
    const displayTecnico =
      per.tecnicoCodigo && per.tecnicoNombre
        ? `${per.tecnicoCodigo} · ${per.tecnicoNombre}`
        : per.tecnicoNombre || user?.username || 'Usuario sin nombre';

    solicitud.estado = 'COMPLETADA';
    solicitud.fechaCierreTecnico = ahora;
    solicitud.usuarioCierreTecnicoId = user?.userId || undefined;
    solicitud.responsableCierreDisplay = displayTecnico;
    solicitud.trabajoRealizado = dto.trabajoRealizado;
    solicitud.observacionesCierre = dto.observaciones ?? undefined;
    solicitud.costoFinalEfectivoCop = costo;
    solicitud.evidenciasCierre = Array.isArray(dto.evidencias) ? dto.evidencias.map((e: any) => ({ ...e })) : [];
    solicitud.requiereSeguimiento = !!dto.requiereSeguimiento;
    solicitud.fechaEjecucion = solicitud.fechaEjecucion ?? ahora.toISOString().slice(0, 10);

    solicitud.fechaLimiteConformidad = new Date(ahora.getTime() + PLAZO_CONFORMIDAD_HORAS_DEFAULT * 3600 * 1000);
    solicitud.conteoReaperturasConformidad = 0;
    solicitud.resultadoConformidad = undefined;
    solicitud.fechaConformidad = undefined;
    solicitud.observacionesConformidad = undefined;
    solicitud.usuarioConformidadId = undefined;
    solicitud.responsableConformidadDisplay = undefined;

    const costoTxt = `$${Math.round(costo).toLocaleString('es-CO')} COP`;
    const motivoResumen = `Cierre técnico registrado. ${nEvidencias} evidencia(s) adjunta(s). Costo final ${costoTxt}.`;
    const obsTxt = [
      dto.observaciones ? `Obs: ${dto.observaciones}` : null,
      dto.requiereSeguimiento ? 'Marcado con requerimiento de seguimiento futuro.' : null,
    ]
      .filter(Boolean)
      .join(' · ');

    this.pushAsignacion(solicitud, {
      accion: 'CIERRE_TECNICO',
      tecnicoCodigo: per.tecnicoCodigo ?? null,
      tecnicoNombreDisplay: per.tecnicoNombre ?? null,
      motivo: motivoResumen,
      observaciones: obsTxt || null,
      user: user as AuthUser,
    });

    await this.mantenimientoRepo.save(solicitud);
    const recienCerrada = await this.findById(idSolicitud);

    // [NOTIFICACION EFDS-1737] Inicio plazo de conformidad: notificación campanita + correo al solicitante.
    void (async () => {
      try {
        const email = this.plantillaEmailCierreTecnico(recienCerrada, {
          displayTecnico,
          resumen: motivoResumen,
          plazoH: PLAZO_CONFORMIDAD_HORAS_DEFAULT,
        });
        await this.notificarAlSolicitante(recienCerrada, {
          tipo: 'UMI_CONFORMIDAD_CIERRE_TECNICO_PENDIENTE',
          titulo: 'Cierre técnico registrado — Revisa y da conformidad',
          mensaje: `La solicitud #${recienCerrada.consecutivo ?? recienCerrada.idSolicitud.slice(0, 8)} fue marcada como COMPLETADA por ${displayTecnico}. Dispones de ${PLAZO_CONFORMIDAD_HORAS_DEFAULT}h para confirmar o rechazar la conformidad.`,
          icono: 'ClipboardCheck',
          color: '#0f766e',
          prioridad: 'Alta',
          textoAccion: 'Dar conformidad / Rechazar',
          emailHtml: email.html,
          emailSubject: email.subject,
        });
      } catch (err: any) {
        this.notifLogger.warn(`[${recienCerrada.idSolicitud}] notificación cierre técnico falló: ${err?.message ?? err}`);
      }
    })();

    return recienCerrada;
  }

  // ---------------------------------------------------------------------------
  // EFDS-1737 RF-INF-008. Conformidad del Área Solicitante
  // ---------------------------------------------------------------------------

  private usuarioEsSolicitanteConforme(
    solicitud: SolicitudMantenimiento,
    user: AuthUser | null | undefined,
  ): boolean {
    // EFDS-1737 L17: actor conformidad/devolver = (a) solicitante original match, OR (b) bypass SUPER_ADMIN / ADMIN_FUNCIONAL / ADMIN_FUNCIONAL_INFRA.
    // NOTA: NO usar usuarioEsSuperAdminOAsignador (aquí incluye P2 Analista Asignador por GESTOR_MANTENIMIENTO → no queremos P2 acceda conformidad/devolver).
    if (this.bypassConformidadAutorizado(user)) return true;
    if (!user) return false;
    const userEmail = String(user.email || '').toLowerCase().trim();
    const solEmail = String(solicitud.usuarioSolicitanteEmail || solicitud.solicitanteEmail || '').toLowerCase().trim();
    const solUserId = String(solicitud.usuarioSolicitanteId || '').toLowerCase().trim();
    const currentUserId = String(user.userId || '').toLowerCase().trim();
    if (currentUserId && solUserId && currentUserId === solUserId) return true;
    if (userEmail && solEmail && userEmail === solEmail) return true;
    return false;
  }

  private estadoEsValidoParaConformidad(solicitud: SolicitudMantenimiento): boolean {
    return (solicitud.estado || '').toUpperCase() === 'COMPLETADA';
  }

  async confirmarConformidad(
    idSolicitud: string,
    dto: ConfirmarConformidadDto,
    user: AuthUser | null | undefined,
  ): Promise<SolicitudMantenimiento> {
    if (!user || !Array.isArray(user.roles) || user.roles.length === 0) {
      throw new ForbiddenException('Usuario autenticado requerido para confirmar conformidad.');
    }
    const solicitud = await this.findById(idSolicitud);
    if (!this.estadoEsValidoParaConformidad(solicitud)) {
      throw new ConflictException(
        `Sólo se puede confirmar conformidad sobre solicitudes en COMPLETADA. Estado actual: ${solicitud.estado}`,
      );
    }
    if (!this.usuarioEsSolicitanteConforme(solicitud, user)) {
      throw new ForbiddenException(
        'No está autorizado para confirmar conformidad de esta solicitud: debe ser el área solicitante o administrador.',
      );
    }

    const ahora = new Date();
    solicitud.estado = 'CERRADA';
    solicitud.fechaConformidad = ahora;
    solicitud.usuarioConformidadId = user.userId;
    solicitud.responsableConformidadDisplay = user.username;
    solicitud.resultadoConformidad = 'CONFIRMADA';
    solicitud.observacionesConformidad = dto.observacionesConformidad?.trim() || undefined;

    // ===== EFDS-1738 RF-INF-009 Calificación del Servicio Recibido 1-5 =====
    if (esCalificacionValida(dto.calificacionServicio)) {
      solicitud.calificacionServicio = dto.calificacionServicio;
      solicitud.fechaCalificacion = ahora;
      solicitud.usuarioCalificacionId = user.userId;
      solicitud.responsableCalificacionDisplay = user.username;
    } else if (!CALIFICACION_SERVICIO_OPCIONAL_DEFAULT) {
      throw new BadRequestException(
        'Calificación del servicio (1-5) es obligatoria para confirmar conformidad EFDS-1738.',
      );
    } else {
      // OPCIONAL y no vino rating válido: guardar NULL para no contaminar promedios
      solicitud.calificacionServicio = undefined;
      solicitud.fechaCalificacion = undefined;
      solicitud.usuarioCalificacionId = undefined;
      solicitud.responsableCalificacionDisplay = undefined;
    }
    const obsPush = [
      dto.observacionesConformidad?.trim(),
      solicitud.calificacionServicio ? `Calificación ${solicitud.calificacionServicio}/5` : null,
    ]
      .filter((x): x is string => Boolean(x))
      .join(' | ');

    this.pushAsignacion(solicitud, {
      accion: 'CONFORMIDAD_CONFIRMADA',
      tecnicoCodigo: null,
      tecnicoNombreDisplay: null,
      motivo: 'Solicitud cerrada a satisfacción del área solicitante.',
      observaciones: obsPush || null,
      user,
    });

    await this.mantenimientoRepo.save(solicitud);
    const final = await this.findById(idSolicitud);

    // [NOTIFICACION EFDS-1737] Confirmación: se notifica al técnico asignado + solicitante acuse recibido.
    void (async () => {
      try {
        const emailSol = this.plantillaEmailConfirmacion(final, { usuario: user?.username ?? 'Solicitante' });
        await this.notificarAlSolicitante(final, {
          tipo: 'UMI_CONFORMIDAD_CONFIRMADA_SOLICITANTE',
          titulo: 'Conformidad registrada — solicitud cerrada',
          mensaje: `Confirmaste conformidad satisfactoria para la solicitud #${final.consecutivo ?? final.idSolicitud.slice(0, 8)}.`,
          icono: 'CheckCircle2',
          color: '#115e59',
          prioridad: 'Media',
          textoAccion: 'Ver confirmación',
          emailHtml: emailSol.html,
          emailSubject: emailSol.subject,
        });
        await this.notificarTecnicoAsignado(final, {
          tipo: 'UMI_CONFORMIDAD_CONFIRMADA_TECNICO',
          titulo: 'Solicitud cerrada — conformidad aprobada',
          mensaje: `El área solicitante confirmó conformidad sobre #${final.consecutivo ?? final.idSolicitud.slice(0, 8)}. ${dto.observacionesConformidad?.trim() ? `Observaciones: ${dto.observacionesConformidad.trim()}` : 'Sin observaciones adicionales.'}`,
          icono: 'CircleCheckBig',
          color: '#115e59',
          prioridad: 'Media',
          textoAccion: 'Ver solicitud cerrada',
          emailSubject: `[UMI] Conformidad OK solicitud #${final.consecutivo ?? final.idSolicitud.slice(0, 8)}`,
          emailHtml: `<div style="font-family:Segoe UI,Segoe,sans-serif;max-width:720px"><h3 style="margin:0 0 8px;color:#115e59">Conformidad confirmada</h3><p style="margin:0 0 8px">El área solicitante (<strong>${user?.username ?? 'Solicitante'}</strong>) aprobó el cierre técnico.</p><p style="margin:0 0 8px">${dto.observacionesConformidad?.trim() ? `Observaciones: ${dto.observacionesConformidad.trim()}` : 'Sin observaciones adicionales.'}</p></div>`,
        });
      } catch (err: any) {
        this.notifLogger.warn(`[${final.idSolicitud}] notificación confirmación falló: ${err?.message ?? err}`);
      }
    })();

    return final;
  }

  async rechazarConformidadYReabrir(
    idSolicitud: string,
    dto: RechazarConformidadDto,
    user: AuthUser | null | undefined,
  ): Promise<SolicitudMantenimiento> {
    if (!user || !Array.isArray(user.roles) || user.roles.length === 0) {
      throw new ForbiddenException('Usuario autenticado requerido para devolver conformidad.');
    }
    const solicitud = await this.findById(idSolicitud);
    if (!this.estadoEsValidoParaConformidad(solicitud)) {
      throw new ConflictException(
        `Sólo se puede devolver conformidad sobre solicitudes en COMPLETADA. Estado actual: ${solicitud.estado}`,
      );
    }
    if (!this.usuarioEsSolicitanteConforme(solicitud, user)) {
      throw new ForbiddenException(
        'No está autorizado para devolver conformidad de esta solicitud: debe ser el área solicitante o administrador.',
      );
    }
    const ahora = new Date();
    const obs = dto.observacionesConformidad.trim();

    solicitud.estado = 'EN_PROGRESO';
    solicitud.fechaConformidad = ahora;
    solicitud.usuarioConformidadId = user.userId;
    solicitud.responsableConformidadDisplay = user.username;
    solicitud.resultadoConformidad = 'RECHAZADA_Y_REABIERTA';
    solicitud.observacionesConformidad = obs;
    solicitud.conteoReaperturasConformidad = Number(solicitud.conteoReaperturasConformidad || 0) + 1;

    // RELOJ NUEVO SLA 24H (project memory EFDS-1737)
    solicitud.fechaLimiteAtencion = new Date(ahora.getTime() + REAPERTURA_NUEVO_SLA_HORAS * 3600 * 1000);
    solicitud.fechaLimiteOriginalAntesExtension = undefined;
    // NUNCA nulear cols de cierre técnico: fecha_cierre_tecnico, evidencias, trabajo_realizado etc.
    // La reapertura no invalida el trabajo ejecutado.

    this.pushAsignacion(solicitud, {
      accion: 'CONFORMIDAD_RECHAZADA_Y_REABIERTA',
      tecnicoCodigo: null,
      tecnicoNombreDisplay: null,
      motivo: `Solicitud devuelta por observaciones del área (reapertura #${solicitud.conteoReaperturasConformidad}). SLA reiniciado a ${REAPERTURA_NUEVO_SLA_HORAS}h.`,
      observaciones: obs,
      user,
    });

    await this.mantenimientoRepo.save(solicitud);
    const final = await this.findById(idSolicitud);

    // [NOTIFICACION EFDS-1737] Rechazo + reapertura: notifica solicitante (acuse) + técnico asignado (trabajo nuevo)
    void (async () => {
      try {
        const emailSol = this.plantillaEmailRechazoYReapertura(final, {
          usuario: user?.username ?? 'Solicitante',
          obs,
          slaH: REAPERTURA_NUEVO_SLA_HORAS,
          conteo: Number(final.conteoReaperturasConformidad ?? 1),
        });
        await this.notificarAlSolicitante(final, {
          tipo: 'UMI_CONFORMIDAD_RECHAZADA_Y_REABIERTA_SOLICITANTE',
          titulo: 'Rechazo de conformidad registrado — solicitud reabierta',
          mensaje: `Registraste el rechazo y reapertura #${final.conteoReaperturasConformidad} de la solicitud #${final.consecutivo ?? final.idSolicitud.slice(0, 8)}. El equipo UMI ha sido notificado con el nuevo SLA de ${REAPERTURA_NUEVO_SLA_HORAS}h.`,
          icono: 'AlertTriangle',
          color: '#b45309',
          prioridad: 'Alta',
          textoAccion: 'Seguimiento reapertura',
          emailHtml: emailSol.html,
          emailSubject: emailSol.subject,
        });
        await this.notificarTecnicoAsignadoReapertura(final, {
          obs,
          conteo: Number(final.conteoReaperturasConformidad ?? 1),
          slaHoras: REAPERTURA_NUEVO_SLA_HORAS,
        });
      } catch (err: any) {
        this.notifLogger.warn(`[${final.idSolicitud}] notificación rechazo/reapertura falló: ${err?.message ?? err}`);
      }
    })();

    return final;
  }

  async ejecutarCierresSinRespuestaVencidos(
    user: AuthUser | null | undefined,
  ): Promise<{ actualizadas: number; ids: string[] }> {
    const vr = this.validarRolesAsignador(user);
    if (!vr.permitido) throw new ForbiddenException(vr.errorMsg);
    const ahora = new Date();
    const repo = this.mantenimientoRepo;
    const rows = await repo.find({
      where: {
        estado: 'COMPLETADA',
        fechaLimiteConformidad: Not(IsNull()) as any,
      } as any,
    });
    const filtradas = rows.filter(
      (s) => s.fechaLimiteConformidad && new Date(s.fechaLimiteConformidad as any).getTime() <= ahora.getTime(),
    );
    const ids: string[] = [];
    for (const s of filtradas) {
      s.estado = 'CERRADA_SIN_ATENCION';
      s.fechaConformidad = ahora;
      s.resultadoConformidad = 'SIN_RESPUESTA';
      s.usuarioConformidadId = user?.userId || undefined;
      s.responsableConformidadDisplay = user?.username || 'Cierre automático sin respuesta';
      ids.push(s.idSolicitud);
      try {
        this.pushAsignacion(s, {
          accion: 'CONFORMIDAD_SIN_RESPUESTA',
          tecnicoCodigo: null,
          tecnicoNombreDisplay: null,
          motivo: 'Plazo de conformidad vencido sin respuesta del área solicitante. Cierre automático.',
          observaciones: null,
          user: user || (s as any).__fakeUser,
        });
      } catch {
        // pushAsignacion requiere user definido; si pasó validarRolesAsignador user no es null
      }
      await repo.save(s);

      // [NOTIFICACION EFDS-1737] Cierre automático sin respuesta: notificación al solicitante.
      void (async () => {
        try {
          const cerrada = await this.findById(s.idSolicitud);
          const email = this.plantillaEmailSinRespuesta(cerrada);
          await this.notificarAlSolicitante(cerrada, {
            tipo: 'UMI_CONFORMIDAD_SIN_RESPUESTA_SOLICITANTE',
            titulo: 'Solicitud cerrada automáticamente (sin respuesta)',
            mensaje: `La solicitud #${cerrada.consecutivo ?? cerrada.idSolicitud.slice(0, 8)} alcanzó el límite de ${PLAZO_CONFORMIDAD_HORAS_DEFAULT}h sin respuesta del área y fue cerrada automáticamente.`,
            icono: 'Clock',
            color: '#475569',
            prioridad: 'Media',
            textoAccion: 'Consultar solicitud cerrada',
            emailHtml: email.html,
            emailSubject: email.subject,
          });
        } catch (err: any) {
          this.notifLogger.warn(`[${s.idSolicitud}] notificación sin respuesta falló: ${err?.message ?? err}`);
        }
      })();
    }
    return { actualizadas: ids.length, ids };
  }

  // ---------------------------------------------------------------------------
  // EFDS-1738 RF-INF-009: Consolidados promedio calificación de servicio
  // 4 casos de agrupación + 5 filtros opcionales.
  // ---------------------------------------------------------------------------
  async calificacionesConsolidadas(
    filtros: FiltrosConsolidadoCalificacion,
    user: AuthUser | null | undefined,
  ): Promise<ConsolidadoCalificacionItem[]> {
    // OQ-2 default: solo perfiles bypass. Técnico USER retorna 403 Forbidden.
    if (!usuarioEsBypassConsolidados(user)) {
      throw new ForbiddenException(
        'No está autorizado para ver consolidados de calificación servicio EFDS-1738. Requiere rol SUPER_ADMIN, GESTOR_MANTENIMIENTO o ADMINISTRADOR_FUNCIONAL.',
      );
    }
    const por: AgrupacionCalificacion = ['tecnico', 'categoria', 'area', 'global'].includes(
      (filtros.por || '').toLowerCase() as AgrupacionCalificacion,
    )
      ? (filtros.por!.toLowerCase() as AgrupacionCalificacion)
      : 'tecnico';
    const fechaDesde = parsearFechaUTCNullable(filtros.fechaDesde);
    const fechaHasta = parsearFechaUTCNullable(filtros.fechaHasta);
    const idCategoria =
      filtros.idCategoria == null || filtros.idCategoria === ''
        ? null
        : Number.isInteger(Number(filtros.idCategoria)) && Number(filtros.idCategoria) > 0
        ? Number(filtros.idCategoria)
        : null;
    const codigoTecnico =
      typeof filtros.codigoTecnico === 'string' && filtros.codigoTecnico.trim().length > 0
        ? filtros.codigoTecnico.trim()
        : null;
    const idAreaSolicitante =
      typeof filtros.idAreaSolicitante === 'string' && filtros.idAreaSolicitante.trim().length > 0
        ? filtros.idAreaSolicitante.trim()
        : null;

    const qb = this.mantenimientoRepo.createQueryBuilder('s');

    // ============ JOINS ESPECÍFICOS SEGÚN AGRUPACIÓN ============
    if (por === 'categoria') {
      qb.leftJoin(CatalogoItem, 'ci', 'ci.idCatalogo = s.idCategoria AND ci.catalogo = :catCatalogo', {
        catCatalogo: 'CATEGORIA_SERVICIO',
      });
    }

    // ============ WHERE FIJOS (siempre filtran) ============
    qb.andWhere("s.estado IN (:...estadosCierre)", {
      estadosCierre: ['CERRADA', 'CERRADA_SIN_ATENCION'],
    });
    qb.andWhere("s.resultadoConformidad = :resuConform", {
      resuConform: 'CONFIRMADA',
    });
    qb.andWhere('s.calificacionServicio IS NOT NULL');
    qb.andWhere('s.calificacion_servicio IS NOT NULL');

    // ============ WHERE DINÁMICOS 5 FILTROS OPCIONALES ============
    if (fechaDesde) {
      qb.andWhere('s.fechaCalificacion >= :fDesde', { fDesde: fechaDesde });
    }
    if (fechaHasta) {
      qb.andWhere('s.fechaCalificacion <= :fHasta', { fHasta: fechaHasta });
    }
    if (idCategoria != null) {
      qb.andWhere('s.idCategoria = :idCat', { idCat: idCategoria });
    }
    if (codigoTecnico) {
      // responsableAsignado formato "TEC-XXX-001 · Nombre Apellido" → prefix LIKE
      qb.andWhere("s.responsableAsignado ILIKE :prefTec", {
        prefTec: codigoTecnico + SEPARADOR_TECNICO + '%',
      });
    }
    if (idAreaSolicitante) {
      qb.andWhere('s.idAreaSolicitante = :idArea', {
        idArea: idAreaSolicitante,
      });
    }

    // ============ GROUP BY + SELECT agregados comunes
    qb
      .addSelect('COUNT(*)::bigint', 'numeroCalificaciones')
      .addSelect('COALESCE(SUM(s.calificacionServicio), 0)::bigint', 'sumaCalificaciones')
      .addSelect(
        'ROUND(COALESCE(AVG(CASE WHEN s.calificacionServicio IS NOT NULL THEN CAST(s.calificacionServicio AS NUMERIC) END), 0), 2)',
        'promedio',
      )
      .addSelect(
        "COALESCE(SUM(CASE WHEN s.calificacionServicio = 1 THEN 1 ELSE 0 END), 0)::bigint",
        'd1',
      )
      .addSelect(
        "COALESCE(SUM(CASE WHEN s.calificacionServicio = 2 THEN 1 ELSE 0 END), 0)::bigint",
        'd2',
      )
      .addSelect(
        "COALESCE(SUM(CASE WHEN s.calificacionServicio = 3 THEN 1 ELSE 0 END), 0)::bigint",
        'd3',
      )
      .addSelect(
        "COALESCE(SUM(CASE WHEN s.calificacionServicio = 4 THEN 1 ELSE 0 END), 0)::bigint",
        'd4',
      )
      .addSelect(
        "COALESCE(SUM(CASE WHEN s.calificacionServicio = 5 THEN 1 ELSE 0 END), 0)::bigint",
        'd5',
      );

    // ============ AGRUPACIÓN ESPECÍFICA Y CAMPOS GRUPO ============
    switch (por) {
      case 'tecnico': {
        // Split prefix "COD · Nombre" = SPLIT_PART (Postgres). Fallback old data = '(sin técnico asignado)'.
        qb.addSelect(
          `COALESCE(NULLIF(SPLIT_PART(s.responsableAsignado, :sepTec, 1), ''), '')`,
          'idGrupo',
        ).addSelect(
          `CASE WHEN s.responsableAsignado IS NULL OR TRIM(s.responsableAsignado) = '' THEN :fallbackSinTec ELSE COALESCE(NULLIF(SPLIT_PART(s.responsableAsignado, :sepTec, 2), ''), s.responsableAsignado) END`,
          'nombreGrupo',
        ).setParameter('sepTec', SEPARADOR_TECNICO).setParameter('fallbackSinTec', '(sin técnico asignado)');
        qb.groupBy('1').addGroupBy('s.responsableAsignado');
        break;
      }
      case 'categoria': {
        qb.addSelect('CAST(s.idCategoria AS TEXT)', 'idGrupo').addSelect(
          `COALESCE(NULLIF(TRIM(ci.nombre), ''), '') || CASE WHEN s.idCategoria IS NULL THEN :fallbackSinCat ELSE '' END`,
          'nombreGrupo',
        ).setParameter('fallbackSinCat', '(sin categoría)');
        qb.groupBy('s.idCategoria').addGroupBy('ci.nombre');
        break;
      }
      case 'area': {
        qb.addSelect('CAST(s.idAreaSolicitante AS TEXT)', 'idGrupo').addSelect(
          `COALESCE(NULLIF(TRIM(s.nombreAreaSolicitante), ''), s.idAreaSolicitante, :fallbackSinArea)`,
          'nombreGrupo',
        ).setParameter('fallbackSinArea', '(sin área solicitante)');
        qb.groupBy('s.idAreaSolicitante').addGroupBy('s.nombreAreaSolicitante');
        break;
      }
      case 'global': {
        qb.addSelect(':constGlobal', 'idGrupo')
          .addSelect(':nombreGlobal', 'nombreGrupo')
          .setParameter('constGlobal', 'GLOBAL')
          .setParameter('nombreGlobal', 'Global consolidado total');
        break;
      }
    }

    qb.orderBy('"promedio"', 'DESC').addOrderBy('"numeroCalificaciones"', 'DESC');

    const rawRows = await qb.getRawMany();

    const resultado: ConsolidadoCalificacionItem[] = [];
    for (const r of rawRows || []) {
      const n = Number(r.numeroCalificaciones);
      if (!Number.isFinite(n) || n <= 0) continue;
      const d = distribucionVacia();
      d[1] = Number(r.d1) || 0;
      d[2] = Number(r.d2) || 0;
      d[3] = Number(r.d3) || 0;
      d[4] = Number(r.d4) || 0;
      d[5] = Number(r.d5) || 0;
      const suma = Number(r.sumaCalificaciones) || 0;
      const promRaw = Number(r.promedio);
      const promedio = Number.isFinite(promRaw) ? Math.round(promRaw * 100) / 100 : 0;
      let idGrupo: number | string | null = r.idGrupo ?? null;
      if (por === 'categoria' && idGrupo != null && idGrupo !== '' && Number.isInteger(Number(idGrupo))) {
        idGrupo = Number(idGrupo);
      }
      const nombreGrupo =
        typeof r.nombreGrupo === 'string' && r.nombreGrupo.trim().length > 0
          ? r.nombreGrupo.trim()
          : por === 'global'
          ? 'Global consolidado total'
          : '(sin dato)';
      resultado.push({
        tipoGrupo: por,
        idGrupo: idGrupo === '' ? null : idGrupo,
        nombreGrupo,
        numeroCalificaciones: n,
        sumaCalificaciones: suma,
        promedio,
        distribucion: d,
      });
    }
    return resultado;
  }

  // ---------------------------------------------------------------------------
  // EFDS-1739 RF-INF-010: Reportes e Indicadores de Gestión (6 métricas)
  // Filtro default últimos 90 días. Rango máximo 12 meses → 400 si excede.
  // Guardia permiso infraestructura.reportes.gestion o bypass legacy admin.
  // ---------------------------------------------------------------------------
  async obtenerReporteGestion(
    filtros: FiltrosReporteGestionParams,
    user: AuthUser | null | undefined,
  ): Promise<ReporteGestionDto> {
    requirePermission('infraestructura.reportes.gestion', user);

    const now = new Date();
    const hastaDefault = new Date(now);
    const desdeDefault = new Date(now);
    desdeDefault.setDate(desdeDefault.getDate() - 90);
    let fDesde = parsearFechaUTCNullable(filtros.fechaDesde) ?? desdeDefault;
    let fHasta = parsearFechaUTCNullable(filtros.fechaHasta) ?? hastaDefault;
    if (fDesde.getTime() > fHasta.getTime()) {
      const swap = fDesde; fDesde = fHasta; fHasta = swap;
    }
    const diasRango = Math.max(1, Math.ceil((fHasta.getTime() - fDesde.getTime()) / (24 * 60 * 60 * 1000)));
    if (diasRango > 366) {
      throw new BadRequestException('Rango de fechas excede el máximo permitido (12 meses).');
    }
    const duracionMs = fHasta.getTime() - fDesde.getTime();
    const fDesdeAnt = new Date(fDesde.getTime() - duracionMs);
    const fHastaAnt = new Date(fDesde.getTime() - 1);

    const idSede = (typeof filtros.idSede === 'string' && filtros.idSede.trim() && isUuid(filtros.idSede)) ? filtros.idSede.trim() : null;
    const idCategoria = filtros.idCategoria == null || String(filtros.idCategoria).trim() === ''
      ? null
      : Number.isInteger(Number(filtros.idCategoria)) && Number(filtros.idCategoria) > 0
      ? Number(filtros.idCategoria)
      : null;
    const areaRaw = String(filtros.areaResponsable || '').trim().toUpperCase();
    const areaResponsable: AreaFiltroReporte = areaRaw === 'TI' || areaRaw === 'TODAS' ? areaRaw as AreaFiltroReporte : 'UMI';
    const codigoTecnico = typeof filtros.codigoTecnico === 'string' && filtros.codigoTecnico.trim() ? filtros.codigoTecnico.trim() : null;
    const estado = typeof filtros.estado === 'string' && filtros.estado.trim() ? filtros.estado.trim().toUpperCase() : null;

    const aplicarFiltrosComunes = (qb: any, campoFecha: string, desde: Date, hasta: Date) => {
      qb.andWhere(`${campoFecha} >= :desde`, { desde });
      qb.andWhere(`${campoFecha} <= :hasta`, { hasta });
      if (idSede) qb.andWhere('s.idSede = :idSede', { idSede });
      if (idCategoria != null) qb.andWhere('s.idCategoria = :idCat', { idCat: idCategoria });
      if (areaResponsable === 'UMI') {
        qb.andWhere("s.areaResponsableActual IN (:...areasUMI)", { areasUMI: ['UMI', 'PENDIENTE'] });
      } else if (areaResponsable === 'TI') {
        qb.andWhere("s.areaResponsableActual = :areaTI", { areaTI: 'TI' });
      }
      if (codigoTecnico) {
        qb.andWhere("s.responsableAsignado ILIKE :prefTec", { prefTec: codigoTecnico + SEPARADOR_TECNICO + '%' });
      }
      if (estado) qb.andWhere('s.estado = :est', { est: estado });
    };

    const ESTADOS_EN_CURSO = ['RECIBIDA', 'ASIGNADA', 'EN_ANALISIS', 'EN_CAMPO_VALORACION', 'EN_ESPERA_DE_INSUMOS', 'EN_PROGRESO', 'PENDIENTE_CONFORMIDAD'];
    const ESTADOS_COMPLETADOS = ['CERRADA', 'CERRADA_SIN_ATENCION', 'COMPLETADA'];

    // ---- A. totalCasos ----
    const buildTotalQ = (campoFecha: string, desde: Date, hasta: Date) => {
      const qb = this.mantenimientoRepo.createQueryBuilder('s');
      qb.select([]);
      aplicarFiltrosComunes(qb, campoFecha, desde, hasta);
      return qb
        .addSelect('COUNT(*)::bigint', 'total')
        .addSelect("COALESCE(SUM(CASE WHEN s.estado IN (:...estCompletados) THEN 1 ELSE 0 END), 0)::bigint", 'completados')
        .addSelect("COALESCE(SUM(CASE WHEN s.estado IN (:...estCurso) THEN 1 ELSE 0 END), 0)::bigint", 'encurso')
        .setParameter('estCompletados', ESTADOS_COMPLETADOS)
        .setParameter('estCurso', ESTADOS_EN_CURSO);
    };
    const totalActualRaw = await buildTotalQ('s.fechaRadicacion', fDesde, fHasta).getRawOne();
    const totalAnteriorRaw = await buildTotalQ('s.fechaRadicacion', fDesdeAnt, fHastaAnt).getRawOne();
    const totalActual = Number(totalActualRaw?.total ?? 0);
    const totalAnterior = Number(totalAnteriorRaw?.total ?? 0);

    const porEstadoQb = this.mantenimientoRepo.createQueryBuilder('s');
    porEstadoQb.select([]);
    aplicarFiltrosComunes(porEstadoQb, 's.fechaRadicacion', fDesde, fHasta);
    const porEstadoRaw = await porEstadoQb
      .addSelect('s.estado', 'estado')
      .addSelect('COUNT(*)::bigint', 'cantidad')
      .groupBy('s.estado')
      .orderBy('"cantidad"', 'DESC')
      .getRawMany();
    const porEstado = (porEstadoRaw || []).map((r: any) => {
      const c = Number(r.cantidad);
      return { estado: String(r.estado || ''), cantidad: c, porcentaje: totalActual ? (c / totalActual) * 100 : 0 };
    });

    const porTipoQb = this.mantenimientoRepo.createQueryBuilder('s');
    porTipoQb.select([]);
    aplicarFiltrosComunes(porTipoQb, 's.fechaRadicacion', fDesde, fHasta);
    const porTipoRaw = await porTipoQb
      .addSelect('s.tipoAtencion', 'tipo')
      .addSelect('COUNT(*)::bigint', 'cantidad')
      .groupBy('s.tipoAtencion')
      .orderBy('"cantidad"', 'DESC')
      .getRawMany();
    const porTipoAtencion = (porTipoRaw || []).map((r: any) => {
      const c = Number(r.cantidad);
      return { tipoAtencion: String(r.tipo || ''), cantidad: c, porcentaje: totalActual ? (c / totalActual) * 100 : 0 };
    });

    const totalCasos: ReporteGestionTotalCasos = {
      totalRadicados: {
        valorActual: totalActual,
        valorAnterior: totalAnterior,
        variacionAbsoluta: totalActual - totalAnterior,
        variacionPorcentual: totalAnterior === 0 ? (totalActual > 0 ? 100 : 0) : ((totalActual - totalAnterior) / totalAnterior) * 100,
      },
      porEstado,
      porTipoAtencion,
    };

    // ---- B. porCategoria ----
    const catQb = this.mantenimientoRepo.createQueryBuilder('s');
    catQb.select([]);
    catQb.leftJoin(CatalogoItem, 'ci', 'ci.idCatalogo = s.idCategoria AND ci.catalogo = :catCatalogo', { catCatalogo: 'CATEGORIA_SERVICIO' });
    aplicarFiltrosComunes(catQb, 's.fechaRadicacion', fDesde, fHasta);
    const catRaw = await catQb
      .addSelect('CAST(s.idCategoria AS TEXT)', 'idCategoria')
      .addSelect('COALESCE(ci.codigo, :sinCod)', 'codigoCategoria')
      .addSelect('COALESCE(ci.nombre, :fallbackSinCat)', 'nombreCategoria')
      .addSelect('COALESCE(ci.metadata::jsonb->>\'color\', NULL)', 'color')
      .addSelect('COUNT(*)::bigint', 'radicados')
      .addSelect("COALESCE(SUM(CASE WHEN s.estado IN (:...estComp) THEN 1 ELSE 0 END), 0)::bigint", 'completados')
      .addSelect("COALESCE(SUM(CASE WHEN s.estado IN (:...estCur) THEN 1 ELSE 0 END), 0)::bigint", 'encurso')
      .addSelect("COALESCE(SUM(CASE WHEN s.fechaLimiteAtencion IS NOT NULL AND s.fechaLimiteAtencion < NOW() AND s.estado IN (:...estCurNoCierra) THEN 1 ELSE 0 END), 0)::bigint", 'vencidos')
      .addSelect('ROUND(COALESCE(AVG(CASE WHEN s.calificacionServicio IS NOT NULL THEN CAST(s.calificacionServicio AS NUMERIC) END), 0), 2)', 'promCalif')
      .setParameter('sinCod', '')
      .setParameter('fallbackSinCat', '(sin categoría)')
      .setParameter('estComp', ESTADOS_COMPLETADOS)
      .setParameter('estCur', ESTADOS_EN_CURSO)
      .setParameter('estCurNoCierra', ESTADOS_EN_CURSO.concat(['COMPLETADA']))
      .groupBy('s.idCategoria').addGroupBy('ci.codigo').addGroupBy('ci.nombre').addGroupBy('ci.metadata')
      .orderBy('"radicados"', 'DESC')
      .getRawMany();
    const porCategoria: ReporteGestionPorCategoriaItem[] = (catRaw || []).map((r: any) => {
      const id = r.idCategoria && r.idCategoria !== '' ? Number(r.idCategoria) : null;
      return {
        idCategoria: Number.isInteger(id) ? id! : null,
        codigoCategoria: r.codigoCategoria || null,
        nombreCategoria: String(r.nombreCategoria || ''),
        radicados: Number(r.radicados || 0),
        completados: Number(r.completados || 0),
        enCurso: Number(r.encurso || 0),
        vencidos: Number(r.vencidos || 0),
        promedioCalificacion: Number(r.promCalif || 0),
        color: r.color || null,
      };
    });

    // ---- C. porTecnico ----
    const tecQb = this.mantenimientoRepo.createQueryBuilder('s');
    tecQb.select([]);
    aplicarFiltrosComunes(tecQb, 's.fechaRadicacion', fDesde, fHasta);
    tecQb.andWhere("s.responsableAsignado IS NOT NULL AND TRIM(s.responsableAsignado) <> ''");
    const tecRaw = await tecQb
      .addSelect(`COALESCE(NULLIF(SPLIT_PART(s.responsableAsignado, :sepTec, 1), ''), '')`, 'codigoTecnico')
      .addSelect(`CASE WHEN COALESCE(NULLIF(SPLIT_PART(s.responsableAsignado, :sepTec, 2), ''), '') = '' THEN COALESCE(NULLIF(s.responsableAsignado, ''), :fallback) ELSE NULLIF(SPLIT_PART(s.responsableAsignado, :sepTec, 2), '') END`, 'nombreTecnico')
      .addSelect('COUNT(*)::bigint', 'asignados')
      .addSelect("COALESCE(SUM(CASE WHEN s.estado IN (:...estComp) THEN 1 ELSE 0 END), 0)::bigint", 'completados')
      .addSelect("COALESCE(SUM(CASE WHEN s.estado IN (:...estCur) THEN 1 ELSE 0 END), 0)::bigint", 'encurso')
      .addSelect('ROUND(COALESCE(AVG(CASE WHEN s.calificacionServicio IS NOT NULL THEN CAST(s.calificacionServicio AS NUMERIC) END), 0), 2)', 'promCalif')
      .setParameter('sepTec', SEPARADOR_TECNICO)
      .setParameter('fallback', '(sin nombre)')
      .setParameter('estComp', ESTADOS_COMPLETADOS)
      .setParameter('estCur', ESTADOS_EN_CURSO)
      .groupBy('1').addGroupBy('s.responsableAsignado')
      .orderBy('"asignados"', 'DESC')
      .getRawMany();
    const porTecnico: ReporteGestionPorTecnicoItem[] = await Promise.all((tecRaw || []).map(async (r: any) => {
      const cod = r.codigoTecnico || null;
      let carga = 0;
      if (cod) { try { carga = await this.calcularCargaVigenteTecnico(cod); } catch { /* ignore */ } }
      return {
        codigoTecnico: cod,
        nombreTecnico: String(r.nombreTecnico || ''),
        asignados: Number(r.asignados || 0),
        completados: Number(r.completados || 0),
        enCurso: Number(r.encurso || 0),
        promedioCalificacion: Number(r.promCalif || 0),
        cargaVigente: Number.isFinite(carga) ? carga : 0,
      };
    }));

    // ---- D. tiemposAtencionVsMeta (vs SLA por categoría) ----
    const slaQb = this.mantenimientoRepo.createQueryBuilder('s');
    slaQb.select([]);
    slaQb.leftJoin(CatalogoItem, 'ci', 'ci.idCatalogo = s.idCategoria AND ci.catalogo = :catCatalogo', { catCatalogo: 'CATEGORIA_SERVICIO' });
    aplicarFiltrosComunes(slaQb, 's.fechaRadicacion', fDesde, fHasta);
    slaQb.andWhere('s.fechaCierreTecnico IS NOT NULL AND s.fechaRadicacion IS NOT NULL');
    const slaRaw = await slaQb
      .addSelect('CAST(s.idCategoria AS TEXT)', 'idCategoria')
      .addSelect('COALESCE(ci.nombre, :fallbackSinCat)', 'nombreCategoria')
      .addSelect('COUNT(*)::bigint', 'totalCierres')
      .addSelect('ROUND(COALESCE(AVG(EXTRACT(EPOCH FROM (s.fechaCierreTecnico - s.fechaRadicacion)) / 86400.0), 0), 2)', 'promDias')
      .addSelect("COALESCE(SUM(CASE WHEN s.fechaLimiteAtencion IS NOT NULL AND s.fechaCierreTecnico <= s.fechaLimiteAtencion THEN 1 ELSE 0 END), 0)::bigint", 'cumplen')
      .addSelect("COALESCE(SUM(CASE WHEN s.fechaLimiteAtencion IS NOT NULL AND s.fechaCierreTecnico > s.fechaLimiteAtencion THEN 1 ELSE 0 END), 0)::bigint", 'exceden')
      .setParameter('fallbackSinCat', '(sin categoría)')
      .groupBy('s.idCategoria').addGroupBy('ci.nombre')
      .orderBy('"totalCierres"', 'DESC')
      .getRawMany();
    const tiemposAtencionVsMeta: ReporteGestionTiemposAtencionItem[] = await Promise.all((slaRaw || []).map(async (r: any) => {
      const idStr = r.idCategoria && String(r.idCategoria).trim() !== '' ? String(r.idCategoria).trim() : null;
      const idNum = (idStr && Number.isInteger(Number(idStr))) ? Number(idStr) : null;
      let metaDias = 2;
      if (Number.isInteger(idNum)) {
        try {
          const p = await this.obtenerParametroTiempoRespuesta(idNum!);
          if (p && Number.isInteger(Number((p as any)?.dias ?? NaN))) metaDias = Number((p as any).dias);
        } catch { /* ignore */ }
      }
      const total = Number(r.totalCierres || 0);
      const cumplen = Number(r.cumplen || 0);
      const exceden = Number(r.exceden || 0);
      return {
        idCategoria: idNum,
        nombreCategoria: String(r.nombreCategoria || ''),
        metaSlaDias: metaDias,
        casosCumplenSLA: cumplen,
        casosExcedenSLA: exceden,
        porcentajeCumplimiento: total === 0 ? 0 : (cumplen / total) * 100,
        promedioRealDias: Number(r.promDias || 0),
      };
    }));

    // ---- E. percepcionServicio (reutiliza endpoint consolidados 1738) ----
    const filtrosComunesPercepcion: FiltrosConsolidadoCalificacion = {
      fechaDesde: fDesde, fechaHasta: fHasta,
      idCategoria, codigoTecnico,
    };
    let global: ConsolidadoCalificacionItem[] = [];
    let porCategoriaCons: ConsolidadoCalificacionItem[] = [];
    let porTecnicoCons: ConsolidadoCalificacionItem[] = [];
    try {
      global = await this.calificacionesConsolidadas({ ...filtrosComunesPercepcion, por: 'global' }, { userId: '__reporte_bypass__' as any, email: '', roles: ['SUPER_ADMIN'] as any, permissions: new Set<string>(['__ALL__']) });
      porCategoriaCons = await this.calificacionesConsolidadas({ ...filtrosComunesPercepcion, por: 'categoria' }, { userId: '__reporte_bypass__' as any, email: '', roles: ['SUPER_ADMIN'] as any, permissions: new Set<string>(['__ALL__']) });
      porTecnicoCons = await this.calificacionesConsolidadas({ ...filtrosComunesPercepcion, por: 'tecnico' }, { userId: '__reporte_bypass__' as any, email: '', roles: ['SUPER_ADMIN'] as any, permissions: new Set<string>(['__ALL__']) });
    } catch { /* si no hay calificaciones, devuelve vacíos */ }
    const primerGlobal = global?.[0];
    const dist: DistribucionCalificacion = primerGlobal?.distribucion ? { ...distribucionVacia(), ...primerGlobal.distribucion } : distribucionVacia();
    const sumaDist = (dist[1] + dist[2] + dist[3] + dist[4] + dist[5]) || 0;
    const percepcionServicio: ReporteGestionPercepcionServicio = {
      promedioGlobal: primerGlobal?.promedio ?? 0,
      totalCalificaciones: primerGlobal?.numeroCalificaciones ?? sumaDist,
      porDistribucion: dist,
      porCategoria: porCategoriaCons || [],
      porTecnico: porTecnicoCons || [],
    };

    // ---- F. rollupGeografico por sede + piso ----
    const sedeQb = this.mantenimientoRepo.createQueryBuilder('s');
    sedeQb.select([]);
    sedeQb.leftJoin(Sede, 'sede', 'sede.idSede = s.idSede');
    aplicarFiltrosComunes(sedeQb, 's.fechaRadicacion', fDesde, fHasta);
    const sedeRaw = await sedeQb
      .addSelect('CAST(s.idSede AS TEXT)', 'idSede')
      .addSelect('COALESCE(sede.nombre, :fallbackSinSede)', 'nombreSede')
      .addSelect('COUNT(*)::bigint', 'radicados')
      .addSelect("COALESCE(SUM(CASE WHEN s.estado IN (:...estComp) THEN 1 ELSE 0 END), 0)::bigint", 'completados')
      .addSelect("COALESCE(SUM(CASE WHEN s.estado IN (:...estCur) THEN 1 ELSE 0 END), 0)::bigint", 'encurso')
      .setParameter('fallbackSinSede', '(sin sede)')
      .setParameter('estComp', ESTADOS_COMPLETADOS)
      .setParameter('estCur', ESTADOS_EN_CURSO)
      .groupBy('s.idSede').addGroupBy('sede.nombre')
      .orderBy('"radicados"', 'DESC')
      .getRawMany();
    const rollupGeografico: ReporteGestionRollupGeograficoItem[] = await Promise.all((sedeRaw || []).map(async (r: any) => {
      const idSedeActual = r.idSede || null;
      const pisos: Array<{ piso: string; cantidad: number }> = [];
      if (idSedeActual) {
        try {
          const pisoQb = this.mantenimientoRepo.createQueryBuilder('s');
          pisoQb.select([]);
          pisoQb.andWhere('s.idSede = :idSedeActualParam', { idSedeActualParam: idSedeActual });
          aplicarFiltrosComunes(pisoQb, 's.fechaRadicacion', fDesde, fHasta);
          pisoQb.andWhere("s.piso IS NOT NULL AND TRIM(s.piso) <> ''");
          const rows = await pisoQb
            .addSelect('s.piso', 'piso')
            .addSelect('COUNT(*)::bigint', 'cantidad')
            .groupBy('s.piso')
            .orderBy('"cantidad"', 'DESC')
            .getRawMany();
          for (const p of rows || []) pisos.push({ piso: String(p.piso || ''), cantidad: Number(p.cantidad || 0) });
        } catch { /* ignore */ }
      }
      return {
        idSede: idSedeActual,
        nombreSede: String(r.nombreSede || ''),
        radicados: Number(r.radicados || 0),
        completados: Number(r.completados || 0),
        enCurso: Number(r.encurso || 0),
        porPiso: pisos.length ? pisos : undefined,
      };
    }));

    return {
      periodo: {
        fechaDesdeISO: fDesde.toISOString(),
        fechaHastaISO: fHasta.toISOString(),
        fechaDesdeAnteriorISO: fDesdeAnt.toISOString(),
        fechaHastaAnteriorISO: fHastaAnt.toISOString(),
      },
      totalCasos,
      porCategoria,
      porTecnico,
      tiemposAtencionVsMeta,
      percepcionServicio,
      rollupGeografico,
    };
  }

  // ---- ST2 EFDS-1739: Exportador Excel 6 hojas ----
  async generarExcelReporteGestion(
    filtros: FiltrosReporteGestionParams,
    user: AuthUser | null | undefined,
  ): Promise<{ buffer: Buffer; filename: string }> {
    requirePermission('infraestructura.reportes.gestion', user);
    const reporte = await this.obtenerReporteGestion(filtros, user);
    const hoy = new Date();
    const fechaYYYYMMDD = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
    const filename = `Reporte_Gestion_Infraestructura_UMI_${fechaYYYYMMDD}.xlsx`;
    const ExcelJSMod: any = await import('exceljs');
    const ExcelJS = ExcelJSMod.Workbook ? ExcelJSMod : (ExcelJSMod.default?.Workbook ? ExcelJSMod.default : (ExcelJSMod.default ?? ExcelJSMod));
    const workbook = new ExcelJS.Workbook();
    workbook.creator = user?.email || 'UMI-ESAP';
    workbook.created = hoy;
    workbook.lastPrinted = hoy;
    workbook.modified = hoy;
    workbook.calcProperties.fullCalcOnLoad = true;

    // ================== HOJA 1: Resumen_KPI ==================
    const wsKpi = workbook.addWorksheet('Resumen_KPI', { properties: { tabColor: { argb: 'FF1E40AF' } } });
    wsKpi.getRow(1).values = ['REPORTE DE GESTIÓN DE INFRAESTRUCTURA UMI'];
    wsKpi.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF1E3A8A' } };
    wsKpi.mergeCells('A1:F1');
    wsKpi.getRow(2).values = ['Fecha generación', hoy.toISOString(), 'Usuario que genera', user?.email || 'N/A', '', ''];
    wsKpi.getRow(3).values = ['Periodo desde', reporte.periodo.fechaDesdeISO, 'Periodo hasta', reporte.periodo.fechaHastaISO, '', ''];
    wsKpi.getRow(4).values = ['Periodo anterior desde', reporte.periodo.fechaDesdeAnteriorISO, 'Periodo anterior hasta', reporte.periodo.fechaHastaAnteriorISO, '', ''];
    wsKpi.getRow(5).values = ['', '', '', '', '', ''];
    const casosCompletadosAcum = reporte.tiemposAtencionVsMeta.reduce((s, r) => s + r.casosCumplenSLA, 0);
    const casosExcedenAcum = reporte.tiemposAtencionVsMeta.reduce((s, r) => s + r.casosExcedenSLA, 0);
    const totalSlaEval = casosCompletadosAcum + casosExcedenAcum;
    const pctSla = totalSlaEval === 0 ? 0 : (casosCompletadosAcum / totalSlaEval) * 100;
    const horasPromedioTodas = (reporte.tiemposAtencionVsMeta.reduce((s, r) => s + r.promedioRealDias * (r.casosCumplenSLA + r.casosExcedenSLA), 0) / Math.max(1, totalSlaEval)) * 24;
    wsKpi.getRow(6).values = ['KPI', 'Valor Actual', 'Valor Anterior', 'Variación Absoluta', 'Variación %', 'Notas'];
    for (const c of ['A', 'B', 'C', 'D', 'E', 'F']) wsKpi.getColumn(c).width = 24;
    wsKpi.getRow(6).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsKpi.getRow(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    const kpisRows = [
      ['1. Total radicados en periodo', reporte.totalCasos.totalRadicados.valorActual, reporte.totalCasos.totalRadicados.valorAnterior, reporte.totalCasos.totalRadicados.variacionAbsoluta, reporte.totalCasos.totalRadicados.variacionPorcentual.toFixed(2) + '%', 'Solicitudes recibidas'],
      ['2. Tiempo promedio atención (horas)', horasPromedioTodas.toFixed(2), '-', '-', '-', 'Estimado desde tiempos vs meta por categoría'],
      ['3. % SLA Cumplido', pctSla.toFixed(2) + '%', '-', '-', '-', `${casosCompletadosAcum}/${totalSlaEval} casos evaluados`],
      ['4. Promedio Calificación Servicio', reporte.percepcionServicio.promedioGlobal.toFixed(2) + '/5', '-', '-', '-', `${reporte.percepcionServicio.totalCalificaciones} calificaciones`],
    ];
    for (const row of kpisRows) wsKpi.addRow(row);

    // ================== HOJA 2: Distribucion_Categoria ==================
    const wsCat = workbook.addWorksheet('Distribucion_Categoria', { properties: { tabColor: { argb: 'FF059669' } } });
    wsCat.columns = [
      { header: 'ID Categoría', key: 'idCategoria', width: 12 },
      { header: 'Código', key: 'codigoCategoria', width: 12 },
      { header: 'Nombre', key: 'nombreCategoria', width: 48 },
      { header: 'Radicados', key: 'radicados', width: 12 },
      { header: 'Completados', key: 'completados', width: 12 },
      { header: 'En curso', key: 'enCurso', width: 12 },
      { header: 'Vencidos SLA', key: 'vencidos', width: 14 },
      { header: 'Promedio Calificación', key: 'promCalif', width: 18 },
    ];
    wsCat.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsCat.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
    for (const c of reporte.porCategoria) {
      wsCat.addRow({
        idCategoria: c.idCategoria,
        codigoCategoria: c.codigoCategoria,
        nombreCategoria: c.nombreCategoria,
        radicados: c.radicados,
        completados: c.completados,
        enCurso: c.enCurso,
        vencidos: c.vencidos,
        promCalif: c.promedioCalificacion,
      });
    }

    // ================== HOJA 3: Rendimiento_Tecnicos ==================
    const wsTec = workbook.addWorksheet('Rendimiento_Tecnicos', { properties: { tabColor: { argb: 'FFD97706' } } });
    wsTec.columns = [
      { header: 'Código Técnico', key: 'codigoTecnico', width: 22 },
      { header: 'Nombre', key: 'nombreTecnico', width: 38 },
      { header: 'Asignados periodo', key: 'asignados', width: 18 },
      { header: 'Completados', key: 'completados', width: 14 },
      { header: 'En curso', key: 'enCurso', width: 12 },
      { header: 'Carga vigente HOY', key: 'cargaVigente', width: 18 },
      { header: 'Promedio Calificación', key: 'promCalif', width: 20 },
    ];
    wsTec.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsTec.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
    for (const t of reporte.porTecnico) {
      wsTec.addRow({
        codigoTecnico: t.codigoTecnico,
        nombreTecnico: t.nombreTecnico,
        asignados: t.asignados,
        completados: t.completados,
        enCurso: t.enCurso,
        cargaVigente: t.cargaVigente,
        promCalif: t.promedioCalificacion,
      });
    }

    // ================== HOJA 4: Tiempos_Atencion_SLA ==================
    const wsSla = workbook.addWorksheet('Tiempos_Atencion_SLA', { properties: { tabColor: { argb: 'FF7C3AED' } } });
    wsSla.columns = [
      { header: 'ID Categoría', key: 'id', width: 12 },
      { header: 'Categoría', key: 'nombre', width: 46 },
      { header: 'Meta SLA (días)', key: 'meta', width: 14 },
      { header: 'Casos cumplen SLA', key: 'cumplen', width: 18 },
      { header: 'Casos exceden SLA', key: 'exceden', width: 18 },
      { header: '% Cumplimiento', key: 'pct', width: 16 },
      { header: 'Promedio real (días)', key: 'promDias', width: 18 },
    ];
    wsSla.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsSla.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
    for (const s of reporte.tiemposAtencionVsMeta) {
      wsSla.addRow({
        id: s.idCategoria,
        nombre: s.nombreCategoria,
        meta: s.metaSlaDias,
        cumplen: s.casosCumplenSLA,
        exceden: s.casosExcedenSLA,
        pct: s.porcentajeCumplimiento.toFixed(2) + '%',
        promDias: s.promedioRealDias,
      });
    }

    // ================== HOJA 5: Percepcion_Calificacion ==================
    const wsPer = workbook.addWorksheet('Percepcion_Calificacion', { properties: { tabColor: { argb: 'FFDC2626' } } });
    wsPer.columns = [
      { header: 'Sección', key: 'seccion', width: 24 },
      { header: 'Grupo / Bucket', key: 'grupo', width: 38 },
      { header: 'Cantidad', key: 'cant', width: 12 },
      { header: 'Promedio', key: 'prom', width: 14 },
      { header: 'Notas', key: 'notas', width: 40 },
    ];
    wsPer.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsPer.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
    wsPer.addRow({ seccion: 'Global', grupo: 'Total calificaciones', cant: reporte.percepcionServicio.totalCalificaciones, prom: reporte.percepcionServicio.promedioGlobal, notas: 'Todas las calificaciones del periodo' });
    for (let i = 1; i <= 5; i++) {
      wsPer.addRow({
        seccion: 'Distribución buckets', grupo: `${i} estrellas`,
        cant: reporte.percepcionServicio.porDistribucion[i as 1 | 2 | 3 | 4 | 5],
        prom: '',
        notas: i === 5 ? 'Excelente' : i === 4 ? 'Bueno' : i === 3 ? 'Regular' : i === 2 ? 'Malo' : 'Pésimo',
      });
    }
    wsPer.addRow({ seccion: '---', grupo: 'Por Categoría', cant: '', prom: '', notas: 'Detalle consolidado por categoría' });
    for (const c of reporte.percepcionServicio.porCategoria) {
      wsPer.addRow({ seccion: 'Por categoría', grupo: c.nombreGrupo, cant: c.numeroCalificaciones, prom: c.promedio, notas: `Suma ${c.sumaCalificaciones} - ID ${String(c.idGrupo)}` });
    }
    wsPer.addRow({ seccion: '---', grupo: 'Por Técnico', cant: '', prom: '', notas: 'Detalle consolidado por técnico' });
    for (const t of reporte.percepcionServicio.porTecnico) {
      wsPer.addRow({ seccion: 'Por técnico', grupo: t.nombreGrupo, cant: t.numeroCalificaciones, prom: t.promedio, notas: `Código ${String(t.idGrupo)}` });
    }

    // ================== HOJA 6: Detalle_Casos_Atendidos ==================
    const wsDet = workbook.addWorksheet('Detalle_Casos_Atendidos', { properties: { tabColor: { argb: 'FF0F172A' } } });
    wsDet.columns = [
      { header: 'Consecutivo', key: 'consecutivo', width: 22 },
      { header: 'Fecha radicación', key: 'fechaRad', width: 24 },
      { header: 'Sede', key: 'sede', width: 28 },
      { header: 'Piso / Salón', key: 'ubicacion', width: 18 },
      { header: 'ID Categoría', key: 'idCat', width: 12 },
      { header: 'Técnico asignado', key: 'tecnico', width: 34 },
      { header: 'Estado', key: 'estado', width: 22 },
      { header: 'Área responsable', key: 'area', width: 16 },
      { header: 'Fecha cierre técnico', key: 'fechaCierre', width: 24 },
      { header: 'Calificación 1-5', key: 'calif', width: 14 },
      { header: 'Costo final COP', key: 'costo', width: 16 },
      { header: 'Evidencias (links)', key: 'evidencias', width: 80 },
    ];
    wsDet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsDet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };

    // Query detalle solicitudes del periodo
    const qbDet = this.mantenimientoRepo.createQueryBuilder('s');
    qbDet.leftJoinAndSelect('s.sede', 'sede');
    const fd = new Date(reporte.periodo.fechaDesdeISO as string);
    const fh = new Date(reporte.periodo.fechaHastaISO as string);
    qbDet.andWhere('s.fechaRadicacion >= :fDesde', { fDesde: fd });
    qbDet.andWhere('s.fechaRadicacion <= :fHasta', { fHasta: fh });
    if (reporte.porCategoria.length === 1 && reporte.porCategoria[0]?.idCategoria != null) {
      qbDet.andWhere('s.idCategoria = :idCat', { idCat: reporte.porCategoria[0].idCategoria });
    }
    qbDet.orderBy('s.fechaRadicacion', 'DESC');
    qbDet.limit(5000);
    const detalleSols = await qbDet.getMany();
    for (const sol of detalleSols) {
      const ubicTxt = [sol.piso, sol.salon].filter(Boolean).join(' / ') || (sol.espacio ? (sol.espacio as any).codigo || '' : '');
      let evCell: any = 'Sin evidencias';
      try {
        const evs = await this.getEvidenciasBySolicitud(sol.idSolicitud, 180);
        if (evs.length === 1 && (evs[0].urlPresigned || evs[0].urlPublica)) {
          const url = evs[0].urlPresigned || evs[0].urlPublica || '';
          const label = `[Ev1] ${evs[0].nombreOriginal || 'adjunto'}`.slice(0, 120);
          evCell = { text: label, hyperlink: url };
        } else if (evs.length > 1) {
          const partes = evs.slice(0, 8).map((e, idx) => `[Ev${idx + 1}] ${e.nombreOriginal || 'adjunto'}: ${e.urlPresigned || e.urlPublica || ''}`);
          evCell = partes.join(' ; ');
        }
      } catch { /* ignore */ }
      wsDet.addRow({
        consecutivo: sol.consecutivo || sol.idSolicitud,
        fechaRad: sol.fechaRadicacion ? new Date(sol.fechaRadicacion).toISOString() : '',
        sede: (sol.sede as any)?.nombre || '',
        ubicacion: String(ubicTxt || sol.ubicacionDetalle || ''),
        idCat: sol.idCategoria ?? '',
        tecnico: sol.responsableAsignado || '',
        estado: sol.estado || '',
        area: sol.areaResponsableActual || '',
        fechaCierre: sol.fechaCierreTecnico ? new Date(sol.fechaCierreTecnico).toISOString() : '',
        calif: sol.calificacionServicio ?? '',
        costo: sol.costoFinalEfectivoCop ?? 0,
        evidencias: evCell,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer: Buffer.from(buffer), filename };
  }

  // ---- ST3 EFDS-1739: Exportador PDF 5 secciones ----
  async generarPdfReporteGestion(
    filtros: FiltrosReporteGestionParams,
    user: AuthUser | null | undefined,
  ): Promise<{ buffer: Buffer; filename: string }> {
    requirePermission('infraestructura.reportes.gestion', user);
    const reporte = await this.obtenerReporteGestion(filtros, user);
    const hoy = new Date();
    const fechaYYYYMMDD = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
    const filename = `Reporte_Gestion_Infraestructura_UMI_${fechaYYYYMMDD}.pdf`;
    const { createRequire } = await import('node:module');
    const requireFn = typeof require !== 'undefined' ? require : createRequire(import.meta.url);
    const PdfPrinterMod = requireFn('pdfmake');
    const PdfPrinter = PdfPrinterMod.default ?? PdfPrinterMod;

    const printer = new PdfPrinter({
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    });

    const catSlaComp = reporte.tiemposAtencionVsMeta.reduce((s, r) => s + r.casosCumplenSLA, 0);
    const catSlaExc = reporte.tiemposAtencionVsMeta.reduce((s, r) => s + r.casosExcedenSLA, 0);
    const totalSla = catSlaComp + catSlaExc;
    const pctSla = totalSla === 0 ? 0 : (catSlaComp / totalSla) * 100;
    const horasProm = (reporte.tiemposAtencionVsMeta.reduce((s, r) => s + r.promedioRealDias * (r.casosCumplenSLA + r.casosExcedenSLA), 0) / Math.max(1, totalSla)) * 24;

    const delta = reporte.totalCasos.totalRadicados;
    const deltaTxt = (delta.variacionPorcentual === 0 ? '0%' : (delta.variacionPorcentual > 0 ? '▲' : '▼') + ' ' + Math.abs(delta.variacionPorcentual).toFixed(2) + '%') + ` (${delta.variacionAbsoluta >= 0 ? '+' : ''}${delta.variacionAbsoluta})`;

    const filaHeaderTabla = (arr: string[]) => arr.map((t) => ({ text: t, style: 'tableHeader' }));

    const catTable: any[][] = [
      filaHeaderTabla(['Categoría', 'Rad', 'Comp', 'Cur', 'Venc', 'Prom ★']),
      ...reporte.porCategoria.map((c) => [
        String(c.nombreCategoria || ''),
        String(c.radicados),
        String(c.completados),
        String(c.enCurso),
        String(c.vencidos),
        String(c.promedioCalificacion),
      ]),
    ];
    const tecTable: any[][] = [
      filaHeaderTabla(['Técnico', 'Asig', 'Comp', 'Cur', 'Carga', 'Prom ★']),
      ...reporte.porTecnico.map((t) => [
        String(t.codigoTecnico || '') + '  ' + String(t.nombreTecnico || ''),
        String(t.asignados),
        String(t.completados),
        String(t.enCurso),
        String(t.cargaVigente),
        String(t.promedioCalificacion),
      ]),
    ];
    const slaTable: any[][] = [
      filaHeaderTabla(['Categoría', 'Meta (d)', 'Cumplen', 'Exceden', '% Cumpl', 'Prom Real']),
      ...reporte.tiemposAtencionVsMeta.map((s) => [
        String(s.nombreCategoria || ''),
        String(s.metaSlaDias),
        String(s.casosCumplenSLA),
        String(s.casosExcedenSLA),
        s.porcentajeCumplimiento.toFixed(2) + '%',
        s.promedioRealDias + ' d',
      ]),
    ];
    const geoTable: any[][] = [
      filaHeaderTabla(['Sede', 'Radicados', 'Completados', 'En curso']),
      ...reporte.rollupGeografico.map((g) => [
        String(g.nombreSede || ''),
        String(g.radicados),
        String(g.completados),
        String(g.enCurso),
      ]),
    ];

    const dd: import('pdfmake').TDocumentDefinitions = {
      pageSize: 'LETTER',
      pageMargins: [40, 50, 40, 60],
      footer: (currentPage: number, pageCount: number) => ({
        text: `Página ${currentPage} / ${pageCount}  ·  Generado: ${hoy.toISOString()}  ·  UMI ESAP`,
        style: 'footer',
        alignment: 'right',
        margin: [0, 20, 30, 0],
      }),
      content: [
        // ===== SECCIÓN 1: PORTADA =====
        { text: 'REPORTE DE GESTIÓN', style: 'h1', alignment: 'center', margin: [0, 40, 0, 10] },
        { text: 'Módulo de Infraestructura UMI', style: 'h2', alignment: 'center', margin: [0, 0, 0, 60] },
        {
          style: 'tableExample',
          margin: [80, 0, 80, 0],
          table: {
            widths: ['35%', '65%'],
            body: [
              [{ text: 'Periodo reporte', style: 'k' }, { text: `Desde ${reporte.periodo.fechaDesdeISO?.slice(0, 10)} · Hasta ${reporte.periodo.fechaHastaISO?.slice(0, 10)}` }],
              [{ text: 'Usuario', style: 'k' }, { text: user?.email || 'Consulta consolidada' }],
              [{ text: 'Fecha emisión', style: 'k' }, { text: hoy.toISOString() }],
              [{ text: 'Versión plan', style: 'k' }, { text: 'EFDS-1739 RF-INF-010 v1.0' }],
            ],
          },
          layout: 'lightHorizontalLines',
        },
        { text: ' ', pageBreak: 'after' },

        // ===== SECCIÓN 2: KPIs Cards =====
        { text: '1. Indicadores clave (KPI)', style: 'h2', margin: [0, 0, 0, 20] },
        {
          style: 'tableKpi',
          table: {
            widths: ['*', '*', '*', '*'],
            body: [
              filaHeaderTabla(['Total radicados', 'Tiempo prom (h)', '% SLA cumplido', 'Calif promedio']),
              [
                { text: String(delta.valorActual), style: 'kpiValue', alignment: 'center' },
                { text: horasProm.toFixed(2), style: 'kpiValue', alignment: 'center' },
                { text: pctSla.toFixed(2) + '%', style: 'kpiValue', alignment: 'center' },
                { text: reporte.percepcionServicio.promedioGlobal.toFixed(2) + ' / 5', style: 'kpiValue', alignment: 'center' },
              ],
              [
                { text: deltaTxt, style: 'kpiSub', alignment: 'center' },
                { text: 'vs periodo anterior', style: 'kpiSub', alignment: 'center' },
                { text: `${catSlaComp}/${totalSla} casos evaluados`, style: 'kpiSub', alignment: 'center' },
                { text: `${reporte.percepcionServicio.totalCalificaciones} calificaciones`, style: 'kpiSub', alignment: 'center' },
              ],
            ],
          },
          layout: 'headerLineOnly',
        },
        { text: ' ', pageBreak: 'after' },

        // ===== SECCIÓN 3: Distribución Categoría =====
        { text: '2. Distribución por Categoría de Servicio', style: 'h2', margin: [0, 0, 0, 15] },
        { table: { headerRows: 1, body: catTable, widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'] }, layout: 'lightHorizontalLines' },
        { text: ' ', pageBreak: 'after' },

        // ===== SECCIÓN 4: Rendimiento Técnicos =====
        { text: '3. Rendimiento por Técnico Asignado', style: 'h2', margin: [0, 0, 0, 15] },
        { table: { headerRows: 1, body: tecTable, widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'] }, layout: 'lightHorizontalLines' },
        { text: ' ', pageBreak: 'after' },

        // ===== SECCIÓN 5: ANEXOS =====
        { text: '4. Anexos', style: 'h2', margin: [0, 0, 0, 15] },
        { text: '4.1 Tiempos de atención VS Meta SLA', style: 'h3', margin: [0, 0, 0, 10] },
        { table: { headerRows: 1, body: slaTable, widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'] }, layout: 'lightHorizontalLines' },
        { text: ' ', margin: [0, 20] },
        { text: '4.2 Rollup geográfico por sede', style: 'h3', margin: [0, 0, 0, 10] },
        { table: { headerRows: 1, body: geoTable, widths: ['*', 'auto', 'auto', 'auto'] }, layout: 'lightHorizontalLines' },
        { text: ' ', margin: [0, 20] },
        { text: `4.3 Percepción servicio — promedio global: ${reporte.percepcionServicio.promedioGlobal.toFixed(2)}/5 en ${reporte.percepcionServicio.totalCalificaciones} calificaciones. Distribución 1★${reporte.percepcionServicio.porDistribucion[1]} · 2★${reporte.percepcionServicio.porDistribucion[2]} · 3★${reporte.percepcionServicio.porDistribucion[3]} · 4★${reporte.percepcionServicio.porDistribucion[4]} · 5★${reporte.percepcionServicio.porDistribucion[5]}.`, margin: [0, 0, 0, 20] },
      ],
      styles: {
        h1: { fontSize: 26, bold: true, color: '#1E3A8A' },
        h2: { fontSize: 16, bold: true, color: '#1E40AF', margin: [0, 10, 0, 8] },
        h3: { fontSize: 13, bold: true, color: '#334155' },
        k: { bold: true, color: '#334155' },
        footer: { fontSize: 8, color: '#64748B' },
        tableHeader: { bold: true, fontSize: 10, color: 'white', fillColor: '#1E3A8A' },
        kpiValue: { fontSize: 22, bold: true, color: '#0F172A' },
        kpiSub: { fontSize: 9, color: '#64748B' },
      },
      defaultStyle: {
        font: 'Helvetica',
        fontSize: 10,
      },
    };

    return new Promise((resolve, reject) => {
      try {
        const pdfDoc = printer.createPdfKitDocument(dd);
        const chunks: any[] = [];
        pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve({ buffer: Buffer.concat(chunks), filename }));
        pdfDoc.on('error', (e: any) => reject(e));
        pdfDoc.end();
      } catch (e) { reject(e); }
    });
  }

  async listarValoraciones(
    idSolicitud: string | null,
    user: AuthUser | null | undefined,
    estado: string | null | undefined,
  ): Promise<SolicitudValoracion[]> {
    if (idSolicitud) {
      const solicitud = await this.findById(idSolicitud);
      const rows = await this.valoracionRepo.find({
        where: { idSolicitudMantenimiento: solicitud.idSolicitud },
        relations: ['insumos'],
        order: { createdAt: 'ASC' },
      });
      return rows;
    }
    const where: any = {};
    if (user?.userId) {
      where.idTecnicoValorador = user.userId;
    }
    const rows = await this.valoracionRepo.find({
      where,
      relations: ['insumos'],
      order: { createdAt: 'DESC' },
      take: 200,
    });
    if (estado) {
      const estUp = String(estado).toUpperCase();
      return rows.filter((r) => {
        const estadoSol = (r as any).solicitud?.estado || '';
        return !estadoSol || estadoSol.includes(estUp) || (r as any).estadoAlFinalizar === estUp;
      });
    }
    return rows;
  }

  // ---------------------------------------------------------------------------
  // Evidencias / Upload
  // ---------------------------------------------------------------------------
  async subirEvidencia(params: {
    nombreOriginal: string;
    buffer: Buffer;
    mimeType?: string;
    tamanoBytes: number;
    user?: AuthUser;
    idSolicitud?: string;
    orden?: number;
    notas?: string;
  }): Promise<SolicitudEvidencia> {
    const anio = new Date().getFullYear();
    const mes = String(new Date().getMonth() + 1).padStart(2, '0');
    const radix = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    const ext = (params.nombreOriginal.split('.').pop() || 'bin').toLowerCase();
    const ruta = 'mantenimiento/' + anio + '/' + mes + '/' + radix + '.' + ext;
    const nombreLimpio = params.nombreOriginal.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uploaded = await this.storage.subirArchivo({
      rutaObjeto: ruta,
      buffer: params.buffer,
      mimeType: params.mimeType,
      nombrePublico: nombreLimpio,
    });
    const row = this.evidenciaRepo.create({
      idSolicitud: params.idSolicitud || undefined,
      nombreOriginal: params.nombreOriginal,
      nombreAlmacenado: radix + '.' + ext,
      rutaObjeto: uploaded.rutaObjeto,
      bucket: uploaded.bucket,
      urlPublica: uploaded.urlPublica,
      urlPresigned: uploaded.urlPresigned,
      vencimientoPresigned: uploaded.vencimientoPresigned,
      mimeType: params.mimeType,
      tamanoBytes: params.tamanoBytes,
      usuarioQueSubioId: userIdUuidOrNull(params.user?.userId) ?? undefined,
      usuarioQueSubioEmail: params.user?.email,
      orden: params.orden ?? 1,
      notas: params.notas,
    } as any);
    const [saved] = await this.evidenciaRepo.save([row] as any);
    return saved;
  }

  async getEvidenciasBySolicitud(idSolicitud: string, regenerarSiVenceEnHoras = 48): Promise<SolicitudEvidencia[]> {
    const rows = await this.evidenciaRepo.find({ where: { idSolicitud }, order: { orden: 'ASC', fechaSubida: 'ASC' } });
    const ahora = Date.now();
    const limite = regenerarSiVenceEnHoras * 60 * 60 * 1000;
    const actualizables: SolicitudEvidencia[] = [];
    for (const r of rows) {
      const vence = r.vencimientoPresigned ? new Date(r.vencimientoPresigned).getTime() : Number.NEGATIVE_INFINITY;
      const debeRegenerar = !r.urlPresigned || !r.vencimientoPresigned || !isFinite(vence) || (vence - ahora) < limite;
      if (debeRegenerar) {
        try {
          const reSigned = await this.storage.regenerarUrlPresigned(r.rutaObjeto, r.bucket);
          r.urlPresigned = reSigned.urlPresigned;
          r.vencimientoPresigned = reSigned.vencimientoPresigned;
          actualizables.push(r);
        } catch {
          // ignore: si falla MinIO mantenemos la urlPublica sin presigned como fallback.
        }
      }
    }
    if (actualizables.length) {
      await this.evidenciaRepo.save(actualizables as any);
    }
    return rows;
  }

  // ---- ST4 EFDS-1739: Descarga de evidencias individual + ZIP ----
  async obtenerUrlDescargaEvidencia(
    idEvidencia: string,
    user: AuthUser | null | undefined,
  ): Promise<{ redirectUrl: string; nombreOriginal: string; mimeType: string }> {
    if (!isUuid(idEvidencia)) throw new BadRequestException('ID evidencia no tiene formato UUID válido.');
    requirePermission('infraestructura.reportes.gestion', user);
    const ev = await this.evidenciaRepo.findOne({ where: { idEvidencia } });
    if (!ev) throw new NotFoundException('Evidencia no existe o fue eliminada.');
    const expire = 60 * 60 * 24 * 180;
    const firmada = await this.storage.regenerarUrlPresigned(ev.rutaObjeto, ev.bucket, expire);
    ev.urlPresigned = firmada.urlPresigned;
    ev.vencimientoPresigned = firmada.vencimientoPresigned;
    try { await this.evidenciaRepo.save(ev as any); } catch { /* ignore */ }
    return { redirectUrl: firmada.urlPresigned, nombreOriginal: ev.nombreOriginal || `evidencia-${idEvidencia}.bin`, mimeType: ev.mimeType || 'application/octet-stream' };
  }

  async descargarZipEvidenciasSolicitud(
    idSolicitud: string,
    user: AuthUser | null | undefined,
  ): Promise<{ stream: PassThrough; filename: string; totalBytes: number }> {
    if (!isUuid(idSolicitud)) throw new BadRequestException('ID solicitud no tiene formato UUID válido.');
    const sol = await this.findById(idSolicitud);
    const esBypass = usuarioEsBypassConsolidados(user);
    const tienePermiso = esBypass ||
      userHasPermission('infraestructura.reportes.gestion', user) ||
      userHasPermission('infraestructura.view_all', user) ||
      userHasPermission('infraestructura.solicitud.view', user) ||
      (user?.email && sol.solicitanteEmail && user.email.toLowerCase() === sol.solicitanteEmail.toLowerCase());
    if (!tienePermiso) {
      requirePermission('infraestructura.reportes.gestion', user);
    }
    const evs = await this.getEvidenciasBySolicitud(sol.idSolicitud, 180);
    const { createRequire } = await import('node:module');
    const requireFn = typeof require !== 'undefined' ? require : createRequire(import.meta.url);
    const archiverMod = requireFn('archiver');
    const output = new PassThrough();
    const zipOptions = { zlib: { level: 6 }, highWaterMark: 1024 * 1024 };
    let zip: any;
    if (archiverMod && typeof archiverMod.ZipArchive === 'function') {
      zip = new archiverMod.ZipArchive(zipOptions);
    } else if (archiverMod && archiverMod.default && typeof archiverMod.default.ZipArchive === 'function') {
      zip = new archiverMod.default.ZipArchive(zipOptions);
    } else if (typeof archiverMod === 'function') {
      zip = archiverMod('zip', zipOptions);
    } else if (archiverMod && typeof archiverMod.default === 'function') {
      zip = archiverMod.default('zip', zipOptions);
    } else if (archiverMod && typeof archiverMod.create === 'function') {
      zip = archiverMod.create('zip', zipOptions);
    } else {
      throw new InternalServerErrorException('No se pudo inicializar la librería archiver para empaquetado ZIP.');
    }
    zip.on('error', (err: any) => { try { output.destroy(err); } catch { /* ignore */ } });
    zip.pipe(output);
    let totalBytes = 0;
    const vistos = new Set<string>();
    for (let i = 0; i < evs.length; i++) {
      const e = evs[i];
      if (!e || !e.rutaObjeto) continue;
      const key = `${e.bucket}:${e.rutaObjeto}`;
      if (vistos.has(key)) continue;
      vistos.add(key);
      let baseName = String(e.nombreOriginal || `evidencia_${i + 1}`).replace(/[\\/:*?"<>|]/g, '_');
      if (!/\.[a-z0-9]{1,10}$/i.test(baseName)) baseName = baseName + '.bin';
      let nombreZip = `${String(i + 1).padStart(3, '0')}_${baseName}`;
      let sufijo = 2;
      const nombresEnZip = new Set<string>();
      while (nombresEnZip.has(nombreZip)) { nombreZip = `${String(i + 1).padStart(3, '0')}_(${sufijo})_${baseName}`; sufijo++; }
      nombresEnZip.add(nombreZip);
      try {
        if (this.storage.existeArchivo(e.rutaObjeto)) {
          const stream = this.storage.obtenerStream(e.rutaObjeto);
          zip.append(stream, { name: nombreZip, date: e.fechaSubida || new Date() });
          totalBytes += Number(e.tamanoBytes || 0);
        } else {
          zip.append(`NO SE PUDO DESCARGAR ESTA EVIDENCIA (${nombreZip}). Error: Archivo no encontrado en disco local\n`, { name: nombreZip + '__FALLO.txt' });
        }
      } catch (err: any) {
        zip.append(`NO SE PUDO DESCARGAR ESTA EVIDENCIA (${nombreZip}). Error: ${String(err?.message || err).slice(0, 500)}\n`, { name: nombreZip + '__FALLO.txt' });
      }
    }
    if (evs.length === 0) {
      zip.append(`Solicitud: ${sol.consecutivo || sol.idSolicitud}\nNo registra evidencias adjuntas.\n`, { name: 'LEAME.txt' });
    }
    zip.finalize().catch(() => { try { output.end(); } catch { /* ignore */ } });
    const consecutivo = sol.consecutivo || sol.idSolicitud.slice(0, 10);
    const filename = `Evidencias_${consecutivo.replace(/[^A-Za-z0-9_-]/g, '_')}.zip`;
    return { stream: output, filename, totalBytes };
  }
}
