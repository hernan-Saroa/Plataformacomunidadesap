/**
 * Exportación a Excel y PDF del Plan de Acción. Siempre recibe los indicadores YA filtrados,
 * de modo que el archivo respeta los filtros aplicados en pantalla.
 */
import {
  EJES, EJE_NOMBRES, ESTADO_NOMBRES, Indicador, FiltrosPlanAccion,
  agruparPorEje, calcularAvanceConsolidado, getFechaCorte, getNivelSemaforo,
} from './planAccionUtils';

export const COLUMNAS_EXPORT = [
  'Eje', 'Código', 'Indicador', 'Meta', 'Valor ejecutado', '% Avance', 'Semáforo', 'Estado', 'Responsable', 'Fecha de corte',
] as const;

const fmtFecha = (d: Date) => d.toLocaleDateString('es-CO');

const NIVEL_TEXTO = { verde: 'Verde', amarillo: 'Amarillo', rojo: 'Rojo' } as const;

export const construirFilasExport = (indicadores: Indicador[]): (string | number)[][] => {
  const grupos = agruparPorEje(indicadores);
  const filas: (string | number)[][] = [];
  EJES.forEach(eje => {
    grupos[eje].forEach(i => {
      filas.push([
        EJE_NOMBRES[eje], i.codigo, i.nombre, i.meta, i.valorActual, i.avance,
        NIVEL_TEXTO[getNivelSemaforo(i.avance)], ESTADO_NOMBRES[i.estado], i.responsable, fmtFecha(getFechaCorte(i)),
      ]);
    });
  });
  return filas;
};

export const construirResumenEjes = (indicadores: Indicador[]): { eje: string; indicadores: number; avance: number }[] => {
  const grupos = agruparPorEje(indicadores);
  return EJES.filter(e => grupos[e].length > 0).map(e => ({
    eje: EJE_NOMBRES[e], indicadores: grupos[e].length, avance: calcularAvanceConsolidado(grupos[e]),
  }));
};

export const describirFiltros = (f: FiltrosPlanAccion): string => {
  const partes: string[] = [];
  if (f.ejes.length) partes.push(`Ejes: ${f.ejes.map(e => EJE_NOMBRES[e]).join(', ')}`);
  if (f.estados.length) partes.push(`Estados: ${f.estados.map(e => ESTADO_NOMBRES[e]).join(', ')}`);
  if (f.periodoDesde || f.periodoHasta) partes.push(`Periodo: ${f.periodoDesde || '…'} a ${f.periodoHasta || '…'}`);
  if (f.busqueda) partes.push(`Búsqueda: "${f.busqueda}"`);
  if (f.ocultarCompletados) partes.push('Completados ocultos');
  return partes.length ? partes.join(' | ') : 'Sin filtros (todos los indicadores)';
};

const descargar = (blob: Blob, nombre: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const SEMAFORO_ARGB = { Verde: 'FFD1FAE5', Amarillo: 'FFFEF3C7', Rojo: 'FFFEE2E2' } as Record<string, string>;

export async function exportarPlanAccionExcel(indicadores: Indicador[], filtros: FiltrosPlanAccion): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();

  const ws = wb.addWorksheet('Indicadores');
  ws.addRow(['Plan de Acción Institucional']).font = { bold: true, size: 14 };
  ws.addRow([describirFiltros(filtros)]);
  ws.addRow([]);
  const header = ws.addRow([...COLUMNAS_EXPORT]);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  construirFilasExport(indicadores).forEach(f => {
    const row = ws.addRow(f);
    const argb = SEMAFORO_ARGB[String(f[6])];
    if (argb) row.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
  });
  [18, 12, 40, 10, 16, 10, 12, 14, 24, 14].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const resumen = wb.addWorksheet('Resumen por eje');
  const h2 = resumen.addRow(['Eje', 'Indicadores', '% Avance consolidado']);
  h2.font = { bold: true };
  construirResumenEjes(indicadores).forEach(r => resumen.addRow([r.eje, r.indicadores, r.avance]));
  resumen.columns.forEach(c => { c.width = 26; });

  const buffer = await wb.xlsx.writeBuffer();
  descargar(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    'plan_accion_indicadores.xlsx',
  );
}

export async function exportarPlanAccionPDF(indicadores: Indicador[], filtros: FiltrosPlanAccion): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFontSize(14);
  doc.text('Plan de Acción Institucional', 14, 14);
  doc.setFontSize(9);
  doc.text(describirFiltros(filtros), 14, 20);

  autoTable(doc, {
    startY: 25,
    head: [['Eje', 'Indicadores', '% Avance consolidado']],
    body: construirResumenEjes(indicadores).map(r => [r.eje, r.indicadores, `${r.avance}%`]),
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 58, 138] },
  });

  const filas = construirFilasExport(indicadores).map(f => [...f.slice(0, 5), `${f[5]}%`, ...f.slice(6)]);
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 6,
    head: [[...COLUMNAS_EXPORT]],
    body: filas as any,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 58, 138] },
  });

  descargar(doc.output('blob'), 'plan_accion_indicadores.pdf');
}
