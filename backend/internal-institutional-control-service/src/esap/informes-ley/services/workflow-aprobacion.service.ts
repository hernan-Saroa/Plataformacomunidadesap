import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EntregaInformeLey } from '../entities/entrega-informe-ley.entity';
import { WorkflowAprobacionInforme } from '../entities/workflow-aprobacion-informe.entity';
import { PasoWorkflowInforme } from '../entities/paso-workflow-informe.entity';
import { HistorialGeneracionInforme } from '../entities/historial-generacion-informe.entity';
import { EnviarRevisionDto } from '../dto/enviar-revision.dto';
import { AprobarInformeDto } from '../dto/aprobar-informe.dto';
import { RechazarInformeDto } from '../dto/rechazar-informe.dto';
import { PlanAnual5RolesService } from '../../plan-anual-5-roles/plan-anual-5-roles.service';

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
    @Inject(forwardRef(() => PlanAnual5RolesService))
    private readonly planAnualService: PlanAnual5RolesService,
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

      // 4. Vincular a "Enfoque a la Prevención" si aplica (US-033)
      // Esto se hace fuera de la transacción para evitar dependencias circulares
      // y porque no es crítico si falla (el informe ya está aprobado)
      try {
        await this.vincularEnfoquePrevencion(entregaActualizada, usuarioNombre, usuarioId);
      } catch (error) {
        // Log del error pero no fallar la aprobación
        console.error('Error al vincular informe a Enfoque a la Prevención:', error);
      }

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

  /**
   * Vincular informe aprobado al módulo "Enfoque a la Prevención" del Plan Anual
   * (US-033: Al aprobar, almacenar y vincular a "Enfoque a la prevención")
   * 
   * Códigos de informes que se vinculan a "Enfoque a la Prevención":
   * - INF-PORM: Informe Pormenorizado
   * - INF-ANUAL-OCI: Informe Anual OCI
   * - INF-FUR: Informe FUR
   * - INF-ANTICORRUPCION: Informe Anticorrupción
   * - INF-AUSTERIDAD: Informe Austeridad
   * - INF-ESP-ENTES-CONTROL: Informes a Entes de Control
   * - INF-ESP-CONSEJO-SUPERIOR: Informes Consejo Superior
   */
  private async vincularEnfoquePrevencion(
    entrega: EntregaInformeLey,
    responsable: string,
    usuarioId?: string,
  ): Promise<void> {
    // Códigos de informes que se vinculan a "Enfoque a la Prevención"
    const CODIGOS_ENFOQUE_PREVENCION = [
      'INF-PORM',
      'INF-ANUAL-OCI',
      'INF-FUR',
      'INF-ANTICORRUPCION',
      'INF-AUSTERIDAD',
      'INF-ESP-ENTES-CONTROL',
      'INF-ESP-CONSEJO-SUPERIOR',
    ];

    // Verificar si el informe debe vincularse
    if (!CODIGOS_ENFOQUE_PREVENCION.includes(entrega.informeLey.codigo)) {
      return; // No requiere vinculación
    }

    // Extraer el año del periodo
    // Formatos posibles: "2025", "2025-S1", "2025-Q1", "2025-01", "2025-02"
    const año = this.extraerAñoDelPeriodo(entrega.periodo);
    if (!año) {
      console.warn(`⚠️ No se pudo extraer el año del periodo: ${entrega.periodo}. El informe se aprobó pero no se vinculó al Plan Anual.`);
      return;
    }

    // Buscar el Plan Anual del año correspondiente
    let planAnual = await this.planAnualService.findByYear(año);
    
    // Si no existe el Plan Anual, crearlo automáticamente
    if (!planAnual) {
      console.log(`📋 No se encontró Plan Anual para el año ${año}. Creando Plan Anual automáticamente...`);
      try {
        // Convertir usuarioId a número (bigint) si es necesario
        // El usuarioId debe ser un número (bigint) que referencia auth.personas(id_tercero)
        let usuarioIdParaPlan: number | undefined;
        if (usuarioId) {
          if (typeof usuarioId === 'string') {
            // Intentar convertir string a número
            const usuarioIdNum = parseInt(usuarioId, 10);
            usuarioIdParaPlan = isNaN(usuarioIdNum) ? 1 : usuarioIdNum; // Usar 1 como valor por defecto si no se puede convertir
          } else if (typeof usuarioId === 'number') {
            usuarioIdParaPlan = usuarioId;
          }
        } else {
          // Si no hay usuarioId, usar 1 como valor por defecto (sistema)
          usuarioIdParaPlan = 1;
        }
        
        planAnual = await this.planAnualService.create(
          {
            año: año,
            responsable: responsable || 'Jefe OCI',
            estado: 'borrador', // Se crea en borrador, puede ser aprobado después
          },
          usuarioIdParaPlan?.toString(), // El método create espera string, pero registrarHistorial lo convierte a número
        );
        console.log(`✅ Plan Anual ${año} creado automáticamente para vincular el informe.`);
      } catch (error) {
        console.error(`❌ Error al crear Plan Anual para el año ${año}:`, error);
        console.warn(`⚠️ El informe se aprobó pero no se pudo vincular al Plan Anual. Se recomienda crear el Plan Anual manualmente.`);
        return;
      }
    }

    // Buscar el rol 2 (Enfoque a la Prevención) en el plan
    // Si el plan se acaba de crear, recargarlo con relaciones
    if (!planAnual.roles || planAnual.roles.length === 0) {
      planAnual = await this.planAnualService.findOne(planAnual.id);
    }

    const rolEnfoquePrevencion = planAnual.roles?.find((rol) => rol.rol_numero === 2);
    if (!rolEnfoquePrevencion) {
      console.error(`❌ No se encontró el rol "Enfoque a la Prevención" (rol_numero=2) en el Plan Anual ${año}. Esto indica un problema en la estructura del Plan Anual.`);
      console.warn(`⚠️ El informe se aprobó pero no se pudo vincular. Verifique que el Plan Anual tenga los 5 roles del Decreto 648.`);
      return;
    }

    // Crear actividad automática en el Plan Anual
    const nombreActividad = `Informe de Ley: ${entrega.informeLey.nombre}`;
    const descripcionActividad = `Informe aprobado: ${entrega.informeLey.nombre} (${entrega.periodo}).\n` +
      `Código: ${entrega.informeLey.codigo}\n` +
      `Aprobado por: ${entrega.aprobadoPor || responsable}\n` +
      `Fecha de aprobación: ${entrega.fechaAprobacion?.toLocaleDateString('es-CO')}\n` +
      (entrega.archivoUrl ? `Archivo: ${entrega.archivoUrl}\n` : '') +
      (entrega.observaciones ? `Observaciones: ${entrega.observaciones}` : '');

    // Usar el servicio del Plan Anual para crear la actividad
    // Convertir usuarioId a número (bigint) si es necesario
    let usuarioIdParaActividad: number | undefined;
    if (usuarioId) {
      if (typeof usuarioId === 'string') {
        // Intentar convertir string a número
        const usuarioIdNum = parseInt(usuarioId, 10);
        usuarioIdParaActividad = isNaN(usuarioIdNum) ? 1 : usuarioIdNum; // Usar 1 como valor por defecto si no se puede convertir
      } else if (typeof usuarioId === 'number') {
        usuarioIdParaActividad = usuarioId;
      }
    } else {
      // Si no hay usuarioId, usar 1 como valor por defecto (sistema)
      usuarioIdParaActividad = 1;
    }
    
    await this.planAnualService.addActividad(
      rolEnfoquePrevencion.id,
      {
        nombre: nombreActividad,
        descripcion: descripcionActividad,
        responsable: entrega.aprobadoPor || responsable || 'Jefe OCI',
        fecha_inicio: entrega.fechaAprobacion?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        fecha_fin: entrega.fechaAprobacion?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        estado: 'completada', // El informe ya está aprobado, la actividad se marca como completada
        porcentaje_avance: 100, // 100% porque ya está aprobado
        observaciones: `Vinculado automáticamente desde Informes de Ley. Entrega ID: ${entrega.id}`,
        prioridad: 'Alta',
      },
      usuarioIdParaActividad, // Pasar número directamente (addActividad acepta string | number)
    );
  }

  /**
   * Extrae el año de un periodo en diferentes formatos
   * Formatos soportados: "2025", "2025-S1", "2025-Q1", "2025-01", "2025-02"
   */
  private extraerAñoDelPeriodo(periodo: string): number | null {
    if (!periodo) return null;

    // Formato simple: "2025"
    const añoSimple = /^(\d{4})$/.exec(periodo);
    if (añoSimple) {
      return parseInt(añoSimple[1], 10);
    }

    // Formatos con sufijo: "2025-S1", "2025-Q1", "2025-01", "2025-02"
    const añoConSufijo = /^(\d{4})[-/]/.exec(periodo);
    if (añoConSufijo) {
      return parseInt(añoConSufijo[1], 10);
    }

    // Intentar extraer cualquier número de 4 dígitos al inicio
    const añoGenerico = /^(\d{4})/.exec(periodo);
    if (añoGenerico) {
      const año = parseInt(añoGenerico[1], 10);
      // Validar que sea un año razonable (2000-2100)
      if (año >= 2000 && año <= 2100) {
        return año;
      }
    }

    return null;
  }
}
