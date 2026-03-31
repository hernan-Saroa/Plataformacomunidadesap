import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type TechnicalBonusCategory = 'DIRECTIVOS' | 'COORDINADORES';

@Entity('technical_bonus_assignments')
@Index('ux_technical_bonus_category_id_number', ['category', 'id_number'], { unique: true })
@Index('idx_technical_bonus_category', ['category'])
export class TechnicalBonusAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  category: TechnicalBonusCategory;

  @Column({ type: 'uuid', nullable: true })
  request_id: string | null;

  @Column({ type: 'varchar', length: 255 })
  full_name: string;

  @Column({ type: 'varchar', length: 50 })
  id_number: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  percentage: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  created_by: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  updated_by: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
