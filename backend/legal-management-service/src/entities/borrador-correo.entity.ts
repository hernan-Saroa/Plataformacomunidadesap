import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Adjunto embebido en un borrador de correo.
 * Se guarda base64 (contentBytes) para que el borrador sea autocontenido
 * y pueda restaurarse tal cual al reabrirlo.
 */
export interface BorradorAdjunto {
    name: string;
    contentType: string;
    contentBytes: string; // base64 (sin prefijo data:)
    size: number;         // bytes
}

/**
 * Borrador PRIVADO de un correo nuevo del Centro de Comunicaciones (Redactar Correo).
 * Se autoguarda mientras se redacta y se elimina automáticamente al enviarse.
 * Solo aplica a correos nuevos (no respuestas ni reenvíos).
 */
@Entity('borradores_correos', { schema: 'legal_management' })
@Index('idx_borradores_correos_usuario', ['usuarioId', 'updatedAt'])
export class BorradorCorreo {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // Propietario del borrador (privado por usuario).
    @Column({ name: 'usuario_id', length: 100 })
    usuarioId: string;

    @Column({ name: 'usuario_nombre', length: 255, nullable: true })
    usuarioNombre: string | null;

    // Cuenta remitente / bandeja de origen: JUDICIAL | CORREOS.
    @Column({ length: 20, default: 'JUDICIAL' })
    buzon: string;

    // Destinatarios como arreglo JSON de correos (texto).
    @Column({ name: 'destinatarios_to', type: 'text', nullable: true })
    destinatariosTo: string | null; // "Para"

    @Column({ name: 'destinatarios_cc', type: 'text', nullable: true })
    destinatariosCc: string | null; // CC

    @Column({ name: 'destinatarios_cco', type: 'text', nullable: true })
    destinatariosCco: string | null; // CCO

    @Column({ length: 500, nullable: true })
    asunto: string | null;

    @Column({ type: 'text', nullable: true })
    cuerpo: string | null;

    // Adjuntos embebidos (base64). Límite ~25MB aplicado en el frontend.
    @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
    adjuntos: BorradorAdjunto[];

    @Column({ name: 'solicitar_acuse', default: true })
    solicitarAcuse: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
