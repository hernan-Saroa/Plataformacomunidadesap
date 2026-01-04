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

  @Column({ type: 'integer', nullable: false })
  @Index()
  año: number;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  fecha_creacion: Date;

  @Column({ type: 'varchar', length: 255, nullable: false })
  responsable: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'borrador',
  })
  @Index()
  estado: 'borrador' | 'en-revision' | 'aprobado' | 'en-ejecucion' | 'completado';

  @Column({ type: 'integer', default: 0 })
  porcentaje_cumplimiento_general: number;

  @Column({ type: 'integer', default: 0 })
  total_actividades: number;

  @Column({ type: 'integer', default: 0 })
  actividades_completadas: number;

  @Column({ type: 'integer', default: 0 })
  actividades_en_progreso: number;

  @OneToMany(() => RolPlanAnual5, (rol) => rol.plan, { cascade: true })
  roles: RolPlanAnual5[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

