import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Qué clase de modificación es.
 *
 * Se declaran todas desde ahora aunque EFDS-1177 solo construya la prórroga:
 * comparten tabla y trámite, y añadirlas de a una obligaría a reescribir el
 * CHECK en cada historia. Lo que las separa es qué campos exige cada una, y
 * eso lo valida el servicio.
 */
export type TipoModificacion =
  | 'PRORROGA'
  | 'ADICION'
  | 'CESION'
  | 'ACLARACION'
  | 'SUSPENSION'
  | 'REANUDACION'
  | 'TERMINACION_ANTICIPADA';

/**
 * Se solicita, alguien la aprueba y solo entonces produce efectos.
 *
 * RECHAZADA no se borra: una prórroga negada explica por qué el contrato
 * venció sin extenderse.
 */
export type EstadoModificacion = 'SOLICITADA' | 'APROBADA' | 'RECHAZADA';

/**
 * Modificación contractual — actividad 9.5 de la matriz.
 *
 * Una tabla para todos los tipos: comparten el trámite —solicitud,
 * justificación, aprobación, acto y publicación en SECOP II— y lo que cambia
 * es qué campo mueve cada una.
 */
@Entity('modificaciones_contrato', { schema: 'hiring' })
export class ModificacionContrato {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contrato_id' })
  contratoId: string;

  @Column({ length: 30 })
  tipo: TipoModificacion;

  /** La justificación técnica que exige RF-MOD-02: es lo que lee quien aprueba. */
  @Column({ type: 'text' })
  justificacion: string;

  /**
   * Días que se agregan al plazo. Solo en la prórroga.
   *
   * Días y no fecha final: el plazo del contrato está en días, y una fecha
   * habría que recalcularla cada vez que el contrato se suspende.
   */
  @Column({ name: 'dias_prorroga', type: 'int', nullable: true })
  diasProrroga: number | null;

  @Column({ name: 'fecha_efecto', type: 'date' })
  fechaEfecto: string;

  /**
   * El acto administrativo que la soporta.
   *
   * Nulo mientras solo está solicitada: el acto lo produce quien aprueba.
   */
  @Column({ name: 'documento_id', type: 'uuid', nullable: true })
  documentoId: string | null;

  @Column({ length: 20, default: 'SOLICITADA' })
  estado: EstadoModificacion;

  /**
   * El plazo que tenía el contrato al aprobarla, congelado: sin esto no habría
   * cómo saber de cuánto a cuánto se extendió.
   */
  @Column({ name: 'plazo_anterior_dias', type: 'int', nullable: true })
  plazoAnteriorDias: number | null;

  @Column({ name: 'solicitada_por', length: 200, nullable: true })
  solicitadaPor: string | null;

  @Column({ name: 'resuelta_por', length: 200, nullable: true })
  resueltaPor: string | null;

  @Column({ name: 'resuelta_at', type: 'timestamptz', nullable: true })
  resueltaAt: Date | null;

  @Column({ name: 'motivo_rechazo', type: 'text', nullable: true })
  motivoRechazo: string | null;

  /** Publicación en SECOP II (RF-MOD-05): ocurre por fuera y aquí se transcribe. */
  @Column({ name: 'publicada_at', type: 'date', nullable: true })
  publicadaAt: string | null;

  @Column({ name: 'publicacion_documento_id', type: 'uuid', nullable: true })
  publicacionDocumentoId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
