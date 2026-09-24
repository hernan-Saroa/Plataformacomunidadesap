/**
 * Calendario de la vigencia para programar auditorías (EFDS-2132).
 *
 * Nada sale de una lista por año: los festivos se calculan con la Ley 51 de
 * 1983 (fijos, trasladados al lunes y los que dependen de la Pascua), la Semana
 * Santa es la semana del Viernes Santo y la semana de receso estudiantil es la
 * anterior al festivo del 12 de octubre (Decreto 1373 de 2007). Así sirve para
 * 2027 y los años que vengan sin tocar código.
 *
 * Las semanas van de lunes a domingo y la semana 1 es la que contiene el 1 de
 * enero, igual que en el formato del Programa Anual (EM-FO-001).
 */

export type BloqueoSemana = 'semana_santa' | 'receso';
export type EtapaCronograma = 'P' | 'E' | 'C';

export interface Festivo {
  fecha: string; // YYYY-MM-DD
  nombre: string;
}

export interface SemanaVigencia {
  /** Posición de la semana en el calendario que se está usando */
  numero: number;
  lunes: string;
  domingo: string;
  /** Año al que pertenece la semana (el del jueves) */
  año: number;
  /** Mes (0-11) al que pertenece la semana: el del jueves, como en ISO 8601 */
  mes: number;
  /** Número de la semana dentro de ese mes (1..5) */
  numeroEnMes: number;
  bloqueo?: BloqueoSemana;
  festivos: Festivo[];
}

export interface FechasEtapas {
  fechaInicioPlaneacion: string;
  fechaFinPlaneacion: string;
  fechaInicioEjecucion: string;
  fechaFinEjecucion: string;
  fechaInicioComunicacion: string;
  fechaFinComunicacion: string;
}

export interface SemanaProgramada {
  semana: SemanaVigencia;
  etapa?: EtapaCronograma;
  excluida: boolean;
}

export const DURACION_ESTANDAR: Record<EtapaCronograma, number> = { P: 4, E: 4, C: 5 };

export const NOMBRE_ETAPA: Record<EtapaCronograma, string> = {
  P: 'Planeación',
  E: 'Ejecución',
  C: 'Comunicación',
};

export const NOMBRE_BLOQUEO: Record<BloqueoSemana, string> = {
  semana_santa: 'Semana Santa',
  receso: 'Semana de receso',
};

export function fechaYMD(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Fecha local a partir de YYYY-MM-DD (new Date(texto) la corre un día en Colombia). */
export function parseYMD(texto: string): Date {
  const [y, m, d] = texto.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias);
}

export function lunesDe(fecha: Date): Date {
  return sumarDias(fecha, -((fecha.getDay() + 6) % 7));
}

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher). */
export function domingoDePascua(año: number): Date {
  const a = año % 19;
  const b = Math.floor(año / 100);
  const c = año % 100;
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
  return new Date(año, mes - 1, dia);
}

/** Ley Emiliani: el festivo pasa al lunes siguiente cuando no cae en lunes. */
function alLunes(fecha: Date): Date {
  const dia = fecha.getDay();
  return dia === 1 ? fecha : sumarDias(fecha, (8 - dia) % 7);
}

