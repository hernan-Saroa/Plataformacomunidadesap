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

  @Column({ name: 'nombre_base', type: 'varchar', length: 200, nullable: true })
  nombreBase: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  codigo?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  pensum: string | null;

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

  @Column({ name: 'modalidad_sufijo', type: 'varchar', length: 30, nullable: true })
  modalidadSufijo: string | null;

  @Column({ name: 'requiere_revision_modalidad', type: 'boolean', default: false })
  requiereRevisionModalidad: boolean;

  @Column({ name: 'horas_fijas_pta', type: 'int', nullable: true })
  horasFijasPta: number | null;

  @Column({ name: 'horas_clase', type: 'int', nullable: true })
  horasClase: number | null;

  @Column({ name: 'horas_pta', type: 'int', nullable: true })
  horasPta: number | null;

  @Column({ name: 'tipo_asignatura', type: 'varchar', length: 30, default: 'teorica' })
  tipoAsignatura: string;

  @Column({ name: 'tipo_excepcion', type: 'varchar', length: 40, nullable: true })
  tipoExcepcion: string | null;

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
