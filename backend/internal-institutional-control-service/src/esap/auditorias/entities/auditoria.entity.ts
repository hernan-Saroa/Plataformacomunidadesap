import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { ObjetivoAuditoria } from './objetivo-auditoria.entity';
import { EquipoAuditor } from './equipo-auditor.entity';
import { NotaAuditoria } from './nota-auditoria.entity';
import { HistorialAuditoria } from './historial-auditoria.entity';
import { AuditoriaTerritorialInfo } from './auditoria-territorial-info.entity';
import { AuditoriaEspecialInfo } from './auditoria-especial-info.entity';
import { CriterioAuditoria } from './criterio-auditoria.entity';

export enum TipoAuditoria {
  GESTION = 'Gestión',
  CONTROL_INTERNO = 'Control Interno',
  ACADEMICA = 'Académica',
  RRHH = 'RRHH',
  FINANCIERA = 'Financiera',
  TI = 'TI',
  CUMPLIMIENTO = 'Cumplimiento',
  OPERACIONAL = 'Operacional',
}

export enum FaseAuditoria {
  PLANEACION = 'planeacion',
  EN_CURSO = 'en-curso',
  REVISION = 'revision',
  COMPLETADA = 'completada',
}

export enum PrioridadAuditoria {
  ALTA = 'Alta',
  MEDIA = 'Media',
  BAJA = 'Baja',
}

export enum EstadoKanban {
  PLANEACION = 'Planeación',
  EJECUCION = 'Ejecución',
  COMUNICACION = 'Comunicación',
  SEGUIMIENTO = 'Seguimiento',
  FINALIZADA = 'Finalizada',
}

export enum SemaforoColor {
  VERDE = 'verde',
  AMARILLO = 'amarillo',
  ROJO = 'rojo',
}

export enum TipoKanban {
  REGULAR = 'regular',
  TERRITORIAL = 'territorial',
  ESPECIAL = 'especial',
}

export enum PrioridadKanban {
  CRITICA = 'crítica',
  ALTA = 'alta',
  MEDIA = 'media',
  BAJA = 'baja',
}

export enum RiesgoKanban {
  ALTO = 'Alto',
  MEDIO = 'Medio',
  BAJO = 'Bajo',
}

