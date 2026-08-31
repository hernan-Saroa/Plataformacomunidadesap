import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * REQ-RUND-F022 — Acceso temporal y controlado de entes externos al
 * Macro Docente, otorgado siempre por GGP/Dirección (nunca autogestionado
 * por el ente externo). Toda consulta hecha con este acceso se registra
 * en RundMacroDocenteConsultaLog.
 */
@Entity({ schema: 'academic_work_plan', name: 'RundAccesoExterno' })
export class RundAccesoExternoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ente_nombre', type: 'text' })
  enteNombre: string;

  @Column({ name: 'ente_contacto', type: 'text', nullable: true })
  enteContacto: string | null;

  @Column({ type: 'text', unique: true })
  token: string;

  /** Siempre acotado a un docente puntual (ver F022: consultas por docente y período). */
  @Column({ name: 'docente_id', type: 'text' })
  docenteId: string;

  @Column({ type: 'text', nullable: true })
  motivo: string | null;

  @Column({ name: 'fecha_inicio', type: 'timestamptz' })
  fechaInicio: Date;

  @Column({ name: 'fecha_fin', type: 'timestamptz' })
  fechaFin: Date;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'otorgado_por', type: 'text' })
  otorgadoPor: string;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'revoked_by', type: 'text', nullable: true })
  revokedBy: string | null;

  @CreateDateColumn({ name: 'createdAt', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
