import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Actividad 10.3 de la matriz: el cierre financiero del contrato. */
export const NUMERAL_CIERRE_FINANCIERO = '10.3';

/**
 * Vigente y revertido, no un borrado.
 *
 * El saldo liberado pudo haberse reintegrado al presupuesto de la entidad.
 * Deshacer el cierre tiene consecuencias fuera de la plataforma, así que queda
 * con su motivo.
 */
export type EstadoCierreFinanciero = 'VIGENTE' | 'REVERTIDO';

/** `numeric` llega como string del driver; se devuelve como número. */
const aNumero = {
  to: (valor: number) => valor,
  from: (valor: string | null) => (valor === null ? null : Number(valor)),
};

/**
 * Cierre financiero del contrato — actividad 10.3 (EFDS-1173, RF-LIQ-03).
 *
 * Liquidado el contrato, la Dirección Financiera registra el pago final y
 * libera el saldo del RP que no se llegó a comprometer.
 *
 * **Sin integración con KLIC** (misma decisión de alcance que Click en
 * EFDS-1170): aquí se registra que la liberación se tramitó y con qué soporte;
 * el movimiento presupuestal ocurre en el sistema financiero de la entidad.
 */
@Entity('cierres_financieros', { schema: 'hiring' })
export class CierreFinanciero {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contrato_id' })
  contratoId: string;

  /** El RP cuyo saldo se libera. Sin él no hay nada que liberar. */
  @Column({ name: 'rp_id' })
  rpId: string;

  @Column({ name: 'referencia_pago_final', length: 120 })
  referenciaPagoFinal: string;

  @Column({ name: 'fecha_pago_final', type: 'date' })
  fechaPagoFinal: string;

  /** Mientras no exista KLIC, la única prueba de que se tramitó. */
  @Column({ name: 'soporte_documento_id', type: 'uuid', nullable: true })
  soporteDocumentoId: string | null;

  @Column({ name: 'valor_rp', type: 'numeric', precision: 18, scale: 2, transformer: aNumero })
  valorRp: number;

  @Column({ name: 'valor_pagado', type: 'numeric', precision: 18, scale: 2, transformer: aNumero })
  valorPagado: number;

  /**
   * Lo que volvió al presupuesto.
   *
   * Se guarda calculado y no derivado: si mañana entra un pago rezagado, lo que
   * se liberó ese día no cambia.
   */
  @Column({
    name: 'valor_liberado',
    type: 'numeric',
    precision: 18,
    scale: 2,
    transformer: aNumero,
  })
  valorLiberado: number;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ length: 20, default: 'VIGENTE' })
  estado: EstadoCierreFinanciero;

  @Column({ name: 'cerrado_por', length: 200, nullable: true })
  cerradoPor: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'revertido_at', type: 'timestamptz', nullable: true })
  revertidoAt: Date | null;

  @Column({ name: 'revertido_por', length: 200, nullable: true })
  revertidoPor: string | null;

  @Column({ name: 'motivo_reversion', type: 'text', nullable: true })
  motivoReversion: string | null;
}
