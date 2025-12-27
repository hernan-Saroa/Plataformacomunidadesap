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

export enum CategoriaNota {
  GENERAL = 'General',
  HALLAZGO = 'Hallazgo',
  SEGUIMIENTO = 'Seguimiento',
  EVIDENCIA = 'Evidencia',
  RECOMENDACION = 'Recomendación',
  OBSERVACION = 'Observación',
}

@Entity('nota_auditoria', { schema: 'control_interno' })
@Index(['auditoriaId'])
@Index(['autorId'])
@Index(['categoria'])
@Index(['importante'])
@Index(['fecha', 'hora'])
export class NotaAuditoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'auditoria_id', type: 'uuid', nullable: false })
  auditoriaId: string;

  @ManyToOne(() => Auditoria, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auditoria_id' })
  auditoria: Auditoria;

  @Column({ type: 'text', nullable: false })
  contenido: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  categoria: CategoriaNota;

  @Column({ name: 'autor_id', type: 'bigint', nullable: false })
  autorId: number; // FK a auth.personas

  @Column({ type: 'date', nullable: false })
  fecha: Date;

  @Column({ type: 'time', nullable: false })
  hora: string;

  @Column({ type: 'boolean', default: false })
  importante: boolean;

  @Column({ type: 'boolean', default: false })
  editada: boolean;

  @Column({ name: 'fecha_edicion', type: 'timestamp', nullable: true })
  fechaEdicion?: Date;

  @Column({ name: 'editor_id', type: 'bigint', nullable: true })
  editorId?: number; // FK a auth.personas

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}



