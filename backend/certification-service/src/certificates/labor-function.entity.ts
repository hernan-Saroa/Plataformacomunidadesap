import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LaborFunctionProfile } from './labor-function-profile.entity';

@Entity('labor_functions')
@Index('ux_labor_functions_profile_ordinal', ['profile_id', 'ordinal'], {
  unique: true,
})
export class LaborFunction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  profile_id: string;

  @Column({ type: 'int' })
  ordinal: number;

  @Column({ type: 'text' })
  description: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => LaborFunctionProfile, (profile) => profile.functions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profile_id' })
  profile: LaborFunctionProfile;
}
