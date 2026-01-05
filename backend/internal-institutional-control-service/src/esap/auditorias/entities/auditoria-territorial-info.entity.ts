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

@Entity('auditoria_territorial_info', { schema: 'control_interno' })
@Index(['auditoriaId'], { unique: true })
export class AuditoriaTerritorialInfo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'auditoria_id', type: 'uuid', unique: true, nullable: false })
  auditoriaId: string;

  @OneToOne(() => Auditoria, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auditoria_id' })
  auditoria: Auditoria;

  @Column({ type: 'varchar', length: 255, nullable: false })
  nombre: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  ciudad: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  departamento: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}









