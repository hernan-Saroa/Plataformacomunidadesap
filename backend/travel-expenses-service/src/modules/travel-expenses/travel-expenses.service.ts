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
import { FestivoColombiaEntity } from '../../entities/festivo-colombia.entity';
import { ConfigTipoComisionadoEntity } from '../../entities/config/config-tipo-comisionado.entity';
import {
  EstadoSolicitud,
  ESTADOS_SOLO_LECTURA,
} from '../../entities/estado-solicitud.enum';
import { EventEmitter2 } from '@nestjs/event-emitter';

export const DIAS_HABILES_MINIMOS_AVANCE_DEFAULT = 5;
import { CreateSolicitudDto } from '../../dto/create-solicitud.dto';
import { UpdateSolicitudDto } from '../../dto/update-solicitud.dto';
import { UploadDocumentoDto } from '../../dto/upload-documento.dto';
import { VerifyAuditDto } from '../../dto/verify-audit.dto';
import { SegundaRevisionObservacionesDto } from '../../dto/segunda-revision-observaciones.dto';
import { AutorizacionObservacionesDto } from '../../dto/autorizacion-observaciones.dto';
import {
  AutorizacionExtemporaneaDto,
  RechazoExtemporaneaDto,
} from '../../dto/autorizacion-extemporanea.dto';
import { CancelarComisionDto } from '../../dto/cancelar-comision.dto';
import { EnviarPresupuestoDto } from '../../dto/enviar-presupuesto.dto';
import { ExpedirRpDto } from '../../dto/expedir-rp.dto';
import { IssueRpDto } from '../../dto/issue-rp.dto';
import { ItemCargaMasivaRpDto } from '../../dto/carga-masiva-rp.dto';
import { ItemBulkIssueRpDto, BulkIssueRpDto } from '../../dto/bulk-issue-rp.dto';
import { CrearObligacionDto } from '../../dto/crear-obligacion.dto';
import { ProcesarPagoDto } from '../../dto/procesar-pago.dto';

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
import {
  NotificationClientService,
  buildTravelExpenseEmailHtml,
} from '../../common/notification-client.service';
import {
  HumanResourcesClientService,
  HumanResourcesSuggestedPerson,
} from '../../common/human-resources-client.service';
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

function calcularDiasEntreFechas(fechaInicio: Date, fechaFin: Date): number {
  const diff = Math.round((fechaFin.getTime() - fechaInicio.getTime()) / 86_400_000);
  return diff <= 0 ? 1 : diff;
}

