/**
 * Versiones del Programa Anual de Auditoría (EFDS-1919 / EFDS-1639).
 *
 * El documento se arma con las filas que devuelve el backend y no con lo que
 * la pantalla tenga cargado: así la exportación siempre refleja la base de
 * datos, y descargar una versión antigua produce el mismo documento que se
 * exportó en su momento.
 */
import { controlInternoService } from '../../services/api/controlInternoService';
import type { FilaProgramaAnual } from '../../services/api/controlInternoService';
import { exportarAuditoriasTemplate } from './exportarAuditoriasTemplate';

/** Convierte las filas versionadas al formato que consume la plantilla Excel. */
export function filasParaDocumento(filas: FilaProgramaAnual[]) {
  return filas.map((f) => ({
    codigo: f.codigo,
    titulo: f.areaObjetivo ? `${f.nombre}\n(${f.areaObjetivo})` : f.nombre,
    tipo: f.tipo,
    territorial: f.territorial || 'Sede Central',
    responsable: f.responsableArea,
    observaciones: f.observaciones || '',
    fechaInicioRaw: f.fechaInicio,
    fechaFinRaw: f.fechaFin,
    fechaFinPlaneacionRaw: f.fechaFinPlaneacion,
    fechaInicioEjecucionRaw: f.fechaInicioEjecucion,
    fechaFinEjecucionRaw: f.fechaFinEjecucion,
    fechaInicioComunicacionRaw: f.fechaInicioComunicacion,
  }));
}

/**
 * Exporta el Programa Anual vigente. El backend decide si corresponde una
 * versión nueva: la crea solo si cambió algo de lo que el documento imprime.
 */
export async function exportarProgramaAnualVersionado(vigencia: number) {
  const version = await controlInternoService.resolverVersionProgramaAnual(vigencia);
  const resultado = await exportarAuditoriasTemplate(filasParaDocumento(version.filas), String(vigencia), {
    version: version.version,
    fechaVersion: version.fecha,
  });
  return { ...resultado, version: version.version, nueva: version.nueva, cambios: version.cambios };
}

/** Descarga una versión anterior tal como quedó guardada. */
export async function descargarVersionProgramaAnual(vigencia: number, numero: number) {
  const version = await controlInternoService.getVersionProgramaAnual(vigencia, numero);
  return exportarAuditoriasTemplate(filasParaDocumento(version.filas), String(vigencia), {
    version: version.version,
    fechaVersion: version.fecha,
  });
}
