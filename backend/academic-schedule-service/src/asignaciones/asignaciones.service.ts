import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

import {
  evaluarAsignacion,
  type DocenteParaAsignar,
  type FranjaOcupada,
  type GrupoParaAsignar,
  type MotivoRechazo,
} from './reglas-asignacion.js';
import { resolverSituacion } from './situacion-docente.js';
import { topeDeDocencia } from './tope.js';
import { ContratoClient } from './contrato-client.js';
import { DocenciaService } from '../docencia/docencia.service.js';
import { cargarFranjasCruceables, cicloDelGrupo } from '../horarios/choque.js';
import { tomaDeFranjasHabilitada } from '../portal-docente/flujo-docente.js';
import { areaDelGrupo, docentesDelArea, motivoDeArea, nucleosDeDocentes } from './area-docente.js';

export interface AsignarDocenteDto {
  idGrupo: string;
  /** Documento del docente. Se resuelve a su id estable antes de decidir nada. */
  documento: string;
  horasRequeridas?: number;
  asignadoPor?: string;
  observaciones?: string | null;
  /**
   * Quién confirma que se contactó al docente y está disponible en el periodo
   * (AC-03, EFDS-1376). Si viene, se registra con la fecha; si no, queda nulo.
   */
  disponibilidadConfirmadaPor?: string | null;
  /**
   * Franjas del grupo que se asignan a este docente (EFDS-2341). Sin `franjas`, todas:
   * un docente por grupo, como antes. Con un subconjunto, solo esas: el resto conserva
   * el docente que tenga. Un docente por franja.
   */
  franjas?: string[];
}

type DocenteCargado = DocenteParaAsignar & {
  documento: string;
  perfil: string | null;
  titulos: Record<'pregrado' | 'especializacion' | 'maestria' | 'doctorado' | 'posdoctorado', string | null>;
  situacionRaw: string | null;
  categoriaRaw: string | null;
  vinculacion: string | null;
};

/** Franja del grupo con su docente actual: base del reparto y de la asignación por franja. */
interface FranjaDelGrupo {
  idFranja: string;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  idDocente: string | null;
  estado: string | null;
}

/** Candidato a dictar las franjas (EFDS-2341). Solo aparecen docentes del área. */
export interface Candidato {
  documento: string;
  nombre: string;
  vinculacion: string | null;
  perfil: string | null;
  titulos: DocenteCargado['titulos'];
  /** Núcleos del docente que cuentan, con su origen (`rund` | `puente`). */
  nucleos: Array<{ area: string; origen: 'rund' | 'puente'; texto: string | null }>;
  /** Origen por el que es del área de la asignatura. */
  origenArea: 'rund' | 'puente';
  /** Horas de docencia ya programadas (cálculo único), sin este grupo. */
  horasProgramadas: number;
  /** Horas que le sumaría dictar las franjas pedidas. */
  horasImpacto: number;
  tope: number;
  cruce: boolean;
  /** Bloqueos de EFDS-1372 (situación, escalafón, vinculación, cruce, tope). */
  motivos: MotivoRechazo[];
  asignable: boolean;
}

export interface ResultadoCandidatos {
  grupo: string;
  franjas: Array<{ idFranja: string; diaSemana: string; horaInicio: string; horaFin: string; docenteActual: string | null }>;
  area: { codigo: string; nombre: string; nucleoAsignatura: string | null } | null;
  candidatos: Candidato[];
  sugerido: { documento: string; nombre: string; razones: string[] } | null;
  /** Explica por qué no hay candidatos o no hay sugerido. Nulo si hay sugerido. */
  mensaje: string | null;
}

export interface ResultadoAsignacion {
  asignado: boolean;
  idAsignacion?: string;
  motivos?: MotivoRechazo[];
}

/**
 * Vista de SOLO LECTURA del docente para el panel de asignación (RN-09).
 *
 * El RUND no se escribe desde aquí: esto es lo que la decanatura ve para decidir.
 * Si `idGrupo` acompaña la consulta, `motivos` trae la evaluación en seco contra
 * ese grupo — los mismos motivos que bloquearían la asignación, sin guardarla.
 */
