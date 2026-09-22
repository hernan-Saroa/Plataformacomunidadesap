import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, IsNull, Not } from 'typeorm';
import { SolicitudMantenimiento } from './mantenimiento.entity.js';
import { CreateMantenimientoDto, UpdateMantenimientoEstadoDto, RemitirATIDto, IniciarValoracionDto, GuardarValoracionCompletaDto, ConfirmarRecepcionInsumosDto } from './dto/create-mantenimiento.dto.js';
import { CerrarTecnicamenteDto, CierreTecnicoResponse } from './dto/cerrar-tecnicamente.dto.js';
import { Sede } from '../sedes/sede.entity.js';
import { CatalogoItem } from './catalogo-item.entity.js';
import { SolicitudEvidencia } from './solicitud-evidencia.entity.js';
import { SolicitudValoracion } from './solicitud-valoracion.entity.js';
import { SolicitudValoracionInsumo } from './solicitud-valoracion-insumo.entity.js';
import { StorageService } from './storage.service.js';

interface AuthUser {
  userId: string;
  username: string;
  email: string;
  roles: string[];
}

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}
function userIdUuidOrNull(userId: unknown): string | null {
  return isUuid(userId) ? userId : null;
}

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
const ROLES_ASIGNADOR_PERMITIDOS: readonly string[] = ['SUPER_ADMIN', 'GESTOR_MANTENIMIENTO'] as const;

@Injectable()
export class MantenimientoService implements OnModuleInit {
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
    private readonly storage: StorageService,
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
    const roles = user.roles.map((r) => String(r).toLowerCase());
    return roles.some((r) => ['super_admin', 'admin', 'umi', 'infraestructura', 'coordinador_infraestructura'].includes(r));
  }

  async findAll(
    estado?: string,
    prioridad?: string,
    incluirTI: boolean = false,
    idCategoria?: number,
    user?: AuthUser | null,
  ): Promise<SolicitudMantenimiento[]> {
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
    if (!incluirTI && this.usuarioTieneRolUMI(user)) {
      query.andWhere("solicitud.areaResponsableActual IN ('UMI','PENDIENTE_CLASIFICACION')");
    }

    return query.orderBy('solicitud.fechaRadicacion', 'DESC').getMany();
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
    const rolesNorm = user.roles.map((r) => String(r).toUpperCase().trim());
    const permitido = rolesNorm.some((r) => (ROLES_ASIGNADOR_PERMITIDOS as readonly string[]).includes(r));
    if (!permitido) {
      return {
        permitido: false,
        errorMsg:
          'Rol insuficiente. Solo usuarios SUPER_ADMIN o GESTOR_MANTENIMIENTO pueden aprobar, rechazar o redistribuir solicitudes UMI.',
      };
    }
    return { permitido: true };
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
        | 'CIERRE_TECNICO';
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
      ? ['PENDIENTE_APROBACION', 'EN_ANALISIS']
      : ['RECIBIDA', 'EN_ANALISIS', 'PENDIENTE_CLASIFICACION', 'PENDIENTE_APROBACION'];
    if (!ESTADOS_PERMITIDOS_APROBAR.includes(solicitud.estado || '')) {
      throw new ConflictException(
        esTI
          ? `Solo se puede aprobar la remisión a TI en estados PENDIENTE_APROBACION o EN_ANALISIS. Estado actual: ${solicitud.estado}. Para reasignar técnico utilice Redistribuir.`
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
    const regla001 = await this.catalogoRepo.findOne({
      where: { catalogo: REGLA_ESCALAMIENTO, codigo: 'REG_001_CATEGORIA_48_ELECTRICAS' },
    });
    const esp =
      regla001?.metadata && typeof regla001.metadata === 'object'
        ? String((regla001.metadata as any).tecnicoCodigo || '').trim()
        : '';
    if (esp && tecnicoAsignadoCodigo !== esp) {
      throw new ForbiddenException(
        'La categoría CS_002 Eléctricas requiere el técnico especializado configurado en la regla 001.',
      );
    }
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
    return this.findById(idSolicitud);
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
}
