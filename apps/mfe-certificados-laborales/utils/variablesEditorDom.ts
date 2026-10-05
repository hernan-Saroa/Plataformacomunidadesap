/**
 * Reglas del editor de plantillas sobre el DOM en vivo (ConfiguracionPlantilla):
 *
 * - Un token resaltado (`.variable-token`) solo existe mientras su texto sea
 *   exactamente una variable; si pierde un corchete o una letra se desmarca y
 *   queda como texto normal.
 * - Las variables tienen su propio color: la paleta colorea el texto, nunca las
 *   variables. Una variable que quedó dentro de un color se saca de él
 *   conservando su negrita, cursiva o subrayado.
 *
 * Los nodos de texto se mueven (no se recrean) para no perder el cursor.
 */
import { CODIGOS_VARIABLES_PLANTILLA } from './plantillaVariables';

const SELECTOR_TOKEN = '.variable-token';

/** Desmarca los tokens cuyo texto ya no es una variable conocida. Devuelve cuántos. */
export function desmarcarVariablesInvalidas(
  raiz: ParentNode,
  codigos: readonly string[] = CODIGOS_VARIABLES_PLANTILLA,
): number {
  const conocidas = new Set(codigos);
  let desmarcadas = 0;
  Array.from(raiz.querySelectorAll<HTMLElement>(SELECTOR_TOKEN)).forEach((token) => {
    if (conocidas.has((token.textContent || '').trim())) return;
    token.replaceWith(...Array.from(token.childNodes));
    desmarcadas += 1;
  });
  return desmarcadas;
}

// Solo se cruzan etiquetas en línea: una variable nunca sale de su párrafo.
const EN_LINEA = new Set(['FONT', 'SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'MARK', 'SUB', 'SUP']);
const FORMATO = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'SUB', 'SUP']);

const fijaColor = (elemento: Element) =>
  (elemento.tagName === 'FONT' && elemento.hasAttribute('color')) ||
  Boolean((elemento as HTMLElement).style?.color);

const ancestroConColor = (token: Element, editor: Element): HTMLElement | null => {
  let actual = token.parentElement;
  while (actual && actual !== editor) {
    if (!EN_LINEA.has(actual.tagName) || actual.matches(SELECTOR_TOKEN)) return null;
    if (fijaColor(actual)) return actual;
    actual = actual.parentElement;
  }
  return null;
};

/** Copia sin color de una etiqueta, solo si aporta formato (negrita, cursiva...). */
const copiaSinColor = (elemento: Element): HTMLElement | null => {
  const copia = elemento.cloneNode(false) as HTMLElement;
  copia.removeAttribute('color');
  copia.style.removeProperty('color');
  if (!copia.getAttribute('style')) copia.removeAttribute('style');
  if (FORMATO.has(copia.tagName) || copia.getAttribute('style')) return copia;
  return null;
};

const tieneContenido = (nodo: Node): boolean =>
  Boolean(nodo.textContent) ||
  (nodo.nodeType === 1 && Boolean((nodo as Element).querySelector(`br, ${SELECTOR_TOKEN}`)));

const quitarVacios = (raiz: Element) => {
  Array.from(raiz.querySelectorAll('*'))
    .reverse()
    .forEach((elemento) => {
      if (elemento.tagName !== 'BR' && !tieneContenido(elemento)) elemento.remove();
    });
};

