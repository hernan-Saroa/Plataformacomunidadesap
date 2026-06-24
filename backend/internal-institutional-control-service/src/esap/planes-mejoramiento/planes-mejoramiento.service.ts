import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  PlanMejoramiento,
  PlanMejoramientoEstado,
} from './entities/plan-mejoramiento.entity';
import {
  AccionCorrectiva,
  AccionCorrectivaEstado,
  AccionCorrectivaTipo,
} from './entities/accion-correctiva.entity';
import { EvidenciaAccion, EstadoValidacionEvidencia } from './entities/evidencia-accion.entity';
import { AlertaPlan, TipoAlertaPlan } from './entities/alerta-plan.entity';
import { CierrePlan } from './entities/cierre-plan.entity';
import { SeguimientoPlan } from './entities/seguimiento-plan.entity';
import { SeguimientoTrimestral } from './entities/seguimiento-trimestral.entity';
import { RegistroSeguimiento } from './entities/registro-seguimiento.entity';
import { EventoTimeline, TipoEventoTimeline } from './entities/evento-timeline.entity';
import { CreatePlanMejoramientoDto } from './dto/create-plan-mejoramiento.dto';
import { UpdatePlanMejoramientoDto } from './dto/update-plan-mejoramiento.dto';
import { CreateAccionDto } from './dto/create-accion.dto';
import { UpdateAccionDto } from './dto/update-accion.dto';
import { RegistrarAvanceDto } from './dto/registrar-avance.dto';
import { CreateRegistroSeguimientoDto } from './dto/create-registro-seguimiento.dto';
import { CreateEventoTimelineDto } from './dto/create-evento-timeline.dto';
import { Hallazgo } from '../hallazgos/entities/hallazgo.entity';
import { Auditoria } from '../auditorias/entities/auditoria.entity';
import { Aprobacion, AprobacionTipo, AprobacionEstado, AprobacionPrioridad } from '../aprobaciones/entities/aprobacion.entity';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { TipoNotificacion, PrioridadNotificacion, CanalNotificacion } from '../notificaciones/entities/notificacion.entity';
import { PlanMejoramientoRol4TareaSyncService } from './plan-mejoramiento-rol4-tarea-sync.service';
import { calcularCumplimiento, calcularEfectividad, colorSemaforo } from './evaluacion.utils';

@Injectable()
export class PlanesMejoramientoService {
  constructor(
    @InjectRepository(PlanMejoramiento)
    private readonly planRepository: Repository<PlanMejoramiento>,
    @InjectRepository(AccionCorrectiva)
    private readonly accionRepository: Repository<AccionCorrectiva>,
    @InjectRepository(SeguimientoTrimestral)
    private readonly seguimientoRepository: Repository<SeguimientoTrimestral>,
    @InjectRepository(RegistroSeguimiento)
    private readonly registroRepository: Repository<RegistroSeguimiento>,
    @InjectRepository(EventoTimeline)
    private readonly eventoTimelineRepository: Repository<EventoTimeline>,
    @InjectRepository(Hallazgo)
    private readonly hallazgoRepository: Repository<Hallazgo>,
    @InjectRepository(Auditoria)
    private readonly auditoriaRepository: Repository<Auditoria>,
    @InjectRepository(Aprobacion)
    private readonly aprobacionRepository: Repository<Aprobacion>,
    @InjectRepository(EvidenciaAccion)
    private readonly evidenciaAccionRepository: Repository<EvidenciaAccion>,
    @InjectRepository(AlertaPlan)
    private readonly alertaPlanRepository: Repository<AlertaPlan>,
    @InjectRepository(CierrePlan)
    private readonly cierrePlanRepository: Repository<CierrePlan>,
    @InjectRepository(SeguimientoPlan)
    private readonly seguimientoPlanRepository: Repository<SeguimientoPlan>,
    private readonly notificacionesService: NotificacionesService,
    private readonly dataSource: DataSource,
    private readonly rol4TareaSync: PlanMejoramientoRol4TareaSyncService,
  ) {}

  /**
   * Backfill: sincroniza tareas Rol 4 para todos los planes en seguimiento de una vigencia.
   */
  async sincronizarTareasRol4Vigencia(
    vigencia: number,
  ): Promise<{ vigencia: number; sincronizados: number }> {
    const sincronizados = await this.rol4TareaSync.sincronizarVigencia(vigencia);
    return { vigencia, sincronizados };
  }

  /** Sincroniza tarea pendiente en Rol 4 (actividad planes de mejoramiento). */
  private async syncTareaRol4(planId: string): Promise<void> {
    const plan = await this.planRepository.findOne({
      where: { id: planId },
      relations: ['auditoria', 'acciones'],
    });
    if (!plan) return;

    const acciones = plan.acciones ?? [];
    const estadoCalculado = this.determinarEstadoReal(
      plan,
      acciones.length,
      this.promedioPorcentajeAvanceAcciones(acciones),
    );
    // Mantener borrador/revisión del registro; el cálculo Kanban no debe ocultar el plan recién creado.
    const estadoParaSync =
      plan.estado === PlanMejoramientoEstado.BORRADOR ||
      plan.estado === PlanMejoramientoEstado.REVISION
        ? plan.estado
        : estadoCalculado;
    await this.rol4TareaSync.sincronizarDesdePlan(plan, estadoParaSync);
  }

  private normalizarTexto(valor?: string | null): string {
    return String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private async validarCreacionSoloEnComunicacion(auditoriaId?: string | null): Promise<void> {
    if (!auditoriaId) return;

    const auditoria = await this.auditoriaRepository.findOne({
      where: { id: auditoriaId },
      select: ['id', 'estadoKanban', 'fase'],
    });

    if (!auditoria) {
      throw new NotFoundException(`Auditoría con ID ${auditoriaId} no encontrada`);
    }

    const estadoKanban = this.normalizarTexto(String(auditoria.estadoKanban || ''));
    const fase = this.normalizarTexto(String(auditoria.fase || ''));
    const faseValida = 
      estadoKanban === 'comunicacion' || fase === 'comunicacion' ||
      estadoKanban === 'seguimiento' || fase === 'seguimiento' ||
      estadoKanban === 'finalizada' || fase === 'finalizada';

    if (!faseValida) {
      throw new BadRequestException('El Plan de Mejoramiento solo puede crearse cuando la auditoría está en etapa Comunicación, Seguimiento o Finalizada');
    }
  }

  /**
   * Parsea una fecha string (YYYY-MM-DD) a Date sin conversión de zona horaria
   * Esto evita que las fechas se desplacen por diferencias de zona horaria
   */
  private parseDateOnly(dateString: string): Date {
    // Si la fecha viene en formato YYYY-MM-DD, parsearla manualmente
    // para evitar conversión de zona horaria
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Los meses en JS son 0-indexed
      const day = parseInt(parts[2], 10);
      // Crear fecha en hora local (no UTC) para evitar desplazamientos
      return new Date(year, month, day);
    }
    // Fallback: usar new Date normal si el formato no es el esperado
    return new Date(dateString);
  }

  /**
   * Serializa una fecha Date o string a string YYYY-MM-DD para evitar problemas de zona horaria
   */
  private serializeDate(date: Date | string | undefined | null): string | undefined {
    if (!date) return undefined;
    
    // Si ya es un string en formato YYYY-MM-DD, devolverlo directamente
    if (typeof date === 'string') {
      // Si viene como ISO string (ej: "2024-12-29T00:00:00.000Z"), extraer solo la fecha
      const dateOnly = date.split('T')[0];
      // Validar formato YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
        return dateOnly;
      }
      // Si no tiene el formato esperado, intentar parsearlo
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return date; // Fallback: devolver el string original
    }
    
    // Si es un objeto Date
    if (date instanceof Date && !isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Fallback: convertir a string y extraer fecha
    const dateStr = String(date);
    const dateOnly = dateStr.split('T')[0];
    return dateOnly || dateStr;
  }

  /**
   * Vigencia para nomenclatura PM-{vigencia}-### (desde auditoría vinculada).
   */
  private async resolverVigenciaCodigoPlan(
    auditoriaId: string | null,
  ): Promise<number> {
    if (!auditoriaId) {
      return new Date().getFullYear();
    }
    const aud = await this.auditoriaRepository.findOne({
      where: { id: auditoriaId },
      select: ['id', 'planAnualVigencia', 'fechaInicio'],
    });
    if (aud?.planAnualVigencia != null && !Number.isNaN(Number(aud.planAnualVigencia))) {
      return Number(aud.planAnualVigencia);
    }
    if (aud?.fechaInicio) {
      const y = new Date(aud.fechaInicio).getFullYear();
      if (!Number.isNaN(y)) return y;
    }
    return new Date().getFullYear();
  }

