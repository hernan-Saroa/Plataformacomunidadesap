import { nombreDeDocumento, ubicarArchivo, type RegionRegistrada } from './regiones-del-archivo';
import type { RegionLeida } from './lector-paa';

const registradas: RegionRegistrada[] = [
  { id: 'sede', documentoId: 'doc-sede', nombre: 'Sede Central', prefijoLinea: 'LINEA', unidadContratacion: 'Contratación', activa: true },
  { id: 'choco', documentoId: 'doc-sede', nombre: 'Territorial Chocó', prefijoLinea: 'CHOCO', unidadContratacion: 'Territorial Choco', activa: true },
  { id: 'meta', documentoId: 'doc-meta', nombre: 'Territorial Meta', prefijoLinea: 'META', unidadContratacion: 'Territorial Meta', activa: true },
];
const documentos = new Map([
  ['doc-sede', 'Sede Central y Chocó'],
  ['doc-meta', 'Territorial Meta'],
]);

const leida = (prefijo: string, unidadContratacion: string, fila = 3): RegionLeida => ({ prefijo, unidadContratacion, fila, lineas: 10 });

describe('ubicarArchivo', () => {
  it('reconoce el documento por los prefijos que ya conoce', () => {
    const r = ubicarArchivo([leida('LINEA', 'Contratación'), leida('CHOCO', 'Territorial Choco', 900)], registradas, documentos);
    expect(r).toEqual({ documentoId: 'doc-sede', nuevas: [], errores: [] });
  });

  it('compara la unidad sin mayúsculas ni tildes', () => {
    const r = ubicarArchivo([leida('CHOCO', 'TERRITORIAL CHOCÓ ')], registradas, documentos);
    expect(r.errores).toEqual([]);
  });

  it('un archivo solo con prefijos nuevos es un territorio nuevo', () => {
    const r = ubicarArchivo([leida('BOYACA', 'Territorial Boyacá')], registradas, documentos);
    expect(r.documentoId).toBeNull();
    expect(r.nuevas.map((n) => n.prefijo)).toEqual(['BOYACA']);
    expect(r.errores).toEqual([]);
  });

  it('un prefijo nuevo en un documento conocido es una región nueva de ese documento', () => {
    const r = ubicarArchivo([leida('LINEA', 'Contratación'), leida('QUIBDO', 'Sede Quibdó', 50)], registradas, documentos);
    expect(r.documentoId).toBe('doc-sede');
    expect(r.nuevas.map((n) => n.prefijo)).toEqual(['QUIBDO']);
  });

  it('rechaza un archivo con líneas de dos documentos', () => {
    const r = ubicarArchivo([leida('LINEA', 'Contratación'), leida('META', 'Territorial Meta', 40)], registradas, documentos);
    expect(r.documentoId).toBeNull();
    expect(r.errores[0].mensaje).toBe(
      'El archivo trae líneas de LINEA (PAA de Sede Central y Chocó) y META (PAA de Territorial Meta). Cada territorio carga su propio Excel: separa las líneas y carga cada archivo por su lado.',
    );
  });

  it('rechaza una región conocida que llega con otra unidad', () => {
    const r = ubicarArchivo([leida('META', 'Territorial Llanos')], registradas, documentos);
    expect(r.documentoId).toBe('doc-meta');
    expect(r.errores[0]).toMatchObject({ fila: 3, columna: 'Unidad de contratación (referencia)', valor: 'Territorial Llanos' });
  });

  it('sospecha de un prefijo nuevo con la unidad de una región que ya existe', () => {
    const r = ubicarArchivo([leida('LINEA', 'Contratación'), leida('LINAE', 'Contratación', 77)], registradas, documentos);
    expect(r.errores).toHaveLength(1);
    expect(r.errores[0]).toMatchObject({ fila: 77, valor: 'LINAE' });
    expect(r.errores[0].mensaje).toContain('¿Está mal escrito el prefijo?');
  });

  it('sospecha de dos prefijos nuevos con la misma unidad', () => {
    const r = ubicarArchivo([leida('CASANARE', 'Territorial Casanare'), leida('CASANRE', 'Territorial Casanare', 20)], registradas, documentos);
    expect(r.errores).toHaveLength(1);
    expect(r.errores[0]).toMatchObject({ fila: 20, valor: 'CASANRE' });
  });

  it('rechaza las líneas de una región inactiva', () => {
    const r = ubicarArchivo([leida('META', 'Territorial Meta')], [{ ...registradas[2], activa: false }], documentos);
    expect(r.errores[0].mensaje).toContain('está inactiva');
  });
});

describe('nombreDeDocumento', () => {
  it('nombra el documento por las unidades que trae', () => {
    expect(nombreDeDocumento([{ unidadContratacion: 'Territorial Meta' }])).toBe('Territorial Meta');
    expect(nombreDeDocumento([{ unidadContratacion: 'Contratación' }, { unidadContratacion: 'Territorial Choco' }])).toBe(
      'Contratación y Territorial Choco',
    );
  });
});
