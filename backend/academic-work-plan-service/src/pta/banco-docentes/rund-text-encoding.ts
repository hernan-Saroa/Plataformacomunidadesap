import { BadRequestException } from '@nestjs/common';

/** Canonical Unicode preserves accents, ñ and non-Spanish characters. It does not guess words. */
export function rundUnicodeText(value: string): string {
  if (value.includes('\u0000')) throw new BadRequestException('El texto contiene un carácter nulo no válido. Revise el texto e intente nuevamente.');
  if (/[\uD800-\uDFFF]/u.test(value)) throw new BadRequestException('El texto contiene un carácter Unicode incompleto. Revise el texto e intente nuevamente.');
  return value.normalize('NFC');
}

const normalizedUploads = new WeakSet<object>();
/** Multipart filename parameters may arrive as UTF-8 bytes interpreted as Latin-1. Decode once. */
export function normalizeRundUpload(file?: Express.Multer.File): void {
  if (!file || normalizedUploads.has(file)) return;
  let name = String(file.originalname || '');
  if ([...name].every(char => char.codePointAt(0)! <= 255)) {
    try { name = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(name, 'latin1')); }
    catch { /* Already decoded Unicode or a legacy Latin-1 name: preserve it. */ }
  }
  name = rundUnicodeText(name);
  if (!name.trim() || /[\u0000-\u001F\u007F-\u009F]/u.test(name)) throw new BadRequestException('El nombre del archivo contiene caracteres no válidos. Renombre el archivo e intente nuevamente.');
  file.originalname = name;
  normalizedUploads.add(file);
}

/** Decode text before SheetJS, whose buffer CSV default is not UTF-8. XLS/XLSX stay binary. */
export function decodeRundCsv(input: Uint8Array): string {
  let text: string;
  if (input[0] === 0xff && input[1] === 0xfe) text = new TextDecoder('utf-16le', { fatal: true }).decode(input);
  else if (input[0] === 0xfe && input[1] === 0xff) text = new TextDecoder('utf-16be', { fatal: true }).decode(input);
  else {
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(input); }
    catch { text = new TextDecoder('windows-1252', { fatal: true }).decode(input); }
  }
  if (/[\u0000\uFFFD]/u.test(text)) throw new BadRequestException('El CSV contiene texto ilegible. Guárdelo como CSV UTF-8 y vuelva a cargarlo.');
  return rundUnicodeText(text);
}

/** RFC 5987: the ASCII fallback and the full UTF-8 filename are separate parameters. */
export function rundContentDisposition(name: string, download: boolean): string {
  const normalized = rundUnicodeText(name).replace(/[\u0000-\u001F\u007F-\u009F]/gu, '') || 'documento.pdf';
  const ascii = normalized.replace(/[^a-zA-Z0-9._-]/g, '_');
  const encoded = encodeURIComponent(normalized).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${download ? 'attachment' : 'inline'}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
