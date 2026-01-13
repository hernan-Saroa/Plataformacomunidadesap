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
import { PlanMejoramiento } from './plan-mejoramiento.entity';

@Entity('documento_plan_mejoramiento', { schema: 'control_interno' })
@Index(['planMejoramientoId'])
export class DocumentoPlanMejoramiento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_mejoramiento_id', type: 'uuid' })
  planMejoramientoId: string;

  @ManyToOne(() => PlanMejoramiento, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_mejoramiento_id' })
  planMejoramiento: PlanMejoramiento;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ name: 'tipo_documento', type: 'varchar', length: 100 })
  tipoDocumento: string;

  @Column({ name: 'ruta_archivo', type: 'varchar', length: 500 })
  rutaArchivo: string;

  @Column({ name: 'nombre_archivo_original', type: 'varchar', length: 255 })
  nombreArchivoOriginal: string;

  @Column({ name: 'tipo_mime', type: 'varchar', length: 100 })
  tipoMime: string;

  @Column({ name: 'tamanio_bytes', type: 'bigint' })
  tamanioBytes: number;

  @Column({ name: 'subido_por', type: 'varchar', length: 255 })
  subidoPor: string;

  @Column({ name: 'subido_por_id', type: 'bigint', nullable: true })
  subidoPorId?: number;

  @Column({ name: 'fecha_subida', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fechaSubida: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
