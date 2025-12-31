import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ConsultaJuridica } from './consulta-juridica.entity';

@Entity({ name: 'documentos_consulta', schema: 'legal_management' })
export class DocumentoConsulta {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'consulta_id', type: 'uuid' })
    consultaId: string;

    @ManyToOne(() => ConsultaJuridica, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'consulta_id' })
    consulta: ConsultaJuridica;

    @Column({ type: 'varchar', length: 255 })
    nombre: string;

    @Column({ name: 'tipo_documento', type: 'varchar', length: 50, default: 'otro' })
    tipoDocumento: string;

    @Column({ type: 'text', nullable: true })
    descripcion?: string;

    @Column({ name: 'archivo_url', type: 'text', nullable: true })
    archivoUrl?: string;

    @Column({ name: 'archivo_nombre_original', type: 'varchar', length: 255, nullable: true })
    archivoNombreOriginal?: string;

    @Column({ name: 'tamano_bytes', type: 'bigint', nullable: true })
    tamanoBytes?: number;

    @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
    mimeType?: string;

    @Column({ name: 'subido_por', type: 'varchar', length: 200, nullable: true })
    subidoPor?: string;

    @Column({ name: 'fecha_documento', type: 'date', nullable: true })
    fechaDocumento?: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
