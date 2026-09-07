import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * BR-056 — Log de auditoría inmutable del RUND.
 * 
 * Registra TODA acción sobre datos y soportes de un docente:
 * aprobar, devolver, editar, crear, vincular soporte, etc.
 * 
 * REGLA: Solo INSERT, nunca UPDATE ni DELETE.
 */
@Entity({ schema: 'academic_work_plan', name: 'RundAprobacionLog' })
export class RundAprobacionLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'docente_id', type: 'uuid' })
  docenteId: string;

  /** Bloque afectado: IDENTIDAD, FORMACION, VINCULACION, CONTACTO, GENERAL */
  @Column({ type: 'text', nullable: true })
  bloque: string | null;

  /** Acción realizada: CREAR | APROBAR | DEVOLVER | EDITAR | VINCULAR_SOPORTE | DESVINCULAR_SOPORTE | CONSULTAR_DATOS_SENSIBLES */
  @Column({ type: 'text' })
  accion: string;

  /** ID del actor que realizó la acción (userId o 'SISTEMA') */
  @Column({ name: 'actor_id', type: 'text' })
  actorId: string;

  /** Canal de origen: MASIVO | MODAL | AUTOGESTION */
  @Column({ name: 'canal_origen', type: 'text', nullable: true })
  canalOrigen: string | null;

  /** Campo específico afectado (ej: 'TITULO_PREGRADO', 'TIPO_VINCULACION') */
  @Column({ name: 'campo_afectado', type: 'text', nullable: true })
  campoAfectado: string | null;

  /** Valor anterior del campo (para re-versionamiento BR-046) */
  @Column({ name: 'dato_previo', type: 'text', nullable: true })
  datoPrevio: string | null;

  /** Valor nuevo del campo */
  @Column({ name: 'dato_nuevo', type: 'text', nullable: true })
  datoNuevo: string | null;

  /** Observación obligatoria (en devoluciones BR-045) */
  @Column({ type: 'text', nullable: true })
  observacion: string | null;

  /** ID del soporte vinculado/desvinculado (si aplica) */
  @Column({ name: 'soporte_id', type: 'text', nullable: true })
  soporteId: string | null;

  /** IP del cliente (para Canal 3 — autogestión) */
  @Column({ type: 'text', nullable: true })
  ip: string | null;

  /** Metadatos adicionales (JSON) — ej: { habeasData: true, invitacionId: '...' } */
  @Column({ type: 'jsonb', nullable: true, default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
