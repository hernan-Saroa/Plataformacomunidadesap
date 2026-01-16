import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Hallazgo } from '../../hallazgos/entities/hallazgo.entity';
import { AccionCorrectiva } from '../../planes-mejoramiento/entities/accion-correctiva.entity';
import { PlanMejoramiento } from '../../planes-mejoramiento/entities/plan-mejoramiento.entity';
import { Auditoria } from '../../auditorias/entities/auditoria.entity';

export enum TipoDocumentoEvidencia {
  EVIDENCIA_HALLAZGO = 'evidencia_hallazgo',
  EVIDENCIA_ACCION = 'evidencia_accion',
  EVIDENCIA_PLAN = 'evidencia_plan',
  DOCUMENTO_PLAN = 'documento_plan',
  CERTIFICADO = 'certificado',
  ACTA = 'acta',
  INFORME = 'informe',
  OTRO = 'otro',
}

export enum EstadoValidacion {
  PENDIENTE = 'pendiente',
  ACEPTADO = 'aceptado',
  RECHAZADO = 'rechazado',
  CON_OBSERVACIONES = 'con_observaciones',
}

@Entity('evidencia_documento', { schema: 'control_interno' })
@Index(['hallazgoId'])
@Index(['accionCorrectivaId'])
@Index(['planMejoramientoId'])
@Index(['auditoriaId'])
@Index(['estadoValidacion'])
@Index(['tipoDocumento'])
export class EvidenciaDocumento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  codigo: string;

  // Metadatos
  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({
    name: 'tipo_documento',
    type: 'varchar',
    length: 100,
  })
  tipoDocumento: TipoDocumentoEvidencia;

  // Vinculaciones (solo una debe estar activa)
  @Column({ name: 'hallazgo_id', type: 'uuid', nullable: true })
  hallazgoId?: string | null;

  @ManyToOne(() => Hallazgo, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hallazgo_id' })
  hallazgo?: Hallazgo | null;

  @Column({ name: 'accion_correctiva_id', type: 'uuid', nullable: true })
  accionCorrectivaId?: string | null;

  @ManyToOne(() => AccionCorrectiva, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accion_correctiva_id' })
  accionCorrectiva?: AccionCorrectiva | null;

  @Column({ name: 'plan_mejoramiento_id', type: 'uuid', nullable: true })
  planMejoramientoId?: string | null;

  @ManyToOne(() => PlanMejoramiento, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_mejoramiento_id' })
  planMejoramiento?: PlanMejoramiento | null;

  @Column({ name: 'auditoria_id', type: 'uuid', nullable: true })
  auditoriaId?: string | null;

  @ManyToOne(() => Auditoria, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'auditoria_id' })
  auditoria?: Auditoria | null;

  // Archivo físico
  @Column({ name: 'ruta_archivo', type: 'varchar', length: 500 })
  rutaArchivo: string;

  @Column({ name: 'nombre_archivo_original', type: 'varchar', length: 255 })
  nombreArchivoOriginal: string;

  @Column({ name: 'tipo_mime', type: 'varchar', length: 100 })
  tipoMime: string;

  @Column({ name: 'tamanio_bytes', type: 'bigint' })
  tamanioBytes: number;

  @Column({ name: 'hash_archivo', type: 'varchar', length: 255, nullable: true })
  hashArchivo?: string;

  // Versionado
  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ name: 'version_anterior_id', type: 'uuid', nullable: true })
  versionAnteriorId?: string | null;

  @OneToOne(() => EvidenciaDocumento, { nullable: true })
  @JoinColumn({ name: 'version_anterior_id' })
  versionAnterior?: EvidenciaDocumento | null;

  @Column({ name: 'es_version_actual', type: 'boolean', default: true })
  esVersionActual: boolean;

  // Validación (US-032)
  @Column({
    name: 'estado_validacion',
    type: 'varchar',
    length: 50,
    default: EstadoValidacion.PENDIENTE,
  })
  estadoValidacion: EstadoValidacion;

  @Column({ name: 'validado_por', type: 'varchar', length: 255, nullable: true })
  validadoPor?: string;

  @Column({ name: 'fecha_validacion', type: 'timestamp', nullable: true })
  fechaValidacion?: Date;

  @Column({ name: 'observaciones_validacion', type: 'text', nullable: true })
  observacionesValidacion?: string;

  // Metadatos
  @Column({ name: 'subido_por', type: 'varchar', length: 255 })
  subidoPor: string;

  @Column({ name: 'subido_por_id', type: 'bigint', nullable: true })
  subidoPorId?: number;

  @Column({ name: 'fecha_subida', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fechaSubida: Date;

  // Sincronización
  @Column({ name: 'ruta_servidor_g', type: 'varchar', length: 500, nullable: true })
  rutaServidorG?: string;

  @Column({ name: 'sincronizado_servidor_g', type: 'boolean', default: false })
  sincronizadoServidorG: boolean;

  @Column({ name: 'fecha_sincronizacion', type: 'timestamp', nullable: true })
  fechaSincronizacion?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
