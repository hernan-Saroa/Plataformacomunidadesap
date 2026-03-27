import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoRemision } from '../entities/tipo-remision.entity';
import {
  CreateTipoRemisionDto,
  UpdateTipoRemisionDto,
} from '../dtos/tipo-remision.dto';

@Injectable()
export class TipoRemisionService {
  constructor(
    @InjectRepository(TipoRemision)
    private tipoRemisionRepo: Repository<TipoRemision>,
  ) {}

  async findAll(): Promise<TipoRemision[]> {
    const count = await this.tipoRemisionRepo.count();
    if (count === 0) {
      await this.seed();
    }
    return this.tipoRemisionRepo.find({
      order: { orden: 'ASC', nombre: 'ASC' },
    });
  }

  async findAllActivas(): Promise<TipoRemision[]> {
    const count = await this.tipoRemisionRepo.count();
    if (count === 0) {
      await this.seed();
    }
    return this.tipoRemisionRepo.find({
      where: { activo: true },
      order: { orden: 'ASC', nombre: 'ASC' },
    });
  }

  async findOne(id: string): Promise<TipoRemision> {
    const tipo = await this.tipoRemisionRepo.findOne({ where: { id } });
    if (!tipo) {
      throw new NotFoundException(
        `Tipo de remisión con ID ${id} no encontrado`,
      );
    }
    return tipo;
  }

  async create(dto: CreateTipoRemisionDto): Promise<TipoRemision> {
    const tipo = this.tipoRemisionRepo.create({
      ...dto,
      activo: true,
    });
    return this.tipoRemisionRepo.save(tipo);
  }

  async update(id: string, dto: UpdateTipoRemisionDto): Promise<TipoRemision> {
    const tipo = await this.findOne(id);
    const { id: _id, ...rest } = dto;
    void _id;
    Object.assign(tipo, rest);
    return this.tipoRemisionRepo.save(tipo);
  }

  async toggleActivo(id: string, activo: boolean): Promise<TipoRemision> {
    const tipo = await this.findOne(id);
    tipo.activo = activo;
    return this.tipoRemisionRepo.save(tipo);
  }

  async remove(id: string): Promise<void> {
    const tipo = await this.findOne(id);
    await this.tipoRemisionRepo.remove(tipo);
  }

  async seed(): Promise<void> {
    const count = await this.tipoRemisionRepo.count();
    if (count === 0) {
      const tiposDefault = [
        {
          codigo: 'sin-competencia',
          nombre: 'Sin competencia disciplinaria',
          descripcion:
            'La noticia no corresponde a la competencia disciplinaria de la entidad',
          activo: true,
          orden: 1,
        },
        {
          codigo: 'factor-territorial',
          nombre: 'Por factor territorial',
          descripcion:
            'Remisión por competencia territorial del servidor público',
          activo: true,
          orden: 2,
        },
        {
          codigo: 'factor-funcional',
          nombre: 'Por factor funcional (servidor de otra entidad)',
          descripcion:
            'Remisión por factor funcional cuando el servidor pertenece a otra entidad',
          activo: true,
          orden: 3,
        },
        {
          codigo: 'naturaleza-falta',
          nombre: 'Por naturaleza de la falta (penal, fiscal)',
          descripcion:
            'Remisión cuando la falta tiene naturaleza penal o fiscal',
          activo: true,
          orden: 4,
        },
        {
          codigo: 'prelacion-competencia',
          nombre: 'Por prelacion de competencia (Procuraduría)',
          descripcion:
            'Remisión por prelación de competencia a la Procuraduría General de la Nación',
          activo: true,
          orden: 5,
        },
      ];
      await this.tipoRemisionRepo.save(tiposDefault);
    }
  }
}
