import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { PlanMejoramiento } from './plan-mejoramiento.entity';
import { RegistroSeguimiento } from './registro-seguimiento.entity';

@Entity('seguimiento_trimestral', { schema: 'control_interno' })
export class SeguimientoTrimestral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId: string;

  @ManyToOne(() => PlanMejoramiento, (plan) => plan.seguimientos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: PlanMejoramiento;

  @Column({ type: 'int' })
  trimestre: number;

  @Column({ type: 'int' })
  año: number;

  @Column({ name: 'fecha_inicio', type: 'date' })
  fechaInicio: Date;

  @Column({ name: 'fecha_fin', type: 'date' })
  fechaFin: Date;

  @Column({ name: 'fecha_seguimiento', type: 'date', nullable: true })
  fechaSeguimiento?: Date;

  @Column({ name: 'avance_global', type: 'int', default: 0 })
  avanceGlobal: number;

  @Column({ name: 'porcentaje_cumplimiento', type: 'int', default: 0 })
  porcentajeCumplimiento: number;

  @Column({ name: 'porcentaje_efectividad', type: 'int', default: 0 })
  porcentajeEfectividad: number;

  @Column({ name: 'acciones_revisadas', type: 'int', default: 0 })
  accionesRevisadas: number;

  @Column({ name: 'acciones_totales', type: 'int', default: 0 })
  accionesTotales: number;

  @Column({ name: 'observaciones_generales', type: 'text', nullable: true })
  observacionesGenerales?: string;

  @OneToMany(() => RegistroSeguimiento, (registro) => registro.seguimiento, { cascade: true })
  registros: RegistroSeguimiento[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}











