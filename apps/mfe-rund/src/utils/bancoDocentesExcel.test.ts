// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { BANCO_DOCENTES_HEADERS, parseBancoDocentesFile } from './bancoDocentesExcel';
import {
  BANCO_DOCENTES_COLUMNS,
  BANCO_DOCENTES_SHEET_NAME,
  BANCO_DOCENTES_TEMPLATE_ROWS,
  buildBancoDocentesWorkbook,
  currentBancoDocentesPeriodo,
} from './bancoDocentesWorkbook';

/** Formato oficial de la carga masiva RUND: es la fuente de verdad de estas pruebas. */
const REFERENCIA = path.resolve(__dirname, '../../../../Plantillas/05062026 - CargaDocentes_RUND_2025-1_FINAL.xlsx');
const describeConReferencia = existsSync(REFERENCIA) ? describe : describe.skip;

const KIND_BY_FILL: Record<string, string> = {
  FFC55A11: 'required',
  FFBF9000: 'calculated',
  FFD6E4F0: 'optional',
  FF595959: 'system',
};

const argb = (value?: string) => (value ? `FF${value.slice(-6)}` : undefined);

async function readReferencia() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(readFileSync(REFERENCIA) as unknown as ExcelJS.Buffer);
  return workbook;
}

async function roundTrip(workbook: ExcelJS.Workbook) {
  const buffer = await workbook.xlsx.writeBuffer();
  const reloaded = new ExcelJS.Workbook();
  await reloaded.xlsx.load(buffer as ArrayBuffer);
  return { reloaded, buffer: Buffer.from(buffer as ArrayBuffer) };
}

