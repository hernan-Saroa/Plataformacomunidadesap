import { BadRequestException } from '@nestjs/common';
import { BancoDocentesController } from './banco-docentes.controller';
import { normalizeBancoDocentePayload } from './banco-docentes.service';
import { decodeRundCsv, normalizeRundUpload, rundContentDisposition, rundUnicodeText } from './rund-text-encoding';

describe('Unicode en archivos y textos RUND', () => {
  it.each(['Formación José Muñoz.pdf', 'ÁÉÍÓÚ Ñ Ü.pdf', 'SÃO PAULO.pdf', 'Investigación – Peña 🧑.pdf', '日本語 Ελληνικά.pdf'])('conserva el nombre real de un archivo: %s', name => {
    const buffer = Buffer.from('%PDF-1.7\n');
    const upload = { originalname: Buffer.from(name, 'utf8').toString('latin1'), buffer } as Express.Multer.File;
    normalizeRundUpload(upload);
    expect(upload.originalname).toBe(name);
    expect(upload.buffer).toBe(buffer);
    normalizeRundUpload(upload);
    expect(upload.originalname).toBe(name);
  });
  it('conserva Unicode ya decodificado y evita una segunda decodificación entre controlador y servicio', () => {
    for (const name of ['José Muñoz.pdf', 'SÃO.pdf', 'Investigación – Peña.pdf']) {
      const upload = { originalname: name } as Express.Multer.File;
      normalizeRundUpload(upload);
      expect(upload.originalname).toBe(name);
    }
    const literal = 'Texto literal Ã±.pdf';
    const upload = { originalname: Buffer.from(literal, 'utf8').toString('latin1') } as Express.Multer.File;
    normalizeRundUpload(upload);normalizeRundUpload(upload);
    expect(upload.originalname).toBe(literal);
  });
  it('normaliza letras combinadas conservando las tildes y no inventa acentos', () => {
    expect(rundUnicodeText('Jose\u0301 Mun\u0303oz – Formacio\u0301n')).toBe('José Muñoz – Formación');
    expect(rundUnicodeText('Jose Munoz')).toBe('Jose Munoz');
    expect(normalizeBancoDocentePayload({ NOMBRE_COMPLETO: 'Jose\u0301 Mun\u0303oz', TITULO_PREGRADO: 'Administracio\u0301n Pu\u0301blica' }))
      .toMatchObject({ fullName: 'JOSÉ MUÑOZ', pregrado: 'Administración Pública' });
  });
  it.each(['\ud800.pdf', 'archivo\u0000.pdf', 'archivo\n.pdf'])('rechaza nombres que producirían errores de codificación: %s', originalname => {
    expect(() => normalizeRundUpload({ originalname } as Express.Multer.File)).toThrow(BadRequestException);
  });
  it('descarga el nombre completo en UTF-8 y escapa correctamente apóstrofes y paréntesis', () => {
    const name = "Formación (José O'Ñeill) – 100%.pdf";
    const header = rundContentDisposition(name, true);
    expect(header).toMatch(/^attachment; filename="[\x20-\x7e]+"; filename\*=UTF-8''/);
    expect(decodeURIComponent(header.split("filename*=UTF-8''")[1])).toBe(name);
    expect(header).toContain('%27');expect(header).toContain('%28');expect(header).toContain('%29');
    expect(rundContentDisposition(name, false)).toMatch(/^inline;/);
  });
});

describe('Carga CSV sin corromper tildes', () => {
  const csv = 'DOCUMENTO_IDENTIDAD,NOMBRE_COMPLETO,VINCULACIÓN,TITULO_PREGRADO\n123456,José Muñoz,Planta,Administración Pública';
  const encodings = [
    ['UTF-8 sin BOM', Buffer.from(csv, 'utf8')],
    ['UTF-8 con BOM', Buffer.from('\ufeff' + csv, 'utf8')],
    ['Windows-1252', Buffer.from(csv, 'latin1')],
    ['UTF-16LE', Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(csv, 'utf16le')])],
    ['UTF-16BE', Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from(csv, 'utf16le').swap16()])],
  ] as const;
  it.each(encodings)('lee %s desde el controlador y preserva los datos enviados al servicio', async (_encoding, buffer) => {
    const service = { bulkUpsert: jest.fn().mockResolvedValue({ total: 1, created: 1, errors: 0 }), logSensitiveResourceAccess: jest.fn() };
    const controller = Object.create(BancoDocentesController.prototype) as BancoDocentesController;
    (controller as any).service = service;
    await controller.bulkUpload({ buffer, originalname: 'Convocatoria Formación.csv' } as Express.Multer.File, {}, { user: { userId: 'actor' }, headers: {} }, 'true');
    expect(service.bulkUpsert.mock.calls[0][0]).toEqual([expect.objectContaining({
      NOMBRE_COMPLETO: 'José Muñoz', VINCULACIÓN: 'Planta', VINCULACION: 'Planta', TITULO_PREGRADO: 'Administración Pública',
    })]);
  });
  it('rechaza un texto con caracteres ya perdidos en vez de inventar su contenido', () => {
    expect(() => decodeRundCsv(Buffer.from('Nombre\nJos�'))).toThrow(BadRequestException);
  });
  it('informa la codificación ilegible antes de enviar filas al servicio de importación', async () => {
    const service = { bulkUpsert: jest.fn() };
    const controller = Object.create(BancoDocentesController.prototype) as BancoDocentesController;
    (controller as any).service = service;
    await expect(controller.bulkUpload({ buffer: Buffer.from('Nombre\nJos�'), originalname: 'prueba.csv' } as Express.Multer.File,
      {}, { user: { userId: 'actor' }, headers: {} }, 'true')).rejects.toThrow('CSV UTF-8');
    expect(service.bulkUpsert).not.toHaveBeenCalled();
  });
});
