import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Auditoria } from '../../auditorias/entities/auditoria.entity';

export enum EstadoTarea {
  PENDIENTE = 'Pendiente',
  EN_PROGRESO = 'En Progreso',
  COMPLETADA = 'Completada',
  CANCELADA = 'Cancelada',
}

export enum PrioridadTarea {
  BAJA = 'Baja',
  MEDIA = 'Media',
  ALTA = 'Alta',
  URGENTE = 'Urgente',
}

export enum FaseTarea {
  PLANEACION = 'Planeación',
  EJECUCION = 'Ejecución',
  COMUNICACION = 'Comunicación',
  SEGUIMIENTO = 'Seguimiento',
}

@Entity('tareas_auditoria', { schema: 'control_interno' })
@Index(['auditoriaId'])
@Index(['estado'])
@Index(['prioridad'])
@Index(['responsableId'])
@Index(['fechaVencimiento'])
export class TareaAuditoria {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'auditoria_id', type: 'uuid', nullable: false })
  auditoriaId!: string;

  @ManyToOne(() => Auditoria, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auditoria_id' })
  auditoria?: Auditoria;

  @Column({ type: 'varchar', length: 255, nullable: false })
  titulo!: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({
    type: 'enum',
    enum: EstadoTarea,
    default: EstadoTarea.PENDIENTE,
  })
  estado!: EstadoTarea;

  @Column({
    type: 'enum',
    enum: PrioridadTarea,
    default: PrioridadTarea.MEDIA,
  })
  prioridad!: PrioridadTarea;

  @Column({
    type: 'enum',
    enum: FaseTarea,
    nullable: true,
  })
  fase?: FaseTarea;

  @Column({ name: 'responsable_id', type: 'uuid', nullable: false })
  responsableId!: string;

  @Column({
    name: 'responsable_nombre',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  responsableNombre!: string;

  @Column({ name: 'fecha_vencimiento', type: 'timestamp', nullable: true })
  fechaVencimiento?: Date;

  @Column({ name: 'fecha_completado', type: 'timestamp', nullable: true })
  fechaCompletado?: Date;

  @Column({ type: 'int', default: 0 })
  progreso!: number; // 0-100

  @Column({ type: 'text', nullable: true })
  notas?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
