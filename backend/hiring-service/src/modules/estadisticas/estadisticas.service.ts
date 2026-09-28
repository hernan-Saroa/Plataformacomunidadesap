import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { EstadoContrato } from '../../entities/contrato.entity';
import { EstadoProceso } from '../../entities/proceso.entity';
import { TipoModificacion } from '../../entities/modificacion-contrato.entity';
import { EstadoPago } from '../../entities/pago-contrato.entity';
import { diasParaVencer, limiteLiquidacion } from '../alertas/alertas.service';

/**
 * Los cinco estados que el módulo de Estadísticas y Reportes tiene que informar
 * (EFDS-1189, numeral 3.1.a).
 *
 * No son los mismos diez de `EstadoContrato`: ese es el ciclo interno del
 * trámite y este es el vocabulario con el que la entidad rinde cuentas. Quien
 * pide el reporte no pregunta cuántos contratos están «perfeccionados» y
 * cuántos «legalizados»; pregunta cuántos se suscribieron.
 */
export type EstadoDeGestion =
  | 'SUSCRITO'
  | 'EJECUCION'
  | 'TERMINADO'
  | 'LIQUIDADO'
  | 'CERRADO';

/** En el orden del ciclo, que es como se lee un informe de gestión. */
export const ESTADOS_DE_GESTION: EstadoDeGestion[] = [
  'SUSCRITO',
  'EJECUCION',
  'TERMINADO',
  'LIQUIDADO',
  'CERRADO',
];

/**
 * A qué estado del informe pertenece un contrato, o a ninguno.
 *
 * Devuelve `null` y no un sexto estado para lo que todavía no es un contrato
 * suscrito: una minuta generada o aceptada no obliga a nadie —falta la firma de
 * las dos partes— y una rechazada nunca obligó. Contarlas inflaría el número de
 * contratos de la entidad con papeles que no lo son, que es justo lo que un
 * informe de gestión no puede hacer.
 *
 * `SUSPENDIDO` cuenta como en ejecución por la misma razón que `alMenos` lo
 * trata así: la suspensión es una pausa sobre ese punto del ciclo, no un
 * escalón anterior. Un contrato suspendido está en ejecución, detenido.
 */
export function estadoDeGestion(estado: EstadoContrato): EstadoDeGestion | null {
  switch (estado) {
    case 'PERFECCIONADO':
    case 'LEGALIZADO':
      return 'SUSCRITO';
    case 'EJECUCION':
    case 'SUSPENDIDO':
      return 'EJECUCION';
    case 'TERMINADO':
      return 'TERMINADO';
    case 'LIQUIDADO':
      return 'LIQUIDADO';
    case 'CERRADO':
      return 'CERRADO';
    // GENERADO, ACEPTADO y RECHAZADO: minutas, no contratos.
    default:
      return null;
  }
}

/**
 * Los estados del ciclo que ya son contrato suscrito.
 *
 * Se derivan de `estadoDeGestion` y no se escriben a mano: la consulta los
 * filtra en SQL y el informe los agrupa en TypeScript, y si las dos listas se
 * separaran un contrato contaría en el total y en ningún estado.
 */
export const ESTADOS_SUSCRITOS: EstadoContrato[] = (
  [
    'GENERADO',
    'ACEPTADO',
    'RECHAZADO',
    'PERFECCIONADO',
    'LEGALIZADO',
    'EJECUCION',
    'SUSPENDIDO',
    'TERMINADO',
    'LIQUIDADO',
    'CERRADO',
  ] as EstadoContrato[]
).filter((e) => estadoDeGestion(e) !== null);

/** Cuántos y por cuánto. Es la forma de todos los cortes del reporte. */
export interface ConteoValor {
  /** Código con el que se agrupó: el estado, la modalidad o la tipología. */
  clave: string;
  /** Cómo se llama en la pantalla y en el archivo descargable. */
  etiqueta: string;
  cuantos: number;
  valor: number;
}

export interface FiltrosEstadisticas {
  /** Año de suscripción. `null` es «toda la contratación». */
  vigencia: number | null;
  /** Código de la modalidad de selección. `null` es «todas». */
  modalidad: string | null;
  /**
   * Código de la tipología del contrato. `null` es «todas».
   *
   * No filtra los procesos de selección: la tipología es del contrato, y un
   * proceso en curso o desierto todavía no tiene ninguna.
   */
  tipologia: string | null;
}

/**
 * Qué hay que mirar de un contrato.
 *
 * Son las situaciones que un informe de seguimiento pregunta —«¿cuáles se nos
 * vencen?», «¿cuáles corren sin supervisor?»— y no una alerta con aviso: el
 * aviso lo manda el módulo de alertas (EFDS-1185); aquí solo se cuentan.
 */
export type SituacionContrato =
  | 'POR_VENCER'
  | 'PLAZO_VENCIDO'
  | 'SUSPENDIDO'
  | 'SIN_SUPERVISOR'
  | 'POR_LIQUIDAR'
  | 'LIQUIDACION_VENCIDA';

