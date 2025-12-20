import {
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
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

      // Validar que la noticia esté en estado RADICADA
      if (noticia.estado !== NewsStatus.RADICADA) {
        throw new HttpException(
          'La noticia debe estar en estado RADICADA para asignar proceso',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Generar radicado del proceso
      const radicadoProceso =
        await this.sequenceService.generateProcessRadicado();

      // Calcular fecha de prescripción (15 años desde los hechos)
      const fechaPrescripcion =
        this.terminosService.calculateFechaPrescripcion(noticia.fechaRecepcion);

      // Calcular fecha de vencimiento de la etapa inicial (EVALUACION)
      const { fechaVencimiento } =
        await this.terminosService.calculateVencimientoEtapa('VALORACIÓN');

      // Crear proceso
      const proceso = this.processRepository.create({
        radicadoProceso,
        newsId: createProcessDto.newsId,
        abogadoAsignadoId: createProcessDto.abogadoId,
        etapaActual: 'VALORACIÓN', // Default initial stage (was ProcessStage.EVALUACION)
        estado: ProcessStatus.ACTIVO,
        fechaPrescripcion,
        fechaVencimientoEtapa: fechaVencimiento,
        observaciones: createProcessDto.observaciones,
      });

      const procesoConcreado = await this.processRepository.save(proceso);

      // Cambiar estado de la noticia a ASIGNADA
      await this.newsService.updateStatus(
        createProcessDto.newsId,
        NewsStatus.ASIGNADA,
      );

      return procesoConcreado;
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
    const processes = await this.processRepository.find({
      relations: ['news', 'abogadoAsignado', 'evidence'],
      where: {
        news: {
          estado: Not(NewsStatus.DEVUELTA)
        }
      },
      order: {
        updatedAt: 'DESC' // Ordenar por fecha de actualización
      }
    });

    // Map to include professional name
    return processes.map(p => ({
      ...p,
      abogadoAsignadoNombre: p.abogadoAsignado?.nombreCompleto || 'Sin asignar'
    }));
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
  async findById(id: string, includeAutos: boolean = false): Promise<DisciplinaryProcess> {
    const relations = ['news', 'evidence'];
    if (includeAutos) {
      relations.push('autos');
    }

    const proceso = await this.processRepository.findOne({
      where: { id },
      relations,
    });
    if (!proceso) {
      throw new HttpException('Proceso no encontrado', HttpStatus.NOT_FOUND);
    }
    return proceso;
  }

  /**
   * Obtiene procesos asignados a un abogado específico
   */
  async findByAbogadoId(abogadoId: string): Promise<DisciplinaryProcess[]> {
    return await this.processRepository.find({
      where: { abogadoAsignadoId: abogadoId },
      relations: ['news'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Cambia la etapa del proceso (US-009)
   */
  async changeStage(id: string, stage: string): Promise<DisciplinaryProcess> {
    const proceso = await this.findById(id, false);

    // Validar transición de etapa
    this.validarTransicionEtapa(proceso.etapaActual, stage);

    // Calcular nuevo vencimiento
    const { fechaVencimiento } =
      await this.terminosService.calculateVencimientoEtapa(stage);

    proceso.etapaActual = stage;
    proceso.fechaVencimientoEtapa = fechaVencimiento;

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
        const disciplinableExistente = proceso.news.disciplinable || [];
        const disciplinableActualizado = disciplinableExistente.length > 0
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
   * Valida las transiciones permitidas entre etapas
   */
  /**
   * Valida las transiciones permitidas entre etapas
   */
  private validarTransicionEtapa(etapaActual: string, nuevaEtapa: string): void {
    // With dynamic stages, we can't hardcode transitions easily without a complex graph.
    // For now, we allow any transition as long as it's a change.
    // FUTURE: Implement a dynamic transition rule engine based on StageConfiguration order.
    if (etapaActual === nuevaEtapa) {
      // Optionally warn or allow. Currently allowing re-assignment or strict check?
      // Let's behave loosely to avoid blocking the user.
    }
    return;
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
