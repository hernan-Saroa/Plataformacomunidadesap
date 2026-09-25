import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { LegalizacionSoporteEntity } from './legalizacion-soporte.entity';

/**
 * EFDS-1309 — Legalización de una comisión: una por solicitud.
 *
 * El plazo se congela al abrirla (plazo_dias_habiles, hora_corte, fecha_limite):
 * cambiar la configuración después no mueve plazos que ya están corriendo.
 * Todas las fechas son timestamptz — el vencimiento se calcula en hora de Colombia.
 *
 * Tabla física: travel_expenses.legalizaciones_comision (migración 450).
 */
@Entity({ schema: 'travel_expenses', name: 'legalizaciones_comision' })
export class LegalizacionComisionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'solicitud_id', type: 'uuid', unique: true })
  solicitudId: string;

  @Column({ name: 'modalidad_pago', type: 'varchar', length: 50 })
  modalidadPago: string;

  @Column({ name: 'estado_disparador', type: 'varchar', length: 50 })
  estadoDisparador: string;

  @Column({ name: 'fecha_disparo', type: 'timestamptz' })
  fechaDisparo: Date;

  @Column({ name: 'fecha_base_plazo', type: 'timestamptz' })
  fechaBasePlazo: Date;

  @Column({ name: 'plazo_dias_habiles', type: 'int' })
  plazoDiasHabiles: number;

  @Column({ name: 'hora_corte', type: 'varchar', length: 5 })
  horaCorte: string;

  @Column({ name: 'fecha_limite', type: 'timestamptz' })
  fechaLimite: Date;

  @Column({ name: 'calendario_incompleto', type: 'boolean', default: false })
  calendarioIncompleto: boolean;

  @Column({ name: 'fecha_envio', type: 'timestamptz', nullable: true })
  fechaEnvio: Date | null;

  @Column({ name: 'enviada_por_id', type: 'uuid', nullable: true })
  enviadaPorId: string | null;

  @Column({ name: 'notificado_por_vencer_en', type: 'timestamptz', nullable: true })
  notificadoPorVencerEn: Date | null;

  @Column({ name: 'notificado_vencido_en', type: 'timestamptz', nullable: true })
  notificadoVencidoEn: Date | null;

  // --- EFDS-1310: revisión, registro SIIF y cierre (migración 451) ---

  @Column({ name: 'revision_aprobada_en', type: 'timestamptz', nullable: true })
  revisionAprobadaEn: Date | null;

  @Column({ name: 'revision_aprobada_por_id', type: 'uuid', nullable: true })
  revisionAprobadaPorId: string | null;

  /** Última devolución. La solicitud sigue en PENDIENTE_LEGALIZACION (C-2). */
  @Column({ name: 'devuelta_en', type: 'timestamptz', nullable: true })
  devueltaEn: Date | null;

  @Column({ name: 'devuelta_por_id', type: 'uuid', nullable: true })
  devueltaPorId: string | null;

  @Column({ name: 'observacion_devolucion', type: 'text', nullable: true })
  observacionDevolucion: string | null;

  @Column({ name: 'numero_devoluciones', type: 'int', default: 0 })
  numeroDevoluciones: number;

  @Column({ name: 'siif_exportado_en', type: 'timestamptz', nullable: true })
  siifExportadoEn: Date | null;

  @Column({ name: 'siif_exportado_por_id', type: 'uuid', nullable: true })
  siifExportadoPorId: string | null;

  @Column({ name: 'numero_registro_siif', type: 'varchar', length: 100, nullable: true })
  numeroRegistroSiif: string | null;

  @Column({ name: 'fecha_registro_siif', type: 'date', nullable: true })
  fechaRegistroSiif: string | null;

  @Column({ name: 'registrado_siif_por_id', type: 'uuid', nullable: true })
  registradoSiifPorId: string | null;

  @Column({ name: 'valor_pagado', type: 'numeric', precision: 14, scale: 2, nullable: true })
  valorPagado: string | null;

  @Column({ name: 'valor_legalizado', type: 'numeric', precision: 14, scale: 2, nullable: true })
  valorLegalizado: string | null;

  @Column({ name: 'valor_reintegro', type: 'numeric', precision: 14, scale: 2, nullable: true })
  valorReintegro: string | null;

  @Column({ name: 'dias_reales', type: 'numeric', precision: 6, scale: 2, nullable: true })
  diasReales: string | null;

  @Column({ name: 'observaciones_cierre', type: 'text', nullable: true })
  observacionesCierre: string | null;

  /** Expediente cerrado: la fila y sus soportes quedan inmutables (triggers de la 451). */
  @Column({ name: 'cerrada_en', type: 'timestamptz', nullable: true })
  cerradaEn: Date | null;

  @Column({ name: 'cerrada_por_id', type: 'uuid', nullable: true })
  cerradaPorId: string | null;

  @Column({ name: 'creado_en', type: 'timestamptz', default: () => 'now()' })
  creadoEn: Date;

  @Column({ name: 'actualizado_en', type: 'timestamptz', default: () => 'now()' })
  actualizadoEn: Date;

  @OneToMany(() => LegalizacionSoporteEntity, (s) => s.legalizacion)
  soportes: LegalizacionSoporteEntity[];
}
