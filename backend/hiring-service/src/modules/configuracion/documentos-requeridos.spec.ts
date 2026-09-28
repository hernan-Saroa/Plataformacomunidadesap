import { codigoDesdeNombre, codigoLibre } from './documentos-requeridos.service';

/**
 * El código con el que las entregas citan un documento requerido (EFDS-2066).
 *
 * Lo arma el servicio y no quien configura: es un identificador, no un dato
 * que el área tenga que inventar, y una vez creado no cambia aunque se
 * corrija el nombre.
 */
describe('codigoDesdeNombre', () => {
  it('sigue la forma de los sembrados por migración', () => {
    expect(codigoDesdeNombre('Memorando de solicitud')).toBe('MEMORANDO_DE_SOLICITUD');
  });

  it('quita tildes y signos', () => {
    expect(codigoDesdeNombre('Certificado de idoneidad y experiencia (anexo)')).toBe(
      'CERTIFICADO_DE_IDONEIDAD_Y_EXPERIENCIA_ANEXO',
    );
    expect(codigoDesdeNombre('Análisis del sector — versión final')).toBe(
      'ANALISIS_DEL_SECTOR_VERSION_FINAL',
    );
  });

  it('cabe en la columna aunque el nombre sea largo', () => {
    expect(codigoDesdeNombre('a'.repeat(200)).length).toBeLessThanOrEqual(50);
  });

  it('un nombre sin letras no deja el código vacío', () => {
    expect(codigoDesdeNombre('—')).toBe('DOCUMENTO');
  });
});

describe('codigoLibre', () => {
  it('usa el propio cuando la actividad no lo tiene', () => {
    expect(codigoLibre('MEMORANDO', ['LISTA'])).toBe('MEMORANDO');
  });

  it('numera cuando ya está ocupado, en vez de chocar con el UNIQUE', () => {
    expect(codigoLibre('MEMORANDO', ['MEMORANDO'])).toBe('MEMORANDO_2');
    expect(codigoLibre('MEMORANDO', ['MEMORANDO', 'MEMORANDO_2'])).toBe('MEMORANDO_3');
  });
});
