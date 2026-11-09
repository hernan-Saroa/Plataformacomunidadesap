import { BadRequestException } from '@nestjs/common';

import { ETAPAS_DEL_CRONOGRAMA } from './cronograma-etapas';

/**
 * El cronograma por actividad (138, sesión de QA del 04/11, EFDS-1152).
 *
 * El de la 135 solo programaba etapas macro y se quedaba corto: dentro de una
 * misma etapa hay actividades con plazo propio —el de observaciones, el de
 * subsanaciones, el cierre de ofertas— que necesitan su alerta. Sigue sin ser
 * obligatorio: sin fecha de fin una actividad no se programa ni alerta.
 *
 * Cada actividad programada dice además cuántos días antes se avisa, a quién y
 * por qué canal. En las del flujo, cumplida no se marca, se deriva: la
 * actividad quedó aprobada, no aplica, o el proceso terminó.
 *
 * Desde la 139 hay también actividades propias del proceso: las que el flujo no
 * tiene (una visita técnica, una mesa con los interesados…). No llevan numeral
 * sino nombre y etapa, y como no hay actividad del flujo que aprobar, cumplida
 * se marca a mano. Y una adenda de cronograma puede mover las fechas: las fija
 * al emitirse y se aplican al publicarse.
 */

/** A quién se le puede avisar del vencimiento de una actividad del cronograma. */
export const DESTINOS_CRONOGRAMA = [
  /** Quien la hace en el proceso, por su regla o por el puesto del abogado. */
  'QUIEN_LA_HACE',
  /** El abogado estructurador del proceso (su puesto). */
  'ABOGADO_ESTRUCTURADOR',
  /** El abogado revisor del proceso (su puesto). */
  'ABOGADO_REVISOR',
  /** Las cuentas con el rol de archivo y supervisión. */
  'GESTOR_DE_ARCHIVO',
] as const;
export type DestinoCronograma = (typeof DESTINOS_CRONOGRAMA)[number];

/** Por dónde sale el aviso. */
export const CANALES_CRONOGRAMA = ['CAMPANA', 'CORREO', 'AMBOS'] as const;
export type CanalCronograma = (typeof CANALES_CRONOGRAMA)[number];

/** Lo que llega de la pantalla por cada actividad. */
export interface ActividadProgramada {
  /** Las del flujo se identifican por su numeral. */
  numeral?: string | null;
  /** Una propia ya guardada, por su id (139); una nueva llega sin él. */
  id?: string | null;
  /** Solo las propias: cómo se llama y en qué etapa va (139). */
  nombre?: string | null;
  etapa?: number | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  diasAntes?: number | null;
  avisarA?: string[] | null;
  canal?: string | null;
  correos?: string[] | null;
  nota?: string | null;
}

/** Cómo se nombra una actividad en los mensajes: su numeral, o su nombre si es propia. */
export const nombreEnMensaje = (a: ActividadProgramada) => a.numeral || `«${a.nombre?.trim() || 'sin nombre'}»`;

/**
 * Lo que el formulario no puede mandar aunque cada campo sea válido por sí solo.
 *
 * `propiasDelProceso` son los ids de las propias que ya tiene el proceso: una
 * que llegue con otro id no es suya.
 */
export function validarActividades(
  actividades: ActividadProgramada[],
  numeralesValidos: Set<string>,
  propiasDelProceso: Set<string> = new Set(),
) {
  const vistos = new Set<string>();
  for (const a of actividades) {
    if (a.numeral) {
      if (a.id || a.nombre) {
        throw new BadRequestException(`La actividad ${a.numeral} es del flujo: no lleva nombre propio`);
      }
      if (vistos.has(a.numeral)) throw new BadRequestException(`La actividad ${a.numeral} viene dos veces`);
      vistos.add(a.numeral);
      if (!numeralesValidos.has(a.numeral)) {
        throw new BadRequestException(`La actividad ${a.numeral} no hace parte del proceso`);
      }
    } else {
      validarPropia(a, propiasDelProceso, vistos);
    }

    const n = nombreEnMensaje(a);
    if (a.fechaInicio && !a.fechaFin) {
      throw new BadRequestException(`${n}: falta la fecha de fin, que es contra la que se alerta`);
    }
    if (a.fechaInicio && a.fechaFin && a.fechaInicio > a.fechaFin) {
      throw new BadRequestException(`${n}: la fecha de inicio no puede ser posterior a la de fin`);
    }
    for (const d of a.avisarA ?? []) {
      if (!(DESTINOS_CRONOGRAMA as readonly string[]).includes(d)) {
        throw new BadRequestException(`${n}: no se sabe a quién es «${d}»`);
      }
    }
    if (a.canal && !(CANALES_CRONOGRAMA as readonly string[]).includes(a.canal)) {
      throw new BadRequestException(`${n}: el canal es campanita, correo o ambos`);
    }
    for (const c of a.correos ?? []) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.trim())) {
        throw new BadRequestException(`${n}: el correo ${c} no es válido`);
      }
    }
    if (a.fechaFin && !(a.avisarA?.length || a.correos?.length)) {
      throw new BadRequestException(`${n}: di a quién se le avisa del vencimiento`);
    }
  }
}

