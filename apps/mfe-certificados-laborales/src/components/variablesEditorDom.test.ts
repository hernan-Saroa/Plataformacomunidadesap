import { describe, expect, it } from 'vitest';
import {
  desmarcarVariablesInvalidas,
  quitarEstilosRedundantes,
  sacarVariablesDelColor,
  rearmarBloqueFuncionesEnHtml,
  restaurarBloqueFunciones,
  textosBloqueFunciones,
  variablesEnRango,
} from '../../utils/variablesEditorDom';

// Copia exacta de crearVariableTokenHtml de ConfiguracionPlantilla.tsx.
const estiloToken = 'font-weight: inherit; display: inline; padding: 0px 2px; font-size: inherit; line-height: inherit; border-radius: 2px; margin: 0;';
const token = (codigo: string) =>
  `<span class="variable-token bg-yellow-200 text-black" style="${estiloToken}" contenteditable="false">${codigo}</span>`;

const editorCon = (html: string) => {
  const editor = document.createElement('div');
  editor.innerHTML = html;
  document.body.appendChild(editor);
  return editor;
};

describe('desmarcarVariablesInvalidas', () => {
  it.each(['[CARGO', 'CARGO]', '[CARG]', '[CARGO ]x', '[cargo]', ''])('quita el resaltado de "%s" y conserva el texto', (texto) => {
    const editor = editorCon(`<p>de ${token(texto)} fin</p>`);
    expect(desmarcarVariablesInvalidas(editor)).toBe(1);
    expect(editor.querySelector('.variable-token')).toBeNull();
    expect(editor.textContent).toBe(`de ${texto} fin`);
  });

  it('no toca las variables válidas', () => {
    const html = `<p>Que ${token('[NOMBRE_EMPLEADO]')} con <b>${token('[DOCUMENTO]')}</b> ${token('[CARGO DATO6]')}</p>`;
    const editor = editorCon(html);
    expect(desmarcarVariablesInvalidas(editor)).toBe(0);
    expect(editor.innerHTML).toBe(html);
  });

  it('conserva el mismo nodo de texto (el cursor no salta)', () => {
    const editor = editorCon(`<p>${token('[CARGO')}</p>`);
    const nodoTexto = editor.querySelector('.variable-token')!.firstChild!;
    desmarcarVariablesInvalidas(editor);
    expect(nodoTexto.isConnected).toBe(true);
    expect(nodoTexto.parentElement!.tagName).toBe('P');
  });
});

describe('sacarVariablesDelColor', () => {
  const sacarTodas = (editor: HTMLElement) =>
    sacarVariablesDelColor(editor, Array.from(editor.querySelectorAll('.variable-token')));

  it('saca la variable del color y deja el texto coloreado alrededor', () => {
    const editor = editorCon(`<p><font color="#ff0000">antes ${token('[CARGO]')} después</font></p>`);
    expect(sacarTodas(editor)).toBe(1);
    expect(editor.innerHTML).toBe(
      `<p><font color="#ff0000">antes </font>${token('[CARGO]')}<font color="#ff0000"> después</font></p>`,
    );
  });

  it('conserva la negrita y la cursiva de la variable al quitarle el color', () => {
    const editor = editorCon(`<p><span style="color: rgb(0, 0, 255); font-weight: bold;">x <i>${token('[CARGO]')}</i> y</span></p>`);
    sacarTodas(editor);
    expect(editor.innerHTML).toBe(
      `<p><span style="color: rgb(0, 0, 255); font-weight: bold;">x </span>` +
      `<span style="font-weight: bold;"><i>${token('[CARGO]')}</i></span>` +
      `<span style="color: rgb(0, 0, 255); font-weight: bold;"> y</span></p>`,
    );
  });

  it('funciona con colores anidados y cuando la variable es lo único coloreado', () => {
    const editor = editorCon(`<p>a <font color="#ff0000"><font color="#0000ff">${token('[DOCUMENTO]')}</font></font> b</p>`);
    sacarTodas(editor);
    expect(editor.innerHTML).toBe(`<p>a ${token('[DOCUMENTO]')} b</p>`);
  });

  it('nunca saca una variable de su párrafo', () => {
    const html = `<p style="color: red;">texto ${token('[CARGO]')}</p>`;
    const editor = editorCon(html);
    expect(sacarTodas(editor)).toBe(0);
    expect(editor.innerHTML).toBe(html);
  });

  it('no toca variables sin color ni el resto del texto', () => {
    const html = `<p>Que <b>${token('[NOMBRE_EMPLEADO]')}</b> en <font color="#ff0000">rojo</font></p>`;
    const editor = editorCon(html);
    expect(sacarTodas(editor)).toBe(0);
    expect(editor.innerHTML).toBe(html);
  });

  it('solo mueve las variables indicadas (las de la selección)', () => {
    const editor = editorCon(
      `<p><font color="#ff0000">${token('[CARGO]')}</font> y <font color="#ff0000">${token('[DOCUMENTO]')}</font></p>`,
    );
    const [, segunda] = Array.from(editor.querySelectorAll('.variable-token'));
    expect(sacarVariablesDelColor(editor, [segunda])).toBe(1);
    expect(editor.innerHTML).toBe(`<p><font color="#ff0000">${token('[CARGO]')}</font> y ${token('[DOCUMENTO]')}</p>`);
  });
});

