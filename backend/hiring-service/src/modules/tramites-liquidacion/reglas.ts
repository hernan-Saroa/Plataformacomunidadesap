/**
 * Las reglas del trámite de liquidación y de cierre (151), sin base de datos.
 *
 * Deciden cosas que no fallan ruidosamente: qué contrato va por qué flujo,
 * cuándo se puede radicar, quién decide un escalón y en qué queda el trámite
 * después de cada decisión.
 */

import type {
  AccionLiquidacion,
  ClaseTramiteLiquidacion,
  EscalonLiquidacion,
  EscalonLiquidacionEnRonda,
  EstadoRondaLiquidacion,
  EstadoTramiteLiquidacion,
  FaseCadenaLiquidacion,
  PapelLiquidacion,
} from '../../entities/tramite-liquidacion.entity';

export const ACCIONES_LIQUIDACION: AccionLiquidacion[] = ['APROBAR', 'DEVOLVER'];
export const PAPELES_LIQUIDACION: PapelLiquidacion[] = ['ABOGADO', 'LIDER'];

/** El permiso de cada clase en Permisos por etapa. */
export const TRAMITE_DE_LA_CLASE: Record<ClaseTramiteLiquidacion, 'LIQ' | 'CIE'> = {
  LIQUIDACION: 'LIQ',
  CIERRE: 'CIE',
};

/** Estados en que el trámite ya no se mueve. */
export const ESTADOS_FINALES: EstadoTramiteLiquidacion[] = ['PUBLICADA', 'CERRADA', 'DESISTIDA'];

/** Hasta dónde llega el área: con el acta firmada ya no se desiste. */
export const SE_PUEDE_DESISTIR: EstadoTramiteLiquidacion[] = [
  'RADICADA',
  'EN_REVISION',
  'DEVUELTA',
  'ACTA',
  'EN_VISTO_BUENO',
  'EN_FIRMA',
];

export const NOMBRE_ESTADO: Record<EstadoTramiteLiquidacion, string> = {
  RADICADA: 'Radicada, por asignar',
  EN_REVISION: 'En revisión',
  DEVUELTA: 'Devuelta al área',
  ACTA: 'Ajustando el acta',
  EN_VISTO_BUENO: 'En visto bueno',
  EN_FIRMA: 'En firma',
  PERFECCIONADA: 'Acta firmada, por publicar',
  PUBLICADA: 'Publicada en SECOP',
  CERRADA: 'Cerrado en SECOP',
  DESISTIDA: 'Desistida',
};

export const NOMBRE_CLASE: Record<ClaseTramiteLiquidacion, string> = {
  LIQUIDACION: 'Liquidación',
  CIERRE: 'Cierre',
};

// ------------------------------------------------------------- la clase --

/** La causal de la directa que es PSPAG (causales_contratacion). */
export const CAUSAL_PSPAG = 'DIRECTA_SERVICIOS_PROFESIONALES';

/**
 * Qué trámite lleva el contrato.
 *
 * PSPAG —prestación de servicios profesionales y de apoyo a la gestión, con
 * contratista persona natural— va por el de cierre: por ley no se liquida.
 * Todos los demás, por el de liquidación (decisión de Juan, 25/11). La causal
 * sola no basta: la misma causal admite trabajos artísticos con persona
 * jurídica, y esos sí se liquidan.
 */
export function claseDelContrato(causal: string | null, tipoContratista: string | null): ClaseTramiteLiquidacion {
  return causal === CAUSAL_PSPAG && tipoContratista === 'NATURAL' ? 'CIERRE' : 'LIQUIDACION';
}

// --------------------------------------------------- cuándo se radica --

/**
 * Las de la etapa 9 que siguen abiertas hasta el final del proceso y no hacen
 * falta para radicar: la ejecución con su supervisión y la reasignación del
 * supervisor (decisión de Juan, 25/11).
 */
export const SIGUEN_ABIERTAS = new Set(['9.2', '9.3']);

/** La 9.5: cuenta como terminada si no hay ninguna modificación en curso. */
export const NUMERAL_MODIFICACIONES = '9.5';

export interface PasoDeLaEtapa9 {
  numeral: string;
  nombre: string;
  /** Estado en `proceso_actividades`, o null si nadie la empezó. */
  estado: string | null;
  /** Si la modalidad la adelanta y no se dejó como «no aplica». */
  aplica: boolean;
}

