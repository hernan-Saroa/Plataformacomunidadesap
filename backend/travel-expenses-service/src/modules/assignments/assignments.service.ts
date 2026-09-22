import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { AnalistaEntity } from '../../entities/analista.entity';
import { SolicitudComisionEntity } from '../../entities/solicitud-comision.entity';
import { SolicitudHistorialEstadoEntity } from '../../entities/solicitud-historial-estado.entity';
import { EstadoSolicitud } from '../../entities/estado-solicitud.enum';
import {
  NotificationClientService,
  buildTravelExpenseEmailHtml,
} from '../../common/notification-client.service';

/**
 * RF-REC-002 — Asignar comisión a analista con tablero de carga.
 *
 * Servicio core que encapsula:
 *   1. Cálculo de carga ponderada por analista (semáforo).
 *   2. Asignación transaccional de solicitud a analista.
 */
@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    @InjectRepository(AnalistaEntity)
    private readonly analistaRepo: Repository<AnalistaEntity>,
    @InjectRepository(SolicitudComisionEntity)
    private readonly solicitudRepo: Repository<SolicitudComisionEntity>,
    @InjectRepository(SolicitudHistorialEstadoEntity)
    private readonly historialRepo: Repository<SolicitudHistorialEstadoEntity>,
    private readonly dataSource: DataSource,
    private readonly notificationClient: NotificationClientService,
  ) {}

  /**
   * Pesos de prioridad para el cálculo de carga laboral.
   */
  private readonly PESOS_PRIORIDAD: Record<string, number> = {
    ALTA: 3,
    MEDIA: 2,
    BAJA: 1,
  };

  /**
   * Estados activos que computan para la carga de trabajo del analista.
   */
  private readonly ESTADOS_ACTIVOS: EstadoSolicitud[] = [
    EstadoSolicitud.SOLICITADO,
    EstadoSolicitud.EN_VERIFICACION,
    EstadoSolicitud.VERIFICADA,
  ];

  /**
   * Obtiene el límite de saturación desde parametros_globales.
   * Si no existe, retorna 12 (valor por defecto).
   */
  private async obtenerLimiteSaturacion(): Promise<number> {
    try {
      const row = await this.dataSource.query(
        `SELECT valor FROM travel_expenses.parametros_globales WHERE clave = $1 LIMIT 1`,
        ['LIMITE_CARGA_SATURACION'],
      );
      const valor = row?.[0]?.valor;
      if (valor != null) {
        const num = parseInt(valor, 10);
        if (!isNaN(num) && num > 0) {
          return num;
        }
      }
    } catch (error) {
      this.logger.warn(
        '[assignments] No se pudo leer LIMITE_CARGA_SATURACION, usando default 12',
      );
    }
    return 12;
  }

  /**
   * Calcula el color del semáforo según el puntaje acumulado.
   * - VERDE: 0 a 5
   * - AMARILLO: 6 hasta el límite de saturación
   * - ROJO: mayor al límite de saturación
   */
  private calcularColorSemafoto(
    puntaje: number,
    limiteSaturacion: number,
  ): string {
    if (puntaje <= 5) {
      return 'VERDE';
    }
    if (puntaje <= limiteSaturacion) {
      return 'AMARILLO';
    }
    return 'ROJO';
  }

  /**
   * RF-REC-002 — Obtiene el tablero de carga de analistas.
   *
   * Para cada analista activo del módulo calcula:
   *   - Asignaciones activas por prioridad (Alta/Media/Baja)
   *   - Puntaje ponderado total
   *   - Color del semáforo
   */
  async obtenerCargaAnalistas(solicitudId?: string): Promise<
    Array<{
      usuarioId: string;
      nombreCompleto: string;
      username: string;
      identificacion: string | null;
      asignacionesActivas: number;
      altas: number;
      medias: number;
      bajas: number;
      puntajeTotal: number;
      colorSemaforo: string;
    }>
  > {
    const limiteSaturacion = await this.obtenerLimiteSaturacion();

    let dependenciaFiltro: number | null = null;
    if (solicitudId) {
      const solicitud = await this.solicitudRepo.findOne({
        where: { id: solicitudId },
        relations: ['comisionado'],
      });
      if (solicitud?.comisionado?.idDependencia) {
        dependenciaFiltro = solicitud.comisionado.idDependencia;
      }
    }

    const analistas = await this.analistaRepo.find({
      order: { nombreCompleto: 'ASC' },
    });

    let analistasFiltrados = dependenciaFiltro
      ? analistas.filter((a) => a.dependenciaId === dependenciaFiltro)
      : analistas;

    // Si la dependencia no tiene analistas asignados específicamente, ofrecer todos los analistas activos
    if (analistasFiltrados.length === 0) {
      analistasFiltrados = analistas;
    }

    const solicitudesActivas = await this.dataSource.query(
      `
      SELECT
        s.analista_asignado_id AS analista_id,
        s.prioridad,
        COUNT(*)::int AS cantidad
      FROM travel_expenses.solicitudes_comision s
      WHERE s.analista_asignado_id IS NOT NULL
        AND s.estado_solicitud = ANY($1)
      GROUP BY s.analista_asignado_id, s.prioridad
      `,
      [this.ESTADOS_ACTIVOS],
    );

    const cargaPorAnalista = new Map<
      string,
      { altas: number; medias: number; bajas: number; puntaje: number }
    >();
    for (const row of solicitudesActivas) {
      const analistaId = row.analista_id;
      const prioridad = (row.prioridad || 'BAJA').toUpperCase();
      const cantidad = row.cantidad || 0;
      const peso = this.PESOS_PRIORIDAD[prioridad] || 1;

      if (!cargaPorAnalista.has(analistaId)) {
        cargaPorAnalista.set(analistaId, {
          altas: 0,
          medias: 0,
          bajas: 0,
          puntaje: 0,
        });
      }
      const entry = cargaPorAnalista.get(analistaId)!;

      if (prioridad === 'ALTA') entry.altas += cantidad;
      else if (prioridad === 'MEDIA') entry.medias += cantidad;
      else entry.bajas += cantidad;

      entry.puntaje += cantidad * peso;
    }

    return analistasFiltrados.map((a) => {
      const carga = cargaPorAnalista.get(a.usuarioId) || {
        altas: 0,
        medias: 0,
        bajas: 0,
        puntaje: 0,
      };
      const colorSemaforo = this.calcularColorSemafoto(
        carga.puntaje,
        limiteSaturacion,
      );

      return {
        usuarioId: a.usuarioId,
        nombreCompleto: a.nombreCompleto,
        username: a.username,
        identificacion: a.identificacion,
        asignacionesActivas: carga.altas + carga.medias + carga.bajas,
        altas: carga.altas,
        medias: carga.medias,
        bajas: carga.bajas,
        puntajeTotal: carga.puntaje,
        colorSemaforo,
      };
    });
  }

  /**
   * RF-REC-002 — Asigna una solicitud a un analista.
   *
   * Flujo transaccional:
   *   1. Bloquea la fila de la solicitud (SELECT ... FOR UPDATE).
   *   2. Valida que la solicitud esté en estado SOLICITADO.
   *   3. Actualiza analista_asignado_id.
   *   4. Transiciona el estado a EN_VERIFICACION.
   *   5. Registra la novedad en solicitudes_historial_estados.
   */
  async asignarAnalista(
    solicitudId: string,
    analistaId: string,
    secretarioId: string,
  ): Promise<{
    solicitud: SolicitudComisionEntity;
    historial: SolicitudHistorialEstadoEntity;
  }> {
    if (!solicitudId || !analistaId || !secretarioId) {
      throw new BadRequestException(
        'solicitudId, analistaId y secretarioId son obligatorios.',
      );
    }

    const result = await this.dataSource.transaction(async (manager) => {
      // 1. Bloquear la fila de la solicitud (pessimistic lock)
      const solicitud = await manager
        .getRepository(SolicitudComisionEntity)
        .createQueryBuilder('s')
        .setLock('pessimistic_write')
        .where('s.id = :id', { id: solicitudId })
        .getOne();

      if (!solicitud) {
        throw new NotFoundException(`Solicitud ${solicitudId} no encontrada.`);
      }

      // 2. Validar estado actual
      const ESTADOS_ASIGNABLES = [
        EstadoSolicitud.SOLICITADO,
        EstadoSolicitud.EXTEMPORANEA,
      ];
      if (!ESTADOS_ASIGNABLES.includes(solicitud.estadoSolicitud)) {
        throw new BadRequestException(
          `Solo se pueden asignar solicitudes en estado SOLICITADO o EXTEMPORANEA. Estado actual: ${solicitud.estadoSolicitud}`,
        );
      }

      // 3. Validar que el analista exista en el módulo
      const analista = await manager
        .getRepository(AnalistaEntity)
        .createQueryBuilder('a')
        .where('a.usuario_id = :id', { id: analistaId })
        .getOne();

      if (!analista) {
        throw new BadRequestException(
          `El analista ${analistaId} no existe en el módulo de viáticos.`,
        );
      }

      const estadoAnterior = solicitud.estadoSolicitud;

      // 4. Actualizar solicitud
      solicitud.analistaAsignadoId = analistaId;
      solicitud.estadoSolicitud = EstadoSolicitud.EN_VERIFICACION;

      const savedSolicitud = await manager
        .getRepository(SolicitudComisionEntity)
        .save(solicitud);

      // 5. Registrar en historial de estados
      const historial = manager
        .getRepository(SolicitudHistorialEstadoEntity)
        .create({
          solicitudId: solicitud.id,
          estadoAnterior,
          estadoNuevo: EstadoSolicitud.EN_VERIFICACION,
          usuarioId: secretarioId,
          comentarios: `Asignada a analista ${analista.username}`,
        });

      const savedHistorial = await manager
        .getRepository(SolicitudHistorialEstadoEntity)
        .save(historial);

      this.logger.log(
        `[assignments] Solicitud ${solicitud.consecutivoUnico} asignada a ${analista.nombreCompleto} (${analista.username}) por secretario ${secretarioId}`,
      );

      return { solicitud: savedSolicitud, historial: savedHistorial };
    });

    // Despacho de notificación in-app y correo institucional al analista individual asignado
    try {
      const sol = result.solicitud;
      const consecutivo = sol.consecutivoUnico || sol.id;
      const destino = `${sol.destinoCiudad || ''}${sol.destinoDepartamento ? ` (${sol.destinoDepartamento})` : ''}`.trim();
      const fechaIni = sol.fechaInicio ? new Date(sol.fechaInicio).toISOString().split('T')[0] : '';
      const fechaFn = sol.fechaFin ? new Date(sol.fechaFin).toISOString().split('T')[0] : '';
      const fechasStr = fechaIni && fechaFn ? `${fechaIni} al ${fechaFn}` : fechaIni || fechaFn || 'Por definir';

      await this.notificationClient.notifyUser(
        analistaId,
        {
          tipo_notificacion: 'VIATICOS_ASIGNACION_ANALISTA',
          titulo: `Comisión asignada para verificación: ${consecutivo}`,
          mensaje: `Se le ha asignado la comisión ${consecutivo} con destino a ${destino} para verificación técnica y documental.`,
          descripcion_corta: `Asignada · ${consecutivo}`,
          icono: 'UserCheck',
          color: '#003DA5',
          prioridad: 'Alta',
          categoria: 'VIATICOS',
          tiene_accion: true,
          texto_boton_accion: 'Ver comisión',
          url_accion: '/viaticos',
          datos_adicionales: {
            solicitudId: sol.id,
            consecutivoUnico: consecutivo,
            analistaId,
            secretarioId,
          },
        },
        {
          subject: `[Viáticos ESAP] Comisión Asignada para Verificación: ${consecutivo}`,
          html: buildTravelExpenseEmailHtml({
            destinatarioNombre: 'Analista de Viáticos',
            tituloHeader: 'ESAP — Gestión de Viáticos y Comisiones',
            subtituloHeader: 'Asignación de Expediente para Verificación Técnica',
            mensajePrincipal: `Se le ha asignado formalmente una comisión de servicios para que proceda con su revisión técnica, validación de soportes y liquidación:`,
            consecutivo,
            destino,
            fechas: fechasStr,
            nuevoEstado: 'EN VERIFICACIÓN',
            tipoNovedad: 'INFO',
            textoBoton: 'Revisar Solicitud',
          }),
          text: `Se le ha asignado la comisión ${consecutivo} con destino a ${destino} para verificación técnica en la plataforma de viáticos.`,
        },
      );
    } catch (err: any) {
      this.logger.warn(
        `[assignments] No se pudo despachar notificación de asignación a analista ${analistaId}: ${err?.message}`,
      );
    }

    return result;
  }

  /**
   * RF-REC-002 — Obtiene las solicitudes asignadas al analista autenticado.
   *
   * Filtra por analista_id y estados activos: SOLICITADO, EN_VERIFICACION, VERIFICADA.
   */
  async obtenerSolicitudesAsignadas(
    analistaId: string,
  ): Promise<SolicitudComisionEntity[]> {
    if (!analistaId) {
      throw new BadRequestException('analistaId es obligatorio.');
    }

    const estados = [
      EstadoSolicitud.SOLICITADO,
      EstadoSolicitud.EN_VERIFICACION,
      EstadoSolicitud.EXTEMPORANEA,
      EstadoSolicitud.VERIFICADA,
      EstadoSolicitud.SOLICITADA_SIIF,
      EstadoSolicitud.DEVUELTA,
    ];

    return this.dataSource.getRepository(SolicitudComisionEntity).find({
      where: {
        analistaAsignadoId: analistaId,
        estadoSolicitud: In(estados),
      },
      relations: ['comisionado', 'documentosSoporte'],
      order: { creadoEn: 'DESC' },
    });
  }
}
