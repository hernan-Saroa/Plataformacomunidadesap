/** Same CSV decoding contract as the RUND backend; XLS/XLSX remain binary workbooks. */
export function decodeRundCsv(input: Uint8Array): string {
  let text: string;
  if (input[0] === 0xff && input[1] === 0xfe) text = new TextDecoder('utf-16le', { fatal: true }).decode(input);
  else if (input[0] === 0xfe && input[1] === 0xff) text = new TextDecoder('utf-16be', { fatal: true }).decode(input);
  else {
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(input); }
    catch { text = new TextDecoder('windows-1252', { fatal: true }).decode(input); }
  }
  if (/[\u0000\uFFFD]/u.test(text)) throw new Error('El CSV contiene texto ilegible. Guárdelo como CSV UTF-8 y vuelva a cargarlo.');
  return text.normalize('NFC');
}
