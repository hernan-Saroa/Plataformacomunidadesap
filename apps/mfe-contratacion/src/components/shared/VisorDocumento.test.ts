import { describe, expect, it } from 'vitest';

import { formaDeVer, sePuedeVer } from './VisorDocumento';

const WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Qué sabe mostrar el visor, y cómo lo decide. */
describe('formaDeVer', () => {
  it('muestra PDF, imágenes y Word moderno', () => {
    expect(formaDeVer(['application/pdf'], 'x')).toBe('pdf');
    expect(formaDeVer(['image/png'], 'x')).toBe('imagen');
    expect(formaDeVer([WORD], 'x')).toBe('word');
  });

  it('el Word antiguo y el Excel no: se descargan', () => {
    expect(formaDeVer(['application/msword'], 'acta.doc')).toBe('ninguna');
    expect(formaDeVer([], 'matriz.xlsx')).toBe('ninguna');
  });

  it('manda el tipo del archivo sobre el nombre, que puede ser el del requisito', () => {
    // «Memorando de solicitud firmado» no tiene extensión: sin el tipo, un PDF
    // se declaraba ilegible aunque se pudiera abrir.
    expect(formaDeVer([null, 'application/pdf'], 'Memorando de solicitud firmado')).toBe('pdf');
  });

  it('sin tipo útil cae a la extensión', () => {
    expect(formaDeVer([undefined, 'application/octet-stream'], 'informe.DOCX')).toBe('word');
    expect(formaDeVer([], 'foto.jpeg')).toBe('imagen');
  });

  it('entiende el tipo aunque traiga parámetros', () => {
    expect(formaDeVer(['application/pdf; charset=binary'], 'x')).toBe('pdf');
  });
});

/** Cuándo se ofrece el ojo de «Ver» (AJU-001). */
describe('sePuedeVer', () => {
  const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  it('no lo ofrece para un Excel, por tipo o por extensión', () => {
    expect(sePuedeVer(XLSX, 'Plantilla Análisis del Sector')).toBe(false);
    expect(sePuedeVer(null, 'Plantilla Análisis del Sector', 'BS-DE-002.xlsx')).toBe(false);
  });

  it('sí para PDF, imágenes y Word moderno', () => {
    expect(sePuedeVer('application/pdf', 'x')).toBe(true);
    expect(sePuedeVer(null, 'anexo.docx')).toBe(true);
  });

  it('sin tipo ni extensión lo ofrece: el visor dirá qué es', () => {
    expect(sePuedeVer(null, 'Memorando de solicitud firmado')).toBe(true);
    expect(sePuedeVer(undefined, 'Estudio previo v1.2')).toBe(true);
  });
});
