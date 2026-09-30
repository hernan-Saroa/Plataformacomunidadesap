import { cubre } from '../../auth/alcance';
import { AccionAlcance, ResponsableDeLugar } from '../../types';
import {
  actividadesDisponibles,
  estaTerminada,
  motivoDelBloqueo,
  NUNCA_BLOQUEA,
  PasoDelFlujo,
} from './secuenciaActividades';

/**
 * En qué momento está el proceso, dicho por lo que hay que hacer y no por el
 * numeral.
 *
 * El riel cuenta la matriz —3.1, 3.3, 3.5…— y eso no le dice a nadie si el
 * proceso avanza ni a quién esperar. Estos momentos son los que la gente
 * reconoce: se redacta, se asigna, se revisa, se tramita.
 */
export type Momento =
  | 'redaccion'
  | 'asignacion'
  | 'revision'
  | 'tramite'
  | 'ejecucion'
  | 'terminado'
  | 'negado';

/** Un paso del flujo con lo que hace falta para nombrarlo. */
export interface PasoConDatos extends PasoDelFlujo {
  nombre: string;
  etapa: number;
  actualizadoEn?: string | null;
  /** El cargo que Configuración le puso; manda sobre los roles del alcance. */
  responsableCargo?: string | null;
}

export interface Persona {
  nombre: string;
  esMio?: boolean;
}

export interface EntradaSituacion {
  /**
   * El flujo en el orden de la matriz. La 3.1 lleva el estado del estudio
   * previo, que es de donde sale el suyo.
   */
  pasos: PasoConDatos[];
  participacion?: {
    contratacion?: Persona | null;
    abogado?: Persona | null;
    financiera?: Persona | null;
  };
  /** Quien mira radicó el proceso: es el área que redacta. */
  radicadoPorMi?: boolean;
  /** Qué roles responden por cada punto (`GET /alcance/responsables`). */
  responsables?: ResponsableDeLugar[];
  /**
   * Si quien mira puede hacer la acción en el punto.
   *
   * Opcional a propósito: `puedeEn` responde que sí mientras el alcance no ha
   * llegado, y pasarlo antes de tiempo le diría «te toca» a todo el mundo. Sin
   * él, el «te toca» sale solo de las personas a cargo.
   */
  puedo?: (accion: AccionAlcance, lugar: string) => boolean;
}

export interface Situacion {
  momento: Momento;
  /** La actividad donde está el proceso, para llevar a ella. */
  numeral: string | null;
  /** Lo que está pasando, como lo diría una persona. */
  titulo: string;
  etapa: number | null;
  /** A quién le toca: una persona, un cargo o los roles que pueden actuar. */
  quien: string | null;
  /** Le toca a quien mira. */
  teToca: boolean;
  /** Por qué está detenido o qué está esperando, si hace falta decirlo. */
  espera: string | null;
  /** La última vez que algo se movió en el proceso. */
  ultimoMovimiento: string | null;
}

const ESTUDIO_PREVIO = '3.1';
const RADICACION = '3.3';
/**
 * La revisión del estudio previo. No se busca como paso aparte: vive en la
 * 3.1 enviada, igual que en el riel (EFDS-1183).
 */
const REVISION = '3.4';
/** Actividades del CDP que atiende la Financiera que lo tomó. */
const DE_LA_FINANCIERA = ['4.2', '4.3'];
/** La reunión de inicio: desde ahí el contrato está en ejecución. */
const INICIO_EJECUCION = '9.1';

/** La fecha más reciente entre las de los pasos. */
function ultimaFecha(pasos: PasoConDatos[]): string | null {
  let ultima: string | null = null;
  for (const p of pasos) {
    if (p.actualizadoEn && (!ultima || p.actualizadoEn > ultima)) ultima = p.actualizadoEn;
  }
  return ultima;
}

/**
 * Los roles que pueden hacer la acción en el punto, del más cercano al más
 * general.
 *
 * Un administrador con alcance sobre todo el módulo puede actuar en cualquier
 * parte, pero nombrarlo en cada punto taparía a quien de verdad responde por
 * él. Se prefiere el alcance del punto, luego el de la etapa y solo al final
 * el de todo el módulo.
 */
