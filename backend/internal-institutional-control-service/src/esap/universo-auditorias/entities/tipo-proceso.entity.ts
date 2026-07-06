import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { ProcesoAuditable } from './proceso-auditable.entity';

@Entity('tipo_proceso', { schema: 'control_interno' })
@Index(['codigo'], { unique: true })
@Index(['activo'])
@Index(['orden'])
export class TipoProceso {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80, nullable: false, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 120, nullable: false })
  nombre: string;

  @Column({ type: 'varchar', length: 120, nullable: false })
  color: string;

  @Column({ type: 'integer', nullable: false, default: 0 })
  orden: number;

  @Column({ type: 'boolean', nullable: false, default: true })
  activo: boolean;

  @OneToMany(() => ProcesoAuditable, proceso => proceso.tipoProceso)
  procesos: ProcesoAuditable[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
