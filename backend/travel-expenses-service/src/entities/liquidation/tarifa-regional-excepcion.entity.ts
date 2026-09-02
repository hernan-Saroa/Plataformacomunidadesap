import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Entidad que representa la excepción regional de tarifa de viáticos.
 * Corresponde a la tabla travel_expenses.tarifas_regionales_excepcion.
 * Aplica según Art. 5 del Decreto 314 de 2026 para departamentos nuevos.
 */
@Entity({ schema: 'travel_expenses', name: 'tarifas_regionales_excepcion' })
@Index('idx_tarifas_regionales_excepcion_depto', ['departamento'], { unique: true })
export class TarifaRegionalExcepcionEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'departamento', type: 'varchar', length: 100, unique: true })
  departamento: string;

  @Column({ name: 'es_nuevo_departamento', type: 'boolean', default: true })
  esNuevoDepartamento: boolean;

  @Column({ name: 'tarifa_diaria', type: 'numeric', precision: 12, scale: 2 })
  tarifaDiaria: number;

  @Column({ name: 'decreto_referencia', type: 'varchar', length: 100, nullable: true })
  decretoReferencia: string | null;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
