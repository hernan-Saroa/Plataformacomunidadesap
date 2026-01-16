import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TableroKanban } from './entities/tablero-kanban.entity';
import { EtapaKanban } from './entities/etapa-kanban.entity';
import { CreateTableroKanbanDto } from './dto/create-tablero-kanban.dto';
import { UpdateTableroKanbanDto } from './dto/update-tablero-kanban.dto';
import { CreateEtapaKanbanDto } from './dto/create-etapa-kanban.dto';
import { UpdateEtapaKanbanDto } from './dto/update-etapa-kanban.dto';

@Injectable()
export class TablerosKanbanService {
  constructor(
    @InjectRepository(TableroKanban)
    private tableroRepository: Repository<TableroKanban>,
    @InjectRepository(EtapaKanban)
    private etapaRepository: Repository<EtapaKanban>,
  ) {}

  /**
   * Obtener todos los tableros
   */
  async findAll(includeInactive: boolean = false): Promise<TableroKanban[]> {
    const query = this.tableroRepository
      .createQueryBuilder('tablero')
      .leftJoinAndSelect('tablero.etapas', 'etapa')
      .where('tablero.deletedAt IS NULL')
      .orderBy('tablero.tipo', 'ASC')
      .addOrderBy('etapa.orden', 'ASC');

    if (!includeInactive) {
      query.andWhere('tablero.activo = :activo', { activo: true });
    }

    return query.getMany();
  }

  /**
   * Obtener un tablero por ID
   */
  async findOne(id: string): Promise<TableroKanban> {
    const tablero = await this.tableroRepository.findOne({
      where: { id },
      relations: ['etapas'],
      order: {
        etapas: {
          orden: 'ASC',
        },
      },
    });

    if (!tablero) {
      throw new NotFoundException(`Tablero con ID ${id} no encontrado`);
    }

    return tablero;
  }

  /**
   * Obtener tablero por tipo
   */
  async findByTipo(tipo: string): Promise<TableroKanban | null> {
    return this.tableroRepository.findOne({
      where: { tipo: tipo as any, activo: true },
      relations: ['etapas'],
      order: {
        etapas: {
          orden: 'ASC',
        },
      },
    });
  }

  /**
   * Crear un nuevo tablero
   */
  async create(createDto: CreateTableroKanbanDto): Promise<TableroKanban> {
    // Verificar si ya existe un tablero activo del mismo tipo
    const existe = await this.findByTipo(createDto.tipo);
    if (existe) {
      throw new ConflictException(
        `Ya existe un tablero activo del tipo ${createDto.tipo}`,
      );
    }

    // Crear el tablero
    const tablero = this.tableroRepository.create({
      nombre: createDto.nombre,
      descripcion: createDto.descripcion,
      tipo: createDto.tipo,
      activo: createDto.activo !== undefined ? createDto.activo : true,
    });

    const tableroGuardado = await this.tableroRepository.save(tablero);

    // Crear las etapas si vienen en el DTO
    if (createDto.etapas && createDto.etapas.length > 0) {
      const etapas = createDto.etapas.map((etapaDto) =>
        this.etapaRepository.create({
          tableroKanbanId: tableroGuardado.id,
          nombre: etapaDto.nombre,
          descripcion: etapaDto.descripcion,
          orden: etapaDto.orden,
          color: etapaDto.color,
          tiempoSLA: etapaDto.tiempoSLA,
          limiteWIP: etapaDto.limiteWIP ?? null,
          visible: etapaDto.visible !== undefined ? etapaDto.visible : true,
          notificarVencimiento:
            etapaDto.notificarVencimiento !== undefined
              ? etapaDto.notificarVencimiento
              : false,
          diasAnticipacionAlerta:
            etapaDto.diasAnticipacionAlerta !== undefined
              ? etapaDto.diasAnticipacionAlerta
              : 0,
          estado: etapaDto.estado,
          permitirRetroceso:
            etapaDto.permitirRetroceso !== undefined
              ? etapaDto.permitirRetroceso
              : false,
        }),
      );
      await this.etapaRepository.save(etapas);
    }

    return this.findOne(tableroGuardado.id);
  }

  /**
   * Actualizar un tablero
   */
  async update(
    id: string,
    updateDto: UpdateTableroKanbanDto,
  ): Promise<TableroKanban> {
    const tablero = await this.findOne(id);

    // Actualizar campos básicos
    if (updateDto.nombre !== undefined) tablero.nombre = updateDto.nombre;
    if (updateDto.descripcion !== undefined)
      tablero.descripcion = updateDto.descripcion;
    if (updateDto.tipo !== undefined) tablero.tipo = updateDto.tipo;
    if (updateDto.activo !== undefined) tablero.activo = updateDto.activo;

    await this.tableroRepository.save(tablero);

    // Si se actualizan las etapas, eliminar las anteriores y crear las nuevas
    if (updateDto.etapas !== undefined) {
      // Eliminar etapas existentes
      const etapasExistentes = await this.etapaRepository.find({
        where: { tableroKanbanId: id },
      });
      if (etapasExistentes.length > 0) {
        await this.etapaRepository.remove(etapasExistentes);
      }

      // Crear nuevas etapas
      if (updateDto.etapas.length > 0) {
        const etapas = updateDto.etapas.map((etapaDto) =>
          this.etapaRepository.create({
            tableroKanbanId: id,
            nombre: etapaDto.nombre,
            descripcion: etapaDto.descripcion,
            orden: etapaDto.orden,
            color: etapaDto.color,
            tiempoSLA: etapaDto.tiempoSLA,
            limiteWIP: etapaDto.limiteWIP ?? null,
            visible: etapaDto.visible !== undefined ? etapaDto.visible : true,
            notificarVencimiento:
              etapaDto.notificarVencimiento !== undefined
                ? etapaDto.notificarVencimiento
                : false,
            diasAnticipacionAlerta:
              etapaDto.diasAnticipacionAlerta !== undefined
                ? etapaDto.diasAnticipacionAlerta
                : 0,
            estado: etapaDto.estado,
            permitirRetroceso:
              etapaDto.permitirRetroceso !== undefined
                ? etapaDto.permitirRetroceso
                : false,
          }),
        );
        await this.etapaRepository.save(etapas);
      }
    }

    return this.findOne(id);
  }

