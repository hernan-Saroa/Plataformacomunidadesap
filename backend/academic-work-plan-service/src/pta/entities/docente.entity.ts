import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PersonaEntity } from './persona.entity';
import { TerritorialEntity } from './territorial.entity';
import { SedeEntity } from './sede.entity';

@Entity({ schema: 'academic_work_plan', name: 'Docente' })
export class DocenteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'personaId', type: 'text' })
  personaId: string;

  @ManyToOne(() => PersonaEntity, { nullable: false })
  @JoinColumn({ name: 'personaId' })
  persona: PersonaEntity;

  @Column({ name: 'territorialId', type: 'text' })
  territorialId: string;

  @ManyToOne(() => TerritorialEntity, { nullable: false })
  @JoinColumn({ name: 'territorialId' })
  territorial: TerritorialEntity;

  @Column({ name: 'tipoVinculacion', type: 'text' })
  tipoVinculacion: string;

  @Column({ type: 'text' })
  dedicacion: string;

  @Column({ type: 'text', default: 'ACTIVO' })
  estado: string;

  @Column({ name: 'horasAsignables', type: 'int', default: 0 })
  horasAsignables: number;

  @Column({ name: 'sedeId', type: 'text', nullable: true })
  sedeId: string | null;

  @ManyToOne(() => SedeEntity, { nullable: true })
  @JoinColumn({ name: 'sedeId' })
  sede: SedeEntity | null;

  @Column({ name: 'ordenListado', type: 'int', nullable: true })
  ordenListado: number | null;

  @Column({ name: 'vinculacionDisplay', type: 'text', nullable: true })
  vinculacionDisplay: string | null;

  @Column({ name: 'dedicacionDisplay', type: 'text', nullable: true })
  dedicacionDisplay: string | null;

  @Column({ name: 'nucleoTematico', type: 'text', nullable: true })
  nucleoTematico: string | null;

  @Column({ name: 'nivelFormacion', type: 'text', nullable: true })
  nivelFormacion: string | null;

  @Column({ name: 'perfilAcademicoPro', type: 'text', nullable: true })
  perfilAcademicoPro: string | null;

  @Column({ name: 'perfilAcademico', type: 'text', nullable: true })
  perfilAcademico: string | null;

  @Column({ type: 'text', nullable: true })
  pregrado: string | null;

  @Column({ type: 'text', nullable: true })
  especializacion: string | null;

  @Column({ type: 'text', nullable: true })
  maestria: string | null;

  @Column({ type: 'text', nullable: true })
  doctorado: string | null;

  @Column({ name: 'posDoctorado', type: 'text', nullable: true })
  posDoctorado: string | null;

  @Column({ type: 'text', nullable: true })
  investigacion: string | null;

  @Column({ name: 'correoInstitucional', type: 'text', nullable: true })
  correoInstitucional: string | null;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;
}
