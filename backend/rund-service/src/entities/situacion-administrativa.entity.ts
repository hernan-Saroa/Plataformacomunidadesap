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

@Entity({ name: 'situacion_administrativa', schema: 'rund' })
export class SituacionAdministrativaEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id_situacion' })
  idSituacion: string;

  @Column({ type: 'uuid', name: 'id_docente' })
  idDocente: string;

  @ManyToOne(() => DocenteEntity, (d) => d.situaciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_docente' })
  docente: DocenteEntity;

  @Column({ type: 'varchar', length: 80, name: 'tipo_novedad' })
  tipoNovedad: string; // COMISION_ESTUDIOS, LICENCIA_REMUNERADA, LICENCIA_NO_REMUNERADA, INCAPACIDAD, ENCARGO, VACACIONES, SANCION, OTRA

  @Column({ type: 'date', name: 'fecha_inicio' })
  fechaInicio: string;

  @Column({ type: 'date', name: 'fecha_fin', nullable: true })
  fechaFin?: string;

  @Column({ type: 'varchar', length: 100, name: 'numero_acto_administrativo', nullable: true })
  numeroActoAdministrativo?: string;

  @Column({ type: 'date', name: 'fecha_acto', nullable: true })
  fechaActo?: string;

  @Column({ type: 'text', name: 'soporte_url', nullable: true })
  soporteUrl?: string;

  @Column({ type: 'varchar', length: 30, name: 'estado', default: 'VIGENTE' })
  estado: string; // VIGENTE, FINALIZADA, CANCELADA

  @Column({ type: 'text', name: 'observaciones', nullable: true })
  observaciones?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy?: string;
}