/** Una fila del listado de contratos del reporte. */
export interface ContratoDelReporte {
  procesoId: string;
  radicado: string;
  numero: string;
  objeto: string;
  contratista: string;
  tipoPersona: string;
  modalidad: string | null;
  tipologia: string | null;
  /** Estado del informe, que es el que se lee. */
  estado: EstadoDeGestion;
  /** Estado del ciclo, para quien necesita distinguir legalizado de perfeccionado. */
  estadoCiclo: EstadoContrato;
  /** Valor actual, con las adiciones aprobadas. */
  valor: number;
  /** Valor con que se suscribió, antes de las adiciones. */
  valorInicial: number;
  pagado: number;
  porcentajePagado: number;
  suscritoEl: string | null;
  inicioEl: string | null;
  plazoDias: number | null;
  /** Último día del plazo, con las prórrogas y los días suspendidos ya sumados. */
  finDelPlazo: string | null;
  /** Días que le quedan al plazo; negativo si ya pasó. Solo en ejecución. */
  diasParaVencer: number | null;
  modificaciones: number;
  supervisor: string | null;
  situaciones: SituacionContrato[];
}

/** Cuánto tarda un tramo del ciclo, en días calendario. */
export interface ResumenDias {
  promedio: number | null;
  mediana: number | null;
  /** Contratos sobre los que se midió: un promedio de dos no dice lo mismo que uno de doscientos. */
  muestras: number;
}

export interface EstadisticasGestion {
  /** Momento del corte: un informe sin fecha no se puede citar. */
  generadoEn: string;
  filtros: FiltrosEstadisticas;
  contratos: {
    total: number;
    valorTotal: number;
    /** Lo que valían al suscribirse, antes de las adiciones. */
    valorInicial: number;
    valorPromedio: number;
    porEstado: ConteoValor[];
    porModalidad: ConteoValor[];
    porTipologia: ConteoValor[];
    porTipoPersona: ConteoValor[];
    /** Suscripciones por mes, en orden cronológico. La clave es `AAAA-MM`. */
    porMes: ConteoValor[];
    contratistasDistintos: number;
    /** Los diez contratistas con más valor contratado. */
    principalesContratistas: ConteoValor[];
  };
  procesos: {
    total: number;
    valorEstimado: number;
    porDesenlace: ConteoValor[];
    porModalidad: ConteoValor[];
    /** Dónde están los que siguen en curso. La clave es el número de la etapa. */
    enCursoPorEtapa: ConteoValor[];
  };
  presupuesto: {
    /** Suma del valor de los contratos suscritos. */
    contratado: number;
    /** Lo que la Dirección Financiera ya tramitó. */
    pagado: number;
    porPagar: number;
    /** Porcentaje de lo contratado que ya se pagó, con un decimal. */
    porcentajeEjecutado: number;
    /** Cuentas radicadas o avaladas: plata que está por salir. */
    enTramite: number;
    /** Las cuentas de cobro por estado, sin las anuladas. */
    cuentasPorEstado: ConteoValor[];
  };
  modificaciones: {
    /** Modificaciones aprobadas. */
    total: number;
    contratosModificados: number;
    porTipo: ConteoValor[];
    valorAdicionado: number;
    /** Lo adicionado sobre el valor inicial, con un decimal. */
    porcentajeAdicionado: number;
    diasProrrogados: number;
  };
  seguimiento: {
    /** Cuántos contratos hay en cada situación. */
    porSituacion: ConteoValor[];
    /** Casos de presunto incumplimiento sin cerrar. Solo el número: el detalle está bajo reserva. */
    incumplimientosAbiertos: number;
    contratosConIncumplimiento: number;
    /** Hasta cuántos días antes se cuenta un plazo «por vencer». */
    diasDeAnticipacion: number;
  };
  tiempos: {
    radicacionASuscripcion: ResumenDias;
    suscripcionAInicio: ResumenDias;
  };
  contratosDelReporte: ContratoDelReporte[];
  /** Los años en que hay contratos, para que la pantalla ofrezca solo esos. */
  vigenciasDisponibles: number[];
}

/** Cómo se lee cada estado del informe. */
const NOMBRE_DEL_ESTADO: Record<EstadoDeGestion, string> = {
  SUSCRITO: 'Suscritos',
  EJECUCION: 'En ejecución',
  TERMINADO: 'Terminados',
  LIQUIDADO: 'Liquidados',
  CERRADO: 'Cerrados',
};

/** Y cada desenlace del proceso de selección. */
const NOMBRE_DEL_DESENLACE: Record<EstadoProceso, string> = {
  EN_CURSO: 'En curso',
  ADJUDICADO: 'Adjudicados',
  DESIERTO: 'Declarados desiertos',
  // Fila propia y no sumada a los desiertos (EFDS-1183): un proceso negado no
  // salió al mercado, así que contarlo ahí exageraría cuántas convocatorias se
  // quedaron sin oferentes, que es lo que ese indicador mide.
  NEGADO: 'Negados en revisión',
};

