import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EntregaInformeLey } from '../entities/entrega-informe-ley.entity';
import { WorkflowAprobacionInforme } from '../entities/workflow-aprobacion-informe.entity';
import { PasoWorkflowInforme } from '../entities/paso-workflow-informe.entity';
import { HistorialGeneracionInforme } from '../entities/historial-generacion-informe.entity';
import { EnviarRevisionDto } from '../dto/enviar-revision.dto';
import { AprobarInformeDto } from '../dto/aprobar-informe.dto';
import { RechazarInformeDto } from '../dto/rechazar-informe.dto';

@Injectable()
export class WorkflowAprobacionService {
  constructor(
    @InjectRepository(EntregaInformeLey)
    private readonly entregaRepository: Repository<EntregaInformeLey>,
    @InjectRepository(WorkflowAprobacionInforme)
    private readonly workflowRepository: Repository<WorkflowAprobacionInforme>,
    @InjectRepository(PasoWorkflowInforme)
    private readonly pasoRepository: Repository<PasoWorkflowInforme>,
    @InjectRepository(HistorialGeneracionInforme)
    private readonly historialRepository: Repository<HistorialGeneracionInforme>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Enviar informe a revisión (Auditor → Jefe OCI)
   * Cambia estado de 'borrador' a 'en-revision'
   */
  async enviarRevision(
    entregaId: string,
    dto: EnviarRevisionDto,
    usuarioId: string,
    usuarioNombre: string,
    req?: any,
  ): Promise<EntregaInformeLey> {
    const entrega = await this.entregaRepository.findOne({
      where: { id: entregaId },
      relations: ['informeLey'],
    });

    if (!entrega) {
      throw new NotFoundException(`Entrega con ID ${entregaId} no encontrada`);
    }

    // Validar que el estado actual permita enviar a revisión
    if (entrega.estadoWorkflow !== 'borrador' && entrega.estadoWorkflow !== 'rechazado') {
      throw new BadRequestException(
        `No se puede enviar a revisión. Estado actual: ${entrega.estadoWorkflow}`
      );
    }

    // Validar que tenga archivo generado
    if (!entrega.archivoUrl) {
      throw new BadRequestException('El informe debe tener un archivo generado antes de enviar a revisión');
    }

    return await this.dataSource.transaction(async (manager) => {
      // 1. Actualizar estado de la entrega
      entrega.estadoWorkflow = 'en-revision';
      entrega.observaciones = dto.observaciones || entrega.observaciones;
      const entregaActualizada = await manager.save(EntregaInformeLey, entrega);

      // 2. Obtener o crear workflow
      let workflow = await manager.findOne(WorkflowAprobacionInforme, {
        where: { entregaId },
        relations: ['pasos'],
      });

      if (!workflow) {
        workflow = manager.create(WorkflowAprobacionInforme, {
          entregaId,
          pasoActual: 1,
          estadoWorkflow: 'en-revision',
          creadoPor: usuarioNombre,
        });
        workflow = await manager.save(WorkflowAprobacionInforme, workflow);

        // Crear pasos del workflow si no existen
        const pasosExistentes = await manager.find(PasoWorkflowInforme, {
          where: { workflowId: workflow.id },
        });

        if (pasosExistentes.length === 0) {
          // Crear pasos estándar: Elaboración → Revisión → Aprobación
          const pasos = [
            {
              workflowId: workflow.id,
              numeroPaso: 1,
              nombre: 'elaboracion',
              nombreDisplay: 'Elaboración',
              descripcion: 'Elaboración del informe por el auditor',
              rolResponsable: 'Auditor',
              estado: 'completado' as const,
              fechaInicio: entrega.fechaGeneracion || new Date(),
              fechaFin: new Date(),
              accion: 'elaborar' as const,
              esObligatorio: true,
              orden: 1,
            },
            {
              workflowId: workflow.id,
              numeroPaso: 2,
              nombre: 'revision',
              nombreDisplay: 'Revisión Técnica',
              descripcion: 'Revisión del informe por el Jefe OCI',
              rolResponsable: 'Jefe OCI',
              estado: 'en-proceso' as const,
              fechaInicio: new Date(),
              accion: 'revisar' as const,
              esObligatorio: true,
              orden: 2,
            },
            {
              workflowId: workflow.id,
              numeroPaso: 3,
              nombre: 'aprobacion',
              nombreDisplay: 'Aprobación',
              descripcion: 'Aprobación final del informe',
              rolResponsable: 'Jefe OCI',
              estado: 'pendiente' as const,
              accion: 'aprobar' as const,
              esObligatorio: true,
              orden: 3,
            },
          ];

          await manager.save(PasoWorkflowInforme, pasos.map(p => manager.create(PasoWorkflowInforme, p)));
        }
      } else {
        // Actualizar workflow existente
        workflow.estadoWorkflow = 'en-revision';
        workflow.pasoActual = 2; // Paso de revisión
        await manager.save(WorkflowAprobacionInforme, workflow);

        // Actualizar paso de revisión a 'en-proceso'
        const pasoRevision = await manager.findOne(PasoWorkflowInforme, {
          where: { workflowId: workflow.id, numeroPaso: 2 },
        });
        if (pasoRevision) {
          pasoRevision.estado = 'en-proceso';
          pasoRevision.fechaInicio = new Date();
          await manager.save(PasoWorkflowInforme, pasoRevision);
        }
      }

      // 3. Registrar en historial
      const historial = manager.create(HistorialGeneracionInforme, {
        entregaId,
        accion: 'enviado_aprobacion',
        usuarioId,
        usuarioNombre,
        observaciones: dto.observaciones || 'Informe enviado a revisión',
        datosAnteriores: { estadoWorkflow: 'borrador' },
        datosNuevos: { estadoWorkflow: 'en-revision' },
        ipOrigen: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.headers?.['user-agent'],
      });
      await manager.save(HistorialGeneracionInforme, historial);

      return entregaActualizada;
    });
  }

  /**
   * Aprobar informe (Jefe OCI)
   * Cambia estado de 'en-revision' o 'en-aprobacion' a 'aprobado'
   */
  async aprobarInforme(
    entregaId: string,
    dto: AprobarInformeDto,
    usuarioId: string,
    usuarioNombre: string,
    req?: any,
  ): Promise<EntregaInformeLey> {
    const entrega = await this.entregaRepository.findOne({
      where: { id: entregaId },
      relations: ['informeLey'],
    });

    if (!entrega) {
      throw new NotFoundException(`Entrega con ID ${entregaId} no encontrada`);
    }

    // Validar que el estado actual permita aprobar
    if (entrega.estadoWorkflow !== 'en-revision' && entrega.estadoWorkflow !== 'en-aprobacion') {
      throw new BadRequestException(
        `No se puede aprobar. Estado actual: ${entrega.estadoWorkflow}`
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      // 1. Actualizar estado de la entrega
      const estadoAnterior = entrega.estadoWorkflow;
      entrega.estadoWorkflow = 'aprobado';
      entrega.estado = 'entregado';
      entrega.aprobadoPor = usuarioNombre;
      entrega.fechaAprobacion = new Date();
      if (dto.observaciones) {
        entrega.observaciones = dto.observaciones;
      }
      const entregaActualizada = await manager.save(EntregaInformeLey, entrega);

      // 2. Actualizar workflow
      const workflow = await manager.findOne(WorkflowAprobacionInforme, {
        where: { entregaId },
        relations: ['pasos'],
      });

      if (workflow) {
        workflow.estadoWorkflow = 'aprobado';
        workflow.completado = true;
        workflow.fechaCompletado = new Date();
        workflow.pasoActual = 3; // Paso de aprobación
        await manager.save(WorkflowAprobacionInforme, workflow);

        // Completar paso de aprobación
        const pasoAprobacion = await manager.findOne(PasoWorkflowInforme, {
          where: { workflowId: workflow.id, numeroPaso: 3 },
        });
        if (pasoAprobacion) {
          pasoAprobacion.estado = 'completado';
          pasoAprobacion.fechaFin = new Date();
          pasoAprobacion.observaciones = dto.observaciones;
          await manager.save(PasoWorkflowInforme, pasoAprobacion);
        }

        // Completar paso de revisión si estaba en proceso
        const pasoRevision = await manager.findOne(PasoWorkflowInforme, {
          where: { workflowId: workflow.id, numeroPaso: 2 },
        });
        if (pasoRevision && pasoRevision.estado === 'en-proceso') {
          pasoRevision.estado = 'completado';
          pasoRevision.fechaFin = new Date();
          await manager.save(PasoWorkflowInforme, pasoRevision);
        }
      }

      // 3. Registrar en historial
      const historial = manager.create(HistorialGeneracionInforme, {
        entregaId,
        accion: 'aprobado',
        usuarioId,
        usuarioNombre,
        observaciones: dto.observaciones || 'Informe aprobado por Jefe OCI',
        datosAnteriores: { estadoWorkflow: estadoAnterior },
        datosNuevos: { estadoWorkflow: 'aprobado', estado: 'entregado' },
        ipOrigen: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.headers?.['user-agent'],
      });
      await manager.save(HistorialGeneracionInforme, historial);

      return entregaActualizada;
    });
  }

  /**
   * Rechazar informe (Jefe OCI)
   * Cambia estado a 'rechazado' y permite correcciones
   */
  async rechazarInforme(
    entregaId: string,
    dto: RechazarInformeDto,
    usuarioId: string,
    usuarioNombre: string,
    req?: any,
  ): Promise<EntregaInformeLey> {
    const entrega = await this.entregaRepository.findOne({
      where: { id: entregaId },
      relations: ['informeLey'],
    });

    if (!entrega) {
      throw new NotFoundException(`Entrega con ID ${entregaId} no encontrada`);
    }

    // Validar que el estado actual permita rechazar
    if (entrega.estadoWorkflow !== 'en-revision' && entrega.estadoWorkflow !== 'en-aprobacion') {
      throw new BadRequestException(
        `No se puede rechazar. Estado actual: ${entrega.estadoWorkflow}`
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      // 1. Actualizar estado de la entrega
      const estadoAnterior = entrega.estadoWorkflow;
      entrega.estadoWorkflow = 'rechazado';
      entrega.motivoRechazo = dto.motivoRechazo;
      if (dto.observaciones) {
        entrega.observaciones = dto.observaciones;
      }
      const entregaActualizada = await manager.save(EntregaInformeLey, entrega);

      // 2. Actualizar workflow
      const workflow = await manager.findOne(WorkflowAprobacionInforme, {
        where: { entregaId },
      });

      if (workflow) {
        workflow.estadoWorkflow = 'rechazado';
        await manager.save(WorkflowAprobacionInforme, workflow);

        // Rechazar paso actual
        const pasoActual = await manager.findOne(PasoWorkflowInforme, {
          where: { workflowId: workflow.id, numeroPaso: workflow.pasoActual },
        });
        if (pasoActual) {
          pasoActual.estado = 'rechazado';
          pasoActual.observaciones = dto.motivoRechazo;
          pasoActual.fechaFin = new Date();
          await manager.save(PasoWorkflowInforme, pasoActual);
        }
      }

      // 3. Registrar en historial
      const historial = manager.create(HistorialGeneracionInforme, {
        entregaId,
        accion: 'rechazado',
        usuarioId,
        usuarioNombre,
        observaciones: `Rechazado: ${dto.motivoRechazo}. ${dto.observaciones || ''}`,
        datosAnteriores: { estadoWorkflow: estadoAnterior },
        datosNuevos: { estadoWorkflow: 'rechazado', motivoRechazo: dto.motivoRechazo },
        ipOrigen: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.headers?.['user-agent'],
      });
      await manager.save(HistorialGeneracionInforme, historial);

      return entregaActualizada;
    });
  }

  /**
   * Obtener historial de una entrega
   */
  async obtenerHistorial(entregaId: string): Promise<HistorialGeneracionInforme[]> {
    return this.historialRepository.find({
      where: { entregaId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtener workflow de una entrega
   */
  async obtenerWorkflow(entregaId: string): Promise<WorkflowAprobacionInforme | null> {
    return this.workflowRepository.findOne({
      where: { entregaId },
      relations: ['pasos'],
      order: { pasos: { orden: 'ASC' } },
    });
  }
}