  /**
   * Genera un código único para el plan en formato PM-{vigencia}-###
   */
  private async generarCodigo(vigencia?: number): Promise<string> {
    const year =
      vigencia != null && !Number.isNaN(Number(vigencia))
        ? Number(vigencia)
        : new Date().getFullYear();
    const prefix = `PM-${year}-`;

    const ultimo = await this.planRepository
      .createQueryBuilder('plan')
      .where('plan.codigo LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('plan.codigo', 'DESC')
      .getOne();

    let siguiente = 1;
    if (ultimo?.codigo) {
      const numero = parseInt(ultimo.codigo.split('-')[2], 10);
      if (!isNaN(numero)) {
        siguiente = numero + 1;
      }
    }

    return `${prefix}${String(siguiente).padStart(3, '0')}`;
  }

  /**
   * Calcula el puntaje de cumplimiento según la fórmula del Excel
   * IF(implementadas >= programadas, 2, IF(implementadas >= 1, 1, 0))
   */
  private calcularPuntajeCumplimiento(implementadas: number, programadas: number): 0 | 1 | 2 {
    if (implementadas >= programadas) return 2;
    if (implementadas >= 1) return 1;
    return 0;
  }

  /**
   * Calcula el puntaje de efectividad según la fórmula del Excel
   * Según documentación:
   * - 2 puntos: Controles efectivos y hallazgo no se repite (controles="SI" y repeticion="NO")
   * - 1 punto: Controles parciales o diferentes a repetición
   * - 0 puntos: El hallazgo se repite (controles inefectivos)
   */
  private calcularPuntajeEfectividad(
    controles: 'SI' | 'NO' | 'PARCIAL',
    repeticion: 'SI' | 'NO',
  ): 0 | 1 | 2 {
    // Si el hallazgo se repite, siempre es 0 puntos
    if (repeticion === 'SI') return 0;
    
    // Si controles son efectivos (SI) y no se repite (NO), es 2 puntos
    if (controles === 'SI' && repeticion === 'NO') return 2;
    
    // Si controles son parciales, es 1 punto
    if (controles === 'PARCIAL') return 1;
    
    // Si no hay controles (NO) pero no se repite, es 1 punto
    if (controles === 'NO' && repeticion === 'NO') return 1;
    
    // Por defecto, 1 punto
    return 1;
  }

  /**
   * Obtiene todos los planes de mejoramiento con filtros opcionales
   * Asegura que el hallazgo se cargue completamente con todos sus campos
   */
  async findAll(filters?: {
    estado?: string;
    area?: string;
    planAnualVigencia?: number;
  }): Promise<PlanMejoramiento[]> {
    try {
      // Primero intentar una consulta simple sin relaciones complejas
      const query = this.planRepository
        .createQueryBuilder('plan')
        .leftJoinAndSelect('plan.hallazgo', 'hallazgo')
        .leftJoinAndSelect('plan.auditoria', 'auditoria')
        .leftJoinAndSelect('plan.acciones', 'acciones')
        .leftJoinAndSelect('plan.seguimientos', 'seguimientos')
        .leftJoinAndSelect('seguimientos.registros', 'registros')
        .orderBy('plan.updatedAt', 'DESC')
        .addOrderBy('plan.createdAt', 'DESC');

      if (filters?.estado) {
        query.andWhere('plan.estado = :estado', { estado: filters.estado });
      }

      if (filters?.area) {
        query.andWhere('plan.areaResponsable ILIKE :area', { area: `%${filters.area}%` });
      }

      if (filters?.planAnualVigencia != null && !Number.isNaN(Number(filters.planAnualVigencia))) {
        const v = Number(filters.planAnualVigencia);
        query.andWhere(
          `(
            auditoria.planAnualVigencia = :planAnualVigencia
            OR (
              auditoria.planAnualVigencia IS NULL
              AND auditoria.fechaInicio IS NOT NULL
              AND EXTRACT(YEAR FROM auditoria.fechaInicio) = :planAnualVigencia
            )
            OR (
              plan.auditoriaId IS NULL
              AND plan.codigo LIKE :codigoVigenciaPat
            )
          )`,
          { planAnualVigencia: v, codigoVigenciaPat: `PM-${v}-%` },
        );
      }

      const results = await query.getMany();
      
      // Cargar la relación auditoriaEntity del hallazgo por separado si es necesario
      for (const plan of results) {
        if (plan.hallazgo?.auditoriaId) {
          try {
            plan.hallazgo.auditoriaEntity = await this.auditoriaRepository.findOne({
              where: { id: plan.hallazgo.auditoriaId },
            }) || null;
          } catch (err) {
            console.error('Error al cargar auditoriaEntity del hallazgo:', err);
            plan.hallazgo.auditoriaEntity = null;
          }
        }
      }

      // Serializar fechas para evitar problemas de zona horaria
      return results.map(plan => this.serializePlanMejoramiento(plan));
    } catch (error) {
      console.error('Error en findAll planes-mejoramiento:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  /**
   * Determina el estado real/actual de un plan basado en sus acciones, fechas y avance.
   * Esto garantiza una distribución automática y coherente en el Kanban.
   */
  private determinarEstadoReal(plan: PlanMejoramiento, totalAcciones: number, porcentajeAvance: number): PlanMejoramientoEstado {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaLimite = new Date(plan.fechaLimite);
    fechaLimite.setHours(0, 0, 0, 0);

    const esVencido = fechaLimite < hoy && porcentajeAvance < 100;

    // 1. Si está completado al 100%, el estado es siempre COMPLETADO
    if (porcentajeAvance >= 100) {
      return PlanMejoramientoEstado.COMPLETADO;
    }

    // 2. Si la fecha límite ya pasó y no está completado, es VENCIDO (Con Retraso en FE)
    // Comentado temporalmente para permitir seguir con el plan de mejoramiento independientemente de la fecha
    // if (esVencido) {
    //   return PlanMejoramientoEstado.VENCIDO;
    // }

    // 3. Estados de flujo de aprobación
    if (plan.estado === PlanMejoramientoEstado.RECHAZADO) {
      return PlanMejoramientoEstado.RECHAZADO;
    }

    if (plan.estado === PlanMejoramientoEstado.REVISION) {
      return PlanMejoramientoEstado.REVISION;
    }

    // 4. Si no tiene acciones, está en FORMULACION (Borrador)
    if (totalAcciones === 0) {
      return PlanMejoramientoEstado.BORRADOR;
    }

    // 5. Si está aprobado y tiene acciones
    if (plan.estado === PlanMejoramientoEstado.APROBADO || plan.estado === PlanMejoramientoEstado.EN_EJECUCION) {
      // Si ya tiene algún avance reportado, está en ejecución
      if (porcentajeAvance > 0) {
        return PlanMejoramientoEstado.EN_EJECUCION;
      }
      // Si no tiene avance pero ya fue aprobado, sigue en APROBADO
      return PlanMejoramientoEstado.APROBADO;
    }

    // Por defecto, mantener el estado que tenga en DB o caer a BORRADOR
    return plan.estado || PlanMejoramientoEstado.BORRADOR;
  }

  /**
   * Cuenta acciones terminadas (misma lógica que el Kanban / frontend)
   */
  private contarAccionesCompletadas(acciones: AccionCorrectiva[]): number {
    if (!acciones?.length) return 0;
    return acciones.filter((a) => {
      const p = Number(a.porcentajeAvance ?? 0);
      if (Number.isFinite(p) && p >= 100) return true;
      const e = String(a.estado || '')
        .toLowerCase()
        .replace(/-/g, '_');
      return e === 'completada' || e === 'implementada';
    }).length;
  }

  /**
   * Hallazgos cubiertos por el plan: cabecera del plan o IDs distintos en acciones o total en auditoría
   */
  private contarHallazgosParaKanban(plan: PlanMejoramiento, accionesRaw: AccionCorrectiva[]): number {
    if (plan.hallazgoId || plan.hallazgo) return 1;
    const ids = new Set(
      accionesRaw
        .map((a) => a.hallazgoId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    );
    if (ids.size > 0) return ids.size;
    const aud = plan.auditoria as { hallazgos?: number } | undefined;
    const n = Number(aud?.hallazgos);
    if (Number.isFinite(n) && n > 0) return n;
    return 0;
  }

  /** Progreso del plan = promedio del % de avance reportado en cada acción (0–100) */
  private promedioPorcentajeAvanceAcciones(accionesRaw: AccionCorrectiva[]): number {
    if (!accionesRaw.length) return 0;
    const sum = accionesRaw.reduce((s, a) => {
      const p = Math.min(100, Math.max(0, Number(a.porcentajeAvance ?? 0)));
      return s + (Number.isFinite(p) ? p : 0);
    }, 0);
    return Math.round(sum / accionesRaw.length);
  }

  /**
   * Determina el estado real de una acción basado en su progreso y fecha de fin
   */
  private determinarEstadoAccionReal(accion: AccionCorrectiva): AccionCorrectivaEstado {
    const progreso = Math.min(100, Math.max(0, Number(accion.porcentajeAvance ?? 0)));
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaFin = accion.fechaFin ? new Date(accion.fechaFin) : null;

    // Si ya está completada por porcentaje
    if (progreso >= 100) {
      return AccionCorrectivaEstado.COMPLETADA;
    }

    // Si está vencida (fecha fin menor a hoy)
    if (fechaFin && fechaFin < hoy) {
      return AccionCorrectivaEstado.VENCIDA;
    }

    // Si tiene progreso pero no está al 100%
    if (progreso > 0) {
      return AccionCorrectivaEstado.EN_PROGRESO;
    }

    // Por defecto, programada
    return AccionCorrectivaEstado.PROGRAMADA;
  }

  /**
   * Serializa un plan de mejoramiento para la respuesta JSON
   * Evita referencias circulares (accion.plan → plan) y expone totales para listados/Kanban
   */
  private serializePlanMejoramiento(plan: PlanMejoramiento): any {
    const accionesRaw = plan.acciones ?? [];
    const totalAcciones = accionesRaw.length;
    const accionesCompletadas = this.contarAccionesCompletadas(accionesRaw);
    const porcentajeAvance = this.promedioPorcentajeAvanceAcciones(accionesRaw);
    const totalHallazgos = this.contarHallazgosParaKanban(plan, accionesRaw);

    // Determinar el estado automático basado en las condiciones actuales
    const estadoCalculado = this.determinarEstadoReal(plan, totalAcciones, porcentajeAvance);

    const acciones = accionesRaw.map((accion) => {
      const { plan: _omitPlan, ...rest } = accion as AccionCorrectiva & { plan?: PlanMejoramiento };
      const estadoCalculado = this.determinarEstadoAccionReal(accion);
      return {
        ...rest,
        estado: estadoCalculado, // Usar el estado calculado dinámicamente
        fechaInicio: this.serializeDate(accion.fechaInicio),
        fechaFin: this.serializeDate(accion.fechaFin),
      };
    });

    const seguimientos = plan.seguimientos?.map((seguimiento) => {
      const { plan: _omitPlan, ...rest } = seguimiento as SeguimientoTrimestral & {
        plan?: PlanMejoramiento;
      };
      return {
        ...rest,
        fechaInicio: this.serializeDate(seguimiento.fechaInicio),
        fechaFin: this.serializeDate(seguimiento.fechaFin),
        fechaSeguimiento: this.serializeDate(seguimiento.fechaSeguimiento),
      };
    });

    return {
      ...plan,
      estado: estadoCalculado, // Usar el estado calculado dinámicamente
      fechaLimite: this.serializeDate(plan.fechaLimite),
      fechaAprobacion: this.serializeDate(plan.fechaAprobacion),
      acciones,
      seguimientos,
      totalHallazgos,
      totalAcciones,
      accionesCompletadas,
      porcentajeAvance,
    };
  }

  /**
   * Obtiene un plan por ID
   */
  async findOne(id: string): Promise<PlanMejoramiento> {
    const plan = await this.planRepository.findOne({
      where: { id },
      relations: ['hallazgo', 'hallazgo.auditoriaEntity', 'auditoria', 'acciones', 'seguimientos', 'seguimientos.registros'],
    });

    if (!plan) {
      throw new NotFoundException(`Plan de mejoramiento con ID ${id} no encontrado`);
    }

    // Serializar fechas para evitar problemas de zona horaria
    return this.serializePlanMejoramiento(plan) as any;
  }

  /**
   * Obtiene todos los planes de mejoramiento vinculados a una auditoría (para verificación OCI / cierre)
   */
  async findByAuditoriaId(auditoriaId: string): Promise<PlanMejoramiento[]> {
    const plans = await this.planRepository.find({
      where: { auditoriaId },
      relations: ['acciones', 'hallazgo', 'auditoria'],
      order: { createdAt: 'DESC' },
    });
    return plans.map((plan) => this.serializePlanMejoramiento(plan) as any);
  }

  /**
   * Registra la verificación OCI de una acción (inmutable una vez registrada)
   */
  async registrarVerificacionOci(
    planId: string,
    accionId: string,
    dto: { estadoVerificacionOci: string; evidenciaVerificada: string; observacionOci?: string },
    verificadaPorId?: number,
  ): Promise<AccionCorrectiva> {
    await this.findOne(planId);
    const accion = await this.accionRepository.findOne({
      where: { id: accionId, planId },
    });
    if (!accion) {
      throw new NotFoundException(`Acción con ID ${accionId} no encontrada en el plan`);
    }
    const estadoActual = accion.estadoVerificacionOci ?? 'sin_verificar';
    if (estadoActual !== 'sin_verificar' && estadoActual !== null && estadoActual !== '') {
      throw new BadRequestException('La verificación OCI ya fue registrada para esta acción y no puede modificarse');
    }
    accion.estadoVerificacionOci = dto.estadoVerificacionOci;
    accion.evidenciaVerificada = dto.evidenciaVerificada;
    accion.observacionOci = dto.observacionOci ?? null;
    accion.fechaVerificacionOci = new Date();
    accion.verificadaPorId = verificadaPorId ?? null;
    const saved = await this.accionRepository.save(accion);
    return {
      ...saved,
      fechaInicio: this.serializeDate(saved.fechaInicio),
      fechaFin: this.serializeDate(saved.fechaFin),
    } as any;
  }

  /**
   * Obtiene un plan por hallazgo
   */
  async findByHallazgo(hallazgoIdOrCodigo: string): Promise<PlanMejoramiento | null> {
    // Verificar si es un UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUUID = uuidRegex.test(hallazgoIdOrCodigo);

    let hallazgoId: string | null = null;

    if (isUUID) {
      // Si es un UUID, usarlo directamente
      hallazgoId = hallazgoIdOrCodigo;
    } else {
      // Si no es un UUID, buscar el hallazgo por código
      const hallazgo = await this.hallazgoRepository.findOne({
        where: { codigo: hallazgoIdOrCodigo },
      });
      if (!hallazgo) {
        return null;
      }
      hallazgoId = hallazgo.id;
    }

    const plan = await this.planRepository.findOne({
      where: { hallazgoId },
      relations: ['hallazgo', 'auditoria', 'acciones', 'seguimientos'],
      order: { createdAt: 'DESC' },
    });
    
    if (!plan) {
      return null;
    }
    
    // Serializar fechas para evitar problemas de zona horaria
    return this.serializePlanMejoramiento(plan) as any;
  }

  /**
   * Crea un nuevo plan de mejoramiento
   */
  async create(createDto: CreatePlanMejoramientoDto): Promise<PlanMejoramiento> {
    // Resolver hallazgo
    let hallazgoId: string | null = null;
    
    if (createDto.hallazgoId) {
      // Verificar si es un UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUUID = uuidRegex.test(createDto.hallazgoId);
      
      if (isUUID) {
        // Si es un UUID, usarlo directamente
        hallazgoId = createDto.hallazgoId;
        console.log(`[PlanesMejoramientoService] HallazgoId es UUID, usando directamente: ${hallazgoId}`);
      } else {
        // Si no es un UUID, buscar el hallazgo por código
        console.log(`[PlanesMejoramientoService] Buscando hallazgo por código: "${createDto.hallazgoId}"`);
        const hallazgo = await this.hallazgoRepository.findOne({
          where: { codigo: createDto.hallazgoId },
        });
        if (hallazgo) {
          hallazgoId = hallazgo.id;
          console.log(`[PlanesMejoramientoService] Hallazgo encontrado: ${hallazgo.id} (código: ${hallazgo.codigo})`);
        } else {
          console.warn(`[PlanesMejoramientoService] No se encontró hallazgo con código: "${createDto.hallazgoId}"`);
        }
      }
    } else if (createDto.hallazgoCodigo) {
      // Si se proporciona hallazgoCodigo, buscar por código
      console.log(`[PlanesMejoramientoService] Buscando hallazgo por código (hallazgoCodigo): "${createDto.hallazgoCodigo}"`);
      const hallazgo = await this.hallazgoRepository.findOne({
        where: { codigo: createDto.hallazgoCodigo },
      });
      if (hallazgo) {
        hallazgoId = hallazgo.id;
        console.log(`[PlanesMejoramientoService] Hallazgo encontrado: ${hallazgo.id} (código: ${hallazgo.codigo})`);
      } else {
        console.warn(`[PlanesMejoramientoService] No se encontró hallazgo con código: "${createDto.hallazgoCodigo}"`);
      }
    }

    // Resolver auditoría
    let auditoriaId: string | null = createDto.auditoriaId || null;
    if (hallazgoId) {
      const hallazgo = await this.hallazgoRepository.findOne({
        where: { id: hallazgoId },
        relations: ['auditoriaEntity'],
      });
      if (hallazgo?.auditoriaEntity) {
        auditoriaId = hallazgo.auditoriaEntity.id;
      }
    }

    await this.validarCreacionSoloEnComunicacion(auditoriaId);

    if (auditoriaId) {
      const planExistente = await this.planRepository.findOne({
        where: { auditoriaId },
        select: ['id', 'codigo'],
      });
      if (planExistente) {
        throw new BadRequestException(
          `Ya existe el plan de mejoramiento ${planExistente.codigo} para esta auditoría`,
        );
      }
    }

    const vigenciaCodigo = await this.resolverVigenciaCodigoPlan(auditoriaId);
    const codigo = await this.generarCodigo(vigenciaCodigo);

    // ── Auto-populate responsableImplementacion from auditoría ownership ──
    let responsableImpl = createDto.responsableImplementacion || '';
    if (!responsableImpl && auditoriaId) {
      try {
        const aud = await this.dataSource.query(
          'SELECT responsable_area_email FROM control_interno.auditoria WHERE id = $1',
          [auditoriaId],
        );
        if (aud?.[0]?.responsable_area_email) {
          responsableImpl = aud[0].responsable_area_email;
          console.log(`[PlanesMejoramientoService] Auto-assigned responsableImplementacion from auditoría: ${responsableImpl}`);
        }
      } catch (e: any) {
        console.warn(`[PlanesMejoramientoService] Could not resolve auditoría responsable: ${e.message}`);
      }
    }

    const plan = this.planRepository.create({
      codigo,
      titulo: createDto.titulo || `Plan de Mejoramiento ${codigo}`,
      descripcion: createDto.descripcion || '',
      objetivos: createDto.objetivos || [],
      hallazgoId,
      auditoriaId,
      areaResponsable: createDto.areaResponsable,
      responsableImplementacion: responsableImpl,
      fechaLimite: this.parseDateOnly(createDto.fechaLimite),
      estado: PlanMejoramientoEstado.BORRADOR,
    });


    const savedPlan = await this.planRepository.save(plan);

    console.log(`[PlanesMejoramientoService.create] Plan creado exitosamente: ${savedPlan.codigo} (ID: ${savedPlan.id})`);

    // Crear acciones si se proporcionaron
    if (createDto.acciones && createDto.acciones.length > 0) {
      const acciones = createDto.acciones.map((accionDto) =>
        this.accionRepository.create({
          planId: savedPlan.id,
          descripcion: accionDto.descripcion,
          tipo: (accionDto.tipo as AccionCorrectivaTipo) || AccionCorrectivaTipo.CORRECTIVA,
          responsable: accionDto.responsable,
          fechaInicio: this.parseDateOnly(accionDto.fechaInicio),
          fechaFin: this.parseDateOnly(accionDto.fechaFin),
          recursos: accionDto.recursos,
          indicador: accionDto.indicador,
          metaIndicador: accionDto.metaIndicador,
          observaciones: accionDto.observaciones,
          estado: AccionCorrectivaEstado.PROGRAMADA,
          porcentajeAvance: 0,
        }),
      );

      await this.accionRepository.save(acciones);
      console.log(`[PlanesMejoramientoService.create] ${acciones.length} acción(es) creada(s) para el plan ${savedPlan.codigo}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // REGISTRAR EVENTO EN EL TIMELINE
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      await this.registrarEvento(
        savedPlan.id,
        TipoEventoTimeline.CREACION,
        `Plan de mejoramiento ${savedPlan.codigo} creado`,
        undefined,
        createDto.responsableImplementacion || 'Sistema',
        {
          titulo: savedPlan.titulo,
          hallazgoId: hallazgoId,
          auditoriaId: auditoriaId,
          estado: savedPlan.estado,
        },
      );
    } catch (eventoError) {
      console.error('[PlanesMejoramientoService.create] Error al registrar evento:', eventoError);
    }

    // Crear notificaciones después de guardar el plan
    try {
      await this.crearNotificacionesPlanCreado(savedPlan, auditoriaId);
    } catch (notifError) {
      // No fallar la creación del plan si las notificaciones fallan
      console.error('[PlanesMejoramientoService.create] Error al crear notificaciones:', notifError);
      console.error('[PlanesMejoramientoService.create] Stack trace:', notifError?.stack);
    }

    await this.syncTareaRol4(savedPlan.id);

    const saved = await this.findOne(savedPlan.id);
    // Serializar fechas para evitar problemas de zona horaria
    return this.serializePlanMejoramiento(saved) as any;
  }

  /**
   * Actualiza un plan de mejoramiento
   */
  async update(id: string, updateDto: UpdatePlanMejoramientoDto): Promise<PlanMejoramiento> {
    const plan = await this.findOne(id);

    if (updateDto.titulo !== undefined) plan.titulo = updateDto.titulo;
    if (updateDto.descripcion !== undefined) plan.descripcion = updateDto.descripcion;
    if (updateDto.objetivos !== undefined) plan.objetivos = updateDto.objetivos;
    if (updateDto.areaResponsable !== undefined) plan.areaResponsable = updateDto.areaResponsable;
    if (updateDto.responsableImplementacion !== undefined)
      plan.responsableImplementacion = updateDto.responsableImplementacion;
      if (updateDto.fechaLimite !== undefined) plan.fechaLimite = this.parseDateOnly(updateDto.fechaLimite);
    const estadoAnterior = plan.estado;
    if (updateDto.estado !== undefined) plan.estado = updateDto.estado as PlanMejoramientoEstado;
    if (updateDto.observacionesAprobacion !== undefined)
      plan.observacionesAprobacion = updateDto.observacionesAprobacion;
    if (updateDto.motivoRechazo !== undefined) plan.motivoRechazo = updateDto.motivoRechazo;

    // Actualizar hallazgoId si se proporciona
    if (updateDto.hallazgoId !== undefined) {
      // Verificar si es un UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUUID = uuidRegex.test(updateDto.hallazgoId);
      
      let resolvedHallazgoId: string | null = null;
      
      if (isUUID) {
        // Si es un UUID, usarlo directamente
        resolvedHallazgoId = updateDto.hallazgoId;
      } else {
        // Si no es un UUID, buscar el hallazgo por código
        const hallazgo = await this.hallazgoRepository.findOne({
          where: { codigo: updateDto.hallazgoId },
        });
        resolvedHallazgoId = hallazgo?.id ?? null;
      }
      
      plan.hallazgoId = resolvedHallazgoId;
      
      // IMPORTANTE: Sincronizar auditoriaId con el hallazgo actualizado
      // Si se cambia el hallazgo, actualizar la auditoría desde el nuevo hallazgo
      if (resolvedHallazgoId) {
        const hallazgo = await this.hallazgoRepository.findOne({
          where: { id: resolvedHallazgoId },
          relations: ['auditoriaEntity'],
        });
        if (hallazgo?.auditoriaEntity) {
          plan.auditoriaId = hallazgo.auditoriaEntity.id;
        }
      }
    } else if (updateDto.hallazgoCodigo !== undefined) {
      // Si se proporciona hallazgoCodigo, buscar por código
      const hallazgo = await this.hallazgoRepository.findOne({
        where: { codigo: updateDto.hallazgoCodigo },
      });
      if (hallazgo) {
        plan.hallazgoId = hallazgo.id;
        if (hallazgo.auditoriaEntity) {
          plan.auditoriaId = hallazgo.auditoriaEntity.id;
        }
      }
    }

    // Si se proporciona auditoriaId explícitamente, usarlo (pero normalmente viene del hallazgo)
    if (updateDto.auditoriaId !== undefined) {
      plan.auditoriaId = updateDto.auditoriaId;
    } else if (plan.hallazgoId && !updateDto.hallazgoId) {
      // Si no se cambió el hallazgo pero no se proporcionó auditoriaId, sincronizar con el hallazgo actual
      const hallazgo = await this.hallazgoRepository.findOne({
        where: { id: plan.hallazgoId },
        relations: ['auditoriaEntity'],
      });
      if (hallazgo?.auditoriaEntity) {
        plan.auditoriaId = hallazgo.auditoriaEntity.id;
      }
    }

    const savedPlan = await this.planRepository.save(plan);

    // ═══════════════════════════════════════════════════════════════════════════
    // REGISTRAR EVENTO EN EL TIMELINE
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      // Determinar si hubo cambio de estado
      const cambioEstado = updateDto.estado && updateDto.estado !== estadoAnterior;
      const descripcion = cambioEstado
        ? `Plan ${savedPlan.codigo} cambió de estado: ${estadoAnterior} → ${savedPlan.estado}`
        : `Plan ${savedPlan.codigo} actualizado`;
      
      await this.registrarEvento(
        savedPlan.id,
        cambioEstado ? TipoEventoTimeline.ESTADO : TipoEventoTimeline.ACTUALIZACION,
        descripcion,
        undefined,
        updateDto.responsableImplementacion || savedPlan.responsableImplementacion || 'Sistema',
        {
          cambios: Object.keys(updateDto).filter(k => updateDto[k] !== undefined),
          estadoAnterior: cambioEstado ? estadoAnterior : undefined,
          estadoNuevo: cambioEstado ? savedPlan.estado : undefined,
        },
      );
    } catch (eventoError) {
      console.error('[PlanesMejoramientoService.update] Error al registrar evento:', eventoError);
    }

    // Si el estado es REVISION, crear una aprobación pendiente si no existe
    if (savedPlan.estado === PlanMejoramientoEstado.REVISION) {
      // Obtener el plan completo con relaciones antes de crear la aprobación
      const planCompleto = await this.findOne(savedPlan.id);
      await this.crearAprobacionPendienteParaPlan(planCompleto);
      if (estadoAnterior === PlanMejoramientoEstado.BORRADOR) {
        try {
          await this.notificarPlanEnviadoRevision(planCompleto);
        } catch (notifErr) {
          console.error('[PlanesMejoramientoService.update] Error notificando envío a revisión:', notifErr.message);
        }
      }
    }

    await this.syncTareaRol4(savedPlan.id);

    // Serializar fechas para evitar problemas de zona horaria
    return this.serializePlanMejoramiento(savedPlan) as any;
  }

  /**
   * Crea una aprobación pendiente para un plan de mejoramiento
   */
  private async crearAprobacionPendienteParaPlan(plan: PlanMejoramiento): Promise<void> {
    // Verificar si ya existe una aprobación pendiente para este plan
    const aprobacionExistente = await this.aprobacionRepository.findOne({
      where: {
        tipo: AprobacionTipo.PLAN_MEJORA,
        relacionado: plan.id,
        estado: AprobacionEstado.PENDIENTE,
      },
    });

    if (aprobacionExistente) {
      // Si ya existe, actualizar la fecha de solicitud y también territorial/sede/prioridad si están disponibles
      // Usar solo la fecha actual (sin hora) para evitar problemas de zona horaria
      const fechaActual = new Date();
      fechaActual.setHours(0, 0, 0, 0);
      aprobacionExistente.fechaSolicitud = fechaActual;
      
      // Actualizar territorial y sede si no están definidos
      if (!aprobacionExistente.territorial || !aprobacionExistente.sede) {
        const { territorial, sede } = await this.obtenerTerritorialYSede(plan);
        if (territorial) aprobacionExistente.territorial = territorial;
        if (sede) aprobacionExistente.sede = sede;
      }
      
      // Actualizar prioridad desde el hallazgo/auditoría
      const prioridad = await this.obtenerPrioridad(plan);
      aprobacionExistente.prioridad = prioridad;
      
      await this.aprobacionRepository.save(aprobacionExistente);
      return;
    }

    // Obtener territorial y sede del hallazgo/auditoría
    const { territorial, sede } = await this.obtenerTerritorialYSede(plan);
    
    // Obtener prioridad del hallazgo/auditoría
    const prioridad = await this.obtenerPrioridad(plan);

    // Crear nueva aprobación pendiente
    // Usar solo la fecha actual (sin hora) para evitar problemas de zona horaria
    const fechaActual = new Date();
    fechaActual.setHours(0, 0, 0, 0);

    // Generar código único para la aprobación
    const prefijo = 'PLAN_MEJORA'.substring(0, 10);
    const año = new Date().getFullYear();
    const count = await this.aprobacionRepository.count();
    const codigo = `APR-${prefijo}-${año}-${String(count + 1).padStart(5, '0')}`;

    const aprobacion = this.aprobacionRepository.create({
      codigo,
      tipo: AprobacionTipo.PLAN_MEJORA,
      titulo: `Aprobación de Plan de Mejoramiento: ${plan.titulo}`,
      descripcion: plan.descripcion || `Plan de mejoramiento ${plan.codigo}`,
      solicitante: plan.responsableImplementacion || 'Sistema',
      fechaSolicitud: fechaActual,
      prioridad: prioridad,
      estado: AprobacionEstado.PENDIENTE,
      relacionado: plan.id,
      area: plan.areaResponsable,
      territorial: territorial || undefined,
      sede: sede || undefined,
      documentosCount: 0,
    });

    await this.aprobacionRepository.save(aprobacion);
  }

  /**
   * Obtiene territorial y sede desde el hallazgo/auditoría del plan
   */
  private async obtenerTerritorialYSede(plan: PlanMejoramiento): Promise<{ territorial: string | null; sede: string | null }> {
    let territorial: string | null = null;
    let sede: string | null = null;

    // Prioridad 1: Si el plan tiene la relación hallazgo cargada con auditoría
    if (plan.hallazgo?.auditoriaEntity) {
      territorial = plan.hallazgo.auditoriaEntity.territorial || null;
      sede = plan.hallazgo.auditoriaEntity.sede || null;
      return { territorial, sede };
    }

    // Prioridad 2: Si el plan tiene la relación auditoría cargada directamente
    if (plan.auditoria) {
      territorial = plan.auditoria.territorial || null;
      sede = plan.auditoria.sede || null;
      return { territorial, sede };
    }

    // Prioridad 3: Si hay hallazgoId, obtener el hallazgo con su auditoría
    if (plan.hallazgoId) {
      try {
        const hallazgo = await this.hallazgoRepository.findOne({
          where: { id: plan.hallazgoId },
          relations: ['auditoriaEntity'],
        });

        if (hallazgo?.auditoriaEntity) {
          territorial = hallazgo.auditoriaEntity.territorial || null;
          sede = hallazgo.auditoriaEntity.sede || null;
          return { territorial, sede };
        }
      } catch (error) {
        console.error('Error al obtener territorial y sede del hallazgo:', error);
      }
    }

    // Prioridad 4: Si hay auditoriaId, obtener la auditoría directamente
    if (plan.auditoriaId) {
      try {
        const auditoria = await this.auditoriaRepository.findOne({
          where: { id: plan.auditoriaId },
        });
        if (auditoria) {
          territorial = auditoria.territorial || null;
          sede = auditoria.sede || null;
          return { territorial, sede };
        }
      } catch (error) {
        console.error('Error al obtener territorial y sede de la auditoría:', error);
      }
    }

    return { territorial: null, sede: null };
  }

  /**
   * Obtiene la prioridad desde el hallazgo/auditoría del plan (misma lógica que obtenerTerritorialYSede)
   */
  private async obtenerPrioridad(plan: PlanMejoramiento): Promise<AprobacionPrioridad> {
    // Prioridad 1: Si el plan tiene la relación hallazgo cargada con auditoría
    if (plan.hallazgo?.auditoriaEntity?.prioridad) {
      return this.mapearPrioridadAuditoriaAAprobacion(plan.hallazgo.auditoriaEntity.prioridad);
    }

    // Prioridad 2: Si el plan tiene la relación auditoría cargada directamente
    if (plan.auditoria?.prioridad) {
      return this.mapearPrioridadAuditoriaAAprobacion(plan.auditoria.prioridad);
    }

    // Prioridad 3: Si hay hallazgoId, obtener el hallazgo con su auditoría
    if (plan.hallazgoId) {
      try {
        const hallazgo = await this.hallazgoRepository.findOne({
          where: { id: plan.hallazgoId },
          relations: ['auditoriaEntity'],
        });

        if (hallazgo?.auditoriaEntity?.prioridad) {
          return this.mapearPrioridadAuditoriaAAprobacion(hallazgo.auditoriaEntity.prioridad);
        }
      } catch (error) {
        console.error('Error al obtener prioridad del hallazgo:', error);
      }
    }

    // Prioridad 4: Si hay auditoriaId, obtener la auditoría directamente
    if (plan.auditoriaId) {
      try {
        const auditoria = await this.auditoriaRepository.findOne({
          where: { id: plan.auditoriaId },
        });
        if (auditoria?.prioridad) {
          return this.mapearPrioridadAuditoriaAAprobacion(auditoria.prioridad);
        }
      } catch (error) {
        console.error('Error al obtener prioridad de la auditoría:', error);
      }
    }

    // Por defecto, Media
    return AprobacionPrioridad.MEDIA;
  }

  /**
   * Mapea la prioridad de la auditoría al enum de aprobación
   */
  private mapearPrioridadAuditoriaAAprobacion(prioridadAuditoria: string): AprobacionPrioridad {
    const prioridadUpper = prioridadAuditoria.toUpperCase();
    if (prioridadUpper === 'ALTA' || prioridadUpper === 'CRÍTICA' || prioridadUpper === 'CRITICA') {
      return AprobacionPrioridad.ALTA;
    }
    if (prioridadUpper === 'BAJA') {
      return AprobacionPrioridad.BAJA;
    }
    // Por defecto Media
    return AprobacionPrioridad.MEDIA;
  }

  /**
   * Aprueba un plan de mejoramiento
   */
  async aprobar(id: string, observaciones?: string, aprobadoPor?: string): Promise<PlanMejoramiento> {
    const plan = await this.findOne(id);

    if (plan.estado !== PlanMejoramientoEstado.BORRADOR && plan.estado !== PlanMejoramientoEstado.REVISION) {
      throw new BadRequestException('Solo se pueden aprobar planes en estado borrador o revisión');
    }

    plan.estado = PlanMejoramientoEstado.APROBADO;
    plan.fechaAprobacion = new Date();
    plan.aprobadoPor = aprobadoPor || 'Sistema';
    plan.observacionesAprobacion = observaciones;

    // Si tiene acciones, cambiar el estado del plan a en ejecución
    if (plan.acciones && plan.acciones.length > 0) {
      plan.estado = PlanMejoramientoEstado.EN_EJECUCION;
    }

    const savedPlan = await this.planRepository.save(plan);

    // ═══════════════════════════════════════════════════════════════════════════
    // REGISTRAR EVENTO DE APROBACIÓN EN EL TIMELINE
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      await this.registrarEvento(
        savedPlan.id,
        TipoEventoTimeline.APROBACION,
        `Plan ${savedPlan.codigo} aprobado${observaciones ? `: ${observaciones.substring(0, 100)}` : ''}`,
        undefined,
        aprobadoPor || 'Sistema',
        { estadoFinal: savedPlan.estado, observaciones },
      );
    } catch (eventoError) {
      console.error('[PlanesMejoramientoService.aprobar] Error al registrar evento:', eventoError);
    }

    try {
      await this.notificarAuditadoPlanMejoramiento(savedPlan, 'aprobado', observaciones);
    } catch (notifErr) {
      console.error('[PlanesMejoramientoService.aprobar] Error notificando al auditado:', notifErr.message);
    }

    await this.syncTareaRol4(savedPlan.id);

    return savedPlan;
  }

  /**
   * Rechaza un plan de mejoramiento
   */
  async rechazar(id: string, motivo: string): Promise<PlanMejoramiento> {
    const plan = await this.findOne(id);

    if (plan.estado !== PlanMejoramientoEstado.BORRADOR && plan.estado !== PlanMejoramientoEstado.REVISION) {
      throw new BadRequestException('Solo se pueden rechazar planes en estado borrador o revisión');
    }

    plan.estado = PlanMejoramientoEstado.RECHAZADO;
    plan.motivoRechazo = motivo;

    const savedPlan = await this.planRepository.save(plan);

    // ═══════════════════════════════════════════════════════════════════════════
    // REGISTRAR EVENTO DE RECHAZO EN EL TIMELINE
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      await this.registrarEvento(
        savedPlan.id,
        TipoEventoTimeline.ESTADO,
        `Plan ${savedPlan.codigo} rechazado: ${motivo.substring(0, 100)}`,
        undefined,
        'Sistema',
        { estadoFinal: PlanMejoramientoEstado.RECHAZADO, motivo },
      );
    } catch (eventoError) {
      console.error('[PlanesMejoramientoService.rechazar] Error al registrar evento:', eventoError);
    }

    try {
      await this.notificarAuditadoPlanMejoramiento(savedPlan, 'rechazado', motivo);
    } catch (notifErr) {
      console.error('[PlanesMejoramientoService.rechazar] Error notificando al auditado:', notifErr.message);
    }

    await this.syncTareaRol4(savedPlan.id);

    return savedPlan;
  }

  /**
   * Elimina un plan de mejoramiento
   */
  async delete(id: string): Promise<void> {
    const plan = await this.planRepository.findOne({
      where: { id },
      relations: ['auditoria'],
    });
    if (!plan) {
      throw new NotFoundException(`Plan de mejoramiento con ID ${id} no encontrado`);
    }
    await this.rol4TareaSync.sincronizarDesdePlan(
      plan,
      PlanMejoramientoEstado.COMPLETADO,
    );
    await this.planRepository.remove(plan);
  }

  /**
   * Crea una acción correctiva en un plan
   */
  async createAccion(planId: string, createDto: CreateAccionDto): Promise<AccionCorrectiva> {
    const plan = await this.findOne(planId);

    const accion = this.accionRepository.create({
      planId: plan.id,
      hallazgoId: createDto.hallazgoId || null,
      descripcion: createDto.descripcion,
      tipo: createDto.tipo || AccionCorrectivaTipo.CORRECTIVA,
      responsable: createDto.responsable,
      fechaInicio: this.parseDateOnly(createDto.fechaInicio),
      fechaFin: this.parseDateOnly(createDto.fechaFin),
      recursos: createDto.recursos,
      indicador: createDto.indicador,
      metaIndicador: createDto.metaIndicador,
      observaciones: createDto.observaciones,
      estado: createDto.estado || AccionCorrectivaEstado.PROGRAMADA,
      porcentajeAvance: createDto.porcentajeAvance || 0,
    });

    const saved = await this.accionRepository.save(accion);

    // ═══════════════════════════════════════════════════════════════════════════
    // REGISTRAR EVENTO DE CREACIÓN DE ACCIÓN EN EL TIMELINE
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      await this.registrarEvento(
        planId,
        TipoEventoTimeline.CREACION,
        `Nueva acción correctiva creada: ${saved.descripcion.substring(0, 80)}${saved.descripcion.length > 80 ? '...' : ''}`,
        undefined,
        saved.responsable || 'Sistema',
        {
          accionId: saved.id,
          tipo: saved.tipo,
          responsable: saved.responsable,
          fechaFin: this.serializeDate(saved.fechaFin),
        },
      );
    } catch (eventoError) {
      console.error('[PlanesMejoramientoService.createAccion] Error al registrar evento:', eventoError);
    }

    await this.syncTareaRol4(planId);

    // Serializar fechas para evitar problemas de zona horaria
    return {
      ...saved,
      estado: this.determinarEstadoAccionReal(saved),
      fechaInicio: this.serializeDate(saved.fechaInicio),
      fechaFin: this.serializeDate(saved.fechaFin),
    } as any;
  }

  /**
   * Actualiza una acción correctiva
   */
  async updateAccion(planId: string, accionId: string, updateDto: UpdateAccionDto): Promise<AccionCorrectiva> {
    await this.findOne(planId);

    const accion = await this.accionRepository.findOne({
      where: { id: accionId, planId },
    });

    if (!accion) {
      throw new NotFoundException(`Acción con ID ${accionId} no encontrada en el plan`);
    }

    // Guardar estado anterior para detectar cambios
    const estadoAnterior = accion.estado;
    const progresoAnterior = accion.porcentajeAvance;

    if (updateDto.hallazgoId !== undefined) accion.hallazgoId = updateDto.hallazgoId || null;
    if (updateDto.descripcion !== undefined) accion.descripcion = updateDto.descripcion;
    if (updateDto.tipo !== undefined) accion.tipo = updateDto.tipo;
    if (updateDto.responsable !== undefined) accion.responsable = updateDto.responsable;
    if (updateDto.fechaInicio !== undefined) accion.fechaInicio = this.parseDateOnly(updateDto.fechaInicio);
    if (updateDto.fechaFin !== undefined) accion.fechaFin = this.parseDateOnly(updateDto.fechaFin);
    if (updateDto.recursos !== undefined) accion.recursos = updateDto.recursos;
    if (updateDto.indicador !== undefined) accion.indicador = updateDto.indicador;
    if (updateDto.metaIndicador !== undefined) accion.metaIndicador = updateDto.metaIndicador;
    if (updateDto.observaciones !== undefined) accion.observaciones = updateDto.observaciones;
    if (updateDto.estado !== undefined) accion.estado = updateDto.estado;
    if (updateDto.porcentajeAvance !== undefined) accion.porcentajeAvance = updateDto.porcentajeAvance;

    const saved = await this.accionRepository.save(accion);

    // ═══════════════════════════════════════════════════════════════════════════
    // REGISTRAR EVENTO DE ACTUALIZACIÓN DE ACCIÓN EN EL TIMELINE
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      const cambioEstado = updateDto.estado && updateDto.estado !== estadoAnterior;
      const cambioProgreso = updateDto.porcentajeAvance !== undefined && updateDto.porcentajeAvance !== progresoAnterior;
      const accionCompletada = saved.estado === AccionCorrectivaEstado.IMPLEMENTADA || saved.porcentajeAvance === 100;
      
      let tipoEvento = TipoEventoTimeline.ACTUALIZACION;
      let descripcion = `Acción actualizada: ${saved.descripcion.substring(0, 50)}...`;

      if (accionCompletada && estadoAnterior !== AccionCorrectivaEstado.IMPLEMENTADA) {
        tipoEvento = TipoEventoTimeline.COMPLETADA;
        descripcion = `Acción completada: ${saved.descripcion.substring(0, 50)}...`;
      } else if (cambioEstado) {
        tipoEvento = TipoEventoTimeline.ESTADO;
        descripcion = `Acción cambió de estado: ${estadoAnterior} → ${saved.estado}`;
      } else if (cambioProgreso) {
        tipoEvento = TipoEventoTimeline.PROGRESO;
        descripcion = `Progreso actualizado: ${progresoAnterior}% → ${saved.porcentajeAvance}%`;
      }

      await this.registrarEvento(
        planId,
        tipoEvento,
        descripcion,
        undefined,
        saved.responsable || 'Sistema',
        {
          accionId: saved.id,
          estadoAnterior: cambioEstado ? estadoAnterior : undefined,
          estadoNuevo: cambioEstado ? saved.estado : undefined,
          progresoAnterior: cambioProgreso ? progresoAnterior : undefined,
          progresoNuevo: cambioProgreso ? saved.porcentajeAvance : undefined,
        },
      );
    } catch (eventoError) {
      console.error('[PlanesMejoramientoService.updateAccion] Error al registrar evento:', eventoError);
    }

    await this.syncTareaRol4(planId);

    // Serializar fechas para evitar problemas de zona horaria
    return {
      ...saved,
      estado: this.determinarEstadoAccionReal(saved),
      fechaInicio: this.serializeDate(saved.fechaInicio),
      fechaFin: this.serializeDate(saved.fechaFin),
    } as any;
  }

  /**
   * Elimina una acción correctiva
   */
  async deleteAccion(planId: string, accionId: string): Promise<void> {
    await this.findOne(planId);

    const accion = await this.accionRepository.findOne({
      where: { id: accionId, planId },
    });

    if (!accion) {
      throw new NotFoundException(`Acción con ID ${accionId} no encontrada en el plan`);
    }

    await this.accionRepository.remove(accion);
    await this.syncTareaRol4(planId);
  }

  /**
   * Obtiene el seguimiento de un plan
   */
  async getSeguimiento(planId: string): Promise<any> {
    const plan = await this.findOne(planId);

    const seguimientos = await this.seguimientoRepository.find({
      where: { planId },
      relations: ['registros', 'registros.accion'],
      order: { año: 'DESC', trimestre: 'DESC' },
    });

    return {
      planId: plan.id,
      planCodigo: plan.codigo,
      seguimientos: seguimientos.map((s) => ({
        id: s.id,
        trimestre: s.trimestre,
        año: s.año,
        fechaInicio: s.fechaInicio,
        fechaFin: s.fechaFin,
        fechaSeguimiento: s.fechaSeguimiento,
        avanceGlobal: s.avanceGlobal,
        porcentajeCumplimiento: s.porcentajeCumplimiento,
        porcentajeEfectividad: s.porcentajeEfectividad,
        accionesRevisadas: s.accionesRevisadas,
        accionesTotales: s.accionesTotales,
        observacionesGenerales: s.observacionesGenerales,
        avancesAcciones: s.registros.map((r) => ({
          id: r.id,
          accionId: r.accionId,
          accionDescripcion: r.accionDescripcion,
          accionesProgramadas: r.accionesProgramadas,
          accionesImplementadas: r.accionesImplementadas,
          puntajeCumplimiento: r.puntajeCumplimiento,
          controlesImplementados: r.controlesImplementados,
          hallazgoSeRepite: r.hallazgoSeRepite,
          puntajeEfectividad: r.puntajeEfectividad,
          observaciones: r.observaciones,
          evidencias: r.evidencias,
        })),
      })),
    };
  }

  /**
   * Registra el avance de un plan (crea o actualiza seguimiento trimestral)
   */
  async registrarAvance(planId: string, avanceDto: RegistrarAvanceDto): Promise<SeguimientoTrimestral> {
    const plan = await this.findOne(planId);

    // Determinar trimestre y año
    const fecha = new Date(avanceDto.fecha);
    const año = avanceDto.año || fecha.getFullYear();
    const trimestre = avanceDto.trimestre || this.obtenerTrimestre(fecha);

    // Buscar seguimiento existente o crear uno nuevo
    let seguimiento = await this.seguimientoRepository.findOne({
      where: { planId, trimestre, año },
      relations: ['registros'],
    });

    if (!seguimiento) {
      // Calcular fechas del trimestre
      const { fechaInicio, fechaFin } = this.obtenerFechasTrimestre(trimestre, año);

      seguimiento = this.seguimientoRepository.create({
        planId: plan.id,
        trimestre,
        año,
        fechaInicio,
        fechaFin,
        fechaSeguimiento: fecha,
        avanceGlobal: avanceDto.avanceGlobal || 0,
        porcentajeCumplimiento: 0,
        porcentajeEfectividad: 0,
        accionesRevisadas: avanceDto.accionesRevisadas || 0,
        accionesTotales: avanceDto.accionesTotales || plan.acciones?.length || 0,
        observacionesGenerales: avanceDto.observaciones,
      });
    } else {
      seguimiento.fechaSeguimiento = fecha;
      if (avanceDto.avanceGlobal !== undefined) seguimiento.avanceGlobal = avanceDto.avanceGlobal;
      if (avanceDto.accionesRevisadas !== undefined)
        seguimiento.accionesRevisadas = avanceDto.accionesRevisadas;
      if (avanceDto.accionesTotales !== undefined)
        seguimiento.accionesTotales = avanceDto.accionesTotales;
      if (avanceDto.observaciones !== undefined)
        seguimiento.observacionesGenerales = avanceDto.observaciones;
    }

    // Recalcular porcentajes basados en registros
    if (seguimiento.registros && seguimiento.registros.length > 0) {
      const promedioCumplimiento = Math.round(
        (seguimiento.registros.reduce((sum, r) => sum + r.puntajeCumplimiento, 0) /
          seguimiento.registros.length /
          2) *
          100,
      );
      const promedioEfectividad = Math.round(
        (seguimiento.registros.reduce((sum, r) => sum + r.puntajeEfectividad, 0) /
          seguimiento.registros.length /
          2) *
          100,
      );
      seguimiento.porcentajeCumplimiento = promedioCumplimiento;
      seguimiento.porcentajeEfectividad = promedioEfectividad;
    }

    const saved = await this.seguimientoRepository.save(seguimiento);
    await this.syncTareaRol4(planId);
    return saved;
  }

  /**
   * Crea un registro de seguimiento para una acción
   */
  async createRegistroSeguimiento(
    planId: string,
    seguimientoId: string,
    accionId: string,
    createDto: CreateRegistroSeguimientoDto,
  ): Promise<RegistroSeguimiento> {
    await this.findOne(planId);

    const seguimiento = await this.seguimientoRepository.findOne({
      where: { id: seguimientoId, planId },
    });

    if (!seguimiento) {
      throw new NotFoundException(`Seguimiento con ID ${seguimientoId} no encontrado`);
    }

    const accion = await this.accionRepository.findOne({
      where: { id: accionId, planId },
    });

    if (!accion) {
      throw new NotFoundException(`Acción con ID ${accionId} no encontrada`);
    }

    // Calcular puntajes usando las fórmulas
    const puntajeCumplimiento = this.calcularPuntajeCumplimiento(
      createDto.accionesImplementadas,
      createDto.accionesProgramadas,
    );
    const puntajeEfectividad = this.calcularPuntajeEfectividad(
      createDto.controlesImplementados,
      createDto.hallazgoSeRepite,
    );

    const registro = this.registroRepository.create({
      accionId: accion.id,
      seguimientoId: seguimiento.id,
      accionDescripcion: createDto.accionDescripcion,
      accionesProgramadas: createDto.accionesProgramadas,
      accionesImplementadas: createDto.accionesImplementadas,
      puntajeCumplimiento,
      controlesImplementados: createDto.controlesImplementados,
      hallazgoSeRepite: createDto.hallazgoSeRepite,
      puntajeEfectividad,
      observaciones: createDto.observaciones,
      evidencias: createDto.evidencias || [],
    });

    const savedRegistro = await this.registroRepository.save(registro);

    // Recalcular porcentajes del seguimiento
    await this.recalcularPorcentajesSeguimiento(seguimientoId);

    return savedRegistro;
  }

  /**
   * Recalcula los porcentajes de cumplimiento y efectividad de un seguimiento
   */
  private async recalcularPorcentajesSeguimiento(seguimientoId: string): Promise<void> {
    const seguimiento = await this.seguimientoRepository.findOne({
      where: { id: seguimientoId },
      relations: ['registros'],
    });

    if (!seguimiento || !seguimiento.registros || seguimiento.registros.length === 0) {
      return;
    }

    const promedioCumplimiento = Math.round(
      (seguimiento.registros.reduce((sum, r) => sum + r.puntajeCumplimiento, 0) /
        seguimiento.registros.length /
        2) *
        100,
    );
    const promedioEfectividad = Math.round(
      (seguimiento.registros.reduce((sum, r) => sum + r.puntajeEfectividad, 0) /
        seguimiento.registros.length /
        2) *
        100,
    );

    seguimiento.porcentajeCumplimiento = promedioCumplimiento;
    seguimiento.porcentajeEfectividad = promedioEfectividad;
    seguimiento.accionesRevisadas = seguimiento.registros.length;

    await this.seguimientoRepository.save(seguimiento);
  }

  /**
   * Obtiene el trimestre de una fecha
   */
  private obtenerTrimestre(fecha: Date): number {
    const mes = fecha.getMonth() + 1;
    if (mes <= 3) return 1;
    if (mes <= 6) return 2;
    if (mes <= 9) return 3;
    return 4;
  }

  /**
   * Obtiene las fechas de inicio y fin de un trimestre
   */
  private obtenerFechasTrimestre(trimestre: number, año: number): { fechaInicio: Date; fechaFin: Date } {
    let fechaInicio: Date;
    let fechaFin: Date;

    switch (trimestre) {
      case 1:
        fechaInicio = new Date(año, 0, 1);
        fechaFin = new Date(año, 2, 31);
        break;
      case 2:
        fechaInicio = new Date(año, 3, 1);
        fechaFin = new Date(año, 5, 30);
        break;
      case 3:
        fechaInicio = new Date(año, 6, 1);
        fechaFin = new Date(año, 8, 30);
        break;
      case 4:
        fechaInicio = new Date(año, 9, 1);
        fechaFin = new Date(año, 11, 31);
        break;
      default:
        fechaInicio = new Date(año, 0, 1);
        fechaFin = new Date(año, 2, 31);
    }

    return { fechaInicio, fechaFin };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS PARA EVENTOS DEL TIMELINE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Obtiene todos los eventos del timeline de un plan
   */
  async getEventosTimeline(planId: string): Promise<EventoTimeline[]> {
    const plan = await this.planRepository.findOne({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException(`Plan de mejoramiento con ID ${planId} no encontrado`);
    }

    const eventos = await this.eventoTimelineRepository.find({
      where: { planMejoramientoId: planId },
      order: { fecha: 'DESC' },
    });

    return eventos;
  }

  /**
   * Crea un nuevo evento en el timeline
   */
  async createEventoTimeline(
    planId: string,
    createDto: CreateEventoTimelineDto,
  ): Promise<EventoTimeline> {
    const plan = await this.planRepository.findOne({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException(`Plan de mejoramiento con ID ${planId} no encontrado`);
    }

    const evento = this.eventoTimelineRepository.create({
      planMejoramientoId: planId,
      ...createDto,
      fecha: new Date(),
    });

    return await this.eventoTimelineRepository.save(evento);
  }

  /**
   * Registra un evento de forma programática (usado internamente)
   */
  async registrarEvento(
    planId: string,
    tipo: TipoEventoTimeline,
    descripcion: string,
    usuarioId?: string,
    usuarioNombre?: string,
    metadata?: any,
  ): Promise<EventoTimeline> {
    const evento = this.eventoTimelineRepository.create({
      planMejoramientoId: planId,
      tipo,
      descripcion,
      usuarioId,
      usuarioNombre,
      metadata,
      fecha: new Date(),
    });

    return await this.eventoTimelineRepository.save(evento);
  }

  /**
   * Registra un evento de evidencia cargada
   */
  async registrarEventoEvidencia(
    planId: string,
    accionId: string,
    nombreArchivo: string,
    usuarioId?: string,
    usuarioNombre?: string,
  ): Promise<EventoTimeline> {
    return this.registrarEvento(
      planId,
      TipoEventoTimeline.EVIDENCIA,
      `Cargada evidencia "${nombreArchivo}"`,
      usuarioId,
      usuarioNombre,
      { accionId, nombreArchivo },
    );
  }

  /**
   * Registra un evento de comentario agregado
   */
  async registrarEventoComentario(
    planId: string,
    comentario: string,
    usuarioId?: string,
    usuarioNombre?: string,
  ): Promise<EventoTimeline> {
    const descripcionCorta = comentario.length > 100 
      ? comentario.substring(0, 100) + '...' 
      : comentario;
    
    return this.registrarEvento(
      planId,
      TipoEventoTimeline.COMENTARIO,
      `Nuevo comentario: "${descripcionCorta}"`,
      usuarioId,
      usuarioNombre,
      { comentarioCompleto: comentario },
    );
  }

  /**
   * Crea notificaciones cuando se crea un plan de mejoramiento
   */
  private async crearNotificacionesPlanCreado(
    plan: PlanMejoramiento,
    auditoriaId: string | null,
  ): Promise<void> {
    console.log(`[PlanesMejoramientoService.crearNotificacionesPlanCreado] Iniciando creación de notificaciones para plan ${plan.codigo}`);
    
    // Obtener información de la auditoría si existe
    let auditoriaCodigo = 'N/A';
    let auditoriaNombre = 'Auditoría no especificada';
    
    if (auditoriaId) {
      try {
        const auditoria = await this.auditoriaRepository.findOne({
          where: { id: auditoriaId },
        });
        if (auditoria) {
          auditoriaCodigo = auditoria.codigo || auditoriaId.substring(0, 8).toUpperCase();
          auditoriaNombre = auditoria.nombre || auditoriaCodigo;
          console.log(`[PlanesMejoramientoService.crearNotificacionesPlanCreado] Auditoría encontrada: ${auditoriaCodigo}`);
        }
      } catch (error) {
        console.error(`[PlanesMejoramientoService.crearNotificacionesPlanCreado] Error al obtener auditoría:`, error);
      }
    }

    // ✅ SINCRONIZACIÓN CON CONFIGURACIÓN: Obtener roles destinatarios
    let rolesDestinatarios = ['Responsable Plan Mejoramiento', 'Jefe OCIG', 'Auditor Líder']; // Fallback
    try {
      const configGlobal = await this.notificacionesService.getGlobalConfig();
      if (configGlobal && configGlobal.tiposNotificacion && configGlobal.tiposNotificacion['EVT-PM-001']) {
        const configEvento = configGlobal.tiposNotificacion['EVT-PM-001'] as any;
        rolesDestinatarios = configEvento.destinatarios || rolesDestinatarios;
      }
    } catch (e) {}

    const usuariosNotificar = new Set<string>();

    if (rolesDestinatarios.includes('Jefe OCIG')) {
      try {
        const jefesOCI = await this.obtenerJefesControlInterno();
        jefesOCI.forEach((id) => usuariosNotificar.add(String(id)));
        console.log(
          `[PlanesMejoramientoService.crearNotificacionesPlanCreado] ${jefesOCI.length} Jefe(s) de Control Interno encontrado(s)`,
        );
      } catch (error) {
        console.error(
          `[PlanesMejoramientoService.crearNotificacionesPlanCreado] Error al obtener Jefes de Control Interno:`,
          error,
        );
      }
    }

    if (rolesDestinatarios.includes('Auditor Líder') && auditoriaId) {
      try {
        const auditoria = await this.auditoriaRepository.findOne({ where: { id: auditoriaId } });
        if (auditoria?.auditorLiderId) {
          const auditorLiderId = String(auditoria.auditorLiderId);
          usuariosNotificar.add(auditorLiderId);
          console.log(
            `[PlanesMejoramientoService.crearNotificacionesPlanCreado] Auditor líder agregado: id_user=${auditorLiderId}`,
          );
        }
      } catch (error) {
        console.error(
          `[PlanesMejoramientoService.crearNotificacionesPlanCreado] Error al obtener auditor líder:`,
          error,
        );
      }
    }

    if (rolesDestinatarios.includes('Responsable Plan Mejoramiento') && plan.responsableImplementacion) {
      try {
        const responsable = await this.dataSource.query(
          `
          SELECT u.id_user
          FROM auth.personas p
          INNER JOIN auth."user" u ON u.id_person = p.id_person
          WHERE (
            p.nom_largo ILIKE $1
            OR CONCAT(p.nom_tercero, ' ', p.pri_apellido) ILIKE $1
            OR p.dir_email ILIKE $1
            OR u.username ILIKE $1
          )
            AND COALESCE(u.is_active, TRUE) = TRUE
          LIMIT 1
          `,
          [`%${plan.responsableImplementacion}%`],
        );

        if (responsable && responsable.length > 0) {
          const idUsuario = String(responsable[0].id_user);
          usuariosNotificar.add(idUsuario);
          console.log(
            `[PlanesMejoramientoService.crearNotificacionesPlanCreado] Responsable encontrado: id_user=${idUsuario}`,
          );
        } else {
          console.warn(
            `[PlanesMejoramientoService.crearNotificacionesPlanCreado] No se encontró responsable con nombre/email: "${plan.responsableImplementacion}"`,
          );
        }
      } catch (error) {
        console.error(
          `[PlanesMejoramientoService.crearNotificacionesPlanCreado] Error al buscar responsable:`,
          error,
        );
      }
    }

    const usuariosUnicos = [...usuariosNotificar];
    console.log(`[PlanesMejoramientoService.crearNotificacionesPlanCreado] Total de usuarios a notificar: ${usuariosUnicos.length}`);

    // Crear notificaciones para cada usuario
    for (const usuarioId of usuariosUnicos) {
      try {
        await this.notificacionesService.create({
          usuarioId,
          tipoNotificacion: TipoNotificacion.APROBACION_PLAN,
          titulo: `Plan de Mejoramiento Creado: ${plan.codigo}`,
          mensaje: `Se ha creado el Plan de Mejoramiento ${plan.codigo} para la auditoría ${auditoriaCodigo}. El plan debe ser presentado y revisado.`,
          prioridad: PrioridadNotificacion.ALTA,
          canal: CanalNotificacion.SISTEMA,
          metadata: {
            planMejoramientoId: plan.id,
            auditoriaId: auditoriaId || undefined,
            codigoPlan: plan.codigo,
            codigoAuditoria: auditoriaCodigo,
          },
          accionUrl: `/control-interno/planes-mejoramiento/${plan.id}`,
        });
        console.log(`[PlanesMejoramientoService.crearNotificacionesPlanCreado] Notificación creada para usuario: ${usuarioId}`);
      } catch (error) {
        console.error(`[PlanesMejoramientoService.crearNotificacionesPlanCreado] Error al crear notificación para usuario ${usuarioId}:`, error);
      }
    }

    console.log(`[PlanesMejoramientoService.crearNotificacionesPlanCreado] Proceso de notificaciones completado para plan ${plan.codigo}`);
  }

  /**
   * Notifica al responsable del área (portal) cuando el plan es aprobado o rechazado.
   */
  private async notificarAuditadoPlanMejoramiento(
    plan: PlanMejoramiento,
    resultado: 'aprobado' | 'rechazado',
    detalle?: string,
  ): Promise<void> {
    if (!plan.auditoriaId) return;
    const auditoria = await this.auditoriaRepository.findOne({ where: { id: plan.auditoriaId } });
    if (!auditoria?.responsableAreaEmail) return;

    const esAprobado = resultado === 'aprobado';
    await this.notificacionesService.notificarAuditadoPortal({
      responsableAreaEmail: auditoria.responsableAreaEmail,
      responsableAreaNombre: auditoria.responsableAreaNombre,
      auditoriaId: auditoria.id,
      auditoriaCodigo: auditoria.codigo,
      auditoriaNombre: auditoria.nombre,
      tipoNotificacion: esAprobado ? TipoNotificacion.APROBACION_PLAN : TipoNotificacion.RECHAZO_PLAN,
      titulo: esAprobado
        ? `Plan de mejoramiento aprobado — ${plan.codigo}`
        : `Plan de mejoramiento devuelto — ${plan.codigo}`,
      mensaje: esAprobado
        ? `La OCI aprobó su plan de mejoramiento ${plan.codigo} para la auditoría ${auditoria.codigo}. ` +
          `${detalle ? `Observaciones: ${detalle}. ` : ''}` +
          `Puede iniciar la ejecución de las acciones en el portal.`
        : `La OCI devolvió su plan de mejoramiento ${plan.codigo} con observaciones. ` +
          `Motivo: ${detalle || 'Ver detalle en el portal'}. ` +
          `Por favor ajuste y vuelva a enviar a revisión.`,
      prioridad: PrioridadNotificacion.ALTA,
      metadata: { planMejoramientoId: plan.id, planCodigo: plan.codigo, resultado },
    });
  }

  /**
   * Notifica al equipo OCI cuando el auditado envía el plan a revisión.
   */
  private async notificarPlanEnviadoRevision(plan: PlanMejoramiento): Promise<void> {
    let auditoriaCodigo = plan.auditoriaId || '';
    if (plan.auditoriaId) {
      const auditoria = await this.auditoriaRepository.findOne({ where: { id: plan.auditoriaId } });
      if (auditoria) auditoriaCodigo = auditoria.codigo;
    }
    await this.notificacionesService.dispararEvento('EVT-APR-001', {
      auditoriaId: plan.auditoriaId ?? undefined,
      planId: plan.id,
      tituloCustom: `Plan de mejoramiento en revisión — ${plan.codigo}`,
      mensajeCustom:
        `El área auditada envió el plan de mejoramiento ${plan.codigo} (${auditoriaCodigo}) para su revisión y aprobación.`,
      metadata: { planMejoramientoId: plan.id, planCodigo: plan.codigo },
      url_accion: `/control-interno/planes-mejoramiento/${plan.id}`,
    });
  }

  /**
   * Obtiene los IDs de usuarios (UUID `id_user`) con rol JEFE_CONTROL_INTERNO.
   *
   * Se aceptan distintas variantes del código del rol que han existido a lo largo
   * del proyecto (`JEFE_CONTROL_INTERNO`, `JEGE_OCI`, `JEFE_OCI`) para no perder
   * destinatarios cuando el catálogo de roles se ha renombrado.
   */
  private async obtenerJefesControlInterno(): Promise<string[]> {
    try {
      const result = await this.dataSource.query(`
        SELECT DISTINCT u.id_user
        FROM auth."user" u
        INNER JOIN auth.user_roles ur ON ur.id_user = u.id_user
        INNER JOIN auth.role r ON r.id = ur.id_rol
        WHERE (
          UPPER(TRIM(r.code)) IN (
            'JEFE_CONTROL_INTERNO',
            'JEFE_OCIG',
            'JEFE_OCI',
            'JEGE_OCI',
            'ADMIN',
            'SUPER_ADMIN'
          )
          OR r.name ILIKE '%Jefe%Control%Interno%'
          OR r.name ILIKE '%Jefe%OCI%'
        )
          AND COALESCE(ur.is_active, TRUE) = TRUE
          AND COALESCE(u.is_active, TRUE) = TRUE
      `);

      const ids = result.map((row: { id_user: string }) => String(row.id_user));
      console.log(`[Notificaciones-PM] Jefes OCI detectados: ${ids.length} usuarios`);
      return ids;
    } catch (error) {
      console.error('[PlanesMejoramientoService.obtenerJefesControlInterno] Error:', error);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVIDENCIAS DE ACCIONES (RF-SG-01 a RF-SG-04)
  // Fuente: EM-PT-002 v3 act. 4-5, US-032
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Carga una evidencia para una acción de mejora (auditado).
   * RF-SG-01: El auditado carga evidencias por cada acción de mejora.
   */
  async cargarEvidenciaAccion(
    accionId: string,
    data: {
      archivoRef: string;
      archivoNombre: string;
      archivoTipo?: string;
      archivoTamanio?: number;
      descripcion?: string;
      cargadaPorId: string;
      cargadaPorNombre?: string;
    },
  ): Promise<EvidenciaAccion> {
    const accion = await this.accionRepository.findOne({ where: { id: accionId } });
    if (!accion) {
      throw new NotFoundException(`Acción con ID ${accionId} no encontrada`);
    }

    const evidencia = this.evidenciaAccionRepository.create({
      accionId,
      archivoRef: data.archivoRef,
      archivoNombre: data.archivoNombre,
      archivoTipo: data.archivoTipo,
      archivoTamanio: data.archivoTamanio,
      descripcion: data.descripcion,
      cargadaPorId: data.cargadaPorId,
      cargadaPorNombre: data.cargadaPorNombre,
      estadoValidacion: EstadoValidacionEvidencia.PENDIENTE,
    });

    const saved = await this.evidenciaAccionRepository.save(evidencia);
    console.log(`[EvidenciaAccion] Evidencia cargada: ${saved.id} para acción ${accionId}`);
    return saved;
  }

  /**
   * Lista evidencias de una acción.
   */
  async listarEvidenciasAccion(accionId: string): Promise<EvidenciaAccion[]> {
    return this.evidenciaAccionRepository.find({
      where: { accionId },
      order: { cargadaAt: 'DESC' },
    });
  }

  /**
   * Califica una evidencia (auditor OCI).
   * RF-SG-02: El auditor califica como "Aceptado" o "Con Observaciones".
   * RF-SG-03: Si hay observaciones, puede solicitar nueva evidencia.
   * RF-SG-13: Registra fecha/hora/usuario para trazabilidad.
   */
  async calificarEvidencia(
    evidenciaId: string,
    data: {
      calificacion: 'aceptado' | 'con_observaciones';
      comentarios?: string;
      solicitaNuevaEvidencia?: boolean;
      calificadaPorId: string;
      calificadaPorNombre?: string;
    },
  ): Promise<EvidenciaAccion> {
    const evidencia = await this.evidenciaAccionRepository.findOne({
      where: { id: evidenciaId },
    });
    if (!evidencia) {
      throw new NotFoundException(`Evidencia con ID ${evidenciaId} no encontrada`);
    }

    evidencia.estadoValidacion = data.calificacion as EstadoValidacionEvidencia;
    evidencia.comentarios = data.comentarios ?? undefined;
    evidencia.solicitaNuevaEvidencia = data.solicitaNuevaEvidencia ?? false;
    evidencia.calificadaPorId = data.calificadaPorId;
    evidencia.calificadaPorNombre = data.calificadaPorNombre ?? undefined;
    evidencia.calificadaAt = new Date();

    const saved = await this.evidenciaAccionRepository.save(evidencia);
    console.log(`[EvidenciaAccion] Calificada: ${evidenciaId} → ${data.calificacion} por ${data.calificadaPorId}`);

    // ── US-024 / RF-SG-03: Notificar al auditado sobre la calificación ──
    try {
      const accion = await this.accionRepository.findOne({
        where: { id: evidencia.accionId },
        relations: ['plan'],
      });
      if (accion?.plan) {
        const esObservacion = data.calificacion === 'con_observaciones';
        await this.notificacionesService.create({
          usuarioId: accion.plan.responsableImplementacion || 'AUDITADO',
          tipoNotificacion: esObservacion
            ? TipoNotificacion.SOLICITUD_EVIDENCIA
            : TipoNotificacion.VALIDACION_EVIDENCIA,
          titulo: esObservacion
            ? 'Evidencia con observaciones — Acción de mejora'
            : 'Evidencia aceptada — Acción de mejora',
          mensaje: esObservacion
            ? `Su evidencia "${evidencia.archivoNombre}" fue calificada con observaciones: ${data.comentarios || 'Ver detalles en el portal'}. ${data.solicitaNuevaEvidencia ? 'Se solicita nueva evidencia.' : ''}`
            : `Su evidencia "${evidencia.archivoNombre}" fue aceptada para la acción de mejora.`,
          prioridad: esObservacion ? PrioridadNotificacion.ALTA : PrioridadNotificacion.NORMAL,
          metadata: {
            planId: accion.planId,
            accionId: accion.id,
            evidenciaId: saved.id,
            calificacion: data.calificacion,
            comentarios: data.comentarios,
          },
        });
      }
    } catch (notifErr: any) {
      console.warn(`[EvidenciaAccion] No se pudo notificar al auditado: ${notifErr.message}`);
    }

    return saved;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEGUIMIENTO Y EVALUACIÓN (RF-SG-05 a RF-SG-07)
  // Fuente: EM-FO-002 v3 (escalas de cumplimiento y efectividad)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Registra el seguimiento de una acción: cantidad implementada y calcula cumplimiento.
   * RF-SG-05: Cumplimiento calculado, no editable manualmente.
   */
  async registrarSeguimientoAccion(
    accionId: string,
    data: {
      cantidadImplementada: number;
      observacionCumplimiento?: string;
      responsableSeguimiento?: string;
    },
  ): Promise<AccionCorrectiva> {
    const accion = await this.accionRepository.findOne({ where: { id: accionId } });
    if (!accion) {
      throw new NotFoundException(`Acción con ID ${accionId} no encontrada`);
    }

    const programadas = accion.cantidadAccionesProgramadas ?? 0;
    const cumplimiento = calcularCumplimiento(data.cantidadImplementada, programadas);

    accion.cantidadAccionesImplementadas = data.cantidadImplementada;
    accion.cumplimientoEmfo = cumplimiento;
    accion.observacionCumplimiento = data.observacionCumplimiento ?? undefined;
    accion.responsableSeguimiento = data.responsableSeguimiento ?? undefined;

    if (cumplimiento === 2) {
      accion.estadoAccionSeguimiento = 'cerrada';
    }

    const saved = await this.accionRepository.save(accion);
    console.log(`[Seguimiento] Acción ${accionId}: implementadas=${data.cantidadImplementada}, cumplimiento=${cumplimiento}`);
    return saved;
  }

  /**
   * Registra la efectividad de una acción.
   * RF-SG-07: Efectividad con dos criterios SI/NO.
   */
  async registrarEfectividad(
    accionId: string,
    data: {
      evaluarAplicacionControles: boolean;
      validarSituacionNoRepitio: boolean;
      observacionEfectividad?: string;
    },
  ): Promise<AccionCorrectiva> {
    const accion = await this.accionRepository.findOne({ where: { id: accionId } });
    if (!accion) {
      throw new NotFoundException(`Acción con ID ${accionId} no encontrada`);
    }

    const efectividad = calcularEfectividad(
      data.evaluarAplicacionControles,
      data.validarSituacionNoRepitio,
    );

    accion.evaluarAplicacionControles = data.evaluarAplicacionControles;
    accion.validarSituacionNoRepitio = data.validarSituacionNoRepitio;
    accion.efectividadEmfo = efectividad;
    accion.efectividadVerificada = true;
    accion.observacionEfectividad = data.observacionEfectividad ?? undefined;

    const saved = await this.accionRepository.save(accion);
    console.log(`[Efectividad] Acción ${accionId}: efectividad=${efectividad}`);
    return saved;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ALERTAS (RF-SG-08) — EM-PT-002 v3 act. 6
  // ═══════════════════════════════════════════════════════════════════════════

  async generarAlertas(planId: string): Promise<AlertaPlan[]> {
    const plan = await this.planRepository.findOne({
      where: { id: planId },
      relations: ['acciones'],
    });
    if (!plan) {
      throw new NotFoundException(`Plan con ID ${planId} no encontrado`);
    }

    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();
    const alertasGeneradas: AlertaPlan[] = [];

    for (const accion of (plan.acciones ?? [])) {
      const fechaFin = accion.fechaFin ? new Date(accion.fechaFin) : null;

      // Alerta 1: VENCIDA_SIN_EVIDENCIA
      if (fechaFin && fechaFin < hoy) {
        const evidencias = await this.evidenciaAccionRepository.count({ where: { accionId: accion.id } });
        if (evidencias === 0) {
          alertasGeneradas.push(await this.alertaPlanRepository.save(
            this.alertaPlanRepository.create({
              planId, accionId: accion.id,
              tipo: TipoAlertaPlan.VENCIDA_SIN_EVIDENCIA,
              descripcion: `Acción vencida sin evidencia: ${accion.descripcion?.substring(0, 100)}`,
            }),
          ));
        }
      }

      // Alerta 2: INEFECTIVA
      if (accion.efectividadVerificada && accion.efectividadEmfo === 0) {
        alertasGeneradas.push(await this.alertaPlanRepository.save(
          this.alertaPlanRepository.create({
            planId, accionId: accion.id,
            tipo: TipoAlertaPlan.INEFECTIVA,
            descripcion: `Acción inefectiva: ${accion.descripcion?.substring(0, 100)}`,
          }),
        ));
      }

      // Alerta 3 y 4: CUMPLIMIENTO_MES_ACTUAL / MES_SIGUIENTE
      if (fechaFin) {
        const mesFin = fechaFin.getMonth();
        const anioFin = fechaFin.getFullYear();
        if (mesFin === mesActual && anioFin === anioActual) {
          alertasGeneradas.push(await this.alertaPlanRepository.save(
            this.alertaPlanRepository.create({
              planId, accionId: accion.id,
              tipo: TipoAlertaPlan.CUMPLIMIENTO_MES_ACTUAL,
              descripcion: `Cumplimiento este mes: ${accion.descripcion?.substring(0, 100)}`,
            }),
          ));
        }
        const mesSig = (mesActual + 1) % 12;
        const anioSig = mesActual === 11 ? anioActual + 1 : anioActual;
        if (mesFin === mesSig && anioFin === anioSig) {
          alertasGeneradas.push(await this.alertaPlanRepository.save(
            this.alertaPlanRepository.create({
              planId, accionId: accion.id,
              tipo: TipoAlertaPlan.CUMPLIMIENTO_MES_SIGUIENTE,
              descripcion: `Cumplimiento próximo mes: ${accion.descripcion?.substring(0, 100)}`,
            }),
          ));
        }
      }
    }

    console.log(`[Alertas] Plan ${planId}: ${alertasGeneradas.length} alertas generadas`);
    return alertasGeneradas;
  }

  async getAlertas(planId: string): Promise<AlertaPlan[]> {
    return this.alertaPlanRepository.find({
      where: { planId },
      relations: ['accion'],
      order: { generadaAt: 'DESC' },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CIERRE Y ARCHIVO (RF-SG-11, RF-SG-12) — EM-PT-002 act. 8-10
  // ═══════════════════════════════════════════════════════════════════════════

  async cerrarPlan(
    planId: string,
    data: { cerradoPorId: string; cerradoPorNombre?: string; observacionesCierre?: string },
  ): Promise<CierrePlan> {
    const plan = await this.planRepository.findOne({
      where: { id: planId },
      relations: ['acciones'],
    });
    if (!plan) throw new NotFoundException(`Plan con ID ${planId} no encontrado`);

    const sinCumplir = (plan.acciones ?? []).filter(
      (a) => (a.cumplimientoEmfo ?? 0) === 0 && a.estadoAccionSeguimiento !== 'cerrada',
    );
    if (sinCumplir.length > 0) {
      throw new BadRequestException(`No se puede cerrar: ${sinCumplir.length} acción(es) sin cumplimiento`);
    }

    let cierre = await this.cierrePlanRepository.findOne({ where: { planId } });
    if (!cierre) cierre = this.cierrePlanRepository.create({ planId });

    cierre.cerrado = true;
    cierre.fechaCierre = new Date();
    cierre.cerradoPorId = data.cerradoPorId;
    cierre.cerradoPorNombre = data.cerradoPorNombre ?? undefined;
    cierre.observacionesCierre = data.observacionesCierre ?? undefined;

    const saved = await this.cierrePlanRepository.save(cierre);
    plan.estado = PlanMejoramientoEstado.COMPLETADO;
    await this.planRepository.save(plan);

    console.log(`[Cierre] Plan ${planId} cerrado por ${data.cerradoPorId}`);
    return saved;
  }

  async archivarExpediente(
    planId: string,
    data: { indiceElectronicoRef: string },
  ): Promise<CierrePlan> {
    const cierre = await this.cierrePlanRepository.findOne({ where: { planId } });
    if (!cierre || !cierre.cerrado) {
      throw new BadRequestException('El plan debe estar cerrado antes de archivar');
    }
    cierre.archivado = true;
    cierre.indiceElectronicoRef = data.indiceElectronicoRef;
    cierre.fechaArchivo = new Date();
    const saved = await this.cierrePlanRepository.save(cierre);
    console.log(`[Archivo] Plan ${planId} archivado`);
    return saved;
  }

  async getCierre(planId: string): Promise<CierrePlan | null> {
    return this.cierrePlanRepository.findOne({ where: { planId } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEGUIMIENTO PERIÓDICO (RF-SG-09 / EM-PT-002 act. 5 y 7)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Lista todos los seguimientos periódicos de un plan.
   */
  async getSeguimientosPlan(planId: string): Promise<SeguimientoPlan[]> {
    return this.seguimientoPlanRepository.find({
      where: { planId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Registra un seguimiento periódico manual.
   * RF-SG-10: Informe de seguimiento.
   */
  async registrarSeguimientoPeriodico(
    planId: string,
    data: {
      periodicidad: 'TRIMESTRAL' | 'SEMESTRAL';
      tipoControl: 'INTERNO' | 'ENTE_EXTERNO';
      fechaCorte: string;
      responsableId: string;
      responsableNombre?: string;
      resumen?: string;
      informeRef?: string;
    },
  ): Promise<SeguimientoPlan> {
    // Calcular métricas actuales de las acciones del plan
    const acciones = await this.accionRepository.find({
      where: { planMejoramientoId: planId } as any,
    });

    let cumplen = 0, parcial = 0, noCumplen = 0;
    for (const a of acciones) {
      const c = (a as any).cumplimientoEmfo;
      if (c === 2) cumplen++;
      else if (c === 1) parcial++;
      else noCumplen++;
    }

    const seguimiento = this.seguimientoPlanRepository.create({
      planId,
      periodicidad: data.periodicidad,
      tipoControl: data.tipoControl,
      fechaCorte: new Date(data.fechaCorte),
      responsableId: data.responsableId,
      responsableNombre: data.responsableNombre,
      resumen: data.resumen,
      informeRef: data.informeRef,
      totalAccionesEvaluadas: acciones.length,
      accionesCumplen: cumplen,
      accionesParcial: parcial,
      accionesNoCumplen: noCumplen,
      automatico: false,
    });

    const saved = await this.seguimientoPlanRepository.save(seguimiento);
    console.log(`[Seguimiento] Plan ${planId}: seguimiento ${data.periodicidad} registrado`);
    return saved;
  }
}
