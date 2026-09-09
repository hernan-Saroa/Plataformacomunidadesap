import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  DIAS_SEMANA, FranjaHorariaEntity, JORNADAS, TIPOS_SESION,
  type DiaSemana, type Jornada, type TipoSesion,
} from './franja-horaria.entity.js';
import {
  buscarSolapeIntraGrupo, esMultiploDeGranularidad, jornadaSugerida, aMinutos, seSolapan,
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

/** Franja con su contexto resuelto por el servidor (2.3). */
export interface FranjaConContexto {
  idFranja: string;
  idGrupo: string | null;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  tipoSesion: string;
  jornada: string | null;
  aulaCodigo: string | null;
  estado: string;
  numeroGrupo: number | null;
  asignatura: string | null;
  programa: string | null;
  docente: string | null;
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

  /**
   * TODAS las franjas, con programa, asignatura y docente YA RESUELTOS.
   *
   * Va con JOIN en el servidor y no con una consulta por fila desde el front:
   * una tabla de N franjas dispararía N peticiones.
   *
   * ⚠️ TODOS los vínculos son POR ID —grupo.id_asignatura, asignatura.id_programa,
   * asignacion_docente.id_docente— nunca por nombre. Emparejar por texto es donde
   * se han colado los tropiezos de este módulo.
   *
   * El docente sale de la asignación ASIGNADA del grupo; si el grupo no tiene
   * docente asignado, viene en null y el front muestra el vacío, no un invento.
   */
  async listarTodas(): Promise<FranjaConContexto[]> {
    return this.franjaRepo.query(
      `SELECT f.id_franja                       AS "idFranja",
              f.id_grupo::text                  AS "idGrupo",
              f.dia_semana                      AS "diaSemana",
              to_char(f.hora_inicio, 'HH24:MI')  AS "horaInicio",
              to_char(f.hora_fin, 'HH24:MI')    AS "horaFin",
              f.tipo_sesion                     AS "tipoSesion",
              f.jornada,
              f.aula_codigo                     AS "aulaCodigo",
              f.estado,
              g.numero_grupo                    AS "numeroGrupo",
              a.nombre                          AS "asignatura",
              pr.nombre                         AS "programa",
              per.nom_largo                     AS "docente"
         FROM "academic-schedule".franja_horaria f
         LEFT JOIN "academic-schedule".grupo g          ON g.id_grupo = f.id_grupo
         LEFT JOIN academic_work_plan.asignatura a      ON a.id       = g.id_asignatura
         LEFT JOIN academic_work_plan.programa pr       ON pr.id      = a.id_programa
         LEFT JOIN "academic-schedule".asignacion_docente ad
                ON ad.id_grupo = g.id_grupo AND ad.estado = 'ASIGNADO'
         LEFT JOIN auth.personas per                    ON per.id_person = ad.id_docente
        ORDER BY f.dia_semana ASC, f.hora_inicio ASC`,
    );
  }

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
        + `de ${String(choque.horaInicio).slice(0, 5)} a ${String(choque.horaFin).slice(0, 5)}.`,
      );
    }

    // EFDS-1374 — Bloqueo de AULA: un salón no aloja dos sesiones que se cruzan
    // en día y hora. El mensaje NO revela qué grupo lo ocupa (RN-07): otra
    // decanatura puede tener ahí una asignatura de posgrado que este programador
    // no debe ver. Solo se dice el aula, el día y la hora.
    if (dto.aulaCodigo) {
      const choqueAula = await this.buscarChoqueAula(
        dto.aulaCodigo, dto.diaSemana, dto.horaInicio, dto.horaFin,
      );
      if (choqueAula) {
        throw new BadRequestException(
          `El aula ${dto.aulaCodigo} ya está ocupada el ${dto.diaSemana.toLowerCase()} `
          + `de ${String(choqueAula.horaInicio).slice(0, 5)} a ${String(choqueAula.horaFin).slice(0, 5)}.`,
        );
      }
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

  /**
   * Busca una franja de OTRO grupo que ocupe la misma aula y se cruce en día y
   * hora. Transversal a todos los programas (RN-07). Devuelve la franja ocupada
   * para nombrar el día y la hora, nunca su grupo ni su asignatura.
   */
  private async buscarChoqueAula(
    aulaCodigo: string, diaSemana: string, horaInicio: string, horaFin: string, idFranjaExcluir?: string,
  ): Promise<{ horaInicio: string; horaFin: string } | null> {
    const mismas = await this.franjaRepo.find({
      where: { aulaCodigo, diaSemana: diaSemana as DiaSemana },
    });
    for (const f of mismas) {
      if (idFranjaExcluir && f.idFranja === idFranjaExcluir) continue;
      if (seSolapan(horaInicio, horaFin, f.horaInicio, f.horaFin)) {
        return { horaInicio: f.horaInicio, horaFin: f.horaFin };
      }
    }
    return null;
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
