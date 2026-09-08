import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SolicitudMantenimiento } from './mantenimiento.entity.js';
import { CreateMantenimientoDto, UpdateMantenimientoEstadoDto } from './dto/create-mantenimiento.dto.js';

@Injectable()
export class MantenimientoService {
  constructor(
    @InjectRepository(SolicitudMantenimiento)
    private readonly mantenimientoRepo: Repository<SolicitudMantenimiento>,
  ) {}

  async findAll(estado?: string, prioridad?: string): Promise<SolicitudMantenimiento[]> {
    const query = this.mantenimientoRepo.createQueryBuilder('solicitud')
      .leftJoinAndSelect('solicitud.sede', 'sede')
      .leftJoinAndSelect('solicitud.espacio', 'espacio')
      .leftJoinAndSelect('espacio.bloque', 'bloque');

    if (estado) {
      query.andWhere('solicitud.estado = :estado', { estado });
    }
    if (prioridad) {
      query.andWhere('solicitud.prioridad = :prioridad', { prioridad });
    }

    return query.orderBy('solicitud.createdAt', 'DESC').getMany();
  }

  async findById(id: string): Promise<SolicitudMantenimiento> {
    const solicitud = await this.mantenimientoRepo.findOne({
      where: { idSolicitud: id },
      relations: ['sede', 'espacio', 'espacio.bloque'],
    });
    if (!solicitud) {
      throw new NotFoundException(`Solicitud de mantenimiento ${id} no encontrada`);
    }
    return solicitud;
  }

  async create(dto: CreateMantenimientoDto): Promise<SolicitudMantenimiento> {
    const count = await this.mantenimientoRepo.count();
    const consecutive = `MNT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const solicitud = this.mantenimientoRepo.create({
      ...dto,
      consecutivo: consecutive,
    });
    return this.mantenimientoRepo.save(solicitud);
  }

  async updateEstado(id: string, dto: UpdateMantenimientoEstadoDto): Promise<SolicitudMantenimiento> {
    const solicitud = await this.findById(id);
    solicitud.estado = dto.estado;
    if (dto.responsableAsignado) solicitud.responsableAsignado = dto.responsableAsignado;
    if (dto.observaciones) solicitud.observaciones = dto.observaciones;
    if (dto.fechaEjecucion) solicitud.fechaEjecucion = dto.fechaEjecucion;

    return this.mantenimientoRepo.save(solicitud);
  }
}
