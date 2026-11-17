import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  DIAS_SEMANA, FranjaHorariaEntity, JORNADAS, TIPOS_SESION,
  type DiaSemana, type Jornada, type TipoSesion,
} from './franja-horaria.entity.js';
import {
  buscarSolapeIntraGrupo, esMultiploDeGranularidad, jornadaSugerida, aMinutos,
} from './solapamiento.js';
import { buscarChoque, cargarFranjasCruceables, cicloDelGrupo } from './choque.js';
import { esSinAula, GrupoEntity } from '../grupos/grupo.entity.js';
import { exigirAulaDeLaOferta } from '../grupos/oferta-cetap.js';
import { condicionNivelSql, type NivelAcademico } from '../catalogo/nivel-academico.js';
import { condicionPeriodoGrupo, parsearPeriodo } from '../periodos/periodo-ref.js';

/**
 * Margen del tope de horas del grupo (§1.3). Se publica solo si las horas
 * programadas no superan las requeridas por el catálogo en más de un 30%. Vive en
 * `horas-grupo.ts`, con el cálculo único de las horas del grupo.
 */
export { FACTOR_TOPE_HORAS } from './horas-grupo.js';
import { horasDelGrupo } from './horas-grupo.js';

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
  /** Ciclo del grupo: lo necesita el detalle que abre la flecha de Acción. */
  fechaInicioGrupo: string | null;
  fechaFinGrupo: string | null;
  asignatura: string | null;
  programa: string | null;
  docente: string | null;
  /**
   * Periodo de la franja, vía su grupo: el de plataforma si el grupo ya lo
   * tiene (EFDS-2328), si no el legado. Null = sin periodo.
   */
  idPeriodo: string | null;
  periodoCodigo: string | null;
  /** Oferta del grupo en el periodo de plataforma; null en grupos legado. */
  tipoOferta: string | null;
}

export interface PeriodoGrupoDto {
  fechaInicio: string | null;
  fechaFin: string | null;
}

