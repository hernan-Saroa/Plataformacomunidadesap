import { Workbook } from 'exceljs';
import { COLUMNAS_PAA, origenDesdeLinea } from './estructura-paa';
import { leerPaa, type ContextoLectura } from './lector-paa';

/**
 * Los archivos se arman aquí con exceljs y no se toma el PAA real: ese trae
 * nombres, teléfonos y correos de funcionarios, y no va al repositorio.
 */

const contexto: ContextoLectura = {
  equivalencias: new Map([
    ['contratacion directa', 'CONTRATACION_DIRECTA'],
    ['minima cuantia', 'MINIMA_CUANTIA'],
  ]),
};

type Fila = Record<string, unknown>;

function fila(descripcion: string, cambios: Fila = {}): Fila {
  const sede = descripcion.startsWith('LINEA');
  return {
    unspsc: '93151500',
    descripcion,
    mes_inicio: 'Enero',
    mes_ofertas: 'Enero',
    duracion: '12',
    duracion_intervalo: 'Meses',
    modalidad: 'Contratación directa',
    fuente_recursos: 'Recursos propios ',
    valor_total: 78852000,
    valor_vigencia: 78852000,
    requiere_vigencias_futuras: 'No',
    estado_vigencias_futuras: 'NA',
    unidad_contratacion: sede ? 'Contratación' : 'Territorial Choco',
    ubicacion: 'Distrito Capital de Bogotá',
    responsable_nombre: 'Persona de prueba',
    responsable_telefono: '3000000000',
    responsable_correo: 'prueba@esap.edu.co',
    mipyme: 'No',
    lotes: 'No',
    alimentos_30: 'No',
    bienes_distintos_alimentos: '-',
    ...cambios,
  };
}

interface Opciones {
  hoja?: string;
  encabezados?: string[];
  otraHoja?: boolean;
}

async function archivo(filas: Fila[], opciones: Opciones = {}): Promise<Buffer> {
  const libro = new Workbook();
  const hoja = libro.addWorksheet(opciones.hoja ?? 'Adquisiciones  ');
  if (opciones.otraHoja) libro.addWorksheet('Notas');
  // Como el real: la fila 1 vacía y los encabezados en la 2, alguno con
  // espacio al final.
  hoja.addRow(['']);
  const encabezados =
    opciones.encabezados ??
    COLUMNAS_PAA.map((c) => (c.clave === 'modalidad' ? `${c.encabezado} ` : c.encabezado));
  hoja.addRow(encabezados);
  for (const f of filas) hoja.addRow(COLUMNAS_PAA.map((c) => f[c.clave] ?? null).concat(f.extra ? [f.extra] : []));
  return Buffer.from(await libro.xlsx.writeBuffer());
}

