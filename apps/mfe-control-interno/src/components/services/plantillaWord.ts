/**
 * Llena una plantilla Word (.docx) con datos del sistema (EFDS-2455).
 *
 * La plantilla es una copia del formato oficial donde cada dato es una etiqueta en
 * un run propio: `{campo}`. Los bloques que se repiten van entre párrafos marcadores
 * `{#lista}` … `{/lista}`; una fila de tabla que se repite lleva `{@lista}` en su
 * primera celda y `{/lista}` en la última. Fuentes y estilos quedan los del formato.
 */
import JSZip from 'jszip';

/** Texto que el auditor debe completar en Word. Sale resaltado en amarillo. */
export const MARCA_AUDITOR = '[Por diligenciar por el auditor]';

/** Un texto que se deja resaltado para que el auditor lo complete o lo revise. */
export type TextoResaltado = { texto: string; resaltar: true };
export type ValorPlantilla = string | number | TextoResaltado | null | undefined;
export interface DatosPlantilla {
  [campo: string]: ValorPlantilla | DatosPlantilla[];
}

export const resaltado = (texto: string): TextoResaltado => ({ texto, resaltar: true });

const ETIQUETA = /<w:r>(?:<w:rPr>((?:(?!<\/w:rPr>).)*)<\/w:rPr>)?<w:t>\{([#@/]?)(\w+)\}<\/w:t><\/w:r>/g;

// Orden del esquema de rPr: el resaltado va antes de estos elementos (Word es estricto)
const DESPUES_DE_RESALTADO = ['<w:u ', '<w:effect', '<w:bdr', '<w:shd', '<w:fitText', '<w:vertAlign', '<w:rtl', '<w:cs/', '<w:em ', '<w:lang', '<w:eastAsianLayout', '<w:specVanish', '<w:oMath'];

function conResaltado(rPr: string): string {
  const posiciones = DESPUES_DE_RESALTADO.map((t) => rPr.indexOf(t)).filter((p) => p >= 0);
  const p = posiciones.length ? Math.min(...posiciones) : rPr.length;
  return `${rPr.slice(0, p)}<w:highlight w:val="yellow"/>${rPr.slice(p)}`;
}

function escaparXml(texto: string): string {
  return texto
    // Caracteres de control que el XML no admite (pegados desde otros sistemas)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Runs de un valor: los saltos de línea van como <w:br/> y la marca del auditor resaltada. */
function runsDelValor(valor: ValorPlantilla | DatosPlantilla[], rPr: string): string {
  if (valor === null || valor === undefined || Array.isArray(valor)) return '';
  const segmentos: { texto: string; resaltar: boolean }[] = [];
  if (typeof valor === 'object') {
    segmentos.push({ texto: valor.texto, resaltar: true });
  } else {
    String(valor)
      .split(MARCA_AUDITOR)
      .forEach((parte, i) => {
        if (i > 0) segmentos.push({ texto: MARCA_AUDITOR, resaltar: true });
        if (parte) segmentos.push({ texto: parte, resaltar: false });
      });
  }
  return segmentos
    .map(({ texto, resaltar }) => {
      const props = resaltar ? conResaltado(rPr) : rPr;
      const lineas = texto.split(/\r?\n/).map((l) => `<w:t xml:space="preserve">${escaparXml(l)}</w:t>`);
      return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}${lineas.join('<w:br/>')}</w:r>`;
    })
    .join('');
}

/** Inicio del elemento `<w:p>`/`<w:tr>` que contiene la posición (sin confundirlo con w:pPr/w:trPr). */
function inicioDelElemento(xml: string, pos: number, nombre: 'w:p' | 'w:tr'): number {
  let i = pos;
  for (;;) {
    i = xml.lastIndexOf(`<${nombre}`, i - 1);
    if (i < 0) throw new Error(`Plantilla Word: no se encontró <${nombre}> antes de la posición ${pos}`);
    const siguiente = xml.charAt(i + nombre.length + 1);
    if (siguiente === ' ' || siguiente === '>') return i;
  }
}

function finDelElemento(xml: string, pos: number, nombre: 'w:p' | 'w:tr'): number {
  const cierre = `</${nombre}>`;
  const i = xml.indexOf(cierre, pos);
  if (i < 0) throw new Error(`Plantilla Word: no se encontró ${cierre} después de la posición ${pos}`);
  return i + cierre.length;
}

function listaDe(datos: DatosPlantilla, campo: string): DatosPlantilla[] {
  const valor = datos[campo];
  return Array.isArray(valor) ? valor : [];
}

/**
 * Recorre la plantilla de izquierda a derecha una sola vez. Lo que se inserta no se
 * vuelve a leer, así un texto del auditor con llaves no se toma por etiqueta.
 */
function renderizar(xml: string, datos: DatosPlantilla): string {
  let salida = '';
  let pos = 0;
  const re = new RegExp(ETIQUETA.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const [run, rPr = '', tipo, campo] = m;
    if (tipo === '') {
      salida += xml.slice(pos, m.index) + runsDelValor(datos[campo], rPr);
      pos = m.index + run.length;
      continue;
    }
    if (tipo === '/') throw new Error(`Plantilla Word: cierre {/${campo}} sin apertura`);

    const cierre = xml.indexOf(`<w:t>{/${campo}}</w:t>`, re.lastIndex);
    if (cierre < 0) throw new Error(`Plantilla Word: falta {/${campo}}`);
    const elemento = tipo === '#' ? 'w:p' : 'w:tr';
    const inicio = inicioDelElemento(xml, m.index, elemento);
    const finBloque = finDelElemento(xml, cierre, elemento);
    let plantillaItem: string;
    if (tipo === '#') {
      // Bloque entre dos párrafos marcadores: los marcadores no quedan en el informe
      plantillaItem = xml.slice(finDelElemento(xml, m.index, 'w:p'), inicioDelElemento(xml, cierre, 'w:p'));
    } else {
      // Fila de tabla: se repite la fila sin los marcadores
      plantillaItem = xml
        .slice(inicio, finBloque)
        .replace(run, '')
        .replace(`<w:r><w:t>{/${campo}}</w:t></w:r>`, '');
    }
    salida += xml.slice(pos, inicio);
    for (const item of listaDe(datos, campo)) {
      salida += renderizar(plantillaItem, { ...datos, ...item });
    }
    pos = finBloque;
    re.lastIndex = finBloque;
  }
  return salida + xml.slice(pos);
}

/** Abre la plantilla, pone los datos en word/document.xml y devuelve el .docx. */
export async function rellenarPlantillaWord(plantilla: ArrayBuffer, datos: DatosPlantilla): Promise<Blob> {
  const zip = await JSZip.loadAsync(plantilla);
  const archivo = zip.file('word/document.xml');
  if (!archivo) throw new Error('La plantilla no es un documento Word válido');
  const documento = await archivo.async('string');
  zip.file('word/document.xml', renderizar(documento, datos));
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });
}
