import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { categoriaVinculacion } from './situacion-docente.js';
import { DocenciaService } from '../docencia/docencia.service.js';

/**
 * Acumulado de horas del docente frente a su tope — RN-04, RN-05, RN-06 (EFDS-1373).
 *
 * ⚠️ LA OFERTA ES UNA DIMENSIÓN DESDE EL DISEÑO. El acumulado se agrupa por
 * periodo (de plataforma o legado, EFDS-2328) y por tipo de oferta.
 * Hoy suele haber una sola, pero EFDS-1375 acumula por semestre entre las cinco;
 * atar el acumulado a una sola oferta obligaría a rehacer esto. Por eso el
 * desglose por oferta se calcula aunque exista una.
 *
 * ⚠️ TRANSVERSAL (RN-04). El acumulado suma TODAS las asignaciones del docente,
 * de cualquier programa y territorial; no se filtra por programa. El tope del
 * catedrático (304 h) es sobre ese total, no por programa.
 *
 * ⚠️ RN-06. Las horas de investigación y extensión ya están descontadas de
 * `horasAsignables` (el tope de docencia). Se exponen como consumo inalterable,
 * y no se prorratean: el tope de docencia es fijo.
 */

/** Tope transversal del catedrático, RN-04 (horas). */
export const TOPE_CATEDRA = 304;

export interface ConsumoPorOferta {
  idPeriodo: string | null;
  periodo: string | null;
  /** Oferta dentro del periodo de plataforma (EFDS-2328); null en periodos legado. */
  tipoOferta: string | null;
  horas: number;
}

export interface AcumuladoDocente {
  documento: string;
  nombre: string;
  categoriaVinculacion: string;
  /** Tope de docencia: 304 para cátedra (RN-04), `horasAsignables` en otro caso. */
  tope: number;
  /** Horas de investigación/extensión ya comprometidas (RN-06), inalterables. */
  horasInvestigacion: number;
  /** Suma transversal de todas las asignaciones vigentes. */
  totalAsignado: number;
  /** Cuánto queda antes del tope. Negativo = ya excedido. */
  disponible: number;
  /** Desglose por oferta académica (periodo). La dimensión de EFDS-1375. */
  porOferta: ConsumoPorOferta[];
}

@Injectable()
export class AcumuladoService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly docencia: DocenciaService,
  ) {}

  /**
   * `token` se reenvía al contrato PROG↔PTA, que calcula las horas de cada
   * asignatura (cálculo único). Sin él, el contrato responde 401 y esto falla
   * cerrado (503): no se inventa un acumulado.
   */
  async consumo(documento: string, token: string | null): Promise<AcumuladoDocente> {
    const limpio = String(documento ?? '').trim();
    const docFilas = await this.dataSource.query(
      `SELECT p.id_person             AS id_docente,
              p.nom_largo             AS nombre,
              d."tipoVinculacion"     AS vinculacion,
              d."horasAsignables"     AS horas_asignables,
              d."investigacion"       AS investigacion
         FROM academic_work_plan."Docente" d
         INNER JOIN auth.personas p ON p.id_person = d."personaId"
        WHERE p.num_identificacion = $1
        ORDER BY d."updatedAt" DESC NULLS LAST
        LIMIT 1`,
      [limpio],
    );
    if (!docFilas?.length) {
      throw new NotFoundException(`No existe un docente con documento ${limpio} en el RUND.`);
    }
    const drow = docFilas[0];
    const categoria = categoriaVinculacion(drow.vinculacion);

    // Tope: el catedrático tiene 304 h transversales (RN-04); los demás, su plan.
    const horasAsignables = Number(drow.horas_asignables ?? 0);
    const tope = categoria === 'CATEDRA' ? TOPE_CATEDRA : horasAsignables;

    // EFDS-2306: la docencia sale de la FRANJA (registro único), con las horas
    // del cálculo único del contrato y el reparto por días entre docentes. Antes
    // se sumaba asignacion_docente y lo tomado en el portal no contaba.
    const grupos = await this.docencia.porGrupo(drow.id_docente, drow.vinculacion ?? null, token);

    // Consumo por oferta (periodo y tipo de oferta). Es la dimensión de EFDS-1375.
    const porClave = new Map<string, ConsumoPorOferta>();
    for (const g of grupos) {
      const clave = `${g.idPeriodo ?? ''}|${g.tipoOferta ?? ''}`;
      const actual = porClave.get(clave)
        ?? { idPeriodo: g.idPeriodo, periodo: g.periodo, tipoOferta: g.tipoOferta, horas: 0 };
      actual.horas = Math.round((actual.horas + g.horas) * 10) / 10;
      porClave.set(clave, actual);
    }
    const porOferta = [...porClave.values()]
      .sort((a, b) => String(a.periodo ?? '').localeCompare(String(b.periodo ?? '')));

    const totalAsignado = Math.round(porOferta.reduce((s, o) => s + Number(o.horas), 0) * 10) / 10;

    return {
      documento: limpio,
      nombre: drow.nombre,
      categoriaVinculacion: categoria,
      tope,
      horasInvestigacion: Number(drow.investigacion ?? 0),
      totalAsignado,
      disponible: tope - totalAsignado,
      porOferta,
    };
  }
}
