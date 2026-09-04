import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import {
  evaluarAsignacion,
  type DocenteParaAsignar,
  type FranjaOcupada,
  type GrupoParaAsignar,
  type MotivoRechazo,
} from './reglas-asignacion.js';
import { resolverSituacion } from './situacion-docente.js';

export interface AsignarDocenteDto {
  idGrupo: string;
  /** Documento del docente. Se resuelve a su id estable antes de decidir nada. */
  documento: string;
  horasRequeridas?: number;
  asignadoPor?: string;
  observaciones?: string | null;
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
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Datos del docente, resueltos por documento a su identidad estable. */
  private async cargarDocente(documento: string): Promise<DocenteParaAsignar & { situacionRaw: string | null; categoriaRaw: string | null }> {
    const filas = await this.dataSource.query(
      `SELECT p.id_person                    AS id_docente,
              p.nom_largo                    AS nombre,
              d."escalafon"                  AS escalafon,
              d."horasAsignables"            AS horas_pta,
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
      vinculacionDesde: iso(f.desde),
      vinculacionHasta: iso(f.hasta),
      // Las llena el llamador con el clasificador del contrato.
      situacionAsignable: true,
      situacionMotivo: null,
      situacionRaw: f.situacion ?? null,
      categoriaRaw: f.categoria ?? null,
    };
  }

  private async cargarGrupo(idGrupo: string, horasRequeridas: number): Promise<GrupoParaAsignar> {
    const filas = await this.dataSource.query(
      `SELECT g.id_grupo, g.fecha_inicio, g.fecha_fin, pr.tipo AS tipo_programa
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

    return {
      idGrupo: g.id_grupo,
      tipoPrograma: g.tipo_programa ?? null,
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
    const filas = await this.dataSource.query(
      `SELECT f.id_franja, f.id_grupo, f.dia_semana, f.hora_inicio, f.hora_fin
         FROM "academic-schedule".franja_horaria f
        WHERE f.id_docente = $1`,
      [idDocente],
    );
    return filas.map((f: any) => ({
      idFranja: f.id_franja,
      idGrupo: f.id_grupo,
      diaSemana: f.dia_semana,
      horaInicio: f.hora_inicio,
      horaFin: f.hora_fin,
    }));
  }

  /** Horas ya comprometidas del docente, sumadas de sus asignaciones vigentes. */
  private async horasConsumidas(idDocente: string, idGrupoExcluir: string): Promise<number> {
    const filas = await this.dataSource.query(
      `SELECT COALESCE(SUM(horas_asignadas), 0)::int AS total
         FROM "academic-schedule".asignacion_docente
        WHERE id_docente = $1 AND id_grupo <> $2 AND estado = 'ASIGNADO'`,
      [idDocente, idGrupoExcluir],
    );
    return Number(filas?.[0]?.total ?? 0);
  }

  /**
   * Consulta de SOLO LECTURA del docente para el panel (RN-09).
   *
   * La situación se resuelve en el servidor sobre el campo estructurado
   * `situacionCategoria`; el cliente nunca la envía. Con `idGrupo`, además evalúa
   * en seco las reglas de bloqueo y devuelve TODOS los motivos.
   */
  async consultarDocente(documento: string, idGrupo?: string): Promise<DocenteConsulta> {
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
    const ocupadas = await this.franjasOcupadas(docente.idDocente);
    const consumidas = await this.horasConsumidas(docente.idDocente, idGrupo);
    const motivos = evaluarAsignacion(docente, grupo, ocupadas, consumidas);

    return { ...base, motivos, asignableAlGrupo: motivos.length === 0 };
  }

  /**
   * Asigna, o rechaza con TODOS los motivos.
   *
   * La situación administrativa se resuelve AQUÍ, sobre el campo estructurado del
   * RUND: el cliente no la envía. Confiar en una `asignable` del cliente sería un
   * bypass del bloqueo duro.
   */
  async asignar(dto: AsignarDocenteDto): Promise<ResultadoAsignacion> {
    if (!dto?.idGrupo || !dto?.documento) {
      throw new BadRequestException('Debe indicar el grupo y el documento del docente.');
    }

    const docente = await this.cargarDocente(dto.documento);
    const situacion = resolverSituacion(docente.categoriaRaw, docente.situacionRaw);
    docente.situacionAsignable = situacion.asignable;
    docente.situacionMotivo = situacion.motivo;

    const grupo = await this.cargarGrupo(dto.idGrupo, Number(dto.horasRequeridas ?? 0));
    const ocupadas = await this.franjasOcupadas(docente.idDocente);
    const consumidas = await this.horasConsumidas(docente.idDocente, dto.idGrupo);

    const motivos = evaluarAsignacion(docente, grupo, ocupadas, consumidas);
    if (motivos.length > 0) {
      // Bloqueo duro: no se guarda nada.
      return { asignado: false, motivos };
    }

    const filas = await this.dataSource.query(
      `INSERT INTO "academic-schedule".asignacion_docente
         (id_grupo, id_docente, horas_asignadas, asignado_por, observaciones, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (id_grupo) DO UPDATE
         SET id_docente = EXCLUDED.id_docente,
             horas_asignadas = EXCLUDED.horas_asignadas,
             asignado_por = EXCLUDED.asignado_por,
             observaciones = EXCLUDED.observaciones,
             estado = 'ASIGNADO',
             updated_at = NOW()
       RETURNING id_asignacion`,
      [dto.idGrupo, docente.idDocente, grupo.horasRequeridas, dto.asignadoPor ?? null, dto.observaciones ?? null],
    );

    return { asignado: true, idAsignacion: filas[0].id_asignacion };
  }

  /** Retira la asignación del grupo y libera sus franjas. */
  async retirar(idGrupo: string): Promise<{ retirado: boolean }> {
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
}