export function festivosDeVigencia(año: number): Festivo[] {
  const fijos: Array<[number, number, string]> = [
    [0, 1, 'Año Nuevo'],
    [4, 1, 'Día del Trabajo'],
    [6, 20, 'Independencia de Colombia'],
    [7, 7, 'Batalla de Boyacá'],
    [11, 8, 'Inmaculada Concepción'],
    [11, 25, 'Navidad'],
  ];
  const trasladados: Array<[number, number, string]> = [
    [0, 6, 'Reyes Magos'],
    [2, 19, 'San José'],
    [5, 29, 'San Pedro y San Pablo'],
    [7, 15, 'Asunción de la Virgen'],
    [9, 12, 'Día de la Raza'],
    [10, 1, 'Todos los Santos'],
    [10, 11, 'Independencia de Cartagena'],
  ];
  const pascua = domingoDePascua(año);
  // Jueves y Viernes Santo se celebran el día que caen; los otros tres se
  // trasladan al lunes porque la Ley 51 los cuenta como lunes festivos.
  const desdePascua: Array<[number, string, boolean]> = [
    [-3, 'Jueves Santo', false],
    [-2, 'Viernes Santo', false],
    [43, 'Ascensión del Señor', true],
    [64, 'Corpus Christi', true],
    [71, 'Sagrado Corazón', true],
  ];

  const festivos: Festivo[] = [
    ...fijos.map(([m, d, nombre]) => ({ fecha: fechaYMD(new Date(año, m, d)), nombre })),
    ...desdePascua.map(([dias, nombre]) => ({ fecha: fechaYMD(sumarDias(pascua, dias)), nombre })),
  ];

  // Los que se corren al lunes se resuelven en orden: si el lunes ya está
  // ocupado por otro festivo (en 2025 Sagrado Corazón y San Pedro caen los dos
  // el 30 de junio), el segundo pasa al lunes siguiente.
  const ocupadas = new Set(festivos.map((f) => f.fecha));
  const corridos = trasladados
    .map(([m, d, nombre]) => ({ fecha: alLunes(new Date(año, m, d)), nombre }))
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

  for (const { fecha, nombre } of corridos) {
    let dia = fecha;
    while (ocupadas.has(fechaYMD(dia))) dia = sumarDias(dia, 7);
    ocupadas.add(fechaYMD(dia));
    festivos.push({ fecha: fechaYMD(dia), nombre });
  }

  return festivos.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export function semanaSantaDe(año: number): { lunes: string; domingo: string } {
  const pascua = domingoDePascua(año);
  return { lunes: fechaYMD(sumarDias(pascua, -6)), domingo: fechaYMD(pascua) };
}

/** Semana de receso estudiantil: la anterior al festivo del 12 de octubre (Decreto 1373 de 2007). */
export function semanaRecesoDe(año: number): { lunes: string; domingo: string } {
  const raza = alLunes(new Date(año, 9, 12));
  return { lunes: fechaYMD(sumarDias(raza, -7)), domingo: fechaYMD(sumarDias(raza, -1)) };
}

const cacheSemanas = new Map<number, SemanaVigencia[]>();

/**
 * Años que el calendario abarca a cada lado del que se pide. No hay una regla
 * que lo limite: es hasta dónde se precalculan las semanas, y con esto se cubren
 * las vigencias viejas y las que vengan.
 */
export const AÑOS_ALREDEDOR = 10;

/**
 * Semanas del año pedido y de varios años alrededor: una auditoría que arranca
 * en noviembre termina en el año entrante, y con un solo año el cronograma se
 * cortaba el 31 de diciembre. Para las columnas del Excel se filtra por `año`.
 */
export function semanasDeVigencia(año: number): SemanaVigencia[] {
  const enCache = cacheSemanas.get(año);
  if (enCache) return enCache;

  const desde = año - AÑOS_ALREDEDOR;
  const hasta = año + AÑOS_ALREDEDOR;
  const años = Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);
  // Por fecha, para no recorrer todos los festivos en cada semana
  const festivosPorFecha = new Map<string, Festivo>();
  años.forEach((a) => festivosDeVigencia(a).forEach((f) => festivosPorFecha.set(f.fecha, f)));
  const bloqueos = new Set(años.map((a) => semanaSantaDe(a).lunes));
  const recesos = new Set(años.map((a) => semanaRecesoDe(a).lunes));
  const ultimoDia = new Date(hasta, 11, 31);
  const semanas: SemanaVigencia[] = [];
  const contadorMes = new Map<string, number>();

  let lunes = lunesDe(new Date(desde, 0, 1));
  let numero = 1;
  while (lunes <= ultimoDia) {
    const domingo = sumarDias(lunes, 6);
    const jueves = sumarDias(lunes, 3);
    // La semana partida entre dos años se queda con el mes de su jueves
    const añoSemana = jueves.getFullYear();
    const mes = jueves.getMonth();
    const clave = `${añoSemana}-${mes}`;
    contadorMes.set(clave, (contadorMes.get(clave) || 0) + 1);
    const lunesYMD = fechaYMD(lunes);
    const domingoYMD = fechaYMD(domingo);
    const festivosSemana: Festivo[] = [];
    for (let d = 0; d < 7; d++) {
      const f = festivosPorFecha.get(fechaYMD(sumarDias(lunes, d)));
      if (f) festivosSemana.push(f);
    }
    semanas.push({
      numero,
      lunes: lunesYMD,
      domingo: domingoYMD,
      año: añoSemana,
      mes,
      numeroEnMes: contadorMes.get(clave)!,
      bloqueo: bloqueos.has(lunesYMD) ? 'semana_santa' : recesos.has(lunesYMD) ? 'receso' : undefined,
      festivos: festivosSemana,
    });
    lunes = sumarDias(lunes, 7);
    numero += 1;
  }

  cacheSemanas.set(año, semanas);
  return semanas;
}

