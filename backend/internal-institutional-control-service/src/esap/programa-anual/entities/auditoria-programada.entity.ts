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
import { ProgramaAnual } from './programa-anual.entity';
import { ProcesoAuditable } from '../../universo-auditorias/entities/proceso-auditable.entity';

export enum TipoAuditoriaProgramada {
  GESTION = 'gestion',
  CUMPLIMIENTO = 'cumplimiento',
  FINANCIERA = 'financiera',
  TIC = 'tic',
  DESEMPENO = 'desempeno',
}

export enum PrioridadAuditoriaProgramada {
  ALTA = 'alta',
  MEDIA = 'media',
  BAJA = 'baja',
}

export enum EstadoAuditoriaProgramada {
  PLANEADA = 'planeada',
  EN_CURSO = 'en_curso',
  COMPLETADA = 'completada',
  CANCELADA = 'cancelada',
}

export enum NivelRiesgo {
  ALTO = 'alto',
  MEDIO = 'medio',
  BAJO = 'bajo',
}

@Entity('auditoria_programada', { schema: 'control_interno' })
@Index(['procesoId'])
@Index(['estado'])
@Index(['tipo'])
export class AuditoriaProgramada {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  codigo: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  nombre: string;

  @Column({ name: 'proceso_id', type: 'uuid', nullable: false })
  procesoId: string;

  @ManyToOne(() => ProcesoAuditable, { nullable: false })
  @JoinColumn({ name: 'proceso_id' })
  proceso: ProcesoAuditable;

  @Column({ name: 'proceso_codigo', type: 'varchar', length: 255, nullable: false })
  procesoCodigo: string;

  @Column({ name: 'proceso_nombre', type: 'varchar', length: 255, nullable: false })
  procesoNombre: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  tipo: TipoAuditoriaProgramada;

  @Column({ type: 'text', nullable: false })
  alcance: string;

  @Column({ name: 'proceso_auditar', type: 'varchar', length: 255, nullable: false })
  procesoAuditar: string;

  @Column({ name: 'auditor_lider', type: 'varchar', length: 255, nullable: false })
  auditorLider: string;

  @Column({ name: 'equipo_auditor', type: 'jsonb', nullable: false })
  equipoAuditor: {
    auditores: string[];
    profesionalesEspecializados: string[];
    profesionalesUniversitarios: string[];
    tecnicos: string[];
  };

  @Column({ name: 'fecha_inicio_planeada', type: 'date', nullable: false })
  fechaInicioPlaneada: Date;

  @Column({ name: 'fecha_fin_planeada', type: 'date', nullable: false })
  fechaFinPlaneada: Date;

  @Column({ name: 'duracion_dias', type: 'integer', nullable: false })
  duracionDias: number;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
  })
  prioridad: PrioridadAuditoriaProgramada;

  @Column({
    name: 'riesgo_inherente',
    type: 'varchar',
    length: 20,
    nullable: false,
  })
  riesgoInherente: NivelRiesgo;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: EstadoAuditoriaProgramada.PLANEADA,
  })
  estado: EstadoAuditoriaProgramada;

  @Column({ name: 'es_territorial', type: 'boolean', default: false })
  esTerritorial: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  territorial?: string;

  @Column({ name: 'es_especial', type: 'boolean', default: false })
  esEspecial: boolean;

  @Column({ name: 'solicitada_por', type: 'varchar', length: 255, nullable: true })
  solicitadaPor?: string;

  @Column({ name: 'motivo_especial', type: 'text', nullable: true })
  motivoEspecial?: string;

  @Column({ type: 'jsonb', nullable: false })
  etapas: {
    planeacion: {
      fechaInicio: string;
      fechaFin: string;
      duracionDias: number;
      estado: string;
    };
    ejecucion: {
      fechaInicio: string;
      fechaFin: string;
      duracionDias: number;
      estado: string;
    };
    comunicacion: {
      fechaInicio: string;
      fechaFin: string;
      duracionDias: number;
      estado: string;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  ampliaciones?: Array<{
    fechaSolicitud: string;
    fechaAutorizacion: string;
    justificacion: string;
    autorizadoPor: string;
    fechaLimiteAnterior: string;
    fechaLimiteNueva: string;
    duracionDiasAnterior: number;
    duracionDiasNueva: number;
  }>;

  @Column({ name: 'fecha_limite_original', type: 'date', nullable: false })
  fechaLimiteOriginal: Date;

  @Column({ name: 'fecha_limite_actual', type: 'date', nullable: false })
  fechaLimiteActual: Date;

  @Column({ name: 'programa_anual_id', type: 'uuid', nullable: true })
  programaAnualId?: string;

  @ManyToOne(() => ProgramaAnual, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'programa_anual_id' })
  programaAnual?: ProgramaAnual;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

