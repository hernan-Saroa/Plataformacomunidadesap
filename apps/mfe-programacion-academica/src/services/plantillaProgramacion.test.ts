// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';

import { COLUMNAS, ErrorArchivo, generarPlantilla, HOJA, leerPlantilla, valorCelda } from './plantillaProgramacion';
import type { ReferenciaPlantilla } from './api/cargaProgramacionApi';

const ref: ReferenciaPlantilla = {
  periodo: { idPeriodo: '7', codigo: '2027-1', fechaInicio: '2027-02-01', fechaFin: '2027-06-12' },
  asignaturas: [{ codigo: 'ASIG-00003', nombre: 'Fundamentos', codigoPrograma: 'PRO-001', programa: 'AP Diurno', creditos: 3, horasClase: 64, ofertada: true }],
  ofertas: [{ codigoCetap: 'CET-0288', cetap: 'Sede Central', codigoPrograma: 'PRO-001', programa: 'AP Diurno' }],
  maxFilas: 3000,
};

async function aBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof (blob as any).arrayBuffer === 'function') return blob.arrayBuffer();
  return new Response(blob).arrayBuffer();
}

let ExcelJS: any;
beforeAll(async () => { ExcelJS = (await import('exceljs')).default; });

describe('Plantilla de programación (Excel)', () => {
  it('genera la hoja PROGRAMACION con los títulos en la fila 3 y las hojas de referencia', async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await aBuffer(await generarPlantilla(ref)));
    const ws = wb.getWorksheet(HOJA)!;
    expect(ws.getRow(3).values).toEqual(expect.arrayContaining(COLUMNAS.map((c) => c.titulo)));
    expect(String(ws.getCell('A1').value)).toContain('2027-1');
    expect(wb.getWorksheet('ASIGNATURAS')!.getRow(2).getCell(1).value).toBe('ASIG-00003');
    expect(wb.getWorksheet('CETAP')!.getRow(2).getCell(1).value).toBe('CET-0288');
    expect(wb.getWorksheet('LEEME')).toBeTruthy();
  });

  it('ida y vuelta: lo que se escribe en la plantilla se lee como filas, con su número de fila de Excel', async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await aBuffer(await generarPlantilla(ref)));
    const ws = wb.getWorksheet(HOJA)!;
    const col = (t: string) => COLUMNAS.findIndex((c) => c.titulo === t) + 1;
    ws.getCell(4, col('CODIGO_ASIGNATURA')).value = 'ASIG-00003';
    ws.getCell(4, col('GRUPO')).value = 1;
    ws.getCell(4, col('DIA')).value = 'LUNES';
    ws.getCell(4, col('HORA_INICIO')).value = '08:00';
    ws.getCell(4, col('HORA_FIN')).value = 0.4166666666666667; // 10:00 como fracción de día (Excel)
    ws.getCell(4, col('FECHA_INICIO')).value = new Date(Date.UTC(2027, 1, 1));
    ws.getCell(4, col('DOCUMENTO_DOCENTE')).value = 52336004;
    ws.getCell(6, col('CODIGO_ASIGNATURA')).value = 'ASIG-00003'; // la fila 5 queda vacía y se salta
    ws.getCell(6, col('GRUPO')).value = 1;
    const filas = await leerPlantilla(await wb.xlsx.writeBuffer() as ArrayBuffer);
    expect(filas).toEqual([
      { fila: 4, codigoAsignatura: 'ASIG-00003', grupo: '1', dia: 'LUNES', horaInicio: '08:00', horaFin: '10:00', fechaInicio: '2027-02-01', documentoDocente: '52336004' },
      { fila: 6, codigoAsignatura: 'ASIG-00003', grupo: '1' },
    ]);
  });

  it('un archivo sin los títulos o sin filas se rechaza con un mensaje claro', async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Hoja1').getCell('A1').value = 'cualquier cosa';
    await expect(leerPlantilla(await wb.xlsx.writeBuffer() as ArrayBuffer)).rejects.toThrow(/fila de títulos/);
    const vacia = new ExcelJS.Workbook();
    await vacia.xlsx.load(await aBuffer(await generarPlantilla(ref)));
    await expect(leerPlantilla(await vacia.xlsx.writeBuffer() as ArrayBuffer)).rejects.toBeInstanceOf(ErrorArchivo);
    await expect(leerPlantilla(new TextEncoder().encode('no es excel').buffer)).rejects.toThrow(/no es un Excel/);
  });

  it('valorCelda: horas, fechas, fórmulas y texto enriquecido', () => {
    expect(valorCelda(new Date(Date.UTC(1899, 11, 30, 14, 30)), 'hora')).toBe('14:30');
    expect(valorCelda(0.75, 'hora')).toBe('18:00');
    expect(valorCelda({ result: 'ASIG-1' }, 'texto')).toBe('ASIG-1');
    expect(valorCelda({ richText: [{ text: 'LUN' }, { text: 'ES' }] }, 'texto')).toBe('LUNES');
    expect(valorCelda(null, 'texto')).toBe('');
  });
});
