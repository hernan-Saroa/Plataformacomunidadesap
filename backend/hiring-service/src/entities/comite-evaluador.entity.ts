import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Vigente y revocado, no un borrado.
 *
 * Corregir una designación es revocarla y hacer otra: un comité revocado
 * existió y pudo evaluar, así que borrarlo dejaría el expediente contando otra
 * historia. De ahí que un proceso pueda tener varios comités y solo uno vigente.
 */
export type EstadoComite = 'VIGENTE' | 'REVOCADO';

@Entity('comites_evaluadores', { schema: 'hiring' })
export class ComiteEvaluador {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id' })
  procesoId: string;

  /**
   * El acto que designa. Nulo mientras no llega: depende de firmas que tardan,
   * así que no frena el proceso, pero genera alerta (117, EFDS-1156).
   */
  @Column({ name: 'memorando_documento_id', type: 'uuid', nullable: true })
  memorandoDocumentoId: string | null;

  /** La del memorando, no la del registro: llega con él. */
  @Column({ name: 'fecha_designacion', type: 'date', nullable: true })
  fechaDesignacion: string | null;

  @Column({ name: 'designado_por', length: 200, nullable: true })
  designadoPor: string | null;

  /** A quién le llega la alerta del memorando si la 6.2 no tiene puesto que la haga. */
  @Column({ name: 'designado_por_id', length: 120, nullable: true })
  designadoPorId: string | null;

  @Column({ length: 20, default: 'VIGENTE' })
  estado: EstadoComite;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'revocado_at', type: 'timestamptz', nullable: true })
  revocadoAt: Date | null;

  @Column({ name: 'revocado_por', length: 200, nullable: true })
  revocadoPor: string | null;

  @Column({ name: 'motivo_revocacion', type: 'text', nullable: true })
  motivoRevocacion: string | null;
}
