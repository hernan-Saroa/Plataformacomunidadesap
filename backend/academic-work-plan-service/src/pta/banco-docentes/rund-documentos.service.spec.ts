import { BadRequestException } from '@nestjs/common';
import { RundDocumentosService } from './rund-documentos.service';

describe('RundDocumentosService - validación de archivos REQ-RUND-F010', () => {
  const service = new RundDocumentosService({} as any, {} as any);
  const category = {
    codigo: 'TITULOS',
    mime_permitidos: ['application/pdf'],
    tamano_maximo_bytes: 1024,
  };

  const pdf = (overrides: Partial<Express.Multer.File> = {}) => ({
    fieldname: 'file',
    originalname: 'diploma.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 12,
    destination: '',
    filename: '',
    path: '',
    buffer: Buffer.from('%PDF-1.7\n'),
    ...overrides,
  } as Express.Multer.File);

  afterEach(() => {
    delete process.env.RUND_DOCUMENT_MAX_SIZE_BYTES;
  });

  it('acepta un PDF real dentro del tamaño configurado', () => {
    expect(() => (service as any).validatePdf(pdf(), category)).not.toThrow();
  });
  it('acepta nombres y descripciones con tildes sin cortar un carácter Unicode a la mitad', () => {
    const file = pdf({ originalname: Buffer.from('Formación – Muñoz.pdf').toString('latin1') });
    expect(() => (service as any).validatePdf(file, category)).not.toThrow();
    expect(file.originalname).toBe('Formación – Muñoz.pdf');
    expect((service as any).cleanDescription('Formacio\u0301n de Jose\u0301 Mun\u0303oz')).toBe('Formación de José Muñoz');
    const text = (service as any).cleanDescription('á'.repeat(999) + '🧑' + 'fin');
    expect(text).toBe('á'.repeat(999) + '🧑');
    expect(() => encodeURIComponent(text)).not.toThrow();
  });

  it.each([
    ['extensión', pdf({ originalname: 'diploma.exe' })],
    ['MIME', pdf({ mimetype: 'application/octet-stream' })],
    ['firma binaria', pdf({ buffer: Buffer.from('no-es-pdf') })],
  ])('rechaza un archivo con %s inválida', (_case, file) => {
    expect(() => (service as any).validatePdf(file, category)).toThrow(BadRequestException);
  });

  it('rechaza archivos que superan el máximo de la categoría', () => {
    expect(() => (service as any).validatePdf(pdf({ size: 1025 }), category)).toThrow(
      'tamaño máximo permitido',
    );
  });

  it('exige que exista un archivo', () => {
    expect(() => (service as any).validatePdf(undefined, category)).toThrow('Debe adjuntar un archivo PDF');
  });
});
