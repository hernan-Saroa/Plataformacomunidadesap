import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Días hábiles de recepción de ofertas, por modalidad.
 *
 * No confundir con PlazoPublicacion: aquel es el de publicidad del proyecto de
 * pliego, corre antes de la apertura y es informativo. Este corre después de
 * ella y decide si una oferta llegó a tiempo y si el proceso puede cerrarse.
 *
 * La ausencia de fila es un estado legítimo —la modalidad no tiene plazo
 * definido— y no un dato faltante que haya que suplir con un valor por defecto.
 */
@Entity('plazos_ofertas', { schema: 'hiring' })
export class PlazoOfertas {
  @PrimaryColumn({ length: 60 })
  modalidad: string;

  @Column({ name: 'dias_habiles', type: 'int' })
  diasHabiles: number;

  /** De dónde sale el número, con el mismo criterio de los plazos de publicidad. */
  @Column({ type: 'text', nullable: true })
  fundamento: string | null;

  /**
   * False mientras la Dirección de Contratación no confirme el plazo.
   *
   * Todos entran sin confirmar: la historia da por supuesto que el proceso
   * tiene plazo de ofertas vigente, pero no dice de cuánto ni quién lo fija.
   */
  @Column({ type: 'boolean', default: false })
  confirmado: boolean;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
