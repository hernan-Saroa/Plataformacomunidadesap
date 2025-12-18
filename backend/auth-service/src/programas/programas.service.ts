import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { ProgramaAcademico } from './programa.entity';
import { RegistroCalificado } from './registro-calificado.entity';
import { AcreditacionPrograma } from './acreditacion.entity';

export interface ProgramasFiltroDto {
  search?: string;
  nivelFormacion?: string;
  modalidad?: string;
  estado?: string;
  sedeId?: number;
  page?: number;
  limit?: number;
}

@Injectable()
export class ProgramasService {
  constructor(
    @InjectRepository(ProgramaAcademico)
    private readonly programaRepo: Repository<ProgramaAcademico>,
  ) {}

  async listarProgramas(filtros: ProgramasFiltroDto) {
    const {
      search,
      nivelFormacion,
      modalidad,
      estado,
      sedeId,
      page = 1,
      limit = 20,
    } = filtros;

    const where: any = {};

    if (nivelFormacion) where.nivelFormacion = nivelFormacion;
    if (modalidad) where.modalidad = modalidad;
    if (estado) where.estado = estado;
    if (sedeId) where.sede = { idSede: sedeId };

    if (search) {
      where.nombre = Like(`%${search}%`);
    }
    
    const [data, total] = await this.programaRepo.findAndCount({
      where,
      order: { nombre: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['registroCalificado', 'acreditaciones', 'sede'],
    });

    const today = new Date();

    const dataFiltered = data.map((p) => {
      const registroCalificadoVigente =
        p.registroCalificado &&
        new Date(p.registroCalificado.vigencia) > today
          ? p.registroCalificado
          : undefined;

      const acreditacionesVigentes =
        p.acreditaciones?.filter((a) => new Date(a.vigencia) > today) || [];

      return {
        ...p,
        registroCalificado: registroCalificadoVigente as RegistroCalificado | undefined,
        acreditaciones: acreditacionesVigentes as AcreditacionPrograma[],
      };
    });

    return {
      total,
      pagina: page,
      porPagina: limit,
      data: dataFiltered,
    };
  }
}
