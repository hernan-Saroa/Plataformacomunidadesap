import {  Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn , BeforeInsert, BeforeUpdate } from 'typeorm';

@Entity({ schema: 'academic_work_plan', name: 'Docente' })
export class DocenteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'personaId', type: 'uuid' })
  personaId: string;

  @Column({ name: 'territorialId', type: 'text' })
  territorialId: string;

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

  @Column({ name: 'ordenListado', type: 'int', nullable: true })
  ordenListado: number | null;

  @Column({ name: 'vinculacionDisplay', type: 'text', nullable: true })
  vinculacionDisplay: string | null;

  @Column({ name: 'dedicacionDisplay', type: 'text', nullable: true })
  dedicacionDisplay: string | null;

  @Column({ name: 'escalafon', type: 'text', nullable: true })
  escalafon: string | null;

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

  @Column({ name: 'origenVinculacion', type: 'text', nullable: true })
  origenVinculacion: string | null;

  @Column({ name: 'actoAdministrativoVinculacion', type: 'text', nullable: true })
  actoAdministrativoVinculacion: string | null;

  @Column({ name: 'situacionAdministrativa', type: 'text', nullable: true })
  situacionAdministrativa: string | null;

  @Column({ name: 'ultimaEvaluacion', type: 'text', nullable: true })
  ultimaEvaluacion: string | null;

  @Column({ name: 'puntajeSalarial', type: 'float', nullable: true })
  puntajeSalarial: number | null;

  @Column({ name: 'fechaInicioVinculacion', type: 'timestamp', nullable: true })
  fechaInicioVinculacion: Date | null;

  @Column({ name: 'fechaFinVinculacion', type: 'timestamp', nullable: true })
  fechaFinVinculacion: Date | null;

  @Column({ name: 'edadReferencia', type: 'int', nullable: true })
  edadReferencia: number | null;

  @Column({ name: 'rangoEdad', type: 'text', nullable: true })
  rangoEdad: string | null;

  @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @BeforeInsert()
  setTimestamps() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}
