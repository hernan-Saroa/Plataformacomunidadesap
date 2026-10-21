/**
 * Limpieza del contenido que se pega en el editor de plantillas de
 * certificados laborales. Al copiar desde otra plantilla (u otro programa) el
 * navegador trae estilos en línea (fuente, tamaño, fondo amarillo de los
 * tokens, color negro), etiquetas de Word y el bloque de funciones completo.
 * Pegado tal cual, eso termina en el PDF. Aquí solo sobrevive lo que el editor
 * sabe producir: párrafos, saltos, negrita, cursiva, subrayado, color, tokens
 * de variable y un único bloque de funciones.
 */
import {
  estiloTieneDeclaracionesExternas,
  normalizarTokensVariablesEditor,
  prepararVariablesPlantilla,
  resolverVariablePlantilla,
} from './plantillaVariables';

export interface OpcionesPegadoPlantilla {
  crearToken: (codigo: string) => string;
  /** false si el editor ya tiene el bloque de funciones o el cursor está dentro de él. */
  permitirBloqueFunciones: boolean;
}

export interface ResultadoPegadoPlantilla {
  html: string;
  /** Se quitaron estilos o etiquetas externas. */
  limpiado: boolean;
  /** Se descartó un bloque de funciones para no duplicarlo. */
  bloqueFuncionesDescartado: boolean;
  /**
   * Texto de cada párrafo del bloque de funciones pegado (se haya conservado o
   * no). Permite rearmar el bloque si el navegador lo pierde al insertar.
   */
  textosBloqueFunciones: string[];
}

const BLOQUES = new Set([
  'P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE',
  'ARTICLE', 'HEADER', 'FOOTER', 'ASIDE', 'NAV', 'MAIN', 'TR', 'TD', 'TH',
  'DT', 'DD', 'FIGURE', 'FIGCAPTION', 'ADDRESS', 'SECTION',
]);

const DESCARTAR = new Set([
  'SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'HEAD', 'NOSCRIPT', 'TEMPLATE',
  'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'IMG', 'PICTURE', 'VIDEO', 'AUDIO',
  'CANVAS', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'FORM', 'HR',
]);

// Metadatos que el portapapeles siempre trae y que nunca llegan al contenido.
const SIN_AVISO = new Set(['META', 'LINK', 'TITLE', 'HEAD', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);

const escaparTexto = (texto: string) =>
  texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\u00a0/g, '&nbsp;');

const escaparAtributo = (valor: string) => escaparTexto(valor).replace(/"/g, '&quot;');

const leerEstilo = (elemento: Element, propiedad: string): string => {
  const estilo = elemento.getAttribute('style') || '';
  const coincidencia = estilo.match(new RegExp(`(?:^|;)\\s*${propiedad}\\s*:\\s*([^;]+)`, 'i'));
  return coincidencia ? coincidencia[1].trim().toLowerCase() : '';
};

const esNegrita = (peso: string) => peso === 'bold' || peso === 'bolder' || /^[6-9]00$/.test(peso);
const esPesoNormal = (peso: string) => peso === 'normal' || peso === 'lighter' || /^[1-5]00$/.test(peso);

// Negro o "color del sistema": es el color por defecto, se deja al de la plantilla.
const esColorPorDefecto = (color: string) =>
  !color ||
  /^(inherit|initial|unset|currentcolor|black|windowtext|#000|#000000)$/i.test(color) ||
  /^rgba?\(\s*0\s*,\s*0\s*,\s*0\s*(,\s*1(\.0+)?\s*)?\)$/i.test(color);

const colorSeguro = (color: string) =>
  /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]{3,20})$/i.test(color) ? color : '';

