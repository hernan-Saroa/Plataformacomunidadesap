/**
 * Las reglas del trámite de modificaciones (150), sin base de datos.
 *
 * Son funciones puras porque deciden cosas que no fallan ruidosamente: qué
 * documentos se exigen, qué cambios pueden ir juntos, quién decide un escalón y
 * en qué queda el trámite después de cada decisión.
 */

import type { EstadoContrato } from '../../entities/contrato.entity';
import type { TipoModificacion } from '../../entities/modificacion-contrato.entity';
import type {
  AccionModificacion,
  EscalonEnRonda,
  EscalonModificacion,
  EstadoRondaModificacion,
  EstadoTramiteModificacion,
  FaseCadenaModificacion,
  PapelModificacion,
} from '../../entities/tramite-modificacion.entity';
import { porQueNoAdmiteTipo, SituacionDelContrato } from '../modificaciones/reglas-por-tipo';

export const ACCIONES_MODIFICACION: AccionModificacion[] = ['APROBAR', 'DEVOLVER', 'NEGAR'];
export const PAPELES_MODIFICACION: PapelModificacion[] = ['ABOGADO', 'REVISOR'];
export const EFECTOS: TipoModificacion[] = [
  'ADICION',
  'PRORROGA',
  'CESION',
  'ACLARATORIO',
  'SUSPENSION',
  'REANUDACION',
  'TERMINACION_ANTICIPADA',
  'OTRO',
];

/** Estados en que el trámite ya no se mueve. */
export const ESTADOS_FINALES: EstadoTramiteModificacion[] = ['RECIBIDA', 'PUBLICADA', 'DESISTIDA', 'NEGADA'];

export const NOMBRE_ESTADO: Record<EstadoTramiteModificacion, string> = {
  RADICADA: 'Radicada',
  RECIBIDA: 'Recibida por Contratación',
  EN_REVISION: 'En revisión',
  DEVUELTA: 'Devuelta al área',
  MINUTA: 'Elaborando la minuta',
  EN_VISTO_BUENO: 'En visto bueno',
  EN_FIRMA: 'En firma',
  PERFECCIONADA: 'Perfeccionada',
  PUBLICADA: 'Publicada en SECOP',
  DESISTIDA: 'Desistida',
  NEGADA: 'Negada',
};

// --------------------------------------------------------------- tipos --

export interface TipoParaCombinar {
  codigo: string;
  nombre: string;
  efecto: TipoModificacion;
  vaSola: boolean;
}

/**
 * Por qué estos tipos no pueden ir en la misma modificación, o `null`.
 *
 * Varios cambios caben en una sola minuta —adicionar y prorrogar es lo más
 * común—, pero suspender, reanudar y terminar van solos: cambian el estado del
 * contrato, y adicionar en la misma minuta un contrato que se termina no tiene
 * sentido. Dos tipos con el mismo efecto tampoco: serían dos adiciones en una.
 */
export function porQueNoSeCombinan(tipos: TipoParaCombinar[]): string | null {
  if (!tipos.length) return 'Elige al menos un tipo de modificación';

  const sola = tipos.find((t) => t.vaSola);
  if (sola && tipos.length > 1) {
    return `${sola.nombre} va sola: no se combina con otros cambios en la misma modificación`;
  }

  const vistos = new Map<TipoModificacion, string>();
  for (const t of tipos) {
    // OTRO y ACLARATORIO no aplican nada: dos tipos libres pueden convivir.
    if (t.efecto === 'OTRO' || t.efecto === 'ACLARATORIO') continue;
    const previo = vistos.get(t.efecto);
    if (previo) return `${previo} y ${t.nombre} cambian lo mismo del contrato: van en modificaciones distintas`;
    vistos.set(t.efecto, t.nombre);
  }

  return null;
}

/**
 * Por qué el contrato no admite ahora un cambio con este efecto, o `null`.
 *
 * Desde el módulo de Modificaciones solo se modifica un contrato **en
 * ejecución** (respuesta de Juan del 25/11): firmado o legalizado todavía no.
 * Suspendido, en cambio, sí, porque de ahí se sale reanudando o terminando.
 */
