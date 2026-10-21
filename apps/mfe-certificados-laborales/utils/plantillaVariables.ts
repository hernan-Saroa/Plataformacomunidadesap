/**
 * Variables de las plantillas de certificados laborales (docente y
 * administrador). El contenido sale de un editor HTML, así que una variable
 * puede quedar partida por etiquetas ("[CAR<b>GO</b>]") o escrita en
 * minúsculas/con espacios ("[ cargo ]"). Se lleva a su forma oficial sin tocar
 * el texto ni los espacios: una variable pegada a una palabra o a otra
 * variable se reemplaza igual y queda tal cual se escribió (solo se avisa).
 *
 * Misma regla que `backend/certification-service/src/certificates/labor-template-variables.ts`
 * (PDF oficial): si una cambia, cambiar la otra.
 */

export const CODIGOS_VARIABLES_PLANTILLA: readonly string[] = [
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

// Variables que ocupan su propio párrafo: nunca se avisan como pegadas.
const VARIABLES_BLOQUE = new Set(['[FUNCIONES]']);

const quitarTildes = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const claveVariable = (interior: string) =>
  quitarTildes(
    interior
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;|&#160;|\u00a0/gi, ' '),
  )
    .trim()
    .replace(/[\s_]+/g, '_')
    .toUpperCase();

const crearBuscador = (codigos: readonly string[]) =>
  new Map(codigos.map((codigo) => [claveVariable(codigo.slice(1, -1)), codigo]));

/** Devuelve la variable oficial que representa `texto` (con o sin corchetes), o null. */
export function resolverVariablePlantilla(
  texto: string,
  codigos: readonly string[] = CODIGOS_VARIABLES_PLANTILLA,
): string | null {
  const limpio = String(texto || '').trim();
  const interior = /^\[[\s\S]*\]$/.test(limpio) ? limpio.slice(1, -1) : limpio;
  if (!interior) return null;
  return crearBuscador(codigos).get(claveVariable(interior)) || null;
}

/**
 * Convierte cada variable reconocible a su forma oficial. Las etiquetas que
 * quedaron dentro de los corchetes se conservan justo después de la variable
 * para no desbalancear el HTML. Lo que no es una variable conocida no se toca.
 */
export function canonicalizarVariablesPlantilla(
  html: string,
  codigos: readonly string[] = CODIGOS_VARIABLES_PLANTILLA,
): string {
  if (!html || !html.includes('[')) return html || '';
  const buscador = crearBuscador(codigos);
  return html.replace(/\[((?:[^[\]<>]|<[^>]*>){1,200})\]/g, (coincidencia, interior: string) => {
    const oficial = buscador.get(claveVariable(interior));
    if (!oficial) return coincidencia;
    const etiquetasInternas = (interior.match(/<[^>]*>/g) || []).join('');
    return `${oficial}${etiquetasInternas}`;
  });
}

/** Deja las variables en su forma oficial. No agrega ni quita espacios. */
export function prepararVariablesPlantilla(
  html: string,
  codigos: readonly string[] = CODIGOS_VARIABLES_PLANTILLA,
): string {
  return canonicalizarVariablesPlantilla(html, codigos);
}

// Clase de variable que acepta el editor: mayúsculas, números, guion bajo y
// tildes, con espacios simples ("[CARGO DATO6]").
const NOMBRE_TOKEN_EDITOR = '[A-Z0-9_ÁÉÍÓÚÑÜ]+(?: [A-Z0-9_ÁÉÍÓÚÑÜ]+)*';

/**
 * Deja las variables del editor como tokens resaltados (span `variable-token`).
 * Lo usa ConfiguracionPlantilla en cada edición, al cargar y al guardar.
 *
 * - Colapsa un token que solo envuelve a otro token (lo produce el resaltado al
 *   cargar una plantilla que ya tenía tokens). Nunca quita spans con formato
 *   (color, negrita): solo spans de variable.
 * - Normaliza cada token a su HTML estándar.
 * - Resalta las variables conocidas escritas a mano que no están dentro de un
 *   span. Sin lookbehind para no romper navegadores anteriores (Safari < 16.4).
 * - Quita spans vacíos.
 */
export function normalizarTokensVariablesEditor(
  html: string,
  crearToken: (codigo: string) => string,
  codigos: readonly string[] = CODIGOS_VARIABLES_PLANTILLA,
): string {
  if (!html) return html;

  let resultado = html;
  // Renombra token legado para mostrar solo [DEPENDENCIA] en la configuracion.
  resultado = resultado.replace(/\[UBICACI[^\]]*N\]/gi, '[DEPENDENCIA]');

  // Paso 1: colapsar tokens de variable anidados (hasta 15 niveles).
  const tokenAnidado =
    /<span[^>]*class="[^"]*variable-token[^"]*"[^>]*>\s*(<span[^>]*class="[^"]*variable-token[^"]*"[^>]*>[^<]*<\/span>)\s*<\/span>/g;
  for (let i = 0; i < 15; i++) {
    const anterior = resultado;
    resultado = resultado.replace(tokenAnidado, '$1');
    if (resultado === anterior) break;
  }

  // Paso 2: normalizar cada token. Solo conserva el resaltado si su texto es
  // exactamente una variable conocida; si se le borró un corchete o una letra
  // ("[CARGO", "[CARG]") vuelve a ser texto normal, sin perder lo escrito.
  const conocidas = new Set(codigos);
  resultado = resultado.replace(
    /<span[^>]*class="[^"]*variable-token[^"]*"[^>]*>([^<]*)<\/span>/g,
    (_token, contenido: string) => {
      const inicio = (contenido.match(/^(?:\s|&nbsp;)*/) || [''])[0];
      const fin = (contenido.slice(inicio.length).match(/(?:\s|&nbsp;)*$/) || [''])[0];
      const variable = contenido.slice(inicio.length, contenido.length - fin.length);
      return conocidas.has(variable) ? `${inicio}${crearToken(variable)}${fin}` : contenido;
    },
  );

  // Paso 3: resaltar variables conocidas sueltas (fuera de cualquier span). La
  // apertura de span opcional reemplaza al lookbehind: si la variable va justo
  // después de un <span>, ya está dentro de uno y se deja igual.
  resultado = resultado.replace(
    new RegExp(`(<span\\b[^>]*>)?\\[(${NOMBRE_TOKEN_EDITOR})\\](?![^<]*<\\/span>)`, 'g'),
    (coincidencia, aperturaSpan: string | undefined, nombre: string) => {
      const codigo = `[${nombre}]`;
      if (aperturaSpan || !conocidas.has(codigo)) return coincidencia;
      return crearToken(codigo);
    },
  );

  // Paso 4: limpiar spans vacíos.
  resultado = resultado.replace(/<span[^>]*>\s*<\/span>/g, '');

  return resultado;
}