/** Una actividad propia (139): nombre, etapa, fecha de fin y, si ya existe, que sea del proceso. */
function validarPropia(a: ActividadProgramada, propiasDelProceso: Set<string>, vistos: Set<string>) {
  const nombre = a.nombre?.trim();
  if (!nombre) throw new BadRequestException('Ponle nombre a la actividad propia');
  if (nombre.length > 200) {
    throw new BadRequestException(`«${nombre.slice(0, 40)}…»: el nombre va hasta 200 caracteres`);
  }
  if (!(ETAPAS_DEL_CRONOGRAMA as readonly number[]).includes(Number(a.etapa))) {
    throw new BadRequestException(`«${nombre}»: di en qué etapa va (5 a 10)`);
  }
  if (!a.fechaFin) {
    throw new BadRequestException(
      `«${nombre}»: una actividad propia necesita fecha de fin, que es contra la que se alerta`,
    );
  }
  if (a.id) {
    if (!propiasDelProceso.has(a.id)) {
      throw new BadRequestException(`«${nombre}» no es una actividad de este proceso`);
    }
    if (vistos.has(a.id)) throw new BadRequestException(`«${nombre}» viene dos veces`);
    vistos.add(a.id);
  }
}

// --------------------------------------------------- cambios por adenda --

/** Una fecha del cronograma que mueve una adenda de cronograma (139). */
export interface CambioDeAdenda {
  /** Etapa macro (clave 5 a 10) o actividad (numeral, o id si es propia). */
  ambito: 'ETAPA' | 'ACTIVIDAD';
  clave: string;
  /** Nombre al emitirla, para mostrarla sin volver a buscarla. */
  nombre?: string | null;
  /** Sin ella se conserva la de inicio que tenía. */
  fechaInicio?: string | null;
  fechaFin: string;
  /** Lo que había antes: se llena al publicarla, que es cuando se aplica. */
  antes?: { fechaInicio: string | null; fechaFin: string | null } | null;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Lo que una adenda puede mover, antes de mirar la base: fechas bien formadas,
 * sin repetir lo mismo, y sin la 6.1 cuando la adenda ya mueve el cierre por su
 * cuenta (dos fechas para el mismo cierre se contradirían).
 */
export function validarCambiosDeAdenda(cambios: CambioDeAdenda[], mueveElCierre: boolean) {
  const vistos = new Set<string>();
  for (const c of cambios) {
    if (c.ambito !== 'ETAPA' && c.ambito !== 'ACTIVIDAD') {
      throw new BadRequestException('Cada fecha de la adenda es de una etapa o de una actividad del cronograma');
    }
    if (!c.clave) throw new BadRequestException('Falta qué etapa o actividad mueve la adenda');
    const quien = c.ambito === 'ETAPA' ? `Etapa ${c.clave}` : (c.nombre ?? c.clave);
    const llave = `${c.ambito}:${c.clave}`;
    if (vistos.has(llave)) throw new BadRequestException(`${quien} viene dos veces en la adenda`);
    vistos.add(llave);
    if (!c.fechaFin || !FECHA.test(c.fechaFin)) {
      throw new BadRequestException(`${quien}: falta la nueva fecha de fin (YYYY-MM-DD)`);
    }
    if (c.fechaInicio && !FECHA.test(c.fechaInicio)) {
      throw new BadRequestException(`${quien}: la nueva fecha de inicio va en formato YYYY-MM-DD`);
    }
    if (c.fechaInicio && c.fechaInicio > c.fechaFin) {
      throw new BadRequestException(`${quien}: la fecha de inicio no puede ser posterior a la de fin`);
    }
    if (mueveElCierre && c.ambito === 'ACTIVIDAD' && c.clave === '6.1') {
      throw new BadRequestException(
        'La 6.1 se mueve con la nueva fecha de cierre de la adenda: no la repitas en las fechas del cronograma',
      );
    }
  }
}

/** Una fila de programación, antes o después del cambio. */
export interface FechasProgramadas {
  fechaInicio: string | null;
  fechaFin: string | null;
}

/**
 * Qué fechas cambiaron, para el historial del cronograma.
 *
 * Solo las fechas: cambiar a quién se avisa no es un cambio del cronograma
 * frente a los interesados, y llenar el historial con eso escondería lo que sí
 * lo es.
 */
export function cambiosDeFechas(
  antes: Map<string, FechasProgramadas>,
  despues: Map<string, FechasProgramadas>,
): { clave: string; antes: FechasProgramadas | null; despues: FechasProgramadas | null }[] {
  const claves = new Set([...antes.keys(), ...despues.keys()]);
  const cambios = [];
  for (const clave of claves) {
    const a = antes.get(clave) ?? null;
    const d = despues.get(clave) ?? null;
    if ((a?.fechaInicio ?? null) === (d?.fechaInicio ?? null) && (a?.fechaFin ?? null) === (d?.fechaFin ?? null)) {
      continue;
    }
    cambios.push({ clave, antes: a, despues: d });
  }
  return cambios.sort((x, y) => x.clave.localeCompare(y.clave, 'es', { numeric: true }));
}

/**
 * La condición SQL de «la actividad ya se cumplió», sobre una fila `c` de
 * `hiring.cronograma_actividades` y su proceso `p`. Una propia (139) no tiene
 * actividad del flujo que aprobar: se cumple cuando se marca.
 */
export const SQL_ACTIVIDAD_CUMPLIDA = `(
  c.cumplida_at IS NOT NULL
  OR p.estado IN ('DESIERTO', 'NEGADO', 'CANCELADO')
  OR EXISTS (
    SELECT 1 FROM hiring.proceso_actividades pa
     WHERE pa.proceso_id = c.proceso_id
       AND pa.numeral = c.numeral
       AND pa.estado IN ('APROBADO', 'NO_APLICA')
  )
  OR EXISTS (
    SELECT 1 FROM hiring.contratos k
     WHERE k.proceso_id = c.proceso_id AND k.estado IN ('LIQUIDADO', 'CERRADO')
  )
)`;
