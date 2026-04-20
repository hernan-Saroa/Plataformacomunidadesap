import { 
  Column,
  Entity,
  PrimaryGeneratedColumn,
  BeforeInsert, 
  BeforeUpdate 
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

  @Column({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;

  @BeforeInsert()
  setTimestamps() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}
