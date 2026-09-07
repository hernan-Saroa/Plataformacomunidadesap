import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ schema: 'academic_registration', name: 'graduate_program_catalog' })
export class GraduateProgram {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'normalized_name', length: 255, unique: true })
  normalizedName: string;

  @Column({
    name: 'created_by',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  createdBy?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