const NOMBRE_DE_LA_MODIFICACION: Record<TipoModificacion, string> = {
  ADICION: 'Adiciones',
  PRORROGA: 'Prórrogas',
  CESION: 'Cesiones',
  ACLARATORIO: 'Aclaratorios',
  SUSPENSION: 'Suspensiones',
  REANUDACION: 'Reanudaciones',
  TERMINACION_ANTICIPADA: 'Terminaciones anticipadas',
};

/** En el orden en que una cuenta avanza, que es como se lee la fila. */
const CUENTAS_EN_ORDEN: EstadoPago[] = ['RADICADO', 'DEVUELTO', 'AVALADO', 'TRAMITADO'];

const NOMBRE_DE_LA_CUENTA: Record<EstadoPago, string> = {
  RADICADO: 'Radicadas, por avalar',
  DEVUELTO: 'Devueltas al contratista',
  AVALADO: 'Avaladas, por pagar',
  TRAMITADO: 'Pagadas',
  ANULADO: 'Anuladas',
};

const NOMBRE_DEL_TIPO_DE_PERSONA: Record<string, string> = {
  NATURAL: 'Persona natural',
  JURIDICA: 'Persona jurídica',
};

/** Los nombres de las diez etapas, como los escribe la matriz. */
const NOMBRE_DE_LA_ETAPA: Record<number, string> = {
  1: 'Identificación y planeación',
  2: 'Plan Anual de Adquisiciones',
  3: 'Estudios previos',
  4: 'CDP',
  5: 'Elaboración y publicación del proceso',
  6: 'Recepción y evaluación de ofertas',
  7: 'Adjudicación',
  8: 'Perfeccionamiento y legalización',
  9: 'Ejecución y supervisión',
  10: 'Seguimiento, control y liquidación',
};

/** En el orden en que se atienden: primero lo que ya está vencido. */
const SITUACIONES_EN_ORDEN: SituacionContrato[] = [
  'PLAZO_VENCIDO',
  'LIQUIDACION_VENCIDA',
  'SIN_SUPERVISOR',
  'POR_VENCER',
  'SUSPENDIDO',
  'POR_LIQUIDAR',
];

const NOMBRE_DE_LA_SITUACION: Record<SituacionContrato, string> = {
  PLAZO_VENCIDO: 'En ejecución con el plazo vencido',
  LIQUIDACION_VENCIDA: 'Sin liquidar y vencido el plazo de común acuerdo',
  SIN_SUPERVISOR: 'En ejecución sin supervisor designado',
  POR_VENCER: 'Plazo por vencer',
  SUSPENDIDO: 'Suspendidos',
  POR_LIQUIDAR: 'Terminados, pendientes de liquidar',
};

/**
 * Cuántos días antes cuenta un plazo como «por vencer».
 *
 * Treinta y no el parámetro de las alertas: aquel decide cuándo avisar a una
 * persona, este cuántos contratos hay que mirar este mes, que es la pregunta
 * con la que se lee un informe mensual.
 */
export const DIAS_POR_VENCER = 30;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** «2026-03» → «mar 2026». */
export function nombreDelMes(clave: string): string {
  const [anio, mes] = clave.split('-');
  return `${MESES[Number(mes) - 1] ?? mes} ${anio}`;
}

/** Suma días a una fecha `AAAA-MM-DD` sin que la hora local la corra. */
function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * El último día del plazo de ejecución.
 *
 * El día del acta de inicio es el primero del plazo, así que un contrato de
 * treinta días que arranca el 1 termina el 30 y no el 31. Las prórrogas y los
 * días suspendidos no se suman aquí porque ya están en `plazo_dias`: aprobar la
 * prórroga y reanudar la suspensión lo actualizan (EFDS-1177 y 1178).
 */
export function finDelPlazo(inicio: string | null, plazoDias: number | null): string | null {
  if (!inicio || !plazoDias || plazoDias <= 0) return null;
  return sumarDias(inicio, plazoDias - 1);
}

/** Días entre dos fechas `AAAA-MM-DD`; `null` si falta alguna o el orden no tiene sentido. */
export function diasEntre(desde: string | null, hasta: string | null): number | null {
  if (!desde || !hasta) return null;
  const dias = diasParaVencer(hasta, desde);
  // Un tramo negativo es un dato mal cargado —un acta de inicio anterior a la
  // firma—, no un contrato que se hizo en menos de cero días. Meterlo en el
  // promedio lo bajaría y escondería el error.
  return dias < 0 ? null : dias;
}

/**
 * Promedio y mediana de un tramo.
 *
 * Las dos, porque un proceso que se quedó un año quieto dispara el promedio y
 * la mediana sigue diciendo cuánto tarda uno normal.
 */
export function resumenDeDias(valores: (number | null)[]): ResumenDias {
  const medidos = valores.filter((v): v is number => v !== null).sort((a, b) => a - b);
  if (medidos.length === 0) return { promedio: null, mediana: null, muestras: 0 };

  const suma = medidos.reduce((s, v) => s + v, 0);
  const mitad = Math.floor(medidos.length / 2);
  const mediana =
    medidos.length % 2 === 0 ? (medidos[mitad - 1] + medidos[mitad]) / 2 : medidos[mitad];

  return {
    promedio: Math.round((suma / medidos.length) * 10) / 10,
    mediana,
    muestras: medidos.length,
  };
}

