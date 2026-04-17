import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'academic_work_plan', name: 'PTAUserData' })
export class PtaUserDataEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'userId', type: 'text' })
  userId: string;

  @Column({ name: 'tags', type: 'jsonb', nullable: true })
  tags: any | null;

  @Column({ name: 'notes', type: 'jsonb', nullable: true })
  notes: any | null;

  @Column({ name: 'pinned', type: 'jsonb', nullable: true })
  pinned: any | null;

  @Column({ name: 'priority', type: 'jsonb', nullable: true })
  priority: any | null;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamptz' })
  updatedAt: Date;
}