const sacarDeAncestro = (token: HTMLElement, ancestro: HTMLElement) => {
  // Etiquetas entre el ancestro (incluido) y el token, de afuera hacia adentro.
  const cadena: Element[] = [];
  for (let actual = token.parentElement; actual; actual = actual.parentElement) {
    cadena.unshift(actual);
    if (actual === ancestro) break;
  }

  // Lo que sigue al token dentro del ancestro conserva el color.
  const despues = document.createRange();
  despues.setStartAfter(token);
  despues.setEnd(ancestro, ancestro.childNodes.length);
  const resto = ancestro.cloneNode(false) as HTMLElement;
  resto.appendChild(despues.extractContents());

  token.remove();
  let envuelto: Node = token;
  for (let i = cadena.length - 1; i >= 0; i -= 1) {
    const copia = copiaSinColor(cadena[i]);
    if (copia) {
      copia.appendChild(envuelto);
      envuelto = copia;
    }
  }

  ancestro.after(envuelto);
  quitarVacios(resto);
  if (tieneContenido(resto)) (envuelto as ChildNode).after(resto);
  quitarVacios(ancestro);
  if (!tieneContenido(ancestro)) ancestro.remove();
};

/**
 * Saca las variables indicadas de cualquier color que las envuelva dentro del
 * editor. Devuelve cuántas se movieron.
 */
export function sacarVariablesDelColor(editor: HTMLElement, tokens: Iterable<Element>): number {
  let movidas = 0;
  for (const token of Array.from(new Set(tokens))) {
    if (!(token instanceof HTMLElement) || !token.isConnected || !editor.contains(token)) continue;
    let ancestro = ancestroConColor(token, editor);
    let intentos = 0;
    let movida = false;
    while (ancestro && intentos < 20) {
      sacarDeAncestro(token, ancestro);
      movida = true;
      intentos += 1;
      ancestro = ancestroConColor(token, editor);
    }
    if (movida) movidas += 1;
  }
  return movidas;
}

const SELECTOR_BLOQUE_FUNCIONES = 'section[data-functions-template="true"]';
const textoNormalizado = (nodo: Node) => (nodo.textContent || '').replace(/\s+/g, ' ').trim();

/**
 * Después de pegar: si el navegador perdió el bloque de funciones, lo vuelve a
 * armar alrededor de los mismos párrafos que venían dentro de él (se buscan por
 * su texto exacto y consecutivo). No hace nada si ya hay un bloque con
 * contenido o si los párrafos no aparecen tal cual. Devuelve si lo rearmó.
 */
export function restaurarBloqueFunciones(editor: HTMLElement, textosBloque: string[]): boolean {
  const objetivo = textosBloque.map((texto) => texto.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (!objetivo.length) return false;

  const bloques = Array.from(editor.querySelectorAll<HTMLElement>(SELECTOR_BLOQUE_FUNCIONES));
  if (bloques.some((bloque) => textoNormalizado(bloque))) return false;

  const hijos = Array.from(editor.children);
  for (let inicio = 0; inicio + objetivo.length <= hijos.length; inicio += 1) {
    const coincide = objetivo.every((texto, i) => {
      const hijo = hijos[inicio + i];
      return hijo.tagName !== 'SECTION' && textoNormalizado(hijo) === texto;
    });
    if (!coincide) continue;

    // Restos vacíos de un bloque anterior: no aportan nada.
    bloques.forEach((bloque) => bloque.remove());
    const bloque = document.createElement('section');
    bloque.className = 'labor-functions-template-block';
    bloque.setAttribute('data-functions-template', 'true');
    hijos[inicio].before(bloque);
    for (let i = 0; i < objetivo.length; i += 1) bloque.appendChild(hijos[inicio + i]);
    return true;
  }
  return false;
}

/** Texto de cada párrafo del primer bloque de funciones (vacío si no hay). */
export function textosBloqueFunciones(raiz: ParentNode | string): string[] {
  let contenedor: ParentNode = raiz as ParentNode;
  if (typeof raiz === 'string') {
    const div = document.createElement('div');
    div.innerHTML = raiz;
    contenedor = div;
  }
  const bloque = contenedor.querySelector(SELECTOR_BLOQUE_FUNCIONES);
  if (!bloque) return [];
  const hijos = Array.from(bloque.children);
  return (hijos.length ? hijos : [bloque]).map(textoNormalizado).filter(Boolean);
}

/**
 * Prueba en una copia (sin tocar el editor) si alguno de los bloques
 * conocidos se puede rearmar en `html`. Devuelve el HTML rearmado o null.
 */
export function rearmarBloqueFuncionesEnHtml(html: string, candidatos: string[][]): string | null {
  const copia = document.createElement('div');
  copia.innerHTML = html;
  return candidatos.some((textos) => restaurarBloqueFunciones(copia, textos)) ? copia.innerHTML : null;
}

// Propiedades de texto que se heredan: si un elemento declara el mismo valor
// que ya tiene su contenedor, la declaración no cambia nada.
const HEREDADAS = [
  'font-family',
  'font-size',
  'line-height',
  'letter-spacing',
  'word-spacing',
  'white-space',
  'text-transform',
  'font-variant',
  'font-variant-ligatures',
  'font-variant-caps',
  'orphans',
  'widows',
  '-webkit-text-stroke-width',
];
// Fondos que no pintan nada.
const FONDO_NEUTRO = /^(transparent|none|initial|inherit|unset|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\))$/i;