/** Un porcentaje con un decimal, y cero si no hay sobre qué calcularlo. */
function porcentaje(parte: number, todo: number): number {
  return todo === 0 ? 0 : Math.round((parte / todo) * 1000) / 10;
}

/** Una fila cruda del corte de contratos: un contrato. */
export interface FilaContrato {
  proceso_id: string;
  radicado: string;
  numero: string;
  objeto: string;
  estado: EstadoContrato;
  modalidad: string | null;
  tipologia: string | null;
  contratista_documento: string;
  contratista_nombre: string;
  contratista_tipo: string;
  valor: number;
  plazo_dias: number | null;
  radicado_el: string | null;
  suscrito_el: string | null;
  inicio_el: string | null;
  actualizado_el: string | null;
  pagado: number;
  adicionado: number;
  dias_prorroga: number;
  modificaciones: number;
  terminacion_el: string | null;
  supervisor: string | null;
  incumplimientos_abiertos: number;
}

/**
 * En qué situaciones está un contrato hoy.
 *
 * Función aparte y pura porque son reglas con fechas: probarlas contra la base
 * obligaría a fabricar contratos con actas de hace meses.
 */
export function situacionesDe(fila: FilaContrato, hoy: string): SituacionContrato[] {
  const situaciones: SituacionContrato[] = [];

  if (fila.estado === 'SUSPENDIDO') situaciones.push('SUSPENDIDO');

  if (fila.estado === 'EJECUCION' || fila.estado === 'SUSPENDIDO') {
    // Un contrato corre sin supervisor solo por descuido: la designación es
    // requisito del acta de inicio, pero un relevo sin reemplazo lo deja así.
    if (!fila.supervisor) situaciones.push('SIN_SUPERVISOR');
  }

  // Suspendido no: su plazo está detenido y `plazo_dias` todavía no tiene los
  // días de la pausa —se suman al reanudar—, así que el fin calculado mentiría.
  if (fila.estado === 'EJECUCION') {
    const fin = finDelPlazo(fila.inicio_el, fila.plazo_dias);
    if (fin) {
      const dias = diasParaVencer(fin, hoy);
      if (dias < 0) situaciones.push('PLAZO_VENCIDO');
      else if (dias <= DIAS_POR_VENCER) situaciones.push('POR_VENCER');
    }
  }

  if (fila.estado === 'TERMINADO') {
    situaciones.push('POR_LIQUIDAR');
    // Terminó cuando lo dice la terminación anticipada; si no la hubo, cuando
    // se le acabó el plazo; y si el expediente no deja calcularlo, cuando
    // cambió de estado, que es lo mismo que usa la alerta de liquidación.
    const termino =
      fila.terminacion_el ?? finDelPlazo(fila.inicio_el, fila.plazo_dias) ?? fila.actualizado_el;
    if (termino && limiteLiquidacion(termino) < hoy) situaciones.push('LIQUIDACION_VENCIDA');
  }

  return situaciones;
}

/**
 * Suma las filas por una de sus columnas y las ordena de mayor a menor.
 *
 * De mayor a menor y no alfabético porque un informe de gestión se lee de
 * arriba: lo primero que se quiere saber es en qué modalidad se contrató más.
 */
function agrupar<T>(
  filas: T[],
  clave: (fila: T) => string | null,
  etiqueta: (codigo: string, fila: T) => string,
  medida: (fila: T) => { cuantos: number; valor: number },
): ConteoValor[] {
  const acumulado = new Map<string, ConteoValor>();

  for (const fila of filas) {
    const codigo = clave(fila);
    // Sin clasificar no es una categoría: los procesos anteriores a que la
    // modalidad fuera obligatoria no tienen ninguna, y agruparlos bajo un
    // «(sin modalidad)» inventaría una que el expediente no dice.
    if (!codigo) continue;

    const { cuantos, valor } = medida(fila);
    const previo = acumulado.get(codigo) ?? {
      clave: codigo,
      etiqueta: etiqueta(codigo, fila),
      cuantos: 0,
      valor: 0,
    };
    acumulado.set(codigo, {
      ...previo,
      cuantos: previo.cuantos + cuantos,
      valor: previo.valor + valor,
    });
  }

  return [...acumulado.values()].sort((a, b) => b.valor - a.valor || b.cuantos - a.cuantos);
}

/** Ordena un corte según una lista de claves; lo que no está en la lista va al final. */
function enOrden(cortes: ConteoValor[], orden: string[]): ConteoValor[] {
  const posicion = (clave: string) => {
    const i = orden.indexOf(clave);
    return i === -1 ? orden.length : i;
  };
  return [...cortes].sort((a, b) => posicion(a.clave) - posicion(b.clave));
}

/** Una fila cruda del agrupamiento de procesos. */
interface FilaProceso {
  estado: EstadoProceso;
  etapa: number;
  modalidad: string | null;
  cuantos: number;
  valor: number;
}

