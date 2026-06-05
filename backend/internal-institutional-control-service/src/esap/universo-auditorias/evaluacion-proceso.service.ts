/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVICIO: Evaluaciones de Procesos (DAFP)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * CRUD para evaluaciones de procesos auditables.
 * Permite múltiples evaluaciones por proceso con diferentes vigencias/fechas.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Injectable, NotFoundException, ConflictException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvaluacionProceso } from './entities/evaluacion-proceso.entity';
import { ProcesoAuditable } from './entities/proceso-auditable.entity';
import { CreateEvaluacionProcesoDto, UpdateEvaluacionProcesoDto } from './dto/evaluacion-proceso.dto';
import { EvaluacionRol4TareaSyncService } from './evaluacion-rol4-tarea-sync.service';
import { calcularAuditableDesdeCiclo } from './evaluacion-auditable.util';

export { calcularAuditableDesdeCiclo } from './evaluacion-auditable.util';

@Injectable()
export class EvaluacionProcesoService implements OnModuleInit {
  private readonly logger = new Logger(EvaluacionProcesoService.name);

  constructor(
    @InjectRepository(EvaluacionProceso)
    private readonly evaluacionRepository: Repository<EvaluacionProceso>,
    @InjectRepository(ProcesoAuditable)
    private readonly procesoRepository: Repository<ProcesoAuditable>,
    private readonly rol4TareaSync: EvaluacionRol4TareaSyncService,
  ) {}

  private async syncTareaRol4(evaluacion: EvaluacionProceso): Promise<void> {
    const conProceso = evaluacion.proceso
      ? evaluacion
      : await this.findOne(evaluacion.id);
    await this.rol4TareaSync.sincronizarDesdeEvaluacion(conProceso);
  }

  async onModuleInit() {
    try {
      this.logger.log('Limpiando restricciones únicas antiguas en la base de datos...');
      const queryRunner = this.evaluacionRepository.manager.connection.createQueryRunner();
      await queryRunner.connect();
      
      try {
        const table = await queryRunner.getTable('control_interno.evaluacion_proceso');
        if (table) {
          const isTargetConstraint = (columnNames: string[]) => 
            columnNames.length === 3 && 
            columnNames.includes('proceso_id') && 
            columnNames.includes('vigencia') && 
            columnNames.includes('fecha_corte');

          // Eliminar índices únicos antiguos de 3 columnas
          const indicesToDrop = table.indices.filter(idx => idx.isUnique && isTargetConstraint(idx.columnNames));
          for (const idx of indicesToDrop) {
            await queryRunner.dropIndex(table, idx);
            this.logger.log(`Índice único antiguo eliminado: ${idx.name}`);
          }
          
          // Eliminar constraints únicos antiguos de 3 columnas
          const uniquesToDrop = table.uniques.filter(uq => isTargetConstraint(uq.columnNames));
          for (const uq of uniquesToDrop) {
            await queryRunner.dropUniqueConstraint(table, uq);
            this.logger.log(`Constraint único antiguo eliminado: ${uq.name}`);
          }

          // Crear la nueva restricción única de 4 columnas (si no existe)
          const newConstraintColumns = ['proceso_id', 'vigencia', 'fecha_corte', 'dependencia_responsable'];
          const hasNewConstraint = table.uniques.some(uq => 
            uq.columnNames.length === 4 && 
            newConstraintColumns.every(col => uq.columnNames.includes(col))
          );

          if (!hasNewConstraint) {
            // Utilizamos query directa para evitar importar la clase TableUnique y simplificar
            await queryRunner.query(
              `ALTER TABLE control_interno.evaluacion_proceso ADD CONSTRAINT "UQ_evaluacion_proceso_4cols" UNIQUE (proceso_id, vigencia, fecha_corte, dependencia_responsable)`
            );
            this.logger.log('Nueva restricción única de 4 columnas creada con éxito (migración completada).');
          }
        }
      } finally {
        await queryRunner.release();
      }
      this.logger.log('Restricciones de base de datos validadas con éxito.');
    } catch (error) {
      this.logger.warn('No se pudieron limpiar las restricciones antiguas (puedes ignorar esto si la BD está limpia):', error);
    }
  }

