import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('oficios_enviados', { schema: 'legal_management' })
export class OficioEnviado {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 50 })
    numero: string;

    @Column({ name: 'expediente_id', length: 100 })
    expedienteId: string;

    @Column({ length: 50, nullable: true })
    modulo: string;

    @Column({ length: 500 })
    asunto: string;

    @Column({ length: 300 })
    destinatario: string;

    @Column({ name: 'destinatario_email', length: 200, nullable: true })
    destinatarioEmail: string;

    @Column('text')
    contenido: string;

    @Column({ name: 'contenido_html', type: 'text', nullable: true })
    contenidoHtml: string;

    @Column({ length: 200, nullable: true })
    firma: string;

    @Column({ length: 50, nullable: true })
    plantilla: string;

    @Column({ length: 30, default: 'ENVIADO' })
    estado: string;

    @Column({ name: 'fecha_envio', type: 'timestamp', default: () => 'NOW()' })
    fechaEnvio: Date;

    @Column({ name: 'archivos_adjuntos', type: 'jsonb', nullable: true })
    archivosAdjuntos: { nombre: string; url: string; tipo: string; size?: number }[];

    @Column({ name: 'graph_message_id', length: 200, nullable: true })
    graphMessageId: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