/**
 * Estadísticas y reportes de gestión — transversal (EFDS-1189, numeral 3.1.a).
 *
 * No hay tabla de estadísticas y no la habrá: se calculan al consultar, por lo
 * mismo que las alertas de vencimiento (EFDS-1185). Un contador guardado se
 * desincroniza en cuanto un contrato pasa a liquidado, y un informe que no
 * cuadra con el expediente es peor que no tener informe.
 */
@Injectable()
export class EstadisticasService {
  constructor(private readonly dataSource: DataSource) {}

  /** Hoy en Colombia: a las 8 p. m. en UTC ya es mañana y un plazo vencería antes de tiempo. */
  protected hoy(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }

  async gestion(filtros: FiltrosEstadisticas): Promise<EstadisticasGestion> {
    const [filas, procesos, modificaciones, cuentas, nombres, vigencias] = await Promise.all([
      this.contratosDelCorte(filtros),
      this.procesosAgrupados(filtros),
      this.modificacionesPorTipo(filtros),
      this.cuentasPorEstado(filtros),
      this.nombresDeCatalogo(),
      this.vigenciasConContratos(),
    ]);
    const hoy = this.hoy();

    // El estado del informe se deriva aquí y no en SQL: la equivalencia entre
    // los diez estados del ciclo y los cinco del informe es una regla de
    // negocio con su porqué, y escrita en un CASE del `GROUP BY` no se puede
    // probar sin base de datos. El filtro repite el de la consulta a propósito.
    const contratos = filas.filter((f) => estadoDeGestion(f.estado) !== null);
    const uno = (f: FilaContrato) => ({ cuantos: 1, valor: f.valor });
    const nombreModalidad = (codigo: string) => nombres.modalidades.get(codigo) ?? codigo;
    const nombreTipologia = (codigo: string) => nombres.tipologias.get(codigo) ?? codigo;

    const total = contratos.length;
    const contratado = contratos.reduce((suma, f) => suma + f.valor, 0);
    const adicionado = contratos.reduce((suma, f) => suma + f.adicionado, 0);
    const pagado = contratos.reduce((suma, f) => suma + f.pagado, 0);
    const valorInicial = contratado - adicionado;

    const porContratista = agrupar(
      contratos,
      (f) => f.contratista_documento,
      (_codigo, f) => f.contratista_nombre,
      uno,
    );

    const delReporte: ContratoDelReporte[] = contratos.map((f) => {
      const fin = finDelPlazo(f.inicio_el, f.plazo_dias);
      return {
        procesoId: f.proceso_id,
        radicado: f.radicado,
        numero: f.numero,
        objeto: f.objeto,
        contratista: f.contratista_nombre,
        tipoPersona: NOMBRE_DEL_TIPO_DE_PERSONA[f.contratista_tipo] ?? f.contratista_tipo,
        modalidad: f.modalidad ? nombreModalidad(f.modalidad) : null,
        tipologia: f.tipologia ? nombreTipologia(f.tipologia) : null,
        estado: estadoDeGestion(f.estado) as EstadoDeGestion,
        estadoCiclo: f.estado,
        valor: f.valor,
        valorInicial: f.valor - f.adicionado,
        pagado: f.pagado,
        porcentajePagado: porcentaje(f.pagado, f.valor),
        suscritoEl: f.suscrito_el,
        inicioEl: f.inicio_el,
        plazoDias: f.plazo_dias,
        finDelPlazo: fin,
        diasParaVencer: fin && f.estado === 'EJECUCION' ? diasParaVencer(fin, hoy) : null,
        modificaciones: f.modificaciones,
        supervisor: f.supervisor,
        situaciones: situacionesDe(f, hoy),
      };
    });

    const situaciones = SITUACIONES_EN_ORDEN.map((s) => {
      const en = delReporte.filter((c) => c.situaciones.includes(s));
      return {
        clave: s,
        etiqueta: NOMBRE_DE_LA_SITUACION[s],
        cuantos: en.length,
        valor: en.reduce((suma, c) => suma + c.valor, 0),
      };
    });

    const enCurso = procesos.filter((p) => p.estado === 'EN_CURSO');
    const porProceso = (p: FilaProceso) => ({ cuantos: p.cuantos, valor: p.valor });
    const porTipo = enOrden(modificaciones, Object.keys(NOMBRE_DE_LA_MODIFICACION));

    return {
      generadoEn: new Date().toISOString(),
      filtros,
      contratos: {
        total,
        valorTotal: contratado,
        valorInicial,
        valorPromedio: total === 0 ? 0 : Math.round(contratado / total),
        porEstado: enOrden(
          agrupar(
            contratos,
            (f) => estadoDeGestion(f.estado),
            (codigo) => NOMBRE_DEL_ESTADO[codigo as EstadoDeGestion] ?? codigo,
            uno,
          ),
          // Este corte sí va en el orden del ciclo y no por valor: son las
          // etapas de una misma línea, y ordenarlas por plata las descoloca.
          ESTADOS_DE_GESTION,
        ),
        porModalidad: agrupar(contratos, (f) => f.modalidad, nombreModalidad, uno),
        porTipologia: agrupar(contratos, (f) => f.tipologia, nombreTipologia, uno),
        porTipoPersona: agrupar(
          contratos,
          (f) => f.contratista_tipo,
          (codigo) => NOMBRE_DEL_TIPO_DE_PERSONA[codigo] ?? codigo,
          uno,
        ),
        // Cronológico y no por valor: es una serie, y se lee de izquierda a derecha.
        porMes: agrupar(
          contratos,
          (f) => f.suscrito_el?.slice(0, 7) ?? null,
          nombreDelMes,
          uno,
        ).sort((a, b) => a.clave.localeCompare(b.clave)),
        contratistasDistintos: porContratista.length,
        principalesContratistas: porContratista.slice(0, 10),
      },
      procesos: {
        total: procesos.reduce((suma, p) => suma + p.cuantos, 0),
        valorEstimado: procesos.reduce((suma, p) => suma + p.valor, 0),
        porDesenlace: agrupar(
          procesos,
          (p) => p.estado,
          (codigo) => NOMBRE_DEL_DESENLACE[codigo as EstadoProceso] ?? codigo,
          porProceso,
        ).sort((a, b) => b.cuantos - a.cuantos),
        porModalidad: agrupar(procesos, (p) => p.modalidad, nombreModalidad, porProceso).sort(
          (a, b) => b.cuantos - a.cuantos,
        ),
        // En el orden de las etapas: es un embudo, y se lee de la primera a la última.
        enCursoPorEtapa: agrupar(
          enCurso,
          (p) => String(p.etapa),
          (codigo) => `${codigo}. ${NOMBRE_DE_LA_ETAPA[Number(codigo)] ?? 'Etapa'}`,
          porProceso,
        ).sort((a, b) => Number(a.clave) - Number(b.clave)),
      },
      presupuesto: {
        contratado,
        pagado,
        // Puede dar negativo si se pagó más de lo contratado, y así se informa:
        // taparlo con un `Math.max(0, ...)` escondería justamente el caso que
        // hay que revisar.
        porPagar: contratado - pagado,
        porcentajeEjecutado: porcentaje(pagado, contratado),
        enTramite: cuentas
          .filter((c) => c.clave === 'RADICADO' || c.clave === 'AVALADO')
          .reduce((suma, c) => suma + c.valor, 0),
        cuentasPorEstado: cuentas,
      },
      modificaciones: {
        total: porTipo.reduce((suma, m) => suma + m.cuantos, 0),
        contratosModificados: contratos.filter((f) => f.modificaciones > 0).length,
        porTipo,
        valorAdicionado: adicionado,
        porcentajeAdicionado: porcentaje(adicionado, valorInicial),
        diasProrrogados: contratos.reduce((suma, f) => suma + f.dias_prorroga, 0),
      },
      seguimiento: {
        porSituacion: situaciones,
        incumplimientosAbiertos: contratos.reduce((s, f) => s + f.incumplimientos_abiertos, 0),
        contratosConIncumplimiento: contratos.filter((f) => f.incumplimientos_abiertos > 0)
          .length,
        diasDeAnticipacion: DIAS_POR_VENCER,
      },
      tiempos: {
        radicacionASuscripcion: resumenDeDias(
          contratos.map((f) => diasEntre(f.radicado_el, f.suscrito_el)),
        ),
        suscripcionAInicio: resumenDeDias(
          contratos.map((f) => diasEntre(f.suscrito_el, f.inicio_el)),
        ),
      },
      contratosDelReporte: delReporte.sort(
        (a, b) => (b.suscritoEl ?? '').localeCompare(a.suscritoEl ?? '') || b.valor - a.valor,
      ),
      vigenciasDisponibles: vigencias,
    };
  }

