import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Auditoria } from './auditoria.entity';

@Entity('equipo_auditor', { schema: 'control_interno' })
@Index(['auditoriaId'])
@Index(['personaId'])
@Index(['activo'])
export class EquipoAuditor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'auditoria_id', type: 'uuid', nullable: false })
  auditoriaId: string;

  @ManyToOne(() => Auditoria, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auditoria_id' })
  auditoria: Auditoria;

  @Column({ name: 'persona_id', type: 'bigint', nullable: false })
  personaId: number; // FK a auth.personas

  @Column({ type: 'varchar', length: 100, default: 'Auditor' })
  rol: string; // Auditor, Auditor Senior, Inspector, etc.

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'fecha_asignacion', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fechaAsignacion: Date;

  @Column({ name: 'fecha_retiro', type: 'timestamp', nullable: true })
  fechaRetiro?: Date;

  @Column({ type: 'text', nullable: true })
  observaciones?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}








