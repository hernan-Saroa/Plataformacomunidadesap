import { aFecha, aYMD } from './dias-habiles';

/**
 * Calendario de festivos nacionales de Colombia, calculado.
 *
 * Se genera en vez de sembrarse año por año porque el calendario es
 * determinista: seis fechas fijas, siete que se corren al lunes siguiente por
 * la Ley 51 de 1983 (Emiliani) y cinco atadas al Domingo de Pascua. Sembrarlos
 * a mano solo aplaza el problema: llegado diciembre alguien tiene que acordarse
 * de cargar el año entrante, y si no lo hace el módulo deja de poder registrar
 * publicaciones.
 *
 * Lo que valida que esto no es una suposición es la prueba: el generador se
 * contrasta contra los treinta y seis festivos conocidos de 2026 y 2027.
 */

/** Festivos que no se mueven nunca, como [mes, día]. */
const FIJOS: [number, number, string][] = [
  [1, 1, 'Año Nuevo'],
  [5, 1, 'Día del Trabajo'],
  [7, 20, 'Día de la Independencia'],
  [8, 7, 'Batalla de Boyacá'],
  [12, 8, 'Inmaculada Concepción'],
  [12, 25, 'Navidad'],
];

/**
 * Festivos que la Ley 51 de 1983 traslada al lunes siguiente.
 *
 * Si la fecha ya cae en lunes se queda donde está, que es el caso que más se
 * equivoca al implementarlo a mano.
 */
const TRASLADABLES: [number, number, string][] = [
  [1, 6, 'Día de los Reyes Magos'],
  [3, 19, 'Día de San José'],
  [6, 29, 'San Pedro y San Pablo'],
  [8, 15, 'Asunción de la Virgen'],
  [10, 12, 'Día de la Raza'],
  [11, 1, 'Día de Todos los Santos'],
  [11, 11, 'Independencia de Cartagena'],
];

/**
 * Festivos contados desde el Domingo de Pascua.
 *
 * Jueves y Viernes Santo caen antes y no se trasladan. Los tres posteriores ya
 * vienen con el traslado incorporado en el desplazamiento: como la Pascua es
 * siempre domingo y 43, 64 y 71 son todos múltiplos de siete más uno, los tres
 * caen en lunes por construcción.
 */
const PASCUALES: [number, string][] = [
  [-3, 'Jueves Santo'],
  [-2, 'Viernes Santo'],
  [43, 'Ascensión del Señor'],
  [64, 'Corpus Christi'],
  [71, 'Sagrado Corazón de Jesús'],
];

/**
 * Domingo de Pascua del año, por el algoritmo de Gauss-Butcher para el
 * calendario gregoriano. Toda la división es entera.
 */
export function domingoDePascua(anio: number): string {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;

  return aYMD(new Date(Date.UTC(anio, mes - 1, dia)));
}

/** Desplaza una fecha al lunes siguiente; si ya es lunes, la deja. */
function alLunesSiguiente(ymd: string): string {
  const fecha = aFecha(ymd);
  const dia = fecha.getUTCDay();
  if (dia === 1) return ymd;
  // Domingo (0) necesita un día; el resto, los que falten para llegar al 8.
  fecha.setUTCDate(fecha.getUTCDate() + (dia === 0 ? 1 : 8 - dia));
  return aYMD(fecha);
}

function sumarDias(ymd: string, dias: number): string {
  const fecha = aFecha(ymd);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return aYMD(fecha);
}

/** Los dieciocho festivos nacionales del año, ordenados por fecha. */
export function festivosColombia(anio: number): { fecha: string; descripcion: string }[] {
  const pascua = domingoDePascua(anio);

  // Primero los que no se mueven: las fechas fijas y las atadas a la Pascua.
  // Ellos fijan el terreno, y los trasladables se acomodan alrededor.
  const festivos = [
    ...FIJOS.map(([mes, dia, descripcion]) => ({
      fecha: aYMD(new Date(Date.UTC(anio, mes - 1, dia))),
      descripcion,
    })),
    ...PASCUALES.map(([desplazamiento, descripcion]) => ({
      fecha: sumarDias(pascua, desplazamiento),
      descripcion,
    })),
  ];

  const ocupadas = new Set(festivos.map((f) => f.fecha));

  for (const [mes, dia, descripcion] of TRASLADABLES) {
    let fecha = alLunesSiguiente(aYMD(new Date(Date.UTC(anio, mes - 1, dia))));

    // Dos festivos no se funden en uno: si el traslado cae sobre una fecha ya
    // festiva, sigue al lunes siguiente. Pasa de verdad —San Pedro y San Pablo
    // contra el Sagrado Corazón en 2025, 2030, 2038 y 2041— y fundirlos
    // regalaría un día hábil de más en todos los plazos de esa semana.
    while (ocupadas.has(fecha)) fecha = sumarDias(fecha, 7);

    ocupadas.add(fecha);
    festivos.push({ fecha, descripcion });
  }

  return festivos.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/**
 * Festivos de un rango de años, listos para el conteo de días hábiles.
 *
 * Se pide por año y no por fecha porque el traslado de un festivo puede
 * cruzar el borde del año —Todos los Santos en domingo se corre al 2 de
 * noviembre— y recortar por fecha exacta perdería el que queda justo fuera.
 */
export function festivosEntre(desde: number, hasta: number): Set<string> {
  const fechas = new Set<string>();
  for (let anio = desde; anio <= hasta; anio++) {
    for (const festivo of festivosColombia(anio)) fechas.add(festivo.fecha);
  }
  return fechas;
}