export interface DocenteConsulta {
  documento: string;
  nombre: string;
  escalafon: string | null;
  vinculacionDesde: string | null;
  /** Nulo = vinculación indefinida, no dato faltante (RN-10). */
  vinculacionHasta: string | null;
  horasPta: number;
  situacion: {
    descripcion: string | null;
    categoria: string | null;
    asignable: boolean;
    motivo: string | null;
    vigenteHasta: string | null;
  };
  /** Presente solo si se consultó con `idGrupo`. Todos los motivos, no el primero. */
  motivos?: MotivoRechazo[];
  /** true solo si no hay ningún motivo de bloqueo contra el grupo consultado. */
  asignableAlGrupo?: boolean;
  /** Impacto en horas que tendría esta asignación (factor RN-03). */
  horasImpacto?: number;
}

/**
 * Asignación de docente con BLOQUEO DURO — EFDS-1372.
 *
 * ⚠️ Bloqueo duro es duro: si alguna regla falla, NO se guarda. No es una
 * advertencia que el usuario pueda ignorar.
 *
 * Todas las comparaciones se hacen por identificador (`id_person`, `id_grupo`),
 * nunca por nombre: un no-match silencioso aquí permitiría la asignación que
 * debía rechazarse, que es el error caro.
 */
@Injectable()
export class AsignacionesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly contrato: ContratoClient,
    private readonly docencia: DocenciaService,
  ) {}

  /** Datos del docente, resueltos por documento a su identidad estable. */
  private async cargarDocente(documento: string): Promise<DocenteCargado> {
    const filas = await this.consultarDocentes('p.num_identificacion = $1', [String(documento).trim()]);
    if (!filas.length) {
      throw new NotFoundException(`No existe un docente con documento ${documento} en el RUND.`);
    }
    return filas[0];
  }

  /**
   * Docentes del RUND con lo que necesita el panel: identidad, vinculación, situación
   * y, para los candidatos (EFDS-2341), perfil y títulos. Una fila por persona (la
   * más reciente del banco).
   */
  private async consultarDocentes(filtro: string, params: unknown[]): Promise<DocenteCargado[]> {
    const filas = await this.dataSource.query(
      `SELECT DISTINCT ON (p.id_person)
              p.id_person                    AS id_docente,
              p.num_identificacion           AS documento,
              p.nom_largo                    AS nombre,
              d."perfilAcademico"            AS perfil,
              d."pregrado", d."especializacion", d."maestria", d."doctorado", d."posDoctorado" AS posdoctorado,
              d."escalafon"                  AS escalafon,
              d."horasAsignables"            AS horas_pta,
              d."tipoVinculacion"            AS vinculacion,
              d."fechaInicioVinculacion"     AS desde,
              d."fechaFinVinculacion"        AS hasta,
              d."situacionAdministrativa"    AS situacion,
              d."situacionCategoria"         AS categoria
         FROM academic_work_plan."Docente" d
         INNER JOIN auth.personas p ON p.id_person = d."personaId"
        WHERE ${filtro}
        ORDER BY p.id_person, d."updatedAt" DESC NULLS LAST`,
      params,
    );
    const iso = (v: any) => (v ? new Date(v).toISOString().slice(0, 10) : null);
    return (filas ?? []).map((f: any) => ({
      idDocente: f.id_docente,
      documento: f.documento,
      nombre: f.nombre,
      perfil: f.perfil ?? null,
      titulos: {
        pregrado: f.pregrado ?? null,
        especializacion: f.especializacion ?? null,
        maestria: f.maestria ?? null,
        doctorado: f.doctorado ?? null,
        posdoctorado: f.posdoctorado ?? null,
      },
      escalafon: f.escalafon ?? null,
      horasPta: Number(f.horas_pta ?? 0),
      // El tope que se hace cumplir es el MISMO que ve el docente en su portal.
      tope: topeDeDocencia(f.vinculacion, f.horas_pta),
      vinculacion: f.vinculacion ?? null,
      vinculacionDesde: iso(f.desde),
      vinculacionHasta: iso(f.hasta),
      // Las llena el llamador con el clasificador del contrato.
      situacionAsignable: true,
      situacionMotivo: null,
      situacionRaw: f.situacion ?? null,
      categoriaRaw: f.categoria ?? null,
    }));
  }

  /**
   * El grupo con TODAS sus franjas y las que se evalúan (`seleccion`). Sin selección,
   * se evalúan todas. Una franja pedida que no es del grupo se rechaza.
   */
  private async cargarGrupo(idGrupo: string, horasRequeridas: number, seleccion?: string[]): Promise<GrupoParaAsignar & {
    codigoAsignatura: string | null; todas: FranjaDelGrupo[]; seleccionadas: string[]; completo: boolean;
  }> {
    const filas = await this.dataSource.query(
      `SELECT g.id_grupo, g.fecha_inicio, g.fecha_fin, pr.tipo AS tipo_programa, a.codigo AS codigo_asignatura
         FROM "academic-schedule".grupo g
         JOIN academic_work_plan.asignatura a ON a.id = g.id_asignatura
         JOIN academic_work_plan.programa  pr ON pr.id = a.id_programa
        WHERE g.id_grupo = $1`,
      [idGrupo],
    );
    if (!filas?.length) throw new NotFoundException('El grupo no existe.');
    const g = filas[0];

    const filasFranja: any[] = await this.dataSource.query(
      `SELECT id_franja::text AS id_franja, dia_semana, hora_inicio, hora_fin, id_docente::text AS id_docente, estado
         FROM "academic-schedule".franja_horaria WHERE id_grupo = $1
        ORDER BY dia_semana, hora_inicio`,
      [idGrupo],
    );
    const todas: FranjaDelGrupo[] = filasFranja.map((f) => ({
      idFranja: f.id_franja, diaSemana: f.dia_semana, horaInicio: f.hora_inicio, horaFin: f.hora_fin,
      idDocente: f.id_docente ?? null, estado: f.estado ?? null,
    }));
    const pedidas = [...new Set((seleccion ?? []).map((x) => String(x).trim()).filter(Boolean))];
    const ajenas = pedidas.filter((id) => !todas.some((f) => f.idFranja === id));
    if (ajenas.length) throw new BadRequestException('Alguna de las franjas indicadas no es de este grupo.');
    const seleccionadas = pedidas.length ? pedidas : todas.map((f) => f.idFranja);
    const franjas = todas.filter((f) => seleccionadas.includes(f.idFranja));
    const iso = (v: any) => (v ? new Date(v).toISOString().slice(0, 10) : null);
    const ciclo = await cicloDelGrupo(this.dataSource, idGrupo);

    return {
      todas,
      seleccionadas,
      completo: seleccionadas.length === todas.length,
      idGrupo: g.id_grupo,
      cicloInicio: ciclo.cicloInicio,
      cicloFin: ciclo.cicloFin,
      tipoPrograma: g.tipo_programa ?? null,
      codigoAsignatura: g.codigo_asignatura ?? null,
      fechaInicio: iso(g.fecha_inicio),
      fechaFin: iso(g.fecha_fin),
      // Solo las franjas que se asignan cuentan para el cruce.
      franjas: franjas.map((f) => ({
        idFranja: f.idFranja,
        diaSemana: f.diaSemana,
        horaInicio: f.horaInicio,
        horaFin: f.horaFin,
      })),
      horasRequeridas,
    };
  }

  /**
   * Horas que le suma al docente dictar las franjas seleccionadas: las del grupo por el
   * contrato (cálculo único) × su fracción con la regla de reparto vigente, contando
   * las franjas seleccionadas como suyas. Con todas las franjas, la fracción es 1.
   */
  private async horasDeLaSeleccion(
    grupo: { codigoAsignatura: string | null; todas: FranjaDelGrupo[]; seleccionadas: string[] },
    docente: { idDocente: string; vinculacion: string | null },
    token: string | null,
  ): Promise<number> {
    const horasGrupo = await this.impactoDelGrupo(grupo, docente, token);
    const despues = grupo.todas.map((f) => (grupo.seleccionadas.includes(f.idFranja) ? { ...f, idDocente: docente.idDocente } : f));
    return Math.round(horasGrupo * this.docencia.fraccion(despues, docente.idDocente) * 10) / 10;
  }

  /**
   * Franjas que el docente ya ocupa, en CUALQUIER programa o nivel (RN-07).
   *
   * Se consulta por `id_docente`, que es el mismo `id_person`: la comparación es
   * por identificador y no por nombre.
   */
  private async franjasOcupadas(idDocente: string): Promise<FranjaOcupada[]> {
    // Con su ciclo efectivo: lo que el docente tiene en otro periodo no lo ocupa en este.
    const franjas = await cargarFranjasCruceables(this.dataSource, 'f.id_docente = $1', [idDocente]);
    return franjas.map((f) => ({
      idFranja: f.idFranja,
      idGrupo: f.idGrupo as string,
      diaSemana: f.diaSemana,
      horaInicio: f.horaInicio,
      horaFin: f.horaFin,
      cicloInicio: f.cicloInicio,
      cicloFin: f.cicloFin,
    }));
  }

  /**
   * Horas ya comprometidas del docente, SIN el grupo que se evalúa — EFDS-2306.
   * Salen del registro único (la franja), con el cálculo único del contrato:
   * cuentan también las franjas tomadas en el portal, que antes no se veían.
   */
  private horasConsumidas(
    docente: { idDocente: string; vinculacion: string | null },
    idGrupoExcluir: string,
    token: string | null,
  ): Promise<number> {
    return this.docencia.total(docente.idDocente, docente.vinculacion, token, idGrupoExcluir);
  }

  /**
   * Consulta de SOLO LECTURA del docente para el panel (RN-09).
   *
   * La situación se resuelve en el servidor sobre el campo estructurado
   * `situacionCategoria`; el cliente nunca la envía. Con `idGrupo`, además evalúa
   * en seco las reglas de bloqueo y devuelve TODOS los motivos.
   */
  async consultarDocente(documento: string, idGrupo?: string, token?: string | null): Promise<DocenteConsulta> {
    const docente = await this.cargarDocente(documento);
    const situacion = resolverSituacion(docente.categoriaRaw, docente.situacionRaw);

    const base: DocenteConsulta = {
      documento: String(documento).trim(),
      nombre: docente.nombre,
      escalafon: docente.escalafon,
      vinculacionDesde: docente.vinculacionDesde,
      vinculacionHasta: docente.vinculacionHasta,
      horasPta: docente.horasPta,
      situacion: {
        descripcion: docente.situacionRaw,
        categoria: situacion.categoria,
        asignable: situacion.asignable,
        motivo: situacion.motivo,
        vigenteHasta: situacion.vigenteHasta,
      },
    };

    if (!idGrupo) return base;

    docente.situacionAsignable = situacion.asignable;
    docente.situacionMotivo = situacion.motivo;
    const grupo = await this.cargarGrupo(idGrupo, 0);
    const { motivos } = await this.evaluar(docente, grupo, token ?? null);

    return { ...base, motivos, asignableAlGrupo: motivos.length === 0, horasImpacto: grupo.horasRequeridas };
  }

  /**
   * Evaluación completa en seco: área (EFDS-2341) + bloqueo duro (EFDS-1372). Fija en
   * `grupo.horasRequeridas` el impacto real del contrato (RN-03), no un dato del cliente.
   */
  private async evaluar(
    docente: DocenteCargado,
    grupo: Awaited<ReturnType<AsignacionesService['cargarGrupo']>>,
    token: string | null,
    area?: Awaited<ReturnType<typeof areaDelGrupo>>,
  ): Promise<{ motivos: MotivoRechazo[]; consumidas: number }> {
    grupo.horasRequeridas = await this.horasDeLaSeleccion(grupo, docente, token);
    const ocupadas = await this.franjasOcupadas(docente.idDocente);
    const consumidas = await this.horasConsumidas(docente, grupo.idGrupo, token);
    const motivos = evaluarAsignacion(docente, grupo, ocupadas, consumidas);
    const areaGrupo = area !== undefined ? area : await areaDelGrupo(this.dataSource, grupo.idGrupo);
    const nucleos = (await nucleosDeDocentes(this.dataSource, [docente.idDocente])).get(docente.idDocente) ?? [];
    const porArea = motivoDeArea(areaGrupo, nucleos);
    // El área va primero: es lo que decide si el docente siquiera es candidato.
    return { motivos: porArea ? [porArea, ...motivos] : motivos, consumidas };
  }

  /**
   * Impacto en horas del grupo para el docente, calculado por el CONTRATO (RN-03).
   * El cálculo es lógica del PTA y no se reimplementa: se consume por HTTP. Si el
   * grupo no tiene código de asignatura, el impacto es 0 (no hay qué calcular).
   */
  private async impactoDelGrupo(
    grupo: { codigoAsignatura: string | null },
    docente: { vinculacion: string | null },
    token: string | null,
  ): Promise<number> {
    if (!grupo.codigoAsignatura) return 0;
    const calc = await this.contrato.calcularImpacto(grupo.codigoAsignatura, docente.vinculacion, token);
    return Number(calc.horasImpacto ?? 0);
  }

  /**
   * Asigna, o rechaza con TODOS los motivos.
   *
   * La situación administrativa se resuelve AQUÍ, sobre el campo estructurado del
   * RUND: el cliente no la envía. Confiar en una `asignable` del cliente sería un
   * bypass del bloqueo duro.
   */
  async asignar(dto: AsignarDocenteDto, token?: string | null): Promise<ResultadoAsignacion> {
    if (!dto?.idGrupo || !dto?.documento) {
      throw new BadRequestException('Debe indicar el grupo y el documento del docente.');
    }

    const docente = await this.cargarDocente(dto.documento);
    const situacion = resolverSituacion(docente.categoriaRaw, docente.situacionRaw);
    docente.situacionAsignable = situacion.asignable;
    docente.situacionMotivo = situacion.motivo;

    const grupo = await this.cargarGrupo(dto.idGrupo, 0, dto.franjas);
    // Impacto real por el contrato (RN-03): el cliente no fija las horas — sería
    // un bypass del tope. Un `horasRequeridas` del DTO se ignora a propósito.
    // Fuera de su área no se asigna (decisión 6): el área es un motivo más del bloqueo.
    const { motivos } = await this.evaluar(docente, grupo, token ?? null);
    if (motivos.length > 0) {
      // Bloqueo duro: no se guarda nada.
      return { asignado: false, motivos };
    }

    // Solo algunas franjas (EFDS-2341): se escriben en la franja, que es el registro único.
    if (!grupo.completo) {
      return this.dataSource.transaction((m) => this.asignarFranjas(m, dto, docente.idDocente, grupo.seleccionadas));
    }

    const insertar = (q: Pick<EntityManager, 'query'>) => q.query(
        `INSERT INTO "academic-schedule".asignacion_docente
           (id_grupo, id_docente, horas_asignadas, asignado_por, observaciones,
            disponibilidad_confirmada_por, disponibilidad_confirmada_en, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::text, CASE WHEN $6::text IS NULL THEN NULL ELSE NOW() END, NOW())
         ON CONFLICT (id_grupo) DO UPDATE
           SET id_docente = EXCLUDED.id_docente,
               horas_asignadas = EXCLUDED.horas_asignadas,
               asignado_por = EXCLUDED.asignado_por,
               observaciones = EXCLUDED.observaciones,
               disponibilidad_confirmada_por = EXCLUDED.disponibilidad_confirmada_por,
               disponibilidad_confirmada_en = EXCLUDED.disponibilidad_confirmada_en,
               estado = 'ASIGNADO',
               updated_at = NOW()
         RETURNING id_asignacion`,
        [dto.idGrupo, docente.idDocente, grupo.horasRequeridas, dto.asignadoPor ?? null, dto.observaciones ?? null, dto.disponibilidadConfirmadaPor ?? null],
      );
    // Flujo anterior: tal como estaba. Flujo nuevo (EFDS-2348): franjas y asignación en una transacción.
    const filas = tomaDeFranjasHabilitada()
      ? await insertar(this.dataSource)
      : await this.dataSource.transaction(async (m) => {
        await this.prepararFranjasParaAsignar(m, dto.idGrupo, docente.idDocente);
        return insertar(m);
      });

    return { asignado: true, idAsignacion: filas[0].id_asignacion };
  }

  /**
   * Asignación de ALGUNAS franjas del grupo (EFDS-2341): un docente por franja. Se
   * escribe en la franja (registro único) y `asignacion_docente`, que es «el docente
   * del grupo», queda solo si todas las franjas tienen el mismo docente; si el grupo
   * queda repartido, se retira (su trigger pondría un solo docente en todas).
   * Lo APROBADO de otro docente no se toca, igual que en la asignación completa.
   */
  private async asignarFranjas(m: EntityManager, dto: AsignarDocenteDto, idDocente: string, idsFranja: string[]): Promise<ResultadoAsignacion> {
    await m.query(`SELECT 1 FROM "academic-schedule".grupo WHERE id_grupo = $1 FOR UPDATE`, [dto.idGrupo]);
    const aprobadas = await m.query(
      `SELECT 1 FROM "academic-schedule".franja_horaria
        WHERE id_franja = ANY($1::uuid[]) AND estado = 'APROBADA' AND id_docente IS DISTINCT FROM $2::uuid LIMIT 1`,
      [idsFranja, idDocente],
    );
    if (aprobadas.length) {
      throw new ConflictException(
        'Alguna de las franjas tiene docencia aprobada en la concertación de otro docente: devuélvala antes de reasignarla.');
    }
    // Flujo nuevo: con docente y pendiente de concertación (TOMADA), como la asignación completa.
    const estado = tomaDeFranjasHabilitada()
      ? 'estado'
      : `CASE WHEN estado IN ('PROGRAMADO', 'PUBLICADA', 'DEVUELTA', 'TOMADA') THEN 'TOMADA' ELSE estado END`;
    await m.query(
      `UPDATE "academic-schedule".franja_horaria
          SET id_docente = $3::uuid, estado = ${estado}, updated_at = NOW()
        WHERE id_grupo = $1 AND id_franja = ANY($2::uuid[])`,
      [dto.idGrupo, idsFranja, idDocente],
    );
    const docentes: Array<{ id_docente: string | null }> = await m.query(
      `SELECT DISTINCT id_docente::text AS id_docente FROM "academic-schedule".franja_horaria WHERE id_grupo = $1`,
      [dto.idGrupo],
    );
    if (docentes.length === 1 && docentes[0].id_docente === idDocente) {
      // Quedó todo el grupo con este docente: es su asignación completa.
      const filas = await m.query(
        `INSERT INTO "academic-schedule".asignacion_docente (id_grupo, id_docente, asignado_por, observaciones, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (id_grupo) DO UPDATE SET id_docente = EXCLUDED.id_docente, asignado_por = EXCLUDED.asignado_por,
           observaciones = EXCLUDED.observaciones, estado = 'ASIGNADO', updated_at = NOW()
         RETURNING id_asignacion`,
        [dto.idGrupo, idDocente, dto.asignadoPor ?? null, dto.observaciones ?? null],
      );
      return { asignado: true, idAsignacion: filas[0].id_asignacion };
    }
    await m.query(`DELETE FROM "academic-schedule".asignacion_docente WHERE id_grupo = $1`, [dto.idGrupo]);
    return { asignado: true };
  }

  /**
   * Candidatos para las franjas de un grupo — EFDS-2341 (HU EFDS-2371).
   *
   * Solo aparecen docentes cuyo núcleo es del área de la asignatura: nadie fuera de su
   * área, sin excepción ni asignación forzada. Si no hay ninguno, la respuesta lo dice.
   * Para cada uno se evalúan en seco las MISMAS reglas que la asignación, sobre las
   * franjas pedidas (o todas). El sugerido es el apto (sin bloqueos ni cruce) con
   * menos horas programadas; empate, por cédula. Se explica por qué.
   */
  async candidatos(idGrupo: string, franjas: string[] | undefined, token: string | null): Promise<ResultadoCandidatos> {
    const grupo = await this.cargarGrupo(idGrupo, 0, franjas);
    const area = await areaDelGrupo(this.dataSource, idGrupo);
    const ocupantes = [...new Set(grupo.todas.map((f) => f.idDocente).filter((x): x is string => !!x))];
    const nombres = new Map<string, string>(
      ocupantes.length
        ? (await this.dataSource.query(
          `SELECT id_person::text AS id, nom_largo FROM auth.personas WHERE id_person = ANY($1::uuid[])`, [ocupantes],
        )).map((p: any) => [p.id, p.nom_largo])
        : [],
    );
    const base: ResultadoCandidatos = {
      grupo: idGrupo,
      franjas: grupo.todas.filter((f) => grupo.seleccionadas.includes(f.idFranja)).map((f) => ({
        idFranja: f.idFranja, diaSemana: f.diaSemana, horaInicio: String(f.horaInicio).slice(0, 5),
        horaFin: String(f.horaFin).slice(0, 5), docenteActual: f.idDocente ? nombres.get(f.idDocente) ?? null : null,
      })),
      area: area ? { codigo: area.codigo, nombre: area.nombre, nucleoAsignatura: area.nucleoAsignatura } : null,
      candidatos: [],
      sugerido: null,
      mensaje: null,
    };
    if (!area) {
      return { ...base, mensaje: 'La asignatura no tiene área de formación: no hay docentes aptos hasta que se le asigne una en el catálogo.' };
    }

    const ids = await docentesDelArea(this.dataSource, area.idArea);
    const docentes = ids.length ? await this.consultarDocentes('p.id_person = ANY($1::uuid[])', [ids]) : [];
    if (!docentes.length) {
      return { ...base, mensaje: `Ningún docente tiene núcleo temático en el área «${area.nombre}».` };
    }
    const nucleos = await nucleosDeDocentes(this.dataSource, docentes.map((d) => d.idDocente));

    const candidatos: Candidato[] = [];
    for (const docente of docentes) {
      const situacion = resolverSituacion(docente.categoriaRaw, docente.situacionRaw);
      docente.situacionAsignable = situacion.asignable;
      docente.situacionMotivo = situacion.motivo;
      const evaluado = { ...grupo };
      const { motivos, consumidas } = await this.evaluar(docente, evaluado, token, area);
      const propios = nucleos.get(docente.idDocente) ?? [];
      candidatos.push({
        documento: docente.documento,
        nombre: docente.nombre,
        vinculacion: docente.vinculacion,
        perfil: docente.perfil,
        titulos: docente.titulos,
        nucleos: propios.map((n) => ({ area: n.nombre, origen: n.origen, texto: n.texto })),
        origenArea: propios.find((n) => n.idArea === area.idArea)?.origen ?? 'rund',
        horasProgramadas: consumidas,
        horasImpacto: evaluado.horasRequeridas,
        tope: docente.tope ?? docente.horasPta,
        cruce: motivos.some((x) => x.regla === 'RN-07'),
        motivos,
        asignable: motivos.length === 0,
      });
    }

    const porCedula = (a: Candidato, b: Candidato) => a.documento.localeCompare(b.documento, 'es', { numeric: true });
    candidatos.sort((a, b) => Number(b.asignable) - Number(a.asignable) || a.horasProgramadas - b.horasProgramadas || porCedula(a, b));
    const aptos = candidatos.filter((c) => c.asignable);
    if (!aptos.length) {
      return { ...base, candidatos, mensaje: `Hay ${candidatos.length} docente(s) del área «${area.nombre}», pero todos tienen algún bloqueo: revise los motivos.` };
    }

    const elegido = aptos[0];
    const empatados = aptos.filter((c) => c.horasProgramadas === elegido.horasProgramadas).length - 1;
    const texto = elegido.nucleos.find((n) => n.area === area.nombre && n.origen === elegido.origenArea)?.texto;
    const razones = [
      `Es del área «${area.nombre}» por su núcleo ${elegido.origenArea === 'rund' ? 'del RUND' : 'de puente (asignaturas que ya dicta)'}${texto ? `: «${texto}»` : ''}.`,
      `Tiene ${elegido.horasProgramadas} h programadas${aptos.length > 1 ? ', la menor entre los aptos' : ''}; dictar estas franjas le suma ${elegido.horasImpacto} h (tope ${elegido.tope} h).`,
      'No tiene cruce de horario con las franjas pedidas.',
      'No tiene bloqueos de situación administrativa, vinculación, escalafón ni tope (EFDS-1372).',
    ];
    if (empatados > 0) razones.push(`Empata en horas con ${empatados} docente(s) apto(s); se desempata por cédula.`);
    return { ...base, candidatos, sugerido: { documento: elegido.documento, nombre: elegido.nombre, razones } };
  }

  /**
   * Flujo nuevo (EFDS-2348): el docente no toma, se le asigna. Antes de grabar la
   * asignación (cuyo trigger pone el docente en las franjas del grupo), las franjas
   * pasan a TOMADA —«con docente, pendiente de concertación»—: así el portal se las
   * muestra y la concertación las envía igual que antes. Va en la misma transacción.
   *
   * ⚠️ Lo APROBADO no se toca: si el grupo ya tiene franjas aprobadas en la
   * concertación de OTRO docente, reasignarlo cambiaría docencia aprobada (y su PTA).
   * Hay que devolver la concertación primero.
   */
  private async prepararFranjasParaAsignar(m: EntityManager, idGrupo: string, idDocente: string): Promise<void> {
    await m.query(`SELECT 1 FROM "academic-schedule".grupo WHERE id_grupo = $1 FOR UPDATE`, [idGrupo]);
    const aprobadas = await m.query(
      `SELECT 1 FROM "academic-schedule".franja_horaria
        WHERE id_grupo = $1 AND estado = 'APROBADA' AND id_docente IS DISTINCT FROM $2::uuid LIMIT 1`,
      [idGrupo, idDocente],
    );
    if (aprobadas.length) {
      throw new ConflictException(
        'El grupo ya tiene docencia aprobada en la concertación de otro docente: devuélvala antes de reasignarlo.');
    }
    await m.query(
      `UPDATE "academic-schedule".franja_horaria
          SET estado = 'TOMADA', comentario_jefatura = NULL, updated_at = NOW()
        WHERE id_grupo = $1 AND estado IN ('PROGRAMADO', 'PUBLICADA', 'DEVUELTA', 'TOMADA')`,
      [idGrupo],
    );
  }

  /** Retira la asignación del grupo y libera sus franjas. */
  async retirar(idGrupo: string): Promise<{ retirado: boolean }> {
    if (!tomaDeFranjasHabilitada()) return this.retirarAsignada(idGrupo);
    const r = await this.dataSource.query(
      `DELETE FROM "academic-schedule".asignacion_docente WHERE id_grupo = $1 RETURNING id_asignacion`,
      [idGrupo],
    );
    if (r?.length) {
      // Liberar el bloqueo: las franjas dejan de contar contra ese docente.
      await this.dataSource.query(
        `UPDATE "academic-schedule".franja_horaria SET id_docente = NULL WHERE id_grupo = $1`,
        [idGrupo],
      );
    }
    return { retirado: (r?.length ?? 0) > 0 };
  }

  /**
   * Retiro en el flujo nuevo: las franjas vuelven a PROGRAMADO sin docente, para
   * asignarlas a otro. Lo APROBADO en la concertación no se retira desde aquí.
   */
  private async retirarAsignada(idGrupo: string): Promise<{ retirado: boolean }> {
    return this.dataSource.transaction(async (m) => {
      await m.query(`SELECT 1 FROM "academic-schedule".grupo WHERE id_grupo = $1 FOR UPDATE`, [idGrupo]);
      const aprobadas = await m.query(
        `SELECT 1 FROM "academic-schedule".franja_horaria WHERE id_grupo = $1 AND estado = 'APROBADA' LIMIT 1`, [idGrupo]);
      if (aprobadas.length) {
        throw new ConflictException(
          'El grupo tiene docencia aprobada en la concertación: devuélvala antes de retirar al docente.');
      }
      const r = await m.query(
        `DELETE FROM "academic-schedule".asignacion_docente WHERE id_grupo = $1 RETURNING id_asignacion`, [idGrupo]);
      await m.query(
        `UPDATE "academic-schedule".franja_horaria
            SET id_docente = NULL, estado = 'PROGRAMADO', comentario_jefatura = NULL, updated_at = NOW()
          WHERE id_grupo = $1 AND estado IN ('TOMADA', 'DEVUELTA')`, [idGrupo]);
      return { retirado: (r?.length ?? 0) > 0 };
    });
  }
}
