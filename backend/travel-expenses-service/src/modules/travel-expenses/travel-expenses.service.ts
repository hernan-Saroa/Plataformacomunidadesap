import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { ComisionadoEntity } from '../../entities/comisionado.entity';
import { SolicitudComisionEntity } from '../../entities/solicitud-comision.entity';
import { DocumentoSoporteEntity } from '../../entities/documento-soporte.entity';
import { SolicitudHistorialEstadoEntity } from '../../entities/solicitud-historial-estado.entity';
import {
  EstadoSolicitud,
  ESTADOS_SOLO_LECTURA,
} from '../../entities/estado-solicitud.enum';
import { CreateSolicitudDto } from '../../dto/create-solicitud.dto';
import { UpdateSolicitudDto } from '../../dto/update-solicitud.dto';
import { UploadDocumentoDto } from '../../dto/upload-documento.dto';
import { VerifyAuditDto } from '../../dto/verify-audit.dto';
import { SegundaRevisionObservacionesDto } from '../../dto/segunda-revision-observaciones.dto';
import { AutorizacionObservacionesDto } from '../../dto/autorizacion-observaciones.dto';
import {
  sanitizeObjetoComision,
  sanitizeTextoPlano,
  sanitizeDocumento,
  sanitizeNombre,
  sanitizeMontoPlano,
  sanitizeFechaPlano,
} from '../../common/sanitize.util';
import { getClientIp } from '../../common/ip.util';
import { getUploadRootDir } from '../../common/storage.util';
import { ConfigService } from '../config/config.service';
import { ConfigTipoComisionadoEntity } from '../../entities/config/config-tipo-comisionado.entity';
import { NotificationClientService } from '../../common/notification-client.service';
import { LiquidationService } from '../liquidation/liquidation.service';
import {
  TipoComisionadoLiquidacion,
  CategoriaInvestigador,
} from '../../dto/liquidation/calcular-liquidacion.dto';
import { TicketsService } from '../tickets/tickets.service';

function esDiaHabil(fecha: Date): boolean {
  const dia = fecha.getDay();
  return dia !== 0 && dia !== 6;
}

/**
 * Subset de columnas de `auth.personas` consumidas por el módulo de viáticos
 * al materializar un comisionado desde ESAP. La tabla vive en otro esquema y
 * la consultamos directamente vía SQL (misma base de datos compartida).
 */
interface AuthPersonaRow {
  num_identificacion: string;
  nom_tercero: string;
  pri_apellido: string;
  dir_email: string | null;
  tel_celular: string | null;
  id_dependencia: string | number | null;
}

function contarDiasHabilesEntre(fechaInicio: Date, fechaFin: Date): number {
  let count = 0;
  const fecha = new Date(fechaInicio);
  while (fecha <= fechaFin) {
    if (esDiaHabil(fecha)) {
      count++;
    }
    fecha.setDate(fecha.getDate() + 1);
  }
  return count;
}

/**
 * Traduce el estado interno de una solicitud a una etiqueta humana para los
 * mensajes orientados al usuario (evita exponer códigos internos).
 */
function etiquetaEstadoHumana(estado?: string): string {
  const mapa: Record<string, string> = {
    PENDIENTE: 'borrador/pendiente',
    RADICADA: 'radicada',
    EXTEMPORANEA: 'extemporánea',
    DEVUELTA: 'devuelta para subsanar',
    SOLICITADO: 'en revisión del Grupo de Viáticos',
    APROBADO_JEFE: 'aprobada por el jefe inmediato',
    APROBADO_TALENTO_HUMANO: 'aprobada por Talento Humano',
    RESOLUCION_EMITIDA: 'con resolución emitida',
    TIQUETES_COMPRADOS: 'con tiquetes gestionados',
    EN_COMISION: 'en comisión',
    PENDIENTE_LEGALIZACION: 'pendiente de legalización',
    LEGALIZADO: 'legalizada',
    RECHAZADO: 'rechazada',
  };
  if (!estado) return 'en trámite';
  return mapa[estado.toUpperCase()] ?? estado;
}

@Injectable()
export class TravelExpensesService {
  private readonly logger = new Logger(TravelExpensesService.name);

  constructor(
    @InjectRepository(ComisionadoEntity)
    private readonly comisionadoRepo: Repository<ComisionadoEntity>,
    @InjectRepository(SolicitudComisionEntity)
    private readonly solicitudRepo: Repository<SolicitudComisionEntity>,
    @InjectRepository(DocumentoSoporteEntity)
    private readonly documentoRepo: Repository<DocumentoSoporteEntity>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly notificationClient: NotificationClientService,
    @Optional()
    private readonly liquidationService?: LiquidationService,
    @Optional()
    private readonly ticketsService?: TicketsService,
  ) {}

  private readonly SUPER_ADMIN_ROLES = [
    'ADMIN',
    'SUPER_ADMIN',
    'ADMINISTRATIVO',
    'SUPER_ADMINISTRADOR',
    'super_administrador',
    'SUPERUSER',
    'superuser',
  ];

  private esSuperAdmin(rolesUsuario: string[]): boolean {
    return rolesUsuario.some((r) => {
      if (typeof r !== 'string') return false;
      const normalized = r.toUpperCase().replace(/\s+/g, '_');
      return (
        this.SUPER_ADMIN_ROLES.includes(normalized) ||
        this.SUPER_ADMIN_ROLES.includes(r.toUpperCase())
      );
    });
  }

  async obtenerSolicitudes(
    usuarioId?: string,
    isSuperAdmin = false,
    page = 1,
    limit = 20,
    isControlViaticos = false,
    isAnalista = false,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    console.log(
      '[travel-expenses] service obtenerSolicitudes usuarioId=',
      usuarioId,
      'isSuperAdmin=',
      isSuperAdmin,
      'isControlViaticos=',
      isControlViaticos,
      'isAnalista=',
      isAnalista,
      'page=',
      page,
      'limit=',
      limit,
    );
    const query = this.solicitudRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.comisionado', 'comisionado');

    if (!isSuperAdmin) {
      if (isControlViaticos) {
        query.andWhere('s.estado_solicitud IN (:...estadosControl)', {
          estadosControl: ['SOLICITADA_SIIF', 'VERIFICADA'],
        });
      } else if (isAnalista && usuarioId) {
        query.andWhere(
          '(s.creadoPorUsuarioId = :usuarioId OR s.analistaAsignadoId = :usuarioId)',
          { usuarioId },
        );
      } else if (usuarioId) {
        query.andWhere('s.creadoPorUsuarioId = :usuarioId', { usuarioId });
      }
    }

    // Orden por prioridad de estado (vista general): Solicitadas SIIF → Verificadas →
    // Radicadas → Extemporáneas → Solicitadas (en revisión) → Pendientes → resto.
    // Dentro del mismo estado se ordena por fecha de creación (más reciente primero).
    query
      .orderBy(
        `CASE s.estado_solicitud
           WHEN 'SOLICITADA_SIIF' THEN 1
           WHEN 'VERIFICADA' THEN 2
           WHEN 'RADICADA' THEN 3
           WHEN 'EXTEMPORANEA' THEN 4
           WHEN 'SOLICITADO' THEN 5
           WHEN 'PENDIENTE' THEN 6
           ELSE 7
         END`,
        'ASC',
      )
      .addOrderBy('s.estadoSolicitud', 'ASC')
      .addOrderBy('s.creadoEn', 'DESC');

    const total = await query.getCount();
    const solicitudes = await query
      .offset((page - 1) * limit)
      .limit(limit)
      .getMany();
    console.log(
      '[travel-expenses] service obtenerSolicitudes count=',
      solicitudes.length,
      'total=',
      total,
    );

    const data = solicitudes.map((s) => ({
      id: s.id,
      consecutivoUnico: s.consecutivoUnico,
      comisionadoId: s.comisionadoId,
      comisionado: s.comisionado
        ? {
            id: s.comisionado.id,
            numeroDocumento: s.comisionado.numeroDocumento,
            primerNombre: s.comisionado.primerNombre,
            segundoNombre: s.comisionado.segundoNombre,
            primerApellido: s.comisionado.primerApellido,
            segundoApellido: s.comisionado.segundoApellido,
            tipoComisionado: s.comisionado.tipoComisionado,
            email: s.comisionado.email,
            telefonoContacto: s.comisionado.telefonoContacto,
            autorizacionHabeasData: s.comisionado.autorizacionHabeasData,
          }
        : null,
      destinoCiudad: s.destinoCiudad,
      destinoDepartamento: s.destinoDepartamento,
      fechaInicio: s.fechaInicio.toISOString(),
      fechaFin: s.fechaFin.toISOString(),
      objetoComision: s.objetoComision,
      prioridad: s.prioridad,
      rubroPresupuestal: s.rubroPresupuestal,
      requiereTiquetes: s.requiereTiquetes,
      montoViaticos: Number(s.montoViaticos || 0),
      montoGastosViaje: Number(s.montoGastosViaje || 0),
      diasComision: s.diasComision ?? 1,
      estadoSolicitud: s.estadoSolicitud,
      radicadoFueraJornada: s.radicadoFueraJornada,
      extemporanea: s.extemporanea,
      creadoEn: s.creadoEn.toISOString(),
      actualizadoEn: s.actualizadoEn.toISOString(),
      creadoPorUsuarioId: s.creadoPorUsuarioId,
      analistaAsignadoId: s.analistaAsignadoId,
      motivoDevolucion: s.motivoDevolucion || s.observacionesSegundaRevision || null,
      observacionesSegundaRevision: s.observacionesSegundaRevision || null,
      fechaSegundaRevision: s.fechaSegundaRevision?.toISOString() ?? null,
      revisorControlId: s.revisorControlId || null,
      esCreadoPorMi: isSuperAdmin
        ? s.creadoPorUsuarioId === usuarioId
        : undefined,
    }));

    return { data, total, page, limit };
  }

