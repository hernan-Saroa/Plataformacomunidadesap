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
  EVT_AUD_001 = 'EVT-AUD-001',
  EVT_AUD_002 = 'EVT-AUD-002',
  EVT_AUD_003 = 'EVT-AUD-003',
  EVT_AUD_004 = 'EVT-AUD-004',
  EVT_AUD_DEADLINE = 'EVT-AUD-DEADLINE',
  EVT_KANBAN_001 = 'EVT-KANBAN-001',
  EVT_KANBAN_002 = 'EVT-KANBAN-002',
  EVT_KANBAN_003 = 'EVT-KANBAN-003',
  EVT_KANBAN_004 = 'EVT-KANBAN-004',
  EVT_PM_001 = 'EVT-PM-001',
  EVT_PM_002 = 'EVT-PM-002',
  EVT_PM_003 = 'EVT-PM-003',
  EVT_APR_001 = 'EVT-APR-001',
  EVT_APR_002 = 'EVT-APR-002',
  EVT_SYS_001 = 'EVT-SYS-001',
  EVT_SYS_002 = 'EVT-SYS-002',
  EVT_DOC_001 = 'EVT-DOC-001',
  EVT_PA_001 = 'EVT-PA-001',
  EVT_KANBAN_MOV = 'EVT-KANBAN-MOV',
  EVT_AUD_CREATED = 'EVT-AUD-CREATED',
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

