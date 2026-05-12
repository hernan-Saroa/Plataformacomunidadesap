import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ProgramaAcademico } from './programa.entity';

@Entity({ schema: 'academic_work_plan', name: 'Asignatura' })
export class Asignatura {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'programaId', type: 'text' })
  programaId: string;

  @Column({ type: 'text' })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  codigo?: string;

  @Column({ type: 'integer', default: 3 })
  creditos: number;

  @Column({ type: 'integer', default: 144 })
  horas: number;

  @Column({ name: 'nucleoTematico', type: 'text', nullable: true })
  nucleoTematico?: string;

  @Column({ type: 'text', nullable: true })
  semestre?: string;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamp with time zone' })
  updatedAt: Date;

  // Relation to Programa (optional, for eager loading)
  @ManyToOne(() => ProgramaAcademico, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'programaId' })
  programa?: ProgramaAcademico;
}