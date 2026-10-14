import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Territorial de un grupo — EFDS-2315.
 *
 * Sin tablas mantenidas a mano: solo datos que mantiene la carga masiva de la
 * estructura organizacional de auth (`estructura-import`), que escribe el código
 * del RUND en `auth.seccionales.cod_seccional` ('DT-009') y el cruce
 * sede ↔ CETAP en `auth.sede_cetap_mapping`. Cruce por CÓDIGO exacto, nunca por
 * nombre. Lo que no cruza queda sin territorial.
 */
@Injectable()
export class TerritorialService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Territorial (auth.seccionales.id_seccional) donde se dicta cada grupo, el
   * mismo dato que el PTA guarda en `asignaturas[].territorial_id`. Sale de sus
   * franjas: el código de la franja o de su aula ('DT-009' o código de sede de
   * auth), o el CETAP del aula por `sede_cetap_mapping`. Si el grupo no tiene el
   * dato, o sus franjas están en territoriales distintas, queda null.
   */
  async territorialesDeGrupos(idsGrupo: readonly string[]): Promise<Map<string, string | null>> {
    const resultado = new Map<string, string | null>(idsGrupo.map((id) => [id, null]));
    if (!idsGrupo.length) return resultado;
    const filas: Array<{ id: string; seccionales: string[] | null }> = await this.dataSource.query(
      `SELECT f.id_grupo::text AS id,
              array_agg(DISTINCT COALESCE(sc_f.id_seccional, se_f.id_seccional, sc_a.id_seccional, se_c.id_seccional)::text)
                FILTER (WHERE COALESCE(sc_f.id_seccional, se_f.id_seccional, sc_a.id_seccional, se_c.id_seccional) IS NOT NULL)
                AS seccionales
         FROM "academic-schedule".franja_horaria f
         LEFT JOIN auth.seccionales sc_f ON sc_f.cod_seccional = f.sede_codigo
         LEFT JOIN auth.sedes se_f ON se_f.cod_sede::text = f.sede_codigo
         LEFT JOIN "academic-schedule".aula au ON au.codigo = f.aula_codigo
         LEFT JOIN auth.seccionales sc_a ON sc_a.cod_seccional = au.sede_codigo
         LEFT JOIN academic_work_plan.cetap c ON c.codigo = au.codigo_cetap
         LEFT JOIN auth.sede_cetap_mapping m ON m.id_cetap = c.id
         LEFT JOIN auth.sedes se_c ON se_c.id_sede = m.id_sede
        WHERE f.id_grupo = ANY($1::uuid[])
        GROUP BY f.id_grupo`,
      [idsGrupo]);
    for (const f of filas) {
      const unicas = (f.seccionales ?? []).filter(Boolean);
      resultado.set(f.id, unicas.length === 1 ? unicas[0] : null);
    }
    return resultado;
  }
}
