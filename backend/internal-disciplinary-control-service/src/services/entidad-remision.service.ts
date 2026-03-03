import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntidadRemision } from '../entities/entidad-remision.entity';
import { CreateEntidadRemisionDto, UpdateEntidadRemisionDto } from '../dtos/entidad-remision.dto';

@Injectable()
export class EntidadRemisionService {
  constructor(
    @InjectRepository(EntidadRemision)
    private entidadRepo: Repository<EntidadRemision>,
  ) {}

  async findAll(): Promise<EntidadRemision[]> {
    // Verificar si hay entidades, si no, ejecutar seed automáticamente
    const count = await this.entidadRepo.count();
    if (count === 0) {
      await this.seed();
    }
    return this.entidadRepo.find({
      order: { nombre: 'ASC' },
    });
  }

  async findAllActivas(): Promise<EntidadRemision[]> {
    // Verificar si hay entidades, si no, ejecutar seed automáticamente
    const count = await this.entidadRepo.count();
    if (count === 0) {
      await this.seed();
    }
    return this.entidadRepo.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: string): Promise<EntidadRemision> {
    const entidad = await this.entidadRepo.findOne({ where: { id } });
    if (!entidad) {
      throw new NotFoundException(`Entidad de remisión con ID ${id} no encontrada`);
    }
    return entidad;
  }

  async create(dto: CreateEntidadRemisionDto): Promise<EntidadRemision> {
    const entidad = this.entidadRepo.create({
      ...dto,
      activo: true,
    });
    return this.entidadRepo.save(entidad);
  }

  async update(id: string, dto: UpdateEntidadRemisionDto): Promise<EntidadRemision> {
    const entidad = await this.findOne(id);
    Object.assign(entidad, dto);
    return this.entidadRepo.save(entidad);
  }

  async toggleActivo(id: string, activo: boolean): Promise<EntidadRemision> {
    const entidad = await this.findOne(id);
    entidad.activo = activo;
    return this.entidadRepo.save(entidad);
  }

  async remove(id: string): Promise<void> {
    const entidad = await this.findOne(id);
    await this.entidadRepo.remove(entidad);
  }

  async seed(): Promise<void> {
    const count = await this.entidadRepo.count();
    if (count === 0) {
      const entidadesDefault = [
        { nombre: 'Procuraduría General de la Nación', correo: 'contacto@procuraduria.gov.co', activo: true },
        { nombre: 'Contraloría General de la República', correo: 'info@contraloria.gov.co', activo: true },
        { nombre: 'Fiscalía General de la Nación', correo: 'denuncias@fiscalia.gov.co', activo: true },
        { nombre: 'Defensoría del Pueblo', correo: 'contacto@defensoria.gov.co', activo: true },
        { nombre: 'Personería Municipal', correo: 'info@personeria.gov.co', activo: true },
        { nombre: 'Otra Entidad Competente', correo: 'contacto@entidad.gov.co', activo: true },
      ];
      await this.entidadRepo.save(entidadesDefault);
    }
  }
}
