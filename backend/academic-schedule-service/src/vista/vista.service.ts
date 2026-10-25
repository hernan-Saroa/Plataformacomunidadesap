import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { condicionNivelSql, nivelDeProgramaTipo, type NivelAcademico } from '../catalogo/nivel-academico.js';
import { DocenciaService, type FranjaConSesiones } from '../docencia/docencia.service.js';
import type { CalculoHoras } from '../asignaciones/contrato-client.js';
import { ofertasCetapPorId } from '../grupos/oferta-cetap.js';
import { horasDelGrupo } from '../horarios/horas-grupo.js';
import { SQL_CICLO_EFECTIVO } from '../horarios/choque.js';
import { condicionPeriodoGrupo, parsearPeriodo, type RefPeriodo } from '../periodos/periodo-ref.js';
import { topeDeDocencia } from '../asignaciones/tope.js';
import { normalizarVinculacion, type Vinculacion } from './vinculacion.js';

/**
 * Datos de las dos vistas que construye Codex — contratos en INTEGRACION-claude.md §19.
 *
 *   · EFDS-2344: árbol programa → asignatura → grupo → franjas, con docente,
 *     vinculación, horas, aula, CETAP de la oferta y estado. UNA consulta.
 *   · EFDS-2343: calendario semanal de un docente en un periodo.
 *
 * ⚠️ REGISTRO ÚNICO DEL DOCENTE: la franja (`franja_horaria.id_docente`), igual que
 * el acumulado y el tope. Ni `grupo.id_docente` ni `asignacion_docente`.
 * ⚠️ CÁLCULO ÚNICO de horas: contrato × regla de reparto, vía `DocenciaService`.
 * ⚠️ RN-08: el árbol solo trae los niveles visibles; en el calendario, lo del otro
 * nivel sale como «reservada» (solo día y hora, RN-07).
 */

export interface PeriodoVista {
  id: string;
  codigo: string | null;
  estado: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
}

export interface DocenteVista {
  idDocente: string;
  documento: string | null;
  nombre: string | null;
  vinculacion: Vinculacion | null;
}

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
const ordenDia = (d: string) => { const i = DIAS.indexOf(d); return i < 0 ? 99 : i; };
const redondear = (n: number) => Math.round(n * 10) / 10;

