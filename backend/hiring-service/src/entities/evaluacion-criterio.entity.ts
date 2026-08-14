import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * El resultado de un criterio dentro de una evaluación.
 *
 * `cumple` es el de los habilitantes y `puntaje` el de los ponderables; cuál de
 * los dos corresponde lo dice el tipo del criterio. La base solo garantiza que
 * haya uno de los dos: una fila sin resultado no es una evaluación.
 */
@Entity('evaluacion_criterios', { schema: 'hiring' })
@Unique('uq_criterio_evaluado', ['evaluacionId', 'criterioId'])
export class EvaluacionCriterio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'evaluacion_id' })
  evaluacionId: string;

  @Column({ name: 'criterio_id' })
  criterioId: string;

  /** En los habilitantes: si la oferta sigue en carrera. */
  @Column({ type: 'boolean', nullable: true })
  cumple: boolean | null;

  /** En los ponderables: cuánto sumó. */
  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  puntaje: string | null;

  /**
   * Lo que sustenta el juicio.
   *
   * Es el dato que el oferente reclama cuando queda fuera, y el que el informe
   * de evaluación tiene que poder mostrar.
   */
  @Column({ type: 'text', nullable: true })
  observacion: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
