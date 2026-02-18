import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Auditoria } from '../../auditorias/entities/auditoria.entity';

export enum HallazgoCategoria {
  CRITICO = 'critico',
  CONTROVERSIA = 'controversia',
  BORRADOR = 'borrador',
}

export enum HallazgoEstado {
  BORRADOR = 'borrador',
  NOTIFICADO = 'notificado',
  EN_CONTROVERSIA = 'en-controversia',
  RATIFICADO = 'ratificado',
  MODIFICADO = 'modificado',
  CERRADO = 'cerrado',
}

@Entity('hallazgo', { schema: 'control_interno' })
export class Hallazgo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  titulo?: string;

  @Column({ type: 'varchar', length: 50 })
  categoria: HallazgoCategoria;

  @Column({ type: 'varchar', length: 100, default: HallazgoEstado.BORRADOR })
  estado: HallazgoEstado;

  @Column({ type: 'varchar', length: 255 })
  area: string;

  @Column({ type: 'varchar', length: 255 })
  auditoria: string;

  @Column({ name: 'auditoria_id', type: 'uuid', nullable: true })
  auditoriaId?: string | null;

  @ManyToOne(() => Auditoria, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'auditoria_id' })
  auditoriaEntity?: Auditoria | null;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ name: 'criterio_incumplido', type: 'text' })
  criterioIncumplido: string;

  @Column({
    name: 'normativa_relacionada',
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  normativaRelacionada: string[];

  @Column({
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  evidencias: Array<{
    nombre: string;
    tipo: string;
    fecha: string;
    url?: string;
  }>;

  @Column({
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  recomendaciones: string[];

  @Column({ name: 'fecha_deteccion', type: 'date' })
  fechaDeteccion: Date;

  @Column({ name: 'fecha_notificacion', type: 'date', nullable: true })
  fechaNotificacion?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  responsable?: string;

  @Column({ name: 'fecha_limite_correccion', type: 'date', nullable: true })
  fechaLimiteCorreccion?: Date;

  @Column({ name: 'observaciones_controversia', type: 'text', nullable: true })
  observacionesControversia?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

