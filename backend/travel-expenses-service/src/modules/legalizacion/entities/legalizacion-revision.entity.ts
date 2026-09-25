import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export const ACCIONES_REVISION = [
  'SOPORTE_APROBADO',
  'SOPORTE_RECHAZADO',
  'DEVOLUCION',
  'APROBACION',
  'EXPORTACION_SIIF',
  'REGISTRO_SIIF_Y_CIERRE',
] as const;
export type AccionRevision = (typeof ACCIONES_REVISION)[number];

/**
 * EFDS-1310 — Trazabilidad de la revisión de una legalización: quién hizo qué y
 * cuándo. Solo inserción: la base rechaza UPDATE y DELETE (migración 451).
 *
 * Tabla física: travel_expenses.legalizacion_revisiones.
 */
@Entity({ schema: 'travel_expenses', name: 'legalizacion_revisiones' })
export class LegalizacionRevisionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'legalizacion_id', type: 'uuid' })
  legalizacionId: string;

  @Column({ name: 'soporte_id', type: 'uuid', nullable: true })
  soporteId: string | null;

  @Column({ name: 'accion', type: 'varchar', length: 40 })
  accion: AccionRevision;

  @Column({ name: 'observacion', type: 'text', nullable: true })
  observacion: string | null;

  @Column({ name: 'detalle', type: 'jsonb', nullable: true })
  detalle: Record<string, unknown> | null;

  @Column({ name: 'usuario_id', type: 'uuid' })
  usuarioId: string;

  @Column({ name: 'creado_en', type: 'timestamptz', default: () => 'now()' })
  creadoEn: Date;
}