  /**
   * Los contratos del corte, uno por fila, con lo que el informe necesita de
   * cada uno ya sumado: lo pagado, lo adicionado, el supervisor.
   *
   * Una sola consulta y no una por sección: todos los cortes se sacan del mismo
   * conjunto de filas, y pedirlo varias veces obligaría a que coincidieran —si
   * entre una y otra alguien firma un contrato, los totales dejan de cuadrar
   * entre secciones del mismo informe—.
   *
   * La vigencia es el año de la firma y no el de la minuta: una minuta de
   * diciembre firmada en enero es contratación del año nuevo. Los contratos
   * anteriores a que se guardara la fecha de firma caen al de la minuta.
   *
   * Las fechas salen como texto en hora de Colombia: el driver convierte `date`
   * a medianoche local, y en un servidor en UTC eso corre el día hacia atrás.
   */
  private async contratosDelCorte(filtros: FiltrosEstadisticas): Promise<FilaContrato[]> {
    const filas = await this.dataSource.query(
      `
      -- corte: contratos
      SELECT p.id::text                    AS proceso_id,
             p.radicado                    AS radicado,
             c.numero                      AS numero,
             c.objeto                      AS objeto,
             c.estado                      AS estado,
             p.modalidad                   AS modalidad,
             c.tipologia                   AS tipologia,
             c.contratista_documento       AS contratista_documento,
             c.contratista_nombre          AS contratista_nombre,
             c.contratista_tipo            AS contratista_tipo,
             COALESCE(c.valor, 0)::text    AS valor,
             c.plazo_dias                  AS plazo_dias,
             to_char(p.fecha_radicacion AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD') AS radicado_el,
             to_char(COALESCE(c.perfeccionado_at, c.generado_at) AT TIME ZONE 'America/Bogota',
                     'YYYY-MM-DD')         AS suscrito_el,
             to_char(c.ejecucion_desde, 'YYYY-MM-DD') AS inicio_el,
             to_char(c.updated_at AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD') AS actualizado_el,
             COALESCE(pg.pagado, 0)::text  AS pagado,
             COALESCE(md.adicionado, 0)::text AS adicionado,
             COALESCE(md.dias_prorroga, 0)::int AS dias_prorroga,
             COALESCE(md.modificaciones, 0)::int AS modificaciones,
             to_char(md.terminacion_el, 'YYYY-MM-DD') AS terminacion_el,
             sv.nombre                     AS supervisor,
             COALESCE(ci.abiertos, 0)::int AS incumplimientos_abiertos
        FROM hiring.contratos c
        JOIN hiring.procesos  p ON p.id = c.proceso_id
        LEFT JOIN LATERAL (
             SELECT SUM(valor) AS pagado
               FROM hiring.pagos_contrato
              WHERE contrato_id = c.id AND estado = 'TRAMITADO'
        ) pg ON true
        LEFT JOIN LATERAL (
             SELECT COUNT(*)                                                  AS modificaciones,
                    SUM(valor_adicionado) FILTER (WHERE tipo = 'ADICION')     AS adicionado,
                    SUM(dias_prorroga)    FILTER (WHERE tipo = 'PRORROGA')    AS dias_prorroga,
                    MAX(terminacion_el)   FILTER (WHERE tipo = 'TERMINACION_ANTICIPADA')
                                                                              AS terminacion_el
               FROM hiring.modificaciones_contrato
              WHERE contrato_id = c.id AND estado = 'APROBADA'
        ) md ON true
        LEFT JOIN LATERAL (
             SELECT nombre
               FROM hiring.supervisiones_contrato
              WHERE contrato_id = c.id AND estado = 'VIGENTE'
              ORDER BY fecha_designacion DESC
              LIMIT 1
        ) sv ON true
        LEFT JOIN LATERAL (
             SELECT COUNT(*) AS abiertos
               FROM hiring.casos_incumplimiento
              WHERE contrato_id = c.id AND estado IN ('REPORTADO', 'EN_TRAMITE')
        ) ci ON true
       WHERE c.estado = ANY($1::text[])
         AND ($2::int  IS NULL OR EXTRACT(YEAR FROM COALESCE(c.perfeccionado_at, c.generado_at)
                                           AT TIME ZONE 'America/Bogota') = $2)
         AND ($3::text IS NULL OR p.modalidad = $3)
         AND ($4::text IS NULL OR c.tipologia = $4)
      `,
      [ESTADOS_SUSCRITOS, filtros.vigencia, filtros.modalidad, filtros.tipologia],
    );

    return filas.map((f: any) => ({
      ...f,
      // `numeric` llega como cadena; sumarlo sin convertir concatena.
      valor: Number(f.valor),
      pagado: Number(f.pagado),
      adicionado: Number(f.adicionado),
      dias_prorroga: Number(f.dias_prorroga ?? 0),
      modificaciones: Number(f.modificaciones ?? 0),
      incumplimientos_abiertos: Number(f.incumplimientos_abiertos ?? 0),
      plazo_dias: f.plazo_dias === null || f.plazo_dias === undefined ? null : Number(f.plazo_dias),
    }));
  }