export function festivoDe(fecha: string): Festivo | undefined {
  return festivosDeVigencia(Number(fecha.slice(0, 4))).find((f) => f.fecha === fecha);
}

export function semanaQueContiene(fecha: string, semanas: SemanaVigencia[]): SemanaVigencia | undefined {
  return semanas.find((s) => fecha >= s.lunes && fecha <= s.domingo);
}

/** Primer día hábil de la semana: de lunes a viernes, saltando festivos. */
export function primerDiaHabil(semana: SemanaVigencia): string {
  for (let i = 0; i < 5; i++) {
    const dia = fechaYMD(sumarDias(parseYMD(semana.lunes), i));
    if (!semana.festivos.some((f) => f.fecha === dia)) return dia;
  }
  return semana.lunes;
}

export interface OpcionesProgramacion {
  año: number;
  /** Cualquier fecha de la semana en que arranca Planeación */
  inicio: string;
  /** Lunes (YYYY-MM-DD) de las semanas que el usuario sacó del cronograma */
  semanasExcluidas?: string[];
  duraciones?: Record<EtapaCronograma, number>;
}

export interface ResultadoProgramacion {
  semanas: SemanaProgramada[];
  fechas: FechasEtapas;
  /** Semanas bloqueadas o excluidas que quedaron dentro del cronograma */
  saltadas: SemanaVigencia[];
  /** true si el año no alcanzó para completar las etapas */
  incompleta: boolean;
}

const FECHAS_VACIAS: FechasEtapas = {
  fechaInicioPlaneacion: '',
  fechaFinPlaneacion: '',
  fechaInicioEjecucion: '',
  fechaFinEjecucion: '',
  fechaInicioComunicacion: '',
  fechaFinComunicacion: '',
};

/**
 * Llena las etapas en semanas (4-4-5 por defecto) desde la semana de `inicio`,
 * saltando Semana Santa, receso y las semanas excluidas: esas no cuentan y el
 * cronograma se corre. Cada etapa empieza el primer día hábil de su primera
 * semana y termina el domingo de la última.
 */
export function calcularProgramacion(opciones: OpcionesProgramacion): ResultadoProgramacion {
  const { año, inicio, semanasExcluidas = [], duraciones = DURACION_ESTANDAR } = opciones;
  const semanas = semanasDeVigencia(año);
  const excluidas = new Set(semanasExcluidas);
  const orden: EtapaCronograma[] = ['P', 'E', 'C'];
  const pendientes: Record<EtapaCronograma, number> = { ...duraciones };
  const porEtapa: Record<EtapaCronograma, SemanaVigencia[]> = { P: [], E: [], C: [] };
  const saltadas: SemanaVigencia[] = [];
  const programadas: SemanaProgramada[] = semanas.map((semana) => ({
    semana,
    excluida: excluidas.has(semana.lunes),
  }));

  const primera = semanaQueContiene(inicio, semanas);
  let etapaIdx = 0;
  if (primera) {
    for (let i = primera.numero - 1; i < semanas.length && etapaIdx < orden.length; i++) {
      const semana = semanas[i];
      if (semana.bloqueo || excluidas.has(semana.lunes)) {
        saltadas.push(semana);
        continue;
      }
      const etapa = orden[etapaIdx];
      porEtapa[etapa].push(semana);
      programadas[i].etapa = etapa;
      pendientes[etapa] -= 1;
      if (pendientes[etapa] <= 0) etapaIdx += 1;
    }
  }

  const inicioDe = (lista: SemanaVigencia[]) => (lista.length ? primerDiaHabil(lista[0]) : '');
  const finDe = (lista: SemanaVigencia[]) => (lista.length ? lista[lista.length - 1].domingo : '');

  return {
    semanas: programadas,
    fechas: {
      fechaInicioPlaneacion: inicioDe(porEtapa.P),
      fechaFinPlaneacion: finDe(porEtapa.P),
      fechaInicioEjecucion: inicioDe(porEtapa.E),
      fechaFinEjecucion: finDe(porEtapa.E),
      fechaInicioComunicacion: inicioDe(porEtapa.C),
      fechaFinComunicacion: finDe(porEtapa.C),
    },
    saltadas,
    incompleta: etapaIdx < orden.length,
  };
}

