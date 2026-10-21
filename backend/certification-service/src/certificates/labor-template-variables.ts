/**
 * Variables de las plantillas de certificados laborales (docente y
 * administrador). El contenido sale de un editor HTML, así que una variable
 * puede quedar partida por etiquetas ("[CAR<b>GO</b>]") o escrita en
 * minúsculas/con espacios ("[ cargo ]"). Estas utilidades la dejan en su forma
 * oficial para reemplazarla, sin cambiar el texto ni los espacios: una variable
 * pegada a una palabra o a otra variable se reemplaza igual y queda tal cual la
 * escribió quien armó la plantilla.
 *
 * Misma regla que `apps/mfe-certificados-laborales/utils/plantillaVariables.ts`
 * (vista previa del frontend): si una cambia, cambiar la otra.
 */

export const LABOR_TEMPLATE_VARIABLE_CODES: readonly string[] = [
  '[DATO1]',
  '[DATO2]',
  '[DATO3]',
  '[DATO4]',
  '[DATO5]',
  '[DATO6]',
  '[DATO7]',
  '[DATO8]',
  '[NOMBRE_EMPLEADO]',
  '[TIPO_DOCUMENTO]',
  '[TIPO_DOCUMENTO_CORTO]',
  '[DOCUMENTO]',
  '[CARGO]',
  '[CARGO DATO6]',
  '[TIPO_DATO]',
  '[GRUPO]',
  '[SEDE]',
  '[UBICACIÓN]',
  '[UBICACION]',
  '[DEPENDENCIA]',
  '[DEPENDENCIA_PADRE]',
  '[FECHA_INICIO]',
  '[FECHA_FIN]',
  '[SALARIO]',
  '[SALARIO_LETRAS]',
  '[FECHA_EXPEDICION_COMPLETA]',
  '[CIUDAD_EXPEDICION]',
  '[FUNCIONES]',
];

const stripAccents = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const lookupKey = (inner: string) =>
  stripAccents(
    inner
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;|&#160;|\u00a0/gi, ' '),
  )
    .trim()
    .replace(/[\s_]+/g, '_')
    .toUpperCase();

/**
 * Convierte cada variable reconocible a su forma oficial. Las etiquetas que
 * quedaron dentro de los corchetes se conservan justo después de la variable
 * para no desbalancear el HTML. Lo que no es una variable conocida no se toca.
 */
export function canonicalizeTemplateVariables(
  html: string,
  codes: readonly string[] = LABOR_TEMPLATE_VARIABLE_CODES,
): string {
  if (!html || !html.includes('[')) return html || '';
  const lookup = new Map(codes.map((code) => [lookupKey(code.slice(1, -1)), code]));
  return html.replace(/\[((?:[^[\]<>]|<[^>]*>){1,200})\]/g, (match, inner: string) => {
    const canonical = lookup.get(lookupKey(inner));
    if (!canonical) return match;
    const innerTags = (inner.match(/<[^>]*>/g) || []).join('');
    return `${canonical}${innerTags}`;
  });
}

export function prepareTemplateVariables(
  html: string,
  codes: readonly string[] = LABOR_TEMPLATE_VARIABLE_CODES,
): string {
  return canonicalizeTemplateVariables(html, codes);
}
