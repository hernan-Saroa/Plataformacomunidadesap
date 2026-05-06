import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Aprobacion, AprobacionEstado, AprobacionTipo, AprobacionPrioridad } from './entities/aprobacion.entity';
import { CreateAprobacionDto } from './dto/create-aprobacion.dto';
import { AprobarDto } from './dto/aprobar.dto';
import { RechazarDto } from './dto/rechazar.dto';
import { PlanesMejoramientoService } from '../planes-mejoramiento/planes-mejoramiento.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { TipoNotificacion, PrioridadNotificacion, CanalNotificacion } from '../notificaciones/entities/notificacion.entity';

@Injectable()
export class AprobacionesService {
  constructor(
    @InjectRepository(Aprobacion)
    private aprobacionRepository: Repository<Aprobacion>,
    @Inject(forwardRef(() => PlanesMejoramientoService))
    private planesMejoramientoService: PlanesMejoramientoService,
    private readonly notificacionesService: NotificacionesService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Generar código único para aprobación
   */
  private async generateCodigo(tipo: string): Promise<string> {
    const prefijo = tipo.toUpperCase().replace(/-/g, '_').substring(0, 10);
    const año = new Date().getFullYear();
    const count = await this.aprobacionRepository.count();
    return `APR-${prefijo}-${año}-${String(count + 1).padStart(5, '0')}`;
  }

  /**
   * Obtiene los UUIDs (id_user) de usuarios con rol Jefe de Control Interno.
   * Busca por múltiples variantes del código de rol para mayor compatibilidad.
   */
  private async obtenerJefesControlInterno(): Promise<string[]> {
    try {
      const result = await this.dataSource.query(`
        SELECT DISTINCT u.id_user
        FROM auth."user" u
        INNER JOIN auth.user_roles ur ON ur.id_user = u.id_user
        INNER JOIN auth.role r ON r.id = ur.id_rol
        WHERE UPPER(r.code) IN (
          'JEFE_CONTROL_INTERNO',
          'JEFE_OCI',
          'JEFE_OCIG',
          'CONTROL_INTERNO_JEFE',
          'OCI_JEFE'
        )
          AND (ur.is_active = true OR ur.is_active IS NULL)
          AND u.is_active = true
      `);
      return result.map((row: any) => String(row.id_user)).filter(Boolean);
    } catch (error) {
      console.error('[AprobacionesService.obtenerJefesControlInterno] Error:', error);
      return [];
    }
  }

  /**
   * Crear una nueva solicitud de aprobación
   */
  async create(createAprobacionDto: CreateAprobacionDto): Promise<Aprobacion> {
    // Mapear prioridad del DTO al enum
    let prioridad = AprobacionPrioridad.MEDIA;
    if (createAprobacionDto.prioridad) {
      if (createAprobacionDto.prioridad === 'Alta') {
        prioridad = AprobacionPrioridad.ALTA;
      } else if (createAprobacionDto.prioridad === 'Baja') {
        prioridad = AprobacionPrioridad.BAJA;
      } else {
        prioridad = AprobacionPrioridad.MEDIA;
      }
    }

    const codigo = await this.generateCodigo(createAprobacionDto.tipo);

    const aprobacion = this.aprobacionRepository.create({
      codigo,
      tipo: createAprobacionDto.tipo as AprobacionTipo,
      titulo: createAprobacionDto.titulo,
      descripcion: createAprobacionDto.descripcion,
      solicitante: createAprobacionDto.solicitante,
      fechaSolicitud: createAprobacionDto.fecha_solicitud
        ? new Date(createAprobacionDto.fecha_solicitud)
        : new Date(),
      prioridad: prioridad,
      estado: AprobacionEstado.PENDIENTE,
      territorial: createAprobacionDto.territorial,
      sede: createAprobacionDto.sede,
      relacionado: createAprobacionDto.relacionado,
      area: createAprobacionDto.area,
      documentosCount: 0,
    });

    const saved = await this.aprobacionRepository.save(aprobacion);

    // Notificar a los Jefes OCI sobre la nueva solicitud de aprobación
    try {
      const jefesOCI = await this.obtenerJefesControlInterno();
      for (const jefeId of jefesOCI) {
        await this.notificacionesService.create({
          usuarioId: jefeId,
          tipoNotificacion: TipoNotificacion.OTRO,
          titulo: `Nueva solicitud de aprobación: ${saved.titulo}`,
          mensaje: `${createAprobacionDto.solicitante || 'Un usuario'} ha enviado una solicitud de aprobación "${saved.titulo}" (${saved.codigo}). Tipo: ${saved.tipo}.`,
          prioridad: prioridad === AprobacionPrioridad.ALTA ? PrioridadNotificacion.ALTA : PrioridadNotificacion.NORMAL,
          canal: CanalNotificacion.AMBOS,
          metadata: {
            aprobacionId: saved.id,
            aprobacionCodigo: saved.codigo,
            tipo: saved.tipo,
          },
          accionUrl: `/control-interno/aprobaciones/${saved.id}`,
        });
      }
    } catch (notifError) {
      console.error('[AprobacionesService.create] Error al enviar notificaciones:', notifError);
    }

    return saved;
  }

  /**
   * Obtener todas las aprobaciones con filtros opcionales
   */
  async findAll(filters?: {
    estado?: string;
    tipo?: string;
    prioridad?: string;
  }): Promise<Aprobacion[]> {
    const queryBuilder = this.aprobacionRepository.createQueryBuilder('aprobacion');

    if (filters?.estado) {
      queryBuilder.andWhere('aprobacion.estado = :estado', { estado: filters.estado });
    }

    if (filters?.tipo) {
      queryBuilder.andWhere('aprobacion.tipo = :tipo', { tipo: filters.tipo });
    }

    if (filters?.prioridad) {
      queryBuilder.andWhere('aprobacion.prioridad = :prioridad', { prioridad: filters.prioridad });
    }

    // Ordenar por prioridad (Alta primero) y luego por fecha de solicitud
    queryBuilder.orderBy(
      "CASE WHEN aprobacion.prioridad = 'Alta' THEN 1 WHEN aprobacion.prioridad = 'Media' THEN 2 ELSE 3 END",
      'ASC',
    );
    queryBuilder.addOrderBy('aprobacion.fechaSolicitud', 'ASC');

    return await queryBuilder.getMany();
  }

  /**
   * Obtener solo aprobaciones pendientes
   */
  async findPendientes(): Promise<Aprobacion[]> {
    return await this.aprobacionRepository.find({
      where: { estado: AprobacionEstado.PENDIENTE },
      order: {
        prioridad: 'ASC', // Alta primero
        fechaSolicitud: 'ASC',
      },
    });
  }

  /**
   * Obtener una aprobación por ID
   */
  async findOne(id: string): Promise<Aprobacion> {
    const aprobacion = await this.aprobacionRepository.findOne({ where: { id } });

    if (!aprobacion) {
      throw new NotFoundException(`Aprobación con ID ${id} no encontrada`);
    }

    return aprobacion;
  }

  /**
   * Aprobar una solicitud.
   * Notifica a Jefes OCI y registra en sistema + email.
   */
  async aprobar(id: string, aprobarDto: AprobarDto, aprobadoPor?: string): Promise<Aprobacion> {
    const aprobacion = await this.findOne(id);

    if (aprobacion.estado !== AprobacionEstado.PENDIENTE) {
      throw new NotFoundException(`La aprobación ya fue ${aprobacion.estado}`);
    }

    aprobacion.estado = AprobacionEstado.APROBADO;
    aprobacion.observaciones = aprobarDto.observaciones;
    aprobacion.fechaAprobacion = new Date();
    aprobacion.aprobadoPor = aprobadoPor || 'Sistema';

    const savedAprobacion = await this.aprobacionRepository.save(aprobacion);

    // Si es una aprobación de plan de mejoramiento, aprobar también el plan
    if (aprobacion.tipo === AprobacionTipo.PLAN_MEJORA && aprobacion.relacionado) {
      try {
        await this.planesMejoramientoService.aprobar(
          aprobacion.relacionado,
          aprobarDto.observaciones,
          aprobadoPor,
        );
      } catch (error) {
        console.error('Error al aprobar plan de mejoramiento desde aprobación:', error);
      }
    }

    // ✅ SINCRONIZACIÓN CON CONFIGURACIÓN: Obtener roles destinatarios
    let rolesDestinatarios = ['Auditor Líder', 'Jefe OCIG']; // Fallback
    try {
      const configGlobal = await this.notificacionesService.getGlobalConfig();
      if (configGlobal && configGlobal.tiposNotificacion && configGlobal.tiposNotificacion['EVT-APR-001']) {
        const configEvento = configGlobal.tiposNotificacion['EVT-APR-001'] as any;
        rolesDestinatarios = configEvento.destinatarios || rolesDestinatarios;
      }
    } catch (e) {}

    const usuariosNotificar = new Set<string>();
    
    // 1. Si los roles incluyen "Jefe OCIG"
    if (rolesDestinatarios.includes('Jefe OCIG')) {
      const jefesOCI = await this.obtenerJefesControlInterno();
      jefesOCI.forEach(id => usuariosNotificar.add(id));
    }
    
    // 2. Si los roles incluyen "Auditor Líder" (el que creó la solicitud)
    if (rolesDestinatarios.includes('Auditor Líder') && aprobacion.solicitante) {
      usuariosNotificar.add(aprobacion.solicitante);
    }

    // Enviar notificaciones
    for (const usuarioId of usuariosNotificar) {
      try {
        await this.notificacionesService.create({
          usuarioId,
          tipoNotificacion: TipoNotificacion.APROBACION_PLAN,
          titulo: `✅ Aprobación completada: ${savedAprobacion.titulo}`,
          mensaje: `La solicitud "${savedAprobacion.titulo}" (${savedAprobacion.codigo}) ha sido APROBADA por ${aprobadoPor || 'el sistema'}.`,
          prioridad: PrioridadNotificacion.ALTA,
          canal: CanalNotificacion.AMBOS,
          metadata: {
            aprobacionId: savedAprobacion.id,
            aprobacionCodigo: savedAprobacion.codigo,
            tipo: savedAprobacion.tipo,
            aprobadoPor: aprobadoPor || 'Sistema',
          },
          accionUrl: `/control-interno/aprobaciones/${savedAprobacion.id}`,
        });
      } catch (e) {}
    }

    return savedAprobacion;
  }

  /**
   * Rechazar una solicitud.
   * Notifica a Jefes OCI y registra en sistema + email.
   */
  async rechazar(id: string, rechazarDto: RechazarDto, rechazadoPor?: string): Promise<Aprobacion> {
    const aprobacion = await this.findOne(id);

    if (aprobacion.estado !== AprobacionEstado.PENDIENTE) {
      throw new NotFoundException(`La aprobación ya fue ${aprobacion.estado}`);
    }

    aprobacion.estado = AprobacionEstado.RECHAZADO;
    aprobacion.motivoRechazo = rechazarDto.motivo_rechazo;
    aprobacion.fechaRechazo = new Date();
    aprobacion.rechazadoPor = rechazadoPor || 'Sistema';

    const savedAprobacion = await this.aprobacionRepository.save(aprobacion);

    // Si es una aprobación de plan de mejoramiento, rechazar también el plan
    if (aprobacion.tipo === AprobacionTipo.PLAN_MEJORA && aprobacion.relacionado) {
      try {
        await this.planesMejoramientoService.rechazar(
          aprobacion.relacionado,
          rechazarDto.motivo_rechazo,
        );
      } catch (error) {
        console.error('Error al rechazar plan de mejoramiento desde aprobación:', error);
      }
    }

    // ✅ SINCRONIZACIÓN CON CONFIGURACIÓN (RECHAZO)
    let rolesDestinatarios = ['Auditor Líder', 'Jefe OCIG']; // Fallback
    try {
      const configGlobal = await this.notificacionesService.getGlobalConfig();
      if (configGlobal && configGlobal.tiposNotificacion && configGlobal.tiposNotificacion['EVT-APR-002']) {
        const configEvento = configGlobal.tiposNotificacion['EVT-APR-002'] as any;
        rolesDestinatarios = configEvento.destinatarios || rolesDestinatarios;
      }
    } catch (e) {}

    const usuariosNotificar = new Set<string>();
    
    if (rolesDestinatarios.includes('Jefe OCIG')) {
      const jefesOCI = await this.obtenerJefesControlInterno();
      jefesOCI.forEach(id => usuariosNotificar.add(id));
    }
    
    if (rolesDestinatarios.includes('Auditor Líder') && aprobacion.solicitante) {
      usuariosNotificar.add(aprobacion.solicitante);
    }

    for (const usuarioId of usuariosNotificar) {
      try {
        await this.notificacionesService.create({
          usuarioId,
          tipoNotificacion: TipoNotificacion.RECHAZO_PLAN,
          titulo: `❌ Solicitud rechazada: ${savedAprobacion.titulo}`,
          mensaje: `La solicitud "${savedAprobacion.titulo}" (${savedAprobacion.codigo}) ha sido RECHAZADA por ${rechazadoPor || 'el sistema'}. Motivo: ${rechazarDto.motivo_rechazo}`,
          prioridad: PrioridadNotificacion.ALTA,
          canal: CanalNotificacion.AMBOS,
          metadata: {
            aprobacionId: savedAprobacion.id,
            aprobacionCodigo: savedAprobacion.codigo,
            tipo: savedAprobacion.tipo,
            rechazadoPor: rechazadoPor || 'Sistema',
            motivo: rechazarDto.motivo_rechazo,
          },
          accionUrl: `/control-interno/aprobaciones/${savedAprobacion.id}`,
        });
      } catch (e) {}
    }

    return savedAprobacion;
  }

  /**
   * Actualizar una aprobación
   */
  async update(id: string, updateData: Partial<CreateAprobacionDto>): Promise<Aprobacion> {
    const aprobacion = await this.findOne(id);

    Object.assign(aprobacion, updateData);

    return await this.aprobacionRepository.save(aprobacion);
  }

  /**
   * Eliminar una aprobación
   */
  async remove(id: string): Promise<void> {
    const aprobacion = await this.findOne(id);
    await this.aprobacionRepository.remove(aprobacion);
  }

  /**
   * Obtener estadísticas de aprobaciones
   */
  async getEstadisticas() {
    const [pendientes, aprobadas, rechazadas] = await Promise.all([
      this.aprobacionRepository.count({ where: { estado: AprobacionEstado.PENDIENTE } }),
      this.aprobacionRepository.count({ where: { estado: AprobacionEstado.APROBADO } }),
      this.aprobacionRepository.count({ where: { estado: AprobacionEstado.RECHAZADO } }),
    ]);

    const altaPrioridad = await this.aprobacionRepository.count({
      where: { estado: AprobacionEstado.PENDIENTE, prioridad: AprobacionPrioridad.ALTA },
    });

    // Aprobaciones aprobadas hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const aprobadasHoy = await this.aprobacionRepository
      .createQueryBuilder('aprobacion')
      .where('aprobacion.estado = :estado', { estado: AprobacionEstado.APROBADO })
      .andWhere('aprobacion.fecha_aprobacion >= :hoy', { hoy })
      .getCount();

    // Calcular aprobaciones que vencen hoy (pendientes con más de 7 días)
    const sieteDiasAtras = new Date();
    sieteDiasAtras.setHours(0, 0, 0, 0);
    sieteDiasAtras.setDate(sieteDiasAtras.getDate() - 7);
    
    const vencenHoy = await this.aprobacionRepository
      .createQueryBuilder('aprobacion')
      .where('aprobacion.estado = :estado', { estado: AprobacionEstado.PENDIENTE })
      .andWhere('aprobacion.fecha_solicitud <= :sieteDiasAtras', { sieteDiasAtras })
      .getCount();

    return {
      pendientes,
      aprobadas,
      rechazadas,
      altaPrioridad,
      aprobadasHoy,
      vencenHoy,
    };
  }
}
