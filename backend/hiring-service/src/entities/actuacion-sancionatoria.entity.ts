import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** `numeric` llega como string del driver; se devuelve como número. */
const aNumero = {
  to: (valor: number | null) => valor,
  from: (valor: string | null) => (valor === null ? null : Number(valor)),
};

/**
 * En qué quedó la audiencia.
 *
 * `CITADA` mira al futuro y es el único estado del módulo que lo hace: todo lo
 * demás transcribe hechos ocurridos. Una citación que no pudiera ser futura no
 * serviría para citar a nadie.
 */
export type EstadoAudiencia = 'CITADA' | 'CELEBRADA' | 'SUSPENDIDA' | 'CANCELADA';

/**
 * Audiencia del trámite sancionatorio (EFDS-1181, RF-INC-02).
 *
 * Es donde el contratista es oído, así que celebrarla exige acta y resumen: sin
 * ellos el expediente no podría probar que hubo defensa, que es de lo que se
 * trata el debido proceso que la historia nombra.
 */
@Entity('audiencias_sancionatorias', { schema: 'hiring' })
export class AudienciaSancionatoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'caso_id' })
  casoId: string;

  /** Con hora: a una audiencia se comparece a una hora concreta. */
  @Column({ name: 'citada_para', type: 'timestamptz' })
  citadaPara: Date;

  /** El acto que convoca. Obligatorio: a una audiencia se cita por escrito. */
  @Column({ name: 'citacion_documento_id' })
  citacionDocumentoId: string;

  /** Para qué se cita, cuando conviene precisarlo. */
  @Column({ type: 'text', nullable: true })
  objeto: string | null;

  @Column({ length: 20, default: 'CITADA' })
  estado: EstadoAudiencia;

  @Column({ name: 'celebrada_el', type: 'date', nullable: true })
  celebradaEl: string | null;

  @Column({ name: 'acta_documento_id', type: 'uuid', nullable: true })
  actaDocumentoId: string | null;

  /** Qué pasó. Es lo que la decisión posterior tiene que poder citar. */
  @Column({ type: 'text', nullable: true })
  resumen: string | null;

  /** Por qué no se celebró, cuando no se celebró. */
  @Column({ type: 'text', nullable: true })
  motivo: string | null;

  @Column({ name: 'citada_por', length: 200, nullable: true })
  citadaPor: string | null;

  @Column({ name: 'registrada_por', length: 200, nullable: true })
  registradaPor: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

/** Los dos actos del trámite: el que lo abre y el que lo decide. */
export type TipoResolucion = 'APERTURA' | 'DECISION';

/**
 * Qué resolvió la decisión.
 *
 * `DECLARA_CADUCIDAD` es la caducidad como causal contractual que pide el
 * bloque de Presunto Incumplimiento de la matriz: termina el contrato.
 * `DECLARA_INCUMPLIMIENTO` no lo termina —puede imponer multa o cláusula penal
 * y el contrato sigue— y `ARCHIVA` es la constancia de que se examinó y no
 * prosperó, que también tiene que quedar en el expediente.
 */
export type SentidoResolucion = 'DECLARA_INCUMPLIMIENTO' | 'DECLARA_CADUCIDAD' | 'ARCHIVA';

/**
 * Resolución del trámite sancionatorio (EFDS-1181, RF-INC-02).
 *
 * El documento es obligatorio y no por prolijidad: una resolución **es** el
 * documento, y registrarla sin él dejaría al expediente afirmando que la
 * entidad resolvió algo que no puede mostrar.
 *
 * Los recursos no se modelan: ni el requerimiento ni la historia los nombran, y
 * decidir por cuenta propia cuáles proceden y en qué término sería inventar
 * procedimiento. Si el recurso prospera, el camino es revocar.
 */
@Entity('resoluciones_sancionatorias', { schema: 'hiring' })
export class ResolucionSancionatoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'caso_id' })
  casoId: string;

  @Column({ length: 20 })
  tipo: TipoResolucion;

  @Column({ length: 80 })
  numero: string;

  @Column({ name: 'fecha_expedicion', type: 'date' })
  fechaExpedicion: string;

  @Column({ name: 'documento_id' })
  documentoId: string;

  @Column({ length: 30, nullable: true })
  sentido: SentidoResolucion | null;

  /** La multa o la cláusula penal, cuando la decisión las impone. */
  @Column({ name: 'valor_sancion', type: 'numeric', precision: 18, scale: 2, nullable: true, transformer: aNumero })
  valorSancion: number | null;

  /**
   * A dónde vuelve el contrato si la resolución se revoca.
   *
   * Mismo criterio que la terminación anticipada: revocar devuelve lo guardado
   * y no lo deducido. Solo lo escribe la caducidad, que es la única que mueve
   * el estado del contrato.
   */
  @Column({ name: 'estado_contrato_antes', length: 20, nullable: true })
  estadoContratoAntes: string | null;

  /**
   * Hechos posteriores a la expedición.
   *
   * Se registran, no se calculan: ninguna fuente del proyecto dice cuántos días
   * corren entre uno y otro, y contar términos inventados sería peor que no
   * contarlos.
   */
  @Column({ name: 'notificada_el', type: 'date', nullable: true })
  notificadaEl: string | null;

  @Column({ name: 'firme_el', type: 'date', nullable: true })
  firmeEl: string | null;

  @Column({ name: 'expedida_por', length: 200, nullable: true })
  expedidaPor: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'revocada_at', type: 'timestamptz', nullable: true })
  revocadaAt: Date | null;

  @Column({ name: 'revocada_por', length: 200, nullable: true })
  revocadaPor: string | null;

  @Column({ name: 'motivo_revocacion', type: 'text', nullable: true })
  motivoRevocacion: string | null;
}
