import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CorreoJuridico } from './correo-juridico.entity';

@Entity('adjuntos_correo', { schema: 'legal_management' })
export class AdjuntoCorreo {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'correo_id' })
    correoId: string;

    @ManyToOne(() => CorreoJuridico, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'correo_id' })
    correo: CorreoJuridico;

    @Column({ name: 'graph_message_id', length: 500 })
    graphMessageId: string;

    @Column({ name: 'graph_attachment_id', length: 500 })
    graphAttachmentId: string;

    @Column({ length: 500 })
    nombre: string;

    @Column({ name: 'content_type', length: 255, nullable: true })
    contentType: string;

    @Column({ default: 0 })
    tamanio: number;

    @Column({ name: 'archivo_local_url', type: 'text', nullable: true })
    archivoLocalUrl: string;

    @Column({ default: false })
    descargado: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