  /**
   * Eliminar un tablero (soft delete)
   */
  async remove(id: string): Promise<void> {
    const tablero = await this.findOne(id);
    await this.tableroRepository.softDelete(id);
  }

  /**
   * Restaurar un tablero eliminado
   */
  async restore(id: string): Promise<TableroKanban> {
    await this.tableroRepository.restore(id);
    return this.findOne(id);
  }

  // ============================================
  // MÉTODOS PARA ETAPAS
  // ============================================

  /**
   * Crear una nueva etapa
   */
  async createEtapa(
    tableroId: string,
    createDto: CreateEtapaKanbanDto,
  ): Promise<EtapaKanban> {
    const tablero = await this.findOne(tableroId);

    const etapa = this.etapaRepository.create({
      tableroKanbanId: tablero.id,
      nombre: createDto.nombre,
      descripcion: createDto.descripcion,
      orden: createDto.orden,
      color: createDto.color,
      tiempoSLA: createDto.tiempoSLA,
      limiteWIP: createDto.limiteWIP ?? null,
      visible: createDto.visible !== undefined ? createDto.visible : true,
      notificarVencimiento:
        createDto.notificarVencimiento !== undefined
          ? createDto.notificarVencimiento
          : false,
      diasAnticipacionAlerta:
        createDto.diasAnticipacionAlerta !== undefined
          ? createDto.diasAnticipacionAlerta
          : 0,
      estado: createDto.estado,
      permitirRetroceso:
        createDto.permitirRetroceso !== undefined
          ? createDto.permitirRetroceso
          : false,
    });

    return this.etapaRepository.save(etapa);
  }

  /**
   * Actualizar una etapa
   */
  async updateEtapa(
    tableroId: string,
    etapaId: string,
    updateDto: UpdateEtapaKanbanDto,
  ): Promise<EtapaKanban> {
    const etapa = await this.etapaRepository.findOne({
      where: { id: etapaId, tableroKanbanId: tableroId },
    });

    if (!etapa) {
      throw new NotFoundException(
        `Etapa con ID ${etapaId} no encontrada en el tablero ${tableroId}`,
      );
    }

    // Actualizar campos
    if (updateDto.nombre !== undefined) etapa.nombre = updateDto.nombre;
    if (updateDto.descripcion !== undefined)
      etapa.descripcion = updateDto.descripcion;
    if (updateDto.orden !== undefined) etapa.orden = updateDto.orden;
    if (updateDto.color !== undefined) etapa.color = updateDto.color;
    if (updateDto.tiempoSLA !== undefined) etapa.tiempoSLA = updateDto.tiempoSLA;
    if (updateDto.limiteWIP !== undefined)
      etapa.limiteWIP = updateDto.limiteWIP ?? null;
    if (updateDto.visible !== undefined) etapa.visible = updateDto.visible;
    if (updateDto.notificarVencimiento !== undefined)
      etapa.notificarVencimiento = updateDto.notificarVencimiento;
    if (updateDto.diasAnticipacionAlerta !== undefined)
      etapa.diasAnticipacionAlerta = updateDto.diasAnticipacionAlerta;
    if (updateDto.estado !== undefined) etapa.estado = updateDto.estado;
    if (updateDto.permitirRetroceso !== undefined)
      etapa.permitirRetroceso = updateDto.permitirRetroceso;

    return this.etapaRepository.save(etapa);
  }

  /**
   * Eliminar una etapa
   */
  async removeEtapa(tableroId: string, etapaId: string): Promise<void> {
    const etapa = await this.etapaRepository.findOne({
      where: { id: etapaId, tableroKanbanId: tableroId },
    });

    if (!etapa) {
      throw new NotFoundException(
        `Etapa con ID ${etapaId} no encontrada en el tablero ${tableroId}`,
      );
    }

    await this.etapaRepository.softDelete(etapaId);
  }

  /**
   * Reordenar etapas
   */
  async reordenarEtapas(
    tableroId: string,
    etapasIds: string[],
  ): Promise<EtapaKanban[]> {
    const etapas = await this.etapaRepository.find({
      where: { tableroKanbanId: tableroId },
    });

    // Actualizar el orden de cada etapa
    etapasIds.forEach((etapaId, index) => {
      const etapa = etapas.find((e) => e.id === etapaId);
      if (etapa) {
        etapa.orden = index + 1;
      }
    });

    await this.etapaRepository.save(etapas);
    return this.etapaRepository.find({
      where: { tableroKanbanId: tableroId },
      order: { orden: 'ASC' },
    });
  }
}

