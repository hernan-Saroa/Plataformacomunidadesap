import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Manifestación de interés de una MIPYME en participar (EFDS-1151).
 *
 * De cuántas MIPYME distintas manifiesten interés depende que la convocatoria
 * pueda limitarse, así que aquí el conteo no es un dato más: es la condición.
 */
@Entity('manifestaciones_mipyme', { schema: 'hiring' })
export class ManifestacionMipyme {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id', type: 'uuid' })
  procesoId: string;

  @Column({ length: 200 })
  nombre: string;

  /**
   * Obligatoria, a diferencia de la de una observación: sin identificación no
   * hay forma de saber si dos manifestaciones son de la misma empresa, y el
   * conteo inflado cambiaría la decisión.
   */
  @Column({ length: 60 })
  identificacion: string;

  @Column({ name: 'fecha_presentacion', type: 'date' })
  fechaPresentacion: string;

  @Column({ name: 'documento_id', type: 'uuid', nullable: true })
  documentoId: string | null;

  @Column({ name: 'registrado_por', length: 160, nullable: true })
  registradoPor: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}
