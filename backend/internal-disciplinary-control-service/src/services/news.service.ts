import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DisciplinaryNews, NewsStatus } from '../entities/disciplinary-news.entity';
import { CreateDisciplinaryNewsDto } from '../dtos/create-disciplinary-news.dto';
import { ReturnNewsDto } from '../dtos/return-news.dto';
import { SequenceService } from './sequence.service';
import { StorageService } from './storage.service';
import { AlertasService } from './alertas.service';
import { TipoAlerta } from '../entities/alerta-enviada.entity';

interface FileData {
  buffer: Buffer;
  originalname: string;
}

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(
    @InjectRepository(DisciplinaryNews)
    private newsRepository: Repository<DisciplinaryNews>,
    private sequenceService: SequenceService,
    private storageService: StorageService,
    private alertasService: AlertasService,
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
      if (files && files.length > 0) {
        const stored = await this.storageService.saveMultipleFiles(radicado, files);
        adjuntos.push(...stored);
      }

      // Crear historial inicial
      const initialHistory = [{
        id: Date.now().toString(),
        tipo: 'radicacion',
        usuario: 'Sistema', // TODO: Get actual user
        fecha: new Date().toISOString(),
        observaciones: 'Radicación exitosa en el sistema',
      }];

      // Crear y guardar noticia
      const noticia = this.newsRepository.create({
        radicado,
        ...createNewsDto,
        adjuntos,
        estado: NewsStatus.RADICADA,
        kanbanStage: 'RECEPCION',
        historialAuditoria: initialHistory,
      });

      return await this.newsRepository.save(noticia);
    } catch (error) {
      throw new HttpException(
        `Error al radicar noticia: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene todas las noticias
   */
  async findAll(): Promise<DisciplinaryNews[]> {
    return await this.newsRepository.find();
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
   * Obtiene noticias pendientes de asignación (estado RADICADA)
   */
  async findPendingAssignment(): Promise<DisciplinaryNews[]> {
    return await this.newsRepository.find({
      where: { estado: NewsStatus.RADICADA },
      order: { fechaRecepcion: 'DESC' },
    });
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
   * Devuelve una noticia con observaciones y notifica al radicador
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

    // Guardar la noticia
    const savedNoticia = await this.newsRepository.save(noticia);

    // Crear notificación para el radicador
    try {
      // Obtener el nombre del radicador del DTO o del historial
      const radicadorNombre = returnNewsDto.radicadorNombre ||
        noticia.historialAuditoria?.find((h: any) => h.tipo === 'radicacion')?.usuario ||
        'Radicador';

      const radicadorId = returnNewsDto.radicadorId || 'Sistema';

      // Crear notificación visual para el radicador
      await this.alertasService.crearNotificacionNoticia(
        noticia.id,
        TipoAlerta.VISUAL,
        radicadorId, // destinatario (ID del radicador)
        `Noticia ${noticia.radicado} devuelta para correcciones`,
        `La noticia disciplinaria ${noticia.radicado} ha sido devuelta y requiere correcciones.\n\nObservaciones: ${returnNewsDto.observaciones}`,
        'Sistema',
      );

      this.logger.log(`Notificación de devolución creada para radicador ${radicadorNombre} (${radicadorId})`);
    } catch (error) {
      // No fallar si la notificación no se puede crear
      this.logger.error(`Error al crear notificación de devolución: ${error.message}`);
    }

    return savedNoticia;
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

  /**
   * Actualiza la etapa Kanban de una noticia
   */
  async updateKanbanStage(id: string, kanbanStage?: string): Promise<DisciplinaryNews> {
    const noticia = await this.findById(id);
    if (kanbanStage) {
      noticia.kanbanStage = kanbanStage;
    }
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
}
