import { AMPAROS_DE_ESTABILIDAD, AmparoVerificado } from '../../entities/cierre-contrato.entity';

/** Un amparo de una garantía aprobada, tal como lo ve esta regla. */
export interface AmparoParaCierre {
  tipo: string;
  nombre: string;
  numeroPoliza: string;
  /** YYYY-MM-DD. */
  vigenciaHasta: string;
}

export interface EstadoDeAmparos {
  /** Todos los de estabilidad y calidad, con su vigencia y si ya vencieron. */
  verificados: AmparoVerificado[];
  /** Los que todavía amparan, que son los que impiden cerrar. */
  pendientes: AmparoVerificado[];
  /** El último que vence, o el que venció de último si ya pasaron todos. */
  ultimoVencimiento: string | null;
  puedeCerrar: boolean;
  /** Por qué no se puede cerrar todavía, dicho con el amparo y su fecha. */
  motivo: string | null;
  /** El contrato no quedó amparado más allá de la ejecución. */
  sinAmparos: boolean;
}

/**
 * Si los amparos de estabilidad y calidad ya vencieron.
 *
 * Es la regla que decide el cierre definitivo (RF-LIQ-05), y tiene dos aristas
 * que conviene tener a la vista:
 *
 * **Solo miran los de estabilidad y calidad.** Cumplimiento, anticipo, salarios
 * y responsabilidad civil se agotan con el contrato; esperar a que venzan para
 * cerrarlo en firme retrasaría el cierre sin proteger nada.
 *
 * **Un contrato sin ninguno de esos amparos se puede cerrar de entrada.** Los de
 * servicios profesionales no llevan estabilidad de obra, y tratar la ausencia
 * como un pendiente dejaría abiertos para siempre casi todos los contratos de la
 * entidad. Decisión del equipo: la ausencia de amparo no es un amparo vigente.
 *
 * Un amparo que vence hoy **todavía ampara hoy**: se cuenta vencido a partir del
 * día siguiente. Redondear al revés cerraría el contrato el último día de
 * cobertura.
 *
 * Función pura para poder probarla sin base de datos.
 */
export function amparosParaCerrar(
  amparos: AmparoParaCierre[],
  hoy: string,
): EstadoDeAmparos {
  const deEstabilidad = amparos.filter((a) =>
    (AMPAROS_DE_ESTABILIDAD as readonly string[]).includes(a.tipo),
  );

  const verificados: AmparoVerificado[] = deEstabilidad
    .map((a) => ({
      tipo: a.tipo,
      nombre: a.nombre,
      numeroPoliza: a.numeroPoliza,
      vigenciaHasta: a.vigenciaHasta,
      vencido: a.vigenciaHasta < hoy,
    }))
    .sort((a, b) => a.vigenciaHasta.localeCompare(b.vigenciaHasta));

  const pendientes = verificados.filter((a) => !a.vencido);

  const ultimoVencimiento =
    verificados.length > 0 ? verificados[verificados.length - 1].vigenciaHasta : null;

  if (verificados.length === 0) {
    return {
      verificados,
      pendientes,
      ultimoVencimiento,
      puedeCerrar: true,
      motivo: null,
      sinAmparos: true,
    };
  }

  if (pendientes.length === 0) {
    return {
      verificados,
      pendientes,
      ultimoVencimiento,
      puedeCerrar: true,
      motivo: null,
      sinAmparos: false,
    };
  }

  // El que vence primero es el que marca la espera más corta, pero el contrato
  // no se cierra hasta que caigan todos: se nombra el último.
  const ultimo = pendientes[pendientes.length - 1];

  return {
    verificados,
    pendientes,
    ultimoVencimiento,
    puedeCerrar: false,
    motivo:
      pendientes.length === 1
        ? `el amparo de ${ultimo.nombre.toLowerCase()} de la póliza ${ultimo.numeroPoliza} ampara hasta el ${ultimo.vigenciaHasta}`
        : `quedan ${pendientes.length} amparos vigentes; el último ampara hasta el ${ultimo.vigenciaHasta}`,
    sinAmparos: false,
  };
}
