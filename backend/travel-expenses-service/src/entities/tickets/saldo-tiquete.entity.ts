import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Entidad que representa el cupo presupuestal por dependencia para la compra
 * de tiquetes aéreos.
 *
 * Tabla física: `travel_expenses.saldos_tiquetes`.
 *
 * Control de concurrencia:
 *   Las reservas de saldo se realizan con bloqueos pesimistas
 *   (`SELECT ... FOR UPDATE`) sobre la fila correspondiente para evitar
 *   sobregiros cuando dos enlaces radican solicitudes en el mismo instante
 *   (ver `TicketsService.reservarSaldo`).
 *
 * Holgura (RF-LIQ-004):
 *   `holguraPorcentaje` se aplica al reservar para absorber la fluctuación
 *   del precio del tiquete entre la radicación y la emisión del pasaje.
 */
@Entity({ schema: 'travel_expenses', name: 'saldos_tiquetes' })
@Index('idx_saldos_tiquetes_activo', ['activo'])
export class SaldoTiqueteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'dependencia_id',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  dependenciaId: string;

  @Column({ name: 'nombre_dependencia', type: 'varchar', length: 150 })
  nombreDependencia: string;

  @Column({
    name: 'presupuesto_inicial',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  presupuestoInicial: number;

  @Column({
    name: 'presupuesto_reservado',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  presupuestoReservado: number;

  @Column({
    name: 'presupuesto_disponible',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  presupuestoDisponible: number;

  @Column({
    name: 'holgura_porcentaje',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 15,
  })
  holguraPorcentaje: number;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
