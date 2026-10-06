import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export const ESTADOS_REVERSION = ['PENDIENTE', 'APROBADA', 'RECHAZADA'] as const;
export type EstadoReversion = (typeof ESTADOS_REVERSION)[number];

/**
 * EFDS-1310 — Solicitud de reversión de una revisión de legalización aprobada.
 * La pide el analista; la resuelve otra persona con el permiso
 * travel_expenses:legalizations.revert_approval. Solo antes del registro en SIIF.
 *
 * La base garantiza que quien resuelve no es quien solicitó, que hay a lo sumo
 * una pendiente por legalización y que una resuelta no cambia (migración 454).
 *
 * Tabla física: travel_expenses.legalizacion_reversiones.
 */
@Entity({ schema: 'travel_expenses', name: 'legalizacion_reversiones' })
export class LegalizacionReversionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'legalizacion_id', type: 'uuid' })
  legalizacionId: string;

  @Column({ name: 'estado', type: 'varchar', length: 20, default: 'PENDIENTE' })
  estado: EstadoReversion;

  @Column({ name: 'motivo', type: 'text' })
  motivo: string;

  @Column({ name: 'solicitada_por_id', type: 'uuid' })
  solicitadaPorId: string;

  @Column({ name: 'solicitada_en', type: 'timestamptz', default: () => 'now()' })
  solicitadaEn: Date;

  @Column({ name: 'resuelta_por_id', type: 'uuid', nullable: true })
  resueltaPorId: string | null;

  @Column({ name: 'resuelta_en', type: 'timestamptz', nullable: true })
  resueltaEn: Date | null;

  @Column({ name: 'observacion_resolucion', type: 'text', nullable: true })
  observacionResolucion: string | null;
}
