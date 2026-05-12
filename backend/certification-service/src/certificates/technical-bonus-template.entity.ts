import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

export type TechnicalBonusTemplateCategory = 'DIRECTIVOS' | 'COORDINADORES';

export const DEFAULT_TECHNICAL_BONUS_TEMPLATES: Record<
  TechnicalBonusTemplateCategory,
  string
> = {
  DIRECTIVOS:
    'Percibe una prima técnica en un porcentaje igual al ({porcentaje}%) sobre la asignación básica mensual de {valor_letras} (${valor_numerico}) pesos m/cte.',
  COORDINADORES:
    'Percibe una prima de coordinación en un porcentaje igual al ({porcentaje}%) sobre la asignación básica mensual de {valor_letras} (${valor_numerico}) pesos m/cte.',
};

@Entity({ name: 'technical_bonus_templates', schema: 'certification' })
@Unique('uq_technical_bonus_template_category', ['category'])
export class TechnicalBonusTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  category: TechnicalBonusTemplateCategory;

  @Column({ type: 'text' })
  template_text: string;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  updated_by: string | null;
}
