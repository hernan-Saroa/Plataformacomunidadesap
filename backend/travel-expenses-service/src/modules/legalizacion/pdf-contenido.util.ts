/**
 * EFDS-1309 — Un PDF se reconoce por su contenido, no por su nombre.
 *
 * La extensión y el Content-Type los decide quien sube el archivo: un .exe
 * renombrado a .pdf los pasa. La cabecera `%PDF-` en los primeros bytes la exige
 * el formato (ISO 32000-1, §7.5.2) y es lo que leen los visores.
 */
const CABECERA_PDF = Buffer.from('%PDF-', 'latin1');

export function esPdfPorContenido(contenido: Buffer | null | undefined): boolean {
  if (!contenido || contenido.length < CABECERA_PDF.length) return false;
  return contenido.subarray(0, CABECERA_PDF.length).equals(CABECERA_PDF);
}
