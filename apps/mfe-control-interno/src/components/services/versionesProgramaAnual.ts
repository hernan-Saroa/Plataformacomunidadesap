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
    semanasExcluidas: (f as any).semanasExcluidas || [],
  }));
}

/**
 * Exporta el Programa Anual tal como está. Exportar no crea versiones: antes de
 * aprobarse el Plan Anual sale como borrador; después, como la versión vigente o,
 * si hay cambios sin versionar, como el borrador de la siguiente. La V1 nace con la
 * aprobación del plan y las demás con "Generar versión".
 */
export async function exportarProgramaAnualVersionado(vigencia: number) {
  const version = await controlInternoService.resolverVersionProgramaAnual(vigencia);
  const resultado = await exportarAuditoriasTemplate(filasParaDocumento(version.filas), String(vigencia), {
    version: version.borrador || version.pendiente ? undefined : version.version,
    fechaVersion: version.borrador || version.pendiente ? undefined : version.fecha,
    borrador: !!version.borrador,
    borradorDe: version.pendiente ? version.version + 1 : undefined,
  });
  return {
    ...resultado,
    version: version.version,
    nueva: version.nueva,
    cambios: version.cambios,
    borrador: !!version.borrador,
    pendiente: !!version.pendiente,
  };
}

/** Descarga una versión anterior tal como quedó guardada. */
export async function descargarVersionProgramaAnual(vigencia: number, numero: number) {
  const version = await controlInternoService.getVersionProgramaAnual(vigencia, numero);
  return exportarAuditoriasTemplate(filasParaDocumento(version.filas), String(vigencia), {
    version: version.version,
    fechaVersion: version.fecha,
  });
}