/**
 * Quita los estilos en línea que el navegador agrega al editar (por ejemplo, al
 * borrar un párrafo Chrome deja `font-size`, `line-height`... iguales a los del
 * texto de alrededor). Solo se quita una declaración si no cambia nada: el
 * valor calculado es igual al del contenedor, o es un fondo vacío. Los tokens
 * de variable no se tocan. Devuelve cuántas declaraciones quitó.
 */
const normalizarValorCss = (valor: string) => valor.toLowerCase().replace(/["'\s]/g, '');

// Valor declarado más cercano hacia arriba (hasta el editor incluido).
const valorDeclaradoHeredado = (desde: HTMLElement, editor: HTMLElement, propiedad: string): string => {
  for (let actual: HTMLElement | null = desde; actual; actual = actual.parentElement) {
    const valor = actual.style.getPropertyValue(propiedad);
    if (valor) return valor;
    if (actual === editor) break;
  }
  return '';
};

export function quitarEstilosRedundantes(editor: HTMLElement): number {
  let quitadas = 0;
  Array.from(editor.querySelectorAll<HTMLElement>('[style]')).forEach((elemento) => {
    if (elemento.matches(SELECTOR_TOKEN)) return;
    const contenedor = elemento.parentElement;
    if (!contenedor) return;
    const propio = window.getComputedStyle(elemento);
    const heredado = window.getComputedStyle(contenedor);

    HEREDADAS.forEach((propiedad) => {
      const declarado = elemento.style.getPropertyValue(propiedad);
      if (!declarado) return;
      // Si el navegador calcula ambos valores (resuelve unidades: 12pt = 16px)
      // manda esa comparación, que es exacta. Solo si no puede calcularlos se
      // compara con el valor declarado más cercano hacia arriba.
      const calculado = propio.getPropertyValue(propiedad);
      const calculadoArriba = heredado.getPropertyValue(propiedad);
      const redundante = calculado && calculadoArriba
        ? calculado === calculadoArriba
        : normalizarValorCss(valorDeclaradoHeredado(contenedor, editor, propiedad)) === normalizarValorCss(declarado);
      if (redundante) {
        elemento.style.removeProperty(propiedad);
        quitadas += 1;
      }
    });
    ['background-color', 'background'].forEach((propiedad) => {
      const valor = elemento.style.getPropertyValue(propiedad).trim();
      if (valor && FONDO_NEUTRO.test(valor)) {
        elemento.style.removeProperty(propiedad);
        quitadas += 1;
      }
    });

    if (!(elemento.getAttribute('style') || '').trim()) elemento.removeAttribute('style');
  });
  return quitadas;
}

/** Tokens del editor que tocan un rango (selección). */
export function variablesEnRango(editor: HTMLElement, rango: Range | null): HTMLElement[] {
  if (!rango) return [];
  return Array.from(editor.querySelectorAll<HTMLElement>(SELECTOR_TOKEN)).filter((token) => {
    try {
      return rango.intersectsNode(token);
    } catch {
      return false;
    }
  });
}