@Entity('auditoria', { schema: 'control_interno' })
@Index(['codigo'], { unique: true })
@Index(['tipo'])
@Index(['fase'])
@Index(['prioridad'])
@Index(['territorial'])
@Index(['fechaInicio', 'fechaFin'])
@Index(['estadoKanban'])
@Index(['auditorLiderId'])
@Index(['auditorAsignadoId'])
export class Auditoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  codigo: string; // AUD-YYYY-###

  @Column({ type: 'varchar', length: 500, nullable: false })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  tipo: TipoAuditoria;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: FaseAuditoria.PLANEACION,
  })
  fase: FaseAuditoria;

  @Column({ type: 'varchar', length: 255, nullable: false })
  territorial: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  sede: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  responsable: string;

  @Column({ type: 'date', name: 'fecha_inicio', nullable: false })
  fechaInicio: Date;

  @Column({ type: 'date', name: 'fecha_fin', nullable: false })
  fechaFin: Date;

  @Column({ type: 'integer', default: 0 })
  progreso: number; // 0-100

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    default: PrioridadAuditoria.MEDIA,
  })
  prioridad: PrioridadAuditoria;

  @Column({ type: 'integer', default: 0 })
  hallazgos: number;

  // Campos del Kanban
  @Column({ name: 'estado_kanban', type: 'varchar', length: 50, nullable: true })
  estadoKanban?: EstadoKanban;

  @Column({ name: 'riesgo_kanban', type: 'varchar', length: 20, nullable: true })
  riesgoKanban?: RiesgoKanban;

  @Column({ type: 'varchar', length: 20, nullable: true, default: SemaforoColor.VERDE })
  semaforo?: SemaforoColor;

  @Column({ name: 'tipo_kanban', type: 'varchar', length: 50, nullable: true, default: TipoKanban.REGULAR })
  tipoKanban?: TipoKanban;

  @Column({ name: 'prioridad_kanban', type: 'varchar', length: 20, nullable: true, default: PrioridadKanban.MEDIA })
  prioridadKanban?: PrioridadKanban;

  @Column({ name: 'area_objetivo', type: 'varchar', length: 255, nullable: true })
  areaObjetivo?: string;

  @Column({ name: 'permite_cambiar_objetivos', type: 'boolean', default: true })
  permiteCambiarObjetivos: boolean;

  @Column({ name: 'calificacion_riesgo', type: 'varchar', length: 255, nullable: true })
  calificacionRiesgo?: string;

  @Column({ name: 'ultima_actuacion', type: 'text', nullable: true })
  ultimaActuacion?: string;

  // Métricas calculadas
  @Column({ name: 'dias_restantes', type: 'integer', nullable: true })
  diasRestantes?: number;

  @Column({ name: 'porcentaje_tiempo', type: 'integer', nullable: true })
  porcentajeTiempo?: number;

  @Column({ name: 'total_documentos', type: 'integer', default: 0 })
  totalDocumentos: number;

  @Column({ name: 'total_informes', type: 'integer', default: 0 })
  totalInformes: number;

  @Column({ name: 'total_tareas', type: 'integer', default: 0 })
  totalTareas: number;

  @Column({ name: 'actividades_completas', type: 'boolean', default: false })
  actividadesCompletas: boolean;

  @Column({ name: 'actividades_pendientes', type: 'integer', default: 0 })
  actividadesPendientes: number;

  // Foreign Keys a auth.personas (ID_TERCERO es NUMERIC/BIGINT, no UUID)
  @Column({ name: 'auditor_lider_id', type: 'bigint', nullable: true })
  auditorLiderId?: number | null;

  @Column({ name: 'auditor_asignado_id', type: 'bigint', nullable: true })
  auditorAsignadoId?: number | null;

  @Column({ name: 'supervisor_asignado_id', type: 'bigint', nullable: true })
  supervisorAsignadoId?: number | null;

  // Campos adicionales del formulario
  @Column({ type: 'text', nullable: true })
  alcance?: string;

  @Column({ name: 'proceso_auditado', type: 'varchar', length: 500, nullable: true })
  procesoAuditado?: string;

  @Column({ name: 'responsable_area_nombre', type: 'varchar', length: 255, nullable: true })
  responsableAreaNombre?: string;

  @Column({ name: 'responsable_area_cargo', type: 'varchar', length: 255, nullable: true })
  responsableAreaCargo?: string;

  @Column({ name: 'responsable_area_email', type: 'varchar', length: 255, nullable: true })
  responsableAreaEmail?: string;

  @Column({ name: 'fecha_reunion_apertura', type: 'timestamp', nullable: true })
  fechaReunionApertura?: Date;

  @Column({ name: 'observaciones_adicionales', type: 'text', nullable: true })
  observacionesAdicionales?: string;

  // Estado de checkboxes de actividades (JSON)
  @Column({ name: 'checklist_completados', type: 'jsonb', nullable: true })
  checklistCompletados?: Record<string, boolean>;

  // Metadata del programa anual (duraciones de fases, mes/semana de inicio)
  @Column({ name: 'programa_anual_metadata', type: 'jsonb', nullable: true })
  programaAnualMetadata?: {
    mesInicio?: number; // 0-11
    semanaInicio?: number; // 1-4
    duraciones?: {
      planeacion?: number;
      ejecucion?: number;
      comunicacion?: number;
    };
  };

  // Soft delete / Archivo
  @Column({ name: 'archivada', type: 'boolean', default: false })
  archivada: boolean;

  @Column({ name: 'fecha_archivo', type: 'timestamp', nullable: true })
  fechaArchivo?: Date;

  @Column({ name: 'activa', type: 'boolean', default: true })
  activa: boolean;

  @Column({ name: 'fecha_eliminacion', type: 'timestamp', nullable: true })
  fechaEliminacion?: Date;

  // Relaciones
  @OneToMany(() => ObjetivoAuditoria, (objetivo) => objetivo.auditoria)
  objetivos: ObjetivoAuditoria[];

  @OneToMany(() => EquipoAuditor, (equipo) => equipo.auditoria)
  equipoAuditores: EquipoAuditor[];

  @OneToMany(() => NotaAuditoria, (nota) => nota.auditoria)
  notas: NotaAuditoria[];

  @OneToMany(() => HistorialAuditoria, (historial) => historial.auditoria)
  historial: HistorialAuditoria[];

  @OneToMany(() => CriterioAuditoria, (criterio) => criterio.auditoria)
  criterios: CriterioAuditoria[];

  @OneToOne(() => AuditoriaTerritorialInfo, (territorialInfo) => territorialInfo.auditoria)
  territorialInfo?: AuditoriaTerritorialInfo;

  @OneToOne(() => AuditoriaEspecialInfo, (especialInfo) => especialInfo.auditoria)
  especialInfo?: AuditoriaEspecialInfo;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