  /**
   * Obtiene todas las evaluaciones con filtros opcionales
   */
  async findAll(filters?: {
    vigencia?: number;
    procesoId?: string;
    decisionFinal?: string;
    soloActivos?: boolean;
  }): Promise<EvaluacionProceso[]> {
    const query = this.evaluacionRepository.createQueryBuilder('evaluacion')
      .leftJoinAndSelect('evaluacion.proceso', 'proceso')
      .orderBy('evaluacion.vigencia', 'DESC')
      .addOrderBy('evaluacion.fechaCorte', 'DESC')
      .addOrderBy('evaluacion.createdAt', 'DESC');

    // Por defecto solo evaluaciones activas
    const soloActivos = filters?.soloActivos !== false;
    if (soloActivos) {
      query.andWhere('evaluacion.activo = :activo', { activo: true });
    }

    if (filters?.vigencia) {
      query.andWhere('evaluacion.vigencia = :vigencia', { vigencia: filters.vigencia });
    }

    if (filters?.procesoId) {
      query.andWhere('evaluacion.procesoId = :procesoId', { procesoId: filters.procesoId });
    }

    if (filters?.decisionFinal) {
      query.andWhere('evaluacion.decisionFinal = :decisionFinal', { decisionFinal: filters.decisionFinal });
    }

    return query.getMany();
  }

  /**
   * Obtiene una evaluación por ID
   */
  async findOne(id: string): Promise<EvaluacionProceso> {
    const evaluacion = await this.evaluacionRepository.findOne({
      where: { id },
      relations: ['proceso'],
    });

    if (!evaluacion) {
      throw new NotFoundException(`Evaluación con ID ${id} no encontrada`);
    }

    return evaluacion;
  }

  /**
   * Obtiene evaluaciones por proceso
   */
  async findByProceso(procesoId: string): Promise<EvaluacionProceso[]> {
    return this.evaluacionRepository.find({
      where: { procesoId, activo: true },
      order: { vigencia: 'DESC', fechaCorte: 'DESC' },
    });
  }

