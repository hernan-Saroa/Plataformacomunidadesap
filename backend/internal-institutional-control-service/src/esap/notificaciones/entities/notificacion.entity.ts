import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TipoNotificacion {
  ANUNCIO_AUDITORIA = 'anuncio_auditoria',
  RECORDATORIO_PLAZO = 'recordatorio_plazo',
  ALERTA_VENCIMIENTO = 'alerta_vencimiento',
  HALLAZGO_IDENTIFICADO = 'hallazgo_identificado',
  SOLICITUD_EVIDENCIA = 'solicitud_evidencia',
  RECEPCION_DOCUMENTO = 'recepcion_documento',
  APROBACION_PLAN = 'aprobacion_plan',
  RECHAZO_PLAN = 'rechazo_plan',
  CONTROVERSIA_HALLAZGO = 'controversia_hallazgo',
  VALIDACION_EVIDENCIA = 'validacion_evidencia',
  SOLICITUD_AMPLIACION_PLAZO = 'solicitud_ampliacion_plazo',
  AMPLIACION_PLAZO_APROBADA = 'ampliacion_plazo_aprobada',
  AMPLIACION_PLAZO_RECHAZADA = 'ampliacion_plazo_rechazada',
  OTRO = 'otro',
}

export enum EstadoNotificacion {
  PENDIENTE = 'pendiente',
  ENVIADA = 'enviada',
  LEIDA = 'leida',
  ARCHIVADA = 'archivada',
}

export enum CanalNotificacion {
  EMAIL = 'email',
  SISTEMA = 'sistema',
  AMBOS = 'ambos',
}

export enum PrioridadNotificacion {
  BAJA = 'baja',
  NORMAL = 'normal',
  ALTA = 'alta',
  CRITICA = 'critica',
}

@Entity('notificacion', { schema: 'control_interno' })
@Index(['usuarioId'])
@Index(['estado'])
@Index(['tipoNotificacion'])
@Index(['createdAt'])
export class Notificacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usuario_id', type: 'varchar', length: 255, nullable: false })
  usuarioId: string;

  @Column({
    name: 'tipo_notificacion',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  tipoNotificacion: TipoNotificacion;

  @Column({ type: 'varchar', length: 255, nullable: false })
  titulo: string;

  @Column({ type: 'text', nullable: false })
  mensaje: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: EstadoNotificacion.PENDIENTE,
  })
  estado: EstadoNotificacion;

  @Column({
    type: 'varchar',
    length: 50,
    default: CanalNotificacion.SISTEMA,
  })
  canal: CanalNotificacion;

  @Column({ type: 'boolean', default: false })
  leida: boolean;

  @Column({ name: 'fecha_lectura', type: 'timestamp', nullable: true })
  fechaLectura?: Date;

  @Column({ name: 'enviada_email', type: 'boolean', default: false })
  enviadaEmail: boolean;

  @Column({ name: 'fecha_envio_email', type: 'timestamp', nullable: true })
  fechaEnvioEmail?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    auditoriaId?: string;
    hallazgoId?: string;
    planMejoramientoId?: string;
    documentoId?: string;
    fechaVencimiento?: string;
    diasAnticipacion?: number;
    [key: string]: any;
  };

  @Column({ name: 'accion_url', type: 'varchar', length: 500, nullable: true })
  accionUrl?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: PrioridadNotificacion.NORMAL,
  })
  prioridad: PrioridadNotificacion;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

