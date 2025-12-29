import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Auditoria } from './auditoria.entity';

@Entity('auditoria_especial_info', { schema: 'control_interno' })
@Index(['auditoriaId'], { unique: true })
export class AuditoriaEspecialInfo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'auditoria_id', type: 'uuid', unique: true, nullable: false })
  auditoriaId: string;

  @OneToOne(() => Auditoria, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auditoria_id' })
  auditoria: Auditoria;

  @Column({ name: 'tipo_motivo', type: 'varchar', length: 255, nullable: false })
  tipoMotivo: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  solicitante: string;

  @Column({ type: 'text', nullable: false })
  justificacion: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}








