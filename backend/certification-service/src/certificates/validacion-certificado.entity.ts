import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Certificado } from './certificado.entity';

@Entity('validaciones_certificado')
export class ValidacionCertificado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  certificado_id: string;

  @Column({ length: 100 })
  codigo_verificacion: string;

  @Column({ type: 'timestamp' })
  fecha_validacion: Date;

  @Column({ length: 50, nullable: true })
  ip_validacion: string;

  @Column({ length: 200, nullable: true })
  user_agent: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Certificado, certificado => certificado.validaciones)
  @JoinColumn({ name: 'certificado_id' })
  certificado: Certificado;
}
