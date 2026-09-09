import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { GrupoEntity } from './grupo.entity.js';
import { siguienteNumeroGrupo } from './numeracion-grupo.js';
import { AsignaturaCatalogoEntity } from '../catalogo/entities/asignatura.readonly.entity.js';

export interface CrearGrupoDto {
  idAsignatura: string;
  idPeriodo?: string | null;
  idDocente?: string | null;
  cupoMaximo?: number;
  observaciones?: string | null;
  /** Cantidad de grupos a crear de una vez (AC-01). Por defecto 1. */
  cantidad?: number;
}

export interface ActualizarGrupoDto {
  idDocente?: string | null;
  cupoMaximo?: number;
  estado?: string;
  observaciones?: string | null;
}

@Injectable()
export class GruposService {
  constructor(
    @InjectRepository(GrupoEntity)
    private readonly grupoRepo: Repository<GrupoEntity>,
    @InjectRepository(AsignaturaCatalogoEntity)
    private readonly asignaturaRepo: Repository<AsignaturaCatalogoEntity>,
  ) {}

  /**
   * Crea uno o varios grupos para una asignatura (AC-01).
   *
   * Los números se calculan sobre los ya existentes en (asignatura, periodo)
   * usando la estrategia aislada, de modo que la regla de numeración pueda
   * cambiar sin tocar este método (B-4).
   */
  async crear(dto: CrearGrupoDto): Promise<GrupoEntity[]> {
    const cantidad = Number(dto.cantidad ?? 1);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 20) {
      throw new BadRequestException('La cantidad de grupos debe ser un entero entre 1 y 20.');
    }

    // La asignatura es del catálogo: se valida su existencia antes de crear, para
    // dar un error legible en vez de dejar que reviente la FK.
    const asignatura = await this.asignaturaRepo.findOne({
      where: { id: String(dto.idAsignatura) },
    });
    if (!asignatura) throw new NotFoundException('La asignatura no existe en el catálogo.');

    const existentes = await this.grupoRepo.find({
      where: { idAsignatura: String(dto.idAsignatura), idPeriodo: (dto.idPeriodo ?? null) as any },
      select: ['numeroGrupo'],
    });
    const numeros = existentes.map((g) => g.numeroGrupo);

    const creados: GrupoEntity[] = [];
    for (let i = 0; i < cantidad; i += 1) {
      const numero = siguienteNumeroGrupo(numeros);
      numeros.push(numero);
      creados.push(
        this.grupoRepo.create({
          idAsignatura: String(dto.idAsignatura),
          idPeriodo: dto.idPeriodo ?? null,
          numeroGrupo: numero,
          idDocente: dto.idDocente ?? null,
          cupoMaximo: dto.cupoMaximo ?? 30,
          // Explícito, no heredado del default de columna: así el estado inicial
          // no depende de la semántica de create() del ORM.
          estado: 'PROGRAMADO',
          observaciones: dto.observaciones ?? null,
        }),
      );
    }
    return this.grupoRepo.save(creados);
  }

  /** Grupos de una asignatura, en orden de numeración. */
  listarPorAsignatura(idAsignatura: string): Promise<GrupoEntity[]> {
    return this.grupoRepo.find({
      where: { idAsignatura: String(idAsignatura) },
      order: { numeroGrupo: 'ASC' },
    });
  }

  async obtener(idGrupo: string): Promise<GrupoEntity> {
    const grupo = await this.grupoRepo.findOne({ where: { idGrupo } });
    if (!grupo) throw new NotFoundException('Grupo no encontrado.');
    return grupo;
  }

  /**
   * Actualiza SOLO los campos propios del grupo (AC-02: aislamiento).
   *
   * No se permite mover un grupo de asignatura ni renumerarlo: eso cambiaría la
   * identidad de una oferta ya publicada. `id_asignatura` y `numero_grupo` no
   * son editables por diseño.
   */
  async actualizar(idGrupo: string, dto: ActualizarGrupoDto): Promise<GrupoEntity> {
    const grupo = await this.obtener(idGrupo);
    if (dto.idDocente !== undefined) grupo.idDocente = dto.idDocente;
    if (dto.cupoMaximo !== undefined) {
      if (!Number.isInteger(dto.cupoMaximo) || dto.cupoMaximo < 1) {
        throw new BadRequestException('El cupo máximo debe ser un entero positivo.');
      }
      grupo.cupoMaximo = dto.cupoMaximo;
    }
    if (dto.estado !== undefined) grupo.estado = dto.estado;
    if (dto.observaciones !== undefined) grupo.observaciones = dto.observaciones;
    return this.grupoRepo.save(grupo);
  }

  /** Elimina el grupo. Sus franjas caen con él (ON DELETE CASCADE): son suyas. */
  async eliminar(idGrupo: string): Promise<{ eliminado: true }> {
    const grupo = await this.obtener(idGrupo);
    await this.grupoRepo.remove(grupo);
    return { eliminado: true };
  }
}
