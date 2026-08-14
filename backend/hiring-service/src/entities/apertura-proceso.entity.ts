import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * El acto con el que se abre formalmente el proceso (actividad 5.7).
 *
 * Guarda la resolución y el pliego definitivo, no solo el hecho de que el
 * proceso pasó de etapa: un expediente que no conserva el acto administrativo
 * que dio inicio al proceso no prueba que ese inicio fue legal.
 */
@Entity('aperturas_proceso', { schema: 'hiring' })
@Unique('uq_apertura_proceso', ['procesoId'])
export class AperturaProceso {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id' })
  procesoId: string;

  @Column({ name: 'resolucion_numero', length: 80 })
  resolucionNumero: string;

  /** Fecha del acto administrativo, no la del registro en el sistema. */
  @Column({ name: 'resolucion_fecha', type: 'date' })
  resolucionFecha: string;

  @Column({ name: 'resolucion_documento_id' })
  resolucionDocumentoId: string;

  @Column({ name: 'pliego_documento_id' })
  pliegoDocumentoId: string;

  /**
   * Soporte de que el pliego definitivo se publicó.
   *
   * Va aparte del pliego: uno es el documento que rige el proceso y el otro la
   * prueba de que se hizo público. Sin esta distinción, tener el pliego en el
   * expediente se confundiría con haberlo publicado.
   */
  @Column({ name: 'evidencia_documento_id' })
  evidenciaDocumentoId: string;

  @Column({ name: 'secop_url', type: 'text', nullable: true })
  secopUrl: string | null;

  @Column({ name: 'abierto_por', length: 200, nullable: true })
  abiertoPor: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
