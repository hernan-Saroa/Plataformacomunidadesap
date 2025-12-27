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

@Entity('objetivo_auditoria', { schema: 'control_interno' })
@Index(['auditoriaId'])
export class ObjetivoAuditoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'auditoria_id', type: 'uuid', nullable: false })
  auditoriaId: string;

  @ManyToOne(() => Auditoria, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auditoria_id' })
  auditoria: Auditoria;

  @Column({ type: 'text', nullable: false })
  descripcion: string;

  @Column({ type: 'integer', default: 0 })
  orden: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}



