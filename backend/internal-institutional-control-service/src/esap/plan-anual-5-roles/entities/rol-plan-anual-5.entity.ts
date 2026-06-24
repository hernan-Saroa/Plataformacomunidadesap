import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
  JoinColumn,
} from 'typeorm';
import { PlanAnual5Roles } from './plan-anual-5-roles.entity';
import { ActividadPlanAnual5 } from './actividad-plan-anual-5.entity';

@Entity('rol_plan_anual_5', { schema: 'control_interno' })
@Unique(['planId', 'rol_numero'])
export class RolPlanAnual5 {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'plan_id' })
  @Index()
  planId: string;

  @ManyToOne(() => PlanAnual5Roles, (plan) => plan.roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: PlanAnual5Roles;

  @Column({ type: 'integer', name: 'rol_numero' })
  rol_numero: number; // 1-5

  @Column({ type: 'varchar', length: 255, nullable: false })
  nombre: string;

  @Column({ type: 'text', nullable: false })
  descripcion: string;

  @Column({ type: 'varchar', length: 7, default: '#3B82F6' })
  color: string;

  @Column({ type: 'integer', default: 0 })
  porcentaje_cumplimiento: number;

  @Column({ type: 'integer', default: 0 })
  total_actividades: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  responsable?: string;

  @Column({ type: 'uuid', nullable: true, name: 'responsable_id' })
  responsable_id?: string;

  @Column({ type: 'jsonb', name: 'responsables', default: [] })
  responsables: Array<{ id: string; nombre: string; cargo?: string; email?: string }>;

  @OneToMany(() => ActividadPlanAnual5, (actividad) => actividad.rol, { cascade: true })
  actividades: ActividadPlanAnual5[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'boolean', default: true, name: 'activo' })
  activo: boolean;
}

