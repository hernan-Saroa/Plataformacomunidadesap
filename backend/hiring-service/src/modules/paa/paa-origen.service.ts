import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { HiringAccess } from '../../auth/hiring-access';
import { EstudioPrevioService } from '../estudio-previo/estudio-previo.service';
import { PaaRevisionesService } from './paa-revisiones.service';

/**
 * De dónde sale un proceso y qué le ha hecho el PAA desde entonces.
 *
 * Es lo que permite reconstruir, años después, con qué información nació el
 * proceso y qué cambió: la línea, su versión y su vigencia, cada aplicación
 * con su antes y después, y cada revisión con su decisión.
 */
@Injectable()
export class PaaOrigenService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly estudioPrevio: EstudioPrevioService,
    private readonly revisiones: PaaRevisionesService,
  ) {}

  async deProceso(procesoId: string, acceso: HiringAccess) {
    // Responde 404 si a quien pregunta no le corresponde ver el proceso: la
    // misma regla que la ficha.
    const proceso = await this.estudioPrevio.obtenerProceso(procesoId, acceso);
    if (!proceso.paaLineaId) {
      return { tieneOrigen: false, linea: null, aplicaciones: [], revisiones: [], bloqueado: false };
    }

    const [[linea], aplicaciones, revisiones] = await Promise.all([
      this.dataSource.query(
        `SELECT l.id, l.codigo, l.fila, l.valores->>'objeto' AS objeto, r.nombre AS region,
                v.id AS version_id, v.numero AS version, v.estado AS estado_version, g.anio, g.vigente
           FROM hiring.paa_lineas l
           JOIN hiring.paa_regiones r ON r.id = l.region_id
           JOIN hiring.paa_versiones v ON v.id = l.version_id
           JOIN hiring.paa_vigencias g ON g.id = v.vigencia_id
          WHERE l.id = $1`,
        [proceso.paaLineaId],
      ),
      this.dataSource.query(
        `SELECT a.id, a.tipo, a.campos, a.aplicado_por AS "aplicadoPor", a.aplicado_at AS "aplicadoAt",
                lo.codigo AS "codigoOrigen", vo.numero AS "versionOrigen", go.anio AS "anioOrigen",
                ld.codigo AS "codigoDestino", vd.numero AS "versionDestino", gd.anio AS "anioDestino"
           FROM hiring.paa_aplicaciones a
           LEFT JOIN hiring.paa_lineas lo ON lo.id = a.linea_origen_id
           LEFT JOIN hiring.paa_versiones vo ON vo.id = lo.version_id
           LEFT JOIN hiring.paa_vigencias go ON go.id = vo.vigencia_id
           JOIN hiring.paa_lineas ld ON ld.id = a.linea_destino_id
           JOIN hiring.paa_versiones vd ON vd.id = ld.version_id
           JOIN hiring.paa_vigencias gd ON gd.id = vd.vigencia_id
          WHERE a.proceso_id = $1
          ORDER BY a.aplicado_at DESC`,
        [procesoId],
      ),
      this.revisiones.listar(undefined, procesoId),
    ]);

    return {
      tieneOrigen: true,
      linea: linea && {
        id: linea.id,
        codigo: linea.codigo,
        fila: linea.fila,
        objeto: linea.objeto,
        region: linea.region,
        anio: Number(linea.anio),
        vigente: linea.vigente,
        version: { id: linea.version_id, numero: linea.version, estado: linea.estado_version },
      },
      aplicaciones,
      revisiones,
      bloqueado: revisiones.some((r) => r.estado === 'PENDIENTE' && r.bloquea),
    };
  }
}
