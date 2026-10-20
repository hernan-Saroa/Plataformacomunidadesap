/**
 * Las reglas de la aprobación por escalones, sin base de datos (migración 101).
 *
 * Aquí se decide qué pasa con una ronda cuando un escalón decide, quién es
 * responsable de un escalón y qué forma es válida para una cadena. Son
 * funciones puras porque un error en ellas no falla ruidosamente: una
 * aprobación intermedia tomada por definitiva cierra la etapa 3 y radica el
 * CDP sin que nadie lo note.
 */

import type {
  AccionEscalon,
  EscalonConfigurado,
  EstadoEscalon,
  EstadoRonda,
  PapelEscalon,
  ReglaDecision,
} from '../../entities/cadena-aprobacion.entity';
import type { EstadoActividad } from '../../entities/proceso-actividad.entity';

export const ACCIONES: AccionEscalon[] = ['APROBAR', 'DEVOLVER', 'NEGAR'];
export const PAPELES_ESCALON: PapelEscalon[] = ['CONTRATACION', 'SUPERVISOR'];
const REGLAS: ReglaDecision[] = ['UNO', 'TODOS'];

/** Lo que un escalón puede hacer si nadie dice otra cosa: lo que hacía el aprobador único. */
export const ACCIONES_POR_DEFECTO: AccionEscalon[] = ['APROBAR', 'DEVOLVER'];

/** Cómo se llama el escalón único de una regla de un solo nivel. */
export const NOMBRE_ESCALON_UNICO = 'Aprobación';

/** Una cadena ya resuelta: de una plantilla o de una regla de un solo nivel. */
export interface CadenaResuelta {
  /** `null` cuando la regla nombra roles y personas sin plantilla. */
  cadenaId: string | null;
  nombre: string;
  permiteMismoAprobador: boolean;
  escalones: EscalonConfigurado[];
}

const lista = (valor: unknown): string[] =>
  Array.isArray(valor)
    ? [...new Set(valor.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()))]
    : [];

/**
 * La cadena que declara el `config` de una regla `EXIGE_APROBACION`.
 *
 * Dos formas: `{cadenaId}`, que apunta a una plantilla y se resuelve fuera, y
 * `{roles, personas, puestos}`, que se lee como una cadena de un escalón. Sin
 * nadie que apruebe no exige nada: bloquearía la actividad sin que nadie
 * pudiera desbloquearla.
 */
export function leerConfigDeRegla(
  config: Record<string, unknown> | null | undefined,
): { cadenaId: string } | { escalon: EscalonConfigurado } | null {
  const c = config ?? {};
  if (typeof c.cadenaId === 'string' && c.cadenaId.trim()) return { cadenaId: c.cadenaId.trim() };

  const roles = lista(c.roles);
  const personas = lista(c.personas);
  const puestos = lista(c.puestos);
  if (!roles.length && !personas.length && !puestos.length) return null;

  return {
    escalon: {
      nombre: NOMBRE_ESCALON_UNICO,
      roles,
      personas,
      papeles: [],
      puestos,
      reglaDecision: 'UNO',
      acciones: [...ACCIONES_POR_DEFECTO],
    },
  };
}

/**
 * Valida y normaliza los escalones que llegan de Configuración.
 *
 * Devuelve los problemas en frases y no lanza: quien configura necesita ver
 * todo lo que falta de una vez, no uno por intento.
 */
