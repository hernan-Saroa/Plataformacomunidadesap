import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * Matriz de Tarifas de Referencia para Tiquetes Aéreos (Modelo Híbrido API/Paramétrico).
 *
 * Permite almacenar y consultar de forma instantánea el valor estimado
 * de mercado para vuelos nacionales e internacionales de la ESAP,
 * actualizables periódicamente mediante sincronización batch con API
 * o parametrización institucional.
 *
 * Tabla física: `travel_expenses.tarifas_referencia_tiquetes`.
 */
@Entity({ schema: 'travel_expenses', name: 'tarifas_referencia_tiquetes' })
@Unique('uq_tarifas_referencia_ruta', ['origenIata', 'destinoIata'])
@Index('idx_tarifas_ref_ciudades', ['origenCiudad', 'destinoCiudad'])
@Index('idx_tarifas_ref_iatas', ['origenIata', 'destinoIata'])
@Index('idx_tarifas_ref_activo', ['activo'])
export class TarifaReferenciaTiqueteEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'origen_ciudad', type: 'varchar', length: 100 })
  origenCiudad: string;

  @Column({ name: 'destino_ciudad', type: 'varchar', length: 100 })
  destinoCiudad: string;

  @Column({ name: 'origen_iata', type: 'varchar', length: 10 })
  origenIata: string;

  @Column({ name: 'destino_iata', type: 'varchar', length: 10 })
  destinoIata: string;

  @Column({
    name: 'tarifa_estimada',
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: 0,
  })
  tarifaEstimada: number;

  @Column({
    name: 'tarifa_minima',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  tarifaMinima: number | null;

  @Column({
    name: 'tarifa_maxima',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  tarifaMaxima: number | null;

  @Column({
    name: 'fuente',
    type: 'varchar',
    length: 50,
    default: 'PARAMETRICO_ESAP',
  })
  fuente: string;

  @Column({
    name: 'notas',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  notas: string | null;

  @Column({
    name: 'ultima_actualizacion',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  ultimaActualizacion: Date;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
