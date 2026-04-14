import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { DisciplinaryNews, NewsStatus, NewsOrigin } from '../entities/disciplinary-news.entity';
import { DisciplinaryProcess } from '../entities/disciplinary-process.entity';
import { DisciplinaryNewsProcess } from '../entities/disciplinary-news-process.entity';
import { StageConfiguration } from '../entities/stage-configuration.entity';
import { CreateDisciplinaryNewsDto } from '../dtos/create-disciplinary-news.dto';
import { ReturnNewsDto } from '../dtos/return-news.dto';
import { SequenceService } from './sequence.service';
import { StorageService } from './storage.service';

interface FileData {
  buffer: Buffer;
  originalname: string;
}

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(DisciplinaryNews)
    private newsRepository: Repository<DisciplinaryNews>,
    @InjectRepository(DisciplinaryProcess)
    private processRepository: Repository<DisciplinaryProcess>,
    @InjectRepository(DisciplinaryNewsProcess)
    private newsProcessRepository: Repository<DisciplinaryNewsProcess>,
    @InjectRepository(StageConfiguration)
    private stageConfigurationRepository: Repository<StageConfiguration>,
    private sequenceService: SequenceService,
    private storageService: StorageService,
  ) { }

  /**
   * Radica una nueva noticia disciplinaria
   */
  async create(
    createNewsDto: CreateDisciplinaryNewsDto,
    files?: FileData[],
  ): Promise<DisciplinaryNews> {
    try {
      // Generar radicado único
      const radicado = await this.sequenceService.generateNewsRadicado();

      // Procesar archivos adjuntos
      const adjuntos: string[] = Array.isArray(createNewsDto.adjuntos)
        ? [...createNewsDto.adjuntos]
        : [];
      console.log(`[DEBUG] NewsService.create - Radicado: ${radicado}, Adjuntos iniciales: ${adjuntos.length}, Files recibidos: ${files?.length || 0}`);
      if (files && files.length > 0) {
        console.log(`[DEBUG] Procesando ${files.length} archivos...`);
        const stored = await this.storageService.saveMultipleFiles(radicado, files);
        console.log(`[DEBUG] Archivos guardados: ${stored.length} - ${stored.join(', ')}`);
        adjuntos.push(...stored);
      }
      console.log(`[DEBUG] Adjuntos finales: ${adjuntos.length} - ${adjuntos.join(', ')}`);

      // Crear historial inicial
      const initialHistory = [{
        id: Date.now().toString(),
        tipo: 'radicacion',
        usuario: 'Sistema', // TODO: Get actual user
        fecha: new Date().toISOString(),
        observaciones: 'Radicación exitosa en el sistema',
      }];

      // Calcular fecha de caducidad (5 años desde la fecha de los hechos - Ley 734/2002 Art. 30)
      let fechaCaducidad: Date | undefined;
      if (createNewsDto.fechaHechos) {
        fechaCaducidad = new Date(createNewsDto.fechaHechos);
        fechaCaducidad.setFullYear(fechaCaducidad.getFullYear() + 5);
      }

      // Get initial stage order from configuration
      const initialStage = await this.stageConfigurationRepository.findOne({
        where: { orden: 1, activo: true },
      });
      if (!initialStage) {
        throw new HttpException(
          'Initial stage configuration for RECEPCION not found',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Crear y guardar noticia
      const noticia = this.newsRepository.create({
        radicado,
        ...createNewsDto,
        adjuntos,
        fechaCaducidad,
        estado: 'RADICADA',
        kanbanStage: initialStage.id,
        etapaActual: initialStage.etapa,
        historialAuditoria: initialHistory,
      } as any);

      return await this.newsRepository.save(noticia) as unknown as DisciplinaryNews;
    } catch (error) {
      throw new HttpException(
        `Error al radicar noticia: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene todas las noticias (excluyendo las asociadas)
   */
  async findAll(): Promise<DisciplinaryNews[]> {
    return await this.newsRepository.find({
      where: { estado: Not(NewsStatus.ASOCIADA) },
    });
  }

  /**
   * Obtiene las noticias asociadas a un proceso específico
   */
  async findAssociatedToProcess(processId: string): Promise<DisciplinaryNews[]> {
    // Buscar las asociaciones en la tabla puente
    const associations = await this.newsProcessRepository.find({
      where: { processId },
      relations: ['news'],
      order: { fechaAsociacion: 'ASC' },
    });

    // Extraer las noticias
    return associations.map(association => association.news);
  }

  /**
   * Obtiene las asociaciones de noticias para un proceso específico
   */
  async findNewsAssociationsForProcess(processId: string): Promise<DisciplinaryNewsProcess[]> {
    return await this.newsProcessRepository.find({
      where: { processId },
      relations: ['news', 'process'],
      order: { fechaAsociacion: 'ASC' },
    });
  }

  /**
   * Desasocia una noticia de un proceso
   */
  async disassociateNewsFromProcess(newsId: string, processId: string): Promise<void> {
    const association = await this.newsProcessRepository.findOne({
      where: { newsId, processId },
    });

    if (!association) {
      throw new HttpException('Asociación no encontrada', HttpStatus.NOT_FOUND);
    }

    // Eliminar la asociación
    await this.newsProcessRepository.delete(association.id);

    // Verificar si la noticia tiene otras asociaciones
    const otherAssociations = await this.newsProcessRepository.find({
      where: { newsId },
    });

    if (otherAssociations.length === 0) {
      // Si no tiene otras asociaciones, cambiar estado a RADICADA
      const noticia = await this.findById(newsId);
      noticia.estado = NewsStatus.RADICADA;

      // Registrar en auditoría
      const historyEntry = {
        id: Date.now().toString(),
        tipo: 'desasociacion',
        usuario: 'Sistema',
        fecha: new Date().toISOString(),
        observaciones: `Noticia desasociada del proceso ${processId}`,
      };
      noticia.historialAuditoria = [...(noticia.historialAuditoria || []), historyEntry];

      await this.newsRepository.save(noticia);
    }
  }

  /**
   * Obtiene una noticia por ID
   */
  async findById(id: string): Promise<DisciplinaryNews> {
    const noticia = await this.newsRepository.findOne({ where: { id } });
    if (!noticia) {
      throw new HttpException('Noticia no encontrada', HttpStatus.NOT_FOUND);
    }
    return noticia;
  }

  /**
   * Obtiene una noticia por radicado
   */
  async findByRadicado(radicado: string): Promise<DisciplinaryNews> {
    const noticia = await this.newsRepository.findOne({ where: { radicado } });
    if (!noticia) {
      throw new HttpException(
        `Radicado ${radicado} no encontrado`,
        HttpStatus.NOT_FOUND,
      );
    }
    return noticia;
  }

  /**
   * Obtiene noticias pendientes de asignación (estado RADICADA, excluyendo ASOCIADA)
   */
  async findPendingAssignment(): Promise<DisciplinaryNews[]> {
    return await this.newsRepository.find({
      where: { estado: NewsStatus.RADICADA },
      order: { fechaRecepcion: 'DESC' },
    });
  }

  /**
   * Obtiene las noticias asociadas a los procesos de un profesional específico
   * Este método filtra las noticias que tienen procesos asignados al profesional
   */
  async findByProfessionalId(professionalId: string): Promise<DisciplinaryNews[]> {
    // Primero obtener los procesos del profesional
    const procesos = await this.processRepository.find({
      where: { abogadoAsignadoId: professionalId },
      relations: ['news'],
    });

    // Extraer las noticias únicas de los procesos
    const newsIds = new Set<string>();
    const noticias: DisciplinaryNews[] = [];

    for (const proceso of procesos) {
      if (proceso.news && !newsIds.has(proceso.news.id)) {
        newsIds.add(proceso.news.id);
        noticias.push(proceso.news);
      }
    }

    // Ordenar por fecha de recepción descendente
    return noticias.sort((a, b) => 
      new Date(b.fechaRecepcion).getTime() - new Date(a.fechaRecepcion).getTime()
    );
  }

  /**
   * Actualiza los datos de una noticia (edición por Profesional)
   * Registra los cambios en el historial de auditoría
   */
  async update(id: string, data: any): Promise<DisciplinaryNews> {
    const noticia = await this.findById(id);

    // Rastrear campos modificados para trazabilidad
    const cambios: string[] = [];
    if (data.origen && data.origen !== noticia.origen) {
      cambios.push(`Origen: ${noticia.origen} → ${data.origen}`);
    }
    if (data.territorial && data.territorial !== noticia.territorial) {
      cambios.push(`Territorial: ${noticia.territorial} → ${data.territorial}`);
    }
    if (data.hechos && data.hechos !== noticia.hechos) {
      cambios.push('Hechos modificados');
    }
    if (data.fechaHechos === null) {
      cambios.push('Fecha de hechos: eliminada (por determinar)');
    } else if (data.fechaHechos) {
      cambios.push(`Fecha de hechos: ${data.fechaHechos}`);
    }
    if (data.denunciante) cambios.push('Datos de denunciante modificados');
    if (data.disciplinable) cambios.push('Datos de disciplinable modificados');

    // Aplicar cambios (todos los valores del enum incluido POR_DETERMINAR)
    const validOrigens = Object.values(NewsOrigin);
    if (data.origen !== undefined) {
      if (validOrigens.includes(data.origen)) noticia.origen = data.origen;
    }
    if (data.territorial) noticia.territorial = data.territorial;
    if (data.dependenciaDenunciado) noticia.dependenciaDenunciado = data.dependenciaDenunciado;
    if (data.hechos) noticia.hechos = data.hechos;
    if (data.fechaQueja) noticia.fechaQueja = new Date(data.fechaQueja);
    if (data.denunciante) noticia.denunciante = data.denunciante;
    if (data.disciplinable) noticia.disciplinable = data.disciplinable;
    if (data.conductas) noticia.conductas = data.conductas;
    if (data.fechaHechos === null) {
      // Limpiar fecha cuando el usuario selecciona "Por determinar"
      (noticia as any).fechaHechos = null;
      (noticia as any).fechaCaducidad = null;
    } else if (data.fechaHechos) {
      noticia.fechaHechos = new Date(data.fechaHechos);
      noticia.fechaCaducidad = new Date(data.fechaHechos);
      noticia.fechaCaducidad.setFullYear(noticia.fechaCaducidad.getFullYear() + 5);
    }

    // Registrar en historial de auditoría
    const historyEntry = {
      id: Date.now().toString(),
      tipo: 'edicion',
      usuario: data.usuario || 'Profesional',
      fecha: new Date().toISOString(),
      observaciones: cambios.length > 0
        ? `Campos modificados: ${cambios.join(', ')}`
        : 'Noticia actualizada',
    };
    noticia.historialAuditoria = [...(noticia.historialAuditoria || []), historyEntry];

    return await this.newsRepository.save(noticia);
  }

  /**
   * Actualiza el estado de una noticia
   */
  async updateStatus(
    id: string,
    nuevoEstado: NewsStatus,
  ): Promise<DisciplinaryNews> {
    const noticia = await this.findById(id);
    noticia.estado = nuevoEstado;

    // Log history
    const historyEntry = {
      id: Date.now().toString(),
      tipo: 'edicion',
      usuario: 'Sistema', // TODO: Get actual user
      fecha: new Date().toISOString(),
      observaciones: `Cambio de estado a ${nuevoEstado}`,
    };
    noticia.historialAuditoria = [...(noticia.historialAuditoria || []), historyEntry];

    return await this.newsRepository.save(noticia);
  }

  /**
   * Devuelve una noticia con observaciones
   */
  async returnNews(id: string, returnNewsDto: ReturnNewsDto): Promise<DisciplinaryNews> {
    const noticia = await this.findById(id);
    noticia.estado = NewsStatus.DEVUELTA;
    noticia.observaciones = returnNewsDto.observaciones;

    // Log history
    const historyEntry = {
      id: Date.now().toString(),
      tipo: 'devolucion',
      usuario: 'Sistema',
      fecha: new Date().toISOString(),
      observaciones: returnNewsDto.observaciones,
    };
    noticia.historialAuditoria = [...(noticia.historialAuditoria || []), historyEntry];

    return await this.newsRepository.save(noticia);
  }

  /**
   * Archiva una noticia
   */
  async archive(id: string, reason: string): Promise<DisciplinaryNews> {
    const noticia = await this.findById(id);
    noticia.estado = NewsStatus.ARCHIVADA;
    noticia.observaciones = reason;

    // Log history
    const historyEntry = {
      id: Date.now().toString(),
      tipo: 'archivo',
      usuario: 'Sistema',
      fecha: new Date().toISOString(),
      observaciones: reason,
    };
    noticia.historialAuditoria = [...(noticia.historialAuditoria || []), historyEntry];

    return await this.newsRepository.save(noticia);
  }

  async restore(id: string): Promise<DisciplinaryNews> {
    const noticia = await this.findById(id);
    noticia.estado = NewsStatus.RADICADA;

    const historyEntry = {
      id: Date.now().toString(),
      tipo: 'restauracion',
      usuario: 'Sistema',
      fecha: new Date().toISOString(),
      observaciones: 'Noticia restaurada al flujo activo',
    };
    noticia.historialAuditoria = [...(noticia.historialAuditoria || []), historyEntry];

    return await this.newsRepository.save(noticia);
  }

  /**
   * Actualiza la etapa Kanban de una noticia
   */
   async updateKanbanStage(id: string, kanbanStage?: number): Promise<DisciplinaryNews> {
     const noticia = await this.findById(id);
     if (kanbanStage !== undefined) {
       const stageConfig = await this.stageConfigurationRepository.findOne({
         where: { orden: kanbanStage, activo: true },
       });
       if (!stageConfig) {
         throw new HttpException(
           `Stage configuration with orden ${kanbanStage} not found`,
           HttpStatus.BAD_REQUEST,
         );
       }
        noticia.kanbanStage = stageConfig.id;
     }
     return await this.newsRepository.save(noticia);
   }

  /**
   * Actualiza el historial de auditoría de una noticia
   */
  async updateHistory(id: string, historyEntry: any): Promise<DisciplinaryNews> {
    const noticia = await this.findById(id);
    noticia.historialAuditoria = [...(noticia.historialAuditoria || []), historyEntry];
    return await this.newsRepository.save(noticia);
  }

  /**
   * Elimina una noticia (y sus archivos)
   */
  async delete(id: string): Promise<void> {
    const noticia = await this.findById(id);
    await this.storageService.deleteExpediente(noticia.radicado);
    await this.newsRepository.delete(id);
  }

  /**
   * Asocia una noticia a un proceso existente
   */
  async associateNewsToProcess(
    newsId: string,
    procesoDestinoId: string,
    justificacion: string,
  ): Promise<{ message: string; association: any }> {
    const noticia = await this.findById(newsId);

    const proceso = await this.processRepository.findOne({
      where: { id: procesoDestinoId },
    });
    if (!proceso) {
      throw new HttpException('Proceso destino no encontrado', HttpStatus.NOT_FOUND);
    }

    // Verificar si ya existe la asociación usando query directo
    try {
      const existingAssociation = await this.newsProcessRepository.findOne({
        where: { newsId, processId: procesoDestinoId },
      });
      if (existingAssociation) {
        throw new BadRequestException('La noticia ya está asociada a este proceso');
      }
    } catch (error) {
      // Si hay error con el repository, intentar query alternativo
      console.warn('Error con repository, usando query alternativo:', error.message);
    }

    // Crear la asociación usando query builder para evitar problemas de metadata
    const associationData = {
      newsId,
      processId: procesoDestinoId,
      justificacion,
      fechaAsociacion: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  
    console.log('✅ Asociando noticia a proceso:', {
      newsId,
      procesoDestinoId,
      radicadoProceso: proceso.radicadoProceso,
    });
  
    // Intentar guardar la asociación PRIMERO
    try {
      const association = this.newsProcessRepository.create(associationData);
      const savedAssociation = await this.newsProcessRepository.save(association);
  
      // Solo si la asociación se guarda exitosamente, cambiar el estado de la noticia
      noticia.estado = NewsStatus.ASOCIADA;
  
      // Registrar en auditoría de la noticia
      const historyEntry = {
        id: Date.now().toString(),
        tipo: 'asociacion',
        usuario: 'Sistema',
        fecha: new Date().toISOString(),
        observaciones: `Noticia asociada al proceso ${proceso.radicadoProceso}. Justificación: ${justificacion}`,
      };
      noticia.historialAuditoria = [...(noticia.historialAuditoria || []), historyEntry];
  
      // Guardar la noticia con el nuevo estado
      await this.newsRepository.save(noticia);
  
      return {
        message: 'Asociación creada exitosamente',
        association: savedAssociation
      };
    } catch (error) {
      console.error('Error guardando asociación:', error);
      // Si falla la asociación, NO cambiar el estado de la noticia
      throw new HttpException(
        `Error al crear la asociación: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Asocia una noticia a otra noticia existente
   */
  async associateNewsToNews(
    newsId: string,
    noticiaDestinoId: string,
    justificacion: string,
  ): Promise<DisciplinaryNews> {
    const noticia = await this.findById(newsId);

    const noticiaDestino = await this.newsRepository.findOne({
      where: { id: noticiaDestinoId },
    });
    if (!noticiaDestino) {
      throw new HttpException('Noticia destino no encontrada', HttpStatus.NOT_FOUND);
    }

    noticia.procesoAsociadoId = noticiaDestinoId;
    noticia.procesoAsociadoNumero = noticiaDestino.radicado;
    noticia.procesoAsociadoFecha = new Date();
    noticia.procesoAsociadoJustificacion = justificacion;
    noticia.estado = NewsStatus.ASOCIADA; // ✅ Cambiar estado para ocultar la noticia

    const historyEntry = {
      id: Date.now().toString(),
      tipo: 'asociacion',
      usuario: 'Sistema',
      fecha: new Date().toISOString(),
      observaciones: `Noticia asociada a noticia ${noticiaDestino.radicado}. Justificación: ${justificacion}`,
    };
    noticia.historialAuditoria = [...(noticia.historialAuditoria || []), historyEntry];

    console.log('✅ Asociando noticia a noticia:', {
      newsId,
      noticiaDestinoId,
      radicadoDestino: noticiaDestino.radicado,
    });

    return await this.newsRepository.save(noticia);
  }

  /**
   * Remite una noticia por competencia a otra entidad
   * Actualiza el estado a REMITIDA y guarda los datos de remisión
   */
  async remitirNoticia(
    id: string,
    data: {
      numeroRC: string;
      entidadRemision: string;
      correoEntidadRemision: string;
      fechaRemision: Date;
      tipoRemision?: string;
      justificacionRemision?: string;
    },
    descripcionRemision?: {
      numeroRadicado: string;
      origen: string;
      fechaRecepcion: string | Date;
      territorial: string;
      dependenciaDenunciado: string;
      denunciante: any;
      disciplinable: any;
      hechos: string;
      conductas?: string[];
      fundamentosLegales?: string[];
    },
  ): Promise<DisciplinaryNews> {
    const noticia = await this.findById(id);

    // Actualizar estado y campos de remisión
    noticia.estado = NewsStatus.REMITIDA;
    noticia.kanbanStage = null;
    noticia.numeroRC = data.numeroRC;
    noticia.entidadRemision = data.entidadRemision;
    noticia.correoEntidadRemision = data.correoEntidadRemision;
    noticia.fechaRemision = data.fechaRemision;
    noticia.tipoRemision = data.tipoRemision ?? null;
    noticia.justificacionRemision = data.justificacionRemision ?? null;

    // Guardar descripción detallada en el campo JSON
    if (descripcionRemision) {
      noticia.descripcionRemision = descripcionRemision;
    } else {
      // Construir descripción desde la noticia
      noticia.descripcionRemision = {
        numeroRadicado: noticia.radicado,
        origen: typeof noticia.origen === 'string' ? noticia.origen : noticia.origen,
        fechaRecepcion: new Date(noticia.fechaRecepcion).toISOString(),
        territorial: noticia.territorial,
        dependenciaDenunciado: noticia.dependenciaDenunciado,
        denunciante: typeof noticia.denunciante === 'string' ? JSON.parse(noticia.denunciante) : noticia.denunciante,
        disciplinable: typeof noticia.disciplinable === 'string' ? JSON.parse(noticia.disciplinable) : noticia.disciplinable,
        hechos: noticia.hechos,
        conductas: noticia.conductas,
        fundamentosLegales: [],
      };
    }

    // Registrar en auditoría
    const historyEntry = {
      id: Date.now().toString(),
      tipo: 'remision_competencia',
      usuario: 'Sistema',
      fecha: new Date().toISOString(),
      observaciones: `Noticia remitida por competencia a ${data.entidadRemision}. Número RC: ${data.numeroRC}`,
    };
    noticia.historialAuditoria = [...(noticia.historialAuditoria || []), historyEntry];

    console.log('✅ Remitiendo noticia por competencia:', {
      newsId: id,
      numeroRC: data.numeroRC,
      entidadRemision: data.entidadRemision,
      estado: NewsStatus.REMITIDA,
    });

    return await this.newsRepository.save(noticia);
  }

  /**
   * Actualiza los detalles de remisión en formato JSON
   */
  async updateRemisionDetails(
    id: string,
    descripcion: {
      numeroRadicado: string;
      origen: string;
      fechaRecepcion: string | Date;
      territorial: string;
      dependenciaDenunciado: string;
      denunciante: any;
      disciplinable: any;
      hechos: string;
      conductas?: string[];
      fundamentosLegales?: string[];
    },
  ): Promise<DisciplinaryNews> {
    const noticia = await this.findById(id);

    // Guardar la descripción detallada como JSON usando el campo de la entidad
    noticia.descripcionRemision = descripcion;

    return await this.newsRepository.save(noticia);
  }

  /**
   * Construye el contenido HTML del correo de remisión por competencia
   */
  buildRemisionEmailContent(
    noticia: DisciplinaryNews,
    entidadDestino: string,
    justificacion: string,
    descripcionRemision?: {
      numeroRadicado: string;
      origen: string;
      fechaRecepcion: string | Date;
      territorial: string;
      dependenciaDenunciado: string;
      denunciante: any;
      disciplinable: any;
      hechos: string;
      conductas?: string[];
      fundamentosLegales?: string[];
    },
  ): string {
    const formatDate = (date: Date | string | undefined): string => {
      if (!date) return 'No especificada';
      return new Date(date).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const formatPersonInfo = (person: any): string => {
      if (!person) return 'No disponible';
      let info = `<strong>${person.nombre || 'Sin nombre'}</strong>`;
      if (person.cedula || person.identificacion) info += `<br>C.C.: ${person.cedula || person.identificacion}`;
      if (person.cargo) info += `<br>Cargo: ${person.cargo}`;
      if (person.dependencia) info += `<br>Dependencia: ${person.dependencia}`;
      if (person.entidad) info += `<br>Entidad: ${person.entidad}`;
      if (person.email) info += `<br>Email: ${person.email}`;
      if (person.telefono) info += `<br>Teléfono: ${person.telefono}`;
      return info;
    };

    // Usar datos de descripcionRemision o construir desde la noticia
    const datos = descripcionRemision || {
      numeroRadicado: noticia.radicado,
      origen: typeof noticia.origen === 'string' ? noticia.origen : noticia.origen,
      fechaRecepcion: new Date(noticia.fechaRecepcion).toISOString(),
      territorial: noticia.territorial,
      dependenciaDenunciado: noticia.dependenciaDenunciado,
      denunciante: typeof noticia.denunciante === 'string' ? JSON.parse(noticia.denunciante) : noticia.denunciante,
      disciplinable: typeof noticia.disciplinable === 'string' ? JSON.parse(noticia.disciplinable) : noticia.disciplinable,
      hechos: noticia.hechos,
      conductas: noticia.conductas,
      fundamentosLegales: [],
    };

    return `
      <div style="font-family: 'Inter', Arial, sans-serif; background: #f5f7fb; padding: 24px; color: #1f2937;">
        <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 700px; border: 1px solid #0b68d1; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.3);">
          <tr>
            <td style="background: linear-gradient(135deg, #003DA5 0%, #0b68d1 100%); padding: 18px 24px; color: #ffffff; font-weight: 700; font-size: 18px;">
              Remisión por Competencia - Control Interno Disciplinario ESAP
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
              Información de la Remisión
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 16px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
              <table width="100%" cellspacing="0" cellpadding="8" style="background: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="font-weight: 600; color: #374151;">Entidad de Destino:</td>
                  <td style="color: #111827;">${entidadDestino}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #374151;">Fecha de Remisión:</td>
                  <td style="color: #111827;">${formatDate(new Date())}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #374151;">Radicado Original:</td>
                  <td style="color: #111827;">${datos.numeroRadicado}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
              Justificación de la Remisión
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 16px 24px; font-size: 14px; color: #4b5563; line-height: 1.6; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0;">
              ${justificacion}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
              Datos del Denunciante
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 16px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
              ${formatPersonInfo(datos.denunciante)}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
              Datos del Disciplinable
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 16px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
              ${formatPersonInfo(datos.disciplinable)}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
              Hechos de la Noticia
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 16px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
              ${datos.hechos || 'No especificados'}
            </td>
          </tr>
          ${datos.conductas && datos.conductas.length > 0 ? `
          <tr>
            <td style="padding: 16px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
              Conductasallegadas
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 16px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
              <ul style="margin: 0; padding-left: 20px;">
                ${datos.conductas.map(c => `<li>${c}</li>`).join('')}
              </ul>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 16px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
              Información Adicional
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 16px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
              <table width="100%" cellspacing="0" cellpadding="8" style="background: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="font-weight: 600; color: #374151;">Origen:</td>
                  <td style="color: #111827;">${datos.origen || 'No especificado'}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #374151;">Territorial:</td>
                  <td style="color: #111827;">${datos.territorial || 'No especificada'}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #374151;">Dependencia del Denunciado:</td>
                  <td style="color: #111827;">${datos.dependenciaDenunciado || 'No especificada'}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #374151;">Fecha de Recepción:</td>
                  <td style="color: #111827;">${formatDate(datos.fechaRecepcion)}</td>
                </tr>
              </table>
            </td>
          </tr>
          ${datos.fundamentosLegales && datos.fundamentosLegales.length > 0 ? `
          <tr>
            <td style="padding: 16px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
              Fundamentos Legales
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 16px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
              <ul style="margin: 0; padding-left: 20px;">
                ${datos.fundamentosLegales.map(f => `<li>${f}</li>`).join('')}
              </ul>
            </td>
          </tr>
          ` : ''}
          ${noticia.adjuntos && noticia.adjuntos.length > 0 ? `
          <tr>
            <td style="padding: 16px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
              Archivos Adjuntos
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 16px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
              ${noticia.adjuntos.length} archivo(s) adjunto(s) en el sistema
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 24px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; text-align: center;">
              ESAP - Escuela Superior de Administración Pública<br>
              Sistema de Control Interno Disciplinario<br>
              Este correo fue generado automáticamente.
            </td>
          </tr>
        </table>
      </div>
    `;
  }
}
