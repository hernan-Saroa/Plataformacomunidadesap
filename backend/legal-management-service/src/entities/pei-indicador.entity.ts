import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { PeiRegistroAvance } from './pei-registro-avance.entity';

@Entity('pei_indicadores', { schema: 'legal_management' })
export class PeiIndicador {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 255 })
    nombre: string;

    @Column('text', { nullable: true })
    descripcion: string;

    @Column({ name: 'eje_estrategico', length: 50 })
    ejeEstrategico: string; // 'GESTION', 'TALENTO', 'TRANSPARENCIA', 'TECNOLOGIA'

    @Column({ name: 'meta_objetivo', type: 'decimal', precision: 10, scale: 2 })
    metaObjetivo: number;

    @Column({ name: 'unidad_medida', length: 20, default: 'PORCENTAJE' })
    unidadMedida: string;

    @Column({ name: 'fecha_inicio', type: 'date' })
    fechaInicio: string; // TypeORM maps date types to string by default or Date

    @Column({ name: 'fecha_fin', type: 'date' })
    fechaFin: string;

    @Column({ name: 'frecuencia_medicion', length: 20, default: 'MENSUAL' })
    frecuenciaMedicion: string;

    @Column({ name: 'responsable_id', type: 'uuid', nullable: true })
    responsableId: string;

    @Column({ name: 'responsable_nombre', length: 200, nullable: true })
    responsableNombre: string;

    @Column({ length: 20, default: 'ACTIVO' })
    estado: string;

    @Column({ length: 20, default: 'MEDIA' })
    prioridad: string;

    @Column({ name: 'tipo_indicador', length: 50, default: 'GESTION' })
    tipoIndicador: string;

    @Column({ name: 'archived_at', type: 'timestamp with time zone', nullable: true })
    archivedAt: Date | null;

    @Column({ name: 'archived_by', type: 'varchar', length: 255, nullable: true })
    archivedBy: string | null;

    @Column({ name: 'archive_reason', type: 'text', nullable: true })
    archiveReason: string | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @OneToMany(() => PeiRegistroAvance, (registro) => registro.indicador)
    registros: PeiRegistroAvance[];
}
