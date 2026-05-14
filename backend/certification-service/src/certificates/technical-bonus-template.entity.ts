import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

export type TechnicalBonusTemplateCategory = string;

export const DEFAULT_TECHNICAL_BONUS_TEMPLATES: Record<
  'DIRECTIVOS' | 'COORDINADORES',
  string
> = {
  DIRECTIVOS:
    'Percibe una prima t\u00e9cnica en un porcentaje igual al ({porcentaje}%) sobre la asignaci\u00f3n b\u00e1sica mensual de {valor_letras} (${valor_numerico}) pesos m/cte.',
  COORDINADORES:
    'Percibe una prima de coordinaci\u00f3n en un porcentaje igual al ({porcentaje}%) sobre la asignaci\u00f3n b\u00e1sica mensual de {valor_letras} (${valor_numerico}) pesos m/cte.',
};

export const DEFAULT_DYNAMIC_TECHNICAL_BONUS_TEMPLATE =
  'Percibe una prima en un porcentaje igual al ({porcentaje}%) sobre la asignaci\u00f3n b\u00e1sica mensual de {valor_letras} (${valor_numerico}) pesos m/cte.';

@Entity({ name: 'technical_bonus_templates', schema: 'certification' })
@Unique('uq_technical_bonus_template_category', ['category'])
export class TechnicalBonusTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  category: TechnicalBonusTemplateCategory;

  @Column({ type: 'varchar', length: 120, nullable: true })
  label: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ type: 'text' })
  template_text: string;

  @Column({ type: 'int', default: 0 })
  display_order: number;

  @Column({ type: 'boolean', default: false })
  is_system: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  updated_by: string | null;
}
