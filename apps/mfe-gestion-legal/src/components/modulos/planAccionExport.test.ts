import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ExcelJS from 'exceljs';
import { exportarPlanAccionExcel, exportarPlanAccionPDF } from './planAccionExport';
import { FILTROS_VACIOS, Indicador } from './planAccionUtils';

const mk = (over: Partial<Indicador>): Indicador => ({
  id: '1', codigo: '1', nombre: 'Indicador', descripcion: '', ejeEstrategico: 'GESTION_INSTITUCIONAL',
  responsable: 'Ana', meta: 100, valorActual: 50, avance: 50,
  fechaInicio: new Date(2025, 0, 1), fechaFin: new Date(2025, 11, 31),
  estado: 'EN_TIEMPO', prioridad: 'MEDIA', periodicidad: 'MENSUAL', tipoIndicador: 'GESTION',
  unidadMedida: '%', ultimaActualizacion: new Date(), registros: [], ...over,
});

const leer = (b: Blob) => new Promise<ArrayBuffer>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result as ArrayBuffer);
  r.onerror = () => rej(r.error);
  r.readAsArrayBuffer(b);
});

describe('escritores de exportación', () => {
  let blobs: Blob[];
  let nombres: string[];

  beforeEach(() => {
    blobs = [];
    nombres = [];
    (window.URL as any).createObjectURL = vi.fn((b: Blob) => { blobs.push(b); return 'blob:x'; });
    (window.URL as any).revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      nombres.push(this.download);
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('Excel: genera hoja de indicadores y resumen solo con los indicadores recibidos', async () => {
    const inds = [
      mk({ id: '2', codigo: '2', nombre: 'Vencido tech', ejeEstrategico: 'TECNOLOGIA', avance: 10, estado: 'VENCIDO' }),
    ];
    await exportarPlanAccionExcel(inds, { ...FILTROS_VACIOS, estados: ['VENCIDO'] });

    expect(nombres).toEqual(['plan_accion_indicadores.xlsx']);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await leer(blobs[0]));

    const ws = wb.getWorksheet('Indicadores')!;
    expect(String(ws.getRow(2).getCell(1).value)).toContain('Estados: Vencido');
    expect(ws.getRow(4).values).toEqual(expect.arrayContaining(['Meta', 'Valor ejecutado', '% Avance', 'Responsable', 'Fecha de corte']));
    expect(ws.rowCount).toBe(5); // título, filtros, vacío, encabezado, 1 indicador
    expect(ws.getRow(5).getCell(3).value).toBe('Vencido tech');
    expect(ws.getRow(5).getCell(7).value).toBe('Rojo');

    const resumen = wb.getWorksheet('Resumen por eje')!;
    expect(resumen.rowCount).toBe(2);
    expect(resumen.getRow(2).values).toEqual(expect.arrayContaining(['Tecnología', 1, 10]));
  });

  it('PDF: genera un archivo PDF válido', async () => {
    await exportarPlanAccionPDF([mk({}), mk({ id: '2', ejeEstrategico: 'TALENTO_HUMANO' })], FILTROS_VACIOS);
    expect(nombres).toEqual(['plan_accion_indicadores.pdf']);
    const bytes = new Uint8Array(await leer(blobs[0]));
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-');
  });
});
