import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrdConfiguracion } from './trd-configuracion.entity';
import { TrdSerieSubserie } from './trd-serie-subserie.entity';
import {
  CreateTrdDto,
  UpdateTrdDto,
  CreateTrdSerieSubserieDto,
  UpdateTrdSerieSubserieDto,
} from './dto/trd.dto';

@Injectable()
export class TrdService {
  constructor(
    @InjectRepository(TrdConfiguracion)
    private readonly trdRepo: Repository<TrdConfiguracion>,
    @InjectRepository(TrdSerieSubserie)
    private readonly serieRepo: Repository<TrdSerieSubserie>,
  ) {}

  /**
   * Obtiene todas las versiones de TRD/TVD con sus series y subseries asociadas
   */
  async findAll(): Promise<TrdConfiguracion[]> {
    return this.trdRepo.find({
      order: {
        fechaInicio: 'DESC',
      },
      relations: ['series'],
    });
  }

  /**
   * Obtiene una versión específica por ID
   */
  async findById(id: number): Promise<TrdConfiguracion> {
    const trd = await this.trdRepo.findOne({
      where: { id },
      relations: ['series'],
    });
    if (!trd) {
      throw new NotFoundException(`Configuración TRD con ID ${id} no encontrada`);
    }
    return trd;
  }

  /**
   * Obtiene la TRD vigente o la correspondiente a una fecha histórica
   * para clasificación documental exacta sin alterar documentos existentes.
   */
  async getVigente(
    modulo: string = 'control-disciplinario',
    fecha?: string,
  ): Promise<{
    trd: TrdConfiguracion;
    serieSubserie: TrdSerieSubserie | null;
  }> {
    let trd: TrdConfiguracion | null = null;

    // 1. Si se proporciona fecha, buscar por rango de vigencia histórico (ej. 1998-2006, 2007-2014, 2015-2020, 2021+)
    if (fecha) {
      const fechaLimpia = fecha.substring(0, 10);
      trd = await this.trdRepo
        .createQueryBuilder('t')
        .leftJoinAndSelect('t.series', 's')
        .where('t.fecha_inicio <= :fecha', { fecha: fechaLimpia })
        .andWhere('(t.fecha_fin IS NULL OR t.fecha_fin >= :fecha)', { fecha: fechaLimpia })
        .orderBy('t.fecha_inicio', 'DESC')
        .getOne();
    }

    // 2. Si no se especificó fecha o no se encontró por rango, buscar la marcada como 'esVigente = true'
    if (!trd) {
      trd = await this.trdRepo.findOne({
        where: { esVigente: true, activo: true },
        relations: ['series'],
      });
    }

    // 3. Fallback: la TRD activa más reciente
    if (!trd) {
      trd = await this.trdRepo.findOne({
        where: { activo: true },
        order: { fechaInicio: 'DESC' },
        relations: ['series'],
      });
    }

    if (!trd) {
      throw new NotFoundException('No existe ninguna TRD configurada en el sistema.');
    }

    // Buscar la serie/subserie correspondiente al módulo solicitado
    let serieSubserie: TrdSerieSubserie | null = null;
    if (trd.series && trd.series.length > 0) {
      serieSubserie =
        trd.series.find((s) => s.modulo === modulo && s.activo) ||
        trd.series.find((s) => s.activo) ||
        trd.series[0];
    }

    return { trd, serieSubserie };
  }

  /**
   * Crear una nueva versión de TRD/TVD
   */
  async create(dto: CreateTrdDto): Promise<TrdConfiguracion> {
    const existe = await this.trdRepo.findOne({
      where: { version: dto.version.trim() },
    });
    if (existe) {
      throw new ConflictException(`Ya existe una TRD con la versión "${dto.version}"`);
    }

    if (dto.esVigente) {
      await this.trdRepo.update({}, { esVigente: false });
    }

    const trd = this.trdRepo.create({
      ...dto,
      version: dto.version.trim(),
      nombre: dto.nombre.trim(),
      fechaFin: dto.fechaFin ? dto.fechaFin : null,
      activo: dto.activo !== undefined ? dto.activo : true,
      esVigente: dto.esVigente !== undefined ? dto.esVigente : false,
    });

    return this.trdRepo.save(trd);
  }

  /**
   * Actualizar una versión existente de TRD
   */
  async update(id: number, dto: UpdateTrdDto): Promise<TrdConfiguracion> {
    const trd = await this.findById(id);

    if (dto.version && dto.version.trim() !== trd.version) {
      const existe = await this.trdRepo.findOne({
        where: { version: dto.version.trim() },
      });
      if (existe && existe.id !== id) {
        throw new ConflictException(`Ya existe una TRD con la versión "${dto.version}"`);
      }
      trd.version = dto.version.trim();
    }

    if (dto.esVigente && !trd.esVigente) {
      await this.trdRepo.update({}, { esVigente: false });
      trd.esVigente = true;
      trd.activo = true; // La vigente debe estar activa
    } else if (dto.esVigente === false) {
      trd.esVigente = false;
    }

    if (dto.nombre !== undefined) trd.nombre = dto.nombre.trim();
    if (dto.tipo !== undefined) trd.tipo = dto.tipo;
    if (dto.fechaInicio !== undefined) trd.fechaInicio = dto.fechaInicio;
    if (dto.fechaFin !== undefined) trd.fechaFin = dto.fechaFin ? dto.fechaFin : null;
    if (dto.actoAdministrativo !== undefined) trd.actoAdministrativo = dto.actoAdministrativo.trim();
    if (dto.convalidacionEstado !== undefined) trd.convalidacionEstado = dto.convalidacionEstado.trim();
    if (dto.descripcion !== undefined) trd.descripcion = dto.descripcion;
    if (dto.activo !== undefined) trd.activo = dto.activo;

    return this.trdRepo.save(trd);
  }