export type ProblemaVariablePlantilla =
  | { tipo: 'pegada'; variable: string; contexto: string }
  | { tipo: 'normalizada'; texto: string; variable: string }
  | { tipo: 'desconocida'; texto: string }
  | { tipo: 'incompleta'; texto: string; variable: string }
  | { tipo: 'estilosExternos' }
  | { tipo: 'funciones'; detalle: 'duplicada' | 'bloqueDuplicado' | 'fueraDelBloque' }
  | { tipo: 'datoReal'; texto: string }
  | { tipo: 'faltaVariable'; variable: string };

// Estilos que el editor nunca produce: llegan al copiar y pegar (fuente,
// tamaño, fondo amarillo de los tokens, Word) y cambian el aspecto del PDF.
const PROPIEDAD_EXTERNA =
  /^(font-family|font-size|line-height|background|background-color|background-image|letter-spacing|word-spacing|white-space|font-variant[\w-]*|text-transform|orphans|widows|mso-[\w-]+|-webkit-[\w-]+)$/i;

const ETIQUETAS_EXTERNAS = /<!--|<\/?o:p\b|<(meta|link|style|script|title)\b/i;

// Valores que no cambian nada respecto al texto de alrededor (el propio token
// del editor usa "inherit"; el navegador agrega "normal", "0px"...).
const VALOR_NEUTRO = /^(inherit|initial|unset|normal|none|auto|transparent|0|0px|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\))(\s*!important)?$/i;

const declaracionEsExterna = (declaracion: string) => {
  const separador = declaracion.indexOf(':');
  if (separador < 0) return false;
  const propiedad = declaracion.slice(0, separador).trim();
  const valor = declaracion.slice(separador + 1).trim().toLowerCase();
  return PROPIEDAD_EXTERNA.test(propiedad) && !VALOR_NEUTRO.test(valor);
};

/** true si un atributo `style` trae estilos que el editor nunca produce. */
export function estiloTieneDeclaracionesExternas(estilo: string | null | undefined): boolean {
  return String(estilo || '').split(';').some(declaracionEsExterna);
}

export function tieneEstilosExternosPlantilla(html: string): boolean {
  const contenido = String(html || '');
  if (ETIQUETAS_EXTERNAS.test(contenido)) return true;
  const estilos = /\sstyle="([^"]*)"/gi;
  let encontrado: RegExpExecArray | null;
  while ((encontrado = estilos.exec(contenido))) {
    if (encontrado[1].split(';').some(declaracionEsExterna)) return true;
  }
  return false;
}

