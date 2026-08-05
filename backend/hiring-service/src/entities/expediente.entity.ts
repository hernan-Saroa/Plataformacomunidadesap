import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Proceso } from './proceso.entity';

/** Expediente electrónico único del proceso (RF-SIS-04). */
@Entity('expedientes', { schema: 'hiring' })
export class Expediente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id', type: 'uuid', unique: true })
  procesoId: string;

  @OneToOne(() => Proceso, (p) => p.expediente, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'proceso_id' })
  proceso?: Proceso;

  @Column({ name: 'numero_expediente', length: 60, unique: true })
  numeroExpediente: string;

  @Column({ length: 40, default: 'ABIERTO' })
  estado: string;

  @Column({ name: 'fecha_apertura', type: 'timestamptz', default: () => 'now()' })
  fechaApertura: Date;
}
