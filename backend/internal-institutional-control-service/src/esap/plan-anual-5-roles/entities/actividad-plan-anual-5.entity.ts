import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { RolPlanAnual5 } from './rol-plan-anual-5.entity';
import { PlanAnual5Roles } from './plan-anual-5-roles.entity';
import { AdjuntoActividadPlanAnual5 } from './adjunto-actividad-plan-anual-5.entity';

@Entity('actividad_plan_anual_5', { schema: 'control_interno' })
export class ActividadPlanAnual5 {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'rol_id' })
  @Index()
  rolId: string;

  @ManyToOne(() => RolPlanAnual5, (rol) => rol.actividades, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rol_id' })
  rol: RolPlanAnual5;

  @Column({ type: 'uuid', name: 'plan_id' })
  @Index()
  planId: string;

  @ManyToOne(() => PlanAnual5Roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: PlanAnual5Roles;

  @Column({ type: 'varchar', length: 500, nullable: false })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  responsable: string;

  @Column({ type: 'date', name: 'fecha_inicio' })
  fecha_inicio: Date;

  @Column({ type: 'date', name: 'fecha_fin' })
  fecha_fin: Date;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'pendiente',
  })
  @Index()
  estado: 'pendiente' | 'en-progreso' | 'completada' | 'retrasada';

  @Column({ type: 'integer', name: 'porcentaje_avance', default: 0 })
  porcentaje_avance: number;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'Media',
  })
  prioridad: 'Alta' | 'Media' | 'Baja';

  // ═══════════════════════════════════════════════════════════════════════════
  // NUEVOS CAMPOS - Migración 129
  // ═══════════════════════════════════════════════════════════════════════════

  @Column({ type: 'text', nullable: true })
  control: string;

  @Column({ type: 'text', nullable: true })
  evaluacion: string;

  @Column({ type: 'text', nullable: true })
  seguimiento: string;

  @Column({ type: 'boolean', name: 'requiere_verificacion_director', default: false })
  requiereVerificacionDirector: boolean;

  @Column({ type: 'boolean', name: 'verificada_por_director', default: false })
  verificadaPorDirector: boolean;

  @Column({ type: 'timestamp', name: 'fecha_verificacion', nullable: true })
  fechaVerificacion: Date;

  @Column({ type: 'text', name: 'observaciones_director', nullable: true })
  observacionesDirector: string;

  @Column({ type: 'jsonb', name: 'configuracion_evidencias', nullable: true })
  configuracionEvidencias: {
    adjuntosRequeridos: 'OBLIGATORIO' | 'OPCIONAL' | 'NO_REQUERIDO';
    observacionRequerida: 'OBLIGATORIO' | 'OPCIONAL' | 'NO_REQUERIDO';
    minimoAdjuntos?: number;
    tiposAdjuntosPermitidos?: string[];
    longitudMinimaObservacion?: number;
  };

  // Relación con adjuntos
  @OneToMany(() => AdjuntoActividadPlanAnual5, (adjunto) => adjunto.actividad, { cascade: true })
  adjuntos: AdjuntoActividadPlanAnual5[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