/**
 * Lo que falta de la etapa 9 para radicar, por nombre; vacío si nada.
 *
 * Terminada es aprobada, como en el riel. La 9.5 es distinta: se trabaja cada
 * vez que hay una modificación y no tiene un final propio, así que lo que se
 * pide es que no quede ninguna a medias.
 */
export function faltanDeLaEtapa9(pasos: PasoDeLaEtapa9[], modificacionEnCurso: boolean): string[] {
  const faltan: string[] = [];
  for (const p of pasos) {
    if (!p.numeral.startsWith('9.') || SIGUEN_ABIERTAS.has(p.numeral) || !p.aplica) continue;
    if (p.numeral === NUMERAL_MODIFICACIONES) {
      if (modificacionEnCurso) faltan.push(`${p.numeral} ${p.nombre} (hay una modificación en curso)`);
      continue;
    }
    if (p.estado !== 'APROBADO') faltan.push(`${p.numeral} ${p.nombre}`);
  }
  return faltan;
}

/**
 * Si la etapa 10 está abierta.
 *
 * Se abre al radicar. Los procesos que ya la estaban trabajando antes de que
 * existiera el trámite —con algo empezado en la 10 o el contrato ya liquidado
 * o cerrado— quedan abiertos: cerrarles la puerta a mitad de camino dejaría
 * actas cargadas detrás de un candado.
 */
export function etapa10Abierta(situacion: {
  tramiteVivo: boolean;
  etapa10Empezada: boolean;
  estadoContrato: string | null;
}): boolean {
  return (
    situacion.tramiteVivo ||
    situacion.etapa10Empezada ||
    situacion.estadoContrato === 'LIQUIDADO' ||
    situacion.estadoContrato === 'CERRADO'
  );
}

// ---------------------------------------------------------- documentos --

export interface RequisitoDeLiquidacion {
  id: string;
  nombre: string;
  obligatorio: boolean;
  informativo: boolean;
  activo: boolean;
  tramiteLiquidacion: ClaseTramiteLiquidacion | null;
}

/** Los documentos de la 10.2 que se piden para esta clase: los suyos y los de las dos. */
export function requisitosPara<T extends RequisitoDeLiquidacion>(requisitos: T[], clase: ClaseTramiteLiquidacion): T[] {
  return requisitos.filter(
    (r) => r.activo && !r.informativo && (r.tramiteLiquidacion === null || r.tramiteLiquidacion === clase),
  );
}

/** Los obligatorios que no vienen entre los cargados, por nombre. */
export function requisitosQueFaltan(requisitos: RequisitoDeLiquidacion[], cargados: string[]): string[] {
  return requisitos.filter((r) => r.obligatorio && !cargados.includes(r.id)).map((r) => r.nombre);
}

// ------------------------------------------------------------- cadenas --

/** Valida los escalones que llegan de Configuración; devuelve todos los problemas de una vez. */
export function validarCadena(entrada: unknown): { escalones: EscalonLiquidacion[]; problemas: string[] } {
  if (!Array.isArray(entrada) || entrada.length === 0) {
    return { escalones: [], problemas: ['La cadena necesita al menos un escalón'] };
  }

  const problemas: string[] = [];
  const escalones = entrada.map((bruto: any, i): EscalonLiquidacion => {
    const n = i + 1;
    const nombre = typeof bruto?.nombre === 'string' ? bruto.nombre.trim() : '';
    const papel = PAPELES_LIQUIDACION.includes(bruto?.papel) ? (bruto.papel as PapelLiquidacion) : null;
    const roles: string[] = Array.isArray(bruto?.roles)
      ? [...new Set<string>(bruto.roles.filter((r: unknown) => typeof r === 'string' && r.trim()).map((r: string) => r.trim()))]
      : [];
    const acciones = (Array.isArray(bruto?.acciones) ? bruto.acciones : ['APROBAR', 'DEVOLVER']).filter(
      (a: unknown): a is AccionLiquidacion => ACCIONES_LIQUIDACION.includes(a as AccionLiquidacion),
    );

    if (!nombre) problemas.push(`El escalón ${n} necesita un nombre`);
    if (bruto?.papel && !papel) problemas.push(`El escalón ${n} nombra un papel que no existe: ${bruto.papel}`);
    if (!papel && !roles.length) {
      problemas.push(`El escalón ${n} no tiene quién decida: elige el abogado, la líder o un rol`);
    }
    if (!acciones.includes('APROBAR')) {
      problemas.push(`El escalón ${n} tiene que poder aprobar: si no, la liquidación nunca avanzaría`);
    }

    return { nombre, papel, roles: papel ? [] : roles, acciones: ACCIONES_LIQUIDACION.filter((a) => acciones.includes(a)) };
  });

  return { escalones, problemas };
}

