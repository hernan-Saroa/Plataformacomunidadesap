import { describe, expect, it } from 'vitest';
import {
  analizarVariablesPlantilla,
  canonicalizarVariablesPlantilla,
  prepararVariablesPlantilla,
  resolverVariablePlantilla,
} from '../../utils/plantillaVariables';

// Mismos casos que backend/certification-service/src/certificates/labor-template-variables.spec.ts:
// la vista previa y el PDF oficial deben interpretar la plantilla igual.
describe('canonicalizarVariablesPlantilla', () => {
  it.each([
    ['[cargo]', '[CARGO]'],
    ['[ CARGO ]', '[CARGO]'],
    ['[Nombre_Empleado]', '[NOMBRE_EMPLEADO]'],
    ['[NOMBRE EMPLEADO]', '[NOMBRE_EMPLEADO]'],
    ['[CARGO&nbsp;]', '[CARGO]'],
    ['[ubicación]', '[UBICACION]'],
    ['[CARGO DATO6]', '[CARGO DATO6]'],
    ['[funciones]', '[FUNCIONES]'],
  ])('reconoce %s como %s', (entrada, esperado) => {
    expect(canonicalizarVariablesPlantilla(entrada)).toBe(esperado);
  });

  it('une una variable partida por etiquetas sin desbalancear el HTML', () => {
    expect(canonicalizarVariablesPlantilla('<b>[CAR</b>GO]')).toBe('<b>[CARGO]</b>');
  });

  it('no toca corchetes que no son variables conocidas', () => {
    const html = '<p>Ver [nota al pie] y [CARG0] y [ ]</p>';
    expect(canonicalizarVariablesPlantilla(html)).toBe(html);
  });
});

describe('prepararVariablesPlantilla — respeta el texto tal cual', () => {
  it.each([
    'cargo de[CARGO] ubicado',
    'cargo de [CARGO]ubicado',
    'de[SALARIO][SALARIO_LETRAS]pesos',
    'No.[DOCUMENTO], se',
    'identificado(a)[DOCUMENTO]',
    'de<span class="variable-token" contenteditable="false">[CARGO]</span>ubicado',
  ])('no agrega espacios: %s', (entrada) => {
    expect(prepararVariablesPlantilla(entrada)).toBe(entrada);
  });

  it('no cambia una plantilla bien escrita', () => {
    const html = '<p>Que [NOMBRE_EMPLEADO] percibe ([SALARIO]) a los [FECHA_EXPEDICION_COMPLETA].</p><p>[FUNCIONES]</p>';
    expect(prepararVariablesPlantilla(html)).toBe(html);
  });

  it('es idempotente', () => {
    const una = prepararVariablesPlantilla('<p>de[cargo]ubicado en<b>[DEPENDENCIA]</b>.[SALARIO][SALARIO_LETRAS]</p>');
    expect(prepararVariablesPlantilla(una)).toBe(una);
  });
});

describe('resolverVariablePlantilla', () => {
  it('resuelve variables escritas de otra forma y rechaza las desconocidas', () => {
    expect(resolverVariablePlantilla('[ cargo ]')).toBe('[CARGO]');
    expect(resolverVariablePlantilla('[CARG0]')).toBeNull();
    expect(resolverVariablePlantilla('[DATO1]', ['[CARGO]'])).toBeNull();
  });
});

describe('analizarVariablesPlantilla (revisión del editor)', () => {
  const de = (html: string, tipo: string) =>
    analizarVariablesPlantilla(html).filter((problema) => problema.tipo === tipo);

  const plantillaPorDefecto =
    '<p>Que [NOMBRE_EMPLEADO] identificado con cédula de ciudadanía No. [DOCUMENTO], mediante nombramiento [TIPO_DATO] desde el [FECHA_INICIO].</p>' +
    '<p>Actualmente, desempeña el cargo de [CARGO] ubicado en [DEPENDENCIA].</p>' +
    '<section class="labor-functions-template-block" data-functions-template="true"><p>Conforme lo establece el Manual.</p><p>[FUNCIONES]</p></section>' +
    '<p>percibe una asignación salarial de [SALARIO] [SALARIO_LETRAS] pesos m/cte.</p><p>a los&nbsp;[FECHA_EXPEDICION_COMPLETA]. Admin [GRUPO]</p>';

  it('no reporta nada en la plantilla por defecto', () => {
    expect(analizarVariablesPlantilla(plantillaPorDefecto)).toEqual([]);
  });

  it('no reporta nada en una plantilla vacía', () => {
    expect(analizarVariablesPlantilla('')).toEqual([]);
    expect(analizarVariablesPlantilla('<p><br></p>')).toEqual([]);
  });

  it('el aviso muestra las variables completas, sin cortarlas', () => {
    const problemas = de('<p>una asignación salarial de [SALARIO][SALARIO_LETRAS] pesos m/cte.</p>', 'pegada');
    // Un solo aviso por par de variables pegadas, con ambas completas y sin
    // mostrar lo que está separado por espacios.
    expect(problemas).toEqual([
      { tipo: 'pegada', variable: '[SALARIO]', contexto: '[SALARIO][SALARIO_LETRAS]' },
    ]);
    // Caso de la captura: solo lo pegado, sin la variable que está separada.
    expect(de('<p>de [SALARIO] [SALARIO_LETRAS]pesos m/cte.</p>', 'pegada')).toEqual([
      { tipo: 'pegada', variable: '[SALARIO_LETRAS]', contexto: '[SALARIO_LETRAS]pesos' },
    ]);
    // Variables con espacio interno y párrafos: nunca se cortan ni se mezclan.
    expect(de('<p>Antes.</p><p>cargo:[CARGO DATO6]fin de texto</p>', 'pegada')).toEqual([
      { tipo: 'pegada', variable: '[CARGO DATO6]', contexto: 'cargo:[CARGO DATO6]fin' },
    ]);
  });

  it('detecta variables pegadas a palabras o a otras variables, incluso con el span del editor', () => {
    const problemas = de(
      '<p>el cargo de<span class="variable-token">[CARGO]</span> y [SALARIO][SALARIO_LETRAS]pesos</p>',
      'pegada',
    );
    expect(problemas.map((p) => (p as any).variable)).toEqual(['[CARGO]', '[SALARIO]', '[SALARIO_LETRAS]']);
  });

  it('avisa cuando una variable se escribió distinto', () => {
    expect(de('<p>Que [nombre empleado] trabaja</p>', 'normalizada')).toEqual([
      { tipo: 'normalizada', texto: '[nombre empleado]', variable: '[NOMBRE_EMPLEADO]' },
    ]);
  });

  it('avisa variables desconocidas o sin corchete', () => {
    const problemas = analizarVariablesPlantilla('<p>Cargo [CARG0] y nombre [NOMBRE_EMPLEADO identificado, sede DOCUMENTO] fin</p>');
    expect(problemas).toEqual(
      expect.arrayContaining([
        { tipo: 'desconocida', texto: '[CARG0]' },
        { tipo: 'incompleta', texto: '[NOMBRE_EMPLEADO', variable: '[NOMBRE_EMPLEADO]' },
        { tipo: 'incompleta', texto: 'DOCUMENTO]', variable: '[DOCUMENTO]' },
      ]),
    );
  });

  it('no confunde [FUNCIONES] en su párrafo con una variable pegada', () => {
    expect(de('<p>son:</p><p>[FUNCIONES]</p>', 'pegada')).toEqual([]);
  });
});

