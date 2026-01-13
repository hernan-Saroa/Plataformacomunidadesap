import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GraduationCertificate } from './graduation-certificate.entity';

@Entity({ schema: 'academic_registration', name: 'certificate_validations' })
export class CertificateValidation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relación con certificado
  @Column({ name: 'certificate_id', type: 'uuid' })
  certificateId: string;

  // Información de la validación
  @CreateDateColumn({ name: 'validation_date' })
  validationDate: Date;

  // Datos del validador
  @Column({ name: 'ip_address', length: 50, nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string | null;

  // Resultado de la validación
  @Column({ length: 50 })
  result: string; // VALID, REVOKED, EXPIRED, NOT_FOUND

  // Auditoría
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relaciones
  @ManyToOne(
    () => GraduationCertificate,
    (certificate) => certificate.validations,
  )
  @JoinColumn({ name: 'certificate_id' })
  certificate: GraduationCertificate;
}
