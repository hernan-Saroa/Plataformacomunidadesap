import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Expediente } from './expediente.entity';

@Entity('documentos', { schema: 'legal_management' })
export class Documento {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'expediente_id' })
    expedienteId: string;

    @ManyToOne(() => Expediente, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'expediente_id' })
    expediente: Expediente;

    @Column({ length: 500 })
    nombre: string;

    @Column({ length: 100 })
    tipo: string; // DEMANDA, AUTO, MEMORIAL, PRUEBA, SENTENCIA, NOTIFICACION, OTRO

    @Column({ type: 'text', nullable: true })
    descripcion: string;

    @Column({ name: 'archivo_url', type: 'text', nullable: true })
    archivoUrl: string;

    @Column({ name: 'archivo_nombre_original', length: 500, nullable: true })
    archivoNombreOriginal: string;

    @Column({ name: 'archivo_tamano', nullable: true })
    archivoTamano: number;

    @Column({ name: 'archivo_mime_type', length: 100, nullable: true })
    archivoMimeType: string;

    @Column({ name: 'fecha_documento', type: 'date', nullable: true })
    fechaDocumento: Date;

    @Column({ name: 'numero_folios', nullable: true })
    numeroFolios: number;

    @Column({ default: false })
    confidencial: boolean;

    @Column({ name: 'subido_por', length: 255, nullable: true })
    subidoPor: string;

    @Column({ length: 50, default: 'documentos' })
    categoria: string;

    @Column({ length: 100, nullable: true })
    etapa: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
