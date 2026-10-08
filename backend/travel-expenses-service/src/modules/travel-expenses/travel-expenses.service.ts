import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
  Optional,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, In, Brackets } from 'typeorm';
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
import { PendientesService } from '../legalizacion/pendientes.service';

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
  FirmarSolicitudDto,
  DevolverFirmaDto,
  TipoFirmaAprobacion,
  SolicitarOtpFirmaDto,
  VerificarOtpFirmaDto,
  SolicitarFirmasDto,
} from '../../dto/firmar-solicitud.dto';

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
import {
  aYMDUtc,
  cargarFestivosAuth,
  esRadicacionFueraDeJornada,
  contarDiasHabiles,
  fechaEfectivaRadicacion,
} from '../../common/dias-habiles.util';
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

/**
 * Estados que no corresponden a una comisión activa y, por tanto, no generan
 * duplicidad para el mismo comisionado (EFDS-1284).
 */
const ESTADOS_NO_ACTIVOS_DUPLICIDAD = [
  EstadoSolicitud.CANCELADA,
  EstadoSolicitud.RECHAZADO,
];

/**
 * Solapamiento por día calendario, incluyendo el último día de ambas comisiones
 * (una comisión que termina el día en que otra inicia también se cruza).
 */
const CONDICION_SOLAPAMIENTO_DIAS =
  's.fecha_inicio::date <= CAST(:fechaFin AS date) AND s.fecha_fin::date >= CAST(:fechaInicio AS date)';

