import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { EtapaKanban } from './etapa-kanban.entity';

export enum TipoTablero {
  AUDITORIAS = 'auditorias',
  PLANES_MEJORAMIENTO = 'planes_mejoramiento',
}

@Entity('tablero_kanban', { schema: 'control_interno' })
@Index(['tipo'])
@Index(['activo'])
@Index(['deletedAt'], { where: 'deleted_at IS NULL' })
export class TableroKanban {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  tipo: TipoTablero;

  @Column({ type: 'boolean', nullable: false, default: true })
  activo: boolean;

  @OneToMany(() => EtapaKanban, (etapa) => etapa.tableroKanban, {
    cascade: true,
    eager: false,
  })
  etapas: EtapaKanban[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}