export interface QuienDecide {
  usuarioId: string;
  roles: string[];
}

export interface AsignadosDelTramite {
  abogadoId: string | null;
  liderId: string | null;
}

/** Si quien mira es responsable del escalón. */
export function esResponsable(escalon: EscalonLiquidacion, quien: QuienDecide, tramite: AsignadosDelTramite): boolean {
  if (escalon.papel === 'ABOGADO') return !!quien.usuarioId && quien.usuarioId === tramite.abogadoId;
  if (escalon.papel === 'LIDER') return !!quien.usuarioId && quien.usuarioId === tramite.liderId;
  return escalon.roles.some((r) => quien.roles.includes(r));
}

/** Por qué quien mira no puede tomar esta decisión, o `null`. */
export function motivoParaNoDecidir(
  escalon: EscalonLiquidacionEnRonda | undefined,
  accion: AccionLiquidacion,
  quien: QuienDecide,
  tramite: AsignadosDelTramite,
): string | null {
  if (!escalon) return 'La ronda no tiene ningún escalón pendiente de decidir';
  if (!esResponsable(escalon, quien, tramite)) {
    const quienEs =
      escalon.papel === 'ABOGADO'
        ? 'el abogado asignado'
        : escalon.papel === 'LIDER'
          ? 'la líder que asignó la liquidación'
          : 'quien tenga el rol del escalón';
    return `Este escalón («${escalon.nombre}») lo decide ${quienEs}`;
  }
  if (!escalon.acciones.includes(accion)) {
    return `El escalón «${escalon.nombre}» no puede ${accion === 'DEVOLVER' ? 'devolver' : 'aprobar'}`;
  }
  return null;
}

/** Los escalones de una ronda nueva: el primero pendiente, los demás bloqueados. */
export function abrirRonda(escalones: EscalonLiquidacion[]): EscalonLiquidacionEnRonda[] {
  return escalones.map((e, i) => ({ ...e, orden: i + 1, estado: i === 0 ? 'PENDIENTE' : 'BLOQUEADO' }));
}

export interface TrasDecidir {
  escalones: EscalonLiquidacionEnRonda[];
  ronda: EstadoRondaLiquidacion;
  escalonActual: number | null;
  tramite: EstadoTramiteLiquidacion;
}

/**
 * En qué queda todo después de que el escalón pendiente decide.
 *
 * Aprobar pasa al siguiente o, en el último, cierra la ronda: la revisión
 * aprobada pasa al acta (el abogado incorpora los ajustes y la manda al visto
 * bueno, pasos 5-7); el visto bueno aprobado, a la firma del área (pasos 10-11).
 * Devolver cierra la ronda en el acto y va a quien envió: en la revisión, al
 * área (pasos 3 y 5); en el visto bueno, al abogado, que vuelve al acta. Al
 * reenviar, la cadena empieza otra vez desde el primero.
 */
export function trasDecidir(
  fase: FaseCadenaLiquidacion,
  escalones: EscalonLiquidacionEnRonda[],
  accion: AccionLiquidacion,
  quien: { nombre: string; usuarioId: string },
  ahora: string,
): TrasDecidir {
  const actual = escalones.find((e) => e.estado === 'PENDIENTE');
  if (!actual) throw new Error('La ronda no tiene escalón pendiente');

  const marcado: EscalonLiquidacionEnRonda = {
    ...actual,
    estado: accion === 'APROBAR' ? 'APROBADO' : 'DEVUELTO',
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
    return { escalones: nuevos, ronda: 'APROBADA', escalonActual: null, tramite: fase === 'REVISION' ? 'ACTA' : 'EN_FIRMA' };
  }

  const cerrados = escalones.map((e) =>
    e.orden === actual.orden ? marcado : e.estado === 'BLOQUEADO' ? { ...e, estado: 'ANULADO' as const } : e,
  );
  return {
    escalones: cerrados,
    ronda: 'DEVUELTA',
    escalonActual: null,
    tramite: fase === 'REVISION' ? 'DEVUELTA' : 'ACTA',
  };
}

// ------------------------------------------------------------ radicado --

/** LIQ-2026-0007 o CIE-2026-0007: un solo consecutivo para los dos. */
export function radicadoDe(clase: ClaseTramiteLiquidacion, anio: number, consecutivo: number): string {
  return `${clase === 'CIERRE' ? 'CIE' : 'LIQ'}-${anio}-${String(consecutivo).padStart(4, '0')}`;
}
