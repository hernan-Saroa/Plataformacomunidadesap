import {
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import {
  DisciplinaryProcess,
  ProcessStatus,
  ProcessStage,
} from '../entities/disciplinary-process.entity';
import {
  CreateDisciplinaryProcessDto,
  UpdateProcessStageDto,
} from '../dtos/create-disciplinary-process.dto';
import { UpdateDisciplinaryProcessDto } from '../dtos/update-disciplinary-process.dto';
import { SequenceService } from './sequence.service';
import { TerminosCalculatorService } from './terminos-calculator.service';
import { NewsService } from './news.service';
import { DisciplinaryNews, NewsStatus } from '../entities/disciplinary-news.entity';
import { Evidence } from '../entities/evidence.entity';
import { DisciplinaryProfessional } from '../entities/disciplinary-professional.entity';
import { DisciplinaryProcessActuacion } from '../entities/disciplinary-process-actuacion.entity';
import { DisciplinaryProcessTask } from '../entities/disciplinary-process-task.entity';
import { DisciplinaryProcessNote } from '../entities/disciplinary-process-note.entity';
import { StageConfiguration } from '../entities/stage-configuration.entity';
import { AlertasService } from './alertas.service';
import { TipoAlerta } from '../entities/alerta-enviada.entity';
import { NotificationClientService } from './notification-client.service';

@Injectable()
export class ProcessService {
  constructor(
    @InjectRepository(DisciplinaryProcess)
    private processRepository: Repository<DisciplinaryProcess>,
    @InjectRepository(Evidence)
    private evidenceRepository: Repository<Evidence>,
    @InjectRepository(DisciplinaryProfessional)
    private professionalRepository: Repository<DisciplinaryProfessional>,
    @InjectRepository(DisciplinaryNews)
    private newsRepository: Repository<DisciplinaryNews>,
    @InjectRepository(DisciplinaryProcessActuacion)
    private actuacionesRepository: Repository<DisciplinaryProcessActuacion>,
    @InjectRepository(DisciplinaryProcessTask)
    private tasksRepository: Repository<DisciplinaryProcessTask>,
    @InjectRepository(DisciplinaryProcessNote)
    private notesRepository: Repository<DisciplinaryProcessNote>,
    @InjectRepository(StageConfiguration)
    private stageConfigurationRepository: Repository<StageConfiguration>,
    private sequenceService: SequenceService,
    private terminosService: TerminosCalculatorService,
    private newsService: NewsService,
    private alertasService: AlertasService,
    private notificationClient: NotificationClientService,
  ) { }

  private normalizeAccessEmail(email?: string | null): string | null {
    const normalized = email?.trim().toLowerCase();
    return normalized || null;
  }

  private async resolveAccessibleProfessionalContext(
    userId?: string,
    email?: string,
  ): Promise<{ professionalIds: Set<string>; normalizedEmail: string | null }> {
    const professionalIds = new Set<string>();
    const normalizedEmail = this.normalizeAccessEmail(email);

    if (userId?.trim()) {
      professionalIds.add(userId.trim());
    }

    if (normalizedEmail) {
      const professional = await this.professionalRepository
        .createQueryBuilder('professional')
        .where('LOWER(professional.email) = :email', { email: normalizedEmail })
        .getOne();

      if (professional?.id) {
        professionalIds.add(professional.id);
      }
    }

    return { professionalIds, normalizedEmail };
  }

  private processBelongsToAccessContext(
    process: {
      abogadoAsignadoId?: string | null;
      abogadoAsignado?: { email?: string | null } | null;
    },
    professionalIds: Set<string>,
    normalizedEmail: string | null,
  ): boolean {
    if (process.abogadoAsignadoId && professionalIds.has(process.abogadoAsignadoId)) {
      return true;
    }

    const assignedEmail = this.normalizeAccessEmail(process.abogadoAsignado?.email);
    return Boolean(normalizedEmail && assignedEmail && assignedEmail === normalizedEmail);
  }

  async findAllAccessible(
    userId?: string,
    email?: string,
  ): Promise<DisciplinaryProcess[]> {
    const { professionalIds, normalizedEmail } =
      await this.resolveAccessibleProfessionalContext(userId, email);

    if (professionalIds.size === 0 && !normalizedEmail) {
      return [];
    }

    const processes = await this.findAll();

    return processes.filter((process) =>
      this.processBelongsToAccessContext(
        process,
        professionalIds,
        normalizedEmail,
      ),
    );
  }

  async findByIdAccessible(
    id: string,
    includeAutos: boolean,
    userId?: string,
    email?: string,
  ): Promise<DisciplinaryProcess> {
    const process = await this.findById(id, includeAutos);
    const { professionalIds, normalizedEmail } =
      await this.resolveAccessibleProfessionalContext(userId, email);

    if (
      !this.processBelongsToAccessContext(
        process,
        professionalIds,
        normalizedEmail,
      )
    ) {
      throw new HttpException(
        'No tiene permisos para acceder a este proceso disciplinario.',
        HttpStatus.FORBIDDEN,
      );
    }

    return process;
  }

  async findByRadicadoAccessible(
    radicadoProceso: string,
    userId?: string,
    email?: string,
  ): Promise<DisciplinaryProcess> {
    const process = await this.findByRadicado(radicadoProceso);
    const { professionalIds, normalizedEmail } =
      await this.resolveAccessibleProfessionalContext(userId, email);

    if (
      !this.processBelongsToAccessContext(
        process,
        professionalIds,
        normalizedEmail,
      )
    ) {
      throw new HttpException(
        'No tiene permisos para acceder a este proceso disciplinario.',
        HttpStatus.FORBIDDEN,
      );
    }

    return process;
  }

  async getProcessStatisticsAccessible(
    processId: string,
    userId?: string,
    email?: string,
  ): Promise<{
    draftsCount: number;
    documentsCount: number;
    timePercentage: number;
  }> {
    await this.findByIdAccessible(processId, false, userId, email);
    return this.getProcessStatistics(processId);
  }

  async findMyProcessesAccessible(
    userId?: string,
    email?: string,
  ): Promise<any[]> {
    const { professionalIds, normalizedEmail } =
      await this.resolveAccessibleProfessionalContext(userId, email);

    if (professionalIds.size === 0 && !normalizedEmail) {
      return [];
    }

    const query = this.processRepository
      .createQueryBuilder('process')
      .leftJoinAndSelect('process.news', 'news')
      .leftJoinAndSelect('process.evidence', 'evidence')
      .leftJoinAndSelect('process.autos', 'autos')
      .leftJoinAndSelect('process.abogadoAsignado', 'abogadoAsignado')
      .orderBy('process.createdAt', 'DESC');

    const professionalIdsList = Array.from(professionalIds);

    if (professionalIdsList.length > 0 && normalizedEmail) {
      query
        .where('process.abogadoAsignadoId IN (:...professionalIds)', {
          professionalIds: professionalIdsList,
        })
        .orWhere('LOWER(abogadoAsignado.email) = :email', {
          email: normalizedEmail,
        });
    } else if (professionalIdsList.length > 0) {
      query.where('process.abogadoAsignadoId IN (:...professionalIds)', {
        professionalIds: professionalIdsList,
      });
    } else if (normalizedEmail) {
      query.where('LOWER(abogadoAsignado.email) = :email', {
        email: normalizedEmail,
      });
    }

    const processes = await query.getMany();

    const actuacionesResumen = await this.buildActuacionesResumen(
      processes.map((process) => process.id),
    );
    const tasksResumen = await this.buildTasksResumen(
      processes.map((process) => process.id),
    );
    const notesResumen = await this.buildNotesResumen(
      processes.map((process) => process.id),
    );

    return processes.map((p) => {
      const actuaciones = actuacionesResumen.get(p.id);
      const tasks = tasksResumen.get(p.id);
      const notes = notesResumen.get(p.id);
      const draftsCount =
        p.autos?.filter((auto) => auto.estado === 'BORRADOR').length || 0;
      const documentsCount = p.evidence?.length || 0;

      let timePercentage = 0;
      if (p.fechaVencimientoEtapa && p.createdAt) {
        const now = new Date();
        const created = new Date(p.createdAt);
        const deadline = new Date(p.fechaVencimientoEtapa);
        const totalTime = deadline.getTime() - created.getTime();
        const elapsedTime = now.getTime() - created.getTime();
        if (totalTime > 0) {
          timePercentage = Math.min(
            100,
            Math.max(0, (elapsedTime / totalTime) * 100),
          );
        } else {
          timePercentage = 100;
        }
      }

      return {
        ...p,
        procesoAsociado: p.procesoAsociadoId
          ? {
              id: p.procesoAsociadoId,
              numeroProceso: p.procesoAsociadoNumero || '',
              tipoAsociacion: p.procesoAsociadoTipo || 'similar',
              fechaAsociacion: p.procesoAsociadoFecha
                ? new Date(p.procesoAsociadoFecha).toISOString()
                : new Date().toISOString(),
              justificacion: p.procesoAsociadoJustificacion || '',
            }
          : undefined,
        procesoAsociadoId: p.procesoAsociadoId,
        procesoAsociadoNumero: p.procesoAsociadoNumero,
        procesoAsociadoTipo: p.procesoAsociadoTipo,
        procesoAsociadoFecha: p.procesoAsociadoFecha,
        procesoAsociadoJustificacion: p.procesoAsociadoJustificacion,
        procesoConsolidadoPrincipal: p.procesoConsolidadoPrincipal,
        procesosConsolidados: p.procesosConsolidados,
        informacionConsolidada: p.informacionConsolidada,
        draftsCount,
        documentsCount,
        actuacionesCount: actuaciones?.actuacionesCount || 0,
        ultimaActuacion: actuaciones?.ultimaActuacion || null,
        ultimaActuacionFecha: actuaciones?.ultimaActuacionFecha || null,
        tasksCount: tasks?.tasksCount || 0,
        completedTasksCount: tasks?.completedTasksCount || 0,
        pendingTasksCount: tasks?.pendingTasksCount || 0,
        notesCount: notes?.notesCount || 0,
        timePercentage: Math.round(timePercentage * 100) / 100,
      };
    });
  }

  private async buildActuacionesResumen(processIds: string[]): Promise<Map<string, {
    actuacionesCount: number;
    ultimaActuacion: string | null;
    ultimaActuacionFecha: string | null;
  }>> {
    const resumen = new Map<string, {
      actuacionesCount: number;
      ultimaActuacion: string | null;
      ultimaActuacionFecha: string | null;
    }>();

    if (processIds.length === 0) {
      return resumen;
    }

    const actuaciones = await this.actuacionesRepository.find({
      where: { processId: In(processIds) },
      order: {
        fechaActuacion: 'DESC',
        createdAt: 'DESC',
      },
    });

    actuaciones.forEach((actuacion) => {
      const actual = resumen.get(actuacion.processId);

      if (!actual) {
        resumen.set(actuacion.processId, {
          actuacionesCount: 1,
          ultimaActuacion: actuacion.descripcion,
          ultimaActuacionFecha: actuacion.fechaActuacion
            ? actuacion.fechaActuacion.toISOString()
            : null,
        });
        return;
      }

      actual.actuacionesCount += 1;
    });

    return resumen;
  }

  private async buildTasksResumen(processIds: string[]): Promise<Map<string, {
    tasksCount: number;
    completedTasksCount: number;
    pendingTasksCount: number;
  }>> {
    const resumen = new Map<string, {
      tasksCount: number;
      completedTasksCount: number;
      pendingTasksCount: number;
    }>();

    if (processIds.length === 0) {
      return resumen;
    }

    const tasks = await this.tasksRepository.find({
      where: { processId: In(processIds) },
      order: {
        createdAt: 'DESC',
      },
    });

    tasks.forEach((task) => {
      const actual = resumen.get(task.processId);

      if (!actual) {
        resumen.set(task.processId, {
          tasksCount: 1,
          completedTasksCount: task.completada ? 1 : 0,
          pendingTasksCount: task.completada ? 0 : 1,
        });
        return;
      }

      actual.tasksCount += 1;
      if (task.completada) {
        actual.completedTasksCount += 1;
      } else {
        actual.pendingTasksCount += 1;
      }
    });

    return resumen;
  }

  private async buildNotesResumen(processIds: string[]): Promise<Map<string, {
    notesCount: number;
  }>> {
    const resumen = new Map<string, {
      notesCount: number;
    }>();

    if (processIds.length === 0) {
      return resumen;
    }

    const notes = await this.notesRepository.find({
      where: { processId: In(processIds) },
      order: {
        createdAt: 'DESC',
      },
    });

    notes.forEach((note) => {
      const actual = resumen.get(note.processId);

      if (!actual) {
        resumen.set(note.processId, {
          notesCount: 1,
        });
        return;
      }

      actual.notesCount += 1;
    });

    return resumen;
  }

  /**
   * Crea un nuevo proceso disciplinario (asigna profesional a una noticia)
   */
  async create(
    createProcessDto: CreateDisciplinaryProcessDto,
  ): Promise<DisciplinaryProcess> {
    try {
      // Validar que la noticia existe
      const noticia = await this.newsService.findById(createProcessDto.newsId);
      console.log('Attempting to assign process to news', createProcessDto.newsId, 'estado', noticia.estado);

      // DEBUG LOGGING
      console.log(`[ProcessService] Assigning process to news ${noticia.id}. Status: ${noticia.estado}`);

      // ✅ NUEVO: Verificar que no existe ya un proceso para esta noticia
      const existingProcess = await this.processRepository.findOne({
        where: { newsId: createProcessDto.newsId }
      });

      if (existingProcess) {
        console.error(`[ProcessService] Ya existe un proceso para esta noticia: ${createProcessDto.newsId}`);
        throw new HttpException(
          'Ya existe un proceso disciplinario para esta noticia. No se puede crear otro.',
          HttpStatus.CONFLICT,
        );
      }

      // DEBUG LOGGING
      console.log(`[ProcessService] Assigning process to news ${noticia.id}. Status: ${noticia.estado}`);

      const status = (noticia.estado || '').toUpperCase();
      const allowedStatuses = ['RADICADA', 'EN_VALORACION', 'DEVUELTA'];

      if (!allowedStatuses.includes(status)) {
        console.error(`[ProcessService] Verification failed. Expected one of ${allowedStatuses.join(', ')}, got: ${noticia.estado}`);
        throw new HttpException(
          `La noticia debe estar en estado RADICADA, EN_VALORACION o DEVUELTA para asignar proceso. Estado actual: ${noticia.estado}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Buscar el profesional asignado
      let abogado = await this.professionalRepository.findOne({
        where: { id: createProcessDto.abogadoId }
      });

      if (!abogado) {
        // Si no existe en la tabla de profesionales, crearlo con los datos proporcionados
        console.log('⚠️ Profesional no existe en BD, creando nuevo con datos:', {
          abogadoId: createProcessDto.abogadoId,
          abogadoNombre: createProcessDto.abogadoNombre
        });

        const emailProfesional = `${createProcessDto.abogadoNombre?.toLowerCase().replace(/\s+/g, '.')}@esap.edu.co`;
        let idUser = null;
        try {
          const result = await this.processRepository.manager.query(
            'SELECT id_user FROM auth.user WHERE username = $1',
            [emailProfesional]
          );
          if (result.length > 0) {
            idUser = result[0].id_user;
          }
        } catch (error) {
          console.warn('Could not fetch id_user from auth.user for email:', emailProfesional, error);
        }

        abogado = this.professionalRepository.create({
          id: createProcessDto.abogadoId, // Usar el mismo ID del candidato
          nombreCompleto: createProcessDto.abogadoNombre || 'Profesional Asignado',
          email: emailProfesional,
          cargo: 'Profesional Universitario',
          estado: 'ACTIVO',
          capacidadMaxima: 10,
          idUser: idUser,
        });

        try {
          await this.professionalRepository.save(abogado);
          console.log('✅ Profesional creado exitosamente:', {
            id: abogado.id,
            nombre: abogado.nombreCompleto,
            cargo: abogado.cargo
          });
        } catch (saveError) {
          console.error('❌ Error guardando profesional:', saveError);
          throw new HttpException(
            `Error al crear el profesional: ${saveError.message}`,
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      } else {
        console.log('✅ Profesional encontrado en BD:', {
          id: abogado.id,
          nombre: abogado.nombreCompleto,
          cargo: abogado.cargo
        });
      }

      // Generar radicado del proceso
      const radicadoProceso =
        await this.sequenceService.generateProcessRadicado();

      // Calcular fecha de prescripción (15 años desde la comisión del hecho)
      const fechaPrescripcion = this.terminosService.calculateFechaPrescripcion(
        noticia.fechaRecepcion
      );

       // Get initial kanban stage from configuration (orden 2 = VALORACION)
       const initialKanbanStage = await this.stageConfigurationRepository.findOne({
         where: { orden: 2, activo: true },
       });
       if (!initialKanbanStage) {
         throw new HttpException(
           'Initial kanban stage configuration for VALORACION not found',
           HttpStatus.INTERNAL_SERVER_ERROR,
         );
       }

       // Los procesos siempre inician en la etapa configurada con orden 2 (Valoración)
       const etapaInicial = initialKanbanStage.etapa;

       // Calcular fecha de vencimiento de la etapa inicial
       const { fechaVencimiento } =
         await this.terminosService.calculateVencimientoEtapa(etapaInicial);

       // Crear proceso con la relación del abogado
       const proceso = this.processRepository.create({
         radicadoProceso,
         newsId: createProcessDto.newsId,
         abogadoAsignado: abogado, // Establecer la relación directamente
         abogadoAsignadoId: abogado.id,
         etapaActual: etapaInicial, // Usar el nombre de la etapa configurada
         kanbanStage: initialKanbanStage.id, // El proceso inicia siempre en la columna Valoración del Kanban
         estado: ProcessStatus.ACTIVO,
         fechaPrescripcion,
         fechaVencimientoEtapa: fechaVencimiento,
         fechaInicioEtapa: new Date(),
         observaciones: createProcessDto.observaciones,
       });

      console.log('💾 Guardando proceso con abogado:', {
        abogadoId: abogado.id,
        abogadoNombre: abogado.nombreCompleto,
        abogadoCargo: abogado.cargo,
        etapaActual: etapaInicial,
        kanbanStage: initialKanbanStage.id
      });

      const procesoConcreado = await this.processRepository.save(proceso);

      // Cambiar estado de la noticia a ASIGNADA
      await this.newsService.updateStatus(
        createProcessDto.newsId,
        NewsStatus.ASIGNADA,
      );

      // Cargar la relación del abogado asignado para incluir el nombre en la respuesta
      const procesoConRelacion = await this.processRepository.findOne({
        where: { id: procesoConcreado.id },
        relations: ['abogadoAsignado', 'news'],
      });

      if (!procesoConRelacion) {
        throw new HttpException('Error al cargar el proceso creado', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const resultado = {
        ...procesoConRelacion,
        abogadoAsignadoNombre: procesoConRelacion.abogadoAsignado?.nombreCompleto || 'Sin asignar',
      };

      console.log('✅ Proceso creado con abogado:', {
        procesoId: resultado.id,
        radicado: resultado.radicadoProceso,
        abogadoAsignadoId: resultado.abogadoAsignadoId,
        abogadoAsignadoNombre: resultado.abogadoAsignadoNombre,
        abogadoAsignado: {
          id: resultado.abogadoAsignado?.id,
          nombreCompleto: resultado.abogadoAsignado?.nombreCompleto,
          cargo: resultado.abogadoAsignado?.cargo,
          email: resultado.abogadoAsignado?.email
        }
      });

      // Enviar notificación interna al profesional asignado
      try {
        const asunto = `Nuevo proceso asignado: ${resultado.radicadoProceso}`;
        const comentario = createProcessDto.observaciones?.trim();
        const mensaje = comentario
          ? `Se le ha asignado el proceso disciplinario ${resultado.radicadoProceso}.\n\nComentario: ${comentario}`
          : `Se le ha asignado el proceso disciplinario ${resultado.radicadoProceso}.`;

        await this.alertasService.crearNotificacionAuto(
          null,
          TipoAlerta.VISUAL,
          resultado.abogadoAsignadoNombre,
          asunto,
          mensaje,
          resultado.abogadoAsignadoId,
        );

        if (resultado.abogadoAsignadoId) {
          this.notificationClient.send({
            id_usuario_destinatario: resultado.abogadoAsignadoId,
            tipo_notificacion: 'PROCESO_ASIGNADO',
            titulo: 'Nuevo proceso disciplinario asignado',
            mensaje,
            descripcion_corta: `Proceso ${resultado.radicadoProceso} asignado`,
            icono: 'Briefcase',
            color: '#2563EB',
            prioridad: 'Alta',
            categoria: 'DISCIPLINARIO',
            tiene_accion: true,
            texto_boton_accion: 'Ver proceso',
            datos_adicionales: { procesoId: resultado.id, radicado: resultado.radicadoProceso },
          }).catch(() => {});
        }
      } catch (notifError) {
        console.error('Error creando notificación de asignación:', notifError);
        // No fallamos la transacción principal si falla la notificación
      }

      return resultado as any;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al crear proceso: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene todos los procesos (excluyendo los de noticias devueltas)
   */
  async findAll(): Promise<any[]> {
    try {
      const processes = await this.processRepository.find({
        relations: ['news', 'abogadoAsignado', 'evidence', 'autos'],
        where: {
          news: {
            estado: Not(In([NewsStatus.DEVUELTA, NewsStatus.ARCHIVADA]))
          }
        },
        order: {
          updatedAt: 'DESC' // Ordenar por fecha de actualización
        }
      });

      // Map to include professional name and calculate dynamic statistics
      const actuacionesResumen = await this.buildActuacionesResumen(
        processes.map((process) => process.id),
      );
      const tasksResumen = await this.buildTasksResumen(
        processes.map((process) => process.id),
      );
      const notesResumen = await this.buildNotesResumen(
        processes.map((process) => process.id),
      );

      return processes.map(p => {
        const actuaciones = actuacionesResumen.get(p.id);
        const tasks = tasksResumen.get(p.id);
        const notes = notesResumen.get(p.id);
        // Calcular estadísticas dinámicas
        const draftsCount = p.autos?.filter(auto => auto.estado === 'BORRADOR').length || 0;
        const documentsCount = p.evidence?.length || 0;

        // Calcular porcentaje de tiempo
        let timePercentage = 0;
        if (p.fechaVencimientoEtapa && p.createdAt) {
          const now = new Date();
          const created = new Date(p.createdAt);
          const deadline = new Date(p.fechaVencimientoEtapa);
          const totalTime = deadline.getTime() - created.getTime();
          const elapsedTime = now.getTime() - created.getTime();
          if (totalTime > 0) {
            timePercentage = Math.min(100, Math.max(0, (elapsedTime / totalTime) * 100));
          } else {
            timePercentage = 100;
          }
          console.log('Time percentage calculation', {
            procesoId: p.id,
            createdAt: created,
            deadline,
            now,
            totalTime,
            elapsedTime,
            timePercentage
          });
        }

        return {
          ...p,
          // ✅ Transformar campos planos a objeto anidado para el frontend
          procesoAsociado: p.procesoAsociadoId ? {
            id: p.procesoAsociadoId,
            numeroProceso: p.procesoAsociadoNumero || '',
            tipoAsociacion: p.procesoAsociadoTipo || 'similar',
            fechaAsociacion: p.procesoAsociadoFecha ? new Date(p.procesoAsociadoFecha).toISOString() : new Date().toISOString(),
            justificacion: p.procesoAsociadoJustificacion || ''
          } : undefined,
          abogadoAsignadoNombre: p.abogadoAsignado?.nombreCompleto || 'Sin asignar',
          // ✅ Incluir campos de proceso asociado (planos para compatibilidad)
          procesoAsociadoId: p.procesoAsociadoId,
          procesoAsociadoNumero: p.procesoAsociadoNumero,
          procesoAsociadoTipo: p.procesoAsociadoTipo,
          procesoAsociadoFecha: p.procesoAsociadoFecha,
          procesoAsociadoJustificacion: p.procesoAsociadoJustificacion,
          // ✅ Incluir campos de consolidación
          procesoConsolidadoPrincipal: p.procesoConsolidadoPrincipal,
          procesosConsolidados: p.procesosConsolidados,
          informacionConsolidada: p.informacionConsolidada,
          draftsCount,
          documentsCount,
          actuacionesCount: actuaciones?.actuacionesCount || 0,
          ultimaActuacion: actuaciones?.ultimaActuacion || null,
          ultimaActuacionFecha: actuaciones?.ultimaActuacionFecha || null,
          tasksCount: tasks?.tasksCount || 0,
          completedTasksCount: tasks?.completedTasksCount || 0,
          pendingTasksCount: tasks?.pendingTasksCount || 0,
          notesCount: notes?.notesCount || 0,
          timePercentage: Math.round(timePercentage * 100) / 100
        };
      });
    } catch (error) {
      console.error('Error en findAll:', error);
      throw new HttpException(
        `Error al obtener procesos: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene estadísticas para el dashboard
   */
  async getStats() {
    // Obtener todos los procesos activos
    const processes = await this.findAll();

    // Calcular días restantes para each proceso
    const now = new Date();
    const processesWithDays = processes.map(p => {
      const vencimiento = new Date(p.fechaVencimientoEtapa);
      const diffTime = vencimiento.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...p, diasRestantes: diffDays };
    });

    // Calcular estadísticas
    const proximosAVencer = processesWithDays.filter(p => p.diasRestantes <= 7 && p.diasRestantes > 0).length;
    const vencidos = processesWithDays.filter(p => p.diasRestantes < 0).length;

    // Obtener número de profesionales activos
    const profesionales = await this.professionalRepository.count({
      where: { estado: 'ACTIVO' }
    });

    return {
      procesosActivos: processes.length,
      proximosAVencer,
      vencidos,
      profesionales,
    };
  }

  /**
   * Obtiene un proceso por ID
   */
  async findById(id: string, includeAutos: boolean = false): Promise<any> {
    const relations = ['news', 'evidence', 'abogadoAsignado'];
    if (includeAutos) {
      relations.push('autos');
      relations.push('autos.versions');
    }

    const proceso = await this.processRepository.findOne({
      where: { id },
      relations,
      // Evitar que TypeORM genere alias incorrectos
      loadEagerRelations: true,
    });
    if (!proceso) {
      throw new HttpException('Proceso no encontrado', HttpStatus.NOT_FOUND);
    }

    const actuaciones = (await this.buildActuacionesResumen([proceso.id])).get(proceso.id);
    const tasks = (await this.buildTasksResumen([proceso.id])).get(proceso.id);
    const notes = (await this.buildNotesResumen([proceso.id])).get(proceso.id);

    // Calcular estadísticas dinámicas
    const draftsCount = proceso.autos?.filter(auto => auto.estado === 'BORRADOR').length || 0;
    const documentsCount = proceso.evidence?.length || 0;

    // Calcular porcentaje de tiempo
    let timePercentage = 0;
    if (proceso.fechaVencimientoEtapa && proceso.createdAt) {
      const now = new Date();
      const created = new Date(proceso.createdAt);
      const deadline = new Date(proceso.fechaVencimientoEtapa);
      const totalTime = deadline.getTime() - created.getTime();
      const elapsedTime = now.getTime() - created.getTime();
      if (totalTime > 0) {
        timePercentage = Math.min(100, Math.max(0, (elapsedTime / totalTime) * 100));
      } else {
        timePercentage = 100;
      }
    }

    return {
      ...proceso,
      // ✅ Transformar campos planos a objeto anidado para el frontend
      procesoAsociado: proceso.procesoAsociadoId ? {
        id: proceso.procesoAsociadoId,
        numeroProceso: proceso.procesoAsociadoNumero || '',
        tipoAsociacion: proceso.procesoAsociadoTipo || 'similar',
        fechaAsociacion: proceso.procesoAsociadoFecha ? new Date(proceso.procesoAsociadoFecha).toISOString() : new Date().toISOString(),
        justificacion: proceso.procesoAsociadoJustificacion || ''
      } : undefined,
      // ✅ Incluir campos de proceso asociado (planos para compatibilidad)
      procesoAsociadoId: proceso.procesoAsociadoId,
      procesoAsociadoNumero: proceso.procesoAsociadoNumero,
      procesoAsociadoTipo: proceso.procesoAsociadoTipo,
      procesoAsociadoFecha: proceso.procesoAsociadoFecha,
      procesoAsociadoJustificacion: proceso.procesoAsociadoJustificacion,
      // ✅ Incluir campos de consolidación
      procesoConsolidadoPrincipal: proceso.procesoConsolidadoPrincipal,
      procesosConsolidados: proceso.procesosConsolidados,
      informacionConsolidada: proceso.informacionConsolidada,
      draftsCount,
      documentsCount,
      actuacionesCount: actuaciones?.actuacionesCount || 0,
      ultimaActuacion: actuaciones?.ultimaActuacion || null,
      ultimaActuacionFecha: actuaciones?.ultimaActuacionFecha || null,
      tasksCount: tasks?.tasksCount || 0,
      completedTasksCount: tasks?.completedTasksCount || 0,
      pendingTasksCount: tasks?.pendingTasksCount || 0,
      notesCount: notes?.notesCount || 0,
      timePercentage: Math.round(timePercentage * 100) / 100
    };
  }

  /**
   * Obtiene procesos asignados a un abogado específico
   */
  async findByAbogadoId(abogadoId: string): Promise<any[]> {
    let processes = await this.processRepository.find({
      where: { abogadoAsignadoId: abogadoId },
      relations: ['news', 'evidence', 'autos'],
      order: { createdAt: 'DESC' },
    });

    
    

    if (processes.length == 0) {
      
      const profesional = await this.professionalRepository.findOne({where: {idUser: abogadoId}});

      console.log("profesional", profesional);
      console.log("abogadoId", profesional?.id);
      
      
      processes = await this.processRepository.find({
      where: { abogadoAsignadoId: profesional?.id },
      relations: ['news', 'evidence', 'autos'],
      order: { createdAt: 'DESC' },
    });
      console.log("processes", processes);
    }

    // Calcular estadísticas dinámicas para cada proceso
    const actuacionesResumen = await this.buildActuacionesResumen(
      processes.map((process) => process.id),
    );
    const tasksResumen = await this.buildTasksResumen(
      processes.map((process) => process.id),
    );
    const notesResumen = await this.buildNotesResumen(
      processes.map((process) => process.id),
    );

    return processes.map(p => {
      const actuaciones = actuacionesResumen.get(p.id);
      const tasks = tasksResumen.get(p.id);
      const notes = notesResumen.get(p.id);
      const draftsCount = p.autos?.filter(auto => auto.estado === 'BORRADOR').length || 0;
      const documentsCount = p.evidence?.length || 0;

      let timePercentage = 0;
      if (p.fechaVencimientoEtapa && p.createdAt) {
        const now = new Date();
        const created = new Date(p.createdAt);
        const deadline = new Date(p.fechaVencimientoEtapa);
        const totalTime = deadline.getTime() - created.getTime();
        const elapsedTime = now.getTime() - created.getTime();
        if (totalTime > 0) {
          timePercentage = Math.min(100, Math.max(0, (elapsedTime / totalTime) * 100));
        } else {
          timePercentage = 100;
        }
      }

      return {
        ...p,
        // ✅ Transformar campos planos a objeto anidado para el frontend
        procesoAsociado: p.procesoAsociadoId ? {
          id: p.procesoAsociadoId,
          numeroProceso: p.procesoAsociadoNumero || '',
          tipoAsociacion: p.procesoAsociadoTipo || 'similar',
          fechaAsociacion: p.procesoAsociadoFecha ? new Date(p.procesoAsociadoFecha).toISOString() : new Date().toISOString(),
          justificacion: p.procesoAsociadoJustificacion || ''
        } : undefined,
        // ✅ Incluir campos de proceso asociado (planos para compatibilidad)
        procesoAsociadoId: p.procesoAsociadoId,
        procesoAsociadoNumero: p.procesoAsociadoNumero,
        procesoAsociadoTipo: p.procesoAsociadoTipo,
        procesoAsociadoFecha: p.procesoAsociadoFecha,
        procesoAsociadoJustificacion: p.procesoAsociadoJustificacion,
        // ✅ Incluir campos de consolidación
        procesoConsolidadoPrincipal: p.procesoConsolidadoPrincipal,
        procesosConsolidados: p.procesosConsolidados,
        informacionConsolidada: p.informacionConsolidada,
        draftsCount,
        documentsCount,
        actuacionesCount: actuaciones?.actuacionesCount || 0,
        ultimaActuacion: actuaciones?.ultimaActuacion || null,
        ultimaActuacionFecha: actuaciones?.ultimaActuacionFecha || null,
        tasksCount: tasks?.tasksCount || 0,
        completedTasksCount: tasks?.completedTasksCount || 0,
        pendingTasksCount: tasks?.pendingTasksCount || 0,
        notesCount: notes?.notesCount || 0,
        timePercentage: Math.round(timePercentage * 100) / 100
      };
    });
  }

  /**
   * Cambia la etapa del proceso (US-009)
   */
  async changeStage(
    id: string,
    stageId: string,
    kanbanNotice?: string
  ): Promise<DisciplinaryProcess> {
    try {
      const proceso = await this.findById(id, false);

      if (proceso.estado === ProcessStatus.CERRADO) {
        throw new HttpException(
          'No se puede cambiar la etapa de un proceso CERRADO',
          HttpStatus.FORBIDDEN,
        );
      }

      // Get the new stage configuration
      const newStageConfig = await this.stageConfigurationRepository.findOne({
        where: { id: stageId, activo: true },
      });
      if (!newStageConfig) {
        throw new HttpException(
          `Stage configuration with id ${stageId} not found`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Get current stage configuration to get its orden
      const currentStageConfig = await this.stageConfigurationRepository.findOne({
        where: { etapa: proceso.etapaActual, activo: true },
      });
      if (!currentStageConfig) {
        throw new HttpException(
          `Current stage configuration for ${proceso.etapaActual} not found`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (kanbanNotice !== undefined) {
        proceso.kanbanNotice = kanbanNotice || null;
      }

      if (proceso.etapaActual !== newStageConfig.etapa) {
        // Validar transicion de etapa using orden
        this.validarTransicionEtapa(currentStageConfig.orden, newStageConfig.orden);

        // Calcular nuevo vencimiento
        const { fechaVencimiento } =
          await this.terminosService.calculateVencimientoEtapa(newStageConfig.etapa);

        console.log('Changing stage for process', id, 'from', proceso.etapaActual, 'to', newStageConfig.etapa, 'new deadline', fechaVencimiento);

        proceso.etapaActual = newStageConfig.etapa; // Set the stage name
        proceso.kanbanStage = newStageConfig.id; // Set the stage ID
        proceso.fechaVencimientoEtapa = fechaVencimiento;
      }

      return await this.processRepository.save(proceso);
    } catch (error) {
      console.error('Error in changeStage:', error);
      throw error;
    }
  }

  /**
   * Cambia la etapa del proceso por aprobación de auto de apertura (sin validación de transición)
   */
  async changeStageByAutoApertura(
    id: string,
    nuevaEtapa: ProcessStage,
    fechaAprobacion: Date,
  ): Promise<{ proceso: DisciplinaryProcess; tiempoAcumuladoDias: number | null }> {
    const proceso = await this.findById(id, false);

    let tiempoAcumuladoDias: number | null = null;
    const fechaInicioReferencia =
      proceso.fechaInicioEtapa || proceso.createdAt || null;

    if (fechaInicioReferencia) {
      tiempoAcumuladoDias = await this.terminosService.contarDiasHabiles(
        fechaInicioReferencia,
        fechaAprobacion,
      );
    }

    const newStageConfig = await this.stageConfigurationRepository.findOne({
      where: { etapa: nuevaEtapa, activo: true },
    });

    const { fechaVencimiento } =
      await this.terminosService.calculateVencimientoEtapa(nuevaEtapa);

    proceso.etapaActual = nuevaEtapa;
    proceso.fechaInicioEtapa = fechaAprobacion;
    proceso.fechaVencimientoEtapa = fechaVencimiento;
    if (newStageConfig) {
      proceso.kanbanStage = newStageConfig.id;
    }

    const procesoGuardado = await this.processRepository.save(proceso);
    return { proceso: procesoGuardado, tiempoAcumuladoDias };
  }

  /**
   * Actualiza datos generales del proceso (abogado, hechos, disciplinable)
   */
  async update(id: string, updateDto: UpdateDisciplinaryProcessDto): Promise<DisciplinaryProcess> {
    const proceso = await this.findById(id, false);

    if (proceso.estado === ProcessStatus.CERRADO) {
      throw new HttpException(
        'No se puede modificar un proceso que está CERRADO (trasladado a jurídica)',
        HttpStatus.FORBIDDEN,
      );
    }

    let updated = false;

    // 1. Actualizar abogado asignado si se proporciona
    if (updateDto.abogadoId && updateDto.abogadoId !== proceso.abogadoAsignadoId) {
      const abogado = await this.professionalRepository.findOne({
        where: { id: updateDto.abogadoId }
      });

      if (!abogado) {
        throw new HttpException('Abogado no encontrado', HttpStatus.NOT_FOUND);
      }

      proceso.abogadoAsignado = abogado;
      proceso.abogadoAsignadoId = abogado.id;
      updated = true;
    }

    // 2. Actualizar datos de la noticia (hechos, disciplinable) si se proporcionan
    if (updateDto.hechos || updateDto.disciplinable) {
      const newsUpdate: any = {};

      if (updateDto.hechos) newsUpdate.hechos = updateDto.hechos;

      if (updateDto.disciplinable) {
        // Merge con datos existentes del disciplinable (es un array)
        const disciplinableExistente = (proceso.news.disciplinable as any) || [];
        const disciplinableActualizado = (Array.isArray(disciplinableExistente) && disciplinableExistente.length > 0)
          ? [{ ...disciplinableExistente[0], ...updateDto.disciplinable }]
          : [updateDto.disciplinable];
        newsUpdate.disciplinable = disciplinableActualizado;
      }

      // Actualizar noticia relacionada
      await this.newsRepository.update(proceso.newsId, newsUpdate);

      // Refrescar objeto news en proceso
      const news = await this.newsRepository.findOne({ where: { id: proceso.newsId } });
      if (news) {
        proceso.news = news;
      }
    }

    if (updated) {
      return await this.processRepository.save(proceso);
    }

    return proceso;
  }

  /**
   * Cambia la etapa del proceso (Legacy)
   */
  async updateStage(
    id: string,
    updateStageDto: UpdateProcessStageDto,
  ): Promise<DisciplinaryProcess> {
    return this.changeStage(id, updateStageDto.nuevaEtapaId);
  }

  /**
   * Cambiar estado del proceso (suspender, archivar, etc.)
   */
  async updateStatus(
    id: string,
    nuevoEstado: ProcessStatus,
  ): Promise<DisciplinaryProcess> {
    const proceso = await this.findById(id, false);
    proceso.estado = nuevoEstado;
    return await this.processRepository.save(proceso);
  }

  /**
   * Cierra el proceso por aprobación de Auto Pliego de Cargos.
   * Retorna datos consolidados para el correo a jurídica.
   */
  async cerrarPorPliegoCargos(
    id: string,
    aprobadoPorId: string,
    enviadoPorEmailParam?: string,
    enviadoPorNombreParam?: string,
  ): Promise<{
    radicado: string;
    etapaAlCierre: string;
    profesionalResponsable: string;
    fechaCreacion: string;
    fechaCierre: string;
    fechaVencimiento: string;
    disciplinable: any;
    hechos: string;
    autosGenerados: number;
    historialEtapas: string;
    enviadoPorNombre: string;
    profesionalEmail?: string;
    enviadoPorEmail?: string;
  }> {
    const proceso = await this.processRepository.findOne({
      where: { id },
      relations: ['news', 'abogadoAsignado', 'autos'],
    });

    if (!proceso) {
      throw new HttpException('Proceso no encontrado', HttpStatus.NOT_FOUND);
    }

    if (proceso.estado !== ProcessStatus.ACTIVO) {
      throw new HttpException(
        'Solo se puede cerrar un proceso que esté ACTIVO',
        HttpStatus.BAD_REQUEST,
      );
    }

    const fechaCierre = new Date();
    const etapaAlCierre = proceso.etapaActual;

    // Calcular tiempo acumulado
    let tiempoAcumuladoDias: number | null = null;
    if (proceso.fechaInicioEtapa) {
      tiempoAcumuladoDias = await this.terminosService.contarDiasHabiles(
        proceso.fechaInicioEtapa,
        fechaCierre,
      );
    }

    // Actualizar estado del proceso
    proceso.estado = ProcessStatus.CERRADO;
    proceso.fechaCierre = fechaCierre;
    proceso.etapaAlCierre = etapaAlCierre;
    proceso.cerradoPorId = aprobadoPorId;

    await this.processRepository.save(proceso);

    // Preparar datos consolidados para el correo
    const disciplinable = proceso.news?.disciplinable;
    const hechos = proceso.news?.hechos || '';
    const profesionalResponsable = proceso.abogadoAsignado?.nombreCompleto || 'Sin asignar';
    const profesionalEmail = proceso.abogadoAsignado?.email || undefined;

    // Preferir los datos pasados desde el frontend (email real del usuario logueado)
    let enviadoPorNombre = enviadoPorNombreParam || 'Jefe de Control Disciplinario';
    let enviadoPorEmail: string | undefined = enviadoPorEmailParam || undefined;

    // Si no se pasó email por parámetro, intentar resolver desde la tabla de profesionales
    if (!enviadoPorEmail && aprobadoPorId) {
      try {
        const jefe = await this.professionalRepository.findOne({ where: { id: aprobadoPorId } });
        if (jefe) {
          enviadoPorNombre = jefe.nombreCompleto || enviadoPorNombre;
          enviadoPorEmail = jefe.email || undefined;
        }
      } catch {
        // usar valores por defecto
      }
    }

    // Si aún no hay nombre pero se pasó uno, usarlo
    if (enviadoPorNombreParam) {
      enviadoPorNombre = enviadoPorNombreParam;
    }

    return {
      radicado: proceso.radicadoProceso,
      etapaAlCierre,
      profesionalResponsable,
      fechaCreacion: proceso.createdAt?.toISOString() || '',
      fechaCierre: fechaCierre.toISOString(),
      fechaVencimiento: proceso.fechaVencimientoEtapa?.toISOString() || '',
      disciplinable: Array.isArray(disciplinable) ? disciplinable[0] : disciplinable,
      hechos,
      autosGenerados: proceso.autos?.length || 0,
      historialEtapas: `Etapa al cierre: ${etapaAlCierre}. Tiempo acumulado: ${tiempoAcumuladoDias ?? 'N/A'} día(s) hábil(es).`,
      enviadoPorNombre,
      profesionalEmail,
      enviadoPorEmail,
    };
  }

  /**
   * Marca que el correo a jurídica fue enviado exitosamente.
   */
  async marcarCorreoJuridicaEnviado(processId: string): Promise<void> {
    await this.processRepository.update(processId, {
      correoJuridicaEnviado: true,
      correoJuridicaFechaEnvio: new Date(),
    });
  }

  /**
   * Obtener proceso por radicado del proceso
   */
  async findByRadicado(radicadoProceso: string): Promise<DisciplinaryProcess> {
    const proceso = await this.processRepository.findOne({
      where: { radicadoProceso },
      relations: ['news', 'abogadoAsignado'],
    });

    if (!proceso) {
      throw new HttpException(
        `Proceso con radicado ${radicadoProceso} no encontrado`,
        HttpStatus.NOT_FOUND,
      );
    }

    const actuaciones = (await this.buildActuacionesResumen([proceso.id])).get(proceso.id);
    const tasks = (await this.buildTasksResumen([proceso.id])).get(proceso.id);
    const notes = (await this.buildNotesResumen([proceso.id])).get(proceso.id);

    return {
      ...proceso,
      abogadoAsignadoNombre: proceso.abogadoAsignado?.nombreCompleto || 'Sin asignar',
      actuacionesCount: actuaciones?.actuacionesCount || 0,
      ultimaActuacion: actuaciones?.ultimaActuacion || null,
      ultimaActuacionFecha: actuaciones?.ultimaActuacionFecha || null,
      tasksCount: tasks?.tasksCount || 0,
      completedTasksCount: tasks?.completedTasksCount || 0,
      pendingTasksCount: tasks?.pendingTasksCount || 0,
      notesCount: notes?.notesCount || 0,
    } as any;
  }

  /**
   * Agregar evidencia al proceso
   */
  async addEvidence(
    id: string,
    url: string,
    originalName: string,
    descripcion?: string,
    fileType?: string,
    fileSize?: number,
    nombreDocumento?: string,
    tipoDocumento?: string,
    etapa?: string,
    usuarioCarga?: string,
    categoria?: string,
    destinatario?: string,
    asunto?: string,
    participantes?: number,
  ): Promise<DisciplinaryProcess> {
    try {

      const proceso = await this.findById(id, false); // No cargar autos para evitar errores

      if (proceso.estado === ProcessStatus.CERRADO) {
        throw new HttpException(
          'No se puede agregar evidencia a un proceso CERRADO',
          HttpStatus.FORBIDDEN,
        );
      }

      // Determinar tipo de archivo desde la extensión si no se proporciona
      const extension = originalName.split('.').pop()?.toLowerCase() || '';
      const finalFileType = fileType || extension;

      // Preparar datos para la evidencia
      // Mapear tipoDocumento a tipo para la columna NOT NULL
      const tipoMapeado = tipoDocumento || 'DOCUMENTO';

      // La URL es la ruta relativa que retorna el storageService
      // archivoUrl debe ser la misma ruta (o ruta completa si se necesita)
      const archivoUrl = url; // Usar la misma ruta que url para archivoUrl
      const nombreArchivoFinal = nombreDocumento || originalName;

      const evidenceData = {
        url,
        archivoUrl, // Campo requerido NOT NULL - ruta del archivo guardado
        nombreArchivo: nombreArchivoFinal, // Campo requerido NOT NULL - nombre del archivo
        process: proceso,
        processId: proceso.id,
        description: descripcion || 'Documento cargado desde el portal',
        filename: originalName,
        fileType: finalFileType,
        fileSize: fileSize || 0,
        nombreDocumento: nombreArchivoFinal,
        tipoDocumento: tipoMapeado,
        tipo: tipoMapeado, // Campo requerido NOT NULL
        categoria: categoria || null,
        destinatario: destinatario || null,
        asunto: asunto || null,
        participantes: participantes ?? null,
        etapa: etapa || undefined,
        usuarioCarga: usuarioCarga || 'Sistema',
      };


      // Crear entidad de evidencia con toda la información
      const evidence = this.evidenceRepository.create(evidenceData);

      const evidenceGuardada = await this.evidenceRepository.save(evidence);

      // Mantener compatibilidad con campo legacy
      if (!proceso.pruebas) {
        proceso.pruebas = [];
      }
      proceso.pruebas.push(url);

      await this.processRepository.update(id, { pruebas: proceso.pruebas });

      return proceso;
    } catch (error) {
      console.error('❌ ERROR en addEvidence:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Obtener evidencias de un proceso
   */
  async getEvidenceByProcessId(processId: string): Promise<any[]> {
    const evidencias = await this.evidenceRepository.find({
      where: { processId },
      order: { createdAt: 'DESC' },
    });

    return evidencias;
  }

  /**
   * Elimina una evidencia de un proceso
   */
  async deleteEvidence(processId: string, evidenceId: string): Promise<Evidence> {
    const evidencia = await this.evidenceRepository.findOne({
      where: { id: evidenceId, processId },
    });

    if (!evidencia) {
      throw new HttpException('Evidencia no encontrada', HttpStatus.NOT_FOUND);
    }

    const proceso = await this.findById(processId, false);
    if (proceso.pruebas?.length) {
      const pruebasActualizadas = proceso.pruebas.filter((url) => url !== evidencia.url);
      await this.processRepository.update(processId, { pruebas: pruebasActualizadas });
    }

    await this.evidenceRepository.delete(evidenceId);
    return evidencia;
  }

  /**
   * Valida las transiciones permitidas entre etapas usando el orden configurado
   * Flujo ESPECÍFICO basado en orden numérico:
   * - Orden 1 (RECEPCION) → Orden 3 (INDAGACION_PREVIA) / Orden 4 (INVESTIGACION)
   * - Orden 2 (VALORACION) → Orden 3 (INDAGACION_PREVIA) / Orden 4 (INVESTIGACION)
   * - Orden 3-4 (INDAGACION_PREVIA/INVESTIGACION) → Orden 5 (EVALUACION) / Orden 6 (JUZGAMIENTO) / Orden 8 (FALLO)
   * - Orden 5 (EVALUACION) → Orden 6 (JUZGAMIENTO) / Orden 8 (FALLO)
   * - Orden 6 (JUZGAMIENTO) → Orden 7 (INDAGACION)
   * - Orden 7 (INDAGACION) → Orden 8 (FALLO)
   * - Orden 8 (FALLO) → Orden 9 (SEGUNDA_INSTANCIA)
   * - Orden 9 (SEGUNDA_INSTANCIA) → etapa final (no permite transiciones)
   *
   * NOTA: Se permiten movimientos hacia ATRÁS (a etapas anteriores) para dar flexibilidad.
   * Los movimientos hacia adelante deben seguir el flujo específico definido.
   */
  private validarTransicionEtapa(ordenActual: number, ordenNueva: number): void {
    console.log('Validating transition from orden', ordenActual, 'to orden', ordenNueva);

    // No puede pasar a la misma etapa
    if (ordenActual === ordenNueva) {
      throw new HttpException(
        `No se puede pasar de la etapa con orden ${ordenActual} a la misma etapa`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // SEGUNDA_INSTANCIA (orden 9) es etapa final, no puede salir de aquí
    if (ordenActual === 9) {
      throw new HttpException(
        'No se puede cambiar la etapa desde Segunda Instancia',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Movimiento hacia ATRÁS: siempre permitido
    if (ordenNueva < ordenActual) {
      console.log(`Movimiento hacia atrás permitido: de orden ${ordenActual} a orden ${ordenNueva}`);
      return; // Permitir sin validación adicional
    }

    // Movimiento hacia ADELANTE: seguir el flujo ESPECÍFICO
    if (ordenActual === 1) { // RECEPCION
      // RECEPCION → INDAGACION_PREVIA (3) / INVESTIGACION (4)
      if (ordenNueva !== 3 && ordenNueva !== 4) {
        throw new HttpException(
          `Desde RECEPCION (orden 1) solo puede ir a INDAGACION_PREVIA (orden 3) o INVESTIGACION (orden 4). Intento: orden ${ordenActual} → orden ${ordenNueva}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    else if (ordenActual === 2) { // VALORACION
      // VALORACION → INDAGACION_PREVIA (3) / INVESTIGACION (4)
      if (ordenNueva !== 3 && ordenNueva !== 4) {
        throw new HttpException(
          `Desde VALORACION (orden 2) solo puede ir a INDAGACION_PREVIA (orden 3) o INVESTIGACION (orden 4). Intento: orden ${ordenActual} → orden ${ordenNueva}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    else if (ordenActual === 3 || ordenActual === 4) { // INDAGACION_PREVIA / INVESTIGACION
      // INDAGACION_PREVIA / INVESTIGACION → EVALUACION (5) / JUZGAMIENTO (6) / FALLO (8)
      // También permite cambiar entre INDAGACION_PREVIA e INVESTIGACION (orden 3 y 4)
      const esCambioMismoNivel = (ordenActual === 3 && ordenNueva === 4) ||
        (ordenActual === 4 && ordenNueva === 3);

      if (!esCambioMismoNivel &&
        ordenNueva !== 5 &&
        ordenNueva !== 6 &&
        ordenNueva !== 8) {
        throw new HttpException(
          `Desde INDAGACION_PREVIA o INVESTIGACION (orden 3-4) solo puede ir a EVALUACION (5), JUZGAMIENTO (6), FALLO (8) o cambiar entre INDAGACION_PREVIA/INVESTIGACION. Intento: orden ${ordenActual} → orden ${ordenNueva}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    else if (ordenActual === 5) { // EVALUACION
      // EVALUACION → JUZGAMIENTO (6) / FALLO (8)
      if (ordenNueva !== 6 && ordenNueva !== 8) {
        throw new HttpException(
          `Desde EVALUACION (orden 5) solo puede ir a JUZGAMIENTO (6) o FALLO (8). Intento: orden ${ordenActual} → orden ${ordenNueva}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    else if (ordenActual === 6) { // JUZGAMIENTO
      // JUZGAMIENTO → INDAGACION (7)
      if (ordenNueva !== 7) {
        throw new HttpException(
          `Desde JUZGAMIENTO (orden 6) solo puede ir a INDAGACION (7). Intento: orden ${ordenActual} → orden ${ordenNueva}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    else if (ordenActual === 7) { // INDAGACION
      // INDAGACION → FALLO (8)
      if (ordenNueva !== 8) {
        throw new HttpException(
          `Desde INDAGACION (orden 7) solo puede ir a FALLO (8). Intento: orden ${ordenActual} → orden ${ordenNueva}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    else if (ordenActual === 8) { // FALLO
      // FALLO → SEGUNDA_INSTANCIA (9)
      if (ordenNueva !== 9) {
        throw new HttpException(
          `Desde FALLO (orden 8) solo puede ir a SEGUNDA_INSTANCIA (9). Intento: orden ${ordenActual} → orden ${ordenNueva}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  /**
   * Obtiene las estadísticas de un proceso específico (calculadas dinámicamente)
   */
  async getProcessStatistics(processId: string): Promise<{
    draftsCount: number;
    documentsCount: number;
    timePercentage: number;
  }> {
    const proceso = await this.processRepository.findOne({
      where: { id: processId },
      relations: ['evidence', 'autos'],
    });

    if (!proceso) {
      throw new HttpException('Proceso no encontrado', HttpStatus.NOT_FOUND);
    }

    // Calcular estadísticas dinámicamente
    const draftsCount = proceso.autos?.filter(auto => auto.estado === 'BORRADOR').length || 0;
    const documentsCount = proceso.evidence?.length || 0;

    let timePercentage = 0;
    if (proceso.fechaVencimientoEtapa && proceso.createdAt) {
      const now = new Date();
      const created = new Date(proceso.createdAt);
      const deadline = new Date(proceso.fechaVencimientoEtapa);
      const totalTime = deadline.getTime() - created.getTime();
      const elapsedTime = now.getTime() - created.getTime();
      if (totalTime > 0) {
        timePercentage = Math.min(100, Math.max(0, (elapsedTime / totalTime) * 100));
      } else {
        timePercentage = 100;
      }
    }

    return {
      draftsCount,
      documentsCount,
      timePercentage: Math.round(timePercentage * 100) / 100,
    };
  }

  /**
   * Elimina un proceso por ID y revierte el estado de la noticia a RADICADA
   */
  async delete(id: string): Promise<void> {
    // 1. Obtener proceso con noticia
    const proceso = await this.findById(id, false);

    // 2. Si la noticia está ASIGNADA, cambiarla a RADICADA
    if (proceso.news && proceso.news.estado === NewsStatus.ASIGNADA) {
      await this.newsService.updateStatus(proceso.newsId, NewsStatus.RADICADA);
    }

    // 3. Eliminar proceso (cascade eliminará evidencias y autos)
    const result = await this.processRepository.delete(id);
    if (result.affected === 0) {
      throw new HttpException('Proceso no encontrado', HttpStatus.NOT_FOUND);
    }
  }

  /**
   * ✅ NUEVO: Asocia un proceso a otro proceso disciplinario
   * Para consolidación: toma la información del proceso más antiguo (con más tiempo)
   */
  async associateProcess(
    procesoOrigenId: string,
    procesoDestinoId: string,
    tipoAsociacion: 'conexo' | 'similar' | 'consolidado',
    justificacion: string,
  ): Promise<DisciplinaryProcess> {
    // Validar que el proceso origen existe
    const procesoOrigen = await this.processRepository.findOne({
      where: { id: procesoOrigenId },
      relations: ['news'],
    });

    if (!procesoOrigen) {
      throw new HttpException('Proceso origen no encontrado', HttpStatus.NOT_FOUND);
    }

    // Validar que el proceso destino existe
    const procesoDestino = await this.processRepository.findOne({
      where: { id: procesoDestinoId },
      relations: ['news'],
    });

    if (!procesoDestino) {
      throw new HttpException('Proceso destino no encontrado', HttpStatus.NOT_FOUND);
    }

    // Validar que no se intente asociar a sí mismo
    if (procesoOrigenId === procesoDestinoId) {
      throw new HttpException(
        'Un proceso no puede asociarse a sí mismo',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Determinar el proceso principal (el más antiguo) para consolidación
    let procesoPrincipal = procesoOrigen;
    let procesoSecundario = procesoDestino;

    // Comparar por fecha de creación para determinar el más antiguo
    const fechaOrigen = new Date(procesoOrigen.createdAt).getTime();
    const fechaDestino = new Date(procesoDestino.createdAt).getTime();

    // El proceso principal es el más antiguo (menor fecha)
    if (fechaOrigen > fechaDestino) {
      procesoPrincipal = procesoDestino;
      procesoSecundario = procesoOrigen;
    }

    console.log('🔗 [Consolidación] Proceso principal (más antiguo):', {
      principalId: procesoPrincipal.id,
      principalRadicado: procesoPrincipal.radicadoProceso,
      principalFecha: procesoPrincipal.createdAt,
      secundarioId: procesoSecundario.id,
      secundarioRadicado: procesoSecundario.radicadoProceso,
      secundarioFecha: procesoSecundario.createdAt,
    });


    // Si es consolidación, realizar la unificación de información
    if (tipoAsociacion === 'consolidado') {
      // Consolidar información del proceso principal (el más antiguo)
      // Guardar información relevante para trazabilidad
      procesoOrigen.procesoConsolidadoPrincipal = procesoPrincipal.id;
      procesoOrigen.procesosConsolidados = [
        procesoPrincipal.radicadoProceso,
        procesoSecundario.radicadoProceso,
      ];
      procesoOrigen.informacionConsolidada = {
        radicado: procesoPrincipal.radicadoProceso,
        fechaInicio: procesoPrincipal.createdAt.toISOString(),
        hechos: procesoPrincipal.news?.hechos || '',
        disciplinable: procesoPrincipal.news?.disciplinable || null,
      };

      // También actualizar el proceso destino como consolidado
      procesoDestino.procesoConsolidadoPrincipal = procesoPrincipal.id;
      procesoDestino.procesosConsolidados = [
        procesoPrincipal.radicadoProceso,
        procesoSecundario.radicadoProceso,
      ];
      procesoDestino.informacionConsolidada = {
        radicado: procesoPrincipal.radicadoProceso,
        fechaInicio: procesoPrincipal.createdAt.toISOString(),
        hechos: procesoPrincipal.news?.hechos || '',
        disciplinable: procesoPrincipal.news?.disciplinable || null,
      };

      // Guardar el proceso destino consolidado primero
      await this.processRepository.save(procesoDestino);
    }

    // Actualizar el proceso origen con la información del proceso asociado
    procesoOrigen.procesoAsociadoId = procesoDestinoId;
    procesoOrigen.procesoAsociadoNumero = procesoDestino.radicadoProceso;
    procesoOrigen.procesoAsociadoTipo = tipoAsociacion;
    procesoOrigen.procesoAsociadoFecha = new Date();
    procesoOrigen.procesoAsociadoJustificacion = justificacion;

    console.log('✅ Asociando proceso:', {
      procesoOrigenId,
      procesoDestinoId,
      radicadoDestino: procesoDestino.radicadoProceso,
      tipoAsociacion,
      justificacion,
    });

    // Guardar el proceso origen
    const procesoOrigenActualizado = await this.processRepository.save(procesoOrigen);

    // Si es consolidación, también actualizar el proceso destino
    if (tipoAsociacion === 'consolidado') {
      procesoDestino.procesoAsociadoId = procesoOrigenId;
      procesoDestino.procesoAsociadoNumero = procesoOrigen.radicadoProceso;
      procesoDestino.procesoAsociadoTipo = tipoAsociacion;
      procesoDestino.procesoAsociadoFecha = new Date();
      procesoDestino.procesoAsociadoJustificacion = justificacion;

      await this.processRepository.save(procesoDestino);
    }

    const profesionalesANotificar: Array<{ id: string; radicado: string }> = [];
    if (procesoOrigen.abogadoAsignadoId) {
      profesionalesANotificar.push({ id: procesoOrigen.abogadoAsignadoId, radicado: procesoOrigen.radicadoProceso });
    }
    if (procesoDestino.abogadoAsignadoId && procesoDestino.abogadoAsignadoId !== procesoOrigen.abogadoAsignadoId) {
      profesionalesANotificar.push({ id: procesoDestino.abogadoAsignadoId, radicado: procesoDestino.radicadoProceso });
    }

    for (const prof of profesionalesANotificar) {
      this.notificationClient.send({
        id_usuario_destinatario: prof.id,
        tipo_notificacion: 'PROCESOS_ASOCIADOS',
        titulo: 'Procesos disciplinarios asociados',
        mensaje: `El proceso ${procesoOrigen.radicadoProceso} ha sido asociado con el proceso ${procesoDestino.radicadoProceso} (tipo: ${tipoAsociacion}). Justificación: ${justificacion}`,
        descripcion_corta: `Proceso ${procesoOrigen.radicadoProceso} asociado con ${procesoDestino.radicadoProceso}`,
        icono: 'GitMerge',
        color: '#0891B2',
        prioridad: 'Media',
        categoria: 'DISCIPLINARIO',
        tiene_accion: true,
        texto_boton_accion: 'Ver proceso',
        datos_adicionales: { procesoOrigenId, procesoDestinoId, tipoAsociacion },
      }).catch(() => {});
    }

    return procesoOrigenActualizado;
  }

  /**
   * Restaura un proceso archivado al flujo activo
   */
  async restore(id: string): Promise<DisciplinaryProcess> {
    const proceso = await this.processRepository.findOne({
      where: { id },
      relations: ['news'],
    });

    if (!proceso) {
      throw new HttpException(
        `Proceso con ID ${id} no encontrado. No se puede restaurar un proceso que no existe. Verifique que el ID sea correcto y que el proceso haya sido creado previamente.`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Verificar que el proceso esté archivado
    if (proceso.estado !== ProcessStatus.ARCHIVADO) {
      throw new HttpException(
        `El proceso ${proceso.radicadoProceso} no está archivado (estado actual: ${proceso.estado}). Solo los procesos archivados pueden ser restaurados.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Cambiar estado a ACTIVO y marcar como restaurado
    proceso.estado = ProcessStatus.ACTIVO;
    proceso.restaurado = true;

    // Nota: El historial de auditoría se maneja en el frontend o podría agregarse como campo JSON en el futuro
    console.log(`Proceso ${proceso.radicadoProceso} restaurado al flujo activo desde estado archivado`);

    return await this.processRepository.save(proceso);
  }
}

