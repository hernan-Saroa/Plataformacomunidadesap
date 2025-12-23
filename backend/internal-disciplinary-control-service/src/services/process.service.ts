import {
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import {
  DisciplinaryProcess,
  ProcessStage,
  ProcessStatus,
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
    private sequenceService: SequenceService,
    private terminosService: TerminosCalculatorService,
    private newsService: NewsService,
  ) { }

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

      // Validar que la noticia esté en estado RADICADA
      if (noticia.estado !== NewsStatus.RADICADA) {
        throw new HttpException(
          'La noticia debe estar en estado RADICADA para asignar proceso',
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

        abogado = this.professionalRepository.create({
          id: createProcessDto.abogadoId, // Usar el mismo ID del candidato
          nombreCompleto: createProcessDto.abogadoNombre || 'Profesional Asignado',
          email: `${createProcessDto.abogadoNombre?.toLowerCase().replace(/\s+/g, '.')}@esap.edu.co`,
          cargo: 'Profesional Universitario',
          estado: 'ACTIVO',
          capacidadMaxima: 10,
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

      // Calcular fecha de prescripción (15 años desde los hechos)
      const fechaPrescripcion =
        this.terminosService.calculateFechaPrescripcion(noticia.fechaRecepcion);

      // Determinar etapa inicial basada en la columna kanban de la noticia
      let etapaInicial = ProcessStage.EVALUACION; // Default
      if (noticia.kanbanStage) {
        // Mapear kanbanStage a ProcessStage
        switch (noticia.kanbanStage.toUpperCase()) {
          case 'EVALUACION':
          case 'EVALUACIÓN':
            etapaInicial = ProcessStage.EVALUACION;
            break;
          case 'INDAGACION':
          case 'INDAGACION_PREVIA':
          case 'INDAGACIÓN':
          case 'INDAGACIÓN_PREVIA':
            etapaInicial = ProcessStage.INDAGACION_PREVIA;
            break;
          case 'INVESTIGACION':
          case 'INVESTIGACIÓN':
            etapaInicial = ProcessStage.INVESTIGACION;
            break;
          case 'JUZGAMIENTO':
            etapaInicial = ProcessStage.JUZGAMIENTO;
            break;
          case 'FALLO':
            etapaInicial = ProcessStage.FALLO;
            break;
          default:
            etapaInicial = ProcessStage.EVALUACION;
        }
      }

      // Calcular fecha de vencimiento de la etapa inicial
      const { fechaVencimiento } =
        await this.terminosService.calculateVencimientoEtapa(etapaInicial);

      // Crear proceso con la relación del abogado
      const proceso = this.processRepository.create({
        radicadoProceso,
        newsId: createProcessDto.newsId,
        abogadoAsignado: abogado, // Establecer la relación directamente
        abogadoAsignadoId: abogado.id,
        etapaActual: etapaInicial,
        kanbanStage: noticia.kanbanStage, // ✅ Mantener la misma columna kanban de la noticia
        estado: ProcessStatus.ACTIVO,
        fechaPrescripcion,
        fechaVencimientoEtapa: fechaVencimiento,
        observaciones: createProcessDto.observaciones,
      });

      console.log('💾 Guardando proceso con abogado:', {
        abogadoId: abogado.id,
        abogadoNombre: abogado.nombreCompleto,
        abogadoCargo: abogado.cargo,
        etapaActual: etapaInicial,
        kanbanStage: noticia.kanbanStage
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
      return processes.map(p => {
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
          abogadoAsignadoNombre: p.abogadoAsignado?.nombreCompleto || 'Sin asignar',
          draftsCount,
          documentsCount,
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
    const relations = ['news', 'evidence', 'autos', 'abogadoAsignado'];

    const proceso = await this.processRepository.findOne({
      where: { id },
      relations,
    });
    if (!proceso) {
      throw new HttpException('Proceso no encontrado', HttpStatus.NOT_FOUND);
    }

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
      draftsCount,
      documentsCount,
      timePercentage: Math.round(timePercentage * 100) / 100
    };
  }

  /**
   * Obtiene procesos asignados a un abogado específico
   */
  async findByAbogadoId(abogadoId: string): Promise<any[]> {
    const processes = await this.processRepository.find({
      where: { abogadoAsignadoId: abogadoId },
      relations: ['news', 'evidence', 'autos'],
      order: { createdAt: 'DESC' },
    });

    // Calcular estadísticas dinámicas para cada proceso
    return processes.map(p => {
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
        draftsCount,
        documentsCount,
        timePercentage: Math.round(timePercentage * 100) / 100
      };
    });
  }

  /**
   * Cambia la etapa del proceso (US-009)
   */
  async changeStage(
    id: string,
    stage: ProcessStage,
    kanbanStage?: string,
    kanbanNotice?: string
  ): Promise<DisciplinaryProcess> {
    const proceso = await this.findById(id, false);

    if (kanbanStage) {
      proceso.kanbanStage = kanbanStage;
    }

    if (kanbanNotice !== undefined) {
      proceso.kanbanNotice = kanbanNotice || null;
    }

    if (proceso.etapaActual !== stage) {
      // Validar transicion de etapa
      this.validarTransicionEtapa(proceso.etapaActual as ProcessStage, stage);

      // Calcular nuevo vencimiento
      const { fechaVencimiento } =
        await this.terminosService.calculateVencimientoEtapa(stage);

      console.log('Changing stage for process', id, 'from', proceso.etapaActual, 'to', stage, 'new deadline', fechaVencimiento);

      proceso.etapaActual = stage;
      proceso.fechaVencimientoEtapa = fechaVencimiento;
    }

    return await this.processRepository.save(proceso);
  }

  /**
   * Actualiza datos generales del proceso (abogado, hechos, disciplinable)
   */
  async update(id: string, updateDto: UpdateDisciplinaryProcessDto): Promise<DisciplinaryProcess> {
    const proceso = await this.findById(id, false);
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
    return this.changeStage(id, updateStageDto.nuevaEtapa);
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
   * Obtener proceso por radicado del proceso
   */
  async findByRadicado(radicadoProceso: string): Promise<DisciplinaryProcess> {
    const proceso = await this.processRepository.findOne({
      where: { radicadoProceso },
      relations: ['news'],
    });

    if (!proceso) {
      throw new HttpException(
        `Proceso con radicado ${radicadoProceso} no encontrado`,
        HttpStatus.NOT_FOUND,
      );
    }

    return proceso;
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
      console.log('💾 addEvidence - Iniciando guardado en BD...');
      console.log('💾 Parámetros recibidos:', {
        id,
        url,
        originalName,
        descripcion,
        fileType,
        fileSize,
        nombreDocumento,
        tipoDocumento,
        etapa,
        usuarioCarga,
        categoria,
        destinatario,
        asunto,
        participantes,
      });

      const proceso = await this.findById(id, false); // No cargar autos para evitar errores
      console.log('✅ Proceso encontrado:', proceso.id, proceso.radicadoProceso);

      // Determinar tipo de archivo desde la extensión si no se proporciona
      const extension = originalName.split('.').pop()?.toLowerCase() || '';
      const finalFileType = fileType || extension;

      // Preparar datos para la evidencia
      const evidenceData = {
        url,
        process: proceso,
        processId: proceso.id,
        description: descripcion || 'Documento cargado desde el portal',
        filename: originalName,
        fileType: finalFileType,
        fileSize: fileSize || 0,
        nombreDocumento: nombreDocumento || originalName,
        tipoDocumento: tipoDocumento || 'DOCUMENTO',
        categoria: categoria || null,
        destinatario: destinatario || null,
        asunto: asunto || null,
        participantes: participantes ?? null,
        etapa: etapa || undefined,
        usuarioCarga: usuarioCarga || 'Sistema',
      };

      console.log('💾 Datos de evidencia a guardar:', JSON.stringify(evidenceData, null, 2));

      // Crear entidad de evidencia con toda la información
      const evidence = this.evidenceRepository.create(evidenceData);
      console.log('✅ Entidad creada, guardando...');

      const evidenceGuardada = await this.evidenceRepository.save(evidence);
      console.log('✅ Evidencia guardada exitosamente. ID:', evidenceGuardada.id);
      console.log('✅ Evidencia guardada completa:', JSON.stringify(evidenceGuardada, null, 2));

      // Mantener compatibilidad con campo legacy
      if (!proceso.pruebas) {
        proceso.pruebas = [];
      }
      proceso.pruebas.push(url);

      await this.processRepository.update(id, { pruebas: proceso.pruebas });
      console.log('✅ Proceso actualizado con nueva prueba');

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
   * Valida las transiciones permitidas entre etapas
   */
  private validarTransicionEtapa(etapaActual: ProcessStage, nuevaEtapa: ProcessStage): void {
    console.log('Validating transition from', etapaActual, 'to', nuevaEtapa);
    if (etapaActual === nuevaEtapa) {
      throw new HttpException(
        `No se puede pasar de ${etapaActual} a ${nuevaEtapa}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return;
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
}

