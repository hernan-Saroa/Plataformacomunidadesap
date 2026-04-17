import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ProgramaEntity } from './programa.entity';

@Entity({ schema: 'academic_work_plan', name: 'Asignatura' })
export class AsignaturaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'programaId', type: 'text' })
  programaId: string;

  @ManyToOne(() => ProgramaEntity, { nullable: false })
  @JoinColumn({ name: 'programaId' })
  programa: ProgramaEntity;

  @Column({ type: 'text' })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  codigo: string | null;

  @Column({ type: 'int', default: 3 })
  creditos: number;

  @Column({ type: 'int', default: 144 })
  horas: number;

  @Column({ name: 'nucleoTematico', type: 'text', nullable: true })
  nucleoTematico: string | null;

  @Column({ type: 'text', nullable: true })
  semestre: string | null;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;
}

