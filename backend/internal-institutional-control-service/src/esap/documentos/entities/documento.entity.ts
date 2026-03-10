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
import { Hallazgo } from '../../hallazgos/entities/hallazgo.entity';
import { PlanMejoramiento } from '../../planes-mejoramiento/entities/plan-mejoramiento.entity';

export enum TipoDocumento {
  // Tipos originales de auditoría
  OFICIO_ANUNCIO = 'oficio_anuncio',
  CARTA_REPRESENTACION = 'carta_representacion',
  CARTA_COMPROMISO = 'carta_compromiso',
  PROGRAMA_INDIVIDUAL = 'programa_individual',
  ACTA_REUNION_APERTURA = 'acta_reunion_apertura',
  ACTA_REUNION_CIERRE = 'acta_reunion_cierre',
  LISTA_CHEQUEO = 'lista_chequeo',
  EVIDENCIA_HALLAZGO = 'evidencia_hallazgo',
  INFORME_PRELIMINAR = 'informe_preliminar',
  INFORME_FINAL = 'informe_final',
  INFORME_EJECUTIVO = 'informe_ejecutivo',
  EVIDENCIA_PLAN_MEJORAMIENTO = 'evidencia_plan_mejoramiento',
  // Tipos para Biblioteca de Plantillas
  PLANTILLA = 'plantilla',
  OFICIO = 'oficio',
  ACTA = 'acta',
  INFORME = 'informe',
  EVIDENCIA = 'evidencia',
  FORMATO = 'formato',
  GUIA = 'guia',
  OTRO = 'otro',
}

export enum EtapaDocumento {
  PLANIFICACION = 'planificacion',
  PLANEACION = 'planeacion', // Alias para compatibilidad
  EJECUCION = 'ejecucion',
  HALLAZGOS = 'hallazgos',
  COMUNICACION = 'comunicacion',
  COMUNICACION_RESULTADOS = 'comunicacion_resultados',
  SEGUIMIENTO = 'seguimiento',
  CIERRE = 'cierre',
}

@Entity('documento', { schema: 'control_interno' })
@Index(['auditoriaId'])
@Index(['hallazgoId'])
@Index(['planMejoramientoId'])
@Index(['tipoDocumento'])
@Index(['etapa'])
export class Documento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({
    name: 'tipo_documento',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  tipoDocumento: TipoDocumento;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  etapa?: EtapaDocumento;

  @Column({ name: 'auditoria_id', type: 'uuid', nullable: true })
  auditoriaId?: string | null;

  @ManyToOne(() => Auditoria, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'auditoria_id' })
  auditoria?: Auditoria | null;

  @Column({ name: 'hallazgo_id', type: 'uuid', nullable: true })
  hallazgoId?: string | null;

  @ManyToOne(() => Hallazgo, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'hallazgo_id' })
  hallazgo?: Hallazgo | null;

  @Column({ name: 'plan_mejoramiento_id', type: 'uuid', nullable: true })
  planMejoramientoId?: string | null;

  @ManyToOne(() => PlanMejoramiento, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'plan_mejoramiento_id' })
  planMejoramiento?: PlanMejoramiento | null;

  /** Documento plantilla de biblioteca que cumple este subido (auditoria + documento_biblioteca_id) */
  @Column({ name: 'documento_biblioteca_id', type: 'uuid', nullable: true })
  documentoBibliotecaId?: string | null;

  @ManyToOne(() => Documento, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'documento_biblioteca_id' })
  documentoBiblioteca?: Documento | null;

  @Column({ name: 'ruta_archivo', type: 'varchar', length: 500, nullable: false })
  rutaArchivo: string;

  @Column({ name: 'nombre_archivo', type: 'varchar', length: 255, nullable: false })
  nombreArchivo: string;

  @Column({ name: 'tipo_mime', type: 'varchar', length: 100, nullable: false })
  tipoMime: string;

  @Column({ name: 'tamanio_bytes', type: 'bigint', nullable: false })
  tamanioBytes: number;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ name: 'version_anterior_id', type: 'uuid', nullable: true })
  versionAnteriorId?: string | null;

  @ManyToOne(() => Documento, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'version_anterior_id' })
  versionAnterior?: Documento | null;

  @Column({ name: 'subido_por', type: 'varchar', length: 255, nullable: false })
  subidoPor: string;

  @Column({ name: 'hash_archivo', type: 'varchar', length: 255, nullable: true })
  hashArchivo?: string;

  @Column({ type: 'boolean', default: false })
  comprimido: boolean;

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

