import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EspacioFisico } from './espacio.entity.js';
import { CreateEspacioDto, UpdateEstadoEspacioDto } from './dto/create-espacio.dto.js';

@Injectable()
export class EspaciosService {
  constructor(
    @InjectRepository(EspacioFisico)
    private readonly espacioRepo: Repository<EspacioFisico>,
  ) {}

  async findAll(tipo?: string, estado?: string, idBloque?: string): Promise<EspacioFisico[]> {
    const query = this.espacioRepo.createQueryBuilder('espacio')
      .leftJoinAndSelect('espacio.bloque', 'bloque')
      .leftJoinAndSelect('bloque.sede', 'sede')
      .where('espacio.isActivo = :isActivo', { isActivo: true });

    if (tipo) {
      query.andWhere('espacio.tipo = :tipo', { tipo });
    }
    if (estado) {
      query.andWhere('espacio.estado = :estado', { estado });
    }
    if (idBloque) {
      query.andWhere('espacio.idBloque = :idBloque', { idBloque });
    }

    return query.orderBy('espacio.codigo', 'ASC').getMany();
  }

  async findById(id: string): Promise<EspacioFisico> {
    const espacio = await this.espacioRepo.findOne({
      where: { idEspacio: id },
      relations: ['bloque', 'bloque.sede'],
    });
    if (!espacio) {
      throw new NotFoundException(`Espacio con ID ${id} no encontrado`);
    }
    return espacio;
  }

  async create(dto: CreateEspacioDto): Promise<EspacioFisico> {
    const espacio = this.espacioRepo.create(dto);
    return this.espacioRepo.save(espacio);
  }

  async updateEstado(id: string, dto: UpdateEstadoEspacioDto): Promise<EspacioFisico> {
    const espacio = await this.findById(id);
    espacio.estado = dto.estado;
    return this.espacioRepo.save(espacio);
  }

  async getEstadisticas() {
    const total = await this.espacioRepo.count({ where: { isActivo: true } });
    const disponibles = await this.espacioRepo.count({ where: { isActivo: true, estado: 'DISPONIBLE' } });
    const enMantenimiento = await this.espacioRepo.count({ where: { isActivo: true, estado: 'MANTENIMIENTO' } });
    const reservadas = await this.espacioRepo.count({ where: { isActivo: true, estado: 'RESERVADO' } });

    return {
      total,
      disponibles,
      enMantenimiento,
      reservadas,
      porcentajeOcupacion: total > 0 ? Math.round(((total - disponibles) / total) * 100) : 0,
    };
  }
}
