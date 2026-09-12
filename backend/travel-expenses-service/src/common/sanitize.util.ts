/**
 * Utilidades de saneamiento y limpieza de datos para comisiones y archivos planos SIIF Nación.
 * Garantiza que la información transferida a SIIF esté libre de caracteres no permitidos,
 * tildes, eñes, saltos de línea y caracteres de control que provocan fallos o desplazamientos
 * en lectores de archivos planos.
 */

export function sanitizeObjetoComision(texto: string): string {
  if (!texto) return '';
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/gi, 'n')
    .replace(/[^a-zA-Z0-9\s\-]/g, '')
    .trim()
    .slice(0, 250);
}

/**
 * Normaliza y limpia cadenas de texto para el archivo plano SIIF:
 * - Remueve tildes y caracteres diacríticos
 * - Convierte eñes a 'n' / 'N'
 * - Elimina saltos de línea (\r, \n), retornos de carro y tabuladores
 * - Sustituye punto y coma (;) por coma (,) para evitar ruptura de columnas en CSV
 * - Elimina caracteres de control y símbolos no admitidos por SIIF
 * - Colapsa espacios en blanco repetidos y recorta extremos
 */
export function sanitizeTextoPlano(texto: string, maxLength = 250): string {
  if (!texto) return '';
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/;/g, ',')
    .replace(/[^a-zA-Z0-9\s\-.,_/]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Limpia números de documento (cédula de ciudadanía, NIT, pasaporte):
 * Remueve puntos, comas, espacios y guiones para formato numérico/alfanumérico limpio en SIIF.
 */
export function sanitizeDocumento(documento: string): string {
  if (!documento) return '';
  return documento.replace(/[^a-zA-Z0-9]/g, '').trim();
}

/**
 * Limpia nombres propios para SIIF:
 * Remueve tildes, convierte a mayúsculas limpias y elimina caracteres extraños.
 */
export function sanitizeNombre(nombre: string): string {
  if (!nombre) return '';
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'N')
    .replace(/Ñ/g, 'N')
    .replace(/[^a-zA-Z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Limpia y formatea montos numéricos para el archivo plano SIIF (2 decimales fijos, sin separador de miles).
 */
export function sanitizeMontoPlano(monto: number | string | undefined | null): string {
  const num = Number(monto || 0);
  return (isNaN(num) ? 0 : num).toFixed(2);
}

/**
 * Limpia fechas al formato estricto YYYY-MM-DD para SIIF.
 */
export function sanitizeFechaPlano(fecha: Date | string | undefined | null): string {
  if (!fecha) return '';
  try {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}
