import {
  limpiarSufijoTecnicoJornada,
  obtenerNombreVisibleAsignatura,
} from './asignatura-nombre.util';

describe('nombre visible de asignatura', () => {
  it.each([
    ['Análisis Financiero Público (AP_día)', 'Análisis Financiero Público'],
    ['Contabilidad Gubernamental (AP_noche)', 'Contabilidad Gubernamental'],
    ['Derecho Administrativo (AP-DIA)', 'Derecho Administrativo'],
  ])('oculta el sufijo técnico %s', (original, esperado) => {
    expect(limpiarSufijoTecnicoJornada(original)).toBe(esperado);
  });

  it('prioriza nombre_base separado por la plantilla', () => {
    expect(obtenerNombreVisibleAsignatura({
      nombre: 'Matemáticas I (AP_día)',
      nombre_base: 'Matemáticas I',
    })).toBe('Matemáticas I');
    expect(obtenerNombreVisibleAsignatura({
      nombre: 'Matemáticas I (AP_día)',
      nombre_base: '   ',
    })).toBe('Matemáticas I');
    expect(obtenerNombreVisibleAsignatura({
      nombre_base: 'Contabilidad\r\nGubernamental',
    })).toBe('Contabilidad Gubernamental');
  });

  it('conserva paréntesis que no son códigos técnicos de jornada', () => {
    expect(limpiarSufijoTecnicoJornada('Gestión Pública (Electiva)'))
      .toBe('Gestión Pública (Electiva)');
  });
});
