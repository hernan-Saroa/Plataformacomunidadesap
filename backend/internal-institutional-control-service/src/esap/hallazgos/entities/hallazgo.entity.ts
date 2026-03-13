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
  NOTIFICADO = 'notificado',       // Pendiente respuesta (después de informe preliminar)
  ACEPTADO = 'aceptado',           // Área auditada aceptó
  EN_CONTROVERSIA = 'en-controversia', // Área presentó controversia
  RATIFICADO = 'ratificado',       // Auditor ratificó
  MODIFICADO = 'modificado',       // Auditor modificó
  RETIRADO = 'retirado',           // Auditor retiró el hallazgo
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

  /** Argumentos del área auditada al presentar controversia */
  @Column({ name: 'argumentos_controversia', type: 'text', nullable: true })
  argumentosControversia?: string;

  /** URL del documento adjunto de controversia */
  @Column({ name: 'documento_controversia_url', type: 'varchar', length: 500, nullable: true })
  documentoControversiaUrl?: string;

  /** Nombre del archivo adjunto de controversia */
  @Column({ name: 'documento_controversia_nombre', type: 'varchar', length: 255, nullable: true })
  documentoControversiaNombre?: string;

  /** Decisión del auditor: ratificado | modificado | retirado */
  @Column({ name: 'decision_auditor', type: 'varchar', length: 50, nullable: true })
  decisionAuditor?: string;

  /** Fundamentación técnica de la decisión del auditor */
  @Column({ name: 'fundamentacion_tecnica', type: 'text', nullable: true })
  fundamentacionTecnica?: string;

  /** Fecha en que el auditor tomó la decisión */
  @Column({ name: 'fecha_decision', type: 'timestamp', nullable: true })
  fechaDecision?: Date;

  /** ID del auditor que tomó la decisión */
  @Column({ name: 'auditor_decision_id', type: 'bigint', nullable: true })
  auditorDecisionId?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

