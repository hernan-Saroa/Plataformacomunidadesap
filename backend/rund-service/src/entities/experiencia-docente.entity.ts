import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DocenteEntity } from './docente.entity';

@Entity({ name: 'experiencia_docente', schema: 'rund' })
export class ExperienciaDocenteEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id_experiencia' })
  idExperiencia: string;

  @Column({ type: 'uuid', name: 'id_docente' })
  idDocente: string;

  @ManyToOne(() => DocenteEntity, (d) => d.experiencias, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_docente' })
  docente: DocenteEntity;

  @Column({ type: 'varchar', length: 50, name: 'tipo_experiencia', default: 'DOCENCIA_UNIVERSITARIA' })
  tipoExperiencia: string; // DOCENCIA_UNIVERSITARIA, INVESTIGACION, PROFESIONAL, ASESORIA_CONSULTORIA

  @Column({ type: 'varchar', length: 255, name: 'institucion_empresa' })
  institucionEmpresa: string;

  @Column({ type: 'varchar', length: 255, name: 'cargo_asignatura' })
  cargoAsignatura: string;

  @Column({ type: 'date', name: 'fecha_inicio' })
  fechaInicio: string;

  @Column({ type: 'date', name: 'fecha_fin', nullable: true })
  fechaFin?: string;

  @Column({ type: 'boolean', name: 'es_actual', default: false })
  esActual: boolean;

  @Column({ type: 'int', name: 'horas_semanales', default: 0 })
  horasSemanales: number;

  @Column({ type: 'text', name: 'soporte_url', nullable: true })
  soporteUrl?: string;

  @Column({ type: 'varchar', length: 30, name: 'estado_validacion', default: 'PENDIENTE' })
  estadoValidacion: string;

  @Column({ type: 'text', name: 'observaciones', nullable: true })
  observaciones?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
