import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { SolicitudMantenimiento } from './mantenimiento.entity.js';
import { CreateMantenimientoDto, UpdateMantenimientoEstadoDto, RemitirATIDto } from './dto/create-mantenimiento.dto.js';
import { Sede } from '../sedes/sede.entity.js';
import { CatalogoItem } from './catalogo-item.entity.js';
import { SolicitudEvidencia } from './solicitud-evidencia.entity.js';
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
/** Retorna userId si es UUID válido; de lo contrario null. Usado para no romper
 *  columnas tipo uuid en el entity cuando auth service usa BIGINT (ej: userId = 746).
 *  Los campos VARCHAR (solicitanteNombre / Email) siguen poblandose igual. */
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

@Injectable()
export class MantenimientoService {
  constructor(
    @InjectRepository(SolicitudMantenimiento)
    private readonly mantenimientoRepo: Repository<SolicitudMantenimiento>,
    @InjectRepository(Sede)
    private readonly sedeRepo: Repository<Sede>,
    @InjectRepository(CatalogoItem)
    private readonly catalogoRepo: Repository<CatalogoItem>,
    @InjectRepository(SolicitudEvidencia)
    private readonly evidenciaRepo: Repository<SolicitudEvidencia>,
    private readonly storage: StorageService,
  ) {}

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
