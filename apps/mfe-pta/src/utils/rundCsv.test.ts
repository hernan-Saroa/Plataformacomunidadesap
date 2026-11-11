import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { decodeRundCsv } from './rundCsv';

describe('CSV de la vista previa RUND', () => {
  const csv = 'NOMBRE_COMPLETO,FORMACIÓN\nJosé Muñoz,Administración Pública';
  it.each([
    ['UTF-8', Buffer.from(csv, 'utf8')],
    ['UTF-8 con BOM', Buffer.from('\ufeff' + csv, 'utf8')],
    ['Windows-1252', Buffer.from(csv, 'latin1')],
    ['UTF-16LE', Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(csv, 'utf16le')])],
    ['UTF-16BE', Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from(csv, 'utf16le').swap16()])],
  ])('muestra las tildes de %s igual que el backend', (_encoding, input) => {
    const workbook = XLSX.read(decodeRundCsv(input as Uint8Array), { type: 'string' });
    expect(XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])).toEqual([
      { NOMBRE_COMPLETO: 'José Muñoz', FORMACIÓN: 'Administración Pública' },
    ]);
  });
  it('preserva la ñ y la tilde al normalizar texto combinado', () => {
    expect(decodeRundCsv(Buffer.from('Jose\u0301 Mun\u0303oz'))).toBe('José Muñoz');
  });
  it('detecta contenido que ya perdió caracteres', () => {
    expect(() => decodeRundCsv(Buffer.from('Jos�'))).toThrow('texto ilegible');
  });
});