export function porQueNoAdmiteEfecto(situacion: SituacionDelContrato, efecto: TipoModificacion): string | null {
  const antesDeEjecucion: EstadoContrato[] = ['GENERADO', 'ACEPTADO', 'RECHAZADO', 'PERFECCIONADO', 'LEGALIZADO'];
  if (antesDeEjecucion.includes(situacion.estado)) {
    return 'el contrato todavía no está en ejecución: se modifica desde el acta de inicio';
  }
  return porQueNoAdmiteTipo(situacion, efecto);
}

// ---------------------------------------------------------- documentos --

export interface RequisitoDeModificacion {
  id: string;
  nombre: string;
  obligatorio: boolean;
  informativo: boolean;
  activo: boolean;
  tiposModificacion: string[];
}

/** Los documentos de la 9.5 que se piden para estos tipos: los generales y los de cada uno. */
export function requisitosPara<T extends RequisitoDeModificacion>(requisitos: T[], tipos: string[]): T[] {
  return requisitos.filter(
    (r) =>
      r.activo &&
      !r.informativo &&
      (r.tiposModificacion.length === 0 || r.tiposModificacion.some((t) => tipos.includes(t))),
  );
}

/** Los obligatorios que no vienen entre los cargados, por nombre. */
export function requisitosQueFaltan(requisitos: RequisitoDeModificacion[], cargados: string[]): string[] {
  return requisitos.filter((r) => r.obligatorio && !cargados.includes(r.id)).map((r) => r.nombre);
}

// ------------------------------------------------------------- cadenas --

/** Valida los escalones que llegan de Configuración; devuelve todos los problemas de una vez. */
export function validarCadena(entrada: unknown): { escalones: EscalonModificacion[]; problemas: string[] } {
  if (!Array.isArray(entrada) || entrada.length === 0) {
    return { escalones: [], problemas: ['La cadena necesita al menos un escalón'] };
  }

  const problemas: string[] = [];
  const escalones = entrada.map((bruto: any, i): EscalonModificacion => {
    const n = i + 1;
    const nombre = typeof bruto?.nombre === 'string' ? bruto.nombre.trim() : '';
    const papel = PAPELES_MODIFICACION.includes(bruto?.papel) ? (bruto.papel as PapelModificacion) : null;
    const roles: string[] = Array.isArray(bruto?.roles)
      ? [...new Set<string>(bruto.roles.filter((r: unknown) => typeof r === 'string' && r.trim()).map((r: string) => r.trim()))]
      : [];
    const acciones = (Array.isArray(bruto?.acciones) ? bruto.acciones : ['APROBAR', 'DEVOLVER']).filter(
      (a: unknown): a is AccionModificacion => ACCIONES_MODIFICACION.includes(a as AccionModificacion),
    );

    if (!nombre) problemas.push(`El escalón ${n} necesita un nombre`);
    if (bruto?.papel && !papel) problemas.push(`El escalón ${n} nombra un papel que no existe: ${bruto.papel}`);
    if (!papel && !roles.length) {
      problemas.push(`El escalón ${n} no tiene quién decida: elige el abogado, el revisor o un rol`);
    }
    if (!acciones.includes('APROBAR')) {
      problemas.push(`El escalón ${n} tiene que poder aprobar: si no, la modificación nunca avanzaría`);
    }

    return { nombre, papel, roles: papel ? [] : roles, acciones: ACCIONES_MODIFICACION.filter((a) => acciones.includes(a)) };
  });

  return { escalones, problemas };
}

/** Quién mira, en los términos con que se nombran los responsables de un escalón. */
export interface QuienDecide {
  usuarioId: string;
  roles: string[];
}

export interface AsignadosDelTramite {
  abogadoId: string | null;
  revisorId: string | null;
}

/** Si quien mira es responsable del escalón. */
export function esResponsable(escalon: EscalonModificacion, quien: QuienDecide, tramite: AsignadosDelTramite): boolean {
  if (escalon.papel === 'ABOGADO') return !!quien.usuarioId && quien.usuarioId === tramite.abogadoId;
  if (escalon.papel === 'REVISOR') return !!quien.usuarioId && quien.usuarioId === tramite.revisorId;
  return escalon.roles.some((r) => quien.roles.includes(r));
}

