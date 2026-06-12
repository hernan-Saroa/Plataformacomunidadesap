import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ProgramaAcademico } from './programa.entity';

@Entity({ schema: 'academic_work_plan', name: 'asignatura' })
export class Asignatura {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'id_programa', type: 'bigint' })
  programaId: string;

  @Column({ type: 'varchar', length: 200 })
  nombre: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  codigo?: string;

  @Column({ type: 'smallint' })
  creditos: number;

  @Column({ name: 'id_ubicacion_semestral', type: 'smallint' })
  semestreId: number;

  @Column({ name: 'id_nucleo_tematico', type: 'bigint' })
  nucleoTematicoId: string;

  @Column({ name: 'id_facultad', type: 'bigint' })
  facultadId: string;

  @Column({ type: 'varchar', length: 30, default: 'sin_definir' })
  modalidad?: string;

  @Column({ name: 'horas_fijas_pta', type: 'int', nullable: true })
  horasFijasPta?: number;

  @Column({ name: 'tipo_excepcion', type: 'varchar', length: 40, nullable: true })
  tipoExcepcion?: string;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @Column({ type: 'text', nullable: true })
  observaciones?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp without time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp without time zone', nullable: true })
  updatedAt: Date;

  // Compatibility fields for the frontend
  semestre?: string;
  horas?: number;
  tipo?: string;
  nucleoTematico?: string;

  // Relation to Programa (optional, for eager loading)
  @ManyToOne(() => ProgramaAcademico, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_programa' })
  programa?: ProgramaAcademico;
}