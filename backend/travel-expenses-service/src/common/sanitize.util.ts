export function sanitizeObjetoComision(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/gi, 'n')
    .replace(/[^a-zA-Z0-9\s\-]/g, '')
    .trim()
    .slice(0, 250);
}
