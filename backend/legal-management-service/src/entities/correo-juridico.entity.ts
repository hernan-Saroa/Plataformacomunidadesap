import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('correos_juridicos', { schema: 'legal_management' })
export class CorreoJuridico {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'graph_message_id', unique: true, length: 500 })
    graphMessageId: string;

    @Column({ length: 500 })
    asunto: string;

    @Column({ name: 'remitente_email', length: 255 })
    remitenteEmail: string;

    @Column({ name: 'remitente_nombre', length: 255, nullable: true })
    remitenteNombre: string;

    @Column({ type: 'text', nullable: true })
    destinatarios: string;

    @Column({ name: 'fecha_recepcion', type: 'timestamp' })
    fechaRecepcion: Date;

    @Column({ name: 'cuerpo_html', type: 'text', nullable: true })
    cuerpoHtml: string;

    @Column({ name: 'cuerpo_texto', type: 'text', nullable: true })
    cuerpoTexto: string;

    @Column({ name: 'tiene_adjuntos', default: false })
    tieneAdjuntos: boolean;

    @Column({ default: false })
    leido: boolean;

    @Column({ default: false })
    archivado: boolean;

    @Column({ default: false })
    urgente: boolean;

    @Column({ length: 20, default: 'CORREO' })
    tipo: string; // JUDICIAL, CORREO, OFICIO

    @Column({ length: 100, nullable: true })
    categoria: string;

    @Column({ name: 'modulo_sugerido', length: 100, nullable: true })
    moduloSugerido: string;

    @Column({ name: 'confianza_clasificacion', nullable: true })
    confianzaClasificacion: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