/** Semanas que sí cuentan (ni bloqueadas ni excluidas) entre dos números de semana. */
function semanasEfectivas(
  semanas: SemanaVigencia[],
  desde: number,
  hasta: number,
  excluidas: Set<string>,
): number {
  let total = 0;
  for (let n = desde; n <= hasta; n++) {
    const semana = semanas[n - 1];
    if (semana && !semana.bloqueo && !excluidas.has(semana.lunes)) total += 1;
  }
  return total;
}

export interface RangoEtapa {
  etapa: EtapaCronograma;
  /** Número de semana donde arranca y donde termina la etapa */
  desde: number;
  hasta: number;
}

/**
 * Recalcula el cronograma cuando el usuario fija a mano el rango de una etapa
 * (arrastrando en el calendario). Las etapas anteriores se acortan o alargan
 * para terminar justo antes, y las siguientes se corren conservando su
 * duración; las semanas bloqueadas o excluidas no cuentan.
 */
export function aplicarRangoEtapa(
  año: number,
  fechas: Partial<FechasEtapas>,
  semanasExcluidas: string[],
  rango: RangoEtapa,
): ResultadoProgramacion {
  const semanas = semanasDeVigencia(año);
  const excluidas = new Set(semanasExcluidas);
  const actual = programacionDesdeFechas(año, fechas, semanasExcluidas);
  const cuenta = (etapa: EtapaCronograma) => actual.filter((p) => p.etapa === etapa).length;

  const duraciones: Record<EtapaCronograma, number> = {
    P: cuenta('P') || DURACION_ESTANDAR.P,
    E: cuenta('E') || DURACION_ESTANDAR.E,
    C: cuenta('C') || DURACION_ESTANDAR.C,
  };
  const propias = Math.max(1, semanasEfectivas(semanas, rango.desde, rango.hasta, excluidas));
  duraciones[rango.etapa] = propias;

  // La semana en que arranca todo el cronograma
  let inicio = semanas[rango.desde - 1]?.lunes || '';
  if (rango.etapa !== 'P') {
    const primeraActual = actual.find((p) => p.etapa === 'P')?.semana
      ?? actual.find((p) => p.etapa)?.semana;
    const inicioPrevio = primeraActual?.numero ?? rango.desde;
    if (inicioPrevio < rango.desde) {
      inicio = semanas[inicioPrevio - 1].lunes;
      // Las etapas anteriores se reparten las semanas que quedan hasta el rango fijado
      const disponibles = semanasEfectivas(semanas, inicioPrevio, rango.desde - 1, excluidas);
      if (rango.etapa === 'E') {
        duraciones.P = Math.max(1, disponibles);
      } else {
        const previas = Math.max(2, disponibles);
        duraciones.P = Math.max(1, previas - duraciones.E);
        if (duraciones.P + duraciones.E !== previas) duraciones.E = Math.max(1, previas - duraciones.P);
      }
    }
  }

  return calcularProgramacion({ año, inicio, semanasExcluidas, duraciones });
}