  /**
   * Alternar estado activo/inactivo de una TRD
   */
  async toggleActivo(id: number): Promise<TrdConfiguracion> {
    const trd = await this.findById(id);
    if (trd.esVigente && trd.activo) {
      throw new BadRequestException('No se puede desactivar la TRD marcada como vigente. Marque otra como vigente primero.');
    }
    trd.activo = !trd.activo;
    return this.trdRepo.save(trd);
  }

  /**
   * Marcar una TRD como la vigente oficial
   */
  async setVigente(id: number): Promise<TrdConfiguracion> {
    const trd = await this.findById(id);
    await this.trdRepo.update({}, { esVigente: false });
    trd.esVigente = true;
    trd.activo = true;
    return this.trdRepo.save(trd);
  }

  /**
   * Eliminar o desactivar una TRD
   */
  async delete(id: number): Promise<{ success: boolean; message: string }> {
    const trd = await this.findById(id);
    if (trd.esVigente) {
      throw new BadRequestException('No se puede eliminar la TRD vigente actual.');
    }
    await this.trdRepo.remove(trd);
    return { success: true, message: `TRD ${trd.version} eliminada correctamente` };
  }

  // ==========================================================================
  // GESTIÓN DE SERIES Y SUBSERIES ASOCIADAS
  // ==========================================================================

  /**
   * Agregar serie y subserie a una versión de TRD
   */
  async addSerie(
    trdId: number,
    dto: CreateTrdSerieSubserieDto,
  ): Promise<TrdSerieSubserie> {
    const trd = await this.findById(trdId);

    const serie = this.serieRepo.create({
      ...dto,
      trdId: trd.id,
      codigoDependencia: dto.codigoDependencia.trim(),
      nombreDependencia: (dto.nombreDependencia || 'OFICINA DE CONTROL INTERNO DISCIPLINARIO').trim(),
      codigoSerie: dto.codigoSerie.trim(),
      nombreSerie: dto.nombreSerie.trim(),
      codigoSubserie: dto.codigoSubserie.trim(),
      nombreSubserie: dto.nombreSubserie.trim(),
      codigoIdentificacionExpediente:
        dto.codigoIdentificacionExpediente ||
        `12_${dto.codigoDependencia.trim()}_${dto.codigoSerie.trim()}_${dto.codigoSubserie.trim()}`,
      modulo: (dto.modulo || 'control-disciplinario').trim(),
      activo: dto.activo !== undefined ? dto.activo : true,
    });

    return this.serieRepo.save(serie);
  }

  /**
   * Actualizar una serie/subserie existente
   */
  async updateSerie(
    serieId: number,
    dto: UpdateTrdSerieSubserieDto,
  ): Promise<TrdSerieSubserie> {
    const serie = await this.serieRepo.findOne({ where: { id: serieId } });
    if (!serie) {
      throw new NotFoundException(`Serie/Subserie con ID ${serieId} no encontrada`);
    }

    if (dto.codigoDependencia !== undefined) serie.codigoDependencia = dto.codigoDependencia.trim();
    if (dto.nombreDependencia !== undefined) serie.nombreDependencia = dto.nombreDependencia.trim();
    if (dto.codigoSerie !== undefined) serie.codigoSerie = dto.codigoSerie.trim();
    if (dto.nombreSerie !== undefined) serie.nombreSerie = dto.nombreSerie.trim();
    if (dto.codigoSubserie !== undefined) serie.codigoSubserie = dto.codigoSubserie.trim();
    if (dto.nombreSubserie !== undefined) serie.nombreSubserie = dto.nombreSubserie.trim();
    if (dto.modulo !== undefined) serie.modulo = dto.modulo.trim();
    if (dto.activo !== undefined) serie.activo = dto.activo;

    if (dto.codigoIdentificacionExpediente !== undefined) {
      serie.codigoIdentificacionExpediente = dto.codigoIdentificacionExpediente;
    } else if (dto.codigoDependencia || dto.codigoSerie || dto.codigoSubserie) {
      serie.codigoIdentificacionExpediente = `12_${serie.codigoDependencia}_${serie.codigoSerie}_${serie.codigoSubserie}`;
    }

    return this.serieRepo.save(serie);
  }

  /**
   * Alternar estado activo de una serie/subserie
   */
  async toggleSerieActivo(serieId: number): Promise<TrdSerieSubserie> {
    const serie = await this.serieRepo.findOne({ where: { id: serieId } });
    if (!serie) {
      throw new NotFoundException(`Serie/Subserie con ID ${serieId} no encontrada`);
    }
    serie.activo = !serie.activo;
    return this.serieRepo.save(serie);
  }

  /**
   * Eliminar una serie/subserie
   */
  async deleteSerie(serieId: number): Promise<{ success: boolean; message: string }> {
    const serie = await this.serieRepo.findOne({ where: { id: serieId } });
    if (!serie) {
      throw new NotFoundException(`Serie/Subserie con ID ${serieId} no encontrada`);
    }
    await this.serieRepo.remove(serie);
    return { success: true, message: 'Serie/Subserie eliminada correctamente' };
  }
}
