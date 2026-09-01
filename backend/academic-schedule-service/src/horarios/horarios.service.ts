import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  DIAS_SEMANA, FranjaHorariaEntity, JORNADAS, TIPOS_SESION,
  type DiaSemana, type Jornada, type TipoSesion,
} from './franja-horaria.entity.js';
import {
  buscarSolapeIntraGrupo, esMultiploDeGranularidad, jornadaSugerida, aMinutos,
} from './solapamiento.js';
import { GrupoEntity } from '../grupos/grupo.entity.js';

export interface CrearSesionDto {
  idGrupo: string;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
  tipoSesion?: TipoSesion;
  jornada?: Jornada;
  sedeCodigo?: string | null;
  aulaCodigo?: string | null;
}

export interface PeriodoGrupoDto {
  fechaInicio: string | null;
  fechaFin: string | null;
}

@Injectable()
export class HorariosService {
  constructor(
    @InjectRepository(FranjaHorariaEntity)
    private readonly franjaRepo: Repository<FranjaHorariaEntity>,
    @InjectRepository(GrupoEntity)
    private readonly grupoRepo: Repository<GrupoEntity>,
  ) {}

  listarPorGrupo(idGrupo: string): Promise<FranjaHorariaEntity[]> {
    return this.franjaRepo.find({
      where: { idGrupo },
      order: { diaSemana: 'ASC', horaInicio: 'ASC' },
    });
  }

  /** Valida forma y coherencia de la franja antes de tocar la base. */
  private validarForma(dto: CrearSesionDto): void {
    if (!DIAS_SEMANA.includes(dto.diaSemana)) {
      throw new BadRequestException(`El día debe ser uno de: ${DIAS_SEMANA.join(', ')}.`);
    }
    if (dto.tipoSesion && !TIPOS_SESION.includes(dto.tipoSesion)) {
      throw new BadRequestException("El tipo de sesión debe ser 'presencial' o 'mediada_tecnologia'.");
    }
    if (dto.jornada && !JORNADAS.includes(dto.jornada)) {
      throw new BadRequestException(`La jornada debe ser una de: ${JORNADAS.join(', ')}.`);
    }
    const ini = aMinutos(dto.horaInicio);
    const fin = aMinutos(dto.horaFin);
    if (!Number.isFinite(ini) || !Number.isFinite(fin)) {
      throw new BadRequestException('Las horas deben tener formato HH:MM.');
    }
    // Sin cruce de medianoche: no hay caso de uso y complica el solapamiento.
    if (fin <= ini) {
      throw new BadRequestException('La hora de fin debe ser posterior a la de inicio.');
    }
    if (!esMultiploDeGranularidad(dto.horaInicio) || !esMultiploDeGranularidad(dto.horaFin)) {
      throw new BadRequestException('Las horas deben ir en múltiplos de 5 minutos.');
    }
  }

  /**
   * Crea una sesión del grupo.
   *
   * Bloqueo duro solo INTRA-grupo: un grupo no puede dictarse dos veces a la vez.
   * El cruce entre grupos distintos se permite a propósito — es competencia del
   * bloqueo transversal de franjas (RN-07, EFDS-1374, fase 3).
   */
  async crearSesion(dto: CrearSesionDto): Promise<FranjaHorariaEntity> {
    this.validarForma(dto);

    const grupo = await this.grupoRepo.findOne({ where: { idGrupo: dto.idGrupo } });
    if (!grupo) throw new NotFoundException('El grupo no existe.');

    const existentes = await this.listarPorGrupo(dto.idGrupo);
    const choque = buscarSolapeIntraGrupo(dto, existentes);
    if (choque) {
      throw new BadRequestException(
        `La sesión se cruza con otra del mismo grupo el ${dto.diaSemana.toLowerCase()} `
        + `de ${choque.horaInicio} a ${choque.horaFin}.`,
      );
    }

    return this.franjaRepo.save(this.franjaRepo.create({
      idGrupo: dto.idGrupo,
      diaSemana: dto.diaSemana,
      horaInicio: dto.horaInicio,
      horaFin: dto.horaFin,
      // El tipo de sesión es del programador; jamás se deriva de la modalidad
      // de la asignatura, que es otro dato y de otra fuente.
      tipoSesion: dto.tipoSesion ?? 'presencial',
      jornada: dto.jornada ?? jornadaSugerida(dto.diaSemana, dto.horaInicio),
      sedeCodigo: dto.sedeCodigo ?? null,
      aulaCodigo: dto.aulaCodigo ?? null,
      estado: 'PROGRAMADO',
    }));
  }

  async eliminarSesion(idFranja: string): Promise<{ eliminado: true }> {
    const franja = await this.franjaRepo.findOne({ where: { idFranja } });
    if (!franja) throw new NotFoundException('Sesión no encontrada.');
    await this.franjaRepo.remove(franja);
    return { eliminado: true };
  }

  /** Periodo del ciclo de clases del grupo (AC-01). */
  async definirPeriodo(idGrupo: string, dto: PeriodoGrupoDto): Promise<GrupoEntity> {
    const grupo = await this.grupoRepo.findOne({ where: { idGrupo } });
    if (!grupo) throw new NotFoundException('El grupo no existe.');

    if (dto.fechaInicio && dto.fechaFin && new Date(dto.fechaFin) < new Date(dto.fechaInicio)) {
      throw new BadRequestException('La fecha de fin no puede ser anterior a la de inicio.');
    }
    (grupo as any).fechaInicio = dto.fechaInicio ?? null;
    (grupo as any).fechaFin = dto.fechaFin ?? null;
    return this.grupoRepo.save(grupo);
  }
}
