import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { DimensionEvaluacion } from './criterio-evaluacion.entity';

/**
 * La evaluación de una oferta en una dimensión.
 *
 * Una por oferta y dimensión: cada evaluador responde por la suya, y el juicio
 * se guarda completo. Reevaluar sustituye el anterior; el rastro de quién lo
 * cambió vive en la trazabilidad.
 */
@Entity('evaluaciones_oferta', { schema: 'hiring' })
@Unique('uq_evaluacion_dimension', ['oferenteId', 'dimension'])
export class EvaluacionOferta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'oferente_id' })
  oferenteId: string;

  @Column({ length: 20 })
  dimension: DimensionEvaluacion;

  /**
   * Quién evaluó, como persona del directorio.
   *
   * Se guarda además del nombre para poder cruzarla con el memorando del comité
   * que la designó (EFDS-1156): el expediente debe poder mostrar que quien
   * calificó era efectivamente quien estaba nombrado para hacerlo.
   */
  @Column({ name: 'persona_id', nullable: true })
  personaId: string | null;

  @Column({ name: 'evaluada_por', length: 200, nullable: true })
  evaluadaPor: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
