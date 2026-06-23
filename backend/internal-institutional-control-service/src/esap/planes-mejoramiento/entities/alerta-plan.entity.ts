import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PlanMejoramiento } from './plan-mejoramiento.entity';
import { AccionCorrectiva } from './accion-correctiva.entity';

/**
 * Tipos de alerta del sistema de seguimiento.
 * Fuente normativa: EM-PT-002 v3 act. 6 (literal), spec §6.
 */
export enum TipoAlertaPlan {
  /** Alerta 1: Acción vencida y sin evidencia de cumplimiento */
  VENCIDA_SIN_EVIDENCIA = 'vencida_sin_evidencia',
  /** Alerta 2: Acción identificada como inefectiva */
  INEFECTIVA = 'inefectiva',
  /** Alerta 3: Cumplimiento programado para el mes en curso */
  CUMPLIMIENTO_MES_ACTUAL = 'cumplimiento_mes_actual',
  /** Alerta 4: Cumplimiento programado para el mes siguiente */
  CUMPLIMIENTO_MES_SIGUIENTE = 'cumplimiento_mes_siguiente',
}

/**
 * Alerta generada automáticamente por el sistema durante el seguimiento de un plan.
 * El motor de alertas evalúa las condiciones y genera las alertas que apliquen (RF-SG-08).
 *
 * Fuente normativa: EM-PT-002 v3 act. 6, US-020, US-024.
 */
@Entity('alerta_plan', { schema: 'control_interno' })
@Index(['planId'])
export class AlertaPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId: string;

  @ManyToOne(() => PlanMejoramiento, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: PlanMejoramiento;

  @Column({ name: 'accion_id', type: 'uuid', nullable: true })
  accionId?: string;

  @ManyToOne(() => AccionCorrectiva, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'accion_id' })
  accion?: AccionCorrectiva;

  /** Tipo de alerta según EM-PT-002 act. 6 */
  @Column({ type: 'varchar', length: 50 })
  tipo: TipoAlertaPlan;

  /** Descripción legible de la alerta */
  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @CreateDateColumn({ name: 'generada_at' })
  generadaAt: Date;

  /** ¿Ha sido atendida/resuelta? */
  @Column({ type: 'boolean', default: false })
  atendida: boolean;

  /** Fecha en que se atendió */
  @Column({ name: 'atendida_at', type: 'timestamp', nullable: true })
  atendidaAt?: Date;

  /** ID del usuario que atendió la alerta */
  @Column({ name: 'atendida_por_id', type: 'varchar', length: 255, nullable: true })
  atendidaPorId?: string;
}
