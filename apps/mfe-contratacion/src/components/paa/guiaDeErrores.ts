import type { HallazgoPaa } from '../../types';

/**
 * Qué hacer con cada error del PAA, en palabras de la guía del formato.
 *
 * El lector dice qué está mal en cada celda; quien carga el archivo necesita
 * además saber cómo arreglarlo, y casi siempre es el mismo arreglo para cientos
 * de celdas: un Excel exportado de la plantilla de SECOP trae los meses en
 * número en todas sus filas. Por eso los errores se agrupan por tipo, y cada
 * tipo trae su corrección y la sección de la guía donde se explica.
 *
 * Los patrones siguen los mensajes de `lector-paa.ts` y `regiones-del-archivo.ts`
 * del hiring-service; si allí cambia un texto, aquí deja de reconocerse y cae
 * en el grupo genérico de su columna, que se sigue viendo, solo que sin consejo.
 */
export interface TipoDeError {
  clave: string;
  titulo: string;
  comoSeCorrige: string;
  /** La sección de la guía del formato que lo explica. */
  seccion: string | null;
}

const TIPOS: (TipoDeError & { patron: RegExp })[] = [
  {
    clave: 'territorio',
    patron: /no se pudo saber de qu[eé] territorio/i,
    titulo: 'No se sabe de qué territorio es el archivo',
    comoSeCorrige: 'Ninguna descripción empieza por el prefijo de su región. Escribe «META 1 - …», «META 2 - …» en la columna B.',
    seccion: '2',
  },
  {
    clave: 'prefijo',
    patron: /no empieza por el c[oó]digo de la l[ií]nea/i,
    titulo: 'La descripción no empieza por el código de la línea',
    comoSeCorrige:
      'La columna B debe empezar por el prefijo de la región, el número de la línea y un guion: «META 1 - Prestar los servicios…». «001 - …» no sirve: le falta el prefijo.',
    seccion: '2',
  },
  {
    clave: 'sin-objeto',
    patron: /no tiene objeto despu[eé]s del c[oó]digo/i,
    titulo: 'Falta el objeto después del código',
    comoSeCorrige: 'Después de «PREFIJO número - » debe venir el objeto del contrato.',
    seccion: '2',
  },
  {
    clave: 'sin-descripcion',
    patron: /tiene datos pero no tiene descripci[oó]n/i,
    titulo: 'Fila con datos y sin descripción',
    comoSeCorrige: 'Llena la columna B de esa fila, o bórrala si sobra.',
    seccion: '2',
  },
  {
    clave: 'codigo-repetido',
    patron: /ya est[aá] en la fila/i,
    titulo: 'Código de línea repetido',
    comoSeCorrige: 'Dos líneas tienen el mismo número. Numéralas sin repetir: «META 001» y «META 1» son la misma.',
    seccion: '2',
  },
  {
    clave: 'mes',
    patron: /nombre de un mes/i,
    titulo: 'El mes viene en número',
    comoSeCorrige: 'Escribe el nombre del mes (Enero, Febrero…), no 1, 01/2026 ni Ene. Columnas C y D.',
    seccion: '3',
  },
  {
    clave: 'intervalo',
    patron: /«D[ií]as», «Meses» o «A[ñn]os»/i,
    titulo: 'El intervalo de la duración viene en código',
    comoSeCorrige: 'Escribe Días, Meses o Años, en plural. La plantilla de SECOP trae 0, 1, 2: no sirven. Columna F.',
    seccion: '3',
  },
  {
    clave: 'si-no',
    patron: /«S[ií]» o «No»/i,
    titulo: 'Sí o No viene como 0 o 1',
    comoSeCorrige: 'Escribe Sí o No, no 0 ni 1. Columnas K, R, S y T.',
    seccion: '3',
  },
  {
    clave: 'modalidad',
    patron: /modalidad no corresponde/i,
    titulo: 'Modalidad que no está en el catálogo',
    comoSeCorrige:
      'Escribe el nombre de la modalidad («Contratación directa»), no su código de SECOP (CCE-16). Si es un nombre nuevo, primero hay que registrar su equivalencia.',
    seccion: '5',
  },
  {
    clave: 'unidad',
    patron: /cuya unidad es|dice otra unidad/i,
    titulo: 'La unidad de contratación no es la registrada',
    comoSeCorrige:
      'Todas las líneas de un prefijo deben decir la misma unidad que tiene su región. Escríbela como está registrada, o corrígela primero en la pestaña Regiones.',
    seccion: '4',
  },
  {
    clave: 'prefijo-mal-escrito',
    patron: /no es el prefijo de ninguna regi[oó]n|tienen la misma unidad/i,
    titulo: 'Prefijo que parece mal escrito',
    comoSeCorrige: 'Revisa el prefijo de la columna B: su unidad es la de una región que ya existe con otro prefijo.',
    seccion: '4',
  },
  {
    clave: 'varios-territorios',
    patron: /cada territorio carga su propio excel/i,
    titulo: 'El archivo mezcla territorios',
    comoSeCorrige: 'Separa las líneas en un archivo por territorio y carga cada uno por su lado.',
    seccion: '1',
  },
  {
    clave: 'region-inactiva',
    patron: /est[aá] inactiva/i,
    titulo: 'La región está inactiva',
    comoSeCorrige: 'Actívala en la pestaña Regiones, o quita sus líneas del archivo.',
    seccion: null,
  },
  {
    clave: 'columnas',
    patron: /falta la columna|se espera en la [A-Z]\b|no se encontr[oó] la fila de encabezados/i,
    titulo: 'Las columnas no están como en el formato',
    comoSeCorrige: 'Deja las 21 columnas con su encabezado y en el orden de la A a la U, sin insertar, mover ni quitar ninguna.',
    seccion: '3',
  },
  {
    clave: 'hoja',
    patron: /hoja «/i,
    titulo: 'No se sabe cuál hoja es el plan',
    comoSeCorrige: 'Llama «Adquisiciones» a la hoja del plan, o deja el archivo con una sola hoja.',
    seccion: '1',
  },
  {
    clave: 'vacia',
    patron: /celda est[aá] vac[ií]a/i,
    titulo: 'Dato obligatorio vacío',
    comoSeCorrige: 'Llena la celda: duración, intervalo, modalidad, valores, unidad, ubicación y responsable no pueden quedar vacíos.',
    seccion: '3',
  },
  {
    clave: 'numero',
    patron: /n[uú]mero entero mayor que cero|valor en pesos/i,
    titulo: 'Número mal escrito',
    comoSeCorrige: 'Escribe solo el número: la duración, entero mayor que cero (12); los valores, en pesos (37248000).',
    seccion: '3',
  },
  {
    clave: 'no-es-excel',
    patron: /no es un excel|ninguna l[ií]nea debajo de los encabezados/i,
    titulo: 'El archivo no se puede leer',
    comoSeCorrige: 'Carga un .xlsx con el plan en la hoja «Adquisiciones» y una fila por línea debajo de los encabezados.',
    seccion: '1',
  },
];

