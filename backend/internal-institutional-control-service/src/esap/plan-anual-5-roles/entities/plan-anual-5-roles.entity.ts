import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { RolPlanAnual5 } from './rol-plan-anual-5.entity';

@Entity('plan_anual_5_roles', { schema: 'control_interno' })
@Unique(['año'])
export class PlanAnual5Roles {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', nullable: false, name: 'ano' })
  @Index()
  año: number;

  @Column({ type: 'date', default: () => 'CURRENT_DATE', name: 'fecha_creacion' })
  fecha_creacion: Date;

  @Column({ type: 'date', nullable: true, name: 'fecha_inicio' })
  fecha_inicio?: Date;

  @Column({ type: 'date', nullable: true, name: 'fecha_fin' })
  fecha_fin?: Date;

  @Column({ type: 'varchar', length: 255, nullable: false, name: 'responsable' })
  responsable: string;

  @Column({ type: 'uuid', nullable: true, name: 'responsable_id' })
  responsable_id?: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'borrador',
    name: 'estado',
  })
  @Index()
  estado: 'borrador' | 'en-revision' | 'aprobado' | 'en-ejecucion' | 'completado' | 'activo';

  @Column({ type: 'integer', default: 0, name: 'porcentaje_cumplimiento_general' })
  porcentaje_cumplimiento_general: number;

  @Column({ type: 'integer', default: 0, name: 'total_actividades' })
  total_actividades: number;

  @Column({ type: 'integer', default: 0, name: 'actividades_completadas' })
  actividades_completadas: number;

  @Column({ type: 'integer', default: 0, name: 'actividades_en_progreso' })
  actividades_en_progreso: number;

  @OneToMany(() => RolPlanAnual5, (rol) => rol.plan, { cascade: true })
  roles: RolPlanAnual5[];

  @Column({ type: 'jsonb', nullable: true, name: 'equipo_aprobacion', default: [] })
  equipo_aprobacion: any[];

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'orden_aprobacion', default: 'secuencial' })
  orden_aprobacion: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

