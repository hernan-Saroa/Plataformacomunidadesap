import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Estados de la solicitud que pueden abrir la legalización, en orden de flujo. */
export const ESTADOS_DISPARADOR = ['AUTORIZADA', 'COMPROMETIDA', 'OBLIGADA', 'PAGADA'] as const;
export type EstadoDisparador = (typeof ESTADOS_DISPARADOR)[number];

export const MODALIDADES_PAGO = ['AVANCE', 'RECONOCIMIENTO_POSTERIOR'] as const;
export type ModalidadPago = (typeof MODALIDADES_PAGO)[number];

/**
 * EFDS-1309 — Disparador y plazo de la legalización, por modalidad de pago.
 *
 * Tabla física: travel_expenses.config_legalizacion (migración 450).
 */
@Entity({ schema: 'travel_expenses', name: 'config_legalizacion' })
export class ConfigLegalizacionEntity {
  @PrimaryColumn({ name: 'modalidad_pago', type: 'varchar', length: 50 })
  modalidadPago: ModalidadPago;

  @Column({ name: 'estado_disparador', type: 'varchar', length: 50, default: 'PAGADA' })
  estadoDisparador: EstadoDisparador;

  @Column({ name: 'plazo_dias_habiles', type: 'int', default: 5 })
  plazoDiasHabiles: number;

  @Column({ name: 'dias_aviso_por_vencer', type: 'int', default: 2 })
  diasAvisoPorVencer: number;

  @Column({ name: 'hora_corte', type: 'varchar', length: 5, default: '16:30' })
  horaCorte: string;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'actualizado_por_id', type: 'uuid', nullable: true })
  actualizadoPorId: string | null;

  @Column({ name: 'creado_en', type: 'timestamptz', default: () => 'now()' })
  creadoEn: Date;

  @Column({ name: 'actualizado_en', type: 'timestamptz', default: () => 'now()' })
  actualizadoEn: Date;
}
