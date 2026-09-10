import { describe, expect, it } from 'vitest';
import { canUploadRundField, hasRundData } from './rundEvidenceData';

describe('Datos necesarios para soportar una fila RUND', () => {
  it.each([null, undefined, '', '   ', '—', 'No aplica', ' N/A ', 'Sin información', false])('rechaza un dato ausente: %s', value => {
    expect(hasRundData(value)).toBe(false);
  });
  it.each([0, '0', '3106791787', 'Maestría', '2026-01-01'])('conserva valores válidos: %s', value => {
    expect(hasRundData(value)).toBe(true);
  });
  it('distingue cada fila del mismo documento y no usa el archivo original', () => {
    const tarjeta = { docenteId: '1', datos_carga_masiva: { FECHA_NACIMIENTO: '1980-01-01' }, bloques: { IDENTIDAD: { campos: [
      { campo: 'NOMBRE_COMPLETO', valor: 'Persona de prueba' }, { campo: 'FECHA_NACIMIENTO', valor: null },
    ] } } };
    expect(canUploadRundField('IDENTIDAD', { tipoSoporte: 'documento_identidad', revisionId: 'NOMBRE_COMPLETO' }, tarjeta)).toBe(true);
    expect(canUploadRundField('IDENTIDAD', { tipoSoporte: 'documento_identidad', revisionId: 'FECHA_NACIMIENTO' }, tarjeta)).toBe(false);
  });
  it('no toma una fecha indefinida ni campos restringidos como datos', () => {
    const tarjeta = { docenteId: '1', bloques: { VINCULACION: { campos: [
      { campo: 'INICIO_VINCULACION', valor: null }, { campo: 'FIN_VINCULACION', valor: null },
      { campo: 'HORAS_PTA', valor: 0 }, { campo: 'PUNTAJE_SALARIAL', valor: 'Restringido', restringido: true },
    ] } } };
    expect(canUploadRundField('VINCULACION', { tipoSoporte: 'contrato', revisionId: 'FECHAS_VINCULACION' }, tarjeta)).toBe(false);
    expect(canUploadRundField('VINCULACION', { tipoSoporte: 'acto_administrativo_dedicacion', revisionId: 'HORAS_PTA' }, tarjeta)).toBe(true);
    expect(canUploadRundField('VINCULACION', { tipoSoporte: 'resolucion_puntaje_salarial' }, tarjeta)).toBe(false);
  });
  it('permite la autorización que se acredita con el propio documento', () => {
    expect(canUploadRundField('TRANSVERSAL', { tipoSoporte: 'autorizacion_habeas_data' }, { docenteId: '1' })).toBe(true);
  });
});