describe('leerPaa', () => {
  it('saca las regiones del archivo y separa código, código interno y objeto', async () => {
    const r = await leerPaa(
      await archivo([
        fila('LINEA 1 - 0060OT1-7068 - Prestar servicios de soporte'),
        fila('CHOCO 3 - Prestar servicios en la territorial'),
      ]),
      contexto,
    );

    expect(r.errores).toEqual([]);
    expect(r.lineas.map((l) => [l.codigo, l.prefijo, l.fila])).toEqual([
      ['LINEA 1', 'LINEA', 3],
      ['CHOCO 3', 'CHOCO', 4],
    ]);
    expect(r.regiones).toEqual([
      { prefijo: 'LINEA', unidadContratacion: 'Contratación', fila: 3, lineas: 1 },
      { prefijo: 'CHOCO', unidadContratacion: 'Territorial Choco', fila: 4, lineas: 1 },
    ]);
    expect(r.lineas[0].valores).toMatchObject({
      codigo_interno: '0060OT1-7068',
      objeto: 'Prestar servicios de soporte',
      modalidad_codigo: 'CONTRATACION_DIRECTA',
      duracion: 12,
      valor_total: 78852000,
      fuente_recursos: 'Recursos propios',
    });
    expect(r.lineas[1].valores.codigo_interno).toBeNull();
  });

  it('acepta el código interno con letra final', async () => {
    const r = await leerPaa(await archivo([fila('LINEA 102 - 0060OT102-7066D - Objeto')]), contexto);
    expect(r.lineas[0].valores.codigo_interno).toBe('0060OT102-7066D');
    expect(r.lineas[0].valores.objeto).toBe('Objeto');
  });

  it('rechaza un código duplicado diciendo en qué filas está', async () => {
    const r = await leerPaa(
      await archivo([fila('LINEA 1 - 0060OT1-7068 - Uno'), fila('LINEA 1 - 0060OT2-7068 - Otro')]),
      contexto,
    );
    expect(r.errores).toEqual([
      expect.objectContaining({ fila: 4, valor: 'LINEA 1', mensaje: expect.stringContaining('fila 3') }),
    ]);
  });

  it('trata «LINEA 01» y «LINEA 1» como el mismo código', async () => {
    const r = await leerPaa(
      await archivo([fila('LINEA 01 - 0060OT1-7068 - Uno'), fila('LINEA 1 - 0060OT2-7068 - Otro')]),
      contexto,
    );
    expect(r.errores).toHaveLength(1);
  });

  it('escribe el prefijo en mayúsculas y sin tildes', async () => {
    const r = await leerPaa(await archivo([fila('Chocó 3 - Objeto', { unidad_contratacion: 'Territorial Choco' })]), contexto);
    expect(r.lineas[0].codigo).toBe('CHOCO 3');
    expect(r.regiones[0].prefijo).toBe('CHOCO');
  });

  it('rechaza la descripción sin código', async () => {
    const r = await leerPaa(await archivo([fila('Prestar servicios sin código')]), contexto);
    expect(r.errores[0]).toMatchObject({ fila: 3, columna: 'Descripción' });
  });

  it('rechaza una línea con otra unidad que las demás de su prefijo', async () => {
    const r = await leerPaa(
      await archivo([fila('CHOCO 1 - Objeto'), fila('CHOCO 2 - Objeto', { unidad_contratacion: 'Contratación' })]),
      contexto,
    );
    expect(r.lineas.map((l) => l.codigo)).toEqual(['CHOCO 1']);
    expect(r.errores[0]).toMatchObject({ fila: 4, columna: 'Unidad de contratación (referencia)' });
    expect(r.errores[0].mensaje).toContain('«Territorial Choco» (fila 3)');
  });

  it('rechaza una modalidad sin equivalencia en el catálogo', async () => {
    const r = await leerPaa(
      await archivo([fila('LINEA 1 - 0060OT1-7068 - Objeto', { modalidad: 'Contratación a dedo' })]),
      contexto,
    );
    expect(r.errores[0]).toMatchObject({ columna: 'Modalidad de selección', valor: 'Contratación a dedo' });
  });

  it('rechaza valores que no son números, meses o sí/no', async () => {
    const r = await leerPaa(
      await archivo([
        fila('LINEA 1 - 0060OT1-7068 - Objeto', { valor_total: 'por definir', mes_inicio: 'Enerro', mipyme: 'Tal vez' }),
      ]),
      contexto,
    );
    expect(r.errores.map((e) => e.columna)).toEqual([
      'Fecha estimada de inicio de proceso de selección (mes)',
      'Valor total estimado',
      '¿Este proceso es susceptible de limitarse a MiPymes?',
    ]);
    expect(r.lineas).toEqual([]);
  });

  it('lee el valor escrito como texto con signo y puntos de miles', async () => {
    const r = await leerPaa(
      await archivo([fila('LINEA 1 - 0060OT1-7068 - Objeto', { valor_total: '$ 1.500.000', valor_vigencia: 1500000 })]),
      contexto,
    );
    expect(r.lineas[0].valores.valor_total).toBe(1500000);
  });

  it('exige el valor total aunque esté vacío', async () => {
    const r = await leerPaa(await archivo([fila('LINEA 1 - 0060OT1-7068 - Objeto', { valor_total: null })]), contexto);
    expect(r.errores[0].mensaje).toContain('vacía');
  });

  it('señala la columna faltante y dónde se esperaba', async () => {
    const encabezados = COLUMNAS_PAA.map((c) => c.encabezado).filter((e) => e !== 'Ubicación');
    const r = await leerPaa(await archivo([], { encabezados }), contexto);
    expect(r.errores).toContainEqual(
      expect.objectContaining({ mensaje: 'Falta la columna «Ubicación» (se espera en la columna N).' }),
    );
    expect(r.lineas).toEqual([]);
  });

  it('no admite columnas movidas', async () => {
    const encabezados = COLUMNAS_PAA.map((c) => c.encabezado);
    [encabezados[7], encabezados[8]] = [encabezados[8], encabezados[7]];
    const r = await leerPaa(await archivo([], { encabezados }), contexto);
    expect(r.errores.some((e) => e.mensaje.includes('no admite columnas movidas'))).toBe(true);
  });

  it('guarda una columna de más como advertencia, sin bloquear', async () => {
    const encabezados = [...COLUMNAS_PAA.map((c) => c.encabezado), 'Observaciones de Planeación'];
    const r = await leerPaa(
      await archivo([fila('LINEA 1 - 0060OT1-7068 - Objeto', { extra: 'revisar' })], { encabezados }),
      contexto,
    );
    expect(r.errores).toEqual([]);
    expect(r.advertencias[0].columna).toBe('Observaciones de Planeación');
    expect(r.lineas[0].valores['extra:Observaciones de Planeación']).toBe('revisar');
  });

  it('advierte cuando lo de la vigencia supera el total', async () => {
    const r = await leerPaa(
      await archivo([fila('LINEA 1 - 0060OT1-7068 - Objeto', { valor_vigencia: 90000000 })]),
      contexto,
    );
    expect(r.errores).toEqual([]);
    expect(r.advertencias).toHaveLength(1);
  });

  it('con varias hojas exige la que se llama Adquisiciones', async () => {
    const r = await leerPaa(await archivo([fila('LINEA 1 - 0060OT1-7068 - Objeto')], { hoja: 'Plan', otraHoja: true }), contexto);
    expect(r.errores[0].mensaje).toContain('no se puede saber cuál es el plan');
  });

  it('dice que no es un Excel en vez de caerse', async () => {
    const r = await leerPaa(Buffer.from('no soy un xlsx'), contexto);
    expect(r.errores[0].mensaje).toContain('no es un Excel');
  });

  it('da la misma huella a la misma línea y otra si cambia un valor', async () => {
    const a = await leerPaa(await archivo([fila('LINEA 1 - 0060OT1-7068 - Objeto')]), contexto);
    const b = await leerPaa(await archivo([fila('LINEA 1 - 0060OT1-7068 - Objeto')]), contexto);
    const c = await leerPaa(await archivo([fila('LINEA 1 - 0060OT1-7068 - Objeto', { valor_total: 1, valor_vigencia: 1 })]), contexto);
    expect(a.lineas[0].huella).toBe(b.lineas[0].huella);
    expect(a.lineas[0].huella).not.toBe(c.lineas[0].huella);
  });
});

describe('origenDesdeLinea', () => {
  it('traduce la línea a los datos del proceso y de la 3.1', async () => {
    const r = await leerPaa(
      await archivo([fila('CHOCO 5 - Capacitar', { duracion: '100', duracion_intervalo: 'Días', ubicacion: 'Chocó' })]),
      contexto,
    );
    expect(origenDesdeLinea('CHOCO 5', r.lineas[0].valores)).toEqual({
      objeto: 'Capacitar',
      modalidad: 'CONTRATACION_DIRECTA',
      valorEstimado: 78852000,
      objeto_contratar: 'Capacitar',
      linea_paa: 'CHOCO 5',
      plazo_ejecucion_dias: 100,
      lugar_ejecucion: 'Chocó',
      responsable_area: 'Persona de prueba',
    });
  });

  it('cuenta los meses como treinta días', async () => {
    const r = await leerPaa(await archivo([fila('LINEA 1 - 0060OT1-7068 - Objeto')]), contexto);
    expect(origenDesdeLinea('LINEA 1', r.lineas[0].valores).plazo_ejecucion_dias).toBe(360);
  });
});
