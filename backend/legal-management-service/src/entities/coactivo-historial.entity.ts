import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import type { ProcesoCoactivo } from './proceso-coactivo.entity';

@Entity({ name: 'coactivos_historial', schema: 'legal_management' })
export class CoactivoHistorial {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'proceso_id' })
    procesoId: string;

    @ManyToOne('ProcesoCoactivo', { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'proceso_id' })
    proceso: ProcesoCoactivo;

    @Column({ name: 'tipo_evento', length: 50 })
    tipoEvento: string; // CREACION, PAGO, CAMBIO_ETAPA, ACTUALIZACION

    @Column({ name: 'campo_modificado', length: 100, nullable: true })
    campoModificado: string;

    @Column({ name: 'valor_anterior', type: 'text', nullable: true })
    valorAnterior: string;

    @Column({ name: 'valor_nuevo', type: 'text', nullable: true })
    valorNuevo: string;

    @Column({ length: 100, nullable: true })
    usuario: string;

    @Column({ type: 'text', nullable: true })
    detalles: string;

    @CreateDateColumn({ name: 'fecha_evento' })
    fechaEvento: Date;
}
