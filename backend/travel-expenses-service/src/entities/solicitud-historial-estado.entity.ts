import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SolicitudComisionEntity } from './solicitud-comision.entity';

/**
 * Registro append-only (solo inserción) de cada transición de estado de un
 * expediente de comisión.
 *
 * Tabla física: `travel_expenses.solicitudes_historial_estados`
 * (migración `016_historial_estados_trazabilidad.sql`).
 *
 * Propósito (RF-SIS-001 / RF-LIQ-004):
 *   Garantizar la auditabilidad exigida por Control Interno y contratación
 *   pública: cada vez que el expediente cambia de estado (p. ej.
 *   `RADICADA` → `SOLICITADO`) se registra quién (Enlace de Dependencia /
 *   Analista), cuándo y por qué. Nunca se actualizan ni eliminan filas: el
 *   historial es una bitácora inmutable para auditoría.
 */
@Entity({
  schema: 'travel_expenses',
  name: 'solicitudes_historial_estados',
})
@Index('idx_historial_solicitud', ['solicitudId'])
export class SolicitudHistorialEstadoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Expediente al que pertenece la transición (FK → solicitudes_comision). */
  @Column({ name: 'solicitud_id', type: 'uuid' })
  solicitudId: string;

  @ManyToOne(() => SolicitudComisionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitud_id' })
  solicitud: SolicitudComisionEntity;

  /**
   * Estado previo a la transición (NULL cuando es la primera acción sobre el
   * expediente). Ej: `RADICADA`.
   */
  @Column({
    name: 'estado_anterior',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  estadoAnterior: string | null;

  /**
   * Estado posterior a la transición. Ej: `SOLICITADO` (la solicitud queda
   * consolidada y en revisión del Grupo de Viáticos).
   */
  @Column({ name: 'estado_nuevo', type: 'varchar', length: 50 })
  estadoNuevo: string;

  /** ID del usuario que ejecutó la acción (Enlace de Dependencia / Analista). */
  @Column({ name: 'usuario_id', type: 'uuid' })
  usuarioId: string;

  /** Justificación u observación de la transición (máx. 255 caracteres). */
  @Column({
    name: 'comentarios',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  comentarios: string | null;

  /** Marca temporal (UTC) en la que ocurrió la transición. */
  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
