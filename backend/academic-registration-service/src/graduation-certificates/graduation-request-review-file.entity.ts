import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GraduationCertificateRequest } from './graduation-certificate-request.entity';

@Entity({
  schema: 'academic_registration',
  name: 'graduation_request_review_files',
})
export class GraduationRequestReviewFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id', type: 'uuid' })
  requestId: string;

  @ManyToOne(() => GraduationCertificateRequest, (request) => request.reviewFiles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'request_id' })
  request: GraduationCertificateRequest;

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
