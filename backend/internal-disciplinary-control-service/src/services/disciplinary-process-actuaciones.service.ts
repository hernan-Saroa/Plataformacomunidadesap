import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDisciplinaryProcessActuacionDto } from '../dtos/disciplinary-process-actuacion.dto';
import { DisciplinaryProcessActuacion } from '../entities/disciplinary-process-actuacion.entity';
import { DisciplinaryProcess } from '../entities/disciplinary-process.entity';
import { DisciplinaryNews } from '../entities/disciplinary-news.entity';

@Injectable()
export class DisciplinaryProcessActuacionesService {
  constructor(
    @InjectRepository(DisciplinaryProcessActuacion)
    private readonly actuacionesRepository: Repository<DisciplinaryProcessActuacion>,
    @InjectRepository(DisciplinaryProcess)
    private readonly processRepository: Repository<DisciplinaryProcess>,
    @InjectRepository(DisciplinaryNews)
    private readonly newsRepository: Repository<DisciplinaryNews>,
  ) {}

  private readonly stageOrderMap: Record<string, string> = {
    RECEPCION: 'RECEPCION',
    VALORACION: 'VALORACION',
    INDAGACION_PREVIA: 'INDAGACION_PREVIA',
    INVESTIGACION: 'INVESTIGACION',
    EVALUACION: 'VALORACION', // Map to VALORACION
    JUZGAMIENTO: 'JUZGAMIENTO',
    INDAGACION: 'INDAGACION',
    FALLO: 'FALLO',
    SEGUNDA_INSTANCIA: 'SEGUNDA_INSTANCIA',
  };

  async listByProcess(processId: string): Promise<DisciplinaryProcessActuacion[]> {
    const process = await this.ensureProcessExists(processId);

    // Se incluyen tambien las actuaciones registradas contra la noticia origen
    // (etapa de Radicacion en adelante), para que el historial sea continuo.
    const query = this.actuacionesRepository
      .createQueryBuilder('actuacion')
      .where('actuacion.processId = :processId', { processId });

    if (process.newsId) {
      query.orWhere('actuacion.newsId = :newsId', { newsId: process.newsId });
    }

    return query
      .orderBy('actuacion.fechaActuacion', 'DESC')
      .addOrderBy('actuacion.createdAt', 'DESC')
      .getMany();
  }

  async listByNews(newsId: string): Promise<DisciplinaryProcessActuacion[]> {
    await this.ensureNewsExists(newsId);

    return this.actuacionesRepository.find({
      where: { newsId },
      order: {
        fechaActuacion: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  async create(
    processId: string,
    dto: CreateDisciplinaryProcessActuacionDto,
  ): Promise<DisciplinaryProcessActuacion> {
    const process = await this.ensureProcessExists(processId);

    const actuacion = this.actuacionesRepository.create({
      processId,
      newsId: null,
      tipo: dto.tipo.trim().toLowerCase(),
      etapa: dto.etapa?.trim() || process.etapaActual,
      descripcion: dto.descripcion.trim(),
      responsableNombre: dto.responsableNombre.trim(),
      fechaActuacion: new Date(dto.fechaActuacion),
      observaciones: dto.observaciones?.trim() || null,
    });

    return this.actuacionesRepository.save(actuacion);
  }

  async createForNews(
    newsId: string,
    dto: CreateDisciplinaryProcessActuacionDto,
  ): Promise<DisciplinaryProcessActuacion> {
    await this.ensureNewsExists(newsId);

    const actuacion = this.actuacionesRepository.create({
      processId: null,
      newsId,
      tipo: dto.tipo.trim().toLowerCase(),
      etapa: dto.etapa?.trim() || 'RADICACION',
      descripcion: dto.descripcion.trim(),
      responsableNombre: dto.responsableNombre.trim(),
      fechaActuacion: new Date(dto.fechaActuacion),
      observaciones: dto.observaciones?.trim() || null,
    });

    return this.actuacionesRepository.save(actuacion);
  }

  private async ensureProcessExists(processId: string): Promise<DisciplinaryProcess> {
    const process = await this.processRepository.findOne({
      where: { id: processId },
    });

    if (!process) {
      throw new HttpException('Proceso no encontrado', HttpStatus.NOT_FOUND);
    }

    return process;
  }

  private async ensureNewsExists(newsId: string): Promise<DisciplinaryNews> {
    const news = await this.newsRepository.findOne({
      where: { id: newsId },
    });

    if (!news) {
      throw new HttpException('Noticia disciplinaria no encontrada', HttpStatus.NOT_FOUND);
    }

    return news;
  }
}
