import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ProgramaAcademico } from './programa.entity';

@Entity({ schema: 'auth', name: 'acreditaciones_programa' })
export class AcreditacionPrograma {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text' })
  tipo: string;

  @Column({ type: 'date' })
  vigencia: string;

  @ManyToOne(() => ProgramaAcademico, (programa) => programa.acreditaciones)
  @JoinColumn({ name: 'programa_id' })
  programa: ProgramaAcademico;
}
