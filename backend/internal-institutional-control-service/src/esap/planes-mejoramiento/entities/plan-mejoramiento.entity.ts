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
import { Hallazgo } from '../../hallazgos/entities/hallazgo.entity';
import { Auditoria } from '../../auditorias/entities/auditoria.entity';
import { AccionCorrectiva } from './accion-correctiva.entity';
import { SeguimientoTrimestral } from './seguimiento-trimestral.entity';

export enum PlanMejoramientoEstado {
  BORRADOR = 'borrador',
  REVISION = 'revision',
  APROBADO = 'aprobado',
  EN_EJECUCION = 'en_ejecucion',
  COMPLETADO = 'completado',
  VENCIDO = 'vencido',
  RECHAZADO = 'rechazado',
}

@Entity('plan_mejoramiento', { schema: 'control_interno' })
export class PlanMejoramiento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 500 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  objetivos: string[];

  @Column({ name: 'hallazgo_id', type: 'uuid', nullable: true })
  hallazgoId?: string | null;

  @ManyToOne(() => Hallazgo, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'hallazgo_id' })
  hallazgo?: Hallazgo | null;

  @Column({ name: 'auditoria_id', type: 'uuid', nullable: true })
  auditoriaId?: string | null;

  @ManyToOne(() => Auditoria, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'auditoria_id' })
  auditoria?: Auditoria | null;

  @Column({ name: 'area_responsable', type: 'varchar', length: 255 })
  areaResponsable: string;

  @Column({ name: 'responsable_implementacion', type: 'varchar', length: 255 })
  responsableImplementacion: string;

  @Column({ name: 'fecha_limite', type: 'date' })
  fechaLimite: Date;

  @Column({
    type: 'varchar',
    length: 50,
    default: PlanMejoramientoEstado.BORRADOR,
  })
  estado: PlanMejoramientoEstado;

  @Column({ name: 'fecha_aprobacion', type: 'date', nullable: true })
  fechaAprobacion?: Date;

  @Column({ name: 'aprobado_por', type: 'varchar', length: 255, nullable: true })
  aprobadoPor?: string;

  @Column({ name: 'observaciones_aprobacion', type: 'text', nullable: true })
  observacionesAprobacion?: string;

  @Column({ name: 'motivo_rechazo', type: 'text', nullable: true })
  motivoRechazo?: string;

  @OneToMany(() => AccionCorrectiva, (accion) => accion.plan, { cascade: true })
  acciones: AccionCorrectiva[];

  @OneToMany(() => SeguimientoTrimestral, (seguimiento) => seguimiento.plan, { cascade: true })
  seguimientos: SeguimientoTrimestral[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

