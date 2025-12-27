import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Graduate } from './graduate.entity';
import { GraduationCertificate } from './graduation-certificate.entity';

@Entity({
  schema: 'academic_registration',
  name: 'graduation_certificate_requests',
})
export class GraduationCertificateRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Número de solicitud
  @Column({ name: 'request_number', length: 100, unique: true })
  requestNumber: string;

  // Tipo de solicitante
  @Column({ name: 'requester_type', length: 50 })
  requesterType: string; // 'GRADUATE', 'COMPANY'

  // Información del graduado
  @Column({ name: 'graduate_id', type: 'uuid', nullable: true })
  graduateId: string;

  @Column({ name: 'id_number', length: 50 })
  idNumber: string;

  @Column({ name: 'full_name', length: 255 })
  fullName: string;

  // Información del programa
  @Column({ name: 'program_name', length: 255 })
  programName: string;

  @Column({ name: 'graduation_date', type: 'date' })
  graduationDate: Date;

  // Información del solicitante
  @Column({ name: 'requester_name', length: 255, nullable: true })
  requesterName: string;

  @Column({ name: 'requester_email', length: 255 })
  requesterEmail: string;

  @Column({ name: 'requester_phone', length: 50, nullable: true })
  requesterPhone: string;

  @Column({ name: 'company_name', length: 255, nullable: true })
  companyName: string;

  // Tipo de certificado
  @Column({ name: 'certificate_type', length: 50, default: 'STANDARD' })
  certificateType: string; // STANDARD, OFFICIAL, INTERNATIONAL

  // Validación
  @Column({ name: 'validation_code', length: 10, nullable: true })
  validationCode: string;

  @Column({ name: 'validation_expires_at', type: 'timestamp', nullable: true })
  validationExpiresAt: Date;

  @Column({ name: 'is_validated', type: 'boolean', default: false })
  isValidated: boolean;

  // Estado
  @Column({ length: 50, default: 'PENDING' })
  status: string; // PENDING, VALIDATED, PROCESSING, COMPLETED, REJECTED

  // Observaciones
  @Column({ type: 'text', nullable: true })
  observations: string;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  // Fechas
  @CreateDateColumn({ name: 'request_date' })
  requestDate: Date;

  @Column({ name: 'validation_date', type: 'timestamp', nullable: true })
  validationDate: Date;

  @Column({ name: 'completion_date', type: 'timestamp', nullable: true })
  completionDate: Date;

  // Auditoría
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => Graduate, (graduate) => graduate.certificateRequests)
  @JoinColumn({ name: 'graduate_id' })
  graduate: Graduate;

  @OneToMany(() => GraduationCertificate, (certificate) => certificate.request)
  certificates: GraduationCertificate[];
}
