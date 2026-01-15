import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PlanAnual5Roles } from './entities/plan-anual-5-roles.entity';
import { RolPlanAnual5 } from './entities/rol-plan-anual-5.entity';
import { ActividadPlanAnual5 } from './entities/actividad-plan-anual-5.entity';
import { HistorialPlanAnual, TipoEventoPlanAnual } from './entities/historial-plan-anual.entity';
import { CreatePlanAnual5RolesDto } from './dto/create-plan-anual-5-roles.dto';
import { CreateActividadDto } from './dto/create-actividad.dto';

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
    @InjectRepository(HistorialPlanAnual)
    private readonly historialRepository: Repository<HistorialPlanAnual>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(year?: number): Promise<PlanAnual5Roles[]> {
    const query = this.planRepository
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.roles', 'roles')
      .leftJoinAndSelect('roles.actividades', 'actividades')
      .orderBy('plan.año', 'DESC');

    if (year) {
      query.where('plan.año = :year', { year });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<PlanAnual5Roles> {
    const plan = await this.planRepository.findOne({
      where: { id },
      relations: ['roles', 'roles.actividades'],
    });

    if (!plan) {
      throw new NotFoundException(`Plan Anual con ID ${id} no encontrado`);
    }

    return plan;
  }

  async findByYear(year: number): Promise<PlanAnual5Roles | null> {
    return this.planRepository.findOne({
      where: { año: year },
      relations: ['roles', 'roles.actividades'],
    });
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
    
    const query = `
      INSERT INTO control_interno.actividad_plan_anual_5 
      (rol_id, plan_id, nombre, descripcion, responsable, fecha_inicio, fecha_fin, estado, porcentaje_avance, observaciones, prioridad)
      VALUES ($1, $2, $3, $4, $5, $6::date, $7::date, $8, $9, $10, $11)
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

    await this.actividadRepository.remove(actividad);

    // Recalcular estadísticas
    await this.recalcularRol(rolId);
    await this.recalcularPlan(planId);

    // Registrar en historial
    await this.registrarHistorial(
      planId,
      TipoEventoPlanAnual.ACTIVIDAD_ELIMINADA,
      'Actividad eliminada',
      `Actividad "${nombreActividad}" eliminada`,
      usuarioId,
      undefined,
      undefined,
      [{ campo: 'actividad', valorAnterior: nombreActividad, valorNuevo: '' }]
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
      where: { rolId },
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

    const totalActividades = roles.reduce((sum, r) => sum + r.actividades.length, 0);
    const actividadesCompletadas = roles.reduce(
      (sum, r) => sum + r.actividades.filter((a) => a.estado === 'completada').length,
      0,
    );
    const actividadesEnProgreso = roles.reduce(
      (sum, r) => sum + r.actividades.filter((a) => a.estado === 'en-progreso').length,
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
}