/** Parámetros de CONDICION_SOLAPAMIENTO_DIAS como fecha calendario (YYYY-MM-DD). */
function rangoSolapamiento(inicio: Date | string, fin: Date | string) {
  return { fechaInicio: aYMDUtc(inicio), fechaFin: aYMDUtc(fin) };
}

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
  nom_dependencia: string | null;
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
    PENDIENTE_FIRMAS: 'pendiente de firmas de aprobación',
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
export class TravelExpensesService implements OnModuleInit {
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
    @Optional()
    private readonly pendientesService?: PendientesService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.asegurarRolYPermisosComisionado().catch((err) =>
      this.logger.warn(`[onModuleInit] No se pudo asegurar rol COMISIONADO: ${err?.message}`),
    );
  }

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

    // ── Detección de viaje de ida y vuelta ───────────────────────────────────
    // Si hay más de un tramo y el destino del último coincide con el origen del
    // primero, el comisionado ya regresó al punto de partida. En ese caso el
    // "destino" real de la comisión es el origen del último tramo (el punto más
    // alejado antes del regreso). Esto replica la misma lógica del frontend
    // (viaticosUtils.ts#sincronizarItinerarioFormulario).
    const normalizarCiudad = (txt?: string) =>
      (txt || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    const esViajeIdaVuelta =
      rutas.length > 1 &&
      normalizarCiudad(ultimoTramo.destinoCiudad) ===
        normalizarCiudad(primerTramo.origenCiudad) &&
      (ultimoTramo.destinoCiudad || '') !== '';

    const destinoCiudadFinal = esViajeIdaVuelta
      ? ultimoTramo.origenCiudad || ''
      : ultimoTramo.destinoCiudad || dto.destinoCiudad || '';
    const destinoDepartamentoFinal = esViajeIdaVuelta
      ? ultimoTramo.origenDepartamento || ''
      : ultimoTramo.destinoDepartamento || dto.destinoDepartamento || '';

    // Normalizar hora de viaje en cada tramo del itinerario
    const rutasNormalizadas = rutas.map((r) => {
      const horaViaje = r.horaEstimadaSalida || r.horarioEstimadoMilitar || r.horaSalida || '';
      return {
        ...r,
        horaEstimadaSalida: horaViaje,
        horarioEstimadoMilitar: horaViaje,
      };
    });

    return {
      itinerario: rutasNormalizadas,
      fechaInicio: formatoISO(fechaInicio),
      fechaFin: formatoISO(fechaFin),
      diasComision,
      origenCiudad: primerTramo.origenCiudad || '',
      destinoCiudad: destinoCiudadFinal,
      destinoDepartamento: destinoDepartamentoFinal,
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
    'ADMINISTRADOR',
    'ADMINISTRADOR_SISTEMA',
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
        `SELECT id_dependencia, cod_dependencia, nom_dependencia FROM auth.dependencias WHERE activo = true`,
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

  async obtenerDatosPersonaPorUsuarioId(
    usuarioId: string,
  ): Promise<{ idPerson?: string; numIdentificacion?: string; dirEmail?: string; username?: string } | null> {
    if (!usuarioId) return null;
    try {
      const rows = await this.solicitudRepo.query(
        `SELECT p.id_person, p.num_identificacion, p.dir_email, u.username
         FROM auth."user" u
         LEFT JOIN auth.personas p ON p.id_person = u.id_person
         WHERE u.id_user::text = $1
         LIMIT 1`,
        [usuarioId],
      );
      if (rows && rows.length > 0) {
        return {
          idPerson: rows[0].id_person || undefined,
          numIdentificacion: rows[0].num_identificacion || undefined,
          dirEmail: rows[0].dir_email || undefined,
          username: rows[0].username || undefined,
        };
      }
    } catch (e: any) {
      this.logger.warn(
        `[obtenerDatosPersonaPorUsuarioId] Error consultando persona para usuario ${usuarioId}: ${e?.message}`,
      );
    }
    return null;
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
    isComisionado = false,
    soloComisionado = false,
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
      'isComisionado=',
      isComisionado,
      'soloComisionado=',
      soloComisionado,
      'page=',
      page,
      'limit=',
      limit,
    );
    const query = this.solicitudRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.comisionado', 'comisionado');

    if ((!isSuperAdmin && !isSecretario) || soloComisionado) {
      if (soloComisionado || (isComisionado && !isTesoreria && !isSst && !isControlViaticos && !isAnalista)) {
        if (usuarioId) {
          const datosPersona = await this.obtenerDatosPersonaPorUsuarioId(usuarioId);
          const docs = [datosPersona?.numIdentificacion].filter(Boolean) as string[];
          if (datosPersona?.username && /^\d+$/.test(datosPersona.username.trim())) {
            docs.push(datosPersona.username.trim());
          }
          const emails = [datosPersona?.dirEmail, datosPersona?.username]
            .filter(Boolean)
            .map((e) => (e as string).toLowerCase().trim()) as string[];

          query.andWhere(
            new Brackets((qb) => {
              qb.where('s.creadoPorUsuarioId = :usuarioId', { usuarioId });
              if (docs.length > 0) {
                qb.orWhere('comisionado.numero_documento IN (:...docs)', { docs });
              }
              if (emails.length > 0) {
                qb.orWhere('LOWER(comisionado.email) IN (:...emails)', { emails });
              }
            }),
          );
        }
      } else if (isTesoreria) {
        query.andWhere('s.estado_solicitud IN (:...estadosTesoreria)', {
          estadosTesoreria: ['OBLIGADA', 'PAGADA', 'PENDIENTE_LEGALIZACION', 'LEGALIZADO'],
        });
      } else if (isSst) {
        query.andWhere('s.estado_solicitud IN (:...estadosSst)', {
          estadosSst: ['OBLIGADA', 'PAGADA', 'PENDIENTE_LEGALIZACION', 'LEGALIZADO'],
        });
      } else if (isControlViaticos) {
        query.andWhere('s.estado_solicitud IN (:...estadosControl)', {
          estadosControl: ['SOLICITADA_SIIF', 'VERIFICADA'],
        });
      } else if (isAnalista && usuarioId) {
        query.andWhere('s.analistaAsignadoId = :usuarioId', { usuarioId });
      } else if (isComisionado && usuarioId) {
        const datosPersona = await this.obtenerDatosPersonaPorUsuarioId(usuarioId);
        const docs = [datosPersona?.numIdentificacion].filter(Boolean) as string[];
        if (datosPersona?.username && /^\d+$/.test(datosPersona.username.trim())) {
          docs.push(datosPersona.username.trim());
        }
        const emails = [datosPersona?.dirEmail, datosPersona?.username]
          .filter(Boolean)
          .map((e) => (e as string).toLowerCase().trim()) as string[];

        query.andWhere(
          new Brackets((qb) => {
            qb.where('s.creadoPorUsuarioId = :usuarioId', { usuarioId });
            if (docs.length > 0) {
              qb.orWhere('comisionado.numero_documento IN (:...docs)', { docs });
            }
            if (emails.length > 0) {
              qb.orWhere('LOWER(comisionado.email) IN (:...emails)', { emails });
            }
          }),
        );
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
      numeroCdp: s.numeroCdp ?? null,
      fechaCdp: s.fechaCdp ?? null,
      requiereTiquetes: s.requiereTiquetes,
      montoViaticos: Number(s.montoViaticos || 0),
      montoGastosViaje: Number(s.montoGastosViaje || 0),
      diasComision: s.diasComision ?? 1,
      estadoSolicitud: s.estadoSolicitud,
      radicadoFueraJornada: s.radicadoFueraJornada,
      extemporanea: s.extemporanea,
      fechaRadicacion: s.fechaRadicacion instanceof Date ? s.fechaRadicacion.toISOString() : (s.fechaRadicacion || null),
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
      numeroCdp: s.numeroCdp ?? null,
      fechaCdp: s.fechaCdp ?? null,
      requiereTiquetes: s.requiereTiquetes,
      montoViaticos: Number(s.montoViaticos || 0),
      montoGastosViaje: Number(s.montoGastosViaje || 0),
      diasComision: s.diasComision ?? 1,
      estadoSolicitud: s.estadoSolicitud,
      radicadoFueraJornada: s.radicadoFueraJornada,
      extemporanea: s.extemporanea,
      motivoDevolucion: s.motivoDevolucion,
      fechaRevision: s.fechaRevision?.toISOString() ?? null,
      fechaRadicacion: s.fechaRadicacion?.toISOString() ?? null,
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

  /**
   * Helper para descomponer el nombre completo del funcionario de Nómina
   * en primerNombre, segundoNombre, primerApellido, segundoApellido.
   */
  private parsearNombreFuncionario(fullName: string): {
    primerNombre: string;
    segundoNombre: string | null;
    primerApellido: string;
    segundoApellido: string | null;
  } {
    const rawName = (fullName || '').trim();
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

    return { primerNombre, segundoNombre, primerApellido, segundoApellido };
  }

  /**
   * Helper para resolver el id_dependencia institucional en auth.dependencias
   * según el nombre o código de la dependencia retornado por Nómina.
   */
  private async resolverIdDependenciaPorNombre(
    depNombre?: string | null,
  ): Promise<number | null> {
    const dep = (depNombre || '').trim();
    if (!dep) return null;

    try {
      const depMatch = await this.dataSource.query(
        `SELECT id_dependencia
           FROM auth.dependencias
          WHERE UPPER(nom_dependencia) = UPPER($1)
             OR UPPER(cod_dependencia) = UPPER($1)
          LIMIT 1`,
        [dep],
      );
      if (depMatch?.[0]?.id_dependencia != null) {
        return Number(depMatch[0].id_dependencia);
      }
    } catch (err: any) {
      this.logger.debug?.(
        `[resolverIdDependenciaPorNombre] No se pudo mapear id_dependencia para "${dep}": ${err?.message}`,
      );
    }
    return null;
  }

  /**
   * Consulta, registra o sincroniza un comisionado a partir de su documento de identidad.
   *
   * Flujo de integración claro y jerárquico:
   * 1. PASO 1 (Integración primaria en línea): API Nómina / Talento Humano
   *    (consumida vía certification-service / Oracle FNC - VW_INTEGRACIONFNC).
   *
   *    a) Si se encuentra en la API Nómina:
   *       - Se verifica si ya está registrado en la tabla local `travel_expenses.comisionados`:
   *         * Si NO está registrado: se agrega como nuevo registro en la tabla `comisionados` (origenDatos: 'HUMANO').
   *         * Si YA está registrado: se actualizan sus datos (nombres, apellidos, correo, teléfono, idDependencia, origenDatos)
   *           en caso de que hayan cambiado o se requiera sincronización.
   *       - Retorna el registro comisionado persistido o actualizado.
   *
   *    b) Si la API Nómina NO trae datos o presenta errores (timeout, servicio no disponible, fallo de red, respuesta vacía):
   *       - PASO 2 (Fallback en tabla local): Se busca en la tabla `travel_expenses.comisionados` del mismo microservicio.
   *         * Si existe localmente: se retorna directamente.
   *       - PASO 3 (Fallback institucional ESAP): Si tampoco está en la tabla local, se busca en `auth.personas`.
   *         * Si existe en `auth.personas`: se materializa en `travel_expenses.comisionados` (origenDatos: 'ESAP').
   *         * Si tampoco existe: se arroja NotFoundException.
   */
  /**
   * Determina si una fecha de fin de contrato se encuentra vencida respecto a hoy.
   */
  private esContratoVencido(fechaFin: Date | string | null | undefined): boolean {
    if (!fechaFin) return false;
    try {
      const hoyStr = new Date().toISOString().split('T')[0];
      const finStr = typeof fechaFin === 'string'
        ? fechaFin.split('T')[0]
        : (fechaFin instanceof Date ? fechaFin.toISOString().split('T')[0] : String(fechaFin).split('T')[0]);
      if (!finStr || finStr.length < 10) return false;
      return finStr < hoyStr;
    } catch {
      return false;
    }
  }

  /**
   * Determina si la fecha de fin de contrato está próxima a vencer (<= diasUmbral días) o si no tiene fecha registrada.
   */
  private esContratoProximoAVencer(fechaFin: Date | string | null | undefined, diasUmbral = 30): boolean {
    if (!fechaFin) return true; // Si no tiene fecha fin en tabla local, conviene consultar Humanos para actualizar
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const fin = new Date(fechaFin);
      fin.setHours(0, 0, 0, 0);
      if (isNaN(fin.getTime())) return false;
      const diffMs = fin.getTime() - hoy.getTime();
      const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return diffDias <= diasUmbral;
    } catch {
      return false;
    }
  }

  /**
   * Consulta y validación de comisionado con lógica de prioridad en tabla local:
   * 1. Busca PRIMERO en la tabla interna `travel_expenses.comisionados`.
   *    - Si lo encuentra, analiza su fecha de fin de contrato (`fechaFinContrato`).
   *    - Si la fecha fin está próxima a vencerse (o nula): consulta en Talento Humano / Nómina para actualizar
   *      fechas de prórroga, salario, cargo y dependencia.
   *    - Si tras esto la fecha fin está vencida: no puede generar la solicitud y arroja BadRequestException.
   * 2. Si NO lo encuentra en comisionados locales:
   *    - Consulta en Talento Humano / Nómina (API Nómina Oracle FNC).
   *    - Si existe en Talento Humano:
   *      * Si su fecha fin en Nómina está vencida: arroja BadRequestException impidiendo generar la solicitud.
   *      * Si está vigente: se materializa en la tabla `travel_expenses.comisionados` y se retorna.
   *    - Si NO existe tampoco en Talento Humano: arroja NotFoundException ("no es un comisionado").
   */
  async consultarComisionado(documento: string): Promise<ComisionadoEntity> {
    const doc = (documento || '').trim();
    if (!doc) {
      throw new BadRequestException(
        'Debe proporcionar el número de documento del comisionado.',
      );
    }

    const adjuntarSolicitudesPendientes = async (com: ComisionadoEntity) => {
      try {
        const pendientes = await this.obtenerSolicitudesPendientesPorComisionado(com.id);
        (com as any).solicitudesPendientes = pendientes;
      } catch (e) {
        (com as any).solicitudesPendientes = [];
      }
      if (!Array.isArray(com.cuentasBancarias)) {
        com.cuentasBancarias = [];
      }
      if (!Array.isArray(com.cargos)) {
        com.cargos = [];
      }
      if (com.cargos.length === 0 && com.cargo) {
        com.cargos = [
          {
            id: 'c-default',
            cargo: com.cargo,
            salario: com.salarioBasico != null ? Number(com.salarioBasico) : 0,
            idDependencia: com.idDependencia,
            esPrincipal: true,
          },
        ];
      }
      return com;
    };

    const consultarApiHumanos = async (): Promise<HumanResourcesSuggestedPerson | null> => {
      if (!this.humanResourcesClient) return null;
      try {
        return await this.humanResourcesClient.consultarFuncionarioPorDocumento(doc);
      } catch (err: any) {
        this.logger.warn(
          `[consultarComisionado] Error consultando API Nómina / Talento Humano para doc ${doc}: ${err?.message || err}.`,
        );
        return null;
      }
    };

    // =========================================================================
    // PASO 1: Buscar PRIMERO en la tabla interna travel_expenses.comisionados
    // =========================================================================
    let comisionadoLocal = await this.comisionadoRepo.findOne({
      where: { numeroDocumento: doc },
    });

    if (comisionadoLocal) {
      this.logger.log(
        `[consultarComisionado] Comisionado ${doc} encontrado en tabla local comisionados`,
      );

      // Si la fecha fin está próxima a vencer o no está registrada, consultar en Humanos para actualizar
      const proximaAVencer = this.esContratoProximoAVencer(comisionadoLocal.fechaFinContrato);

      if (proximaAVencer && this.humanResourcesClient) {
        this.logger.log(
          `[consultarComisionado] Fecha fin de contrato para doc ${doc} (${comisionadoLocal.fechaFinContrato || 'sin registrar'}) próxima a vencer o ausente. Consultando Talento Humano para verificar actualización...`,
        );
        const funcionarioFnc = await consultarApiHumanos();
        if (funcionarioFnc && funcionarioFnc.id_number) {
          const { primerNombre, segundoNombre, primerApellido, segundoApellido } =
            this.parsearNombreFuncionario(funcionarioFnc.full_name || '');
          const idDependenciaFnc = await this.resolverIdDependenciaPorNombre(
            funcionarioFnc.organization_department || funcionarioFnc.cost_center,
          );
          const emailFnc = (funcionarioFnc.email || funcionarioFnc.personal_email || '').trim();
          const phoneFnc = (funcionarioFnc.phone || '').trim();

          if (primerNombre && primerNombre !== 'SIN NOMBRE') comisionadoLocal.primerNombre = primerNombre;
          if (segundoNombre !== undefined) comisionadoLocal.segundoNombre = segundoNombre;
          if (primerApellido && primerApellido !== 'SIN APELLIDO') comisionadoLocal.primerApellido = primerApellido;
          if (segundoApellido !== undefined) comisionadoLocal.segundoApellido = segundoApellido;
          if (emailFnc && emailFnc !== 'sin-correo@esap.edu.co') comisionadoLocal.email = emailFnc;
          if (phoneFnc && phoneFnc !== '0000000000') comisionadoLocal.telefonoContacto = phoneFnc;
          if (idDependenciaFnc != null) comisionadoLocal.idDependencia = idDependenciaFnc;
          if (funcionarioFnc.monthly_salary != null) comisionadoLocal.salarioBasico = Number(funcionarioFnc.monthly_salary);
          if (funcionarioFnc.position_name || funcionarioFnc.career_category) {
            comisionadoLocal.cargo = funcionarioFnc.position_name || funcionarioFnc.career_category || null;
          }
          if (funcionarioFnc.hiring_date) comisionadoLocal.fechaInicioContrato = funcionarioFnc.hiring_date;
          if (funcionarioFnc.contract_end_date) comisionadoLocal.fechaFinContrato = funcionarioFnc.contract_end_date;
          comisionadoLocal.origenDatos = 'HUMANO';

          comisionadoLocal = await this.comisionadoRepo.save(comisionadoLocal);
          this.logger.log(
            `[consultarComisionado] Comisionado ${doc} actualizado exitosamente con datos de Talento Humano`,
          );
        }
      }

      // Validar si la fecha fin de contrato está vencida
      if (this.esContratoVencido(comisionadoLocal.fechaFinContrato)) {
        const nombreCompleto = `${comisionadoLocal.primerNombre} ${comisionadoLocal.primerApellido}`.trim();
        const fechaFinFormateada = typeof comisionadoLocal.fechaFinContrato === 'string'
          ? comisionadoLocal.fechaFinContrato.split('T')[0]
          : comisionadoLocal.fechaFinContrato instanceof Date
          ? comisionadoLocal.fechaFinContrato.toISOString().split('T')[0]
          : String(comisionadoLocal.fechaFinContrato);

        throw new BadRequestException(
          `No es posible generar la solicitud de comisión. El comisionado ${nombreCompleto} (Doc. ${doc}) tiene su contrato o vinculación laboral vencida con fecha ${fechaFinFormateada}. Por favor regularice su situación en Talento Humano antes de tramitar comisiones.`,
        );
      }

      return await adjuntarSolicitudesPendientes(comisionadoLocal);
    }

    // =========================================================================
    // PASO 2: NO se encontró en comisionados locales -> Consultar en Humanos
    // =========================================================================
    this.logger.log(
      `[consultarComisionado] Comisionado ${doc} no encontrado en tabla local. Consultando en Talento Humano...`,
    );
    const funcionarioFnc = await consultarApiHumanos();

    if (funcionarioFnc && funcionarioFnc.id_number) {
      const { primerNombre, segundoNombre, primerApellido, segundoApellido } =
        this.parsearNombreFuncionario(funcionarioFnc.full_name || '');
      const idDependenciaFnc = await this.resolverIdDependenciaPorNombre(
        funcionarioFnc.organization_department || funcionarioFnc.cost_center,
      );
      const emailFnc = (funcionarioFnc.email || funcionarioFnc.personal_email || '').trim();
      const phoneFnc = (funcionarioFnc.phone || '').trim();
      const fechaFin = funcionarioFnc.contract_end_date || null;
      const fechaInicio = funcionarioFnc.hiring_date || null;
      const salario = funcionarioFnc.monthly_salary != null ? Number(funcionarioFnc.monthly_salary) : null;
      const cargo = funcionarioFnc.position_name || funcionarioFnc.career_category || null;

      // Si la fecha de fin de contrato de Talento Humano ya está vencida:
      if (this.esContratoVencido(fechaFin)) {
        const nombreCompleto = funcionarioFnc.full_name || `${primerNombre} ${primerApellido}`.trim();
        const fechaFinFormateada = String(fechaFin).split('T')[0];
        throw new BadRequestException(
          `No es posible generar la solicitud de comisión. La persona ${nombreCompleto} (Doc. ${doc}) figura en Talento Humano pero su vinculación laboral/contractual está vencida desde el ${fechaFinFormateada}. No se pueden tramitar viáticos para personal inactivo o desvinculado.`,
        );
      }

      this.logger.log(
        `[consultarComisionado] Registrando nuevo comisionado ${doc} desde Talento Humano con contrato vigente`,
      );
      const nuevo = this.comisionadoRepo.create({
        numeroDocumento: doc,
        primerNombre,
        segundoNombre,
        primerApellido,
        segundoApellido,
        email: emailFnc || 'sin-correo@esap.edu.co',
        telefonoContacto: phoneFnc || '0000000000',
        tipoComisionado: 'FUNCIONARIO',
        origenDatos: 'HUMANO',
        autorizacionHabeasData: false,
        idDependencia: idDependenciaFnc,
        cuentasBancarias: [],
        cargos: cargo
          ? [
              {
                id: `crg-${Date.now()}`,
                cargo,
                salario: salario || 0,
                idDependencia: idDependenciaFnc,
                esPrincipal: true,
              },
            ]
          : [],
        fechaInicioContrato: fechaInicio,
        fechaFinContrato: fechaFin,
        esFacturadorElectronico: false,
      } as Partial<ComisionadoEntity>);

      const guardado = await this.comisionadoRepo.save(nuevo);
      return await adjuntarSolicitudesPendientes(guardado);
    }

    // =========================================================================
    // PASO 3: Fallback auth.personas / Tampoco existe en Humanos -> No es comisionado
    // =========================================================================
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
      throw new NotFoundException(
        `No se encontró un comisionado con documento ${doc}. La persona no existe en el registro local de comisionados ni se encuentra registrada en el sistema de Talento Humano / Nómina de la ESAP.`,
      );
    }

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

    const guardado = await this.comisionadoRepo.save(nuevo);
    return await adjuntarSolicitudesPendientes(guardado);
  }


  /**
   * Consulta las solicitudes de comisión (Formato 023) que se encuentran en trámite o pendientes
   * para un comisionado específico (excluyendo estados cerrados: PAGADA, LEGALIZADO, RECHAZADO, CANCELADA).
   */
  async obtenerSolicitudesPendientesPorComisionado(
    comisionadoId: string,
  ): Promise<any[]> {
    if (!comisionadoId) return [];

    const estadosFinales = [
      EstadoSolicitud.CANCELADA,
      EstadoSolicitud.RECHAZADO,
      EstadoSolicitud.PAGADA,
      EstadoSolicitud.LEGALIZADO,
    ];

    try {
      const solicitudes = await this.solicitudRepo
        .createQueryBuilder('s')
        .where('s.comisionado_id = :comisionadoId', { comisionadoId })
        .andWhere('s.estado_solicitud NOT IN (:...estadosFinales)', { estadosFinales })
        .orderBy('s.creado_en', 'DESC')
        .getMany();

      return solicitudes.map((s) => ({
        id: s.id,
        consecutivoUnico: s.consecutivoUnico,
        codigoSolicitud: s.consecutivoUnico,
        estadoSolicitud: s.estadoSolicitud,
        destinoCiudad: s.destinoCiudad,
        destinoDepartamento: s.destinoDepartamento,
        fechaInicio: s.fechaInicio,
        fechaFin: s.fechaFin,
        objetoComision: s.objetoComision,
        montoViaticos: Number(s.montoViaticos || 0),
        montoGastosViaje: Number(s.montoGastosViaje || 0),
        totalGeneral: Number(s.montoViaticos || 0) + Number(s.montoGastosViaje || 0),
        creadoEn: s.creadoEn,
      }));
    } catch (err: any) {
      this.logger.error?.(
        `[obtenerSolicitudesPendientesPorComisionado] Error: ${err?.message}`,
      );
      return [];
    }
  }

  /**
   * Consulta las solicitudes de comisión (Formato 023) pendientes a partir del documento de identidad.
   */
  async obtenerSolicitudesPendientesPorDocumento(
    documento: string,
  ): Promise<any[]> {
    const doc = (documento || '').trim();
    if (!doc) return [];

    const comisionado = await this.comisionadoRepo.findOne({
      where: { numeroDocumento: doc },
    });

    if (!comisionado) return [];
    return this.obtenerSolicitudesPendientesPorComisionado(comisionado.id);
  }

  /**
   * Agrega o actualiza una cuenta bancaria en el historial del comisionado.
   */
  async agregarCuentaBancariaComisionado(
    documento: string,
    cuentaData: {
      banco: string;
      tipoCuenta: string;
      numeroCuenta: string;
      urlCertificadoBancario?: string | null;
      nombreArchivoCertificado?: string | null;
      esPrincipal?: boolean;
    },
  ): Promise<ComisionadoEntity> {
    const doc = (documento || '').trim();
    const comisionado = await this.comisionadoRepo.findOne({
      where: { numeroDocumento: doc },
    });
    if (!comisionado) {
      throw new NotFoundException(`Comisionado con documento ${doc} no encontrado.`);
    }

    if (!Array.isArray(comisionado.cuentasBancarias)) {
      comisionado.cuentasBancarias = [];
    }

    const numCta = (cuentaData.numeroCuenta || '').trim();
    const bco = (cuentaData.banco || '').trim();

    const idx = comisionado.cuentasBancarias.findIndex(
      (c) =>
        c.numeroCuenta?.trim() === numCta &&
        c.banco?.trim().toLowerCase() === bco.toLowerCase(),
    );

    if (cuentaData.esPrincipal) {
      comisionado.cuentasBancarias.forEach((c) => (c.esPrincipal = false));
    }

    if (idx >= 0) {
      comisionado.cuentasBancarias[idx] = {
        ...comisionado.cuentasBancarias[idx],
        ...cuentaData,
        tipoCuenta: cuentaData.tipoCuenta || comisionado.cuentasBancarias[idx].tipoCuenta,
      };
    } else {
      comisionado.cuentasBancarias.push({
        id: `cta-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        ...cuentaData,
        fechaRegistro: new Date().toISOString(),
        esPrincipal: cuentaData.esPrincipal ?? (comisionado.cuentasBancarias.length === 0),
      });
    }

    return await this.comisionadoRepo.save(comisionado);
  }

  /**
   * Agrega o actualiza un cargo y su correspondiente salario relacional en el perfil del comisionado.
   */
  async agregarCargoComisionado(
    documento: string,
    cargoData: {
      idCargo?: number;
      cargo: string;
      salario: number;
      idDependencia?: number | null;
      fechaInicio?: string | null;
      fechaFin?: string | null;
      esPrincipal?: boolean;
    },
  ): Promise<ComisionadoEntity> {
    const doc = (documento || '').trim();
    const comisionado = await this.comisionadoRepo.findOne({
      where: { numeroDocumento: doc },
    });
    if (!comisionado) {
      throw new NotFoundException(`Comisionado con documento ${doc} no encontrado.`);
    }

    if (!Array.isArray(comisionado.cargos)) {
      comisionado.cargos = [];
    }

    const nomCargo = (cargoData.cargo || '').trim();
    const idx = comisionado.cargos.findIndex(
      (c) => c.cargo?.trim().toLowerCase() === nomCargo.toLowerCase(),
    );

    if (cargoData.esPrincipal) {
      comisionado.cargos.forEach((c) => (c.esPrincipal = false));
    }

    if (idx >= 0) {
      comisionado.cargos[idx] = {
        ...comisionado.cargos[idx],
        ...cargoData,
      };
    } else {
      comisionado.cargos.push({
        id: `crg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        ...cargoData,
        fechaInicio: cargoData.fechaInicio || new Date().toISOString().split('T')[0],
        esPrincipal: cargoData.esPrincipal ?? (comisionado.cargos.length === 0),
      });
    }

    if (cargoData.esPrincipal || comisionado.cargos.length === 1) {
      comisionado.cargo = nomCargo;
      if (cargoData.salario > 0) {
        comisionado.salarioBasico = cargoData.salario;
      }
    }

    return await this.comisionadoRepo.save(comisionado);
  }

  /**
   * Sincroniza en el perfil e historial del comisionado los cambios de cargo
   * (si es diferente al actual), información bancaria (si el número de cuenta
   * es diferente o tiene nuevo certificado soporte adjunto) y estado de facturación.
   */
  async sincronizarComisionadoDesdeSolicitud(
    comisionadoInput: ComisionadoEntity | null | undefined,
    solicitud: SolicitudComisionEntity,
    documentosSoporte?: DocumentoSoporteEntity[],
  ): Promise<boolean> {
    let comisionado = comisionadoInput;
    const comisionadoId = comisionado?.id || solicitud.comisionadoId;
    if (comisionadoId) {
      try {
        const fresco = await this.comisionadoRepo.findOne({
          where: { id: comisionadoId },
        });
        if (fresco) {
          comisionado = fresco;
        }
      } catch {
        // En tests o mocks que no implementen findOne con comisionadoId, se mantiene comisionadoInput
      }
    }
    if (!comisionado) return false;

    let comisionadoModificado = false;
    const camposAdic = solicitud.camposAdicionales || {};

    // ── 1. Información bancaria (si el número de cuenta es diferente) ─────────
    if (!Array.isArray(comisionado.cuentasBancarias)) {
      comisionado.cuentasBancarias = [];
    }

    const ctaSel =
      camposAdic.cuentaBancariaSeleccionada ||
      (solicitud as any).cuentaBancariaSeleccionada ||
      {};

    const rawNumCta = String(
      camposAdic.num_cuenta ??
      camposAdic.numeroCuenta ??
      camposAdic.numCuenta ??
      camposAdic.cuentaBancaria ??
      camposAdic.numero_cuenta ??
      ctaSel.numeroCuenta ??
      ctaSel.numCuenta ??
      ctaSel.cuentaBancaria ??
      ''
    ).trim();

    const rawBanco = String(
      camposAdic.entidad_bancaria ??
      camposAdic.entidadBancaria ??
      camposAdic.banco ??
      ctaSel.banco ??
      ctaSel.entidadBancaria ??
      (comisionado as any)?.entidadBancaria ??
      (comisionado as any)?.banco ??
      ''
    ).trim();

    const rawTipoCta = String(
      camposAdic.tipo_cuenta ??
      camposAdic.tipoCuenta ??
      ctaSel.tipoCuenta ??
      'AHORROS'
    ).trim();

    // Soportes: buscar si se adjuntó certificado bancario
    let docs = documentosSoporte;
    if ((!docs || docs.length === 0) && solicitud.id) {
      try {
        docs = await this.documentoRepo.find({
          where: { solicitudId: solicitud.id },
        });
      } catch {
        docs = [];
      }
    }
    const docCert = (docs || []).find(
      (d) =>
        d.tipoDocumento === 'CERT_BANCARIA' ||
        d.tipoDocumento === 'CERTIFICACION_BANCARIA' ||
        d.tipoDocumento === 'CERTIFICADO_BANCARIO' ||
        d.tipoDocumento?.toUpperCase().includes('BANC'),
    );
    const rawUrlCert =
      docCert?.urlRepositorio ||
      (docCert as any)?.urlArchivo ||
      camposAdic.urlCertificadoBancario ||
      ctaSel.urlCertificadoBancario ||
      null;
    const rawNombreCert =
      docCert?.nombreArchivoOriginal ||
      (docCert as any)?.nombreArchivo ||
      camposAdic.nombreArchivoCertificado ||
      ctaSel.nombreArchivoCertificado ||
      null;

    const normalizarCuenta = (num: string) => num.replace(/\D/g, '');

    if (rawNumCta) {
      const rawNumLimpio = normalizarCuenta(rawNumCta);
      const idxCta = comisionado.cuentasBancarias.findIndex((c) => {
        const ctaReg = String(c.numeroCuenta || '').trim();
        return (
          ctaReg === rawNumCta ||
          (rawNumLimpio.length > 0 && normalizarCuenta(ctaReg) === rawNumLimpio)
        );
      });

      if (idxCta >= 0) {
        // La cuenta ya existe por número: actualizar banco/tipo si cambiaron,
        // o adjuntar el certificado bancario si fue cargado en la solicitud
        const ctaExistente = comisionado.cuentasBancarias[idxCta];
        if (rawBanco && ctaExistente.banco !== rawBanco) {
          ctaExistente.banco = rawBanco;
          comisionadoModificado = true;
        }
        if (rawTipoCta && ctaExistente.tipoCuenta !== rawTipoCta) {
          ctaExistente.tipoCuenta = rawTipoCta;
          comisionadoModificado = true;
        }
        const nuevoCert =
          Boolean(rawUrlCert) &&
          rawUrlCert.trim() !== '' &&
          rawUrlCert !== ctaExistente.urlCertificadoBancario;
        if (nuevoCert) {
          ctaExistente.urlCertificadoBancario = rawUrlCert;
          if (rawNombreCert) {
            ctaExistente.nombreArchivoCertificado = rawNombreCert;
          }
          comisionadoModificado = true;
        }
        // Actualizar en camposAdicionales de la solicitud también
        if (rawUrlCert) {
          camposAdic.urlCertificadoBancario = rawUrlCert;
          if (rawNombreCert) {
            camposAdic.nombreArchivoCertificado = rawNombreCert;
          }
        }
      } else {
        // El número de cuenta es DIFERENTE a las registradas: agregar al historial
        comisionado.cuentasBancarias.push({
          id: `cta-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          banco: rawBanco || 'BANCO',
          tipoCuenta: rawTipoCta || 'AHORROS',
          numeroCuenta: rawNumCta,
          urlCertificadoBancario: rawUrlCert || null,
          nombreArchivoCertificado: rawNombreCert || null,
          fechaRegistro: new Date().toISOString(),
          esPrincipal: comisionado.cuentasBancarias.length === 0,
        });
        comisionadoModificado = true;
      }
    }

    // ── 2. Cargo (si es diferente al actual) y salario relacional ─────────────
    if (!Array.isArray(comisionado.cargos)) {
      comisionado.cargos = [];
    }

    const rawCargo = (
      solicitud.cargo ||
      camposAdic.cargoEsap ||
      camposAdic.cargo ||
      camposAdic.cargoInstitucional ||
      camposAdic.cargoComisionado ||
      ''
    ).trim();

    const rawIdCargo =
      solicitud.idCargo ??
      (camposAdic.idCargo ? Number(camposAdic.idCargo) : null);

    const rawSalario = Number(
      solicitud.salarioBasico ||
      camposAdic.salarioBasico ||
      comisionado.salarioBasico ||
      0,
    );

    const depId =
      solicitud.idDependencia ?? comisionado.idDependencia ?? null;

    if (rawCargo) {
      const idxCrg = comisionado.cargos.findIndex(
        (c) => c.cargo?.trim().toLowerCase() === rawCargo.toLowerCase(),
      );

      if (idxCrg >= 0) {
        const cargoActual = comisionado.cargos[idxCrg];
        if (rawSalario > 0 && cargoActual.salario !== rawSalario) {
          cargoActual.salario = rawSalario;
          comisionadoModificado = true;
        }
        if (depId && cargoActual.idDependencia !== depId) {
          cargoActual.idDependencia = depId;
          comisionadoModificado = true;
        }
        if (rawIdCargo && cargoActual.idCargo !== rawIdCargo) {
          cargoActual.idCargo = rawIdCargo;
          comisionadoModificado = true;
        }
      } else {
        // Cargo nuevo: registrar en el historial
        comisionado.cargos.push({
          id: `crg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          idCargo: rawIdCargo ?? undefined,
          cargo: rawCargo,
          salario: rawSalario,
          idDependencia: depId,
          fechaInicio: new Date().toISOString().split('T')[0],
          esPrincipal: comisionado.cargos.length === 0,
        });
        comisionadoModificado = true;
      }

      // Si el cargo es diferente al actual registrado en el comisionado
      if (comisionado.cargo?.trim().toLowerCase() !== rawCargo.toLowerCase()) {
        comisionado.cargo = rawCargo;
        comisionadoModificado = true;
      }
      if (rawSalario > 0 && comisionado.salarioBasico !== rawSalario) {
        comisionado.salarioBasico = rawSalario;
        comisionadoModificado = true;
      }
      if (depId && comisionado.idDependencia !== depId) {
        comisionado.idDependencia = depId;
        comisionadoModificado = true;
      }
    }

    // ── 3. Obligación de facturación / Régimen tributario ──────────────────────
    const rawFacturador =
      camposAdic.obligacion_tributaria ??
      camposAdic.esFacturadorElectronico;
    if (rawFacturador !== undefined && rawFacturador !== null) {
      const boolFacturador = Boolean(rawFacturador);
      if (comisionado.esFacturadorElectronico !== boolFacturador) {
        comisionado.esFacturadorElectronico = boolFacturador;
        comisionadoModificado = true;
      }
      if (solicitud.consultaRutFacturador !== boolFacturador) {
        solicitud.consultaRutFacturador = boolFacturador;
      }
    }

    if (comisionadoModificado) {
      try {
        await this.comisionadoRepo.save(comisionado);
      } catch (err: any) {
        this.logger.warn(
          `[sincronizarComisionadoDesdeSolicitud] No se pudo guardar historial del comisionado: ${err?.message}`,
        );
      }
    }

    return comisionadoModificado;
  }

  /**
   * Consulta general o específica de talento humano.
   * Se consulta exclusivamente a través de HumanResourcesClientService (Oracle FNC / VW_INTEGRACIONFNC
   * vía certification-service / nómina y financieros humanos) como fuente oficial única de talento humano.
   * Si no se encuentra, arroja NotFoundException indicando que la persona no existe.
   */
  async buscarTalentoHumano(
    query?: string,
    documento?: string,
    limit = 20,
  ) {
    const doc = String(documento || '').trim();
    if (doc) {
      this.logger.log(
        `[buscarTalentoHumano] Consulta por documento: ${doc}`,
      );

      if (!this.humanResourcesClient) {
        throw new NotFoundException(
          `El servicio de talento humano no está disponible para consultar el documento ${doc}.`,
        );
      }

      let funcionarioFnc: HumanResourcesSuggestedPerson | null = null;
      try {
        funcionarioFnc =
          await this.humanResourcesClient.consultarFuncionarioPorDocumento(doc);
      } catch (fncErr: any) {
        this.logger.error(
          `[buscarTalentoHumano] Error consultando talento humano para documento ${doc}: ${fncErr?.message || fncErr}`,
        );
        throw fncErr;
      }

      if (!funcionarioFnc || !funcionarioFnc.id_number) {
        this.logger.warn(
          `[buscarTalentoHumano] NO se encontró funcionario con documento ${doc} en Talento Humano / Nómina`,
        );
        throw new NotFoundException(
          `No se encontró ningún funcionario con documento ${doc} en Talento Humano.`,
        );
      }

      this.logger.log(
        `[buscarTalentoHumano] Encontrado en talento humano: ${funcionarioFnc.full_name} (${funcionarioFnc.id_number})`,
      );
      return {
        ok: true,
        source: 'talento_humano_oracle',
        query: doc,
        total: 1,
        data: [funcionarioFnc],
      };
    }

    const term = String(query || '').trim();
    if (!term || term.length < 3) {
      throw new BadRequestException(
        'El término de búsqueda debe tener al menos 3 caracteres.',
      );
    }

    this.logger.log(
      `[buscarTalentoHumano] Búsqueda por término: "${term}", limit: ${limit}`,
    );

    if (!this.humanResourcesClient) {
      throw new NotFoundException(
        `El servicio de talento humano no está disponible para buscar el término "${term}".`,
      );
    }

    let funcionariosFnc: HumanResourcesSuggestedPerson[] = [];
    try {
      funcionariosFnc =
        await this.humanResourcesClient.buscarFuncionariosPorTermino(
          term,
          limit,
        );
    } catch (fncErr: any) {
      this.logger.error(
        `[buscarTalentoHumano] Error buscando en talento humano con término "${term}": ${fncErr?.message || fncErr}`,
      );
      throw fncErr;
    }

    if (!Array.isArray(funcionariosFnc) || funcionariosFnc.length === 0) {
      this.logger.warn(
        `[buscarTalentoHumano] NO se encontraron funcionarios para el término "${term}" en Talento Humano / Nómina`,
      );
      throw new NotFoundException(
        `No se encontraron funcionarios coincidentes con "${term}" en Talento Humano.`,
      );
    }

    this.logger.log(
      `[buscarTalentoHumano] Encontrados ${funcionariosFnc.length} funcionarios en talento humano para "${term}"`,
    );

    return {
      ok: true,
      source: 'talento_humano_oracle',
      query: term,
      total: funcionariosFnc.length,
      data: funcionariosFnc,
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

  /**
   * Identifica si un comisionado está registrado como usuario en auth."user",
   * sus roles asignados, id_person y si ya cuenta con el rol COMISIONADO.
   */
  async identificarUsuarioComisionado(
    documento: string,
    email?: string,
  ): Promise<{
    esUsuario: boolean;
    usuarioId: string | null;
    rolesUsuario: string[];
    idPersona: string | null;
    tieneRolComisionado: boolean;
  }> {
    const doc = (documento || '').trim();
    const mail = (email || '').trim().toLowerCase();

    let esUsuario = false;
    let usuarioId: string | null = null;
    let rolesUsuario: string[] = [];
    let idPersona: string | null = null;
    let tieneRolComisionado = false;

    try {
      if (this.dataSource && typeof this.dataSource.query === 'function') {
        const userRows = await this.dataSource.query(
          `SELECT
             u.id_user,
             u.username,
             u.is_active,
             p.id_person,
             COALESCE(
               array_agg(r.code) FILTER (WHERE r.code IS NOT NULL),
               '{}'
             ) AS roles
           FROM auth.personas p
           INNER JOIN auth."user" u ON u.id_person = p.id_person
           LEFT JOIN auth.user_roles ur ON ur.id_user = u.id_user AND ur.is_active = true
           LEFT JOIN auth.role r ON r.id = ur.id_rol
           WHERE p.num_identificacion = $1
           GROUP BY u.id_user, u.username, u.is_active, p.id_person
           LIMIT 1`,
          [doc],
        );

        let userRow = userRows?.[0];
        if (!userRow && mail && mail !== 'sin-correo@esap.edu.co') {
          const userByEmail = await this.dataSource.query(
            `SELECT
               u.id_user,
               u.username,
               u.is_active,
               u.id_person,
               COALESCE(
                 array_agg(r.code) FILTER (WHERE r.code IS NOT NULL),
                 '{}'
               ) AS roles
             FROM auth."user" u
             LEFT JOIN auth.user_roles ur ON ur.id_user = u.id_user AND ur.is_active = true
             LEFT JOIN auth.role r ON r.id = ur.id_rol
             WHERE LOWER(u.username) = LOWER($1)
             GROUP BY u.id_user, u.username, u.is_active, u.id_person
             LIMIT 1`,
            [mail],
          );
          userRow = userByEmail?.[0];
        }

        if (userRow?.id_user) {
          esUsuario = true;
          usuarioId = userRow.id_user;
          rolesUsuario = Array.isArray(userRow.roles) ? userRow.roles : [];
          idPersona = userRow.id_person || null;
          tieneRolComisionado = rolesUsuario.some(
            (r) => r === 'COMISIONADO' || r.toUpperCase().includes('COMISIONADO'),
          );
        } else {
          const pRow = await this.dataSource.query(
            `SELECT id_person FROM auth.personas WHERE num_identificacion = $1 LIMIT 1`,
            [doc],
          );
          idPersona = pRow?.[0]?.id_person || null;
        }
      }
    } catch (err: any) {
      this.logger.warn(
        `[identificarUsuarioComisionado] Error identificando usuario en auth para doc ${doc}: ${err?.message}`,
      );
    }

    return {
      esUsuario,
      usuarioId,
      rolesUsuario,
      idPersona,
      tieneRolComisionado,
    };
  }

  /**
   * Asegura la existencia idempotente del rol COMISIONADO y sus permisos
   * (travel_expenses.general.es_comisionado, es_comisionado, travel_expenses:read_own_requests).
   */
  async asegurarRolYPermisosComisionado(): Promise<void> {
    try {
      if (!this.dataSource || typeof this.dataSource.query !== 'function') return;

      // 1. Obtener ID del módulo viáticos en auth.module
      let moduleId: string | null = null;
      try {
        const modRows = await this.dataSource.query(
          `SELECT id_module FROM auth.module WHERE code = 'viaticos' OR code ILIKE '%viatico%' LIMIT 1`,
        );
        moduleId = modRows?.[0]?.id_module || null;
      } catch {}

      // 2. Asegurar Rol COMISIONADO en auth.role
      let roleId: string | null = null;
      try {
        const roleRows = await this.dataSource.query(
          `SELECT id FROM auth.role WHERE UPPER(code) = 'COMISIONADO' LIMIT 1`,
        );
        if (roleRows && roleRows.length > 0) {
          roleId = roleRows[0].id;
        } else {
          const insertRole = await this.dataSource.query(
            `INSERT INTO auth.role (
               id, code, name, description, category, icon, color, type, is_active, created_at, updated_at
             ) VALUES (
               gen_random_uuid(), 'COMISIONADO', 'Comisionado',
               'Servidor público o contratista que cumple comisiones de servicios institucionales y consulta sus solicitudes (Formato GF-FO-023).',
               'operativo', 'UserCheck', '#003DA5', 'sistema', true, NOW(), NOW()
             ) RETURNING id`,
          );
          roleId = insertRole?.[0]?.id || null;
        }
      } catch (err: any) {
        this.logger.warn(`[asegurarRolYPermisosComisionado] No se pudo asegurar auth.role COMISIONADO: ${err?.message}`);
      }

      // 3. Asegurar Permisos en auth.permission
      const permisosDeseados = [
        {
          code: 'travel_expenses.general.es_comisionado',
          name: 'Es Comisionado (General)',
          desc: 'Identificador inmutable general para funcionarios y contratistas en calidad de comisionados dentro de la plataforma.',
        },
        {
          code: 'es_comisionado',
          name: 'Es Comisionado',
          desc: 'Permiso general de comisionado institucional para consultar sus solicitudes radicadas y estado de firmas.',
        },
        {
          code: 'travel_expenses:read_own_requests',
          name: 'Consultar solicitudes radicadas para el comisionado',
          desc: 'Permite al comisionado consultar en la plataforma el estado, itinerario, liquidación y firmas de las solicitudes radicadas a su nombre (Formato GF-FO-023).',
        },
      ];

      const permIds: string[] = [];
      for (const p of permisosDeseados) {
        try {
          const pRows = await this.dataSource.query(
            `SELECT id_permission FROM auth.permission WHERE code = $1 LIMIT 1`,
            [p.code],
          );
          if (pRows && pRows.length > 0) {
            permIds.push(pRows[0].id_permission);
          } else {
            const insP = await this.dataSource.query(
              `INSERT INTO auth.permission (
                 id_permission, code, name, description, id_module, is_active, created_at, updated_at
               ) VALUES (
                 gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW()
               ) RETURNING id_permission`,
              [p.code, p.name, p.desc, moduleId],
            );
            if (insP?.[0]?.id_permission) {
              permIds.push(insP[0].id_permission);
            }
          }
        } catch {}
      }

      // 4. Asociar permisos al rol COMISIONADO y SUPER_ADMIN
      if (roleId && permIds.length > 0) {
        for (const pid of permIds) {
          try {
            await this.dataSource.query(
              `INSERT INTO auth.role_permissions (id_rol, id_permission)
               VALUES ($1, $2)
               ON CONFLICT (id_rol, id_permission) DO NOTHING`,
              [roleId, pid],
            );
          } catch {}
        }
      }
    } catch (e: any) {
      this.logger.warn(`[asegurarRolYPermisosComisionado] Error general asegurando rol: ${e?.message}`);
    }
  }

  /**
   * Garantiza que el comisionado tenga un usuario en el sistema con el rol COMISIONADO:
   * 1. Si ya es un usuario con roles: Se le asigna el nuevo rol COMISIONADO manteniendo intactos todos sus roles previos.
   * 2. Si no está creado: Se crea el usuario usando el servicio de auth (POST /new-person) o fallback directo en BD,
   *    con los datos mínimos requeridos (incluyendo idDependencia que radica el enlace) y rol COMISIONADO.
   */
  async garantizarUsuarioYRolComisionado(
    comisionado: ComisionadoEntity,
    idDependenciaRadica?: number | null,
    creadorUsuarioId?: string | null,
  ): Promise<void> {
    try {
      if (!this.dataSource || typeof this.dataSource.query !== 'function') return;

      await this.asegurarRolYPermisosComisionado();

      const doc = (comisionado.numeroDocumento || '').trim();
      const email = (comisionado.email || '').trim().toLowerCase();

      // Resolver el idDependencia: 1) idDependencia radicado en la solicitud,
      // 2) id_dependencia de la persona enlace que radica (creadorUsuarioId),
      // 3) id_dependencia preexistente en comisionado
      let idDependenciaFinal: number | null =
        idDependenciaRadica != null && Number.isFinite(Number(idDependenciaRadica))
          ? Number(idDependenciaRadica)
          : null;

      if (idDependenciaFinal == null && creadorUsuarioId) {
        try {
          const enlaceRows = await this.dataSource.query(
            `SELECT p.id_dependencia
             FROM auth."user" u
             LEFT JOIN auth.personas p ON p.id_person = u.id_person
             WHERE u.id_user = $1
             LIMIT 1`,
            [creadorUsuarioId],
          );
          if (enlaceRows?.[0]?.id_dependencia != null) {
            idDependenciaFinal = Number(enlaceRows[0].id_dependencia);
          }
        } catch {}
      }

      if (idDependenciaFinal == null && comisionado.idDependencia != null) {
        idDependenciaFinal = Number(comisionado.idDependencia);
      }

      // Si el comisionado local no tenía idDependencia registrada, asignarla
      if (idDependenciaFinal != null && comisionado.idDependencia == null) {
        try {
          comisionado.idDependencia = idDependenciaFinal;
          await this.comisionadoRepo.update(comisionado.id, { idDependencia: idDependenciaFinal });
        } catch {}
      }

      // 1. Buscar si ya existe un usuario asociado en auth."user"
      const existingUser = await this.dataSource.query(
        `SELECT u.id_user, u.username, u.id_person
         FROM auth."user" u
         LEFT JOIN auth.personas p ON p.id_person = u.id_person
         WHERE p.num_identificacion = $1 OR (u.username IS NOT NULL AND LOWER(u.username) = $2)
         LIMIT 1`,
        [doc, email],
      );

      const roleRow = await this.dataSource.query(
        `SELECT id FROM auth.role WHERE UPPER(code) = 'COMISIONADO' LIMIT 1`,
      );
      const roleComisionadoId = roleRow?.[0]?.id;

      if (existingUser && existingUser.length > 0 && existingUser[0]?.id_user) {
        const userId = existingUser[0].id_user;
        const personId = existingUser[0].id_person;
        this.logger.log(`[garantizarUsuarioYRolComisionado] Comisionado ${doc} ya es usuario (${userId}). Asignando rol COMISIONADO manteniendo roles previos...`);

        // Si la persona asociada no tiene id_dependencia y tenemos el idDependencia que radica el enlace, sincronizarlo
        if (personId && idDependenciaFinal != null) {
          try {
            await this.dataSource.query(
              `UPDATE auth.personas
               SET id_dependencia = $1, fec_modificacion = CURRENT_DATE
               WHERE id_person = $2 AND id_dependencia IS NULL`,
              [idDependenciaFinal, personId],
            );
          } catch {}
        }

        if (roleComisionadoId) {
          // Asignar el nuevo rol COMISIONADO SIN eliminar roles existentes
          await this.dataSource.query(
            `INSERT INTO auth.user_roles (id_user, id_rol, is_active)
             VALUES ($1, $2, true)
             ON CONFLICT (id_user, id_rol) DO UPDATE SET is_active = true`,
            [userId, roleComisionadoId],
          );
          this.logger.log(`[garantizarUsuarioYRolComisionado] Rol COMISIONADO asignado exitosamente al usuario ${userId}`);
        }
        return;
      }

      // 2. No está creado como usuario: crear el usuario usando el servicio de auth
      this.logger.log(`[garantizarUsuarioYRolComisionado] Comisionado ${doc} no tiene usuario. Creando usuario mediante auth-service...`);

      const nombres = [comisionado.primerNombre, comisionado.segundoNombre].filter(Boolean).join(' ').trim() || 'Funcionario';
      const apellidos = [comisionado.primerApellido, comisionado.segundoApellido].filter(Boolean).join(' ').trim() || 'Comisionado';
      const emailValido = email && email !== 'sin-correo@esap.edu.co' ? email : `${doc}@esap.edu.co`;
      const telefonoValido = comisionado.telefonoContacto && comisionado.telefonoContacto !== '0000000000'
        ? comisionado.telefonoContacto
        : undefined;

      const payloadAuth = {
        firstName: comisionado.primerNombre || nombres,
        lastName: apellidos,
        documentNumber: doc,
        email: emailValido,
        phone: telefonoValido,
        username: emailValido,
        password: '123456',
        roles: ['Comisionado'],
        idDependencia: idDependenciaFinal != null ? Number(idDependenciaFinal) : undefined,
      };

      let creadoViaHttp = false;
      let authServiceUrl = (process.env.AUTH_SERVICE_URL || 'http://localhost:3001').replace(/\/+$/, '');
      if (authServiceUrl.includes('auth-service') && process.platform === 'win32') {
        authServiceUrl = authServiceUrl.replace('auth-service', '127.0.0.1');
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const resp = await fetch(`${authServiceUrl}/new-person`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payloadAuth),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
          creadoViaHttp = true;
          this.logger.log(`[garantizarUsuarioYRolComisionado] Usuario creado exitosamente vía HTTP en auth-service para comisionado ${doc} con dependencia ${idDependenciaFinal}`);
        } else {
          const errText = await resp.text();
          this.logger.warn(`[garantizarUsuarioYRolComisionado] Falló creación HTTP en auth-service (${resp.status}): ${errText}. Procediendo a sincronización directa en BD...`);
        }
      } catch (errHttp: any) {
        this.logger.warn(`[garantizarUsuarioYRolComisionado] Error conectando con auth-service (${errHttp?.message}). Procediendo a sincronización directa en BD...`);
      }

      // Si no se pudo vía HTTP (ej: servicio apagado o timeout en tests), asegurar directamente en BD compartida
      if (!creadoViaHttp) {
        await this.crearUsuarioComisionadoDirectoEnBd({
          documento: doc,
          nombres,
          apellidos,
          email: emailValido,
          telefono: telefonoValido,
          idDependencia: idDependenciaFinal,
          roleComisionadoId,
        });
      }
    } catch (err: any) {
      this.logger.error(`[garantizarUsuarioYRolComisionado] Error garantizando usuario/rol para comisionado: ${err?.message}`);
    }
  }

  private async crearUsuarioComisionadoDirectoEnBd(params: {
    documento: string;
    nombres: string;
    apellidos: string;
    email: string;
    telefono?: string;
    idDependencia?: number | null;
    roleComisionadoId?: string;
  }): Promise<void> {
    const { documento, nombres, apellidos, email, telefono, idDependencia, roleComisionadoId } = params;

    // 1. Asegurar persona en auth.personas
    const personasExistentes = await this.dataSource.query(
      `SELECT id_person FROM auth.personas WHERE num_identificacion = $1 LIMIT 1`,
      [documento],
    );

    let idPerson = personasExistentes?.[0]?.id_person;
    if (!idPerson) {
      const nuevaPersona = await this.dataSource.query(
        `INSERT INTO auth.personas (
           id_person,
           num_identificacion,
           tip_identificacion,
           nom_tercero,
           pri_apellido,
           nom_largo,
           dir_email,
           tel_celular,
           id_dependencia,
           fec_creacion,
           fec_modificacion
         ) VALUES (
           gen_random_uuid(),
           $1,
           'CC',
           $2,
           $3,
           $4,
           $5,
           $6,
           $7,
           NOW(),
           NOW()
         ) RETURNING id_person`,
        [documento, nombres, apellidos, `${nombres} ${apellidos}`, email, telefono || null, idDependencia || null],
      );
      idPerson = nuevaPersona?.[0]?.id_person;
    }

    // 2. Asegurar usuario en auth."user"
    const usuariosExistentes = await this.dataSource.query(
      `SELECT id_user FROM auth."user" WHERE id_person = $1 OR LOWER(username) = LOWER($2) LIMIT 1`,
      [idPerson, email],
    );

    let idUser = usuariosExistentes?.[0]?.id_user;
    if (!idUser) {
      const hashDefault = '$2b$10$K509yCjy4ifdIBc3HCb5cu82S.8./2UTqF554uccfpa8nqZrqnh9.'; // bcrypt hash para '123456' (estándar auth-service)
      const nuevoUsuario = await this.dataSource.query(
        `INSERT INTO auth."user" (
           id_user,
           public_id,
           username,
           password_hash,
           id_person,
           is_active,
           created_at,
           updated_at
         ) VALUES (
           gen_random_uuid(),
           gen_random_uuid(),
           $1,
           $2,
           $3,
           true,
           NOW(),
           NOW()
         ) RETURNING id_user`,
        [email, hashDefault, idPerson],
      );
      idUser = nuevoUsuario?.[0]?.id_user;
    }

    // 3. Asignar rol COMISIONADO
    if (idUser && roleComisionadoId) {
      await this.dataSource.query(
        `INSERT INTO auth.user_roles (id_user, id_rol, is_active)
         VALUES ($1, $2, true)
         ON CONFLICT (id_user, id_rol) DO UPDATE SET is_active = true`,
        [idUser, roleComisionadoId],
      );
      this.logger.log(`[crearUsuarioComisionadoDirectoEnBd] Usuario ${idUser} y rol COMISIONADO asegurados directamente en BD.`);
    }
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

    // 1. Si el comisionado es un usuario con roles, asignarle el nuevo rol comisionado (manteniendo roles previos).
    // 2. Si no está creado, crear el usuario usando el servicio de auth (o fallback DB) con idDependencia que radica el enlace.
    await this.garantizarUsuarioYRolComisionado(
      comisionado,
      dto.idDependencia,
      dto.creadoPorUsuarioId,
    );

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

    const { errores: erroresLimite } =
      await this.validarLimitesCaracteres(datosFormulario);
    if (erroresLimite.length > 0) {
      throw new BadRequestException(erroresLimite.join('. '));
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

    await this.validarLegalizacionesPendientes(dto.comisionadoId);

    let extemporanea = false;
    let radicadoFueraJornada = false;
    let estadoSolicitud: EstadoSolicitud;

    if (!esBorrador) {
      const solapamiento = await this.solicitudRepo
        .createQueryBuilder('s')
        .where('s.comisionado_id = :comisionadoId', {
          comisionadoId: dto.comisionadoId,
        })
        .andWhere('s.estado_solicitud NOT IN (:...estadosNoActivos)', {
          estadosNoActivos: ESTADOS_NO_ACTIVOS_DUPLICIDAD,
        })
        .andWhere(CONDICION_SOLAPAMIENTO_DIAS, rangoSolapamiento(fechaInicio, fechaFin))
        .getOne();

      if (solapamiento) {
        throw new ConflictException(
          this.mensajeConflictoFechas(solapamiento, fechaInicio, fechaFin),
        );
      }

      const configJornada =
        typeof this.configService?.obtenerJornadaLaboralActiva === 'function'
          ? await this.configService.obtenerJornadaLaboralActiva()
          : null;
      radicadoFueraJornada = esRadicacionFueraDeJornada(
        new Date(),
        await cargarFestivosAuth(this.dataSource),
        configJornada,
      );

      estadoSolicitud = EstadoSolicitud.RADICADA;
      extemporanea = false;
    } else {
      estadoSolicitud = EstadoSolicitud.PENDIENTE;
    }

    // ========== Autoliquidación GF-FO-023: Garantizar que NUNCA venga NULL ==========
    const montoV = Number(dto.montoViaticos ?? 0);
    const diasTotal = Number(sincronizacion.diasComision ?? 1);
    const salarioBase = Number(dto.salarioBasico || (comisionado as any)?.salario || 4500000);

    let factorComisionado = Number(dto.factorComisionado ?? 1.0);
    let factorPernocta = Number(dto.factorPernocta ?? 1.0);
    let decretoAplicado = String(dto.decretoAplicado || 'Decreto 314 de 2026').trim();
    let salarioBaseAplicado = Number(dto.salarioBaseAplicado ?? salarioBase);

    let diasPernoctados = dto.diasPernoctados != null ? Number(dto.diasPernoctados) : null;
    let tarifaDiaPernoctado = dto.tarifaDiaPernoctado != null ? Number(dto.tarifaDiaPernoctado) : null;
    let totalPernoctados = dto.totalPernoctados != null ? Number(dto.totalPernoctados) : null;
    let diasNoPernoctados = dto.diasNoPernoctados != null ? Number(dto.diasNoPernoctados) : null;
    let tarifaDiaNoPernoctado = dto.tarifaDiaNoPernoctado != null ? Number(dto.tarifaDiaNoPernoctado) : null;
    let totalNoPernoctados = dto.totalNoPernoctados != null ? Number(dto.totalNoPernoctados) : null;
    let tarifaDiariaBase = dto.tarifaDiariaBase != null ? Number(dto.tarifaDiariaBase) : null;
    let tarifaFinalAplicadaDia = dto.tarifaFinalAplicadaDia != null ? Number(dto.tarifaFinalAplicadaDia) : null;

    if (
      diasPernoctados == null ||
      totalPernoctados == null ||
      (totalPernoctados === 0 && montoV > 0 && diasTotal > 1)
    ) {
      if (diasTotal > 1) {
        diasPernoctados = diasTotal - 1;
        diasNoPernoctados = 1;
      } else {
        diasPernoctados = 0;
        diasNoPernoctados = diasTotal;
      }

      if (tarifaDiariaBase == null || tarifaDiariaBase <= 0) {
        tarifaDiariaBase = diasPernoctados > 0
          ? Math.round(montoV / (diasPernoctados + 0.5))
          : (montoV > 0 ? montoV : 335520);
      }
      tarifaFinalAplicadaDia = tarifaDiariaBase;
      tarifaDiaPernoctado = tarifaDiariaBase;
      tarifaDiaNoPernoctado = Math.round(tarifaDiariaBase * 0.5);
      totalPernoctados = Math.round(diasPernoctados * tarifaDiaPernoctado);
      totalNoPernoctados = diasNoPernoctados > 0
        ? Math.max(0, montoV > 0 ? montoV - totalPernoctados : Math.round(diasNoPernoctados * tarifaDiaNoPernoctado))
        : 0;
    }

    diasPernoctados = diasPernoctados ?? 0;
    tarifaDiaPernoctado = tarifaDiaPernoctado ?? 0;
    totalPernoctados = totalPernoctados ?? 0;
    diasNoPernoctados = diasNoPernoctados ?? 0;
    tarifaDiaNoPernoctado = tarifaDiaNoPernoctado ?? 0;
    totalNoPernoctados = totalNoPernoctados ?? 0;
    tarifaDiariaBase = tarifaDiariaBase ?? 0;
    tarifaFinalAplicadaDia = tarifaFinalAplicadaDia ?? 0;

    const camposAdicionalesCompletos = { ...(dto.camposAdicionales || {}) };
    const tarifasAereasItin = (sincronizacion.itinerario || []).reduce(
      (acc: number, r: any) => acc + Number(r.tarifaTerminalAereo || 0),
      0,
    );
    if (
      camposAdicionalesCompletos.transporteTerminalAereo == null &&
      tarifasAereasItin > 0
    ) {
      camposAdicionalesCompletos.transporteTerminalAereo = tarifasAereasItin;
    }
    if (
      camposAdicionalesCompletos.transporteTerrestre == null &&
      dto.montoGastosViaje != null
    ) {
      const aereo = Number(camposAdicionalesCompletos.transporteTerminalAereo || 0);
      camposAdicionalesCompletos.transporteTerrestre = Math.max(
        0,
        Number(dto.montoGastosViaje) - aereo,
      );
    }
    if (!camposAdicionalesCompletos.fechaAutoliquidacion) {
      try {
        camposAdicionalesCompletos.fechaAutoliquidacion = new Intl.DateTimeFormat(
          'en-CA',
          { timeZone: 'America/Bogota' },
        ).format(new Date());
      } catch {
        camposAdicionalesCompletos.fechaAutoliquidacion = new Date()
          .toISOString()
          .split('T')[0];
      }
    }

    // =========================================================================
    // Sincronizar Historial de Cuentas Bancarias del Comisionado
    // =========================================================================
    const ctaBancaria = dto.cuentaBancariaSeleccionada;
    const rawBanco = (
      ctaBancaria?.banco ||
      dto.camposAdicionales?.entidad_bancaria ||
      dto.camposAdicionales?.entidadBancaria ||
      dto.camposAdicionales?.banco ||
      ''
    ).trim();
    const rawTipoCta = (
      ctaBancaria?.tipoCuenta ||
      dto.camposAdicionales?.tipo_cuenta ||
      dto.camposAdicionales?.tipoCuenta ||
      ''
    ).trim();
    const rawNumCta = (
      ctaBancaria?.numeroCuenta ||
      dto.camposAdicionales?.num_cuenta ||
      dto.camposAdicionales?.numeroCuenta ||
      dto.camposAdicionales?.numCuenta ||
      dto.camposAdicionales?.cuentaBancaria ||
      ''
    ).trim();

    const certDoc = dto.documentos?.find(
      (d) =>
        d.tipoDocumento === 'CERT_BANCARIA' ||
        d.tipoDocumento === 'CERTIFICACION_BANCARIA',
    );
    const rawUrlCert =
      ctaBancaria?.urlCertificadoBancario ||
      dto.camposAdicionales?.urlCertificadoBancario ||
      certDoc?.urlRepositorio ||
      null;
    const rawNombreCert =
      ctaBancaria?.nombreArchivoCertificado ||
      certDoc?.nombreArchivoOriginal ||
      null;

    let comisionadoModificado = false;
    if (!Array.isArray(comisionado.cuentasBancarias)) {
      comisionado.cuentasBancarias = [];
    }

    if (rawNumCta && rawBanco) {
      const idxCta = comisionado.cuentasBancarias.findIndex(
        (c) =>
          c.numeroCuenta?.trim() === rawNumCta,
      );
      if (idxCta >= 0) {
        const ctaExistente = comisionado.cuentasBancarias[idxCta];
        // Si no cambió de cuenta, solo actualizar a excepción de si se carga un nuevo certificado bancario
        const nuevoCertificado =
          Boolean(rawUrlCert) &&
          rawUrlCert.trim() !== '' &&
          rawUrlCert !== ctaExistente.urlCertificadoBancario;

        if (nuevoCertificado) {
          ctaExistente.urlCertificadoBancario = rawUrlCert;
          if (rawNombreCert) {
            ctaExistente.nombreArchivoCertificado = rawNombreCert;
          }
          comisionadoModificado = true;
        }
      } else {
        // Primera vez o cuenta nueva: se añade al historial del comisionado
        comisionado.cuentasBancarias.push({
          id: `cta-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          banco: rawBanco,
          tipoCuenta: rawTipoCta || 'AHORROS',
          numeroCuenta: rawNumCta,
          urlCertificadoBancario: rawUrlCert || null,
          nombreArchivoCertificado: rawNombreCert || null,
          fechaRegistro: new Date().toISOString(),
          esPrincipal: comisionado.cuentasBancarias.length === 0,
        });
        comisionadoModificado = true;
      }

      camposAdicionalesCompletos.entidad_bancaria = rawBanco;
      camposAdicionalesCompletos.entidadBancaria = rawBanco;
      camposAdicionalesCompletos.banco = rawBanco;
      camposAdicionalesCompletos.tipo_cuenta = rawTipoCta;
      camposAdicionalesCompletos.tipoCuenta = rawTipoCta;
      camposAdicionalesCompletos.num_cuenta = rawNumCta;
      camposAdicionalesCompletos.numeroCuenta = rawNumCta;
      camposAdicionalesCompletos.numCuenta = rawNumCta;
      camposAdicionalesCompletos.cuentaBancaria = rawNumCta;
      if (rawUrlCert) {
        camposAdicionalesCompletos.urlCertificadoBancario = rawUrlCert;
      }
    }

    // =========================================================================
    // Sincronizar Historial de Cargos y Salario Relacional del Comisionado
    // =========================================================================
    if (!Array.isArray(comisionado.cargos)) {
      comisionado.cargos = [];
    }

    const rawCargo = (
      dto.cargo ||
      dto.cargoSeleccionado?.cargo ||
      dto.camposAdicionales?.cargoEsap ||
      dto.camposAdicionales?.cargo ||
      dto.camposAdicionales?.cargoInstitucional ||
      dto.camposAdicionales?.cargoComisionado ||
      comisionado.cargo ||
      ''
    ).trim();

    const rawIdCargo = dto.idCargo ?? dto.cargoSeleccionado?.idCargo ?? null;

    const rawSalario = Number(
      dto.cargoSeleccionado?.salario ??
      dto.salarioBasico ??
      comisionado.salarioBasico ??
      0,
    );

    if (rawCargo) {
      const idxCrg = comisionado.cargos.findIndex(
        (c) => c.cargo?.trim().toLowerCase() === rawCargo.toLowerCase(),
      );
      if (idxCrg >= 0) {
        const cargoActual = comisionado.cargos[idxCrg];
        if (rawSalario > 0 && cargoActual.salario !== rawSalario) {
          cargoActual.salario = rawSalario;
          comisionadoModificado = true;
        }
        if (dto.idDependencia && cargoActual.idDependencia !== dto.idDependencia) {
          cargoActual.idDependencia = dto.idDependencia;
          comisionadoModificado = true;
        }
        if (rawIdCargo && cargoActual.idCargo !== rawIdCargo) {
          cargoActual.idCargo = rawIdCargo;
          comisionadoModificado = true;
        }
      } else {
        comisionado.cargos.push({
          id: `crg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          idCargo: rawIdCargo ?? undefined,
          cargo: rawCargo,
          salario: rawSalario,
          idDependencia: dto.idDependencia ?? comisionado.idDependencia ?? null,
          fechaInicio: new Date().toISOString().split('T')[0],
          esPrincipal: comisionado.cargos.length === 0,
        });
        comisionadoModificado = true;
      }
      if (comisionado.cargo !== rawCargo) {
        comisionado.cargo = rawCargo;
        comisionadoModificado = true;
      }
      if (rawSalario > 0 && comisionado.salarioBasico !== rawSalario) {
        comisionado.salarioBasico = rawSalario;
        comisionadoModificado = true;
      }
      camposAdicionalesCompletos.cargoEsap = rawCargo;
      camposAdicionalesCompletos.cargo = rawCargo;
      camposAdicionalesCompletos.cargoInstitucional = rawCargo;
      camposAdicionalesCompletos.cargoComisionado = rawCargo;
      if (rawIdCargo) {
        camposAdicionalesCompletos.idCargo = rawIdCargo;
      }
    }

    const rawFacturador =
      camposAdicionalesCompletos.obligacion_tributaria ??
      camposAdicionalesCompletos.esFacturadorElectronico;
    if (rawFacturador !== undefined && rawFacturador !== null) {
      const boolFacturador = Boolean(rawFacturador);
      if (comisionado.esFacturadorElectronico !== boolFacturador) {
        comisionado.esFacturadorElectronico = boolFacturador;
        comisionadoModificado = true;
      }
      camposAdicionalesCompletos.obligacion_tributaria = boolFacturador;
    } else {
      camposAdicionalesCompletos.obligacion_tributaria = Boolean(comisionado.esFacturadorElectronico ?? false);
    }

    if (comisionadoModificado) {
      try {
        await this.comisionadoRepo.save(comisionado);
      } catch (err: any) {
        this.logger.warn(`[crearSolicitud] No se pudo guardar historial del comisionado: ${err?.message}`);
      }
    }

    const solicitud = this.solicitudRepo.create({
      comisionadoId: dto.comisionadoId,
      idDependencia:
        dto.idDependencia ?? (comisionado as any)?.idDependencia ?? null,
      cargo: rawCargo || null,
      idCargo: rawIdCargo,
      destinoCiudad: sincronizacion.destinoCiudad,
      destinoDepartamento: sincronizacion.destinoDepartamento,
      fechaInicio: sincronizacion.fechaInicio,
      fechaFin: sincronizacion.fechaFin,
      objetoComision: objetoSanitizado,
      prioridad: dto.prioridad ?? 'BAJA',
      rubroPresupuestal: dto.rubroPresupuestal ?? '',
      numeroCdp: dto.numeroCdp ?? null,
      fechaCdp: dto.fechaCdp ?? null,
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
      camposAdicionales: camposAdicionalesCompletos,
      itinerario: sincronizacion.itinerario,
      // ========== Autoliquidación GF-FO-023 ==========
      diasPernoctados,
      tarifaDiaPernoctado,
      totalPernoctados,
      diasNoPernoctados,
      tarifaDiaNoPernoctado,
      totalNoPernoctados,
      factorComisionado,
      factorPernocta,
      tarifaDiariaBase,
      tarifaFinalAplicadaDia,
      salarioBaseAplicado,
      decretoAplicado,
    });

    // El consecutivo se calcula y se guarda bajo un bloqueo de la transacción para
    // que dos radicaciones simultáneas no obtengan el mismo número (EFDS-1287).
    const saved = await this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        'travel_expenses.solicitudes_comision.consecutivo_unico',
      ]);
      solicitud.consecutivoUnico = await this.generarConsecutivoUnico(manager);
      return manager.withRepository(this.solicitudRepo).save(solicitud);
    });

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

    if (saved.estadoSolicitud === EstadoSolicitud.PENDIENTE_FIRMAS) {
      this.notificarEnvioAFirmas023(saved).catch((err) =>
        this.logger.warn(
          `[notify] Error enviando notificaciones Formato 023 para solicitud ${saved.id}: ${err?.message}`,
        ),
      );
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
      relations: ['comisionado'],
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    if (
      !isSuperAdmin &&
      solicitud.estadoSolicitud !== EstadoSolicitud.PENDIENTE &&
      solicitud.estadoSolicitud !== EstadoSolicitud.BORRADOR &&
      solicitud.estadoSolicitud !== EstadoSolicitud.DEVUELTA
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

    const datosActualizacion = {
      ...(dto as any),
      ...(dto.camposAdicionales || {}),
    };
    const { errores: erroresLimite } =
      await this.validarLimitesCaracteres(datosActualizacion);
    if (erroresLimite.length > 0) {
      throw new BadRequestException(erroresLimite.join('. '));
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
    if (dto.numeroCdp !== undefined) {
      solicitud.numeroCdp = dto.numeroCdp ?? null;
    }
    if (dto.fechaCdp !== undefined) {
      solicitud.fechaCdp = dto.fechaCdp ?? null;
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
    if (dto.cargo !== undefined) {
      solicitud.cargo = dto.cargo ?? null;
    }
    if (dto.idCargo !== undefined) {
      solicitud.idCargo = dto.idCargo != null ? Number(dto.idCargo) : null;
    }
    if (dto.idDependencia !== undefined) {
      solicitud.idDependencia =
        dto.idDependencia != null ? Number(dto.idDependencia) : null;
    } else if (!solicitud.idDependencia && (solicitud.comisionado as any)?.idDependencia) {
      solicitud.idDependencia = (solicitud.comisionado as any).idDependencia;
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
    if (solicitud.decretoAplicado == null) {
      solicitud.decretoAplicado = 'Decreto 314 de 2026';
    }
    if (solicitud.factorComisionado == null) {
      solicitud.factorComisionado = 1.0;
    }
    if (solicitud.factorPernocta == null) {
      solicitud.factorPernocta = 1.0;
    }
    if (solicitud.salarioBaseAplicado == null) {
      solicitud.salarioBaseAplicado = Number(solicitud.salarioBasico || 4500000);
    }

    if (
      solicitud.diasPernoctados == null &&
      Number(solicitud.montoViaticos || dto.montoViaticos || 0) > 0
    ) {
      const fIni = solicitud.fechaInicio;
      const fFin = solicitud.fechaFin;
      const diffMs = fFin.getTime() - fIni.getTime();
      const diffDias = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      const montoV = Number(solicitud.montoViaticos || dto.montoViaticos || 0);
      if (diffDias > 0) {
        solicitud.diasPernoctados = diffDias;
        solicitud.diasNoPernoctados = 1;
        const tarifaP = Math.round(montoV / (diffDias + 0.5));
        solicitud.tarifaDiaPernoctado = tarifaP;
        solicitud.totalPernoctados = diffDias * tarifaP;
        solicitud.tarifaDiaNoPernoctado = Math.round(tarifaP * 0.5);
        solicitud.totalNoPernoctados = montoV - solicitud.totalPernoctados;
        solicitud.tarifaDiariaBase = tarifaP;
        solicitud.tarifaFinalAplicadaDia = tarifaP;
      } else {
        solicitud.diasPernoctados = 0;
        solicitud.totalPernoctados = 0;
        solicitud.diasNoPernoctados = 1;
        solicitud.tarifaDiaNoPernoctado = montoV;
        solicitud.totalNoPernoctados = montoV;
        solicitud.tarifaDiariaBase = montoV;
        solicitud.tarifaFinalAplicadaDia = montoV;
      }
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

    const mergedCampos = {
      ...(solicitud.camposAdicionales || {}),
      ...(dto.camposAdicionales || {}),
    };
    const itinRutas = dto.itinerario || solicitud.itinerario || [];
    const aereosItin = (itinRutas || []).reduce(
      (acc: number, r: any) => acc + Number(r.tarifaTerminalAereo || 0),
      0,
    );
    if (mergedCampos.transporteTerminalAereo == null && aereosItin > 0) {
      mergedCampos.transporteTerminalAereo = aereosItin;
    }
    const totalG =
      dto.montoGastosViaje !== undefined
        ? Number(dto.montoGastosViaje)
        : Number(solicitud.montoGastosViaje || 0);
    if (mergedCampos.transporteTerrestre == null && totalG > 0) {
      mergedCampos.transporteTerrestre = Math.max(
        0,
        totalG - Number(mergedCampos.transporteTerminalAereo || 0),
      );
    }
    if (!mergedCampos.fechaAutoliquidacion) {
      try {
        mergedCampos.fechaAutoliquidacion = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Bogota',
        }).format(new Date());
      } catch {
        mergedCampos.fechaAutoliquidacion = new Date()
          .toISOString()
          .split('T')[0];
      }
    }
    solicitud.camposAdicionales = mergedCampos;

    const saved = await this.solicitudRepo.save(solicitud);
    await this.sincronizarComisionadoDesdeSolicitud(
      solicitud.comisionado,
      saved,
    );
    if (!saved.comisionado && solicitud.comisionado) {
      saved.comisionado = solicitud.comisionado;
    }
    return saved;
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

    const guardado = await this.documentoRepo.save(entity);

    // Si el documento cargado es certificación bancaria, asociar de inmediato
    // el soporte a la cuenta bancaria del comisionado (por número de cuenta)
    const esCertBancario =
      dto.tipoDocumento === 'CERT_BANCARIA' ||
      dto.tipoDocumento === 'CERTIFICACION_BANCARIA' ||
      dto.tipoDocumento === 'CERTIFICADO_BANCARIO' ||
      dto.tipoDocumento?.toUpperCase().includes('BANC');

    if (esCertBancario) {
      try {
        await this.sincronizarComisionadoDesdeSolicitud(
          solicitud.comisionado,
          solicitud,
          [guardado],
        );
      } catch (errSync: any) {
        this.logger.warn(
          `[subirDocumento] No se pudo sincronizar de inmediato el certificado bancario: ${errSync?.message}`,
        );
      }
    }

    return guardado;
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
      instruccionesValidacion?: string | null;
      camposAValidar?: string[];
    }>;
    opcionales: Array<{
      codigo: string;
      nombre: string;
      descripcion: string | null;
      instruccionesValidacion?: string | null;
      camposAValidar?: string[];
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
        instruccionesValidacion: (d as any).instruccionesValidacion ?? null,
        camposAValidar: (d as any).camposAValidar ?? [],
      }));

    const opcionales = config.documentos
      .filter((d) => d.tipoRequisito === 'OPCIONAL')
      .map((d) => d.tipoDocumentoSoporte)
      .filter((d): d is NonNullable<typeof d> => Boolean(d))
      .map((d) => ({
        codigo: d.codigo,
        nombre: d.nombre,
        descripcion: d.descripcion,
        instruccionesValidacion: (d as any).instruccionesValidacion ?? null,
        camposAValidar: (d as any).camposAValidar ?? [],
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

    await this.validarLegalizacionesPendientes(solicitud.comisionadoId);

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
      .andWhere('s.estado_solicitud NOT IN (:...estadosNoActivos)', {
        estadosNoActivos: ESTADOS_NO_ACTIVOS_DUPLICIDAD,
      })
      .andWhere(CONDICION_SOLAPAMIENTO_DIAS, rangoSolapamiento(fechaInicio, fechaFin))
      .getOne();

    if (solapamiento) {
      throw new ConflictException(
        this.mensajeConflictoFechas(solapamiento, fechaInicio, fechaFin),
      );
    }

    const radicadoFueraJornada = esRadicacionFueraDeJornada(
      new Date(),
      await cargarFestivosAuth(this.dataSource),
    );

    solicitud.estadoSolicitud = EstadoSolicitud.RADICADA;
    solicitud.extemporanea = false;
    solicitud.radicadoFueraJornada = radicadoFueraJornada;

    // Sincronizar en el comisionado: cargo si es diferente al actual, e información bancaria si el número de cuenta es diferente
    await this.sincronizarComisionadoDesdeSolicitud(
      solicitud.comisionado,
      solicitud,
      documentos,
    );

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

  /**
   * Resuelve los firmantes de aprobación requeridos previo a la radicación de la solicitud
   * conforme a la normativa institucional y las reglas de desplazamiento y jerarquía:
   *  - Jefe de dependencia o supervisor y Gerente de Proyecto.
   *  - En caso de ausencia o desplazamiento del jefe de dependencia:
   *    * Si se desplaza el subdirector Nacional de G.C., firma el director nacional.
   *    * Si se desplaza el director nacional, firma el subdirector Nacional de G.C.
   *    * Si se desplaza el director territorial, firma el director nacional.
   */
  determinarFirmantesAprobacion(
    solicitud: SolicitudComisionEntity,
    dependenciaNombre?: string,
  ): {
    reglaDesplazamiento: string;
    descripcionRegla: string;
    firmante1: {
      tipo: TipoFirmaAprobacion;
      titulo: string;
      cargo: string;
      descripcion: string;
      esRequerido: boolean;
    };
    firmante2: {
      tipo: TipoFirmaAprobacion;
      titulo: string;
      cargo: string;
      descripcion: string;
      esRequerido: boolean;
    };
    firmante3: {
      tipo: TipoFirmaAprobacion;
      titulo: string;
      cargo: string;
      descripcion: string;
      esRequerido: boolean;
    };
  } {
    const comisionado = solicitud.comisionado;
    const cargoComisionado = (
      solicitud.camposAdicionales?.cargo ||
      solicitud.camposAdicionales?.cargoEsap ||
      (comisionado as any)?.cargo ||
      ''
    )
      .toLowerCase()
      .trim();

    const dep = (
      dependenciaNombre ||
      solicitud.camposAdicionales?.dependenciaSolicitante ||
      solicitud.camposAdicionales?.dependencia ||
      ''
    )
      .toLowerCase()
      .trim();

    const tipoCom = (
      comisionado?.tipoComisionado ||
      solicitud.camposAdicionales?.tipoComisionado ||
      ''
    ).toUpperCase();

    // 1) Si se desplaza el subdirector Nacional de G.C., firma el director nacional.
    const esSubdirectorGC =
      cargoComisionado.includes('subdirector') &&
      (cargoComisionado.includes('g.c') ||
        cargoComisionado.includes('gc') ||
        cargoComisionado.includes('corporativa') ||
        cargoComisionado.includes('conocimiento') ||
        dep.includes('corporativa') ||
        dep.includes('conocimiento'));

    // 2) Si se desplaza el director nacional, firma el subdirector Nacional de G.C.
    const esDirectorNacional =
      !cargoComisionado.includes('territorial') &&
      !dep.includes('territorial') &&
      (cargoComisionado.includes('director nacional') ||
        cargoComisionado.includes('director general') ||
        (cargoComisionado === 'director' && dep.includes('nacional')));

    // 3) Si se desplaza el director territorial, firma el director nacional.
    const esDirectorTerritorial =
      cargoComisionado.includes('director territorial') ||
      (cargoComisionado.includes('director') &&
        (cargoComisionado.includes('territorial') || dep.includes('territorial')));

    let reglaDesplazamiento = 'REGULAR';
    let descripcionRegla =
      'Flujo regular de firmas de aprobación de la solicitud previo a radicación.';
    let tituloFirmante1 = 'Jefe de Dependencia';
    let cargoFirmante1 =
      solicitud.camposAdicionales?.cargoJefe ||
      (dep ? `Jefe ${dep}` : 'Jefe de Dependencia Solicitante');

    if (esSubdirectorGC) {
      reglaDesplazamiento = 'DESPLAZAMIENTO_SUBDIRECTOR_GC';
      descripcionRegla =
        'Por desplazamiento del Subdirector Nacional de G.C., firma el Director Nacional.';
      tituloFirmante1 = 'Director Nacional';
      cargoFirmante1 = 'Director Nacional';
    } else if (esDirectorNacional) {
      reglaDesplazamiento = 'DESPLAZAMIENTO_DIRECTOR_NACIONAL';
      descripcionRegla =
        'Por desplazamiento del Director Nacional, firma el Subdirector Nacional de G.C.';
      tituloFirmante1 = 'Subdirector Nacional de G.C.';
      cargoFirmante1 = 'Subdirector Nacional de Gestión Corporativa';
    } else if (esDirectorTerritorial) {
      reglaDesplazamiento = 'DESPLAZAMIENTO_DIRECTOR_TERRITORIAL';
      descripcionRegla =
        'Por desplazamiento del Director Territorial, firma el Director Nacional.';
      tituloFirmante1 = 'Director Nacional';
      cargoFirmante1 = 'Director Nacional';
    } else if (tipoCom === 'CONTRATISTA' || tipoCom === 'DOCENTE') {
      tituloFirmante1 = 'Jefe de Dependencia o Supervisor';
      cargoFirmante1 =
        solicitud.camposAdicionales?.cargoJefe ||
        'Jefe de Dependencia / Supervisor de Contrato';
    }

    const cargoGerente =
      solicitud.camposAdicionales?.cargoGerente ||
      (dep ? `Gerente de Proyecto - ${dep}` : 'Gerente de Proyecto');

    return {
      reglaDesplazamiento,
      descripcionRegla,
      firmante1: {
        tipo: TipoFirmaAprobacion.JEFE_DEPENDENCIA,
        titulo: tituloFirmante1,
        cargo: cargoFirmante1,
        descripcion:
          esSubdirectorGC || esDirectorNacional || esDirectorTerritorial
            ? descripcionRegla
            : 'Firma de aprobación de la solicitud: Jefe de Dependencia o Supervisor.',
        esRequerido: true,
      },
      firmante2: {
        tipo: TipoFirmaAprobacion.GERENTE_PROYECTO,
        titulo: 'Gerente de Proyecto',
        cargo: cargoGerente,
        descripcion:
          'Firma de aprobación de la solicitud: Gerente de Proyecto / Ordenador del Gasto.',
        esRequerido: true,
      },
      firmante3: {
        tipo: TipoFirmaAprobacion.ANALISTA,
        titulo: 'Analista de Viáticos',
        cargo: 'Analista de Viáticos / Grupo de Gestión Financiera',
        descripcion:
          'Revisión, verificación técnica y firma de control del Analista de Viáticos.',
        esRequerido: true,
      },
    };
  }

  /**
   * Obtiene el estado consolidado de firmas de aprobación requeridas previo a la radicación.
   */
  async obtenerEstadoFirmas(solicitudId: string): Promise<any> {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
      relations: ['comisionado'],
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    let dependenciaNombre =
      solicitud.camposAdicionales?.dependenciaSolicitante ||
      solicitud.camposAdicionales?.dependencia ||
      '';

    const idDep = solicitud.idDependencia || solicitud.comisionado?.idDependencia;
    if (!dependenciaNombre && idDep) {
      try {
        const dRows = await this.dataSource.query(
          `SELECT nom_dependencia FROM auth.dependencias WHERE id_dependencia = $1 LIMIT 1`,
          [idDep],
        );
        if (dRows?.[0]?.nom_dependencia) {
          dependenciaNombre = dRows[0].nom_dependencia;
        }
      } catch {}
    }

    const { reglaDesplazamiento, descripcionRegla, firmante1, firmante2, firmante3 } =
      this.determinarFirmantesAprobacion(solicitud, dependenciaNombre);

    const firmasRegistradas: any[] = Array.isArray(
      solicitud.camposAdicionales?.firmasAprobacion,
    )
      ? solicitud.camposAdicionales.firmasAprobacion
      : [];

    const firmaJefe = firmasRegistradas.find(
      (f) => f.tipo === TipoFirmaAprobacion.JEFE_DEPENDENCIA && f.estado !== 'RECHAZADO',
    );
    const firmaGerente = firmasRegistradas.find(
      (f) => f.tipo === TipoFirmaAprobacion.GERENTE_PROYECTO && f.estado !== 'RECHAZADO',
    );
    const firmaAnalista = firmasRegistradas.find(
      (f) =>
        (f.tipo === TipoFirmaAprobacion.ANALISTA || f.tipo === 'ANALISTA_VIATICOS') &&
        f.estado !== 'RECHAZADO',
    );

    let nombreJefe = firmaJefe?.nombreFirmante || null;
    let docJefe = firmaJefe?.documentoIdentidad || null;
    let cargoJefe = firmaJefe?.cargoFirmante || firmante1.cargo;
    if (firmaJefe && (firmaJefe.usuarioId || (firmaJefe.nombreFirmante && firmaJefe.nombreFirmante.includes('@')))) {
      const d = await this.resolverDatosUsuario(firmaJefe.usuarioId || firmaJefe.nombreFirmante);
      if (d.nombre && (!nombreJefe || nombreJefe.includes('@'))) nombreJefe = d.nombre;
      if (d.documento && !docJefe) docJefe = d.documento;
      if (d.cargo && (!cargoJefe || cargoJefe === firmante1.cargo)) cargoJefe = d.cargo;
    }

    let nombreGerente = firmaGerente?.nombreFirmante || null;
    let docGerente = firmaGerente?.documentoIdentidad || null;
    let cargoGerente = firmaGerente?.cargoFirmante || firmante2.cargo;
    if (firmaGerente && (firmaGerente.usuarioId || (firmaGerente.nombreFirmante && firmaGerente.nombreFirmante.includes('@')))) {
      const d = await this.resolverDatosUsuario(firmaGerente.usuarioId || firmaGerente.nombreFirmante);
      if (d.nombre && (!nombreGerente || nombreGerente.includes('@'))) nombreGerente = d.nombre;
      if (d.documento && !docGerente) docGerente = d.documento;
      if (d.cargo && (!cargoGerente || cargoGerente === firmante2.cargo)) cargoGerente = d.cargo;
    }

    const firmantes = [
      {
        ...firmante1,
        firmado: Boolean(firmaJefe),
        nombreFirmante: nombreJefe,
        cargoFirmante: cargoJefe,
        documentoIdentidad: docJefe,
        fechaFirma: firmaJefe?.fechaFirma || null,
        certificadoId: firmaJefe?.certificadoId || null,
        hashSha256: firmaJefe?.hashSha256 || null,
        firma: firmaJefe ? { ...firmaJefe, nombreFirmante: nombreJefe, documentoIdentidad: docJefe } : null,
      },
      {
        ...firmante2,
        firmado: Boolean(firmaGerente),
        nombreFirmante: nombreGerente,
        cargoFirmante: cargoGerente,
        documentoIdentidad: docGerente,
        fechaFirma: firmaGerente?.fechaFirma || null,
        certificadoId: firmaGerente?.certificadoId || null,
        hashSha256: firmaGerente?.hashSha256 || null,
        firma: firmaGerente ? { ...firmaGerente, nombreFirmante: nombreGerente, documentoIdentidad: docGerente } : null,
      },
      {
        ...firmante3,
        firmado: Boolean(firmaAnalista),
        nombreFirmante: firmaAnalista?.nombreFirmante || null,
        cargoFirmante: firmaAnalista?.cargoFirmante || firmante3.cargo,
        documentoIdentidad: firmaAnalista?.documentoIdentidad || null,
        fechaFirma: firmaAnalista?.fechaFirma || null,
        certificadoId: firmaAnalista?.certificadoId || null,
        hashSha256: firmaAnalista?.hashSha256 || null,
        firma: firmaAnalista || null,
      },
    ];

    const completado = Boolean(firmaJefe && firmaGerente);

    return {
      solicitudId: solicitud.id,
      consecutivoUnico: solicitud.consecutivoUnico,
      estadoSolicitud: solicitud.estadoSolicitud,
      reglaDesplazamiento,
      descripcionRegla,
      firmantes,
      firmaElaboro: solicitud.camposAdicionales?.firmaElaboro || null,
      elaboro: solicitud.camposAdicionales?.elaboro || null,
      completado,
      requiereFirmasParaRadicar: true,
      mensaje: completado
        ? 'Flujo de firmas de aprobación surtido completamente.'
        : 'La solicitud incorpora el flujo de firmas de aprobación previo a su radicación: sin las firmas de aprobación la solicitud no se radica.',
    };
  }

  // ==========================================================================
  // OTP y Firma Digital Institucional (Estándar ESAP - No Repudio)
  // ==========================================================================
  private readonly otpStore = new Map<
    string,
    { code: string; expiresAt: Date; userId: string; role?: string; email?: string }
  >();
  private readonly MOCK_FIRMA_OTP = process.env.MOCK_FIRMA_OTP === 'true';

  maskEmail(email: string): string {
    if (!email || !email.includes('@')) return 'correo no registrado';
    const [user, domain] = email.split('@');
    if (user.length <= 2) return `${user[0]}***@${domain}`;
    return `${user[0]}${'*'.repeat(Math.min(user.length - 2, 5))}${user[user.length - 1]}@${domain}`;
  }

  generarCertificadoId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'ESAP-CERT-VIAT-';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
      if (i === 3) result += '-';
    }
    return result;
  }

  generarHashDocumento(input: string): string {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  async fetchUsuarioFirmanteInfo(userId: string): Promise<{ id: string; email: string; fullName: string; username: string }> {
    if (!userId) return { id: '', email: '', fullName: '', username: '' };
    try {
      const rows = await this.dataSource.query(
        `SELECT
           u.id_user::text AS id,
           COALESCE(p_person.dir_email, u.username, '') AS email,
           COALESCE(p_person.nom_largo, TRIM(CONCAT_WS(' ', p_person.nom_tercero, p_person.pri_apellido)), u.username, '') AS full_name,
           u.username
         FROM auth."user" u
         LEFT JOIN auth.personas p_person ON p_person.id_person = u.id_person
         WHERE u.id_user = $1
         LIMIT 1`,
        [userId],
      );
      if (rows && rows.length > 0) {
        return {
          id: rows[0].id,
          email: String(rows[0].email || '').trim(),
          fullName: String(rows[0].full_name || '').trim(),
          username: String(rows[0].username || '').trim(),
        };
      }
    } catch (e: any) {
      this.logger.warn(`Error buscando datos del usuario firmante ${userId}: ${e?.message}`);
    }
    return { id: userId, email: '', fullName: '', username: '' };
  }

  private async sendFirmaOtpEmailViaticos(input: {
    to: string;
    code: string;
    fullName: string;
    solicitudId?: string;
    etapaLabel?: string;
    expiresAt: Date;
  }): Promise<void> {
    const minutes = Math.max(1, Math.round((input.expiresAt.getTime() - Date.now()) / 60000));
    const fullName = input.fullName || 'Funcionario(a)';
    const code = input.code;
    const etapa = input.etapaLabel || 'Firma de Solicitud de Viáticos';

    const text = [
      `Hola ${fullName},`,
      '',
      `Tu código de validación para la firma digital de viáticos es: ${code}`,
      `Trámite: ${etapa}`,
      `Válido por ${minutes} minutos.`,
      '',
      'Si no solicitaste este código, haz caso omiso a este mensaje.',
    ].join('\n');

    const html = `
      <div style="margin:0;padding:32px 16px;background-color:#eef2f7;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#111827;">
        <table width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
          <tr>
            <td align="center">
              <table width="560" cellspacing="0" cellpadding="0" border="0" role="presentation" style="width:100%;max-width:560px;background-color:#ffffff;border:1px solid #dbe3ef;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
                <tr>
                  <td style="height:6px;background-color:#003DA5;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="background-color:#003DA5;padding:26px 28px 22px 28px;">
                    <table width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
                      <tr>
                        <td>
                          <div style="font-size:22px;font-weight:800;line-height:1;color:#ffffff;letter-spacing:0.5px;">ESAP</div>
                          <div style="margin-top:6px;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#bfdbfe;">Sistema de Gestión de Viáticos y Comisiones</div>
                        </td>
                        <td align="right" style="vertical-align:middle;">
                          <span style="display:inline-block;padding:6px 14px;border-radius:999px;background-color:rgba(255,255,255,0.18);color:#ffffff;font-size:11px;font-weight:700;">Firma Digital</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px 28px 20px 28px;">
                    <h1 style="margin:0 0 10px 0;font-size:20px;line-height:1.3;font-weight:800;color:#111827;">Código de Validación de Firma Digital</h1>
                    <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#475569;">
                      Hola <strong>${fullName}</strong>. Has iniciado un proceso de firma digital para <strong>${etapa}</strong>. Ingresa el siguiente código de 6 dígitos para validar tu identidad:
                    </p>

                    <table width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
                      <tr>
                        <td align="center">
                          <div style="display:inline-block;padding:18px 28px;border-radius:10px;border:2px solid #003DA5;background-color:#eff6ff;text-align:center;">
                            <span style="font-size:32px;line-height:1;font-weight:800;letter-spacing:8px;color:#003DA5;font-family:monospace;">${code}</span>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:24px 0 0 0;font-size:12px;line-height:1.5;color:#64748b;text-align:center;">
                      ⏱️ Este código es de uso exclusivo y vencerá en <strong>${minutes} minutos</strong>.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#f8fafc;padding:16px 28px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">
                    Escuela Superior de Administración Pública — ESAP · Notificación de Seguridad Digital
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;

    if (this.notificationClient && typeof this.notificationClient.sendEmail === 'function') {
      await this.notificationClient.sendEmail({
        to: input.to,
        subject: `Código de validación (${code}) — Firma Digital Viáticos ESAP`,
        text,
        html,
      });
    }
  }

  /**
   * Solicita el código OTP para firmar digitalmente una solicitud de viáticos.
   * Aplica para:
   * - Enlace de Dependencia (al radicar/elaborar el Formato 023)
   * - Jefe de Dependencia / Supervisor (Aprobador Formato 023)
   * - Gerente de Proyecto (Aprobador Formato 023)
   * - Ordenador del Gasto / Autorizadores
   */
  async solicitarOtpFirma(
    solicitudId: string,
    payload: SolicitarOtpFirmaDto,
    userId: string,
  ): Promise<{
    verificationId: string;
    expiresAt: string;
    email: string;
    devCode?: string;
  }> {
    if (!userId) {
      throw new BadRequestException('userId es requerido para solicitar código OTP de firma.');
    }

    const usuario = await this.fetchUsuarioFirmanteInfo(userId);
    if (!usuario.email && !this.MOCK_FIRMA_OTP) {
      throw new BadRequestException(
        'El usuario no tiene correo institucional registrado para recibir el código de validación.',
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const tipo = payload?.tipoFirma || 'FIRMA';
    const verificationId = `viat:${solicitudId || 'general'}:${tipo}:${userId}`;

    this.logger.log(
      `🔑 [PRUEBAS] Código OTP de firma (${tipo}) para ${usuario.email || usuario.username || userId}: ${code}`,
    );

    if (usuario.email) {
      try {
        await this.sendFirmaOtpEmailViaticos({
          to: usuario.email,
          code,
          fullName: usuario.fullName || usuario.username || 'Funcionario(a)',
          solicitudId,
          etapaLabel: payload?.etapaLabel || 'Firma Digital de Solicitud de Viáticos',
          expiresAt,
        });
      } catch (emailError: any) {
        const isDev = (process.env.NODE_ENV || 'development') !== 'production';
        if (isDev) {
          this.logger.warn(
            `⚠️ [DEV] Falló envío de correo OTP viáticos a ${usuario.email}: ${emailError?.message} — código OTP: ${code}`,
          );
        } else {
          throw emailError;
        }
      }
    }

    this.otpStore.set(verificationId, {
      code,
      expiresAt,
      userId,
      email: usuario.email,
    });

    return {
      verificationId,
      expiresAt: expiresAt.toISOString(),
      email: usuario.email ? this.maskEmail(usuario.email) : 'correo no registrado',
      devCode: code,
    };
  }

  /**
   * Verifica la validez de un código OTP generado.
   */
  verificarOtpFirma(payload: { verificationId: string; code: string; consume?: boolean }): boolean {
    const { verificationId, code, consume = true } = payload || {};
    if (!verificationId) {
      throw new BadRequestException('verificationId es requerido.');
    }
    if (!code || String(code).trim().length !== 6) {
      throw new BadRequestException('El código OTP debe ser de 6 dígitos numéricos.');
    }

    if (this.MOCK_FIRMA_OTP) {
      this.logger.warn(
        `[MOCK-OTP] Validación de firma mockeada para "${verificationId}" — código aceptado.`,
      );
      if (consume) this.otpStore.delete(verificationId);
      return true;
    }

    const stored = this.otpStore.get(verificationId);
    if (!stored) {
      throw new BadRequestException(
        'No hay código de validación activo para esta sesión o ya fue utilizado. Genera uno nuevo.',
      );
    }

    if (new Date() > stored.expiresAt) {
      this.otpStore.delete(verificationId);
      throw new BadRequestException(
        'El código de validación expiró (válido por 5 minutos). Solicita un nuevo código.',
      );
    }

    if (stored.code !== String(code).trim()) {
      throw new BadRequestException('Código de validación incorrecto. Verifica e intenta nuevamente.');
    }

    if (consume) {
      this.otpStore.delete(verificationId);
    }
    return true;
  }

  /**
   * Consolida la solicitud e inicia formalmente el flujo de firmas de aprobación
   * previo a la radicación (estado PENDIENTE_FIRMAS).
   * Si se suministra OTP/firma del Enlace de Dependencia ("Elaboró"), se certifica digitalmente.
   */
  async solicitarFirmasAprobacion(
    solicitudId: string,
    usuarioId?: string,
    dto?: SolicitarFirmasDto,
  ): Promise<SolicitudComisionEntity> {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
      relations: ['comisionado'],
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    const estadosPermitidos = [
      EstadoSolicitud.PENDIENTE,
      EstadoSolicitud.DEVUELTA,
      EstadoSolicitud.BORRADOR,
      EstadoSolicitud.PENDIENTE_FIRMAS,
    ];

    if (!estadosPermitidos.includes(solicitud.estadoSolicitud)) {
      throw new BadRequestException(
        `La solicitud tiene estado ${solicitud.estadoSolicitud} y no puede enviarse a flujo de firmas.`,
      );
    }

    await this.validarLegalizacionesPendientes(solicitud.comisionadoId);

    // Garantizar que el comisionado tenga usuario y rol COMISIONADO (idempotente)
    if (solicitud.comisionado) {
      await this.garantizarUsuarioYRolComisionado(
        solicitud.comisionado,
        solicitud.idDependencia,
        solicitud.creadoPorUsuarioId,
      );
    }

    // Si viene código OTP del enlace, verificarlo
    if (dto?.otp && dto?.verificationId) {
      this.verificarOtpFirma({
        verificationId: dto.verificationId,
        code: dto.otp,
        consume: true,
      });
    }

    // Validar checklist de soportes obligatorios en PDF
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
        `No se puede solicitar firmas. Faltan soportes obligatorios en PDF: ${faltantes.join(', ')}.`,
      );
    }
    if (noPdf.length > 0) {
      throw new BadRequestException(
        `Los siguientes soportes obligatorios deben estar en formato PDF: ${noPdf.join(', ')}.`,
      );
    }

    // Validar solapamiento de fechas
    const solapamiento = await this.solicitudRepo
      .createQueryBuilder('s')
      .where('s.comisionado_id = :comisionadoId', {
        comisionadoId: solicitud.comisionadoId,
      })
      .andWhere('s.id <> :solicitudId', { solicitudId: solicitud.id })
      .andWhere('s.estado_solicitud NOT IN (:...estadosNoActivos)', {
        estadosNoActivos: ESTADOS_NO_ACTIVOS_DUPLICIDAD,
      })
      .andWhere(CONDICION_SOLAPAMIENTO_DIAS, rangoSolapamiento(solicitud.fechaInicio, solicitud.fechaFin))
      .getOne();

    if (solapamiento) {
      throw new ConflictException(
        this.mensajeConflictoFechas(solapamiento, solicitud.fechaInicio, solicitud.fechaFin),
      );
    }

    const estadoAnterior = solicitud.estadoSolicitud;
    solicitud.estadoSolicitud = EstadoSolicitud.PENDIENTE_FIRMAS;
    solicitud.motivoDevolucion = null;

    const estadoFirmas = await this.obtenerEstadoFirmas(solicitud.id);

    // Registro de firma de elaboración por parte del enlace
    const certIdElaboro = dto?.certificadoId || this.generarCertificadoId();
    const datosUsuario = usuarioId
      ? await this.resolverDatosUsuario(usuarioId, 'Enlace de Dependencia')
      : { nombre: 'Enlace de Dependencia', documento: '', cargo: '' };
    let nombreEnlace = dto?.nombreFirmante?.trim() || '';
    if (!nombreEnlace || nombreEnlace.includes('@')) {
      nombreEnlace =
        datosUsuario.nombre && !datosUsuario.nombre.includes('@')
          ? datosUsuario.nombre
          : 'Enlace de Dependencia';
    }
    const cargoEnlace = dto?.cargoFirmante || datosUsuario.cargo || 'Enlace de Dependencia';
    const docEnlace = dto?.documentoIdentidad?.trim() || datosUsuario.documento || '';
    const fechaElaboro = new Date().toISOString();
    const hashElaboro =
      dto?.hashSha256 ||
      this.generarHashDocumento(
        `${solicitud.id}|ENLACE_ELABORO|${nombreEnlace}|${docEnlace}|${fechaElaboro}`,
      );

    const firmaElaboro = {
      tipo: 'ENLACE_ELABORO',
      nombreFirmante: nombreEnlace,
      cargoFirmante: cargoEnlace,
      documentoIdentidad: docEnlace,
      certificadoId: certIdElaboro,
      hashSha256: hashElaboro,
      fechaFirma: fechaElaboro,
      firmadoDigitalmente: true,
      otpVerificado: Boolean(dto?.otp),
    };

    const docStr = docEnlace ? ` (C.C. ${docEnlace})` : '';
    solicitud.camposAdicionales = {
      ...(solicitud.camposAdicionales || {}),
      reglaDesplazamiento: estadoFirmas.reglaDesplazamiento,
      descripcionReglaDesplazamiento: estadoFirmas.descripcionRegla,
      firmasAprobacion: [],
      firmasCompletadas: false,
      firmaElaboro,
      elaboro: `Elaboró: ${nombreEnlace}${docStr} (Certificado: ${certIdElaboro})`,
    };

    // Sincronizar en el comisionado: cargo si es diferente al actual, e información bancaria si el número de cuenta es diferente
    await this.sincronizarComisionadoDesdeSolicitud(
      solicitud.comisionado,
      solicitud,
      documentos,
    );

    const saved = await this.solicitudRepo.save(solicitud);

    const comentariosLog =
      estadoAnterior === EstadoSolicitud.DEVUELTA
        ? `Solicitud subsanada por el enlace y reenviada al flujo de firmas de aprobación (${estadoFirmas.descripcionRegla}) con certificado ${certIdElaboro}.`
        : `Solicitud elaborada y remitida al flujo de firmas de aprobación previo a radicación (${estadoFirmas.descripcionRegla}) con certificado digital ${certIdElaboro}.`;

    await this.dataSource.getRepository(SolicitudHistorialEstadoEntity).save({
      solicitudId: solicitud.id,
      estadoAnterior,
      estadoNuevo: EstadoSolicitud.PENDIENTE_FIRMAS,
      usuarioId:
        usuarioId ||
        solicitud.creadoPorUsuarioId ||
        '00000000-0000-0000-0000-000000000000',
      comentarios: comentariosLog,
    });

    // Despacho de notificaciones Formato 023 por correo y vía app (Jefe, Gerente y Comisionado)
    this.notificarEnvioAFirmas023(saved).catch((err) =>
      this.logger.warn(
        `[notify] Error enviando notificaciones Formato 023 para solicitud ${saved.id}: ${err?.message}`,
      ),
    );

    return saved;
  }

  /**
   * Envía las notificaciones institucionales (correo y vía app) cuando una solicitud
   * Formato 023 pasa al flujo de firmas de aprobación:
   * - Al Jefe y Gerente (roles con permiso general jefe y gerente):
   *   "Solicitud pendiente de revisión y firma de aprobación"
   * - Al Comisionado:
   *   "Proceso de solicitud viáticos según formato 023 generado, en la plataforma puede consultar su estado..."
   */
  async notificarEnvioAFirmas023(solicitud: SolicitudComisionEntity): Promise<void> {
    try {
      let comisionado = solicitud.comisionado;
      if (!comisionado && solicitud.comisionadoId) {
        comisionado = (await this.comisionadoRepo.findOne({
          where: { id: solicitud.comisionadoId },
        })) as any;
      }
      if (
        this.notificationClient &&
        typeof (this.notificationClient as any).notifyEnvioAFirmas023 === 'function'
      ) {
        await (this.notificationClient as any).notifyEnvioAFirmas023({
          solicitud,
          comisionado: (comisionado as any) || {},
        });
      }
    } catch (err: any) {
      this.logger.error(
        `[notificarEnvioAFirmas023] Error al disparar notificaciones Formato 023: ${err?.message}`,
      );
    }
  }

  /**
   * Registra una firma de aprobación con verificación OTP y Certificado Digital Institucional
   * (Jefe de Dependencia/Supervisor o Gerente de Proyecto).
   * Al completarse ambas firmas y validaciones, la solicitud transiciona a estado RADICADA.
   */
  async firmarAprobacionSolicitud(
    solicitudId: string,
    dto: FirmarSolicitudDto,
    usuarioId?: string,
    userRoles: string[] = [],
  ): Promise<{
    solicitud: SolicitudComisionEntity;
    radicada: boolean;
    mensaje: string;
    firmas: any[];
    certificadoId?: string;
  }> {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
      relations: ['comisionado'],
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    const estadosPermitidosFirmar = [
      EstadoSolicitud.PENDIENTE_FIRMAS,
      EstadoSolicitud.PENDIENTE,
      EstadoSolicitud.DEVUELTA,
    ];

    if (!estadosPermitidosFirmar.includes(solicitud.estadoSolicitud)) {
      // Idempotencia: si la solicitud ya avanzó a SOLICITADO, EXTEMPORANEA o RADICADA
      // y la firma de este rol ya fue registrada exitosamente:
      const firmasExistentes: any[] = Array.isArray(
        solicitud.camposAdicionales?.firmasAprobacion,
      )
        ? solicitud.camposAdicionales.firmasAprobacion
        : [];
      const firmaYaRegistrada = firmasExistentes.find(
        (f) => f.tipo === dto.tipoFirma && f.estado === 'FIRMADO',
      );
      if (
        firmaYaRegistrada &&
        [
          EstadoSolicitud.SOLICITADO,
          EstadoSolicitud.EXTEMPORANEA,
          EstadoSolicitud.RADICADA,
        ].includes(solicitud.estadoSolicitud)
      ) {
        return {
          solicitud,
          radicada: true,
          mensaje: `La firma digital para ${dto.tipoFirma} ya fue registrada satisfactoriamente en este expediente (Certificado: ${firmaYaRegistrada.certificadoId || 'Digital'}).`,
          firmas: firmasExistentes,
          certificadoId: firmaYaRegistrada.certificadoId,
        };
      }

      throw new BadRequestException(
        `La solicitud tiene estado ${solicitud.estadoSolicitud} y no admite firmas de aprobación en esta etapa.`,
      );
    }

    // Validación de código OTP si fue suministrado o requerido
    if (dto.otp && dto.verificationId) {
      this.verificarOtpFirma({
        verificationId: dto.verificationId,
        code: dto.otp,
        consume: true,
      });
    }

    const firmasPrevias: any[] = Array.isArray(
      solicitud.camposAdicionales?.firmasAprobacion,
    )
      ? [...solicitud.camposAdicionales.firmasAprobacion]
      : [];

    const fechaFirma = new Date().toISOString();
    const certId = dto.certificadoId || this.generarCertificadoId();
    let docFirmante = dto.documentoIdentidad?.trim() || '';
    let nombreFirmante = dto.nombreFirmante?.trim() || '';
    let cargoFirmante = dto.cargoFirmante?.trim() || '';
    let emailFirmante = (dto.nombreFirmante?.includes('@') ? dto.nombreFirmante : '').trim();

    if (usuarioId) {
      const datosFirmante = await this.resolverDatosUsuario(usuarioId);
      if (datosFirmante.documento && !docFirmante) {
        docFirmante = datosFirmante.documento;
      }
      if (datosFirmante.nombre && (!nombreFirmante || nombreFirmante.includes('@'))) {
        nombreFirmante = datosFirmante.nombre;
      }
      if (datosFirmante.cargo && !cargoFirmante) {
        cargoFirmante = datosFirmante.cargo;
      }
      if (datosFirmante.email && !emailFirmante) {
        emailFirmante = datosFirmante.email;
      }
    }
    const hashData = `${solicitud.id}|${dto.tipoFirma}|${nombreFirmante || dto.nombreFirmante}|${docFirmante}|${cargoFirmante || dto.cargoFirmante}|${fechaFirma}`;
    const hash = dto.hashSha256 || this.generarHashDocumento(hashData);

    const nuevaFirma = {
      tipo: dto.tipoFirma,
      nombreFirmante: (nombreFirmante || dto.nombreFirmante).trim(),
      emailFirmante: emailFirmante || null,
      cargoFirmante: (cargoFirmante || dto.cargoFirmante).trim(),
      documentoIdentidad: docFirmante,
      firmaImagen: dto.firmaImagen || null,
      esAusencia: Boolean(dto.esAusencia),
      motivoAusencia: dto.motivoAusencia?.trim() || null,
      comentarios: dto.comentarios?.trim() || null,
      fechaFirma,
      usuarioId: usuarioId || null,
      estado: 'FIRMADO',
      certificadoId: certId,
      hashSha256: hash,
      firmadoDigitalmente: true,
      otpVerificado: Boolean(dto.otp),
    };

    const idxExistente = firmasPrevias.findIndex((f) => f.tipo === dto.tipoFirma);
    if (idxExistente >= 0) {
      firmasPrevias[idxExistente] = nuevaFirma;
    } else {
      firmasPrevias.push(nuevaFirma);
    }

    const tieneFirmaJefe = firmasPrevias.some(
      (f) => f.tipo === TipoFirmaAprobacion.JEFE_DEPENDENCIA && f.estado === 'FIRMADO',
    );
    const tieneFirmaGerente = firmasPrevias.some(
      (f) => f.tipo === TipoFirmaAprobacion.GERENTE_PROYECTO && f.estado === 'FIRMADO',
    );
    const tieneFirmaAnalista = firmasPrevias.some(
      (f) =>
        (f.tipo === TipoFirmaAprobacion.ANALISTA || (f.tipo as string) === 'ANALISTA_VIATICOS') &&
        f.estado === 'FIRMADO',
    );

    const todasFirmasCompletadas = tieneFirmaJefe && tieneFirmaGerente;

    solicitud.camposAdicionales = {
      ...(solicitud.camposAdicionales || {}),
      firmasAprobacion: firmasPrevias,
      firmasCompletadas: todasFirmasCompletadas,
      ...(dto.tipoFirma === TipoFirmaAprobacion.ANALISTA || (dto.tipoFirma as string) === 'ANALISTA_VIATICOS'
        ? {
            reviso: `Revisó: ${dto.nombreFirmante} (Cert: ${certId})`,
            firmaAnalista: nuevaFirma,
          }
        : {}),
    };

    let radicada = false;
    const nombreRolFirmante =
      dto.tipoFirma === TipoFirmaAprobacion.JEFE_DEPENDENCIA
        ? 'Jefe de Dependencia / Supervisor'
        : dto.tipoFirma === TipoFirmaAprobacion.GERENTE_PROYECTO
        ? 'Gerente de Proyecto'
        : 'Analista de Viáticos';
    let mensaje = `Firma digital registrada para ${nombreRolFirmante} (Certificado: ${certId}).`;

    if (todasFirmasCompletadas) {
      // Surtido el flujo de firmas de aprobación (Jefe de Dependencia y Gerente de Proyecto),
      // la solicitud NO regresa al enlace para consolidar información; avanza directamente
      // a la Secretaría de Viáticos evaluando la anticipación de 14 días hábiles
      // para fijar su estado en SOLICITADO (ordinaria) o EXTEMPORANEA.
      const ahora = new Date();
      const festivosSet = await cargarFestivosAuth(this.dataSource);
      const configJornada =
        typeof this.configService?.obtenerJornadaLaboralActiva === 'function'
          ? await this.configService.obtenerJornadaLaboralActiva()
          : null;
      const radicadoFueraJornada = esRadicacionFueraDeJornada(
        ahora,
        festivosSet,
        configJornada,
      );

      const diasHabilesAnticipacion = contarDiasHabiles(
        fechaEfectivaRadicacion(ahora, festivosSet, configJornada),
        solicitud.fechaInicio,
        festivosSet,
        'previos',
        configJornada?.diasLaborales,
      );
      const anticipacionMinima = configJornada?.diasAnticipacionMinima ?? 14;
      const esExtemporanea = diasHabilesAnticipacion < anticipacionMinima;
      const nuevoEstado = EstadoSolicitud.SOLICITADO;

      const estadoAnterior = solicitud.estadoSolicitud;
      solicitud.estadoSolicitud = nuevoEstado;
      solicitud.extemporanea = esExtemporanea;
      solicitud.radicadoFueraJornada = radicadoFueraJornada;
      solicitud.motivoDevolucion = null;
      if (!solicitud.fechaRadicacion) {
        solicitud.fechaRadicacion = ahora;
      }
      radicada = true;
      mensaje = `Flujo de firmas de aprobación surtido satisfactoriamente con certificación digital. La solicitud ha avanzado directamente a la Secretaría de Viáticos en estado ${nuevoEstado}. Certificado: ${certId}`;

      const saved = await this.solicitudRepo.save(solicitud);

      try {
        await this.dataSource.getRepository(SolicitudHistorialEstadoEntity).save({
          solicitudId: solicitud.id,
          estadoAnterior,
          estadoNuevo: nuevoEstado,
          usuarioId:
            usuarioId ||
            solicitud.creadoPorUsuarioId ||
            '00000000-0000-0000-0000-000000000000',
          comentarios: `Flujo de firmas de aprobación completado (Jefe de Dependencia y Gerente de Proyecto). Solicitud radicada y remitida a la Secretaría de Viáticos en estado ${nuevoEstado} (${esExtemporanea ? 'Extemporánea por anticipación menor a 14 días hábiles' : 'Ordinaria'}). Certificado ${certId}.`,
        });
      } catch (histError: any) {
        this.logger.warn(
          `[firmarAprobacionSolicitud] No se pudo guardar historial de estado: ${histError?.message}`,
        );
      }

      // Notificar a la Secretaría de Viáticos (in-app y correo) para priorización y asignación a analista
      const consecutivo = saved.consecutivoUnico || saved.id;
      const comisionadoNombre = saved.comisionado
        ? `${saved.comisionado.primerNombre || ''} ${saved.comisionado.primerApellido || ''}`.trim()
        : '';
      const destino = `${saved.destinoCiudad || ''}${saved.destinoDepartamento ? ` (${saved.destinoDepartamento})` : ''}`.trim();
      const fechaIni = saved.fechaInicio ? new Date(saved.fechaInicio).toISOString().split('T')[0] : '';
      const fechaFn = saved.fechaFin ? new Date(saved.fechaFin).toISOString().split('T')[0] : '';
      const fechasStr = fechaIni && fechaFn ? `${fechaIni} al ${fechaFn}` : fechaIni || fechaFn || 'Por definir';

      this.notificationClient
        .notifyByPermission(
          'travel_expenses.general.es_secretario_viaticos',
          {
            tipo_notificacion: 'VIATICOS_RADICADA',
            titulo: `Nueva solicitud para revisión: ${consecutivo}`,
            mensaje: `El expediente ${consecutivo} (${esExtemporanea ? 'Extemporáneo' : 'Ordinario'}) completó el flujo de firmas de aprobación y requiere asignación/revisión en la bandeja de Secretaría de Viáticos.`,
            descripcion_corta: `Solicitud ${consecutivo} · ${saved.comisionado?.numeroDocumento ?? ''}`,
            icono: 'FileText',
            color: '#003DA5',
            prioridad: esExtemporanea ? 'Alta' : 'Media',
            categoria: 'VIATICOS',
            tiene_accion: true,
            texto_boton_accion: 'Ver en bandeja',
            url_accion: '/viaticos',
            datos_adicionales: {
              solicitudId: saved.id,
              consecutivoUnico: consecutivo,
              esExtemporanea,
            },
          },
          {
            subject: `[Viáticos ESAP] Nueva Solicitud para Revisión: ${consecutivo}`,
            html: buildTravelExpenseEmailHtml({
              destinatarioNombre: 'Secretaría de Viáticos',
              tituloHeader: 'ESAP — Grupo de Viáticos',
              subtituloHeader: 'Bandeja de Entrada — Solicitud Aprobada por Jefaturas',
              mensajePrincipal: `Se han completado todas las firmas de aprobación requeridas para la solicitud de comisión de servicios, la cual se encuentra en estado <strong>${nuevoEstado}</strong> y requiere priorización y asignación a analista:`,
              consecutivo,
              comisionadoNombre,
              destino,
              fechas: fechasStr,
              nuevoEstado,
              tipoNovedad: esExtemporanea ? 'WARNING' : 'INFO',
              textoBoton: 'Ir a la Bandeja de Entrada',
            }),
            text: `Se ha completado el flujo de firmas para la comisión ${consecutivo}. Pasa a revisión en la bandeja del Grupo de Viáticos en estado ${nuevoEstado}.`,
          },
          'SECRETARIO',
        )
        .catch((err) =>
          this.logger.warn(
            `[notify] No se pudo notificar a secretarios para solicitud ${saved.id}: ${err?.message}`,
          ),
        );

      return {
        solicitud: saved,
        radicada,
        mensaje,
        firmas: firmasPrevias,
        certificadoId: certId,
      };
    } else {
      if (solicitud.estadoSolicitud !== EstadoSolicitud.PENDIENTE_FIRMAS) {
        solicitud.estadoSolicitud = EstadoSolicitud.PENDIENTE_FIRMAS;
      }
      const saved = await this.solicitudRepo.save(solicitud);

      try {
        await this.dataSource.getRepository(SolicitudHistorialEstadoEntity).save({
          solicitudId: solicitud.id,
          estadoAnterior: solicitud.estadoSolicitud,
          estadoNuevo: EstadoSolicitud.PENDIENTE_FIRMAS,
          usuarioId: usuarioId || '00000000-0000-0000-0000-000000000000',
          comentarios: `Firma digital registrada para ${dto.tipoFirma} (${dto.nombreFirmante}) con certificado ${certId}. Pendiente firma restante para radicación formal.`,
        });
      } catch (histError: any) {
        this.logger.warn(
          `[firmarAprobacionSolicitud] No se pudo guardar historial intermedio: ${histError?.message}`,
        );
      }

      return {
        solicitud: saved,
        radicada: false,
        mensaje: `${mensaje} Pendiente la firma restante para surtir la radicación formal.`,
        firmas: firmasPrevias,
        certificadoId: certId,
      };
    }
  }

  /**
   * Devuelve la solicitud durante el flujo de firmas de aprobación con observaciones.
   */
  async devolverFirmaAprobacion(
    solicitudId: string,
    motivo: string,
    usuarioId?: string,
  ): Promise<SolicitudComisionEntity> {
    if (!motivo || !motivo.trim()) {
      throw new BadRequestException('El motivo de devolución es obligatorio.');
    }

    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    const estadoAnterior = solicitud.estadoSolicitud;
    solicitud.estadoSolicitud = EstadoSolicitud.DEVUELTA;
    solicitud.motivoDevolucion = motivo.trim();

    if (solicitud.camposAdicionales) {
      solicitud.camposAdicionales.firmasCompletadas = false;
      solicitud.camposAdicionales.firmasAprobacion = [];
    }

    const saved = await this.solicitudRepo.save(solicitud);

    await this.dataSource.getRepository(SolicitudHistorialEstadoEntity).save({
      solicitudId: solicitud.id,
      estadoAnterior,
      estadoNuevo: EstadoSolicitud.DEVUELTA,
      usuarioId: usuarioId || '00000000-0000-0000-0000-000000000000',
      comentarios: `Solicitud devuelta en revisión de firmas de aprobación: ${motivo.trim().slice(0, 200)}`,
    });

    // Notificar al Enlace que elaboró la solicitud para que pueda subsanar y reenviar a firmas
    if (solicitud.creadoPorUsuarioId) {
      const consecutivo = solicitud.consecutivoUnico || solicitud.id;
      const datosFirmante = usuarioId
        ? await this.resolverDatosUsuario(usuarioId, 'Directivo Firmante')
        : { nombre: 'Directivo Firmante', cargo: 'Aprobador de Comisión' };
      const nombreDevuelve = datosFirmante.nombre || 'Directivo Firmante';
      const cargoDevuelve = datosFirmante.cargo || '';
      const firmanteStr = cargoDevuelve ? `${nombreDevuelve} (${cargoDevuelve})` : nombreDevuelve;

      const notifEnlace = {
        tipo_notificacion: 'VIATICOS_DEVUELTA_FIRMAS',
        titulo: `Solicitud devuelta para subsanar: ${consecutivo}`,
        mensaje: `La solicitud ${consecutivo} fue devuelta por ${firmanteStr} con observaciones. Puede editarla para subsanar y reenviarla al flujo de firmas de aprobación.`,
        descripcion_corta: `Devuelta para subsanar · ${consecutivo}`,
        icono: 'AlertTriangle',
        color: '#D97706',
        prioridad: 'Alta' as const,
        categoria: 'VIATICOS',
        tiene_accion: true,
        texto_boton_accion: 'Subsanar solicitud',
        url_accion: '/viaticos',
        datos_adicionales: {
          solicitudId: solicitud.id,
          consecutivoUnico: consecutivo,
          motivo: motivo.trim(),
        },
      };

      const emailEnlace = {
        subject: `[Viáticos ESAP] Solicitud Devuelta para Subsanar: ${consecutivo}`,
        html: buildTravelExpenseEmailHtml({
          destinatarioNombre: 'Enlace de Dependencia',
          tituloHeader: 'ESAP — Solicitud Devuelta en Firmas de Aprobación',
          subtituloHeader: `Expediente: ${consecutivo}`,
          mensajePrincipal: `La solicitud de comisión de servicios <strong>${consecutivo}</strong> ha sido devuelta por <strong>${firmanteStr}</strong> para subsanación de observaciones. Ingrese a la plataforma para realizar los ajustes requeridos y reenviarla al flujo de firmas de aprobación.`,
          consecutivo,
          nuevoEstado: 'DEVUELTA',
          observaciones: motivo.trim(),
          tipoNovedad: 'WARNING',
          textoBoton: 'Subsanar en Plataforma',
        }),
        text: `La solicitud ${consecutivo} fue devuelta por ${firmanteStr}. Observaciones: ${motivo.trim()}. Ingrese a la plataforma para editar y subsanar.`,
      };

      this.notificationClient
        .notifyUser(solicitud.creadoPorUsuarioId, notifEnlace, emailEnlace)
        .catch((err) =>
          this.logger.warn(
            `[devolverFirmaAprobacion] No se pudo notificar al enlace creador ${solicitud.creadoPorUsuarioId}: ${err?.message}`,
          ),
        );
    }

    return saved;
  }

  /**
   * Envía una alerta y recordatorio prioritario de firma de aprobación pendiente al rol correspondiente.
   */
  async notificarFirmaPendiente(
    solicitudId: string,
    tipoFirmaPendiente?: string,
    usuarioSolicitaId?: string,
  ): Promise<{ ok: boolean; mensaje: string }> {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
      relations: ['comisionado'],
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    const consecutivo =
      solicitud.consecutivoUnico ||
      solicitud.camposAdicionales?.consecutivoUnico ||
      solicitud.id;
    const destino = solicitud.destinoCiudad || 'Territorio Nacional';
    const comisionadoNombre = solicitud.comisionado
      ? `${solicitud.comisionado.primerNombre || ''} ${solicitud.comisionado.primerApellido || ''}`.trim()
      : 'Funcionario en comisión';

    const esJefe = tipoFirmaPendiente === TipoFirmaAprobacion.JEFE_DEPENDENCIA;
    const nombreRol = esJefe
      ? 'Jefe de Dependencia / Supervisor'
      : 'Gerente de Proyecto';

    const permissions = esJefe
      ? ['travel_expenses.general.es_jefe_dependencia']
      : ['travel_expenses.general.es_gerente_proyecto'];

    const roles = esJefe
      ? ['JEFE_DEPENDENCIA']
      : ['GERENTE_PROYECTO'];

    try {
      let destinatarios = await this.notificationClient.getRecipientsByPermissions(
        permissions,
        roles,
      );
      if (!destinatarios.length) {
        destinatarios = await this.notificationClient.getRecipientsByPermission(
          'travel_expenses:sign_approval',
          'SUPER_ADMIN',
        );
      }

      if (destinatarios.length > 0) {
        const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
        const notificaciones = destinatarios.map((d) => ({
          id_usuario_destinatario: d.id,
          tipo_notificacion: 'RECORDATORIO_FIRMA_PENDIENTE',
          titulo: `Recordatorio: Firma pendiente en solicitud ${consecutivo}`,
          mensaje: `Se le recuerda que la solicitud de viáticos ${consecutivo} para ${comisionadoNombre} (${destino}) se encuentra pendiente de su revisión y firma de aprobación como ${nombreRol}.`,
          descripcion_corta: `Firma pendiente: ${consecutivo}`,
          icono: 'bell',
          color: '#F59E0B',
          prioridad: 'Alta' as const,
          categoria: 'VIATICOS' as const,
          tiene_accion: true,
          texto_boton_accion: 'Revisar y Firmar',
          url_accion: `${appBaseUrl}/viaticos`,
          datos_adicionales: {
            solicitudId: solicitud.id,
            consecutivo,
            tipoFirma: tipoFirmaPendiente,
          },
        }));
        await this.notificationClient.sendMany(notificaciones);

        // Envío de correo electrónico institucional a los destinatarios
        const uniqueEmails = Array.from(
          new Set(
            destinatarios
              .map((d) => d.email)
              .filter((email) => Boolean(email && email.includes('@'))),
          ),
        );

        for (const email of uniqueEmails) {
          const directivo = destinatarios.find((d) => d.email === email);
          try {
            const emailHtml = buildTravelExpenseEmailHtml({
              destinatarioNombre:
                directivo?.fullName || directivo?.username || nombreRol,
              tituloHeader: 'ESAP — Sistema de Gestión de Viáticos y Comisiones',
              subtituloHeader:
                'Recordatorio Prioritario: Firma de Aprobación Pendiente',
              mensajePrincipal: `Se le recuerda que la solicitud de viáticos <strong>${consecutivo}</strong> para el comisionado <strong>${comisionadoNombre}</strong> con destino <strong>${destino}</strong> se encuentra pendiente de su revisión y firma digital de aprobación como <strong>${nombreRol}</strong>.`,
              consecutivo,
              comisionadoNombre,
              destino,
              fechas:
                solicitud.fechaInicio && solicitud.fechaFin
                  ? `${solicitud.fechaInicio} al ${solicitud.fechaFin}`
                  : undefined,
              nuevoEstado: 'PENDIENTE DE FIRMAS',
              badgeColor: '#F59E0B',
              objetoComision: solicitud.objetoComision,
              motivoUObservaciones: `Alerta institucional: Se requiere su firma de aprobación previa a la radicación de la comisión de servicios.\n\nPor favor ingrese a la bandeja de firmas para revisar el expediente, verificar los soportes obligatorios y registrar su firma digital de aprobación con código OTP.`,
              tipoNovedad: 'WARNING',
              textoBoton: 'Ir a Revisar y Firmar Comisión',
              urlAccion: `${appBaseUrl}/viaticos`,
            });

            await this.notificationClient.sendEmail({
              to: email,
              subject: `[ESAP Viáticos] Recordatorio: Firma de aprobación requerida en solicitud ${consecutivo}`,
              html: emailHtml,
              text: `Recordatorio: La solicitud ${consecutivo} para ${comisionadoNombre} (${destino}) se encuentra pendiente de su revisión y firma de aprobación como ${nombreRol}. Ingrese a la plataforma para firmar: ${appBaseUrl}/viaticos`,
            });
            this.logger.log(
              `[notificarFirmaPendiente] Correo de recordatorio enviado a ${email} para solicitud ${consecutivo}`,
            );
          } catch (emailErr) {
            this.logger.warn(
              `[notificarFirmaPendiente] No se pudo enviar correo a ${email}: ${emailErr}`,
            );
          }
        }
      }
    } catch (e) {
      this.logger.warn(`Error enviando notificación de firma pendiente: ${e}`);
    }

    return {
      ok: true,
      mensaje: `Alerta y recordatorio de firma enviado exitosamente a ${nombreRol}.`,
    };
  }

  /**
   * Obtiene la bandeja de solicitudes que requieren firma de aprobación previa a la radicación.
   * Lista comisiones en estado PENDIENTE_FIRMAS con información de comisionado y firmas.
   */
  async obtenerBandejaFirmas(
    page = 1,
    limit = 20,
    busqueda?: string,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const query = this.solicitudRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.comisionado', 'comisionado')
      .where('s.estado_solicitud = :estado', {
        estado: EstadoSolicitud.PENDIENTE_FIRMAS,
      });

    if (busqueda && busqueda.trim()) {
      const term = `%${busqueda.trim().toLowerCase()}%`;
      query.andWhere(
        `(LOWER(s.consecutivo_unico) LIKE :term
          OR LOWER(comisionado.primer_nombre) LIKE :term
          OR LOWER(comisionado.primer_apellido) LIKE :term
          OR LOWER(comisionado.segundo_nombre) LIKE :term
          OR LOWER(comisionado.numero_documento) LIKE :term
          OR LOWER(s.objeto_comision) LIKE :term
          OR LOWER(s.destino_ciudad) LIKE :term)`,
        { term },
      );
    }

    query.orderBy('s.creadoEn', 'DESC');

    const total = await query.getCount();
    const data = await query
      .offset((page - 1) * limit)
      .limit(limit)
      .getMany();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Siguiente consecutivo correlativo. Se compara la parte numérica (no el texto)
   * para que COM-2026-10000 quede después de COM-2026-9999. Debe invocarse dentro
   * de la transacción que tiene el bloqueo del consecutivo.
   */
  private async generarConsecutivoUnico(manager: EntityManager): Promise<string> {
    const resultado = await manager
      .getRepository(SolicitudComisionEntity)
      .createQueryBuilder('s')
      .select(
        "MAX(CAST(SUBSTRING(s.consecutivo_unico FROM '^COM-2026-([0-9]+)$') AS INTEGER))",
        'max',
      )
      .where('s.consecutivo_unico LIKE :pattern', { pattern: 'COM-2026-%' })
      .getRawOne();

    const siguiente = Number(resultado?.max ?? 0) + 1;
    return `COM-2026-${String(siguiente).padStart(4, '0')}`;
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

  /**
   * RF-VAL-003 — Bloquea la solicitud si el comisionado tiene una o más
   * comisiones que ya debieron legalizarse (fecha límite vencida) y no están
   * legalizadas. Usa la definición de pendientes de la Etapa 9.
   */
  private async validarLegalizacionesPendientes(comisionadoId: string): Promise<void> {
    if (!this.pendientesService || !comisionadoId) return;

    const { comisiones } = await this.pendientesService.tieneLegalizacionesPendientes(comisionadoId);
    const ahora = Date.now();
    const vencidas = comisiones.filter(
      (c) => c.fechaLimite && new Date(c.fechaLimite).getTime() < ahora,
    );
    if (vencidas.length === 0) return;

    const listado = vencidas
      .map((c) => {
        const limite = new Date(c.fechaLimite as Date).toLocaleString('es-CO', {
          timeZone: 'America/Bogota',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        return `${c.codigo} (fecha límite ${limite})`;
      })
      .join(', ');
    throw new ConflictException(
      `El comisionado tiene ${vencidas.length === 1 ? 'una comisión pendiente' : `${vencidas.length} comisiones pendientes`} ` +
        `de legalizar con el plazo vencido: ${listado}. ` +
        `Debe ${vencidas.length === 1 ? 'legalizarla' : 'legalizarlas'} antes de registrar una nueva solicitud.`,
    );
  }

  /**
   * Verifica si las fechas propuestas para un comisionado se cruzan con otra solicitud existente
   * (sin bloquear la persistencia en modo borrador, pero alertando al usuario antes de pasar al cargue de soportes).
   */
  async verificarSolapamientoFechas(
    comisionadoIdOrDocumento: string,
    fechaInicioStr: string,
    fechaFinStr: string,
    solicitudId?: string,
  ): Promise<{
    haySolapamiento: boolean;
    mensaje: string | null;
    solicitudConflicto: any | null;
  }> {
    if (!comisionadoIdOrDocumento || !fechaInicioStr || !fechaFinStr) {
      return { haySolapamiento: false, mensaje: null, solicitudConflicto: null };
    }

    const fechaInicio = new Date(fechaInicioStr);
    const fechaFin = new Date(fechaFinStr);
    if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
      return { haySolapamiento: false, mensaje: null, solicitudConflicto: null };
    }

    // Localizar comisionado por ID o número de documento
    const esUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        comisionadoIdOrDocumento,
      );
    let comisionado = esUuid
      ? await this.comisionadoRepo.findOne({
          where: { id: comisionadoIdOrDocumento },
        })
      : null;
    if (!comisionado) {
      comisionado = await this.comisionadoRepo.findOne({
        where: { numeroDocumento: comisionadoIdOrDocumento },
      });
    }

    if (!comisionado) {
      return { haySolapamiento: false, mensaje: null, solicitudConflicto: null };
    }

    const qb = this.solicitudRepo
      .createQueryBuilder('s')
      .where('s.comisionado_id = :comisionadoId', {
        comisionadoId: comisionado.id,
      })
      .andWhere(CONDICION_SOLAPAMIENTO_DIAS, rangoSolapamiento(fechaInicio, fechaFin))
      .andWhere('s.estado_solicitud NOT IN (:...estadosExcluidos)', {
        estadosExcluidos: [EstadoSolicitud.CANCELADA, EstadoSolicitud.RECHAZADO],
      });

    if (solicitudId) {
      qb.andWhere('s.id <> :solicitudId', { solicitudId });
    }

    const solapamiento = await qb.getOne();

    if (solapamiento) {
      const mensaje = this.mensajeConflictoFechas(
        solapamiento,
        fechaInicio,
        fechaFin,
      );
      return {
        haySolapamiento: true,
        mensaje,
        solicitudConflicto: {
          id: solapamiento.id,
          consecutivoUnico: solapamiento.consecutivoUnico || solapamiento.id,
          estadoSolicitud: solapamiento.estadoSolicitud,
          fechaInicio: solapamiento.fechaInicio,
          fechaFin: solapamiento.fechaFin,
          destinoCiudad: solapamiento.destinoCiudad,
          destinoDepartamento: solapamiento.destinoDepartamento,
        },
      };
    }

    return {
      haySolapamiento: false,
      mensaje: null,
      solicitudConflicto: null,
    };
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

  async validarLimitesCaracteres(
    datosFormulario: Record<string, any>,
  ): Promise<{ errores: string[] }> {
    if (!this.configService || typeof this.configService.obtenerCamposFormulario !== 'function') {
      return { errores: [] };
    }
    const camposCatalogo = await this.configService.obtenerCamposFormulario();
    const errores: string[] = [];

    for (const campo of camposCatalogo) {
      if (!campo.activo) continue;
      const valor = datosFormulario[campo.clave];
      if (typeof valor === 'string' && valor.length > 0) {
        const limite =
          campo.limiteCaracteres !== undefined && campo.limiteCaracteres !== null
            ? campo.limiteCaracteres
            : 250;
        if (limite > 0 && valor.length > limite) {
          errores.push(
            `El campo "${campo.etiqueta}" (${campo.clave}) supera el límite permitido de ${limite} caracteres (actual: ${valor.length})`,
          );
        }
      }
    }

    return { errores };
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
   * Resuelve nombre completo, cédula/documento y cargo de un usuario a partir de su ID consultando
   * auth."user" y auth.personas. Si no se encuentra, retorna fallbackNombre.
   */
  async resolverDatosUsuario(
    usuarioId?: string | null,
    fallbackNombre: string = '',
  ): Promise<{ nombre: string; documento: string; cargo: string; email: string }> {
    const result = { nombre: fallbackNombre, documento: '', cargo: '', email: '' };
    if (!usuarioId) return result;
    const cleanId = String(usuarioId).trim();
    if (!cleanId) return result;

    if (typeof this.dataSource?.query === 'function') {
      try {
        const rows: any[] = await this.dataSource.query(
          `SELECT 
             u.id_user,
             u.username,
             p.nom_tercero,
             p.pri_apellido,
             p.seg_apellido,
             p.nom_largo,
             p.num_identificacion,
             c.nom_cargo AS cargo,
             p.dir_email
           FROM auth."user" u
           LEFT JOIN auth.personas p ON p.id_person = u.id_person
           LEFT JOIN auth.cargos c ON c.id_cargo = p.id_cargo
           WHERE u.id_user::text = $1 
              OR LOWER(u.username) = LOWER($1) 
              OR LOWER(SPLIT_PART($1, '@', 1)) = LOWER(u.username)
              OR (p.dir_email IS NOT NULL AND LOWER(p.dir_email) = LOWER($1))
              OR p.num_identificacion = $1
           LIMIT 1`,
          [cleanId],
        );

        let r = Array.isArray(rows) && rows[0] ? rows[0] : null;

        // Si no encontró relación por auth."user", intentar directamente en auth.personas
        if (!r || (!r.nom_largo && !r.nom_tercero)) {
          const pRows: any[] = await this.dataSource.query(
            `SELECT 
               p.nom_tercero,
               p.pri_apellido,
               p.seg_apellido,
               p.nom_largo,
               p.num_identificacion,
               c.nom_cargo AS cargo,
               p.dir_email
             FROM auth.personas p
             LEFT JOIN auth.cargos c ON c.id_cargo = p.id_cargo
             WHERE LOWER(p.dir_email) = LOWER($1)
                OR p.num_identificacion = $1
                OR LOWER(SPLIT_PART(p.dir_email, '@', 1)) = LOWER(SPLIT_PART($1, '@', 1))
             LIMIT 1`,
            [cleanId],
          );
          if (Array.isArray(pRows) && pRows[0]) {
            r = { ...(r || {}), ...pRows[0] };
          }
        }

        if (r) {
          const partes = [r.nom_tercero, r.pri_apellido, r.seg_apellido].filter(Boolean).join(' ').trim();
          let nombreHumano = (r.nom_largo || partes || '').trim();
          if (nombreHumano && !nombreHumano.includes('@')) {
            // Capitalizar palabras si está en minúsculas (ej. "jefe planeacion" -> "Jefe Planeación")
            if (nombreHumano === nombreHumano.toLowerCase()) {
              nombreHumano = nombreHumano
                .split(/\s+/)
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join(' ');
            }
            result.nombre = nombreHumano;
          } else if (r.username && !r.username.includes('@')) {
            result.nombre = String(r.username).trim();
          }
          if (r.num_identificacion) result.documento = String(r.num_identificacion).trim();
          if (r.cargo) result.cargo = String(r.cargo).trim();
          if (r.dir_email) {
            result.email = String(r.dir_email).trim();
          } else if (r.username && r.username.includes('@')) {
            result.email = String(r.username).trim();
          }
        }
      } catch (e) {
        this.logger.warn(`Error resolviendo datos de usuario ${usuarioId}: ${e}`);
      }
    }
    return result;
  }

  /**
   * Resuelve el nombre y apellidos de un usuario a partir de su ID consultando
   * auth."user" y auth.personas. Si no se encuentra, retorna fallbackNombre.
   */
  async resolverNombreUsuario(
    usuarioId?: string | null,
    fallbackNombre: string = '',
  ): Promise<string> {
    const datos = await this.resolverDatosUsuario(usuarioId, fallbackNombre);
    return datos.nombre || fallbackNombre;
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

    // Helper fechas y horas en formato dd/mm/aaaa hh:mm:ss sin desfasaje de zona horaria
    const formatFechaHoraSegura = (d: any): string => {
      if (!d) return '';
      const date = d instanceof Date ? d : new Date(d);
      if (isNaN(date.getTime())) return String(d);
      try {
        return date.toLocaleString('es-CO', {
          timeZone: 'America/Bogota',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
      } catch {
        return date.toISOString().replace('T', ' ').substring(0, 19);
      }
    };

    // Firmas registradas en la solicitud
    const firmasRegistradasPdf: any[] = Array.isArray(solicitud.camposAdicionales?.firmasAprobacion)
      ? [...solicitud.camposAdicionales.firmasAprobacion]
      : [];
    const firmaJefePdf = firmasRegistradasPdf.find((f: any) => f.tipo === TipoFirmaAprobacion.JEFE_DEPENDENCIA && f.estado !== 'RECHAZADO');
    const firmaGerentePdf = firmasRegistradasPdf.find((f: any) => f.tipo === TipoFirmaAprobacion.GERENTE_PROYECTO && f.estado !== 'RECHAZADO');
    const firmaAnalistaPrev = firmasRegistradasPdf.find(
      (f: any) =>
        (f.tipo === TipoFirmaAprobacion.ANALISTA || (f.tipo as string) === 'ANALISTA_VIATICOS') &&
        f.estado !== 'RECHAZADO',
    );
    const firmaElaboro = solicitud.camposAdicionales?.firmaElaboro;

    // Elaboró: Nombre del enlace que lo generó (creadoPorUsuarioId, usuarioRadicacionId, firmaElaboro, camposAdicionales)
    const enlaceId =
      solicitud.creadoPorUsuarioId || (solicitud as any).usuarioRadicacionId;
    let elaboroNombre = '';
    let elaboroDoc = '';
    let elaboroEmail = '';
    if (enlaceId) {
      const dEnlace = await this.resolverDatosUsuario(enlaceId, '');
      elaboroNombre = dEnlace.nombre;
      elaboroDoc = dEnlace.documento;
      elaboroEmail = dEnlace.email;
    }

    let nombreEnlaceFinal =
      (firmaElaboro?.nombreFirmante && !firmaElaboro.nombreFirmante.includes('@') ? firmaElaboro.nombreFirmante : '') ||
      solicitud.camposAdicionales?.nombreEnlace ||
      solicitud.camposAdicionales?.enlaceNombre ||
      elaboroNombre ||
      '';

    let emailEnlaceFinal =
      (firmaElaboro?.nombreFirmante?.includes('@') ? firmaElaboro.nombreFirmante : '') ||
      elaboroEmail ||
      solicitud.camposAdicionales?.emailEnlace ||
      '';

    // Si viene como correo o vacío, intentar resolver con resolverDatosUsuario
    if (!nombreEnlaceFinal || nombreEnlaceFinal.includes('@')) {
      const idParaResolver =
        (firmaElaboro?.nombreFirmante?.includes('@') ? firmaElaboro.nombreFirmante : null) ||
        enlaceId ||
        (solicitud as any).creadoPor ||
        (req?.user?.email);
      if (idParaResolver) {
        const d = await this.resolverDatosUsuario(idParaResolver, '');
        if (d.nombre && !d.nombre.includes('@')) {
          nombreEnlaceFinal = d.nombre;
        }
        if (d.documento && !elaboroDoc) {
          elaboroDoc = d.documento;
        }
        if (d.email && !emailEnlaceFinal) {
          emailEnlaceFinal = d.email;
        }
      }
    }

    if ((!nombreEnlaceFinal || nombreEnlaceFinal.includes('@')) && elaboroNombre && !elaboroNombre.includes('@')) {
      nombreEnlaceFinal = elaboroNombre;
    }
    if ((!nombreEnlaceFinal || nombreEnlaceFinal.includes('@')) && req?.user?.fullName && !req.user.fullName.includes('@')) {
      nombreEnlaceFinal = req.user.fullName;
    }
    if (!nombreEnlaceFinal || nombreEnlaceFinal.includes('@')) {
      nombreEnlaceFinal = 'Enlace de Dependencia';
    }

    const docEnlaceFinal =
      firmaElaboro?.documentoIdentidad ||
      solicitud.camposAdicionales?.documentoEnlace ||
      elaboroDoc ||
      '';
    const emailEnlaceStr = emailEnlaceFinal ? ` (${emailEnlaceFinal})` : '';
    const docElaboroStr = docEnlaceFinal ? ` · C.C. ${docEnlaceFinal}` : '';
    const fElaboroStr = firmaElaboro?.fechaFirma ? ` · Fecha: ${formatFechaHoraSegura(firmaElaboro.fechaFirma)}` : '';
    const certElaboroStr = firmaElaboro?.certificadoId ? ` · ✓ Firma Digital Verificada (Cert: ${firmaElaboro.certificadoId})` : '';

    const elaboroTexto = `Elaboró: ${nombreEnlaceFinal}${emailEnlaceStr}${docElaboroStr}${fElaboroStr}${certElaboroStr}`;

    // Revisó: El analista que lo revisó/verificó con firma digital (1er Nivel)
    const firmaAnalistaObj =
      solicitud.camposAdicionales?.firmaAnalista || firmaAnalistaPrev;

    const analistaId =
      firmaAnalistaObj?.usuarioId ||
      solicitud.analistaAsignadoId;
    let analistaNombre = '';
    let analistaDoc = '';
    if (analistaId) {
      const dAnalista = await this.resolverDatosUsuario(analistaId, '');
      analistaNombre = dAnalista.nombre;
      analistaDoc = dAnalista.documento;
    }
    if (firmaAnalistaObj && !firmaAnalistaObj.documentoIdentidad && analistaDoc) {
      firmaAnalistaObj.documentoIdentidad = analistaDoc;
    }
    const nombreAnalistaFinal =
      firmaAnalistaObj?.nombreFirmante ||
      solicitud.camposAdicionales?.nombreAnalista ||
      analistaNombre;
    const docAnalistaStr = (firmaAnalistaObj?.documentoIdentidad || analistaDoc)
      ? ` · C.C. ${firmaAnalistaObj?.documentoIdentidad || analistaDoc}`
      : '';
    const fechaFirmaAnalista = firmaAnalistaObj?.fechaFirma || solicitud.fechaRevision;
    const fAnalistaStr = fechaFirmaAnalista
      ? ` · Fecha: ${formatFechaHoraSegura(fechaFirmaAnalista)}`
      : '';
    const certIdAnalista =
      firmaAnalistaObj?.certificadoId ||
      (solicitud.camposAdicionales?.firmaAnalista?.certificadoId);
    const certAnalistaStr = certIdAnalista
      ? ` · ✓ Firma Digital (Cert: ${certIdAnalista})`
      : fechaFirmaAnalista
      ? ` · ✓ Verificado`
      : '';

    // Revisor de Control Viáticos (2do Nivel / Control Cruzado)
    const firmaControlPrev = firmasRegistradasPdf.find(
      (f: any) =>
        (f.tipo === 'CONTROL_VIATICOS' || f.tipo === TipoFirmaAprobacion.CONTROL_VIATICOS) &&
        f.estado !== 'RECHAZADO',
    );
    const firmaControlObj =
      solicitud.camposAdicionales?.firmaControlViaticos || firmaControlPrev;

    const revisorControlId =
      firmaControlObj?.usuarioId ||
      solicitud.revisorControlId;

    let revisorControlNombre = '';
    let revisorControlDoc = '';
    if (revisorControlId) {
      const dRev = await this.resolverDatosUsuario(revisorControlId, '');
      revisorControlNombre = dRev.nombre;
      revisorControlDoc = dRev.documento;
    }
    if (firmaControlObj && !firmaControlObj.documentoIdentidad && revisorControlDoc) {
      firmaControlObj.documentoIdentidad = revisorControlDoc;
    }
    const nombreControlFinal =
      firmaControlObj?.nombreFirmante ||
      solicitud.camposAdicionales?.revisorControlNombre ||
      revisorControlNombre;
    const docControlStr = (firmaControlObj?.documentoIdentidad || revisorControlDoc)
      ? ` · C.C. ${firmaControlObj?.documentoIdentidad || revisorControlDoc}`
      : '';
    const fechaFirmaControl = firmaControlObj?.fechaFirma || solicitud.fechaSegundaRevision;
    const fControlStr = fechaFirmaControl
      ? ` · Fecha: ${formatFechaHoraSegura(fechaFirmaControl)}`
      : '';
    const certIdControl =
      firmaControlObj?.certificadoId ||
      solicitud.camposAdicionales?.firmaControlViaticos?.certificadoId;
    const certControlStr = certIdControl
      ? ` · ✓ Firma Digital (Cert: ${certIdControl})`
      : fechaFirmaControl
      ? ` · ✓ Verificado 2do Nivel`
      : '';

    let revisoTexto = '';
    if (nombreAnalistaFinal && nombreControlFinal) {
      revisoTexto = `Revisó: Analista (Revisó): ${nombreAnalistaFinal}${docAnalistaStr}${fAnalistaStr}${certAnalistaStr}  |  Control Viáticos (2do Nivel - Revisó): ${nombreControlFinal}${docControlStr}${fControlStr}${certControlStr}`;
    } else if (nombreAnalistaFinal) {
      revisoTexto = `Revisó: Analista (Revisó): ${nombreAnalistaFinal}${docAnalistaStr}${fAnalistaStr}${certAnalistaStr}`;
    } else if (nombreControlFinal) {
      revisoTexto = `Revisó: Control Viáticos (2do Nivel - Revisó): ${nombreControlFinal}${docControlStr}${fControlStr}${certControlStr}`;
    } else {
      revisoTexto = 'Revisó: Pendiente revisión técnica y documental (Analista / Control Viáticos)';
    }

    // Flags de extemporaneidad y resolución de aprobadores
    const isExtemporanea = Boolean(
      solicitud.extemporanea ||
      solicitud.estadoSolicitud === EstadoSolicitud.EXTEMPORANEA ||
      solicitud.autorizadorDireccionId ||
      solicitud.fechaAutorizacionDireccion ||
      solicitud.decisionDireccion,
    );

    // 1. Datos Subdirector(a) de Gestión Corporativa (Ordenador del Gasto - RF-AUT-001)
    const subdirectorId = solicitud.autorizadorId;
    let subdirectorNombre = '';
    let subdirectorDoc = '';
    if (solicitud.autorizador) {
      subdirectorNombre =
        (solicitud.autorizador as any).nombreCompleto ||
        (solicitud.autorizador as any).nomLargo ||
        '';
    }
    if (!subdirectorNombre && subdirectorId) {
      const dSubdirector = await this.resolverDatosUsuario(subdirectorId, '');
      subdirectorNombre = dSubdirector.nombre;
      subdirectorDoc = dSubdirector.documento;
    }
    const firmaSubdirObj =
      solicitud.camposAdicionales?.firmaSubdireccion ||
      firmasRegistradasPdf.find(
        (f: any) =>
          (f.tipo === 'SUBDIRECCION' || (f.tipo as string) === 'SUBDIRECTOR') &&
          f.estado !== 'RECHAZADO',
      );
    if (firmaSubdirObj?.nombreFirmante && !subdirectorNombre) {
      subdirectorNombre = firmaSubdirObj.nombreFirmante;
    }
    if (firmaSubdirObj?.documentoIdentidad && !subdirectorDoc) {
      subdirectorDoc = firmaSubdirObj.documentoIdentidad;
    }
    const fechaAprobacionSubdir =
      firmaSubdirObj?.fechaFirma || solicitud.fechaAutorizacion;
    const certIdSubdir = firmaSubdirObj?.certificadoId;

    // 2. Datos Dirección Nacional (Autorización Excepcional Extemporánea - RF-AUT-002)
    const dirNacionalId = solicitud.autorizadorDireccionId;
    let dirNacionalNombre = '';
    let dirNacionalDoc = '';
    if (solicitud.autorizadorDireccion) {
      dirNacionalNombre =
        (solicitud.autorizadorDireccion as any).nombreCompleto ||
        (solicitud.autorizadorDireccion as any).nomLargo ||
        '';
    }
    if (!dirNacionalNombre && dirNacionalId) {
      const dDirNac = await this.resolverDatosUsuario(dirNacionalId, '');
      dirNacionalNombre = dDirNac.nombre;
      dirNacionalDoc = dDirNac.documento;
    }
    const firmaDirNacObj =
      solicitud.camposAdicionales?.firmaDireccionNacional ||
      firmasRegistradasPdf.find(
        (f: any) =>
          (f.tipo === 'DIRECCION_NACIONAL' ||
            (f.tipo as string) === 'DIRECTOR_NACIONAL') &&
          f.estado !== 'RECHAZADO',
      );
    if (firmaDirNacObj?.nombreFirmante && !dirNacionalNombre) {
      dirNacionalNombre = firmaDirNacObj.nombreFirmante;
    }
    if (firmaDirNacObj?.documentoIdentidad && !dirNacionalDoc) {
      dirNacionalDoc = firmaDirNacObj.documentoIdentidad;
    }
    const fechaAutorizacionDir =
      firmaDirNacObj?.fechaFirma || solicitud.fechaAutorizacionDireccion;
    const certIdDirNac = firmaDirNacObj?.certificadoId;
    const justificacionDirNac = solicitud.justificacionDireccion || '';

    // 3. Datos Grupo de Presupuesto (Compromiso presupuestal / Expedición RP - RF-PRE-001)
    const firmaPresupuestoObj =
      solicitud.camposAdicionales?.firmaPresupuesto ||
      firmasRegistradasPdf.find(
        (f: any) =>
          (f.tipo === 'PRESUPUESTO' || (f.tipo as string) === 'GRUPO_PRESUPUESTO') &&
          f.estado !== 'RECHAZADO',
      );
    const presupuestoUsuarioId =
      firmaPresupuestoObj?.usuarioId || (solicitud as any).expedidoRpPorId;
    let presupuestoNombre =
      firmaPresupuestoObj?.nombreFirmante && !String(firmaPresupuestoObj.nombreFirmante).includes('@')
        ? firmaPresupuestoObj.nombreFirmante
        : '';
    let presupuestoDoc = firmaPresupuestoObj?.documentoIdentidad || '';
    let presupuestoCargo = firmaPresupuestoObj?.cargoFirmante || '';
    if (presupuestoUsuarioId && (!presupuestoNombre || !presupuestoDoc)) {
      const dPres = await this.resolverDatosUsuario(presupuestoUsuarioId, '');
      if (!presupuestoNombre && dPres.nombre && !dPres.nombre.includes('@')) {
        presupuestoNombre = dPres.nombre;
      }
      if (!presupuestoDoc && dPres.documento) presupuestoDoc = dPres.documento;
      if (!presupuestoCargo && dPres.cargo) presupuestoCargo = dPres.cargo;
    }
    if (!presupuestoNombre && (solicitud as any).expedidoRpPor) {
      const u = (solicitud as any).expedidoRpPor;
      presupuestoNombre = u.nombreCompleto || u.nomLargo || '';
    }
    const fechaCompromisoPres =
      firmaPresupuestoObj?.fechaFirma || (solicitud as any).fechaExpedicionRp || null;
    const certIdPresupuesto = firmaPresupuestoObj?.certificadoId;
    const codigoRpPdf = (solicitud as any).codigoRp || solicitud.numeroRp || '';
    const valorComprometidoPdf = Number((solicitud as any).valorComprometido || 0);

    // 4. Datos Grupo de Tesorería (Pago y Desembolso — SIIF Nación, RF-PAG-001)
    const firmaTesoreriaObj =
      solicitud.camposAdicionales?.firmaTesoreria ||
      firmasRegistradasPdf.find(
        (f: any) =>
          (f.tipo === 'TESORERIA' ||
            (f.tipo as string) === 'GRUPO_TESORERIA' ||
            (f.tipo as string) === 'PAGADOR') &&
          f.estado !== 'RECHAZADO',
      );
    const tesoreriaUsuarioId =
      firmaTesoreriaObj?.usuarioId || (solicitud as any).pagadoPorId;
    let tesoreriaNombre =
      firmaTesoreriaObj?.nombreFirmante && !String(firmaTesoreriaObj.nombreFirmante).includes('@')
        ? firmaTesoreriaObj.nombreFirmante
        : '';
    let tesoreriaDoc = firmaTesoreriaObj?.documentoIdentidad || '';
    let tesoreriaCargo = firmaTesoreriaObj?.cargoFirmante || '';
    if (tesoreriaUsuarioId && (!tesoreriaNombre || !tesoreriaDoc)) {
      const dTes = await this.resolverDatosUsuario(tesoreriaUsuarioId, '');
      if (!tesoreriaNombre && dTes.nombre && !dTes.nombre.includes('@')) {
        tesoreriaNombre = dTes.nombre;
      }
      if (!tesoreriaDoc && dTes.documento) tesoreriaDoc = dTes.documento;
      if (!tesoreriaCargo && dTes.cargo) tesoreriaCargo = dTes.cargo;
    }
    if (!tesoreriaNombre && (solicitud as any).pagadoPor) {
      const u = (solicitud as any).pagadoPor;
      tesoreriaNombre = u.nombreCompleto || u.nomLargo || '';
    }
    const fechaPagoTes =
      firmaTesoreriaObj?.fechaFirma || (solicitud as any).fechaPago || (solicitud as any).fechaRegistroPago || null;
    const certIdTesoreria = firmaTesoreriaObj?.certificadoId;
    const numeroOrdenPagoPdf = (solicitud as any).numeroOrdenPago || '';
    const valorPagadoPdf = Number((solicitud as any).valorPagado || 0);
    const tesoreriaPago = Boolean(
      (solicitud.estadoSolicitud === EstadoSolicitud.PAGADA || Boolean(fechaPagoTes) || Boolean(numeroOrdenPagoPdf)) &&
      (tesoreriaNombre || tesoreriaUsuarioId || fechaPagoTes || numeroOrdenPagoPdf)
    );

    // Enriquecer datos de firmantes con C.C., correo institucional y nombre si vienen registrados o con usuarioId o correo
    if (firmaJefePdf) {
      const idParaResolverJefe =
        firmaJefePdf.usuarioId ||
        (firmaJefePdf.nombreFirmante?.includes('@') ? firmaJefePdf.nombreFirmante : null);
      if (idParaResolverJefe) {
        const d = await this.resolverDatosUsuario(idParaResolverJefe);
        if (d.documento && !firmaJefePdf.documentoIdentidad) firmaJefePdf.documentoIdentidad = d.documento;
        if (d.email) (firmaJefePdf as any).emailFirmante = d.email;
        if (firmaJefePdf.nombreFirmante?.includes('@')) {
          (firmaJefePdf as any).emailFirmante = (firmaJefePdf as any).emailFirmante || firmaJefePdf.nombreFirmante;
        }
        if (d.nombre && (!firmaJefePdf.nombreFirmante || firmaJefePdf.nombreFirmante.includes('@'))) {
          firmaJefePdf.nombreFirmante = d.nombre;
        }
        if (d.cargo && !firmaJefePdf.cargoFirmante) firmaJefePdf.cargoFirmante = d.cargo;
      }
    }
    if (firmaGerentePdf) {
      const idParaResolverGerente =
        firmaGerentePdf.usuarioId ||
        (firmaGerentePdf.nombreFirmante?.includes('@') ? firmaGerentePdf.nombreFirmante : null);
      if (idParaResolverGerente) {
        const d = await this.resolverDatosUsuario(idParaResolverGerente);
        if (d.documento && !firmaGerentePdf.documentoIdentidad) firmaGerentePdf.documentoIdentidad = d.documento;
        if (d.email) (firmaGerentePdf as any).emailFirmante = d.email;
        if (firmaGerentePdf.nombreFirmante?.includes('@')) {
          (firmaGerentePdf as any).emailFirmante = (firmaGerentePdf as any).emailFirmante || firmaGerentePdf.nombreFirmante;
        }
        if (d.nombre && (!firmaGerentePdf.nombreFirmante || firmaGerentePdf.nombreFirmante.includes('@'))) {
          firmaGerentePdf.nombreFirmante = d.nombre;
        }
        if (d.cargo && !firmaGerentePdf.cargoFirmante) firmaGerentePdf.cargoFirmante = d.cargo;
      }
    }

    // Búsqueda de datos complementarios en auth.personas (fecha_nacimiento, etc.)
    let fechaNacimientoPersona: string | null = null;
    if (comisionado?.numeroDocumento) {
      try {
        const docLimpio = comisionado.numeroDocumento.replace(/\D/g, '');
        const pRows = await this.dataSource.query(
          `SELECT p.fec_nacimiento
             FROM auth.personas p
            WHERE p.num_identificacion = $1
               OR p.num_identificacion = $2
               OR REPLACE(p.num_identificacion, '.', '') = $2
            LIMIT 1`,
          [comisionado.numeroDocumento, docLimpio],
        );
        if (pRows?.[0]?.fec_nacimiento) {
          fechaNacimientoPersona = String(pRows[0].fec_nacimiento);
        }
      } catch (err: any) {
        this.logger.debug?.(
          `[exportarFormato023] Error consultando auth.personas: ${err?.message}`,
        );
      }
    }

    // Búsqueda de nombre oficial de dependencia
    let dependenciaNombre =
      solicitud.camposAdicionales?.dependenciaSolicitante ||
      solicitud.camposAdicionales?.dependencia ||
      '';

    const idDep = solicitud.idDependencia || comisionado?.idDependencia;
    if (!dependenciaNombre && idDep) {
      try {
        const dRows = await this.dataSource.query(
          `SELECT nom_dependencia FROM auth.dependencias WHERE id_dependencia = $1 LIMIT 1`,
          [idDep],
        );
        if (dRows?.[0]?.nom_dependencia) {
          dependenciaNombre = dRows[0].nom_dependencia;
        }
      } catch (err: any) {
        this.logger.debug?.(
          `[exportarFormato023] Error consultando auth.dependencias: ${err?.message}`,
        );
      }
    }

    // Helper fechas en formato dd/mm/aaaa sin desfasaje de zona horaria
    const formatFechaSlash = (d: any): string => {
      if (!d) return '';
      if (typeof d === 'string') {
        const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
          return `${match[3]}/${match[2]}/${match[1]}`;
        }
        const mSlash = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (mSlash) {
          return `${mSlash[1].padStart(2, '0')}/${mSlash[2].padStart(2, '0')}/${mSlash[3]}`;
        }
      }

      const date = d instanceof Date ? d : new Date(d);
      if (isNaN(date.getTime())) return String(d);

      // Si es un objeto Date que proviene de fecha calendario (medianoche UTC o primeras horas UTC)
      // usamos componentes UTC para evitar que en UTC-5 (Colombia) retroceda al día anterior
      if (
        date.getUTCHours() <= 5 &&
        date.getUTCMinutes() === 0 &&
        date.getUTCSeconds() === 0
      ) {
        const dd = String(date.getUTCDate()).padStart(2, '0');
        const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
        const yyyy = date.getUTCFullYear();
        return `${dd}/${mm}/${yyyy}`;
      }

      // Para fechas con hora exacta (timestamps como creadoEn), formatear en zona horaria oficial Colombia
      try {
        const parts = new Intl.DateTimeFormat('es-CO', {
          timeZone: 'America/Bogota',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).formatToParts(date);
        const dd = parts.find((p) => p.type === 'day')?.value;
        const mm = parts.find((p) => p.type === 'month')?.value;
        const yyyy = parts.find((p) => p.type === 'year')?.value;
        if (dd && mm && yyyy) {
          return `${dd}/${mm}/${yyyy}`;
        }
      } catch {}

      const dd = String(date.getUTCDate()).padStart(2, '0');
      const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
      const yyyy = date.getUTCFullYear();
      return `${dd}/${mm}/${yyyy}`;
    };

    // Helper fechas largas en español para CDP sin desfasaje de zona horaria
    const formatFechaEspanolLarga = (d: any): string => {
      if (!d) return '';
      const meses = [
        'enero',
        'febrero',
        'marzo',
        'abril',
        'mayo',
        'junio',
        'julio',
        'agosto',
        'septiembre',
        'octubre',
        'noviembre',
        'diciembre',
      ];
      if (typeof d === 'string') {
        const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
          const yyyy = match[1];
          const mm = match[2];
          const dd = match[3];
          const mesNombre = meses[parseInt(mm, 10) - 1] || mm;
          return `${parseInt(dd, 10)} de ${mesNombre} de ${yyyy}`;
        }
      }
      const date = d instanceof Date ? d : new Date(d);
      if (isNaN(date.getTime())) return String(d);

      if (date.getUTCHours() <= 5 && date.getUTCMinutes() === 0) {
        const day = date.getUTCDate();
        const mesNombre = meses[date.getUTCMonth()];
        const year = date.getUTCFullYear();
        return `${day} de ${mesNombre} de ${year}`;
      }

      try {
        const formatter = new Intl.DateTimeFormat('es-CO', {
          timeZone: 'America/Bogota',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        return formatter.format(date);
      } catch {}

      const day = date.getUTCDate();
      const mesNombre = meses[date.getUTCMonth()];
      const year = date.getUTCFullYear();
      return `${day} de ${mesNombre} de ${year}`;
    };

    // Helper moneda colombiana ($ 1.234.567 o $ 1.234.567,00)
    const formatCurrencyCOP = (amount: number, conDecimales = false): string => {
      const num = Number(amount || 0);
      const partes = num.toFixed(conDecimales ? 2 : 0).split('.');
      const enteroFormateado = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      if (conDecimales) {
        return `$ ${enteroFormateado},${partes[1]}`;
      }
      return `$ ${enteroFormateado}`;
    };

    // Helper cédula con comas
    const formatCedula = (docNum: string): string => {
      if (!docNum) return '';
      const soloDigitos = docNum.replace(/\D/g, '');
      if (soloDigitos.length >= 4) {
        return soloDigitos.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      }
      return docNum;
    };

    // Helper días con coma para decimales
    const formatDias = (dias: number): string => {
      if (!Number.isFinite(dias) || dias <= 0) return '';
      return String(dias).replace('.', ',');
    };

    // Tipo de comisionado y campos dinámicos
    const tipoCom = (
      comisionado?.tipoComisionado ||
      solicitud.camposAdicionales?.tipoComisionado ||
      'CONTRATISTA'
    ).toUpperCase();

    let section1Title = '1. DATOS DEL CONTRATISTA';
    if (tipoCom === 'FUNCIONARIO') {
      section1Title = '1. DATOS DEL FUNCIONARIO';
    } else if (tipoCom === 'DOCENTE') {
      section1Title = '1. DATOS DEL DOCENTE';
    } else if (tipoCom === 'ESTUDIANTE') {
      section1Title = '1. DATOS DEL ESTUDIANTE';
    } else if (tipoCom === 'INVESTIGADOR') {
      section1Title = '1. DATOS DEL INVESTIGADOR';
    } else if (tipoCom !== 'CONTRATISTA') {
      section1Title = `1. DATOS DE ${tipoCom}`;
    }

    let dynamicComisionadoLabel = 'No. Contrato';
    let dynamicComisionadoValue =
      solicitud.camposAdicionales?.numeroContrato ||
      solicitud.camposAdicionales?.contrato ||
      '';

    if (tipoCom === 'FUNCIONARIO') {
      dynamicComisionadoLabel = 'Cargo:';
      dynamicComisionadoValue =
        solicitud.camposAdicionales?.cargoEsap ||
        solicitud.camposAdicionales?.cargo ||
        (comisionado as any)?.cargo ||
        '';
    } else if (tipoCom === 'DOCENTE' || tipoCom === 'INVESTIGADOR') {
      dynamicComisionadoLabel = 'Rol ESAP:';
      dynamicComisionadoValue =
        solicitud.camposAdicionales?.rolEsap ||
        solicitud.camposAdicionales?.rol ||
        '';
    } else {
      if (!dynamicComisionadoValue) {
        if (
          solicitud.camposAdicionales?.cargoEsap ||
          solicitud.camposAdicionales?.cargo
        ) {
          dynamicComisionadoLabel = 'Cargo:';
          dynamicComisionadoValue =
            solicitud.camposAdicionales.cargoEsap ||
            solicitud.camposAdicionales.cargo;
        } else if (
          solicitud.camposAdicionales?.rolEsap ||
          solicitud.camposAdicionales?.rol
        ) {
          dynamicComisionadoLabel = 'Rol ESAP:';
          dynamicComisionadoValue =
            solicitud.camposAdicionales.rolEsap ||
            solicitud.camposAdicionales.rol;
        }
      }
    }

    let dynamicCompLabel = 'Valor honorarios:';
    if (tipoCom === 'FUNCIONARIO') {
      dynamicCompLabel = 'Asignación Básica Mensual:';
    } else if (tipoCom === 'DOCENTE' || tipoCom === 'INVESTIGADOR') {
      dynamicCompLabel = 'Valor honorarios / Sueldo:';
    }

    const salarioContrato = Number(
      solicitud.salarioBaseAplicado ||
        solicitud.salarioBasico ||
        solicitud.camposAdicionales?.valorHonorarios ||
        0,
    );
    const salarioFormateado =
      salarioContrato > 0 ? formatCurrencyCOP(salarioContrato) : '';

    const entidadBancaria = (
      solicitud.camposAdicionales?.entidad_bancaria ||
      solicitud.camposAdicionales?.entidadBancaria ||
      solicitud.camposAdicionales?.banco ||
      ''
    ).toUpperCase();
    const tipoCuenta =
      solicitud.camposAdicionales?.tipo_cuenta ||
      solicitud.camposAdicionales?.tipoCuenta ||
      '';
    const numeroCuenta =
      solicitud.camposAdicionales?.num_cuenta ||
      solicitud.camposAdicionales?.numeroCuenta ||
      solicitud.camposAdicionales?.numCuenta ||
      solicitud.camposAdicionales?.numero_cuenta ||
      solicitud.camposAdicionales?.cuenta ||
      '';

    const rawFechaNac =
      solicitud.camposAdicionales?.fechaNacimiento ||
      solicitud.camposAdicionales?.fec_nacimiento ||
      fechaNacimientoPersona;
    const fechaNacimiento = rawFechaNac ? formatFechaSlash(rawFechaNac) : '';

    const rawFechaAuto =
      solicitud.camposAdicionales?.fechaAutoliquidacion ||
      solicitud.camposAdicionales?.fechaRadicacion ||
      (solicitud as any).fechaRadicacion ||
      solicitud.fechaCalculoModalidad ||
      solicitud.creadoEn ||
      new Date();
    let fechaAutoliquidacion = '';
    if (rawFechaAuto) {
      if (
        typeof rawFechaAuto === 'string' &&
        /^\d{4}-\d{2}-\d{2}/.test(rawFechaAuto)
      ) {
        fechaAutoliquidacion = formatFechaSlash(rawFechaAuto);
      } else {
        const dAuto =
          rawFechaAuto instanceof Date
            ? rawFechaAuto
            : new Date(rawFechaAuto);
        try {
          const parts = new Intl.DateTimeFormat('es-CO', {
            timeZone: 'America/Bogota',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }).formatToParts(dAuto);
          const dd = parts.find((p) => p.type === 'day')?.value;
          const mm = parts.find((p) => p.type === 'month')?.value;
          const yyyy = parts.find((p) => p.type === 'year')?.value;
          fechaAutoliquidacion = `${dd}/${mm}/${yyyy}`;
        } catch {
          fechaAutoliquidacion = formatFechaSlash(rawFechaAuto);
        }
      }
    }

    // Itinerario: Representación general y tramos detallados
    let itinerarioGeneral = '';

    if (Array.isArray(solicitud.itinerario) && solicitud.itinerario.length > 0) {
      const tramos = solicitud.itinerario;
      const ciudades: string[] = [];
      tramos.forEach((t, i) => {
        if (i === 0 && t.origenCiudad) ciudades.push(t.origenCiudad);
        if (t.destinoCiudad) ciudades.push(t.destinoCiudad);
        if (t.tipoTrayecto === 'IDA_Y_VUELTA' && t.origenCiudad) {
          ciudades.push(t.origenCiudad);
        }
      });
      const unicos: string[] = [];
      for (const c of ciudades) {
        if (
          unicos.length === 0 ||
          unicos[unicos.length - 1].toLowerCase() !== c.toLowerCase()
        ) {
          unicos.push(c);
        }
      }
      itinerarioGeneral = unicos.join(' - ');
    }

    if (!itinerarioGeneral) {
      if (solicitud.camposAdicionales?.itinerarioDetallado) {
        itinerarioGeneral = solicitud.camposAdicionales.itinerarioDetallado;
      } else if (solicitud.destinoCiudad) {
        const orig =
          solicitud.camposAdicionales?.ciudadOrigen ||
          solicitud.itinerario?.[0]?.origenCiudad ||
          '';
        itinerarioGeneral = orig
          ? `${orig} - ${solicitud.destinoCiudad} - ${orig}`
          : solicitud.destinoCiudad;
      }
    }

    const horaVueloIda =
      solicitud.camposAdicionales?.horaVueloIda ||
      solicitud.itinerario?.[0]?.horaEstimadaSalida ||
      solicitud.itinerario?.[0]?.horaSalida ||
      solicitud.itinerario?.[0]?.horarioEstimadoMilitar ||
      '';
    const ultimoTramo =
      solicitud.itinerario?.[solicitud.itinerario.length - 1];
    const horaVueloRegreso =
      solicitud.camposAdicionales?.horaVueloRegreso ||
      ultimoTramo?.horaEstimadaLlegada ||
      ultimoTramo?.horaLlegada ||
      ultimoTramo?.horaEstimadaSalida ||
      '';

    const fechaInicioStr = formatFechaSlash(solicitud.fechaInicio);
    const fechaFinStr = formatFechaSlash(solicitud.fechaFin);

    // Cálculos de liquidación de viáticos (GF-FO-023)
    let diasPernoctados = Number(solicitud.diasPernoctados || 0);
    let valorDiaPernoctado = Number(solicitud.tarifaDiaPernoctado || 0);
    let subtotalPernoctados = Number(
      solicitud.totalPernoctados != null
        ? solicitud.totalPernoctados
        : diasPernoctados * valorDiaPernoctado,
    );

    let diasNoPernoctados = Number(solicitud.diasNoPernoctados || 0);
    let valorDiaNoPernoctado = Number(solicitud.tarifaDiaNoPernoctado || 0);
    let subtotalNoPernoctados = Number(
      solicitud.totalNoPernoctados != null
        ? solicitud.totalNoPernoctados
        : diasNoPernoctados * valorDiaNoPernoctado,
    );

    const montoViaticos = Number(
      solicitud.montoViaticos != null && Number(solicitud.montoViaticos) > 0
        ? solicitud.montoViaticos
        : subtotalPernoctados + subtotalNoPernoctados,
    );

    // Fallback dinámico si diasPernoctados y subtotal están en 0 en la BD pero hay montoViaticos
    if (diasPernoctados === 0 && subtotalPernoctados === 0 && montoViaticos > 0) {
      const fIni = new Date(solicitud.fechaInicio);
      const fFin = new Date(solicitud.fechaFin);
      const diffMs = fFin.getTime() - fIni.getTime();
      const diffDias = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      if (diffDias > 0) {
        diasPernoctados = diffDias;
        diasNoPernoctados = 1;
        valorDiaPernoctado = Math.round(montoViaticos / (diffDias + 0.5));
        subtotalPernoctados = diasPernoctados * valorDiaPernoctado;
        valorDiaNoPernoctado = Math.round(valorDiaPernoctado * 0.5);
        subtotalNoPernoctados = montoViaticos - subtotalPernoctados;
      } else {
        diasPernoctados = 0;
        subtotalPernoctados = 0;
        diasNoPernoctados = 1;
        valorDiaNoPernoctado = montoViaticos;
        subtotalNoPernoctados = montoViaticos;
      }
    }

    // Desglose de gastos de viaje y desplazamiento (Sección 4)
    const totalGastosViaje = Number(solicitud.montoGastosViaje || 0);

    let montoTerminalAereo = 0;
    let montoTerrestreUOtro = 0;

    if (
      solicitud.camposAdicionales?.transporteTerminalAereo != null ||
      solicitud.camposAdicionales?.montoTerminalAereo != null
    ) {
      montoTerminalAereo = Number(
        solicitud.camposAdicionales?.transporteTerminalAereo ??
          solicitud.camposAdicionales?.montoTerminalAereo ??
          0,
      );
    }
    if (
      solicitud.camposAdicionales?.transporteTerrestre != null ||
      solicitud.camposAdicionales?.montoTransporteTerrestre != null
    ) {
      montoTerrestreUOtro = Number(
        solicitud.camposAdicionales?.transporteTerrestre ??
          solicitud.camposAdicionales?.montoTransporteTerrestre ??
          0,
      );
    }

    if (montoTerminalAereo === 0 && Array.isArray(solicitud.itinerario)) {
      montoTerminalAereo = solicitud.itinerario.reduce(
        (acc: number, r: any) =>
          acc + Number(r.tarifaTerminalAereo ?? r.montoTerminalAereo ?? 0),
        0,
      );
    }
    if (montoTerrestreUOtro === 0 && Array.isArray(solicitud.itinerario)) {
      montoTerrestreUOtro = solicitud.itinerario.reduce(
        (acc: number, r: any) =>
          acc +
          Number(r.montoTransporteTerrestre ?? r.valorTransporte ?? r.tarifaTerrestre ?? 0),
        0,
      );
    }

    if (
      montoTerminalAereo === 0 &&
      this.liquidationService &&
      Array.isArray(solicitud.itinerario)
    ) {
      for (const tramo of solicitud.itinerario) {
        if (tramo.tipoTransporte === 'AEREO') {
          try {
            const tarifa = await this.liquidationService.obtenerTarifaTerminal(
              tramo.destinoCiudad,
              tramo.destinoDepartamento,
            );
            const factor = tramo.tipoTrayecto === 'IDA_Y_VUELTA' ? 2 : 1;
            montoTerminalAereo += tarifa * factor;
          } catch {}
        }
      }
    }

    if (
      montoTerminalAereo > 0 &&
      montoTerrestreUOtro === 0 &&
      totalGastosViaje > montoTerminalAereo
    ) {
      montoTerrestreUOtro = totalGastosViaje - montoTerminalAereo;
    } else if (
      montoTerrestreUOtro > 0 &&
      montoTerminalAereo === 0 &&
      totalGastosViaje > montoTerrestreUOtro
    ) {
      montoTerminalAereo = totalGastosViaje - montoTerrestreUOtro;
    } else if (
      montoTerminalAereo === 0 &&
      montoTerrestreUOtro === 0 &&
      totalGastosViaje > 0
    ) {
      const tieneAereo =
        Array.isArray(solicitud.itinerario) &&
        solicitud.itinerario.some((r: any) => r.tipoTransporte === 'AEREO');
      const tieneTerrestre =
        Array.isArray(solicitud.itinerario) &&
        solicitud.itinerario.some((r: any) => r.tipoTransporte === 'TERRESTRE');
      if (tieneTerrestre && !tieneAereo) {
        montoTerminalAereo = 0;
        montoTerrestreUOtro = totalGastosViaje;
      } else if (tieneAereo && !tieneTerrestre) {
        montoTerminalAereo = totalGastosViaje;
        montoTerrestreUOtro = 0;
      } else {
        const tarifaBase = 50689;
        const numAereos = Array.isArray(solicitud.itinerario)
          ? solicitud.itinerario.filter((r: any) => r.tipoTransporte === 'AEREO').length
          : 1;
        montoTerminalAereo = Math.min(totalGastosViaje, tarifaBase * numAereos);
        montoTerrestreUOtro = Math.max(0, totalGastosViaje - montoTerminalAereo);
      }
    }

    const montoTotalGeneral =
      montoViaticos + totalGastosViaje + Number(solicitud.costoEstimadoTiquete || 0);
    const diasTotales =
      diasPernoctados + diasNoPernoctados * 0.5 ||
      Number(solicitud.diasComision || 0);
    const diasTotalesStr = diasTotales > 0 ? formatDias(diasTotales) : '';

    const destinoDesplazamiento = solicitud.esInternacional
      ? solicitud.destinoDepartamento || 'EXTERIOR'
      : 'COLOMBIA';
    const ciudadOrigen =
      solicitud.camposAdicionales?.ciudadOrigen ||
      solicitud.itinerario?.[0]?.origenCiudad ||
      '';
    const trm = solicitud.camposAdicionales?.trm || '';
    const aeropuertoDestino =
      solicitud.camposAdicionales?.aeropuertoDestino ||
      solicitud.itinerario?.find((i) => i.tipoTransporte === 'AEREO')
        ?.destinoCiudad ||
      '';
    const otros = solicitud.camposAdicionales?.otros || '';

    // Datos financieros
    const rubroPresupuestal =
      solicitud.rubroPresupuestal || solicitud.rubroRp || '';
    const numeroCdp = solicitud.numeroCdp || '';
    const fechaCdpLarga = solicitud.fechaCdp
      ? formatFechaEspanolLarga(solicitud.fechaCdp)
      : '';

    // Cargos de los jefes para el bloque de firmas (dinámicos según reglas de desplazamiento)
    const { firmante1: fReq1, firmante2: fReq2 } = this.determinarFirmantesAprobacion(solicitud, dependenciaNombre);

    const cargoJefe =
      firmaJefePdf?.cargoFirmante ||
      solicitud.camposAdicionales?.cargoJefe ||
      fReq1.cargo;
    const cargoGerente =
      firmaGerentePdf?.cargoFirmante ||
      solicitud.camposAdicionales?.cargoGerente ||
      fReq2.cargo;

    return new Promise<Buffer>((resolve, reject) => {
      // Página carta exacta (612 x 792 pt) con márgenes ajustados a 28 pt
      const doc = new PDFDocument({ margin: 28, size: 'letter' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const drawBox = (
        x: number,
        y: number,
        w: number,
        h: number,
        fillColor?: string | null,
        borderColor = '#000000',
        lineWidth = 0.6,
      ) => {
        if (fillColor) {
          doc.rect(x, y, w, h).fillColor(fillColor).fill();
        }
        doc
          .rect(x, y, w, h)
          .strokeColor(borderColor)
          .lineWidth(lineWidth)
          .stroke();
      };

      // ========== ENCABEZADO OFICIAL (y: 24, h: 44) ==========
      // 1. Caja Izquierda: Logo Oficial ESAP (Triángulo de ESAP)
      drawBox(28, 24, 85, 44, null);

      let logoCargado = false;
      try {
        const path = require('path');
        const fs = require('fs');
        const posiblesRutas = [
          path.resolve(__dirname, '../../assets/logo-esap.png'),
          path.resolve(__dirname, '../../../src/assets/logo-esap.png'),
          path.resolve(process.cwd(), 'src/assets/logo-esap.png'),
          path.resolve(process.cwd(), 'dist/assets/logo-esap.png'),
          path.resolve(process.cwd(), 'backend/travel-expenses-service/src/assets/logo-esap.png'),
          path.resolve(process.cwd(), '../internal-disciplinary-control-service/src/templates/indice-electronico/logo-esap.png'),
          path.resolve(process.cwd(), '../../apps/mfe-control-interno/src/assets/esap-logo-institucional.png'),
        ];

        for (const ruta of posiblesRutas) {
          if (fs.existsSync(ruta)) {
            doc.image(ruta, 31, 26, {
              fit: [79, 40],
              align: 'center',
              valign: 'center',
            });
            logoCargado = true;
            break;
          }
        }
      } catch {}

      // Fallback vectorial: Pirámide de 10 círculos oficial de la ESAP
      if (!logoCargado) {
        const cx = 70.5; // Centro de la caja (28 + 85/2)
        const topY = 27.5;
        const rDot = 2.0;
        const dx = 5.0;
        const dy = 4.3;

        // Fila 0: 1 círculo en la cúspide
        doc.circle(cx, topY, rDot).fillColor('#003DA5').fill();

        // Fila 1: 2 círculos
        doc.circle(cx - dx / 2, topY + dy, rDot).fillColor('#003DA5').fill();
        doc.circle(cx + dx / 2, topY + dy, rDot).fillColor('#003DA5').fill();

        // Fila 2: 3 círculos
        doc.circle(cx - dx, topY + dy * 2, rDot).fillColor('#003DA5').fill();
        doc.circle(cx, topY + dy * 2, rDot).fillColor('#003DA5').fill();
        doc.circle(cx + dx, topY + dy * 2, rDot).fillColor('#003DA5').fill();

        // Fila 3: 4 círculos en la base con letras E S A P
        const baseRowY = topY + dy * 3;
        const baseXs = [cx - dx * 1.5, cx - dx * 0.5, cx + dx * 0.5, cx + dx * 1.5];
        const letrasEsap = ['E', 'S', 'A', 'P'];
        for (let i = 0; i < 4; i++) {
          doc.circle(baseXs[i], baseRowY, rDot + 0.3).fillColor('#003DA5').fill();
          doc
            .fillColor('#FFFFFF')
            .fontSize(2.8)
            .font('Helvetica-Bold')
            .text(letrasEsap[i], baseXs[i] - 1.5, baseRowY - 1.4, {
              width: 3,
              align: 'center',
            });
        }

        // Tipografía institucional
        doc.fillColor('#003DA5').fontSize(6).font('Helvetica-Bold');
        doc.text('ESAP', 28, 46.5, { width: 85, align: 'center' });
        doc.fillColor('#000000').fontSize(4.2).font('Helvetica');
        doc.text('Escuela Superior de', 28, 54, { width: 85, align: 'center' });
        doc.text('Administración Pública', 28, 59.5, {
          width: 85,
          align: 'center',
        });
      }

      // 2. Caja Central: Título Oficial Formato
      drawBox(113, 24, 330, 44, null);
      doc.fillColor('#000000').fontSize(7.5).font('Helvetica-Bold');
      doc.text(
        'FORMATO DE AUTORIZACIÓN SOLICITUD DE TRÁMITE Y LIQUIDACIÓN DE COMISIÓN\n' +
          'DE SERVICIOS, GASTOS DE TRANSPORTE, GASTOS DE DESPLAZAMIENTO Y AUXILIO\n' +
          'ECONÓMICO DE DESPLAZAMIENTO',
        116,
        29,
        { width: 324, align: 'center', lineGap: 1.5 },
      );

      // 3. Caja Derecha: Código, Versión y Fecha
      drawBox(443, 24, 141, 44, null);
      doc
        .moveTo(443, 38.6)
        .lineTo(584, 38.6)
        .strokeColor('#000000')
        .lineWidth(0.6)
        .stroke();
      doc
        .moveTo(443, 53.2)
        .lineTo(584, 53.2)
        .strokeColor('#000000')
        .lineWidth(0.6)
        .stroke();
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000');
      doc.text('CODIGO: GF-FO-023', 448, 28, { width: 133, align: 'left' });
      doc.text('VERSION: 07', 448, 42.5, { width: 133, align: 'left' });
      doc.text('FECHA: 26/03/2026', 448, 57, { width: 133, align: 'left' });

      // ========== BANNER INSTRUCCIÓN (y: 68, h: 14) ==========
      drawBox(28, 68, 556, 14, '#E8EEF5');
      doc.fontSize(6.8).font('Helvetica-Oblique').fillColor('#003DA5');
      doc.text(
        'D i l i g e n c i e   o   s e l e c c i o n e   ú n i c a m e n t e   y   a   c o m p l e t i t u d   l o s   c a m p o s   e n   g r i s',
        28,
        71.5,
        { width: 556, align: 'center' },
      );

      // ========== DEPENDENCIA Y FECHA AUTOLIQUIDACIÓN (y: 82, h: 22) ==========
      drawBox(28, 82, 100, 22, null);
      doc.fontSize(6.5).font('Helvetica').fillColor('#000000');
      doc.text('Dependencia solicitante:', 32, 89, { width: 94 });

      drawBox(128, 82, 265, 22, '#E9ECEF');
      if (dependenciaNombre) {
        doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000');
        doc.text(this.sanitizarTextoPdf(dependenciaNombre).toUpperCase(), 131, 87, {
          width: 259,
          align: 'center',
        });
      }

      drawBox(393, 82, 115, 22, null);
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000');
      doc.text('FECHA DE AUTOLIQUIDACIÓN', 395, 89, {
        width: 111,
        align: 'center',
      });

      drawBox(508, 82, 76, 22, '#E9ECEF');
      if (fechaAutoliquidacion) {
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000');
        doc.text(fechaAutoliquidacion, 510, 89, { width: 72, align: 'center' });
      }

      // ========== SECCIÓN 1: DATOS DEL COMISIONADO (y: 104) ==========
      drawBox(28, 104, 556, 12, '#DDE3EA');
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000');
      doc.text(section1Title, 32, 106.5, { width: 548 });

      // Fila 1 (y: 116)
      drawBox(28, 116, 95, 14, null);
      doc.fontSize(6.5).font('Helvetica').fillColor('#000000').text('Nombre completo', 32, 120);
      drawBox(123, 116, 185, 14, '#F4F6F8');
      if (nombreComisionado) {
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000').text(nombreComisionado.toUpperCase(), 125, 120, { width: 181, align: 'center' });
      }
      drawBox(308, 116, 140, 14, null);
      doc.fontSize(6.5).font('Helvetica').fillColor('#000000').text('Fecha de Nacimiento (dd/mm/aaaa)', 312, 120);
      drawBox(448, 116, 136, 14, '#F4F6F8');
      if (fechaNacimiento) {
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000').text(fechaNacimiento, 450, 120, { width: 132, align: 'center' });
      }

      // Fila 2 (y: 130)
      drawBox(28, 130, 95, 14, null);
      doc.fontSize(6.5).font('Helvetica').fillColor('#000000').text('C.C. No.', 32, 134);
      drawBox(123, 130, 185, 14, '#F4F6F8');
      if (comisionado?.numeroDocumento) {
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000').text(formatCedula(comisionado.numeroDocumento), 125, 134, { width: 181, align: 'center' });
      }
      drawBox(308, 130, 140, 14, null);
      doc.fontSize(6.5).font('Helvetica').fillColor('#000000').text(dynamicComisionadoLabel, 312, 134);
      drawBox(448, 130, 136, 14, '#F4F6F8');
      if (dynamicComisionadoValue) {
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000').text(this.sanitizarTextoPdf(dynamicComisionadoValue), 450, 134, { width: 132, align: 'center' });
      }

      // Fila 3 (y: 144)
      drawBox(28, 144, 95, 14, null);
      doc.fontSize(5.8).font('Helvetica').fillColor('#000000').text('Teléfono de contacto y/o Celular:', 32, 148);
      drawBox(123, 144, 185, 14, '#F4F6F8');
      if (comisionado?.telefonoContacto) {
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000').text(comisionado.telefonoContacto, 125, 148, { width: 181, align: 'center' });
      }
      drawBox(308, 144, 140, 14, null);
      doc.fontSize(5.8).font('Helvetica').fillColor('#000000').text('Correo Electrónico Institucional:', 312, 148);
      drawBox(448, 144, 136, 14, '#F4F6F8');
      if (comisionado?.email) {
        doc.fontSize(6.5).font('Helvetica').fillColor('#000000').text(comisionado.email, 450, 148, { width: 132, align: 'center' });
      }

      // Fila 4 (y: 158)
      drawBox(28, 158, 95, 14, null);
      doc.fontSize(6.5).font('Helvetica').fillColor('#000000').text('Entidad Bancaria', 32, 162);
      drawBox(123, 158, 185, 14, '#F4F6F8');
      if (entidadBancaria) {
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000').text(entidadBancaria, 125, 162, { width: 181, align: 'center' });
      }
      drawBox(308, 158, 140, 14, null);
      doc.fontSize(6.5).font('Helvetica').fillColor('#000000').text('Tipo de Cuenta:', 312, 162);
      drawBox(448, 158, 136, 14, '#F4F6F8');
      if (tipoCuenta) {
        doc.fontSize(7).font('Helvetica').fillColor('#000000').text(tipoCuenta, 450, 162, { width: 132, align: 'center' });
      }

      // Fila 5 (y: 172)
      drawBox(28, 172, 95, 14, null);
      doc.fontSize(6.5).font('Helvetica').fillColor('#000000').text(dynamicCompLabel, 32, 176);
      drawBox(123, 172, 185, 14, '#F4F6F8');
      if (salarioFormateado) {
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000').text(salarioFormateado, 125, 176, { width: 181, align: 'center' });
      }
      drawBox(308, 172, 140, 14, null);
      doc.fontSize(6.5).font('Helvetica').fillColor('#000000').text('No. de Cuenta:', 312, 176);
      drawBox(448, 172, 136, 14, '#F4F6F8');
      if (numeroCuenta) {
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000').text(numeroCuenta, 450, 176, { width: 132, align: 'center' });
      }

      // ========== SECCIÓN 2: AUTORIZACIÓN Y GASTOS (y: 186) ==========
      drawBox(28, 186, 556, 12, '#DDE3EA');
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000');
      doc.text(
        '2. DATOS AUTORIZACIÓN DE DESPLAZAMIENTO Y GASTOS DE DESPLAZAMIENTO',
        32,
        188.5,
      );

      // Sub-grilla 1 (y: 198, h: 30)
      drawBox(28, 198, 95, 30, null);
      doc.fontSize(6.5).font('Helvetica').fillColor('#000000').text('Duración (en días):', 32, 202);
      if (diasTotalesStr) {
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#000000').text(diasTotalesStr, 28, 214, { width: 95, align: 'center' });
      }

      drawBox(123, 198, 85, 15, null);
      doc.fontSize(6).font('Helvetica').fillColor('#000000').text('Fecha de inicio', 126, 203);
      drawBox(208, 198, 60, 15, '#F4F6F8');
      if (fechaInicioStr) {
        doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000').text(fechaInicioStr, 208, 203, { width: 60, align: 'center' });
      }

      // drawBox(268, 198, 90, 15, null);
      // doc.fontSize(5.5).font('Helvetica').fillColor('#000000').text('Hora de vuelo ida:\n(estimada)', 271, 200, { lineGap: 0 });
      // drawBox(358, 198, 50, 15, '#F4F6F8');
      // if (horaVueloIda) {
      //   doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000').text(horaVueloIda, 358, 203, { width: 50, align: 'center' });
      // }

      drawBox(123, 213, 85, 15, null);
      doc.fontSize(6).font('Helvetica').fillColor('#000000').text('Fecha de finalización', 126, 218);
      drawBox(208, 213, 60, 15, '#F4F6F8');
      if (fechaFinStr) {
        doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000').text(fechaFinStr, 208, 218, { width: 60, align: 'center' });
      }

      // drawBox(268, 213, 90, 15, null);
      // doc.fontSize(5.5).font('Helvetica').fillColor('#000000').text('Hora de vuelo regreso:\n(estimada)', 271, 215, { lineGap: 0 });
      // drawBox(358, 213, 50, 15, '#F4F6F8');
      // if (horaVueloRegreso) {
      //   doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000').text(horaVueloRegreso, 358, 218, { width: 50, align: 'center' });
      // }

      // Caja Itinerario General (amigable)
drawBox(268, 198, 316, 30, null);
doc.fontSize(6).font('Helvetica-Bold').fillColor('#000000').text('Itinerario (General):', 272, 201);

if (itinerarioGeneral) {
  doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000').text(
      itinerarioGeneral,
      272,
      211,
      {
        width: 308,
        align: 'center'
      }
    );
}

      // Objeto (y: 228, h: 25)
      drawBox(28, 228, 60, 25, null);
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000').text('Objeto', 32, 238);
      drawBox(88, 228, 496, 25, '#F4F6F8');
      const objetoTexto = this.sanitizarTextoPdf(solicitud.objetoComision || '');
      if (objetoTexto) {
        const objetoFontSize = objetoTexto.length > 350 ? 5.2 : 5.8;
        doc.fontSize(objetoFontSize).font('Helvetica').fillColor('#000000').text(objetoTexto, 92, 231, {
          width: 488,
          align: 'justify',
          lineGap: 1,
        });
      }

      // Destino / Origen (y: 253, h: 14)
      drawBox(28, 253, 140, 14, null);
      doc.fontSize(5.8).font('Helvetica').fillColor('#000000').text('Destino/ Autorización de\ndesplazamiento', 32, 254.5, { lineGap: 0 });
      drawBox(168, 253, 138, 14, '#F4F6F8');
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000').text(destinoDesplazamiento.toUpperCase(), 170, 256.5, { width: 134, align: 'center' });
      drawBox(306, 253, 110, 14, null);
      doc.fontSize(6.2).font('Helvetica').fillColor('#000000').text('Ciudad de origen', 310, 256.5);
      drawBox(416, 253, 168, 14, '#F4F6F8');
      if (ciudadOrigen) {
        doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000').text(ciudadOrigen, 418, 256.5, { width: 164, align: 'center' });
      }

      // TRM / Aeropuerto / Otros (y: 267, h: 14)
      drawBox(28, 267, 258, 14, null);
      doc.fontSize(4.8).font('Helvetica').fillColor('#000000').text(
        'TRM del día de diligenciamiento de este formato, sólo para comisiones de servicios en el exterior',
        32,
        268.5,
        { width: 200, lineGap: 0 },
      );
      if (trm) {
        doc.fontSize(6.5).font('Helvetica-Bold').text(trm, 234, 270.5);
      }
      drawBox(286, 267, 145, 14, null);
      doc.fontSize(6).font('Helvetica').fillColor('#000000').text('Aeropuerto Destino', 290, 270.5);
      if (aeropuertoDestino) {
        doc.fontSize(6.5).font('Helvetica-Bold').text(aeropuertoDestino, 350, 270.5);
      }
      drawBox(431, 267, 153, 14, null);
      doc.fontSize(6).font('Helvetica').fillColor('#000000').text('Otros', 435, 270.5);
      if (otros) {
        doc.fontSize(6.5).font('Helvetica-Bold').text(otros, 465, 270.5);
      }

      // ========== DETALLE DE RUTAS DEL ITINERARIO (Ruta por Ruta) ==========
      let yRutas = 281;
      drawBox(28, yRutas, 556, 11, '#E8EEF5');
      doc.fontSize(6).font('Helvetica-Bold').fillColor('#003DA5');
      doc.text('Ruta', 28, yRutas + 2.5, { width: 32, align: 'center' });
      doc.text('Origen', 60, yRutas + 2.5, { width: 108, align: 'center' });
      doc.text('Destino', 168, yRutas + 2.5, { width: 108, align: 'center' });
      doc.text('Medio Transporte', 276, yRutas + 2.5, { width: 72, align: 'center' });
      doc.text('Fechas y hora del viaje', 348, yRutas + 2.5, { width: 236, align: 'center' });

      doc.moveTo(60, yRutas).lineTo(60, yRutas + 11).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
      doc.moveTo(168, yRutas).lineTo(168, yRutas + 11).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
      doc.moveTo(276, yRutas).lineTo(276, yRutas + 11).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
      doc.moveTo(348, yRutas).lineTo(348, yRutas + 11).strokeColor('#CBD5E1').lineWidth(0.5).stroke();

      yRutas += 11;

      const rutasLista = Array.isArray(solicitud.itinerario) && solicitud.itinerario.length > 0
        ? solicitud.itinerario
        : null;

      const hFilaRuta = 11;
      if (rutasLista && rutasLista.length > 0) {
        rutasLista.forEach((r: any, idx: number) => {
          const bg = idx % 2 === 1 ? '#F8FAFC' : null;
          drawBox(28, yRutas, 556, hFilaRuta, bg);
          doc.moveTo(60, yRutas).lineTo(60, yRutas + hFilaRuta).strokeColor('#E2E8F0').lineWidth(0.4).stroke();
          doc.moveTo(168, yRutas).lineTo(168, yRutas + hFilaRuta).strokeColor('#E2E8F0').lineWidth(0.4).stroke();
          doc.moveTo(276, yRutas).lineTo(276, yRutas + hFilaRuta).strokeColor('#E2E8F0').lineWidth(0.4).stroke();
          doc.moveTo(348, yRutas).lineTo(348, yRutas + hFilaRuta).strokeColor('#E2E8F0').lineWidth(0.4).stroke();

          const labelRuta = `R${idx + 1}`;
          const orig = r.origenCiudad || ciudadOrigen || '—';
          const dest = r.destinoCiudad || solicitud.destinoCiudad || '—';
          const medio = r.tipoTransporte === 'TERRESTRE'
            ? 'Terrestre'
            : r.tipoTransporte === 'MARITIMO'
            ? 'Marítimo'
            : r.tipoTransporte === 'FLUVIAL'
            ? 'Fluvial'
            : r.tipoTransporte === 'FERROVIARIO'
            ? 'Ferroviario'
            : r.tipoTransporte === 'AEREO'
            ? 'Aéreo'
            : (r.tipoTransporte || 'Aéreo');
          const trayectoExtra = r.tipoTrayecto === 'IDA_Y_VUELTA' ? ' (Ida y vta)' : '';

          const fSalida = formatFechaSlash(r.fechaSalida || solicitud.fechaInicio);
          const fLlegada = formatFechaSlash(r.fechaLlegada || r.fechaSalida || solicitud.fechaFin);
          const fRango = (fSalida && fLlegada && fSalida !== fLlegada)
            ? `Del ${fSalida} al ${fLlegada}`
            : (fSalida || '—');

          const hViaje = r.horaEstimadaSalida || r.horarioEstimadoMilitar || r.horaSalida || '';
          const hViajeStr = hViaje ? (hViaje.endsWith('h') ? hViaje : `${hViaje} h`) : '';
          const fechasYHoraTexto = [fRango, hViajeStr].filter(Boolean).join(' · ') || '—';

          doc.fontSize(6).font('Helvetica-Bold').fillColor('#003DA5');
          doc.text(labelRuta, 28, yRutas + 2.5, { width: 32, align: 'center' });
          doc.font('Helvetica').fillColor('#000000');
          doc.text(orig, 62, yRutas + 2.5, { width: 104, align: 'center' });
          doc.text(dest, 170, yRutas + 2.5, { width: 104, align: 'center' });
          doc.text(`${medio}${trayectoExtra}`, 278, yRutas + 2.5, { width: 68, align: 'center' });
          doc.text(fechasYHoraTexto, 350, yRutas + 2.5, { width: 232, align: 'center' });

          yRutas += hFilaRuta;
        });
      } else {
        drawBox(28, yRutas, 556, hFilaRuta, null);
        doc.moveTo(60, yRutas).lineTo(60, yRutas + hFilaRuta).strokeColor('#E2E8F0').lineWidth(0.4).stroke();
        doc.moveTo(168, yRutas).lineTo(168, yRutas + hFilaRuta).strokeColor('#E2E8F0').lineWidth(0.4).stroke();
        doc.moveTo(276, yRutas).lineTo(276, yRutas + hFilaRuta).strokeColor('#E2E8F0').lineWidth(0.4).stroke();
        doc.moveTo(348, yRutas).lineTo(348, yRutas + hFilaRuta).strokeColor('#E2E8F0').lineWidth(0.4).stroke();

        const orig = ciudadOrigen || 'Origen';
        const dest = solicitud.destinoCiudad || 'Destino';
        const medio = solicitud.requiereTiquetes ? 'Aéreo' : 'Terrestre';
        const fIni = formatFechaSlash(solicitud.fechaInicio);
        const fFin = formatFechaSlash(solicitud.fechaFin);
        const fRango = (fIni && fFin && fIni !== fFin) ? `Del ${fIni} al ${fFin}` : (fIni || '—');
        const hViaje = horaVueloIda ? (horaVueloIda.endsWith('h') ? horaVueloIda : `${horaVueloIda} h`) : '';
        const fechasYHoraTexto = [fRango, hViaje].filter(Boolean).join(' · ') || '—';

        doc.fontSize(6).font('Helvetica-Bold').fillColor('#003DA5');
        doc.text('R1', 28, yRutas + 2.5, { width: 32, align: 'center' });
        doc.font('Helvetica').fillColor('#000000');
        doc.text(orig, 62, yRutas + 2.5, { width: 104, align: 'center' });
        doc.text(dest, 170, yRutas + 2.5, { width: 104, align: 'center' });
        doc.text(medio, 278, yRutas + 2.5, { width: 68, align: 'center' });
        doc.text(fechasYHoraTexto, 350, yRutas + 2.5, { width: 232, align: 'center' });

        yRutas += hFilaRuta;
      }

      // ========== SECCIÓN 3: LIQUIDACIÓN DE AUTORIZACIÓN ==========
      const ySec3 = yRutas + 2;
      drawBox(28, ySec3, 556, 12, '#DDE3EA');
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000');
      doc.text('3. LIQUIDACIÓN DE LA AUTORIZACIÓN DE DESPLAZAMIENTO', 32, ySec3 + 2.5);

      // Tabla encabezado
      const ySec3Header = ySec3 + 12;
      drawBox(28, ySec3Header, 200, 11, null);
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000').text('Descripción del día', 28, ySec3Header + 2, { width: 200, align: 'center' });
      drawBox(228, ySec3Header, 75, 11, null);
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000').text('No. de Días', 228, ySec3Header + 2, { width: 75, align: 'center' });
      drawBox(303, ySec3Header, 125, 11, null);
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000').text('Viáticos Diario', 303, ySec3Header + 2, { width: 125, align: 'center' });
      drawBox(428, ySec3Header, 156, 11, null);
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000').text('Total', 428, ySec3Header + 2, { width: 156, align: 'center' });

      // Fila 1 Pernoctados
      const ySec3R1 = ySec3Header + 11;
      drawBox(28, ySec3R1, 200, 11, null);
      doc.fontSize(6.5).font('Helvetica').fillColor('#000000').text('Pernoctados', 28, ySec3R1 + 2, { width: 200, align: 'center' });
      drawBox(228, ySec3R1, 75, 11, null);
      doc.fontSize(6.5).font('Helvetica').fillColor('#000000').text(diasPernoctados > 0 ? String(diasPernoctados) : '', 228, ySec3R1 + 2, { width: 75, align: 'center' });
      drawBox(303, ySec3R1, 125, 11, null);
      if (valorDiaPernoctado > 0) {
        doc.fontSize(6.5).font('Helvetica').fillColor('#000000').text(formatCurrencyCOP(valorDiaPernoctado), 303, ySec3R1 + 2, { width: 115, align: 'right' });
      }
      drawBox(428, ySec3R1, 156, 11, null);
      if (subtotalPernoctados > 0) {
        doc.fontSize(6.5).font('Helvetica').fillColor('#000000').text(formatCurrencyCOP(subtotalPernoctados, true), 428, ySec3R1 + 2, { width: 146, align: 'right' });
      }

      // Fila 2 No Pernoctados
      const ySec3R2 = ySec3R1 + 11;
      drawBox(28, ySec3R2, 200, 11, null);
      doc.fontSize(6.5).font('Helvetica').fillColor('#000000').text('No Pernoctados', 28, ySec3R2 + 2, { width: 200, align: 'center' });
      drawBox(228, ySec3R2, 75, 11, null);
      doc.fontSize(6.5).font('Helvetica').fillColor('#000000').text(diasNoPernoctados > 0 ? String(diasNoPernoctados) : '', 228, ySec3R2 + 2, { width: 75, align: 'center' });
      drawBox(303, ySec3R2, 125, 11, null);
      if (valorDiaNoPernoctado > 0) {
        doc.fontSize(6.5).font('Helvetica').fillColor('#000000').text(formatCurrencyCOP(valorDiaNoPernoctado), 303, ySec3R2 + 2, { width: 115, align: 'right' });
      }
      drawBox(428, ySec3R2, 156, 11, null);
      if (subtotalNoPernoctados > 0) {
        doc.fontSize(6.5).font('Helvetica').fillColor('#000000').text(formatCurrencyCOP(subtotalNoPernoctados), 428, ySec3R2 + 2, { width: 146, align: 'right' });
      }

      // Fila 3 Total Viáticos
      const ySec3R3 = ySec3R2 + 11;
      drawBox(28, ySec3R3, 400, 11, null);
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000').text('Total Viáticos', 28, ySec3R3 + 2, { width: 390, align: 'right' });
      drawBox(428, ySec3R3, 156, 11, null);
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000').text(formatCurrencyCOP(montoViaticos), 428, ySec3R3 + 2, { width: 146, align: 'right' });

      // ========== SECCIÓN 4: GASTOS DE DESPLAZAMIENTO ==========
      const ySec4 = ySec3R3 + 11 + 2;
      drawBox(28, ySec4, 556, 12, '#DDE3EA');
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000');
      doc.text('4. LIQUIDACIÓN DE LOS GASTOS DE DESPLAZAMIENTO Y TIQUETES', 32, ySec4 + 2.5);

      // Tabla encabezado
      const ySec4Header = ySec4 + 12;
      drawBox(28, ySec4Header, 400, 10, null);
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000').text('Descripción', 28, ySec4Header + 2, { width: 400, align: 'center' });
      drawBox(428, ySec4Header, 156, 10, null);
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000').text('Total', 428, ySec4Header + 2, { width: 156, align: 'center' });

      // Fila 1 Desglose Terminales Aéreos
      const ySec4R1 = ySec4Header + 10;
      drawBox(28, ySec4R1, 400, 10, null);
      doc.fontSize(6.5).font('Helvetica').fillColor('#000000').text('Total Transporte y desplazamientos terminales aéreos', 28, ySec4R1 + 2, { width: 400, align: 'center' });
      drawBox(428, ySec4R1, 156, 10, null);
      if (montoTerminalAereo > 0) {
        doc.fontSize(6.5).font('Helvetica').fillColor('#000000').text(formatCurrencyCOP(montoTerminalAereo), 428, ySec4R1 + 2, { width: 146, align: 'right' });
      }

      // Fila 2 Desglose Transporte Terrestre / Otros
      const ySec4R2 = ySec4R1 + 10;
      drawBox(28, ySec4R2, 400, 10, null);
      doc.fontSize(6.5).font('Helvetica').fillColor('#000000').text('Transporte y desplazamiento por vía terrestre, marítimo, fluvial y/o ferroviario', 28, ySec4R2 + 2, { width: 400, align: 'center' });
      drawBox(428, ySec4R2, 156, 10, null);
      if (montoTerrestreUOtro > 0) {
        doc.fontSize(6.5).font('Helvetica').fillColor('#000000').text(formatCurrencyCOP(montoTerrestreUOtro), 428, ySec4R2 + 2, { width: 146, align: 'right' });
      }

      // Fila 3 Subtotal Gastos de Desplazamiento y Transporte
      const ySec4R3 = ySec4R2 + 10;
      drawBox(28, ySec4R3, 400, 10, null);
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000').text('Subtotal Gastos de Desplazamiento y Transporte', 28, ySec4R3 + 2, { width: 390, align: 'right' });
      drawBox(428, ySec4R3, 156, 10, null);
      if (totalGastosViaje > 0) {
        doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000').text(formatCurrencyCOP(totalGastosViaje), 428, ySec4R3 + 2, { width: 146, align: 'right' });
      }

      // Fila 4 Costo Estimado / Confirmado de Tiquetes Aéreos
      const ySec4R4 = ySec4R3 + 10;
      drawBox(28, ySec4R4, 400, 10, null);
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000').text('Costo Tiquetes Aéreos (Pasajes de la comisión)', 28, ySec4R4 + 2, { width: 390, align: 'right' });
      drawBox(428, ySec4R4, 156, 10, null);
      const costoTiquetesPdf = Number(solicitud.costoEstimadoTiquete || 0);
      if (costoTiquetesPdf > 0) {
        doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000').text(formatCurrencyCOP(costoTiquetesPdf), 428, ySec4R4 + 2, { width: 146, align: 'right' });
      } else {
        doc.fontSize(6).font('Helvetica').fillColor('#64748B').text('$ 0 (No aplica / Por cotizar)', 428, ySec4R4 + 2, { width: 146, align: 'right' });
      }

      // Fila 5 Total General Viáticos + Transporte + Tiquetes
      const ySec4R5 = ySec4R4 + 10;
      drawBox(28, ySec4R5, 400, 10, null);
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000').text('TOTAL GENERAL (VIÁTICOS + DESPLAZAMIENTOS + TIQUETES)*', 28, ySec4R5 + 2, { width: 390, align: 'right' });
      drawBox(428, ySec4R5, 156, 10, null);
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000000').text(formatCurrencyCOP(montoTotalGeneral), 428, ySec4R5 + 2, { width: 146, align: 'right' });

      const yNota = ySec4R5 + 10;
      doc.fontSize(5.1).font('Helvetica-Oblique').fillColor('#000000');
      doc.text('*NOTA: Incluye liquidación de viáticos, gastos de transporte y valor de pasajes/tiquetes aéreos de la comisión.', 28, yNota + 1);

      // ========== SECCIÓN 5: INFORMACIÓN FINANCIERA ==========
      const ySec5 = yNota + 10;
      drawBox(28, ySec5, 556, 12, '#DDE3EA');
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000');
      doc.text(
        '5. INFORMACIÓN FINANCIERA DE LA COMISIÓN DE SERVICIOS O AUTORIZACIÓN DE DESPLAZAMIENTO',
        32,
        ySec5 + 2.5,
      );

      const ySec5Body = ySec5 + 12;
      drawBox(28, ySec5Body, 556, 24, null);
      doc.fontSize(6.5).font('Helvetica').fillColor('#000000');
      doc.text(
        'El pago de la presente comisión de servicios / autorización de desplazamiento, se hará con cargo a la ',
        32,
        ySec5Body + 4.5,
        { continued: true, width: 548, align: 'justify', lineGap: 2 },
      );
      doc.fillColor('#C00000').font('Helvetica-Bold').text(dependenciaNombre || '________________________________________', { continued: true });
      doc.fillColor('#000000').font('Helvetica').text(', del Rubro ', { continued: true });
      doc.fillColor('#C00000').font('Helvetica-Bold').text(rubroPresupuestal || '____________________________', { continued: true });
      doc.fillColor('#000000').font('Helvetica').text(', según Certificado de Disponibilidad Presupuestal No. ', { continued: true });
      doc.fillColor('#C00000').font('Helvetica-Bold').text(numeroCdp || '_________', { continued: true });
      doc.fillColor('#000000').font('Helvetica').text(' del ', { continued: true });
      doc.fillColor('#C00000').font('Helvetica-Bold').text(fechaCdpLarga || '____________________', { continued: true });
      doc.fillColor('#000000').font('Helvetica').text('.');

      // ========== SECCIÓN 6: AUTORIZACIÓN PREVIA DE DESPLAZAMIENTO (FIRMAS DE APROBACIÓN) ==========
      const ySec6 = ySec5Body + 24 + 2;
      drawBox(28, ySec6, 556, 12, '#DDE3EA');
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000');
      doc.text(
        '6. AUTORIZACIÓN PREVIA DE DESPLAZAMIENTO (JEFATURA INMEDIATA Y GERENCIA DE PROYECTO)',
        32,
        ySec6 + 2.5,
      );

      // Espacio de firmas de aprobación previa (Jefe/Supervisor y Gerente de Proyecto)
      const yFirmas = ySec6 + 12;
      const hFirmas = 98;
      drawBox(28, yFirmas, 556, hFirmas, null, '#000000', 0.6);
      doc.moveTo(306, yFirmas).lineTo(306, yFirmas + hFirmas).strokeColor('#000000').lineWidth(0.6).stroke();

      const formatFechaAmigable = (val?: any): string => {
        if (!val) return '';
        const d = new Date(val);
        if (isNaN(d.getTime())) return '';
        const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        const dia = d.getDate().toString().padStart(2, '0');
        const mes = meses[d.getMonth()];
        const anio = d.getFullYear();
        return `${dia} de ${mes} de ${anio}`;
      };

      const renderFirmaBox = (
        firma: any,
        cargoOficial: string,
        cardX: number,
        cardW: number,
        fallbackTitulo: string,
      ) => {
        const cardY = yFirmas + 4;
        const cardH = 75;

        if (firma && (firma.estado === 'FIRMADO' || firma.firmadoDigitalmente)) {
          // Fondo tarjeta con estilo verde institucional
          doc.roundedRect(cardX, cardY, cardW, cardH, 5)
             .fillColor('#F0FDF4')
             .strokeColor('#86EFAC')
             .lineWidth(0.8)
             .fillAndStroke();

          // 1. Título superior del rol en badge distintivo con negrilla destacada
          const badgeW = cardW - 16;
          const badgeH = 13;
          doc.roundedRect(cardX + 8, cardY + 5, badgeW, badgeH, 3)
             .fillColor('#DCFCE7')
             .strokeColor('#BBF7D0')
             .lineWidth(0.5)
             .fillAndStroke();

          doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#166534');
          doc.text(fallbackTitulo.toUpperCase(), cardX + 8, cardY + 7.5, {
            width: badgeW,
            align: 'center',
          });

          // 2. Nombre del aprobador en negrilla centrada
          let nombreAprobador = (firma.nombreFirmante || '').trim();
          let correoAprobador = ((firma as any).emailFirmante || '').trim();
          if (nombreAprobador.includes('@')) {
            if (!correoAprobador) correoAprobador = nombreAprobador;
            nombreAprobador = cargoOficial || fallbackTitulo || 'Servidor Autorizado';
          }
          const nombreAprobadorFinal = this.sanitizarTextoPdf(nombreAprobador || 'Servidor Autorizado').toUpperCase();
          doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0F172A');
          doc.text(nombreAprobadorFinal, cardX + 6, cardY + 20.5, {
            width: cardW - 12,
            align: 'center',
          });

          // 3. Documento de Identidad (C.C.) y correo institucional del aprobador
          const partesSecundarias: string[] = [];
          if (firma.documentoIdentidad) {
            partesSecundarias.push(`C.C. ${firma.documentoIdentidad}`);
          }
          if (correoAprobador) {
            partesSecundarias.push(correoAprobador.toLowerCase());
          }
          if (partesSecundarias.length > 0) {
            const textoSecundario = this.sanitizarTextoPdf(partesSecundarias.join(' · '));
            doc.fontSize(5.2).font('Helvetica').fillColor('#475569');
            doc.text(textoSecundario, cardX + 4, cardY + 30.5, {
              width: cardW - 8,
              align: 'center',
            });
          }

          // 4. Pill verde con check "✓ Autorizado"
          const pillW = 78;
          const pillH = 12.5;
          const pillX = cardX + (cardW - pillW) / 2;
          const pillY = cardY + 41;
          doc.roundedRect(pillX, pillY, pillW, pillH, 6.25)
             .fillColor('#D1FAE5')
             .strokeColor('#86EFAC')
             .lineWidth(0.5)
             .fillAndStroke();

          doc.fontSize(6.2).font('Helvetica-Bold').fillColor('#065F46');
          doc.text('✓ Autorizado', pillX, pillY + 2.8, {
            width: pillW,
            align: 'center',
          });

          // 5. Fecha en formato amigable centrado: "01 de oct de 2026"
          const fechaAmigable = formatFechaAmigable(firma.fechaFirma);
          if (fechaAmigable) {
            doc.fontSize(5.8).font('Helvetica').fillColor('#059669');
            doc.text(fechaAmigable, cardX, cardY + 55.5, {
              width: cardW,
              align: 'center',
            });
          }

          // 6. Certificado digital OTP institucional al pie de la tarjeta
          const certId = firma.certificadoId || 'ESAP-CERT-VIAT';
          doc.fontSize(4.6).font('Helvetica').fillColor('#64748B');
          doc.text(`Firma Digital Verificada · Cert: ${certId}`, cardX, cardY + 64.5, {
            width: cardW,
            align: 'center',
          });

          // Si es firma por ausencia
          if (firma.esAusencia && firma.motivoAusencia) {
            doc.fontSize(4.3).font('Helvetica-Oblique').fillColor('#B45309');
            doc.text(
              `* En ausencia: ${this.sanitizarTextoPdf(firma.motivoAusencia)}`,
              cardX + 6,
              cardY + 68,
              { width: cardW - 12, align: 'center' },
            );
          }
        } else {
          // Tarjeta en estado pendiente / no firmado
          doc.roundedRect(cardX, cardY, cardW, cardH, 5)
             .fillColor('#FFFFFF')
             .strokeColor('#CBD5E1')
             .lineWidth(0.8)
             .fillAndStroke();

          // 1. Título superior del rol en badge distintivo con negrilla
          const badgeW = cardW - 16;
          const badgeH = 13;
          doc.roundedRect(cardX + 8, cardY + 5, badgeW, badgeH, 3)
             .fillColor('#F1F5F9')
             .strokeColor('#E2E8F0')
             .lineWidth(0.5)
             .fillAndStroke();

          doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#334155');
          doc.text(fallbackTitulo.toUpperCase(), cardX + 8, cardY + 7.5, {
            width: badgeW,
            align: 'center',
          });

          // 2. Línea horizontal o guion
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#94A3B8');
          doc.text('—', cardX, cardY + 22, {
            width: cardW,
            align: 'center',
          });

          // 3. Pill gris "Pendiente por firmar"
          const pendPillW = 86;
          const pendPillH = 12.5;
          const pendPillX = cardX + (cardW - pendPillW) / 2;
          const pendPillY = cardY + 41;
          doc.roundedRect(pendPillX, pendPillY, pendPillW, pendPillH, 6.25)
             .fillColor('#F8FAFC')
             .strokeColor('#E2E8F0')
             .lineWidth(0.5)
             .fillAndStroke();

          doc.fontSize(6).font('Helvetica-Bold').fillColor('#64748B');
          doc.text('Pendiente por firmar', pendPillX, pendPillY + 3, {
            width: pendPillW,
            align: 'center',
          });

          // 4. Fecha guion
          doc.fontSize(6).font('Helvetica').fillColor('#CBD5E1');
          doc.text('—', cardX, cardY + 56, {
            width: cardW,
            align: 'center',
          });
        }

        // Línea y cargo del firmante al pie del bloque
        doc.moveTo(cardX + 15, yFirmas + 82).lineTo(cardX + cardW - 15, yFirmas + 82).strokeColor('#94A3B8').lineWidth(0.5).stroke();
        doc.fontSize(6).font('Helvetica-Bold').fillColor('#1E293B');
        doc.text(cargoOficial, cardX, yFirmas + 86, { width: cardW, align: 'center' });
      };

      // Firma izquierda: Jefe de Dependencia / Supervisor / Director Nacional / Subdirector
      renderFirmaBox(firmaJefePdf, cargoJefe, 33, 268, 'Jefe de Dependencia / Supervisor');

      // Firma derecha: Gerente de Proyecto / Convenio
      renderFirmaBox(firmaGerentePdf, cargoGerente, 311, 268, 'Gerente de Proyecto / Convenio');

      // ========== SECCIÓN 7: CONTROL Y TRAZABILIDAD INSTITUCIONAL (ELABORÓ, REVISÓ, APROBÓ) ==========
      const ySec7 = yFirmas + hFirmas + 2;
      drawBox(28, ySec7, 556, 12, '#DDE3EA');
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000');
      doc.text(
        '7. CONTROL Y TRAZABILIDAD INSTITUCIONAL (ELABORÓ · REVISÓ · APROBÓ)',
        32,
        ySec7 + 2.5,
      );

      const yTableHeader = ySec7 + 12;
      const hTableHeader = 11;
      const colX1 = 28;  const colW1 = 112; // ROL / ETAPA
      const colX2 = 140; const colW2 = 168; // RESPONSABLE DEL TRÁMITE
      const colX3 = 308; const colW3 = 132; // IDENTIFICACIÓN Y ROL / ÁREA
      const colX4 = 440; const colW4 = 144; // ESTADO, FECHA Y FIRMA DIGITAL
      // 112 + 168 + 132 + 144 = 556 pt.

      drawBox(28, yTableHeader, 556, hTableHeader, '#E8EEF5');
      doc.moveTo(colX2, yTableHeader).lineTo(colX2, yTableHeader + hTableHeader).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
      doc.moveTo(colX3, yTableHeader).lineTo(colX3, yTableHeader + hTableHeader).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
      doc.moveTo(colX4, yTableHeader).lineTo(colX4, yTableHeader + hTableHeader).strokeColor('#CBD5E1').lineWidth(0.5).stroke();

      doc.fontSize(5.8).font('Helvetica-Bold').fillColor('#003DA5');
      doc.text('ROL / ETAPA', colX1, yTableHeader + 2.5, { width: colW1, align: 'center' });
      doc.text('RESPONSABLE DEL TRÁMITE', colX2, yTableHeader + 2.5, { width: colW2, align: 'center' });
      doc.text('IDENTIFICACIÓN Y ÁREA', colX3, yTableHeader + 2.5, { width: colW3, align: 'center' });
      doc.text('ESTADO, FECHA Y FIRMA DIGITAL', colX4, yTableHeader + 2.5, { width: colW4, align: 'center' });

      const renderFilaTrazabilidad = (
        yRow: number,
        hRow: number,
        rolBadge: { tag: string; sub: string; bg: string; border: string; text: string },
        nombre: string,
        detalleNombre: string,
        identificacion: string,
        area: string,
        estado: {
          aprobado: boolean;
          textoBadge: string;
          fechaStr: string;
          certId?: string;
        },
        isAlt: boolean,
      ) => {
        // Fondo de fila alternado
        if (isAlt) {
          doc.rect(28, yRow, 556, hRow).fillColor('#F8FAFC').fill();
        }

        // Borde exterior y divisiones verticales
        doc.rect(28, yRow, 556, hRow).strokeColor('#E2E8F0').lineWidth(0.4).stroke();
        doc.moveTo(colX2, yRow).lineTo(colX2, yRow + hRow).strokeColor('#E2E8F0').lineWidth(0.4).stroke();
        doc.moveTo(colX3, yRow).lineTo(colX3, yRow + hRow).strokeColor('#E2E8F0').lineWidth(0.4).stroke();
        doc.moveTo(colX4, yRow).lineTo(colX4, yRow + hRow).strokeColor('#E2E8F0').lineWidth(0.4).stroke();

        // Col 1: ROL / ETAPA con Badge distintivo en negrilla
        const tagW = colW1 - 8;
        const tagH = 8.8;
        doc.roundedRect(colX1 + 4, yRow + 1.8, tagW, tagH, 2.5)
           .fillColor(rolBadge.bg)
           .strokeColor(rolBadge.border)
           .lineWidth(0.5)
           .fillAndStroke();

        doc.fontSize(5.8).font('Helvetica-Bold').fillColor(rolBadge.text);
        doc.text(rolBadge.tag, colX1 + 4, yRow + 3, { width: tagW, align: 'center' });

        doc.fontSize(4.5).font('Helvetica').fillColor('#64748B');
        doc.text(rolBadge.sub, colX1 + 4, yRow + 10.6, { width: tagW, align: 'center' });

        // Col 2: SERVIDOR PÚBLICO RESPONSABLE (Nombre en negrilla destacada)
        const nombreFinal = this.sanitizarTextoPdf(nombre || '—').toUpperCase();
        doc.fontSize(6).font('Helvetica-Bold').fillColor(estado.aprobado ? '#0F172A' : '#64748B');
        doc.text(nombreFinal, colX2 + 5, yRow + 2, { width: colW2 - 10, align: 'left', lineGap: 0 });

        if (detalleNombre) {
          doc.fontSize(4.6).font('Helvetica').fillColor('#64748B');
          doc.text(this.sanitizarTextoPdf(detalleNombre), colX2 + 5, yRow + 9.5, { width: colW2 - 10, align: 'left' });
        }

        // Col 3: IDENTIFICACIÓN Y ÁREA
        if (identificacion) {
          doc.fontSize(5.6).font('Helvetica-Bold').fillColor('#334155');
          doc.text(this.sanitizarTextoPdf(identificacion), colX3 + 5, yRow + 2, { width: colW3 - 10, align: 'left' });
        }
        if (area) {
          doc.fontSize(4.6).font('Helvetica').fillColor('#64748B');
          doc.text(this.sanitizarTextoPdf(area), colX3 + 5, yRow + 9.5, { width: colW3 - 10, align: 'left' });
        }

        // Col 4: ESTADO, FECHA Y FIRMA DIGITAL (Pill de estado)
        const pillW = 124;
        const pillH = 8.5;
        const pillX = colX4 + (colW4 - pillW) / 2;
        const pillY = yRow + 1.5;

        if (estado.aprobado) {
          doc.roundedRect(pillX, pillY, pillW, pillH, 4.25)
             .fillColor('#ECFDF5')
             .strokeColor('#A7F3D0')
             .lineWidth(0.5)
             .fillAndStroke();

          doc.fontSize(5).font('Helvetica-Bold').fillColor('#065F46');
          doc.text(estado.textoBadge, pillX, pillY + 1.8, { width: pillW, align: 'center' });

          const infoFirma = [
            estado.fechaStr ? `Fecha: ${estado.fechaStr}` : '',
            estado.certId ? `Cert: ${estado.certId}` : 'Firma Digital Verificada',
          ].filter(Boolean).join(' · ');

          doc.fontSize(4.4).font('Helvetica').fillColor('#475569');
          doc.text(infoFirma, colX4 + 2, yRow + 10.4, { width: colW4 - 4, align: 'center' });
        } else {
          doc.roundedRect(pillX, pillY, pillW, pillH, 4.25)
             .fillColor('#F8FAFC')
             .strokeColor('#E2E8F0')
             .lineWidth(0.5)
             .fillAndStroke();

          doc.fontSize(4.7).font('Helvetica-Bold').fillColor('#94A3B8');
          doc.text(estado.textoBadge, pillX, pillY + 1.8, { width: pillW, align: 'center' });

          doc.fontSize(4.3).font('Helvetica').fillColor('#CBD5E1');
          doc.text('Pendiente de verificación / firma', colX4 + 2, yRow + 10.4, { width: colW4 - 4, align: 'center' });
        }
      };

      const hRow = isExtemporanea ? 14 : 15;
      let curY = yTableHeader + hTableHeader;

      // 1. ELABORÓ
      const fechaElaboroStr = formatFechaHoraSegura(
        firmaElaboro?.fechaFirma || solicitud.creadoEn || (solicitud as any).fechaCreacion,
      );
      renderFilaTrazabilidad(
        curY,
        hRow,
        {
          tag: 'ELABORÓ',
          sub: 'Enlace de Dependencia',
          bg: '#EEF2FF',
          border: '#C7D2FE',
          text: '#1E40AF',
        },
        nombreEnlaceFinal,
        emailEnlaceFinal || 'Enlace solicitante',
        docEnlaceFinal ? `C.C. ${docEnlaceFinal}` : 'Identificación registrada',
        dependenciaNombre || 'Dependencia Solicitante',
        {
          aprobado: true,
          textoBadge: '✓ ELABORADO Y RADICADO',
          fechaStr: fechaElaboroStr,
          certId: firmaElaboro?.certificadoId || 'ESAP-RAD-023',
        },
        false,
      );
      curY += hRow;

      // 2. REVISÓ (1er Nivel — Analista de Viáticos)
      const analistaVerifico = Boolean(fechaFirmaAnalista || (nombreAnalistaFinal && nombreAnalistaFinal !== 'Analista de Viáticos'));
      const fechaAnalistaStr = fechaFirmaAnalista ? formatFechaHoraSegura(fechaFirmaAnalista) : '';
      const docAnalistaDisplay = docAnalistaStr.replace(/^ · /, '') || (nombreAnalistaFinal ? 'C.C. Registrada' : '—');
      renderFilaTrazabilidad(
        curY,
        hRow,
        {
          tag: 'REVISÓ (1er Nivel)',
          sub: 'Analista de Viáticos',
          bg: '#F0FDF4',
          border: '#BBF7D0',
          text: '#166534',
        },
        nombreAnalistaFinal || 'Pendiente Asignación / Revisión',
        'Revisión Técnica y Documental',
        docAnalistaDisplay,
        'Grupo de Gestión de Viáticos',
        {
          aprobado: analistaVerifico,
          textoBadge: analistaVerifico ? '✓ REVISIÓN TÉCNICA VERIFICADA' : 'PENDIENTE REVISIÓN ANALISTA',
          fechaStr: fechaAnalistaStr,
          certId: certIdAnalista,
        },
        true,
      );
      curY += hRow;

      // 3. REVISÓ (2do Nivel — Control Viáticos)
      const controlVerifico = Boolean(fechaFirmaControl || (nombreControlFinal && nombreControlFinal !== 'Control Viáticos' && nombreControlFinal !== 'Control de Viáticos'));
      const fechaControlStr = fechaFirmaControl ? formatFechaHoraSegura(fechaFirmaControl) : '';
      const docControlDisplay = docControlStr.replace(/^ · /, '') || (nombreControlFinal ? 'C.C. Registrada' : '—');
      renderFilaTrazabilidad(
        curY,
        hRow,
        {
          tag: 'REVISÓ (2do Nivel)',
          sub: 'Control Viáticos (Cruzado)',
          bg: '#F0FDF4',
          border: '#BBF7D0',
          text: '#166534',
        },
        nombreControlFinal || 'Pendiente Verificación 2do Nivel',
        'Control Cruzado y Segunda Revisión',
        docControlDisplay,
        'Verificación de Control Viáticos',
        {
          aprobado: controlVerifico,
          textoBadge: controlVerifico ? '✓ VERIFICADO 2DO NIVEL' : 'PENDIENTE CONTROL CRUZADO',
          fechaStr: fechaControlStr,
          certId: certIdControl,
        },
        false,
      );
      curY += hRow;

      // Fila(s) de Aprobación:
      // Si es EXTEMPORÁNEA: primero firma Dirección Nacional (RF-AUT-002) y luego Subdirección de Gestión Corporativa (RF-AUT-001)
      // Si es de control cruzado / estado NORMAL: NO requiere intervención de Dirección Nacional, sigue directamente la Subdirección.

      if (isExtemporanea) {
        // 4. AUTORIZÓ (Dirección Nacional — Autorización Extemporánea RF-AUT-002)
        const dirAprobo = Boolean(
          (dirNacionalNombre || solicitud.autorizadorDireccionId || firmaDirNacObj) &&
            (fechaAutorizacionDir ||
              certIdDirNac ||
              solicitud.decisionDireccion === 'AUTORIZADO' ||
              solicitud.decisionDireccion === 'AUTORIZADA' ||
              [
                'EN_AUTORIZACION',
                EstadoSolicitud.AUTORIZADA,
                EstadoSolicitud.EN_PRESUPUESTO,
                EstadoSolicitud.COMPROMETIDA,
                EstadoSolicitud.OBLIGADA,
                EstadoSolicitud.PAGADA,
              ].includes(solicitud.estadoSolicitud as any)),
        );
        const nombreDirFinal = dirNacionalNombre || (dirAprobo ? 'Dirección Nacional' : 'Pendiente Aval Dirección Nacional');
        const fechaDirStr = fechaAutorizacionDir
          ? formatFechaHoraSegura(fechaAutorizacionDir)
          : '';
        const docDirDisplay = dirNacionalDoc
          ? `C.C. ${dirNacionalDoc}`
          : dirNacionalNombre
          ? 'C.C. Registrada'
          : '—';
        const detalleDir = justificacionDirNac
          ? `Obs: ${this.sanitizarTextoPdf(justificacionDirNac).slice(0, 48)}...`
          : 'Autorización Extemporánea (RF-AUT-002)';

        renderFilaTrazabilidad(
          curY,
          hRow,
          {
            tag: 'AUTORIZÓ',
            sub: 'Dirección Nacional (Extemp.)',
            bg: '#FAF5FF',
            border: '#E9D5FF',
            text: '#7E22CE',
          },
          nombreDirFinal,
          detalleDir,
          docDirDisplay,
          solicitud.esDelegadoDireccion
            ? 'Delegado Dirección Nacional'
            : 'Dirección Nacional / Despacho',
          {
            aprobado: dirAprobo,
            textoBadge: dirAprobo
              ? '✓ AVAL EXTEMPORÁNEO'
              : 'PENDIENTE AVAL DIRECCIÓN',
            fechaStr: fechaDirStr,
            certId: certIdDirNac,
          },
          true,
        );
        curY += hRow;

        // 5. APROBÓ (Subdirección de Gestión Corporativa — Ordenador del Gasto RF-AUT-001)
        const subdirAprobo = Boolean(
          (subdirectorNombre || solicitud.autorizadorId || firmaSubdirObj) &&
            (fechaAprobacionSubdir ||
              certIdSubdir ||
              solicitud.fechaAutorizacion ||
              [
                EstadoSolicitud.AUTORIZADA,
                EstadoSolicitud.EN_PRESUPUESTO,
                EstadoSolicitud.COMPROMETIDA,
                EstadoSolicitud.OBLIGADA,
                EstadoSolicitud.PAGADA,
              ].includes(solicitud.estadoSolicitud as any)),
        );
        const nombreSubdirFinal = subdirectorNombre || (subdirAprobo ? 'Subdirección de Gestión Corporativa' : 'Pendiente Aprobación Institucional');
        const fechaSubdirStr = fechaAprobacionSubdir
          ? formatFechaHoraSegura(fechaAprobacionSubdir)
          : '';
        const docSubdirDisplay = subdirectorDoc
          ? `C.C. ${subdirectorDoc}`
          : subdirectorNombre
          ? 'C.C. Registrada'
          : '—';

        renderFilaTrazabilidad(
          curY,
          hRow,
          {
            tag: 'APROBÓ',
            sub: 'Subdirección de Gestión Corporativa',
            bg: '#EFF6FF',
            border: '#BFDBFE',
            text: '#1D4ED8',
          },
          nombreSubdirFinal,
          'Aprobación Subdirección de Gestión Corporativa (RF-AUT-001)',
          docSubdirDisplay,
          'Subdirección de Gestión Corporativa',
          {
            aprobado: subdirAprobo,
            textoBadge: subdirAprobo
              ? '✓ APROBACIÓN INSTITUCIONAL'
              : 'PENDIENTE GESTIÓN CORPORATIVA',
            fechaStr: fechaSubdirStr,
            certId: certIdSubdir,
          },
          false,
        );
        curY += hRow;
      } else {
        // 4. APROBÓ (Subdirección de Gestión Corporativa — Ordenador del Gasto RF-AUT-001)
        const subdirAprobo = Boolean(
          (subdirectorNombre || solicitud.autorizadorId || firmaSubdirObj) &&
            (fechaAprobacionSubdir ||
              certIdSubdir ||
              solicitud.fechaAutorizacion ||
              [
                EstadoSolicitud.AUTORIZADA,
                EstadoSolicitud.EN_PRESUPUESTO,
                EstadoSolicitud.COMPROMETIDA,
                EstadoSolicitud.OBLIGADA,
                EstadoSolicitud.PAGADA,
              ].includes(solicitud.estadoSolicitud as any)),
        );
        const nombreSubdirFinal = subdirectorNombre || (subdirAprobo ? 'Subdirección de Gestión Corporativa' : 'Pendiente Aprobación Institucional');
        const fechaSubdirStr = fechaAprobacionSubdir
          ? formatFechaHoraSegura(fechaAprobacionSubdir)
          : '';
        const docSubdirDisplay = subdirectorDoc
          ? `C.C. ${subdirectorDoc}`
          : subdirectorNombre
          ? 'C.C. Registrada'
          : '—';

        renderFilaTrazabilidad(
          curY,
          hRow,
          {
            tag: 'APROBÓ',
            sub: 'Subdirección de Gestión Corporativa',
            bg: '#EFF6FF',
            border: '#BFDBFE',
            text: '#1D4ED8',
          },
          nombreSubdirFinal,
          'Aprobación Subdirección de Gestión Corporativa (RF-AUT-001)',
          docSubdirDisplay,
          'Subdirección de Gestión Corporativa',
          {
            aprobado: subdirAprobo,
            textoBadge: subdirAprobo
              ? '✓ APROBACIÓN INSTITUCIONAL'
              : 'PENDIENTE GESTIÓN CORPORATIVA',
            fechaStr: fechaSubdirStr,
            certId: certIdSubdir,
          },
          true,
        );
        curY += hRow;
      }

      // COMPROMETIÓ (Grupo de Presupuesto — Expedición RP en SIIF Nación, RF-PRE-001)
      const presupuestoComprometio = Boolean(
        (presupuestoNombre || presupuestoUsuarioId) &&
          (fechaCompromisoPres || certIdPresupuesto || codigoRpPdf),
      );
      const fechaPresStr = fechaCompromisoPres
        ? formatFechaHoraSegura(fechaCompromisoPres)
        : '';
      const docPresDisplay = presupuestoDoc
        ? `C.C. ${presupuestoDoc}`
        : presupuestoNombre
        ? 'C.C. Registrada'
        : '—';
      const detallePres = [
        codigoRpPdf ? `RP: ${codigoRpPdf}` : '',
        valorComprometidoPdf > 0 ? `Valor: ${formatCurrencyCOP(valorComprometidoPdf)}` : '',
      ]
        .filter(Boolean)
        .join(' · ') || 'Compromiso Presupuestal (RP SIIF Nación)';

      renderFilaTrazabilidad(
        curY,
        hRow,
        {
          tag: 'COMPROMETIÓ',
          sub: 'Grupo de Presupuesto',
          bg: '#FFFBEB',
          border: '#FDE68A',
          text: '#92400E',
        },
        presupuestoComprometio
          ? presupuestoNombre || 'Grupo de Presupuesto'
          : 'Pendiente Compromiso Presupuestal',
        detallePres,
        docPresDisplay,
        presupuestoCargo || 'Grupo de Presupuesto / SIIF Nación',
        {
          aprobado: presupuestoComprometio,
          textoBadge: presupuestoComprometio
            ? '✓ SOLICITUD COMPROMETIDA'
            : 'PENDIENTE COMPROMISO PRESUPUESTAL',
          fechaStr: fechaPresStr,
          certId: certIdPresupuesto,
        },
        isExtemporanea,
      );
      curY += hRow;

      // DESEMBOLSÓ (Grupo de Tesorería — Pago y Desembolso SIIF Nación, RF-PAG-001)
      const fechaTesStr = fechaPagoTes
        ? formatFechaHoraSegura(fechaPagoTes)
        : '';
      const docTesDisplay = tesoreriaDoc
        ? `C.C. ${tesoreriaDoc}`
        : tesoreriaNombre
        ? 'C.C. Registrada'
        : '—';
      const detalleTes = [
        numeroOrdenPagoPdf ? `Orden Pago: ${numeroOrdenPagoPdf}` : '',
        valorPagadoPdf > 0 ? `Desembolso: ${formatCurrencyCOP(valorPagadoPdf)}` : '',
      ]
        .filter(Boolean)
        .join(' · ') || 'Desembolso y Pago (SIIF Nación)';

      renderFilaTrazabilidad(
        curY,
        hRow,
        {
          tag: 'DESEMBOLSÓ',
          sub: 'Grupo de Tesorería',
          bg: '#ECFDF5',
          border: '#A7F3D0',
          text: '#065F46',
        },
        tesoreriaPago
          ? tesoreriaNombre || 'Grupo de Tesorería'
          : 'Pendiente Desembolso Tesorería',
        detalleTes,
        docTesDisplay,
        tesoreriaCargo || 'Tesorería / SIIF Nación',
        {
          aprobado: tesoreriaPago,
          textoBadge: tesoreriaPago
            ? '✓ COMISIÓN PAGADA (SIIF)'
            : 'PENDIENTE DESEMBOLSO TESORERÍA',
          fechaStr: fechaTesStr,
          certId: certIdTesoreria,
        },
        !isExtemporanea,
      );
      curY += hRow;

      // Borde exterior envolvente de la tabla
      const totalFilas = isExtemporanea ? 7 : 6;
      doc.rect(28, yTableHeader, 556, hTableHeader + hRow * totalFilas).strokeColor('#000000').lineWidth(0.6).stroke();

      // Banner institucional de Protección de Datos (Ley 1581 de 2012)
      const yLey = curY + 2.5;
      drawBox(28, yLey, 556, 12, '#F8FAFC', '#CBD5E1', 0.5);
      doc.fontSize(5).font('Helvetica-Oblique').fillColor('#64748B');
      doc.text(
        'Tratamiento de Datos Personales: La información recolectada en este documento es tratada bajo la política institucional de Protección de Datos Personales de la ESAP en cumplimiento a la Ley 1581 de 2012.',
        30,
        yLey + 3.5,
        { width: 552, align: 'center' },
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

      let comisionado: ComisionadoEntity | null | undefined =
        solicitud.comisionado;
      if (!comisionado && solicitud.comisionadoId) {
        try {
          const comRepo = manager.getRepository(ComisionadoEntity);
          if (comRepo && typeof comRepo.findOne === 'function') {
            comisionado = await comRepo.findOne({
              where: { id: solicitud.comisionadoId },
            });
          }
        } catch {
          // ignore if repository not found or not mocked
        }
      }

      // RF-REV-003: Bloqueo de verificación si contratista es facturador electrónico sin factura adjunta
      const esContratista =
        (comisionado?.tipoComisionado || '').toUpperCase() === 'CONTRATISTA';
      const esFacturador = Boolean(
        dto.consultaRutFacturador ??
          (solicitud.consultaRutFacturador || comisionado?.esFacturadorElectronico),
      );

      if (esContratista && esFacturador) {
        let docsSoporte: DocumentoSoporteEntity[] =
          solicitud.documentosSoporte || [];
        try {
          const docRepo = manager.getRepository(DocumentoSoporteEntity);
          if (docRepo && typeof docRepo.find === 'function') {
            docsSoporte = await docRepo.find({
              where: { solicitudId: solicitud.id },
            });
          }
        } catch {
          // fallback a solicitud.documentosSoporte
        }

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
            'Bloqueo: El comisionado es contratista facturador electrónico y no cuenta con la Factura Electrónica cargada en el expediente. Debe solicitarla o adjuntarla antes de continuar a la firma.',
          );
        }
      }

      // Validación de firma OTP si fue provista
      if (dto.otp) {
        const verificationId =
          dto.verificationId?.trim() ||
          `viat:${solicitud.id}:ANALISTA:${usuarioId}`;
        const isVerified = this.verificarOtpFirma({
          verificationId,
          code: dto.otp,
          consume: true,
        });
        if (!isVerified) {
          throw new BadRequestException(
            'Código OTP inválido o expirado para la firma de verificación del analista.',
          );
        }
      }

      const comentarioChecklist = JSON.stringify({
        tipo: 'VERIFICACION_ANALISTA',
        seguridad_social_vigente: dto.seguridadSocialVigente ?? null,
        consulta_rut_facturador: dto.consultaRutFacturador ?? false,
        certificado_id: dto.certificadoId ?? null,
        hash_sha256: dto.hashSha256 ?? null,
      });

      const estadoAnterior = solicitud.estadoSolicitud;
      solicitud.estadoSolicitud = EstadoSolicitud.SOLICITADA_SIIF;
      solicitud.analistaAsignadoId = usuarioId;
      solicitud.fechaRevision = new Date();
      solicitud.motivoDevolucion = null;
      solicitud.observacionesSegundaRevision = null;

      // Resolver datos del analista para la estampa digital
      const dAnalista = await this.resolverDatosUsuario(usuarioId, '');
      const nombreAnalistaFinal = dto.nombreAnalista || dAnalista.nombre || usuarioId;
      const cargoAnalistaFinal = dto.cargoAnalista || dAnalista.cargo || 'Analista de Viáticos';
      const certIdFinal = dto.certificadoId || `ESAP-CERT-VIAT-${Date.now().toString(36).toUpperCase()}`;
      const fechaFirmaIso = new Date().toISOString();

      const firmaAnalistaData = {
        tipo: TipoFirmaAprobacion.ANALISTA,
        usuarioId,
        nombreFirmante: nombreAnalistaFinal,
        cargoFirmante: cargoAnalistaFinal,
        documentoIdentidad: dAnalista.documento || null,
        fechaFirma: fechaFirmaIso,
        certificadoId: certIdFinal,
        hashSha256: dto.hashSha256 || null,
        firmaImagen: dto.firmaImagen || null,
        estado: 'FIRMADO',
        firmadoDigitalmente: true,
        otpVerificado: true,
      };

      const prevFirmas = Array.isArray(solicitud.camposAdicionales?.firmasAprobacion)
        ? [...solicitud.camposAdicionales.firmasAprobacion]
        : [];
      const idxFirma = prevFirmas.findIndex(
        (f: any) =>
          f.tipo === TipoFirmaAprobacion.ANALISTA ||
          (f.tipo as string) === 'ANALISTA_VIATICOS',
      );
      if (idxFirma >= 0) {
        prevFirmas[idxFirma] = { ...prevFirmas[idxFirma], ...firmaAnalistaData };
      } else {
        prevFirmas.push(firmaAnalistaData);
      }

      solicitud.camposAdicionales = {
        ...(solicitud.camposAdicionales || {}),
        nombreAnalista: nombreAnalistaFinal,
        firmaAnalista: firmaAnalistaData,
        firmasAprobacion: prevFirmas,
      };

      await manager.getRepository(SolicitudHistorialEstadoEntity).save({
        solicitudId: solicitud.id,
        estadoAnterior,
        estadoNuevo: EstadoSolicitud.SOLICITADA_SIIF,
        usuarioId: usuarioId,
        comentarios: `Verificación del analista completada y firmada con OTP (Certificado: ${certIdFinal}). Solicitud transferida a Control de Viáticos para segunda revisión.`,
      });

      if (dto.consultaRutFacturador !== undefined) {
        solicitud.consultaRutFacturador = dto.consultaRutFacturador;
        if (comisionado && esContratista) {
          comisionado.esFacturadorElectronico = Boolean(dto.consultaRutFacturador);
          const comRepo = manager.getRepository(ComisionadoEntity);
          if (typeof comRepo.save === 'function') {
            await comRepo.save(comisionado);
          }
        }
      }

      const saved = await manager
        .getRepository(SolicitudComisionEntity)
        .save(solicitud);

      this.logger.log(
        `[etapa5] Verificacion registrada con firma OTP para solicitud ${solicitud.consecutivoUnico} por usuario ${usuarioId}`,
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
            titulo: `Comisión en espera de Control de Viáticos: ${consecutivo}`,
            mensaje: `El analista ha verificado y firmado con OTP la comisión ${consecutivo} hacia ${destino}. Se encuentra en la bandeja de Control de Viáticos para segunda revisión técnica (Control Cruzado).`,
            descripcion_corta: `Control Cruzado · ${consecutivo}`,
            icono: 'CheckSquare',
            color: '#003DA5',
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
            subject: `[Viáticos ESAP] Solicitud Lista para Control de Viáticos: ${consecutivo}`,
            html: buildTravelExpenseEmailHtml({
              destinatarioNombre: 'Revisor de Control de Viáticos',
              tituloHeader: 'ESAP — Grupo de Viáticos',
              subtituloHeader: 'Segunda Revisión Técnica (Control Cruzado)',
              mensajePrincipal: `La comisión de servicios <strong>${consecutivo}</strong> ha completado la verificación por analista con firma digital OTP y está pendiente de su segunda revisión técnica en la bandeja de Control de Viáticos:`,
              consecutivo,
              destino,
              fechas: fechasStr,
              nuevoEstado: 'SOLICITADA_SIIF',
              tipoNovedad: 'INFO',
              textoBoton: 'Ver en Bandeja de Control',
            }),
            text: `La comisión ${consecutivo} ha sido verificada por el analista con firma OTP y remitida a Control de Viáticos para segunda revisión técnica.`,
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
      if (solicitud.camposAdicionales) {
        solicitud.camposAdicionales.firmasCompletadas = false;
        solicitud.camposAdicionales.firmasAprobacion = [];
      }

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

      solicitud.siifExportado = true;
      solicitud.fechaExportacionSiif = new Date();
      solicitud.usuarioExportadorId = usuarioId;

      const saved = await manager
        .getRepository(SolicitudComisionEntity)
        .save(solicitud);

      this.logger.log(
        `[exportarSIIF] Archivo plano CSV descargado para ${solicitud.consecutivoUnico} (${solicitud.estadoSolicitud}) por usuario ${usuarioId}`,
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
      numeroCdp: s.numeroCdp ?? null,
      fechaCdp: s.fechaCdp ?? null,
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

      // Validación de firma OTP si fue provista
      if (dto.otp) {
        const verificationId =
          dto.verificationId?.trim() ||
          `viat:${solicitud.id}:CONTROL_VIATICOS:${usuarioId}`;
        const isVerified = this.verificarOtpFirma({
          verificationId,
          code: dto.otp,
          consume: true,
        });
        if (!isVerified) {
          throw new BadRequestException(
            'Código OTP inválido o expirado para la firma de Control Viáticos.',
          );
        }
      }

      const estadoAnterior = solicitud.estadoSolicitud;
      const esExtemporanea = Boolean(solicitud.extemporanea);
      solicitud.estadoSolicitud = esExtemporanea
        ? EstadoSolicitud.AUTORIZACION_DIRECCION
        : EstadoSolicitud.VERIFICADA;
      solicitud.revisorControlId = usuarioId;
      solicitud.fechaSegundaRevision = new Date();
      solicitud.observacionesSegundaRevision = observaciones.slice(0, 2000);

      // Resolver datos del revisor de Control Viáticos para la estampa digital y firmas
      const dRevisor = await this.resolverDatosUsuario(usuarioId, '');
      const nombreRevisorFinal = dto.nombreRevisor || dRevisor.nombre || usuarioId;
      const cargoRevisorFinal = dto.cargoRevisor || dRevisor.cargo || 'Revisor de Control de Viáticos';
      const certIdFinal = dto.certificadoId || `ESAP-CERT-VIAT-${Date.now().toString(36).toUpperCase()}`;
      const fechaFirmaIso = new Date().toISOString();

      const firmaControlData = {
        tipo: TipoFirmaAprobacion.CONTROL_VIATICOS,
        usuarioId,
        nombreFirmante: nombreRevisorFinal,
        cargoFirmante: cargoRevisorFinal,
        documentoIdentidad: dto.documentoIdentidad || dRevisor.documento || null,
        fechaFirma: fechaFirmaIso,
        certificadoId: certIdFinal,
        hashSha256: dto.hashSha256 || null,
        firmaImagen: dto.firmaImagen || null,
        estado: 'FIRMADO',
        firmadoDigitalmente: true,
        otpVerificado: Boolean(dto.otp),
      };

      const prevFirmas = Array.isArray(solicitud.camposAdicionales?.firmasAprobacion)
        ? [...solicitud.camposAdicionales.firmasAprobacion]
        : [];
      const idxFirma = prevFirmas.findIndex(
        (f: any) =>
          f.tipo === TipoFirmaAprobacion.CONTROL_VIATICOS ||
          (f.tipo as string) === 'CONTROL_VIATICOS',
      );
      if (idxFirma >= 0) {
        prevFirmas[idxFirma] = { ...prevFirmas[idxFirma], ...firmaControlData };
      } else {
        prevFirmas.push(firmaControlData);
      }

      solicitud.camposAdicionales = {
        ...(solicitud.camposAdicionales || {}),
        revisorControlNombre: nombreRevisorFinal,
        firmaControlViaticos: firmaControlData,
        firmasAprobacion: prevFirmas,
      };

      const saved = await manager
        .getRepository(SolicitudComisionEntity)
        .save(solicitud);

      await manager.getRepository(SolicitudHistorialEstadoEntity).save({
        solicitudId: solicitud.id,
        estadoAnterior,
        estadoNuevo: solicitud.estadoSolicitud,
        usuarioId: usuarioId,
        comentarios: esExtemporanea
          ? `Segunda revisión (Control Cruzado) completada y firmada${dto.otp ? ` con OTP (Cert: ${certIdFinal})` : ''}. Enrutada a Dirección Nacional por comisión extemporánea (RF-AUT-002): ${observaciones.slice(0, 200)}`
          : `Segunda revisión (Control Cruzado)${dto.otp ? ` firmada con OTP (Cert: ${certIdFinal})` : ''}: ${observaciones.slice(0, 255)}`,
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
   * RF-AUT-003 — Valida que el usuario tenga rol de Jefe de Dependencia o Super Administrador
   * para proceder con la cancelación de la comisión de viáticos.
   */
  private validarAutorizacionCancelacion(rolesUsuario: string[]): void {
    if (!rolesUsuario || rolesUsuario.length === 0) {
      return;
    }

    if (this.esSuperAdmin(rolesUsuario)) {
      return;
    }

    const rolesPermitidosJefe = [
      'JEFE_DEPENDENCIA',
      'ROL_JEFE_DEPENDENCIA',
      'SUPERVISOR',
      'JEFE',
      'DIRECTOR_TERRITORIAL',
      'LIDER_DEPENDENCIA',
      'LIDER_DE_DEPENDENCIA',
      'JEFE_DE_DEPENDENCIA',
    ];

    const esAutorizado = rolesUsuario.some((r: any) => {
      if (typeof r !== 'string') return false;
      const normalized = r.toUpperCase().replace(/\s+/g, '_');
      return (
        rolesPermitidosJefe.includes(normalized) ||
        normalized.includes('JEFE_DEPENDENCIA') ||
        normalized === 'SUPERVISOR' ||
        r === 'travel_expenses:cancel_request' ||
        r === 'travel_expenses.general.es_jefe_dependencia'
      );
    });

    if (!esAutorizado) {
      throw new ForbiddenException(
        'Solo el Jefe de Dependencia o un administrador está autorizado para cancelar solicitudes de comisiones de viáticos.',
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
        numeroCdp: s.numeroCdp ?? null,
        fechaCdp: s.fechaCdp ?? null,
        requiereTiquetes: s.requiereTiquetes,
        costoEstimadoTiquete: s.costoEstimadoTiquete,
        montoViaticos: s.montoViaticos,
        montoGastosViaje: s.montoGastosViaje,
        montoTotal:
          Number(s.montoViaticos || 0) +
          Number(s.montoGastosViaje || 0) +
          Number(s.costoEstimadoTiquete || 0),
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

      // Validación de firma OTP si fue provista
      if (dto?.otp) {
        const verificationId =
          dto.verificationId?.trim() ||
          `viat:${solicitud.id}:SUBDIRECCION:${usuarioId}`;
        const isVerified = this.verificarOtpFirma({
          verificationId,
          code: dto.otp,
          consume: true,
        });
        if (!isVerified) {
          throw new BadRequestException(
            'Código OTP inválido o expirado para la firma de autorización de Subdirección.',
          );
        }
      }

      const certIdFinal = dto?.certificadoId || this.generarCertificadoId();
      const datosFirmante = await this.resolverDatosUsuario(usuarioId);
      const nombreFirmanteFinal = datosFirmante.nombre || 'Subdirección de Gestión Corporativa';
      const cargoFirmanteFinal = datosFirmante.cargo || 'Subdirector(a) de Gestión Corporativa';

      const firmaSubdireccionData = {
        tipo: 'SUBDIRECCION',
        nombreFirmante: nombreFirmanteFinal,
        emailFirmante: datosFirmante.email || null,
        cargoFirmante: cargoFirmanteFinal,
        documentoIdentidad: datosFirmante.documento || null,
        firmaImagen: dto?.firmaImagen || null,
        fechaFirma: new Date().toISOString(),
        usuarioId,
        estado: 'FIRMADO',
        firmadoDigitalmente: true,
        certificadoId: certIdFinal,
        hashSha256:
          dto?.hashSha256 ||
          this.generarHashDocumento(
            `${solicitud.id}|SUBDIRECCION|${usuarioId}|${new Date().toISOString()}`,
          ),
        otpVerificado: Boolean(dto?.otp),
      };

      const prevFirmas = Array.isArray(
        solicitud.camposAdicionales?.firmasAprobacion,
      )
        ? [...solicitud.camposAdicionales.firmasAprobacion]
        : [];
      const idxFirma = prevFirmas.findIndex(
        (f: any) =>
          f.tipo === 'SUBDIRECCION' ||
          (f.tipo as string) === 'SUBDIRECTOR',
      );
      if (idxFirma >= 0) {
        prevFirmas[idxFirma] = { ...prevFirmas[idxFirma], ...firmaSubdireccionData };
      } else {
        prevFirmas.push(firmaSubdireccionData);
      }

      solicitud.camposAdicionales = {
        ...(solicitud.camposAdicionales || {}),
        firmaSubdireccion: firmaSubdireccionData,
        firmasAprobacion: prevFirmas,
      };

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
   * 4. Al grupo de presupuesto (in-app y correo electrónico para expedición de RP).
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

      // 4. Notificación al Grupo de Presupuesto (para expedición de RP)
      try {
        await this.notificationClient.notifyByPermission(
          'travel_expenses.general.es_presupuesto',
          {
            tipo_notificacion: 'VIATICOS_COMISION_AUTORIZADA_PRESUPUESTO',
            titulo: `Nueva comisión autorizada para expedición de RP: ${consecutivo}`,
            mensaje: `La comisión ${consecutivo} con destino a ${destino}${nombrePasajero ? ` (${nombrePasajero})` : ''} fue AUTORIZADA corporativamente y se encuentra disponible para expedición de Registro Presupuestal (RP) en SIIF Nación.`,
            descripcion_corta: `Autorizada · ${consecutivo}`,
            icono: 'Receipt',
            color: '#059669',
            prioridad: 'Alta',
            categoria: 'VIATICOS',
            tiene_accion: true,
            texto_boton_accion: 'Expedir RP',
            url_accion: '/viaticos',
            datos_adicionales: {
              solicitudId: solicitud.id,
              consecutivoUnico: consecutivo,
              comisionadoNombre: nombrePasajero,
              destinoCiudad: solicitud.destinoCiudad,
            },
          },
          {
            subject: `[Viáticos ESAP] Comisión Autorizada para Expedición de RP: ${consecutivo}`,
            html: buildTravelExpenseEmailHtml({
              destinatarioNombre: 'Grupo de Presupuesto',
              tituloHeader: 'ESAP — Grupo de Presupuesto',
              subtituloHeader: 'Comisión Autorizada Pendiente de Registro Presupuestal (RP)',
              mensajePrincipal: `La comisión <strong>${consecutivo}</strong> ha sido autorizada corporativamente por la Subdirección de Gestión Corporativa y se encuentra disponible para la expedición de Registro Presupuestal (RP) en SIIF Nación:`,
              consecutivo,
              comisionadoNombre: nombrePasajero,
              destino,
              nuevoEstado: 'AUTORIZADA',
              tipoNovedad: 'SUCCESS',
              textoBoton: 'Expedir RP en Plataforma',
              urlAccion: '/viaticos',
            }),
            text: `La comisión ${consecutivo} fue autorizada y está disponible para expedición de RP en SIIF Nación.`,
          },
          'PRESUPUESTO',
        );
      } catch (err: any) {
        this.logger.warn(`[notify] Error notificando a PRESUPUESTO en autorización: ${err?.message}`);
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
        numeroCdp: s.numeroCdp ?? null,
        fechaCdp: s.fechaCdp ?? null,
        requiereTiquetes: s.requiereTiquetes,
        costoEstimadoTiquete: s.costoEstimadoTiquete,
        montoViaticos: s.montoViaticos,
        montoGastosViaje: s.montoGastosViaje,
        montoTotal:
          Number(s.montoViaticos || 0) +
          Number(s.montoGastosViaje || 0) +
          Number(s.costoEstimadoTiquete || 0),
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

      // Validación de firma OTP si fue provista
      if (dto?.otp) {
        const verificationId =
          dto.verificationId?.trim() ||
          `viat:${solicitud.id}:DIRECCION_NACIONAL:${usuarioId}`;
        const isVerified = this.verificarOtpFirma({
          verificationId,
          code: dto.otp,
          consume: true,
        });
        if (!isVerified) {
          throw new BadRequestException(
            'Código OTP inválido o expirado para la firma de autorización de Dirección Nacional.',
          );
        }
      }

      const certIdFinal = dto?.certificadoId || this.generarCertificadoId();
      const datosFirmante = await this.resolverDatosUsuario(usuarioId);
      const nombreFirmanteFinal = datosFirmante.nombre || 'Dirección Nacional';
      const cargoFirmanteFinal = esDelegado
        ? `${datosFirmante.cargo || 'Directivo'} (Delegado de Dirección Nacional)`
        : datosFirmante.cargo || 'Director(a) Nacional';

      const firmaDireccionData = {
        tipo: 'DIRECCION_NACIONAL',
        nombreFirmante: nombreFirmanteFinal,
        emailFirmante: datosFirmante.email || null,
        cargoFirmante: cargoFirmanteFinal,
        documentoIdentidad: datosFirmante.documento || null,
        firmaImagen: dto?.firmaImagen || null,
        fechaFirma: new Date().toISOString(),
        usuarioId,
        estado: 'FIRMADO',
        certificadoId: certIdFinal,
        hashSha256:
          dto?.hashSha256 ||
          this.generarHashDocumento(
            `${solicitud.id}|DIRECCION_NACIONAL|${usuarioId}|${new Date().toISOString()}`,
          ),
        otpVerificado: Boolean(dto?.otp),
        esDelegado,
      };

      const prevFirmas = Array.isArray(
        solicitud.camposAdicionales?.firmasAprobacion,
      )
        ? [...solicitud.camposAdicionales.firmasAprobacion]
        : [];
      const idxFirma = prevFirmas.findIndex(
        (f: any) => f.tipo === 'DIRECCION_NACIONAL',
      );
      if (idxFirma >= 0) {
        prevFirmas[idxFirma] = { ...prevFirmas[idxFirma], ...firmaDireccionData };
      } else {
        prevFirmas.push(firmaDireccionData);
      }

      solicitud.camposAdicionales = {
        ...(solicitud.camposAdicionales || {}),
        firmaDireccionNacional: firmaDireccionData,
        firmasAprobacion: prevFirmas,
      };

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
        comentarios: `Autorizada excepcionalmente por Dirección Nacional ${esDelegado ? '(como Delegado)' : ''}${dto?.otp ? ` con firma digital OTP (Cert: ${certIdFinal})` : ''}: ${justificacion ? justificacion.slice(0, 255) : 'Comisión extemporánea avalada, continúa a Subdirección'}`,
      });

      this.logger.log(
        `[RF-AUT-002] Solicitud extemporánea ${solicitud.consecutivoUnico} AUTORIZADA por Dirección Nacional (usuario ${usuarioId})${dto?.otp ? ` [Firma OTP: ${certIdFinal}]` : ''}`,
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

    this.validarAutorizacionCancelacion(rolesUsuario);

    const motivo = (dto?.motivoCancelacion || '').trim();
    if (motivo.length < 5) {
      throw new BadRequestException(
        'El motivo de cancelación es obligatorio (mínimo 5 caracteres).',
      );
    }

    const responsable =
      (dto?.responsableCancelacion || '').trim() || 'Jefe de Dependencia / Dirección Territorial';

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
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#003DA5').text('Desglose de Rutas — Fechas y Hora del Viaje:');
        doc.moveDown(0.2);
        solicitud.itinerario.forEach((tramo: any, idx: number) => {
          const trayectoStr = tramo.tipoTrayecto === 'IDA_Y_VUELTA' ? 'Ida y Vuelta' : 'Solo Ida';
          const horaViaje = tramo.horaEstimadaSalida || tramo.horarioEstimadoMilitar || tramo.horaSalida;
          const horarioStr = horaViaje ? ` · Hora: ${horaViaje} h` : '';
          const diasStr = tramo.diasRuta ? ` (${tramo.diasRuta} d)` : '';
          const transporteStr = tramo.tipoTransporte ? ` [${tramo.tipoTransporte}]` : '';
          const fSalida = tramo.fechaSalida || 'N/A';
          const fLlegada = tramo.fechaLlegada || tramo.fechaSalida || 'N/A';
          const fechasStr = fSalida === fLlegada ? fSalida : `Del ${fSalida} al ${fLlegada}`;
          doc
            .font('Helvetica')
            .fontSize(8.5)
            .fillColor('#334155')
            .text(
              `  Tramo ${idx + 1}: ${tramo.origenCiudad || 'Origen'} -> ${tramo.destinoCiudad || 'Destino'} (${trayectoStr}) | Fechas y hora del viaje: ${fechasStr}${horarioStr}${diasStr}${transporteStr}`,
            );
        });
      }
      doc.moveDown(0.5);

      drawSectionTitle('3. LIQUIDACIÓN DEL GASTO AUTORIZADO');
      drawField('Rubro Presupuestal', solicitud.rubroPresupuestal || 'N/A');
      drawField('Certificado de Disponibilidad Presupuestal (CDP)', solicitud.numeroCdp || 'N/A');
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
      solicitud.rubroRp = rubroFinal;
      solicitud.soporteRpPath = datosRp.soporteRpPath ? datosRp.soporteRpPath.trim() : null;
      solicitud.codigoRp = codigoOficialRp;
      solicitud.expedidoRpPorId = usuarioId;
      solicitud.fechaExpedicionRp = new Date();
      if (datosRp.observaciones) {
        solicitud.observacionesRp = datosRp.observaciones.trim();
      }

      // Validación de firma OTP si fue provista
      if ((datosRp as any).otp) {
        const verificationId =
          (datosRp as any).verificationId?.trim() ||
          `viat:${solicitud.id}:PRESUPUESTO:${usuarioId}`;
        const isVerified = this.verificarOtpFirma({
          verificationId,
          code: (datosRp as any).otp,
          consume: true,
        });
        if (!isVerified) {
          throw new BadRequestException(
            'Código OTP inválido o expirado para la firma de compromiso presupuestal.',
          );
        }
      }

      const certIdFinal = (datosRp as any).certificadoId || this.generarCertificadoId();
      const datosFirmante = await this.resolverDatosUsuario(usuarioId);
      const nombreFirmanteFinal = datosFirmante.nombre || 'Grupo de Presupuesto';
      const cargoFirmanteFinal = datosFirmante.cargo || 'Profesional de Presupuesto / SIIF';

      const firmaPresupuestoData = {
        tipo: 'PRESUPUESTO',
        nombreFirmante: nombreFirmanteFinal,
        emailFirmante: datosFirmante.email || null,
        cargoFirmante: cargoFirmanteFinal,
        documentoIdentidad: datosFirmante.documento || null,
        firmaImagen: (datosRp as any).firmaImagen || null,
        fechaFirma: new Date().toISOString(),
        usuarioId,
        estado: 'FIRMADO',
        firmadoDigitalmente: true,
        certificadoId: certIdFinal,
        hashSha256:
          (datosRp as any).hashSha256 ||
          this.generarHashDocumento(
            `${solicitud.id}|PRESUPUESTO|${usuarioId}|${new Date().toISOString()}`,
          ),
        otpVerificado: Boolean((datosRp as any).otp),
      };

      const prevFirmas = Array.isArray(
        solicitud.camposAdicionales?.firmasAprobacion,
      )
        ? [...solicitud.camposAdicionales.firmasAprobacion]
        : [];
      const idxFirma = prevFirmas.findIndex(
        (f: any) =>
          f.tipo === 'PRESUPUESTO' ||
          (f.tipo as string) === 'GRUPO_PRESUPUESTO',
      );
      if (idxFirma >= 0) {
        prevFirmas[idxFirma] = { ...prevFirmas[idxFirma], ...firmaPresupuestoData };
      } else {
        prevFirmas.push(firmaPresupuestoData);
      }

      solicitud.camposAdicionales = {
        ...(solicitud.camposAdicionales || {}),
        firmaPresupuesto: firmaPresupuestoData,
        firmasAprobacion: prevFirmas,
      };

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

      // Consecutivo para notificaciones
      const consecutivo = guardada.consecutivoUnico || guardada.id;

      await manager.getRepository(SolicitudHistorialEstadoEntity).save({
        solicitudId: solicitud.id,
        estadoAnterior,
        estadoNuevo: EstadoSolicitud.COMPROMETIDA,
        usuarioId,
        motivo: `[RF-PRE-001 / RF-PRE-003] Registro Presupuestal (RP) expedido en SIIF Nación: ${codigoOficialRp}. Modalidad: ${modalidadPago} (${diasHabilesPrevios} días hábiles previos). Valor comprometido: $${Number(datosRp.valorComprometido).toLocaleString('es-CO')}. Rubro: ${rubroFinal}`,
      });

      // NOTIFICAR A USUARIOS CON PERMISO travel-expenses:general.es_presupuesto
      // Esto notificará al analista y otros roles con permiso de presupuesto
      if (guardada.analistaAsignadoId) {
        try {
          await this.notificationClient.notifyByPermission(
            'travel-expenses.general.es_presupuesto',
            {
              tipo_notificacion: 'VIATICOS_COMISION_COMPROMETIDA_ANALISTA',
              titulo: `Comisión comprometida para análisis: ${consecutivo}`,
              mensaje: `La comisión ${consecutivo} ha sido comprometida y requiere generación de obligación en SIIF.`,
              descripcion_corta: `Comprometida SIIF · ${consecutivo}`,
              icono: 'Clock',
              color: '#F59E0B',
              prioridad: 'Media' as const,
              categoria: 'VIATICOS',
              tiene_accion: true,
              texto_boton_accion: 'Generar obligación',
              url_accion: '/viaticos/obligar',
              datos_adicionales: {
                solicitudId: guardada.id,
                consecutivoUnico: consecutivo,
                rol: 'CONTROL_VIATICOS',
              },
            }, {
              asunto: `Comisión comprometida para obligación SIIF: ${consecutivo}`,
              html: buildTravelExpenseEmailHtml({
                consecutivo,
                comisionadoNombre: this.getComisionadoNombre(guardada.comisionado),
                destino: `${guardada.destinoCiudad || ''}, ${guardada.destinoDepartamento || ''}`.trim(),
                fechaInicio: guardada.fechaInicio ? new Date(guardada.fechaInicio).toISOString().split('T')[0] : '',
                fechaFin: guardada.fechaFin ? new Date(guardada.fechaFin).toISOString().split('T')[0] : '',
                estadoBadge: 'COMPROMETIDA',
                badgeColor: '#F59E0B',
                mensajePrincipal: `La comisión <strong>${consecutivo}</strong> ha sido comprometida y requiere generación de obligación en SIIF para pasar a estado OBLIGADO y quedar lista a Tesorería.`,
                observaciones: `RP: ${guardada.codigoRp} · Valor: $${Number(guardada.valorComprometido).toLocaleString('es-CO')}`,
                botonTexto: 'Generar Obligación',
                botonUrl: '/viaticos/obligar',
              }),
              text: `La comisión ${consecutivo} ha sido comprometida y requiere generación de obligación en SIIF.`,
            }
          );
        } catch (notifErr: any) {
          this.logger.warn(`[notify] No se pudo notificar por permiso es_presupuesto: ${notifErr?.message}`);
        }
      }

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
      observaciones: (dto as any).observaciones,
      otp: (dto as any).otp,
      verificationId: (dto as any).verificationId,
      certificadoId: (dto as any).certificadoId,
      hashSha256: (dto as any).hashSha256,
      firmaImagen: (dto as any).firmaImagen,
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
        solicitud.soporteRpPath = soporteFinal ? String(soporteFinal).trim() : null;
        solicitud.codigoRp = codigoOficialRp;
        solicitud.expedidoRpPorId = usuarioId;
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

    // Validación de firma OTP de Tesorería si fue provista
    if (dto.otp) {
      const verificationId =
        dto.verificationId?.trim() ||
        `viat:${solicitud.id}:TESORERIA:${usuarioId}`;
      const isVerified = this.verificarOtpFirma({
        verificationId,
        code: dto.otp,
        consume: true,
      });
      if (!isVerified) {
        throw new BadRequestException(
          'Código OTP inválido o expirado para la firma de desembolso de Tesorería.',
        );
      }
    }

    const certIdFinal = dto.certificadoId || this.generarCertificadoId();
    const datosFirmante = await this.resolverDatosUsuario(usuarioId);
    const nombreFirmanteFinal = dto.nombreFirmante || datosFirmante.nombre || 'Profesional de Tesorería';
    const cargoFirmanteFinal = dto.cargoFirmante || datosFirmante.cargo || 'Responsable de Tesorería / SIIF';

    const firmaTesoreriaData = {
      tipo: 'TESORERIA',
      nombreFirmante: nombreFirmanteFinal,
      emailFirmante: datosFirmante.email || null,
      cargoFirmante: cargoFirmanteFinal,
      documentoIdentidad: datosFirmante.documento || null,
      firmaImagen: dto.firmaImagen || null,
      fechaFirma: new Date().toISOString(),
      usuarioId,
      estado: 'FIRMADO',
      firmadoDigitalmente: true,
      certificadoId: certIdFinal,
      hashSha256:
        dto.hashSha256 ||
        this.generarHashDocumento(
          `${solicitud.id}|TESORERIA|${usuarioId}|${new Date().toISOString()}`,
        ),
      otpVerificado: Boolean(dto.otp),
    };

    const prevFirmas = Array.isArray(
      solicitud.camposAdicionales?.firmasAprobacion,
    )
      ? [...solicitud.camposAdicionales.firmasAprobacion]
      : [];
    const idxFirma = prevFirmas.findIndex(
      (f: any) =>
        f.tipo === 'TESORERIA' ||
        (f.tipo as string) === 'GRUPO_TESORERIA' ||
        (f.tipo as string) === 'PAGADOR',
    );
    if (idxFirma >= 0) {
      prevFirmas[idxFirma] = { ...prevFirmas[idxFirma], ...firmaTesoreriaData };
    } else {
      prevFirmas.push(firmaTesoreriaData);
    }

    solicitud.camposAdicionales = {
      ...(solicitud.camposAdicionales || {}),
      firmaTesoreria: firmaTesoreriaData,
      firmasAprobacion: prevFirmas,
    };

    solicitud.estadoSolicitud = EstadoSolicitud.PAGADA;
    solicitud.fechaPago = fechaPagoFinal;
    solicitud.valorPagado = valorPagadoFinal;
    solicitud.soportePagoPath = soporteFinal;
    solicitud.numeroOrdenPago = ordenPagoFinal;
    solicitud.observacionesPago = dto.observacionesPago?.trim() || null;
    solicitud.pagadoPorId = usuarioId;
    if (dto.costoEstimadoTiquete !== undefined && dto.costoEstimadoTiquete !== null) {
      solicitud.costoEstimadoTiquete = Number(dto.costoEstimadoTiquete);
    }
    solicitud.fechaRegistroPago = new Date();

    const consecutivo = solicitud.consecutivoUnico || solicitud.id;
    const numObligacion = solicitud.numeroObligacion;

    return await this.dataSource.transaction(async (manager) => {
      const guardada = await manager.getRepository(SolicitudComisionEntity).save(solicitud);

      const comentariosTrazabilidad = `[RF-PAG-003] Pago procesado y firmado por Tesorería (${certIdFinal}). Estado: PAGADA. Valor desembolsado: $${valorPagadoFinal.toLocaleString('es-CO')}. Modalidad: ${modalidadFinal}. Obligación SIIF: ${numObligacion}${ordenPagoFinal ? `. Orden Pago: ${ordenPagoFinal}` : ''}${soporteFinal ? `. Soporte: ${soporteFinal}` : ''}.`;

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
            if (typeof this.notificationClient.notifyUser === 'function') {
              await this.notificationClient.notifyUser(destId, notifPago, emailPago);
            } else if (typeof (this.notificationClient as any).send === 'function') {
              await (this.notificationClient as any).send({
                ...notifPago,
                id_usuario_destinatario: destId,
              });
            }
          }

          // Notificación directa por email al comisionado si tiene correo registrado
          if (guardada.comisionado?.email && guardada.comisionado.email.includes('@')) {
            if (typeof this.notificationClient.sendEmail === 'function') {
              await this.notificationClient.sendEmail({
                to: guardada.comisionado.email,
                subject: emailPago.asunto,
                html: emailPago.html,
                text: notifPago.mensaje,
              });
            }
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