describe('variablesEnRango', () => {
  it('devuelve solo las variables que toca la selección', () => {
    const editor = editorCon(`<p>a ${token('[CARGO]')} b ${token('[DOCUMENTO]')} c</p>`);
    const parrafo = editor.firstElementChild!;
    const rango = document.createRange();
    rango.setStart(parrafo.firstChild!, 0);
    rango.setEnd(parrafo.childNodes[2], 2); // hasta " b"
    expect(variablesEnRango(editor, rango).map((t) => t.textContent)).toEqual(['[CARGO]']);
    expect(variablesEnRango(editor, null)).toEqual([]);
  });
});

describe('restaurarBloqueFunciones', () => {
  const bloque = (interior: string) =>
    `<section class="labor-functions-template-block" data-functions-template="true">${interior}</section>`;
  const textos = ['Conforme lo establece el Manual.', 'Las funciones para el cargo de son:', '[FUNCIONES]'];
  const parrafos = `<p>Conforme lo establece el Manual.</p><p>Las funciones para el cargo de son:</p><p>${token('[FUNCIONES]')}</p>`;

  it('rearma el bloque alrededor de los mismos párrafos si el navegador lo perdió', () => {
    const editor = editorCon(`<p>Que ${token('[NOMBRE_EMPLEADO]')}</p>${parrafos}<p>Se expide.</p>`);
    expect(restaurarBloqueFunciones(editor, textos)).toBe(true);
    expect(editor.innerHTML).toBe(`<p>Que ${token('[NOMBRE_EMPLEADO]')}</p>${bloque(parrafos)}<p>Se expide.</p>`);
  });

  it('quita un bloque vacío que haya quedado y arma el correcto', () => {
    const editor = editorCon(`${bloque('<p><br></p>')}<p>Que</p>${parrafos}`);
    expect(restaurarBloqueFunciones(editor, textos)).toBe(true);
    expect(editor.querySelectorAll('section')).toHaveLength(1);
    expect(editor.innerHTML).toBe(`<p>Que</p>${bloque(parrafos)}`);
  });

  it('no toca nada si ya hay un bloque con contenido', () => {
    const html = `${bloque(parrafos)}<p>Otro</p>`;
    const editor = editorCon(html);
    expect(restaurarBloqueFunciones(editor, textos)).toBe(false);
    expect(editor.innerHTML).toBe(html);
  });

  it('no toca nada si los párrafos no aparecen exactamente y seguidos', () => {
    const html = `<p>Conforme lo establece el Manual.</p><p>Otro texto</p><p>Las funciones para el cargo de son:</p><p>${token('[FUNCIONES]')}</p>`;
    const editor = editorCon(html);
    expect(restaurarBloqueFunciones(editor, textos)).toBe(false);
    expect(editor.innerHTML).toBe(html);
    expect(restaurarBloqueFunciones(editorCon(parrafos), [])).toBe(false);
  });
});

describe('textosBloqueFunciones y rearmarBloqueFuncionesEnHtml', () => {
  const bloqueHtml =
    '<section class="labor-functions-template-block" data-functions-template="true"><p>Conforme <em>lo establece</em> el Manual.</p><p>[FUNCIONES]</p></section>';

  it('lee los párrafos del bloque desde HTML o desde el DOM', () => {
    expect(textosBloqueFunciones(`<p>Que</p>${bloqueHtml}`)).toEqual(['Conforme lo establece el Manual.', '[FUNCIONES]']);
    expect(textosBloqueFunciones(editorCon(bloqueHtml))).toEqual(['Conforme lo establece el Manual.', '[FUNCIONES]']);
    expect(textosBloqueFunciones('<p>Sin bloque</p>')).toEqual([]);
  });

  it('rearma en una copia sin tocar el original', () => {
    const html = '<p>Que</p><p>Conforme lo establece el Manual.</p><p>[FUNCIONES]</p>';
    expect(rearmarBloqueFuncionesEnHtml(html, [[], ['Otro'], ['Conforme lo establece el Manual.', '[FUNCIONES]']])).toBe(
      '<p>Que</p><section class="labor-functions-template-block" data-functions-template="true"><p>Conforme lo establece el Manual.</p><p>[FUNCIONES]</p></section>',
    );
    expect(rearmarBloqueFuncionesEnHtml(html, [['Otro']])).toBeNull();
  });
});

describe('quitarEstilosRedundantes', () => {
  it('quita los estilos iguales a los del texto de alrededor (los que deja el navegador al borrar)', () => {
    const editor = editorCon(
      '<p style="font-size: 16px; line-height: 28px;"><span style="font-size: 16px; line-height: 28px;">Las funciones para el cargo de son:</span></p>',
    );
    expect(quitarEstilosRedundantes(editor)).toBe(2);
    expect(editor.querySelector('span')!.hasAttribute('style')).toBe(false);
    expect(editor.textContent).toBe('Las funciones para el cargo de son:');
  });

  it('conserva los estilos que sí cambian el aspecto', () => {
    const html = '<p style="font-size: 16px;"><span style="font-size: 20px;">grande</span> <span style="color: rgb(255, 0, 0);">rojo</span></p>';
    const editor = editorCon(html);
    expect(quitarEstilosRedundantes(editor)).toBe(0);
    expect(editor.innerHTML).toBe(html);
  });

  it('quita fondos vacíos y no toca alineación ni tokens', () => {
    const editor = editorCon(`<p style="text-align: justify;"><span style="background-color: transparent;">x</span> ${token('[CARGO]')}</p>`);
    expect(quitarEstilosRedundantes(editor)).toBe(1);
    expect(editor.innerHTML).toBe(`<p style="text-align: justify;"><span>x</span> ${token('[CARGO]')}</p>`);
  });
});
