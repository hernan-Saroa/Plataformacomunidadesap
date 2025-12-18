import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { ProgramaAcademico } from './programa.entity';

@Entity({ schema: 'auth', name: 'registros_calificados' })
export class RegistroCalificado {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text' })
  numero: string;

  @Column({ name: 'fecha_emision', type: 'date' })
  fechaEmision: string;

  @Column({ type: 'date' })
  vigencia: string;

  @OneToOne(() => ProgramaAcademico, (programa) => programa.registroCalificado)
  @JoinColumn({ name: 'programa_id' })
  programa: ProgramaAcademico;
}
