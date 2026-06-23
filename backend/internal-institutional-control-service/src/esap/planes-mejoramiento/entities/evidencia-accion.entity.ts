import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AccionCorrectiva } from './accion-correctiva.entity';

/**
 * Estado de validación de una evidencia cargada por el auditado.
 * Ref: spec-plan-mejoramiento-seguimiento §5.2 / US-032
 */
export enum EstadoValidacionEvidencia {
  PENDIENTE = 'pendiente',
  ACEPTADO = 'aceptado',
  CON_OBSERVACIONES = 'con_observaciones',
}

/**
 * Evidencia de cumplimiento cargada por el área auditada para una acción de mejora.
 * El auditor OCI la revisa y califica como "Aceptado" o "Con Observaciones" (RF-SG-02).
 *
 * Fuente normativa: EM-PT-002 v3 act. 4-5, US-032 — RF011.
 * Trazabilidad: toda calificación registra quién, cuándo y qué (RF-SG-13).
 */
@Entity('evidencia_accion', { schema: 'control_interno' })
@Index(['accionId'])
export class EvidenciaAccion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'accion_id', type: 'uuid' })
  accionId: string;

  @ManyToOne(() => AccionCorrectiva, (accion) => accion.evidenciasAccion, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'accion_id' })
  accion: AccionCorrectiva;

  /** Referencia al archivo en el repositorio documental (URL o path relativo) */
  @Column({ name: 'archivo_ref', type: 'varchar', length: 1000 })
  archivoRef: string;

  /** Nombre original del archivo subido */
  @Column({ name: 'archivo_nombre', type: 'varchar', length: 500 })
  archivoNombre: string;

  /** MIME type del archivo */
  @Column({ name: 'archivo_tipo', type: 'varchar', length: 100, nullable: true })
  archivoTipo?: string;

  /** Tamaño en bytes */
  @Column({ name: 'archivo_tamanio', type: 'bigint', nullable: true })
  archivoTamanio?: number;

  /** Descripción libre de la evidencia */
  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  /** ID del usuario del área auditada que cargó la evidencia */
  @Column({ name: 'cargada_por_id', type: 'varchar', length: 255 })
  cargadaPorId: string;

  /** Nombre del usuario que cargó (desnormalizado para trazabilidad) */
  @Column({ name: 'cargada_por_nombre', type: 'varchar', length: 500, nullable: true })
  cargadaPorNombre?: string;

  @CreateDateColumn({ name: 'cargada_at' })
  cargadaAt: Date;

  /** Estado de validación por parte del auditor OCI (RF-SG-02) */
  @Column({
    name: 'estado_validacion',
    type: 'varchar',
    length: 30,
    default: EstadoValidacionEvidencia.PENDIENTE,
  })
  estadoValidacion: EstadoValidacionEvidencia;

  /** Comentarios del auditor al calificar la evidencia */
  @Column({ type: 'text', nullable: true })
  comentarios?: string;

  /** ¿El auditor solicita nueva evidencia o aclaraciones? (RF-SG-03) */
  @Column({ name: 'solicita_nueva_evidencia', type: 'boolean', default: false })
  solicitaNuevaEvidencia: boolean;

  /** ID del auditor que calificó */
  @Column({ name: 'calificada_por_id', type: 'varchar', length: 255, nullable: true })
  calificadaPorId?: string;

  /** Nombre del auditor que calificó (desnormalizado para trazabilidad) */
  @Column({ name: 'calificada_por_nombre', type: 'varchar', length: 500, nullable: true })
  calificadaPorNombre?: string;

  /** Fecha/hora de calificación */
  @Column({ name: 'calificada_at', type: 'timestamp', nullable: true })
  calificadaAt?: Date;
}
