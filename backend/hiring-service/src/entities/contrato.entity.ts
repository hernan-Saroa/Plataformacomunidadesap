import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * El ciclo del contrato: se genera, el proponente lo acepta y las dos partes lo
 * firman.
 *
 * Rechazar no borra: si el proponente no acepta la minuta, la entidad corrige y
 * genera otra, y las dos quedan en el expediente. Un contrato rechazado existió
 * y es lo que explica que un proceso tenga dos minutas.
 *
 * Ninguno de los tres últimos se declara: los deriva el servicio de hechos que
 * ya ocurrieron. `PERFECCIONADO` de que estén las dos firmas (EFDS-1162),
 * `LEGALIZADO` de que las garantías y la ARL estén aprobadas (EFDS-1164), y
 * `EJECUCION` de que se haya celebrado la reunión de inicio (EFDS-1167).
 */
export type EstadoContrato =
  | 'GENERADO'
  | 'ACEPTADO'
  | 'RECHAZADO'
  | 'PERFECCIONADO'
  | 'LEGALIZADO'
  | 'EJECUCION'
  | 'SUSPENDIDO'
  | 'TERMINADO'
  | 'LIQUIDADO'
  | 'CERRADO';

/**
 * Hasta dónde llegó el contrato en su ciclo.
 *
 * Es la línea recta que va de la minuta al cierre, y responde «ya pasó por»,
 * no «está en». Los estados son acumulativos: quien está liquidado ya pasó por
 * legalizado, y las reglas que los enumeraban una a una —`estado ===
 * 'PERFECCIONADO' || estado === 'LEGALIZADO'`— había que corregirlas cada vez
 * que aparecía uno nuevo.
 *
 * SUSPENDIDO no está aquí y es deliberado: no es un punto del camino sino una
 * pausa sobre el punto en que se iba. Un contrato suspendido llegó tan lejos
 * como uno en ejecución —de hecho estaba ejecutándose—, así que preguntar
 * «hasta dónde llegó» tiene que responder EJECUCION. Meterlo en la recta
 * obligaría a elegir entre dos errores: ponerlo antes de EJECUCION haría que
 * un contrato suspendido dejara de admitir el seguimiento que sí se le hace, y
 * ponerlo después haría que TERMINADO lo superara y admitiera todo.
 *
 * RECHAZADO también queda fuera: no es una fase menos avanzada, es una minuta
 * que no prosperó y no llega a ninguna parte.
 */
const AVANCE: Record<Exclude<EstadoContrato, 'RECHAZADO' | 'SUSPENDIDO'>, number> = {
  GENERADO: 0,
  ACEPTADO: 1,
  PERFECCIONADO: 2,
  LEGALIZADO: 3,
  EJECUCION: 4,
  TERMINADO: 5,
  LIQUIDADO: 6,
  CERRADO: 7,
};

/**
 * Sobre qué punto del ciclo está detenido un contrato suspendido.
 *
 * La suspensión solo ocurre durante la ejecución —RF-MOD-03 la trata junto a
 * la reanudación—, así que el punto es siempre ese. Se nombra en vez de
 * escribirlo suelto para que quede dicho por qué.
 */
const PUNTO_DE_LA_SUSPENSION = 'EJECUCION' as const;

/**
 * Si el contrato alcanzó ese punto de su ciclo, o uno posterior.
 *
 * Un contrato suspendido responde por el punto donde quedó detenido: llegó a
 * la ejecución, y la pausa no le quita el camino recorrido.
 */
export function alMenos(estado: EstadoContrato, minimo: EstadoContrato): boolean {
  // Una minuta rechazada no alcanza ningún punto, ni siquiera los anteriores.
  if (estado === 'RECHAZADO' || minimo === 'RECHAZADO') return false;

  const actual = estado === 'SUSPENDIDO' ? AVANCE[PUNTO_DE_LA_SUSPENSION] : AVANCE[estado];
  const exigido = minimo === 'SUSPENDIDO' ? AVANCE[PUNTO_DE_LA_SUSPENSION] : AVANCE[minimo];

  return actual >= exigido;
}

/**
 * Si el contrato está corriendo ahora mismo.
 *
 * Distinto de `alMenos(estado, 'EJECUCION')`, que responde si llegó a
 * ejecutarse alguna vez: uno terminado también llegó, y sin embargo ya no
 * corre. Las reglas que hablan de lo que ocurre *mientras* el contrato se
 * ejecuta —cargar seguimiento, reasignar supervisión, reportar un
 * incumplimiento— preguntan por esto y no por aquello.
 *
 * Un contrato suspendido sí está en ejecución: la suspensión detiene el plazo,
 * no la relación contractual. Se le sigue vigilando, y de hecho la suspensión
 * suele ser justamente lo que hay que vigilar.
 */
export function enEjecucion(estado: EstadoContrato): boolean {
  return estado === 'EJECUCION' || estado === 'SUSPENDIDO';
}

/**
 * Transiciones válidas del ciclo. Lo que no esté aquí, no se puede hacer.
 *
 * El mapa es el criterio 2 de EFDS-1184 —«cuando se intenta una transición no
 * válida, el sistema la impide»— y sustituye a comparar números de avance: la
 * recta dice si un estado va después de otro, pero no si se puede saltar
 * directamente, y de LEGALIZADO a LIQUIDADO no se llega sin ejecutar.
 *
 * SUSPENDIDO y EJECUCION se alcanzan mutuamente: es la suspensión y la
 * reanudación de RF-MOD-03. Un contrato suspendido también puede terminarse
 * sin reanudarse —la terminación anticipada de un contrato suspendido es
 * justamente un caso típico—.
 *
 * CERRADO y RECHAZADO no llevan a ninguna parte: son finales.
 */