/** El tipo de un hallazgo; si no se reconoce, uno propio de su mensaje. */
export function tipoDeError(h: HallazgoPaa): TipoDeError {
  const tipo = TIPOS.find((t) => t.patron.test(h.mensaje));
  if (tipo) return { clave: tipo.clave, titulo: tipo.titulo, comoSeCorrige: tipo.comoSeCorrige, seccion: tipo.seccion };
  return { clave: `otro:${h.columna ?? ''}:${h.mensaje}`, titulo: h.mensaje, comoSeCorrige: '', seccion: null };
}

export interface GrupoDeErrores {
  tipo: TipoDeError;
  hallazgos: HallazgoPaa[];
  columnas: string[];
  /** Las filas donde aparece, en orden y sin repetir. */
  filas: number[];
}

/** Los hallazgos agrupados por tipo, del más frecuente al menos. */
export function agruparErrores(hallazgos: HallazgoPaa[]): GrupoDeErrores[] {
  const grupos = new Map<string, GrupoDeErrores>();
  for (const h of hallazgos) {
    const tipo = tipoDeError(h);
    let grupo = grupos.get(tipo.clave);
    if (!grupo) {
      grupo = { tipo, hallazgos: [], columnas: [], filas: [] };
      grupos.set(tipo.clave, grupo);
    }
    grupo.hallazgos.push(h);
    if (h.columna && !grupo.columnas.includes(h.columna)) grupo.columnas.push(h.columna);
    if (h.fila !== null && !grupo.filas.includes(h.fila)) grupo.filas.push(h.fila);
  }
  for (const g of grupos.values()) g.filas.sort((a, b) => a - b);
  return [...grupos.values()].sort((a, b) => b.hallazgos.length - a.hallazgos.length);
}

/** «5, 6, 7, 9» → «5 a 7, 9»: 86 filas seguidas no se leen una por una. */
export function rangosDeFilas(filas: number[], maximo = 6): string {
  const rangos: string[] = [];
  let inicio = filas[0];
  let anterior = filas[0];
  for (const f of [...filas.slice(1), Number.NaN]) {
    if (f === anterior + 1) {
      anterior = f;
      continue;
    }
    rangos.push(inicio === anterior ? String(inicio) : `${inicio} a ${anterior}`);
    inicio = f;
    anterior = f;
  }
  if (!filas.length) return '';
  return rangos.length > maximo ? `${rangos.slice(0, maximo).join(', ')} y ${rangos.length - maximo} tramos más` : rangos.join(', ');
}