export function validarEscalones(entrada: unknown): { escalones: EscalonConfigurado[]; problemas: string[] } {
  const problemas: string[] = [];
  if (!Array.isArray(entrada) || entrada.length === 0) {
    return { escalones: [], problemas: ['La cadena necesita al menos un escalón'] };
  }

  const escalones = entrada.map((bruto: any, i): EscalonConfigurado => {
    const n = i + 1;
    const nombre = typeof bruto?.nombre === 'string' ? bruto.nombre.trim() : '';
    const roles = lista(bruto?.roles);
    const personas = lista(bruto?.personas);
    const papeles = lista(bruto?.papeles) as PapelEscalon[];
    const puestos = lista(bruto?.puestos);
    const reglaDecision: ReglaDecision = REGLAS.includes(bruto?.reglaDecision) ? bruto.reglaDecision : 'UNO';
    const acciones = (lista(bruto?.acciones).length ? lista(bruto?.acciones) : ACCIONES_POR_DEFECTO) as AccionEscalon[];

    if (!nombre) problemas.push(`El escalón ${n} necesita un nombre`);
    if (nombre.length > 120) problemas.push(`El nombre del escalón ${n} es demasiado largo`);
    if (!roles.length && !personas.length && !papeles.length && !puestos.length) {
      problemas.push(`El escalón ${n} no tiene quién decida: elige un rol, una persona, un puesto o un papel`);
    }
    const papelRaro = papeles.find((p) => !PAPELES_ESCALON.includes(p));
    if (papelRaro) problemas.push(`El escalón ${n} nombra un papel que no existe: ${papelRaro}`);
    const accionRara = acciones.find((a) => !ACCIONES.includes(a));
    if (accionRara) problemas.push(`El escalón ${n} tiene una acción que no existe: ${accionRara}`);
    if (!acciones.includes('APROBAR')) {
      problemas.push(`El escalón ${n} tiene que poder aprobar: sin eso la cadena no tiene salida`);
    }
    // Con TODOS, cada miembro tiene que ser alguien concreto: una persona
    // nombrada o quien ocupe un puesto en el proceso. Un rol o un papel no
    // dicen cuántos son, así que «todos» no tendría fin.
    if (reglaDecision === 'TODOS' && (roles.length || papeles.length || personas.length + puestos.length < 2)) {
      problemas.push(
        `El escalón ${n} exige que aprueben todos: nombra al menos dos entre personas y puestos, y ningún rol ni papel, porque los miembros de un rol cambian`,
      );
    }

    return {
      nombre,
      roles,
      personas,
      papeles,
      puestos,
      reglaDecision,
      acciones: ACCIONES.filter((a) => acciones.includes(a)),
    };
  });

  return { escalones, problemas };
}

/** Quién está mirando, en los términos en que se nombran los responsables. */
export interface Quien {
  roles: string[];
  /** `id_person` de su cuenta, si la tiene enlazada. */
  personaId: string | null;
  /** Los papeles que cumple en este proceso: quien lo lleva, el supervisor. */
  papeles: PapelEscalon[];
  /**
   * Los puestos que ocupa en este proceso (109), solo los que le valen: si
   * perdió el permiso de aprobar en la actividad, el puesto no le da nada.
   */
  puestos?: string[];
  usuarioId?: string | null;
}

/** Los responsables de un escalón. */
export type Responsables = Pick<EscalonConfigurado, 'roles' | 'personas' | 'papeles' | 'puestos'>;

/** Si quien mira es responsable del escalón. SUPER_ADMIN lo es de todos. */
export function esResponsable(escalon: Responsables, quien: Quien): boolean {
  if (quien.roles.includes('SUPER_ADMIN')) return true;
  if (quien.personaId && escalon.personas.includes(quien.personaId)) return true;
  if (escalon.papeles.some((p) => quien.papeles.includes(p))) return true;
  if ((escalon.puestos ?? []).some((p) => quien.puestos?.includes(p))) return true;
  return escalon.roles.some((r) => quien.roles.includes(r));
}

/** Una decisión ya tomada en la ronda, lo que hace falta para las reglas. */
export interface DecisionPrevia {
  escalon: number;
  decision: 'APROBADO' | 'DEVUELTO' | 'NEGADO';
  personaId: string | null;
  usuarioId: string | null;
}

/** La misma persona, por su id del directorio o, si no lo tiene, por su cuenta. */
function esLaMisma(d: DecisionPrevia, personaId: string | null, usuarioId: string | null): boolean {
  if (personaId && d.personaId) return d.personaId === personaId;
  return !!usuarioId && d.usuarioId === usuarioId;
}

