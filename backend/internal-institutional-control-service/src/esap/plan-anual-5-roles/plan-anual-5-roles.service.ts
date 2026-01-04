import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PlanAnual5Roles } from './entities/plan-anual-5-roles.entity';
import { RolPlanAnual5 } from './entities/rol-plan-anual-5.entity';
import { ActividadPlanAnual5 } from './entities/actividad-plan-anual-5.entity';
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

  async create(createDto: CreatePlanAnual5RolesDto): Promise<PlanAnual5Roles> {
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

    // Recargar con relaciones (los roles ya vienen ordenados por rol_numero desde el template)
    return this.findOne(savedPlan.id);
  }

  /**
   * Actualiza un plan anual existente
   */
  async update(id: string, updateDto: Partial<CreatePlanAnual5RolesDto>): Promise<PlanAnual5Roles> {
    const plan = await this.findOne(id);

    // Actualizar campos si se proporcionan
    if (updateDto.año !== undefined) {
      // Verificar que no exista otro plan con ese año
      const existing = await this.findByYear(updateDto.año);
      if (existing && existing.id !== id) {
        throw new BadRequestException(`Ya existe un plan anual para el año ${updateDto.año}`);
      }
      plan.año = updateDto.año;
    }

    if (updateDto.responsable !== undefined) {
      plan.responsable = updateDto.responsable;
    }

    if (updateDto.estado !== undefined) {
      plan.estado = updateDto.estado;
    }

    const savedPlan = await this.planRepository.save(plan);
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

  async addActividad(rolId: string, createDto: CreateActividadDto): Promise<ActividadPlanAnual5> {
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

    // Recargar la actividad con relaciones
    return this.actividadRepository.findOne({
      where: { id: saved.id },
      relations: ['rol', 'plan'],
    }) as Promise<ActividadPlanAnual5>;
  }

  async updateActividad(
    actividadId: string,
    updateDto: Partial<CreateActividadDto>,
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
    let paramIndex = 1;

    if (updateDto.nombre !== undefined) {
      updates.push(`nombre = $${paramIndex++}`);
      values.push(updateDto.nombre);
    }
    if (updateDto.descripcion !== undefined) {
      updates.push(`descripcion = $${paramIndex++}`);
      values.push(updateDto.descripcion);
    }
    if (updateDto.responsable !== undefined) {
      updates.push(`responsable = $${paramIndex++}`);
      values.push(updateDto.responsable);
    }
    if (updateDto.fecha_inicio) {
      updates.push(`fecha_inicio = $${paramIndex++}::date`);
      values.push(updateDto.fecha_inicio); // String YYYY-MM-DD
    }
    if (updateDto.fecha_fin) {
      updates.push(`fecha_fin = $${paramIndex++}::date`);
      values.push(updateDto.fecha_fin); // String YYYY-MM-DD
    }
    if (updateDto.estado !== undefined) {
      updates.push(`estado = $${paramIndex++}`);
      values.push(updateDto.estado);
    }
    if (updateDto.porcentaje_avance !== undefined) {
      updates.push(`porcentaje_avance = $${paramIndex++}`);
      values.push(updateDto.porcentaje_avance);
    }
    if (updateDto.observaciones !== undefined) {
      updates.push(`observaciones = $${paramIndex++}`);
      values.push(updateDto.observaciones);
    }
    if (updateDto.prioridad !== undefined) {
      updates.push(`prioridad = $${paramIndex++}`);
      values.push(updateDto.prioridad);
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

    // Recargar la actividad actualizada con relaciones
    return this.actividadRepository.findOne({
      where: { id: actividadId },
      relations: ['rol', 'plan'],
    }) as Promise<ActividadPlanAnual5>;
  }

  async deleteActividad(actividadId: string): Promise<void> {
    const actividad = await this.actividadRepository.findOne({
      where: { id: actividadId },
      relations: ['rol', 'plan'],
    });

    if (!actividad) {
      throw new NotFoundException(`Actividad con ID ${actividadId} no encontrada`);
    }

    const rolId = actividad.rolId;
    const planId = actividad.planId;

    await this.actividadRepository.remove(actividad);

    // Recalcular estadísticas
    await this.recalcularRol(rolId);
    await this.recalcularPlan(planId);
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
}

