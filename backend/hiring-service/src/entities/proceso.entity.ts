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

  /**
   * Valor estimado del contrato, en pesos.
   *
   * Vive en el proceso y no en el estudio previo porque la modalidad se
   * determina por cuantía (EFDS-1147) y hay que conocerla al crear el proceso,
   * antes de que exista el estudio previo.
   *
   * `numeric` llega como string desde el driver; el transformer lo devuelve
   * como número para que el cálculo de umbrales no compare cadenas.
   */
  @Column({
    name: 'valor_estimado',
    type: 'numeric',
    precision: 18,
    scale: 2,
    nullable: true,
    transformer: {
      to: (valor: number | null) => valor,
      from: (valor: string | null) => (valor === null ? null : Number(valor)),
    },
  })
  valorEstimado: number | null;

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
