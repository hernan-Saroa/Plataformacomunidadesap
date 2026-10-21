import { describe, expect, it } from 'vitest';
import { limpiarHtmlPegadoPlantilla, textoPlanoAHtmlPlantilla } from '../../utils/pegadoPlantilla';
import { analizarVariablesPlantilla, limpiarEstilosExternosPlantilla } from '../../utils/plantillaVariables';

// Copia exacta de crearVariableTokenHtml de ConfiguracionPlantilla.tsx.
const estiloToken = 'font-weight: inherit; display: inline; padding: 0px 2px; font-size: inherit; line-height: inherit; border-radius: 2px; margin: 0;';
const token = (codigo: string) =>
  `<span class="variable-token bg-yellow-200 text-black" style="${estiloToken}" contenteditable="false">${codigo}</span>`;
const pegar = (html: string, permitirBloqueFunciones = true) =>
  limpiarHtmlPegadoPlantilla(html, { crearToken: token, permitirBloqueFunciones });
const texto = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');

// Lo que Chrome pone en el portapapeles al copiar desde el editor de otra
// plantilla: comentarios de fragmento y estilos computados en cada elemento.
const copiadoDesdeOtraPlantilla =
  '<html><body><!--StartFragment-->' +
  '<p style="font-family: Arial; font-size: 16px; line-height: 1.8; color: rgb(0, 0, 0); text-align: justify;">' +
  '<span style="font-family: Arial; font-size: 16px; color: rgb(0, 0, 0); background-color: rgb(255, 255, 255);">Que </span>' +
  '<span class="variable-token bg-yellow-200 text-black" style="font-weight: inherit; display: inline; padding: 0px 2px; font-size: inherit; line-height: inherit; border-radius: 2px; margin: 0px; background-color: rgb(254, 240, 138); font-family: Arial;" contenteditable="false">[NOMBRE_EMPLEADO]</span>' +
  '<span style="font-family: Arial; font-size: 16px; color: rgb(0, 0, 0);"> identificado con No. </span>' +
  '<span class="variable-token bg-yellow-200 text-black" style="background-color: rgb(254, 240, 138);" contenteditable="false">[DOCUMENTO]</span>.' +
  '</p>' +
  '<section class="labor-functions-template-block" data-functions-template="true" style="font-size: 16px;">' +
  '<p style="font-size: 16px;">Conforme lo establece <em style="font-size: 16px;">el Manual</em>.</p>' +
  '<p><span class="variable-token bg-yellow-200 text-black" style="background-color: rgb(254, 240, 138);">[FUNCIONES]</span></p>' +
  '</section>' +
  '<p style="font-size: 16px;"><b style="font-size: 16px;">Que </b><span style="color: rgb(255, 0, 0); font-size: 16px;">rojo</span></p>' +
  '<!--EndFragment--></body></html>';

