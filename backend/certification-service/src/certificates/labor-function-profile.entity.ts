import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LaborFunction } from './labor-function.entity';

@Entity('labor_function_profiles')
@Index('ux_labor_function_profiles_match_key', ['match_key'], { unique: true })
@Index('idx_labor_function_profiles_combined_code', ['combined_code'])
export class LaborFunctionProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  position_code: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  grade_code: string | null;

  @Column({ type: 'varchar', length: 40 })
  combined_code: string;

  @Column({ type: 'varchar', length: 500 })
  match_key: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  hierarchical_level: string | null;

  @Column({ type: 'varchar', length: 255 })
  position_name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  department_name: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  department_key: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  internal_group: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  internal_group_key: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cost_center: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  source_sheet: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  created_by: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  updated_by: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => LaborFunction, (item) => item.profile)
  functions: LaborFunction[];
}
