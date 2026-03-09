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

    @Column({ name: 'confianza_clasificacion', type: 'float', nullable: true })
    confianzaClasificacion: number;

    @Column({ name: 'ai_suggested_category', length: 100, nullable: true })
    aiSuggestedCategory: string;

    @Column({ name: 'is_trained', default: false })
    isTrained: boolean;

    @Column({ name: 'expediente_id', nullable: true })
    expedienteId: string;

    @Column({ length: 20, default: 'ENTRANTE' })
    direccion: string; // ENTRANTE, ENVIADO

    @Column({ name: 'destinatarios_to', type: 'text', nullable: true })
    destinatariosTo: string;

    // ── Threading / Reply support ──
    @Column({ name: 'is_replied', default: false })
    isReplied: boolean;

    @Column({ name: 'is_forwarded', default: false })
    isForwarded: boolean;

    @Column({ name: 'parent_email_id', type: 'uuid', nullable: true })
    parentEmailId: string;

    @Column({ name: 'thread_id', length: 500, nullable: true })
    threadId: string;

    @Column({ name: 'internet_message_id', length: 500, nullable: true })
    internetMessageId: string;

    // ── NLP Entity extraction ──
    @Column({ name: 'proceso_id_sugerido', length: 100, nullable: true })
    procesoIdSugerido: string;

    @Column({ name: 'implicado_sugerido', length: 255, nullable: true })
    implicadoSugerido: string;

    @Column({ name: 'submodulo_sugerido', length: 100, nullable: true })
    submoduloSugerido: string;
}