  async obtenerBandejaSecretario(
    filtros: {
      dependenciaId?: string;
      prioridad?: string;
      extemporanea?: boolean;
      comisionadoDocumento?: string;
      fechaInicio?: string;
      fechaFin?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const {
      dependenciaId,
      prioridad,
      extemporanea,
      comisionadoDocumento,
      fechaInicio,
      fechaFin,
      page = 1,
      limit = 20,
    } = filtros;

    const query = this.solicitudRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.comisionado', 'comisionado')
      .where('s.estado_solicitud IN (:...estados)', {
        estados: ['SOLICITADO', 'EXTEMPORANEA'],
      });

    if (dependenciaId) {
      query.andWhere('comisionado.id_dependencia = :dependenciaId', {
        dependenciaId,
      });
    }

    if (prioridad) {
      query.andWhere('s.prioridad = :prioridad', { prioridad });
    }

    if (typeof extemporanea === 'boolean') {
      query.andWhere('s.extemporanea = :extemporanea', { extemporanea });
    }

    if (comisionadoDocumento) {
      query.andWhere('comisionado.numero_documento = :documento', {
        documento: comisionadoDocumento,
      });
    }

    if (fechaInicio) {
      query.andWhere('s.fecha_inicio >= :fechaInicio', {
        fechaInicio: new Date(fechaInicio),
      });
    }

    if (fechaFin) {
      query.andWhere('s.fecha_fin <= :fechaFin', {
        fechaFin: new Date(fechaFin),
      });
    }

    query
      .orderBy('s.creado_en', 'DESC')
      .addOrderBy('s.consecutivo_unico', 'ASC');

    const total = await query.getCount();
    const solicitudes = await query
      .offset((page - 1) * limit)
      .limit(limit)
      .getMany();

    const data = solicitudes.map((s) => ({
      id: s.id,
      consecutivoUnico: s.consecutivoUnico,
      comisionadoId: s.comisionadoId,
      comisionado: s.comisionado
        ? {
            id: s.comisionado.id,
            numeroDocumento: s.comisionado.numeroDocumento,
            primerNombre: s.comisionado.primerNombre,
            segundoNombre: s.comisionado.segundoNombre,
            primerApellido: s.comisionado.primerApellido,
            segundoApellido: s.comisionado.segundoApellido,
            tipoComisionado: s.comisionado.tipoComisionado,
            email: s.comisionado.email,
            telefonoContacto: s.comisionado.telefonoContacto,
            autorizacionHabeasData: s.comisionado.autorizacionHabeasData,
            idDependencia: s.comisionado.idDependencia,
          }
        : null,
      destinoCiudad: s.destinoCiudad,
      destinoDepartamento: s.destinoDepartamento,
      fechaInicio: s.fechaInicio.toISOString(),
      fechaFin: s.fechaFin.toISOString(),
      objetoComision: s.objetoComision,
      prioridad: s.prioridad,
      rubroPresupuestal: s.rubroPresupuestal,
      requiereTiquetes: s.requiereTiquetes,
      montoViaticos: Number(s.montoViaticos || 0),
      montoGastosViaje: Number(s.montoGastosViaje || 0),
      diasComision: s.diasComision ?? 1,
      estadoSolicitud: s.estadoSolicitud,
      radicadoFueraJornada: s.radicadoFueraJornada,
      extemporanea: s.extemporanea,
      motivoDevolucion: s.motivoDevolucion,
      fechaRevision: s.fechaRevision?.toISOString() ?? null,
      creadoEn: s.creadoEn.toISOString(),
      actualizadoEn: s.actualizadoEn.toISOString(),
      creadoPorUsuarioId: s.creadoPorUsuarioId,
      analistaAsignadoId: s.analistaAsignadoId,
    }));

    return { data, total, page, limit };
  }

  async actualizarPrioridad(
    solicitudId: string,
    prioridad: string,
    usuarioId: string,
    isSuperAdmin = false,
  ): Promise<SolicitudComisionEntity> {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    if (
      !isSuperAdmin &&
      solicitud.estadoSolicitud !== EstadoSolicitud.SOLICITADO
    ) {
      throw new BadRequestException(
        `Solo se puede actualizar la prioridad de solicitudes en estado SOLICITADO. Estado actual: ${solicitud.estadoSolicitud}`,
      );
    }

    solicitud.prioridad = prioridad;
    if (!solicitud.fechaRevision) {
      solicitud.fechaRevision = new Date();
    }

    const saved = await this.solicitudRepo.save(solicitud);

    this.notificationClient
      .archiveNotificacionesPorSolicitud(solicitud.id)
      .catch((err) =>
        this.logger.warn(
          `[notify] No se pudieron archivar notificaciones para solicitud ${solicitud.id}: ${err?.message}`,
        ),
      );

    return saved;
  }

  async devolverSolicitud(
    solicitudId: string,
    motivo: string,
    usuarioId: string,
    isSuperAdmin = false,
  ): Promise<SolicitudComisionEntity> {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    if (
      !isSuperAdmin &&
      ![EstadoSolicitud.SOLICITADO, EstadoSolicitud.EXTEMPORANEA].includes(
        solicitud.estadoSolicitud,
      )
    ) {
      throw new BadRequestException(
        `Solo se pueden devolver solicitudes en estado SOLICITADO o EXTEMPORANEA. Estado actual: ${solicitud.estadoSolicitud}`,
      );
    }

    const estadoAnterior = solicitud.estadoSolicitud;

    await this.dataSource.transaction(async (manager) => {
      solicitud.estadoSolicitud = EstadoSolicitud.DEVUELTA;
      solicitud.motivoDevolucion = motivo;
      solicitud.fechaRevision = new Date();

      await manager.getRepository(SolicitudComisionEntity).save(solicitud);

      await manager.getRepository(SolicitudHistorialEstadoEntity).save({
        solicitudId: solicitud.id,
        estadoAnterior,
        estadoNuevo: EstadoSolicitud.DEVUELTA,
        usuarioId,
        comentarios: motivo,
      });
    });

    this.notificationClient
      .deleteNotificacionesPorSolicitud(solicitud.id)
      .catch((err) =>
        this.logger.warn(
          `[notify] No se pudieron eliminar notificaciones para solicitud ${solicitud.id}: ${err?.message}`,
        ),
      );

    if (solicitud.creadoPorUsuarioId) {
      this.notificationClient
        .send({
          id_usuario_destinatario: solicitud.creadoPorUsuarioId,
          tipo_notificacion: 'VIATICOS_DEVOLUCION',
          titulo: `Solicitud devuelta: ${solicitud.consecutivoUnico}`,
          mensaje: `Su solicitud ${solicitud.consecutivoUnico} fue devuelta por el Grupo de Viáticos. Motivo: ${motivo}`,
          descripcion_corta: `Devolución · ${solicitud.consecutivoUnico}`,
          icono: 'AlertTriangle',
          color: '#DC2626',
          prioridad: 'Alta',
          categoria: 'VIATICOS',
          tiene_accion: true,
          texto_boton_accion: 'Ver solicitud',
          url_accion: '/viaticos',
          datos_adicionales: {
            solicitudId: solicitud.id,
            consecutivoUnico: solicitud.consecutivoUnico,
          },
        })
        .catch((err) =>
          this.logger.warn(
            `[notify] No se pudo notificar devolución a usuario ${solicitud.creadoPorUsuarioId}: ${err?.message}`,
          ),
        );
    }

    return solicitud;
  }

  async consultarComisionado(documento: string): Promise<ComisionadoEntity> {
    const doc = (documento || '').trim();
    if (!doc) {
      throw new BadRequestException(
        'Debe proporcionar el número de documento del comisionado.',
      );
    }

    // 1) Búsqueda primaria: tabla local de comisionados (cache histórico).
    const existente = await this.comisionadoRepo.findOne({
      where: { numeroDocumento: doc },
    });
    if (existente) {
      return existente;
    }

    // 2) Búsqueda secundaria: auth.personas (origen único ESAP).
    //    Ambos microservicios comparten la misma base de datos
    //    (`esap_db`), por lo que se consulta directamente vía DataSource
    //    para evitar un round-trip HTTP y mantener la latencia baja.
    const persona: AuthPersonaRow | undefined = await this.dataSource
      .query(
        `SELECT
            p.num_identificacion,
            p.nom_tercero,
            p.pri_apellido,
            p.dir_email,
            p.tel_celular,
            p.id_dependencia
         FROM auth.personas p
         WHERE p.num_identificacion = $1
         LIMIT 1`,
        [doc],
      )
      .then((rows: any[]) => rows?.[0])
      .catch((err) => {
        console.error(
          '[travel-expenses] Error consultando auth.personas:',
          err,
        );
        return undefined;
      });

    if (!persona) {
      // 3) No existe ni en comisionados ni en auth.personas:
      //    bloqueamos el flujo porque no hay un funcionario válido
      //    para asociar a la solicitud de viáticos.
      throw new NotFoundException(
        `No se encontró un comisionado con documento ${doc} en ESAP. Verifique el número o contacte al administrador del módulo de autenticación.`,
      );
    }

    // 4) Persistimos la "foto" de la persona de ESAP en
    //    travel_expenses.comisionados para que las siguientes consultas
    //    queden cacheadas localmente. El origen queda marcado como 'ESAP'.
    const nombres = (persona.nom_tercero || '').trim().split(/\s+/);
    const apellidos = (persona.pri_apellido || '').trim().split(/\s+/);
    const primerNombre = nombres.shift() || persona.nom_tercero || 'SIN NOMBRE';
    const segundoNombre = nombres.join(' ') || null;
    const primerApellido =
      apellidos.shift() || persona.pri_apellido || 'SIN APELLIDO';
    const segundoApellido = apellidos.join(' ') || null;

    const idDependencia =
      persona.id_dependencia != null ? Number(persona.id_dependencia) : null;

    const nuevo = this.comisionadoRepo.create({
      numeroDocumento: doc,
      primerNombre,
      segundoNombre,
      primerApellido,
      segundoApellido,
      email: persona.dir_email || 'sin-correo@esap.edu.co',
      telefonoContacto: persona.tel_celular || '0000000000',
      tipoComisionado: 'FUNCIONARIO',
      origenDatos: 'ESAP',
      autorizacionHabeasData: false,
      idDependencia,
    } as Partial<ComisionadoEntity>);

    return this.comisionadoRepo.save(nuevo);
  }

  async obtenerSolicitudCompleta(
    solicitudId: string,
  ): Promise<
    SolicitudComisionEntity & {
      documentosSoporte: DocumentoSoporteEntity[];
      resumenPresupuestal?: {
        nombreDependencia?: string;
        totalGastado: number;
        cantidadSolicitudes: number;
        limitePresupuesto: number;
        presupuestoDisponible: number;
        porcentajeUso: number;
        semaforo: 'VERDE' | 'AMARILLO' | 'ROJO';
      };
      analistaVerificadorNombre?: string | null;
      revisorControlNombre?: string | null;
      fechaVerificacionPrimerNivel?: string | null;
      liquidacion?: any;
      validacionTiquete?: any;
    }
  > {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
      relations: ['comisionado'],
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    const documentos = await this.documentoRepo.find({
      where: { solicitudId: solicitud.id },
    });

    const idDependencia = solicitud.idDependencia ?? solicitud.comisionado?.idDependencia;
    const resumenPresupuestal =
      idDependencia != null
        ? await this.calcularResumenPresupuestalDependencia(idDependencia)
        : undefined;

    // Resolución del nombre del analista verificador de 1er nivel
    // mediante una consulta a auth.personas (origen único ESAP).
    let analistaVerificadorNombre: string | null = null;
    if (solicitud.analistaAsignadoId) {
      const rows: any[] = await this.dataSource.query(
        `SELECT p.nom_tercero, p.pri_apellido
         FROM auth."user" u
         LEFT JOIN auth.personas p ON p.id_person = u.id_person
         WHERE u.id_user = $1
         LIMIT 1`,
        [solicitud.analistaAsignadoId],
      );
      const row = rows?.[0];
      if (row) {
        analistaVerificadorNombre = [row.nom_tercero, row.pri_apellido]
          .filter(Boolean)
          .join(' ')
          .trim();
      }
    }

    // Resolución del nombre del revisor de control (quien realizó la devolución o revisión)
    let revisorControlNombre: string | null = null;
    if (solicitud.revisorControlId) {
      const rowsRev: any[] = await this.dataSource.query(
        `SELECT p.nom_tercero, p.pri_apellido
         FROM auth."user" u
         LEFT JOIN auth.personas p ON p.id_person = u.id_person
         WHERE u.id_user = $1
         LIMIT 1`,
        [solicitud.revisorControlId],
      );
      const rowRev = rowsRev?.[0];
      if (rowRev) {
        revisorControlNombre = [rowRev.nom_tercero, rowRev.pri_apellido]
          .filter(Boolean)
          .join(' ')
          .trim();
      }
    }

    // Cálculo dinámico de la autoliquidación para revisión de Control Viáticos
    let liquidacion: any = undefined;
    if (this.liquidationService) {
      try {
        const com = solicitud.comisionado;
        const tipoComRaw = (com?.tipoComisionado || 'FUNCIONARIO').toUpperCase();
        let tipoCom = TipoComisionadoLiquidacion.FUNCIONARIO;
        if (tipoComRaw === 'CONTRATISTA') tipoCom = TipoComisionadoLiquidacion.CONTRATISTA;
        else if (tipoComRaw === 'DOCENTE') tipoCom = TipoComisionadoLiquidacion.DOCENTE;
        else if (tipoComRaw === 'ESTUDIANTE') tipoCom = TipoComisionadoLiquidacion.ESTUDIANTE;
        else if (tipoComRaw === 'INVESTIGADOR') tipoCom = TipoComisionadoLiquidacion.INVESTIGADOR;

        const fechaIniStr =
          solicitud.fechaInicio instanceof Date
            ? solicitud.fechaInicio.toISOString().split('T')[0]
            : String(solicitud.fechaInicio || '').split('T')[0];
        const fechaFinStr =
          solicitud.fechaFin instanceof Date
            ? solicitud.fechaFin.toISOString().split('T')[0]
            : String(solicitud.fechaFin || '').split('T')[0];

        const salario = Number(
          solicitud.salarioBasico || (com as any)?.salarioBasico || 0,
        );

        if (fechaIniStr && fechaFinStr) {
          const res = await this.liquidationService.calcularLiquidacion({
            tipoComisionado: tipoCom,
            fechaInicio: fechaIniStr,
            fechaFin: fechaFinStr,
            pernocta:
              Number(solicitud.diasComision || 1) > 1 ||
              fechaIniStr !== fechaFinStr,
            destinoCiudad: solicitud.destinoCiudad,
            destinoDepartamento: solicitud.destinoDepartamento,
            asignacionesBasicas: salario > 0 ? [salario] : [0],
            categoriaInvestigador: CategoriaInvestigador.JUNIOR,
          });

          if (res) {
            liquidacion = res;
          }
        }
      } catch (err) {
        this.logger.warn(
          `[travel-expenses] No se pudo calcular autoliquidación para solicitud ${solicitud.id}: ${err?.message || err}`,
        );
      }
    }

    // Fallback: si la autoliquidación no arrojó desglose o no hubo servicio,
    // sintetizar los datos desde los montos ya registrados en la solicitud.
    if (!liquidacion && (Number(solicitud.montoViaticos || 0) > 0 || Number(solicitud.diasComision || 0) > 0)) {
      const totalViaticos = Number(solicitud.montoViaticos || 0);
      const dias = Number(solicitud.diasComision || 1);
      const salario = Number(solicitud.salarioBasico || 0);
      const tarifaDia = dias > 0 ? Math.round(totalViaticos / dias) : totalViaticos;
      liquidacion = {
        salarioBaseAplicado: salario,
        decretoAplicado: 'Decreto 314 de 2026',
        tarifaDiariaBase: tarifaDia,
        factorComisionado: 1,
        factorPernocta: dias > 1 ? 1 : 0.5,
        tarifaFinalAplicadaDia: tarifaDia,
        numeroDiasNoches: dias,
        valorTotalViaticos: totalViaticos,
        desgloseDias: [],
        alertas: [],
      };
    }

    let validacionTiquete: any = undefined;
    if (solicitud.requiereTiquetes && this.ticketsService) {
      try {
        const idDep = solicitud.idDependencia ?? solicitud.comisionado?.idDependencia ?? 1;
        const resTiquete = await this.ticketsService.validarTiquete({
          dependenciaId: String(idDep),
          origenCiudad: 'Bogotá',
          destinoCiudad: solicitud.destinoCiudad || 'Bogotá',
          tipoTransporte: 'AEREO',
          montoEstimadoTiquete: Number(solicitud.costoEstimadoTiquete || 0),
        });
        if (resTiquete) {
          validacionTiquete = resTiquete;
        }
      } catch (err) {
        this.logger.warn(
          `[travel-expenses] No se pudo validar tiquete para solicitud ${solicitud.id}: ${err?.message || err}`,
        );
      }
    }

    return {
      ...solicitud,
      documentosSoporte: documentos,
      resumenPresupuestal,
      analistaVerificadorNombre,
      revisorControlNombre,
      fechaVerificacionPrimerNivel:
        solicitud.fechaExportacionSiif?.toISOString() ?? null,
      liquidacion,
      validacionTiquete,
    };
  }

  async calcularResumenPresupuestalDependencia(
    idDependencia: number | string,
  ): Promise<{
    nombreDependencia?: string;
    totalGastado: number;
    cantidadSolicitudes: number;
    limitePresupuesto: number;
    presupuestoDisponible: number;
    porcentajeUso: number;
    semaforo: 'VERDE' | 'AMARILLO' | 'ROJO';
  }> {
    const depStr = String(idDependencia).trim();
    let codDependencia = depStr;
    let numIdDependencia: number | null = !isNaN(Number(depStr)) ? Number(depStr) : null;
    let nombreDependencia: string | undefined = undefined;

    // 1. Resolver código y nombre oficial de la dependencia en auth.dependencias
    try {
      const depRows: any[] = await this.dataSource.query(
        `SELECT id_dependencia, cod_dependencia, nom_dependencia 
         FROM auth.dependencias 
         WHERE id_dependencia::text = $1 OR cod_dependencia = $1 
         LIMIT 1`,
        [depStr],
      );
      if (depRows.length > 0) {
        codDependencia = depRows[0].cod_dependencia;
        numIdDependencia = Number(depRows[0].id_dependencia);
        nombreDependencia = depRows[0].nom_dependencia;
      }
    } catch (e) {
      this.logger.warn(
        `[calcularResumenPresupuestalDependencia] Error al consultar auth.dependencias para ${idDependencia}: ${e?.message}`,
      );
    }

    // 2. Consultar presupuesto parametrizado en travel_expenses.saldos_tiquetes
    let limitePresupuesto = Number(process.env.PRESUPUESTO_DEPENDENCIA_LIMITE || '10000000');
    try {
      const saldoRows: any[] = await this.dataSource.query(
        `SELECT id, dependencia_id, nombre_dependencia, presupuesto_inicial, presupuesto_disponible, presupuesto_reservado 
         FROM travel_expenses.saldos_tiquetes 
         WHERE activo = true 
           AND (dependencia_id = $1 OR dependencia_id = $2 OR dependencia_id = $3)
         ORDER BY actualizado_en DESC 
         LIMIT 1`,
        [depStr, codDependencia, numIdDependencia != null ? String(numIdDependencia) : depStr],
      );
      if (saldoRows.length > 0) {
        const saldoRow = saldoRows[0];
        if (saldoRow.presupuesto_inicial != null && Number(saldoRow.presupuesto_inicial) > 0) {
          limitePresupuesto = Number(saldoRow.presupuesto_inicial);
        }
        if (saldoRow.nombre_dependencia) {
          nombreDependencia = saldoRow.nombre_dependencia;
        }
      }
    } catch (e) {
      this.logger.warn(
        `[calcularResumenPresupuestalDependencia] Error al consultar travel_expenses.saldos_tiquetes para ${idDependencia}: ${e?.message}`,
      );
    }

    // 3. Consultar total ejecutado en solicitudes de comisión aprobadas/tramitadas
    const candidateIds = Array.from(
      new Set(
        [depStr, codDependencia, numIdDependencia != null ? String(numIdDependencia) : null].filter(
          Boolean,
        ),
      ),
    ) as string[];

    const ESTADOS_APROBADOS = [
      'APROBADO_JEFE',
      'APROBADO_TALENTO_HUMANO',
      'RESOLUCION_EMITIDA',
      'TIQUETES_COMPRADOS',
      'EN_COMISION',
      'PENDIENTE_LEGALIZACION',
      'LEGALIZADO',
      'SOLICITADA_SIIF',
    ];

    let result: { total: string; cantidad: string } | undefined;

    try {
      const qb = this.solicitudRepo
        .createQueryBuilder('s')
        .leftJoin('s.comisionado', 'c')
        .where('s.estado_solicitud IN (:...estados)', { estados: ESTADOS_APROBADOS });

      if (numIdDependencia != null) {
        qb.andWhere(
          '(s.id_dependencia = :numId OR (s.id_dependencia IS NULL AND c.id_dependencia = :numId))',
          { numId: numIdDependencia },
        );
      } else {
        qb.andWhere(
          '(s.id_dependencia::text IN (:...depIds) OR (s.id_dependencia IS NULL AND c.id_dependencia::text IN (:...depIds)))',
          { depIds: candidateIds },
        );
      }

      result = await qb
        .select('COALESCE(SUM(s.monto_viaticos + s.monto_gastos_viaje), 0)', 'total')
        .addSelect('COUNT(s.id)', 'cantidad')
        .getRawOne<{ total: string; cantidad: string }>();
    } catch (e) {
      this.logger.warn(
        `[calcularResumenPresupuestalDependencia] Error al agregar gasto de solicitudes: ${e?.message}`,
      );
    }

    const totalGastado = Number(result?.total || 0);
    const cantidadSolicitudes = Number(result?.cantidad || 0);
    const porcentajeUso =
      limitePresupuesto > 0
        ? Math.min(Math.round(((totalGastado / limitePresupuesto) * 100) * 100) / 100, 100)
        : 0;
    const presupuestoDisponible = Math.max(limitePresupuesto - totalGastado, 0);

    let semaforo: 'VERDE' | 'AMARILLO' | 'ROJO' = 'VERDE';
    if (porcentajeUso >= 80) {
      semaforo = 'ROJO';
    } else if (porcentajeUso >= 50) {
      semaforo = 'AMARILLO';
    }

    return {
      nombreDependencia,
      totalGastado,
      cantidadSolicitudes,
      limitePresupuesto,
      presupuestoDisponible,
      porcentajeUso,
      semaforo,
    };
  }

  async crearSolicitud(
    dto: CreateSolicitudDto,
  ): Promise<SolicitudComisionEntity> {
    const comisionado = await this.comisionadoRepo.findOne({
      where: { id: dto.comisionadoId },
    });

    if (!comisionado) {
      throw new BadRequestException('Comisionado no encontrado.');
    }

    if (!comisionado.autorizacionHabeasData && !dto.aceptaHabeasData) {
      throw new BadRequestException(
        'Debe aceptar el tratamiento de datos semiprivados (email y teléfono) según Ley 1581 de 2012 y Sentencia T-254 de 2024.',
      );
    }

    if (!comisionado.autorizacionHabeasData && dto.aceptaHabeasData) {
      comisionado.autorizacionHabeasData = true;
      comisionado.fechaAutorizacionHabeasData = new Date();
      comisionado.ipRegistroHabeasData =
        dto.ipRegistroHabeasData || getClientIp({ headers: {} } as any);
      await this.comisionadoRepo.save(comisionado);
    }

    const esBorrador = dto.modoBorrador === true;

    const datosFormulario: Record<string, any> = {
      objetoComision: dto.objetoComision,
      destinoCiudad: dto.destinoCiudad,
      destinoDepartamento: dto.destinoDepartamento,
      fechaInicio: dto.fechaInicio,
      fechaFin: dto.fechaFin,
      rubroPresupuestal: dto.rubroPresupuestal,
      prioridad: dto.prioridad,
      requiereTiquetes: dto.requiereTiquetes,
      montoViaticos: dto.montoViaticos,
      montoGastosViaje: dto.montoGastosViaje,
      diasComision: dto.diasComision,
    };

    const { camposFaltantes } = await this.validarCamposObligatorios(
      comisionado.tipoComisionado,
      datosFormulario,
    );

    if (camposFaltantes.length > 0) {
      throw new BadRequestException(
        `Faltan los siguientes campos obligatorios para el tipo de comisionado ${comisionado.tipoComisionado}: ${camposFaltantes.join(', ')}`,
      );
    }

    const config = await this.configService.obtenerConfiguracionPorTipo(
      comisionado.tipoComisionado,
    );
    const camposOcultos = new Set(config?.camposOcultos ?? []);
    const camposOpcionales = new Set(config?.camposOpcionales ?? []);

    const objetoSanitizado = sanitizeObjetoComision(dto.objetoComision ?? '');
    const objetoEsObligatorio =
      !camposOcultos.has('objetoComision') &&
      !camposOpcionales.has('objetoComision');
    if (objetoEsObligatorio && objetoSanitizado.length === 0) {
      throw new BadRequestException(
        'El objeto de la comisión debe contener al menos un carácter válido.',
      );
    }

    const fechaInicioStr = dto.fechaInicio as string;
    const fechaFinStr = dto.fechaFin as string;
    const fechaInicio = new Date(fechaInicioStr);
    const fechaFin = new Date(fechaFinStr);

    if (fechaFin < fechaInicio) {
      throw new BadRequestException(
        'La fecha fin no puede ser anterior a la fecha inicio.',
      );
    }

    const hoy = new Date();
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(
      hoy.getDate(),
    ).padStart(2, '0')}`;
    if (fechaInicioStr < hoyStr) {
      throw new BadRequestException(
        'La fecha de inicio no puede ser anterior a la fecha actual.',
      );
    }

    let extemporanea = false;
    let radicadoFueraJornada = false;
    let estadoSolicitud: EstadoSolicitud;

    if (!esBorrador) {
      const solapamiento = await this.solicitudRepo
        .createQueryBuilder('s')
        .where('s.comisionado_id = :comisionadoId', {
          comisionadoId: dto.comisionadoId,
        })
        .andWhere(
          `(s.fecha_inicio, s.fecha_fin) OVERLAPS (:fechaInicio, :fechaFin)`,
          { fechaInicio, fechaFin },
        )
        .getOne();

      if (solapamiento) {
        throw new ConflictException(
          this.mensajeConflictoFechas(solapamiento, fechaInicio, fechaFin),
        );
      }

      const ahora = new Date();
      const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
      const esFinDeSemana = ahora.getDay() === 0 || ahora.getDay() === 6;
      radicadoFueraJornada = horaActual >= 16 * 60 + 30 || esFinDeSemana;

      estadoSolicitud = EstadoSolicitud.RADICADA;
      extemporanea = false;
    } else {
      estadoSolicitud = EstadoSolicitud.PENDIENTE;
    }

    let consecutivoUnico = '';
    await this.dataSource.transaction(async (manager) => {
      const maxSolicitud = await manager
        .getRepository(SolicitudComisionEntity)
        .createQueryBuilder('s')
        .select('MAX(s.consecutivo_unico)', 'max')
        .where('s.consecutivo_unico LIKE :pattern', { pattern: 'COM-2026-%' })
        .getRawOne();

      let nextNumber = 1;
      if (maxSolicitud?.max) {
        const match = maxSolicitud.max.match(/COM-2026-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      consecutivoUnico = `COM-2026-${String(nextNumber).padStart(4, '0')}`;
    });

    const solicitud = this.solicitudRepo.create({
      consecutivoUnico,
      comisionadoId: dto.comisionadoId,
      idDependencia: dto.idDependencia ?? null,
      destinoCiudad: dto.destinoCiudad ?? '',
      destinoDepartamento: dto.destinoDepartamento ?? '',
      fechaInicio,
      fechaFin,
      objetoComision: objetoSanitizado,
      prioridad: dto.prioridad ?? 'BAJA',
      rubroPresupuestal: dto.rubroPresupuestal ?? '',
      requiereTiquetes: dto.requiereTiquetes ?? false,
      montoViaticos: dto.montoViaticos ?? 0,
      montoGastosViaje: dto.montoGastosViaje ?? 0,
      diasComision: dto.diasComision ?? 1,
      salarioBasico: dto.salarioBasico ?? 0,
      costoEstimadoTiquete: dto.costoEstimadoTiquete ?? 0,
      estadoSolicitud,
      radicadoFueraJornada,
      extemporanea,
      esInternacional: dto.esInternacional ?? false,
      tipoComision: dto.esInternacional
        ? 'INTERNACIONAL'
        : (dto.tipoComision ?? 'TERRESTRE'),
      creadoPorUsuarioId: dto.creadoPorUsuarioId,
    });

    const saved = await this.solicitudRepo.save(solicitud);

    if (dto.documentos && dto.documentos.length > 0) {
      const documentos = dto.documentos.map((doc) => {
        const entity = this.documentoRepo.create({
          solicitudId: saved.id,
          tipoDocumento: doc.tipoDocumento,
          nombreArchivoOriginal: doc.nombreArchivoOriginal,
          nombreArchivoSeguro: doc.nombreArchivoSeguro,
          urlRepositorio: doc.urlRepositorio,
          tipoMime: doc.tipoMime ?? 'application/pdf',
        });
        return entity;
      });

      await this.documentoRepo.save(documentos);
      saved.documentosSoporte = documentos;
    }

    const response: any = saved;
    if (radicadoFueraJornada) {
      response.warningMessage = 'El trámite iniciará el día hábil siguiente.';
    }

    return response;
  }

  /**
   * Actualiza los campos editables de una solicitud en estado PENDIENTE
   * (borrador). Permite corregir fechas, destino, montos, etc. y persistir los
   * cambios antes de radicar la solicitud.
   */
  async actualizarSolicitud(
    solicitudId: string,
    dto: UpdateSolicitudDto,
    isSuperAdmin = false,
  ): Promise<SolicitudComisionEntity> {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    if (
      !isSuperAdmin &&
      solicitud.estadoSolicitud !== EstadoSolicitud.PENDIENTE
    ) {
      throw new BadRequestException(
        `La solicitud tiene estado ${solicitud.estadoSolicitud} y no puede editarse.`,
      );
    }

    const fechaInicio = dto.fechaInicio
      ? new Date(dto.fechaInicio)
      : solicitud.fechaInicio;
    const fechaFin = dto.fechaFin ? new Date(dto.fechaFin) : solicitud.fechaFin;
    if (fechaFin < fechaInicio) {
      throw new BadRequestException(
        'La fecha fin no puede ser anterior a la fecha inicio.',
      );
    }

    if (dto.objetoComision !== undefined) {
      solicitud.objetoComision = sanitizeObjetoComision(
        dto.objetoComision ?? '',
      );
    }
    if (dto.destinoCiudad !== undefined) {
      solicitud.destinoCiudad = dto.destinoCiudad ?? '';
    }
    if (dto.destinoDepartamento !== undefined) {
      solicitud.destinoDepartamento = dto.destinoDepartamento ?? '';
    }
    if (dto.fechaInicio !== undefined) {
      solicitud.fechaInicio = new Date(dto.fechaInicio);
    }
    if (dto.fechaFin !== undefined) {
      solicitud.fechaFin = new Date(dto.fechaFin);
    }
    if (dto.rubroPresupuestal !== undefined) {
      solicitud.rubroPresupuestal = dto.rubroPresupuestal ?? '';
    }
    if (dto.prioridad !== undefined) {
      solicitud.prioridad = dto.prioridad ?? 'MEDIA';
    }
    if (dto.requiereTiquetes !== undefined) {
      solicitud.requiereTiquetes = dto.requiereTiquetes;
    }
    if (dto.montoViaticos !== undefined) {
      solicitud.montoViaticos = dto.montoViaticos;
    }
    if (dto.montoGastosViaje !== undefined) {
      solicitud.montoGastosViaje = dto.montoGastosViaje;
    }
    if (dto.diasComision !== undefined) {
      solicitud.diasComision = dto.diasComision;
    }
    if (dto.salarioBasico !== undefined) {
      solicitud.salarioBasico = dto.salarioBasico;
    }
    if (dto.costoEstimadoTiquete !== undefined) {
      solicitud.costoEstimadoTiquete = dto.costoEstimadoTiquete;
    }
    if (dto.tipoComision !== undefined) {
      solicitud.tipoComision = dto.tipoComision;
    }
    if (dto.esInternacional !== undefined) {
      solicitud.esInternacional = dto.esInternacional;
    }

    return this.solicitudRepo.save(solicitud);
  }

  async subirDocumento(
    solicitudId: string,
    dto: UploadDocumentoDto,
  ): Promise<DocumentoSoporteEntity> {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
    });

    if (!solicitud) {
      throw new BadRequestException('Solicitud no encontrada.');
    }

    this.verificarExpedienteModificable(
      solicitud,
      'subir documentos de soporte',
      dto?.isSuperAdmin ?? false,
    );

    const file = dto.file;
    const nombreArchivoOriginal =
      (file ? file.originalname : undefined) || dto.nombreArchivoOriginal;

    const tipoMime =
      dto.tipoMime ||
      (file ? file.mimetype : undefined) ||
      this.inferirTipoMime(nombreArchivoOriginal || '');

    if (!this.esTipoMimePdf(tipoMime)) {
      throw new BadRequestException(
        `El documento "${nombreArchivoOriginal || dto.tipoDocumento}" debe estar en formato PDF.`,
      );
    }

    const nombreArchivoSeguro =
      (file ? file.filename : undefined) || dto.nombreArchivoSeguro;
    const urlRepositorio = file
      ? `/uploads/${solicitudId}/${file.filename}`
      : dto.urlRepositorio;

    const entity = this.documentoRepo.create({
      solicitudId,
      tipoDocumento: dto.tipoDocumento,
      nombreArchivoOriginal,
      nombreArchivoSeguro: nombreArchivoSeguro,
      urlRepositorio,
      tipoMime,
    });

    return this.documentoRepo.save(entity);
  }

  /**
   * Elimina un documento de soporte: primero borra el registro de la BD y luego
   * elimina el archivo físico del storage (uploads/{solicitudId}/{nombreArchivoSeguro}).
   * Esto permite al usuario volver a cargar el documento (re-upload).
   */
  async eliminarDocumento(
    solicitudId: string,
    documentoId: string,
    isSuperAdmin = false,
  ): Promise<{ success: boolean; message: string }> {
    // RF-LIQ-004 — Inmutabilidad: bloquea la eliminación de soportes cuando el
    // expediente ya fue consolidado (modo solo lectura).
    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
    });
    if (solicitud) {
      this.verificarExpedienteModificable(
        solicitud,
        'eliminar documentos de soporte',
        isSuperAdmin,
      );
    }

    const documento = await this.documentoRepo.findOne({
      where: { id: documentoId, solicitudId },
    });

    if (!documento) {
      throw new NotFoundException('Documento de soporte no encontrado.');
    }

    await this.documentoRepo.delete(documentoId);

    const nombreArchivo = documento.nombreArchivoSeguro;
    if (nombreArchivo) {
      const rutaArchivo = join(getUploadRootDir(), solicitudId, nombreArchivo);
      try {
        if (existsSync(rutaArchivo)) {
          unlinkSync(rutaArchivo);
        }
      } catch (error) {
        console.warn(
          `[travel-expenses] No se pudo eliminar el archivo físico ${rutaArchivo}:`,
          error,
        );
      }
    }

    return {
      success: true,
      message: `Documento ${documento.tipoDocumento} eliminado correctamente.`,
    };
  }

  async obtenerChecklistDocumentos(tipoComisionado: string): Promise<{
    obligatorios: Array<{
      codigo: string;
      nombre: string;
      descripcion: string | null;
    }>;
    opcionales: Array<{
      codigo: string;
      nombre: string;
      descripcion: string | null;
    }>;
  }> {
    const config =
      await this.configService.obtenerConfiguracionPorTipo(tipoComisionado);
    if (!config || !config.documentos) {
      return { obligatorios: [], opcionales: [] };
    }

    const obligatorios = config.documentos
      .filter((d) => d.tipoRequisito === 'OBLIGATORIO')
      .map((d) => d.tipoDocumentoSoporte)
      .filter((d): d is NonNullable<typeof d> => Boolean(d))
      .map((d) => ({
        codigo: d.codigo,
        nombre: d.nombre,
        descripcion: d.descripcion,
      }));

    const opcionales = config.documentos
      .filter((d) => d.tipoRequisito === 'OPCIONAL')
      .map((d) => d.tipoDocumentoSoporte)
      .filter((d): d is NonNullable<typeof d> => Boolean(d))
      .map((d) => ({
        codigo: d.codigo,
        nombre: d.nombre,
        descripcion: d.descripcion,
      }));

    return { obligatorios, opcionales };
  }

  async finalizarSolicitud(
    solicitudId: string,
  ): Promise<SolicitudComisionEntity & { warningMessage?: string }> {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
      relations: ['comisionado'],
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    if (solicitud.estadoSolicitud !== EstadoSolicitud.PENDIENTE) {
      throw new BadRequestException(
        `La solicitud tiene estado ${solicitud.estadoSolicitud} y no puede finalizarse.`,
      );
    }

    const documentos = await this.documentoRepo.find({
      where: { solicitudId: solicitud.id },
    });

    const tipoChecklist = solicitud.esInternacional
      ? 'INTERNACIONAL'
      : solicitud.comisionado?.tipoComisionado;

    const { faltantes, noPdf } = await this.validarChecklistCompleto(
      tipoChecklist,
      documentos,
    );

    if (faltantes.length > 0) {
      throw new BadRequestException(
        `No se puede radicar la solicitud. Faltan por cargar los siguientes soportes obligatorios en PDF: ${faltantes.join(', ')}.`,
      );
    }

    if (noPdf.length > 0) {
      throw new BadRequestException(
        `Los siguientes soportes obligatorios deben estar en formato PDF: ${noPdf.join(', ')}.`,
      );
    }

    const fechaInicio = solicitud.fechaInicio;
    const fechaFin = solicitud.fechaFin;

    const solapamiento = await this.solicitudRepo
      .createQueryBuilder('s')
      .where('s.comisionado_id = :comisionadoId', {
        comisionadoId: solicitud.comisionadoId,
      })
      .andWhere('s.id <> :solicitudId', { solicitudId: solicitud.id })
      .andWhere(
        `(s.fecha_inicio, s.fecha_fin) OVERLAPS (:fechaInicio, :fechaFin)`,
        { fechaInicio, fechaFin },
      )
      .getOne();

    if (solapamiento) {
      throw new ConflictException(
        this.mensajeConflictoFechas(solapamiento, fechaInicio, fechaFin),
      );
    }

    const ahora = new Date();
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
    const esFinDeSemana = ahora.getDay() === 0 || ahora.getDay() === 6;
    const radicadoFueraJornada = horaActual >= 16 * 60 + 30 || esFinDeSemana;

    solicitud.estadoSolicitud = EstadoSolicitud.RADICADA;
    solicitud.extemporanea = false;
    solicitud.radicadoFueraJornada = radicadoFueraJornada;

    const saved = await this.solicitudRepo.save(solicitud);
    const response: any = {
      ...saved,
      documentosSoporte: documentos,
    };
    if (radicadoFueraJornada) {
      response.warningMessage = 'El trámite iniciará el día hábil siguiente.';
    }

    return response;
  }

  private inferirTipoMime(nombreArchivo: string): string {
    const extension = nombreArchivo.split('.').pop()?.toLowerCase() || '';
    if (extension === 'pdf') return 'application/pdf';
    return 'application/octet-stream';
  }

  private formatearFecha(fecha: Date): string {
    if (!fecha) return 'N/D';
    return new Date(fecha).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  /**
   * Mensaje de conflicto de fechas orientado al usuario: NO expone UUIDs ni
   * códigos internos; muestra el consecutivo real (p. ej. COM-2026-0001) y el
   * estado en lenguaje humano para mejorar la experiencia.
   */
  private mensajeConflictoFechas(
    solapada: SolicitudComisionEntity,
    fechaInicio: Date,
    fechaFin: Date,
  ): string {
    const referencia = solapada.consecutivoUnico || solapada.id;
    const estado = etiquetaEstadoHumana(solapada.estadoSolicitud);
    return (
      `Las fechas indicadas (${this.formatearFecha(fechaInicio)} a ${this.formatearFecha(fechaFin)}) ` +
      `se cruzan con la solicitud ${referencia} (${estado}, ${this.formatearFecha(solapada.fechaInicio)} a ${this.formatearFecha(solapada.fechaFin)}). ` +
      `Ajuste las fechas de esta comisión o cancele/radique la solicitud conflictiva antes de continuar.`
    );
  }

  private async validarChecklistCompleto(
    tipoComisionado: string,
    documentos: DocumentoSoporteEntity[],
  ): Promise<{ faltantes: string[]; noPdf: string[] }> {
    const config =
      await this.configService.obtenerConfiguracionPorTipo(tipoComisionado);
    if (!config || !config.documentos) {
      return { faltantes: [], noPdf: [] };
    }

    const obligatorios = config.documentos
      .filter((d) => d.tipoRequisito === 'OBLIGATORIO')
      .map((d) => d.tipoDocumentoSoporte?.codigo)
      .filter((codigo): codigo is string => Boolean(codigo));

    const tiposCargados = documentos.map((d) => d.tipoDocumento);
    const faltantes = obligatorios.filter(
      (req) => !tiposCargados.includes(req),
    );

    const documentosPorTipo = new Map<string, DocumentoSoporteEntity[]>();
    for (const doc of documentos) {
      const lista = documentosPorTipo.get(doc.tipoDocumento) || [];
      lista.push(doc);
      documentosPorTipo.set(doc.tipoDocumento, lista);
    }

    const noPdf: string[] = [];
    for (const codigo of obligatorios) {
      const docs = documentosPorTipo.get(codigo) || [];
      if (docs.some((d) => !this.esTipoMimePdf(d.tipoMime))) {
        noPdf.push(codigo);
      }
    }

    return { faltantes, noPdf };
  }

  private esTipoMimePdf(tipoMime: string): boolean {
    if (!tipoMime) return false;
    const mime = tipoMime.toLowerCase();
    return (
      mime === 'application/pdf' || mime === 'pdf' || mime.endsWith('/pdf')
    );
  }

  /**
   * RF-LIQ-004 — Verifica que el expediente NO esté en modo solo lectura.
   * Una vez consolidado (estado SOLICITADO o superior) ningún enlace puede
   * alterar los datos ni subir/eliminar archivos del expediente.
   *
   * @throws BadRequestException cuando el expediente está bloqueado.
   */
  private verificarExpedienteModificable(
    solicitud: SolicitudComisionEntity,
    accion: string,
    isSuperAdmin = false,
  ): void {
    if (isSuperAdmin) {
      return;
    }
    const estado = solicitud.estadoSolicitud;
    if (ESTADOS_SOLO_LECTURA.has(estado)) {
      throw new BadRequestException(
        `El expediente ${solicitud.consecutivoUnico ?? solicitud.id} tiene estado ${solicitud.estadoSolicitud} (solo lectura). No puede ${accion} en un expediente ya consolidado.`,
      );
    }
  }

  async obtenerParametrizacionFormulario(): Promise<{
    campos: any[];
    configuraciones: Record<string, ConfigTipoComisionadoEntity>;
  }> {
    const [campos, configs] = await Promise.all([
      this.configService.obtenerCamposFormulario(),
      this.configService.obtenerTodasConfiguraciones(),
    ]);

    const configuraciones: Record<string, ConfigTipoComisionadoEntity> = {};
    for (const config of configs) {
      configuraciones[config.tipoComisionado] = config;
    }

    return { campos, configuraciones };
  }

  async obtenerParametrizacionPorCodigoFormulario(
    codigoFormulario: string,
  ): Promise<ConfigTipoComisionadoEntity | null> {
    return this.configService.obtenerConfiguracionPorCodigoFormulario(
      codigoFormulario,
    );
  }

  async validarDocumentosRequeridos(
    tipoComisionado: string,
    tiposDocumentos: string[],
  ): Promise<{ faltantes: string[] }> {
    const config =
      await this.configService.obtenerConfiguracionPorTipo(tipoComisionado);
    if (!config) {
      return { faltantes: [] };
    }

    const codigosObligatorios = (config.documentos || [])
      .filter((d) => d.tipoRequisito === 'OBLIGATORIO')
      .map((d) => d.tipoDocumentoSoporte?.codigo)
      .filter((codigo): codigo is string => Boolean(codigo));

    const faltantes = codigosObligatorios.filter(
      (req) => !tiposDocumentos.includes(req),
    );

    return { faltantes };
  }

  async validarCamposObligatorios(
    tipoComisionado: string,
    datosFormulario: Record<string, any>,
  ): Promise<{ camposFaltantes: string[] }> {
    const config =
      await this.configService.obtenerConfiguracionPorTipo(tipoComisionado);
    if (!config) {
      return { camposFaltantes: [] };
    }

    const camposOpcionales = new Set(config.camposOpcionales ?? []);
    const camposOcultos = new Set(config.camposOcultos ?? []);

    const camposEfectivamenteObligatorios = config.camposObligatorios.filter(
      (campo) => !camposOpcionales.has(campo) && !camposOcultos.has(campo),
    );

    const camposFaltantes = camposEfectivamenteObligatorios.filter((campo) => {
      const valor = datosFormulario[campo];
      if (valor === undefined || valor === null || valor === '') {
        return true;
      }
      if (Array.isArray(valor) && valor.length === 0) {
        return true;
      }
      return false;
    });

    return { camposFaltantes };
  }

  async exportarFormato023(solicitudId: string, req?: any): Promise<Buffer> {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
      relations: ['comisionado', 'documentosSoporte'],
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    const comisionado = solicitud.comisionado;
    const PDFDocument = require('pdfkit');

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'letter' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const drawHeader = () => {
        doc.fontSize(10).font('Helvetica-Bold');
        doc.fillColor('#003DA5');
        doc.text('ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP', {
          align: 'center',
        });
        doc.fontSize(9).font('Helvetica');
        doc.fillColor('#333333');
        doc.text('Sede Nacional - Bogotá - Calle 44 No. 53-37 CAN', {
          align: 'center',
        });
        doc.text('PBX: +57 (1) 220 2790 · www.esap.edu.co', {
          align: 'center',
        });
        doc.moveDown(0.5);

        doc
          .strokeColor('#003DA5')
          .lineWidth(2)
          .moveTo(50, doc.y)
          .lineTo(562, doc.y)
          .stroke();
        doc.moveDown(1);
      };

      const drawTitle = () => {
        doc.fillColor('#003DA5').fontSize(14).font('Helvetica-Bold');
        doc.text('FORMATO 023 — SOLICITUD DE COMISIÓN DE VIÁTICOS', {
          align: 'center',
        });
        doc.fontSize(10).font('Helvetica');
        doc.fillColor('#666666');
        doc.text('Código: EM-FO-023 · Versión: 1 · Fecha: 01/Ene/2026', {
          align: 'center',
        });
        doc.moveDown(1);
      };

      const drawSectionTitle = (title: string) => {
        doc.moveDown(0.5);
        doc.fillColor('#003DA5').fontSize(11).font('Helvetica-Bold');
        doc.text(title);
        doc
          .strokeColor('#CCCCCC')
          .lineWidth(0.5)
          .moveTo(50, doc.y)
          .lineTo(562, doc.y)
          .stroke();
        doc.moveDown(0.5);
      };

      const drawField = (label: string, value: string) => {
        doc.fillColor('#333333').fontSize(9).font('Helvetica-Bold');
        doc.text(`${label}: `, { continued: true });
        doc.font('Helvetica').fillColor('#000000');
        doc.text(value || 'N/A');
      };

      const drawMultiLineField = (label: string, value: string) => {
        doc.fillColor('#333333').fontSize(9).font('Helvetica-Bold');
        doc.text(`${label}:`);
        doc.moveDown(0.3);
        doc.font('Helvetica').fillColor('#000000');
        doc.text(value || 'N/A', {
          width: 512,
          align: 'justify',
        });
        doc.moveDown(0.3);
      };

      const formatDate = (date: Date | string): string => {
        const d = new Date(date);
        return d.toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      };

      const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0,
        }).format(amount || 0);
      };

      const nombreCompleto = [
        comisionado?.primerNombre,
        comisionado?.segundoNombre,
        comisionado?.primerApellido,
        comisionado?.segundoApellido,
      ]
        .filter(Boolean)
        .join(' ');

      const tipoTransporte = solicitud.requiereTiquetes
        ? 'Aéreo / Terrestre'
        : 'Terrestre';
      const prioridad = solicitud.prioridad || 'MEDIA';
      const estado = solicitud.estadoSolicitud || 'RADICADA';

      drawHeader();
      drawTitle();

      drawSectionTitle('1. INFORMACIÓN DE LA SOLICITUD');
      drawField('No. Radicado', solicitud.consecutivoUnico);
      drawField('Fecha de Radicación', formatDate(solicitud.creadoEn));
      drawField('Estado de la Solicitud', estado);
      drawField('Prioridad', prioridad);
      drawField('Extemporánea', solicitud.extemporanea ? 'SÍ' : 'NO');
      drawField(
        'Radicado Fuera de Jornada',
        solicitud.radicadoFueraJornada ? 'SÍ' : 'NO',
      );
      doc.moveDown(0.3);

      drawSectionTitle('2. DATOS DEL COMISIONADO');
      drawField('Nombre Completo', nombreCompleto);
      drawField('No. Documento', comisionado?.numeroDocumento || 'N/A');
      drawField('Tipo de Comisionado', comisionado?.tipoComisionado || 'N/A');
      drawField('Correo Electrónico', comisionado?.email || 'N/A');
      drawField('Teléfono de Contacto', comisionado?.telefonoContacto || 'N/A');
      drawField('Origen de Datos', comisionado?.origenDatos || 'N/A');
      drawField(
        'Autorización Hábeas Data',
        comisionado?.autorizacionHabeasData ? 'SÍ' : 'NO',
      );
      doc.moveDown(0.3);

      drawSectionTitle('3. DATOS DE LA COMISIÓN');
      drawField('Ciudad Destino', solicitud.destinoCiudad);
      drawField('Departamento Destino', solicitud.destinoDepartamento);
      drawField('Fecha de Inicio', formatDate(solicitud.fechaInicio));
      drawField('Fecha de Finalización', formatDate(solicitud.fechaFin));
      drawField('Días de Comisión', String(solicitud.diasComision));
      drawField('Tipo de Transporte', tipoTransporte);
      drawField('Requiere Tiquetes', solicitud.requiereTiquetes ? 'SÍ' : 'NO');
      doc.moveDown(0.3);

      drawSectionTitle('4. OBJETO DE LA COMISIÓN');
      drawMultiLineField('Objeto / Justificación', solicitud.objetoComision);
      doc.moveDown(0.3);

      drawSectionTitle('5. INFORMACIÓN PRESUPUESTAL');
      drawField('Rubro Presupuestal', solicitud.rubroPresupuestal || 'N/A');
      drawField(
        'Monto Viáticos',
        formatCurrency(Number(solicitud.montoViaticos)),
      );
      drawField(
        'Monto Gastos de Viaje',
        formatCurrency(Number(solicitud.montoGastosViaje)),
      );
      drawField(
        'Monto Total',
        formatCurrency(
          Number(solicitud.montoViaticos) + Number(solicitud.montoGastosViaje),
        ),
      );
      doc.moveDown(0.3);

      drawSectionTitle('6. DOCUMENTOS DE SOPORTE');
      if (
        solicitud.documentosSoporte &&
        solicitud.documentosSoporte.length > 0
      ) {
        solicitud.documentosSoporte.forEach((documento, index) => {
          const fileUrl = documento.urlRepositorio?.startsWith('http')
            ? documento.urlRepositorio
            : `${req?.protocol || 'http'}://${req?.get('host') || 'localhost:3010'}${documento.urlRepositorio}`;
          const encodedUrl = encodeURI(fileUrl);
          const displayText = `  ${index + 1}. ${documento.tipoDocumento} — ${documento.nombreArchivoOriginal || 'N/A'} (Abrir)`;
          doc.font('Helvetica-Bold').fillColor('#003DA5');
          doc.text(displayText, { link: encodedUrl });
        });
      } else {
        doc.font('Helvetica').fillColor('#666666');
        doc.text('  No se han adjuntado documentos de soporte.');
      }
      doc.moveDown(0.5);

      drawSectionTitle('7. FIRMAS Y APROBACIONES');
      doc.moveDown(1);

      const firmaY = doc.y;
      doc.strokeColor('#333333').lineWidth(0.5);
      doc.moveTo(80, firmaY).lineTo(250, firmaY).stroke();
      doc.moveTo(350, firmaY).lineTo(520, firmaY).stroke();
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(8).fillColor('#333333');
      doc.text('Firma del Solicitante', 80, firmaY + 5);
      doc.text('Firma del Jefe Inmediato / Aprobación', 350, firmaY + 5);

      doc.moveDown(3);

      const fechaY = doc.y;
      doc.strokeColor('#333333').lineWidth(0.5);
      doc.moveTo(200, fechaY).lineTo(400, fechaY).stroke();
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(8).fillColor('#333333');
      doc.text('Firma Subdirector / Director', 220, fechaY + 5);

      doc.moveDown(3);

      doc.fontSize(8).font('Helvetica').fillColor('#999999');
      doc.text('─'.repeat(80), { align: 'center' });
      doc.moveDown(0.3);
      doc.text(
        `Documento generado automáticamente el ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO')}`,
        { align: 'center' },
      );
      doc.text(
        'Sistema Integrado de Gestión ESAP — Módulo de Viáticos y Comisiones',
        { align: 'center' },
      );

      doc.end();
    });
  }

  // ==========================================================================
  // Etapa 5 — Verificar y crear comision en SIIF Nacion
  // ==========================================================================

  /**
   * RF-REC-002 Etapa 5 — Obtiene las solicitudes asignadas al analista
   * autenticado. Para el rol ANALISTA incluye TODO el historial de asignaciones
   * (sin filtro de estado). Para SUPER_ADMIN aplica el filtro de estados activos.
   */
  async obtenerSolicitudesAsignadasAnalista(
    analistaId: string,
    rolesUsuario: string[] = [],
  ): Promise<SolicitudComisionEntity[]> {
    if (!analistaId) {
      throw new BadRequestException('analistaId es obligatorio.');
    }

    const esSuperAdmin = this.esSuperAdmin(rolesUsuario);

    const estadosActivosAnalista = [
      EstadoSolicitud.SOLICITADO,
      EstadoSolicitud.EN_VERIFICACION,
      EstadoSolicitud.VERIFICADA,
      EstadoSolicitud.DEVUELTA,
    ];

    const whereCondition: any = esSuperAdmin
      ? {
          estadoSolicitud: In(estadosActivosAnalista),
        }
      : {
          analistaAsignadoId: analistaId,
          estadoSolicitud: In(estadosActivosAnalista),
        };

    return this.solicitudRepo.find({
      where: whereCondition,
      order: { creadoEn: 'DESC' },
      relations: ['comisionado', 'revisorControl', 'documentosSoporte'],
    });
  }

  /**
   * RF-REC-002 Etapa 5 — Registra el checklist de verificacion del analista.
   * Valida Segregacion de Funciones y estado de la solicitud. Almacena el
   * resultado del checklist en el historial y actualiza el flag de consulta RUT.
   */
  async verificarAuditoria(
    solicitudId: string,
    usuarioId: string,
    rolesUsuario: string[],
    dto: VerifyAuditDto,
  ): Promise<SolicitudComisionEntity> {
    if (!solicitudId) {
      throw new BadRequestException('solicitudId es obligatorio.');
    }

    return this.dataSource.transaction(async (manager) => {
      const solicitud = await manager
        .getRepository(SolicitudComisionEntity)
        .createQueryBuilder('s')
        .setLock('pessimistic_write')
        .where('s.id = :id', { id: solicitudId })
        .getOne();

      if (!solicitud) {
        throw new NotFoundException('Solicitud no encontrada.');
      }

      this.validarSoD(solicitud, usuarioId, rolesUsuario);

      if (
        solicitud.estadoSolicitud !== EstadoSolicitud.SOLICITADO &&
        solicitud.estadoSolicitud !== EstadoSolicitud.EN_VERIFICACION
      ) {
        throw new BadRequestException(
          `Estado no valido para verificacion: ${solicitud.estadoSolicitud}. La solicitud debe estar SOLICITADO o EN_VERIFICACION.`,
        );
      }

      const comentarioChecklist = JSON.stringify({
        tipo: 'VERIFICACION_ANALISTA',
        seguridad_social_vigente: dto.seguridadSocialVigente ?? null,
        consulta_rut_facturador: dto.consultaRutFacturador ?? false,
      });

      await manager.getRepository(SolicitudHistorialEstadoEntity).save({
        solicitudId: solicitud.id,
        estadoAnterior: solicitud.estadoSolicitud,
        estadoNuevo: solicitud.estadoSolicitud,
        usuarioId: usuarioId,
        comentarios:
          comentarioChecklist.length > 255
            ? comentarioChecklist.slice(0, 252) + '...'
            : comentarioChecklist,
      });

      solicitud.consultaRutFacturador = dto.consultaRutFacturador ?? false;

      // Sincronizar la marca persistente de facturador electrónico en el comisionado contratista (RF-REV-003)
      if (solicitud.comisionadoId && dto.consultaRutFacturador !== undefined) {
        const comRepo = manager.getRepository(ComisionadoEntity);
        if (comRepo && typeof comRepo.findOne === 'function') {
          const comisionado = await comRepo.findOne({
            where: { id: solicitud.comisionadoId },
          });
          if (comisionado && (comisionado.tipoComisionado || '').toUpperCase() === 'CONTRATISTA') {
            comisionado.esFacturadorElectronico = Boolean(dto.consultaRutFacturador);
            if (typeof comRepo.save === 'function') {
              await comRepo.save(comisionado);
            }
          }
        }
      }

      const saved = await manager
        .getRepository(SolicitudComisionEntity)
        .save(solicitud);

      this.logger.log(
        `[etapa5] Verificacion registrada para solicitud ${solicitud.consecutivoUnico} por usuario ${usuarioId}`,
      );

      return saved;
    });
  }

  /**
   * RF-REC-002 Etapa 5 — Devuelve una solicitud asignada desde el analista.
   * Transiciona el estado a DEVUELTA y registra la novedad en el historial.
   */
  async devolverAnalista(
    solicitudId: string,
    usuarioId: string,
    rolesUsuario: string[],
    motivo: string,
  ): Promise<SolicitudComisionEntity> {
    if (!solicitudId) {
      throw new BadRequestException('solicitudId es obligatorio.');
    }
    if (!motivo || motivo.trim().length === 0) {
      throw new BadRequestException('El motivo de devolucion es obligatorio.');
    }

    return this.dataSource.transaction(async (manager) => {
      const solicitud = await manager
        .getRepository(SolicitudComisionEntity)
        .createQueryBuilder('s')
        .setLock('pessimistic_write')
        .where('s.id = :id', { id: solicitudId })
        .getOne();

      if (!solicitud) {
        throw new NotFoundException('Solicitud no encontrada.');
      }

      this.validarSoD(solicitud, usuarioId, rolesUsuario);

      if (
        solicitud.estadoSolicitud !== EstadoSolicitud.SOLICITADO &&
        solicitud.estadoSolicitud !== EstadoSolicitud.EN_VERIFICACION
      ) {
        throw new BadRequestException(
          `Estado no valido para devolucion: ${solicitud.estadoSolicitud}. La solicitud debe estar SOLICITADO o EN_VERIFICACION.`,
        );
      }

      const estadoAnterior = solicitud.estadoSolicitud;
      solicitud.estadoSolicitud = EstadoSolicitud.DEVUELTA;
      solicitud.motivoDevolucion = motivo.trim().slice(0, 1000);
      solicitud.siifExportado = false;

      const saved = await manager
        .getRepository(SolicitudComisionEntity)
        .save(solicitud);

      await manager.getRepository(SolicitudHistorialEstadoEntity).save({
        solicitudId: solicitud.id,
        estadoAnterior,
        estadoNuevo: EstadoSolicitud.DEVUELTA,
        usuarioId: usuarioId,
        comentarios: motivo.trim().slice(0, 255),
      });

      this.logger.log(
        `[etapa5] Solicitud ${solicitud.consecutivoUnico} devuelta por usuario ${usuarioId}. Motivo: ${motivo.trim().slice(0, 100)}`,
      );

      return saved;
    });
  }

  /**
   * RF-REC-002 Etapa 5 — Genera el CSV de exportacion SIIF y transiciona
   * la solicitud al estado SOLICITADA_SIIF.
   */
  async exportarSIIF(
    solicitudId: string,
    usuarioId: string,
    rolesUsuario: string[],
  ): Promise<{
    csvContent: string;
    fileName: string;
    solicitud: SolicitudComisionEntity;
  }> {
    if (!solicitudId) {
      throw new BadRequestException('solicitudId es obligatorio.');
    }

    return this.dataSource.transaction(async (manager) => {
      const solicitud = await manager
        .getRepository(SolicitudComisionEntity)
        .createQueryBuilder('s')
        .setLock('pessimistic_write')
        .where('s.id = :id', { id: solicitudId })
        .getOne();

      if (!solicitud) {
        throw new NotFoundException('Solicitud no encontrada.');
      }

      this.validarSoD(solicitud, usuarioId, rolesUsuario);

      const estadosPermitidos = [
        EstadoSolicitud.SOLICITADO,
        EstadoSolicitud.EN_VERIFICACION,
        EstadoSolicitud.VERIFICADA,
        EstadoSolicitud.SOLICITADA_SIIF,
      ];
      if (!estadosPermitidos.includes(solicitud.estadoSolicitud)) {
        throw new BadRequestException(
          `Estado no valido para exportacion SIIF: ${solicitud.estadoSolicitud}. La solicitud debe estar SOLICITADO, EN_VERIFICACION, VERIFICADA o SOLICITADA_SIIF.`,
        );
      }

      // No se restringe por solicitud.siifExportado: se permite la re-exportación sin límite
      // debido a devoluciones entre analista y control de viáticos, o descargas sucesivas.

      const comisionado = await manager
        .getRepository(ComisionadoEntity)
        .findOne({
          where: { id: solicitud.comisionadoId },
        });

      // RF-REV-003: Bloqueo de creación/exportación en SIIF para contratista facturador electrónico
      // sin soporte de Factura Electrónica adjunto.
      const esContratista =
        (comisionado?.tipoComisionado || '').toUpperCase() === 'CONTRATISTA';
      const esFacturador = Boolean(
        solicitud.consultaRutFacturador || comisionado?.esFacturadorElectronico,
      );

      if (esContratista && esFacturador) {
        const docsSoporte = await manager
          .getRepository(DocumentoSoporteEntity)
          .find({ where: { solicitudId: solicitud.id } });

        const tieneFactura = (docsSoporte || []).some((d) => {
          const tipo = (d.tipoDocumento || '').toUpperCase();
          const nom = (d.nombreArchivoOriginal || '').toLowerCase();
          return (
            tipo === 'FACTURA' ||
            tipo === 'FACTURA_ELECTRONICA' ||
            nom.includes('factura')
          );
        });

        if (!tieneFactura) {
          throw new BadRequestException(
            'Bloqueo SIIF: El comisionado es contratista facturador electrónico y no cuenta con la Factura Electrónica cargada en el expediente. Debe solicitarla o adjuntarla antes de continuar.',
          );
        }
      }

      const nombreComisionadoRaw = comisionado
        ? [
            comisionado.primerNombre,
            comisionado.segundoNombre,
            comisionado.primerApellido,
            comisionado.segundoApellido,
          ]
            .filter(Boolean)
            .join(' ')
            .trim()
        : '';

      const consecutivoLimpio = sanitizeTextoPlano(solicitud.consecutivoUnico || '', 50);
      const docLimpio = sanitizeDocumento(comisionado?.numeroDocumento || '');
      const nombreLimpio = sanitizeNombre(nombreComisionadoRaw);
      const tipoComisionadoLimpio = (comisionado?.tipoComisionado || 'FUNCIONARIO').toUpperCase().trim();
      const facturadorElecFlag = esFacturador ? 'SI' : 'NO';
      const depId = String(solicitud.idDependencia ?? comisionado?.idDependencia ?? '');
      const destinoCiudad = sanitizeTextoPlano(solicitud.destinoCiudad || '', 100).toUpperCase();
      const destinoDepto = sanitizeTextoPlano(solicitud.destinoDepartamento || '', 100).toUpperCase();
      const tipoComision = (solicitud.tipoComision || 'TERRESTRE').toUpperCase().trim();
      const fechaInicioStr = sanitizeFechaPlano(solicitud.fechaInicio);
      const fechaFinStr = sanitizeFechaPlano(solicitud.fechaFin);
      const diasComision = String(Math.max(1, Number(solicitud.diasComision || 1)));
      const rubroSanitizado = sanitizeTextoPlano(solicitud.rubroPresupuestal || '', 100);
      const montoViaticos = sanitizeMontoPlano(solicitud.montoViaticos);
      const montoGastosViaje = sanitizeMontoPlano(solicitud.montoGastosViaje);
      const valorNeto = sanitizeMontoPlano(
        Number(solicitud.montoViaticos || 0) + Number(solicitud.montoGastosViaje || 0),
      );
      const objetoSanitizado = sanitizeTextoPlano(solicitud.objetoComision || '', 250);
      const fechaExportacionStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

      const headers = [
        'Consecutivo',
        'Cedula',
        'Nombre',
        'TipoComisionado',
        'FacturadorElectronico',
        'IdDependencia',
        'DestinoCiudad',
        'DestinoDepartamento',
        'TipoComision',
        'FechaInicio',
        'FechaFin',
        'DiasComision',
        'RubroPresupuestal',
        'MontoViaticos',
        'MontoGastosViaje',
        'ValorNeto',
        'Objeto',
        'FechaExportacion',
      ];

      const row = [
        `"${consecutivoLimpio}"`,
        docLimpio,
        `"${nombreLimpio}"`,
        `"${tipoComisionadoLimpio}"`,
        `"${facturadorElecFlag}"`,
        depId,
        `"${destinoCiudad}"`,
        `"${destinoDepto}"`,
        `"${tipoComision}"`,
        fechaInicioStr,
        fechaFinStr,
        diasComision,
        `"${rubroSanitizado}"`,
        montoViaticos,
        montoGastosViaje,
        valorNeto,
        `"${objetoSanitizado}"`,
        `"${fechaExportacionStr}"`,
      ];

      // BOM UTF-8 (\uFEFF) para apertura nativa e inmediata en Excel sin errores de codificación
      const csvContent = '\uFEFF' + headers.join(';') + '\r\n' + row.join(';') + '\r\n';
      const fechaCorta = new Date().toISOString().slice(0, 10);
      const fileName = `SIIF_${solicitud.consecutivoUnico}_${fechaCorta}.csv`;

      const estadoAnterior = solicitud.estadoSolicitud;
      solicitud.siifExportado = true;
      solicitud.fechaExportacionSiif = new Date();
      solicitud.usuarioExportadorId = usuarioId;
      solicitud.estadoSolicitud = EstadoSolicitud.SOLICITADA_SIIF;

      const saved = await manager
        .getRepository(SolicitudComisionEntity)
        .save(solicitud);

      await manager.getRepository(SolicitudHistorialEstadoEntity).save({
        solicitudId: solicitud.id,
        estadoAnterior,
        estadoNuevo: EstadoSolicitud.SOLICITADA_SIIF,
        usuarioId: usuarioId,
        comentarios:
          estadoAnterior === EstadoSolicitud.SOLICITADA_SIIF
            ? 'Re-exportado a SIIF Nacion'
            : 'Exportado a SIIF Nacion',
      });

      this.logger.log(
        `[etapa5] Solicitud ${solicitud.consecutivoUnico} exportada a SIIF por usuario ${usuarioId}`,
      );

      return { csvContent, fileName, solicitud: saved };
    });
  }

  // ==========================================================================
  // Etapa 5 — RF-REV-002 Segunda Revisión (Revisor de Control)
  // ==========================================================================

   /**
    * RF-REV-002 — Obtiene el detalle completo de una solicitud para Control Viáticos.
    *
    * Devuelve la entidad base más:
    * - Documentos de soporte (PDFs).
    * - Resumen presupuestal de la dependencia.
    * - Trazabilidad de primer nivel: exportador SIIF, fecha de exportación
    *   y nombre del analista verificador (1er nivel).
    *
    * La liquidación calculada y la validación de tiquetes son opcionales:
    * el modal del frontend las muestra cuando existen, pero no falla si
    * no están disponibles en esta fase de integración.
    */
   async obtenerSolicitudControlViaticos(
     solicitudId: string,
   ): Promise<
     SolicitudComisionEntity & {
       documentosSoporte: DocumentoSoporteEntity[];
       resumenPresupuestal?: {
         totalGastado: number;
         cantidadSolicitudes: number;
         limitePresupuesto: number;
         porcentajeUso: number;
         semaforo: 'VERDE' | 'AMARILLO' | 'ROJO';
       };
       analistaVerificadorNombre?: string | null;
       fechaVerificacionPrimerNivel?: string | null;
       liquidacion?: any;
       validacionTiquete?: any;
     }
   > {
     const solicitud = await this.solicitudRepo.findOne({
       where: { id: solicitudId },
       relations: ['comisionado'],
     });

     if (!solicitud) {
       throw new NotFoundException('Solicitud no encontrada.');
     }

     const documentos = await this.documentoRepo.find({
       where: { solicitudId: solicitud.id },
     });

     const idDependencia = solicitud.idDependencia ?? solicitud.comisionado?.idDependencia;
     const resumenPresupuestal =
       idDependencia != null
         ? await this.calcularResumenPresupuestalDependencia(Number(idDependencia))
         : undefined;

     // Resolución del nombre del analista verificador de 1er nivel
     // mediante una consulta a auth.personas (origen único ESAP).
     let analistaVerificadorNombre: string | null = null;
     if (solicitud.analistaAsignadoId) {
       const rows: any[] = await this.dataSource.query(
         `SELECT p.nom_tercero, p.pri_apellido
          FROM auth."user" u
          LEFT JOIN auth.personas p ON p.id_person = u.id_person
          WHERE u.id_user = $1
          LIMIT 1`,
         [solicitud.analistaAsignadoId],
       );
       const row = rows?.[0];
       if (row) {
         analistaVerificadorNombre = [row.nom_tercero, row.pri_apellido]
           .filter(Boolean)
           .join(' ')
           .trim();
       }
     }

     // Cálculo de liquidación dinámico para Control Viáticos
     let liquidacion: any = null;
     if (this.liquidationService) {
       try {
         const fInicio =
           solicitud.fechaInicio instanceof Date
             ? solicitud.fechaInicio.toISOString().split('T')[0]
             : String(solicitud.fechaInicio).split('T')[0];
         const fFin =
           solicitud.fechaFin instanceof Date
             ? solicitud.fechaFin.toISOString().split('T')[0]
             : String(solicitud.fechaFin).split('T')[0];

         const pernocta =
           (solicitud as any).pernocta !== undefined
             ? Boolean((solicitud as any).pernocta)
             : fInicio !== fFin || (solicitud.diasComision ?? 1) > 1;

         const comisionadoTipo = (
           solicitud.comisionado?.tipoComisionado || 'FUNCIONARIO'
         ).toUpperCase() as TipoComisionadoLiquidacion;

         const asignaciones =
           solicitud.salarioBasico && Number(solicitud.salarioBasico) > 0
             ? [Number(solicitud.salarioBasico)]
             : undefined;

         const resLiq = await this.liquidationService.calcularLiquidacion({
           comisionadoId: solicitud.comisionadoId,
           tipoComisionado: comisionadoTipo,
           fechaInicio: fInicio,
           fechaFin: fFin,
           pernocta,
           destinoCiudad: solicitud.destinoCiudad,
           destinoDepartamento: solicitud.destinoDepartamento,
           asignacionesBasicas: asignaciones,
         });
         if (resLiq && resLiq.data) {
           liquidacion = resLiq.data;
         }
       } catch (err: any) {
         this.logger.warn(
           `[obtenerSolicitudControlViaticos] No se pudo calcular liquidacion con LiquidationService: ${err?.message}`,
         );
       }
     }

     // Fallback de liquidación: reconstrucción a partir de los datos registrados en la solicitud
     if (!liquidacion && (solicitud.montoViaticos != null || solicitud.salarioBasico != null)) {
       const dias = Number(solicitud.diasComision || 1);
       const montoViaticos = Number(solicitud.montoViaticos || 0);
       const tarifaDiaria = dias > 0 ? Math.round(montoViaticos / dias) : montoViaticos;
       liquidacion = {
         salarioBaseAplicado: Number(solicitud.salarioBasico || 0),
         decretoAplicado: 'Decreto 314 de 2026',
         tarifaDiariaBase: tarifaDiaria,
         factorComisionado: 1,
         factorPernocta: 1,
         tarifaFinalAplicadaDia: tarifaDiaria,
         numeroDiasNoches: dias,
         valorTotalViaticos: montoViaticos,
         desgloseCalculo: [],
         alertas: [],
       };
     }

     // Validación proactiva de tiquete aéreo si la solicitud lo requiere
     let validacionTiquete: any = null;
     if (solicitud.requiereTiquetes && this.ticketsService && idDependencia != null) {
       try {
         validacionTiquete = await this.ticketsService.validarTiquete({
           dependenciaId: String(idDependencia),
           montoEstimadoTiquete: Number(solicitud.costoEstimadoTiquete || 0),
           origenCiudad: 'Bogotá',
           destinoCiudad: solicitud.destinoCiudad || 'Bogotá',
           tipoTransporte: 'AEREO',
         });
       } catch (err: any) {
         this.logger.warn(
           `[obtenerSolicitudControlViaticos] No se pudo validar tiquete con TicketsService: ${err?.message}`,
         );
       }
     }

     return {
       ...solicitud,
       documentosSoporte: documentos,
       resumenPresupuestal,
       analistaVerificadorNombre,
       fechaVerificacionPrimerNivel:
         solicitud.fechaExportacionSiif?.toISOString() ?? null,
       liquidacion,
       validacionTiquete,
     };
   }

  /**
   * RF-REV-002 — Obtiene el listado de solicitudes en estado SOLICITADA_SIIF
   * para la bandeja de Control Viáticos.
   *
   * Incluye la trazabilidad de primer nivel: el nombre del analista verificador
   * (analistaAsignadoId) y la estampa de exportación a SIIF, resueltos mediante
   * una consulta batch a auth.personas para evitar N+1.
   */
  async obtenerSolicitudesSIIFRequested(
    page = 1,
    limit = 20,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const query = this.solicitudRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.comisionado', 'comisionado')
      .where('s.estado_solicitud = :estado', {
        estado: EstadoSolicitud.SOLICITADA_SIIF,
      })
      .orderBy('s.fechaExportacionSiif', 'ASC')
      .addOrderBy('s.creadoEn', 'ASC');

    const total = await query.getCount();
    const solicitudes = await query
      .offset((page - 1) * limit)
      .limit(limit)
      .getMany();

    // Resolución batch del nombre del analista verificador (1er nivel)
    // para evitar N+1 queries. Se consulta auth.personas a través de la
    // relación user → personas.
    const analistaIds = Array.from(
      new Set(solicitudes.map((s) => s.analistaAsignadoId).filter(Boolean)),
    );
    const analistaNombreMap: Record<string, string> = {};
    if (analistaIds.length > 0) {
      const placeholders = analistaIds.map((_, i) => `$${i + 1}`).join(', ');
      const rows: any[] = await this.dataSource.query(
        `SELECT u.id_user, p.nom_tercero, p.pri_apellido
         FROM auth."user" u
         LEFT JOIN auth.personas p ON p.id_person = u.id_person
         WHERE u.id_user IN (${placeholders})`,
        analistaIds,
      );
      for (const row of rows) {
        const nombre = [row.nom_tercero, row.pri_apellido]
          .filter(Boolean)
          .join(' ')
          .trim();
        if (nombre) {
          analistaNombreMap[row.id_user] = nombre;
        }
      }
    }

    const data = solicitudes.map((s) => ({
      id: s.id,
      consecutivoUnico: s.consecutivoUnico,
      comisionadoId: s.comisionadoId,
      comisionado: s.comisionado
        ? {
            id: s.comisionado.id,
            numeroDocumento: s.comisionado.numeroDocumento,
            primerNombre: s.comisionado.primerNombre,
            segundoNombre: s.comisionado.segundoNombre,
            primerApellido: s.comisionado.primerApellido,
            segundoApellido: s.comisionado.segundoApellido,
            tipoComisionado: s.comisionado.tipoComisionado,
            email: s.comisionado.email,
            telefonoContacto: s.comisionado.telefonoContacto,
            autorizacionHabeasData: s.comisionado.autorizacionHabeasData,
          }
        : null,
      destinoCiudad: s.destinoCiudad,
      destinoDepartamento: s.destinoDepartamento,
      fechaInicio: s.fechaInicio.toISOString(),
      fechaFin: s.fechaFin.toISOString(),
      objetoComision: s.objetoComision,
      prioridad: s.prioridad,
      rubroPresupuestal: s.rubroPresupuestal,
      requiereTiquetes: s.requiereTiquetes,
      montoViaticos: Number(s.montoViaticos || 0),
      montoGastosViaje: Number(s.montoGastosViaje || 0),
      diasComision: s.diasComision ?? 1,
      estadoSolicitud: s.estadoSolicitud,
      radicadoFueraJornada: s.radicadoFueraJornada,
      extemporanea: s.extemporanea,
      creadoEn: s.creadoEn.toISOString(),
      actualizadoEn: s.actualizadoEn.toISOString(),
      creadoPorUsuarioId: s.creadoPorUsuarioId,
      analistaAsignadoId: s.analistaAsignadoId,
      analistaVerificadorId: s.analistaAsignadoId,
      analistaVerificadorNombre:
        s.analistaAsignadoId && analistaNombreMap[s.analistaAsignadoId]
          ? analistaNombreMap[s.analistaAsignadoId]
          : null,
      usuarioExportadorId: s.usuarioExportadorId,
      fechaExportacionSiif: s.fechaExportacionSiif?.toISOString() ?? null,
      fechaVerificacionPrimerNivel:
        s.fechaExportacionSiif?.toISOString() ?? null,
    }));

    return { data, total, page, limit };
  }

  /**
   * RF-REV-002 — Valida Segregación de Funciones para segunda revisión.
   *
   * El revisor no puede ser:
   *   - el comisionado (comisionadoId)
   *   - el creador de la solicitud (creadoPorUsuarioId)
   *   - el analista que verificó (analistaAsignadoId)
   *   - el usuario que exportó a SIIF (usuarioExportadorId)
   *
   * SUPER_ADMIN tiene bypass operativo.
   */
  private validarSoDSegundaRevision(
    solicitud: SolicitudComisionEntity,
    usuarioId: string,
    rolesUsuario: string[],
  ): void {
    const superAdminRoles = [
      'ADMIN',
      'SUPER_ADMIN',
      'ADMINISTRATIVO',
      'SUPER_ADMINISTRADOR',
      'super_administrador',
      'SUPERUSER',
      'superuser',
    ];

    const esSuperAdmin = rolesUsuario.some((r: any) => {
      if (typeof r !== 'string') return false;
      const normalized = r.toUpperCase().replace(/\s+/g, '_');
      return (
        superAdminRoles.includes(normalized) ||
        superAdminRoles.includes(r.toUpperCase())
      );
    });

    if (esSuperAdmin) {
      return;
    }

    const participantesPrevios = [
      solicitud.comisionadoId,
      solicitud.creadoPorUsuarioId,
      solicitud.analistaAsignadoId,
      solicitud.usuarioExportadorId,
    ].filter((id): id is string => Boolean(id));

    if (participantesPrevios.includes(usuarioId)) {
      throw new ForbiddenException(
        'Violacion de Segregacion de Funciones: El revisor de segundo nivel debe ser diferente del comisionado, creador, analista verificador y exportador SIIF',
      );
    }
  }

  /**
   * RF-REV-002 — Registra la segunda revisión (verificación de segundo nivel).
   *
   * Transiciona el estado de SOLICITADA_SIIF a VERIFICADA.
    * Requiere observaciones obligatorias.
    * Valida SoD estricta contra comisionado, creador, analista y exportador.
   */
  async verificarSegundaRevision(
    solicitudId: string,
    usuarioId: string,
    rolesUsuario: string[],
    dto: SegundaRevisionObservacionesDto,
  ): Promise<SolicitudComisionEntity> {
    if (!solicitudId) {
      throw new BadRequestException('solicitudId es obligatorio.');
    }
    // Las observaciones son OPTIONALES en aprobación: el revisor puede
    // dejar una nota de auditoría sin que el flujo sea bloqueado. Solo se
    // exige texto no vacío en el caso de devolución.
    const observaciones = (dto?.observaciones || '').trim();

    return this.dataSource.transaction(async (manager) => {
      const solicitud = await manager
        .getRepository(SolicitudComisionEntity)
        .createQueryBuilder('s')
        .setLock('pessimistic_write')
        .where('s.id = :id', { id: solicitudId })
        .getOne();

      if (!solicitud) {
        throw new NotFoundException('Solicitud no encontrada.');
      }

      this.validarSoDSegundaRevision(solicitud, usuarioId, rolesUsuario);

      const estadosPermitidos = [EstadoSolicitud.SOLICITADA_SIIF];
      if (!estadosPermitidos.includes(solicitud.estadoSolicitud)) {
        throw new BadRequestException(
          `Estado no válido para segunda revisión: ${solicitud.estadoSolicitud}. La solicitud debe estar en SOLICITADA_SIIF.`,
        );
      }

      const estadoAnterior = solicitud.estadoSolicitud;
      solicitud.estadoSolicitud = EstadoSolicitud.VERIFICADA;
      solicitud.revisorControlId = usuarioId;
      solicitud.fechaSegundaRevision = new Date();
      solicitud.observacionesSegundaRevision = observaciones.slice(0, 2000);

      const saved = await manager
        .getRepository(SolicitudComisionEntity)
        .save(solicitud);

      await manager.getRepository(SolicitudHistorialEstadoEntity).save({
        solicitudId: solicitud.id,
        estadoAnterior,
        estadoNuevo: EstadoSolicitud.VERIFICADA,
        usuarioId: usuarioId,
        comentarios: `Segunda revisión: ${observaciones.slice(0, 255)}`,
      });

      this.logger.log(
        `[RF-REV-002] Solicitud ${solicitud.consecutivoUnico} verificada en segunda revisión por usuario ${usuarioId}`,
      );

      return saved;
    });
  }

  /**
   * RF-REV-002 — Devuelve la solicitud al analista desde la segunda revisión.
   *
   * Transiciona el estado de SOLICITADA_SIIF a EN_VERIFICACION.
   * Requiere observaciones obligatorias.
    * Valida SoD estricta contra comisionado, creador, analista y exportador.
   */
  async devolverAAnalistaDesdeSegundaRevision(
    solicitudId: string,
    usuarioId: string,
    rolesUsuario: string[],
    dto: SegundaRevisionObservacionesDto,
  ): Promise<SolicitudComisionEntity> {
    if (!solicitudId) {
      throw new BadRequestException('solicitudId es obligatorio.');
    }
    // Las observaciones son OBLIGATORIAS en devolución: se exige texto
    // no vacío con al menos 3 caracteres para evitar bodies vacíos.
    const observaciones = (dto?.observaciones || '').trim();
    if (observaciones.length < 3) {
      throw new BadRequestException(
        'Las observaciones de devolución son obligatorias (mínimo 3 caracteres).',
      );
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const solicitud = await manager
        .getRepository(SolicitudComisionEntity)
        .createQueryBuilder('s')
        .setLock('pessimistic_write')
        .where('s.id = :id', { id: solicitudId })
        .getOne();

      if (!solicitud) {
        throw new NotFoundException('Solicitud no encontrada.');
      }

      this.validarSoDSegundaRevision(solicitud, usuarioId, rolesUsuario);

      const estadosPermitidos = [EstadoSolicitud.SOLICITADA_SIIF];
      if (!estadosPermitidos.includes(solicitud.estadoSolicitud)) {
        throw new BadRequestException(
          `Estado no válido para devolución a analista: ${solicitud.estadoSolicitud}. La solicitud debe estar en SOLICITADA_SIIF.`,
        );
      }

      const estadoAnterior = solicitud.estadoSolicitud;
      solicitud.estadoSolicitud = EstadoSolicitud.EN_VERIFICACION;
      solicitud.revisorControlId = usuarioId;
      solicitud.fechaSegundaRevision = new Date();
      solicitud.observacionesSegundaRevision = observaciones.slice(0, 2000);
      solicitud.motivoDevolucion = observaciones.slice(0, 2000);
      solicitud.siifExportado = false;

      const saved = await manager
        .getRepository(SolicitudComisionEntity)
        .save(solicitud);

      await manager.getRepository(SolicitudHistorialEstadoEntity).save({
        solicitudId: solicitud.id,
        estadoAnterior,
        estadoNuevo: EstadoSolicitud.EN_VERIFICACION,
        usuarioId: usuarioId,
        comentarios: `Devuelta a analista desde segunda revisión: ${observaciones.slice(0, 255)}`,
      });

      this.logger.log(
        `[RF-REV-002] Solicitud ${solicitud.consecutivoUnico} devuelta a analista desde segunda revisión por usuario ${usuarioId}`,
      );

      return saved;
    });

    // 1. Notificación a la bandeja de notificaciones del sistema (in-app tray)
    const destinatarioId = result.analistaAsignadoId || result.creadoPorUsuarioId;
    if (destinatarioId) {
      this.notificationClient
        .send({
          id_usuario_destinatario: destinatarioId,
          tipo_notificacion: 'VIATICOS_DEVOLUCION_SEGUNDA_REVISION',
          titulo: `Comisión devuelta por Control Viáticos: ${result.consecutivoUnico}`,
          mensaje: `La comisión ${result.consecutivoUnico} fue devuelta en segunda revisión (Control Cruzado). Motivo: ${observaciones}`,
          descripcion_corta: `Devolución Control · ${result.consecutivoUnico}`,
          icono: 'AlertTriangle',
          color: '#DC2626',
          prioridad: 'Alta',
          categoria: 'VIATICOS',
          tiene_accion: true,
          texto_boton_accion: 'Revisar comisión',
          url_accion: '/viaticos',
          datos_adicionales: {
            solicitudId: result.id,
            consecutivoUnico: result.consecutivoUnico,
            motivoDevolucion: observaciones,
            revisorControlId: usuarioId,
          },
        })
        .catch((err) =>
          this.logger.warn(
            `[notify] Error enviando notificación in-app de devolución a ${destinatarioId}: ${err?.message}`,
          ),
        );
    }

    // 2. Notificación vía correo electrónico al analista asignado
    if (result.analistaAsignadoId) {
      void this.enviarCorreoDevolucionAnalista(result, observaciones, usuarioId);
    }

    return result;
  }

  /**
   * Envía un correo electrónico profesional al analista notificando la devolución
   * con las observaciones/hallazgos registrados por Control Viáticos.
   */
  private async enviarCorreoDevolucionAnalista(
    solicitud: SolicitudComisionEntity,
    observaciones: string,
    revisorId: string,
  ): Promise<void> {
    try {
      const rows: any[] = await this.dataSource.query(
        `SELECT u.id_user, u.username, p.dir_email, p.nom_tercero, p.pri_apellido
         FROM auth."user" u
         LEFT JOIN auth.personas p ON p.id_person = u.id_person
         WHERE u.id_user = $1
         LIMIT 1`,
        [solicitud.analistaAsignadoId],
      );
      const row = rows?.[0];
      const correoDestino =
        row?.dir_email ||
        (row?.username && row.username.includes('@') ? row.username : null);

      if (!correoDestino) {
        this.logger.warn(
          `[notify] No se encontró correo para el analista ${solicitud.analistaAsignadoId}`,
        );
        return;
      }

      const nombreAnalista = [row?.nom_tercero, row?.pri_apellido]
        .filter(Boolean)
        .join(' ')
        .trim() || 'Estimado(a) Analista';

      let nombreComisionado = '';
      if (solicitud.comisionado) {
        nombreComisionado = [
          solicitud.comisionado.primerNombre,
          solicitud.comisionado.primerApellido,
        ]
          .filter(Boolean)
          .join(' ');
      }

      const subject = `[Control Viáticos ESAP] Solicitud devuelta para subsanación: ${solicitud.consecutivoUnico}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #003DA5; color: #ffffff; padding: 20px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">ESAP — Módulo de Viáticos</h2>
            <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Notificación de Devolución en Segunda Revisión (Control Cruzado)</p>
          </div>
          <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
            <p>Apreciado(a) <strong>${nombreAnalista}</strong>,</p>
            <p>Le informamos que la comisión <strong>${solicitud.consecutivoUnico}</strong> que usted verificó previamente para exportación SIIF ha sido <strong>devuelta por Control Viáticos</strong> con el siguiente hallazgo:</p>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 14px 16px; border-radius: 6px; margin: 20px 0;">
              <strong style="color: #991b1b; display: block; margin-bottom: 6px; font-size: 13px;">MOTIVO DE LA DEVOLUCIÓN / HALLAZGO:</strong>
              <p style="margin: 0; color: #7f1d1d; font-size: 14px; white-space: pre-wrap;">${observaciones}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 40%;"><strong>Consecutivo:</strong></td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${solicitud.consecutivoUnico}</td>
              </tr>
              ${nombreComisionado ? `
              <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Comisionado:</strong></td>
                <td style="padding: 6px 0; color: #0f172a;">${nombreComisionado}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Destino:</strong></td>
                <td style="padding: 6px 0; color: #0f172a;">${solicitud.destinoCiudad}, ${solicitud.destinoDepartamento}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Nuevo Estado:</strong></td>
                <td style="padding: 6px 0; color: #d97706; font-weight: bold;">EN VERIFICACIÓN</td>
              </tr>
            </table>

            <p>Por favor ingrese al sistema para subsanar los soportes o la liquidación indicada y proceder con la nueva verificación.</p>

            <div style="margin-top: 25px; text-align: center;">
              <a href="${process.env.APP_BASE_URL || 'http://localhost:3000'}/viaticos" 
                 style="background-color: #003DA5; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block;">
                Ingresar a la Plataforma de Viáticos
              </a>
            </div>
          </div>
          <div style="background-color: #f8fafc; padding: 12px 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
            Este es un correo automático generado por el Sistema de Gestión de Viáticos y Comisiones de la ESAP. Por favor no responda a este mensaje.
          </div>
        </div>
      `;

      await this.notificationClient.sendEmail({
        to: correoDestino,
        subject,
        text: `Comisión ${solicitud.consecutivoUnico} devuelta por Control Viáticos. Motivo: ${observaciones}`,
        html,
      });

      this.logger.log(
        `[notify] Correo de devolución enviado al analista ${correoDestino} para solicitud ${solicitud.consecutivoUnico}`,
      );
    } catch (err: any) {
      this.logger.warn(
        `[notify] Error enviando correo de devolución al analista: ${err?.message}`,
      );
    }
  }

  /**
   * Valida Segregacion de Funciones (SoD): un comisionado o creador de
   * solicitud no puede auto-auditarse, excepto si tiene rol de super admin.
   */
  private validarSoD(
    solicitud: SolicitudComisionEntity,
    usuarioId: string,
    rolesUsuario: string[],
  ): void {
    const superAdminRoles = [
      'ADMIN',
      'SUPER_ADMIN',
      'ADMINISTRATIVO',
      'SUPER_ADMINISTRADOR',
      'super_administrador',
      'SUPERUSER',
      'superuser',
    ];

    const esSuperAdmin = rolesUsuario.some((r: any) => {
      if (typeof r !== 'string') return false;
      const normalized = r.toUpperCase().replace(/\s+/g, '_');
      return (
        superAdminRoles.includes(normalized) ||
        superAdminRoles.includes(r.toUpperCase())
      );
    });

    if (esSuperAdmin) {
      return;
    }

    if (
      solicitud.comisionadoId === usuarioId ||
      solicitud.creadoPorUsuarioId === usuarioId
    ) {
      throw new ForbiddenException(
        'Infraccion de Segregacion de Funciones: Un comisionado o creador de solicitud no puede auto-auditarse',
      );
    }
  }

  /**
   * RF-AUT-001 — Valida Segregación de Funciones (SoD) para Autorización Corporativa (Etapa 6).
   * Un comisionado (pasajero) o creador de la solicitud (enlace) no puede auto-autorizarse.
   * Super Admin conserva bypass operativo.
   */
  private validarSoDAutorizacion(
    solicitud: SolicitudComisionEntity,
    usuarioId: string,
    rolesUsuario: string[],
  ): void {
    if (this.esSuperAdmin(rolesUsuario)) {
      return;
    }

    if (
      solicitud.comisionadoId === usuarioId ||
      solicitud.creadoPorUsuarioId === usuarioId
    ) {
      throw new ForbiddenException(
        'Violación de Segregación de Funciones: El autorizador corporativo debe ser diferente del comisionado y del enlace solicitante',
      );
    }
  }

  /**
   * RF-AUT-001 — Obtener bandeja de comisiones para la Subdirección de Gestión Corporativa (Etapa 6).
   *
   * Criterio de aceptación 1 (Gherkin):
   *   Dada una comisión VERIFICADA, cuando llega a la Subdirección,
   *   entonces el sistema la deja en estado EN_AUTORIZACION en su bandeja.
   *
   * Al consultar la bandeja, cualquier comisión en VERIFICADA se transiciona
   * automáticamente a EN_AUTORIZACION, registrando el hito de trazabilidad.
   */
  async obtenerBandejaAutorizacion(
    page: number = 1,
    limit: number = 20,
    search?: string,
    estado?: string,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    // 1. Transición automática atómica de VERIFICADA -> EN_AUTORIZACION
    try {
      const verificadas = await this.solicitudRepo.find({
        where: { estadoSolicitud: EstadoSolicitud.VERIFICADA },
      });

      if (verificadas.length > 0) {
        await this.dataSource.transaction(async (manager) => {
          for (const sol of verificadas) {
            sol.estadoSolicitud = EstadoSolicitud.EN_AUTORIZACION;
            await manager.getRepository(SolicitudComisionEntity).save(sol);

            await manager.getRepository(SolicitudHistorialEstadoEntity).save({
              solicitudId: sol.id,
              estadoAnterior: EstadoSolicitud.VERIFICADA,
              estadoNuevo: EstadoSolicitud.EN_AUTORIZACION,
              usuarioId: sol.revisorControlId || sol.creadoPorUsuarioId,
              comentarios:
                'Llegada a la Subdirección de Gestión Corporativa para visto bueno de gasto e itinerario',
            });
          }
        });
        this.logger.log(
          `[RF-AUT-001] Se transicionaron ${verificadas.length} comisiones de VERIFICADA a EN_AUTORIZACION`,
        );
      }
    } catch (err: any) {
      this.logger.warn(
        `[RF-AUT-001] Error en transición automática de VERIFICADA a EN_AUTORIZACION: ${err?.message}`,
      );
    }

    // 2. Consulta de bandeja
    const qb = this.solicitudRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.comisionado', 'c')
      .leftJoinAndSelect('s.analistaAsignado', 'a')
      .leftJoinAndSelect('s.revisorControl', 'rc')
      .leftJoinAndSelect('s.autorizador', 'aut')
      .leftJoinAndSelect('s.documentosSoporte', 'docs');

    if (estado && Object.values(EstadoSolicitud).includes(estado as EstadoSolicitud)) {
      qb.where('s.estadoSolicitud = :estado', { estado });
    } else {
      qb.where('s.estadoSolicitud IN (:...estados)', {
        estados: [
          EstadoSolicitud.EN_AUTORIZACION,
          EstadoSolicitud.AUTORIZADA,
        ],
      });
    }

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(s.consecutivoUnico) LIKE :term OR LOWER(s.destinoCiudad) LIKE :term OR LOWER(c.primerNombre) LIKE :term OR LOWER(c.primerApellido) LIKE :term OR LOWER(c.numeroDocumento) LIKE :term)',
        { term },
      );
    }

    qb.orderBy(
      `CASE s.estado_solicitud
         WHEN 'EN_AUTORIZACION' THEN 1
         WHEN 'AUTORIZADA' THEN 2
         ELSE 3
       END`,
      'ASC',
    );
    qb.addOrderBy('s.actualizadoEn', 'DESC');

    const take = Math.max(1, Math.min(100, Number(limit) || 20));
    const skip = (Math.max(1, Number(page) || 1) - 1) * take;
    qb.offset(skip).limit(take);

    const [items, total] = await Promise.all([qb.getMany(), qb.getCount()]);

    return {
      data: items.map((s) => ({
        id: s.id,
        consecutivoUnico: s.consecutivoUnico,
        comisionado: s.comisionado
          ? {
              id: s.comisionado.id,
              numeroDocumento: s.comisionado.numeroDocumento,
              nombreCompleto: [
                s.comisionado.primerNombre,
                s.comisionado.segundoNombre,
                s.comisionado.primerApellido,
                s.comisionado.segundoApellido,
              ]
                .filter(Boolean)
                .join(' '),
              tipoComisionado: s.comisionado.tipoComisionado,
              idDependencia: s.comisionado.idDependencia,
              email: s.comisionado.email,
            }
          : null,
        destinoCiudad: s.destinoCiudad,
        destinoDepartamento: s.destinoDepartamento,
        fechaInicio: s.fechaInicio,
        fechaFin: s.fechaFin,
        diasComision: s.diasComision,
        objetoComision: s.objetoComision,
        prioridad: s.prioridad,
        rubroPresupuestal: s.rubroPresupuestal,
        requiereTiquetes: s.requiereTiquetes,
        costoEstimadoTiquete: s.costoEstimadoTiquete,
        montoViaticos: s.montoViaticos,
        montoGastosViaje: s.montoGastosViaje,
        montoTotal: Number(s.montoViaticos || 0) + Number(s.montoGastosViaje || 0),
        estadoSolicitud: s.estadoSolicitud,
        siifExportado: s.siifExportado,
        fechaExportacionSiif: s.fechaExportacionSiif,
        revisorControlId: s.revisorControlId,
        fechaSegundaRevision: s.fechaSegundaRevision,
        autorizadorId: s.autorizadorId,
        fechaAutorizacion: s.fechaAutorizacion,
        observacionesAutorizacion: s.observacionesAutorizacion,
        analistaAsignadoId: s.analistaAsignadoId,
        creadoPorUsuarioId: s.creadoPorUsuarioId,
        documentosSoporte: s.documentosSoporte || [],
        actualizadoEn: s.actualizadoEn,
      })),
      total,
      page: Number(page) || 1,
      limit: take,
    };
  }

  /**
   * RF-AUT-001 — Autorizar gasto e itinerario (Etapa 6).
   *
   * Transiciona la comisión de EN_AUTORIZACION (o VERIFICADA) a AUTORIZADA.
   * Registra autorizador_id, fecha_autorizacion y observaciones.
   * Emite notificaciones:
   *  1. Al responsable de tiquetes (in-app y rol).
   *  2. Al pasajero (comisionado) con PDF del itinerario/tiquete.
   *  3. Al enlace (creador) con confirmación y PDF.
   */
  async autorizarComision(
    solicitudId: string,
    usuarioId: string,
    rolesUsuario: string[],
    dto?: AutorizacionObservacionesDto,
  ): Promise<SolicitudComisionEntity> {
    if (!solicitudId) {
      throw new BadRequestException('solicitudId es obligatorio.');
    }

    const observaciones = (dto?.observaciones || '').trim();

    const result = await this.dataSource.transaction(async (manager) => {
      const solicitud = await manager
        .getRepository(SolicitudComisionEntity)
        .createQueryBuilder('s')
        .leftJoinAndSelect('s.comisionado', 'c')
        .setLock('pessimistic_write', undefined, ['s'])
        .where('s.id = :id', { id: solicitudId })
        .getOne();

      if (!solicitud) {
        throw new NotFoundException('Solicitud no encontrada.');
      }

      this.validarSoDAutorizacion(solicitud, usuarioId, rolesUsuario);

      const estadosPermitidos = [
        EstadoSolicitud.EN_AUTORIZACION,
      ];
      if (!estadosPermitidos.includes(solicitud.estadoSolicitud)) {
        throw new BadRequestException(
          `Estado no válido para autorización: ${solicitud.estadoSolicitud}. La comisión debe estar en EN_AUTORIZACION.`,
        );
      }

      const estadoAnterior = solicitud.estadoSolicitud;
      solicitud.estadoSolicitud = EstadoSolicitud.AUTORIZADA;
      solicitud.autorizadorId = usuarioId;
      solicitud.fechaAutorizacion = new Date();
      solicitud.observacionesAutorizacion = observaciones
        ? observaciones.slice(0, 2000)
        : null;

      const saved = await manager
        .getRepository(SolicitudComisionEntity)
        .save(solicitud);

      await manager.getRepository(SolicitudHistorialEstadoEntity).save({
        solicitudId: solicitud.id,
        estadoAnterior,
        estadoNuevo: EstadoSolicitud.AUTORIZADA,
        usuarioId,
        comentarios: `Autorización corporativa de gasto e itinerario: ${observaciones ? observaciones.slice(0, 255) : 'Visto bueno corporativo emitido'}`,
      });

      this.logger.log(
        `[RF-AUT-001] Solicitud ${solicitud.consecutivoUnico} AUTORIZADA por usuario ${usuarioId}`,
      );

      return saved;
    });

    // Despacho asíncrono de notificaciones multicanal
    void this.despacharNotificacionesAutorizacion(result, usuarioId);

    return result;
  }

  /**
   * RF-AUT-001 — Devolver comisión desde autorización con observaciones (Etapa 6).
   *
   * Transiciona la comisión de EN_AUTORIZACION a EN_VERIFICACION con observaciones obligatorias.
   */
  async devolverComisionAutorizacion(
    solicitudId: string,
    usuarioId: string,
    rolesUsuario: string[],
    dto: AutorizacionObservacionesDto | string,
  ): Promise<SolicitudComisionEntity> {
    if (!solicitudId) {
      throw new BadRequestException('solicitudId es obligatorio.');
    }

    const observaciones = (typeof dto === 'string' ? dto : dto?.observaciones || '').trim();
    if (observaciones.length < 3) {
      throw new BadRequestException(
        'Las observaciones de devolución son obligatorias (mínimo 3 caracteres).',
      );
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const solicitud = await manager
        .getRepository(SolicitudComisionEntity)
        .createQueryBuilder('s')
        .leftJoinAndSelect('s.comisionado', 'c')
        .setLock('pessimistic_write', undefined, ['s'])
        .where('s.id = :id', { id: solicitudId })
        .getOne();

      if (!solicitud) {
        throw new NotFoundException('Solicitud no encontrada.');
      }

      this.validarSoDAutorizacion(solicitud, usuarioId, rolesUsuario);

      const estadosPermitidos = [
        EstadoSolicitud.EN_AUTORIZACION,
        EstadoSolicitud.VERIFICADA,
      ];
      if (!estadosPermitidos.includes(solicitud.estadoSolicitud)) {
        throw new BadRequestException(
          `Estado no válido para devolución: ${solicitud.estadoSolicitud}. La comisión debe estar en EN_AUTORIZACION.`,
        );
      }

      const estadoAnterior = solicitud.estadoSolicitud;
      solicitud.estadoSolicitud = EstadoSolicitud.EN_VERIFICACION;
      solicitud.autorizadorId = usuarioId;
      solicitud.fechaAutorizacion = new Date();
      solicitud.observacionesAutorizacion = observaciones.slice(0, 2000);
      solicitud.motivoDevolucion = observaciones.slice(0, 2000);

      const saved = await manager
        .getRepository(SolicitudComisionEntity)
        .save(solicitud);

      await manager.getRepository(SolicitudHistorialEstadoEntity).save({
        solicitudId: solicitud.id,
        estadoAnterior,
        estadoNuevo: EstadoSolicitud.EN_VERIFICACION,
        usuarioId,
        comentarios: `Devuelta por Subdirección de Gestión Corporativa: ${observaciones.slice(0, 255)}`,
      });

      this.logger.log(
        `[RF-AUT-001] Solicitud ${solicitud.consecutivoUnico} devuelta por Subdirección por usuario ${usuarioId}`,
      );

      return saved;
    });

    // Notificaciones de devolución al analista y al enlace
    void this.despacharNotificacionesDevolucionAutorizacion(result, observaciones);

    return result;
  }

  /**
   * Despacha notificaciones al autorizar la comisión:
   * 1. Al responsable de tiquetes (in-app y por rol).
   * 2. Al pasajero/comisionado (in-app y correo electrónico con itinerario/tiquete).
   * 3. Al enlace/creador (in-app y correo electrónico con confirmación).
   */
  private async despacharNotificacionesAutorizacion(
    solicitud: SolicitudComisionEntity,
    autorizadorId: string,
  ): Promise<void> {
    try {
      const consecutivo = solicitud.consecutivoUnico;
      const destino = `${solicitud.destinoCiudad}, ${solicitud.destinoDepartamento}`;

      // 1. Notificación al Responsable de Tiquetes
      try {
        await this.notificationClient.notifyByRole('RESPONSABLE_TIQUETES', {
          tipo_notificacion: 'VIATICOS_COMISION_AUTORIZADA_TIQUETES',
          titulo: `Comisión autorizada para tiquetes: ${consecutivo}`,
          mensaje: `La comisión ${consecutivo} con destino a ${destino} fue AUTORIZADA corporativamente. Requiere tiquetes: ${solicitud.requiereTiquetes ? 'SÍ' : 'NO'}. Proceder con la emisión y reserva.`,
          descripcion_corta: `Autorizada · ${consecutivo}`,
          icono: 'Plane',
          color: '#0284C7',
          prioridad: 'Alta',
          categoria: 'VIATICOS',
          tiene_accion: true,
          texto_boton_accion: 'Gestionar tiquete',
          url_accion: '/viaticos',
          datos_adicionales: {
            solicitudId: solicitud.id,
            consecutivoUnico: consecutivo,
            requiereTiquetes: solicitud.requiereTiquetes,
            destinoCiudad: solicitud.destinoCiudad,
          },
        });
      } catch (err: any) {
        this.logger.warn(`[notify] Error notificando a RESPONSABLE_TIQUETES: ${err?.message}`);
      }

      // 2. Notificación al Comisionado (Pasajero)
      let correoPasajero = solicitud.comisionado?.email;
      let nombrePasajero = '';
      if (solicitud.comisionado) {
        nombrePasajero = [
          solicitud.comisionado.primerNombre,
          solicitud.comisionado.primerApellido,
        ]
          .filter(Boolean)
          .join(' ');
      }

      if (solicitud.comisionadoId) {
        try {
          await this.notificationClient.send({
            id_usuario_destinatario: solicitud.comisionadoId,
            tipo_notificacion: 'VIATICOS_COMISION_AUTORIZADA_PASAJERO',
            titulo: `¡Comisión autorizada!: ${consecutivo}`,
            mensaje: `Estimado(a) ${nombrePasajero || 'pasajero'}, su comisión de servicios hacia ${destino} ha sido AUTORIZADA por la Subdirección de Gestión Corporativa. Su itinerario y tiquete están confirmados.`,
            descripcion_corta: `Comisión autorizada · ${consecutivo}`,
            icono: 'CheckCircle2',
            color: '#10B981',
            prioridad: 'Alta',
            categoria: 'VIATICOS',
            tiene_accion: true,
            texto_boton_accion: 'Ver itinerario y tiquete',
            url_accion: '/viaticos',
            datos_adicionales: {
              solicitudId: solicitud.id,
              consecutivoUnico: consecutivo,
            },
          });
        } catch (err: any) {
          this.logger.warn(`[notify] In-app comisionado: ${err?.message}`);
        }
      }

      if (correoPasajero) {
        const subject = `[ESAP Viáticos] Comisión autorizada y confirmación de itinerario: ${consecutivo}`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #003DA5; color: #ffffff; padding: 20px; text-align: center;">
              <h2 style="margin: 0; font-size: 20px;">ESAP — Módulo de Viáticos</h2>
              <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Autorización Corporativa de Gasto e Itinerario de Viaje</p>
            </div>
            <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
              <p>Estimado(a) <strong>${nombrePasajero || 'Comisionado(a)'}</strong>,</p>
              <p>Nos complace informarle que la comisión de servicios <strong>${consecutivo}</strong> ha sido <strong>AUTORIZADA</strong> por la Subdirección de Gestión Corporativa.</p>
              
              <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 16px; border-radius: 6px; margin: 20px 0;">
                <strong style="color: #15803d; font-size: 14px;">ESTADO: COMISIÓN AUTORIZADA</strong>
                <p style="margin: 4px 0 0 0; color: #166534; font-size: 13px;">
                  Destino: <strong>${destino}</strong><br>
                  Fecha: Del <strong>${new Date(solicitud.fechaInicio).toLocaleDateString()}</strong> al <strong>${new Date(solicitud.fechaFin).toLocaleDateString()}</strong> (${solicitud.diasComision} día(s))<br>
                  Transporte: <strong>${solicitud.requiereTiquetes ? 'Aéreo con gestión de tiquetes' : 'Terrestre'}</strong>
                </p>
              </div>

              <p>Puede consultar y descargar su constancia de itinerario y tiquete en la plataforma institucional:</p>

              <div style="margin-top: 25px; text-align: center;">
                <a href="${process.env.APP_BASE_URL || 'http://localhost:3000'}/viaticos" 
                   style="background-color: #003DA5; color: #ffffff; text-decoration: none; padding: 10px 22px; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block;">
                  Acceder a la Plataforma de Viáticos
                </a>
              </div>
            </div>
            <div style="background-color: #f8fafc; padding: 12px 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
              Mensaje institucional generado automáticamente por la Escuela Superior de Administración Pública - ESAP.
            </div>
          </div>
        `;
        void this.notificationClient.sendEmail({
          to: correoPasajero,
          subject,
          text: `Comisión ${consecutivo} autorizada con éxito hacia ${destino}.`,
          html,
        });
      }

      // 3. Notificación al Enlace (Creador)
      if (solicitud.creadoPorUsuarioId && solicitud.creadoPorUsuarioId !== solicitud.comisionadoId) {
        try {
          await this.notificationClient.send({
            id_usuario_destinatario: solicitud.creadoPorUsuarioId,
            tipo_notificacion: 'VIATICOS_COMISION_AUTORIZADA_ENLACE',
            titulo: `Comisión autorizada por Subdirección: ${consecutivo}`,
            mensaje: `La solicitud de comisión ${consecutivo} para ${nombrePasajero || 'el pasajero'} fue autorizada por Subdirección de Gestión Corporativa.`,
            descripcion_corta: `Autorizada · ${consecutivo}`,
            icono: 'CheckCircle2',
            color: '#10B981',
            prioridad: 'Media',
            categoria: 'VIATICOS',
            tiene_accion: true,
            texto_boton_accion: 'Ver comisión',
            url_accion: '/viaticos',
            datos_adicionales: {
              solicitudId: solicitud.id,
              consecutivoUnico: consecutivo,
            },
          });
        } catch (err: any) {
          this.logger.warn(`[notify] In-app enlace: ${err?.message}`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`[notify] Error en despacharNotificacionesAutorizacion: ${err?.message}`);
    }
  }

  /**
   * Notifica la devolución efectuada por la Subdirección al analista y al enlace.
   */
  private async despacharNotificacionesDevolucionAutorizacion(
    solicitud: SolicitudComisionEntity,
    observaciones: string,
  ): Promise<void> {
    try {
      const destinatario = solicitud.analistaAsignadoId || solicitud.creadoPorUsuarioId;
      if (destinatario) {
        await this.notificationClient.send({
          id_usuario_destinatario: destinatario,
          tipo_notificacion: 'VIATICOS_DEVOLUCION_SUBDIRECCION',
          titulo: `Comisión devuelta por Subdirección: ${solicitud.consecutivoUnico}`,
          mensaje: `La Subdirección de Gestión Corporativa devolvió la comisión ${solicitud.consecutivoUnico}. Reparos: ${observaciones}`,
          descripcion_corta: `Devuelta Subdirección · ${solicitud.consecutivoUnico}`,
          icono: 'AlertTriangle',
          color: '#DC2626',
          prioridad: 'Alta',
          categoria: 'VIATICOS',
          tiene_accion: true,
          texto_boton_accion: 'Subsanar expediente',
          url_accion: '/viaticos',
          datos_adicionales: {
            solicitudId: solicitud.id,
            consecutivoUnico: solicitud.consecutivoUnico,
            observaciones,
          },
        });
      }
    } catch (err: any) {
      this.logger.warn(`[notify] Error enviando notificación de devolución: ${err?.message}`);
    }
  }

  /**
   * RF-AUT-001 — Genera el PDF oficial de Autorización Corporativa de Gasto e Itinerario.
   */
  async exportarPdfTiqueteItinerario(
    solicitudId: string,
    req?: any,
  ): Promise<Buffer> {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
      relations: [
        'comisionado',
        'analistaAsignado',
        'revisorControl',
        'autorizador',
        'documentosSoporte',
      ],
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    const comisionado = solicitud.comisionado;
    const PDFDocument = require('pdfkit');

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'letter' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const drawHeader = () => {
        doc.fontSize(10).font('Helvetica-Bold');
        doc.fillColor('#003DA5');
        doc.text('ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP', {
          align: 'center',
        });
        doc.fontSize(9).font('Helvetica');
        doc.fillColor('#333333');
        doc.text('Subdirección de Gestión Corporativa · Módulo de Viáticos', {
          align: 'center',
        });
        doc.text('PBX: +57 (1) 220 2790 · www.esap.edu.co', {
          align: 'center',
        });
        doc.moveDown(0.5);

        doc
          .strokeColor('#003DA5')
          .lineWidth(2)
          .moveTo(50, doc.y)
          .lineTo(562, doc.y)
          .stroke();
        doc.moveDown(0.8);
      };

      const drawSectionTitle = (title: string) => {
        doc.fontSize(11).font('Helvetica-Bold');
        doc.fillColor('#003DA5');
        doc.text(title);
        doc.moveDown(0.3);
      };

      const drawField = (label: string, value: string) => {
        doc.fontSize(9).font('Helvetica-Bold');
        doc.fillColor('#333333');
        doc.text(`${label}: `, { continued: true });
        doc.font('Helvetica');
        doc.fillColor('#555555');
        doc.text(value || 'N/A');
      };

      const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0,
        }).format(amount || 0);
      };

      const formatDate = (date: Date | string | null | undefined): string => {
        if (!date) return 'N/A';
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      };

      const nombreCompleto = [
        comisionado?.primerNombre,
        comisionado?.segundoNombre,
        comisionado?.primerApellido,
        comisionado?.segundoApellido,
      ]
        .filter(Boolean)
        .join(' ');

      drawHeader();

      doc.fontSize(14).font('Helvetica-Bold');
      doc.fillColor('#003DA5');
      doc.text('AUTORIZACIÓN CORPORATIVA DE GASTO E ITINERARIO DE VIAJE', {
        align: 'center',
      });
      doc.fontSize(10).font('Helvetica-Bold');
      doc.fillColor(
        solicitud.estadoSolicitud === EstadoSolicitud.AUTORIZADA
          ? '#15803D'
          : '#B45309',
      );
      doc.text(
        `ESTADO: ${solicitud.estadoSolicitud} — RADICADO: ${solicitud.consecutivoUnico}`,
        { align: 'center' },
      );
      doc.moveDown(0.8);

      drawSectionTitle('1. DATOS DEL PASAJERO / COMISIONADO');
      drawField('Nombre Completo', nombreCompleto || 'N/A');
      drawField('Documento de Identidad', comisionado?.numeroDocumento || 'N/A');
      drawField('Tipo de Comisionado', comisionado?.tipoComisionado || 'N/A');
      drawField('Dependencia', comisionado?.idDependencia ? `Dependencia ID: ${comisionado.idDependencia}` : 'N/A');
      drawField('Correo Electrónico', comisionado?.email || 'N/A');
      doc.moveDown(0.5);

      drawSectionTitle('2. ITINERARIO DE VIAJE AUTORIZADO');
      drawField('Ciudad Destino', `${solicitud.destinoCiudad}, ${solicitud.destinoDepartamento}`);
      drawField('Fecha de Inicio', formatDate(solicitud.fechaInicio));
      drawField('Fecha de Finalización', formatDate(solicitud.fechaFin));
      drawField('Duración de la Comisión', `${solicitud.diasComision} día(s)`);
      drawField('Modalidad de Transporte', solicitud.requiereTiquetes ? 'Aéreo / Terrestre' : 'Terrestre');
      drawField('Requiere Pasajes / Tiquetes', solicitud.requiereTiquetes ? 'SÍ' : 'NO');
      doc.moveDown(0.5);

      drawSectionTitle('3. LIQUIDACIÓN DEL GASTO AUTORIZADO');
      drawField('Rubro Presupuestal', solicitud.rubroPresupuestal || 'N/A');
      drawField('Monto Viáticos', formatCurrency(Number(solicitud.montoViaticos)));
      drawField('Monto Gastos de Viaje', formatCurrency(Number(solicitud.montoGastosViaje)));
      if (solicitud.requiereTiquetes) {
        drawField('Costo Estimado Tiquete', formatCurrency(Number(solicitud.costoEstimadoTiquete)));
      }
      drawField(
        'TOTAL GASTO AUTORIZADO',
        formatCurrency(Number(solicitud.montoViaticos) + Number(solicitud.montoGastosViaje)),
      );
      doc.moveDown(0.5);

      drawSectionTitle('4. TRAZABILIDAD Y VISTO BUENO CORPORATIVO');
      drawField('Fecha de Autorización', formatDate(solicitud.fechaAutorizacion));
      drawField(
        'Observaciones Corporativas',
        solicitud.observacionesAutorizacion || 'Aprobado sin observaciones adicionales.',
      );
      doc.moveDown(1.5);

      // Bloque de firmas
      const yFirmas = doc.y;
      doc
        .strokeColor('#94a3b8')
        .lineWidth(1)
        .moveTo(60, yFirmas)
        .lineTo(240, yFirmas)
        .stroke();
      doc
        .strokeColor('#94a3b8')
        .lineWidth(1)
        .moveTo(320, yFirmas)
        .lineTo(500, yFirmas)
        .stroke();

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#334155');
      doc.text('Subdirección de Gestión Corporativa', 60, yFirmas + 6, {
        width: 180,
        align: 'center',
      });
      doc.fontSize(7).font('Helvetica').fillColor('#64748b');
      doc.text('Autorización y Visto Bueno', 60, yFirmas + 18, {
        width: 180,
        align: 'center',
      });

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#334155');
      doc.text(nombreCompleto || 'Firma Comisionado', 320, yFirmas + 6, {
        width: 180,
        align: 'center',
      });
      doc.fontSize(7).font('Helvetica').fillColor('#64748b');
      doc.text('Comisionado / Pasajero', 320, yFirmas + 18, {
        width: 180,
        align: 'center',
      });

      doc.end();
    });
  }
}
