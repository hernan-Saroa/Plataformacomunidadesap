import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';
import { inflateSync } from 'zlib';

export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const PHOTO_REQUIREMENTS = 'PNG o JPEG (.png, .jpg, .jpeg), máximo 2 MB; entre 200 × 200 y 4096 × 4096 píxeles. Recomendado: 600 × 600 píxeles, rostro centrado y fondo claro.';

const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function pngCrc(buffer: Buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

const validDimensions = (width: number, height: number) => width >= 200 && height >= 200 && width <= 4096 && height <= 4096;

/** Validate binary structure and dimensions even when the browser is bypassed. */
export function validateProfilePhoto(file?: { buffer: Buffer; originalname: string; mimetype: string }) {
  const fail = () => { throw new BadRequestException(`Imagen inválida. ${PHOTO_REQUIREMENTS}`); };
  if (!file?.buffer?.length || file.buffer.length > PHOTO_MAX_BYTES) return fail();
  const b = file.buffer;
  const ext = extname(file.originalname || '').toLowerCase();
  let width = 0, height = 0, mime = '';
  if (b.length >= 45 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    if (ext !== '.png' || file.mimetype !== 'image/png') return fail();
    let offset = 8, header = false, end = false, palette = false, dataEnded = false;
    let depth = 0, color = 0, interlace = 0;
    const compressed: Buffer[] = [];
    while (offset + 12 <= b.length) {
      const length = b.readUInt32BE(offset);
      const type = b.toString('ascii', offset + 4, offset + 8);
      if (offset + length + 12 > b.length) return fail();
      if (pngCrc(b.subarray(offset + 4, offset + 8 + length)) !== b.readUInt32BE(offset + 8 + length)) return fail();
      if (!header) {
        if (type !== 'IHDR' || length !== 13) return fail();
        width = b.readUInt32BE(offset + 8); height = b.readUInt32BE(offset + 12); header = true;
        depth = b[offset + 16]; color = b[offset + 17]; interlace = b[offset + 20];
        const depths: Record<number, number[]> = { 0: [1,2,4,8,16], 2: [8,16], 3: [1,2,4,8], 4: [8,16], 6: [8,16] };
        if (!validDimensions(width,height) || !depths[color]?.includes(depth)
          || b[offset + 18] !== 0 || b[offset + 19] !== 0 || interlace > 1) return fail();
      } else if (type === 'IHDR') return fail();
      if (!/^[A-Za-z]{4}$/.test(type)) return fail();
      if (type === 'PLTE') {
        if (palette || compressed.length || !length || length % 3 || length > 768 || [0,4].includes(color)) return fail();
        palette = true;
      }
      if (type === 'IDAT') {
        if (dataEnded || (color === 3 && !palette)) return fail();
        compressed.push(b.subarray(offset + 8,offset + 8 + length));
      } else if (compressed.length) dataEnded = true;
      if (!['IHDR','PLTE','IDAT','IEND'].includes(type) && type[0] === type[0].toUpperCase()) return fail();
      if (type === 'IEND') { end = length === 0 && offset + 12 === b.length; break; }
      offset += length + 12;
    }
    if (!compressed.length || !end) return fail();
    const channels: Record<number,number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
    const passes = interlace ? [[0,0,8,8],[4,0,8,8],[0,4,4,8],[2,0,4,4],[0,2,2,4],[1,0,2,2],[0,1,1,2]] : [[0,0,1,1]];
    const rows = passes.map(([x,y,dx,dy]) => {
      const w = Math.max(0,Math.ceil((width-x)/dx)), h = Math.max(0,Math.ceil((height-y)/dy));
      return { count: w ? h : 0, stride: 1 + Math.ceil(w*channels[color]*depth/8) };
    });
    const expected = rows.reduce((total,row) => total + row.count*row.stride,0);
    let decoded: Buffer;
    try { decoded = inflateSync(Buffer.concat(compressed),{ maxOutputLength: expected }); }
    catch { return fail(); }
    if (decoded.length !== expected) return fail();
    let rowOffset = 0;
    for (const row of rows) for (let index = 0; index < row.count; index++,rowOffset += row.stride) {
      if (decoded[rowOffset] > 4) return fail();
    }
    mime = 'image/png';
  } else if (b.length >= 12 && b[0] === 0xff && b[1] === 0xd8 && b[b.length-2] === 0xff && b[b.length-1] === 0xd9) {
    if (!['.jpg','.jpeg'].includes(ext) || file.mimetype !== 'image/jpeg') return fail();
    let offset = 2, frame = false, scan = false, finished = false;
    let components = 0;
    while (offset + 2 <= b.length) {
      if (b[offset++] !== 0xff) return fail();
      while (b[offset] === 0xff) offset++;
      const marker = b[offset++];
      if (marker === 0xd9) { finished = offset === b.length; break; }
      if (offset + 2 > b.length) return fail();
      const length = b.readUInt16BE(offset);
      if (length < 2 || offset + length > b.length) return fail();
      if ([0xc0,0xc1,0xc2].includes(marker)) {
        if (frame || length < 8 || b[offset + 2] !== 8) return fail();
        height = b.readUInt16BE(offset + 3); width = b.readUInt16BE(offset + 5);
        components = b[offset + 7];
        if (![1,3,4].includes(components) || length !== 8 + 3*components || !validDimensions(width,height)) return fail();
        frame = true;
      }
      if (marker === 0xda) {
        if (!frame || length < 8) return fail();
        const count = b[offset + 2];
        if (!count || count > components || length !== 6 + 2*count) return fail();
        scan = true; offset += length;
        const start = offset;
        // Entropy-coded scan bytes may contain stuffed FF00 and restart markers.
        // Progressive JPEGs return to the segment loop for each subsequent scan.
        while (offset + 1 < b.length) {
          if (b[offset] !== 0xff) { offset++; continue; }
          const next = b[offset + 1];
          if (next === 0 || (next >= 0xd0 && next <= 0xd7)) { offset += 2; continue; }
          if (next === 0xff) { offset++; continue; }
          break;
        }
        if (offset === start) return fail();
        continue;
      }
      offset += length;
    }
    if (!frame || !scan || !finished) return fail();
    mime = 'image/jpeg';
  } else return fail();
  if (!validDimensions(width,height)) return fail();
  return { width, height, mime };
}
