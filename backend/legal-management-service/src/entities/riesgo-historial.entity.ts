import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Riesgo } from './riesgo.entity';

/**
 * Tipos de eventos del historial de riesgos
 */
export type TipoEventoRiesgo =
    | 'CREACION'
    | 'ACTUALIZACION'
    | 'CAMBIO_ETAPA'
    | 'CAMBIO_ZONA'
    | 'ARCHIVADO'
    | 'CONTROL_AGREGADO'
    | 'CONTROL_MODIFICADO'
    | 'TRATAMIENTO_AGREGADO';

/**
 * Entidad para almacenar el historial de cambios de un riesgo
 * Permite mantener trazabilidad completa de todas las acciones
 */
@Entity('riesgo_historial', { schema: 'legal_management' })
export class RiesgoHistorial {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'riesgo_id', type: 'uuid' })
    riesgoId: string;

    @ManyToOne(() => Riesgo, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'riesgo_id' })
    riesgo: Riesgo;

    @Column({
        name: 'tipo_evento',
        type: 'varchar',
        length: 50
    })
    tipoEvento: TipoEventoRiesgo;

    @Column({ type: 'text' })
    descripcion: string;

    @Column({ name: 'campo_modificado', type: 'varchar', length: 100, nullable: true })
    campoModificado: string | null;

    @Column({ name: 'valor_anterior', type: 'text', nullable: true })
    valorAnterior: string | null;

    @Column({ name: 'valor_nuevo', type: 'text', nullable: true })
    valorNuevo: string | null;

    @Column({ type: 'varchar', length: 200, default: 'Sistema' })
    usuario: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
