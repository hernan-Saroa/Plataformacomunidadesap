import { Equivalencia, interpretarNucleo, normalizarNucleo } from './rund-nucleos';

// Subconjunto de la tabla de la migración 669 (mismos tipos y coincidencias).
const eq = (variante: string, idArea: number | null, coincidencia: 'exacta' | 'prefijo' = 'exacta',
  tipo: Equivalencia['tipo'] = 'area'): Equivalencia => ({ varianteNormalizada: normalizarNucleo(variante), coincidencia, tipo, idArea });

const EQ: Equivalencia[] = [
  eq('Estado y Poder', 1), eq('Problemática del Estado y del Poder', 1), eq('Problemática del Estado y Poder', 1),
  eq('Derechos Constitucional y Organización del Estado', 1), eq('Regímenes y Sistemas Políticos', 1),
  eq('Organizaciones Públicas', 2), eq('Derecho Administrativo y Contratación Estatal', 2),
  eq('Economía de lo Público', 3), eq('Finanzas Públicas y Presupuesto', 4, 'prefijo'),
  eq('Desarrollo y Gestión Territorial', 5), eq('Gestión del Desarrollo', 6, 'prefijo'),
  eq('Teorías y Enfoques del Desarrollo', 6, 'prefijo'), eq('Planeación del Desarrollo', 6, 'prefijo'),
  eq('Matemáticas, Estadística', 7), eq('Problremática Pública', 8), eq('Espacio, Tiempo y Territorio', 9),
  eq('Gobierno y Política Pública', 10, 'prefijo'),
  eq('Labores de docencia', null, 'prefijo', 'generica'), eq('Programas curriculares', null, 'prefijo', 'generica'),
  eq('Gerencia Social', null, 'exacta', 'sin_area'),
];
const areas = (texto: string) => interpretarNucleo(texto, EQ).areas.map((a) => a.idArea);

describe('Interpretación del NUCLEO_TEMATICO del RUND (EFDS-2375)', () => {
  it('normaliza tildes, mayúsculas, puntuación y espacios igual que la función SQL', () => {
    expect(normalizarNucleo('  Problemática Del  Estado, Y (Del) Poder. ')).toBe('problematica del estado y del poder');
    expect(normalizarNucleo('Teorìas')).toBe('teorias');
  });

  it('resuelve variantes del RUND y del plan al área canónica', () => {
    expect(areas('Problematica Del Estado Y Del Poder')).toEqual([1]);
    expect(areas('Economía De Lo Público')).toEqual([3]);
    expect(areas('Matemáticas, Estadística')).toEqual([7]);
    expect(areas('Espacio Tiempo Y Territorio')).toEqual([9]);
  });

  it('separa compuestos por «/», «-» y «,»: cada parte es un núcleo', () => {
    expect(areas('Organizaciones Públicas / Derecho Administrativo Y Contratación Estatal')).toEqual([2]);
    expect(areas('Economía De Lo Público / Finanzas Públicas Y Presupuesto Público')).toEqual([3, 4]);
    expect(areas('Problemática Del Estado Y Poder /Problremática Pública')).toEqual([1, 8]);
    expect(areas('Desarrollo Y Gestión Territorial, Y Gestión Del Desarrollo')).toEqual([5, 6]);
  });

  it('«Desarrollo y Gestión Territorial y Gestión del Desarrollo» da las dos áreas', () => {
    expect(areas('Desarrollo y Gestión Territorial y Gestión del Desarrollo')).toEqual([5, 6]);
  });

  it('las frases genéricas no son un núcleo', () => {
    const r = interpretarNucleo('Labores de docencia y las demás actividades propias de los docentes', EQ);
    expect(r).toEqual({ areas: [], generica: true, sinArea: [], sinResolver: [] });
    expect(interpretarNucleo('Programas Curriculares De Posgrado', EQ).generica).toBe(true);
  });

  it('reporta los núcleos sin área y las partes sin equivalencia, sin adivinar', () => {
    const r = interpretarNucleo('Espacio Tiempo Y Territorio/ Gerencia Social', EQ);
    expect(r.areas.map((a) => a.idArea)).toEqual([9]);
    expect(r.sinArea).toEqual(['Gerencia Social']);
    const s = interpretarNucleo('Gestion Del Desarrollo       -   Planeacion Del Desarrollo-  Proyecto Futuro', EQ);
    expect(s.areas.map((a) => a.idArea)).toEqual([6]);
    expect(s.sinResolver).toEqual(['Proyecto Futuro']);
    expect(interpretarNucleo('Astronomía', EQ).sinResolver).toEqual(['Astronomía']);
  });

  it('un prefijo exige palabra completa', () => {
    expect(areas('Gestión del Desarrollismo')).toEqual([]);
  });
});