function asFile(buffer: Buffer, name = 'carga.xlsx'): File {
  return new File([buffer as unknown as BlobPart], name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

describe('currentBancoDocentesPeriodo', () => {
  it('enero–junio es período 1 y julio–diciembre período 2', () => {
    expect(currentBancoDocentesPeriodo(new Date(2026, 0, 15))).toBe('2026-1');
    expect(currentBancoDocentesPeriodo(new Date(2026, 5, 30))).toBe('2026-1');
    expect(currentBancoDocentesPeriodo(new Date(2026, 6, 1))).toBe('2026-2');
    expect(currentBancoDocentesPeriodo(new Date(2026, 9, 26))).toBe('2026-2');
  });
});

describeConReferencia('plantilla de carga masiva RUND vs. Excel de referencia', () => {
  it('tiene las mismas 38 columnas, en el mismo orden, que el Excel de referencia', async () => {
    const referencia = (await readReferencia()).getWorksheet(BANCO_DOCENTES_SHEET_NAME)!;
    const esperadas = Array.from({ length: 38 }, (_, i) => String(referencia.getCell(2, i + 1).value));

    expect(BANCO_DOCENTES_HEADERS).toEqual(esperadas);

    const { reloaded } = await roundTrip(await buildBancoDocentesWorkbook({ periodo: '2025-1' }));
    const plantilla = reloaded.getWorksheet(BANCO_DOCENTES_SHEET_NAME)!;
    expect(reloaded.worksheets.map((w) => w.name)).toEqual([BANCO_DOCENTES_SHEET_NAME]);
    expect(Array.from({ length: 38 }, (_, i) => String(plantilla.getCell(2, i + 1).value))).toEqual(esperadas);
  });

  it('colorea cada encabezado por tipo de campo igual que el Excel de referencia', async () => {
    const referencia = (await readReferencia()).getWorksheet(BANCO_DOCENTES_SHEET_NAME)!;
    const { reloaded } = await roundTrip(await buildBancoDocentesWorkbook({ periodo: '2025-1' }));
    const plantilla = reloaded.getWorksheet(BANCO_DOCENTES_SHEET_NAME)!;

    for (let c = 1; c <= 38; c += 1) {
      const esperado = KIND_BY_FILL[argb((referencia.getCell(2, c).fill as any)?.fgColor?.argb)!]
        ?? 'optional';
      const obtenido = KIND_BY_FILL[argb((plantilla.getCell(2, c).fill as any)?.fgColor?.argb)!];
      expect({ columna: String(plantilla.getCell(2, c).value), tipo: obtenido })
        .toEqual({ columna: String(referencia.getCell(2, c).value), tipo: esperado });
      expect(BANCO_DOCENTES_COLUMNS[c - 1].kind).toBe(esperado);
    }
  });

  it('replica anchos, congelado de paneles, título combinado y alto de filas', async () => {
    const referencia = (await readReferencia()).getWorksheet(BANCO_DOCENTES_SHEET_NAME)!;
    const { reloaded } = await roundTrip(await buildBancoDocentesWorkbook({ periodo: '2025-1' }));
    const plantilla = reloaded.getWorksheet(BANCO_DOCENTES_SHEET_NAME)!;

    // OBSERVACIONES se ensancha (40) respecto al 14 del archivo, que truncaba los textos.
    for (let c = 1; c <= 38; c += 1) {
      if (BANCO_DOCENTES_COLUMNS[c - 1].header === 'OBSERVACIONES') continue;
      expect(plantilla.getColumn(c).width).toBe(referencia.getColumn(c).width);
    }
    expect(plantilla.views[0]).toMatchObject({ state: 'frozen', xSplit: 3, ySplit: 2, showGridLines: false });
    expect(plantilla.getRow(1).height).toBe(referencia.getRow(1).height);
    expect(plantilla.getRow(2).height).toBe(referencia.getRow(2).height);
    expect(Object.keys((plantilla as any)._merges)).toEqual(Object.keys((referencia as any)._merges));
  });

  it('trae las mismas listas desplegables del Excel de referencia en B, D, E, L, P, R, U, Z y AA', async () => {
    const referencia = (await readReferencia()).getWorksheet(BANCO_DOCENTES_SHEET_NAME)!;
    const { reloaded } = await roundTrip(await buildBancoDocentesWorkbook({ periodo: '2025-1' }));
    const plantilla = reloaded.getWorksheet(BANCO_DOCENTES_SHEET_NAME)!;

    const columnasConLista = ['B', 'D', 'E', 'L', 'P', 'R', 'U', 'Z', 'AA'];
    for (const col of columnasConLista) {
      const esperada = referencia.getCell(`${col}3`).dataValidation;
      const obtenida = plantilla.getCell(`${col}3`).dataValidation;
      expect(esperada?.type).toBe('list');
      expect(obtenida?.type).toBe('list');
      if (col === 'AA') {
        // La referencia omite "Magister cursando Doctorado", valor que sus propias filas usan (8 docentes).
        expect(String(obtenida.formulae![0])).toContain(String(esperada.formulae![0]).replace(/"$/, ''));
        expect(String(obtenida.formulae![0])).toContain('Magister cursando Doctorado');
      } else {
        expect(obtenida.formulae).toEqual(esperada!.formulae);
      }
    }
    const sinLista = ['A', 'C', 'F', 'I', 'O', 'S', 'AH'];
    for (const col of sinLista) expect(plantilla.getCell(`${col}3`).dataValidation).toBeUndefined();
    expect(plantilla.getCell(`B${BANCO_DOCENTES_TEMPLATE_ROWS + 2}`).dataValidation?.type).toBe('list');
  });

  it('pone el período en el título para que el backend lo tome de ahí', async () => {
    const { reloaded } = await roundTrip(await buildBancoDocentesWorkbook({ periodo: '2026-2' }));
    const titulo = String(reloaded.getWorksheet(BANCO_DOCENTES_SHEET_NAME)!.getCell('A1').value);
    expect(titulo).toContain('ESAP – SM-01 RUND');
    expect(titulo).toMatch(/Período 2026-2/);
    // Misma expresión que usa BancoDocentesController.bulkUpload.
    expect(titulo.match(/\b20\d{2}\s*[-_]\s*[12]\b/)?.[0]).toBe('2026-2');
  });

  it('colorea de amarillo/gris las columnas calculadas y de sistema en las filas de datos', async () => {
    const { reloaded } = await roundTrip(await buildBancoDocentesWorkbook({ periodo: '2025-1' }));
    const hoja = reloaded.getWorksheet(BANCO_DOCENTES_SHEET_NAME)!;
    const idx = (h: string) => BANCO_DOCENTES_HEADERS.indexOf(h) + 1;
    expect(argb((hoja.getCell(3, idx('EDAD')).fill as any).fgColor.argb)).toBe('FFFFE699');
    expect(argb((hoja.getCell(3, idx('ID_RUND')).fill as any).fgColor.argb)).toBe('FFD9D9D9');
    expect(argb((hoja.getCell(3, idx('NOMBRE_COMPLETO')).fill as any).fgColor.argb)).toBe('FFFFFFFF');
    expect(argb((hoja.getCell(4, idx('NOMBRE_COMPLETO')).fill as any).fgColor.argb)).toBe('FFEBF3FB');
  });
});

describe('ciclo plantilla → carga (parser de previsualización)', () => {
  it('la plantilla vacía descargada no contiene registros', async () => {
    const { buffer } = await roundTrip(await buildBancoDocentesWorkbook({ periodo: '2025-1' }));
    await expect(parseBancoDocentesFile(asFile(buffer))).rejects.toThrow('no contiene registros');
  });

  it('una fila diligenciada en la plantilla se lee completa y válida', async () => {
    const fila: Record<string, string | number> = {
      DOCUMENTO_IDENTIDAD: 1020304050,
      TIPO_DOCUMENTO: 'CC',
      NOMBRE_COMPLETO: 'DOCENTE EJEMPLO ESAP',
      GENERO: 'Femenino',
      FECHA_NACIMIENTO: '15/06/1985',
      CORREO_INSTITUCIONAL: 'docente.ejemplo@esap.edu.co',
      VINCULACION: 'Periodo de Prueba',
      TERRITORIAL: 'SEDE_CENTRAL',
      DEDICACION: 'Tiempo Completo',
      CATEGORIA_ESCALAFON: 'Asistente',
      INICIO_VINCULACION: '20/01/2026',
      FIN_VINCULACION: 'Indefinido',
      ACTO_ADMINISTRATIVO: 'Resolución 001 de 2026',
      NIVEL_FORMACION: 'Maestría',
      TITULO_PREGRADO: 'Administrador Público',
      NUCLEO_TEMATICO: 'Administración Pública',
      PERFIL_ACADEMICO: 'Administrador Público, Magíster en Administración Pública',
    };
    const workbook = await buildBancoDocentesWorkbook({ periodo: '2026-1', rows: [fila] });
    const { buffer } = await roundTrip(workbook);
    const [row] = await parseBancoDocentesFile(asFile(buffer));

    expect(row.errores).toEqual([]);
    expect(row.estado).not.toBe('invalido');
    expect(row.fila).toBe(3);
    expect(row.datos).toMatchObject({
      documentNumber: '1020304050',
      vinculacion: 'Periodo de Prueba',
      territorial: 'Sede Central',
      fechaNacimiento: '1985-06-15',
      fechaInicioVinculacion: '2026-01-20',
      fechaFinVinculacion: null,
      horasAsignables: 800,
    });
  });

  it('una fila con los campos obligatorios vacíos se rechaza indicando cuáles faltan', async () => {
    const workbook = await buildBancoDocentesWorkbook({
      periodo: '2026-1',
      rows: [{ DOCUMENTO_IDENTIDAD: 99887766, NOMBRE_COMPLETO: 'SIN DATOS', VINCULACION: 'Ocasional' }],
    });
    const { buffer } = await roundTrip(workbook);
    const [row] = await parseBancoDocentesFile(asFile(buffer));

    expect(row.estado).toBe('invalido');
    expect(row.errores).toEqual(expect.arrayContaining([
      'Falta género.',
      'Falta fecha de nacimiento.',
      'Falta correo institucional.',
      'Falta categoría de escalafón.',
      'Falta inicio de vinculación.',
      'Falta acto administrativo.',
      'Falta nivel de formación.',
      'Falta título de pregrado.',
      'Falta núcleo temático.',
      'Falta perfil académico.',
    ]));
  });
});

describeConReferencia('parser de previsualización con el Excel de referencia completo', () => {
  it('lee los 263 docentes sin rechazar ninguno por formato', async () => {
    const buffer = readFileSync(REFERENCIA);
    const rows = await parseBancoDocentesFile(asFile(buffer, 'CargaDocentes_RUND_2025-1_FINAL.xlsx'));

    expect(rows).toHaveLength(263);
    expect(rows[0].fila).toBe(3);

    const rechazadas = rows.filter((r) => r.estado === 'invalido');
    const motivos = new Map<string, number>();
    rechazadas.forEach((r) => r.errores.forEach((e) => motivos.set(e, (motivos.get(e) || 0) + 1)));
    expect(Object.fromEntries(motivos)).toEqual({});
    expect(rechazadas).toHaveLength(0);
  });

  it('conserva Carrera1/Carrera2/Periodo de Prueba, los rangos de edad y "Indefinido"', async () => {
    const rows = await parseBancoDocentesFile(asFile(readFileSync(REFERENCIA)));
    const vinculaciones = new Set(rows.map((r) => (r.datos as any)?.vinculacion));
    expect(vinculaciones).toEqual(new Set(['Ocasional', 'Carrera1', 'Carrera2', 'Periodo de Prueba', 'Visitante', 'Especial']));

    const rangos = new Set(rows.map((r) => (r.datos as any)?.rangoEdad));
    expect(rangos).toEqual(new Set(['Menor de 35 años', 'De 36 a 45 años', 'De 46 a 55 años', 'De 56 a 65 años', 'Mayor de 65 años']));

    const indefinidos = rows.filter((r) => (r.datos as any)?.fechaFinVinculacion === null);
    expect(indefinidos).toHaveLength(104);
  });

  it('avisa (sin bloquear) los dos documentos con tipo "POR VERIFICAR"', async () => {
    const rows = await parseBancoDocentesFile(asFile(readFileSync(REFERENCIA)));
    const porVerificar = rows.filter((r) => r.advertencias.some((a) => a.includes('por verificar')));
    expect(porVerificar).toHaveLength(2);
    porVerificar.forEach((r) => expect(r.estado).toBe('advertencia'));
  });

  it('XLSX lee la misma hoja única del archivo', () => {
    const wb = XLSX.read(readFileSync(REFERENCIA), { type: 'buffer' });
    expect(wb.SheetNames).toEqual([BANCO_DOCENTES_SHEET_NAME]);
  });
});
