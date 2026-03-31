import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DisciplinaryProcess } from './disciplinary-process.entity';

@Entity('disciplinary_process_actuaciones')
export class DisciplinaryProcessActuacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DisciplinaryProcess, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'processId' })
  process: DisciplinaryProcess;

  @Column('uuid')
  processId: string;

  @Column({ type: 'varchar', length: 50, default: 'ACTUACION' })
  tipo: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  etapa: string | null;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ name: 'responsableNombre', type: 'varchar', length: 255 })
  responsableNombre: string;

  @Column({ name: 'fechaActuacion', type: 'timestamp' })
  fechaActuacion: Date;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