export function rolesQuePueden(
  responsables: ResponsableDeLugar[],
  accion: Exclude<AccionAlcance, 'ver'>,
  numeral: string,
): string[] {
  const etapa = `E${Number.parseInt(numeral, 10)}`;
  const deLaAccion = responsables.filter((r) => r.accion === accion && cubre(r.lugar, numeral));

  for (const lugar of [numeral, etapa, 'TODO']) {
    const nombres = [...new Set(deLaAccion.filter((r) => r.lugar === lugar).map((r) => r.rol))];
    if (nombres.length) return nombres;
  }
  return [];
}

/** «A o B», «A, B o C». */
function unaDeEstas(nombres: string[]): string | null {
  if (nombres.length === 0) return null;
  if (nombres.length === 1) return nombres[0];
  return `${nombres.slice(0, -1).join(', ')} o ${nombres[nombres.length - 1]}`;
}

/**
 * Qué está pasando en el proceso, a quién le toca y por qué espera.
 *
 * No añade reglas: lee la misma secuencia que el riel
 * (`actividadesDisponibles`, `motivoDelBloqueo`) y la misma participación que
 * la radicación, y las junta en una sola respuesta. Así el listado, la ficha
 * del proceso y la bandeja dicen lo mismo, y lo dicen sin tener que abrir la
 * actividad.
 */