  /**
   * Los procesos de selección agrupados por desenlace, etapa y modalidad.
   *
   * Se cuentan aparte de los contratos porque no son lo mismo: un proceso
   * declarado desierto no produjo contrato y aun así es gestión de la entidad
   * —de hecho es el indicador que más se pregunta—. Su vigencia es el año en
   * que se radicó, y la tipología no los filtra: todavía no tienen contrato.
   */
  private async procesosAgrupados(filtros: FiltrosEstadisticas): Promise<FilaProceso[]> {
    const filas = await this.dataSource.query(
      `
      -- corte: procesos
      SELECT p.estado                                 AS estado,
             p.etapa                                  AS etapa,
             p.modalidad                              AS modalidad,
             COUNT(*)::int                            AS cuantos,
             COALESCE(SUM(p.valor_estimado), 0)::text AS valor
        FROM hiring.procesos p
       WHERE ($1::int  IS NULL OR EXTRACT(YEAR FROM p.fecha_radicacion AT TIME ZONE 'America/Bogota') = $1)
         AND ($2::text IS NULL OR p.modalidad = $2)
       GROUP BY p.estado, p.etapa, p.modalidad
      `,
      [filtros.vigencia, filtros.modalidad],
    );

    return filas.map((f: any) => ({
      estado: f.estado,
      etapa: Number(f.etapa),
      modalidad: f.modalidad,
      cuantos: Number(f.cuantos),
      valor: Number(f.valor),
    }));
  }

