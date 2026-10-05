import type { AprobarComponentesLoteResultado } from '../../../services/api/ptaApi';

/** Un PTA cuenta una vez, aunque sus componentes tengan resultados distintos. */
export function groupPtaBulkApprovalResults(ptaIds: string[], resultados: AprobarComponentesLoteResultado[]) {
  const ptas = [...new Set(ptaIds)].map(ptaId => {
    const detalles = resultados.filter(item => item.ptaId === ptaId);
    const aprobados = detalles.filter(item => item.estado === 'aprobado'
      || (item.estado === 'omitido' && item.motivo === 'Ya estaba aprobado'));
    return { ptaId, aprobado: aprobados.length > 0, detalles };
  });
  return { ptas, total: ptas.length, aprobados: ptas.filter(item => item.aprobado).length,
    noAprobados: ptas.filter(item => !item.aprobado).length };
}
