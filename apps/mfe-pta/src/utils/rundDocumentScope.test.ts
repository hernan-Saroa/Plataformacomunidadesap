import { describe, expect, it } from 'vitest';
import { rundDocumentBlock } from './rundDocumentScope';

describe('Pertenencia documental RUND', () => {
  it.each([
    ['documento_identidad', 'IDENTIDAD'], ['pasaporte', 'IDENTIDAD'], ['diploma_maestria', 'FORMACION'],
    ['convalidacion_men', 'FORMACION'], ['contrato', 'VINCULACION'], ['acto_administrativo_dedicacion', 'VINCULACION'],
    ['resolucion_puntaje_salarial', 'VINCULACION'], ['acto_asignacion_nucleo', 'ACADEMICO'],
    ['acta_evaluacion_desempeno', 'ACADEMICO'], ['autorizacion_habeas_data', 'TRANSVERSAL'],
  ])('recupera la sección de un soporte antiguo sin bloque: %s', (type, block) => {
    expect(rundDocumentBlock({ tipoSoporte: type })).toBe(block);
    expect(rundDocumentBlock({ tipo_soporte: type })).toBe(block);
  });
  it('respeta la sección registrada y no cambia de grupo según la categoría del archivo', () => {
    expect(rundDocumentBlock({ bloque: 'CONTACTO' })).toBe('CONTACTO');
    expect(rundDocumentBlock({ bloque: 'ACADEMICO', tipoSoporte: 'contrato' })).toBe('ACADEMICO');
    expect(rundDocumentBlock({ bloque: 'formacion' })).toBe('FORMACION');
  });
  it('mantiene aparte los anexos sin sección incluso si su categoría es Identidad', () => {
    expect(rundDocumentBlock({})).toBeNull();
    expect(rundDocumentBlock({ bloque: 'DOCUMENTAL' })).toBeNull();
    expect(rundDocumentBlock({ tipoSoporte: 'soporte_desconocido' })).toBeNull();
  });
});
