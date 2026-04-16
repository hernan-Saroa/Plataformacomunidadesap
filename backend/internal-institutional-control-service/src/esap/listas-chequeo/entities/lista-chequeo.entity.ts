import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { TipoAuditoria } from '../../tipos-auditoria/entities/tipo-auditoria.entity';
import { ItemListaChequeo } from './item-lista-chequeo.entity';

// Enum para tipo de lista de chequeo (valores compatibles con BD existente)
export enum TipoListaChequeo {
  CUMPLIMIENTO = 'cumplimiento',
  PROCESO = 'proceso',
  SISTEMA = 'sistema',
  PROCEDIMIENTO = 'procedimiento',
  // Valores adicionales para compatibilidad
  PLANEACION = 'planeacion',
  EJECUCION = 'ejecucion',
  COMUNICACION = 'comunicacion',
}

// Enum para estado de lista
export enum EstadoListaChequeo {
  ACTIVA = 'activa',
  INACTIVA = 'inactiva',
  OBSOLETA = 'obsoleta',
}

@Entity('lista_chequeo', { schema: 'control_interno' })
@Index(['codigo'], { unique: true })
@Index(['activa'])
@Index(['tipoAuditoriaId'])
@Index(['deletedAt'], { where: 'deleted_at IS NULL' })
export class ListaChequeo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  categoria?: string;

  // Tipo VARCHAR para compatibilidad con BD existente
  @Column({ type: 'varchar', length: 50, default: 'cumplimiento' })
  tipo: string;

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMPOS OBLIGATORIOS EN BD EXISTENTE
  // ═══════════════════════════════════════════════════════════════════════════

  @Column({ type: 'varchar', length: 50, default: '1.0' })
  version: string;

  @Column({ type: 'varchar', length: 50, default: 'activa' })
  estado: string;

  @Column({ name: 'aplicable_para', type: 'jsonb', default: '["gestion", "cumplimiento"]' })
  aplicablePara: any;

  @Column({ name: 'created_by', type: 'varchar', length: 255, default: 'sistema' })
  createdBy: string;

  // Items como JSONB (para compatibilidad, además de relación)
  @Column({ type: 'jsonb', nullable: true })
  items_json?: any;

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMPOS OPCIONALES DE CONFIGURACIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  @Column({ type: 'varchar', length: 255, nullable: true })
  proceso?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subproceso?: string;

  @Column({ name: 'categoria_esap', type: 'varchar', length: 100, nullable: true })
  categoriaEsap?: string;

  @Column({ name: 'normativa_aplicable', type: 'text', nullable: true })
  normativaAplicable?: string;

  @Column({ type: 'text', nullable: true })
  objetivo?: string;

  @Column({ name: 'version_base', type: 'varchar', length: 50, nullable: true })
  versionBase?: string;

  @Column({ name: 'permite_no_aplica', type: 'boolean', default: true })
  permiteNoAplica: boolean;

  @Column({ name: 'requiere_evidencias', type: 'boolean', default: true })
  requiereEvidencias: boolean;

  @Column({ name: 'genera_hallazgos_automaticos', type: 'boolean', default: true })
  generaHallazgosAutomaticos: boolean;

  // ═══════════════════════════════════════════════════════════════════════════
  // RELACIONES
  // ═══════════════════════════════════════════════════════════════════════════

  @Column({ name: 'tipo_auditoria_id', type: 'uuid', nullable: true })
  tipoAuditoriaId?: string;

  @ManyToOne(() => TipoAuditoria, { nullable: true })
  @JoinColumn({ name: 'tipo_auditoria_id' })
  tipoAuditoria?: TipoAuditoria;

  @OneToMany(() => ItemListaChequeo, (item) => item.listaChequeo, {
    cascade: true,
    eager: false,
  })
  items: ItemListaChequeo[];

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @Column({ name: 'usos_programados', type: 'integer', default: 0 })
  usosProgramados: number;

  // ═══════════════════════════════════════════════════════════════════════════
  // VINCULACIÓN CON AUDITORÍA
  // ═══════════════════════════════════════════════════════════════════════════

  @Column({ name: 'auditoria_id', type: 'uuid', nullable: true })
  auditoriaId?: string;

  @Column({ name: 'nombre_auditoria', type: 'varchar', length: 500, nullable: true })
  nombreAuditoria?: string;

  @Column({ name: 'auditor_responsable', type: 'varchar', length: 255, nullable: true })
  auditorResponsable?: string;

  @Column({ name: 'fecha_aplicacion', type: 'date', nullable: true })
  fechaAplicacion?: Date;

  @Column({ name: 'fecha_diligenciamiento', type: 'date', nullable: true })
  fechaDiligenciamiento?: Date;

  @Column({ name: 'items_completados', type: 'integer', default: 0 })
  itemsCompletados: number;

  @Column({ name: 'cumplimiento', type: 'integer', default: 0 })
  cumplimiento: number;

  @Column({ name: 'no_cumplimientos', type: 'integer', default: 0 })
  noCumplimientos: number;

  @Column({ name: 'no_aplica', type: 'integer', default: 0 })
  noAplica: number;

  @Column({ name: 'hallazgos_generados', type: 'integer', default: 0 })
  hallazgosGenerados: number;

  // ═══════════════════════════════════════════════════════════════════════════
  // FASES QUE IMPACTA LA LISTA
  // ═══════════════════════════════════════════════════════════════════════════

  @Column({ name: 'fase_planeacion', type: 'boolean', default: false })
  fasePlaneacion: boolean;

  @Column({ name: 'fase_ejecucion', type: 'boolean', default: false })
  faseEjecucion: boolean;

  @Column({ name: 'fase_comunicacion', type: 'boolean', default: false })
  faseComunicacion: boolean;

  @Column({ name: 'fase_seguimiento', type: 'boolean', default: false })
  faseSeguimiento: boolean;

  // ═══════════════════════════════════════════════════════════════════════════
  // VINCULACIÓN CON ETAPA KANBAN DINÁMICA
  // ═══════════════════════════════════════════════════════════════════════════

  /** ID de la etapa en la tabla etapa_kanban (estable aunque cambie el nombre) */
  @Column({ name: 'etapa_kanban_id', type: 'uuid', nullable: true })
  etapaKanbanId?: string;

  /** Nombre de la etapa al momento de guardar (snapshot para display aunque cambie la config) */
  @Column({ name: 'etapa_kanban_nombre', type: 'varchar', length: 255, nullable: true })
  etapaNombreKanban?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
