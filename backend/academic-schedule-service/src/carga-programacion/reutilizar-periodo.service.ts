import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource, EntityManager } from 'typeorm';

import { ContratoClient } from '../asignaciones/contrato-client.js';
import { nivelesAsignables, nivelesProgramables, PERMISO_PROGRAMACION_ALL } from '../auth/programacion-permissions.js';
import { condicionNivelSql } from '../catalogo/nivel-academico.js';
import { CargaProgramacionService, type Actor } from './carga-programacion.service.js';
import { auditar, enTransaccion, mensajeDe, paso, serviciosEnTransaccion } from './transaccion.js';

export const ALCANCES = ['catalogo', 'catalogo_grupos', 'catalogo_grupos_docentes'] as const;
export type AlcanceReutilizacion = (typeof ALCANCES)[number];
export const PERMISO_PERIODOS_GESTIONAR = 'programacion-academica.periodos.gestionar';

export interface ResultadoReutilizacion {
  valido: boolean;
  aplicado: boolean;
  alcance: AlcanceReutilizacion;
  origen: { idPeriodo: string; codigo: string };
  destino: { idPeriodo: string; codigo: string };
  /** Días que se corren las fechas de los grupos (semanas completas: el día de la semana se conserva). */
  corrimientoDias: number;
  catalogo: { ofertasCopiadas: number; ofertasYaExistentes: number; activacionesCetapCopiadas: number };
  grupos: { copiados: number; yaExistentes: number; sesiones: number; fechasAjustadas: number; sinOferta: number };
  docentes: { asignados: number; noAsignados: Array<{ grupo: string; documento: string; nombre: string | null; motivos: string[] }> };
  /** Errores que impiden la copia (TODO O NADA para catálogo, grupos y sesiones). */
  errores: Array<{ grupo: string | null; mensaje: string }>;
  avisos: string[];
}

const DIA_MS = 86_400_000;
const sumarDias = (iso: string, dias: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + dias * DIA_MS).toISOString().slice(0, 10);

/**
 * Reutilizar los datos de un periodo anterior en otro (normalmente uno recién creado).
 *
 * Tres alcances, acumulativos:
 *  · `catalogo` — la oferta del periodo: qué programa se ofrece en qué CETAP
 *    (`oferta_cetap_programa`) y la activación de CETAP (`periodo_cetap`). Es lo que hoy
 *    crea la carga del Excel del catálogo.
 *  · `catalogo_grupos` — además, los grupos con su número, oferta, modalidad, cupo, CETAP y
 *    horario (días, horas, aula). Las fechas del ciclo se corren SEMANAS COMPLETAS (el día
 *    de la semana se conserva) y se recortan al rango del periodo nuevo. Sin docentes; las
 *    sesiones nacen PROGRAMADAS.
 *  · `catalogo_grupos_docentes` — además, el mismo docente por franja. Cada asignación pasa
 *    por el bloqueo duro de siempre (área, vinculación vigente, situación, tope, cruces): si
 *    un docente ya no cumple, ese grupo queda SIN docente y el reporte dice por qué. No se
 *    fuerza nada.
 *
 * Catálogo, grupos y sesiones van TODO O NADA (un error = no se copia nada). Las
 * asignaciones de docentes son por grupo: un bloqueo no detiene la copia, se reporta.
 * Lo que ya existe en el destino no se toca (la operación se puede repetir).
 */
