import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CorreoJuridico } from './correo-juridico.entity';

@Entity('correo_tracking_tokens', { schema: 'legal_management' })
export class CorreoTrackingToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'correo_id', type: 'uuid' })
    correoId: string;

    @ManyToOne(() => CorreoJuridico, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'correo_id' })
    correo: CorreoJuridico;

    @Column({ name: 'adjunto_id', type: 'uuid', nullable: true })
    adjuntoId: string;

    @Column({ length: 100, unique: true })
    token: string;

    /** OPEN_PIXEL | DOWNLOAD_LINK */
    @Column({ length: 20 })
    tipo: string;

    @Column({ default: false })
    abierto: boolean;

    @Column({ name: 'fecha_apertura', type: 'timestamp', nullable: true })
    fechaApertura: Date;

    @Column({ name: 'ip_apertura', length: 50, nullable: true })
    ipApertura: string;

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent: string;

    /** Destinatario original (para contexto) */
    @Column({ name: 'destinatario_email', length: 255, nullable: true })
    destinatarioEmail: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
