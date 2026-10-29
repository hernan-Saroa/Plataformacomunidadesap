import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const PHOTO_REQUIREMENTS = 'PNG o JPEG (.png, .jpg, .jpeg), máximo 2 MB; entre 200 × 200 y 4096 × 4096 píxeles. Recomendado: 600 × 600 píxeles, rostro centrado y fondo claro.';

/** Inspect the binary header, not just the browser-provided MIME or extension. */
export function validateProfilePhoto(file?: { buffer: Buffer; originalname: string; mimetype: string }) {
  const fail = () => { throw new BadRequestException(`Imagen inválida. ${PHOTO_REQUIREMENTS}`); };
  if (!file?.buffer?.length || file.buffer.length > PHOTO_MAX_BYTES) return fail();
  const b = file.buffer;
  const ext = extname(file.originalname || '').toLowerCase();
  let width = 0, height = 0, mime = '';
  if (b.length >= 45 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    if (ext !== '.png' || file.mimetype !== 'image/png') return fail();
    let offset = 8, header = false, data = false, end = false;
    while (offset + 12 <= b.length) {
      const length = b.readUInt32BE(offset);
      const type = b.toString('ascii', offset + 4, offset + 8);
      if (offset + length + 12 > b.length) return fail();
      if (!header) {
        if (type !== 'IHDR' || length !== 13) return fail();
        width = b.readUInt32BE(offset + 8); height = b.readUInt32BE(offset + 12); header = true;
      }
      if (type === 'IDAT' && length > 0) data = true;
      if (type === 'IEND') { end = length === 0 && offset + 12 === b.length; break; }
      offset += length + 12;
    }
    if (!data || !end) return fail();
    mime = 'image/png';
  } else if (b.length >= 12 && b[0] === 0xff && b[1] === 0xd8 && b[b.length-2] === 0xff && b[b.length-1] === 0xd9) {
    if (!['.jpg','.jpeg'].includes(ext) || file.mimetype !== 'image/jpeg') return fail();
    let offset = 2;
    while (offset + 4 <= b.length) {
      if (b[offset++] !== 0xff) return fail();
      while (b[offset] === 0xff) offset++;
      const marker = b[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (offset + 2 > b.length) return fail();
      const length = b.readUInt16BE(offset);
      if (length < 2 || offset + length > b.length) return fail();
      if ([0xc0,0xc1,0xc2].includes(marker)) {
        if (length < 8) return fail();
        height = b.readUInt16BE(offset + 3); width = b.readUInt16BE(offset + 5);
      }
      offset += length;
    }
    mime = 'image/jpeg';
  } else return fail();
  if (width < 200 || height < 200 || width > 4096 || height > 4096) return fail();
  return { width, height, mime };
}
