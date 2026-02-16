import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { ActividadPlanAnual5 } from './actividad-plan-anual-5.entity';

@Entity('adjunto_actividad_plan_anual_5', { schema: 'control_interno' })
export class AdjuntoActividadPlanAnual5 {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'actividad_id' })
  @Index()
  actividadId!: string;

  @ManyToOne(() => ActividadPlanAnual5, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actividad_id' })
  actividad!: ActividadPlanAnual5;

  @Column({ type: 'varchar', length: 255, nullable: false })
  nombre!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tipo!: string;

  @Column({ type: 'bigint', nullable: true })
  tamanio!: number;

  @Column({
    type: 'timestamp',
    name: 'fecha_carga',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @Index()
  fechaCarga!: Date;

  @Column({ type: 'varchar', length: 255, name: 'cargado_por', nullable: true })
  cargadoPor!: string;

  @Column({ type: 'bigint', name: 'cargado_por_id', nullable: true })
  cargadoPorId!: number;

  @Column({
    type: 'varchar',
    length: 500,
    name: 'ruta_archivo',
    nullable: true,
  })
  rutaArchivo!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  url!: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'hash_archivo',
    nullable: true,
  })
  hashArchivo!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
