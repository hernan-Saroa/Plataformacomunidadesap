import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Días hábiles de publicidad del proyecto de pliego, por modalidad.
 *
 * Parametrizable por la misma razón que los umbrales de cuantía: el plazo lo
 * fija la normativa y cambia con ella. La ausencia de fila es un estado
 * legítimo —la modalidad no tiene plazo definido— y no un dato faltante que
 * haya que suplir con un valor por defecto.
 */
@Entity('plazos_publicacion', { schema: 'hiring' })
export class PlazoPublicacion {
  @PrimaryColumn({ length: 60 })
  modalidad: string;

  @Column({ name: 'dias_habiles', type: 'int' })
  diasHabiles: number;

  /**
   * De dónde sale el número. Sin esto, dentro de un año nadie sabrá si el 5
   * vino del decreto o de un supuesto del equipo.
   */
  @Column({ type: 'text', nullable: true })
  fundamento: string | null;

  /** False mientras la Dirección de Contratación no confirme el plazo. */
  @Column({ type: 'boolean', default: false })
  confirmado: boolean;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
