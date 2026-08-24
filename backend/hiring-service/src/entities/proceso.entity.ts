import { Column, CreateDateColumn, Entity, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Expediente } from './expediente.entity';

/**
 * Cómo terminó el proceso de selección, o que todavía no ha terminado.
 *
 * La etapa 7 tiene dos desenlaces y ninguno es obligatorio: se adjudica
 * (EFDS-1159) o se declara desierto (EFDS-1160).
 */
export type EstadoProceso = 'EN_CURSO' | 'ADJUDICADO' | 'DESIERTO';

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

  /**
   * Desenlace del proceso de selección (EFDS-1160).
   *
   * Distinto de la etapa y del riel de actividades, que dicen en qué va: esto
   * dice si ya terminó y cómo. Un proceso se adjudica (EFDS-1159) o se declara
   * desierto, y mientras no pase ninguna de las dos cosas está en curso.
   */
  @Column({ length: 20, default: 'EN_CURSO' })
  estado: EstadoProceso;

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
