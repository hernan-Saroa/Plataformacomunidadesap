import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource, EntityManager } from 'typeorm';

import { AlcanceService } from '../acceso/alcance.service.js';
import { ContratoClient } from '../asignaciones/contrato-client.js';
import { nivelesAsignables, nivelesProgramables } from '../auth/programacion-permissions.js';
import { condicionNivelSql, type NivelAcademico } from '../catalogo/nivel-academico.js';
import { parsearPeriodo } from '../periodos/periodo-ref.js';
import { normalizarFila, type FilaCarga, type FilaNormalizada } from './normalizar.js';
import { auditar, enTransaccion, mensajeDe, paso, serviciosEnTransaccion, type ServiciosTx } from './transaccion.js';

export const MAX_FILAS = 3000;

export interface ErrorFila { fila: number | null; mensaje: string }
export interface GrupoCargado {
  codigoAsignatura: string; asignatura: string | null; grupo: number; tipoOferta: string;
  nuevo: boolean; sesiones: number; docentes: string[];
}
export interface ResultadoCarga {
  valido: boolean;
  /** true solo cuando se escribió (carga real sin errores). */
  aplicado: boolean;
  periodo: { idPeriodo: string; codigo: string };
  resumen: { filas: number; gruposNuevos: number; gruposExistentes: number; sesiones: number; asignaciones: number };
  errores: ErrorFila[];
  avisos: ErrorFila[];
  grupos: GrupoCargado[];
}

export interface Actor { idUser: string | null; permisos: ReadonlySet<string>; token: string | null }

interface Asignatura { id: string; codigo: string; nombre: string; idPrograma: string; nivel: NivelAcademico | null }

/**
 * Carga de la programación desde la plantilla de Excel: grupos, sesiones y docentes del
 * periodo en UNA operación TODO O NADA.
 *
 * Cada fila es una sesión (como la hoja PROGRAMACIÓN del Excel que usa hoy la ESAP): las
 * filas con la misma asignatura, oferta y número de grupo son el mismo grupo. Todo pasa
 * por los servicios de siempre (crear grupo, crear sesión, asignación múltiple), dentro de
 * una transacción: lo que valida la pantalla lo valida la carga, y lo que el archivo usa
 * dos veces (un aula, un docente a la misma hora) choca igual que si ya estuviera en la base.
 *
 * `validar` recorre exactamente lo mismo y revierte siempre; `cargar` confirma solo si no
 * hubo ni un error (si hubo, 409 con el reporte y no queda nada escrito).
 */
