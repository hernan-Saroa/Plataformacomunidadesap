import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TableroKanban } from './tablero-kanban.entity';

export enum EstadoEtapa {
  INICIAL = 'inicial',
  INTERMEDIA = 'intermedia',
  FINAL = 'final',
}
import { Unique } from 'typeorm';

@Entity('etapa_kanban', { schema: 'control_interno' })
@Unique(['tableroKanbanId', 'nombre'])
@Index(['tableroKanbanId', 'orden'])
@Index(['deletedAt'], { where: 'deleted_at IS NULL' })
export class EtapaKanban {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tablero_kanban_id', type: 'uuid' })
  tableroKanbanId: string;

  @ManyToOne(() => TableroKanban, (tablero) => tablero.etapas, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tablero_kanban_id' })
  tableroKanban: TableroKanban;

  @Column({ type: 'varchar', length: 255, nullable: false })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'integer', nullable: false })
  orden: number;

  @Column({ type: 'varchar', length: 7, nullable: false })
  color: string; // Hex color

  @Column({ name: 'tiempo_sla', type: 'integer', nullable: false, default: 0 })
  tiempoSLA: number; // días

  @Column({ name: 'limite_wip', type: 'integer', nullable: true })
  limiteWIP: number | null; // null = sin límite

  @Column({ type: 'boolean', nullable: false, default: true })
  visible: boolean;

  @Column({ name: 'notificar_vencimiento', type: 'boolean', nullable: false, default: false })
  notificarVencimiento: boolean;

  @Column({ name: 'dias_anticipacion_alerta', type: 'integer', nullable: false, default: 0 })
  diasAnticipacionAlerta: number;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    default: EstadoEtapa.INTERMEDIA,
  })
  estado: EstadoEtapa;

  @Column({ name: 'permitir_retroceso', type: 'boolean', nullable: false, default: false })
  permitirRetroceso: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}

