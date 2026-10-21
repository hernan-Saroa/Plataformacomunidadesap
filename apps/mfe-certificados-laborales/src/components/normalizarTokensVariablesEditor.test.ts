import { describe, expect, it } from 'vitest';
import {
  normalizarTokensVariablesEditor,
  prepararVariablesPlantilla,
} from '../../utils/plantillaVariables';

// Copia exacta de crearVariableTokenHtml de ConfiguracionPlantilla.tsx.
const variableTokenStyle = 'font-weight: inherit; display: inline; padding: 0px 2px; font-size: inherit; line-height: inherit; border-radius: 2px; margin: 0;';
const crearVariableTokenHtml = (codigoVariable: string): string =>
  `<span class="variable-token bg-yellow-200 text-black" style="${variableTokenStyle}" contenteditable="false">${codigoVariable}</span>`;
const token = crearVariableTokenHtml;
const normalizar = (html: string) => normalizarTokensVariablesEditor(html, crearVariableTokenHtml);

// Copia exacta de la versión anterior de normalizarVariables (con los pasos 1 y
// 3 dañados por la codificación: "*?" quedó "*-" y "(?<!" / "(?!" quedaron
// "(-<!" / "(-!"). Sirve para demostrar que todo lo demás sigue igual.
const normalizarAnterior = (html: string): string => {
  if (!html) return html;
  let resultado = html;
  resultado = resultado.replace(/\[UBICACI[^\]]*N\]/gi, '[DEPENDENCIA]');
  for (let i = 0; i < 15; i++) {
    resultado = resultado.replace(/<span[^>]*>\s*(<span[^>]*>[\s\S]*-<\/span>)\s*<\/span>/g, '$1');
  }
  resultado = resultado.replace(
    /<span[^>]*class="[^"]*variable-token[^"]*"[^>]*>([^<]*\[([A-Z0-9_ÁÉÍÓÚÑÜ]+(?: [A-Z0-9_ÁÉÍÓÚÑÜ]+)*)\][^<]*)<\/span>/g,
    crearVariableTokenHtml('[$2]'),
  );
  resultado = resultado.replace(
    /(-<!<span[^>]*>)\[([A-Z0-9_ÁÉÍÓÚÑÜ]+(?: [A-Z0-9_ÁÉÍÓÚÑÜ]+)*)\](-![^<]*<\/span>)/g,
    crearVariableTokenHtml('[$1]'),
  );
  resultado = resultado.replace(/<span[^>]*>\s*<\/span>/g, '');
  return resultado;
};

// Plantillas por defecto de ConfiguracionPlantilla.tsx (docente y administrador),
// ya resaltadas como las deja el editor al cargarlas.
const plantillaAdministrador =
  `<p>Que ${token('[NOMBRE_EMPLEADO]')} identificado con cédula de ciudadanía No. ${token('[DOCUMENTO]')}, se encuentra vinculado con la Escuela Superior de Administración Pública - ESAP mediante nombramiento ${token('[TIPO_DATO]')} desde el ${token('[FECHA_INICIO]')}.</p>` +
  `<p>Actualmente, desempeña el cargo de ${token('[CARGO]')} ubicado en ${token('[DEPENDENCIA]')}.</p>` +
  `<section class="labor-functions-template-block" data-functions-template="true"><p>Conforme lo establece <em>el Manual Específico de Funciones – ESAP -.</em></p><p>Las funciones para el cargo de son:</p><p>${token('[FUNCIONES]')}</p></section>` +
  `<p>Que ${token('[NOMBRE_EMPLEADO]')} percibe mensualmente una asignación salarial de ${token('[SALARIO]')} ${token('[SALARIO_LETRAS]')} pesos m/cte.</p>` +
  `<p>Se expide en la ciudad de Bogotá D.C., a solicitud del interesado(a) a los ${token('[FECHA_EXPEDICION_COMPLETA]')}. Admin ${token('[GRUPO]')}</p>`;

describe('normalizarVariables del editor — sin cambios en lo que ya funcionaba', () => {
  // Contenido sin variables sueltas ni tokens anidados: la versión corregida
  // debe producir EXACTAMENTE lo mismo que la anterior.
  const sinCambios: Array<[string, string]> = [
    ['vacío', ''],
    ['texto sin variables', '<p>Texto <b>en negrita</b> y <span style="color: rgb(255, 0, 0);">rojo</span>.</p>'],
    ['plantilla administrador resaltada', plantillaAdministrador],
    ['token con negrita aplicada desde el editor', `<p>de <b>${token('[CARGO]').replace('font-weight: inherit', 'font-weight: bold')}</b> fin</p>`],
    ['token dentro de un span de color', `<p><span style="color: rgb(255, 0, 0);">${token('[CARGO]')}</span></p>`],
    ['variable dentro de un span de color (no se toca)', '<p><span style="color: rgb(0, 0, 255);">texto [CARGO] más</span></p>'],
    ['variable justo al abrir un span con formato', '<p><span style="font-weight: bold;">[CARGO]</span></p>'],
    ['corchetes que no son variables', '<p>Ver [nota al pie], [Abc] y [CARG0X] y [NOTA]</p>'],
    ['minúsculas (no las toca el editor)', '<p>Que [cargo] y [ CARGO ]</p>'],
    ['token legado [UBICACIÓN]', `<p>${token('[UBICACIÓN]')}</p>`],
    ['spans vacíos', '<p>a<span style="color:red"></span>b<span> </span>c</p>'],
    ['span con texto terminado en guion (lo tocaba el paso 1 dañado solo si iba anidado)', '<p><span style="color:red">ESAP -</span></p>'],
  ];

  it.each(sinCambios)('%s', (_nombre, html) => {
    expect(normalizar(html)).toBe(normalizarAnterior(html));
  });

  it('es idempotente (se aplica en cada tecla, al guardar y al autorizar)', () => {
    const casos = [
      plantillaAdministrador,
      '<p>Que [NOMBRE_EMPLEADO] y <b>[CARGO]</b> en [DEPENDENCIA].</p>',
      `<p>${token(token('[CARGO]'))}</p>`,
    ];
    for (const html of casos) {
      const una = normalizar(html);
      expect(normalizar(una)).toBe(una);
    }
  });
});

