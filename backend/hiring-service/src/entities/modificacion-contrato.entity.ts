import { Column, CreateDateColumn, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

/** `numeric` llega como string del driver; se devuelve como número. */
const aNumero = {
  to: (valor: number | null) => valor,
  from: (valor: string | null) => (valor === null ? null : Number(valor)),
};

/** Actividad 9.5 de la matriz: las modificaciones contractuales. */
export const NUMERAL_MODIFICACIONES = '9.5';

/**
 * Los siete tipos que lista la matriz.
 *
 * Solo `ADICION` tiene trámite hoy (EFDS-1176). Los demás se declaran para que
 * EFDS-1177 —prórroga— y EFDS-1178 —cesión, aclaratorio y suspensión— no tengan
 * que migrar el CHECK ni reinventar los códigos. `TERMINACION_ANTICIPADA`
 * aparece en la matriz y todavía no tiene historia asignada.
 */
export type TipoModificacion =
  | 'ADICION'
  | 'PRORROGA'
  | 'CESION'
  | 'ACLARATORIO'
  | 'SUSPENSION'
  | 'REANUDACION'
  | 'TERMINACION_ANTICIPADA';

/**
 * El ciclo de una modificación.
 *
 * `EN_TRAMITE` es lo que da sentido al segundo criterio de la historia: sin un
 * estado previo a la aprobación no habría un intento que impedir cuando falta
 * el CDP o el RP.
 */
export type EstadoModificacion = 'EN_TRAMITE' | 'APROBADA' | 'RECHAZADA' | 'REVOCADA';

/**
 * Modificación contractual — actividad 9.5 (EFDS-1176, RF-MOD-01 y RF-MOD-05).
 *
 * Genérica a propósito: el acto administrativo, la justificación y la
 * publicación son comunes a los siete tipos, y una tabla por tipo obligaría a
 * duplicarlos.
 */
@Entity('modificaciones_contrato', { schema: 'hiring' })
export class ModificacionContrato {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contrato_id' })
  contratoId: string;

  @Column({ length: 30 })
  tipo: TipoModificacion;

  @Column({ length: 80, nullable: true })
  numero: string | null;

  @Column({ name: 'fecha_suscripcion', type: 'date', nullable: true })
  fechaSuscripcion: string | null;

  /** Por qué se modifica. Lo primero que un ente de control pregunta. */
  @Column({ type: 'text' })
  justificacion: string;

  /** El otrosí o el acto administrativo firmado; se aporta al aprobar. */
  @Column({ name: 'documento_id', type: 'uuid', nullable: true })
  documentoId: string | null;

  @Column({ length: 20, default: 'EN_TRAMITE' })
  estado: EstadoModificacion;

  // ------------------------------------------------ lo propio de la adición --

  @Column({ name: 'valor_adicionado', type: 'numeric', precision: 18, scale: 2, nullable: true, transformer: aNumero })
  valorAdicionado: number | null;

  /** El CDP que respalda la adición; no el del proceso. */
  @Column({ name: 'cdp_id', type: 'uuid', nullable: true })
  cdpId: string | null;

  /** El RP que compromete la adición; no el del contrato. */
  @Column({ name: 'rp_id', type: 'uuid', nullable: true })
  rpId: string | null;

  /**
   * El valor del contrato antes y después, y el tope con el que se juzgó.
   *
   * Congelado con el criterio del resto del módulo: si mañana entra otra
   * adición —o cambia el parámetro—, esta sigue explicando sobre qué se calculó.
   */
  @Column({ name: 'valor_contrato_antes', type: 'numeric', precision: 18, scale: 2, nullable: true, transformer: aNumero })
  valorContratoAntes: number | null;

  @Column({ name: 'valor_contrato_despues', type: 'numeric', precision: 18, scale: 2, nullable: true, transformer: aNumero })
  valorContratoDespues: number | null;

  @Column({ name: 'tope_porcentaje', type: 'numeric', precision: 5, scale: 2, nullable: true, transformer: aNumero })
  topePorcentaje: number | null;

  // ------------------------------------------- prorroga (EFDS-1177) --

  /** Dias que la prorroga anade al plazo. La reanudacion deriva los suyos. */
  @Column({ name: 'dias_prorroga', type: 'int', nullable: true })
  diasProrroga: number | null;

  /**
   * El plazo antes y despues, en dias.
   *
   * Mismo criterio que el valor en la adicion: `contratos.plazo_dias` dice
   * cuanto es hoy, y esto dice que hizo cada modificacion. Sin el «antes» no se
   * puede revocar sin adivinar.
   */
  @Column({ name: 'plazo_dias_antes', type: 'int', nullable: true })
  plazoDiasAntes: number | null;

  @Column({ name: 'plazo_dias_despues', type: 'int', nullable: true })
  plazoDiasDespues: number | null;

  // ------------------------------ suspension y reanudacion (EFDS-1178) --

  @Column({ name: 'suspension_desde', type: 'date', nullable: true })
  suspensionDesde: string | null;

  /** Fecha prevista. Puede faltar: hay suspensiones indefinidas. */
  @Column({ name: 'suspension_hasta', type: 'date', nullable: true })
  suspensionHasta: string | null;

  /** La suspension que esta reanudacion levanta. */
  @Column({ name: 'reanuda_modificacion_id', type: 'uuid', nullable: true })
  reanudaModificacionId: string | null;

  /** Cuando se reanuda de verdad, que manda sobre la fecha prevista. */
  @Column({ name: 'reanudada_el', type: 'date', nullable: true })
  reanudadaEl: string | null;

  // ------------------------------------------------ cesion (EFDS-1178) --

  /** Quien era el contratista. `contratos` se queda con el cesionario. */
  @Column({ name: 'cedente_documento', length: 40, nullable: true })
  cedenteDocumento: string | null;

  @Column({ name: 'cedente_nombre', length: 300, nullable: true })
  cedenteNombre: string | null;

  /** De el depende la ARL: revocar sin devolverlo dejaria la exigencia torcida. */
  @Column({ name: 'cedente_tipo', length: 20, nullable: true })
  cedenteTipo: string | null;

  @Column({ name: 'cesionario_documento', length: 40, nullable: true })
  cesionarioDocumento: string | null;

  @Column({ name: 'cesionario_nombre', length: 300, nullable: true })
  cesionarioNombre: string | null;

  @Column({ name: 'cesionario_tipo', length: 20, nullable: true })
  cesionarioTipo: string | null;

  @Column({ name: 'solicitada_por', length: 200, nullable: true })
  solicitadaPor: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'aprobada_por', length: 200, nullable: true })
  aprobadaPor: string | null;

  @Column({ name: 'aprobada_at', type: 'timestamptz', nullable: true })
  aprobadaAt: Date | null;

  @Column({ name: 'revocada_at', type: 'timestamptz', nullable: true })
  revocadaAt: Date | null;

  @Column({ name: 'revocada_por', length: 200, nullable: true })
  revocadaPor: string | null;

  @Column({ name: 'motivo_revocacion', type: 'text', nullable: true })
  motivoRevocacion: string | null;
}

