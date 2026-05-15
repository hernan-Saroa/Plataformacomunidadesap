import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asignatura } from '../programas/asignatura.entity';

@Injectable()
export class AsignaturasService {
  constructor(
    @InjectRepository(Asignatura)
    private readonly asignaturaRepo: Repository<Asignatura>,
  ) {}

  async listar(filtros: any = {}) {
    const query = this.asignaturaRepo.createQueryBuilder('asignatura');

    if (filtros.search) {
      query.andWhere('(asignatura.nombre ILIKE :search OR asignatura.codigo ILIKE :search)', {
        search: `%${filtros.search}%`,
      });
    }

    if (filtros.programa_id) {
      query.andWhere('asignatura.programaId = :programa_id', { programa_id: filtros.programa_id });
    }

    if (filtros.nucleo) {
      query.andWhere('asignatura.nucleoTematico ILIKE :nucleo', { nucleo: `%${filtros.nucleo}%` });
    }



    if (filtros.semestre) {
      query.andWhere('asignatura.semestre = :semestre', { semestre: filtros.semestre.toString() });
    }

    const page = filtros.page || 1;
    const limit = filtros.limit || 50;
    const offset = (page - 1) * limit;

    query.skip(offset).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      pagina: page,
      porPagina: limit,
    };
  }

  async obtener(id: string) {
    return this.asignaturaRepo.findOne({ where: { id } });
  }

  async crear(asignatura: any) {
    const newAsignatura = this.asignaturaRepo.create(asignatura);
    return this.asignaturaRepo.save(newAsignatura);
  }

  async actualizar(id: string, asignatura: any) {
    await this.asignaturaRepo.update(id, asignatura);
    return this.asignaturaRepo.findOne({ where: { id } });
  }

  async eliminar(id: string) {
    return this.asignaturaRepo.delete(id);
  }
}