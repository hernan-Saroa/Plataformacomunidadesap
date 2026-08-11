import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Festivo nacional.
 *
 * Los fines de semana no se guardan: se deducen de la fecha. Los festivos sí,
 * porque siete de los dieciocho colombianos son móviles —dependen de la Pascua
 * y se trasladan al lunes siguiente por la Ley 51 de 1983— y no hay forma de
 * deducirlos sin implementar el cómputo pascual.
 *
 * El calendario cargado es finito. Quien cuente días hábiles debe verificar
 * que cubre el rango que necesita, en vez de asumir que un año sin festivos
 * es un año sin festivos.
 */
@Entity('dias_no_habiles', { schema: 'hiring' })
export class DiaNoHabil {
  @PrimaryColumn({ type: 'date' })
  fecha: string;

  @Column({ length: 120 })
  descripcion: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}
