import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Graduate } from './graduate.entity';

@Entity({ schema: 'academic_registration', name: 'graduate_files' })
export class GraduateFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'graduate_id', type: 'uuid' })
  graduateId: string;

  @ManyToOne(() => Graduate, (graduate) => graduate.files, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'graduate_id' })
  graduate: Graduate;

  @Column({ name: 'original_name', length: 255 })
  originalName: string;

  @Column({ name: 'stored_name', length: 255 })
  storedName: string;

  @Column({ name: 'mime_type', length: 150 })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'integer' })
  sizeBytes: number;

  @Column({ name: 'uploaded_by', length: 255, nullable: true })
  uploadedBy?: string;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt: Date;
}
