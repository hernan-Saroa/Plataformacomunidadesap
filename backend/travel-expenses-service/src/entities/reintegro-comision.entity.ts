import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SolicitudComisionEntity } from './solicitud-comision.entity';

/** Motivo por el que una comisión pagada por avance genera reintegro. */
export enum OrigenReintegro {
  /** La comisión ya pagada se canceló sin que el comisionado viajara. */
  COMISION_NO_REALIZADA = 'COMISION_NO_REALIZADA',
  /** El comisionado viajó menos días de los pagados. */
  VIAJE_MENOR = 'VIAJE_MENOR',
}

export enum EstadoReintegro {
  PENDIENTE = 'PENDIENTE',
  REGISTRADO = 'REGISTRADO',
}

/**
 * Reintegro de los recursos girados de más en una comisión pagada por avance
 * (RF-PAG-004 — Etapa 8).
 *
 * Tabla física: `travel_expenses.reintegros_comision`
 * (migración `459_reintegros_comision_etapa8.sql`).
 */
@Entity({
  schema: 'travel_expenses',
  name: 'reintegros_comision',
})
@Index('idx_reintegros_comision_solicitud', ['solicitudId'])
@Index('idx_reintegros_comision_estado', ['estado'])
export class ReintegroComisionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'solicitud_id', type: 'uuid' })
  solicitudId: string;

  @ManyToOne(() => SolicitudComisionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitud_id' })
  solicitud: SolicitudComisionEntity;

  @Column({ name: 'origen', type: 'varchar', length: 30 })
  origen: OrigenReintegro;

  @Column({
    name: 'estado',
    type: 'varchar',
    length: 20,
    default: EstadoReintegro.PENDIENTE,
  })
  estado: EstadoReintegro;

  @Column({ name: 'valor_pagado', type: 'numeric', precision: 14, scale: 2 })
  valorPagado: number;

  /** Valor calculado según los días efectivamente ejecutados. */
  @Column({ name: 'valor_a_reintegrar', type: 'numeric', precision: 14, scale: 2 })
  valorAReintegrar: number;

  @Column({ name: 'dias_comision', type: 'numeric', precision: 6, scale: 2, nullable: true })
  diasComision: number | null;

  @Column({ name: 'dias_ejecutados', type: 'numeric', precision: 6, scale: 2, nullable: true })
  diasEjecutados: number | null;

  @Column({ name: 'valor_reintegrado', type: 'numeric', precision: 14, scale: 2, nullable: true })
  valorReintegrado: number | null;

  @Column({ name: 'fecha_reintegro', type: 'date', nullable: true })
  fechaReintegro: string | null;

  /** Ruta del soporte de la consignación. */
  @Column({ name: 'soporte_path', type: 'varchar', length: 255, nullable: true })
  soportePath: string | null;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ name: 'registrado_por_id', type: 'uuid', nullable: true })
  registradoPorId: string | null;

  @Column({ name: 'fecha_registro', type: 'timestamp', nullable: true })
  fechaRegistro: Date | null;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
