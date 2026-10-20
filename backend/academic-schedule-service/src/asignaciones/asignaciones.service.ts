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
  private async cargarDocente(documento: string): Promise<DocenteParaAsignar & { situacionRaw: string | null; categoriaRaw: string | null; vinculacion: string | null }> {
    const filas = await this.dataSource.query(
      `SELECT p.id_person                    AS id_docente,
              p.nom_largo                    AS nombre,
              d."escalafon"                  AS escalafon,
              d."horasAsignables"            AS horas_pta,
              d."tipoVinculacion"            AS vinculacion,
              d."fechaInicioVinculacion"     AS desde,
              d."fechaFinVinculacion"        AS hasta,
              d."situacionAdministrativa"    AS situacion,
              d."situacionCategoria"         AS categoria
         FROM academic_work_plan."Docente" d
         INNER JOIN auth.personas p ON p.id_person = d."personaId"
        WHERE p.num_identificacion = $1
        ORDER BY d."updatedAt" DESC NULLS LAST
        LIMIT 1`,
      [String(documento).trim()],
    );
    if (!filas?.length) {
      throw new NotFoundException(`No existe un docente con documento ${documento} en el RUND.`);
    }
    const f = filas[0];
    const iso = (v: any) => (v ? new Date(v).toISOString().slice(0, 10) : null);
    return {
      idDocente: f.id_docente,
      nombre: f.nombre,
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
    };
  }

  private async cargarGrupo(idGrupo: string, horasRequeridas: number): Promise<GrupoParaAsignar & { codigoAsignatura: string | null }> {
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

    const franjas = await this.dataSource.query(
      `SELECT id_franja, dia_semana, hora_inicio, hora_fin
         FROM "academic-schedule".franja_horaria WHERE id_grupo = $1`,
      [idGrupo],
    );
    const iso = (v: any) => (v ? new Date(v).toISOString().slice(0, 10) : null);
    const ciclo = await cicloDelGrupo(this.dataSource, idGrupo);

    return {
      idGrupo: g.id_grupo,
      cicloInicio: ciclo.cicloInicio,
      cicloFin: ciclo.cicloFin,
      tipoPrograma: g.tipo_programa ?? null,
      codigoAsignatura: g.codigo_asignatura ?? null,
      fechaInicio: iso(g.fecha_inicio),
      fechaFin: iso(g.fecha_fin),
      franjas: franjas.map((f: any) => ({
        idFranja: f.id_franja,
        diaSemana: f.dia_semana,
        horaInicio: f.hora_inicio,
        horaFin: f.hora_fin,
      })),
      horasRequeridas,
    };
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
    // Impacto real calculado por el contrato (RN-03), no un dato del cliente.
    grupo.horasRequeridas = await this.impactoDelGrupo(grupo, docente, token ?? null);
    const ocupadas = await this.franjasOcupadas(docente.idDocente);
    const consumidas = await this.horasConsumidas(docente, idGrupo, token ?? null);
    const motivos = evaluarAsignacion(docente, grupo, ocupadas, consumidas);

    return { ...base, motivos, asignableAlGrupo: motivos.length === 0, horasImpacto: grupo.horasRequeridas };
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

    const grupo = await this.cargarGrupo(dto.idGrupo, 0);
    // Impacto real por el contrato (RN-03): el cliente no fija las horas — sería
    // un bypass del tope. Un `horasRequeridas` del DTO se ignora a propósito.
    grupo.horasRequeridas = await this.impactoDelGrupo(grupo, docente, token ?? null);
    const ocupadas = await this.franjasOcupadas(docente.idDocente);
    const consumidas = await this.horasConsumidas(docente, dto.idGrupo, token ?? null);

    const motivos = evaluarAsignacion(docente, grupo, ocupadas, consumidas);
    if (motivos.length > 0) {
      // Bloqueo duro: no se guarda nada.
      return { asignado: false, motivos };
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
