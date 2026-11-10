import { describe, expect, it } from 'vitest';
import { RUND_BLOCK_LABELS, rundDocumentBlock } from './rundDocumentScope';
import { canUploadRundField, RUND_STANDALONE_SUPPORTS } from './rundEvidenceData';

// RUND-002: estructura de la ficha según el archivo de codificación documental del GGP.
describe('codificación documental RUND', () => {
  it('nombra las carpetas confirmadas con su numeración', () => {
    expect(RUND_BLOCK_LABELS.IDENTIDAD).toBe('00 Datos básicos');
    expect(RUND_BLOCK_LABELS.FORMACION).toBe('01 Títulos de formación');
  });

  it.each([
    ['tarjeta_profesional', 'IDENTIDAD'], ['hoja_vida', 'IDENTIDAD'], ['diploma_bachiller', 'FORMACION'],
    ['experiencia_docente', 'ACADEMICO'], ['experiencia_laboral', 'ACADEMICO'], ['experiencia_investigativa', 'ACADEMICO'],
    ['productividad_academica', 'ACADEMICO'], ['dominio_segunda_lengua', 'ACADEMICO'], ['formacion_no_formal', 'ACADEMICO'],
    ['estudio_hoja_vida', 'ACADEMICO'],
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
