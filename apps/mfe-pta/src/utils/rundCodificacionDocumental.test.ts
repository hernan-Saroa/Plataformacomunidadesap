import { describe, expect, it } from 'vitest';
import { RUND_BLOCK_LABELS, rundDocumentBlock } from './rundDocumentScope';
import { RUND_CARPETAS, RUND_CARPETA_ORDEN } from './rundCarpetas';
import { RUND_REQUIRED_BLOCKS } from './rundReviewStatus';
import { canUploadRundField, RUND_STANDALONE_SUPPORTS } from './rundEvidenceData';

// RUND-002: estructura de la ficha según el archivo de codificación documental del GGP.
describe('codificación documental RUND', () => {
  it('nombra las carpetas como el archivo CODIFICACION, en su orden', () => {
    expect(RUND_CARPETA_ORDEN.map(bloque => RUND_BLOCK_LABELS[bloque])).toEqual([
      '00 Datos básicos', '01 Títulos de formación', '02 Experiencia docente', '03 Experiencia laboral', '04 Experiencia investigativa',
      '05 Productividad académica', '06 Dominio de segunda lengua', '07 Formación no formal adicional', '08 Estudio hoja de vida',
      '09 Documentos no válidos', '10 Novedades talento humano', 'Transversal',
    ]);
    expect(new Set(RUND_CARPETAS.map(carpeta => carpeta.codigo)).size).toBe(RUND_CARPETAS.length);
  });

  it('la activación del perfil exige los mismos cinco bloques, todos dentro de las carpetas', () => {
    expect(RUND_REQUIRED_BLOCKS).toEqual(['IDENTIDAD', 'FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL']);
    for (const bloque of RUND_REQUIRED_BLOCKS) expect(RUND_CARPETA_ORDEN).toContain(bloque);
  });

  it.each([
    ['tarjeta_profesional', 'IDENTIDAD'], ['hoja_vida', 'IDENTIDAD'], ['diploma_bachiller', 'FORMACION'],
    ['experiencia_docente', 'EXPERIENCIA_DOCENTE'], ['experiencia_laboral', 'EXPERIENCIA_LABORAL'], ['experiencia_investigativa', 'ACADEMICO'],
    ['productividad_academica', 'PRODUCTIVIDAD_ACADEMICA'], ['dominio_segunda_lengua', 'SEGUNDA_LENGUA'], ['formacion_no_formal', 'FORMACION_NO_FORMAL'],
    ['estudio_hoja_vida', 'ESTUDIO_HOJA_VIDA'], ['documento_no_valido', 'DOCUMENTOS_NO_VALIDOS'],
  ])('ubica el soporte %s en %s', (tipoSoporte, bloque) => {
    expect(rundDocumentBlock({ tipoSoporte })).toBe(bloque);
    expect(RUND_STANDALONE_SUPPORTS).toContain(tipoSoporte);
  });

  it('permite cargar los soportes sin campo en RUND aunque el perfil no tenga datos', () => {
    const tarjeta = { docenteId: 'docente-1', bloques: {} };
    for (const tipoSoporte of RUND_STANDALONE_SUPPORTS) expect(canUploadRundField('IDENTIDAD', { tipoSoporte }, tarjeta)).toBe(true);
  });

  it('mantiene el requisito de dato previo para los soportes que acreditan una fila del perfil', () => {
    const tarjeta = { docenteId: 'docente-1', bloques: {} };
    expect(canUploadRundField('FORMACION', { tipoSoporte: 'diploma_pregrado' }, tarjeta)).toBe(false);
    expect(canUploadRundField('IDENTIDAD', { tipoSoporte: 'hoja_vida' }, { bloques: {} })).toBe(false); // sin docente no hay a quién cargar
  });

  it('el soporte histórico hoja_vida_pro sigue en Formación', () => {
    expect(rundDocumentBlock({ tipoSoporte: 'hoja_vida_pro' })).toBe('FORMACION');
  });
});