/**
 * Quita los estilos y etiquetas que llegan al pegar desde otra plantilla u otro
 * programa. Conserva negrita, cursiva, subrayado, color, alineación y el HTML
 * de los tokens; los atributos `style` que no cambian se dejan idénticos.
 */
export function limpiarEstilosExternosPlantilla(html: string): string {
  if (!html) return html;
  let resultado = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(style|script|title)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(meta|link)\b[^>]*>/gi, '')
    .replace(/<\/?o:p\b[^>]*>/gi, '');
  resultado = resultado.replace(/\sstyle="([^"]*)"/gi, (atributo, estilo: string) => {
    const declaraciones = estilo.split(';').map((parte) => parte.trim()).filter(Boolean);
    const conservadas = declaraciones.filter((declaracion) => !declaracionEsExterna(declaracion));
    if (conservadas.length === declaraciones.length) return atributo;
    return conservadas.length ? ` style="${conservadas.join('; ')};"` : '';
  });
  return resultado;
}

const MESES = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre';

// Datos de una persona que quedan en la plantilla cuando se copia desde un
// certificado ya generado en vez de desde otra plantilla.
const buscarDatosReales = (texto: string): string[] => {
  const encontrados: string[] = [];
  const patrones = [
    /\$\s?\d{1,3}(?:[.,]\d{3})+(?:,\d{1,2})?/g, // $1.000.000
    new RegExp(`\\b\\d{1,2}\\s+de\\s+(?:${MESES})\\s+de\\s+\\d{4}\\b`, 'gi'), // 2 de octubre de 2026
    /(?:^|[^\d.,$])(\d{7,11}|\d{1,3}(?:\.\d{3}){2,3})(?![\d.,]*\d)/g, // 53062883 o 53.062.883
  ];
  for (const patron of patrones) {
    let encontrado: RegExpExecArray | null;
    while ((encontrado = patron.exec(texto))) {
      encontrados.push((encontrado[1] || encontrado[0]).trim());
    }
  }
  return encontrados;
};

const htmlATexto = (html: string) =>
  String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(?:p|div|li|ul|ol|section|article|blockquote|h[1-6]|table|tr|td)\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&#160;|\u00a0/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