describe('analizarVariablesPlantilla — contenido pegado desde otra plantilla', () => {
  const base =
    '<p>Que [NOMBRE_EMPLEADO] con No. [DOCUMENTO].</p>' +
    '<section class="labor-functions-template-block" data-functions-template="true"><p>Intro</p><p>[FUNCIONES]</p></section>';
  const tipos = (html: string) => analizarVariablesPlantilla(html).map((p) => JSON.stringify(p));

  it('detecta estilos copiados (fuente, tamaño, fondo amarillo del token, Word)', () => {
    expect(tipos(`<p><span style="font-family: Arial; font-size: 16px;">Que</span> [NOMBRE_EMPLEADO] [DOCUMENTO]</p>`)).toContain('{"tipo":"estilosExternos"}');
    expect(tipos(`<p>Que <span class="variable-token" style="background-color: rgb(254, 240, 138);">[NOMBRE_EMPLEADO]</span> [DOCUMENTO]<o:p></o:p></p>`)).toContain('{"tipo":"estilosExternos"}');
  });

  it('no cuenta como externos los valores que no cambian nada', () => {
    expect(
      tipos('<p>Que <span style="letter-spacing: normal; word-spacing: 0px; white-space: normal; background-color: transparent; text-transform: none;">[NOMBRE_EMPLEADO]</span> [DOCUMENTO]</p>'),
    ).toEqual([]);
  });

  it('no confunde el estilo propio del token del editor con un estilo externo', () => {
    const token = '<span class="variable-token bg-yellow-200 text-black" style="font-weight: inherit; display: inline; padding: 0px 2px; font-size: inherit; line-height: inherit; border-radius: 2px; margin: 0;" contenteditable="false">[NOMBRE_EMPLEADO]</span>';
    expect(tipos(`<p>Que ${token} [DOCUMENTO] en <span style="color: rgb(255, 0, 0);">rojo</span> <b>y negrita</b></p>`)).toEqual([]);
  });

  it('detecta el bloque de funciones duplicado y [FUNCIONES] repetida', () => {
    const problemas = tipos(base + base);
    expect(problemas).toContain('{"tipo":"funciones","detalle":"duplicada"}');
    expect(problemas).toContain('{"tipo":"funciones","detalle":"bloqueDuplicado"}');
  });

  it('detecta [FUNCIONES] fuera de su bloque', () => {
    expect(tipos('<p>Que [NOMBRE_EMPLEADO] [DOCUMENTO]</p><p>Intro</p><p>[FUNCIONES]</p>')).toContain(
      '{"tipo":"funciones","detalle":"fueraDelBloque"}',
    );
    expect(tipos(base)).toEqual([]);
  });

  it('detecta datos reales copiados de un certificado ya generado', () => {
    const problemas = tipos(
      '<p>Que DIANA MARIA identificado con No. 53062883 percibe ($1.000.000) un millón, a los 2 de octubre de 2026.</p>',
    );
    expect(problemas).toEqual(
      expect.arrayContaining([
        '{"tipo":"datoReal","texto":"$1.000.000"}',
        '{"tipo":"datoReal","texto":"2 de octubre de 2026"}',
        '{"tipo":"datoReal","texto":"53062883"}',
        '{"tipo":"faltaVariable","variable":"[NOMBRE_EMPLEADO]"}',
        '{"tipo":"faltaVariable","variable":"[DOCUMENTO]"}',
      ]),
    );
  });

  it('no confunde códigos de cargo, grados o años con datos reales', () => {
    expect(tipos('<p>Que [NOMBRE_EMPLEADO] [DOCUMENTO] Código 2028 Grado 16, Decreto 1083 de 2015, desde 1958.</p>')).toEqual([]);
  });

  it('acepta las variables legadas [DATO1] y [DATO2] como nombre y documento', () => {
    expect(tipos('<p>Que [DATO1] con No. [DATO2].</p>')).toEqual([]);
  });
});