@Injectable()
export class HorariosService {
  private readonly logger = new Logger(HorariosService.name);

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
   * franja_horaria.id_docente— nunca por nombre. Emparejar por texto es donde
   * se han colado los tropiezos de este módulo.
   *
   * El docente sale de la FRANJA (registro único): desde EFDS-2341 un grupo puede
   * tener un docente distinto por franja. Sin docente viene en null y el front
   * muestra el vacío, no un invento.
   */
  /**
   * @param idPeriodo si viene, acota a las franjas de ESE periodo (vía
   * grupo.id_periodo). Es lo que permite que cada vista del módulo pertenezca al
   * periodo seleccionado en la cabecera: sin él, la tabla mezclaba periodos.
   */
  /**
   * Programación General. `niveles` son los que el usuario puede programar: el
   * filtro es del SERVIDOR (EFDS-2302); antes devolvía todas las franjas y el
   * programador de posgrado veía las de pregrado.
   */
  async listarTodas(idPeriodo: string | undefined, niveles: readonly NivelAcademico[]): Promise<FranjaConContexto[]> {
    // El periodo puede ser de plataforma o legado (EFDS-2328); un id que no es de
    // ninguno no devuelve nada, en vez de devolverlo todo.
    const ref = idPeriodo ? parsearPeriodo(idPeriodo) : null;
    if (idPeriodo && !ref) return [];
    const params: unknown[] = ref ? [ref.id] : [];
    const nivel = condicionNivelSql('pr.tipo', niveles, params.length + 1);
    params.push(...nivel.params);
    const filtro = `WHERE ${nivel.sql}${ref ? ' AND ' + condicionPeriodoGrupo('g', ref, 1) : ''}`;
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
              g.fecha_inicio::text              AS "fechaInicioGrupo",
              g.fecha_fin::text                 AS "fechaFinGrupo",
              COALESCE(g.id_periodo_academico::text, g.id_periodo::text) AS "idPeriodo",
              COALESCE(pa.codigo, pp.codigo)    AS "periodoCodigo",
              g.tipo_oferta                     AS "tipoOferta",
              a.nombre                          AS "asignatura",
              pr.nombre                         AS "programa",
              per.nom_largo                     AS "docente"
         FROM "academic-schedule".franja_horaria f
         LEFT JOIN "academic-schedule".grupo g          ON g.id_grupo = f.id_grupo
         LEFT JOIN "academic-schedule".periodo_programacion pp ON pp.id_periodo = g.id_periodo
         LEFT JOIN academic_work_plan.periodo_academico pa      ON pa.id = g.id_periodo_academico
         LEFT JOIN academic_work_plan.asignatura a      ON a.id       = g.id_asignatura
         LEFT JOIN academic_work_plan.programa pr       ON pr.id      = a.id_programa
         LEFT JOIN auth.personas per                    ON per.id_person = f.id_docente
        ${filtro}
        ORDER BY f.dia_semana ASC, f.hora_inicio ASC`,
      params.length ? params : undefined,
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
  private async validarSesion(dto: CrearSesionDto, idFranjaExcluir?: string): Promise<CrearSesionDto> {
    this.validarForma(dto);

    const grupo = await this.grupoRepo.findOne({ where: { idGrupo: dto.idGrupo } });
    if (!grupo) throw new NotFoundException('El grupo no existe.');
    // Grupo virtual (063): sus sesiones son mediadas por tecnología y no llevan aula.
    if (esSinAula(grupo.modalidad)) {
      if ((dto.tipoSesion && dto.tipoSesion !== 'mediada_tecnologia') || dto.aulaCodigo) {
        throw new BadRequestException(`El grupo es ${grupo.modalidad === 'distancia' ? 'a distancia' : 'virtual'}: sus sesiones son mediadas por tecnología y sin aula.`);
      }
      dto = { ...dto, tipoSesion: 'mediada_tecnologia', aulaCodigo: null, sedeCodigo: null };
    }

    const existentes = (await this.listarPorGrupo(dto.idGrupo)).filter((f) => f.idFranja !== idFranjaExcluir);
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
    // EFDS-2315: una sesión presencial con aula se dicta en el CETAP de la oferta del grupo.
    await exigirAulaDeLaOferta(this.franjaRepo.manager, dto.idGrupo, dto.aulaCodigo, dto.tipoSesion);
    if (dto.aulaCodigo) {
      const choqueAula = await this.buscarChoqueAula(
        dto.idGrupo, dto.aulaCodigo, dto.diaSemana, dto.horaInicio, dto.horaFin, idFranjaExcluir,
      );
      if (choqueAula) {
        throw new BadRequestException(
          `El aula ${dto.aulaCodigo} ya está ocupada el ${dto.diaSemana.toLowerCase()} `
          + `de ${String(choqueAula.horaInicio).slice(0, 5)} a ${String(choqueAula.horaFin).slice(0, 5)}.`,
        );
      }
    }

    return dto;
  }

  async crearSesion(dto: CrearSesionDto): Promise<FranjaHorariaEntity> {
    dto = await this.validarSesion(dto);

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
   * Busca una franja que ocupe la misma aula y CHOQUE con la propuesta según la regla
   * única (`choque.ts`): mismo día, horas solapadas y ciclos de clases solapados. El
   * ciclo de la propuesta es el de su grupo, o el de su periodo si el grupo no tiene. Una
   * franja del mismo aula en otro periodo (otras fechas) NO ocupa el salón.
   * Transversal a todos los programas (RN-07). Devuelve la franja ocupada para nombrar
   * el día y la hora, nunca su grupo ni su asignatura.
   */
  private async buscarChoqueAula(
    idGrupo: string, aulaCodigo: string, diaSemana: string, horaInicio: string, horaFin: string,
    idFranjaExcluir?: string,
  ): Promise<{ horaInicio: string; horaFin: string } | null> {
    const manager = this.franjaRepo.manager;
    const ciclo = await cicloDelGrupo(manager, idGrupo);
    const mismas = await cargarFranjasCruceables(
      manager, 'f.aula_codigo = $1 AND f.dia_semana = $2', [aulaCodigo, diaSemana],
    );
    const choque = buscarChoque(
      { diaSemana, horaInicio, horaFin, ...ciclo },
      mismas,
      (f) => !!idFranjaExcluir && f.idFranja === idFranjaExcluir,
    );
    return choque ? { horaInicio: choque.horaInicio, horaFin: choque.horaFin } : null;
  }

  // ── EFDS-2432 · editar y eliminar una sesión, con reglas por estado ─────────────────────────────

  /**
   * ¿Qué tiene encima la franja? Estado de la propia franja y concertación que la incluye.
   * Reglas (§38.3, aprobadas por Tomás):
   *   · PROGRAMADO / DEVUELTA / PUBLICADA sin docente ........... libre
   *   · TOMADA (un docente la tiene) ............................ 409 FRANJA_TOMADA salvo confirmarDevolucion
   *   · en concertación ENVIADA / REVISADA / POR_ACEPTAR ........ 409 EN_CONCERTACION salvo confirmarDevolucion
   *   · APROBADA o concertación ACEPTADA / APROBADA ............. 409 CONCERTACION_ACEPTADA (no se fuerza)
   */
  private async evaluarEstadoFranja(m: Pick<Repository<any>['manager'], 'query'>, f: FranjaHorariaEntity): Promise<{
    bloqueo: null | { code: 'CONCERTACION_ACEPTADA' | 'EN_CONCERTACION' | 'FRANJA_TOMADA'; message: string; confirmable: boolean };
    concertacion: null | { id: string; docente: string | null; estado: string };
    idDocente: string | null;
  }> {
    const idDocente: string | null = (await m.query(`SELECT id_docente::text AS id FROM "academic-schedule".franja_horaria WHERE id_franja = $1`, [f.idFranja]))[0]?.id ?? null;
    const conc: Array<{ id: string; estado: string; docente: string | null }> = await m.query(
      `SELECT c.id_concertacion::text AS id, c.estado, p.nom_largo AS docente
         FROM "academic-schedule".concertacion_docencia c
         LEFT JOIN auth.personas p ON p.id_person = c.id_docente
        WHERE c.franjas @> $1::jsonb AND c.estado IN ('ENVIADA', 'REVISADA', 'POR_ACEPTAR', 'ACEPTADA', 'APROBADA')
        ORDER BY c.updated_at DESC LIMIT 1`,
      [JSON.stringify([{ idFranja: f.idFranja }])]);
    const c = conc[0] ?? null;
    const concertacion = c ? { id: c.id, docente: c.docente ?? null, estado: c.estado } : null;
    if (f.estado === 'APROBADA' || (c && ['ACEPTADA', 'APROBADA'].includes(c.estado))) {
      return { idDocente, concertacion, bloqueo: { code: 'CONCERTACION_ACEPTADA', confirmable: false,
        message: 'La sesión ya está aprobada en una concertación aceptada (aplicada al PTA): no se modifica. Reabra la concertación antes de cambiarla.' } };
    }
    if (c) {
      return { idDocente, concertacion, bloqueo: { code: 'EN_CONCERTACION', confirmable: true,
        message: `La sesión está en una concertación ${c.estado}${c.docente ? ` de ${c.docente}` : ''}. Si continúa, la concertación se devuelve al programador.` } };
    }
    if (f.estado === 'TOMADA' && idDocente) {
      return { idDocente, concertacion: null, bloqueo: { code: 'FRANJA_TOMADA', confirmable: true,
        message: 'Un docente tiene esta sesión. Si continúa, la sesión queda sin docente y hay que asignarla de nuevo.' } };
    }
    return { idDocente, concertacion: null, bloqueo: null };
  }

  /**
   * Aplica los efectos de «confirmar la devolución» dentro de la transacción: la concertación pasa a DEVUELTA
   * (con comentario automático e historial) o la franja queda sin docente. Devuelve el id de la concertación.
   */
  private async aplicarDevolucion(
    m: Pick<Repository<any>['manager'], 'query'>, f: FranjaHorariaEntity,
    ev: Awaited<ReturnType<HorariosService['evaluarEstadoFranja']>>, motivo: string, idUser: string | null,
  ): Promise<string | null> {
    let devuelta: string | null = null;
    if (ev.concertacion && ev.bloqueo?.code === 'EN_CONCERTACION') {
      const antes = ev.concertacion.estado;
      await m.query(
        `UPDATE "academic-schedule".concertacion_docencia SET estado = 'DEVUELTA', comentario = $2, updated_at = NOW() WHERE id_concertacion = $1`,
        [ev.concertacion.id, motivo]);
      if (idUser) {
        await m.query(
          `INSERT INTO "academic-schedule".concertacion_historial (id_concertacion, accion, estado_anterior, estado_nuevo, id_user, comentario)
           VALUES ($1, 'DEVOLVER', $2, 'DEVUELTA', $3, $4)`, [ev.concertacion.id, antes, idUser, motivo]);
      }
      devuelta = ev.concertacion.id;
    }
    if (ev.idDocente && f.idGrupo) {
      // Esta sesión queda sin docente; el grupo deja de tener «un docente» (asignacion_docente) porque ya no es de uno solo.
      await m.query(`UPDATE "academic-schedule".franja_horaria SET id_docente = NULL, estado = 'PROGRAMADO', updated_at = NOW() WHERE id_franja = $1`, [f.idFranja]);
      await m.query(`DELETE FROM "academic-schedule".asignacion_docente WHERE id_grupo = $1`, [f.idGrupo]);
    }
    return devuelta;
  }

  private async horasDe(idGrupo: string | null) { return idGrupo ? this.horasGrupo(idGrupo) : null; }

  /** PATCH — cambia día, horas, tipo o aula de UNA sesión, con las mismas validaciones que crear. */
  async actualizarSesion(
    idFranja: string,
    cambios: Partial<Pick<CrearSesionDto, 'diaSemana' | 'horaInicio' | 'horaFin' | 'tipoSesion' | 'aulaCodigo'>> & { confirmarDevolucion?: boolean },
    actor: { idUser: string | null } = { idUser: null },
  ) {
    const franja = await this.franjaRepo.findOne({ where: { idFranja } });
    if (!franja) throw new NotFoundException('Sesión no encontrada.');
    if (!franja.idGrupo) throw new BadRequestException('La sesión no pertenece a un grupo.');
    const anterior = { diaSemana: franja.diaSemana, horaInicio: String(franja.horaInicio).slice(0, 5), horaFin: String(franja.horaFin).slice(0, 5), tipoSesion: franja.tipoSesion, aulaCodigo: franja.aulaCodigo };
    const pedido: CrearSesionDto = {
      idGrupo: franja.idGrupo,
      diaSemana: (cambios.diaSemana ?? franja.diaSemana) as DiaSemana,
      horaInicio: String(cambios.horaInicio ?? franja.horaInicio).slice(0, 5),
      horaFin: String(cambios.horaFin ?? franja.horaFin).slice(0, 5),
      tipoSesion: (cambios.tipoSesion ?? franja.tipoSesion) as TipoSesion,
      aulaCodigo: cambios.aulaCodigo === undefined ? franja.aulaCodigo : (cambios.aulaCodigo || null),
      sedeCodigo: franja.sedeCodigo ?? null,
    };
    // Pasar a mediada por tecnología quita el aula (el aula solo aplica a presencial).
    if (pedido.tipoSesion === 'mediada_tecnologia') pedido.aulaCodigo = null;
    const dto = await this.validarSesion(pedido, idFranja);

    const ev = await this.evaluarEstadoFranja(this.franjaRepo.manager, franja);
    if (ev.bloqueo && (!ev.bloqueo.confirmable || cambios.confirmarDevolucion !== true)) {
      throw new ConflictException({ statusCode: 409, code: ev.bloqueo.code, message: ev.bloqueo.message, concertacion: ev.concertacion });
    }
    let concertacionDevuelta: string | null = null;
    const guardada = await this.franjaRepo.manager.transaction(async (m) => {
      if (ev.bloqueo) {
        concertacionDevuelta = await this.aplicarDevolucion(m, franja, ev,
          `La programación cambió: se modificó una sesión (${anterior.diaSemana.toLowerCase()} ${anterior.horaInicio}-${anterior.horaFin}). Revise y reenvíe.`, actor.idUser);
      }
      await m.query(
        `UPDATE "academic-schedule".franja_horaria
            SET dia_semana = $2, hora_inicio = $3, hora_fin = $4, tipo_sesion = $5, aula_codigo = $6, jornada = $7, updated_at = NOW()
          WHERE id_franja = $1`,
        [idFranja, dto.diaSemana, dto.horaInicio, dto.horaFin, dto.tipoSesion ?? 'presencial', dto.aulaCodigo ?? null,
          jornadaSugerida(dto.diaSemana, dto.horaInicio)]);
      return (await m.query(`SELECT * FROM "academic-schedule".franja_horaria WHERE id_franja = $1`, [idFranja]))[0];
    });
    await this.auditar('actualizar_sesion', idFranja, actor.idUser, anterior,
      { diaSemana: dto.diaSemana, horaInicio: dto.horaInicio, horaFin: dto.horaFin, tipoSesion: dto.tipoSesion, aulaCodigo: dto.aulaCodigo ?? null, concertacionDevuelta, confirmoDevolucion: !!ev.bloqueo });
    return { franja: guardada, horas: await this.horasDe(franja.idGrupo), concertacionDevuelta };
  }

  /** DELETE — elimina UNA sesión con las mismas reglas por estado que editar. */
  async eliminarSesion(idFranja: string, opciones: { confirmarDevolucion?: boolean } = {}, actor: { idUser: string | null } = { idUser: null }) {
    const franja = await this.franjaRepo.findOne({ where: { idFranja } });
    if (!franja) throw new NotFoundException('Sesión no encontrada.');
    const anterior = { diaSemana: franja.diaSemana, horaInicio: String(franja.horaInicio).slice(0, 5), horaFin: String(franja.horaFin).slice(0, 5), tipoSesion: franja.tipoSesion, aulaCodigo: franja.aulaCodigo };
    const ev = await this.evaluarEstadoFranja(this.franjaRepo.manager, franja);
    if (ev.bloqueo && (!ev.bloqueo.confirmable || opciones.confirmarDevolucion !== true)) {
      throw new ConflictException({ statusCode: 409, code: ev.bloqueo.code, message: ev.bloqueo.message, concertacion: ev.concertacion });
    }
    let concertacionDevuelta: string | null = null;
    await this.franjaRepo.manager.transaction(async (m) => {
      if (ev.bloqueo) {
        concertacionDevuelta = await this.aplicarDevolucion(m, franja, ev,
          `La programación cambió: se eliminó una sesión (${anterior.diaSemana.toLowerCase()} ${anterior.horaInicio}-${anterior.horaFin}). Revise y reenvíe.`, actor.idUser);
      }
      await m.query(`DELETE FROM "academic-schedule".franja_horaria WHERE id_franja = $1`, [idFranja]);
    });
    await this.auditar('eliminar_sesion', idFranja, actor.idUser, anterior, { eliminada: true, concertacionDevuelta, confirmoDevolucion: !!ev.bloqueo });
    return { eliminado: true as const, horas: await this.horasDe(franja.idGrupo), concertacionDevuelta };
  }

  // ── EFDS-2430 · varios días en una sola operación ──────────────────────────────────────────────

  /** Valida cada día por separado y dice cuáles chocan. No escribe nada. */
  async validarLote(dto: { idGrupo: string; dias: DiaSemana[]; horaInicio: string; horaFin: string; tipoSesion?: TipoSesion; aulaCodigo?: string | null; sedeCodigo?: string | null }) {
    const dias = this.diasDelLote(dto);
    const resultado: Array<{ diaSemana: string; ok: boolean; conflictos: Array<{ tipo: 'INTRA_GRUPO' | 'AULA' | 'FORMA'; mensaje: string }> }> = [];
    for (const dia of dias) {
      try {
        await this.validarSesion({ ...dto, diaSemana: dia });
        resultado.push({ diaSemana: dia, ok: true, conflictos: [] });
      } catch (e: any) {
        // Un grupo que no existe o una regla del grupo (virtual con aula) no es «conflicto de un día»: aplica a todos.
        if (e instanceof NotFoundException) throw e;
        const mensaje = String(e?.response?.message ?? e?.message ?? 'No se puede crear la sesión.');
        const tipo = /se cruza con otra del mismo grupo/.test(mensaje) ? 'INTRA_GRUPO' : /ya está ocupada|ocupada/.test(mensaje) ? 'AULA' : 'FORMA';
        resultado.push({ diaSemana: dia, ok: false, conflictos: [{ tipo, mensaje }] });
      }
    }
    const nuevas = resultado.filter((r) => r.ok).length;
    const horas = await this.horasProgramadasDespues(dto.idGrupo, nuevas ? dias.filter((d) => resultado.find((r) => r.diaSemana === d)?.ok) : [], dto.horaInicio, dto.horaFin);
    return { valido: resultado.every((r) => r.ok), dias: resultado, horas };
  }

  /** Crea una sesión por cada día. TODO O NADA: si algún día tiene conflicto, no se crea ninguna (409 con el detalle). */
  async crearLote(dto: Parameters<HorariosService['validarLote']>[0], actor: { idUser: string | null } = { idUser: null }) {
    const previa = await this.validarLote(dto);
    if (!previa.valido) {
      throw new ConflictException({ statusCode: 409, code: 'LOTE_CON_CONFLICTOS', message: 'Algún día tiene conflicto: no se creó ninguna sesión.', ...previa });
    }
    const dias = this.diasDelLote(dto);
    const creadas = await this.franjaRepo.manager.transaction(async (m) => {
      const filas: FranjaHorariaEntity[] = [];
      for (const dia of dias) {
        const v = await this.validarSesion({ ...dto, diaSemana: dia });
        filas.push((await m.query(
          `INSERT INTO "academic-schedule".franja_horaria (id_grupo, dia_semana, hora_inicio, hora_fin, tipo_sesion, jornada, sede_codigo, aula_codigo, estado)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PROGRAMADO') RETURNING *`,
          [v.idGrupo, v.diaSemana, v.horaInicio, v.horaFin, v.tipoSesion ?? 'presencial', v.jornada ?? jornadaSugerida(v.diaSemana, v.horaInicio),
            v.sedeCodigo ?? null, v.aulaCodigo ?? null]))[0]);
      }
      return filas;
    });
    await this.auditar('crear_sesiones_lote', dto.idGrupo, actor.idUser, null, { dias, horaInicio: dto.horaInicio, horaFin: dto.horaFin, tipoSesion: dto.tipoSesion ?? 'presencial', aulaCodigo: dto.aulaCodigo ?? null });
    return { creadas, horas: await this.horasGrupo(dto.idGrupo) };
  }

  private diasDelLote(dto: { idGrupo: string; dias: DiaSemana[] }): DiaSemana[] {
    if (!dto?.idGrupo) throw new BadRequestException('Debe indicar el grupo.');
    const dias = [...new Set(Array.isArray(dto.dias) ? dto.dias : [])];
    if (!dias.length) throw new BadRequestException('Indique al menos un día.');
    const malos = dias.filter((d) => !DIAS_SEMANA.includes(d));
    if (malos.length) throw new BadRequestException(`Días inválidos: ${malos.join(', ')}. Use: ${DIAS_SEMANA.join(', ')}.`);
    return dias;
  }

  /** Horas del grupo si se agregaran sesiones en esos días (programadas hoy + las nuevas). */
  private async horasProgramadasDespues(idGrupo: string, dias: string[], horaInicio: string, horaFin: string) {
    const grupo = await this.grupoRepo.findOne({ where: { idGrupo } });
    if (!grupo) throw new NotFoundException('El grupo no existe.');
    const req = await this.franjaRepo.query(`SELECT horas_clase FROM academic_work_plan.asignatura WHERE id = $1`, [(grupo as any).idAsignatura]);
    const requeridas = req.length && req[0].horas_clase != null ? Number(req[0].horas_clase) : null;
    const franjas = await this.franjaRepo.find({ where: { idGrupo } });
    const lista = [...franjas.map((f) => ({ horaInicio: String(f.horaInicio), horaFin: String(f.horaFin) })),
      ...dias.map(() => ({ horaInicio, horaFin }))];
    const h = horasDelGrupo((grupo as any).fechaInicio, (grupo as any).fechaFin, lista, requeridas);
    return { programadasDespues: h.programadas, requeridas: h.requeridas, excede: h.excede };
  }

  /** Auditoría en el audit-service (POST /logs) con valor anterior y nuevo; si no responde, queda en el log y el cambio ya se hizo. */
  private async auditar(accion: string, idEntidad: string, idUser: string | null, anterior: unknown, nuevo: unknown): Promise<void> {
    const base = process.env.AUDIT_SERVICE_URL || 'http://audit-service:3011';
    const ruta = '/programacion-academica/api/v1/horarios';
    try {
      const res = await fetch(`${base}/logs`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: accion.startsWith('eliminar') ? 'DELETE' : accion.startsWith('crear') ? 'POST' : 'PATCH', url: ruta, path: ruta,
          module: 'academic-schedule', submodule: 'horarios', action: accion, statusCode: 200, responseTimeMs: 0,
          entityName: 'franja_horaria', entityId: idEntidad, previousData: anterior ?? undefined,
          newData: { ...(nuevo as object), usuario: idUser },
        }),
      });
      if (!res.ok) throw new Error(`audit-service respondió ${res.status}`);
    } catch (e: any) {
      this.logger.error(`No se pudo registrar la auditoría de ${accion}: ${e?.message ?? e}`);
    }
  }

  /**
   * Horas del grupo: PROGRAMADAS (Σ duración semanal × semanas del ciclo) frente
   * a las REQUERIDAS por el catálogo (asignatura.horas_clase, RN de la Circular
   * 003: nunca se recalculan). EFDS-1373-bis / §1.3.
   *
   * Las SEMANAS salen de las fechas de ciclo del grupo; sin ellas no se puede
   * validar (semanas=null) y no se bloquea. El tope se fija con margen (×1.3)
   * porque el histórico real desvía: la mediana programa 1.06× lo requerido y
   * solo el 58% cae dentro de ±25%. Un margen estricto rechazaría programación
   * legítima; ×1.3 igual atrapa el error grueso (p. ej. 160h sobre 64h = 2.5×).
   */
  async horasGrupo(idGrupo: string): Promise<{
    programadas: number | null; requeridas: number | null; semanas: number | null; excede: boolean;
  }> {
    const grupo = await this.grupoRepo.findOne({ where: { idGrupo } });
    if (!grupo) throw new NotFoundException('El grupo no existe.');

    const req = await this.franjaRepo.query(
      `SELECT horas_clase FROM academic_work_plan.asignatura WHERE id = $1`,
      [(grupo as any).idAsignatura],
    );
    const requeridas = req.length && req[0].horas_clase != null ? Number(req[0].horas_clase) : null;

    const franjas = await this.franjaRepo.find({ where: { idGrupo } });
    return horasDelGrupo((grupo as any).fechaInicio, (grupo as any).fechaFin,
      franjas.map((f) => ({ horaInicio: String(f.horaInicio), horaFin: String(f.horaFin) })), requeridas);
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
