import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { existsSync, mkdirSync, unlinkSync, renameSync } from 'fs';
import { extname, resolve as pathResolve } from 'path';
import { PlanAnual5Roles } from './entities/plan-anual-5-roles.entity';
import { RolPlanAnual5 } from './entities/rol-plan-anual-5.entity';
import { ActividadPlanAnual5 } from './entities/actividad-plan-anual-5.entity';
import { AdjuntoActividadPlanAnual5 } from './entities/adjunto-actividad-plan-anual-5.entity';
import { HistorialPlanAnual, TipoEventoPlanAnual } from './entities/historial-plan-anual.entity';
import { PlanAnualWizardBorrador } from './entities/plan-anual-wizard-borrador.entity';
import { CreatePlanAnual5RolesDto } from './dto/create-plan-anual-5-roles.dto';
import { UpdateRolPlanAnual5Dto } from './dto/update-rol-plan-anual-5.dto';
import { CreateActividadDto } from './dto/create-actividad.dto';
import { CreateAdjuntoDto } from './dto/create-adjunto.dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { TipoNotificacion, PrioridadNotificacion, CanalNotificacion } from '../notificaciones/entities/notificacion.entity';

const COLOMBIA_TIME_ZONE = 'America/Bogota';

function getFechaHoraColombia(): { fecha: Date; hora: string } {
  const ahora = new Date();
  const fechaString = new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
  const hora = new Intl.DateTimeFormat('en-GB', {
    timeZone: COLOMBIA_TIME_ZONE,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(ahora);
  const [year, month, day] = fechaString.split('-').map(Number);

  return { fecha: new Date(year, month - 1, day, 12), hora };
}

// Interfaz para roles del template
interface RolTemplate {
  rol_numero: number;
  nombre: string;
  descripcion: string;
  color: string;
}

@Injectable()
export class PlanAnual5RolesService {
  private static readonly ESTADOS_PLAN_VALIDOS = new Set([
    'borrador',
    'en-revision',
    'aprobado',
    'en-ejecucion',
    'completado',
  ]);

  /** YYYY-MM-DD → Date en UTC (evita corrimiento de día por UTC al guardar con TypeORM). */
  private fechaSoloDia(valor?: string): Date | undefined {
    if (!valor?.trim()) return undefined;
    const base = valor.trim().split('T')[0];
    const m = base.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return undefined;
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  }

  private normalizarEstadoPlan(estado?: string): 'borrador' | 'en-revision' | 'aprobado' | 'en-ejecucion' | 'completado' {
    const estadoNormalizado = (estado || 'borrador').trim().toLowerCase().replace(/_/g, '-');

    // Compatibilidad con valores legacy usados por frontend/servicio.
    if (estadoNormalizado === 'activo' || estadoNormalizado === 'vigente') {
      return 'en-ejecucion';
    }

    if (!PlanAnual5RolesService.ESTADOS_PLAN_VALIDOS.has(estadoNormalizado)) {
      throw new BadRequestException(
        `Estado de plan inválido: "${estado}". Valores permitidos: borrador, en-revision, aprobado, en-ejecucion, completado.`,
      );
    }

    return estadoNormalizado as 'borrador' | 'en-revision' | 'aprobado' | 'en-ejecucion' | 'completado';
  }

  constructor(
    @InjectRepository(PlanAnual5Roles)
    private readonly planRepository: Repository<PlanAnual5Roles>,
    @InjectRepository(RolPlanAnual5)
    private readonly rolRepository: Repository<RolPlanAnual5>,
    @InjectRepository(ActividadPlanAnual5)
    private readonly actividadRepository: Repository<ActividadPlanAnual5>,
    @InjectRepository(AdjuntoActividadPlanAnual5)
    private readonly adjuntoRepository: Repository<AdjuntoActividadPlanAnual5>,
    @InjectRepository(HistorialPlanAnual)
    private readonly historialRepository: Repository<HistorialPlanAnual>,
    @InjectRepository(PlanAnualWizardBorrador)
    private readonly wizardBorradorRepository: Repository<PlanAnualWizardBorrador>,
    private readonly dataSource: DataSource,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  async findAll(year?: number, light = true): Promise<PlanAnual5Roles[]> {
    const query = this.planRepository
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.roles', 'roles')
      .leftJoinAndSelect('roles.actividades', 'actividades')
      .where('plan.año > 0')
      .orderBy('plan.año', 'DESC')
      .addOrderBy('roles.rol_numero', 'ASC')
      .addOrderBy('actividades.created_at', 'ASC');

    if (!light) {
      query.leftJoinAndSelect('actividades.adjuntos', 'adjuntos');
    }

    if (year) {
      query.andWhere('plan.año = :year', { year });
    }

    const plans = await query.getMany();

    // Enrich with responsable_email from auth.personas
    const responsableIds = [...new Set(plans.map((p) => p.responsable_id).filter(Boolean))];
    if (responsableIds.length > 0) {
      try {
        const rows = await this.dataSource.query(
          `SELECT id_person, dir_email FROM auth.personas WHERE id_person = ANY($1::uuid[])`,
          [responsableIds]
        );
        const emailMap = new Map<string, string>();
        for (const row of rows) {
          if (row.id_person && row.dir_email) {
            emailMap.set(String(row.id_person), String(row.dir_email));
          }
        }
        for (const plan of plans) {
          if (plan.responsable_id && emailMap.has(String(plan.responsable_id))) {
            (plan as any).responsable_email = emailMap.get(String(plan.responsable_id));
          }
        }
      } catch (err) {
        console.error('[PlanAnual5RolesService] Error enriching findAll with responsable_email:', err);
      }
    }

    return plans;
  }

  async findOne(id: string): Promise<PlanAnual5Roles> {
    const plan = await this.planRepository
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.roles', 'roles')
      .leftJoinAndSelect('roles.actividades', 'actividades')
      .leftJoinAndSelect('actividades.adjuntos', 'adjuntos')
      .where('plan.id = :id', { id })
      .andWhere('plan.año > 0')
      .orderBy('roles.rol_numero', 'ASC')
      .addOrderBy('actividades.created_at', 'ASC')
      .getOne();

    if (!plan) {
      throw new NotFoundException(`Plan Anual con ID ${id} no encontrado`);
    }

    // Enrich with responsable_email
    if (plan.responsable_id) {
      try {
        const rows = await this.dataSource.query(
          `SELECT dir_email FROM auth.personas WHERE id_person = $1::uuid`,
          [plan.responsable_id]
        );
        if (rows && rows.length > 0 && rows[0].dir_email) {
          (plan as any).responsable_email = rows[0].dir_email;
        }
      } catch (err) {
        console.error('[PlanAnual5RolesService] Error enriching findOne with responsable_email:', err);
      }
    }

    return plan;
  }

  async findByYear(year: number): Promise<PlanAnual5Roles | null> {
    const plan = await this.planRepository
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.roles', 'roles')
      .leftJoinAndSelect('roles.actividades', 'actividades')
      .leftJoinAndSelect('actividades.adjuntos', 'adjuntos')
      .where('plan.año = :year', { year })
      .andWhere('plan.año > 0')
      .orderBy('plan.fecha_creacion', 'DESC') // El más reciente primero
      .addOrderBy('roles.rol_numero', 'ASC')
      .addOrderBy('actividades.created_at', 'ASC')
      .getOne();

    if (plan && plan.responsable_id) {
      try {
        const rows = await this.dataSource.query(
          `SELECT dir_email FROM auth.personas WHERE id_person = $1::uuid`,
          [plan.responsable_id]
        );
        if (rows && rows.length > 0 && rows[0].dir_email) {
          (plan as any).responsable_email = rows[0].dir_email;
        }
      } catch (err) {
        console.error('[PlanAnual5RolesService] Error enriching findByYear with responsable_email:', err);
      }
    }

    return plan;
  }

  async create(createDto: CreatePlanAnual5RolesDto, usuarioId?: string): Promise<PlanAnual5Roles> {
    // Verificar si ya existe un plan para la misma vigencia
    const existing = await this.findByYear(createDto.año);
    if (existing) {
      if (existing.estado === 'borrador') {
        // Eliminar el borrador existente para permitir la creación del nuevo plan
        await this.planRepository.remove(existing);
      } else {
        throw new BadRequestException(`Ya existe un plan anual activo para la vigencia ${createDto.año}.`);
      }
    }

    // Crear el plan
    const plan: PlanAnual5Roles = this.planRepository.create({
      año: createDto.año,
      responsable: createDto.responsable,
      responsable_id: createDto.responsable_id,
      fecha_inicio: this.fechaSoloDia(createDto.fecha_inicio),
      fecha_fin: this.fechaSoloDia(createDto.fecha_fin),
      estado: this.normalizarEstadoPlan(createDto.estado),
      fecha_creacion: new Date(),
      equipo_aprobacion: createDto.equipo_aprobacion || [],
      orden_aprobacion: createDto.orden_aprobacion || 'secuencial',
    });

    const savedPlan: PlanAnual5Roles = await this.planRepository.save(plan);

    // Obtener roles del template desde la BD (NO desde memoria)
    const rolesTemplate = await this.getRolesTemplate();

    if (rolesTemplate.length === 0) {
      console.warn(`[PlanAnual5Roles] No se encontraron roles en el template para inicializar el plan.`);
    }

    // Crear los roles basados en el template de la BD (ya vienen ordenados por rol_numero)
    const roles = rolesTemplate.map((rolTemplate) =>
      this.rolRepository.create({
        planId: savedPlan.id,
        rol_numero: rolTemplate.rol_numero,
        nombre: rolTemplate.nombre,
        descripcion: rolTemplate.descripcion,
        color: rolTemplate.color,
      }),
    );

    await this.rolRepository.save(roles);

    // Registrar en historial
    await this.registrarHistorial(
      savedPlan.id,
      TipoEventoPlanAnual.CREACION,
      'Creación de Plan Anual',
      `Plan Anual ${createDto.año} creado`,
      usuarioId,
      undefined,
      savedPlan.estado
    );

    // Crear notificaciones después de guardar el plan anual
    try {
      await this.crearNotificacionesPlanAnualCreado(savedPlan);
    } catch (notifError) {
      // No fallar la creación si las notificaciones fallan
      console.error('[PlanAnual5RolesService.create] Error al crear notificaciones:', notifError);
    }

    // Recargar con relaciones (los roles ya vienen ordenados por rol_numero desde el template)
    return this.findOne(savedPlan.id);
  }

  /**
   * Actualiza un plan anual existente
   */
  async update(id: string, updateDto: Partial<CreatePlanAnual5RolesDto>, usuarioId?: string): Promise<PlanAnual5Roles> {
    const plan = await this.findOne(id);
    const estadoAnterior = plan.estado;
    const cambios: Array<{ campo: string; valorAnterior: string; valorNuevo: string }> = [];

    // Actualizar campos si se proporcionan
    if (updateDto.año !== undefined && updateDto.año !== plan.año) {
      // Verificar que no exista otro plan con ese año
      const existing = await this.findByYear(updateDto.año);
      if (existing && existing.id !== id) {
        throw new BadRequestException(`Ya existe un plan anual para el año ${updateDto.año}`);
      }
      cambios.push({ campo: 'año', valorAnterior: String(plan.año), valorNuevo: String(updateDto.año) });
      plan.año = updateDto.año;
    }

    if (updateDto.responsable !== undefined && updateDto.responsable !== plan.responsable) {
      cambios.push({ campo: 'responsable', valorAnterior: plan.responsable, valorNuevo: updateDto.responsable });
      plan.responsable = updateDto.responsable;
    }

    if (updateDto.responsable_id !== undefined && updateDto.responsable_id !== plan.responsable_id) {
      cambios.push({ campo: 'responsable_id', valorAnterior: plan.responsable_id || '', valorNuevo: updateDto.responsable_id || '' });
      plan.responsable_id = updateDto.responsable_id;
    }

    if (updateDto.estado !== undefined) {
      const estadoNormalizado = this.normalizarEstadoPlan(updateDto.estado);
      if (estadoNormalizado !== plan.estado) {
        cambios.push({ campo: 'estado', valorAnterior: plan.estado, valorNuevo: estadoNormalizado });
        plan.estado = estadoNormalizado;
      }
    }

    // Sanea estado legacy en la fila (ej. BORRADOR) para que no falle cualquier otro UPDATE.
    plan.estado = this.normalizarEstadoPlan(plan.estado);

    if (updateDto.equipo_aprobacion !== undefined) {
      // Comparación profunda simple para historial es compleja, marcamos como actualizado
      cambios.push({ campo: 'equipo_aprobacion', valorAnterior: 'previo', valorNuevo: 'actualizado' });
      plan.equipo_aprobacion = updateDto.equipo_aprobacion;
    }

    if (updateDto.orden_aprobacion !== undefined && updateDto.orden_aprobacion !== plan.orden_aprobacion) {
      cambios.push({ campo: 'orden_aprobacion', valorAnterior: plan.orden_aprobacion || 'secuencial', valorNuevo: updateDto.orden_aprobacion });
      plan.orden_aprobacion = updateDto.orden_aprobacion;
    }

    // Persistir firma de activación del Jefe OCI cuando se activa el plan
    if ((updateDto as any).firma_activacion !== undefined) {
      plan.firma_activacion = (updateDto as any).firma_activacion;
      cambios.push({ campo: 'firma_activacion', valorAnterior: 'sin firma', valorNuevo: 'firmado' });
    }

    // Manejo de fecha_inicio y fecha_fin del plan
    const oldFechaInicio = plan.fecha_inicio 
      ? (plan.fecha_inicio instanceof Date ? plan.fecha_inicio.toISOString().split('T')[0] : String(plan.fecha_inicio))
      : null;
    const oldFechaFin = plan.fecha_fin 
      ? (plan.fecha_fin instanceof Date ? plan.fecha_fin.toISOString().split('T')[0] : String(plan.fecha_fin))
      : null;

    if (updateDto.fecha_inicio !== undefined) {
      const newVal = updateDto.fecha_inicio;
      if (newVal !== oldFechaInicio) {
        cambios.push({ campo: 'fecha_inicio', valorAnterior: oldFechaInicio || '', valorNuevo: newVal });
        plan.fecha_inicio = this.fechaSoloDia(newVal);
      }
    }
    if (updateDto.fecha_fin !== undefined) {
      const newVal = updateDto.fecha_fin;
      if (newVal !== oldFechaFin) {
        cambios.push({ campo: 'fecha_fin', valorAnterior: oldFechaFin || '', valorNuevo: newVal });
        plan.fecha_fin = this.fechaSoloDia(newVal);
      }
    }

    const savedPlan: PlanAnual5Roles = await this.planRepository.save(plan);

    // Propagar fechas del plan a actividades que aún tienen las fechas anteriores
    const fechaInicioChanged = cambios.some(c => c.campo === 'fecha_inicio');
    const fechaFinChanged = cambios.some(c => c.campo === 'fecha_fin');
    if (fechaInicioChanged || fechaFinChanged) {
      try {
        if (fechaInicioChanged && oldFechaInicio) {
          await this.dataSource.query(`
            UPDATE control_interno.actividad_plan_anual_5 
            SET fecha_inicio = $1::date, updated_at = CURRENT_TIMESTAMP
            WHERE plan_id = $2 AND fecha_inicio = $3::date AND activo = true
          `, [updateDto.fecha_inicio, savedPlan.id, oldFechaInicio]);
        }
        if (fechaFinChanged && oldFechaFin) {
          await this.dataSource.query(`
            UPDATE control_interno.actividad_plan_anual_5 
            SET fecha_fin = $1::date, updated_at = CURRENT_TIMESTAMP
            WHERE plan_id = $2 AND fecha_fin = $3::date AND activo = true
          `, [updateDto.fecha_fin, savedPlan.id, oldFechaFin]);
        }
        console.log(`[PlanAnual] Fechas propagadas a actividades del plan ${savedPlan.id}`);
      } catch (propError) {
        console.error('[PlanAnual] Error propagando fechas a actividades:', propError);
      }
    }

    // Registrar en historial si hubo cambios
    if (cambios.length > 0) {
      await this.registrarHistorial(
        savedPlan.id,
        updateDto.estado !== estadoAnterior ? TipoEventoPlanAnual.CAMBIO_ESTADO : TipoEventoPlanAnual.ACTUALIZACION,
        'Actualización de Plan Anual',
        `Plan Anual actualizado: ${cambios.map(c => c.campo).join(', ')}`,
        usuarioId,
        estadoAnterior,
        savedPlan.estado,
        cambios
      );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NOTIFICACIONES: Enviar al Jefe OCI cuando el plan se envía a revisión
    // ═══════════════════════════════════════════════════════════════════════════
    if (updateDto.estado && updateDto.estado !== estadoAnterior) {
      try {
        await this.notificarCambioEstadoPlan(savedPlan, estadoAnterior, updateDto.estado);
      } catch (notifError) {
        // No fallar la operación si las notificaciones fallan
        console.error('[PlanAnual5RolesService.update] Error al enviar notificaciones:', notifError);
      }
    }

    return this.findOne(savedPlan.id);
  }

  /**
   * Obtiene los roles del template desde la BD (NO desde memoria)
   */
  private async getRolesTemplate(): Promise<RolTemplate[]> {
    const query = `
      SELECT rol_numero, nombre, descripcion, color
      FROM control_interno.rol_decreto_648_template
      WHERE activo = true
      ORDER BY rol_numero ASC
    `;

    const result = await this.dataSource.query(query);
    return result.map((row: any) => ({
      rol_numero: row.rol_numero,
      nombre: row.nombre,
      descripcion: row.descripcion,
      color: row.color,
    }));
  }

  async addActividad(rolId: string, createDto: CreateActividadDto, usuarioId?: string | number): Promise<ActividadPlanAnual5> {
    // 🔍 LOG: Ver qué llega del frontend
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 [addActividad] Recibido createDto:');
    console.log('   - nombre:', createDto.nombre);
    console.log('   - configuracionEvidencias (RAW):', JSON.stringify(createDto.configuracionEvidencias, null, 2));
    console.log('   - entradas_seguimiento (RAW):', JSON.stringify(createDto.entradas_seguimiento, null, 2));
    console.log('   - tiene entradas?:', !!createDto.entradas_seguimiento);
    console.log('   - cantidad entradas:', createDto.entradas_seguimiento?.length || 0);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const rol = await this.rolRepository.findOne({
      where: { id: rolId },
      relations: ['plan'],
    });

    if (!rol) {
      throw new NotFoundException(`Rol con ID ${rolId} no encontrado`);
    }

    // Fechas: prioridad actividad → plan → hoy (fallback, NO hardcodeadas)
    const planFechaInicio = rol.plan?.fecha_inicio 
      ? (rol.plan.fecha_inicio instanceof Date ? rol.plan.fecha_inicio.toISOString().split('T')[0] : String(rol.plan.fecha_inicio))
      : null;
    const planFechaFin = rol.plan?.fecha_fin 
      ? (rol.plan.fecha_fin instanceof Date ? rol.plan.fecha_fin.toISOString().split('T')[0] : String(rol.plan.fecha_fin))
      : null;
    const fechaInicio = createDto.fecha_inicio || planFechaInicio || new Date().toISOString().split('T')[0];
    const fechaFin = createDto.fecha_fin || planFechaFin || new Date().toISOString().split('T')[0];
    
    // Asignar configuración de evidencias por defecto si no se proporciona
    // Los campos documentos/observaciones se derivan de adjuntosRequeridos/observacionRequerida
    let configEvidencias = createDto.configuracionEvidencias;
    console.log('🔧 [addActividad] configEvidencias ANTES de procesar:', configEvidencias ? 'TIENE VALOR' : 'ES NULL/UNDEFINED');
    
    if (!configEvidencias) {
      // Por defecto: todo flexible/opcional  
      configEvidencias = {
        observaciones: false,
        documentos: false,
        observacionRequerida: 'OPCIONAL' as const,
        adjuntosRequeridos: 'OPCIONAL' as const,
        minimoAdjuntos: 0,
        longitudMinimaObservacion: 0
      };
      console.log('⚠️ [addActividad] No vino configuración, usando defaults');
    } else {
      console.log('📋 [addActividad] Procesando configuración recibida...');
      console.log('   - adjuntosRequeridos:', configEvidencias.adjuntosRequeridos);
      console.log('   - observacionRequerida:', configEvidencias.observacionRequerida);
      console.log('   - documentos (recibido):', configEvidencias.documentos);
      console.log('   - observaciones (recibido):', configEvidencias.observaciones);
      
      // Si vienen adjuntosRequeridos/observacionRequerida (formato legacy), derivar documentos/observaciones
      // Si solo vienen documentos/observaciones como booleanos (formato nuevo), usarlos directamente
      if (configEvidencias.adjuntosRequeridos !== undefined) {
        configEvidencias.documentos = configEvidencias.adjuntosRequeridos !== 'NO_REQUERIDO';
      } else if (configEvidencias.documentos === undefined) {
        configEvidencias.documentos = false; // Default
      }
      // Si ya viene documentos como booleano, lo respetamos
      
      if (configEvidencias.observacionRequerida !== undefined) {
        configEvidencias.observaciones = configEvidencias.observacionRequerida !== 'NO_REQUERIDO';
      } else if (configEvidencias.observaciones === undefined) {
        configEvidencias.observaciones = false; // Default
      }
      // Si ya viene observaciones como booleano, lo respetamos
      
      console.log('   - documentos (final):', configEvidencias.documentos);
      console.log('   - observaciones (final):', configEvidencias.observaciones);
      
      // Asegurar valores por defecto para campos numéricos
      if (configEvidencias.minimoAdjuntos === undefined) {
        configEvidencias.minimoAdjuntos = configEvidencias.adjuntosRequeridos === 'OBLIGATORIO' ? 1 : 0;
      }
      if (configEvidencias.longitudMinimaObservacion === undefined) {
        configEvidencias.longitudMinimaObservacion = configEvidencias.observacionRequerida === 'OBLIGATORIO' ? 10 : 0;
      }
    }
    
    console.log('✅ [addActividad] configEvidencias FINAL:', JSON.stringify(configEvidencias, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Log de entradas de seguimiento antes del INSERT
    const entradasArray = createDto.entradas_seguimiento || [];
    const entradasSeguimientoStr = JSON.stringify(entradasArray);
    console.log('💾 [addActividad] Guardando entradas_seguimiento:', entradasSeguimientoStr);
    console.log('💾 [addActividad] Tipo:', typeof entradasSeguimientoStr, 'Longitud:', entradasSeguimientoStr.length);
    
    const query = `
      INSERT INTO control_interno.actividad_plan_anual_5 
      (rol_id, plan_id, nombre, descripcion, responsable, fecha_inicio, fecha_fin, estado, porcentaje_avance, observaciones, prioridad,
       control, evaluacion, seguimiento, requiere_verificacion_director, verificada_por_director, fecha_verificacion, observaciones_director, configuracion_evidencias,
       puntos_control, frecuencia_puntos_control, responsables, fecha_corte, entradas_seguimiento, tareas_seguimiento)
      VALUES ($1, $2, $3, $4, $5, $6::date, $7::date, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, $20::jsonb, $21, $22::jsonb, $23::date, $24::jsonb, $25::jsonb)
      RETURNING *
    `;
    
    const result = await this.dataSource.query(query, [
      rol.id,
      rol.planId,
      createDto.nombre,
      createDto.descripcion || null,
      createDto.responsable,
      fechaInicio, // Se inserta como string, PostgreSQL lo convierte a DATE
      fechaFin, // Se inserta como string, PostgreSQL lo convierte a DATE
      createDto.estado || 'pendiente',
      createDto.porcentaje_avance || 0,
      createDto.observaciones || null,
      createDto.prioridad || 'Media',
      // Nuevos campos migración 129
      createDto.control || null,
      createDto.evaluacion || null,
      createDto.seguimiento || null,
      createDto.requiereVerificacionDirector || false,
      createDto.verificadaPorDirector || false,
      createDto.fechaVerificacion || null,
      createDto.observacionesDirector || null,
      JSON.stringify(configEvidencias),  // $19::jsonb
      // Puntos de control y responsables múltiples
      JSON.stringify(createDto.puntos_control || []),  // $20::jsonb
      createDto.frecuencia_puntos_control || null,  // $21
      JSON.stringify(createDto.responsables || []),  // $22::jsonb
      createDto.fecha_corte || null,  // $23::date
      // ⚡ NUEVO: Entradas de seguimiento iniciales
      entradasSeguimientoStr,  // $24::jsonb
      // ⚡ NUEVO: Tareas de seguimiento (sub-tareas)
      JSON.stringify(createDto.tareas_seguimiento || []),  // $25::jsonb
    ]);

    const saved = result[0];
    console.log('✅ [addActividad] Actividad guardada con ID:', saved.id);
    console.log('📊 [addActividad] entradas_seguimiento guardadas:', saved.entradas_seguimiento?.length || 0);

    // Recalcular estadísticas del rol
    await this.recalcularRol(rolId);

    // Recalcular estadísticas del plan
    await this.recalcularPlan(rol.planId);

    // Registrar en historial
    await this.registrarHistorial(
      rol.planId,
      TipoEventoPlanAnual.ACTIVIDAD_CREADA,
      'Actividad creada',
      `Actividad "${createDto.nombre}" agregada al rol ${rol.nombre}`,
      usuarioId,
      undefined,
      undefined,
      [{ campo: 'actividad', valorAnterior: '', valorNuevo: createDto.nombre }]
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // AUTO-CONFIGURAR ACTIVIDAD DE AUDITORÍAS SI ES DEL ROL 4
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      const nombreLower = createDto.nombre.toLowerCase();
      const esActividadAuditorias = 
        rol.rol_numero === 4 && 
        (nombreLower.includes('auditoría') || 
         nombreLower.includes('auditoria') || 
         nombreLower.includes('programa de auditor'));

      if (esActividadAuditorias) {
        console.log(`[addActividad] 🔗 Auto-configurando actividad ${saved.id} como actividad de auditorías (Rol 4)`);
        
        // Usar la función SQL para configurar
        await this.dataSource.query(`
          SELECT control_interno.fn_configurar_actividad_auditorias_plan($1, $2)
        `, [rol.planId, rol.plan.año]);
        
        console.log(`[addActividad] ✅ Actividad de auditorías configurada automáticamente`);
      }
    } catch (autoConfigError) {
      // No fallar la creación si la auto-configuración falla
      console.error('[addActividad] ⚠️ Error en auto-configuración de auditorías:', autoConfigError);
    }

    // Recargar la actividad con relaciones
    return this.actividadRepository.findOne({
      where: { id: saved.id },
      relations: ['rol', 'plan'],
    }) as Promise<ActividadPlanAnual5>;
  }

  async updateActividad(
    actividadId: string,
    updateDto: Partial<CreateActividadDto>,
    usuarioId?: string,
  ): Promise<ActividadPlanAnual5> {
    const actividad = await this.actividadRepository.findOne({
      where: { id: actividadId },
      relations: ['rol', 'plan'],
    });

    if (!actividad) {
      throw new NotFoundException(`Actividad con ID ${actividadId} no encontrada`);
    }

    // ========================================
    // VALIDACIÓN DE EVIDENCIAS REQUERIDAS
    // ========================================
    // Si se intenta completar la actividad (100% o estado='completada'),
    // verificar que se cumplan los requisitos de evidencia
    const intentaCompletar = 
      (updateDto.porcentaje_avance !== undefined && updateDto.porcentaje_avance === 100) ||
      (updateDto.estado !== undefined && updateDto.estado === 'completada');

    if (intentaCompletar && actividad.configuracionEvidencias) {
      const config = typeof actividad.configuracionEvidencias === 'string' 
        ? JSON.parse(actividad.configuracionEvidencias) 
        : actividad.configuracionEvidencias;
      
      console.log('🔍 [updateActividad] Validando evidencias para completar:', JSON.stringify(config));
      
      // Verificar si se requieren documentos/adjuntos
      if (config.documentos === true) {
        const adjuntosCount = await this.adjuntoRepository.count({
          where: { actividadId: actividadId }
        });
        console.log(`📎 Adjuntos encontrados: ${adjuntosCount}, requeridos: ${config.minimoAdjuntos || 1}`);
        
        const minimoRequerido = config.minimoAdjuntos || 1;
        if (adjuntosCount < minimoRequerido) {
          throw new BadRequestException(
            `No puede completar esta actividad. Se requiere${minimoRequerido > 1 ? 'n' : ''} al menos ${minimoRequerido} adjunto${minimoRequerido > 1 ? 's' : ''}, pero solo hay ${adjuntosCount}.`
          );
        }
      }
      
      // Verificar si se requieren observaciones
      if (config.observaciones === true) {
        // La observación puede venir en el updateDto o ya estar en la actividad
        const observacionActual = updateDto.observaciones ?? actividad.observaciones;
        const longitudMinima = config.longitudMinimaObservacion || 10;
        
        console.log(`📝 Observación actual: "${observacionActual}", longitud mínima: ${longitudMinima}`);
        
        if (!observacionActual || observacionActual.trim().length < longitudMinima) {
          throw new BadRequestException(
            `No puede completar esta actividad. Se requiere una observación con al menos ${longitudMinima} caracteres.`
          );
        }
      }
      
      console.log('✅ Validación de evidencias completada exitosamente');
    }
    // ========================================

    // Construir query de actualización con fechas como strings
    const updates: string[] = [];
    const values: any[] = [];
    const cambios: Array<{ campo: string; valorAnterior: string; valorNuevo: string }> = [];
    let paramIndex = 1;

    if (updateDto.nombre !== undefined && updateDto.nombre !== actividad.nombre) {
      updates.push(`nombre = $${paramIndex++}`);
      values.push(updateDto.nombre);
      cambios.push({ campo: 'nombre', valorAnterior: actividad.nombre, valorNuevo: updateDto.nombre });
    }
    if (updateDto.descripcion !== undefined && updateDto.descripcion !== actividad.descripcion) {
      updates.push(`descripcion = $${paramIndex++}`);
      values.push(updateDto.descripcion);
      cambios.push({ campo: 'descripcion', valorAnterior: actividad.descripcion || '', valorNuevo: updateDto.descripcion });
    }
    if (updateDto.responsable !== undefined && updateDto.responsable !== actividad.responsable) {
      updates.push(`responsable = $${paramIndex++}`);
      values.push(updateDto.responsable);
      cambios.push({ campo: 'responsable', valorAnterior: actividad.responsable, valorNuevo: updateDto.responsable });
    }
    if (updateDto.fecha_inicio) {
      const fechaInicioStr = updateDto.fecha_inicio;
      const fechaActualStr = actividad.fecha_inicio instanceof Date 
        ? actividad.fecha_inicio.toISOString().split('T')[0] 
        : actividad.fecha_inicio;
      
      if (fechaInicioStr !== fechaActualStr) {
        updates.push(`fecha_inicio = $${paramIndex++}::date`);
        values.push(updateDto.fecha_inicio);
        cambios.push({ campo: 'fecha_inicio', valorAnterior: fechaActualStr, valorNuevo: updateDto.fecha_inicio });
      }
    }
    if (updateDto.fecha_fin) {
      const fechaFinStr = updateDto.fecha_fin;
      const fechaActualStr = actividad.fecha_fin instanceof Date 
        ? actividad.fecha_fin.toISOString().split('T')[0] 
        : actividad.fecha_fin;
      
      if (fechaFinStr !== fechaActualStr) {
        updates.push(`fecha_fin = $${paramIndex++}::date`);
        values.push(updateDto.fecha_fin);
        cambios.push({ campo: 'fecha_fin', valorAnterior: fechaActualStr, valorNuevo: updateDto.fecha_fin });
      }
    }
    if (updateDto.estado !== undefined && updateDto.estado !== actividad.estado) {
      updates.push(`estado = $${paramIndex++}`);
      values.push(updateDto.estado);
      cambios.push({ campo: 'estado', valorAnterior: actividad.estado, valorNuevo: updateDto.estado });
    }
    if (updateDto.porcentaje_avance !== undefined && updateDto.porcentaje_avance !== actividad.porcentaje_avance) {
      updates.push(`porcentaje_avance = $${paramIndex++}`);
      values.push(updateDto.porcentaje_avance);
      cambios.push({ campo: 'porcentaje_avance', valorAnterior: String(actividad.porcentaje_avance), valorNuevo: String(updateDto.porcentaje_avance) });
    }
    if (updateDto.observaciones !== undefined && updateDto.observaciones !== actividad.observaciones) {
      updates.push(`observaciones = $${paramIndex++}`);
      values.push(updateDto.observaciones);
      cambios.push({ campo: 'observaciones', valorAnterior: actividad.observaciones || '', valorNuevo: updateDto.observaciones });
    }
    if (updateDto.prioridad !== undefined && updateDto.prioridad !== actividad.prioridad) {
      updates.push(`prioridad = $${paramIndex++}`);
      values.push(updateDto.prioridad);
      cambios.push({ campo: 'prioridad', valorAnterior: actividad.prioridad || '', valorNuevo: updateDto.prioridad });
    }
    if (updateDto.control !== undefined && updateDto.control !== actividad.control) {
      updates.push(`control = $${paramIndex++}`);
      values.push(updateDto.control);
      cambios.push({ campo: 'control', valorAnterior: actividad.control || '', valorNuevo: updateDto.control });
    }
    if (updateDto.evaluacion !== undefined && updateDto.evaluacion !== actividad.evaluacion) {
      updates.push(`evaluacion = $${paramIndex++}`);
      values.push(updateDto.evaluacion);
      cambios.push({ campo: 'evaluacion', valorAnterior: actividad.evaluacion || '', valorNuevo: updateDto.evaluacion });
    }
    if (updateDto.seguimiento !== undefined && updateDto.seguimiento !== actividad.seguimiento) {
      updates.push(`seguimiento = $${paramIndex++}`);
      values.push(updateDto.seguimiento);
      cambios.push({ campo: 'seguimiento', valorAnterior: actividad.seguimiento || '', valorNuevo: updateDto.seguimiento });
    }
    // Entradas de seguimiento vinculadas a puntos de control
    if ((updateDto as any).entradas_seguimiento !== undefined) {
      const entradasStr = JSON.stringify((updateDto as any).entradas_seguimiento);
      updates.push(`entradas_seguimiento = $${paramIndex++}::jsonb`);
      values.push(entradasStr);
      cambios.push({ campo: 'entradas_seguimiento', valorAnterior: '(array)', valorNuevo: `${((updateDto as any).entradas_seguimiento as any[]).length} entradas` });
    }
    // Tareas de seguimiento (sub-tareas de la actividad)
    if ((updateDto as any).tareas_seguimiento !== undefined) {
      const tareasStr = JSON.stringify((updateDto as any).tareas_seguimiento);
      updates.push(`tareas_seguimiento = $${paramIndex++}::jsonb`);
      values.push(tareasStr);
      cambios.push({ campo: 'tareas_seguimiento', valorAnterior: '(array)', valorNuevo: `${((updateDto as any).tareas_seguimiento as any[]).length} tareas` });
    }
    // Puntos de control y responsables múltiples
    if (updateDto.puntos_control !== undefined) {
      updates.push(`puntos_control = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(updateDto.puntos_control));
      cambios.push({ campo: 'puntos_control', valorAnterior: '(array)', valorNuevo: `${updateDto.puntos_control.length} puntos` });
    }
    if (updateDto.frecuencia_puntos_control !== undefined) {
      updates.push(`frecuencia_puntos_control = $${paramIndex++}`);
      values.push(updateDto.frecuencia_puntos_control);
      cambios.push({ campo: 'frecuencia_puntos_control', valorAnterior: '', valorNuevo: updateDto.frecuencia_puntos_control });
    }
    if (updateDto.responsables !== undefined) {
      updates.push(`responsables = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(updateDto.responsables));
      cambios.push({ campo: 'responsables', valorAnterior: '(array)', valorNuevo: `${updateDto.responsables.length} responsables` });
    }
    if (updateDto.fecha_corte !== undefined) {
      updates.push(`fecha_corte = $${paramIndex++}::date`);
      values.push(updateDto.fecha_corte || null);
      cambios.push({ campo: 'fecha_corte', valorAnterior: '', valorNuevo: updateDto.fecha_corte || '' });
    }
    if (updateDto.configuracionEvidencias !== undefined) {
      const configStr = JSON.stringify(updateDto.configuracionEvidencias);
      const activConfigStr = actividad.configuracionEvidencias ? JSON.stringify(actividad.configuracionEvidencias) : null;
      if (configStr !== activConfigStr) {
        updates.push(`configuracion_evidencias = $${paramIndex++}::jsonb`);
        values.push(configStr);
        cambios.push({ campo: 'configuracion_evidencias', valorAnterior: activConfigStr || '', valorNuevo: configStr });
      }
    }
    if (updateDto.requiereVerificacionDirector !== undefined && updateDto.requiereVerificacionDirector !== actividad.requiereVerificacionDirector) {
      updates.push(`requiere_verificacion_director = $${paramIndex++}`);
      values.push(updateDto.requiereVerificacionDirector);
      cambios.push({ campo: 'requiere_verificacion_director', valorAnterior: String(actividad.requiereVerificacionDirector), valorNuevo: String(updateDto.requiereVerificacionDirector) });
    }
    // Soporte para campo activo (soft delete / reactivar)
    if ((updateDto as any).activo !== undefined && (updateDto as any).activo !== actividad.activo) {
      updates.push(`activo = $${paramIndex++}`);
      values.push((updateDto as any).activo);
      cambios.push({ campo: 'activo', valorAnterior: String(actividad.activo), valorNuevo: String((updateDto as any).activo) });
    }

    if (updates.length === 0) {
      return actividad;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(actividadId);

    const query = `
      UPDATE control_interno.actividad_plan_anual_5 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.dataSource.query(query, values);
    const updated = result[0];

    // Recalcular estadísticas
    await this.recalcularRol(actividad.rolId);
    await this.recalcularPlan(actividad.planId);

    // Registrar en historial si hubo cambios
    if (cambios.length > 0) {
      await this.registrarHistorial(
        actividad.planId,
        TipoEventoPlanAnual.ACTIVIDAD_ACTUALIZADA,
        'Actividad actualizada',
        `Actividad "${actividad.nombre}" actualizada: ${cambios.map(c => c.campo).join(', ')}`,
        usuarioId,
        undefined,
        undefined,
        cambios
      );
    }

    // Recargar la actividad actualizada con relaciones
    return this.actividadRepository.findOne({
      where: { id: actividadId },
      relations: ['rol', 'plan'],
    }) as Promise<ActividadPlanAnual5>;
  }

  async deleteActividad(actividadId: string, usuarioId?: string): Promise<void> {
    const actividad = await this.actividadRepository.findOne({
      where: { id: actividadId },
      relations: ['rol', 'plan'],
    });

    if (!actividad) {
      throw new NotFoundException(`Actividad con ID ${actividadId} no encontrada`);
    }

    const rolId = actividad.rolId;
    const planId = actividad.planId;
    const nombreActividad = actividad.nombre;

    // Soft delete: marcar como inactivo en lugar de eliminar
    actividad.activo = false;
    await this.actividadRepository.save(actividad);

    // Recalcular estadísticas
    await this.recalcularRol(rolId);
    await this.recalcularPlan(planId);

    // Registrar en historial
    await this.registrarHistorial(
      planId,
      TipoEventoPlanAnual.ACTIVIDAD_ELIMINADA,
      'Actividad desactivada',
      `Actividad "${nombreActividad}" marcada como inactiva`,
      usuarioId,
      undefined,
      undefined,
      [{ campo: 'activo', valorAnterior: 'true', valorNuevo: 'false' }]
    );
  }

  async remove(id: string, usuarioId?: string): Promise<void> {
    const plan = await this.planRepository.findOne({
      where: { id },
      relations: ['roles', 'roles.actividades', 'roles.actividades.adjuntos'],
    });

    if (!plan) {
      throw new NotFoundException(`Plan Anual con ID ${id} no encontrado`);
    }

    const vigenciaOriginal = plan.año;

    // Soft delete release pattern: usar estado válido para no violar CHECK.
    // El "eliminado lógico" se determina por año negativo.
    plan.estado = 'completado';
    // Liberar la vigencia para que el usuario pueda crear otro plan en el mismo año,
    // garantizando que no choque con la restricción @Unique(['año']) de TypeORM
    plan.año = -(Date.now() % 1000000000); 

    await this.planRepository.save(plan);

    // Dejar traza explícita e imborrable en el Módulo de Auditoría (Historial interno)
    await this.registrarHistorial(
      plan.id,
      TipoEventoPlanAnual.CAMBIO_ESTADO,
      'Eliminación de Plan Anual',
      `El Plan Anual de Auditoría de la vigencia ${vigenciaOriginal} fue eliminado por el usuario. Eliminación lógica registrada por control de trazabilidad.`,
      usuarioId,
      JSON.stringify({ accion: 'SOFT_DELETE', vigenciaOriginal }),
      'completado'
    );
  }

  async getRoles(planId: string): Promise<{ roles: RolPlanAnual5[] }> {
    const plan = await this.findOne(planId);
    // Ordenar roles por rol_numero y devolver en formato esperado
    const rolesOrdenados = (plan.roles || []).sort((a, b) => a.rol_numero - b.rol_numero);
    return { roles: rolesOrdenados };
  }

  /**
   * Actualiza el responsable del rol (independiente del responsable de cada actividad).
   */
  async updateRol(
    planId: string,
    rolId: string,
    updateDto: UpdateRolPlanAnual5Dto,
    usuarioId?: string,
  ): Promise<RolPlanAnual5> {
    const rol = await this.rolRepository.findOne({
      where: { id: rolId, planId },
    });
    if (!rol) {
      throw new NotFoundException(`Rol ${rolId} no encontrado en el plan ${planId}`);
    }

    const cambios: Array<{ campo: string; valorAnterior: string; valorNuevo: string }> = [];

    if (updateDto.responsable !== undefined && updateDto.responsable !== rol.responsable) {
      cambios.push({
        campo: 'responsable_rol',
        valorAnterior: rol.responsable || '',
        valorNuevo: updateDto.responsable,
      });
      rol.responsable = updateDto.responsable;
    }

    if (updateDto.responsable_id !== undefined && updateDto.responsable_id !== rol.responsable_id) {
      cambios.push({
        campo: 'responsable_id_rol',
        valorAnterior: rol.responsable_id || '',
        valorNuevo: updateDto.responsable_id || '',
      });
      rol.responsable_id = updateDto.responsable_id;
    }

    if (updateDto.responsables !== undefined) {
      rol.responsables = updateDto.responsables;
      if (!rol.responsable && updateDto.responsables.length > 0) {
        rol.responsable = updateDto.responsables[0].nombre;
        rol.responsable_id = updateDto.responsables[0].id || rol.responsable_id;
      }
    }

    if (updateDto.activo !== undefined && updateDto.activo !== rol.activo) {
      cambios.push({
        campo: 'activo',
        valorAnterior: String(rol.activo),
        valorNuevo: String(updateDto.activo),
      });
      rol.activo = updateDto.activo;
    }

    if (updateDto.nombre !== undefined && updateDto.nombre !== rol.nombre) {
      cambios.push({
        campo: 'nombre',
        valorAnterior: rol.nombre,
        valorNuevo: updateDto.nombre,
      });
      rol.nombre = updateDto.nombre;
    }

    if (updateDto.descripcion !== undefined && updateDto.descripcion !== rol.descripcion) {
      cambios.push({
        campo: 'descripcion',
        valorAnterior: rol.descripcion,
        valorNuevo: updateDto.descripcion,
      });
      rol.descripcion = updateDto.descripcion;
    }

    if (updateDto.color !== undefined && updateDto.color !== rol.color) {
      cambios.push({
        campo: 'color',
        valorAnterior: rol.color,
        valorNuevo: updateDto.color,
      });
      rol.color = updateDto.color;
    }

    const saved = await this.rolRepository.save(rol);

    if (cambios.length > 0) {
      await this.registrarHistorial(
        planId,
        TipoEventoPlanAnual.ACTUALIZACION,
        'Actualización responsable de rol',
        `Rol ${rol.rol_numero}: responsable actualizado`,
        usuarioId,
        undefined,
        undefined,
        cambios,
      );
    }

    return saved;
  }

  async addRolAdicional(
    planId: string,
    createRolDto: { nombre: string; descripcion: string; color: string; numero: number },
    usuarioId?: string,
  ): Promise<RolPlanAnual5> {
    const plan = await this.findOne(planId);
    if (!plan) throw new NotFoundException(`Plan ${planId} no encontrado`);

    const rol = this.rolRepository.create({
      planId: plan.id,
      rol_numero: createRolDto.numero,
      nombre: createRolDto.nombre,
      descripcion: createRolDto.descripcion,
      color: createRolDto.color,
      activo: true,
      responsables: []
    });

    const saved = await this.rolRepository.save(rol);

    await this.registrarHistorial(
      planId,
      TipoEventoPlanAnual.ACTUALIZACION,
      'Rol adicional creado',
      `Rol ${saved.rol_numero}: ${saved.nombre} agregado al plan`,
      usuarioId,
    );

    return saved;
  }

  private async recalcularRol(rolId: string): Promise<void> {
    const actividades = await this.actividadRepository.find({
      where: { rolId, activo: true },
    });

    const totalActividades = actividades.length;
    const actividadesCompletadas = actividades.filter((a) => a.estado === 'completada').length;
    const porcentajeCumplimiento =
      totalActividades > 0
        ? Math.round(
            actividades.reduce((sum, a) => sum + a.porcentaje_avance, 0) / totalActividades,
          )
        : 0;

    await this.rolRepository.update(rolId, {
      total_actividades: totalActividades,
      porcentaje_cumplimiento: porcentajeCumplimiento,
    });
  }

  private async recalcularPlan(planId: string): Promise<void> {
    const roles = await this.rolRepository.find({
      where: { planId, activo: true },
      relations: ['actividades'],
    });

    // Solo contar actividades activas
    const totalActividades = roles.reduce((sum, r) => sum + r.actividades.filter((a) => a.activo !== false).length, 0);
    const actividadesCompletadas = roles.reduce(
      (sum, r) => sum + r.actividades.filter((a) => a.activo !== false && a.estado === 'completada').length,
      0,
    );
    const actividadesEnProgreso = roles.reduce(
      (sum, r) => sum + r.actividades.filter((a) => a.activo !== false && a.estado === 'en-progreso').length,
      0,
    );

    const porcentajeCumplimiento =
      roles.length > 0
        ? Math.round(roles.reduce((sum, r) => sum + r.porcentaje_cumplimiento, 0) / roles.length)
        : 0;

    await this.planRepository.update(planId, {
      total_actividades: totalActividades,
      actividades_completadas: actividadesCompletadas,
      actividades_en_progreso: actividadesEnProgreso,
      porcentaje_cumplimiento_general: porcentajeCumplimiento,
    });
  }

  private readonly uuidRegexHistorial =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  /**
   * Resuelve auth.personas.id_person para historial_plan_anual.usuario_id (tipo UUID).
   * Acepta JWT sub (auth.user.id_user), id_person directo o id_tercero numérico legacy.
   */
  private async resolverIdPersonParaHistorial(
    usuarioId?: string | number,
  ): Promise<string | null> {
    if (usuarioId == null || usuarioId === '' || usuarioId === 'system') {
      return null;
    }

    const raw = String(usuarioId).trim();
    if (!this.uuidRegexHistorial.test(raw)) {
      const num = parseInt(raw, 10);
      if (Number.isNaN(num) || String(num) !== raw) {
        return null;
      }
      try {
        const rows = await this.dataSource.query(
          `SELECT id_person::text AS id_person
           FROM auth.personas
           WHERE id_tercero::text = $1
           LIMIT 1`,
          [raw],
        );
        return rows?.[0]?.id_person ? String(rows[0].id_person) : null;
      } catch {
        return null;
      }
    }

    try {
      const porUser = await this.dataSource.query(
        `SELECT u.id_person::text AS id_person
         FROM auth."user" u
         WHERE u.id_user::text = $1
         LIMIT 1`,
        [raw],
      );
      if (porUser?.[0]?.id_person) {
        return String(porUser[0].id_person);
      }

      const porPersona = await this.dataSource.query(
        `SELECT id_person::text AS id_person
         FROM auth.personas
         WHERE id_person::text = $1
         LIMIT 1`,
        [raw],
      );
      if (porPersona?.[0]?.id_person) {
        return String(porPersona[0].id_person);
      }
    } catch {
      return null;
    }

    return null;
  }

  /**
   * Registra un evento en el historial del plan anual
   */
  private async registrarHistorial(
    planId: string,
    tipoEvento: TipoEventoPlanAnual,
    accion: string,
    descripcion: string,
    usuarioId?: string | number,
    estadoAnterior?: string,
    estadoNuevo?: string,
    cambios?: Array<{ campo: string; valorAnterior: string; valorNuevo: string }>
  ): Promise<void> {
    try {
      const { fecha, hora } = getFechaHoraColombia();

      const historial = new HistorialPlanAnual();
      historial.planId = planId;
      historial.tipoEvento = tipoEvento;
      historial.fecha = fecha;
      historial.hora = hora;
      historial.usuarioId = await this.resolverIdPersonParaHistorial(usuarioId);
      historial.accion = accion;
      historial.descripcion = descripcion;
      historial.estadoAnterior = estadoAnterior;
      historial.estadoNuevo = estadoNuevo;
      
      if (cambios && cambios.length > 0) {
        historial.cambios = cambios;
      }

      await this.historialRepository.save(historial);
    } catch (error) {
      console.error('Error al registrar historial del plan anual:', error);
      // No lanzar error para que no afecte la operación principal
    }
  }

  /**
   * Crea notificaciones cuando se crea un plan anual
   */
  private async crearNotificacionesPlanAnualCreado(plan: PlanAnual5Roles): Promise<void> {
    console.log(`[PlanAnual5RolesService.crearNotificacionesPlanAnualCreado] Plan anual ${plan.año} creado`);
    
    const usuariosNotificar: string[] = [];

    // Buscar responsable por nombre
    if (plan.responsable) {
      try {
        const responsable = await this.dataSource.query(
          `SELECT id_tercero FROM auth.personas WHERE nom_largo ILIKE $1 OR CONCAT(nom_tercero, ' ', pri_apellido) ILIKE $1 LIMIT 1`,
          [`%${plan.responsable}%`]
        );
        if (responsable && responsable.length > 0) {
          usuariosNotificar.push(String(responsable[0].id_tercero));
        }
      } catch (error) {
        console.error(`[PlanAnual5RolesService.crearNotificacionesPlanAnualCreado] Error al buscar responsable:`, error);
      }
    }

    // Obtener Jefes de Control Interno
    try {
      const jefesOCI = await this.obtenerJefesControlInterno();
      usuariosNotificar.push(...jefesOCI);
    } catch (error) {
      console.error(`[PlanAnual5RolesService.crearNotificacionesPlanAnualCreado] Error al obtener Jefes:`, error);
    }

    const usuariosUnicos = [...new Set(usuariosNotificar)];

    for (const usuarioId of usuariosUnicos) {
      try {
        await this.notificacionesService.create({
          usuarioId,
          tipoNotificacion: TipoNotificacion.OTRO,
          titulo: `Plan Anual ${plan.año} Creado`,
          mensaje: `Se ha creado el Plan Anual ${plan.año}. Responsable: ${plan.responsable || 'No especificado'}.`,
          prioridad: PrioridadNotificacion.ALTA,
          canal: CanalNotificacion.SISTEMA,
          metadata: {
            planAnualId: plan.id,
            año: plan.año,
            responsable: plan.responsable,
          },
        });
      } catch (error) {
        console.error(`[PlanAnual5RolesService.crearNotificacionesPlanAnualCreado] Error al crear notificación:`, error);
      }
    }
  }

  /**
   * Notifica a los usuarios correspondientes cuando el estado del plan cambia
   * - en-revision: Notifica al Jefe OCI para que revise y apruebe
   * - aprobado: Notifica al responsable del plan
   * - en-ejecucion: Notifica a todos los auditores asignados
   */
  private async notificarCambioEstadoPlan(
    plan: PlanAnual5Roles, 
    estadoAnterior: string, 
    nuevoEstado: string
  ): Promise<void> {
    console.log(`[PlanAnual5RolesService.notificarCambioEstadoPlan] ${estadoAnterior} → ${nuevoEstado}`);
    
    const usuariosNotificar: string[] = [];
    let titulo = '';
    let mensaje = '';
    let prioridad = PrioridadNotificacion.NORMAL;

    switch (nuevoEstado) {
      case 'en-revision':
        // Notificar al Jefe OCI para que revise y apruebe el plan
        titulo = `📋 Plan Anual ${plan.año} - Pendiente de Aprobación`;
        mensaje = `El Plan Anual de Auditoría ${plan.año} ha sido enviado a revisión y está pendiente de su aprobación. Responsable: ${plan.responsable || 'No especificado'}.`;
        prioridad = PrioridadNotificacion.ALTA;
        
        const jefesOCI = await this.obtenerJefesControlInterno();
        usuariosNotificar.push(...jefesOCI);
        break;

      case 'aprobado':
        // Notificar al responsable que el plan fue aprobado
        titulo = `✅ Plan Anual ${plan.año} - Aprobado`;
        mensaje = `El Plan Anual de Auditoría ${plan.año} ha sido aprobado. Ya puede proceder a activarlo para iniciar la ejecución.`;
        prioridad = PrioridadNotificacion.ALTA;
        
        // Buscar al responsable
        if (plan.responsable) {
          try {
            const responsable = await this.dataSource.query(
              `SELECT id_tercero FROM auth.personas WHERE nom_largo ILIKE $1 OR CONCAT(nom_tercero, ' ', pri_apellido) ILIKE $1 LIMIT 1`,
              [`%${plan.responsable}%`]
            );
            if (responsable && responsable.length > 0) {
              usuariosNotificar.push(String(responsable[0].id_tercero));
            }
          } catch (error) {
            console.error(`[notificarCambioEstadoPlan] Error al buscar responsable:`, error);
          }
        }
        break;

      case 'en-ejecucion':
        // Notificar a todos que el plan está vigente
        titulo = `🚀 Plan Anual ${plan.año} - Vigente`;
        mensaje = `El Plan Anual de Auditoría ${plan.año} ha sido activado y está vigente. Las actividades programadas deben iniciar su ejecución.`;
        prioridad = PrioridadNotificacion.ALTA;
        
        // Notificar a Jefes OCI y responsable
        const jefes = await this.obtenerJefesControlInterno();
        usuariosNotificar.push(...jefes);
        
        if (plan.responsable) {
          try {
            const resp = await this.dataSource.query(
              `SELECT id_tercero FROM auth.personas WHERE nom_largo ILIKE $1 OR CONCAT(nom_tercero, ' ', pri_apellido) ILIKE $1 LIMIT 1`,
              [`%${plan.responsable}%`]
            );
            if (resp && resp.length > 0) {
              usuariosNotificar.push(String(resp[0].id_tercero));
            }
          } catch (error) {
            console.error(`[notificarCambioEstadoPlan] Error al buscar responsable:`, error);
          }
        }
        break;

      default:
        // No enviar notificaciones para otros estados
        return;
    }

    // Eliminar duplicados y enviar notificaciones
    const usuariosUnicos = [...new Set(usuariosNotificar)];
    
    for (const usuarioId of usuariosUnicos) {
      try {
        await this.notificacionesService.create({
          usuarioId,
          tipoNotificacion: TipoNotificacion.OTRO,
          titulo,
          mensaje,
          prioridad,
          canal: CanalNotificacion.SISTEMA,
          metadata: {
            planAnualId: plan.id,
            año: plan.año,
            estadoAnterior,
            nuevoEstado,
            responsable: plan.responsable,
          },
        });
        console.log(`[notificarCambioEstadoPlan] Notificación enviada a usuario ${usuarioId}`);
      } catch (error) {
        console.error(`[notificarCambioEstadoPlan] Error al crear notificación para ${usuarioId}:`, error);
      }
    }
  }

  /**
   * Resuelve auth.user.id_user del responsable (mismo identificador que usa el Shell en campanita).
   */
  private async resolverUsuarioIdResponsablePlan(
    plan: PlanAnual5Roles,
    emailHint?: string,
  ): Promise<string | null> {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const idPersonCandidatos = new Set<string>();
    const emails = new Set<string>();

    const agregarEmail = (value?: string | null) => {
      const e = (value || '').trim().toLowerCase();
      if (e && e.includes('@')) {
        emails.add(e);
      }
    };

    const agregarIdPerson = (value?: string | null) => {
      const v = (value || '').trim();
      if (uuidRegex.test(v)) {
        idPersonCandidatos.add(v);
      }
    };

    agregarIdPerson(plan.responsable_id);

    if (plan.responsable_id) {
      try {
        const porConfig = await this.dataSource.query(
          `SELECT c.id_tercero::text AS id_tercero, p.dir_email
           FROM control_interno.configuracion_profesionales_ocig c
           LEFT JOIN auth.personas p ON p.id_person::text = c.id_tercero::text
           WHERE c.id::text = $1 OR c.id_tercero::text = $1
           LIMIT 1`,
          [String(plan.responsable_id)],
        );
        if (porConfig?.length) {
          agregarIdPerson(porConfig[0].id_tercero);
          agregarEmail(porConfig[0].dir_email);
        }
      } catch (error) {
        console.error(
          '[PlanAnual5RolesService.resolverUsuarioIdResponsablePlan] Error config OCI:',
          error,
        );
      }
    }

    if (plan.responsable) {
      const nombre = plan.responsable.trim();
      try {
        const porNombre = await this.dataSource.query(
          `SELECT p.id_person::text AS id_person, p.dir_email
           FROM auth.personas p
           WHERE p.nom_largo ILIKE $1
              OR CONCAT(p.nom_tercero, ' ', p.pri_apellido) ILIKE $1
              OR CONCAT(p.pri_apellido, ' ', p.nom_tercero) ILIKE $1
           ORDER BY
             CASE WHEN p.nom_largo ILIKE $2 THEN 0 ELSE 1 END
           LIMIT 5`,
          [`%${nombre}%`, nombre],
        );
        for (const row of porNombre || []) {
          agregarIdPerson(row.id_person);
          agregarEmail(row.dir_email);
        }
      } catch (error) {
        console.error(
          '[PlanAnual5RolesService.resolverUsuarioIdResponsablePlan] Error por nombre:',
          error,
        );
      }
    }

    agregarEmail(emailHint);

    for (const idPerson of idPersonCandidatos) {
      try {
        const porPersona = await this.dataSource.query(
          `SELECT u.id_user::text AS id_user
           FROM auth."user" u
           WHERE u.id_person::text = $1 AND u.is_active = true
           LIMIT 1`,
          [idPerson],
        );
        if (porPersona?.[0]?.id_user) {
          return String(porPersona[0].id_user);
        }
      } catch (error) {
        console.error(
          '[PlanAnual5RolesService.resolverUsuarioIdResponsablePlan] Error id_person:',
          error,
        );
      }
    }

    for (const email of emails) {
      try {
        const porEmail = await this.dataSource.query(
          `SELECT u.id_user::text AS id_user
           FROM auth."user" u
           LEFT JOIN auth.personas p ON p.id_person = u.id_person
           WHERE (
             LOWER(TRIM(u.username)) = $1
             OR LOWER(TRIM(COALESCE(p.dir_email, ''))) = $1
           )
           AND u.is_active = true
           LIMIT 1`,
          [email],
        );
        if (porEmail?.[0]?.id_user) {
          return String(porEmail[0].id_user);
        }
      } catch (error) {
        console.error(
          '[PlanAnual5RolesService.resolverUsuarioIdResponsablePlan] Error email:',
          error,
        );
      }
    }

    if (plan.responsable_id) {
      try {
        const legacy = await this.dataSource.query(
          `SELECT u.id_user::text AS id_user
           FROM auth."user" u
           WHERE u.id_user::text = $1
              OR u.id_tercero::text = $1
           LIMIT 1`,
          [String(plan.responsable_id)],
        );
        if (legacy?.[0]?.id_user) {
          return String(legacy[0].id_user);
        }
      } catch (error) {
        console.error(
          '[PlanAnual5RolesService.resolverUsuarioIdResponsablePlan] Error legacy id:',
          error,
        );
      }
    }

    return null;
  }

  /**
   * Un editor solicita al responsable del plan que revise y envíe al comité PAI.
   */
  async notificarResponsableEnvioRevision(
    planId: string,
    usuarioSolicitanteId?: string,
    solicitanteNombre?: string,
    mensajeAdicional?: string,
    responsableEmail?: string,
  ): Promise<{
    ok: boolean;
    destinatarioNombre: string;
    porcentajeAsignacion: number;
    listoParaEnvio: boolean;
  }> {
    const plan = await this.findOne(planId);
    const estado = (plan.estado || '').toLowerCase();

    if (!['borrador', 'devuelto'].includes(estado)) {
      throw new BadRequestException(
        'Solo se puede notificar al responsable cuando el plan está en borrador o devuelto.',
      );
    }

    const usuarioId = await this.resolverUsuarioIdResponsablePlan(
      plan,
      responsableEmail,
    );
    if (!usuarioId) {
      throw new BadRequestException(
        `No se encontró un usuario activo para el responsable "${plan.responsable || 'sin nombre'}". ` +
          'Verifique que tenga cuenta en el sistema, email en personas y que responsable_id sea id_person (no el UUID de configuración OCI).',
      );
    }

    const actividades = await this.actividadRepository.find({
      where: { planId, activo: true },
    });
    const total = actividades.length;
    const asignadas = actividades.filter((a) => {
      const resp = (a.responsable || '').trim();
      const responsablesJson = Array.isArray(a.responsables) ? a.responsables : [];
      return resp.length > 0 || responsablesJson.length > 0;
    }).length;
    const porcentajeAsignacion =
      total > 0 ? Math.round((asignadas / total) * 100) : 0;
    const comiteConfigurado = (plan.equipo_aprobacion || []).length >= 1;
    const listoParaEnvio = porcentajeAsignacion === 100 && comiteConfigurado;

    const solicitante = (solicitanteNombre || 'Un colaborador').trim();
    const extra = (mensajeAdicional || '').trim();
    const estadoLabel = estado === 'devuelto' ? 'devuelto con observaciones' : 'borrador';

    let mensaje = `${solicitante} indica que el Plan Anual ${plan.año} está listo para tu revisión. `;
    mensaje += `Estado: ${estadoLabel}. Asignación de responsables: ${porcentajeAsignacion}%`;
    if (!comiteConfigurado) {
      mensaje += '. Falta configurar al menos un miembro del comité de aprobación';
    } else if (!listoParaEnvio) {
      mensaje += '. Revisa actividades pendientes antes de enviar al comité';
    } else {
      mensaje += '. Puedes enviarlo al comité PAI desde la pestaña Aprobación';
    }
    if (extra) {
      mensaje += `. Nota: ${extra}`;
    }

    await this.notificacionesService.create({
      usuarioId,
      tipoNotificacion: TipoNotificacion.OTRO,
      titulo: `Plan Anual ${plan.año} — pendiente de tu envío al comité`,
      mensaje,
      prioridad: PrioridadNotificacion.ALTA,
      canal: CanalNotificacion.SISTEMA,
      metadata: {
        planAnualId: plan.id,
        año: plan.año,
        accion: 'enviar_comite_pai',
        abrirSeccion: 'aprobar',
        solicitante,
        porcentajeAsignacion,
        listoParaEnvio,
      },
      accionUrl: `/control-interno/plan-anual?seccion=aprobar&vigencia=${plan.año}`,
    });

    await this.registrarHistorial(
      planId,
      TipoEventoPlanAnual.ACTUALIZACION,
      'Notificación al responsable',
      `${solicitante} solicitó al responsable (${plan.responsable || 'sin nombre'}) revisar y enviar el plan al comité PAI.`,
      usuarioSolicitanteId,
      plan.estado,
      plan.estado,
    );

    return {
      ok: true,
      destinatarioNombre: plan.responsable || 'Responsable del plan',
      porcentajeAsignacion,
      listoParaEnvio,
    };
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
      console.error('[PlanAnual5RolesService.obtenerJefesControlInterno] Error:', error);
      return [];
    }
  }

  /**
   * Calcula indicadores del Plan Anual
   * US-003: Cálculo automático de indicadores
   * Los indicadores dependen de: actividades, auditorías, informes y hallazgos
   */
  async getIndicadores(planId: string): Promise<any> {
    const plan = await this.findOne(planId);

    // ========== INDICADORES DE ACTIVIDADES ==========
    const totalActividades = await this.actividadRepository.count({
      where: { planId },
    });

    const actividadesCompletadas = await this.actividadRepository.count({
      where: { planId, estado: 'completada' },
    });

    const actividadesEnProgreso = await this.actividadRepository.count({
      where: { planId, estado: 'en-progreso' },
    });

    const actividadesPendientes = await this.actividadRepository.count({
      where: { planId, estado: 'pendiente' },
    });

    const actividadesRetrasadas = await this.actividadRepository.count({
      where: { planId, estado: 'retrasada' },
    });

    // ========== INDICADORES DE AUDITORÍAS ==========
    let totalAuditorias = 0;
    let auditoriasCompletadas = 0;
    let auditoriasEnEjecucion = 0;
    let auditoriasPendientes = 0;

    try {
      const auditoriasQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE estado_kanban = 'Finalizada') as completadas,
          COUNT(*) FILTER (WHERE estado_kanban = 'Ejecución') as en_ejecucion,
          COUNT(*) FILTER (WHERE estado_kanban = 'Planeación') as pendientes
        FROM control_interno.auditoria
        WHERE EXTRACT(YEAR FROM fecha_inicio) = $1
      `;
      const resultAuditorias = await this.dataSource.query(auditoriasQuery, [plan.año]);
      if (resultAuditorias && resultAuditorias.length > 0) {
        totalAuditorias = parseInt(resultAuditorias[0].total) || 0;
        auditoriasCompletadas = parseInt(resultAuditorias[0].completadas) || 0;
        auditoriasEnEjecucion = parseInt(resultAuditorias[0].en_ejecucion) || 0;
        auditoriasPendientes = parseInt(resultAuditorias[0].pendientes) || 0;
      }
    } catch (error) {
      console.error('[getIndicadores] Error al obtener auditorías:', error);
    }

    // ========== INDICADORES DE INFORMES ==========
    let totalInformes = 0;
    let informesAprobados = 0;
    let informesEnProceso = 0;
    let informesPendientes = 0;

    try {
      // Los informes están en entrega_informe_ley con relación a informe_ley
      // El periodo está en formato "2025", "2025-01", "2025-Q1", "2025-S1" 
      // Necesitamos extraer el año de los primeros 4 caracteres
      const informesQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE estado = 'entregado') as aprobados,
          COUNT(*) FILTER (WHERE estado = 'en-proceso') as en_proceso,
          COUNT(*) FILTER (WHERE estado = 'pendiente') as pendientes
        FROM control_interno.entrega_informe_ley
        WHERE SUBSTRING(periodo, 1, 4) = $1
      `;
      const resultInformes = await this.dataSource.query(informesQuery, [plan.año.toString()]);
      if (resultInformes && resultInformes.length > 0) {
        totalInformes = parseInt(resultInformes[0].total) || 0;
        informesAprobados = parseInt(resultInformes[0].aprobados) || 0;
        informesEnProceso = parseInt(resultInformes[0].en_proceso) || 0;
        informesPendientes = parseInt(resultInformes[0].pendientes) || 0;
      }
    } catch (error) {
      console.error('[getIndicadores] Error al obtener informes:', error);
    }

    // ========== INDICADORES DE HALLAZGOS ==========
    let totalHallazgos = 0;
    let hallazgosAbiertos = 0;
    let hallazgosCerrados = 0;

    try {
      // Contar hallazgos por año de detección, sin requerir vínculo a auditoría
      const hallazgosQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE estado IN ('borrador', 'notificado', 'en-controversia', 'ratificado', 'modificado')) as abiertos,
          COUNT(*) FILTER (WHERE estado = 'cerrado') as cerrados
        FROM control_interno.hallazgo
        WHERE EXTRACT(YEAR FROM fecha_deteccion) = $1
      `;
      const resultHallazgos = await this.dataSource.query(hallazgosQuery, [plan.año]);
      if (resultHallazgos && resultHallazgos.length > 0) {
        totalHallazgos = parseInt(resultHallazgos[0].total) || 0;
        hallazgosAbiertos = parseInt(resultHallazgos[0].abiertos) || 0;
        hallazgosCerrados = parseInt(resultHallazgos[0].cerrados) || 0;
      }
    } catch (error) {
      console.error('[getIndicadores] Error al obtener hallazgos:', error);
    }

    // ========== INDICADORES POR ROL ==========
    const indicadoresPorRol = await Promise.all(
      plan.roles.map(async (rol) => {
        const totalRol = await this.actividadRepository.count({
          where: { rolId: rol.id },
        });

        const completadasRol = await this.actividadRepository.count({
          where: { rolId: rol.id, estado: 'completada' },
        });

        const enProgresoRol = await this.actividadRepository.count({
          where: { rolId: rol.id, estado: 'en-progreso' },
        });

        const pendientesRol = await this.actividadRepository.count({
          where: { rolId: rol.id, estado: 'pendiente' },
        });

        const retrasadasRol = await this.actividadRepository.count({
          where: { rolId: rol.id, estado: 'retrasada' },
        });

        return {
          rolId: rol.id,
          rolNumero: rol.rol_numero,
          rolNombre: rol.nombre,
          totalActividades: totalRol,
          actividadesCompletadas: completadasRol,
          actividadesEnProgreso: enProgresoRol,
          actividadesPendientes: pendientesRol,
          actividadesRetrasadas: retrasadasRol,
        };
      })
    );

    return {
      planId: plan.id,
      año: plan.año,
      estado: plan.estado,
      
      // Indicadores de actividades del plan
      actividades: {
        total: totalActividades,
        completadas: actividadesCompletadas,
        enProgreso: actividadesEnProgreso,
        pendientes: actividadesPendientes,
        retrasadas: actividadesRetrasadas,
      },

      // Indicadores de auditorías
      auditorias: {
        total: totalAuditorias,
        completadas: auditoriasCompletadas,
        enEjecucion: auditoriasEnEjecucion,
        pendientes: auditoriasPendientes,
      },

      // Indicadores de informes
      informes: {
        total: totalInformes,
        aprobados: informesAprobados,
        enProceso: informesEnProceso,
        pendientes: informesPendientes,
      },

      // Indicadores de hallazgos
      hallazgos: {
        total: totalHallazgos,
        abiertos: hallazgosAbiertos,
        cerrados: hallazgosCerrados,
      },
      
      // Indicadores por rol (actividades)
      indicadoresPorRol,
      
      // Fecha de consulta
      fechaConsulta: new Date(),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS PARA ADJUNTOS DE ACTIVIDADES
  // ═══════════════════════════════════════════════════════════════════════════

  async getAdjuntos(actividadId: string): Promise<AdjuntoActividadPlanAnual5[]> {
    // Verificar que la actividad existe
    const actividad = await this.actividadRepository.findOne({ where: { id: actividadId } });
    if (!actividad) {
      throw new NotFoundException(`Actividad con ID ${actividadId} no encontrada`);
    }

    return this.adjuntoRepository.find({
      where: { actividadId },
      order: { fechaCarga: 'DESC' },
    });
  }

  async addAdjunto(actividadId: string, createDto: CreateAdjuntoDto): Promise<AdjuntoActividadPlanAnual5> {
    // Verificar que la actividad existe
    const actividad = await this.actividadRepository.findOne({ where: { id: actividadId } });
    if (!actividad) {
      throw new NotFoundException(`Actividad con ID ${actividadId} no encontrada`);
    }

    const adjunto = this.adjuntoRepository.create({
      actividadId,
      ...createDto,
    });

    return this.adjuntoRepository.save(adjunto);
  }

  private static readonly EXTENSIONES_ADJUNTO_PERMITIDAS = new Set([
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.zip',
  ]);

  async uploadAdjuntoArchivo(
    actividadId: string,
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      path: string;
    },
    meta?: { tareaId?: string; cargadoPor?: string },
  ): Promise<{
    id: string;
    nombre: string;
    tipo: string;
    tamanio: number;
    fecha: string;
    urlDownload: string;
    urlPreview: string;
    tareaId?: string;
  }> {
    const actividad = await this.actividadRepository.findOne({ where: { id: actividadId } });
    if (!actividad) {
      throw new NotFoundException(`Actividad con ID ${actividadId} no encontrada`);
    }

    const ext = extname(file.originalname || '').toLowerCase();
    if (!PlanAnual5RolesService.EXTENSIONES_ADJUNTO_PERMITIDAS.has(ext)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido (${ext || 'sin extensión'}). Use PDF, Word, Excel, imágenes o ZIP.`,
      );
    }

    const uploadBase = process.env.PLAN_ANUAL_UPLOAD_PATH
      || process.env.UPLOAD_PATH
      || './uploads/plan-anual';
    const dir = `${uploadBase}/${actividadId}`.replace(/\\/g, '/');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const randomName = Array(32)
      .fill(null)
      .map(() => Math.round(Math.random() * 16).toString(16))
      .join('');
    const storedRelative = `${actividadId}/${randomName}${ext}`;
    const rutaFinal = `${uploadBase}/${storedRelative}`.replace(/\\/g, '/');

    renameSync(file.path, rutaFinal);

    const adjunto = this.adjuntoRepository.create({
      actividadId,
      nombre: file.originalname,
      tipo: file.mimetype,
      tamanio: file.size,
      rutaArchivo: rutaFinal,
      cargadoPor: meta?.cargadoPor,
      url: `/plan-anual-5-roles/adjuntos/{id}/download`,
    });
    const saved = await this.adjuntoRepository.save(adjunto);
    saved.url = `/plan-anual-5-roles/adjuntos/${saved.id}/download`;
    await this.adjuntoRepository.save(saved);

    return {
      id: saved.id,
      nombre: saved.nombre,
      tipo: saved.tipo,
      tamanio: Number(saved.tamanio) || file.size,
      fecha: (saved.fechaCarga || new Date()).toISOString(),
      urlDownload: `/plan-anual-5-roles/adjuntos/${saved.id}/download`,
      urlPreview: `/plan-anual-5-roles/adjuntos/${saved.id}/preview`,
      tareaId: meta?.tareaId,
    };
  }

  async obtenerAdjuntoParaDescarga(adjuntoId: string): Promise<AdjuntoActividadPlanAnual5> {
    const adjunto = await this.adjuntoRepository.findOne({ where: { id: adjuntoId } });
    if (!adjunto) {
      throw new NotFoundException(`Adjunto con ID ${adjuntoId} no encontrado`);
    }
    if (!adjunto.rutaArchivo || !existsSync(adjunto.rutaArchivo)) {
      throw new BadRequestException('El archivo no existe en el servidor');
    }
    return adjunto;
  }

  async deleteAdjunto(adjuntoId: string): Promise<void> {
    const adjunto = await this.adjuntoRepository.findOne({ where: { id: adjuntoId } });
    if (!adjunto) {
      throw new NotFoundException(`Adjunto con ID ${adjuntoId} no encontrado`);
    }

    if (adjunto.rutaArchivo && existsSync(adjunto.rutaArchivo)) {
      try {
        unlinkSync(adjunto.rutaArchivo);
      } catch {
        // No bloquear borrado en BD si el archivo ya no está en disco
      }
    }

    await this.adjuntoRepository.remove(adjunto);
  }

  /**
   * Exportar plan anual a Excel (xlsx)
   * Encabezado institucional formato EM-PT-004
   * Estructura: Logo | Título | Código/Versión/Fecha
   */
  async exportExcel(planId: string): Promise<{ buffer: Buffer; nombre: string }> {
    const plan = await this.findOne(planId);
    const XLSX = await import('xlsx');

    const año = plan.año ?? new Date().getFullYear();
    const nombre = `plan-anual-auditoria-${año}.xlsx`;
    const fechaActual = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

    // Encabezado institucional formato EM-PT-004 (igual que PDF)
    // Estructura: Col A-B (Logo ESAP) | Col C-H (Título centrado) | Col I (Label) | Col J (Valor)
    const headers = ['Rol', 'Nº', 'Actividad', 'Descripción', 'Responsable', 'Fecha Inicio', 'Fecha Fin', 'Estado', '% Avance', 'Control'];
    const rows: unknown[][] = [
      // Filas 1-3: Encabezado institucional con 3 secciones (celdas combinadas)
      ['ESAP', '', 'PLAN ANUAL DE AUDITORÍA INTERNA', '', '', '', '', '', 'CÓDIGO:', 'EM-PT-004'],
      ['', '', 'Vigencia ' + año, '', '', '', '', '', 'VERSIÓN:', '3'],
      ['', '', '', '', '', '', '', '', 'FECHA:', fechaActual],
      // Fila 4: Proceso (todo el ancho)
      ['PROCESO: EVALUACIÓN CONTROL Y MEJORA', '', '', '', '', '', '', '', '', ''],
      // Fila 5: Espacio
      [],
      // Fila 6-7: Información del plan
      ['INFORMACIÓN DEL PLAN', '', '', '', '', '', '', '', '', ''],
      ['Vigencia:', año, '', 'Estado:', plan.estado ?? 'BORRADOR', '', 'Responsable:', plan.responsable ?? 'Sin asignar', '', ''],
      ['Fecha Creación:', plan.fecha_creacion ? new Date(plan.fecha_creacion).toLocaleDateString('es-CO') : 'N/A', '', '', '', '', '', '', '', ''],
      // Fila 9: Espacio
      [],
      // Fila 10: Headers de la tabla de actividades
      headers,
    ];

    const roles = plan.roles ?? [];
    for (const rol of roles) {
      const actividades = Array.isArray(rol.actividades) ? rol.actividades : [];
      for (let i = 0; i < actividades.length; i++) {
        const a = actividades[i];
        const fechaInicio = a.fecha_inicio != null ? new Date(a.fecha_inicio).toISOString().split('T')[0] : '';
        const fechaFin = a.fecha_fin != null ? new Date(a.fecha_fin).toISOString().split('T')[0] : '';
        rows.push([
          rol.nombre ?? '',
          i + 1,
          a.nombre ?? '',
          a.descripcion ?? '',
          a.responsable ?? '',
          fechaInicio,
          fechaFin,
          a.estado ?? '',
          a.porcentaje_avance ?? 0,
          a.control ?? '',
          a.evaluacion ?? '',
          a.seguimiento ?? '',
        ]);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    
    // Configurar anchos de columna
    ws['!cols'] = [
      { wch: 25 }, // Rol
      { wch: 5 },  // Nº
      { wch: 40 }, // Actividad
      { wch: 30 }, // Descripción
      { wch: 25 }, // Responsable
      { wch: 12 }, // Fecha Inicio
      { wch: 12 }, // Fecha Fin
      { wch: 15 }, // Estado
      { wch: 10 }, // % Avance
      { wch: 20 }, // Control
      { wch: 20 }, // Evaluación
      { wch: 20 }, // Seguimiento
    ];
    
    // Merge cells para encabezado institucional (igual que PDF)
    ws['!merges'] = [
      // Filas 1-3: Logo ESAP columnas A-B (combinadas verticalmente)
      { s: { r: 0, c: 0 }, e: { r: 2, c: 1 } },
      // Fila 1: Título columnas C-H
      { s: { r: 0, c: 2 }, e: { r: 0, c: 7 } },
      // Fila 2: Subtítulo columnas C-H  
      { s: { r: 1, c: 2 }, e: { r: 1, c: 7 } },
      // Fila 3: Espacio columnas C-H
      { s: { r: 2, c: 2 }, e: { r: 2, c: 7 } },
      // Fila 4: Proceso todo el ancho
      { s: { r: 3, c: 0 }, e: { r: 3, c: 9 } },
      // Fila 6: Info del plan header
      { s: { r: 5, c: 0 }, e: { r: 5, c: 9 } },
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plan Anual');
    const buffer = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
    return { buffer, nombre };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS PARA VINCULACIÓN CON AUDITORÍAS - Rol 4 (Evaluación y Seguimiento)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Obtiene el cumplimiento del programa de auditorías para un año específico
   */
  async getCumplimientoAuditorias(año: number): Promise<{
    totalProgramadas: number;
    totalFinalizadas: number;
    porcentajeCumplimiento: number;
    desglosePorTipo: Record<string, { programadas: number; finalizadas: number; en_proceso: number; pendientes: number }>;
    actividadId?: string;
  }> {
    // Usar la función SQL que creamos
    const result = await this.dataSource.query(`
      SELECT * FROM control_interno.fn_calcular_cumplimiento_auditorias(NULL, $1)
    `, [año]);

    if (result.length === 0) {
      return {
        totalProgramadas: 0,
        totalFinalizadas: 0,
        porcentajeCumplimiento: 0,
        desglosePorTipo: {}
      };
    }

    const row = result[0];
    
    // Buscar la actividad de auditorías del Rol 4 para este año
    const actividad = await this.dataSource.query(`
      SELECT a.id
      FROM control_interno.actividad_plan_anual_5 a
      INNER JOIN control_interno.rol_plan_anual_5 r ON a.rol_id = r.id
      INNER JOIN control_interno.plan_anual_5_roles p ON r.plan_id = p.id
      WHERE r.rol_numero = 4 
        AND a.tipo_calculo = 'auditorias'
        AND p.ano = $1
      LIMIT 1
    `, [año]);

    return {
      totalProgramadas: row.total_programadas || 0,
      totalFinalizadas: row.total_finalizadas || 0,
      porcentajeCumplimiento: row.porcentaje_cumplimiento || 0,
      desglosePorTipo: row.desglose_por_tipo || {},
      actividadId: actividad[0]?.id
    };
  }

  /**
   * Configura una actividad como "de auditorías" para cálculo automático
   */
  async configurarActividadAuditorias(
    actividadId: string,
    año: number,
    usuarioId?: string | number
  ): Promise<ActividadPlanAnual5> {
    // Verificar que la actividad existe y pertenece al Rol 4
    const actividad = await this.dataSource.query(`
      SELECT a.*, r.rol_numero, p.ano
      FROM control_interno.actividad_plan_anual_5 a
      INNER JOIN control_interno.rol_plan_anual_5 r ON a.rol_id = r.id
      INNER JOIN control_interno.plan_anual_5_roles p ON r.plan_id = p.id
      WHERE a.id = $1
    `, [actividadId]);

    if (actividad.length === 0) {
      throw new NotFoundException(`Actividad con ID ${actividadId} no encontrada`);
    }

    if (actividad[0].rol_numero !== 4) {
      throw new BadRequestException('Solo se pueden configurar actividades del Rol 4 (Evaluación y Seguimiento) como actividades de auditorías');
    }

    // Desactivar cualquier otra actividad de auditorías para este año
    await this.dataSource.query(`
      UPDATE control_interno.actividad_plan_anual_5 a
      SET tipo_calculo = 'manual'
      FROM control_interno.rol_plan_anual_5 r,
           control_interno.plan_anual_5_roles p
      WHERE a.rol_id = r.id
        AND r.plan_id = p.id
        AND p.ano = $1
        AND a.tipo_calculo = 'auditorias'
        AND a.id != $2
    `, [año, actividadId]);

    // Configurar esta actividad como "auditorías"
    await this.dataSource.query(`
      UPDATE control_interno.actividad_plan_anual_5
      SET tipo_calculo = 'auditorias'
      WHERE id = $1
    `, [actividadId]);

    // Vincular todas las auditorías del año a esta actividad
    await this.dataSource.query(`
      SELECT control_interno.fn_vincular_auditorias_actividad($1, $2)
    `, [actividadId, año]);

    // Calcular cumplimiento inicial
    const cumplimiento = await this.getCumplimientoAuditorias(año);
    
    // Actualizar la actividad con los datos de cumplimiento
    await this.dataSource.query(`
      UPDATE control_interno.actividad_plan_anual_5
      SET 
        total_auditorias_programadas = $1,
        total_auditorias_finalizadas = $2,
        porcentaje_avance = $3,
        auditorias_por_tipo = $4,
        estado = CASE 
          WHEN $3 >= 100 THEN 'completada'
          WHEN $3 > 0 THEN 'en-progreso'
          ELSE 'pendiente'
        END,
        updated_at = NOW()
      WHERE id = $5
    `, [
      cumplimiento.totalProgramadas,
      cumplimiento.totalFinalizadas,
      cumplimiento.porcentajeCumplimiento,
      JSON.stringify(cumplimiento.desglosePorTipo),
      actividadId
    ]);

    // Registrar en historial
    if (usuarioId) {
      await this.registrarHistorial(
        (await this.actividadRepository.findOne({ where: { id: actividadId }, relations: ['rol'] }))?.rol.planId || '',
        TipoEventoPlanAnual.ACTIVIDAD_ACTUALIZADA,
        `Actividad "${actividad[0].nombre}" configurada para cálculo automático de auditorías`,
        String(usuarioId)
      );
    }

    return this.actividadRepository.findOne({ where: { id: actividadId } }) as Promise<ActividadPlanAnual5>;
  }

  /**
   * Obtiene el resumen de auditorías vinculadas a una actividad
   */
  async getAuditoriasVinculadas(actividadId: string): Promise<{
    total: number;
    auditorias: Array<{
      id: string;
      codigo: string;
      nombre: string;
      tipo: string;
      estadoKanban: string;
      progreso: number;
      fechaInicio: Date;
      fechaFin: Date;
    }>;
  }> {
    const auditorias = await this.dataSource.query(`
      SELECT 
        id, codigo, nombre, tipo, estado_kanban as "estadoKanban",
        progreso, fecha_inicio as "fechaInicio", fecha_fin as "fechaFin"
      FROM control_interno.auditoria
      WHERE actividad_plan_anual_id = $1
        AND activa = true
        AND archivada = false
      ORDER BY fecha_inicio ASC
    `, [actividadId]);

    return {
      total: auditorias.length,
      auditorias
    };
  }

  /**
   * Recalcula manualmente el cumplimiento de auditorías para un año
   */
  async recalcularCumplimientoAuditorias(año: number): Promise<{
    success: boolean;
    actividadActualizada?: string;
    cumplimiento: {
      totalProgramadas: number;
      totalFinalizadas: number;
      porcentajeCumplimiento: number;
    };
  }> {
    // Buscar la actividad de auditorías del Rol 4
    const actividadResult = await this.dataSource.query(`
      SELECT a.id
      FROM control_interno.actividad_plan_anual_5 a
      INNER JOIN control_interno.rol_plan_anual_5 r ON a.rol_id = r.id
      INNER JOIN control_interno.plan_anual_5_roles p ON r.plan_id = p.id
      WHERE r.rol_numero = 4 
        AND a.tipo_calculo = 'auditorias'
        AND p.ano = $1
      LIMIT 1
    `, [año]);

    if (actividadResult.length === 0) {
      // No hay actividad configurada, solo obtener estadísticas
      const cumplimiento = await this.getCumplimientoAuditorias(año);
      return {
        success: true,
        cumplimiento: {
          totalProgramadas: cumplimiento.totalProgramadas,
          totalFinalizadas: cumplimiento.totalFinalizadas,
          porcentajeCumplimiento: cumplimiento.porcentajeCumplimiento
        }
      };
    }

    const actividadId = actividadResult[0].id;
    
    // Recalcular
    const cumplimiento = await this.getCumplimientoAuditorias(año);
    
    // Actualizar la actividad
    await this.dataSource.query(`
      UPDATE control_interno.actividad_plan_anual_5
      SET 
        total_auditorias_programadas = $1,
        total_auditorias_finalizadas = $2,
        porcentaje_avance = $3,
        auditorias_por_tipo = $4,
        estado = CASE 
          WHEN $3 >= 100 THEN 'completada'
          WHEN $3 > 0 THEN 'en-progreso'
          ELSE 'pendiente'
        END,
        updated_at = NOW()
      WHERE id = $5
    `, [
      cumplimiento.totalProgramadas,
      cumplimiento.totalFinalizadas,
      cumplimiento.porcentajeCumplimiento,
      JSON.stringify(cumplimiento.desglosePorTipo),
      actividadId
    ]);

    return {
      success: true,
      actividadActualizada: actividadId,
      cumplimiento: {
        totalProgramadas: cumplimiento.totalProgramadas,
        totalFinalizadas: cumplimiento.totalFinalizadas,
        porcentajeCumplimiento: cumplimiento.porcentajeCumplimiento
      }
    };
  }

  // —— Borrador del wizard (Nuevo plan) por usuario ——
  async getWizardBorrador(userId: string | undefined): Promise<{ payload: Record<string, unknown> | null; updatedAt: string | null }> {
    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    const row = await this.wizardBorradorRepository.findOne({ where: { usuarioId: userId } });
    return {
      payload: (row?.payload as Record<string, unknown>) ?? null,
      updatedAt: row?.updatedAt ? row.updatedAt.toISOString() : null,
    };
  }

  async saveWizardBorrador(
    userId: string | undefined,
    payload: Record<string, unknown>,
  ): Promise<{ ok: true; savedAt: string }> {
    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    const enriched: Record<string, unknown> = {
      ...payload,
      savedAt: new Date().toISOString(),
    };
    if (typeof enriched.timestamp !== 'number') {
      enriched.timestamp = Date.now();
    }
    let row = await this.wizardBorradorRepository.findOne({ where: { usuarioId: userId } });
    if (!row) {
      row = this.wizardBorradorRepository.create({ usuarioId: userId, payload: enriched });
    } else {
      row.payload = enriched;
    }
    await this.wizardBorradorRepository.save(row);
    return { ok: true, savedAt: enriched.savedAt as string };
  }

  async deleteWizardBorrador(userId: string | undefined): Promise<void> {
    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    await this.wizardBorradorRepository.delete({ usuarioId: userId });
  }
}