  /**
   * Crea una nueva evaluación
   */
  async create(dto: CreateEvaluacionProcesoDto): Promise<EvaluacionProceso> {
    // Verificar que el proceso existe
    const proceso = await this.procesoRepository.findOne({
      where: { id: dto.procesoId },
    });

    if (!proceso) {
      throw new NotFoundException(`Proceso con ID ${dto.procesoId} no encontrado`);
    }

    // Verificar que no exista otra evaluación con la misma vigencia + fecha corte + dependencia
    const existente = await this.evaluacionRepository.findOne({
      where: {
        procesoId: dto.procesoId,
        vigencia: dto.vigencia,
        fechaCorte: new Date(dto.fechaCorte),
        dependenciaResponsable: dto.dependenciaResponsable,
      },
    });

    if (existente) {
      throw new ConflictException(
        `Ya existe una evaluación para este proceso con vigencia ${dto.vigencia}, fecha de corte ${dto.fechaCorte} y unidad auditable ${dto.dependenciaResponsable}`
      );
    }

    // Calcular total de riesgos si no viene
    const totalRiesgos = dto.totalRiesgos ?? 
      (dto.riesgosExtremos || 0) + 
      (dto.riesgosAltos || 0) + 
      (dto.riesgosModerados || 0) + 
      (dto.riesgosBajos || 0);

    // Calcular score de riesgo si no viene
    const scoreRiesgo = dto.scoreRiesgo ?? 
      Math.max(0, Math.min(15, (dto.criticidad || 0) + (dto.exposicion || 0) - (dto.mitigantes || 0)));

    const evaluacion = this.evaluacionRepository.create({
      procesoId: dto.procesoId,
      vigencia: dto.vigencia,
      fechaCorte: new Date(dto.fechaCorte),
      dependenciaResponsable: dto.dependenciaResponsable,
      riesgosExtremos: dto.riesgosExtremos || 0,
      riesgosAltos: dto.riesgosAltos || 0,
      riesgosModerados: dto.riesgosModerados || 0,
      riesgosBajos: dto.riesgosBajos || 0,
      totalRiesgos,
      requerimientoComite: dto.requerimientoComite || false,
      requerimientoEntesReg: dto.requerimientoEntesReg || false,
      fechaUltimaAuditoria: dto.fechaUltimaAuditoria ? new Date(dto.fechaUltimaAuditoria) : undefined,
      resultadoUltimaAuditoria: dto.resultadoUltimaAuditoria,
      criticidad: dto.criticidad || 0,
      exposicion: dto.exposicion || 0,
      mitigantes: dto.mitigantes || 0,
      scoreRiesgo,
      ponderacionRiesgo: dto.ponderacionRiesgo,
      diasTranscurridos: dto.diasTranscurridos,
      planRotacion: dto.planRotacion,
      diasRotacion: dto.diasRotacion || 360,
      decisionRotacion: dto.decisionRotacion,
      // Criterios DAFP RE-E-GE-034
      tiempoUltimaAuditoria: dto.tiempoUltimaAuditoria || 0,
      temasAltaDireccion: dto.temasAltaDireccion || 0,
      objetivosEstrategicos: dto.objetivosEstrategicos || 0,
      hallazgosAnteriores: dto.hallazgosAnteriores || 0,
      ponderacionFinalDafp: dto.ponderacionFinalDafp || 0,
      nivelCriticidadDafp: dto.nivelCriticidadDafp,
      cicloRotacionDafp: dto.cicloRotacionDafp,
      decisionFinal: dto.decisionFinal,
      motivoDecision: dto.motivoDecision,
      prioridadRegla: dto.prioridadRegla,
      creadoPor: dto.creadoPor,
      activo: true,
      auditableCalculado: calcularAuditableDesdeCiclo(dto.cicloRotacionDafp),
      auditableManual: dto.auditableManual ?? null,
    });

    try {
      const saved = await this.evaluacionRepository.save(evaluacion);
      const conProceso = await this.findOne(saved.id);
      await this.syncTareaRol4(conProceso);
      return conProceso;
    } catch (error) {
      this.logger.error(`Error guardando evaluación: ${error.message}`, error.stack);
      if (error.code === '23505') { // Postgres unique violation
        throw new ConflictException(`Conflicto de unicidad en la base de datos: ${error.detail || error.message}`);
      }
      throw new ConflictException(`Error interno en la BD: ${error.message}`);
    }
  }

