import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Etapa 9 — Ejecución y Supervisión. */
export const ETAPA_EJECUCION = 9;

/**
 * Vigente y anulada, no un borrado.
 *
 * El acta suscrita fijó la fecha desde la que corre el plazo del contrato. Si
 * estaba mal hay que poder decir que estaba mal, no hacer como si nunca hubiera
 * existido: es lo que explica que un contrato tenga dos fechas de inicio.
 */
export type EstadoActaInicio = 'VIGENTE' | 'ANULADA';

/**
 * Reunión y acta de inicio del contrato — actividad 9.1 (EFDS-1167).
 *
 * Legalizado el contrato y designado su supervisor, las partes se reúnen,
 * socializan alcance, cronograma y entregables, y suscriben el acta que da
 * comienzo formal a la ejecución.
 *
 * Mismo modelo que la designación del supervisor (EFDS-1165): el documento no
 * es un adjunto más. Sin el acta hubo una reunión, no un inicio.
 */
@Entity('actas_inicio', { schema: 'hiring' })
export class ActaInicio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contrato_id' })
  contratoId: string;

  /** El acta firmada por las dos partes. Es lo que da comienzo a la ejecución. */
  @Column({ name: 'acta_documento_id' })
  actaDocumentoId: string;

  /**
   * Cuándo se reunieron.
   *
   * Puede ser anterior a la suscripción: se reúnen, levantan el acta y la
   * firman, y no siempre el mismo día.
   */
  @Column({ name: 'fecha_reunion', type: 'date' })
  fechaReunion: string;

  /**
   * Desde cuándo corre el plazo del contrato.
   *
   * Va aparte de la fecha de la reunión porque el acta puede pactar que la
   * ejecución empiece otro día, y es esta la que cuenta para el plazo.
   */
  @Column({ name: 'fecha_inicio', type: 'date' })
  fechaInicio: string;

  /** Quiénes asistieron. La matriz pide constancia de la socialización. */
  @Column({ type: 'text', nullable: true })
  asistentes: string | null;

  /** Alcance, cronograma y entregables acordados en la reunión. */
  @Column({ type: 'text', nullable: true })
  compromisos: string | null;

  @Column({ name: 'suscrita_por', length: 200, nullable: true })
  suscritaPor: string | null;

  @Column({ length: 20, default: 'VIGENTE' })
  estado: EstadoActaInicio;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'anulada_at', type: 'timestamptz', nullable: true })
  anuladaAt: Date | null;

  @Column({ name: 'anulada_por', length: 200, nullable: true })
  anuladaPor: string | null;

  @Column({ name: 'motivo_anulacion', type: 'text', nullable: true })
  motivoAnulacion: string | null;
}
