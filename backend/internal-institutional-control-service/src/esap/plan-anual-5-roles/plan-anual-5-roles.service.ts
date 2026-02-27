import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PlanAnual5Roles } from './entities/plan-anual-5-roles.entity';
import { RolPlanAnual5 } from './entities/rol-plan-anual-5.entity';
import { ActividadPlanAnual5 } from './entities/actividad-plan-anual-5.entity';
import { AdjuntoActividadPlanAnual5 } from './entities/adjunto-actividad-plan-anual-5.entity';
import { HistorialPlanAnual, TipoEventoPlanAnual } from './entities/historial-plan-anual.entity';
import { CreatePlanAnual5RolesDto } from './dto/create-plan-anual-5-roles.dto';
import { CreateActividadDto } from './dto/create-actividad.dto';
import { CreateAdjuntoDto } from './dto/create-adjunto.dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { TipoNotificacion, PrioridadNotificacion, CanalNotificacion } from '../notificaciones/entities/notificacion.entity';

// Interfaz para roles del template
interface RolTemplate {
  rol_numero: number;
  nombre: string;
  descripcion: string;
  color: string;
}

@Injectable()
export class PlanAnual5RolesService {
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
    private readonly dataSource: DataSource,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  async findAll(year?: number): Promise<PlanAnual5Roles[]> {
    const query = this.planRepository
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.roles', 'roles')
      .leftJoinAndSelect('roles.actividades', 'actividades')
      .leftJoinAndSelect('actividades.adjuntos', 'adjuntos')
      .orderBy('plan.año', 'DESC')
      .addOrderBy('roles.rol_numero', 'ASC')
      .addOrderBy('actividades.created_at', 'ASC');

    if (year) {
      query.where('plan.año = :year', { year });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<PlanAnual5Roles> {
    const plan = await this.planRepository
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.roles', 'roles')
      .leftJoinAndSelect('roles.actividades', 'actividades')
      .leftJoinAndSelect('actividades.adjuntos', 'adjuntos')
      .where('plan.id = :id', { id })
      .orderBy('roles.rol_numero', 'ASC')
      .addOrderBy('actividades.created_at', 'ASC')
      .getOne();

    if (!plan) {
      throw new NotFoundException(`Plan Anual con ID ${id} no encontrado`);
    }

    return plan;
  }

  async findByYear(year: number): Promise<PlanAnual5Roles | null> {
    return this.planRepository
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.roles', 'roles')
      .leftJoinAndSelect('roles.actividades', 'actividades')
      .leftJoinAndSelect('actividades.adjuntos', 'adjuntos')
      .where('plan.año = :year', { year })
      .orderBy('roles.rol_numero', 'ASC')
      .addOrderBy('actividades.created_at', 'ASC')
      .getOne();
  }

  async create(createDto: CreatePlanAnual5RolesDto, usuarioId?: string): Promise<PlanAnual5Roles> {
    // Verificar si ya existe un plan para ese año
    const existing = await this.findByYear(createDto.año);
    if (existing) {
      throw new BadRequestException(`Ya existe un plan anual para el año ${createDto.año}`);
    }

    // Crear el plan
    const plan = this.planRepository.create({
      año: createDto.año,
      responsable: createDto.responsable,
      responsable_id: createDto.responsable_id,
      fecha_inicio: createDto.fecha_inicio ? new Date(createDto.fecha_inicio) : undefined,
      fecha_fin: createDto.fecha_fin ? new Date(createDto.fecha_fin) : undefined,
      estado: createDto.estado || 'borrador',
      fecha_creacion: new Date(),
    });

    const savedPlan = await this.planRepository.save(plan);

    // Obtener roles del template desde la BD (NO desde memoria)
    const rolesTemplate = await this.getRolesTemplate();

    // Verificar que tenemos exactamente 5 roles
    if (rolesTemplate.length !== 5) {
      throw new BadRequestException(
        `Se esperaban 5 roles del template, pero se encontraron ${rolesTemplate.length}. Verifique la tabla rol_decreto_648_template.`
      );
    }

    // Crear los 5 roles basados en el template de la BD (ya vienen ordenados por rol_numero)
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

    if (updateDto.estado !== undefined && updateDto.estado !== plan.estado) {
      cambios.push({ campo: 'estado', valorAnterior: plan.estado, valorNuevo: updateDto.estado });
      plan.estado = updateDto.estado;
    }

    const savedPlan = await this.planRepository.save(plan);

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
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const rol = await this.rolRepository.findOne({
      where: { id: rolId },
      relations: ['plan'],
    });

    if (!rol) {
      throw new NotFoundException(`Rol con ID ${rolId} no encontrado`);
    }

    // Guardar usando query SQL directa para evitar problemas de zona horaria con TypeORM
    // Las fechas se insertan directamente como strings YYYY-MM-DD
    const fechaInicio = createDto.fecha_inicio || new Date().toISOString().split('T')[0];
    const fechaFin = createDto.fecha_fin || new Date().toISOString().split('T')[0];
    
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
    
    const query = `
      INSERT INTO control_interno.actividad_plan_anual_5 
      (rol_id, plan_id, nombre, descripcion, responsable, fecha_inicio, fecha_fin, estado, porcentaje_avance, observaciones, prioridad,
       control, evaluacion, seguimiento, requiere_verificacion_director, verificada_por_director, fecha_verificacion, observaciones_director, configuracion_evidencias)
      VALUES ($1, $2, $3, $4, $5, $6::date, $7::date, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
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
      JSON.stringify(configEvidencias),
    ]);

    const saved = result[0];

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

  async getRoles(planId: string): Promise<{ roles: RolPlanAnual5[] }> {
    const plan = await this.findOne(planId);
    // Ordenar roles por rol_numero y devolver en formato esperado
    const rolesOrdenados = (plan.roles || []).sort((a, b) => a.rol_numero - b.rol_numero);
    return { roles: rolesOrdenados };
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
      where: { planId },
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
      const ahora = new Date();
      const fecha = ahora.toISOString().split('T')[0];
      const hora = ahora.toTimeString().slice(0, 5);

      const historial = new HistorialPlanAnual();
      historial.planId = planId;
      historial.tipoEvento = tipoEvento;
      historial.fecha = new Date(fecha);
      historial.hora = hora;
      // Convertir usuarioId a número (bigint)
      // La columna usuario_id es BIGINT NOT NULL y referencia auth.personas(id_tercero)
      // Si viene como string (incluyendo 'system'), convertir a número o usar 1 como valor por defecto
      // Si viene como número, usarlo directamente
      if (typeof usuarioId === 'number') {
        historial.usuarioId = usuarioId;
      } else if (typeof usuarioId === 'string') {
        // Intentar convertir string a número si es posible
        // Si es 'system' o cualquier string no numérico, usar 1 como valor por defecto
        const usuarioIdNum = parseInt(usuarioId, 10);
        if (isNaN(usuarioIdNum) || usuarioId === 'system' || usuarioId.trim() === '') {
          historial.usuarioId = 1; // Usar 1 como valor por defecto para sistema
        } else {
          historial.usuarioId = usuarioIdNum;
        }
      } else {
        // Si no hay usuarioId, usar 1 como valor por defecto (sistema)
        historial.usuarioId = 1;
      }
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

  async deleteAdjunto(adjuntoId: string): Promise<void> {
    const adjunto = await this.adjuntoRepository.findOne({ where: { id: adjuntoId } });
    if (!adjunto) {
      throw new NotFoundException(`Adjunto con ID ${adjuntoId} no encontrado`);
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
}

