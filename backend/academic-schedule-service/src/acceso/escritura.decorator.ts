import { SetMetadata } from '@nestjs/common';

import type { TipoAncla } from './alcance.service.js';

export const CLAVE_ESCRITURA = 'programacion_escritura';

export const CLAVE_LECTURA = 'programacion_lectura';

/** De qué parte del request sale el id del recurso anclado. */
export type Fuente = { param: string } | { body: string } | { query: string };

/** Recursos que la ruta toca, y de dónde sale el id de cada uno. */
export type Anclas = Partial<Record<TipoAncla, Fuente>>;

export interface ReglaEscritura {
  /** Recursos de los que se deducen el periodo y el nivel. `null`: no cuelga de un periodo. */
  anclas: Anclas | null;
  /**
   * RN-08 en escritura: exige poder programar el nivel del recurso. Solo para
   * rutas del backoffice de programación; el portal y la jefatura tienen sus
   * propias reglas de rol.
   */
  exigeNivel: boolean | 'asignacion';
  /** Por qué una ruta no cuelga de un periodo. Obligatorio en ese caso: queda escrito. */
  motivo?: string;
}

/**
 * Declara que la escritura toca recursos de un periodo — EFDS-2301.
 *
 * El guard global (`EscrituraGuard`) resuelve el periodo de cada recurso y
 * rechaza la escritura si alguno está cerrado. Con `exigeNivel`, además exige
 * poder programar el nivel del recurso (EFDS-2302).
 *
 *   @EscrituraEn({ grupo: { param: 'id' } }, { exigeNivel: true })
 *   @EscrituraEn({ periodo: { body: 'idPeriodo' }, asignatura: { body: 'idAsignatura' } }, ...)
 */
/*
 * `exigeNivel: 'asignacion'` (EFDS-2342): exige poder ASIGNAR docentes en el nivel
 * del recurso, no programarlo. Asignar y programar son permisos distintos.
 */
export const EscrituraEn = (anclas: Anclas, opciones: { exigeNivel?: boolean | 'asignacion' } = {}) =>
  SetMetadata(CLAVE_ESCRITURA, {
    anclas,
    exigeNivel: opciones.exigeNivel ?? false,
  } satisfies ReglaEscritura);

/**
 * Lectura de UN recurso de un nivel — EFDS-2302 (RN-08 en lectura).
 *
 * El guard exige poder programar el nivel del recurso antes de dejarlo leer.
 * Las LISTAS no usan esto: filtran en SQL por los niveles visibles
 * (`condicionNivelSql`), porque devuelven recursos de varios niveles a la vez.
 */
export const LecturaEn = (anclas: Anclas) => SetMetadata(CLAVE_LECTURA, anclas);

/**
 * Declara, con su motivo, que la escritura NO cuelga de un periodo (p. ej. el
 * catálogo de aulas, o crear un periodo). Una ruta de escritura sin ninguna de
 * las dos declaraciones se rechaza: el olvido no abre una puerta.
 */
export const EscrituraSinPeriodo = (motivo: string) =>
  SetMetadata(CLAVE_ESCRITURA, { anclas: null, exigeNivel: false, motivo } satisfies ReglaEscritura);