const CAMPOS_ETAPA: Record<EtapaCronograma, { inicio: keyof FechasEtapas; fin: keyof FechasEtapas }> = {
  P: { inicio: 'fechaInicioPlaneacion', fin: 'fechaFinPlaneacion' },
  E: { inicio: 'fechaInicioEjecucion', fin: 'fechaFinEjecucion' },
  C: { inicio: 'fechaInicioComunicacion', fin: 'fechaFinComunicacion' },
};

export interface ResultadoAjuste {
  fechas: FechasEtapas;
  semanasExcluidas: string[];
}

/**
 * Marca o desmarca una semana en una etapa sin tocar las demás (EFDS-2132).
 *
 * Antes cada clic recalculaba el ciclo completo y las otras etapas se movían,
 * así que lo que ya estaba marcado parecía perderse. Aquí solo cambia la etapa
 * del campo: al agregar una semana el rango se estira hasta ella, al quitar un
 * extremo el rango se encoge y al quitar una del medio queda excluida. Si la
 * semana era de otra etapa, esa otra se recorta para no quedar encima.
 */
/**
 * Deja una etapa ocupando exactamente el rango dado; las demás ceden las
 * semanas que queden dentro, para que no queden dos etapas encima.
 */
export function fijarRangoEtapa(
  año: number,
  fechas: Partial<FechasEtapas>,
  semanasExcluidas: string[],
  etapa: EtapaCronograma,
  desde: number,
  hasta: number,
): ResultadoAjuste {
  const semanas = semanasDeVigencia(año);
  const programadas = programacionDesdeFechas(año, fechas, semanasExcluidas);
  const nuevasFechas: FechasEtapas = { ...fechasVacias(), ...fechas };

  const ponerRango = (e: EtapaCronograma, a: number, b: number) => {
    const campos = CAMPOS_ETAPA[e];
    if (a > b) { nuevasFechas[campos.inicio] = ''; nuevasFechas[campos.fin] = ''; return; }
    nuevasFechas[campos.inicio] = primerDiaHabil(semanas[a - 1]);
    nuevasFechas[campos.fin] = semanas[b - 1].domingo;
  };

  ponerRango(etapa, desde, hasta);
  for (const otra of ['P', 'E', 'C'] as EtapaCronograma[]) {
    if (otra === etapa) continue;
    const suyas = programadas
      .filter((p) => p.etapa === otra)
      .map((p) => p.semana.numero)
      .filter((n) => n < desde || n > hasta);
    if (!suyas.length) { ponerRango(otra, 1, 0); continue; }
    const posteriores = suyas.filter((n) => n > hasta);
    const anteriores = suyas.filter((n) => n < desde);
    const bloque = posteriores.length >= anteriores.length ? posteriores : anteriores;
    ponerRango(otra, bloque[0], bloque[bloque.length - 1]);
  }

  return { fechas: nuevasFechas, semanasExcluidas };
}

/** Semana que queda n semanas útiles más adelante (o atrás, con n negativo). */
export function semanaDesplazada(
  año: number,
  semanasExcluidas: string[],
  desde: number,
  n: number,
): number {
  const semanas = semanasDeVigencia(año);
  const paso = n >= 0 ? 1 : -1;
  let numero = desde;
  let faltan = Math.abs(n);
  while (faltan > 0 && numero + paso >= 1 && numero + paso <= semanas.length) {
    numero += paso;
    const s = semanas[numero - 1];
    if (s && !s.bloqueo && !semanasExcluidas.includes(s.lunes)) faltan -= 1;
  }
  return numero;
}