@Injectable()
export class ReutilizarPeriodoService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly carga: CargaProgramacionService,
    private readonly contrato: ContratoClient,
  ) {}

  async reutilizar(idDestino: string, idOrigen: string, alcance: AlcanceReutilizacion, actor: Actor, escribir: boolean): Promise<ResultadoReutilizacion> {
    if (!ALCANCES.includes(alcance)) throw new BadRequestException(`El alcance debe ser uno de: ${ALCANCES.join(', ')}.`);
    if (!actor.permisos.has(PERMISO_PERIODOS_GESTIONAR) && !actor.permisos.has(PERMISO_PROGRAMACION_ALL)) {
      throw new ForbiddenException('Reutilizar los datos de otro periodo requiere el permiso «Programación — Crear y gestionar periodos académicos».');
    }
    if (alcance !== 'catalogo' && !nivelesProgramables(actor.permisos).length) {
      throw new ForbiddenException('Copiar grupos requiere permisos de programación en algún nivel académico.');
    }
    const destino = await this.carga.periodoPlataforma(idDestino);
    const origen = await this.periodoCualquiera(idOrigen);
    if (origen.idPeriodo === destino.idPeriodo) throw new BadRequestException('El periodo de origen y el de destino son el mismo.');

    const semanas = origen.fechaInicio && destino.fechaInicio
      ? Math.round((Date.parse(destino.fechaInicio) - Date.parse(origen.fechaInicio)) / (7 * DIA_MS)) : 0;
    const corrimientoDias = semanas * 7;

    const r = await enTransaccion(this.dataSource, async (m) => {
      const res: ResultadoReutilizacion = {
        valido: true, aplicado: false, alcance,
        origen: { idPeriodo: origen.idPeriodo, codigo: origen.codigo }, destino: { idPeriodo: destino.idPeriodo, codigo: destino.codigo },
        corrimientoDias,
        catalogo: { ofertasCopiadas: 0, ofertasYaExistentes: 0, activacionesCetapCopiadas: 0 },
        grupos: { copiados: 0, yaExistentes: 0, sesiones: 0, fechasAjustadas: 0, sinOferta: 0 },
        docentes: { asignados: 0, noAsignados: [] },
        errores: [], avisos: [],
      };
      await this.copiarCatalogo(m, origen.idPeriodo, destino.idPeriodo, actor, res);
      if (alcance !== 'catalogo') {
        await this.copiarGrupos(m, origen.idPeriodo, destino, corrimientoDias, alcance === 'catalogo_grupos_docentes', actor, res);
      }
      res.valido = res.errores.length === 0;
      res.aplicado = escribir && res.valido;
      return res;
    }, (x) => escribir && x.valido);

    if (escribir && !r.valido) {
      throw new ConflictException({ statusCode: 409, code: 'REUTILIZACION_CON_ERRORES', message: `La copia tiene ${r.errores.length} error(es): no se copió nada.`, ...r });
    }
    if (r.aplicado) {
      await auditar('reutilizar_periodo', destino.idPeriodo, actor.idUser, {
        origen: origen.codigo, destino: destino.codigo, alcance, catalogo: r.catalogo, grupos: r.grupos,
        docentes: { asignados: r.docentes.asignados, noAsignados: r.docentes.noAsignados.length },
      });
    }
    return r;
  }

  /** Oferta CETAP × programa y activación de CETAP: se copia lo que falte, nada se sobrescribe. */
  private async copiarCatalogo(m: EntityManager, origen: string, destino: string, actor: Actor, res: ResultadoReutilizacion) {
    const total = Number((await m.query(
      `SELECT COUNT(*)::int AS n FROM academic_work_plan.oferta_cetap_programa WHERE id_periodo_academico = $1::bigint AND activa AND deleted_at IS NULL`, [origen]))[0].n);
    // Sin ON CONFLICT: en ambientes restaurados la llave única puede faltar (como pasó con ConfiguracionSistema).
    const copiadas = await m.query(
      `INSERT INTO academic_work_plan.oferta_cetap_programa (id_cetap, id_programa, id_periodo_academico, cupos_estimados, observaciones, activa, created_by)
       SELECT o.id_cetap, o.id_programa, $2::bigint, o.cupos_estimados, o.observaciones, TRUE, $3::bigint
         FROM academic_work_plan.oferta_cetap_programa o
        WHERE o.id_periodo_academico = $1::bigint AND o.activa AND o.deleted_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM academic_work_plan.oferta_cetap_programa d
                           WHERE d.id_cetap = o.id_cetap AND d.id_programa = o.id_programa AND d.id_periodo_academico = $2::bigint)
       RETURNING id`, [origen, destino, /^\d+$/.test(String(actor.idUser ?? '')) ? actor.idUser : null]);
    res.catalogo.ofertasCopiadas = copiadas.length;
    res.catalogo.ofertasYaExistentes = total - copiadas.length;
    const act = await m.query(
      `INSERT INTO academic_work_plan.periodo_cetap (id_periodo_academico, id_cetap, activo)
       SELECT $2::bigint, pc.id_cetap, pc.activo FROM academic_work_plan.periodo_cetap pc
        WHERE pc.id_periodo_academico = $1::bigint
          AND NOT EXISTS (SELECT 1 FROM academic_work_plan.periodo_cetap d WHERE d.id_periodo_academico = $2::bigint AND d.id_cetap = pc.id_cetap)
       RETURNING id`, [origen, destino]);
    res.catalogo.activacionesCetapCopiadas = act.length;
    if (total === 0) res.avisos.push('El periodo de origen no tiene oferta CETAP activa: no hay catálogo que copiar.');
  }

  private async copiarGrupos(
    m: EntityManager, origen: string, destino: { idPeriodo: string; fechaInicio: string | null; fechaFin: string | null },
    corrimiento: number, conDocentes: boolean, actor: Actor, res: ResultadoReutilizacion,
  ) {
    const svc = serviciosEnTransaccion(m, this.contrato);
    // Solo los niveles que la persona programa; los docentes, solo donde puede asignar.
    const nivelesProg = nivelesProgramables(actor.permisos);
    const nivelesAsig = nivelesAsignables(actor.permisos);
    const prog = condicionNivelSql('pr.tipo', nivelesProg, 2);
    const asig = nivelesAsig.length ? condicionNivelSql('pr.tipo', nivelesAsig, 3) : { sql: 'FALSE', params: [] as unknown[] };
    const todos: any[] = await m.query(
      `SELECT g.id_grupo::text AS id, g.id_asignatura::text AS "idAsignatura", upper(a.codigo) AS codigo, g.tipo_oferta AS "tipoOferta",
              g.numero_grupo AS numero, g.modalidad, g.cupo_maximo AS cupo, g.observaciones,
              to_char(g.fecha_inicio, 'YYYY-MM-DD') AS "fechaInicio", to_char(g.fecha_fin, 'YYYY-MM-DD') AS "fechaFin",
              o.id_cetap::text AS "idCetap", o.id_programa::text AS "idPrograma",
              (${prog.sql}) AS programable, (${asig.sql}) AS asignable
         FROM "academic-schedule".grupo g
         JOIN academic_work_plan.asignatura a ON a.id = g.id_asignatura
         JOIN academic_work_plan.programa pr ON pr.id = a.id_programa
         LEFT JOIN academic_work_plan.oferta_cetap_programa o ON o.id = g.id_oferta_cetap
        WHERE g.id_periodo_academico = $1::bigint AND a.deleted_at IS NULL
          AND ($2::text[] IS NULL OR TRUE) AND ($3::text[] IS NULL OR TRUE)
        ORDER BY a.codigo, g.tipo_oferta, g.numero_grupo`,
      // $2 y $3 siempre existen (aunque la condición no los use), para que los índices no se corran.
      [origen, prog.params[0] ?? null, asig.params[0] ?? null]);
    const grupos = todos.filter((g) => g.programable);
    if (todos.length > grupos.length) res.avisos.push(`${todos.length - grupos.length} grupo(s) de niveles que usted no programa no se copiaron.`);
    if (!grupos.length) res.avisos.push('El periodo de origen no tiene grupos: solo se copió el catálogo.');

    for (const g of grupos) {
      const nombre = `${g.codigo} grupo ${g.numero}${g.tipoOferta && g.tipoOferta !== 'periodo_regular' ? ` (${g.tipoOferta})` : ''}`;
      const ya = (await m.query(
        `SELECT 1 FROM "academic-schedule".grupo WHERE id_asignatura = $1::bigint AND id_periodo_academico = $2::bigint AND tipo_oferta = $3 AND numero_grupo = $4`,
        [g.idAsignatura, destino.idPeriodo, g.tipoOferta ?? 'periodo_regular', g.numero])).length > 0;
      if (ya) { res.grupos.yaExistentes += 1; continue; }

      let idOfertaCetap: string | null = null;
      if (g.idCetap) {
        idOfertaCetap = (await m.query(
          `SELECT id::text AS id FROM academic_work_plan.oferta_cetap_programa
            WHERE id_cetap = $1::bigint AND id_programa = $2::bigint AND id_periodo_academico = $3::bigint AND activa AND deleted_at IS NULL LIMIT 1`,
          [g.idCetap, g.idPrograma, destino.idPeriodo]))[0]?.id ?? null;
        if (!idOfertaCetap) {
          res.grupos.sinOferta += 1;
          res.avisos.push(`${nombre}: su CETAP no tiene oferta activa en el periodo nuevo; el grupo se copia sin CETAP.`);
        }
      }
      let fechas: { fechaInicio: string; fechaFin: string } | null = null;
      if (g.fechaInicio && g.fechaFin) {
        let ini = sumarDias(g.fechaInicio, corrimiento);
        let fin = sumarDias(g.fechaFin, corrimiento);
        if (destino.fechaInicio && ini < destino.fechaInicio) ini = destino.fechaInicio;
        if (destino.fechaFin && fin > destino.fechaFin) fin = destino.fechaFin;
        if (ini !== sumarDias(g.fechaInicio, corrimiento) || fin !== sumarDias(g.fechaFin, corrimiento)) res.grupos.fechasAjustadas += 1;
        if (fin < ini) { res.errores.push({ grupo: nombre, mensaje: 'Sus fechas corridas quedan fuera del periodo nuevo.' }); continue; }
        fechas = { fechaInicio: ini, fechaFin: fin };
      }

      let idGrupo: string;
      try {
        const [creado] = await paso(m, () => svc.grupos.crear({
          idAsignatura: g.idAsignatura, idPeriodo: destino.idPeriodo, tipoOferta: g.tipoOferta ?? 'periodo_regular', numeroGrupo: g.numero,
          cantidad: 1, modalidad: g.modalidad, cupoMaximo: g.cupo, observaciones: g.observaciones, idOfertaCetap,
        }));
        idGrupo = creado.idGrupo;
        if (fechas) await paso(m, () => svc.horarios.definirPeriodo(idGrupo, fechas!));
      } catch (e) {
        res.errores.push({ grupo: nombre, mensaje: `No se pudo crear el grupo: ${mensajeDe(e)}` });
        continue;
      }
      res.grupos.copiados += 1;

      const franjas: any[] = await m.query(
        `SELECT f.dia_semana AS dia, to_char(f.hora_inicio, 'HH24:MI') AS ini, to_char(f.hora_fin, 'HH24:MI') AS fin,
                f.tipo_sesion AS tipo, f.jornada, f.sede_codigo AS sede, f.aula_codigo AS aula, p.num_identificacion::text AS documento
           FROM "academic-schedule".franja_horaria f
           LEFT JOIN auth.personas p ON p.id_person = f.id_docente
          WHERE f.id_grupo = $1::uuid ORDER BY f.dia_semana, f.hora_inicio`, [g.id]);
      const porDocente = new Map<string, string[]>();
      for (const f of franjas) {
        try {
          const nueva = await paso(m, () => svc.horarios.crearSesion({
            idGrupo, diaSemana: f.dia, horaInicio: f.ini, horaFin: f.fin, tipoSesion: f.tipo, jornada: f.jornada ?? undefined,
            // Sin la oferta de su CETAP en el periodo nuevo, el aula no se puede validar: va sin aula.
            sedeCodigo: f.sede, aulaCodigo: g.idCetap && !idOfertaCetap ? null : f.aula,
          }));
          res.grupos.sesiones += 1;
          if (conDocentes && g.asignable && f.documento) porDocente.set(f.documento, [...(porDocente.get(f.documento) ?? []), nueva.idFranja]);
        } catch (e) {
          res.errores.push({ grupo: nombre, mensaje: `Sesión ${String(f.dia).toLowerCase()} ${f.ini}–${f.fin}: ${mensajeDe(e)}` });
        }
      }
      if (!conDocentes) continue;
      if (!g.asignable) { res.avisos.push(`${nombre}: no tiene permiso para asignar docentes en su nivel; queda sin docente.`); continue; }

      // Grupo virtual sin horario: su docente estaba en la asignación del grupo.
      if (!franjas.length) {
        const doc = (await m.query(
          `SELECT p.num_identificacion::text AS documento FROM "academic-schedule".asignacion_docente ad
             JOIN auth.personas p ON p.id_person = ad.id_docente WHERE ad.id_grupo = $1::uuid`, [g.id]))[0]?.documento;
        if (doc) {
          try {
            const r = await paso(m, () => svc.asignaciones.asignar({ idGrupo, documento: doc, asignadoPor: actor.idUser ?? undefined }, actor.token));
            if (r.asignado) res.docentes.asignados += 1;
            else res.docentes.noAsignados.push({ grupo: nombre, documento: doc, nombre: null, motivos: (r.motivos ?? []).map((x) => x.mensaje) });
          } catch (e) { res.docentes.noAsignados.push({ grupo: nombre, documento: doc, nombre: null, motivos: [mensajeDe(e)] }); }
        }
        continue;
      }
      if (!porDocente.size) continue;
      const asignaciones = [...porDocente.entries()].map(([documento, fs]) => ({ documento, franjas: fs }));
      try {
        const r = await paso(m, () => svc.asignaciones.asignarMultiple({ idGrupo, asignaciones, asignadoPor: actor.idUser }, actor.token));
        if (r.asignado) res.docentes.asignados += asignaciones.length;
        else {
          const bloqueados = new Set(r.errores.map((x) => x.documento));
          r.errores.forEach((x) => res.docentes.noAsignados.push({ grupo: nombre, documento: x.documento, nombre: x.nombre, motivos: x.motivos.map((y) => y.mensaje) }));
          asignaciones.filter((a) => !bloqueados.has(a.documento)).forEach((a) => res.docentes.noAsignados.push({
            grupo: nombre, documento: a.documento, nombre: null, motivos: ['No se asignó porque otro docente del mismo grupo tiene un bloqueo (la asignación del grupo es todo o nada).'],
          }));
        }
      } catch (e) {
        asignaciones.forEach((a) => res.docentes.noAsignados.push({ grupo: nombre, documento: a.documento, nombre: null, motivos: [mensajeDe(e)] }));
      }
    }
  }

  private async periodoCualquiera(idPeriodo: string) {
    if (!/^\d+$/.test(String(idPeriodo ?? '').trim())) throw new BadRequestException('El periodo de origen no es válido (solo periodos de la plataforma).');
    const f = (await this.dataSource.query(
      `SELECT id::text AS "idPeriodo", codigo, to_char(fecha_inicio, 'YYYY-MM-DD') AS "fechaInicio", to_char(fecha_fin, 'YYYY-MM-DD') AS "fechaFin"
         FROM academic_work_plan.periodo_academico WHERE id = $1::bigint`, [idPeriodo]))[0];
    if (!f) throw new BadRequestException('El periodo de origen no existe.');
    return f as { idPeriodo: string; codigo: string; fechaInicio: string | null; fechaFin: string | null };
  }
}
