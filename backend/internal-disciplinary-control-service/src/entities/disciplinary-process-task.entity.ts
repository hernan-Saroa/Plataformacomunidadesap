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

@Entity('disciplinary_process_tasks')
export class DisciplinaryProcessTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DisciplinaryProcess, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'processId' })
  process: DisciplinaryProcess;

  @Column('uuid')
  processId: string;

  @Column({ type: 'varchar', length: 255 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'varchar', length: 20, default: 'media' })
  prioridad: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  etapa: string | null;

  @Column({ name: 'responsableNombre', type: 'varchar', length: 255, nullable: true })
  responsableNombre: string | null;

  @Column({ name: 'fechaVencimiento', type: 'date' })
  fechaVencimiento: string;

  @Column({ type: 'boolean', default: false })
  completada: boolean;

  @Column({ name: 'fechaCompletada', type: 'timestamp', nullable: true })
  fechaCompletada: Date | null;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
