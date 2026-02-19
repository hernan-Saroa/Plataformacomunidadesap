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
    private readonly notificacionesService: NotificacionesService,
    private readonly dataSource: DataSource,
  ) {}

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
   * Genera un código único para el plan en formato PM-YYYY-###
   */
  private async generarCodigo(): Promise<string> {
    const year = new Date().getFullYear();
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
  async findAll(filters?: { estado?: string; area?: string }): Promise<PlanMejoramiento[]> {
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
   * Serializa un plan de mejoramiento para la respuesta JSON
   */
  private serializePlanMejoramiento(plan: PlanMejoramiento): any {
    return {
      ...plan,
      fechaLimite: this.serializeDate(plan.fechaLimite),
      fechaAprobacion: this.serializeDate(plan.fechaAprobacion),
      acciones: plan.acciones?.map(accion => ({
        ...accion,
        fechaInicio: this.serializeDate(accion.fechaInicio),
        fechaFin: this.serializeDate(accion.fechaFin),
      })),
      seguimientos: plan.seguimientos?.map(seguimiento => ({
        ...seguimiento,
        fechaInicio: this.serializeDate(seguimiento.fechaInicio),
        fechaFin: this.serializeDate(seguimiento.fechaFin),
        fechaSeguimiento: this.serializeDate(seguimiento.fechaSeguimiento),
      })),
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
    const codigo = await this.generarCodigo();

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

    const plan = this.planRepository.create({
      codigo,
      titulo: createDto.titulo || `Plan de Mejoramiento ${codigo}`,
      descripcion: createDto.descripcion || '',
      objetivos: createDto.objetivos || [],
      hallazgoId,
      auditoriaId,
      areaResponsable: createDto.areaResponsable,
      responsableImplementacion: createDto.responsableImplementacion,
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

    // Crear notificaciones después de guardar el plan
    try {
      await this.crearNotificacionesPlanCreado(savedPlan, auditoriaId);
    } catch (notifError) {
      // No fallar la creación del plan si las notificaciones fallan
      console.error('[PlanesMejoramientoService.create] Error al crear notificaciones:', notifError);
      console.error('[PlanesMejoramientoService.create] Stack trace:', notifError?.stack);
    }

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

    // Si el estado es REVISION, crear una aprobación pendiente si no existe
    if (savedPlan.estado === PlanMejoramientoEstado.REVISION) {
      // Obtener el plan completo con relaciones antes de crear la aprobación
      const planCompleto = await this.findOne(savedPlan.id);
      await this.crearAprobacionPendienteParaPlan(planCompleto);
    }

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

    return this.planRepository.save(plan);
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

    return this.planRepository.save(plan);
  }

  /**
   * Elimina un plan de mejoramiento
   */
  async delete(id: string): Promise<void> {
    const plan = await this.findOne(id);
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
    // Serializar fechas para evitar problemas de zona horaria
    return {
      ...saved,
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
    // Serializar fechas para evitar problemas de zona horaria
    return {
      ...saved,
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

    return this.seguimientoRepository.save(seguimiento);
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

    // Obtener usuarios que deben recibir notificaciones
    const usuariosNotificar: string[] = [];

    // 1. Buscar el responsable de implementación por nombre
    if (plan.responsableImplementacion) {
      try {
        console.log(`[PlanesMejoramientoService.crearNotificacionesPlanCreado] Buscando responsable: "${plan.responsableImplementacion}"`);
        const responsable = await this.dataSource.query(
          `SELECT id_tercero FROM auth.personas WHERE nom_largo ILIKE $1 OR CONCAT(nom_tercero, ' ', pri_apellido) ILIKE $1 LIMIT 1`,
          [`%${plan.responsableImplementacion}%`]
        );
        
        if (responsable && responsable.length > 0) {
          const idTercero = String(responsable[0].id_tercero);
          usuariosNotificar.push(idTercero);
          console.log(`[PlanesMejoramientoService.crearNotificacionesPlanCreado] Responsable encontrado: id_tercero=${idTercero}`);
        } else {
          console.warn(`[PlanesMejoramientoService.crearNotificacionesPlanCreado] No se encontró responsable con nombre: "${plan.responsableImplementacion}"`);
        }
      } catch (error) {
        console.error(`[PlanesMejoramientoService.crearNotificacionesPlanCreado] Error al buscar responsable:`, error);
      }
    }

    // 2. Obtener Jefes de Control Interno
    try {
      const jefesOCI = await this.obtenerJefesControlInterno();
      usuariosNotificar.push(...jefesOCI);
      console.log(`[PlanesMejoramientoService.crearNotificacionesPlanCreado] ${jefesOCI.length} Jefe(s) de Control Interno encontrado(s)`);
    } catch (error) {
      console.error(`[PlanesMejoramientoService.crearNotificacionesPlanCreado] Error al obtener Jefes de Control Interno:`, error);
    }

    // 3. Obtener auditor líder si hay auditoría
    if (auditoriaId) {
      try {
        const auditoria = await this.auditoriaRepository.findOne({
          where: { id: auditoriaId },
        });
        if (auditoria?.auditorLiderId) {
          const auditorLiderId = String(auditoria.auditorLiderId);
          if (!usuariosNotificar.includes(auditorLiderId)) {
            usuariosNotificar.push(auditorLiderId);
            console.log(`[PlanesMejoramientoService.crearNotificacionesPlanCreado] Auditor líder agregado: id_tercero=${auditorLiderId}`);
          }
        }
      } catch (error) {
        console.error(`[PlanesMejoramientoService.crearNotificacionesPlanCreado] Error al obtener auditor líder:`, error);
      }
    }

    // Eliminar duplicados
    const usuariosUnicos = [...new Set(usuariosNotificar)];
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
   * Obtiene los IDs de usuarios con rol JEFE_CONTROL_INTERNO
   */
  private async obtenerJefesControlInterno(): Promise<string[]> {
    try {
      const result = await this.dataSource.query(`
        SELECT DISTINCT u.id_tercero
        FROM auth."user" u
        INNER JOIN auth.user_roles ur ON ur.id_user = u.id_user
        INNER JOIN auth.role r ON r.id = ur.id_rol
        WHERE r.code = 'JEFE_CONTROL_INTERNO'
          AND ur.is_active = true
          AND u.is_active = true
      `);

      return result.map((row: any) => String(row.id_tercero));
    } catch (error) {
      console.error('[PlanesMejoramientoService.obtenerJefesControlInterno] Error:', error);
      return [];
    }
  }
}

