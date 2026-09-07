import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * El documento que un proceso cargó para satisfacer un requisito.
 *
 * El archivo vive en hiring.documentos, con su hash: aquí solo se dice qué
 * requisito cubre. Sustituir uno no lo borra —se anula y se carga otro— porque
 * el expediente es prueba ante entes de control, y que hubo una versión previa
 * es parte de lo que prueba.
 */
@Entity('documentos_proceso', { schema: 'hiring' })
export class DocumentoProceso {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id' })
  procesoId: string;

  @Column({ length: 20 })
  numeral: string;

  /** Código del requisito en documentos_requeridos. */
  @Column({ length: 60 })
  codigo: string;

  @Column({ name: 'documento_id' })
  documentoId: string;

  @Column({ name: 'cargado_por', length: 200, nullable: true })
  cargadoPor: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'anulado_at', type: 'timestamptz', nullable: true })
  anuladoAt: Date | null;

  @Column({ name: 'anulado_por', length: 200, nullable: true })
  anuladoPor: string | null;
}
