import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Días hábiles de traslado del informe de evaluación, por modalidad.
 *
 * El tercer plazo de la etapa 5-6 y hay que no confundirlos: el de publicidad
 * corre sobre el proyecto de pliego, el de ofertas decide si una oferta llegó a
 * tiempo, y este es el término en que los oferentes pueden subsanar y observar
 * el informe. Este último es el que garantiza el debido proceso antes de
 * adjudicar.
 *
 * La ausencia de fila es un estado legítimo —la modalidad no traslada informe
 * como un proceso ordinario— y no un dato faltante que haya que suplir con un
 * valor por defecto.
 */
@Entity('plazos_traslado', { schema: 'hiring' })
export class PlazoTraslado {
  @PrimaryColumn({ length: 60 })
  modalidad: string;

  @Column({ name: 'dias_habiles', type: 'int' })
  diasHabiles: number;

  @Column({ type: 'text', nullable: true })
  fundamento: string | null;

  /**
   * False mientras la Dirección de Contratación no confirme el plazo.
   *
   * Todos entran sin confirmar: RF-PUB-08 dice "traslado con plazos por
   * modalidad" y no cifra ninguno. Ver EFDS-1467.
   */
  @Column({ type: 'boolean', default: false })
  confirmado: boolean;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
