import {
  buildLaborFunctionMatchKey,
  normalizeCombinedPositionCode,
  normalizeGradeCode,
  normalizePositionCode,
  findDuplicateLaborFunctions,
  parseLaborFunctions,
  parseLaborFunctionsRaw,
  normalizeLaborFunctionDocument,
} from './labor-functions.utils';

describe('labor functions normalization', () => {
  it('preserves leading zeroes and builds the cargo plus grade key', () => {
    expect(normalizePositionCode(15)).toBe('0015');
    expect(normalizeCombinedPositionCode('2028', '24')).toBe('202824');
    expect(normalizeCombinedPositionCode('202824', '24')).toBe('202824');
    expect(normalizeCombinedPositionCode(15)).toBe('0015');
  });

  it('conserva el grado institucional con dos dígitos', () => {
    expect(normalizeGradeCode('09')).toBe('09');
    expect(normalizeGradeCode('9')).toBe('09');
    expect(normalizeCombinedPositionCode('4064', '09')).toBe('406409');
    expect(normalizeCombinedPositionCode('406409', '09')).toBe('406409');
  });

  it('separates numbered functions stored in one Excel cell', () => {
    expect(
      parseLaborFunctions(
        '1. Diseñar el programa institucional.\n2. Proponer políticas de docencia.\n3. Evaluar los resultados.',
      ),
    ).toEqual([
      'Diseñar el programa institucional.',
      'Proponer políticas de docencia.',
      'Evaluar los resultados.',
    ]);
  });

  it('supports one function per line and removes duplicates', () => {
    expect(
      parseLaborFunctions('1) Preparar clases\n2) Evaluar estudiantes\n3) Preparar clases'),
    ).toEqual(['Preparar clases', 'Evaluar estudiantes']);
    expect(
      parseLaborFunctionsRaw('1) Preparar clases\n2) Evaluar estudiantes\n3) Preparar clases'),
    ).toHaveLength(3);
  });

  it('identifies which function repeats an earlier one', () => {
    const items = parseLaborFunctionsRaw(
      '1. Preparar las clases del curso.\n2. Evaluar a los estudiantes.\n3. Preparar las clases del curso.\n4. Evaluar a los estudiantes.',
    );

    expect(findDuplicateLaborFunctions(items)).toEqual([
      {
        duplicateOrdinal: 3,
        originalOrdinal: 1,
        description: 'Preparar las clases del curso.',
      },
      {
        duplicateOrdinal: 4,
        originalOrdinal: 2,
        description: 'Evaluar a los estudiantes.',
      },
    ]);
  });

  it('preserva números, numerales y puntos dentro de una función', () => {
    const text = 'Aplicar el numeral 2. Revisar los expedientes institucionales.';
    expect(parseLaborFunctions(text)).toEqual([text]);
    expect(parseLaborFunctions([text])).toEqual([text]);
    expect(parseLaborFunctions('1. '+text+'\n2. Presentar los informes.')).toEqual([text, 'Presentar los informes.']);
  });
  it('normaliza separadores y conserva ceros sin aceptar letras ni números inseguros', () => {
    expect(normalizeLaborFunctionDocument('00.123-456 78')).toBe('0012345678');
    for (const value of ['abc123', '', '1e8', -123, 9007199254740992]) expect(normalizeLaborFunctionDocument(value)).toBe('');
  });
  it('normalizes accents and spacing in the association key', () => {
    expect(
      buildLaborFunctionMatchKey({
        combinedCode: '202824',
        hierarchicalLevel: 'Profesional',
        positionName: 'Profesional Especializado',
        department: '  Dirección de Formación ',
        internalGroup: 'Grupo Académico',
      }),
    ).toMatch(/^202824\|[a-f0-9]{64}$/);
  });
});