  /**
   * Actualiza una evaluación existente
   */
  async update(id: string, dto: UpdateEvaluacionProcesoDto): Promise<EvaluacionProceso> {
    const evaluacion = await this.findOne(id);

    // Si cambia vigencia, fechaCorte o dependenciaResponsable, verificar unicidad
    if (dto.vigencia !== undefined || dto.fechaCorte !== undefined || dto.dependenciaResponsable !== undefined) {
      const newVigencia = dto.vigencia ?? evaluacion.vigencia;
      const newFechaCorte = dto.fechaCorte ? new Date(dto.fechaCorte) : evaluacion.fechaCorte;
      const newDependencia = dto.dependenciaResponsable ?? evaluacion.dependenciaResponsable;

      const existente = await this.evaluacionRepository.findOne({
        where: {
          procesoId: evaluacion.procesoId,
          vigencia: newVigencia,
          fechaCorte: newFechaCorte,
          dependenciaResponsable: newDependencia,
        },
      });

      if (existente && existente.id !== id) {
        throw new ConflictException(
          `Ya existe una evaluación para este proceso con vigencia ${newVigencia}, fecha de corte y unidad auditable ${newDependencia}`
        );
      }
    }

    // Actualizar campos
    if (dto.vigencia !== undefined) evaluacion.vigencia = dto.vigencia;
    if (dto.fechaCorte !== undefined) evaluacion.fechaCorte = new Date(dto.fechaCorte);
    if (dto.dependenciaResponsable !== undefined) evaluacion.dependenciaResponsable = dto.dependenciaResponsable;
    if (dto.riesgosExtremos !== undefined) evaluacion.riesgosExtremos = dto.riesgosExtremos;
    if (dto.riesgosAltos !== undefined) evaluacion.riesgosAltos = dto.riesgosAltos;
    if (dto.riesgosModerados !== undefined) evaluacion.riesgosModerados = dto.riesgosModerados;
    if (dto.riesgosBajos !== undefined) evaluacion.riesgosBajos = dto.riesgosBajos;
    if (dto.totalRiesgos !== undefined) evaluacion.totalRiesgos = dto.totalRiesgos;
    if (dto.requerimientoComite !== undefined) evaluacion.requerimientoComite = dto.requerimientoComite;
    if (dto.requerimientoEntesReg !== undefined) evaluacion.requerimientoEntesReg = dto.requerimientoEntesReg;
    if (dto.fechaUltimaAuditoria !== undefined) {
      evaluacion.fechaUltimaAuditoria = dto.fechaUltimaAuditoria ? new Date(dto.fechaUltimaAuditoria) : undefined;
    }
    if (dto.resultadoUltimaAuditoria !== undefined) evaluacion.resultadoUltimaAuditoria = dto.resultadoUltimaAuditoria;
    if (dto.criticidad !== undefined) evaluacion.criticidad = dto.criticidad;
    if (dto.exposicion !== undefined) evaluacion.exposicion = dto.exposicion;
    if (dto.mitigantes !== undefined) evaluacion.mitigantes = dto.mitigantes;
    if (dto.scoreRiesgo !== undefined) evaluacion.scoreRiesgo = dto.scoreRiesgo;
    if (dto.ponderacionRiesgo !== undefined) evaluacion.ponderacionRiesgo = dto.ponderacionRiesgo;
    if (dto.diasTranscurridos !== undefined) evaluacion.diasTranscurridos = dto.diasTranscurridos;
    if (dto.planRotacion !== undefined) evaluacion.planRotacion = dto.planRotacion;
    if (dto.diasRotacion !== undefined) evaluacion.diasRotacion = dto.diasRotacion;
    if (dto.decisionRotacion !== undefined) evaluacion.decisionRotacion = dto.decisionRotacion;
    // Criterios DAFP RE-E-GE-034
    if (dto.tiempoUltimaAuditoria !== undefined) evaluacion.tiempoUltimaAuditoria = dto.tiempoUltimaAuditoria;
    if (dto.temasAltaDireccion !== undefined) evaluacion.temasAltaDireccion = dto.temasAltaDireccion;
    if (dto.objetivosEstrategicos !== undefined) evaluacion.objetivosEstrategicos = dto.objetivosEstrategicos;
    if (dto.hallazgosAnteriores !== undefined) evaluacion.hallazgosAnteriores = dto.hallazgosAnteriores;
    if (dto.ponderacionFinalDafp !== undefined) evaluacion.ponderacionFinalDafp = dto.ponderacionFinalDafp;
    if (dto.nivelCriticidadDafp !== undefined) evaluacion.nivelCriticidadDafp = dto.nivelCriticidadDafp;
    if (dto.cicloRotacionDafp !== undefined) evaluacion.cicloRotacionDafp = dto.cicloRotacionDafp;
    if (dto.decisionFinal !== undefined) evaluacion.decisionFinal = dto.decisionFinal;
    if (dto.motivoDecision !== undefined) evaluacion.motivoDecision = dto.motivoDecision;
    if (dto.prioridadRegla !== undefined) evaluacion.prioridadRegla = dto.prioridadRegla;
    if (dto.activo !== undefined) evaluacion.activo = dto.activo;
    if (dto.auditableManual !== undefined) evaluacion.auditableManual = dto.auditableManual;

    if (dto.cicloRotacionDafp !== undefined) {
      evaluacion.auditableCalculado = calcularAuditableDesdeCiclo(dto.cicloRotacionDafp);
    } else if (dto.auditableCalculado !== undefined) {
      evaluacion.auditableCalculado = dto.auditableCalculado;
    }

    // Recalcular totales si cambiaron los riesgos individuales
    evaluacion.totalRiesgos = 
      evaluacion.riesgosExtremos + 
      evaluacion.riesgosAltos + 
      evaluacion.riesgosModerados + 
      evaluacion.riesgosBajos;

    evaluacion.scoreRiesgo = Math.max(0, Math.min(15, 
      evaluacion.criticidad + evaluacion.exposicion - evaluacion.mitigantes
    ));

    try {
      const saved = await this.evaluacionRepository.save(evaluacion);
      const conProceso = await this.findOne(saved.id);
      await this.syncTareaRol4(conProceso);
      return conProceso;
    } catch (error) {
      this.logger.error(`Error actualizando evaluación: ${error.message}`, error.stack);
      if (error.code === '23505') {
        throw new ConflictException(`Conflicto de unicidad en la base de datos: ${error.detail || error.message}`);
      }
      throw new ConflictException(`Error interno en la BD: ${error.message}`);
    }
  }

