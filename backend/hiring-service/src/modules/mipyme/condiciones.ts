/**
 * Condiciones que habilitan la limitación a MIPYME (EFDS-1151).
 *
 * Función pura y sin base de datos: es la regla de la que depende si una
 * convocatoria se restringe, y conviene poder probarla contra los bordes —el
 * proceso que vale exactamente el tope, la MIPYME número tres— sin levantar
 * Postgres.
 *
 * El sistema calcula; la entidad decide. Nada de esto obliga a nada: lo que
 * produce es la fotografía de las condiciones en el momento de decidir.
 */

export type UnidadTope = 'SMMLV' | 'PESOS';

export interface EntradaCondiciones {
  /** Cuantía del proceso, en pesos. Null en procesos anteriores a EFDS-1323. */
  valorProceso: number | null;
  /** MIPYME distintas que manifestaron interés. */
  manifestaciones: number;
  topeValor: number;
  unidadTope: UnidadTope;
  /** Salario del año, para convertir el tope cuando viene en SMMLV. */
  smmlv: number | null;
  minimoManifestaciones: number;
}

export interface Condicion {
  /** Null cuando falta un dato para poder evaluarla. */
  cumple: boolean | null;
  /** Qué se comparó, en la forma en que se le muestra a quien decide. */
  detalle: string;
}

export interface ResultadoCondiciones {
  valor: Condicion;
  manifestaciones: Condicion;
  /** Solo true si ambas se pudieron evaluar y ambas se cumplen. */
  cumplidas: boolean;
  /** Tope llevado a pesos; null si no se pudo convertir. */
  topeEnPesos: number | null;
}

const pesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/**
 * Evalúa las dos condiciones de la limitación.
 *
 * Una condición que no se puede evaluar devuelve `cumple: null`, no `false`.
 * La diferencia importa: "no alcanza el tope" y "no sé cuánto vale el proceso"
 * llevan a decisiones distintas, y colapsarlas en un falso le haría creer a
 * quien decide que la regla ya se comprobó.
 */
export function evaluarCondiciones(entrada: EntradaCondiciones): ResultadoCondiciones {
  const { valorProceso, manifestaciones, topeValor, unidadTope, smmlv, minimoManifestaciones } =
    entrada;

  const topeEnPesos =
    unidadTope === 'PESOS' ? topeValor : smmlv === null ? null : topeValor * smmlv;

  const valor: Condicion =
    topeEnPesos === null
      ? {
          cumple: null,
          detalle: `El tope está en SMMLV y no hay salario mínimo registrado para convertirlo`,
        }
      : valorProceso === null
        ? { cumple: null, detalle: 'El proceso no tiene valor estimado registrado' }
        : {
            cumple: valorProceso <= topeEnPesos,
            detalle: `${pesos.format(valorProceso)} frente a un tope de ${pesos.format(topeEnPesos)}`,
          };

  const manifestacion: Condicion = {
    cumple: manifestaciones >= minimoManifestaciones,
    detalle:
      manifestaciones >= minimoManifestaciones
        ? `${manifestaciones} de ${minimoManifestaciones} requeridas`
        : `${manifestaciones} de ${minimoManifestaciones} requeridas: faltan ${
            minimoManifestaciones - manifestaciones
          }`,
  };

  return {
    valor,
    manifestaciones: manifestacion,
    cumplidas: valor.cumple === true && manifestacion.cumple === true,
    topeEnPesos,
  };
}
