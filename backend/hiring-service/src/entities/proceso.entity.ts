import { Column, CreateDateColumn, Entity, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Expediente } from './expediente.entity';

@Entity('procesos', { schema: 'hiring' })
export class Proceso {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 60, unique: true })
  radicado: string;

  @Column({ type: 'text' })
  objeto: string;

  /**
   * Modalidad de selección; referencia a hiring.modalidades.
   *
   * Nullable solo por los procesos creados antes de exigirla: inventarles una
   * falsearía el expediente. Las creaciones nuevas la exigen en el DTO.
   */
  @Column({ length: 60, nullable: true })
  modalidad: string | null;

  /** Etapa de la matriz de flujo. Este HU trabaja siempre sobre la 3. */
  @Column({ type: 'int', default: 3 })
  etapa: number;

  @Column({ name: 'fecha_radicacion', type: 'timestamptz', default: () => 'now()' })
  fechaRadicacion: Date;

  @Column({ name: 'created_by', length: 120, nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => Expediente, (e) => e.proceso)
  expediente?: Expediente;
}