/** Por qué quien mira no puede tomar esta decisión, o `null`. */
export function motivoParaNoDecidir(
  escalon: EscalonEnRonda | undefined,
  accion: AccionModificacion,
  quien: QuienDecide,
  tramite: AsignadosDelTramite,
): string | null {
  if (!escalon) return 'La ronda no tiene ningún escalón pendiente de decidir';
  if (!esResponsable(escalon, quien, tramite)) {
    const quienEs =
      escalon.papel === 'ABOGADO'
        ? 'el abogado asignado'
        : escalon.papel === 'REVISOR'
          ? 'el revisor asignado'
          : 'quien tenga el rol del escalón';
    return `Este escalón («${escalon.nombre}») lo decide ${quienEs}`;
  }
  if (!escalon.acciones.includes(accion)) {
    return `El escalón «${escalon.nombre}» no puede ${accion === 'NEGAR' ? 'negar' : accion === 'DEVOLVER' ? 'devolver' : 'aprobar'}`;
  }
  return null;
}

/** Los escalones de una ronda nueva: el primero pendiente, los demás bloqueados. */
export function abrirRonda(escalones: EscalonModificacion[]): EscalonEnRonda[] {
  return escalones.map((e, i) => ({ ...e, orden: i + 1, estado: i === 0 ? 'PENDIENTE' : 'BLOQUEADO' }));
}

export interface TrasDecidir {
  escalones: EscalonEnRonda[];
  ronda: EstadoRondaModificacion;
  escalonActual: number | null;
  tramite: EstadoTramiteModificacion;
}

/**
 * En qué queda todo después de que el escalón pendiente decide.
 *
 * Aprobar pasa al siguiente o, en el último, cierra la ronda aprobada. Devolver
 * y negar cierran la ronda en el acto: los escalones que no llegaron a decidir
 * quedan anulados. La devolución va a quien envió: en la revisión, al área; en
 * el visto bueno, al abogado, que vuelve a la minuta. Al reenviar, la cadena
 * empieza otra vez desde el primero.
 */
export function trasDecidir(
  fase: FaseCadenaModificacion,
  escalones: EscalonEnRonda[],
  accion: AccionModificacion,
  quien: { nombre: string; usuarioId: string },
  ahora: string,
): TrasDecidir {
  const actual = escalones.find((e) => e.estado === 'PENDIENTE');
  if (!actual) throw new Error('La ronda no tiene escalón pendiente');

  const marcado: EscalonEnRonda = {
    ...actual,
    estado: accion === 'APROBAR' ? 'APROBADO' : accion === 'DEVOLVER' ? 'DEVUELTO' : 'NEGADO',
    decididoPor: quien.nombre,
    decididoPorId: quien.usuarioId,
    decididoAt: ahora,
  };

  if (accion === 'APROBAR') {
    const siguiente = escalones.find((e) => e.orden > actual.orden && e.estado === 'BLOQUEADO');
    const nuevos = escalones.map((e) =>
      e.orden === actual.orden ? marcado : siguiente && e.orden === siguiente.orden ? { ...e, estado: 'PENDIENTE' as const } : e,
    );
    if (siguiente) {
      return {
        escalones: nuevos,
        ronda: 'EN_CURSO',
        escalonActual: siguiente.orden,
        tramite: fase === 'REVISION' ? 'EN_REVISION' : 'EN_VISTO_BUENO',
      };
    }
    // La revisión aprobada pasa a la minuta; el visto bueno, a la firma.
    return { escalones: nuevos, ronda: 'APROBADA', escalonActual: null, tramite: fase === 'REVISION' ? 'MINUTA' : 'EN_FIRMA' };
  }

  const cerrados = escalones.map((e) =>
    e.orden === actual.orden ? marcado : e.estado === 'BLOQUEADO' ? { ...e, estado: 'ANULADO' as const } : e,
  );

  if (accion === 'NEGAR') return { escalones: cerrados, ronda: 'NEGADA', escalonActual: null, tramite: 'NEGADA' };
  return {
    escalones: cerrados,
    ronda: 'DEVUELTA',
    escalonActual: null,
    tramite: fase === 'REVISION' ? 'DEVUELTA' : 'MINUTA',
  };
}

// ------------------------------------------------------------ radicado --

/** MOD-2026-0007. */
export function radicadoDe(anio: number, consecutivo: number): string {
  return `MOD-${anio}-${String(consecutivo).padStart(4, '0')}`;
}
