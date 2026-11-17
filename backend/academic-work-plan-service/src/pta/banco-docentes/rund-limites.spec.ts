import { BadRequestException } from '@nestjs/common';
import { RundDocumentosService } from './rund-documentos.service';
import { RUND_MAX_ARCHIVO_BYTES, RUND_MAX_EVIDENCES_PER_TYPE } from './rund-limites';
import { RUND_MAX_EVIDENCES_PER_TYPE as DESDE_WORKFLOW } from './rund-evidence-workflow';

const pdf = (bytes: number): Express.Multer.File => {
  const buffer = Buffer.alloc(bytes, 0x20);
  buffer.write('%PDF-1.7\n', 0, 'ascii');
  return { originalname: 'expediente.pdf', mimetype: 'application/pdf', size: bytes, buffer } as Express.Multer.File;
};
const categoria = (tope?: number) => ({ codigo: 'TITULOS', nombre: 'Títulos', mime_permitidos: ['application/pdf'], tamano_maximo_bytes: tope });

describe('límites de la carga documental RUND', () => {
  const servicio: any = Object.create(RundDocumentosService.prototype);
  const validar = (archivo: Express.Multer.File, cat: any) => servicio.validatePdf(archivo, cat);
  const MB = 1024 * 1024;

  afterEach(() => { delete process.env.RUND_DOCUMENT_MAX_SIZE_BYTES; });

  it('los topes son 200 archivos por soporte y 25 MB por archivo, y el flujo documental usa la misma constante', () => {
    expect(RUND_MAX_EVIDENCES_PER_TYPE).toBe(200);
    expect(DESDE_WORKFLOW).toBe(RUND_MAX_EVIDENCES_PER_TYPE);
    expect(RUND_MAX_ARCHIVO_BYTES).toBe(25 * MB);
  });

  it('acepta PDF de más de 10 MB (los escaneados del expediente: 10,4 y 11,2 MB) con el catálogo en 25 MB', () => {
    expect(() => validar(pdf(10.4 * MB), categoria(25 * MB))).not.toThrow();
    expect(() => validar(pdf(11.2 * MB), categoria(25 * MB))).not.toThrow();
    expect(() => validar(pdf(25 * MB), categoria(25 * MB))).not.toThrow();
  });

  it('rechaza lo que pase de 25 MB con el mensaje del tamaño máximo', () => {
    expect(() => validar(pdf(25 * MB + 1), categoria(25 * MB))).toThrow(/tamaño máximo permitido de 25 MB/);
  });

  it('sin tope en la categoría usa el predeterminado de 25 MB', () => {
    expect(() => validar(pdf(20 * MB), categoria(undefined))).not.toThrow();
    expect(() => validar(pdf(26 * MB), categoria(undefined))).toThrow(BadRequestException);
  });

  it('un tope menor configurado en la categoría o por entorno sigue mandando (se puede restringir por ambiente)', () => {
    expect(() => validar(pdf(11 * MB), categoria(10 * MB))).toThrow(/10 MB/);
    process.env.RUND_DOCUMENT_MAX_SIZE_BYTES = String(5 * MB);
    expect(() => validar(pdf(6 * MB), categoria(25 * MB))).toThrow(/5 MB/);
  });

  it('sigue rechazando lo que no es un PDF válido, sin importar el tamaño', () => {
    const falso = { ...pdf(1 * MB), buffer: Buffer.alloc(1 * MB, 0x41) } as Express.Multer.File;
    expect(() => validar(falso, categoria(25 * MB))).toThrow(/PDF válidos/);
  });
});