/** Texto normalizado de cada párrafo de un fragmento HTML. */
const textosDeParrafos = (html: string): string[] => {
  const cuerpo = new DOMParser().parseFromString(html, 'text/html').body;
  const bloques = Array.from(cuerpo.children);
  return (bloques.length ? bloques : [cuerpo])
    .map((bloque) => (bloque.textContent || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
};

export function limpiarHtmlPegadoPlantilla(
  htmlPegado: string,
  opciones: OpcionesPegadoPlantilla,
): ResultadoPegadoPlantilla {
  const documento = new DOMParser().parseFromString(htmlPegado || '', 'text/html');
  let limpiado = false;
  let bloqueFuncionesDescartado = false;
  let bloqueFuncionesUsado = !opciones.permitirBloqueFunciones;
  let textosBloqueFunciones: string[] = [];

  // Contexto que baja por el árbol: si se está dentro del bloque de funciones y
  // el color heredado (vacío = color de la plantilla).
  type Contexto = { dentroDeFunciones: boolean; color: string };

  const convertirHijos = (nodo: Node, contexto: Contexto): string =>
    Array.from(nodo.childNodes)
      .map((hijo) => convertir(hijo, contexto))
      .join('');

  const envolverBloque = (elemento: Element, contenido: string): string => {
    if (!contenido.replace(/&nbsp;|\s|<br>/g, '')) return '';
    // Un bloque que ya contiene párrafos no se vuelve a envolver (evita <p><p>).
    if (/<(p|section)\b/i.test(contenido)) return contenido;
    const alineacion = leerEstilo(elemento, 'text-align') || (elemento.getAttribute('align') || '').toLowerCase();
    const alineacionSegura = /^(left|right|center|justify)$/.test(alineacion) ? alineacion : '';
    return alineacionSegura
      ? `<p style="text-align: ${alineacionSegura};">${contenido}</p>`
      : `<p>${contenido}</p>`;
  };

  // El color se aplica al texto, nunca a las variables: tienen su propio color.
  const textoConColor = (texto: string, color: string): string => {
    if (!color) return escaparTexto(texto);
    return texto
      .split(/(\[[^[\]]{1,80}\])/)
      .map((parte) => {
        if (!parte) return '';
        if (resolverVariablePlantilla(parte) && /^\[[\s\S]*\]$/.test(parte)) return escaparTexto(parte);
        return `<span style="color: ${escaparAtributo(color)};">${escaparTexto(parte)}</span>`;
      })
      .join('');
  };

  // Color que hereda el contenido de un elemento: el suyo, el de la plantilla
  // si es negro/por defecto, o el del padre si no define ninguno.
  const colorDe = (elemento: Element, heredado: string): string => {
    const declarado = (leerEstilo(elemento, 'color') || (elemento.getAttribute('color') || '').trim());
    if (!declarado) return heredado;
    const seguro = colorSeguro(declarado);
    if (!seguro) return heredado;
    return esColorPorDefecto(seguro) ? '' : seguro;
  };

  const convertir = (nodo: Node, contexto: Contexto): string => {
    // Comentarios (StartFragment de Chrome, Word): se descartan sin avisar.
    if (nodo.nodeType === 3) return textoConColor(nodo.textContent || '', contexto.color);
    if (nodo.nodeType !== 1) return '';
    const elemento = nodo as Element;
    const etiqueta = elemento.tagName.toUpperCase();
    // Solo se avisa cuando se quita algo que habría cambiado el certificado.
    if (estiloTieneDeclaracionesExternas(elemento.getAttribute('style'))) limpiado = true;

    if (DESCARTAR.has(etiqueta)) {
      if (!SIN_AVISO.has(etiqueta)) limpiado = true;
      return '';
    }

    // Token de variable copiado del editor: se reconstruye limpio (sin color).
    if ((elemento.getAttribute('class') || '').includes('variable-token')) {
      const codigo = resolverVariablePlantilla(elemento.textContent || '');
      return codigo ? opciones.crearToken(codigo) : textoConColor(elemento.textContent || '', contexto.color);
    }

    if (etiqueta === 'BR') return '<br>';

    const contextoHijos: Contexto = { ...contexto, color: colorDe(elemento, contexto.color) };

    if (etiqueta === 'SECTION' && elemento.getAttribute('data-functions-template') === 'true') {
      if (!bloqueFuncionesUsado && !contexto.dentroDeFunciones) {
        bloqueFuncionesUsado = true;
        const interior = convertirHijos(elemento, { ...contextoHijos, dentroDeFunciones: true });
        if (!textosBloqueFunciones.length) textosBloqueFunciones = textosDeParrafos(interior);
        return `<section class="labor-functions-template-block" data-functions-template="true">${interior}</section>`;
      }
      bloqueFuncionesDescartado = true;
      const interior = convertirHijos(elemento, contextoHijos);
      if (!textosBloqueFunciones.length && !contexto.dentroDeFunciones) textosBloqueFunciones = textosDeParrafos(interior);
      return interior;
    }

    if (BLOQUES.has(etiqueta)) {
      return envolverBloque(elemento, convertirHijos(elemento, contextoHijos));
    }

    if (etiqueta === 'UL' || etiqueta === 'OL' || etiqueta === 'TABLE' || etiqueta === 'TBODY' || etiqueta === 'THEAD' || etiqueta === 'TFOOT') {
      return convertirHijos(elemento, contextoHijos);
    }

    // Formato en línea: negrita, cursiva y subrayado (el color ya va en el texto).
    const contenido = convertirHijos(elemento, contextoHijos);
    if (!contenido) return '';
    const peso = leerEstilo(elemento, 'font-weight');
    const estiloFuente = leerEstilo(elemento, 'font-style');
    const decoracion = leerEstilo(elemento, 'text-decoration') || leerEstilo(elemento, 'text-decoration-line');
    // <font face="..." size="..."> cambia la letra igual que un estilo.
    if (elemento.getAttribute('face') || elemento.getAttribute('size')) limpiado = true;

    const negrita = (etiqueta === 'B' || etiqueta === 'STRONG') ? !esPesoNormal(peso) : esNegrita(peso);
    const cursiva = etiqueta === 'I' || etiqueta === 'EM' || estiloFuente === 'italic' || estiloFuente === 'oblique';
    const subrayado = etiqueta === 'U' || decoracion.includes('underline');

    const aplicarFormato = (interior: string) => {
      let resultado = interior;
      if (subrayado) resultado = `<u>${resultado}</u>`;
      if (cursiva) resultado = `<em>${resultado}</em>`;
      if (negrita) resultado = `<b>${resultado}</b>`;
      return resultado;
    };
    // Si el formato envolvía párrafos completos (Word: <b><p>..</p><p>..</p></b>)
    // se aplica dentro de cada párrafo para no partir la etiqueta entre ellos.
    if (/<(p|section)\b/i.test(contenido)) {
      return contenido.replace(
        /(<p\b[^>]*>)([\s\S]*?)(<\/p>)/gi,
        (_parrafo, apertura: string, interior: string, cierre: string) => `${apertura}${aplicarFormato(interior)}${cierre}`,
      );
    }
    return aplicarFormato(contenido);
  };

  const cuerpo = documento.body ? convertirHijos(documento.body, { dentroDeFunciones: false, color: '' }) : '';
  const html = normalizarTokensVariablesEditor(prepararVariablesPlantilla(cuerpo), opciones.crearToken);
  return { html, limpiado, bloqueFuncionesDescartado, textosBloqueFunciones };
}

/** Texto plano pegado (Bloc de notas, correo): cada línea es un párrafo. */
export function textoPlanoAHtmlPlantilla(texto: string, crearToken: (codigo: string) => string): string {
  const lineas = String(texto || '').replace(/\r\n?/g, '\n').split('\n');
  const html = lineas.length > 1
    ? lineas.filter((linea) => linea.trim()).map((linea) => `<p>${escaparTexto(linea)}</p>`).join('')
    : escaparTexto(lineas[0] || '');
  return normalizarTokensVariablesEditor(prepararVariablesPlantilla(html), crearToken);
}
