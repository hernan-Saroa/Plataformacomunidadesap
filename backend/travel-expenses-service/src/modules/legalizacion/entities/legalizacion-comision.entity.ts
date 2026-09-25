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

  @Column({ name: 'creado_en', type: 'timestamptz', default: () => 'now()' })
  creadoEn: Date;

  @Column({ name: 'actualizado_en', type: 'timestamptz', default: () => 'now()' })
  actualizadoEn: Date;

  @OneToMany(() => LegalizacionSoporteEntity, (s) => s.legalizacion)
  soportes: LegalizacionSoporteEntity[];
}