// Unidades de texto que nunca se cortan: una variable completa, espacios, una
// palabra o un corchete suelto.
const UNIDADES_TEXTO = /\[[^[\]\n]{1,80}\]|\s+|[^\s[]+|\[/g;

/**
 * Contexto para el aviso de una variable pegada: solo el tramo pegado a ella
 * (hasta el primer espacio a cada lado), sin cortar nunca una variable.
 */
const contextoPegada = (texto: string, inicio: number, fin: number): string => {
  const tomar = (unidades: string[]) => {
    const tomadas: string[] = [];
    for (const unidad of unidades) {
      if (/^\s+$/.test(unidad)) break;
      tomadas.push(unidad);
    }
    return tomadas;
  };
  const antes = tomar((texto.slice(0, inicio).match(UNIDADES_TEXTO) || []).reverse()).reverse();
  const despues = tomar(texto.slice(fin).match(UNIDADES_TEXTO) || []);
  return `${antes.join('')}${texto.slice(inicio, fin)}${despues.join('')}`.replace(/\s+/g, ' ').trim();
};

const PALABRA_VARIABLE = /^[\p{L}\p{N}_ ]{2,40}$/u;

/**
 * Revisa la plantilla y devuelve lo que conviene mostrar al editor. Nada de
 * esto bloquea: las variables pegadas o mal escritas se corrigen solas al
 * generar el certificado; las desconocidas o incompletas saldrían tal cual.
 */
export function analizarVariablesPlantilla(
  html: string,
  codigos: readonly string[] = CODIGOS_VARIABLES_PLANTILLA,
): ProblemaVariablePlantilla[] {
  const texto = htmlATexto(html);
  if (!texto.trim()) return [];
  const buscador = crearBuscador(codigos);
  const problemas: ProblemaVariablePlantilla[] = [];
  const vistos = new Set<string>();
  const agregar = (problema: ProblemaVariablePlantilla) => {
    const clave = JSON.stringify(problema);
    if (vistos.has(clave)) return;
    vistos.add(clave);
    problemas.push(problema);
  };
  const variablesUsadas = new Map<string, number>();

  // Contenido pegado desde otra plantilla o programa.
  if (tieneEstilosExternosPlantilla(html)) agregar({ tipo: 'estilosExternos' });
  for (const dato of buscarDatosReales(texto)) agregar({ tipo: 'datoReal', texto: dato });

  const token = /\[([^[\]\n]{1,80})\]/g;
  let encontrado: RegExpExecArray | null;
  while ((encontrado = token.exec(texto))) {
    const original = encontrado[0];
    const oficial = buscador.get(claveVariable(encontrado[1]));
    if (oficial) variablesUsadas.set(oficial, (variablesUsadas.get(oficial) || 0) + 1);
    if (!oficial) {
      // "[NOMBRE_EMPLEADO identificado ... DOCUMENTO]": a una variable le falta
      // el cierre y a otra la apertura, y el texto quedó entre ambos corchetes.
      const palabras = encontrado[1].trim().split(/[\s,.;:]+/).filter(Boolean);
      const primera = palabras.length > 1 ? buscador.get(claveVariable(palabras[0])) : undefined;
      const ultima = palabras.length > 1 ? buscador.get(claveVariable(palabras[palabras.length - 1])) : undefined;
      if (primera) agregar({ tipo: 'incompleta', texto: `[${palabras[0]}`, variable: primera });
      if (ultima) agregar({ tipo: 'incompleta', texto: `${palabras[palabras.length - 1]}]`, variable: ultima });
      if (!primera && !ultima && PALABRA_VARIABLE.test(encontrado[1].trim())) {
        agregar({ tipo: 'desconocida', texto: original });
      }
      continue;
    }
    if (original !== oficial) {
      agregar({ tipo: 'normalizada', texto: original, variable: oficial });
    }
    if (VARIABLES_BLOQUE.has(oficial)) continue;

    const inicio = encontrado.index;
    const fin = inicio + original.length;
    const anterior = texto.charAt(inicio - 1);
    const siguiente = texto.charAt(fin);
    const siguienteEsVariable =
      siguiente === '[' && Boolean(buscador.get(claveVariable((texto.slice(fin + 1).match(/^[^[\]\n]{1,80}(?=\])/) || [''])[0])));
    if (/[\p{L}\p{N})]/u.test(anterior) || /[\p{L}\p{N}]/u.test(siguiente) || siguienteEsVariable) {
      agregar({ tipo: 'pegada', variable: oficial, contexto: contextoPegada(texto, inicio, fin) });
    }
  }

  // Corchetes sin pareja alrededor de un nombre de variable: "[CARGO" o "CARGO]".
  const sinTokens = texto.replace(/\[[^[\]\n]{1,80}\]/g, ' ');
  const abiertas = /\[\s*([\p{L}\p{N}_]+(?: [\p{L}\p{N}_]+)?)/gu;
  while ((encontrado = abiertas.exec(sinTokens))) {
    const palabras = encontrado[1];
    const oficial = buscador.get(claveVariable(palabras)) || buscador.get(claveVariable(palabras.split(' ')[0]));
    if (oficial) agregar({ tipo: 'incompleta', texto: `[${palabras.split(' ')[0]}`, variable: oficial });
  }
  const cerradas = /([\p{L}\p{N}_]+)\s*\]/gu;
  while ((encontrado = cerradas.exec(sinTokens))) {
    const oficial = buscador.get(claveVariable(encontrado[1]));
    if (oficial) agregar({ tipo: 'incompleta', texto: `${encontrado[1]}]`, variable: oficial });
  }

  // Bloque de funciones: al pegar una plantilla completa sobre otra se duplica
  // o se pierde el marco que lo oculta cuando el certificado no pide funciones.
  const bloquesFunciones = (String(html).match(/<section\b[^>]*data-functions-template=["']true["']/gi) || []).length;
  const usosFunciones = variablesUsadas.get('[FUNCIONES]') || 0;
  if (usosFunciones > 1) agregar({ tipo: 'funciones', detalle: 'duplicada' });
  if (bloquesFunciones > 1) agregar({ tipo: 'funciones', detalle: 'bloqueDuplicado' });
  if (usosFunciones > 0) {
    const sinBloques = String(html).replace(
      /<section\b(?=[^>]*data-functions-template=["']true["'])[^>]*>[\s\S]*?<\/section>/gi,
      '',
    );
    if (/\[\s*funciones\s*\]/i.test(htmlATexto(sinBloques))) {
      agregar({ tipo: 'funciones', detalle: 'fueraDelBloque' });
    }
  }

  // Sin nombre ni documento, todos los certificados dirían lo mismo (típico al
  // pegar el texto de un certificado ya generado).
  const usa = (...alternativas: string[]) => alternativas.some((codigo) => variablesUsadas.has(codigo));
  if (!usa('[NOMBRE_EMPLEADO]', '[DATO1]')) agregar({ tipo: 'faltaVariable', variable: '[NOMBRE_EMPLEADO]' });
  if (!usa('[DOCUMENTO]', '[DATO2]')) agregar({ tipo: 'faltaVariable', variable: '[DOCUMENTO]' });

  return problemas;
}
