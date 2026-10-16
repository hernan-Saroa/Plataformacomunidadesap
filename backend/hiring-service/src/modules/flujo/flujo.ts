import { accionQueHace } from '../../auth/la-hace';
import { Accion } from '../../auth/alcance';
import { AprobacionGuardada, FilaAsignacion, LaHaceGuardada, asignacionQueRige } from '../../flujo/lectura';

/**
 * Las reglas del flujo visual (migración 111), sin base de datos.
 *
 * Aquí se decide si una versión del flujo se puede activar: que cada
 * actividad que se hace en la plataforma tenga quién la haga y, si exige
 * aprobación, quién la apruebe en cada escalón. Son funciones puras porque un
 * error aquí deja pasar un flujo que en ejecución se queda sin nadie, y eso
 * no falla ruidosamente: el proceso simplemente se detiene.
 */

/**
 * Las actividades donde se asigna gente al proceso. Se destacan en el
 * diagrama: de ellas sale quién hace o revisa otras.
 */
export const ACTIVIDADES_QUE_ASIGNAN: Readonly<Record<string, string>> = {
  '3.3': 'Se escoge a la persona de cada puesto del proceso',
  '6.2': 'Se designa el comité evaluador',
  '8.2': 'Se designa al supervisor del contrato',
  '9.3': 'Se reasigna la supervisión',
};

export type Gravedad = 'ERROR' | 'AVISO';

/** Algo que corregir en el flujo, dicho con lo que hay que hacer. */
export interface ProblemaFlujo {
  numeral: string;
  nombre: string;
  etapa: number;
  modalidad: string | null;
  /** Qué parte de la actividad: quién la hace o quién la aprueba. */
  parte: 'HACE' | 'APRUEBA';
  gravedad: Gravedad;
  mensaje: string;
}

export interface EscalonDeCadena {
  nombre: string;
  roles: string[];
  personas: string[];
  papeles: string[];
  puestos?: string[];
}

export interface CadenaParaValidar {
  nombre: string;
  activa: boolean;
  escalones: EscalonDeCadena[];
}

/** Lo que la validación necesita saber del mundo, ya consultado. */
export interface DatosDeValidacion {
  /** Las actividades que aplican a la modalidad y se hacen en la plataforma. */
  actividades: { numeral: string; nombre: string; etapa: number }[];
  filas: FilaAsignacion[];
  modalidad: string | null;
  /** Las cuentas que pueden hacer esa acción en ese punto. */
  pueden: (accion: Exclude<Accion, 'ver'>, numeral: string) => Set<string>;
  /** Las cuentas activas con ese rol. */
  conRol: (rol: string) => Set<string>;
  /** La cuenta activa de una persona del directorio, si la tiene. */
  cuentaDe: (personaId: string) => string | null;
  /** Los puestos activos, por id. */
  puestos: Map<string, string>;
  cadenas: Map<string, CadenaParaValidar>;
}

const ACCION: Record<string, string> = { editar: 'editar', aprobar: 'aprobar', decidir: 'decidir' };

/** Los escalones de una aprobación, sea una cadena o un escalón suelto. */
export function escalonesDe(
  aprobacion: AprobacionGuardada,
  cadenas: Map<string, CadenaParaValidar>,
): EscalonDeCadena[] | null {
  if (aprobacion.tipo === 'NINGUNA') return [];
  if (aprobacion.tipo === 'ESCALON') {
    return [{ nombre: 'Aprobación', roles: aprobacion.roles ?? [], personas: aprobacion.personas ?? [], papeles: [], puestos: aprobacion.puestos ?? [] }];
  }
  const cadena = cadenas.get(aprobacion.cadenaId);
  return cadena && cadena.activa ? cadena.escalones : null;
}

/**
 * Qué hace cada puesto en esta modalidad: hacer una actividad (con su acción)
 * o aprobarla. De eso salen sus candidatos: quienes tienen todos esos permisos.
 */
export function usosDePuestos(
  actividades: { numeral: string }[],
  filas: FilaAsignacion[],
  modalidad: string | null,
  cadenas: Map<string, CadenaParaValidar>,
): Map<string, { accion: Exclude<Accion, 'ver'>; numeral: string }[]> {
  const usos = new Map<string, { accion: Exclude<Accion, 'ver'>; numeral: string }[]>();
  const sumar = (puestoId: string, accion: Exclude<Accion, 'ver'>, numeral: string) => {
    const lista = usos.get(puestoId) ?? [];
    if (!lista.some((u) => u.accion === accion && u.numeral === numeral)) lista.push({ accion, numeral });
    usos.set(puestoId, lista);
  };
  for (const { numeral } of actividades) {
    const rige = asignacionQueRige(filas, numeral, modalidad);
    if (rige.laHace.tipo === 'PUESTO') sumar(rige.laHace.puestoId, accionQueHace(numeral), numeral);
    for (const e of escalonesDe(rige.aprobacion, cadenas) ?? []) {
      for (const p of e.puestos ?? []) sumar(p, 'aprobar', numeral);
    }
  }
  return usos;
}

