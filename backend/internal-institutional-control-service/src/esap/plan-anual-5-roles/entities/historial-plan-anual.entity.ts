import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { PlanAnual5Roles } from './plan-anual-5-roles.entity';

export enum TipoEventoPlanAnual {
  CREACION = 'creacion',
  ACTUALIZACION = 'actualizacion',
  APROBACION = 'aprobacion',
  ACTIVIDAD_CREADA = 'actividad_creada',
  ACTIVIDAD_ACTUALIZADA = 'actividad_actualizada',
  ACTIVIDAD_ELIMINADA = 'actividad_eliminada',
  CAMBIO_ESTADO = 'cambio_estado',
}

@Entity('historial_plan_anual', { schema: 'control_interno' })
@Index(['planId'])
@Index(['usuarioId'])
@Index(['tipoEvento'])
@Index(['fecha', 'hora'])
export class HistorialPlanAnual {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_id', type: 'uuid', nullable: false })
  planId: string;

  @ManyToOne(() => PlanAnual5Roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: PlanAnual5Roles;

  @Column({
    name: 'tipo_evento',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  tipoEvento: TipoEventoPlanAnual;

  @Column({ type: 'date', nullable: false })
  fecha: Date;

  @Column({ type: 'time', nullable: false })
  hora: string;

  @Column({ name: 'usuario_id', type: 'bigint', nullable: false })
  usuarioId: number; // FK a auth.personas

  @Column({ type: 'varchar', length: 255, nullable: false })
  accion: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'text', nullable: true })
  observaciones?: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @Column({
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  cambios: Array<{
    campo: string;
    valorAnterior: string;
    valorNuevo: string;
  }>;

  @Column({ name: 'estado_anterior', type: 'varchar', length: 50, nullable: true })
  estadoAnterior?: string;

  @Column({ name: 'estado_nuevo', type: 'varchar', length: 50, nullable: true })
  estadoNuevo?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

