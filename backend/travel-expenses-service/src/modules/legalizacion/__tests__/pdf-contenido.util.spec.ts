import { esPdfPorContenido } from '../pdf-contenido.util';

describe('EFDS-1309 — validación de PDF por contenido (magic bytes)', () => {
  it('acepta un archivo que empieza con %PDF-', () => {
    expect(esPdfPorContenido(Buffer.from('%PDF-1.7\n%âãÏÓ\n1 0 obj\n', 'latin1'))).toBe(true);
  });

  it('rechaza un PNG renombrado a .pdf', () => {
    expect(esPdfPorContenido(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(false);
  });

  it('rechaza un ejecutable renombrado a .pdf', () => {
    expect(esPdfPorContenido(Buffer.from('MZ\x90\x00\x03\x00\x00\x00', 'latin1'))).toBe(false);
  });

  it('rechaza texto plano que solo menciona PDF', () => {
    expect(esPdfPorContenido(Buffer.from('Este archivo es un PDF, créame', 'utf8'))).toBe(false);
  });

  it('rechaza la cabecera incompleta (%PDF sin guion)', () => {
    expect(esPdfPorContenido(Buffer.from('%PDF', 'latin1'))).toBe(false);
  });

  it('rechaza la cabecera desplazada (debe estar en el byte 0)', () => {
    expect(esPdfPorContenido(Buffer.from(' %PDF-1.7', 'latin1'))).toBe(false);
  });

  it.each([undefined, null, Buffer.alloc(0)])('rechaza un contenido vacío (%p)', (v) => {
    expect(esPdfPorContenido(v as any)).toBe(false);
  });
});
