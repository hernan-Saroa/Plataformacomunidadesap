import { EntityManager } from 'typeorm';

import { Accion } from '../../auth/alcance';
import { HiringAccess } from '../../auth/hiring-access';
import { accionQueHace } from '../../auth/la-hace';
import {
  FilaAsignacion,
  aLaHace,
  asignacionQueRige,
  filasDeVersiones,
  versionesDeProcesos,
} from '../../flujo/lectura';

/**
 * Una actividad de la que no responden los roles con el permiso sino quien
 * dice la regla «quién la hace» (109) de la versión del flujo del proceso
 * (111): el ocupante de un puesto en el proceso o unas personas nombradas.
 *
 * Antes era una lista escrita aquí —la 3.4, la 3.6 y la 3.7 eran del
 * abogado—; ahora sale de Configuración, y viaja con cada actividad para que
 * la pantalla diga a quién le toca con la misma regla que exige el servidor.
 */
export interface RespondeElAsignado {
  /** El puesto que la hace, o `null` si la hacen personas nombradas. */
  puesto: string | null;
  /** Quién la hace en este proceso, o `null` si el puesto está vacío. */
  persona: { nombre: string; esMio: boolean } | null;
  /** El permiso que tiene que tener para hacerla. */
  accion: Exclude<Accion, 'ver'>;
  /** Se conservan para la pantalla: un puesto se asigna, no se toma. */
  soloEnRevision: false;
  seToma: false;
}

/** Lo que hace falta para resolver `responde` en muchas actividades a la vez. */
export interface ContextoResponde {
  /** Por versión del flujo, sus asignaciones (111). */
  filasPorVersion: Map<string, FilaAsignacion[]>;
  /** La versión con la que corre cada proceso. */
  versionDe: Map<string, string>;
  puestos: Map<string, string>;
  /** Por proceso, quién ocupa cada puesto. */
  ocupantes: Map<string, Map<string, { nombre: string; usuarioId: string; usuarioNombre: string }>>;
  personas: Map<string, string>;
  /** El `id_person` de quien consulta, para saber si una persona nombrada es él. */
  miPersona: string | null;
}

export async function cargarResponde(
  em: EntityManager,
  procesoIds: string[],
  acceso?: Pick<HiringAccess, 'userId'>,
): Promise<ContextoResponde> {
  const versionDe = await versionesDeProcesos(em, procesoIds);
  const filasPorVersion = await filasDeVersiones(em, [...versionDe.values()]);
  const puestos = new Map<string, string>(
    (await em.query(`SELECT id::text AS id, nombre FROM hiring.puestos_proceso`)).map((f: any) => [f.id, f.nombre]),
  );
  const ocupantes = new Map<string, Map<string, { nombre: string; usuarioId: string; usuarioNombre: string }>>();
  if (procesoIds.length) {
    const filas = await em.query(
      `SELECT proceso_id::text AS proceso, puesto_id::text AS puesto, nombre, usuario_id::text AS "usuarioId",
              usuario_nombre AS "usuarioNombre"
         FROM hiring.asignaciones_puesto
        WHERE estado = 'VIGENTE' AND proceso_id::text = ANY($1::text[])`,
      [procesoIds],
    );
    for (const f of filas) {
      const delProceso = ocupantes.get(f.proceso) ?? new Map();
      delProceso.set(f.puesto, { nombre: f.nombre, usuarioId: f.usuarioId, usuarioNombre: f.usuarioNombre });
      ocupantes.set(f.proceso, delProceso);
    }
  }
  const ids = [
    ...new Set(
      [...filasPorVersion.values()].flat().flatMap((f) => (f.laHace?.tipo === 'PERSONAS' ? f.laHace.personas : [])),
    ),
  ];
  const personas = new Map<string, string>(
    ids.length
      ? (
          await em.query(
            `SELECT id_person::text AS id, COALESCE(nom_largo, nom_tercero) AS nombre
               FROM auth.personas WHERE id_person::text = ANY($1::text[])`,
            [ids],
          )
        ).map((f: any) => [f.id, f.nombre])
      : [],
  );
  const [cuenta] = acceso?.userId
    ? await em.query(`SELECT id_person::text AS id FROM auth."user" WHERE id_user::text = $1`, [acceso.userId])
    : [];
  return { filasPorVersion, versionDe, puestos, ocupantes, personas, miPersona: cuenta?.id ?? null };
}

/** Quién responde por la actividad en el proceso, o `null` si los roles del alcance. */
export function respondeEn(
  ctx: ContextoResponde,
  procesoId: string,
  modalidad: string | null,
  numeral: string,
  acceso?: Pick<HiringAccess, 'userId' | 'userName'>,
): RespondeElAsignado | null {
  const filas = ctx.filasPorVersion.get(ctx.versionDe.get(procesoId) ?? '') ?? [];
  const regla = aLaHace(asignacionQueRige(filas, numeral, modalidad).laHace);
  if (!regla) return null;
  const base = { accion: accionQueHace(numeral), soloEnRevision: false as const, seToma: false as const };

  if ('puestoId' in regla) {
    const ocupa = ctx.ocupantes.get(procesoId)?.get(regla.puestoId);
    const igual = (x?: string | null, y?: string | null) =>
      !!x && !!y && x.trim().toLowerCase() === y.trim().toLowerCase();
    return {
      ...base,
      puesto: ctx.puestos.get(regla.puestoId) ?? 'Puesto que ya no existe',
      persona: ocupa
        ? {
            nombre: ocupa.nombre,
            esMio: igual(ocupa.usuarioId, acceso?.userId) || igual(ocupa.usuarioNombre, acceso?.userName),
          }
        : null,
    };
  }

  return {
    ...base,
    puesto: null,
    persona: {
      nombre: regla.personas.map((p) => ctx.personas.get(p) ?? 'Persona del directorio').join(' o '),
      esMio: !!ctx.miPersona && regla.personas.includes(ctx.miPersona),
    },
  };
}