describe('limpiarHtmlPegadoPlantilla', () => {
  it('quita estilos externos y conserva texto, variables, negrita, cursiva, color y alineación', () => {
    const { html, limpiado } = pegar(copiadoDesdeOtraPlantilla);
    expect(limpiado).toBe(true);
    expect(html).not.toMatch(/font-family|font-size: 16px|background-color|line-height: 1\.8|StartFragment/);
    expect(html).toContain(`<p style="text-align: justify;">Que ${token('[NOMBRE_EMPLEADO]')} identificado con No. ${token('[DOCUMENTO]')}.</p>`);
    expect(html).toContain('<em>el Manual</em>');
    expect(html).toContain('<b>Que </b><span style="color: rgb(255, 0, 0);">rojo</span>');
    // El resultado ya no tiene nada que la revisión considere externo.
    expect(analizarVariablesPlantilla(html).filter((p) => p.tipo === 'estilosExternos')).toEqual([]);
  });

  it('conserva un único bloque de funciones cuando la plantilla no tiene uno', () => {
    const { html, bloqueFuncionesDescartado } = pegar(copiadoDesdeOtraPlantilla, true);
    expect(bloqueFuncionesDescartado).toBe(false);
    expect(html.match(/data-functions-template="true"/g)).toHaveLength(1);
    expect(html).toContain(`<section class="labor-functions-template-block" data-functions-template="true"><p>Conforme lo establece <em>el Manual</em>.</p><p>${token('[FUNCIONES]')}</p></section>`);
  });

  it('no duplica el bloque de funciones si la plantilla ya tiene uno', () => {
    const { html, bloqueFuncionesDescartado } = pegar(copiadoDesdeOtraPlantilla, false);
    expect(bloqueFuncionesDescartado).toBe(true);
    expect(html).not.toContain('data-functions-template');
    expect(texto(html)).toContain('Conforme lo establece el Manual.');
  });

  it('no anida un bloque de funciones dentro de otro pegado', () => {
    const anidado =
      '<section data-functions-template="true"><p>A</p><section data-functions-template="true"><p>[FUNCIONES]</p></section></section>';
    expect(pegar(anidado).html.match(/<section/g)).toHaveLength(1);
  });

  it('resalta las variables escritas a mano sin agregar espacios', () => {
    const { html } = pegar('<p>el cargo de[cargo]ubicado en [DEPENDENCIA]</p>');
    expect(html).toBe(`<p>el cargo de${token('[CARGO]')}ubicado en ${token('[DEPENDENCIA]')}</p>`);
  });

  it('limpia lo que trae Word (o:p, mso-, clases) sin perder el texto', () => {
    const word =
      '<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"><style>p.MsoNormal{margin:0}</style></head>' +
      '<body><p class="MsoNormal" style="mso-margin-top-alt:auto;font-size:12.0pt;font-family:&quot;Arial&quot;">Que <b><span style="mso-bidi-font-weight:normal">[NOMBRE_EMPLEADO]</span></b><o:p>&nbsp;</o:p></p></body></html>';
    const { html } = pegar(word);
    expect(html).not.toMatch(/Mso|mso-|font-family|<style|<meta|o:p/);
    expect(html).toContain(`<b>${token('[NOMBRE_EMPLEADO]')}</b>`);
  });

  it('no aplica la negrita falsa de Google Docs (<b style="font-weight:normal">)', () => {
    const { html } = pegar('<b style="font-weight:normal;" id="docs-internal-guid-1"><p><span style="font-weight:700;">Que</span> texto</p></b>');
    expect(html).toBe('<p><b>Que</b> texto</p>');
  });

  it('descarta scripts, imágenes y formularios', () => {
    const { html } = pegar('<p>Hola<script>alert(1)</script><img src="x" onerror="alert(1)"><button>b</button></p>');
    expect(html).toBe('<p>Hola</p>');
  });

  it('escapa el texto (no permite inyectar HTML)', () => {
    const { html } = pegar('<p>&lt;b&gt;no es negrita&lt;/b&gt; &amp; listo</p>');
    expect(html).toBe('<p>&lt;b&gt;no es negrita&lt;/b&gt; &amp; listo</p>');
  });

  it('aplica la negrita dentro de cada párrafo cuando envolvía varios (Word)', () => {
    expect(pegar('<b><p>A</p><p>B</p></b>').html).toBe('<p><b>A</b></p><p><b>B</b></p>');
    expect(pegar('<span style="color: rgb(255, 0, 0);"><p>A</p></span>').html).toBe(
      '<p><span style="color: rgb(255, 0, 0);">A</span></p>',
    );
  });

  it('solo avisa "limpiado" cuando se quitó algo que habría cambiado el certificado', () => {
    // Lo que Chrome siempre agrega (comentario de fragmento y meta) no cuenta.
    expect(pegar('<meta charset="utf-8"><!--StartFragment--><p>Hola <b>mundo</b></p><!--EndFragment-->').limpiado).toBe(false);
    // Un token copiado de otro editor con su propio estilo tampoco.
    expect(pegar(`<p>Que ${token('[CARGO]')}</p>`).limpiado).toBe(false);
    // Fuente, tamaño, fondo o imágenes sí.
    expect(pegar('<p><span style="font-size: 16px;">Hola</span></p>').limpiado).toBe(true);
    expect(pegar(`<p><span class="variable-token" style="background-color: rgb(254, 240, 138);">[CARGO]</span></p>`).limpiado).toBe(true);
    expect(pegar('<p>Hola<img src="x"></p>').limpiado).toBe(true);
    expect(pegar('<p><font face="Arial">Hola</font></p>').limpiado).toBe(true);
  });

  it('el color pegado se aplica al texto, nunca a las variables', () => {
    expect(pegar('<p><font color="#ff0000">antes [CARGO] después</font></p>').html).toBe(
      `<p><span style="color: #ff0000;">antes </span>${token('[CARGO]')}<span style="color: #ff0000;"> después</span></p>`,
    );
    expect(pegar(`<p><span style="color: rgb(0, 0, 255);">${token('[DOCUMENTO]')}</span></p>`).html).toBe(
      `<p>${token('[DOCUMENTO]')}</p>`,
    );
  });

  it('devuelve el texto de los párrafos del bloque de funciones, se conserve o no', () => {
    const html = '<section data-functions-template="true"><p>Conforme <em>lo establece</em>.</p><p>[FUNCIONES]</p></section>';
    expect(pegar(html, true).textosBloqueFunciones).toEqual(['Conforme lo establece.', '[FUNCIONES]']);
    expect(pegar(html, false).textosBloqueFunciones).toEqual(['Conforme lo establece.', '[FUNCIONES]']);
    expect(pegar('<p>Sin bloque</p>').textosBloqueFunciones).toEqual([]);
  });

  it('no envuelve párrafos dentro de párrafos (listas, tablas, divs)', () => {
    const { html } = pegar('<div><p>A</p><ul><li>B</li><li><p>C</p></li></ul><table><tr><td>D</td></tr></table></div>');
    expect(html).toBe('<p>A</p><p>B</p><p>C</p><p>D</p>');
  });
});