  /**
   * Override manual de priorización auditable (columna Aud. en tabla).
   * auditableManual = null restaura el valor calculado por DAFP.
   */
  async patchAuditableManual(id: string, auditableManual: boolean | null): Promise<EvaluacionProceso> {
    const evaluacion = await this.findOne(id);

    if (!evaluacion.ponderacionFinalDafp && evaluacion.ponderacionFinalDafp !== 0) {
      throw new BadRequestException(
        'Complete la evaluación DAFP antes de definir la priorización auditable.',
      );
    }

    evaluacion.auditableManual = auditableManual;
    const saved = await this.evaluacionRepository.save(evaluacion);
    const conProceso = await this.findOne(saved.id);
    await this.syncTareaRol4(conProceso);
    return conProceso;
  }

  /**
   * Elimina una evaluación (soft delete - inactivar)
   */
  async delete(id: string): Promise<void> {
    const evaluacion = await this.findOne(id);
    evaluacion.activo = false;
    const saved = await this.evaluacionRepository.save(evaluacion);
    await this.syncTareaRol4(saved);
  }

  /**
   * Elimina permanentemente una evaluación
   */
  async hardDelete(id: string): Promise<void> {
    const evaluacion = await this.findOne(id);
    evaluacion.activo = false;
    await this.syncTareaRol4(evaluacion);
    await this.evaluacionRepository.remove(evaluacion);
  }

  /**
   * Obtiene estadísticas de evaluaciones por vigencia
   */
  async getEstadisticas(vigencia: number): Promise<{
    totalEvaluaciones: number;
    incluirPlanAnual: number;
    auditoriaPosterior: number;
    porPonderacion: Record<string, number>;
  }> {
    const evaluaciones = await this.findAll({ vigencia, soloActivos: true });

    const incluirPlanAnual = evaluaciones.filter(e => e.decisionFinal === 'INCLUIR PLAN ANUAL').length;
    const auditoriaPosterior = evaluaciones.filter(e => e.decisionFinal === 'AUDITORÍA POSTERIOR').length;

    const porPonderacion: Record<string, number> = {};
    evaluaciones.forEach(e => {
      const pond = e.ponderacionRiesgo || 'SIN EVALUAR';
      porPonderacion[pond] = (porPonderacion[pond] || 0) + 1;
    });

    return {
      totalEvaluaciones: evaluaciones.length,
      incluirPlanAnual,
      auditoriaPosterior,
      porPonderacion,
    };
  }
}
