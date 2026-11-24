import { existsSync } from 'fs';
import { resolve } from 'path';
import { NIVELES_TITULO, type NivelTitulo } from './rund-titulos-adicionales';
import { deducirTitulosAdicionales, mismoTitulo } from './rund-perfil-titulos';

/**
 * HU 2425 — invariantes de la deducción de títulos sobre TODAS las filas reales de la plantilla de cargue
 * (Plantillas/…CargaDocentes_RUND_2025-1_FINAL.xlsx): sin repetidos, sin perder títulos de la columna, idempotente.
 */
const REFERENCIA = resolve(__dirname, '../../../../../Plataformacomunidadesap/Plantillas/05062026 - CargaDocentes_RUND_2025-1_FINAL.xlsx');
const RUTA = existsSync(REFERENCIA) ? REFERENCIA : resolve(__dirname, '../../../../../Plantillas/05062026 - CargaDocentes_RUND_2025-1_FINAL.xlsx');
const describeConArchivo = existsSync(RUTA) ? describe : describe.skip;

const COLUMNAS: Record<NivelTitulo, string> = {
  pregrado: 'TITULO_PREGRADO', especializacion: 'TITULO_ESPECIALIZACION', maestria: 'TITULO_MAESTRIA',
  doctorado: 'TITULO_DOCTORADO', posDoctorado: 'TITULO_POSDOCTORADO',
};
const clave = (valor: string) => valor.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase();

describeConArchivo('Deducción de títulos sobre la plantilla real', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ExcelJS = require('exceljs');
  const filas: Array<{ fila: number; perfil: string | null; celdas: Record<NivelTitulo, string | null> }> = [];

  beforeAll(async () => {
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.readFile(RUTA);
    const hoja = libro.worksheets[0];
    const encabezados: string[] = [];
    hoja.getRow(2).eachCell((celda: any, indice: number) => { encabezados[indice] = String(celda.value); });
    const leer = (fila: any, nombre: string) => String(fila.getCell(encabezados.indexOf(nombre)).value ?? '').trim() || null;
    hoja.eachRow((fila: any, numero: number) => {
      if (numero <= 2) return;
      filas.push({
        fila: numero, perfil: leer(fila, 'PERFIL_ACADEMICO'),
        celdas: Object.fromEntries(NIVELES_TITULO.map(nivel => [nivel, leer(fila, COLUMNAS[nivel])])) as Record<NivelTitulo, string | null>,
      });
    });
  });

  it('lee las 263 filas de la plantilla', () => { expect(filas).toHaveLength(263); });

  it('ningún título adicional repite al principal ni a otro adicional del mismo nivel', () => {
    for (const { fila, perfil, celdas } of filas) {
      const d = deducirTitulosAdicionales(perfil, celdas);
      for (const nivel of NIVELES_TITULO) {
        const todos = [d.principales[nivel], ...(d.adicionales[nivel] ?? [])].filter(Boolean) as string[];
        const claves = todos.map(clave);
        expect({ fila, nivel, repetidos: claves.length - new Set(claves).size }).toEqual({ fila, nivel, repetidos: 0 });
      }
    }
  });

  it('el título principal es el primero de la columna y todo título de la columna queda registrado', () => {
    for (const { fila, perfil, celdas } of filas) {
      const d = deducirTitulosAdicionales(perfil, celdas);
      for (const nivel of NIVELES_TITULO) {
        const celda = celdas[nivel];
        if (!celda) { expect({ fila, nivel, principal: d.principales[nivel] }).toEqual({ fila, nivel, principal: undefined }); continue; }
        const registrados = [d.principales[nivel], ...(d.adicionales[nivel] ?? [])].filter(Boolean) as string[];
        expect({ fila, nivel, hay: registrados.length > 0 }).toEqual({ fila, nivel, hay: true });
        // La celda empieza por el título principal (sin perder texto).
        expect({ fila, nivel, empieza: clave(celda).startsWith(clave(d.principales[nivel]!)) }).toEqual({ fila, nivel, empieza: true });
        // Cada título registrado sale del texto de la celda o del perfil académico.
        for (const titulo of registrados) {
          const origen = `${clave(celda)} ${clave(perfil ?? '')}`;
          expect({ fila, nivel, titulo, enOrigen: origen.includes(clave(titulo)) }).toEqual({ fila, nivel, titulo, enOrigen: true });
        }
      }
    }
  });

  it('es idempotente: reprocesar con lo ya guardado no cambia ni suma títulos', () => {
    for (const { fila, perfil, celdas } of filas) {
      const primera = deducirTitulosAdicionales(perfil, celdas);
      const segunda = deducirTitulosAdicionales(perfil, celdas, primera.adicionales);
      expect({ fila, adicionales: segunda.adicionales, deducidos: segunda.deducidos }).toEqual({ fila, adicionales: primera.adicionales, deducidos: 0 });
    }
  });

  it('un registro cargado con la versión anterior (toda la celda como principal y fragmentos duplicados) se corrige al reprocesar', () => {
    const { perfil, celdas } = filas.find(item => /,/.test(item.celdas.pregrado ?? '') && item.celdas.pregrado!.split(',').length === 2)!;
    const [primero, segundo] = celdas.pregrado!.split(',').map(item => item.trim());
    const viejos = { pregrado: [primero, segundo] };
    const d = deducirTitulosAdicionales(perfil, celdas, viejos);
    expect(d.principales.pregrado).toBe(primero);
    expect(d.adicionales.pregrado?.some(titulo => mismoTitulo(titulo, primero))).toBeFalsy();
    expect(d.adicionales.pregrado?.some(titulo => mismoTitulo(titulo, segundo))).toBe(true);
  });

  it('solo quedan sin clasificar los errores de digitación y los estudios en curso de la plantilla', () => {
    const sinClasificar = filas.flatMap(({ perfil, celdas }) => deducirTitulosAdicionales(perfil, celdas).sinClasificar);
    expect(sinClasificar.length).toBeLessThanOrEqual(3);
    expect(sinClasificar).toEqual(expect.arrayContaining(['Posgrado en Cultura de la Paz', 'Porfesional en Ciencia Política y Gobierno']));
    // "Candidata a Doctora…" es un estudio en curso: no se registra como título de doctorado.
    expect(sinClasificar.some(titulo => /candidata a doctora/i.test(titulo))).toBe(true);
  });

  it('reconoce la gran mayoría de los títulos del perfil (cobertura del clasificador)', () => {
    const total = filas.reduce((suma, { perfil, celdas }) => suma + deducirTitulosAdicionales(perfil, celdas).reconocidos, 0);
    expect(total).toBeGreaterThan(800);
  });
});