function formatoISO(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
    private readonly humanResourcesClient?: HumanResourcesClientService,
    @Optional()
    private readonly liquidationService?: LiquidationService,
    @Optional()
    private readonly ticketsService?: TicketsService,
    @Optional()
    private readonly eventEmitter?: EventEmitter2,
  ) {}

  private sincronizarItinerario(dto: {
    itinerario?: any[];
    fechaInicio?: string;
    fechaFin?: string;
    diasComision?: number;
    destinoCiudad?: string;
    destinoDepartamento?: string;
  }): {
    itinerario: any[];
    fechaInicio: string;
    fechaFin: string;
    diasComision: number;
    origenCiudad: string;
    destinoCiudad: string;
    destinoDepartamento: string;
  } {
    const rutas = Array.isArray(dto.itinerario) ? dto.itinerario : [];

    if (rutas.length === 0) {
      return {
        itinerario: [],
        fechaInicio: dto.fechaInicio || '',
        fechaFin: dto.fechaFin || '',
        diasComision: dto.diasComision ?? 1,
        origenCiudad: '',
        destinoCiudad: dto.destinoCiudad || '',
        destinoDepartamento: dto.destinoDepartamento || '',
      };
    }

    const fechasSalida = rutas
      .map((r) => new Date(r.fechaSalida))
      .filter((d) => !Number.isNaN(d.getTime()));
    const fechasLlegada = rutas
      .map((r) => new Date(r.fechaLlegada))
      .filter((d) => !Number.isNaN(d.getTime()));

    const fechaInicio = fechasSalida.length > 0
      ? new Date(Math.min(...fechasSalida.map((d) => d.getTime())))
      : new Date(dto.fechaInicio || new Date());
    const fechaFin = fechasLlegada.length > 0
      ? new Date(Math.max(...fechasLlegada.map((d) => d.getTime())))
      : new Date(dto.fechaFin || new Date());

    let diasComision = 0;
    for (const ruta of rutas) {
      if (ruta.diasRuta && Number.isFinite(ruta.diasRuta) && ruta.diasRuta > 0) {
        diasComision += ruta.diasRuta;
      }
    }
    if (diasComision === 0) {
      diasComision = calcularDiasEntreFechas(fechaInicio, fechaFin);
    }

    const primerTramo = rutas[0];
    const ultimoTramo = rutas[rutas.length - 1];

    return {
      itinerario: rutas,
      fechaInicio: formatoISO(fechaInicio),
      fechaFin: formatoISO(fechaFin),
      diasComision,
      origenCiudad: primerTramo.origenCiudad || '',
      destinoCiudad: ultimoTramo.destinoCiudad || dto.destinoCiudad || '',
      destinoDepartamento: ultimoTramo.destinoDepartamento || dto.destinoDepartamento || '',
    };
  }


  /**
   * Emite el evento asíncrono 'commission.disbursement_ready' para que el listener
   * de SST despache automáticamente la notificación formal de desplazamiento [RF-PAG-002].
   */
  private emitirDisbursementReady(solicitudId: string, estadoNuevo: string, usuarioId?: string) {
    if (this.eventEmitter) {
      try {
        this.eventEmitter.emit('commission.disbursement_ready', {
          solicitudId,
          estadoNuevo,
          usuarioId,
        });
      } catch (err: any) {
        this.logger.warn(
          `[RF-PAG-002] No se pudo emitir evento commission.disbursement_ready para ${solicitudId}: ${err?.message}`,
        );
      }
    }
  }

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

  private dependenciasMapCache: Map<string, string> = new Map();
  private dependenciasMapExpires = 0;

  async obtenerMapDependencias(): Promise<Map<string, string>> {
    const ahora = Date.now();
    if (this.dependenciasMapCache.size > 0 && ahora < this.dependenciasMapExpires) {
      return this.dependenciasMapCache;
    }
    try {
      const rows = await this.solicitudRepo.query(
        `SELECT id_dependencia, cod_dependencia, nom_dependencia FROM auth.dependencias WHERE activo = true OR estado = 'ACTIVO'`,
      );
      this.dependenciasMapCache.clear();
      for (const r of rows) {
        const nom = r.nom_dependencia || r.nombre || '';
        if (r.id_dependencia != null) this.dependenciasMapCache.set(String(r.id_dependencia), nom);
        if (r.cod_dependencia) this.dependenciasMapCache.set(String(r.cod_dependencia), nom);
      }
      this.dependenciasMapExpires = ahora + 60000;
    } catch (e: any) {
      this.logger.warn(`[obtenerMapDependencias] No se pudo consultar auth.dependencias: ${e?.message}`);
    }
    return this.dependenciasMapCache;
  }

  async obtenerSolicitudes(
    usuarioId?: string,
    isSuperAdmin = false,
    page = 1,
    limit = 20,
    isControlViaticos = false,
    isAnalista = false,
    isSecretario = false,
    isTesoreria = false,
    isSst = false,
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
      'isSecretario=',
      isSecretario,
      'isTesoreria=',
      isTesoreria,
      'isSst=',
      isSst,
      'page=',
      page,
      'limit=',
      limit,
    );
    const query = this.solicitudRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.comisionado', 'comisionado');

    if (!isSuperAdmin && !isSecretario) {
      if (isTesoreria) {
        query.andWhere('s.estado_solicitud IN (:...estadosTesoreria)', {
          estadosTesoreria: ['OBLIGADA', 'PAGADA'],
        });
      } else if (isSst) {
        query.andWhere('s.estado_solicitud IN (:...estadosSst)', {
          estadosSst: ['OBLIGADA', 'PAGADA'],
        });
      } else if (isControlViaticos) {
        query.andWhere('s.estado_solicitud IN (:...estadosControl)', {
          estadosControl: ['SOLICITADA_SIIF', 'VERIFICADA'],
        });
      } else if (isAnalista && usuarioId) {
        query.andWhere('s.analistaAsignadoId = :usuarioId', { usuarioId });
      } else if (usuarioId) {
        query.andWhere('s.creadoPorUsuarioId = :usuarioId', { usuarioId });
      }
    }

    // Orden por prioridad de estado: OBLIGADA primero (prioridad operativa Tesorería),
    // luego Solicitadas SIIF → Verificadas → Radicadas → Extemporáneas → Solicitadas →
    // Pendientes → Pagadas → resto.
    query
      .orderBy(
        `CASE s.estado_solicitud
           WHEN 'OBLIGADA' THEN 1
           WHEN 'SOLICITADA_SIIF' THEN 2
           WHEN 'VERIFICADA' THEN 3
           WHEN 'RADICADA' THEN 4
           WHEN 'EXTEMPORANEA' THEN 5
           WHEN 'SOLICITADO' THEN 6
           WHEN 'PENDIENTE' THEN 7
           WHEN 'PAGADA' THEN 8
           ELSE 9
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

    const depMap = await this.obtenerMapDependencias();
    const data = solicitudes.map((s) => {
      const idDep = s.idDependencia ?? s.comisionado?.idDependencia ?? null;
      const nomDep = idDep != null ? depMap.get(String(idDep)) : null;
      const depFinal = nomDep || (idDep != null ? `Dependencia #${idDep}` : 'Sede Central');
      return {
        id: s.id,
        consecutivoUnico: s.consecutivoUnico,
        comisionadoId: s.comisionadoId,
        idDependencia: idDep,
        dependencia: depFinal,
        nombreDependencia: depFinal,
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
              dependencia: depFinal,
            }
          : null,
      destinoCiudad: s.destinoCiudad,
      destinoDepartamento: s.destinoDepartamento,
      fechaInicio: s.fechaInicio instanceof Date ? s.fechaInicio.toISOString() : (s.fechaInicio || null),
      fechaFin: s.fechaFin instanceof Date ? s.fechaFin.toISOString() : (s.fechaFin || null),
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
      creadoEn: s.creadoEn instanceof Date ? s.creadoEn.toISOString() : (s.creadoEn || null),
      actualizadoEn: s.actualizadoEn instanceof Date ? s.actualizadoEn.toISOString() : (s.actualizadoEn || null),
      creadoPorUsuarioId: s.creadoPorUsuarioId,
      analistaAsignadoId: s.analistaAsignadoId,
      motivoDevolucion: s.motivoDevolucion || s.observacionesSegundaRevision || null,
      observacionesSegundaRevision: s.observacionesSegundaRevision || null,
      fechaSegundaRevision: s.fechaSegundaRevision?.toISOString() ?? null,
      revisorControlId: s.revisorControlId || null,
      // Etapa 7: Presupuesto & RP
      enviadoPresupuesto: Boolean((s as any).enviadoPresupuesto),
      fechaEnvioPresupuesto: (s as any).fechaEnvioPresupuesto?.toISOString?.() ?? (s as any).fechaEnvioPresupuesto ?? null,
      numeroRp: (s as any).numeroRp ?? null,
      fechaRp: (s as any).fechaRp?.toISOString?.() ?? (s as any).fechaRp ?? null,
      valorComprometido: (s as any).valorComprometido != null ? Number((s as any).valorComprometido) : null,
      rubroRp: (s as any).rubroRp ?? null,
      codigoRp: (s as any).codigoRp ?? null,
      fechaExpedicionRp: (s as any).fechaExpedicionRp?.toISOString?.() ?? (s as any).fechaExpedicionRp ?? null,
      // Etapa 7: Modalidad de Pago
      modalidadPago: (s as any).modalidadPago ?? null,
      diasHabilesPrevios: (s as any).diasHabilesPrevios != null ? Number((s as any).diasHabilesPrevios) : null,
      fechaCalculoModalidad: (s as any).fechaCalculoModalidad?.toISOString?.() ?? (s as any).fechaCalculoModalidad ?? null,
      // Etapa 8: Obligación SIIF
      numeroObligacion: (s as any).numeroObligacion ?? null,
      fechaObligacion: (s as any).fechaObligacion?.toISOString?.() ?? (s as any).fechaObligacion ?? null,
      valorObligacion: (s as any).valorObligacion != null ? Number((s as any).valorObligacion) : null,
      // Etapa 8: Pago & Desembolso Tesorería
      numeroOrdenPago: (s as any).numeroOrdenPago ?? null,
      fechaPago: (s as any).fechaPago ? (s.fechaPago instanceof Date ? s.fechaPago.toISOString().split('T')[0] : String(s.fechaPago)) : null,
      valorPagado: (s as any).valorPagado != null ? Number((s as any).valorPagado) : null,
      soportePagoPath: (s as any).soportePagoPath ?? null,
      observacionesPago: (s as any).observacionesPago ?? null,
      pagadoPorId: (s as any).pagadoPorId ?? null,
      fechaRegistroPago: (s as any).fechaRegistroPago?.toISOString?.() ?? (s as any).fechaRegistroPago ?? null,
      camposAdicionales: (s as any).camposAdicionales ?? {},
      esCreadoPorMi: isSuperAdmin
        ? s.creadoPorUsuarioId === usuarioId
        : undefined,
    };
    });

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

    const depMap = await this.obtenerMapDependencias();
    const data = solicitudes.map((s) => {
      const idDep = s.idDependencia ?? s.comisionado?.idDependencia ?? null;
      const nomDep = idDep != null ? depMap.get(String(idDep)) : null;
      const depFinal = nomDep || (idDep != null ? `Dependencia #${idDep}` : 'Sede Central');
      return {
        id: s.id,
        consecutivoUnico: s.consecutivoUnico,
        comisionadoId: s.comisionadoId,
        idDependencia: idDep,
        dependencia: depFinal,
        nombreDependencia: depFinal,
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
              dependencia: depFinal,
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
      camposAdicionales: (s as any).camposAdicionales ?? {},
      };
    });

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

    const ESTADOS_PERMITIDOS_PRIORIDAD = [
      EstadoSolicitud.SOLICITADO,
      EstadoSolicitud.EXTEMPORANEA,
    ];

    if (
      !isSuperAdmin &&
      !ESTADOS_PERMITIDOS_PRIORIDAD.includes(solicitud.estadoSolicitud)
    ) {
      throw new BadRequestException(
        `Solo se puede actualizar la prioridad de solicitudes en estado SOLICITADO o EXTEMPORANEA. Estado actual: ${solicitud.estadoSolicitud}`,
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
      const consecutivo = solicitud.consecutivoUnico || solicitud.id;
      const destino = `${solicitud.destinoCiudad || ''}${solicitud.destinoDepartamento ? ` (${solicitud.destinoDepartamento})` : ''}`.trim();
      const fechaIni = solicitud.fechaInicio ? new Date(solicitud.fechaInicio).toISOString().split('T')[0] : '';
      const fechaFn = solicitud.fechaFin ? new Date(solicitud.fechaFin).toISOString().split('T')[0] : '';
      const fechasStr = fechaIni && fechaFn ? `${fechaIni} al ${fechaFn}` : fechaIni || fechaFn || 'Por definir';

      void this.notificationClient
        .notifyUser(
          solicitud.creadoPorUsuarioId,
          {
            tipo_notificacion: 'VIATICOS_DEVOLUCION',
            titulo: `Solicitud devuelta: ${consecutivo}`,
            mensaje: `Su solicitud ${consecutivo} fue devuelta por el Grupo de Viáticos. Motivo: ${motivo}`,
            descripcion_corta: `Devolución · ${consecutivo}`,
            icono: 'AlertTriangle',
            color: '#DC2626',
            prioridad: 'Alta',
            categoria: 'VIATICOS',
            tiene_accion: true,
            texto_boton_accion: 'Ver solicitud',
            url_accion: '/viaticos',
            datos_adicionales: {
              solicitudId: solicitud.id,
              consecutivoUnico: consecutivo,
              motivo,
            },
          },
          {
            subject: `[Viáticos ESAP] Solicitud Devuelta para Corrección: ${consecutivo}`,
            html: buildTravelExpenseEmailHtml({
              destinatarioNombre: 'Enlace de Dependencia',
              tituloHeader: 'ESAP — Grupo de Viáticos',
              subtituloHeader: 'Notificación de Devolución de Expediente',
              mensajePrincipal: `Le informamos que la solicitud de comisión <strong>${consecutivo}</strong> ha sido devuelta por la Secretaría del Grupo de Viáticos para la subsanación de inconsistencias o documentos faltantes:`,
              consecutivo,
              destino,
              fechas: fechasStr,
              nuevoEstado: 'DEVUELTA',
              motivoUObservaciones: motivo,
              tipoNovedad: 'DANGER',
              textoBoton: 'Subsanar Solicitud',
            }),
            text: `Su solicitud ${consecutivo} fue devuelta por el Grupo de Viáticos. Motivo: ${motivo}`,
          },
        )
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

    // 2) Búsqueda secundaria: Talento Humano / Nómina (Oracle FNC - VW_INTEGRACIONFNC).
    //    Se consulta vía certification-service (fuente oficial en línea de talento humano).
    if (this.humanResourcesClient) {
      try {
        const funcionarioFnc =
          await this.humanResourcesClient.consultarFuncionarioPorDocumento(doc);

        if (funcionarioFnc && funcionarioFnc.id_number) {
          const rawName = (funcionarioFnc.full_name || '').trim();
          const partes = rawName.split(/\s+/).filter(Boolean);
          let primerNombre = 'SIN NOMBRE';
          let segundoNombre: string | null = null;
          let primerApellido = 'SIN APELLIDO';
          let segundoApellido: string | null = null;

          if (partes.length === 1) {
            primerNombre = partes[0];
          } else if (partes.length === 2) {
            primerNombre = partes[0];
            primerApellido = partes[1];
          } else if (partes.length === 3) {
            primerNombre = partes[0];
            primerApellido = partes[1];
            segundoApellido = partes[2];
          } else if (partes.length >= 4) {
            primerNombre = partes[0];
            segundoNombre = partes[1];
            primerApellido = partes[2];
            segundoApellido = partes.slice(3).join(' ');
          }

          // Resolver ID de dependencia en auth.dependencias si el nombre de dependencia viene informado
          let idDependenciaFnc: number | null = null;
          const depNombre = (
            funcionarioFnc.organization_department ||
            funcionarioFnc.cost_center ||
            ''
          ).trim();
          if (depNombre) {
            try {
              const depMatch = await this.dataSource.query(
                `SELECT id_dependencia
                   FROM auth.dependencias
                  WHERE UPPER(nom_dependencia) = UPPER($1)
                     OR UPPER(cod_dependencia) = UPPER($1)
                  LIMIT 1`,
                [depNombre],
              );
              if (depMatch?.[0]?.id_dependencia != null) {
                idDependenciaFnc = Number(depMatch[0].id_dependencia);
              }
            } catch (err: any) {
              this.logger.debug?.(
                `[consultarComisionado] No se pudo mapear id_dependencia para ${depNombre}: ${err?.message}`,
              );
            }
          }

          const nuevoDesdeFnc = this.comisionadoRepo.create({
            numeroDocumento: doc,
            primerNombre,
            segundoNombre,
            primerApellido,
            segundoApellido,
            email:
              funcionarioFnc.email ||
              funcionarioFnc.personal_email ||
              'sin-correo@esap.edu.co',
            telefonoContacto: funcionarioFnc.phone || '0000000000',
            tipoComisionado: 'FUNCIONARIO',
            origenDatos: 'HUMANO',
            autorizacionHabeasData: false,
            idDependencia: idDependenciaFnc,
          } as Partial<ComisionadoEntity>);

          return await this.comisionadoRepo.save(nuevoDesdeFnc);
        }
      } catch (err: any) {
        this.logger.warn(
          `[travel-expenses] Error consultando talento humano / Oracle FNC: ${err?.message || err}`,
        );
      }
    }

    // 3) Búsqueda terciaria (fallback): auth.personas (origen único ESAP).
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
      // 4) No existe ni en comisionados, ni en talento humano (Oracle FNC), ni en auth.personas:
      //    bloqueamos el flujo porque no hay un funcionario válido
      //    para asociar a la solicitud de viáticos.
      throw new NotFoundException(
        `No se encontró un comisionado con documento ${doc} ni en la base de datos de talento humano ni en ESAP. Verifique el número o contacte al administrador.`,
      );
    }

    // 5) Persistimos la "foto" de la persona de ESAP en
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

  /**
   * Consulta general o específica de talento humano (Oracle FNC / VW_INTEGRACIONFNC).
   * Permite buscar por término (nombre o documento) o documento exacto.
   */
  async buscarTalentoHumano(
    query?: string,
    documento?: string,
    limit = 20,
  ) {
    const doc = String(documento || '').trim();
    if (doc) {
      const funcionario = this.humanResourcesClient
        ? await this.humanResourcesClient.consultarFuncionarioPorDocumento(doc)
        : null;
      return {
        ok: true,
        source: 'talento_humano_oracle',
        query: doc,
        total: funcionario ? 1 : 0,
        data: funcionario ? [funcionario] : [],
      };
    }

    const term = String(query || '').trim();
    if (!term || term.length < 3) {
      throw new BadRequestException(
        'El término de búsqueda debe tener al menos 3 caracteres.',
      );
    }

    const funcionarios = this.humanResourcesClient
      ? await this.humanResourcesClient.buscarFuncionariosPorTermino(term, limit)
      : [];

    return {
      ok: true,
      source: 'talento_humano_oracle',
      query: term,
      total: funcionarios.length,
      data: funcionarios,
    };
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
      ...(dto.camposAdicionales || {}),
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

    const sincronizacion = this.sincronizarItinerario(dto);

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
      destinoCiudad: sincronizacion.destinoCiudad,
      destinoDepartamento: sincronizacion.destinoDepartamento,
      fechaInicio: sincronizacion.fechaInicio,
      fechaFin: sincronizacion.fechaFin,
      objetoComision: objetoSanitizado,
      prioridad: dto.prioridad ?? 'BAJA',
      rubroPresupuestal: dto.rubroPresupuestal ?? '',
      requiereTiquetes: dto.requiereTiquetes ?? false,
      montoViaticos: dto.montoViaticos ?? 0,
      montoGastosViaje: dto.montoGastosViaje ?? 0,
      diasComision: sincronizacion.diasComision,
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
      camposAdicionales: dto.camposAdicionales ?? {},
      itinerario: sincronizacion.itinerario,
      // ========== Autoliquidación GF-FO-023 ==========
      diasPernoctados: dto.diasPernoctados ?? null,
      tarifaDiaPernoctado: dto.tarifaDiaPernoctado ?? null,
      totalPernoctados: dto.totalPernoctados ?? null,
      diasNoPernoctados: dto.diasNoPernoctados ?? null,
      tarifaDiaNoPernoctado: dto.tarifaDiaNoPernoctado ?? null,
      totalNoPernoctados: dto.totalNoPernoctados ?? null,
      factorComisionado: dto.factorComisionado ?? null,
      factorPernocta: dto.factorPernocta ?? null,
      tarifaDiariaBase: dto.tarifaDiariaBase ?? null,
      tarifaFinalAplicadaDia: dto.tarifaFinalAplicadaDia ?? null,
      salarioBaseAplicado: dto.salarioBaseAplicado ?? null,
      decretoAplicado: dto.decretoAplicado ?? null,
      desgloseCalculo: dto.desgloseCalculo ?? null,
      alertasLiquidacion: dto.alertasLiquidacion ?? null,
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

    // ========== Persistencia de Autoliquidación GF-FO-023 ==========
    if (dto.diasPernoctados !== undefined) {
      solicitud.diasPernoctados = dto.diasPernoctados;
    }
    if (dto.tarifaDiaPernoctado !== undefined) {
      solicitud.tarifaDiaPernoctado = dto.tarifaDiaPernoctado;
    }
    if (dto.totalPernoctados !== undefined) {
      solicitud.totalPernoctados = dto.totalPernoctados;
    }
    if (dto.diasNoPernoctados !== undefined) {
      solicitud.diasNoPernoctados = dto.diasNoPernoctados;
    }
    if (dto.tarifaDiaNoPernoctado !== undefined) {
      solicitud.tarifaDiaNoPernoctado = dto.tarifaDiaNoPernoctado;
    }
    if (dto.totalNoPernoctados !== undefined) {
      solicitud.totalNoPernoctados = dto.totalNoPernoctados;
    }
    if (dto.factorComisionado !== undefined) {
      solicitud.factorComisionado = dto.factorComisionado;
    }
    if (dto.factorPernocta !== undefined) {
      solicitud.factorPernocta = dto.factorPernocta;
    }
    if (dto.tarifaDiariaBase !== undefined) {
      solicitud.tarifaDiariaBase = dto.tarifaDiariaBase;
    }
    if (dto.tarifaFinalAplicadaDia !== undefined) {
      solicitud.tarifaFinalAplicadaDia = dto.tarifaFinalAplicadaDia;
    }
    if (dto.salarioBaseAplicado !== undefined) {
      solicitud.salarioBaseAplicado = dto.salarioBaseAplicado;
    }
    if (dto.decretoAplicado !== undefined) {
      solicitud.decretoAplicado = dto.decretoAplicado;
    }
    if (dto.desgloseCalculo !== undefined) {
      solicitud.desgloseCalculo = dto.desgloseCalculo;
    }
    if (dto.alertasLiquidacion !== undefined) {
      solicitud.alertasLiquidacion = dto.alertasLiquidacion;
    }

    if (dto.camposAdicionales !== undefined) {
      solicitud.camposAdicionales = {
        ...(solicitud.camposAdicionales || {}),
        ...dto.camposAdicionales,
      };
    }
    if (dto.itinerario !== undefined) {
      const sincronizacion = this.sincronizarItinerario(dto);
      solicitud.itinerario = sincronizacion.itinerario;
      solicitud.fechaInicio = new Date(sincronizacion.fechaInicio);
      solicitud.fechaFin = new Date(sincronizacion.fechaFin);
      solicitud.diasComision = sincronizacion.diasComision;
      solicitud.destinoCiudad = sincronizacion.destinoCiudad;
      solicitud.destinoDepartamento = sincronizacion.destinoDepartamento;
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

  /**
   * Limpia y normaliza texto para renderizado correcto en PDFKit sin problemas de codificación.
   */
  sanitizarTextoPdf(texto: string | null | undefined): string {
    if (!texto) return '';
    return String(texto)
      .replace(/Ã¡/g, 'á')
      .replace(/Ã©/g, 'é')
      .replace(/Ã­/g, 'í')
      .replace(/Ã³/g, 'ó')
      .replace(/Ãº/g, 'ú')
      .replace(/Ã±/g, 'ñ')
      .replace(/Ã‘/g, 'Ñ')
      .replace(/Ã\u0081/g, 'Á')
      .replace(/Ã\u0089/g, 'É')
      .replace(/Ã\u008D/g, 'Í')
      .replace(/Ã\u0093/g, 'Ó')
      .replace(/Ã\u009A/g, 'Ú')
      .replace(/Ã\u0091/g, 'Ñ')
      .replace(/Ã-/g, 'í')
      .replace(/Ã\u00ad/g, 'í')
      .replace(/Â/g, '')
      .trim();
  }

  /**
   * Resuelve el nombre y apellidos de un usuario a partir de su ID consultando
   * auth."user" y auth.personas. Si no se encuentra, retorna fallbackNombre.
   */
  async resolverNombreUsuario(
    usuarioId?: string | null,
    fallbackNombre: string = '',
  ): Promise<string> {
    if (!usuarioId) return fallbackNombre;
    if (typeof this.dataSource?.query === 'function') {
      try {
        const rows: any[] = await this.dataSource.query(
          `SELECT u.username, p.nom_tercero, p.pri_apellido, p.nom_largo
           FROM auth."user" u
           LEFT JOIN auth.personas p ON p.id_person = u.id_person
           WHERE u.id_user = $1
           LIMIT 1`,
          [usuarioId],
        );
        if (Array.isArray(rows) && rows[0]) {
          const r = rows[0];
          const nombre =
            r.nom_largo ||
            [r.nom_tercero, r.pri_apellido].filter(Boolean).join(' ') ||
            r.username;
          if (nombre) return String(nombre).trim();
        }
      } catch (e) {
        this.logger.warn(`Error resolviendo nombre de usuario ${usuarioId}: ${e}`);
      }
    }
    return fallbackNombre;
  }

  async exportarFormato023(solicitudId: string, req?: any): Promise<Buffer> {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
      relations: [
        'comisionado',
        'documentosSoporte',
        'analistaAsignado',
        'revisorControl',
        'autorizador',
        'autorizadorDireccion',
        'expedidoRpPor',
        'usuarioPresupuesto',
        'obligadoPor',
        'pagadoPor',
      ],
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    const comisionado = solicitud.comisionado;
    const PDFDocument = require('pdfkit');

    const nombreComisionado = this.sanitizarTextoPdf(
      [
        comisionado?.primerNombre,
        comisionado?.segundoNombre,
        comisionado?.primerApellido,
        comisionado?.segundoApellido,
      ]
        .filter(Boolean)
        .join(' '),
    );

    const solicitanteNombre = await this.resolverNombreUsuario(
      solicitud.creadoPorUsuarioId,
      nombreComisionado || 'Solicitante / Comisionado',
    );

    const revisorNombre = await this.resolverNombreUsuario(
      solicitud.revisorControlId || solicitud.analistaAsignadoId,
      'Grupo de Gestión de Viáticos',
    );

    const autorizadorNombre = await this.resolverNombreUsuario(
      solicitud.autorizadorId || solicitud.autorizadorDireccionId,
      'Subdirección de Gestión Corporativa',
    );

    const presupuestoNombre = await this.resolverNombreUsuario(
      solicitud.expedidoRpPorId ||
        solicitud.usuarioPresupuestoId ||
        solicitud.enviadoPresupuestoPorId,
      'Grupo de Presupuesto',
    );

    const tesoreriaNombre = await this.resolverNombreUsuario(
      solicitud.pagadoPorId || solicitud.obligadoPorId,
      'Grupo de Tesorería',
    );

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
        doc.fillColor('#003DA5').fontSize(11).font('Helvetica-Bold');
        doc.text(
          'FORMATO DE AUTORIZACIÓN SOLICITUD DE TRÁMITE Y LIQUIDACIÓN DE COMISIÓN DE SERVICIOS, GASTOS DE TRANSPORTE, GASTOS DE DESPLAZAMIENTO Y AUXILIO ECONÓMICO DE DESPLAZAMIENTO',
          {
            align: 'center',
          },
        );
        doc.moveDown(0.3);
        doc.fontSize(9).font('Helvetica-Bold');
        doc.fillColor('#333333');
        doc.text('CÓDIGO: GF-FO-023  |  VERSIÓN: 07  |  FECHA: 26/03/2026', {
          align: 'center',
        });
        doc.fontSize(8).font('Helvetica-Oblique').fillColor('#666666');
        doc.text(
          'Diligencie o seleccione únicamente y a completitud los campos requeridos',
          { align: 'center' },
        );
        doc.moveDown(0.8);
      };

      const drawSectionTitle = (title: string) => {
        doc.moveDown(0.4);
        doc.fillColor('#003DA5').fontSize(10).font('Helvetica-Bold');
        doc.text(title);
        doc
          .strokeColor('#CCCCCC')
          .lineWidth(0.5)
          .moveTo(50, doc.y)
          .lineTo(562, doc.y)
          .stroke();
        doc.moveDown(0.4);
      };

      const drawField = (label: string, value: string) => {
        doc.fillColor('#333333').fontSize(8.5).font('Helvetica-Bold');
        doc.text(`${label}: `, { continued: true });
        doc.font('Helvetica').fillColor('#000000');
        doc.text(this.sanitizarTextoPdf(value) || 'N/A');
      };

      const drawMultiLineField = (label: string, value: string) => {
        doc.fillColor('#333333').fontSize(8.5).font('Helvetica-Bold');
        doc.text(`${label}:`);
        doc.moveDown(0.2);
        doc.font('Helvetica').fillColor('#000000');
        doc.text(this.sanitizarTextoPdf(value) || 'N/A', {
          width: 512,
          align: 'justify',
        });
        doc.moveDown(0.2);
      };

      const formatDate = (
        date: Date | string | null | undefined,
        estiloMes: 'long' | 'short' = 'long',
      ): string => {
        if (!date) return 'N/A';
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('es-CO', {
          year: 'numeric',
          month: estiloMes,
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

      const nombreCompleto = nombreComisionado;

      const tipoTransporte = solicitud.requiereTiquetes
        ? 'Aéreo / Terrestre'
        : 'Terrestre';
      const prioridad = solicitud.prioridad || 'MEDIA';
      const estado = solicitud.estadoSolicitud || 'RADICADA';
      const salarioContrato = Number(solicitud.salarioBasico || 0);

      // Usar valores de autoliquidación almacenados (GF-FO-023)
      const diasPernoctados = Number(solicitud.diasPernoctados || 0);
      const valorDiaPernoctado = Number(solicitud.tarifaDiaPernoctado || 0);
      const subtotalPernoctados = Number(solicitud.totalPernoctados || 0);
      const diasNoPernoctados = Number(solicitud.diasNoPernoctados || 0);
      const valorDiaNoPernoctado = Number(solicitud.tarifaDiaNoPernoctado || 0);
      const subtotalNoPernoctados = Number(solicitud.totalNoPernoctados || 0);
      const montoViaticos = Number(solicitud.montoViaticos || 0);
      const montoGastosViaje = Number(solicitud.montoGastosViaje || 0);
      const montoTotalGeneral = montoViaticos + montoGastosViaje;
      const decretoAplicado = solicitud.decretoAplicado || 'Decreto 314 de 2026';

      // Duración total en días (pernoctados + no pernoctados * 0.5)
      const diasTotales = diasPernoctados + (diasNoPernoctados * 0.5);

      // Tarifa diaria base almacenada
      const tarifaDiariaBase = Number(solicitud.tarifaDiariaBase || 0);

      drawHeader();
      drawTitle();

      // Dependencia solicitante y fecha de autoliquidación
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#333333');
      doc.text(`Dependencia Solicitante: `, 50, doc.y, { continued: true });
      doc.font('Helvetica').text(`ID ${solicitud.idDependencia || comisionado?.idDependencia || 'N/A'}`);
      doc.font('Helvetica-Bold').text(`Fecha de Autoliquidación: `, { continued: true });
      doc.font('Helvetica').text(formatDate(solicitud.creadoEn));
      doc.font('Helvetica-Bold').text(`No. Radicado: `, { continued: true });
      doc.font('Helvetica').text(`${solicitud.consecutivoUnico || 'S/N'} (${estado})`);
      doc.moveDown(0.4);

      drawSectionTitle('1. DATOS DEL COMISIONADO / CONTRATISTA');
      drawField('Nombre Completo', nombreCompleto);
      drawField('No. Documento', comisionado?.numeroDocumento || 'N/A');
      drawField('Tipo de Comisionado', comisionado?.tipoComisionado || 'N/A');
      drawField('Correo Electrónico', comisionado?.email || 'N/A');
      drawField('Teléfono de Contacto', comisionado?.telefonoContacto || 'N/A');
      if (salarioContrato > 0) {
        drawField(
          (comisionado?.tipoComisionado || '').toUpperCase() === 'CONTRATISTA'
            ? 'Valor Honorarios'
            : 'Asignación Básica Mensual',
          formatCurrency(salarioContrato),
        );
      }
      doc.moveDown(0.3);

      drawSectionTitle('2. DATOS AUTORIZACIÓN DE DESPLAZAMIENTO Y GASTOS DE DESPLAZAMIENTO');
      drawField('Duración (en días)', `${diasTotales} ${diasTotales === 1 ? 'día' : 'días'}`);
      drawField('Fecha de Inicio', formatDate(solicitud.fechaInicio));
      drawField('Fecha de Finalización', formatDate(solicitud.fechaFin));
      drawField('Ciudad de Origen', 'Bogotá D.C. (Sede)');
      drawField('Destino / Ciudad y Departamento', `${solicitud.destinoCiudad || 'N/A'} (${solicitud.destinoDepartamento || 'N/A'})`);
      drawField('Tipo de Transporte', tipoTransporte);
      drawField('Requiere Tiquetes Aéreos', solicitud.requiereTiquetes ? 'SÍ' : 'NO');
      drawField('Viáticos diarios según decreto (Base)', formatCurrency(tarifaDiariaBase));
      doc.moveDown(0.3);

      drawMultiLineField('Objeto de la Comisión', solicitud.objetoComision);

      // Itinerario detallado si existe
      if (solicitud.itinerario && solicitud.itinerario.length > 0) {
        doc.moveDown(0.2);
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#003DA5').text('Itinerario Detallado de Rutas:');
        solicitud.itinerario.forEach((tramo, idx) => {
          doc.fontSize(8).font('Helvetica').fillColor('#333333');
          doc.text(
            `  • Tramo ${idx + 1}: ${tramo.origenCiudad} → ${tramo.destinoCiudad} | Salida: ${tramo.fechaSalida} Llegada: ${tramo.fechaLlegada} | Horario: ${tramo.horarioEstimadoMilitar || 'N/A'} | ${tramo.tipoTrayecto} (${tramo.diasRuta} d)`,
          );
        });
        doc.moveDown(0.3);
      }

      drawSectionTitle(`3. LIQUIDACIÓN DE LA AUTORIZACIÓN DE DESPLAZAMIENTO (${decretoAplicado})`);
      // Tabla pernoctados / no pernoctados tal como el formato GF-FO-023
      const tableY = doc.y;
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#003DA5');
      doc.text('Descripción del Día', 55, tableY);
      doc.text('No. Días', 220, tableY);
      doc.text('Viáticos Diario', 310, tableY);
      doc.text('Total Subtotal', 450, tableY);

      doc.strokeColor('#CCCCCC').lineWidth(0.5).moveTo(50, tableY + 12).lineTo(562, tableY + 12).stroke();

      let rowY = tableY + 16;
      doc.fontSize(8).font('Helvetica').fillColor('#333333');
      // Fila Pernoctados
      doc.text('Pernoctados', 55, rowY);
      doc.text(String(diasPernoctados), 220, rowY);
      doc.text(formatCurrency(valorDiaPernoctado), 310, rowY);
      doc.text(formatCurrency(subtotalPernoctados), 450, rowY);

      rowY += 14;
      // Fila No Pernoctados
      doc.text('No Pernoctados', 55, rowY);
      doc.text(String(diasNoPernoctados), 220, rowY);
      doc.text(formatCurrency(valorDiaNoPernoctado), 310, rowY);
      doc.text(formatCurrency(subtotalNoPernoctados), 450, rowY);

      rowY += 14;
      doc.strokeColor('#CCCCCC').lineWidth(0.5).moveTo(50, rowY).lineTo(562, rowY).stroke();
      rowY += 4;
      doc.font('Helvetica-Bold').fillColor('#003DA5');
      doc.text('Total Viáticos', 55, rowY);
      doc.text(formatCurrency(montoViaticos), 450, rowY);

      doc.y = rowY + 14;

      drawSectionTitle('4. LIQUIDACIÓN DE LOS GASTOS DE DESPLAZAMIENTO');
      drawField('Total Transporte y desplazamientos terminales / aéreos', formatCurrency(montoGastosViaje));
      drawField('Transporte terrestre, marítimo, fluvial o complementario', '$ 0');
      drawField('TOTAL VIÁTICOS, TRANSPORTES Y DESPLAZAMIENTOS', formatCurrency(montoTotalGeneral));
      doc.fontSize(7.5).font('Helvetica-Oblique').fillColor('#666666');
      doc.text('* NOTA: Para la liquidación de gastos de transporte se aplicará lo referido en la Resolución de viáticos vigente.');
      doc.moveDown(0.3);

      drawSectionTitle('5. INFORMACIÓN FINANCIERA Y FIRMAS');
      doc.fontSize(8).font('Helvetica').fillColor('#333333');
      doc.text(
        `El pago de la presente comisión de servicios / autorización de desplazamiento se hará con cargo a la Dependencia solicitante, del Rubro Presupuestal ${solicitud.rubroPresupuestal || 'asignado'}, según CDP y Registro Presupuestal No. ${solicitud.numeroRp || 'En trámite'}.`,
        { width: 512, align: 'justify' },
      );
      doc.moveDown(0.4);

      // Verificamos si queda espacio suficiente para las firmas (~180pt). Si no, nueva página con header limpio.
      if (doc.y > 510) {
        doc.addPage();
        drawHeader();
      }

      // Ley 1581 de 2012 - Protección de Datos Personales
      doc.fontSize(7).font('Helvetica-Oblique').fillColor('#666666');
      doc.text(
        'La información recolectada en este documento es tratada bajo la política de Datos Personales de la ESAP en cumplimiento a la Ley 1581 de 2012.',
        { align: 'center' },
      );
      doc.moveDown(0.5);

      // Estados de avance del flujo para activar los sellos visuales de aprobación
      const estadosRevisionAprobada = [
        EstadoSolicitud.VERIFICADA,
        EstadoSolicitud.APROBADO_JEFE,
        EstadoSolicitud.APROBADO_TALENTO_HUMANO,
        EstadoSolicitud.AUTORIZACION_DIRECCION,
        EstadoSolicitud.EN_AUTORIZACION,
        EstadoSolicitud.AUTORIZADA,
        EstadoSolicitud.EN_PRESUPUESTO,
        EstadoSolicitud.COMPROMETIDA,
        EstadoSolicitud.OBLIGADA,
        EstadoSolicitud.PAGADA,
        EstadoSolicitud.RESOLUCION_EMITIDA,
        EstadoSolicitud.TIQUETES_COMPRADOS,
        EstadoSolicitud.EN_COMISION,
        EstadoSolicitud.PENDIENTE_LEGALIZACION,
        EstadoSolicitud.LEGALIZADO,
      ];

      const estadosAutorizacionAprobada = [
        EstadoSolicitud.AUTORIZADA,
        EstadoSolicitud.EN_PRESUPUESTO,
        EstadoSolicitud.COMPROMETIDA,
        EstadoSolicitud.OBLIGADA,
        EstadoSolicitud.PAGADA,
        EstadoSolicitud.RESOLUCION_EMITIDA,
        EstadoSolicitud.TIQUETES_COMPRADOS,
        EstadoSolicitud.EN_COMISION,
        EstadoSolicitud.PENDIENTE_LEGALIZACION,
        EstadoSolicitud.LEGALIZADO,
      ];

      const estadosPresupuestoAprobado = [
        EstadoSolicitud.COMPROMETIDA,
        EstadoSolicitud.OBLIGADA,
        EstadoSolicitud.PAGADA,
      ];

      const estadosPagoAprobado = [EstadoSolicitud.PAGADA];

      const solicitanteAprobado = true; // Radicado y solicitado formalmente en el sistema
      const revisorAprobado =
        estadosRevisionAprobada.includes(solicitud.estadoSolicitud) ||
        Boolean(solicitud.fechaRevision) ||
        Boolean(solicitud.fechaSegundaRevision) ||
        Boolean(solicitud.revisorControlId);
      const autorizadorAprobado =
        estadosAutorizacionAprobada.includes(solicitud.estadoSolicitud) ||
        Boolean(solicitud.fechaAutorizacion) ||
        Boolean(solicitud.autorizadorId);
      const tienePresupuesto =
        estadosPresupuestoAprobado.includes(solicitud.estadoSolicitud) ||
        Boolean(solicitud.numeroRp) ||
        Boolean(solicitud.fechaRp);
      const tienePago =
        estadosPagoAprobado.includes(solicitud.estadoSolicitud) ||
        Boolean(solicitud.fechaPago) ||
        Boolean(solicitud.numeroOrdenPago);

      const drawSelloOFirma = (
        x: number,
        y: number,
        width: number,
        aprobado: boolean,
        nombre: string,
        detalle: string,
        etiquetaFirma: string,
      ) => {
        const boxHeight = 44;
        if (aprobado) {
          // Sello visual digital APROBADO (diseño corporativo ESAP idéntico al visto bueno de tiquete)
          doc
            .roundedRect(x, y, width, boxHeight, 4)
            .lineWidth(1)
            .strokeColor('#15803D')
            .fillAndStroke('#F0FDF4', '#15803D');

          doc.fontSize(8).font('Helvetica-Bold').fillColor('#15803D');
          doc.text('ESTADO: APROBADO', x, y + 5, {
            width,
            align: 'center',
          });
          doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#14532D');
          doc.text(
            this.sanitizarTextoPdf(`Aprobado por: ${nombre}`),
            x,
            y + 17,
            {
              width,
              align: 'center',
            },
          );
          doc.fontSize(6.5).font('Helvetica').fillColor('#166534');
          doc.text(this.sanitizarTextoPdf(detalle), x, y + 29, {
            width,
            align: 'center',
          });

          // Etiqueta del rol formal debajo del sello
          doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#334155');
          doc.text(etiquetaFirma, x, y + boxHeight + 4, {
            width,
            align: 'center',
          });
        } else {
          // Línea clásica para firma física pendiente
          const lineY = y + 26;
          doc
            .strokeColor('#94a3b8')
            .lineWidth(0.8)
            .moveTo(x + 10, lineY)
            .lineTo(x + width - 10, lineY)
            .stroke();

          doc.fontSize(7.5).font('Helvetica').fillColor('#475569');
          doc.text(etiquetaFirma, x, lineY + 5, {
            width,
            align: 'center',
          });
          doc.fontSize(6.5).font('Helvetica-Oblique').fillColor('#94a3b8');
          doc.text('Pendiente de firma / aprobación', x, lineY + 16, {
            width,
            align: 'center',
          });
        }
      };

      const anchoColumna = 215;
      const xCol1 = 60;
      const xCol2 = 337;
      let curY = doc.y;

      // Fila 1: Solicitante (izq) y Jefe Inmediato / Revisión (der)
      drawSelloOFirma(
        xCol1,
        curY,
        anchoColumna,
        solicitanteAprobado,
        solicitanteNombre,
        `Radicación Digital · ${formatDate(solicitud.creadoEn, 'short')}`,
        'Firma del Solicitante / Comisionado',
      );

      drawSelloOFirma(
        xCol2,
        curY,
        anchoColumna,
        revisorAprobado,
        revisorNombre,
        `Revisión y Control · ${formatDate(
          solicitud.fechaSegundaRevision ||
            solicitud.fechaRevision ||
            solicitud.actualizadoEn,
          'short',
        )}`,
        'Firma del Jefe Inmediato / Aprobación',
      );

      curY += 66;

      // Fila 2: Subdirector / Director (izq o centro) y Presupuesto (der si aplica)
      if (tienePresupuesto) {
        drawSelloOFirma(
          xCol1,
          curY,
          anchoColumna,
          autorizadorAprobado,
          autorizadorNombre,
          `Autorización Institucional · ${formatDate(
            solicitud.fechaAutorizacion || solicitud.actualizadoEn,
            'short',
          )}`,
          'Firma Subdirector / Director',
        );

        drawSelloOFirma(
          xCol2,
          curY,
          anchoColumna,
          true,
          presupuestoNombre,
          `Presupuesto · RP No. ${solicitud.numeroRp || 'S/N'} · ${formatDate(
            solicitud.fechaRp ||
              solicitud.fechaExpedicionRp ||
              solicitud.actualizadoEn,
            'short',
          )}`,
          'Firma Presupuesto (RP Expedido)',
        );

        curY += 66;
      } else {
        const xCentro = 198;
        drawSelloOFirma(
          xCentro,
          curY,
          anchoColumna,
          autorizadorAprobado,
          autorizadorNombre,
          `Autorización Institucional · ${formatDate(
            solicitud.fechaAutorizacion || solicitud.actualizadoEn,
            'short',
          )}`,
          'Firma Subdirector / Director',
        );

        curY += 66;
      }

      // Fila 3: Si ya tiene Desembolso / Pago en Tesorería
      if (tienePago) {
        const xCentro = 198;
        drawSelloOFirma(
          xCentro,
          curY,
          anchoColumna,
          true,
          tesoreriaNombre,
          `Tesorería · OP No. ${solicitud.numeroOrdenPago || 'SIIF'} · ${formatDate(
            solicitud.fechaPago ||
              solicitud.fechaRegistroPago ||
              solicitud.actualizadoEn,
            'short',
          )}`,
          'Firma Tesorería (Desembolso y Pago)',
        );

        curY += 66;
      }

      doc.y = curY + 6;

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

    const estadosActivosAnalista = [
      EstadoSolicitud.SOLICITADO,
      EstadoSolicitud.EN_VERIFICACION,
      EstadoSolicitud.EXTEMPORANEA,
      EstadoSolicitud.VERIFICADA,
      EstadoSolicitud.SOLICITADA_SIIF,
      EstadoSolicitud.DEVUELTA,
      EstadoSolicitud.AUTORIZADA,
      EstadoSolicitud.COMPROMETIDA,
      EstadoSolicitud.OBLIGADA,
    ];

    const whereCondition: any = {
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
   * resultado del checklist en el historial, actualiza el flag de consulta RUT
   * y transiciona el estado de la solicitud a VERIFICADA.
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

      this.validarSoD(solicitud, usuarioId, rolesUsuario);

      if (solicitud.estadoSolicitud === EstadoSolicitud.DEVUELTA) {
        throw new BadRequestException(
          'La comisión se encuentra DEVUELTA al enlace de dependencia. No se puede verificar hasta que el enlace subsane las observaciones y radique nuevamente la corrección.',
        );
      }

      const estadosPermitidos = [
        EstadoSolicitud.SOLICITADO,
        EstadoSolicitud.EN_VERIFICACION,
        EstadoSolicitud.EXTEMPORANEA,
      ];

      if (!estadosPermitidos.includes(solicitud.estadoSolicitud)) {
        throw new BadRequestException(
          `Estado no valido para verificacion: ${solicitud.estadoSolicitud}. La solicitud debe estar SOLICITADO, EN_VERIFICACION o EXTEMPORANEA.`,
        );
      }

      const comentarioChecklist = JSON.stringify({
        tipo: 'VERIFICACION_ANALISTA',
        seguridad_social_vigente: dto.seguridadSocialVigente ?? null,
        consulta_rut_facturador: dto.consultaRutFacturador ?? false,
      });

      const estadoAnterior = solicitud.estadoSolicitud;
      solicitud.estadoSolicitud = EstadoSolicitud.VERIFICADA;
      solicitud.motivoDevolucion = null;
      solicitud.observacionesSegundaRevision = null;

      await manager.getRepository(SolicitudHistorialEstadoEntity).save({
        solicitudId: solicitud.id,
        estadoAnterior,
        estadoNuevo: EstadoSolicitud.VERIFICADA,
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

    // Notificación in-app y correo institucional al Control de Viáticos (Segunda Revisión)
    try {
      const consecutivo = result.consecutivoUnico || result.id;
      const destino = `${result.destinoCiudad || ''}${result.destinoDepartamento ? ` (${result.destinoDepartamento})` : ''}`.trim();
      const fechaIni = result.fechaInicio ? new Date(result.fechaInicio).toISOString().split('T')[0] : '';
      const fechaFn = result.fechaFin ? new Date(result.fechaFin).toISOString().split('T')[0] : '';
      const fechasStr = fechaIni && fechaFn ? `${fechaIni} al ${fechaFn}` : fechaIni || fechaFn || 'Por definir';

      void this.notificationClient
        .notifyByPermission(
          'travel_expenses.general.es_control_viaticos',
          {
            tipo_notificacion: 'VIATICOS_PENDIENTE_SEGUNDA_REVISION',
            titulo: `Comisión verificada para control: ${consecutivo}`,
            mensaje: `El analista ha verificado la comisión ${consecutivo} hacia ${destino}. Se encuentra lista para segunda revisión técnica (Control Cruzado).`,
            descripcion_corta: `Segunda Revisión · ${consecutivo}`,
            icono: 'CheckSquare',
            color: '#2563EB',
            prioridad: 'Media',
            categoria: 'VIATICOS',
            tiene_accion: true,
            texto_boton_accion: 'Revisar comisión',
            url_accion: '/viaticos',
            datos_adicionales: {
              solicitudId: result.id,
              consecutivoUnico: consecutivo,
            },
          },
          {
            subject: `[Viáticos ESAP] Comisión Verificada para Control Técnico: ${consecutivo}`,
            html: buildTravelExpenseEmailHtml({
              destinatarioNombre: 'Revisor de Control de Viáticos',
              tituloHeader: 'ESAP — Grupo de Viáticos',
              subtituloHeader: 'Segunda Revisión Técnica (Control Cruzado)',
              mensajePrincipal: `La comisión de servicios <strong>${consecutivo}</strong> ha completado la verificación por analista y está pendiente de su segunda revisión técnica:`,
              consecutivo,
              destino,
              fechas: fechasStr,
              nuevoEstado: 'VERIFICADA',
              tipoNovedad: 'INFO',
              textoBoton: 'Ver en Bandeja de Control',
            }),
            text: `La comisión ${consecutivo} ha sido verificada por el analista y está pendiente de segunda revisión técnica.`,
          },
          'CONTROL_VIATICOS',
        )
        .catch((err) => {
          this.logger.warn(`[notify] Error notificando a Control de Viáticos: ${err?.message}`);
        });
    } catch (err: any) {
      this.logger.warn(`[notify] Error en bloque de notificación de verificación: ${err?.message}`);
    }

    return result;
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

      this.validarSoD(solicitud, usuarioId, rolesUsuario);

      if (solicitud.estadoSolicitud === EstadoSolicitud.DEVUELTA) {
        throw new BadRequestException(
          'La comisión ya se encuentra devuelta al enlace de dependencia.',
        );
      }

      const estadosPermitidosDevolucion = [
        EstadoSolicitud.SOLICITADO,
        EstadoSolicitud.EN_VERIFICACION,
        EstadoSolicitud.EXTEMPORANEA,
        EstadoSolicitud.VERIFICADA,
      ];

      if (!estadosPermitidosDevolucion.includes(solicitud.estadoSolicitud)) {
        throw new BadRequestException(
          `Estado no valido para devolucion: ${solicitud.estadoSolicitud}. La solicitud debe estar SOLICITADO, EN_VERIFICACION, EXTEMPORANEA o VERIFICADA.`,
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

    // Notificación in-app y correo electrónico al Enlace creador
    if (result.creadoPorUsuarioId) {
      const consecutivo = result.consecutivoUnico || result.id;
      const destino = `${result.destinoCiudad || ''}${result.destinoDepartamento ? ` (${result.destinoDepartamento})` : ''}`.trim();
      const fechaIni = result.fechaInicio ? new Date(result.fechaInicio).toISOString().split('T')[0] : '';
      const fechaFn = result.fechaFin ? new Date(result.fechaFin).toISOString().split('T')[0] : '';
      const fechasStr = fechaIni && fechaFn ? `${fechaIni} al ${fechaFn}` : fechaIni || fechaFn || 'Por definir';

      void this.notificationClient
        .notifyUser(
          result.creadoPorUsuarioId,
          {
            tipo_notificacion: 'VIATICOS_DEVOLUCION_ANALISTA',
            titulo: `Solicitud devuelta por el analista: ${consecutivo}`,
            mensaje: `El analista ha devuelto su solicitud ${consecutivo} para subsanación. Observaciones: ${motivo}`,
            descripcion_corta: `Devolución analista · ${consecutivo}`,
            icono: 'AlertTriangle',
            color: '#DC2626',
            prioridad: 'Alta',
            categoria: 'VIATICOS',
            tiene_accion: true,
            texto_boton_accion: 'Subsanar solicitud',
            url_accion: '/viaticos',
            datos_adicionales: {
              solicitudId: result.id,
              consecutivoUnico: consecutivo,
              motivo,
            },
          },
          {
            subject: `[Viáticos ESAP] Solicitud Devuelta por Analista para Subsanación: ${consecutivo}`,
            html: buildTravelExpenseEmailHtml({
              destinatarioNombre: 'Enlace de Dependencia',
              tituloHeader: 'ESAP — Grupo de Viáticos',
              subtituloHeader: 'Devolución de Expediente en Verificación Técnica',
              mensajePrincipal: `El analista de viáticos ha devuelto la comisión <strong>${consecutivo}</strong> solicitando correcciones o soportes adicionales:`,
              consecutivo,
              destino,
              fechas: fechasStr,
              nuevoEstado: 'DEVUELTA',
              motivoUObservaciones: motivo,
              tipoNovedad: 'DANGER',
              textoBoton: 'Subsanar Expediente',
            }),
            text: `Su solicitud ${consecutivo} fue devuelta por el analista. Motivo: ${motivo}`,
          },
        )
        .catch((err) => {
          this.logger.warn(`[notify] Error notificando devolución de analista a enlace: ${err?.message}`);
        });
    }

    return result;
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

      if (solicitud.estadoSolicitud === EstadoSolicitud.DEVUELTA) {
        throw new BadRequestException(
          'La comisión se encuentra devuelta al enlace de dependencia y no puede exportarse a SIIF.',
        );
      }

      const estadosPermitidos = [
        EstadoSolicitud.SOLICITADO,
        EstadoSolicitud.EN_VERIFICACION,
        EstadoSolicitud.EXTEMPORANEA,
        EstadoSolicitud.VERIFICADA,
        EstadoSolicitud.SOLICITADA_SIIF,
        EstadoSolicitud.AUTORIZADA,
        EstadoSolicitud.COMPROMETIDA,
        EstadoSolicitud.OBLIGADA,
        EstadoSolicitud.RESOLUCION_EMITIDA,
        EstadoSolicitud.TIQUETES_COMPRADOS,
        EstadoSolicitud.EN_COMISION,
        EstadoSolicitud.PENDIENTE_LEGALIZACION,
        EstadoSolicitud.LEGALIZADO,
      ];
      if (!estadosPermitidos.includes(solicitud.estadoSolicitud)) {
        throw new BadRequestException(
          `Estado no valido para exportacion SIIF: ${solicitud.estadoSolicitud}. La solicitud debe estar SOLICITADO, EN_VERIFICACION, EXTEMPORANEA, VERIFICADA o SOLICITADA_SIIF.`,
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
      const diasComision = String(Math.max(0.5, Number(solicitud.diasComision || 1)));
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

      const estadosAvanzadosSoloLectura = [
        EstadoSolicitud.AUTORIZADA,
        EstadoSolicitud.COMPROMETIDA,
        EstadoSolicitud.OBLIGADA,
        EstadoSolicitud.RESOLUCION_EMITIDA,
        EstadoSolicitud.TIQUETES_COMPRADOS,
        EstadoSolicitud.EN_COMISION,
        EstadoSolicitud.PENDIENTE_LEGALIZACION,
        EstadoSolicitud.LEGALIZADO,
      ];
      const esEstadoAvanzado = estadosAvanzadosSoloLectura.includes(solicitud.estadoSolicitud);

      const estadoAnterior = solicitud.estadoSolicitud;
      solicitud.siifExportado = true;
      solicitud.fechaExportacionSiif = new Date();
      solicitud.usuarioExportadorId = usuarioId;

      if (!esEstadoAvanzado) {
        solicitud.estadoSolicitud = EstadoSolicitud.SOLICITADA_SIIF;
      }

      const saved = await manager
        .getRepository(SolicitudComisionEntity)
        .save(solicitud);

      if (!esEstadoAvanzado) {
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
      } else {
        this.logger.log(
          `[consulta-siif] Solicitud ${solicitud.consecutivoUnico} (${estadoAnterior}) descargada como copia CSV por usuario ${usuarioId}`,
        );
      }

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
      const esExtemporanea = Boolean(solicitud.extemporanea);
      solicitud.estadoSolicitud = esExtemporanea
        ? EstadoSolicitud.AUTORIZACION_DIRECCION
        : EstadoSolicitud.VERIFICADA;
      solicitud.revisorControlId = usuarioId;
      solicitud.fechaSegundaRevision = new Date();
      solicitud.observacionesSegundaRevision = observaciones.slice(0, 2000);

      const saved = await manager
        .getRepository(SolicitudComisionEntity)
        .save(solicitud);

      await manager.getRepository(SolicitudHistorialEstadoEntity).save({
        solicitudId: solicitud.id,
        estadoAnterior,
        estadoNuevo: solicitud.estadoSolicitud,
        usuarioId: usuarioId,
        comentarios: esExtemporanea
          ? `Segunda revisión completada. Enrutada a Dirección Nacional por comisión extemporánea (RF-AUT-002): ${observaciones.slice(0, 200)}`
          : `Segunda revisión: ${observaciones.slice(0, 255)}`,
      });

      this.logger.log(
        `[RF-REV-002] Solicitud ${solicitud.consecutivoUnico} verificada en segunda revisión por usuario ${usuarioId} (estadoNuevo: ${solicitud.estadoSolicitud})`,
      );

      const consecutivo = solicitud.consecutivoUnico || solicitud.id;
      const destino = `${solicitud.destinoCiudad || ''}${solicitud.destinoDepartamento ? ` (${solicitud.destinoDepartamento})` : ''}`.trim();
      const fechaIni = solicitud.fechaInicio ? new Date(solicitud.fechaInicio).toISOString().split('T')[0] : '';
      const fechaFn = solicitud.fechaFin ? new Date(solicitud.fechaFin).toISOString().split('T')[0] : '';
      const fechasStr = fechaIni && fechaFn ? `${fechaIni} al ${fechaFn}` : fechaIni || fechaFn || 'Por definir';

      if (esExtemporanea) {
        void this.notificationClient
          .notifyByPermission(
            'travel_expenses.general.es_direccion_nacional',
            {
              tipo_notificacion: 'VIATICOS_COMISION_EXTEMPORANEA_PENDIENTE',
              titulo: `Nueva comisión extemporánea para autorización: ${consecutivo}`,
              mensaje: `La comisión ${consecutivo} no cumplió los 14 días hábiles y requiere su autorización excepcional en bandeja (RF-AUT-002).`,
              descripcion_corta: `Extemporánea pendiente · ${consecutivo}`,
              icono: 'Award',
              color: '#7C3AED',
              prioridad: 'Alta',
              categoria: 'VIATICOS',
              tiene_accion: true,
              texto_boton_accion: 'Revisar comisión',
              url_accion: '/viaticos',
              datos_adicionales: {
                solicitudId: solicitud.id,
                consecutivoUnico: consecutivo,
                extemporanea: true,
              },
            },
            {
              subject: `[Viáticos ESAP] Comisión Extemporánea para Autorización: ${consecutivo}`,
              html: buildTravelExpenseEmailHtml({
                destinatarioNombre: 'Dirección Nacional',
                tituloHeader: 'ESAP — Dirección Nacional',
                subtituloHeader: 'Autorización Excepcional de Comisión Extemporánea',
                mensajePrincipal: `La comisión de servicios <strong>${consecutivo}</strong> ha sido verificada en control técnico y requiere su autorización excepcional por radicación extemporánea:`,
                consecutivo,
                destino,
                fechas: fechasStr,
                nuevoEstado: 'AUTORIZACIÓN DIRECCIÓN',
                tipoNovedad: 'WARNING',
                textoBoton: 'Revisar Comisión',
              }),
              text: `La comisión ${consecutivo} requiere su autorización excepcional en la plataforma de viáticos.`,
            },
            'DIRECCION_NACIONAL',
          )
          .catch((err) => {
            this.logger.warn(
              `Error notificando a Dirección Nacional sobre comisión extemporánea: ${err?.message}`,
            );
          });
      } else {
        void this.notificationClient
          .notifyByPermission(
            'travel_expenses.general.es_subdireccion_corporativa',
            {
              tipo_notificacion: 'VIATICOS_COMISION_EN_AUTORIZACION',
              titulo: `Comisión avalada para autorización: ${consecutivo}`,
              mensaje: `La comisión ${consecutivo} hacia ${destino} fue avalada en segunda revisión técnica y se encuentra en su bandeja para autorización corporativa.`,
              descripcion_corta: `En Autorización · ${consecutivo}`,
              icono: 'FileCheck',
              color: '#003DA5',
              prioridad: 'Alta',
              categoria: 'VIATICOS',
              tiene_accion: true,
              texto_boton_accion: 'Autorizar comisión',
              url_accion: '/viaticos',
              datos_adicionales: {
                solicitudId: solicitud.id,
                consecutivoUnico: consecutivo,
              },
            },
            {
              subject: `[Viáticos ESAP] Comisión Lista para Autorización Corporativa: ${consecutivo}`,
              html: buildTravelExpenseEmailHtml({
                destinatarioNombre: 'Subdirección de Gestión Corporativa (Ordenador)',
                tituloHeader: 'ESAP — Ordenación del Gasto',
                subtituloHeader: 'Comisión Avalada en Control Técnico',
                mensajePrincipal: `La comisión de servicios <strong>${consecutivo}</strong> ha superado la segunda revisión técnica (Control Cruzado) y está lista para su firma y autorización:`,
                consecutivo,
                destino,
                fechas: fechasStr,
                nuevoEstado: 'VERIFICADA / EN AUTORIZACIÓN',
                tipoNovedad: 'INFO',
                textoBoton: 'Autorizar Expediente',
              }),
              text: `La comisión ${consecutivo} está lista para su autorización corporativa en la plataforma de viáticos.`,
            },
            'SUBDIRECCION_GESTION_CORPORATIVA',
          )
          .catch((err) => {
            this.logger.warn(
              `Error notificando a Subdirección Corporativa sobre comisión avalada: ${err?.message}`,
            );
          });
      }

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
    // 1. Transición automática atómica: regulares -> EN_AUTORIZACION, extemporáneas -> AUTORIZACION_DIRECCION
    try {
      const verificadas = await this.solicitudRepo.find({
        where: { estadoSolicitud: EstadoSolicitud.VERIFICADA },
      });

      if (verificadas.length > 0) {
        await this.dataSource.transaction(async (manager) => {
          for (const sol of verificadas) {
            if (sol.extemporanea) {
              sol.estadoSolicitud = EstadoSolicitud.AUTORIZACION_DIRECCION;
              await manager.getRepository(SolicitudComisionEntity).save(sol);

              await manager.getRepository(SolicitudHistorialEstadoEntity).save({
                solicitudId: sol.id,
                estadoAnterior: EstadoSolicitud.VERIFICADA,
                estadoNuevo: EstadoSolicitud.AUTORIZACION_DIRECCION,
                usuarioId: sol.revisorControlId || sol.creadoPorUsuarioId,
                comentarios:
                  'Enrutada a Dirección Nacional por condición de comisión EXTEMPORÁNEA (RF-AUT-002)',
              });
            } else {
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
          }
        });
        this.logger.log(
          `[RF-AUT-001/002] Se enrutaron ${verificadas.length} comisiones desde VERIFICADA`,
        );
      }
    } catch (err: any) {
      this.logger.warn(
        `[RF-AUT-001] Error en transición automática de VERIFICADA: ${err?.message}`,
      );
    }

    // 2. Consulta de bandeja
    const qb = this.solicitudRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.comisionado', 'c')
      .leftJoinAndSelect('s.analistaAsignado', 'a')
      .leftJoinAndSelect('s.revisorControl', 'rc')
      .leftJoinAndSelect('s.autorizador', 'aut')
      .leftJoinAndSelect('s.autorizadorDireccion', 'autDir')
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

    // Blindaje estricto: Las comisiones extemporáneas NO pueden llegar a la Subdirección
    // a menos que hayan sido previamente autorizadas formalmente por la Dirección Nacional.
    qb.andWhere(
      '(s.extemporanea = false OR (s.extemporanea = true AND s.decision_direccion = :decisionAut AND s.autorizador_direccion_id IS NOT NULL))',
      { decisionAut: 'AUTORIZADA' },
    );

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

    const autorizadorIds = Array.from(
      new Set(
        [
          ...items.map((i) => i.autorizadorId),
          ...items.map((i) => i.autorizadorDireccionId),
        ].filter(Boolean) as string[],
      ),
    );
    const autorizadoresMap = new Map<string, string>();
    if (autorizadorIds.length > 0 && typeof this.dataSource?.query === 'function') {
      try {
        const rowsAut: any[] = await this.dataSource.query(
          `SELECT u.id_user, u.username, p.nom_tercero, p.pri_apellido, p.nom_largo
           FROM auth."user" u
           LEFT JOIN auth.personas p ON p.id_person = u.id_person
           WHERE u.id_user = ANY($1)`,
          [autorizadorIds],
        );
        if (Array.isArray(rowsAut)) {
          for (const r of rowsAut) {
            const nombre =
              r.nom_largo ||
              [r.nom_tercero, r.pri_apellido].filter(Boolean).join(' ') ||
              r.username;
            autorizadoresMap.set(r.id_user, nombre);
          }
        }
      } catch (e) {
        this.logger.warn(`Error resolviendo nombres de autorizadores: ${e}`);
      }
    }

    const depMap = await this.obtenerMapDependencias();
    return {
      data: items.map((s) => {
        const idDep = s.idDependencia ?? s.comisionado?.idDependencia ?? null;
        const nomDep = idDep != null ? depMap.get(String(idDep)) : null;
        const depFinal = nomDep || (idDep != null ? `Dependencia #${idDep}` : 'Sede Central');
        return {
          id: s.id,
          consecutivoUnico: s.consecutivoUnico,
          idDependencia: idDep,
          dependencia: depFinal,
          nombreDependencia: depFinal,
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
                dependencia: depFinal,
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
        extemporanea: s.extemporanea,
        siifExportado: s.siifExportado,
        fechaExportacionSiif: s.fechaExportacionSiif,
        revisorControlId: s.revisorControlId,
        fechaSegundaRevision: s.fechaSegundaRevision,
        autorizadorId: s.autorizadorId,
        autorizadorNombre: s.autorizadorId ? (autorizadoresMap.get(s.autorizadorId) || null) : null,
        fechaAutorizacion: s.fechaAutorizacion,
        observacionesAutorizacion: s.observacionesAutorizacion,
        autorizadorDireccionId: s.autorizadorDireccionId,
        autorizadorDireccionNombre: s.autorizadorDireccionId ? (autorizadoresMap.get(s.autorizadorDireccionId) || null) : null,
        fechaAutorizacionDireccion: s.fechaAutorizacionDireccion,
        decisionDireccion: s.decisionDireccion,
        justificacionDireccion: s.justificacionDireccion,
        esDelegadoDireccion: s.esDelegadoDireccion,
        analistaAsignadoId: s.analistaAsignadoId,
        creadoPorUsuarioId: s.creadoPorUsuarioId,
        documentosSoporte: s.documentosSoporte || [],
        actualizadoEn: s.actualizadoEn,
      };
    }),
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

      // Blindaje: Si es extemporánea, la Subdirección NO puede autorizarla sin previa autorización de Dirección Nacional
      if (solicitud.extemporanea) {
        if (
          solicitud.decisionDireccion !== 'AUTORIZADA' ||
          !solicitud.autorizadorDireccionId ||
          !solicitud.fechaAutorizacionDireccion
        ) {
          throw new BadRequestException(
            'La comisión es extemporánea y no puede ser autorizada por la Subdirección sin la previa aprobación formal de la Dirección Nacional (RF-AUT-002).',
          );
        }
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

      // Blindaje: Si es extemporánea, no puede devolverse desde Subdirección si no ha pasado por Dirección Nacional
      if (solicitud.extemporanea && solicitud.decisionDireccion !== 'AUTORIZADA') {
        throw new BadRequestException(
          'La comisión es extemporánea y no se encuentra en el flujo de la Subdirección (pendiente de Dirección Nacional).',
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

      // 1. Notificación al Responsable de Tiquetes (si requiere tiquetes o como rol)
      if (solicitud.requiereTiquetes) {
        try {
          await this.notificationClient.notifyByPermission(
            'travel_expenses.general.es_responsable_tiquetes',
            {
              tipo_notificacion: 'VIATICOS_COMISION_AUTORIZADA_TIQUETES',
              titulo: `Comisión autorizada para tiquetes: ${consecutivo}`,
              mensaje: `La comisión ${consecutivo} con destino a ${destino} fue AUTORIZADA corporativamente. Requiere tiquetes. Proceder con emisión y reserva.`,
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
            },
            {
              subject: `[Viáticos ESAP] Comisión Autorizada Requiere Emisión de Tiquetes: ${consecutivo}`,
              html: buildTravelExpenseEmailHtml({
                destinatarioNombre: 'Responsable de Tiquetes',
                tituloHeader: 'ESAP — Gestión de Tiquetes',
                subtituloHeader: 'Emisión y Reserva de Tiquetes para Comisión Autorizada',
                mensajePrincipal: `La comisión <strong>${consecutivo}</strong> ha sido autorizada corporativamente y requiere gestión de tiquetes aéreos o terrestres:`,
                consecutivo,
                destino,
                nuevoEstado: 'AUTORIZADA',
                tipoNovedad: 'INFO',
                textoBoton: 'Gestionar Tiquetes',
              }),
              text: `La comisión ${consecutivo} fue autorizada y requiere emisión de tiquetes.`,
            },
            'RESPONSABLE_TIQUETES',
          );
        } catch (err: any) {
          this.logger.warn(`[notify] Error notificando a RESPONSABLE_TIQUETES: ${err?.message}`);
        }
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
          await this.notificationClient.notifyUser(
            solicitud.comisionadoId,
            {
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
            },
            correoPasajero
              ? {
                  subject: `[ESAP Viáticos] Comisión autorizada y confirmación de itinerario: ${consecutivo}`,
                  html: buildTravelExpenseEmailHtml({
                    destinatarioNombre: nombrePasajero || 'Comisionado(a)',
                    tituloHeader: 'ESAP — Módulo de Viáticos',
                    subtituloHeader: 'Autorización Corporativa de Gasto e Itinerario',
                    mensajePrincipal: `Nos complace informarle que su comisión de servicios <strong>${consecutivo}</strong> ha sido <strong>AUTORIZADA</strong> por la Subdirección de Gestión Corporativa:`,
                    consecutivo,
                    comisionadoNombre: nombrePasajero,
                    destino,
                    nuevoEstado: 'AUTORIZADA',
                    tipoNovedad: 'SUCCESS',
                    textoBoton: 'Acceder a la Plataforma',
                  }),
                  text: `Comisión ${consecutivo} autorizada con éxito hacia ${destino}.`,
                }
              : undefined,
          );
        } catch (err: any) {
          this.logger.warn(`[notify] Error notificando al comisionado: ${err?.message}`);
        }
      }

      // 3. Notificación al Enlace Creador
      if (solicitud.creadoPorUsuarioId && solicitud.creadoPorUsuarioId !== solicitud.comisionadoId) {
        try {
          await this.notificationClient.notifyUser(
            solicitud.creadoPorUsuarioId,
            {
              tipo_notificacion: 'VIATICOS_COMISION_AUTORIZADA_ENLACE',
              titulo: `Comisión autorizada por Subdirección: ${consecutivo}`,
              mensaje: `La solicitud de comisión ${consecutivo} para ${nombrePasajero || 'el comisionado'} fue autorizada formalmente por la Subdirección de Gestión Corporativa.`,
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
            },
            {
              subject: `[Viáticos ESAP] Comisión de Servicios Autorizada: ${consecutivo}`,
              html: buildTravelExpenseEmailHtml({
                destinatarioNombre: 'Enlace de Dependencia',
                tituloHeader: 'ESAP — Grupo de Viáticos',
                subtituloHeader: 'Autorización Formal Emitida',
                mensajePrincipal: `La solicitud de comisión <strong>${consecutivo}</strong> ha sido autorizada formalmente por la Subdirección y continuará su trámite ante Presupuesto para expedición de RP:`,
                consecutivo,
                comisionadoNombre: nombrePasajero,
                destino,
                nuevoEstado: 'AUTORIZADA',
                tipoNovedad: 'SUCCESS',
                textoBoton: 'Ver Expediente',
              }),
              text: `La comisión ${consecutivo} fue autorizada formalmente por la Subdirección.`,
            },
          );
        } catch (err: any) {
          this.logger.warn(`[notify] Error notificando al enlace: ${err?.message}`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`[notify] Error en despacharNotificacionesAutorizacion: ${err?.message}`);
    }
  }

  /**
   * Notifica la devolución efectuada por la Subdirección al analista y al enlace (in-app y correo).
   */
  private async despacharNotificacionesDevolucionAutorizacion(
    solicitud: SolicitudComisionEntity,
    observaciones: string,
  ): Promise<void> {
    try {
      const consecutivo = solicitud.consecutivoUnico || solicitud.id;
      const destino = `${solicitud.destinoCiudad || ''}${solicitud.destinoDepartamento ? ` (${solicitud.destinoDepartamento})` : ''}`.trim();
      const destinatarios = [solicitud.analistaAsignadoId, solicitud.creadoPorUsuarioId].filter(Boolean) as string[];

      for (const destId of Array.from(new Set(destinatarios))) {
        await this.notificationClient.notifyUser(
          destId,
          {
            tipo_notificacion: 'VIATICOS_DEVOLUCION_SUBDIRECCION',
            titulo: `Comisión devuelta por Subdirección: ${consecutivo}`,
            mensaje: `La Subdirección de Gestión Corporativa devolvió la comisión ${consecutivo}. Reparos: ${observaciones}`,
            descripcion_corta: `Devuelta Subdirección · ${consecutivo}`,
            icono: 'AlertTriangle',
            color: '#DC2626',
            prioridad: 'Alta',
            categoria: 'VIATICOS',
            tiene_accion: true,
            texto_boton_accion: 'Subsanar expediente',
            url_accion: '/viaticos',
            datos_adicionales: {
              solicitudId: solicitud.id,
              consecutivoUnico: consecutivo,
              observaciones,
            },
          },
          {
            subject: `[Viáticos ESAP] Comisión Devuelta por Subdirección Corporativa: ${consecutivo}`,
            html: buildTravelExpenseEmailHtml({
              destinatarioNombre: destId === solicitud.analistaAsignadoId ? 'Analista de Viáticos' : 'Enlace de Dependencia',
              tituloHeader: 'ESAP — Gestión Corporativa',
              subtituloHeader: 'Devolución de Expediente en Fase de Autorización',
              mensajePrincipal: `La comisión <strong>${consecutivo}</strong> ha sido devuelta por el Ordenador del Gasto con los siguientes reparos u observaciones:`,
              consecutivo,
              destino,
              nuevoEstado: 'EN VERIFICACIÓN',
              motivoUObservaciones: observaciones,
              tipoNovedad: 'DANGER',
              textoBoton: 'Revisar Observaciones',
            }),
            text: `La Subdirección devolvió la comisión ${consecutivo}. Motivo: ${observaciones}`,
          },
        );
      }
    } catch (err: any) {
      this.logger.warn(`[notify] Error enviando notificación de devolución de autorización: ${err?.message}`);
    }
  }

  /**
   * RF-AUT-002 — Obtener bandeja de comisiones extemporáneas para la Dirección Nacional (Etapa 6).
   *
   * Criterio de aceptación 1 (Gherkin):
   *   Dada una comisión marcada EXTEMPORÁNEA, cuando llega a autorización,
   *   entonces el sistema la enruta a la Dirección Nacional (no solo a la Subdirección).
   */
  async obtenerBandejaDireccionNacional(
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
    // 1. Transición atómica de solicitudes extemporáneas en VERIFICADA a AUTORIZACION_DIRECCION
    try {
      const extemporaneasVerificadas = await this.solicitudRepo.find({
        where: {
          estadoSolicitud: EstadoSolicitud.VERIFICADA,
          extemporanea: true,
        },
      });

      if (extemporaneasVerificadas.length > 0) {
        await this.dataSource.transaction(async (manager) => {
          for (const sol of extemporaneasVerificadas) {
            sol.estadoSolicitud = EstadoSolicitud.AUTORIZACION_DIRECCION;
            await manager.getRepository(SolicitudComisionEntity).save(sol);

            await manager.getRepository(SolicitudHistorialEstadoEntity).save({
              solicitudId: sol.id,
              estadoAnterior: EstadoSolicitud.VERIFICADA,
              estadoNuevo: EstadoSolicitud.AUTORIZACION_DIRECCION,
              usuarioId: sol.revisorControlId || sol.creadoPorUsuarioId,
              comentarios:
                'Enrutada a la Dirección Nacional para autorización de comisión extemporánea (RF-AUT-002)',
            });
          }
        });
        this.logger.log(
          `[RF-AUT-002] Se enrutaron ${extemporaneasVerificadas.length} comisiones extemporáneas a Dirección Nacional`,
        );
      }
    } catch (err: any) {
      this.logger.warn(
        `[RF-AUT-002] Error en transición a AUTORIZACION_DIRECCION: ${err?.message}`,
      );
    }

    // 2. Consulta de bandeja de comisiones extemporáneas
    const qb = this.solicitudRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.comisionado', 'c')
      .leftJoinAndSelect('s.analistaAsignado', 'a')
      .leftJoinAndSelect('s.revisorControl', 'rc')
      .leftJoinAndSelect('s.autorizador', 'aut')
      .leftJoinAndSelect('s.autorizadorDireccion', 'autDir')
      .leftJoinAndSelect('s.documentosSoporte', 'docs')
      .where('s.extemporanea = :ext', { ext: true });

    if (estado && estado !== 'TODOS') {
      if (Object.values(EstadoSolicitud).includes(estado as EstadoSolicitud)) {
        qb.andWhere('s.estadoSolicitud = :estado', { estado });
      }
    } else {
      qb.andWhere('s.estadoSolicitud IN (:...estados)', {
        estados: [
          EstadoSolicitud.AUTORIZACION_DIRECCION,
          EstadoSolicitud.EN_AUTORIZACION,
          EstadoSolicitud.AUTORIZADA,
          EstadoSolicitud.RECHAZADO,
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
         WHEN 'AUTORIZACION_DIRECCION' THEN 1
         WHEN 'EN_AUTORIZACION' THEN 2
         WHEN 'AUTORIZADA' THEN 3
         WHEN 'RECHAZADO' THEN 4
         ELSE 5
       END`,
      'ASC',
    );
    qb.addOrderBy('s.actualizadoEn', 'DESC');

    const take = Math.max(1, Math.min(100, Number(limit) || 20));
    const skip = (Math.max(1, Number(page) || 1) - 1) * take;
    qb.offset(skip).limit(take);

    const [items, total] = await Promise.all([qb.getMany(), qb.getCount()]);

    const autorizadorIds = Array.from(
      new Set(
        [
          ...items.map((i) => i.autorizadorId),
          ...items.map((i) => i.autorizadorDireccionId),
        ].filter(Boolean) as string[],
      ),
    );
    const autorizadoresMap = new Map<string, string>();
    if (autorizadorIds.length > 0 && typeof this.dataSource?.query === 'function') {
      try {
        const rowsAut: any[] = await this.dataSource.query(
          `SELECT u.id_user, u.username, p.nom_tercero, p.pri_apellido, p.nom_largo
           FROM auth."user" u
           LEFT JOIN auth.personas p ON p.id_person = u.id_person
           WHERE u.id_user = ANY($1)`,
          [autorizadorIds],
        );
        if (Array.isArray(rowsAut)) {
          for (const r of rowsAut) {
            const nombre =
              r.nom_largo ||
              [r.nom_tercero, r.pri_apellido].filter(Boolean).join(' ') ||
              r.username;
            autorizadoresMap.set(r.id_user, nombre);
          }
        }
      } catch (e) {
        this.logger.warn(`Error resolviendo nombres de autorizadores en Dirección Nacional: ${e}`);
      }
    }

    const depMap = await this.obtenerMapDependencias();
    return {
      data: items.map((s) => {
        const idDep = s.idDependencia ?? s.comisionado?.idDependencia ?? null;
        const nomDep = idDep != null ? depMap.get(String(idDep)) : null;
        const depFinal = nomDep || (idDep != null ? `Dependencia #${idDep}` : 'Sede Central');
        return {
          id: s.id,
          consecutivoUnico: s.consecutivoUnico,
          idDependencia: idDep,
          dependencia: depFinal,
          nombreDependencia: depFinal,
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
                dependencia: depFinal,
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
        extemporanea: s.extemporanea,
        motivoDevolucion: s.motivoDevolucion,
        siifExportado: s.siifExportado,
        revisorControlId: s.revisorControlId,
        fechaSegundaRevision: s.fechaSegundaRevision,
        autorizadorId: s.autorizadorId,
        autorizadorNombre: s.autorizadorId ? (autorizadoresMap.get(s.autorizadorId) || null) : null,
        fechaAutorizacion: s.fechaAutorizacion,
        observacionesAutorizacion: s.observacionesAutorizacion,
        autorizadorDireccionId: s.autorizadorDireccionId,
        autorizadorDireccionNombre: s.autorizadorDireccionId ? (autorizadoresMap.get(s.autorizadorDireccionId) || null) : null,
        fechaAutorizacionDireccion: s.fechaAutorizacionDireccion,
        decisionDireccion: s.decisionDireccion,
        justificacionDireccion: s.justificacionDireccion,
        esDelegadoDireccion: s.esDelegadoDireccion,
        analistaAsignadoId: s.analistaAsignadoId,
        creadoPorUsuarioId: s.creadoPorUsuarioId,
        documentosSoporte: s.documentosSoporte || [],
        actualizadoEn: s.actualizadoEn,
      };
    }),
    total,
      page: Number(page) || 1,
      limit: take,
    };
  }

  /**
   * RF-AUT-002 — Autorizar comisión extemporánea por la Dirección Nacional (Etapa 6).
   *
   * Criterio de aceptación 2 (Gherkin):
   *   Dada una extemporánea, cuando la Dirección Nacional la autoriza,
   *   entonces continúa el flujo normal de autorización corporativa (hacia Subdirección).
   */
  async autorizarComisionExtemporanea(
    solicitudId: string,
    usuarioId: string,
    rolesUsuario: string[],
    dto?: AutorizacionExtemporaneaDto,
  ): Promise<SolicitudComisionEntity> {
    if (!solicitudId) {
      throw new BadRequestException('solicitudId es obligatorio.');
    }

    const justificacion = (dto?.justificacion || '').trim();
    const esDelegado = Boolean(dto?.esDelegado);

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

      if (!solicitud.extemporanea) {
        throw new BadRequestException(
          'La comisión no está marcada como extemporánea. No aplica autorización de Dirección Nacional.',
        );
      }

      const estadosPermitidos = [
        EstadoSolicitud.AUTORIZACION_DIRECCION,
        EstadoSolicitud.VERIFICADA,
      ];
      if (!estadosPermitidos.includes(solicitud.estadoSolicitud)) {
        throw new BadRequestException(
          `Estado no válido para autorización de Dirección Nacional: ${solicitud.estadoSolicitud}. La comisión debe estar en AUTORIZACION_DIRECCION.`,
        );
      }

      const estadoAnterior = solicitud.estadoSolicitud;
      solicitud.estadoSolicitud = EstadoSolicitud.EN_AUTORIZACION;
      solicitud.autorizadorDireccionId = usuarioId;
      solicitud.fechaAutorizacionDireccion = new Date();
      solicitud.decisionDireccion = 'AUTORIZADA';
      solicitud.justificacionDireccion = justificacion ? justificacion.slice(0, 2000) : null;
      solicitud.esDelegadoDireccion = esDelegado;

      const saved = await manager
        .getRepository(SolicitudComisionEntity)
        .save(solicitud);

      await manager.getRepository(SolicitudHistorialEstadoEntity).save({
        solicitudId: solicitud.id,
        estadoAnterior,
        estadoNuevo: EstadoSolicitud.EN_AUTORIZACION,
        usuarioId,
        comentarios: `Autorizada excepcionalmente por Dirección Nacional ${esDelegado ? '(como Delegado)' : ''}: ${justificacion ? justificacion.slice(0, 255) : 'Comisión extemporánea avalada, continúa a Subdirección'}`,
      });

      this.logger.log(
        `[RF-AUT-002] Solicitud extemporánea ${solicitud.consecutivoUnico} AUTORIZADA por Dirección Nacional (usuario ${usuarioId})`,
      );

      return saved;
    });

    void this.despacharNotificacionesAutorizacionDireccion(result, justificacion, esDelegado);

    return result;
  }

  /**
   * RF-AUT-002 — Rechazar comisión extemporánea por la Dirección Nacional (Etapa 6).
   *
   * Criterio de aceptación 3 (Gherkin):
   *   Dada una extemporánea, cuando la Dirección Nacional la niega,
   *   entonces la comisión se rechaza con la justificación registrada.
   */
  async rechazarComisionExtemporanea(
    solicitudId: string,
    usuarioId: string,
    rolesUsuario: string[],
    dto: RechazoExtemporaneaDto,
  ): Promise<SolicitudComisionEntity> {
    if (!solicitudId) {
      throw new BadRequestException('solicitudId es obligatorio.');
    }

    const justificacion = (dto?.justificacion || '').trim();
    if (justificacion.length < 5) {
      throw new BadRequestException(
        'La justificación del rechazo es obligatoria (mínimo 5 caracteres).',
      );
    }
    const esDelegado = Boolean(dto?.esDelegado);

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

      if (!solicitud.extemporanea) {
        throw new BadRequestException(
          'La comisión no está marcada como extemporánea. No aplica decisión de Dirección Nacional.',
        );
      }

      const estadosPermitidos = [
        EstadoSolicitud.AUTORIZACION_DIRECCION,
        EstadoSolicitud.VERIFICADA,
      ];
      if (!estadosPermitidos.includes(solicitud.estadoSolicitud)) {
        throw new BadRequestException(
          `Estado no válido para rechazo de Dirección Nacional: ${solicitud.estadoSolicitud}. La comisión debe estar en AUTORIZACION_DIRECCION.`,
        );
      }

      const estadoAnterior = solicitud.estadoSolicitud;
      solicitud.estadoSolicitud = EstadoSolicitud.RECHAZADO;
      solicitud.autorizadorDireccionId = usuarioId;
      solicitud.fechaAutorizacionDireccion = new Date();
      solicitud.decisionDireccion = 'RECHAZADA';
      solicitud.justificacionDireccion = justificacion.slice(0, 2000);
      solicitud.motivoDevolucion = justificacion.slice(0, 2000);
      solicitud.esDelegadoDireccion = esDelegado;

      const saved = await manager
        .getRepository(SolicitudComisionEntity)
        .save(solicitud);

      await manager.getRepository(SolicitudHistorialEstadoEntity).save({
        solicitudId: solicitud.id,
        estadoAnterior,
        estadoNuevo: EstadoSolicitud.RECHAZADO,
        usuarioId,
        comentarios: `Negada y rechazada por Dirección Nacional ${esDelegado ? '(como Delegado)' : ''}: ${justificacion.slice(0, 255)}`,
      });

      this.logger.log(
        `[RF-AUT-002] Solicitud extemporánea ${solicitud.consecutivoUnico} RECHAZADA por Dirección Nacional (usuario ${usuarioId})`,
      );

      return saved;
    });

    void this.despacharNotificacionesRechazoDireccion(result, justificacion, esDelegado);

    return result;
  }

  /**
   * Helper para obtener el nombre completo legible del comisionado.
   */
  private getComisionadoNombre(c?: ComisionadoEntity | null): string {
    if (!c) return 'Servidor Comisionado';
    return (
      [c.primerNombre, c.segundoNombre, c.primerApellido, c.segundoApellido]
        .filter(Boolean)
        .join(' ') || 'Servidor Comisionado'
    );
  }

  /**
   * Notificaciones cuando la Dirección Nacional autoriza la extemporaneidad y pasa a Subdirección.
   */
  private async despacharNotificacionesAutorizacionDireccion(
    solicitud: SolicitudComisionEntity,
    justificacion: string,
    esDelegado: boolean,
  ): Promise<void> {
    try {
      const consecutivo = solicitud.consecutivoUnico || solicitud.id;
      const rolFirmante = esDelegado ? 'Delegado(a) de la Dirección Nacional' : 'Dirección Nacional';
      const comisionadoNombre = this.getComisionadoNombre(solicitud.comisionado);
      const destino = `${solicitud.destinoCiudad || ''}, ${solicitud.destinoDepartamento || ''}`.trim();
      const fechaInicio = solicitud.fechaInicio ? new Date(solicitud.fechaInicio).toISOString().split('T')[0] : undefined;
      const fechaFin = solicitud.fechaFin ? new Date(solicitud.fechaFin).toISOString().split('T')[0] : undefined;

      // 1. Notificación al Enlace Creador (In-app + Correo)
      if (solicitud.creadoPorUsuarioId) {
        const notifEnlace = {
          tipo_notificacion: 'VIATICOS_EXTEMPORANEA_AUTORIZADA',
          titulo: `Comisión extemporánea avalada: ${consecutivo}`,
          mensaje: `La solicitud ${consecutivo} fue autorizada de manera excepcional por ${rolFirmante}. Continúa a la Subdirección para autorización corporativa.`,
          descripcion_corta: `Aval Dirección · ${consecutivo}`,
          icono: 'Award',
          color: '#7C3AED',
          prioridad: 'Media' as const,
          categoria: 'VIATICOS',
          tiene_accion: true,
          texto_boton_accion: 'Ver estado',
          url_accion: '/viaticos',
          datos_adicionales: {
            solicitudId: solicitud.id,
            consecutivoUnico: consecutivo,
            justificacion,
          },
        };

        const emailEnlace = {
          asunto: `Comisión extemporánea avalada por Dirección: ${consecutivo}`,
          html: buildTravelExpenseEmailHtml({
            consecutivo,
            comisionadoNombre,
            destino,
            fechaInicio,
            fechaFin,
            estadoBadge: 'AVAL EXCEPCIONAL DIRECCIÓN',
            badgeColor: '#7C3AED',
            mensajePrincipal: `La solicitud <strong>${consecutivo}</strong> ha sido avalada excepcionalmente por <strong>${rolFirmante}</strong> y continúa su trámite hacia la Subdirección de Gestión Corporativa.`,
            observaciones: `Justificación del aval: ${justificacion}`,
            botonTexto: 'Consultar Expediente',
            botonUrl: '/viaticos',
          }),
        };

        await this.notificationClient.notifyUser(solicitud.creadoPorUsuarioId, notifEnlace, emailEnlace);
      }

      // 2. Notificación a la bandeja de Subdirección de Gestión Corporativa (In-app + Correo por permiso inmutable)
      const notifSub = {
        tipo_notificacion: 'VIATICOS_EXTEMPORANEA_EN_SUBDIRECCION',
        titulo: `Nueva comisión extemporánea para visto bueno: ${consecutivo}`,
        mensaje: `La comisión ${consecutivo} cuenta con aval excepcional de ${rolFirmante} y se encuentra en su bandeja para visto bueno de gasto e itinerario.`,
        descripcion_corta: `Extemporánea en bandeja · ${consecutivo}`,
        icono: 'FileCheck',
        color: '#4F46E5',
        prioridad: 'Alta' as const,
        categoria: 'VIATICOS',
        tiene_accion: true,
        texto_boton_accion: 'Revisar comisión',
        url_accion: '/viaticos',
        datos_adicionales: {
          solicitudId: solicitud.id,
          consecutivoUnico: consecutivo,
          autorizadoPorDireccion: true,
        },
      };

      const emailSub = {
        asunto: `Nueva comisión extemporánea para visto bueno: ${consecutivo}`,
        html: buildTravelExpenseEmailHtml({
          consecutivo,
          comisionadoNombre,
          destino,
          fechaInicio,
          fechaFin,
          estadoBadge: 'EN BANDEJA SUBDIRECCIÓN',
          badgeColor: '#4F46E5',
          mensajePrincipal: `La comisión <strong>${consecutivo}</strong> cuenta con aval excepcional de la Dirección Nacional y requiere su visto bueno corporativo de gasto e itinerario.`,
          observaciones: `Justificación Dirección: ${justificacion}`,
          botonTexto: 'Revisar en Plataforma',
          botonUrl: '/viaticos',
        }),
      };

      await this.notificationClient.notifyByPermission(
        'travel_expenses.general.es_subdireccion_corporativa',
        notifSub,
        emailSub,
        'SUBDIRECCION_GESTION_CORPORATIVA',
      );
    } catch (err: any) {
      this.logger.warn(`[notify] Error en despacharNotificacionesAutorizacionDireccion: ${err?.message}`);
    }
  }

  /**
   * Notificaciones cuando la Dirección Nacional niega y rechaza la comisión extemporánea.
   */
  private async despacharNotificacionesRechazoDireccion(
    solicitud: SolicitudComisionEntity,
    justificacion: string,
    esDelegado: boolean,
  ): Promise<void> {
    try {
      const consecutivo = solicitud.consecutivoUnico || solicitud.id;
      const rolFirmante = esDelegado ? 'Delegado(a) de la Dirección Nacional' : 'Dirección Nacional';
      const comisionadoNombre = this.getComisionadoNombre(solicitud.comisionado);
      const destino = `${solicitud.destinoCiudad || ''}, ${solicitud.destinoDepartamento || ''}`.trim();
      const fechaInicio = solicitud.fechaInicio ? new Date(solicitud.fechaInicio).toISOString().split('T')[0] : undefined;
      const fechaFin = solicitud.fechaFin ? new Date(solicitud.fechaFin).toISOString().split('T')[0] : undefined;

      const notifRechazo = {
        tipo_notificacion: 'VIATICOS_EXTEMPORANEA_RECHAZADA',
        titulo: `Comisión extemporánea rechazada: ${consecutivo}`,
        mensaje: `La solicitud ${consecutivo} fue rechazada por ${rolFirmante}. Motivo: ${justificacion}`,
        descripcion_corta: `Rechazada Dirección · ${consecutivo}`,
        icono: 'AlertTriangle',
        color: '#DC2626',
        prioridad: 'Alta' as const,
        categoria: 'VIATICOS',
        tiene_accion: true,
        texto_boton_accion: 'Ver solicitud',
        url_accion: '/viaticos',
        datos_adicionales: {
          solicitudId: solicitud.id,
          consecutivoUnico: consecutivo,
          motivo: justificacion,
        },
      };

      const emailRechazo = {
        asunto: `Comisión extemporánea rechazada por Dirección: ${consecutivo}`,
        html: buildTravelExpenseEmailHtml({
          consecutivo,
          comisionadoNombre,
          destino,
          fechaInicio,
          fechaFin,
          estadoBadge: 'RECHAZADA',
          badgeColor: '#DC2626',
          mensajePrincipal: `La solicitud <strong>${consecutivo}</strong> ha sido rechazada por <strong>${rolFirmante}</strong> y no continuará su trámite.`,
          observaciones: `Motivo del rechazo: ${justificacion}`,
          botonTexto: 'Ver Expediente',
          botonUrl: '/viaticos',
        }),
      };

      // 1. Notificación al Enlace Creador
      if (solicitud.creadoPorUsuarioId) {
        await this.notificationClient.notifyUser(solicitud.creadoPorUsuarioId, notifRechazo, emailRechazo);
      }

      // 2. Correo directo al Comisionado si tiene email configurado
      if (solicitud.comisionado?.email && solicitud.comisionado.email.includes('@')) {
        await this.notificationClient.sendEmail({
          to: solicitud.comisionado.email,
          subject: emailRechazo.asunto,
          html: emailRechazo.html,
          text: notifRechazo.mensaje,
        });
      }
    } catch (err: any) {
      this.logger.warn(`[notify] Error en despacharNotificacionesRechazoDireccion: ${err?.message}`);
    }
  }

  /**
   * RF-AUT-003 — Cancelar comisión con trazabilidad completa (Etapa 6).
   *
   * Criterios de aceptación (Gherkin):
   * 1. Dada una comisión en curso, cuando la dependencia solicita cancelarla,
   *    entonces el sistema permite registrar la cancelación con motivo y responsable.
   * 2. Dada una cancelación, cuando se confirma, entonces la comisión pasa a
   *    estado CANCELADA y se conserva toda su trazabilidad en el historial inmutable.
   * 3. Dada una comisión con recursos ya comprometidos, cuando se cancela,
   *    entonces el sistema señala la necesidad de reintegro/liberación (se conecta con Etapa 8).
   *
   * Aplicabilidad: Todas las comisiones no legalizadas.
   */
  async cancelarComision(
    solicitudId: string,
    usuarioId: string,
    rolesUsuario: string[],
    dto: CancelarComisionDto,
  ): Promise<SolicitudComisionEntity> {
    if (!solicitudId) {
      throw new BadRequestException('solicitudId es obligatorio.');
    }

    const motivo = (dto?.motivoCancelacion || '').trim();
    if (motivo.length < 5) {
      throw new BadRequestException(
        'El motivo de cancelación es obligatorio (mínimo 5 caracteres).',
      );
    }

    const responsable =
      (dto?.responsableCancelacion || '').trim() || 'Dependencia solicitante / Grupo de Viáticos';

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

      if (solicitud.estadoSolicitud === EstadoSolicitud.CANCELADA) {
        throw new BadRequestException('La comisión ya se encuentra cancelada.');
      }

      if (solicitud.estadoSolicitud === EstadoSolicitud.LEGALIZADO) {
        throw new BadRequestException(
          'No es posible cancelar una comisión que ya ha sido legalizada.',
        );
      }

      // Estados con recursos presupuestales o pasajes ya comprometidos (Criterio 3)
      const estadosRecursosComprometidos: EstadoSolicitud[] = [
        EstadoSolicitud.SOLICITADA_SIIF,
        EstadoSolicitud.AUTORIZADA,
        EstadoSolicitud.RESOLUCION_EMITIDA,
        EstadoSolicitud.TIQUETES_COMPRADOS,
        EstadoSolicitud.EN_COMISION,
        EstadoSolicitud.PENDIENTE_LEGALIZACION,
      ];

      const tieneRecursosComprometidos =
        dto.recursosComprometidos === true ||
        solicitud.siifExportado === true ||
        estadosRecursosComprometidos.includes(solicitud.estadoSolicitud);

      const estadoAnterior = solicitud.estadoSolicitud;
      const fechaCancelacion = new Date();

      solicitud.estadoSolicitud = EstadoSolicitud.CANCELADA;
      solicitud.motivoCancelacion = motivo.slice(0, 2000);
      solicitud.fechaCancelacion = fechaCancelacion;
      solicitud.canceladoPorUsuarioId = usuarioId;
      solicitud.responsableCancelacion = responsable.slice(0, 255);
      solicitud.pendienteReintegro = tieneRecursosComprometidos;

      const saved = await manager
        .getRepository(SolicitudComisionEntity)
        .save(solicitud);

      const notaReintegro = tieneRecursosComprometidos
        ? ' [RECURSOS COMPROMETIDOS: Requiere reintegro / liberación presupuestal en SIIF Nación - Etapa 8 / RF-PAG-004]'
        : '';

      await manager.getRepository(SolicitudHistorialEstadoEntity).save({
        solicitudId: solicitud.id,
        estadoAnterior,
        estadoNuevo: EstadoSolicitud.CANCELADA,
        usuarioId,
        comentarios: `Cancelada por ${responsable}: ${motivo.slice(0, 140)}${notaReintegro}`.slice(0, 255),
      });

      // 1. Sin recursos comprometidos (Etapas 1 a 5 - Antes de RP/Desembolso):
      // Libera cualquier cupo de tiquetes retenido en el tablero de saldo presupuestal.
      if (
        !tieneRecursosComprometidos &&
        solicitud.requiereTiquetes &&
        Number(solicitud.costoEstimadoTiquete || 0) > 0 &&
        this.ticketsService?.liberarSaldo
      ) {
        try {
          const depId =
            solicitud.idDependencia ?? solicitud.comisionado?.idDependencia ?? 1;
          await this.ticketsService.liberarSaldo({
            dependenciaId: String(depId),
            solicitudId: solicitud.id,
            montoEstimadoTiquete: Number(solicitud.costoEstimadoTiquete),
          });
          this.logger.log(
            `[RF-AUT-003] Cupo de tiquetes liberado exitosamente en saldo presupuestal para solicitud ${solicitud.consecutivoUnico || solicitud.id} en dependencia ${depId}`,
          );
        } catch (err: any) {
          this.logger.warn(
            `[RF-AUT-003] No se pudo liberar saldo de tiquetes para solicitud ${solicitud.id}: ${err?.message}`,
          );
        }
      }

      this.logger.log(
        `[RF-AUT-003] Solicitud ${solicitud.consecutivoUnico} CANCELADA por ${responsable} (usuario ${usuarioId}). Pendiente de reintegro: ${tieneRecursosComprometidos}`,
      );

      return saved;
    });

    await this.despacharNotificacionesCancelacion(
      result,
      motivo,
      responsable,
      result.pendienteReintegro,
    );

    return result;
  }

  /**
   * Notificaciones cuando una comisión es cancelada (RF-AUT-003).
   * - Alerta al enlace creador sobre la cancelación.
   * - Si hay recursos comprometidos o desembolsados (Etapas 6 a 8), activa novedad
   *   y notifica a Tesorería y Presupuesto para reintegro de viáticos y liberación de RP en SIIF Nación (RF-PAG-004).
   */
  private async despacharNotificacionesCancelacion(
    solicitud: SolicitudComisionEntity,
    motivo: string,
    responsable: string,
    pendienteReintegro: boolean,
  ): Promise<void> {
    try {
      const consecutivo = solicitud.consecutivoUnico || solicitud.id;
      const comisionadoNombre = this.getComisionadoNombre(solicitud.comisionado);
      const destino = `${solicitud.destinoCiudad || ''}, ${solicitud.destinoDepartamento || ''}`.trim();
      const fechaInicio = solicitud.fechaInicio ? new Date(solicitud.fechaInicio).toISOString().split('T')[0] : undefined;
      const fechaFin = solicitud.fechaFin ? new Date(solicitud.fechaFin).toISOString().split('T')[0] : undefined;

      const notifCancelacion = {
        tipo_notificacion: 'VIATICOS_COMISION_CANCELADA',
        titulo: `Comisión cancelada: ${consecutivo}`,
        mensaje: `La comisión ${consecutivo} ha sido cancelada por ${responsable}. Motivo: ${motivo}`,
        descripcion_corta: `Cancelada · ${consecutivo}`,
        icono: 'XCircle',
        color: '#DC2626',
        prioridad: 'Alta' as const,
        categoria: 'VIATICOS',
        tiene_accion: true,
        texto_boton_accion: 'Ver expediente',
        url_accion: '/viaticos',
        datos_adicionales: {
          solicitudId: solicitud.id,
          consecutivoUnico: consecutivo,
          motivo,
          responsable,
          pendienteReintegro,
        },
      };

      const emailCancelacion = {
        asunto: `Comisión de servicios cancelada: ${consecutivo}`,
        html: buildTravelExpenseEmailHtml({
          consecutivo,
          comisionadoNombre,
          destino,
          fechaInicio,
          fechaFin,
          estadoBadge: 'CANCELADA',
          badgeColor: '#DC2626',
          mensajePrincipal: `La comisión de servicios <strong>${consecutivo}</strong> ha sido cancelada en plataforma por <strong>${responsable}</strong>.`,
          observaciones: `Motivo: ${motivo}${pendienteReintegro ? ' (Se activa novedad de reintegro y anulación RP)' : ''}`,
          botonTexto: 'Consultar Expediente',
          botonUrl: '/viaticos',
        }),
      };

      // 1. Notificación al usuario que radicó la solicitud
      if (solicitud.creadoPorUsuarioId) {
        await this.notificationClient.notifyUser(solicitud.creadoPorUsuarioId, notifCancelacion, emailCancelacion);
      }

      // Notificación directa por correo al comisionado si tiene email registrado
      if (solicitud.comisionado?.email && solicitud.comisionado.email.includes('@')) {
        await this.notificationClient.sendEmail({
          to: solicitud.comisionado.email,
          subject: emailCancelacion.asunto,
          html: emailCancelacion.html,
          text: notifCancelacion.mensaje,
        });
      }

      // 2. Con recursos comprometidos o desembolsados (Etapas 6 a 8 - Con RP, Obligación o Pago realizado):
      // Activa de forma automática una novedad de reintegro y liberación de recursos (RF-NOV / RF-PAG-004).
      // Notifica a Tesorería y Presupuesto para que el comisionado reintegre los viáticos anticipados
      // y se anule/libere el Registro Presupuestal (RP) en SIIF Nación.
      if (pendienteReintegro) {
        const notifNovedad = {
          tipo_notificacion: 'VIATICOS_REINTEGRO_LIBERACION_RECURSOS',
          titulo: `Novedad de reintegro y anulación RP SIIF: ${consecutivo}`,
          mensaje: `La comisión ${consecutivo} fue cancelada con recursos comprometidos o desembolsados. Se activa novedad de reintegro de viáticos y anulación/liberación de Registro Presupuestal (RP) en SIIF Nación (RF-NOV / RF-PAG-004).`,
          descripcion_corta: `Reintegro y RP SIIF · ${consecutivo}`,
          icono: 'RotateCcw',
          color: '#D97706',
          prioridad: 'Alta' as const,
          categoria: 'VIATICOS',
          tiene_accion: true,
          texto_boton_accion: 'Gestionar reintegro',
          url_accion: '/viaticos',
          datos_adicionales: {
            solicitudId: solicitud.id,
            consecutivoUnico: consecutivo,
            motivo,
            responsable,
            pendienteReintegro: true,
            novedad: 'RF-PAG-004',
          },
        };

        const emailNovedad = {
          asunto: `[SIIF Novedad] Reintegro y anulación RP: ${consecutivo}`,
          html: buildTravelExpenseEmailHtml({
            consecutivo,
            comisionadoNombre,
            destino,
            fechaInicio,
            fechaFin,
            estadoBadge: 'REINTEGRO Y LIBERACIÓN SIIF',
            badgeColor: '#D97706',
            mensajePrincipal: `La comisión <strong>${consecutivo}</strong> fue cancelada con recursos comprometidos o desembolsados. Se requiere gestionar reintegro de viáticos y/o liberación de RP en SIIF Nación.`,
            observaciones: `Motivo: ${motivo} | Responsable cancelación: ${responsable}`,
            botonTexto: 'Gestionar en Plataforma',
            botonUrl: '/viaticos',
          }),
        };

        // Notificaciones directas a Tesorería, Presupuesto, Control de Viáticos y Subdirección mediante permisos inmutables
        await this.notificationClient.notifyByPermission(
          'travel_expenses.general.es_tesoreria',
          notifNovedad,
          emailNovedad,
          'TESORERIA',
        );
        await this.notificationClient.notifyByPermission(
          'travel_expenses.general.es_presupuesto',
          notifNovedad,
          emailNovedad,
          'PRESUPUESTO',
        );
        await this.notificationClient.notifyByPermission(
          'travel_expenses.general.es_control_viaticos',
          notifNovedad,
          emailNovedad,
          'CONTROL_VIATICOS',
        );
        await this.notificationClient.notifyByPermission(
          'travel_expenses.general.es_subdireccion_corporativa',
          notifNovedad,
          emailNovedad,
          'SUBDIRECCION_GESTION_CORPORATIVA',
        );
      }
    } catch (err: any) {
      this.logger.warn(`[notify] Error en despacharNotificacionesCancelacion: ${err?.message}`);
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

    const autorizadorNombre = await this.resolverNombreUsuario(
      solicitud.autorizadorId,
      solicitud.autorizador?.username || 'Subdirección de Gestión Corporativa',
    );

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

      const sanitizarTexto = (texto: string | null | undefined): string => {
        return this.sanitizarTextoPdf(texto);
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
        doc.text(sanitizarTexto(value) || 'N/A');
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

      const nombreCompleto = sanitizarTexto(
        [
          comisionado?.primerNombre,
          comisionado?.segundoNombre,
          comisionado?.primerApellido,
          comisionado?.segundoApellido,
        ]
          .filter(Boolean)
          .join(' '),
      );

      const esAprobadaItinerario =
        [
          EstadoSolicitud.AUTORIZADA,
          EstadoSolicitud.EN_PRESUPUESTO,
          EstadoSolicitud.COMPROMETIDA,
          EstadoSolicitud.OBLIGADA,
          EstadoSolicitud.PAGADA,
          EstadoSolicitud.RESOLUCION_EMITIDA,
          EstadoSolicitud.TIQUETES_COMPRADOS,
          EstadoSolicitud.EN_COMISION,
          EstadoSolicitud.PENDIENTE_LEGALIZACION,
          EstadoSolicitud.LEGALIZADO,
        ].includes(solicitud.estadoSolicitud) ||
        Boolean(solicitud.fechaAutorizacion);

      drawHeader();

      doc.fontSize(14).font('Helvetica-Bold');
      doc.fillColor('#003DA5');
      doc.text('AUTORIZACIÓN CORPORATIVA DE GASTO E ITINERARIO DE VIAJE', {
        align: 'center',
      });
      doc.fontSize(10).font('Helvetica-Bold');
      doc.fillColor(
        esAprobadaItinerario
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

      if (Array.isArray(solicitud.itinerario) && solicitud.itinerario.length > 0) {
        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#003DA5').text('Desglose de Rutas y Horarios Militares Estimados:');
        doc.moveDown(0.2);
        solicitud.itinerario.forEach((tramo: any, idx: number) => {
          const trayectoStr = tramo.tipoTrayecto === 'IDA_Y_VUELTA' ? 'Ida y Vuelta' : 'Solo Ida';
          const horarioStr = tramo.horarioEstimadoMilitar ? ` · Hora Militar: ${tramo.horarioEstimadoMilitar}` : '';
          const diasStr = tramo.diasRuta ? ` (${tramo.diasRuta} d)` : '';
          const transporteStr = tramo.tipoTransporte ? ` [${tramo.tipoTransporte}]` : '';
          doc
            .font('Helvetica')
            .fontSize(8.5)
            .fillColor('#334155')
            .text(
              `  Tramo ${idx + 1}: ${tramo.origenCiudad || 'Origen'} -> ${tramo.destinoCiudad || 'Destino'} (${trayectoStr}) | Del ${tramo.fechaSalida || 'N/A'} al ${tramo.fechaLlegada || 'N/A'}${diasStr}${horarioStr}${transporteStr}`,
            );
        });
      }
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
      doc.moveDown(1.2);

      // Posicionamiento seguro del bloque de firmas hacia el tercio inferior
      // garantizando separación vertical adecuada sin sobreponerse con la sección 4
      const yStampTop = Math.max(doc.y + 35, 560);
      const stampHeight = 44;
      const yFirmas = yStampTop + stampHeight + 20;

      if (esAprobadaItinerario) {
        // Sello visual digital APROBADO para la Subdirección
        doc
          .roundedRect(60, yStampTop, 180, stampHeight, 4)
          .lineWidth(1)
          .strokeColor('#15803D')
          .fillAndStroke('#F0FDF4', '#15803D');

        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#15803D');
        doc.text('ESTADO: APROBADO', 60, yStampTop + 6, {
          width: 180,
          align: 'center',
        });
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#14532D');
        doc.text(sanitizarTexto(`Aprobado por: ${autorizadorNombre}`), 60, yStampTop + 18, {
          width: 180,
          align: 'center',
        });
        doc.fontSize(6.5).font('Helvetica').fillColor('#166534');
        doc.text(
          `Visto Bueno Corporativo · ${formatDate(solicitud.fechaAutorizacion)}`,
          60,
          yStampTop + 29,
          { width: 180, align: 'center' },
        );
      }

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

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#334155');
      doc.text(sanitizarTexto(autorizadorNombre), 60, yFirmas + 6, {
        width: 180,
        align: 'center',
      });
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#003DA5');
      doc.text('Subdirector(a) de Gestión Corporativa', 60, yFirmas + 18, {
        width: 180,
        align: 'center',
      });
      doc.fontSize(6.5).font('Helvetica').fillColor('#64748b');
      doc.text('Firma y Visto Bueno Institucional', 60, yFirmas + 28, {
        width: 180,
        align: 'center',
      });

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#334155');
      doc.text(nombreCompleto || 'Firma Comisionado', 320, yFirmas + 6, {
        width: 180,
        align: 'center',
      });
      doc.fontSize(7.5).font('Helvetica').fillColor('#64748b');
      doc.text('Comisionado / Pasajero', 320, yFirmas + 18, {
        width: 180,
        align: 'center',
      });
      doc.fontSize(6.5).font('Helvetica').fillColor('#64748b');
      doc.text(
        `C.C. ${comisionado?.numeroDocumento || 'N/A'}`,
        320,
        yFirmas + 28,
        { width: 180, align: 'center' },
      );

      doc.end();
    });
  }

  /**
   * Validador y generador de nomenclatura Fecha_RP_Número (RF-PRE-001).
   * Admite:
   *   YYYY-MM-DD_RP_NUMERO (ej. 2026-09-16_RP_12345)
   *   YYYYMMDD_RP_NUMERO   (ej. 20260916_RP_12345)
   */
  validarYFormatearNomenclaturaRp(
    fechaRp: string,
    numeroRp: string,
    codigoRpSuministrado?: string,
  ): string {
    const fechaLimpia = (fechaRp || '').split('T')[0].trim();
    const numLimpio = (numeroRp || '').trim();

    if (!numLimpio) {
      throw new BadRequestException('El número de RP es obligatorio.');
    }

    if (codigoRpSuministrado && codigoRpSuministrado.trim()) {
      const cod = codigoRpSuministrado.trim();
      const regexNomenclatura = /^\d{4}-?\d{2}-?\d{2}_RP_[A-Za-z0-9\-_]+$/i;
      if (!regexNomenclatura.test(cod)) {
        throw new BadRequestException(
          `La nomenclatura '${cod}' es inválida. Debe respetar el formato Fecha_RP_Número (ej. ${fechaLimpia}_RP_${numLimpio}).`,
        );
      }
      return cod;
    }

    // Generar formato estándar Fecha_RP_Número
    return `${fechaLimpia}_RP_${numLimpio}`;
  }

  /**
   * RF-PRE-003: Determinar días hábiles en Colombia disponibles antes del viaje.
   * Excluye sábados (6), domingos (0) y días festivos registrados en travel_expenses.festivos_colombia.
   *
   * @param fechaReferencia Fecha de expedición del RP o fecha de corte actual (excluida del cómputo).
   * @param fechaInicioViaje Fecha de inicio de la comisión de servicios.
   * @returns Cantidad de días hábiles completos antes del inicio del viaje (entero >= 0).
   */
  async calcularDiasHabilesPrevios(
    fechaReferencia: Date | string,
    fechaInicioViaje: Date | string,
  ): Promise<number> {
    if (!fechaReferencia || !fechaInicioViaje) {
      return 0;
    }

    const parseToUtcDate = (val: Date | string): Date => {
      if (typeof val === 'string') {
        const clean = val.split('T')[0].trim();
        const parts = clean.split('-');
        if (parts.length === 3) {
          return new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
        }
      }
      const d = new Date(val);
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    };

    const inicio = parseToUtcDate(fechaReferencia);
    const fin = parseToUtcDate(fechaInicioViaje);

    // Si la comisión inicia en la misma fecha o ya inició en el pasado, no hay días hábiles disponibles
    if (fin.getTime() <= inicio.getTime()) {
      return 0;
    }

    // Obtener festivos de Colombia
    const festivosSet = new Set<string>();
    try {
      const festivoRepo = this.dataSource.getRepository(FestivoColombiaEntity);
      const festivos = await festivoRepo.find();
      if (Array.isArray(festivos)) {
        festivos.forEach((f) => {
          if (f.fecha) {
            const fStr =
              typeof f.fecha === 'string'
                ? f.fecha.slice(0, 10)
                : new Date(f.fecha).toISOString().slice(0, 10);
            festivosSet.add(fStr);
          }
        });
      }
    } catch (err: any) {
      this.logger.warn(
        `[calcularDiasHabilesPrevios] No se pudieron consultar festivos en BD: ${err?.message}`,
      );
    }

    let diasHabiles = 0;
    // Cursor avanza desde el día siguiente a la fecha de referencia hasta estrictamente antes de fechaInicioViaje
    const cursor = new Date(inicio.getTime());
    cursor.setUTCDate(cursor.getUTCDate() + 1);

    while (cursor.getTime() < fin.getTime()) {
      const dayOfWeek = cursor.getUTCDay(); // 0 = Domingo, 6 = Sábado
      const isoDate = cursor.toISOString().slice(0, 10);

      const esFinDeSemana = dayOfWeek === 0 || dayOfWeek === 6;
      const esFestivo = festivosSet.has(isoDate);

      if (!esFinDeSemana && !esFestivo) {
        diasHabiles++;
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return diasHabiles;
  }

  /**
   * RF-PRE-003: Determinar modalidad de pago según los días hábiles previos disponibles.
   * Regla de negocio institucional ESAP:
   *   - Si diasHabiles >= umbral (por defecto 5 días hábiles): AVANCE (pago anticipado).
   *   - Si diasHabiles < umbral: RECONOCIMIENTO_POSTERIOR (reembolso posterior a la comisión).
   */
  determinarModalidadPago(
    diasHabiles: number,
    umbral: number = DIAS_HABILES_MINIMOS_AVANCE_DEFAULT,
  ): 'AVANCE' | 'RECONOCIMIENTO_POSTERIOR' {
    if (diasHabiles >= umbral) {
      return 'AVANCE';
    }
    return 'RECONOCIMIENTO_POSTERIOR';
  }

  /**
   * RF-PRE-003: Previsualizar modalidad de pago para una comisión antes de expedir el RP.
   */
  async previsualizarModalidadPago(
    solicitudId: string,
    fechaRp?: string,
  ): Promise<{
    solicitudId: string;
    consecutivoUnico: string;
    fechaReferencia: string;
    fechaInicioComision: string;
    diasHabilesPrevios: number;
    modalidadPago: 'AVANCE' | 'RECONOCIMIENTO_POSTERIOR';
    umbralMinimoAvance: number;
  }> {
    const solicitud = await this.solicitudRepo.findOne({ where: { id: solicitudId } });
    if (!solicitud) {
      throw new NotFoundException(`Solicitud de comisión no encontrada: ${solicitudId}`);
    }

    const fechaRef = fechaRp && fechaRp.trim() ? fechaRp.trim() : new Date().toISOString().slice(0, 10);
    const diasHabiles = await this.calcularDiasHabilesPrevios(fechaRef, solicitud.fechaInicio);
    const modalidad = this.determinarModalidadPago(diasHabiles);

    const formatIso = (v: any) =>
      typeof v === 'string' ? v.slice(0, 10) : new Date(v).toISOString().slice(0, 10);

    return {
      solicitudId: solicitud.id,
      consecutivoUnico: solicitud.consecutivoUnico,
      fechaReferencia: typeof fechaRef === 'string' ? fechaRef.slice(0, 10) : formatIso(fechaRef),
      fechaInicioComision: formatIso(solicitud.fechaInicio),
      diasHabilesPrevios: diasHabiles,
      modalidadPago: modalidad,
      umbralMinimoAvance: DIAS_HABILES_MINIMOS_AVANCE_DEFAULT,
    };
  }

  /**
   * RF-PRE-001 — Enviar paquete de comisión autorizada al Grupo de Presupuesto (Etapa 7).
   *
   * Criterio 1 (Gherkin):
   *   Dada una comisión AUTORIZADA, Cuando el analista envía el paquete a Presupuesto,
   *   Entonces aparece en la bandeja del Grupo de Presupuesto.
   */
  async enviarPaquetePresupuesto(
    solicitudId: string,
    usuarioId: string,
    roles: string[] = [],
    dto?: EnviarPresupuestoDto,
  ): Promise<SolicitudComisionEntity> {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
      relations: ['comisionado'],
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud de comisión no encontrada: ${solicitudId}`);
    }

    if (solicitud.estadoSolicitud !== EstadoSolicitud.AUTORIZADA) {
      throw new BadRequestException(
        `Solo las comisiones en estado AUTORIZADA pueden ser enviadas al Grupo de Presupuesto. Estado actual: ${solicitud.estadoSolicitud}`,
      );
    }

    const estadoAnterior = solicitud.estadoSolicitud;
    // Mantiene el estado oficial AUTORIZADA marcando el envío al Grupo de Presupuesto
    solicitud.enviadoPresupuesto = true;
    solicitud.fechaEnvioPresupuesto = new Date();
    solicitud.enviadoPresupuestoPorId = usuarioId;
    if (dto?.observaciones) {
      solicitud.observacionesEnvioPresupuesto = dto.observaciones.trim();
    }

    const guardada = await this.solicitudRepo.save(solicitud);

    await this.dataSource.getRepository(SolicitudHistorialEstadoEntity).save({
      solicitudId: solicitud.id,
      estadoAnterior,
      estadoNuevo: solicitud.estadoSolicitud,
      usuarioId,
      motivo: `[RF-PRE-001] Paquete de comisión remitido al Grupo de Presupuesto para expedición de RP en SIIF Nación.${dto?.observaciones ? ` Observaciones: ${dto.observaciones.trim()}` : ''}`,
    });

    // Notificar al rol PRESUPUESTO mediante permiso inmutable (In-app + Correo)
    try {
      const consecutivo = solicitud.consecutivoUnico || solicitud.id;
      const comisionadoNombre = this.getComisionadoNombre(solicitud.comisionado);
      const destino = `${solicitud.destinoCiudad || ''}, ${solicitud.destinoDepartamento || ''}`.trim();
      const fechaInicio = solicitud.fechaInicio ? new Date(solicitud.fechaInicio).toISOString().split('T')[0] : undefined;
      const fechaFin = solicitud.fechaFin ? new Date(solicitud.fechaFin).toISOString().split('T')[0] : undefined;

      const notifPresupuesto = {
        tipo_notificacion: 'VIATICOS_COMISION_EN_PRESUPUESTO',
        titulo: `Nueva comisión para expedición de RP: ${consecutivo}`,
        mensaje: `La comisión ${consecutivo} con destino a ${destino} fue enviada a Presupuesto para expedición de Registro Presupuestal en SIIF Nación.`,
        descripcion_corta: `En Presupuesto · ${consecutivo}`,
        icono: 'Receipt',
        color: '#059669',
        prioridad: 'Media' as const,
        categoria: 'VIATICOS',
        tiene_accion: true,
        texto_boton_accion: 'Expedir RP',
        url_accion: '/viaticos',
        datos_adicionales: {
          solicitudId: solicitud.id,
          consecutivoUnico: consecutivo,
        },
      };

      const emailPresupuesto = {
        asunto: `Nueva comisión para expedición de RP en SIIF: ${consecutivo}`,
        html: buildTravelExpenseEmailHtml({
          consecutivo,
          comisionadoNombre,
          destino,
          fechaInicio,
          fechaFin,
          estadoBadge: 'EN PRESUPUESTO',
          badgeColor: '#059669',
          mensajePrincipal: `La comisión <strong>${consecutivo}</strong> con destino a <strong>${destino}</strong> ha sido remitida al Grupo de Presupuesto para expedición de Registro Presupuestal (RP) en SIIF Nación.`,
          observaciones: dto?.observaciones ? `Observaciones: ${dto.observaciones}` : undefined,
          botonTexto: 'Expedir RP en Plataforma',
          botonUrl: '/viaticos',
        }),
      };

      await this.notificationClient.notifyByPermission(
        'travel_expenses.general.es_presupuesto',
        notifPresupuesto,
        emailPresupuesto,
        'PRESUPUESTO',
      );
    } catch (err: any) {
      this.logger.warn(`[notify] Error notificando a Presupuesto: ${err?.message}`);
    }

    return guardada;
  }

  /**
   * RF-PRE-001 — Bandeja del Grupo de Presupuesto (Etapa 7).
   *
   * Permite consultar comisiones autorizadas pendientes de RP (AUTORIZADA / EN_PRESUPUESTO)
   * y comisiones comprometidas (COMPROMETIDA), con búsqueda, paginación y KPIs.
   */
  async obtenerBandejaPresupuesto(
    page: number = 1,
    limit: number = 20,
    search?: string,
    estado?: string,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    kpis: {
      pendientesRp: number;
      comprometidas: number;
      totalComprometido: number;
    };
  }> {
    const qb = this.solicitudRepo
      .createQueryBuilder('sol')
      .leftJoinAndSelect('sol.comisionado', 'com')
      .leftJoinAndSelect('sol.enviadoPresupuestoPor', 'envUser')
      .leftJoinAndSelect('sol.expedidoRpPor', 'expUser');

    if (estado && estado !== 'TODOS') {
      if (estado === 'AUTORIZADA' || estado === 'EN_PRESUPUESTO' || estado === 'PENDIENTES_RP') {
        qb.where(
          '(sol.estadoSolicitud = :autorizada OR sol.estadoSolicitud = :enPresupuesto)',
          {
            autorizada: EstadoSolicitud.AUTORIZADA,
            enPresupuesto: EstadoSolicitud.EN_PRESUPUESTO,
          },
        );
      } else {
        qb.where('sol.estadoSolicitud = :estado', { estado });
      }
    } else {
      qb.where(
        '(sol.estadoSolicitud IN (:...estados) OR (sol.estadoSolicitud = :autorizada AND sol.enviadoPresupuesto = true))',
        {
          estados: [EstadoSolicitud.AUTORIZADA, EstadoSolicitud.EN_PRESUPUESTO, EstadoSolicitud.COMPROMETIDA],
          autorizada: EstadoSolicitud.AUTORIZADA,
        },
      );
    }

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(sol.consecutivoUnico) LIKE :term OR LOWER(com.primerNombre) LIKE :term OR LOWER(com.primerApellido) LIKE :term OR LOWER(com.numeroDocumento) LIKE :term OR LOWER(sol.destinoCiudad) LIKE :term OR LOWER(sol.numeroRp) LIKE :term OR LOWER(sol.codigoRp) LIKE :term)',
        { term },
      );
    }

    qb.orderBy('sol.fechaEnvioPresupuesto', 'DESC')
      .addOrderBy('sol.actualizadoEn', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    // KPIs consolidados
    const pendientesRpCount = await this.solicitudRepo.count({
      where: [
        { estadoSolicitud: EstadoSolicitud.AUTORIZADA },
        { estadoSolicitud: EstadoSolicitud.EN_PRESUPUESTO },
      ],
    });

    const comprometidasCount = await this.solicitudRepo.count({
      where: { estadoSolicitud: EstadoSolicitud.COMPROMETIDA },
    });

    const sumResult = await this.solicitudRepo
      .createQueryBuilder('sol')
      .select('SUM(sol.valorComprometido)', 'total')
      .where('sol.estadoSolicitud = :comp', { comp: EstadoSolicitud.COMPROMETIDA })
      .getRawOne();

    const totalComprometido = Number(sumResult?.total || 0);

    return {
      data,
      total,
      page,
      limit,
      kpis: {
        pendientesRp: pendientesRpCount,
        comprometidas: comprometidasCount,
        totalComprometido,
      },
    };
  }

  /**
   * RF-PRE-001 — Expedir RP en SIIF Nación (Etapa 7).
   *
   * Criterio 2 (Gherkin):
   *   Dada una comisión en Presupuesto, Cuando se expide el RP en SIIF Nación,
   *   Entonces la comisión pasa a estado COMPROMETIDA.
   */
  /**
   * RF-PRE-001 — Expedir y Registrar RP en SIIF Nación (Etapa 7).
   *
   * Método transaccional ACID con bloqueo pesimista SELECT ... FOR UPDATE.
   * Transiciona la comisión de AUTORIZADA / EN_PRESUPUESTO al estado COMPROMETIDA.
   */
  async registrarRP(
    solicitudId: string,
    datosRp: IssueRpDto,
    usuarioId: string,
  ): Promise<SolicitudComisionEntity> {
    return this.dataSource.transaction(async (manager) => {
      // 1. Bloqueo Pesimista: Obtener la solicitud con SELECT ... FOR UPDATE (sin outer joins para compatibilidad total con PostgreSQL)
      const solicitud = await manager
        .getRepository(SolicitudComisionEntity)
        .findOne({
          where: { id: solicitudId },
          lock: { mode: 'pessimistic_write' },
        });

      if (!solicitud) {
        throw new NotFoundException(`Solicitud de comisión no encontrada: ${solicitudId}`);
      }

      if (solicitud.comisionadoId) {
        const comisionado = await manager.getRepository(ComisionadoEntity).findOne({
          where: { id: solicitud.comisionadoId },
        });
        if (comisionado) {
          solicitud.comisionado = comisionado;
        }
      }

      // 2. Validación de Estado: Verificar que esté en AUTORIZADA o en Presupuesto
      const esEstadoValido =
        solicitud.estadoSolicitud === EstadoSolicitud.AUTORIZADA ||
        solicitud.estadoSolicitud === EstadoSolicitud.EN_PRESUPUESTO;

      if (!esEstadoValido) {
        throw new BadRequestException(
          `La comisión debe estar en la bandeja de Presupuesto para expedir su RP. Estado actual: ${solicitud.estadoSolicitud}`,
        );
      }

      if (datosRp.valorComprometido == null || Number(datosRp.valorComprometido) <= 0) {
        throw new BadRequestException('El valor comprometido debe ser un monto positivo mayor a 0.');
      }

      const rubroFinal = (datosRp.rubroPresupuestal || datosRp.rubro || '').trim();
      if (!rubroFinal) {
        throw new BadRequestException('El rubro presupuestal es obligatorio para expedir el RP.');
      }

      // 3. Validación Nomenclatura SOPORTE RP
      if (datosRp.soporteRpPath) {
        const regexSoporte = /^.*(\d{4}-?\d{2}-?\d{2})_RP_([A-Za-z0-9\-_]+)(\.pdf)?$/i;
        if (!regexSoporte.test(datosRp.soporteRpPath.trim())) {
          throw new BadRequestException(
            `El archivo soporte de RP '${datosRp.soporteRpPath}' es inválido. Debe cumplir con la regla de nomenclatura Fecha_RP_Número (ejemplo: YYYYMMDD_RP_Numero.pdf o 20260916_RP_12345.pdf).`,
          );
        }
      }

      const codigoOficialRp = this.validarYFormatearNomenclaturaRp(
        datosRp.fechaRp,
        datosRp.numeroRp,
        datosRp.codigoRp,
      );

      // 4. Actualización de Registro
      const estadoAnterior = solicitud.estadoSolicitud;
      solicitud.estadoSolicitud = EstadoSolicitud.COMPROMETIDA;
      solicitud.numeroRp = datosRp.numeroRp.trim();
      solicitud.fechaRp = new Date(datosRp.fechaRp);
      solicitud.valorComprometido = Number(datosRp.valorComprometido);
      solicitud.rubroPresupuestalRp = rubroFinal;
      solicitud.rubroRp = rubroFinal;
      solicitud.soporteRpPath = datosRp.soporteRpPath ? datosRp.soporteRpPath.trim() : null;
      solicitud.codigoRp = codigoOficialRp;
      solicitud.usuarioPresupuestoId = usuarioId;
      solicitud.expedidoRpPorId = usuarioId;
      solicitud.fechaRegistroRp = new Date();
      solicitud.fechaExpedicionRp = new Date();
      if (datosRp.observaciones) {
        solicitud.observacionesRp = datosRp.observaciones.trim();
      }

      // RF-PRE-003: Determinar modalidad de pago según los días hábiles disponibles antes del viaje
      const fechaBaseModalidad = datosRp.fechaRp || new Date();
      const diasHabilesPrevios = await this.calcularDiasHabilesPrevios(
        fechaBaseModalidad,
        solicitud.fechaInicio,
      );
      const modalidadPago = this.determinarModalidadPago(diasHabilesPrevios);
      solicitud.modalidadPago = modalidadPago;
      solicitud.diasHabilesPrevios = diasHabilesPrevios;
      solicitud.fechaCalculoModalidad = new Date();

      const guardada = await manager.getRepository(SolicitudComisionEntity).save(solicitud);

      await manager.getRepository(SolicitudHistorialEstadoEntity).save({
        solicitudId: solicitud.id,
        estadoAnterior,
        estadoNuevo: EstadoSolicitud.COMPROMETIDA,
        usuarioId,
        motivo: `[RF-PRE-001 / RF-PRE-003] Registro Presupuestal (RP) expedido en SIIF Nación: ${codigoOficialRp}. Modalidad: ${modalidadPago} (${diasHabilesPrevios} días hábiles previos). Valor comprometido: $${Number(datosRp.valorComprometido).toLocaleString('es-CO')}. Rubro: ${rubroFinal}`,
      });

      this.emitirDisbursementReady(guardada.id, EstadoSolicitud.COMPROMETIDA, usuarioId);
      return guardada;
    });
  }

  /**
   * RF-PRE-001 — Expedir RP en SIIF Nación (Etapa 7).
   *
   * Criterio 2 (Gherkin):
   *   Dada una comisión en Presupuesto, Cuando se expide el RP en SIIF Nación,
   *   Entonces la comisión pasa a estado COMPROMETIDA.
   */
  async expedirRp(
    solicitudId: string,
    usuarioId: string,
    roles: string[] = [],
    dto: ExpedirRpDto | IssueRpDto,
  ): Promise<SolicitudComisionEntity> {
    const issueDto: IssueRpDto = {
      numeroRp: dto.numeroRp,
      fechaRp: dto.fechaRp,
      valorComprometido: dto.valorComprometido,
      rubroPresupuestal: (dto as any).rubroPresupuestal || (dto as any).rubro,
      rubro: (dto as any).rubro || (dto as any).rubroPresupuestal,
      codigoRp: dto.codigoRp,
      soporteRpPath: (dto as any).soporteRpPath,
      observaciones: dto.observaciones,
    };

    const guardada = await this.registrarRP(solicitudId, issueDto, usuarioId);

    // Notificaciones al comisionado / enlace / analista (In-app + Correo)
    try {
      const consecutivo = guardada.consecutivoUnico || guardada.id;
      const comisionadoNombre = this.getComisionadoNombre(guardada.comisionado);
      const destino = `${guardada.destinoCiudad || ''}, ${guardada.destinoDepartamento || ''}`.trim();
      const fechaInicio = guardada.fechaInicio ? new Date(guardada.fechaInicio).toISOString().split('T')[0] : undefined;
      const fechaFin = guardada.fechaFin ? new Date(guardada.fechaFin).toISOString().split('T')[0] : undefined;

      const notifRp = {
        tipo_notificacion: 'VIATICOS_RP_EXPEDIDO',
        titulo: `RP Expedido en SIIF Nación: ${consecutivo}`,
        mensaje: `Se ha expedido el RP ${guardada.codigoRp} para la comisión ${consecutivo}. Estado: COMPROMETIDA. Recursos comprometidos: $${Number(guardada.valorComprometido).toLocaleString('es-CO')}.`,
        descripcion_corta: `RP Expedido · ${consecutivo}`,
        icono: 'CheckCircle2',
        color: '#059669',
        prioridad: 'Media' as const,
        categoria: 'VIATICOS',
        tiene_accion: true,
        texto_boton_accion: 'Ver comisión',
        url_accion: '/viaticos',
        datos_adicionales: {
          solicitudId: guardada.id,
          consecutivoUnico: consecutivo,
          codigoRp: guardada.codigoRp,
          valorComprometido: guardada.valorComprometido,
        },
      };

      const emailRp = {
        asunto: `Registro Presupuestal (RP) expedido en SIIF: ${consecutivo}`,
        html: buildTravelExpenseEmailHtml({
          consecutivo,
          comisionadoNombre,
          destino,
          fechaInicio,
          fechaFin,
          estadoBadge: 'COMPROMETIDA',
          badgeColor: '#059669',
          mensajePrincipal: `Se ha expedido el <strong>Registro Presupuestal ${guardada.codigoRp}</strong> para la comisión <strong>${consecutivo}</strong> en SIIF Nación por valor comprometido de <strong>$${Number(guardada.valorComprometido).toLocaleString('es-CO')}</strong>. La comisión se encuentra en estado <strong>COMPROMETIDA</strong>.`,
          observaciones: guardada.observacionesRp ? `Observaciones RP: ${guardada.observacionesRp}` : undefined,
          botonTexto: 'Consultar Comisión',
          botonUrl: '/viaticos',
        }),
      };

      const destinatarios = Array.from(new Set([
        guardada.creadoPorUsuarioId,
        guardada.analistaAsignadoId,
      ].filter(Boolean) as string[]));

      for (const destId of destinatarios) {
        await this.notificationClient.notifyUser(destId, notifRp, emailRp);
      }

      // Notificación directa por email al comisionado si tiene correo registrado
      if (guardada.comisionado?.email && guardada.comisionado.email.includes('@')) {
        await this.notificationClient.sendEmail({
          to: guardada.comisionado.email,
          subject: emailRp.asunto,
          html: emailRp.html,
          text: notifRp.mensaje,
        });
      }
    } catch (err: any) {
      this.logger.warn(`[notify] Error enviando notificaciones de RP expedido: ${err?.message}`);
    }

    return guardada;
  }

  /**
   * RF-PRE-001 — Carga masiva de Registro Presupuestal (RP) en SIIF Nación (Etapa 7).
   *
   * Criterio 3 (Gherkin):
   *   Dado el registro del RP, Cuando se carga, Entonces respeta la nomenclatura
   *   Fecha_RP_Número y admite carga masiva.
   */
  async cargaMasivaRp(
    usuarioId: string,
    roles: string[] = [],
    items: ItemCargaMasivaRpDto[],
  ): Promise<{
    total: number;
    exitosos: number;
    fallidos: number;
    procesados: Array<{
      solicitudId: string;
      consecutivoUnico: string;
      codigoRp: string;
      valorComprometido: number;
      estado: string;
    }>;
    errores: Array<{
      fila: number;
      identificador: string;
      error: string;
    }>;
  }> {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('El archivo o listado de carga masiva está vacío.');
    }

    const procesados: Array<any> = [];
    const errores: Array<any> = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const fila = i + 1;
      const identificador = item.consecutivoUnico || item.solicitudId || `Fila #${fila}`;

      try {
        let solicitud: SolicitudComisionEntity | null = null;

        const consecutivoFinal =
          item.consecutivoUnico ||
          (item as any).solicitud_consecutivo ||
          (item as any).consecutivo ||
          (item as any).solicitudConsecutivo;
        const numRpFinal = item.numeroRp || (item as any).numero_rp;
        const fechaRpFinal = item.fechaRp || (item as any).fecha_rp;
        const valorFinal = item.valorComprometido ?? (item as any).valor_comprometido;
        const rubroFinal = item.rubro || (item as any).rubroPresupuestal || (item as any).rubro_presupuestal;
        const soporteFinal = (item as any).soporteRpPath || (item as any).soporte_rp_path || null;

        if (item.solicitudId) {
          solicitud = await this.solicitudRepo.findOne({
            where: { id: item.solicitudId },
          });
        } else if (consecutivoFinal) {
          solicitud = await this.solicitudRepo.findOne({
            where: { consecutivoUnico: consecutivoFinal.trim().toUpperCase() },
          });
        }

        if (!solicitud) {
          errores.push({
            fila,
            identificador,
            error: `Comisión no encontrada con el identificador '${identificador}'.`,
          });
          continue;
        }

        const esEstadoValido =
          solicitud.estadoSolicitud === EstadoSolicitud.EN_PRESUPUESTO ||
          solicitud.estadoSolicitud === EstadoSolicitud.AUTORIZADA;

        if (!esEstadoValido) {
          errores.push({
            fila,
            identificador,
            error: `La comisión '${solicitud.consecutivoUnico}' no está en estado AUTORIZADA o en Presupuesto (estado actual: ${solicitud.estadoSolicitud}).`,
          });
          continue;
        }

        if (!numRpFinal || !String(numRpFinal).trim()) {
          errores.push({
            fila,
            identificador,
            error: 'Número de RP no suministrado.',
          });
          continue;
        }

        if (!fechaRpFinal || !String(fechaRpFinal).trim()) {
          errores.push({
            fila,
            identificador,
            error: 'Fecha de RP no suministrada.',
          });
          continue;
        }

        if (valorFinal == null || Number(valorFinal) <= 0) {
          errores.push({
            fila,
            identificador,
            error: 'Valor comprometido debe ser un número positivo mayor a 0.',
          });
          continue;
        }

        if (!rubroFinal || !String(rubroFinal).trim()) {
          errores.push({
            fila,
            identificador,
            error: 'Rubro presupuestal no suministrado.',
          });
          continue;
        }

        // Valida y normaliza la nomenclatura Fecha_RP_Número
        const codigoOficialRp = this.validarYFormatearNomenclaturaRp(
          fechaRpFinal,
          numRpFinal,
          item.codigoRp,
        );

        const estadoAnterior = solicitud.estadoSolicitud;
        solicitud.estadoSolicitud = EstadoSolicitud.COMPROMETIDA;
        solicitud.numeroRp = String(numRpFinal).trim();
        solicitud.fechaRp = new Date(fechaRpFinal);
        solicitud.valorComprometido = Number(valorFinal);
        solicitud.rubroRp = String(rubroFinal).trim();
        solicitud.rubroPresupuestalRp = String(rubroFinal).trim();
        solicitud.soporteRpPath = soporteFinal ? String(soporteFinal).trim() : null;
        solicitud.codigoRp = codigoOficialRp;
        solicitud.usuarioPresupuestoId = usuarioId;
        solicitud.expedidoRpPorId = usuarioId;
        solicitud.fechaRegistroRp = new Date();
        solicitud.fechaExpedicionRp = new Date();
        if (item.observaciones) {
          solicitud.observacionesRp = String(item.observaciones).trim();
        }

        // RF-PRE-003: Determinar modalidad de pago según los días hábiles disponibles antes del viaje
        const fechaBaseModalidad = fechaRpFinal || new Date();
        const diasHabilesPrevios = await this.calcularDiasHabilesPrevios(
          fechaBaseModalidad,
          solicitud.fechaInicio,
        );
        const modalidadPago = this.determinarModalidadPago(diasHabilesPrevios);
        solicitud.modalidadPago = modalidadPago;
        solicitud.diasHabilesPrevios = diasHabilesPrevios;
        solicitud.fechaCalculoModalidad = new Date();

        await this.solicitudRepo.save(solicitud);

        await this.dataSource.getRepository(SolicitudHistorialEstadoEntity).save({
          solicitudId: solicitud.id,
          estadoAnterior,
          estadoNuevo: EstadoSolicitud.COMPROMETIDA,
          usuarioId,
          motivo: `[RF-PRE-001 / RF-PRE-003 - Carga Masiva] RP expedido en SIIF Nación: ${codigoOficialRp}. Modalidad: ${modalidadPago} (${diasHabilesPrevios} días hábiles previos). Valor: $${Number(valorFinal).toLocaleString('es-CO')}`,
        });

        procesados.push({
          solicitudId: solicitud.id,
          consecutivoUnico: solicitud.consecutivoUnico,
          codigoRp: codigoOficialRp,
          valorComprometido: Number(valorFinal),
          modalidadPago,
          diasHabilesPrevios,
          estado: EstadoSolicitud.COMPROMETIDA,
        });

        this.emitirDisbursementReady(solicitud.id, EstadoSolicitud.COMPROMETIDA, usuarioId);
      } catch (err: any) {
        errores.push({
          fila,
          identificador,
          error: err?.message || 'Error inesperado al procesar registro.',
        });
      }
    }

    return {
      total: items.length,
      exitosos: procesados.length,
      fallidos: errores.length,
      procesados,
      errores,
    };
  }

  /**
   * RF-PRE-001 — Alias de Carga Masiva de RP (cargaMasivaRP)
   */
  async cargaMasivaRP(
    usuarioId: string,
    roles: string[] = [],
    items: any[],
  ) {
    return this.cargaMasivaRp(usuarioId, roles, items);
  }

  /**
   * RF-PAG-001 — Etapa 8: Crear obligación en SIIF Nación según modalidad de pago.
   * Actor: Analista de Viáticos.
   *
   * Criterios de Aceptación (Gherkin):
   * 1. Dada una comisión COMPROMETIDA con modalidad definida,
   *    Cuando el analista crea la obligación en SIIF Nación,
   *    Entonces queda registrada según la modalidad (avance o posterior).
   * 2. Dada la obligación creada,
   *    Cuando se registra,
   *    Entonces la comisión queda lista para el desembolso por Tesorería (pasa a OBLIGADA).
   *
   * Detalle funcional:
   * - Entrada: modalidad de pago (de RF-PRE-003 o confirmada), valor, RP.
   * - Acción: crear obligación en SIIF Nación.
   * - Resultado: comisión lista para pago (OBLIGADA).
   */
  async crearObligacion(
    solicitudId: string,
    usuarioId: string,
    rolesUsuario: string[] = [],
    dto: CrearObligacionDto,
  ): Promise<SolicitudComisionEntity> {
    if (!solicitudId) {
      throw new BadRequestException('El ID de la solicitud es obligatorio.');
    }
    if (!dto || !dto.numeroObligacion?.trim()) {
      throw new BadRequestException('El número de obligación en SIIF Nación es obligatorio.');
    }

    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
      relations: ['comisionado'],
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud de comisión ${solicitudId} no encontrada.`);
    }

    // Validación de estado: Debe estar en estado COMPROMETIDA
    if (solicitud.estadoSolicitud !== EstadoSolicitud.COMPROMETIDA) {
      throw new BadRequestException(
        `La solicitud no se encuentra en estado COMPROMETIDA (Estado actual: ${solicitud.estadoSolicitud}). Solo comisiones con RP expedido pueden ser obligadas.`,
      );
    }

    // Validación de RP
    const tieneRp = Boolean(solicitud.codigoRp || solicitud.numeroRp);
    if (!tieneRp) {
      throw new BadRequestException(
        'La comisión no cuenta con Registro Presupuestal (RP) expedido en SIIF Nación.',
      );
    }

    // Modalidad de pago (de RF-PRE-003 o del DTO si se especifica)
    const modalidadFinal = dto.modalidadPago || solicitud.modalidadPago || 'AVANCE';
    const valorObligacionFinal =
      dto.valorObligacion != null && Number(dto.valorObligacion) > 0
        ? Number(dto.valorObligacion)
        : Number(solicitud.valorComprometido || solicitud.montoViaticos || 0);

    if (valorObligacionFinal <= 0) {
      throw new BadRequestException(
        'El valor de la obligación debe ser un monto positivo mayor a cero.',
      );
    }

    // Actualización de campos de la Obligación en SIIF Nación
    const fechaObligacionFinal = dto.fechaObligacion ? new Date(dto.fechaObligacion) : new Date();
    const estadoAnterior = solicitud.estadoSolicitud;

    solicitud.estadoSolicitud = EstadoSolicitud.OBLIGADA;
    solicitud.numeroObligacion = dto.numeroObligacion.trim();
    solicitud.fechaObligacion = fechaObligacionFinal;
    solicitud.valorObligacion = valorObligacionFinal;
    solicitud.modalidadPago = modalidadFinal;
    solicitud.observacionesObligacion = dto.observacionesObligacion?.trim() || null;
    if (dto.soporteObligacionPath) {
      solicitud.soporteObligacionPath = dto.soporteObligacionPath;
    }
    solicitud.obligadoPorId = usuarioId;
    solicitud.fechaRegistroObligacion = new Date();

    const consecutivo = solicitud.consecutivoUnico || solicitud.id;
    const codigoRp = solicitud.codigoRp || solicitud.numeroRp || 'RP-N/A';

    return await this.dataSource.transaction(async (manager) => {
      const guardada = await manager.getRepository(SolicitudComisionEntity).save(solicitud);

      await manager.getRepository(SolicitudHistorialEstadoEntity).save({
        solicitudId: guardada.id,
        estadoAnterior,
        estadoNuevo: EstadoSolicitud.OBLIGADA,
        usuarioId,
        comentarios: `[RF-PAG-001] Obligación registrada en SIIF Nación: ${dto.numeroObligacion.trim()}. Modalidad: ${modalidadFinal}. RP: ${codigoRp}. Valor obligado: $${valorObligacionFinal.toLocaleString('es-CO')}. Comisión lista para desembolso de Tesorería.`.slice(0, 255),
      });

      if (this.notificationClient) {
        try {
          const comisionadoNombre = this.getComisionadoNombre(guardada.comisionado);
          const destino = `${guardada.destinoCiudad || ''}, ${guardada.destinoDepartamento || ''}`.trim();
          const fechaInicio = guardada.fechaInicio ? new Date(guardada.fechaInicio).toISOString().split('T')[0] : undefined;
          const fechaFin = guardada.fechaFin ? new Date(guardada.fechaFin).toISOString().split('T')[0] : undefined;

          const notifObligacion = {
            tipo_notificacion: 'OBLIGACION_SIIF_REGISTRADA',
            titulo: `Obligación creada en SIIF: ${consecutivo}`,
            mensaje: `Se ha creado la obligación ${dto.numeroObligacion.trim()} para la comisión ${consecutivo} (Modalidad: ${modalidadFinal}). La comisión está lista para desembolso por Tesorería.`,
            descripcion_corta: `Obligación SIIF · ${consecutivo}`,
            icono: 'CheckCircle2',
            color: '#059669',
            prioridad: 'Media' as const,
            categoria: 'VIATICOS',
            tiene_accion: true,
            texto_boton_accion: 'Ver comisión',
            url_accion: '/viaticos',
          };

          const emailObligacion = {
            asunto: `Obligación presupuestal creada en SIIF: ${consecutivo}`,
            html: buildTravelExpenseEmailHtml({
              consecutivo,
              comisionadoNombre,
              destino,
              fechaInicio,
              fechaFin,
              estadoBadge: 'OBLIGADA',
              badgeColor: '#059669',
              mensajePrincipal: `Se ha registrado la obligación <strong>${dto.numeroObligacion.trim()}</strong> para la comisión <strong>${consecutivo}</strong> (Modalidad: ${modalidadFinal}) por valor de <strong>$${valorObligacionFinal.toLocaleString('es-CO')}</strong>. La comisión queda en estado <strong>OBLIGADA</strong> y pasa a trámite de desembolso en Tesorería.`,
              observaciones: dto.observacionesObligacion ? `Observaciones: ${dto.observacionesObligacion}` : undefined,
              botonTexto: 'Consultar Expediente',
              botonUrl: '/viaticos',
            }),
          };

          const destinatarios = Array.from(new Set([
            guardada.creadoPorUsuarioId,
            guardada.analistaAsignadoId,
          ].filter(Boolean) as string[]));

          for (const destId of destinatarios) {
            await this.notificationClient.notifyUser(destId, notifObligacion, emailObligacion);
          }

          // Notificación directa por email al comisionado si tiene correo registrado
          if (guardada.comisionado?.email && guardada.comisionado.email.includes('@')) {
            await this.notificationClient.sendEmail({
              to: guardada.comisionado.email,
              subject: emailObligacion.asunto,
              html: emailObligacion.html,
              text: notifObligacion.mensaje,
            });
          }

          // Notificación al rol de Tesorería por permiso inmutable
          const notifTesoreria = {
            tipo_notificacion: 'VIATICOS_COMISION_LISTA_PAGO',
            titulo: `Comisión lista para desembolso: ${consecutivo}`,
            mensaje: `La comisión ${consecutivo} tiene la obligación ${dto.numeroObligacion.trim()} registrada y se encuentra en su bandeja para proceso de pago.`,
            descripcion_corta: `Para desembolso · ${consecutivo}`,
            icono: 'DollarSign',
            color: '#059669',
            prioridad: 'Alta' as const,
            categoria: 'VIATICOS',
            tiene_accion: true,
            texto_boton_accion: 'Procesar pago',
            url_accion: '/viaticos',
          };

          const emailTesoreria = {
            asunto: `Comisión lista para desembolso en Tesorería: ${consecutivo}`,
            html: buildTravelExpenseEmailHtml({
              consecutivo,
              comisionadoNombre,
              destino,
              fechaInicio,
              fechaFin,
              estadoBadge: 'LISTA PARA PAGO',
              badgeColor: '#059669',
              mensajePrincipal: `La comisión <strong>${consecutivo}</strong> cuenta con la obligación SIIF <strong>${dto.numeroObligacion.trim()}</strong> debidamente registrada y requiere trámite de desembolso por Tesorería.`,
              observaciones: `Valor a desembolsar: $${valorObligacionFinal.toLocaleString('es-CO')} · Modalidad: ${modalidadFinal}`,
              botonTexto: 'Procesar Pago en Plataforma',
              botonUrl: '/viaticos',
            }),
          };

          await this.notificationClient.notifyByPermission(
            'travel_expenses.general.es_tesoreria',
            notifTesoreria,
            emailTesoreria,
            'TESORERIA',
          );

          // Notificación informativa a SST
          await this.notificationClient.notifyByPermission(
            'travel_expenses.general.es_sst',
            notifObligacion,
            emailObligacion,
            'SST',
          );
        } catch (notifErr: any) {
          this.logger.warn(`[RF-PAG-001] No se pudo enviar notificación de obligación: ${notifErr?.message}`);
        }
      }

      this.logger.log(
        `[RF-PAG-001] Obligación ${dto.numeroObligacion.trim()} registrada exitosamente para solicitud ${consecutivo}. Estado: OBLIGADA. Modalidad: ${modalidadFinal}.`,
      );

      this.emitirDisbursementReady(guardada.id, EstadoSolicitud.OBLIGADA, usuarioId);
      return guardada;
    });
  }

  /**
   * [RF-PAG-003] Etapa 8 — Tesorería y desembolso: Procesar pago de comisión.
   *
   * Criterios de aceptación (Gherkin):
   * 1. Dada una comisión con obligación creada (estado OBLIGADA),
   *    Cuando Tesorería procesa el pago,
   *    Entonces la comisión pasa a estado PAGADA.
   * 2. Dado el pago realizado,
   *    Cuando se registra,
   *    Entonces queda con su soporte y fecha en la trazabilidad (solicitudes_historial_estados).
   *
   * Detalle funcional y validaciones:
   * - Estado previo requerido: OBLIGADA.
   * - Estado resultante: PAGADA.
   * - Campos registrados: fecha de pago, valor pagado, soporte de desembolso, orden de pago SIIF, observaciones.
   * - Respeta la modalidad presupuestal (AVANCE / RECONOCIMIENTO_POSTERIOR).
   * - Aplicabilidad: Todas las comisiones con obligación creada.
   */
  async procesarPago(
    solicitudId: string,
    usuarioId: string,
    rolesUsuario: string[] = [],
    dto: ProcesarPagoDto,
  ): Promise<SolicitudComisionEntity> {
    if (!solicitudId) {
      throw new BadRequestException('El ID de la solicitud es obligatorio.');
    }
    if (!dto) {
      throw new BadRequestException('Los datos del pago y desembolso son requeridos.');
    }
    if (!dto.fechaPago) {
      throw new BadRequestException('La fecha de pago es obligatoria.');
    }
    if (dto.valorPagado == null || Number(dto.valorPagado) <= 0) {
      throw new BadRequestException('El valor pagado debe ser un monto positivo mayor a cero.');
    }

    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
      relations: ['comisionado'],
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud de comisión ${solicitudId} no encontrada.`);
    }

    // Validación de estado: Debe estar en estado OBLIGADA
    if (solicitud.estadoSolicitud !== EstadoSolicitud.OBLIGADA) {
      throw new BadRequestException(
        `La solicitud no se encuentra en estado OBLIGADA (Estado actual: ${solicitud.estadoSolicitud}). Solo comisiones con obligación creada en SIIF Nación pueden ser desembolsadas por Tesorería.`,
      );
    }

    // Validación de número de obligación
    if (!solicitud.numeroObligacion) {
      throw new BadRequestException(
        'La comisión no cuenta con número de obligación registrado en SIIF Nación.',
      );
    }

    const estadoAnterior = solicitud.estadoSolicitud;
    const fechaPagoFinal = new Date(dto.fechaPago);
    const valorPagadoFinal = Number(dto.valorPagado);
    const soporteFinal = dto.soportePagoPath?.trim() || dto.soporteDesembolsoPath?.trim() || null;
    const ordenPagoFinal = dto.numeroOrdenPago?.trim() || dto.comprobantePago?.trim() || null;
    const modalidadFinal = dto.modalidadPago || solicitud.modalidadPago || 'AVANCE';

    solicitud.estadoSolicitud = EstadoSolicitud.PAGADA;
    solicitud.fechaPago = fechaPagoFinal;
    solicitud.valorPagado = valorPagadoFinal;
    solicitud.soportePagoPath = soporteFinal;
    solicitud.numeroOrdenPago = ordenPagoFinal;
    solicitud.observacionesPago = dto.observacionesPago?.trim() || null;
    solicitud.pagadoPorId = usuarioId;
    solicitud.fechaRegistroPago = new Date();

    const consecutivo = solicitud.consecutivoUnico || solicitud.id;
    const numObligacion = solicitud.numeroObligacion;

    return await this.dataSource.transaction(async (manager) => {
      const guardada = await manager.getRepository(SolicitudComisionEntity).save(solicitud);

      const comentariosTrazabilidad = `[RF-PAG-003] Pago procesado por Tesorería. Estado: PAGADA. Valor desembolsado: $${valorPagadoFinal.toLocaleString('es-CO')}. Modalidad: ${modalidadFinal}. Obligación SIIF: ${numObligacion}${ordenPagoFinal ? `. Orden Pago: ${ordenPagoFinal}` : ''}${soporteFinal ? `. Soporte: ${soporteFinal}` : ''}.`;

      await manager.getRepository(SolicitudHistorialEstadoEntity).save({
        solicitudId: guardada.id,
        estadoAnterior,
        estadoNuevo: EstadoSolicitud.PAGADA,
        usuarioId,
        comentarios: comentariosTrazabilidad.slice(0, 255),
      });

      if (this.notificationClient) {
        try {
          const comisionadoNombre = this.getComisionadoNombre(guardada.comisionado);
          const destino = `${guardada.destinoCiudad || ''}, ${guardada.destinoDepartamento || ''}`.trim();
          const fechaInicio = guardada.fechaInicio ? new Date(guardada.fechaInicio).toISOString().split('T')[0] : undefined;
          const fechaFin = guardada.fechaFin ? new Date(guardada.fechaFin).toISOString().split('T')[0] : undefined;

          const notifPago = {
            tipo_notificacion: 'COMISION_PAGADA',
            titulo: `Comisión Pagada: ${consecutivo}`,
            mensaje: `Tesorería ha desembolsado el pago de la comisión ${consecutivo} por un valor de $${valorPagadoFinal.toLocaleString('es-CO')} (Modalidad: ${modalidadFinal}). La comisión se encuentra PAGADA.`,
            descripcion_corta: `Desembolso Tesorería · ${consecutivo}`,
            icono: 'BadgeDollarSign',
            color: '#059669',
            prioridad: 'Alta' as const,
            categoria: 'VIATICOS',
            tiene_accion: true,
            texto_boton_accion: 'Ver comprobante',
            url_accion: '/viaticos',
            datos_adicionales: {
              solicitudId: guardada.id,
              consecutivoUnico: consecutivo,
              valorPagado: valorPagadoFinal,
              modalidad: modalidadFinal,
            },
          };

          const emailPago = {
            asunto: `Comisión Pagada / Desembolsada: ${consecutivo}`,
            html: buildTravelExpenseEmailHtml({
              consecutivo,
              comisionadoNombre,
              destino,
              fechaInicio,
              fechaFin,
              estadoBadge: 'PAGADA',
              badgeColor: '#059669',
              mensajePrincipal: `Tesorería ha desembolsado el pago de la comisión <strong>${consecutivo}</strong> por un valor de <strong>$${valorPagadoFinal.toLocaleString('es-CO')}</strong> (Modalidad: ${modalidadFinal}). La comisión se encuentra en estado <strong>PAGADA</strong>.`,
              observaciones: `${numObligacion ? `Obligación SIIF: ${numObligacion} · ` : ''}${ordenPagoFinal ? `Orden de Pago: ${ordenPagoFinal}` : ''}`,
              botonTexto: 'Consultar Expediente',
              botonUrl: '/viaticos',
            }),
          };

          const destinatarios = Array.from(new Set([
            guardada.creadoPorUsuarioId,
            guardada.analistaAsignadoId,
          ].filter(Boolean) as string[]));

          for (const destId of destinatarios) {
            await this.notificationClient.notifyUser(destId, notifPago, emailPago);
          }

          // Notificación directa por email al comisionado si tiene correo registrado
          if (guardada.comisionado?.email && guardada.comisionado.email.includes('@')) {
            await this.notificationClient.sendEmail({
              to: guardada.comisionado.email,
              subject: emailPago.asunto,
              html: emailPago.html,
              text: notifPago.mensaje,
            });
          }
        } catch (notifErr: any) {
          this.logger.warn(`[RF-PAG-003] No se pudo enviar notificación de pago: ${notifErr?.message}`);
        }
      }

      this.logger.log(
        `[RF-PAG-003] Pago procesado exitosamente para solicitud ${consecutivo}. Estado: PAGADA. Valor: $${valorPagadoFinal}. Modalidad: ${modalidadFinal}.`,
      );

      this.emitirDisbursementReady(guardada.id, EstadoSolicitud.PAGADA, usuarioId);
      return guardada;
    });
  }
}


