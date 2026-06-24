import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate } from 'typeorm';

@Entity({ schema: 'academic_work_plan', name: 'BancoDocentesInvitaciones' })
export class BancoDocenteInvitacionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'correo_institucional', type: 'text' })
  correoInstitucional: string;

  @Column({ name: 'token_acceso', type: 'text', unique: true })
  tokenAcceso: string;

  @Column({ name: 'otp_codigo', type: 'text', nullable: true })
  otpCodigo: string | null;

  @Column({ name: 'otp_expira_en', type: 'timestamp', nullable: true })
  otpExpiraEn: Date | null;

  @Column({ name: 'intentos_otp', type: 'int', default: 0 })
  intentosOtp: number;

  @Column({ name: 'estado', type: 'text', default: 'Enviada' })
  estado: string; // Enviada, Abierta, OTP validado, En proceso, Gestionada, Vencida

  @Column({ name: 'fecha_expiracion', type: 'timestamp' })
  fechaExpiracion: Date;

  @Column({ name: 'borrador_json', type: 'jsonb', nullable: true })
  borradorJson: any | null;

  @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
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
