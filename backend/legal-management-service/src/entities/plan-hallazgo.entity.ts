import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { PlanMejoramiento } from './planes-mejoramiento.entity';

/**
 * Hallazgo / Acción de Mejora asociado a un Plan de Mejoramiento.
 * Bug 5c: el porcentaje de avance global del plan se calcula como el promedio
 * de los `porcentajeAvance` de sus hallazgos. Hasta que TODOS los hallazgos no
 * estén en 100%, el plan no puede llegar a 100%.
 */
@Entity('planes_hallazgos', { schema: 'legal_management' })
export class PlanHallazgo {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'plan_id', type: 'uuid' })
    planId: string;

    @ManyToOne(() => PlanMejoramiento, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'plan_id' })
    plan: PlanMejoramiento;

    @Column({ length: 255 })
    nombre: string;

    @Column({ type: 'text', nullable: true })
    descripcion: string;

    @Column({ name: 'porcentaje_avance', type: 'int', default: 0 })
    porcentajeAvance: number;

    @Column({ name: 'archivo_url', type: 'text', nullable: true })
    archivoUrl: string;

    @Column({ name: 'archivo_nombre', length: 255, nullable: true })
    archivoNombre: string;

    @Column({ name: 'archivo_mime', length: 100, nullable: true })
    archivoMime: string;

    @Column({ name: 'created_by', length: 150, nullable: true })
    createdBy: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