describe('textoPlanoAHtmlPlantilla', () => {
  it('convierte líneas en párrafos y resalta variables', () => {
    expect(textoPlanoAHtmlPlantilla('Que [NOMBRE_EMPLEADO]\r\n\r\ncon <No.> [documento]', token)).toBe(
      `<p>Que ${token('[NOMBRE_EMPLEADO]')}</p><p>con &lt;No.&gt; ${token('[DOCUMENTO]')}</p>`,
    );
  });

  it('una sola línea se pega en línea, sin crear párrafo', () => {
    expect(textoPlanoAHtmlPlantilla('de [CARGO]', token)).toBe(`de ${token('[CARGO]')}`);
  });
});

describe('limpiarEstilosExternosPlantilla (botón "Corregir automáticamente")', () => {
  it('quita solo los estilos externos y deja el resto idéntico', () => {
    const html =
      `<p style="text-align: justify; font-size: 16px;">Que ${token('[NOMBRE_EMPLEADO]')} ` +
      '<span style="color: rgb(255, 0, 0); background-color: rgb(254, 240, 138);">rojo</span>' +
      '<span style="font-family: Arial;">x</span><!--StartFragment--><o:p></o:p></p>';
    expect(limpiarEstilosExternosPlantilla(html)).toBe(
      `<p style="text-align: justify;">Que ${token('[NOMBRE_EMPLEADO]')} ` +
      '<span style="color: rgb(255, 0, 0);">rojo</span><span>x</span></p>',
    );
  });

  it('no cambia una plantilla sin estilos externos', () => {
    const html = `<p style="text-align: center;">Que <b>${token('[NOMBRE_EMPLEADO]')}</b> <span style="color: rgb(0, 0, 255);">azul</span></p>`;
    expect(limpiarEstilosExternosPlantilla(html)).toBe(html);
  });
});
