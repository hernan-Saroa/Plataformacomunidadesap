export const normalizar = valor => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[.,;:()]/g, '').replace(/\s+/g, ' ').trim();

export const equivalencias = {
  'Estado y Poder': ['Estado y poder', 'Problemática del Estado y del Poder', 'Problemática del Estado y Poder', 'Regímenes y Sistemas Políticos', 'Derechos Constitucional y Organización del Estado'],
  'Organizaciones Públicas': ['Organizaciones públicas', 'Organizaciones Públicas y Gestión', 'Derecho Administrativo y Contratación Estatal', 'Gerencia Pública Integral', 'Gerencia de los Recursos Físicos y Financieros'],
  'Economía Pública': ['Economía Pública', 'Economía de lo Público', 'Política Económica y Procesos Económicos Territoriales'],
  'Finanzas Públicas': ['FINANZAS PÚBLICAS', 'Finanzas Públicas', 'Finanzas Públicas y Presupuesto', 'Finanzas Públicas y Presupuesto Público'],
  'Desarrollo y Gestión Territorial': ['Gestión Territorial', 'Desarrollo y Gestión Territorial'],
  'Gestión del Desarrollo': ['Gestión del Desarrollo', 'Gestión para el Desarrollo'],
  Cuantitativa: ['Cuantitativa', 'Fundamentación cuantitativa', 'Matemáticas, Estadística', 'Ciencias de Datos'],
  'Problemática Pública': ['Problemática Pública', 'Pensamiento Administrativo y Problemática Pública'],
  'Espacio, Tiempo y Territorio': ['Espacio, tiempo y territorio'],
  'Estado, Gobierno y Sociedad': ['Estado Gobierno y Sociedad', 'Gobierno y Políticas Públicas'],
  Idiomas: ['Idiomas', 'Idioma extranjero'], Electivas: ['Electivas', 'Electivas Generales'],
  Complementario: ['Complementario', 'Complementaria'],
  'Formación Específica': ['Materias de Formación Específica', 'Ciclo de Formación Específica'],
  'Teoría Económica e Historia': ['Teoría Económica e Historia'],
  'Formación integral y de contexto': ['Formación integral y de contexto'],
  'Opción de grado': ['Opción de grado'], 'Formación General': ['Formación General'],
};
const porVariante = new Map(Object.entries(equivalencias).flatMap(([area, variantes]) => [area, ...variantes].map(v => [normalizar(v), area])));
export function areaCanonica(valor) {
  const n = normalizar(valor).replace(/problrematica/g, 'problematica');
  if (['teorias y enfoques del desarrollo', 'proyectos de desarrollo', 'planeacion del desarrollo'].some(p => n.startsWith(p))) return 'Gestión del Desarrollo';
  return porVariante.get(n) ?? null;
}
export const esGenerico = valor => /^(labores de docencia|impartir asignaturas|desarrollo de los diferentes programas misionales|programas curriculares)/.test(normalizar(valor));