/**
 * Tope legal de la adición, parametrizable.
 *
 * Fila única, como los plazos de publicación. A diferencia de los umbrales de
 * cuantía, este **bloquea**: un umbral mal puesto produce una modalidad
 * equivocada que alguien corrige; una adición por encima del tope es una
 * decisión contraria a la ley que ya se tomó.
 */
@Entity('tope_adicion', { schema: 'hiring' })
export class TopeAdicion {
  @PrimaryColumn({ type: 'int', default: 1 })
  id: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, transformer: aNumero })
  porcentaje: number;

  @Column({ type: 'text', nullable: true })
  fundamento: string | null;

  /** False mientras la Dirección de Contratación no ratifique la cifra. */
  @Column({ default: false })
  confirmado: boolean;

  @Column({ name: 'actualizado_at', type: 'timestamptz' })
  actualizadoAt: Date;
}

/**
 * Publicación de la modificación en SECOP II (RF-MOD-05).
 *
 * Una sola por modificación, y sin destino: a diferencia de las publicaciones
 * del contrato (8.8) y del acta (10.4), RF-MOD-05 nombra únicamente SECOP II.
 */
@Entity('publicaciones_modificacion', { schema: 'hiring' })
export class PublicacionModificacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'modificacion_id' })
  modificacionId: string;

  /** La real, no la del registro. */
  @Column({ name: 'fecha_publicacion', type: 'date' })
  fechaPublicacion: string;

  @Column({ name: 'secop_numero', length: 80, nullable: true })
  secopNumero: string | null;

  @Column({ name: 'secop_url', type: 'text', nullable: true })
  secopUrl: string | null;

  /** Obligatoria: sin soporte no hay publicación registrada. */
  @Column({ name: 'documento_id' })
  documentoId: string;

  @Column({ name: 'publicada_por', length: 200, nullable: true })
  publicadaPor: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
