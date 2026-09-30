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

@Entity({ name: 'formacion_academica', schema: 'rund' })
export class FormacionAcademicaEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id_formacion' })
  idFormacion: string;

  @Column({ type: 'uuid', name: 'id_docente' })
  idDocente: string;

  @ManyToOne(() => DocenteEntity, (d) => d.formaciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_docente' })
  docente: DocenteEntity;

  @Column({ type: 'varchar', length: 50, name: 'nivel_educativo' })
  nivelEducativo: string; // PREGRADO, ESPECIALIZACION, MAESTRIA, DOCTORADO, POSTDOCTORADO

  @Column({ type: 'varchar', length: 255, name: 'titulo_obtenido' })
  tituloObtenido: string;

  @Column({ type: 'varchar', length: 255, name: 'institucion' })
  institucion: string;

  @Column({ type: 'varchar', length: 100, name: 'pais', default: 'Colombia' })
  pais: string;

  @Column({ type: 'int', name: 'ano_graduacion', nullable: true })
  anoGraduacion?: number;

  @Column({ type: 'boolean', name: 'convalidad_mineducacion', default: false })
  convalidadMineducacion: boolean;

  @Column({ type: 'varchar', length: 100, name: 'numero_resolucion_convalidacion', nullable: true })
  numeroResolucionConvalidacion?: string;

  @Column({ type: 'text', name: 'soporte_url', nullable: true })
  soporteUrl?: string;

  @Column({ type: 'varchar', length: 30, name: 'estado_validacion', default: 'PENDIENTE' })
  estadoValidacion: string; // PENDIENTE, APROBADO, RECHAZADO, OBSERVADO

  @Column({ type: 'text', name: 'observaciones', nullable: true })
  observaciones?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
