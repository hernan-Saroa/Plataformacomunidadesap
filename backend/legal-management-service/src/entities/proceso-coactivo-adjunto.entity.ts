import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ProcesoCoactivo } from './proceso-coactivo.entity';

@Entity({ name: 'procesos_coactivos_adjuntos', schema: 'legal_management' })
export class ProcesoCoactivoAdjunto {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'proceso_id' })
    procesoId: string;

    @ManyToOne(() => ProcesoCoactivo, proceso => proceso.adjuntos, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'proceso_id' })
    proceso: ProcesoCoactivo;

    @Column({ name: 'nombre_original' })
    nombreOriginal: string;

    @Column({ name: 'nombre_archivo' })
    nombreArchivo: string;

    @Column({ name: 'mime_type' })
    mimeType: string;

    @Column({ type: 'int' })
    tamano: number;

    @Column({ nullable: true })
    tipo: string;

    @Column({ name: 'archivo_url', nullable: true })
    archivoUrl: string;

    @CreateDateColumn({ name: 'fecha_creacion' })
    fechaCreacion: Date;
}
