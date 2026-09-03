import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Entidad que representa la tarifa diaria por categoría de investigador.
 * Corresponde a la tabla travel_expenses.tarifas_investigadores.
 */
@Entity({ schema: 'travel_expenses', name: 'tarifas_investigadores' })
@Index('idx_tarifas_investigadores_categoria', ['categoriaInvestigador'], {
  unique: true,
})
@Index('idx_tarifas_investigadores_activo', ['activo'])
export class TarifaInvestigadorEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({
    name: 'categoria_investigador',
    type: 'varchar',
    length: 50,
    unique: true,
  })
  categoriaInvestigador: string;

  @Column({ name: 'tarifa_diaria', type: 'numeric', precision: 12, scale: 2 })
  tarifaDiaria: number;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