@Injectable()
export class VistaService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly docencia: DocenciaService,
  ) {}

  /** `periodo` = id de plataforma (bigint), id legado (uuid) o código (`2050-1`). */
  async resolverPeriodo(valor: unknown): Promise<{ ref: RefPeriodo; periodo: PeriodoVista }> {
    const v = String(valor ?? '').trim();
    if (!v) throw new BadRequestException('Indique el periodo (id o código).');
    let ref = parsearPeriodo(v);
    if (!ref) {
      const porCodigo = await this.dataSource.query(
        `SELECT id::text AS id FROM academic_work_plan.periodo_academico WHERE codigo = $1`, [v]);
      if (!porCodigo.length) throw new NotFoundException(`No existe el periodo ${v}.`);
      ref = { modelo: 'plataforma', id: porCodigo[0].id };
    }
    const filas = ref.modelo === 'plataforma'
      ? await this.dataSource.query(
        `SELECT id::text AS id, codigo, estado, to_char(fecha_inicio,'YYYY-MM-DD') AS "fechaInicio",
                to_char(fecha_fin,'YYYY-MM-DD') AS "fechaFin"
           FROM academic_work_plan.periodo_academico WHERE id = $1::bigint`, [ref.id])
      : await this.dataSource.query(
        `SELECT id_periodo::text AS id, codigo, estado, to_char(fecha_inicio,'YYYY-MM-DD') AS "fechaInicio",
                to_char(fecha_fin,'YYYY-MM-DD') AS "fechaFin"
           FROM "academic-schedule".periodo_programacion WHERE id_periodo = $1::uuid`, [ref.id]);
    if (!filas.length) throw new NotFoundException('El periodo no existe.');
    return { ref, periodo: filas[0] };
  }

  /**
   * Periodo en curso de la plataforma (portal sin `periodo`): el PRINCIPAL, no el
   * extraordinario (EFDS-2346). El más reciente si hubiera varios.
   */
  async periodoEnCurso(): Promise<string> {
    const filas = await this.dataSource.query(
      `SELECT id::text AS id FROM academic_work_plan.periodo_academico
        WHERE estado = 'en_curso' AND NOT extraordinario ORDER BY fecha_inicio DESC NULLS LAST, id DESC LIMIT 1`);
    if (!filas.length) throw new NotFoundException('No hay un periodo en curso.');
    return filas[0].id;
  }

  // ─── EFDS-2344 · Árbol ────────────────────────────────────────────────────────

  async arbol(
    filtros: { periodo: unknown; programa?: string; tipoOferta?: string; soloSinDocente?: boolean },
    niveles: NivelAcademico[],
    token: string | null,
  ) {
    const { ref, periodo } = await this.resolverPeriodo(filtros.periodo);
    const params: unknown[] = [ref.id];
    const nivel = condicionNivelSql('pr.tipo', niveles, 2);
    params.push(...nivel.params);
    let extra = '';
    if (filtros.programa) {
      if (!/^\d+$/.test(filtros.programa)) throw new BadRequestException('programa debe ser el id numérico del programa.');
      params.push(filtros.programa);
      extra += ` AND pr.id = $${params.length}::bigint`;
    }
    if (filtros.tipoOferta) {
      params.push(filtros.tipoOferta);
      extra += ` AND g.tipo_oferta = $${params.length}`;
    }

    const filas: any[] = await this.dataSource.query(
      `SELECT pr.id::text AS "idPrograma", pr.codigo AS "codigoPrograma", pr.nombre AS "programa", pr.tipo AS "tipoPrograma",
              a.id::text AS "idAsignatura", a.codigo AS "codigoAsignatura", a.nombre AS "asignatura",
              us.orden AS semestre, a.creditos, a.horas_clase AS "horasClase",
              nt.id::text AS "idArea", nt.codigo AS "codigoArea", nt.nombre AS "area",
              g.id_grupo::text AS "idGrupo", g.numero_grupo AS "numeroGrupo", g.estado AS "estadoGrupo",
              g.tipo_oferta AS "tipoOferta", g.cupo_maximo AS "cupoMaximo", g.id_oferta_cetap::text AS "idOfertaCetap",
              to_char(g.fecha_inicio,'YYYY-MM-DD') AS "grupoInicio", to_char(g.fecha_fin,'YYYY-MM-DD') AS "grupoFin",
              ${SQL_CICLO_EFECTIVO},
              f.id_franja::text AS "idFranja", f.dia_semana AS "diaSemana",
              to_char(f.hora_inicio,'HH24:MI') AS "horaInicio", to_char(f.hora_fin,'HH24:MI') AS "horaFin",
              f.tipo_sesion AS "tipoSesion", f.jornada, f.aula_codigo AS "aulaCodigo", f.estado AS "estadoFranja",
              f.id_docente::text AS "idDocente"
         FROM "academic-schedule".grupo g
         JOIN academic_work_plan.asignatura a ON a.id = g.id_asignatura
         JOIN academic_work_plan.programa pr ON pr.id = a.id_programa
         LEFT JOIN academic_work_plan.ubicacion_semestral us ON us.id = a.id_ubicacion_semestral
         LEFT JOIN academic_work_plan.nucleo_tematico nt ON nt.id = a.id_nucleo_tematico
         LEFT JOIN academic_work_plan.periodo_academico pa ON pa.id = g.id_periodo_academico
         LEFT JOIN "academic-schedule".periodo_programacion pp ON pp.id_periodo = g.id_periodo
         LEFT JOIN "academic-schedule".franja_horaria f ON f.id_grupo = g.id_grupo
        WHERE ${condicionPeriodoGrupo('g', ref, 1)} AND ${nivel.sql}${extra}`,
      params,
    );

    const docentes = await this.docentes(filas.map((f) => f.idDocente));
    const ofertas = await ofertasCetapPorId(this.dataSource, filas.map((f) => f.idOfertaCetap));
    const horas = this.calculadorHoras(token);

    // Agrupa en el árbol. Un Map por nivel conserva una sola entrada por id.
    const programas = new Map<string, any>();
    for (const f of filas) {
      let p = programas.get(f.idPrograma);
      if (!p) {
        p = {
          idPrograma: f.idPrograma, codigo: f.codigoPrograma, nombre: f.programa,
          nivel: nivelDeProgramaTipo(f.tipoPrograma), tipo: f.tipoPrograma, _asig: new Map(),
        };
        programas.set(f.idPrograma, p);
      }
      let a = p._asig.get(f.idAsignatura);
      if (!a) {
        a = {
          idAsignatura: f.idAsignatura, codigo: f.codigoAsignatura, nombre: f.asignatura,
          semestre: f.semestre ?? null, creditos: f.creditos ?? null,
          horasClase: f.horasClase != null ? Number(f.horasClase) : null,
          area: f.idArea ? { id: f.idArea, codigo: f.codigoArea, nombre: f.area } : null,
          _grupos: new Map(),
        };
        p._asig.set(f.idAsignatura, a);
      }
      let g = a._grupos.get(f.idGrupo);
      if (!g) {
        const oferta = f.idOfertaCetap ? ofertas.get(f.idOfertaCetap) : undefined;
        g = {
          idGrupo: f.idGrupo, numeroGrupo: f.numeroGrupo, estado: f.estadoGrupo, tipoOferta: f.tipoOferta,
          cicloInicio: f.cicloInicio, cicloFin: f.cicloFin, cupoMaximo: f.cupoMaximo,
          oferta: oferta
            ? { idOfertaCetap: oferta.idOfertaCetap, cetap: oferta.cetap,
                territorial: { codigo: oferta.territorial.codigo, nombre: oferta.territorial.nombre } }
            : null,
          _fechas: [f.grupoInicio, f.grupoFin],
          franjas: [] as any[],
        };
        a._grupos.set(f.idGrupo, g);
      }
      if (f.idFranja) {
        g.franjas.push({
          idFranja: f.idFranja, diaSemana: f.diaSemana, horaInicio: f.horaInicio, horaFin: f.horaFin,
          tipoSesion: f.tipoSesion, jornada: f.jornada, aulaCodigo: f.aulaCodigo, estado: f.estadoFranja,
          idDocente: f.idDocente ?? null,
        });
      }
    }

    // Sesiones reales de todas las franjas del árbol en una consulta (EFDS-2347).
    const sesiones = new Map<string, FranjaConSesiones[]>();
    const idsGrupo = [...programas.values()].flatMap((p: any) => [...p._asig.values()].flatMap((a: any) => [...a._grupos.keys()]));
    for (const f of await this.docencia.franjasConSesiones(idsGrupo)) {
      sesiones.set(f.idGrupo, [...(sesiones.get(f.idGrupo) ?? []), f]);
    }

    const resumen = { programas: 0, asignaturas: 0, grupos: 0, franjas: 0, franjasSinDocente: 0 };
    const salida: any[] = [];
    for (const p of [...programas.values()].sort((x, y) => String(x.nombre).localeCompare(String(y.nombre), 'es'))) {
      const asignaturas: any[] = [];
      for (const a of [...p._asig.values()].sort((x: any, y: any) =>
        (x.semestre ?? 99) - (y.semestre ?? 99) || String(x.nombre).localeCompare(String(y.nombre), 'es'))) {
        const grupos: any[] = [];
        for (const g of [...a._grupos.values()].sort((x: any, y: any) => x.numeroGrupo - y.numeroGrupo)) {
          g.franjas.sort((x: any, y: any) => ordenDia(x.diaSemana) - ordenDia(y.diaSemana) || x.horaInicio.localeCompare(y.horaInicio));
          const sinDocente = g.franjas.filter((fr: any) => !fr.idDocente).length;
          if (filtros.soloSinDocente && sinDocente === 0) continue;
          const estadoFranjas = { PROGRAMADO: 0, PUBLICADA: 0, TOMADA: 0, APROBADA: 0, DEVUELTA: 0 } as Record<string, number>;
          for (const fr of g.franjas) estadoFranjas[fr.estado] = (estadoFranjas[fr.estado] ?? 0) + 1;
          const ids = [...new Set(g.franjas.map((fr: any) => fr.idDocente).filter(Boolean))] as string[];
          const docentesGrupo: any[] = [];
          for (const id of ids) {
            const d = docentes.get(id) ?? { idDocente: id, documento: null, nombre: null, vinculacion: null };
            const calculo = await horas(a.codigo, d.vinculacion?.texto ?? null);
            // Sin contrato no hay horas: null (la vista no se cae ni inventa).
            const h = calculo ? this.docencia.horasEnGrupo(sesiones.get(g.idGrupo) ?? [], id, calculo) : null;
            docentesGrupo.push({ ...d, fraccion: h?.fraccion ?? this.docencia.fraccion(g.franjas, id), horas: h?.horas ?? null,
              horasPlan: h?.horasPlan ?? null, base: h?.base ?? null, descontadas: h?.descontadas ?? null, avisos: h?.avisos ?? [] });
          }
          const { _fechas, ...resto } = g;
          grupos.push({
            ...resto,
            horas: horasDelGrupo(_fechas[0], _fechas[1], g.franjas, a.horasClase),
            estadoFranjas,
            docentes: docentesGrupo,
          });
          resumen.grupos++; resumen.franjas += g.franjas.length; resumen.franjasSinDocente += sinDocente;
        }
        if (!grupos.length) continue;
        const { _grupos, ...datos } = a;
        asignaturas.push({ ...datos, grupos });
        resumen.asignaturas++;
      }
      if (!asignaturas.length) continue;
      const { _asig, ...datos } = p;
      salida.push({ ...datos, asignaturas });
      resumen.programas++;
    }
    return { periodo, resumen, programas: salida };
  }

  // ─── EFDS-2343 · Calendario del docente ───────────────────────────────────────

  /** Busca al docente por documento o id_person. 404 si no está en el banco. */
  async docentePor(criterio: { documento?: string; idDocente?: string }): Promise<DocenteVista & { horasAsignables: number | null }> {
    const porId = !!criterio.idDocente;
    const valor = String((porId ? criterio.idDocente : criterio.documento) ?? '').trim();
    if (!valor) throw new BadRequestException('Indique el documento o el idDocente.');
    const filas = await this.dataSource.query(
      `SELECT p.id_person::text AS "idDocente", p.num_identificacion AS documento, p.nom_largo AS nombre,
              d."tipoVinculacion" AS vinculacion, d."horasAsignables" AS "horasAsignables"
         FROM auth.personas p
         JOIN LATERAL (SELECT "tipoVinculacion", "horasAsignables" FROM academic_work_plan."Docente" x
                        WHERE x."personaId" = p.id_person ORDER BY x."updatedAt" DESC NULLS LAST LIMIT 1) d ON TRUE
        WHERE ${porId ? 'p.id_person::text = $1' : 'p.num_identificacion = $1'}`,
      [valor]);
    if (!filas.length) throw new NotFoundException('El docente no está en el banco de docentes.');
    const f = filas[0];
    return {
      idDocente: f.idDocente, documento: f.documento, nombre: f.nombre,
      vinculacion: normalizarVinculacion(f.vinculacion),
      horasAsignables: f.horasAsignables != null ? Number(f.horasAsignables) : null,
    };
  }

  async calendario(
    docente: DocenteVista & { horasAsignables: number | null },
    periodoValor: unknown,
    nivelesVisibles: NivelAcademico[] | 'todos',
    token: string | null,
  ) {
    const { ref, periodo } = await this.resolverPeriodo(periodoValor);
    const filas: any[] = await this.dataSource.query(
      `SELECT f.id_franja::text AS "idFranja", f.dia_semana AS "diaSemana",
              to_char(f.hora_inicio,'HH24:MI') AS "horaInicio", to_char(f.hora_fin,'HH24:MI') AS "horaFin",
              f.tipo_sesion AS "tipoSesion", f.jornada, f.aula_codigo AS "aulaCodigo", f.estado,
              g.id_grupo::text AS "idGrupo", g.numero_grupo AS "numeroGrupo", g.tipo_oferta AS "tipoOferta",
              ${SQL_CICLO_EFECTIVO},
              a.id::text AS "idAsignatura", a.codigo AS "codigoAsignatura", a.nombre AS asignatura,
              pr.nombre AS programa, pr.tipo AS "tipoPrograma"
         FROM "academic-schedule".franja_horaria f
         JOIN "academic-schedule".grupo g ON g.id_grupo = f.id_grupo
         JOIN academic_work_plan.asignatura a ON a.id = g.id_asignatura
         LEFT JOIN academic_work_plan.programa pr ON pr.id = a.id_programa
         LEFT JOIN academic_work_plan.periodo_academico pa ON pa.id = g.id_periodo_academico
         LEFT JOIN "academic-schedule".periodo_programacion pp ON pp.id_periodo = g.id_periodo
        WHERE f.id_docente = $1::uuid AND ${condicionPeriodoGrupo('g', ref, 2)}`,
      [docente.idDocente, ref.id]);

    // Horas del docente en el periodo: por grupo, contrato × reparto (todas sus franjas, de cualquier nivel).
    const { total, porGrupo } = await this.horasPorGrupoDelDocente(docente.idDocente, docente.vinculacion?.texto ?? null, filas, token);
    const tope = topeDeDocencia(docente.vinculacion?.texto ?? null, docente.horasAsignables);

    const franjas = filas
      .sort((x, y) => ordenDia(x.diaSemana) - ordenDia(y.diaSemana) || x.horaInicio.localeCompare(y.horaInicio))
      .map((f) => {
        const nivel = nivelDeProgramaTipo(f.tipoPrograma);
        const visible = nivelesVisibles === 'todos' || nivelesVisibles.includes(nivel);
        const base = { idFranja: f.idFranja, diaSemana: f.diaSemana, horaInicio: f.horaInicio, horaFin: f.horaFin };
        if (!visible) {
          return {
            ...base, reservada: true, idGrupo: null, numeroGrupo: null, tipoOferta: null, cicloInicio: null, cicloFin: null,
            idAsignatura: null, codigoAsignatura: null, asignatura: null, programa: null, nivel: null,
            aulaCodigo: null, tipoSesion: null, jornada: null, estado: null,
          };
        }
        return {
          ...base, reservada: false, idGrupo: f.idGrupo, numeroGrupo: f.numeroGrupo, tipoOferta: f.tipoOferta,
          cicloInicio: f.cicloInicio, cicloFin: f.cicloFin, idAsignatura: f.idAsignatura,
          codigoAsignatura: f.codigoAsignatura, asignatura: f.asignatura, programa: f.programa, nivel,
          aulaCodigo: f.aulaCodigo, tipoSesion: f.tipoSesion, jornada: f.jornada, estado: f.estado,
        };
      });

    const { horasAsignables: _omitir, ...datosDocente } = docente;
    // Desglose solo de los grupos visibles: el id de un grupo reservado no sale (RN-07).
    const horasPorGrupo = Object.fromEntries(
      [...new Set(franjas.filter((f) => !f.reservada).map((f) => f.idGrupo as string))].map((id) => [id, porGrupo[id] ?? null]));
    return { docente: datosDocente, periodo, horas: { total, tope: tope > 0 ? tope : null }, horasPorGrupo, franjas };
  }

  /** Buscador del filtro de disponibilidad: por cédula o nombre; sin texto, los que tienen franjas en el periodo. */
  async buscarDocentes(periodoValor: unknown, q: string | undefined, token: string | null) {
    const { ref } = await this.resolverPeriodo(periodoValor);
    const texto = String(q ?? '').trim();
    const sinTildes = (expr: string) => `translate(${expr}, 'ÁÉÍÓÚáéíóúÑñ', 'AEIOUaeiouNn')`;
    // Con texto: cédula que empieza así o nombre que lo contiene (sin tildes). Sin texto: quienes
    // ya tienen franjas en el periodo.
    const [filtro, params]: [string, unknown[]] = texto
      ? [`(p.num_identificacion LIKE $1 OR ${sinTildes('p.nom_largo')} ILIKE ${sinTildes('$2')})`, [`${texto}%`, `%${texto}%`]]
      : [`EXISTS (SELECT 1 FROM "academic-schedule".franja_horaria f
                    JOIN "academic-schedule".grupo g ON g.id_grupo = f.id_grupo
                   WHERE f.id_docente = p.id_person AND ${condicionPeriodoGrupo('g', ref, 1)})`, [ref.id]];
    const docentes: any[] = await this.dataSource.query(
      `SELECT p.id_person::text AS "idDocente", p.num_identificacion AS documento, p.nom_largo AS nombre,
              d."tipoVinculacion" AS vinculacion
         FROM auth.personas p
         JOIN LATERAL (SELECT "tipoVinculacion" FROM academic_work_plan."Docente" x
                        WHERE x."personaId" = p.id_person ORDER BY x."updatedAt" DESC NULLS LAST LIMIT 1) d ON TRUE
        WHERE ${filtro}
        ORDER BY p.nom_largo
        LIMIT 50`,
      params);
    if (!docentes.length) return [];

    const franjas: any[] = await this.dataSource.query(
      `SELECT f.id_docente::text AS "idDocente", f.id_franja::text AS "idFranja", g.id_grupo::text AS "idGrupo",
              a.codigo AS "codigoAsignatura", f.dia_semana AS "diaSemana",
              to_char(f.hora_inicio,'HH24:MI') AS "horaInicio", to_char(f.hora_fin,'HH24:MI') AS "horaFin"
         FROM "academic-schedule".franja_horaria f
         JOIN "academic-schedule".grupo g ON g.id_grupo = f.id_grupo
         JOIN academic_work_plan.asignatura a ON a.id = g.id_asignatura
        WHERE f.id_docente = ANY($2::uuid[]) AND ${condicionPeriodoGrupo('g', ref, 1)}`,
      [ref.id, docentes.map((d) => d.idDocente)]);

    const resultado: any[] = [];
    for (const d of docentes) {
      const suyas = franjas.filter((f) => f.idDocente === d.idDocente);
      resultado.push({
        idDocente: d.idDocente, documento: d.documento, nombre: d.nombre,
        vinculacion: normalizarVinculacion(d.vinculacion),
        horas: await this.horasDelDocenteEnPeriodo(d.idDocente, d.vinculacion, suyas, token),
        franjas: suyas.length,
      });
    }
    return resultado;
  }

  // ─── Apoyo ─────────────────────────────────────────────────────────────────────

  /**
   * Horas del docente sobre SUS franjas del periodo: por grupo, horas de la
   * asignatura (contrato) × su fracción con la regla vigente. Para la fracción se
   * necesitan TODAS las franjas del grupo (también las de otros docentes).
   */
  private async horasDelDocenteEnPeriodo(
    idDocente: string, vinculacion: string | null,
    suyas: ReadonlyArray<{ idGrupo: string; codigoAsignatura: string }>, token: string | null,
  ): Promise<number | null> {
    return (await this.horasPorGrupoDelDocente(idDocente, vinculacion, suyas, token)).total;
  }

  /** Igual, con el desglose por grupo (el portal muestra las horas de cada grupo asignado). */
  private async horasPorGrupoDelDocente(
    idDocente: string, vinculacion: string | null,
    suyas: ReadonlyArray<{ idGrupo: string; codigoAsignatura: string }>, token: string | null,
  ): Promise<{ total: number | null; porGrupo: Record<string, number | null> }> {
    const grupos = new Map<string, string>();
    for (const f of suyas) if (f.idGrupo) grupos.set(f.idGrupo, f.codigoAsignatura);
    if (!grupos.size) return { total: 0, porGrupo: {} };
    // El cálculo único (EFDS-2347): sesiones reales del ciclo × factor de vinculación.
    const delGrupo = await this.docencia.franjasConSesiones([...grupos.keys()]);
    const horas = this.calculadorHoras(token);
    let total: number | null = 0;
    const porGrupo: Record<string, number | null> = {};
    for (const [idGrupo, codigo] of grupos) {
      const calculo = await horas(codigo, vinculacion);
      // Sin contrato no hay horas: el grupo queda en null y el total también (no se suma a medias).
      if (calculo == null) { porGrupo[idGrupo] = null; total = null; continue; }
      const delDocente = this.docencia.horasEnGrupo(delGrupo.filter((f) => f.idGrupo === idGrupo), idDocente, calculo).horas;
      porGrupo[idGrupo] = redondear(delDocente);
      if (total != null) total += delDocente;
    }
    return { total: total == null ? null : redondear(total), porGrupo };
  }

  /** Cálculo del contrato por (asignatura, vinculación), con caché. Si no responde: null (la vista no se cae). */
  private calculadorHoras(token: string | null) {
    const cache = new Map<string, Promise<CalculoHoras | null>>();
    return (codigo: string, vinculacion: string | null): Promise<CalculoHoras | null> => {
      const clave = `${codigo}|${vinculacion ?? ''}`;
      if (!cache.has(clave)) {
        cache.set(clave, this.docencia.calculoAsignatura(codigo, vinculacion, token).catch(() => null));
      }
      return cache.get(clave)!;
    };
  }

  private async docentes(ids: Array<string | null>): Promise<Map<string, DocenteVista>> {
    const unicos = [...new Set(ids.filter(Boolean))] as string[];
    if (!unicos.length) return new Map();
    const filas: any[] = await this.dataSource.query(
      `SELECT p.id_person::text AS "idDocente", p.num_identificacion AS documento, p.nom_largo AS nombre,
              d."tipoVinculacion" AS vinculacion
         FROM auth.personas p
         LEFT JOIN LATERAL (SELECT "tipoVinculacion" FROM academic_work_plan."Docente" x
                             WHERE x."personaId" = p.id_person ORDER BY x."updatedAt" DESC NULLS LAST LIMIT 1) d ON TRUE
        WHERE p.id_person = ANY($1::uuid[])`,
      [unicos]);
    return new Map(filas.map((f) => [f.idDocente, {
      idDocente: f.idDocente, documento: f.documento, nombre: f.nombre, vinculacion: normalizarVinculacion(f.vinculacion),
    }]));
  }
}
