import { load, loadBuffer } from 'cheerio';

export function loadHtml(bytes: Buffer, contentType = '') {
  const charset = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType)?.[1];
  if (charset) {
    try { return load(new TextDecoder(charset).decode(bytes)); } catch { /* detectar por el HTML */ }
  }
  return loadBuffer(bytes);
}