export function ajustarSemanaEtapa(
  año: number,
  fechas: Partial<FechasEtapas>,
  semanasExcluidas: string[],
  etapa: EtapaCronograma,
  numero: number,
): ResultadoAjuste {
  const semanas = semanasDeVigencia(año);
  const objetivo = semanas[numero - 1];
  if (!objetivo || objetivo.bloqueo) {
    return { fechas: { ...fechasVacias(), ...fechas }, semanasExcluidas };
  }

  const programadas = programacionDesdeFechas(año, fechas, semanasExcluidas);
  const propias = (e: EtapaCronograma) =>
    programadas.filter((p) => p.etapa === e).map((p) => p.semana.numero);
  const nuevasFechas: FechasEtapas = { ...fechasVacias(), ...fechas };
  let excluidas = [...semanasExcluidas];

  const ponerRango = (e: EtapaCronograma, desde: number, hasta: number) => {
    const campos = CAMPOS_ETAPA[e];
    if (desde > hasta) { nuevasFechas[campos.inicio] = ''; nuevasFechas[campos.fin] = ''; return; }
    nuevasFechas[campos.inicio] = primerDiaHabil(semanas[desde - 1]);
    nuevasFechas[campos.fin] = semanas[hasta - 1].domingo;
  };

  const mias = propias(etapa);
  const estado = programadas[numero - 1];

  // Quitar: la semana ya es de esta etapa
  if (estado?.etapa === etapa) {
    const quedan = mias.filter((n) => n !== numero);
    if (!quedan.length) { ponerRango(etapa, 1, 0); return { fechas: nuevasFechas, semanasExcluidas: excluidas }; }
    if (numero > quedan[0] && numero < quedan[quedan.length - 1]) {
      excluidas = [...excluidas, objetivo.lunes]; // hueco en el medio
    }
    ponerRango(etapa, quedan[0], quedan[quedan.length - 1]);
    return { fechas: nuevasFechas, semanasExcluidas: excluidas };
  }

  // Poner: estaba excluida o pertenecía a otra etapa
  excluidas = excluidas.filter((l) => l !== objetivo.lunes);
  const desde = mias.length ? Math.min(mias[0], numero) : numero;
  const hasta = mias.length ? Math.max(mias[mias.length - 1], numero) : numero;
  ponerRango(etapa, desde, hasta);

  // Las demás etapas ceden las semanas que queden dentro del nuevo rango: la
  // etapa crece a costa de la vecina y la auditoría no se alarga.
  for (const otra of ['P', 'E', 'C'] as EtapaCronograma[]) {
    if (otra === etapa) continue;
    const suyas = propias(otra).filter((n) => n < desde || n > hasta);
    if (!suyas.length) { ponerRango(otra, 1, 0); continue; }
    const posteriores = suyas.filter((n) => n > hasta);
    const anteriores = suyas.filter((n) => n < desde);
    // Si le quedan semanas a ambos lados, se queda con el bloque más grande
    const bloque = posteriores.length >= anteriores.length ? posteriores : anteriores;
    ponerRango(otra, bloque[0], bloque[bloque.length - 1]);
  }

  return { fechas: nuevasFechas, semanasExcluidas: excluidas };
}

/**
 * Pinta las semanas a partir de las fechas guardadas de cada etapa, sin
 * recalcular nada: sirve para mostrar una auditoría existente tal cual quedó.
 */
export function programacionDesdeFechas(
  año: number,
  fechas: Partial<FechasEtapas>,
  semanasExcluidas: string[] = [],
): SemanaProgramada[] {
  const semanas = semanasDeVigencia(año);
  const excluidas = new Set(semanasExcluidas);
  const rangos: Array<[EtapaCronograma, string | undefined, string | undefined]> = [
    ['P', fechas.fechaInicioPlaneacion, fechas.fechaFinPlaneacion],
    ['E', fechas.fechaInicioEjecucion, fechas.fechaFinEjecucion],
    ['C', fechas.fechaInicioComunicacion, fechas.fechaFinComunicacion],
  ];

  return semanas.map((semana) => {
    const excluida = excluidas.has(semana.lunes);
    let etapa: EtapaCronograma | undefined;
    if (!excluida && !semana.bloqueo) {
      const rango = rangos.find(([, ini, fin]) => ini && fin && ini.slice(0, 10) <= semana.domingo && fin.slice(0, 10) >= semana.lunes);
      etapa = rango?.[0];
    }
    return { semana, etapa, excluida };
  });
}

export function fechasVacias(): FechasEtapas {
  return { ...FECHAS_VACIAS };
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "16 mar" / "16 mar 2026" para los resúmenes. */
export function fechaCorta(fecha: string, conAño = false): string {
  if (!fecha) return '';
  const d = parseYMD(fecha);
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}${conAño ? ` ${d.getFullYear()}` : ''}`;
}
