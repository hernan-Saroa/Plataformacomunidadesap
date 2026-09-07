import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Entidad que representa una escala de viáticos por rango salarial.
 * Corresponde a la tabla travel_expenses.escalas_viaticos.
 */
@Entity({ schema: 'travel_expenses', name: 'escalas_viaticos' })
@Index('idx_escalas_rango', ['rangoMinimo', 'rangoMaximo'])
@Index('idx_escalas_ano_vigencia', ['anoVigencia'])
@Index('idx_escalas_activo', ['activo'])
export class EscalaViaticoEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'decreto_vigente', type: 'varchar', length: 50 })
  decretoVigente: string;

  @Column({ name: 'ano_vigencia', type: 'int' })
  anoVigencia: number;

  @Column({ name: 'rango_minimo', type: 'numeric', precision: 12, scale: 2 })
  rangoMinimo: number;

  @Column({ name: 'rango_maximo', type: 'numeric', precision: 12, scale: 2 })
  rangoMaximo: number;

  @Column({ name: 'tarifa_diaria', type: 'numeric', precision: 12, scale: 2 })
  tarifaDiaria: number;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
