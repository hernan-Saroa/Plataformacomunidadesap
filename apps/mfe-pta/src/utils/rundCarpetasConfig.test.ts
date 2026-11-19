import { describe, expect, it } from 'vitest';
import { carpetaActiva, carpetasActivas, conCarpeta, filasConfiguracion, RUND_CONFIGURE_PERMISSION, type RundConfigMatriz } from './rundCarpetasConfig';
import { RUND_CARPETA_ORDEN } from './rundCarpetas';

const matriz = (inactivas: Record<string, string[]> = {}): RundConfigMatriz => ({
  tipos: [{ codigo: 'CATEDRA', nombre: 'Hora cátedra' }, { codigo: 'CARRERA2', nombre: 'Carrera 2' }],
  carpetas: [
    { bloque: 'VINCULACION', obligatoria: true }, { bloque: 'PRODUCTIVIDAD_ACADEMICA', obligatoria: false },
    { bloque: 'IDENTIDAD', obligatoria: true }, { bloque: 'SEGUNDA_LENGUA', obligatoria: false },
  ],
  inactivas,
});

describe('Configuración de carpetas RUND', () => {
  it('el permiso es propio de la pestaña Configuración', () => {
    expect(RUND_CONFIGURE_PERMISSION).toBe('banco-docentes.rund.configure');
  });

  it('las filas salen en el orden del archivo de codificación con su nombre', () => {
    const filas = filasConfiguracion(matriz());
    expect(filas.map(fila => fila.bloque)).toEqual(['IDENTIDAD', 'PRODUCTIVIDAD_ACADEMICA', 'SEGUNDA_LENGUA', 'VINCULACION']);
    expect(filas.map(fila => fila.bloque)).toEqual(RUND_CARPETA_ORDEN.filter(bloque => filas.some(fila => fila.bloque === bloque)));
    expect(filas[0].nombre).toBe('Datos básicos');
    expect(filas.find(fila => fila.bloque === 'VINCULACION')!.obligatoria).toBe(true);
  });

  it('sin configuración todas las carpetas aplican', () => {
    const base = matriz();
    expect(carpetaActiva(base, 'CATEDRA', 'PRODUCTIVIDAD_ACADEMICA')).toBe(true);
    expect(carpetasActivas(base, 'CATEDRA')).toBe(4);
  });

  it('desactivar una carpeta solo afecta al tipo indicado y no modifica la matriz original', () => {
    const base = matriz();
    const nueva = conCarpeta(base, 'CATEDRA', 'PRODUCTIVIDAD_ACADEMICA', false);
    expect(carpetaActiva(nueva, 'CATEDRA', 'PRODUCTIVIDAD_ACADEMICA')).toBe(false);
    expect(carpetaActiva(nueva, 'CARRERA2', 'PRODUCTIVIDAD_ACADEMICA')).toBe(true);
    expect(carpetasActivas(nueva, 'CATEDRA')).toBe(3);
    expect(base.inactivas).toEqual({});
  });

  it('volver a activar la carpeta limpia el tipo cuando ya no tiene carpetas inactivas', () => {
    const nueva = conCarpeta(matriz({ CATEDRA: ['SEGUNDA_LENGUA'] }), 'CATEDRA', 'SEGUNDA_LENGUA', true);
    expect(nueva.inactivas).toEqual({});
  });

  it('no repite una carpeta ya desactivada', () => {
    const nueva = conCarpeta(matriz({ CATEDRA: ['SEGUNDA_LENGUA'] }), 'CATEDRA', 'SEGUNDA_LENGUA', false);
    expect(nueva.inactivas.CATEDRA).toEqual(['SEGUNDA_LENGUA']);
  });
});