/**
 * Por qué quien mira no puede tomar esta decisión, o `null` si puede.
 *
 * Se comprueba aquí y no en el controlador porque la pantalla y la bandeja
 * necesitan la misma respuesta: ofrecer un botón que el servicio va a rechazar
 * es peor que no ofrecerlo.
 */
export function motivoParaNoDecidir(args: {
  escalon: Responsables &
    Pick<EscalonConfigurado, 'acciones' | 'reglaDecision'> & {
      orden: number;
      estado: EstadoEscalon;
    };
  accion: AccionEscalon;
  quien: Quien;
  usuarioId: string | null;
  previas: DecisionPrevia[];
  permiteMismoAprobador: boolean;
}): string | null {
  const { escalon, accion, quien, usuarioId, previas, permiteMismoAprobador } = args;

  if (escalon.estado !== 'PENDIENTE') return 'A este escalón no le toca decidir';
  if (!esResponsable(escalon, quien)) return 'No estás entre quienes deciden este escalón';
  if (!escalon.acciones.includes(accion)) {
    return accion === 'NEGAR'
      ? 'Este escalón no puede negar la actividad'
      : accion === 'DEVOLVER'
        ? 'Este escalón no puede devolver la actividad'
        : 'Este escalón no puede aprobar la actividad';
  }

  const mias = previas.filter((d) => esLaMisma(d, quien.personaId, usuarioId));

  // Con TODOS, cada persona aprueba una vez: dos aprobaciones suyas no son dos personas.
  if (accion === 'APROBAR' && mias.some((d) => d.escalon === escalon.orden && d.decision === 'APROBADO')) {
    return 'Ya aprobaste este escalón: falta que aprueben los demás';
  }

  if (
    accion === 'APROBAR' &&
    !permiteMismoAprobador &&
    mias.some((d) => d.escalon !== escalon.orden && d.decision === 'APROBADO')
  ) {
    return 'Ya aprobaste otro escalón de esta ronda: este lo tiene que decidir otra persona';
  }

  return null;
}

/**
 * Si con esta aprobación el escalón queda resuelto.
 *
 * Con `UNO`, siempre. Con `TODOS`, cuando aprobaron cada persona nombrada y
 * cada cuenta que ocupa uno de los puestos del escalón en el proceso
 * (`ocupantes`): las aprobaciones anteriores del escalón más la que se está
 * registrando. Las personas se cuentan por su id del directorio y los
 * ocupantes por su cuenta, que es como los guarda cada configuración.
 */
export function escalonCompleto(
  escalon: { orden: number; reglaDecision: ReglaDecision; personas: string[] },
  previas: DecisionPrevia[],
  personaQueAprueba: string | null,
  ocupantes: string[] = [],
  cuentaQueAprueba: string | null = null,
): boolean {
  if (escalon.reglaDecision === 'UNO') return true;
  const delEscalon = previas.filter((d) => d.escalon === escalon.orden && d.decision === 'APROBADO');
  const personas = new Set(delEscalon.filter((d) => d.personaId).map((d) => d.personaId as string));
  const cuentas = new Set(delEscalon.filter((d) => d.usuarioId).map((d) => d.usuarioId as string));
  if (personaQueAprueba) personas.add(personaQueAprueba);
  if (cuentaQueAprueba) cuentas.add(cuentaQueAprueba);
  return escalon.personas.every((p) => personas.has(p)) && ocupantes.every((c) => cuentas.has(c));
}

/** Cómo quedan la ronda, sus escalones y la actividad tras una decisión. */
export interface TrasDecision {
  /** El nuevo estado de cada escalón, por orden. Solo los que cambian. */
  escalones: Map<number, EstadoEscalon>;
  ronda: EstadoRonda;
  escalonActual: number | null;
  actividad: EstadoActividad;
  /** Si con esto la actividad quedó aprobada: lo único que dispara sus efectos. */
  aprobacionDefinitiva: boolean;
  /** El escalón que se acaba de activar, si alguno. */
  activado: number | null;
}