  /**
   * Las modificaciones aprobadas de los contratos del corte, por tipo.
   *
   * El valor es lo adicionado, y solo lo tienen las adiciones: una prórroga no
   * mueve plata, y sumarle el valor del contrato la haría ver como si lo hiciera.
   */
  private async modificacionesPorTipo(filtros: FiltrosEstadisticas): Promise<ConteoValor[]> {
    const filas = await this.dataSource.query(
      `
      -- corte: modificaciones
      SELECT m.tipo                                     AS tipo,
             COUNT(*)::int                              AS cuantos,
             COALESCE(SUM(m.valor_adicionado), 0)::text AS valor
        FROM hiring.modificaciones_contrato m
        JOIN hiring.contratos c ON c.id = m.contrato_id
        JOIN hiring.procesos  p ON p.id = c.proceso_id
       WHERE m.estado = 'APROBADA'
         AND c.estado = ANY($1::text[])
         AND ($2::int  IS NULL OR EXTRACT(YEAR FROM COALESCE(c.perfeccionado_at, c.generado_at)
                                           AT TIME ZONE 'America/Bogota') = $2)
         AND ($3::text IS NULL OR p.modalidad = $3)
         AND ($4::text IS NULL OR c.tipologia = $4)
       GROUP BY m.tipo
      `,
      [ESTADOS_SUSCRITOS, filtros.vigencia, filtros.modalidad, filtros.tipologia],
    );

    return filas.map((f: any) => ({
      clave: f.tipo,
      etiqueta: NOMBRE_DE_LA_MODIFICACION[f.tipo as TipoModificacion] ?? f.tipo,
      cuantos: Number(f.cuantos),
      valor: Number(f.valor),
    }));
  }

  /**
   * Las cuentas de cobro de los contratos del corte, por estado.
   *
   * Sin las anuladas: una cuenta anulada nunca fue un cobro, y dejarla en la
   * fila sumaría plata que nadie va a pagar.
   */
  private async cuentasPorEstado(filtros: FiltrosEstadisticas): Promise<ConteoValor[]> {
    const filas = await this.dataSource.query(
      `
      -- corte: cuentas de cobro
      SELECT pg.estado                        AS estado,
             COUNT(*)::int                    AS cuantos,
             COALESCE(SUM(pg.valor), 0)::text AS valor
        FROM hiring.pagos_contrato pg
        JOIN hiring.contratos c ON c.id = pg.contrato_id
        JOIN hiring.procesos  p ON p.id = c.proceso_id
       WHERE pg.estado <> 'ANULADO'
         AND c.estado = ANY($1::text[])
         AND ($2::int  IS NULL OR EXTRACT(YEAR FROM COALESCE(c.perfeccionado_at, c.generado_at)
                                           AT TIME ZONE 'America/Bogota') = $2)
         AND ($3::text IS NULL OR p.modalidad = $3)
         AND ($4::text IS NULL OR c.tipologia = $4)
       GROUP BY pg.estado
      `,
      [ESTADOS_SUSCRITOS, filtros.vigencia, filtros.modalidad, filtros.tipologia],
    );

    return enOrden(
      filas.map((f: any) => ({
        clave: f.estado,
        etiqueta: NOMBRE_DE_LA_CUENTA[f.estado as EstadoPago] ?? f.estado,
        cuantos: Number(f.cuantos),
        valor: Number(f.valor),
      })),
      CUENTAS_EN_ORDEN,
    );
  }

  /**
   * Cómo se llaman las modalidades y las tipologías.
   *
   * Se traen sin filtrar por activas: un contrato firmado bajo una modalidad
   * que después se retiró del catálogo sigue existiendo, y dejarlo con el
   * código crudo en el informe lo volvería ilegible.
   */
  private async nombresDeCatalogo(): Promise<{
    modalidades: Map<string, string>;
    tipologias: Map<string, string>;
  }> {
    const [modalidades, tipologias] = await Promise.all([
      this.dataSource.query(`SELECT codigo, nombre FROM hiring.modalidades`),
      this.dataSource.query(`SELECT codigo, nombre FROM hiring.tipologias_contrato`),
    ]);

    return {
      modalidades: new Map(modalidades.map((m: any) => [m.codigo, m.nombre])),
      tipologias: new Map(tipologias.map((t: any) => [t.codigo, t.nombre])),
    };
  }

  /** Los años en que se firmó algún contrato, del más reciente al más viejo. */
  private async vigenciasConContratos(): Promise<number[]> {
    const filas = await this.dataSource.query(
      `
      -- vigencias
      SELECT DISTINCT EXTRACT(YEAR FROM COALESCE(perfeccionado_at, generado_at)
                              AT TIME ZONE 'America/Bogota')::int AS anio
        FROM hiring.contratos
       WHERE estado = ANY($1::text[])
       ORDER BY anio DESC
      `,
      [ESTADOS_SUSCRITOS],
    );

    return filas.map((f: any) => Number(f.anio));
  }
}
