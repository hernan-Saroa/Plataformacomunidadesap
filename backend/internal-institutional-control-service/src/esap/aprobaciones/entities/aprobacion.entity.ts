import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AprobacionTipo {
  PLAN_AUDITORIA = 'plan-auditoria',
  PLAN_MEJORA = 'plan-mejora',
  INFORME = 'informe',
  DOCUMENTO = 'documento',
}

export enum AprobacionEstado {
  PENDIENTE = 'pendiente',
  APROBADO = 'aprobado',
  RECHAZADO = 'rechazado',
  EN_REVISION = 'en-revision',
}

export enum AprobacionPrioridad {
  ALTA = 'Alta',
  MEDIA = 'Media',
  BAJA = 'Baja',
}

@Entity('aprobacion', { schema: 'control_interno' })
export class Aprobacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  codigo?: string;

  @Column({
    type: 'varchar',
    length: 100,
    enum: AprobacionTipo,
    nullable: true,
  })
  tipo?: AprobacionTipo;

  @Column({ type: 'varchar', length: 500, nullable: true })
  titulo?: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  solicitante?: string;

  @Column({ name: 'fecha_solicitud', type: 'date', nullable: true })
  fechaSolicitud?: Date;

  @Column({
    type: 'varchar',
    length: 20,
    enum: AprobacionPrioridad,
    default: AprobacionPrioridad.MEDIA,
  })
  prioridad: AprobacionPrioridad;

  @Column({
    type: 'varchar',
    length: 50,
    enum: AprobacionEstado,
    default: AprobacionEstado.PENDIENTE,
  })
  estado: AprobacionEstado;

  @Column({ type: 'varchar', length: 255, nullable: true })
  territorial?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sede?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  relacionado?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  area?: string;

  // Campos para aprobación
  @Column({ type: 'text', nullable: true })
  observaciones?: string;

  @Column({ name: 'fecha_aprobacion', type: 'timestamp', nullable: true })
  fechaAprobacion?: Date;

  @Column({ name: 'aprobado_por', type: 'varchar', length: 255, nullable: true })
  aprobadoPor?: string;

  // Campos para rechazo
  @Column({ name: 'motivo_rechazo', type: 'text', nullable: true })
  motivoRechazo?: string;

  @Column({ name: 'fecha_rechazo', type: 'timestamp', nullable: true })
  fechaRechazo?: Date;

  @Column({ name: 'rechazado_por', type: 'varchar', length: 255, nullable: true })
  rechazadoPor?: string;

  // Contador de documentos (la relación está en documento_aprobacion)
  @Column({ name: 'documentos_count', type: 'int', default: 0 })
  documentosCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

