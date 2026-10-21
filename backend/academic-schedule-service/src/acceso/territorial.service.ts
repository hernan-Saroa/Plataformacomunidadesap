import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { ofertasCetapPorId } from '../grupos/oferta-cetap.js';

/**
 * Territorial de un grupo — EFDS-2315.
 *
 * Sale de la oferta CETAP del grupo (migración 040), que crea la carga masiva:
 * CETAP → `direccion_territorial.codigo` ('DT-009') = `auth.seccionales.cod_seccional`,
 * que escribe la carga masiva de estructura de auth. Es el mismo dato que el
 * PTA guarda en `asignaturas[].territorial_id`. Sin tablas mantenidas a mano.
 */
@Injectable()
export class TerritorialService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Territorial (auth.seccionales.id_seccional) de cada grupo; null = sin oferta o sin cruce. */
  async territorialesDeGrupos(idsGrupo: readonly string[]): Promise<Map<string, string | null>> {
    const resultado = new Map<string, string | null>(idsGrupo.map((id) => [id, null]));
    if (!idsGrupo.length) return resultado;
    const grupos: Array<{ id: string; oferta: string | null }> = await this.dataSource.query(
      `SELECT id_grupo::text AS id, id_oferta_cetap::text AS oferta
         FROM "academic-schedule".grupo WHERE id_grupo = ANY($1::uuid[])`,
      [idsGrupo]);
    const ofertas = await ofertasCetapPorId(this.dataSource, grupos.map((g) => g.oferta).filter((x): x is string => !!x));
    for (const g of grupos) resultado.set(g.id, (g.oferta && ofertas.get(g.oferta)?.territorial.idSeccional) || null);
    return resultado;
  }
}
