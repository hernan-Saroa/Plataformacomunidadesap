import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'invitacion_docente', schema: 'rund' })
export class InvitacionDocenteEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id_invitacion' })
  idInvitacion: string;

  @Column({ type: 'varchar', length: 150, name: 'email' })
  email: string;

  @Column({ type: 'varchar', length: 50, name: 'numero_documento', nullable: true })
  numeroDocumento?: string;

  @Column({ type: 'varchar', length: 150, name: 'nombres', nullable: true })
  nombres?: string;

  @Column({ type: 'varchar', length: 150, name: 'apellidos', nullable: true })
  apellidos?: string;

  @Column({ type: 'varchar', length: 255, name: 'token', unique: true })
  token: string;

  @Column({ type: 'varchar', length: 30, name: 'estado', default: 'PENDIENTE' })
  estado: string; // PENDIENTE, COMPLETADO, EXPIRADO, CANCELADO

  @Column({ type: 'timestamptz', name: 'fecha_expiracion' })
  fechaExpiracion: Date;

  @Column({ type: 'timestamptz', name: 'utilizado_en', nullable: true })
  utilizadoEn?: Date;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