/** Las cuentas que pueden ocupar el puesto: tienen todos sus permisos. */
function candidatosDe(
  usos: { accion: Exclude<Accion, 'ver'>; numeral: string }[],
  pueden: DatosDeValidacion['pueden'],
): Set<string> {
  let ids: Set<string> | null = null;
  for (const u of usos) {
    const estos = pueden(u.accion, u.numeral);
    ids = ids === null ? new Set(estos) : new Set([...ids].filter((x) => estos.has(x)));
  }
  return ids ?? new Set();
}

/**
 * Lo que impide activar el flujo en una modalidad, o lo que conviene mirar.
 *
 * - Hace por permiso: alguien tiene que tener el permiso.
 * - Hace una persona: tiene que existir con una cuenta que tenga el permiso.
 * - Lo elige quien lleva el proceso (un puesto): el puesto tiene que existir
 *   y alguien tiene que poder ocuparlo.
 * - Cada escalón de la aprobación tiene que tener quién lo decida con el
 *   permiso de aprobar.
 */
export function validarModalidad(d: DatosDeValidacion): ProblemaFlujo[] {
  const problemas: ProblemaFlujo[] = [];
  const usos = usosDePuestos(d.actividades, d.filas, d.modalidad, d.cadenas);

  for (const a of d.actividades) {
    const rige = asignacionQueRige(d.filas, a.numeral, d.modalidad);
    const base = { numeral: a.numeral, nombre: a.nombre, etapa: a.etapa, modalidad: d.modalidad };
    const accion = accionQueHace(a.numeral);
    const queHace = `${ACCION[accion]} la ${a.numeral}`;

    // -------------------------------------------------------- quién la hace
    const hace = rige.laHace;
    if (hace.tipo === 'PERMISO') {
      if (!d.pueden(accion, a.numeral).size) {
        problemas.push({
          ...base,
          parte: 'HACE',
          gravedad: 'ERROR',
          mensaje: `Nadie tiene permiso para ${queHace}: dáselo a un rol en Permisos por etapa`,
        });
      }
    } else if (hace.tipo === 'PERSONAS') {
      const validas = hace.personas.filter((p) => {
        const cuenta = d.cuentaDe(p);
        return !!cuenta && d.pueden(accion, a.numeral).has(cuenta);
      });
      if (!hace.personas.length || !validas.length) {
        problemas.push({
          ...base,
          parte: 'HACE',
          gravedad: 'ERROR',
          mensaje: hace.personas.length
            ? `Ninguna de las personas elegidas tiene una cuenta con permiso para ${queHace}`
            : 'Falta elegir a la persona que la hace',
        });
      } else if (validas.length < hace.personas.length) {
        problemas.push({
          ...base,
          parte: 'HACE',
          gravedad: 'AVISO',
          mensaje: `Alguna de las personas elegidas no tiene una cuenta con permiso para ${queHace}`,
        });
      }
    } else {
      const nombre = d.puestos.get(hace.puestoId);
      if (!nombre) {
        problemas.push({ ...base, parte: 'HACE', gravedad: 'ERROR', mensaje: 'La hace un puesto que ya no existe: elige otro' });
      } else if (!candidatosDe(usos.get(hace.puestoId) ?? [], d.pueden).size) {
        problemas.push({
          ...base,
          parte: 'HACE',
          gravedad: 'ERROR',
          mensaje: `Nadie puede ocupar el puesto ${nombre}: ninguna cuenta tiene todos sus permisos`,
        });
      }
    }

    // ----------------------------------------------------- quién la aprueba
    const escalones = escalonesDe(rige.aprobacion, d.cadenas);
    if (escalones === null) {
      problemas.push({
        ...base,
        parte: 'APRUEBA',
        gravedad: 'ERROR',
        mensaje: 'La aprueba una cadena archivada o que ya no existe: elige otra',
      });
      continue;
    }
    escalones.forEach((e, i) => {
      const cual = escalones.length > 1 ? `El escalón ${i + 1} (${e.nombre})` : 'La aprobación';
      const pueden = d.pueden('aprobar', a.numeral);
      const porRol = e.roles.some((r) => [...d.conRol(r)].some((c) => pueden.has(c)));
      const porPersona = e.personas.some((p) => !!d.cuentaDe(p));
      const porPapel = e.papeles.length > 0;
      const puestos = e.puestos ?? [];
      const puestosMuertos = puestos.filter((p) => !d.puestos.has(p));
      const porPuesto = puestos.some((p) => d.puestos.has(p) && candidatosDe(usos.get(p) ?? [], d.pueden).size > 0);
      if (!porRol && !porPersona && !porPapel && !porPuesto) {
        problemas.push({
          ...base,
          parte: 'APRUEBA',
          gravedad: 'ERROR',
          mensaje: puestosMuertos.length
            ? `${cual} nombra un puesto que ya no existe: elige otro`
            : `${cual} no tiene quién lo decida con permiso de aprobar la ${a.numeral}`,
        });
      }
    });
  }
  return problemas;
}

/** Cómo se asigna quien la hace, para el diagrama. */
export function modoDeAsignacion(hace: LaHaceGuardada): 'ROL' | 'PERSONA' | 'AL_EJECUTAR' {
  if (hace.tipo === 'PERSONAS') return 'PERSONA';
  if (hace.tipo === 'PUESTO') return 'AL_EJECUTAR';
  return 'ROL';
}