export function situacionDelProceso(entrada: EntradaSituacion): Situacion {
  const { participacion = {}, responsables = [], puedo } = entrada;
  // La 3.4 no es un paso aparte: es la 3.1 enviada. Contarla la dejaría como
  // «lo siguiente» en procesos que ya pasaron la revisión.
  const pasos = entrada.pasos.filter((p) => p.numeral !== REVISION);
  const ultimoMovimiento = ultimaFecha(pasos);

  const puedoEn = (accion: AccionAlcance, numeral: string) => puedo?.(accion, numeral) ?? false;

  /** Quién responde por un paso: persona a cargo, cargo configurado o roles. */
  const responsableDe = (
    paso: PasoConDatos,
    acciones: Exclude<AccionAlcance, 'ver'>[],
  ): { quien: string | null; teToca: boolean; accion: Exclude<AccionAlcance, 'ver'> } => {
    const accionPrincipal = acciones[0];

    if (DE_LA_FINANCIERA.includes(paso.numeral) && participacion.financiera) {
      return {
        quien: participacion.financiera.nombre,
        teToca: !!participacion.financiera.esMio,
        accion: accionPrincipal,
      };
    }

    for (const accion of acciones) {
      const roles = rolesQuePueden(responsables, accion, paso.numeral);
      if (roles.length || paso.responsableCargo) {
        return {
          quien: paso.responsableCargo || unaDeEstas(roles),
          teToca: puedoEn(accion, paso.numeral),
          accion,
        };
      }
    }
    return { quien: null, teToca: puedoEn(accionPrincipal, paso.numeral), accion: accionPrincipal };
  };

  const base = (paso: PasoConDatos | null) => ({
    numeral: paso?.numeral ?? null,
    etapa: paso?.etapa ?? null,
    ultimoMovimiento,
  });

  const estudio = pasos.find((p) => p.numeral === ESTUDIO_PREVIO) ?? null;

  if (estudio?.estado === 'NEGADO') {
    return {
      ...base(estudio),
      momento: 'negado',
      titulo: 'Proceso negado',
      quien: null,
      teToca: false,
      espera: 'La contratación no procede: el proceso terminó en la revisión del estudio previo',
    };
  }

  /*
   * Lo devuelto manda sobre lo que viene después: es la única actividad que
   * pide volver atrás, y puede estar antes en el flujo —el comité aprueba la
   * 3.7 y reabre la 3.1—.
   */
  const devuelta = pasos.find((p) => p.aplica && p.construida && p.estado === 'DEVUELTO');
  if (devuelta) {
    const esElEstudio = devuelta.numeral === ESTUDIO_PREVIO;
    const r = esElEstudio
      ? { quien: 'Área solicitante', teToca: !!entrada.radicadoPorMi }
      : responsableDe(devuelta, ['editar', 'decidir']);
    return {
      ...base(devuelta),
      momento: esElEstudio ? 'redaccion' : 'tramite',
      titulo: `Corregir: ${devuelta.nombre}`,
      quien: r.quien,
      teToca: r.teToca,
      espera: 'La devolvieron con observaciones: hay que corregirla y enviarla otra vez',
    };
  }

  // ---------------------------------------------------- el estudio previo --
  if (estudio && estudio.aplica && !estaTerminada(estudio)) {
    if (estudio.estado !== 'EN_REVISION') {
      return {
        ...base(estudio),
        momento: 'redaccion',
        titulo: 'Redacción del estudio previo',
        quien: 'Área solicitante',
        teToca: !!entrada.radicadoPorMi,
        espera: null,
      };
    }

    const radicacion = pasos.find((p) => p.numeral === RADICACION) ?? {
      ...estudio,
      numeral: RADICACION,
    };

    if (!participacion.contratacion) {
      const roles = rolesQuePueden(responsables, 'editar', RADICACION);
      return {
        ...base(radicacion),
        momento: 'asignacion',
        titulo: 'Recibir el proceso en la Dirección',
        quien: radicacion.responsableCargo || unaDeEstas(roles) || 'Dirección de Contratación',
        teToca: puedoEn('editar', RADICACION),
        espera: 'Está en la bandeja de la Dirección y nadie lo ha recibido',
      };
    }

    if (!participacion.abogado) {
      return {
        ...base(radicacion),
        momento: 'asignacion',
        titulo: 'Asignar abogado',
        quien: participacion.contratacion.nombre,
        teToca: !!participacion.contratacion.esMio,
        espera: 'Sin abogado asignado nadie puede revisar el estudio previo',
      };
    }

    return {
      ...base(estudio),
      momento: 'revision',
      titulo: 'Revisión del estudio previo',
      quien: participacion.abogado.nombre,
      teToca: !!participacion.abogado.esMio,
      espera: null,
    };
  }

  // -------------------------------------------------------- lo que sigue --
  const disponibles = actividadesDisponibles(pasos);
  const pendientes = pasos.filter(
    (p) =>
      p.numeral !== ESTUDIO_PREVIO &&
      p.aplica &&
      p.construida &&
      !estaTerminada(p) &&
      !NUNCA_BLOQUEA.has(p.numeral),
  );

  const actual = pendientes.find((p) => disponibles.has(p.numeral));
  if (actual) {
    if (actual.estado === 'EN_REVISION') {
      const r = responsableDe(actual, ['aprobar', 'decidir']);
      return {
        ...base(actual),
        momento: 'revision',
        titulo: `Aprobar: ${actual.nombre}`,
        quien: r.quien,
        teToca: r.teToca,
        espera: 'Se envió y espera el visto bueno',
      };
    }

    const r = responsableDe(actual, ['editar', 'decidir']);
    return {
      ...base(actual),
      // Desde la reunión de inicio el contrato se ejecuta: los pagos no son un
      // trámite previo, son parte de la ejecución.
      momento: actual.etapa === 9 ? 'ejecucion' : 'tramite',
      titulo: actual.nombre,
      quien: r.quien,
      teToca: r.teToca,
      espera: null,
    };
  }

  // Quedan pendientes, pero ninguna se puede trabajar: se dice qué lo detiene.
  if (pendientes.length) {
    const primera = pendientes[0];
    const r = responsableDe(primera, ['editar', 'decidir']);
    return {
      ...base(primera),
      momento: 'tramite',
      titulo: primera.nombre,
      quien: r.quien,
      teToca: false,
      espera: motivoDelBloqueo(primera.numeral, pasos) ?? 'Esperando un paso anterior',
    };
  }

  /*
   * Solo quedan las que no cierran mientras dura el contrato —seguimiento,
   * reasignación, modificaciones—: el proceso no está detenido, se ejecuta.
   */
  const inicio = pasos.find((p) => p.numeral === INICIO_EJECUCION);
  const enEjecucion = pasos.some(
    (p) => NUNCA_BLOQUEA.has(p.numeral) && p.aplica && p.construida && !estaTerminada(p),
  );
  if (inicio && estaTerminada(inicio) && enEjecucion) {
    const seguimiento = pasos.find((p) => p.numeral === '9.2') ?? inicio;
    const r = responsableDe(seguimiento, ['editar']);
    return {
      ...base(seguimiento),
      momento: 'ejecucion',
      titulo: 'Contrato en ejecución',
      quien: r.quien,
      teToca: r.teToca,
      espera: null,
    };
  }

  return {
    ...base(null),
    momento: 'terminado',
    titulo: 'Proceso terminado',
    quien: null,
    teToca: false,
    espera: null,
  };
}