describe('normalizarVariables del editor — los dos arreglos', () => {
  it('resalta una variable conocida escrita a mano', () => {
    expect(normalizar('<p>el cargo de [CARGO] ubicado</p>')).toBe(`<p>el cargo de ${token('[CARGO]')} ubicado</p>`);
    expect(normalizar('<p>de <b>[CARGO]</b> y [SALARIO][SALARIO_LETRAS]</p>')).toBe(
      `<p>de <b>${token('[CARGO]')}</b> y ${token('[SALARIO]')}${token('[SALARIO_LETRAS]')}</p>`,
    );
    expect(normalizar('<p>[FUNCIONES]</p>')).toBe(`<p>${token('[FUNCIONES]')}</p>`);
    expect(normalizar('<p>[CARGO DATO6]</p>')).toBe(`<p>${token('[CARGO DATO6]')}</p>`);
  });

  it('no resalta lo que no es una variable conocida', () => {
    const html = '<p>[NOTA] y [CARG0] y [DATOX]</p>';
    expect(normalizar(html)).toBe(html);
  });

  it('colapsa un token que solo envuelve a otro token', () => {
    expect(normalizar(`<p>${token(token('[CARGO]'))}</p>`)).toBe(`<p>${token('[CARGO]')}</p>`);
    expect(normalizar(`<p>${token(token(token('[DOCUMENTO]')))}</p>`)).toBe(`<p>${token('[DOCUMENTO]')}</p>`);
  });

  it('nunca quita un span con formato que envuelve un token', () => {
    const html = `<p><span style="color: rgb(255, 0, 0);">${token('[CARGO]')}</span></p>`;
    expect(normalizar(html)).toBe(html);
  });

  it('la variable sigue siendo la misma después de resaltarla (el certificado no cambia)', () => {
    const texto = (html: string) => html.replace(/<[^>]+>/g, '');
    const html = '<p>Que [NOMBRE_EMPLEADO] identificado con No. [DOCUMENTO], cargo de [CARGO].</p>';
    expect(texto(normalizar(html))).toBe(texto(html));
    // Y el reemplazo del certificado ve exactamente las mismas variables.
    expect(texto(prepararVariablesPlantilla(normalizar(html)))).toBe(texto(prepararVariablesPlantilla(html)));
  });

  it('no usa lookbehind (Safari anterior a 16.4 no lo soporta)', () => {
    expect(normalizarTokensVariablesEditor.toString()).not.toMatch(/\(\?<[!=]/);
  });
});

describe('normalizarVariables del editor — variables dañadas pierden el resaltado', () => {
  it.each([
    ['[CARGO', '[CARGO'],
    ['CARGO]', 'CARGO]'],
    ['[CARG]', '[CARG]'],
    ['[NOTA]', '[NOTA]'],
    ['[cargo]', '[cargo]'],
  ])('un token con "%s" vuelve a ser texto normal', (contenido, texto) => {
    expect(normalizar(`<p>de ${token(contenido)} fin</p>`)).toBe(`<p>de ${texto} fin</p>`);
  });

  it('no pierde el texto que quedó dentro del token y resalta solo la variable válida', () => {
    expect(normalizar(`<p>${token('x[CARGO]y')}</p>`)).toBe(`<p>x${token('[CARGO]')}y</p>`);
  });

  it('conserva los espacios que quedaron dentro del token, fuera del resaltado', () => {
    expect(normalizar(`<p>de${token(' [CARGO]&nbsp;')}fin</p>`)).toBe(`<p>de ${token('[CARGO]')}&nbsp;fin</p>`);
  });

  it('el certificado sigue viendo exactamente el mismo texto', () => {
    const texto = (html: string) => html.replace(/<[^>]+>/g, '');
    const html = `<p>a ${token('[CARGO')} b ${token('[DOCUMENTO]')} c ${token('x[CARGO]y')}</p>`;
    expect(texto(normalizar(html))).toBe(texto(html));
  });
});