const TRANSICIONES: Record<EstadoContrato, EstadoContrato[]> = {
  GENERADO: ['ACEPTADO', 'RECHAZADO'],
  ACEPTADO: ['PERFECCIONADO'],
  RECHAZADO: [],
  PERFECCIONADO: ['LEGALIZADO'],
  LEGALIZADO: ['EJECUCION'],
  EJECUCION: ['SUSPENDIDO', 'TERMINADO'],
  SUSPENDIDO: ['EJECUCION', 'TERMINADO'],
  TERMINADO: ['LIQUIDADO'],
  LIQUIDADO: ['CERRADO'],
  CERRADO: [],
};

/**
 * Valida un salto de estado del contrato.
 *
 * Función pura y exportada, igual que la del CDP: es la regla que impide, por
 * ejemplo, liquidar un contrato que nadie terminó, y conviene poder probarla
 * sin base de datos.
 */
export function puedeTransicionar(desde: EstadoContrato, hacia: EstadoContrato): boolean {
  return TRANSICIONES[desde]?.includes(hacia) ?? false;
}

/** Determina si la legalización exigirá ARL (EFDS-1164, criterio 2). */
export type TipoPersona = 'NATURAL' | 'JURIDICA';

@Entity('contratos', { schema: 'hiring' })
export class Contrato {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id' })
  procesoId: string;

  @Column({ length: 60 })
  tipologia: string;

  /** Número de contrato de la entidad, el que va en la minuta. */
  @Column({ length: 60 })
  numero: string;

  @Column({ type: 'text' })
  objeto: string;

  /**
   * `numeric` llega como string desde el driver; el transformer lo devuelve como
   * número para que la pantalla no formatee cadenas.
   */
  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    transformer: {
      to: (valor: number) => valor,
      from: (valor: string | null) => (valor === null ? null : Number(valor)),
    },
  })
  valor: number;

  @Column({ name: 'plazo_dias', type: 'int', nullable: true })
  plazoDias: number | null;

  /**
   * Datos del adjudicatario copiados, no referenciados.
   *
   * El contrato dice con quién se contrató ese día: si mañana se corrige el
   * registro del oferente, la minuta tiene que seguir diciendo lo que dice.
   */
  @Column({ name: 'contratista_documento', length: 40 })
  contratistaDocumento: string;

  @Column({ name: 'contratista_nombre', length: 300 })
  contratistaNombre: string;

  @Column({ name: 'contratista_tipo', length: 20 })
  contratistaTipo: TipoPersona;

  /** La minuta diligenciada que se subió. Es el documento, no la plantilla. */
  @Column({ name: 'minuta_documento_id' })
  minutaDocumentoId: string;

  /** De qué formato del SIG salió; nulo si no estaba cargado en la biblioteca. */
  @Column({ name: 'plantilla_id', type: 'uuid', nullable: true })
  plantillaId: string | null;

  @Column({ length: 20, default: 'GENERADO' })
  estado: EstadoContrato;

  @Column({ name: 'generado_por', length: 200, nullable: true })
  generadoPor: string | null;

  @Column({ name: 'generado_at', type: 'timestamptz' })
  generadoAt: Date;

  @Column({ name: 'aceptado_at', type: 'timestamptz', nullable: true })
  aceptadoAt: Date | null;

  @Column({ name: 'aceptado_por', length: 200, nullable: true })
  aceptadoPor: string | null;

  @Column({ name: 'aceptado_observacion', type: 'text', nullable: true })
  aceptadoObservacion: string | null;

  @Column({ name: 'rechazado_at', type: 'timestamptz', nullable: true })
  rechazadoAt: Date | null;

  @Column({ name: 'rechazado_por', length: 200, nullable: true })
  rechazadoPor: string | null;

  @Column({ name: 'motivo_rechazo', type: 'text', nullable: true })
  motivoRechazo: string | null;

  /** Cuándo entró la segunda firma y el contrato quedó suscrito (EFDS-1162). */
  @Column({ name: 'perfeccionado_at', type: 'timestamptz', nullable: true })
  perfeccionadoAt: Date | null;

  /**
   * El contrato ya suscrito, con las dos firmas incorporadas.
   *
   * Distinto de la minuta: aquella es el texto que se presentó al proponente,
   * este es el documento firmado por ambas partes.
   */
  @Column({ name: 'contrato_firmado_documento_id', type: 'uuid', nullable: true })
  contratoFirmadoDocumentoId: string | null;

  /**
   * Cuándo quedó legalizado (EFDS-1164).
   *
   * Se alcanza con todas las garantías aprobadas y, si el contratista es
   * persona natural, la ARL registrada. Lo deriva el servicio.
   */
  @Column({ name: 'legalizado_at', type: 'timestamptz', nullable: true })
  legalizadoAt: Date | null;

  /**
   * Desde cuándo está en ejecución (EFDS-1167).
   *
   * Es la fecha de la reunión de inicio, no la del registro: el contrato
   * empezó el día que las partes se sentaron, aunque se anotara después.
   */
  @Column({ name: 'ejecucion_desde', type: 'date', nullable: true })
  ejecucionDesde: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