/**
 * Lo que una decisión le hace a la ronda.
 *
 * - Aprobar un escalón incompleto (regla TODOS) no mueve nada.
 * - Aprobar un escalón completo activa el siguiente; si era el último, la
 *   actividad queda aprobada. Una aprobación intermedia nunca la cierra.
 * - Devolver, en cualquier escalón, cierra la ronda y regresa la actividad a
 *   quien la envió: él es el único que corrige (decisión de Juan). Los que
 *   no llegaron a decidir quedan anulados, no aprobados.
 * - Negar cierra la ronda y la actividad, igual pero sin vuelta.
 */
export function trasDecision(
  ordenes: number[],
  actual: number,
  decision: 'APROBADO' | 'DEVUELTO' | 'NEGADO',
  completo: boolean,
): TrasDecision {
  const ordenados = [...ordenes].sort((a, b) => a - b);
  const escalones = new Map<number, EstadoEscalon>();

  if (decision === 'APROBADO') {
    if (!completo) {
      return {
        escalones,
        ronda: 'EN_CURSO',
        escalonActual: actual,
        actividad: 'EN_REVISION',
        aprobacionDefinitiva: false,
        activado: null,
      };
    }

    escalones.set(actual, 'APROBADO');
    const siguiente = ordenados.find((o) => o > actual) ?? null;
    if (siguiente !== null) {
      escalones.set(siguiente, 'PENDIENTE');
      return {
        escalones,
        ronda: 'EN_CURSO',
        escalonActual: siguiente,
        actividad: 'EN_REVISION',
        aprobacionDefinitiva: false,
        activado: siguiente,
      };
    }
    return {
      escalones,
      ronda: 'APROBADA',
      escalonActual: null,
      actividad: 'APROBADO',
      aprobacionDefinitiva: true,
      activado: null,
    };
  }

  escalones.set(actual, decision);
  for (const o of ordenados) if (o > actual) escalones.set(o, 'ANULADO');

  return {
    escalones,
    ronda: decision === 'DEVUELTO' ? 'DEVUELTA' : 'NEGADA',
    escalonActual: null,
    actividad: decision === 'DEVUELTO' ? 'DEVUELTO' : 'NEGADO',
    aprobacionDefinitiva: false,
    activado: null,
  };
}

/** La decisión que corresponde a cada acción. */
export const DECISION_DE: Record<AccionEscalon, 'APROBADO' | 'DEVUELTO' | 'NEGADO'> = {
  APROBAR: 'APROBADO',
  DEVOLVER: 'DEVUELTO',
  NEGAR: 'NEGADO',
};

/**
 * Por qué un escalón que nombra puestos no tiene quién lo decida (109).
 *
 * - `SIN_ASIGNAR`: nadie ocupa el puesto en el proceso: se asigna en la 3.3.
 * - `SIN_PERMISO`: quien lo ocupa ya no tiene el permiso de aprobar la
 *   actividad. Mandan los permisos: el puesto no se lo devuelve.
 *
 * Solo hay problema si ninguno de los puestos del escalón tiene a alguien que
 * pueda decidir y el escalón no nombra a nadie más.
 */
export type ProblemaDePuesto = 'SIN_ASIGNAR' | 'SIN_PERMISO';

export function mensajeDePuesto(
  problema: ProblemaDePuesto,
  puesto: string,
  quien?: string | null,
): string {
  if (problema === 'SIN_PERMISO') {
    return `${quien ?? 'Quien ocupa el puesto'} (${puesto}) ya no tiene permiso para aprobar aquí: reasígnalo en la 3.3 o devuélvele el permiso`;
  }
  return `Falta asignar en la 3.3 quién ocupa el puesto ${puesto}`;
}