@Injectable()
export class CargaProgramacionService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly alcance: AlcanceService,
    private readonly contrato: ContratoClient,
  ) {}

  async procesar(idPeriodo: string, filasEntrada: FilaCarga[], actor: Actor, escribir: boolean): Promise<ResultadoCarga> {
    const periodo = await this.periodoPlataforma(idPeriodo);
    if (!Array.isArray(filasEntrada) || filasEntrada.length === 0) throw new BadRequestException('El archivo no tiene filas de programación.');
    if (filasEntrada.length > MAX_FILAS) throw new BadRequestException(`Máximo ${MAX_FILAS} filas por carga; divida el archivo.`);
    const programables = nivelesProgramables(actor.permisos);
    const asignables = nivelesAsignables(actor.permisos);
    if (!programables.length) throw new ForbiddenException('No tiene permisos de programación sobre ningún nivel académico.');

    const errores: ErrorFila[] = [];
    const avisos: ErrorFila[] = [];
    const filas: FilaNormalizada[] = [];
    filasEntrada.forEach((f, i) => {
      const n = normalizarFila({ ...f, fila: Number(f?.fila) || i + 2 });
      n.errores.forEach((mensaje) => errores.push({ fila: Number(f?.fila) || i + 2, mensaje }));
      if (n.fila) filas.push(n.fila);
    });

    // Asignaturas por código, con su nivel (el nivel sale del programa real, nunca del archivo).
    const asignaturas = await this.asignaturasPorCodigo([...new Set(filas.map((f) => f.codigoAsignatura))]);
    const validas: FilaNormalizada[] = [];
    for (const f of filas) {
      const a = asignaturas.get(f.codigoAsignatura);
      if (!a) { errores.push({ fila: f.fila, mensaje: `La asignatura ${f.codigoAsignatura} no existe en el catálogo (o está inactiva).` }); continue; }
      if (a.nivel && !programables.includes(a.nivel)) { errores.push({ fila: f.fila, mensaje: `No tiene permiso para programar el nivel ${a.nivel} (${f.codigoAsignatura}).` }); continue; }
      if (f.documentoDocente && a.nivel && !asignables.includes(a.nivel)) {
        errores.push({ fila: f.fila, mensaje: `No tiene permiso para asignar docentes en el nivel ${a.nivel}: deje vacía la columna del docente.` });
        continue;
      }
      validas.push(f);
    }

    // Filas por grupo; los datos del grupo deben coincidir en todas sus filas.
    const porGrupo = new Map<string, FilaNormalizada[]>();
    for (const f of validas) {
      const k = `${f.codigoAsignatura}|${f.tipoOferta}|${f.grupo}`;
      porGrupo.set(k, [...(porGrupo.get(k) ?? []), f]);
    }
    const datosGrupo = (lista: FilaNormalizada[]) => {
      const campos = ['modalidad', 'cupo', 'cetap', 'fechaInicio', 'fechaFin'] as const;
      const r: Record<string, any> = {};
      for (const c of campos) {
        const valores = [...new Set(lista.map((f) => f[c]).filter((v) => v !== null))];
        if (valores.length > 1) {
          lista.forEach((f) => errores.push({ fila: f.fila, mensaje: `Las filas del grupo ${f.grupo} de ${f.codigoAsignatura} no coinciden en ${c} (${valores.join(' / ')}).` }));
          return null;
        }
        r[c] = valores[0] ?? null;
      }
      return r as Pick<FilaNormalizada, typeof campos[number]>;
    };

    const resultado = await enTransaccion(this.dataSource, async (m) => {
      const svc = serviciosEnTransaccion(m, this.contrato);
      const grupos: GrupoCargado[] = [];
      let sesiones = 0;
      let asignaciones = 0;
      for (const lista of porGrupo.values()) {
        const g = datosGrupo(lista);
        if (!g) continue;
        const a = asignaturas.get(lista[0].codigoAsignatura)!;
        const r = await this.cargarGrupo(m, svc, periodo, a, lista, g, actor, errores, avisos);
        if (!r) continue;
        grupos.push(r);
        sesiones += r.sesiones;
        asignaciones += r.docentes.length;
      }
      const valido = errores.length === 0;
      return {
        valido, aplicado: escribir && valido,
        periodo: { idPeriodo: periodo.idPeriodo, codigo: periodo.codigo },
        resumen: {
          filas: filasEntrada.length, gruposNuevos: grupos.filter((x) => x.nuevo).length,
          gruposExistentes: grupos.filter((x) => !x.nuevo).length, sesiones, asignaciones,
        },
        errores: errores.sort((x, y) => (x.fila ?? 0) - (y.fila ?? 0)),
        avisos,
        grupos,
      } satisfies ResultadoCarga;
    }, (r) => escribir && r.valido);

    if (escribir && !resultado.valido) {
      throw new ConflictException({ statusCode: 409, code: 'CARGA_CON_ERRORES', message: `La carga tiene ${resultado.errores.length} error(es): no se escribió nada.`, ...resultado });
    }
    if (resultado.aplicado) {
      await auditar('cargar_programacion_plantilla', periodo.idPeriodo, actor.idUser, { periodo: periodo.codigo, ...resultado.resumen });
    }
    return resultado;
  }

  /** Crea (o reutiliza) un grupo, sus sesiones y sus docentes. Los errores van a la lista, con su fila. */
  private async cargarGrupo(
    m: EntityManager, svc: ServiciosTx, periodo: { idPeriodo: string; fechaInicio: string | null; fechaFin: string | null },
    a: Asignatura, lista: FilaNormalizada[],
    g: Pick<FilaNormalizada, 'modalidad' | 'cupo' | 'cetap' | 'fechaInicio' | 'fechaFin'>,
    actor: Actor, errores: ErrorFila[], avisos: ErrorFila[],
  ): Promise<GrupoCargado | null> {
    const { idPeriodo } = periodo;
    const { grupo: numero, tipoOferta, codigoAsignatura } = lista[0];
    const errorEnTodas = (mensaje: string) => lista.forEach((f) => errores.push({ fila: f.fila, mensaje }));
    const existente = (await m.query(
      `SELECT id_grupo::text AS id FROM "academic-schedule".grupo
        WHERE id_asignatura = $1::bigint AND id_periodo_academico = $2::bigint AND tipo_oferta = $3 AND numero_grupo = $4`,
      [a.id, idPeriodo, tipoOferta, numero]))[0]?.id as string | undefined;

    let idGrupo = existente;
    if (existente) {
      if (g.modalidad || g.cupo || g.cetap || g.fechaInicio) {
        avisos.push({ fila: lista[0].fila, mensaje: `El grupo ${numero} de ${codigoAsignatura} ya existía: se le agregan sesiones y docentes; sus datos (modalidad, cupo, CETAP, fechas) no se cambian.` });
      }
    } else {
      let idOfertaCetap: string | null = null;
      if (g.cetap) {
        idOfertaCetap = (await m.query(
          `SELECT o.id::text AS id FROM academic_work_plan.oferta_cetap_programa o
             JOIN academic_work_plan.cetap c ON c.id = o.id_cetap
            WHERE upper(c.codigo) = $1 AND o.id_programa = $2::bigint AND o.id_periodo_academico = $3::bigint
              AND o.activa = TRUE AND o.deleted_at IS NULL LIMIT 1`, [g.cetap, a.idPrograma, idPeriodo]))[0]?.id ?? null;
        if (!idOfertaCetap) { errorEnTodas(`El CETAP ${g.cetap} no tiene oferta del programa de ${codigoAsignatura} en este periodo.`); return null; }
      }
      try {
        const [creado] = await paso(m, () => svc.grupos.crear({
          idAsignatura: a.id, idPeriodo, tipoOferta, numeroGrupo: numero, cantidad: 1,
          modalidad: g.modalidad ?? undefined, cupoMaximo: g.cupo ?? undefined, idOfertaCetap,
        }));
        idGrupo = creado.idGrupo;
        // Sin fechas en el archivo, el grupo dura el periodo: sin ciclo no se puede verificar la
        // vinculación del docente (y la asignación se rechazaría). Se avisa en el reporte.
        const fechas = g.fechaInicio && g.fechaFin ? { fechaInicio: g.fechaInicio, fechaFin: g.fechaFin }
          : periodo.fechaInicio && periodo.fechaFin ? { fechaInicio: periodo.fechaInicio, fechaFin: periodo.fechaFin } : null;
        if (fechas) await paso(m, () => svc.horarios.definirPeriodo(idGrupo!, fechas));
        if (fechas && !g.fechaInicio) {
          avisos.push({ fila: lista[0].fila, mensaje: `Grupo ${numero} de ${codigoAsignatura}: sin fechas en el archivo, toma las del periodo (${fechas.fechaInicio} a ${fechas.fechaFin}).` });
        }
      } catch (e) {
        errorEnTodas(`No se pudo crear el grupo ${numero} de ${codigoAsignatura}: ${mensajeDe(e)}`);
        return null;
      }
    }

    // Sesiones, una por fila; cada una con su punto de guardado.
    const franjaDeFila = new Map<number, string>();
    let sesiones = 0;
    for (const f of lista) {
      if (!f.sesion) continue;
      try {
        const franja = await paso(m, () => svc.horarios.crearSesion({
          idGrupo: idGrupo!, diaSemana: f.sesion!.dia, horaInicio: f.sesion!.horaInicio, horaFin: f.sesion!.horaFin,
          tipoSesion: f.sesion!.tipoSesion ?? undefined, aulaCodigo: f.sesion!.aula,
        }));
        franjaDeFila.set(f.fila, franja.idFranja);
        sesiones += 1;
      } catch (e) {
        errores.push({ fila: f.fila, mensaje: mensajeDe(e) });
      }
    }

    // Docentes: TODOS los del grupo en una sola asignación múltiple (todo o nada del grupo).
    const docentes: string[] = [];
    const conDocente = lista.filter((f) => f.documentoDocente);
    if (conDocente.length) {
      const porDocente = new Map<string, FilaNormalizada[]>();
      conDocente.forEach((f) => porDocente.set(f.documentoDocente!, [...(porDocente.get(f.documentoDocente!) ?? []), f]));
      const sinSesion = conDocente.filter((f) => !f.sesion);
      try {
        if (sinSesion.length) {
          // Grupo virtual/a distancia sin horario: un solo docente para todo el grupo.
          if (porDocente.size > 1) throw new BadRequestException('Un grupo sin horario lleva un solo docente.');
          const r = await paso(m, () => svc.asignaciones.asignar({ idGrupo: idGrupo!, documento: conDocente[0].documentoDocente!, asignadoPor: actor.idUser ?? undefined }, actor.token));
          if (!r.asignado) throw Object.assign(new Error('rechazo'), { motivos: { [conDocente[0].documentoDocente!]: r.motivos } });
        } else {
          const pares = [...porDocente.entries()].map(([documento, fs]) => ({ documento, franjas: fs.map((f) => franjaDeFila.get(f.fila)).filter((x): x is string => !!x) }))
            .filter((p) => p.franjas.length);
          if (pares.length) {
            const r = await paso(m, () => svc.asignaciones.asignarMultiple({ idGrupo: idGrupo!, asignaciones: pares, asignadoPor: actor.idUser }, actor.token));
            if (!r.asignado) throw Object.assign(new Error('rechazo'), { motivos: Object.fromEntries(r.errores.map((x) => [x.documento, x.motivos])) });
          }
        }
        docentes.push(...porDocente.keys());
      } catch (e: any) {
        if (e?.motivos) {
          for (const [documento, motivos] of Object.entries(e.motivos as Record<string, Array<{ mensaje: string }>>)) {
            const texto = motivos.map((x) => x.mensaje).join(' · ');
            (porDocente.get(documento) ?? []).forEach((f) => errores.push({ fila: f.fila, mensaje: `El docente ${documento} no se puede asignar: ${texto}` }));
          }
          // Los otros docentes del grupo no se asignaron (todo o nada del grupo): se dice en sus filas.
          for (const [documento, fs] of porDocente) {
            if (!(documento in e.motivos)) fs.forEach((f) => avisos.push({ fila: f.fila, mensaje: `El docente ${documento} no se asignó porque otro docente del mismo grupo tiene un bloqueo.` }));
          }
        } else {
          conDocente.forEach((f) => errores.push({ fila: f.fila, mensaje: `No se pudo asignar el docente ${f.documentoDocente}: ${mensajeDe(e)}` }));
        }
      }
    }
    return { codigoAsignatura, asignatura: a.nombre, grupo: numero, tipoOferta, nuevo: !existente, sesiones, docentes };
  }

  private async asignaturasPorCodigo(codigos: string[]): Promise<Map<string, Asignatura>> {
    if (!codigos.length) return new Map();
    const filas: any[] = await this.dataSource.query(
      `SELECT a.id::text AS id, upper(a.codigo) AS codigo, a.nombre, a.id_programa::text AS "idPrograma"
         FROM academic_work_plan.asignatura a
        WHERE upper(a.codigo) = ANY($1::text[]) AND a.deleted_at IS NULL AND COALESCE(a.activa, TRUE)`, [codigos]);
    const r = new Map<string, Asignatura>();
    for (const f of filas) {
      const { nivel } = await this.alcance.resolver('asignatura', f.id);
      r.set(f.codigo, { ...f, nivel });
    }
    return r;
  }

  /** Solo periodos de plataforma, no cerrados (el guard ya rechaza el cerrado; aquí se dice el código). */
  async periodoPlataforma(idPeriodo: string): Promise<{ idPeriodo: string; codigo: string; fechaInicio: string | null; fechaFin: string | null }> {
    const ref = parsearPeriodo(idPeriodo);
    if (!ref) throw new BadRequestException('El periodo no es válido.');
    if (ref.modelo !== 'plataforma') throw new BadRequestException('La carga y la copia solo funcionan con periodos de la plataforma.');
    const p = await this.alcance.periodoPorId(ref.id);
    if (!p) throw new NotFoundException('El periodo no existe.');
    if (p.cerrado) throw new ConflictException(`El periodo ${p.codigo} está cerrado: su programación no admite cambios.`);
    const f = (await this.dataSource.query(
      `SELECT to_char(fecha_inicio, 'YYYY-MM-DD') AS i, to_char(fecha_fin, 'YYYY-MM-DD') AS f FROM academic_work_plan.periodo_academico WHERE id = $1::bigint`, [ref.id]))[0];
    return { idPeriodo: ref.id, codigo: p.codigo, fechaInicio: f?.i ?? null, fechaFin: f?.f ?? null };
  }

  /**
   * Datos de referencia para la plantilla: asignaturas que el usuario puede programar
   * (con su programa y horas), ofertas CETAP del periodo y aulas. Solo lectura.
   */
  async referencia(idPeriodo: string, permisos: ReadonlySet<string>) {
    const periodo = await this.periodoPlataforma(idPeriodo);
    const niveles = nivelesProgramables(permisos);
    if (!niveles.length) throw new ForbiddenException('No tiene permisos de programación sobre ningún nivel académico.');
    const nivel = condicionNivelSql('pr.tipo', niveles, 2);
    const asignaturas = await this.dataSource.query(
      `SELECT upper(a.codigo) AS codigo, a.nombre, pr.codigo AS "codigoPrograma", pr.nombre AS programa,
              a.creditos, a.horas_clase AS "horasClase",
              EXISTS (SELECT 1 FROM academic_work_plan.oferta_cetap_programa o
                       WHERE o.id_programa = pr.id AND o.id_periodo_academico = $1::bigint AND o.activa AND o.deleted_at IS NULL) AS ofertada
         FROM academic_work_plan.asignatura a
         JOIN academic_work_plan.programa pr ON pr.id = a.id_programa
        WHERE a.deleted_at IS NULL AND COALESCE(a.activa, TRUE) AND a.codigo IS NOT NULL
          AND ${nivel.sql}
        ORDER BY pr.nombre, a.codigo`, [periodo.idPeriodo, ...nivel.params]);
    const ofertas = await this.dataSource.query(
      `SELECT c.codigo AS "codigoCetap", c.nombre AS cetap, pr.codigo AS "codigoPrograma", pr.nombre AS programa
         FROM academic_work_plan.oferta_cetap_programa o
         JOIN academic_work_plan.cetap c ON c.id = o.id_cetap
         JOIN academic_work_plan.programa pr ON pr.id = o.id_programa
        WHERE o.id_periodo_academico = $1::bigint AND o.activa AND o.deleted_at IS NULL
        ORDER BY c.nombre, pr.nombre`, [periodo.idPeriodo]);
    return { periodo, asignaturas, ofertas, maxFilas: MAX_FILAS };
  }
}
