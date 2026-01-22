import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import type { ProcesoCoactivo } from './proceso-coactivo.entity';

@Entity({ name: 'pagos_coactivos', schema: 'legal_management' })
export class PagoCoactivo {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'proceso_id' })
    procesoId: string;

    @ManyToOne('ProcesoCoactivo', { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'proceso_id' })
    proceso: ProcesoCoactivo;

    @Column({
        type: 'numeric', precision: 15, scale: 2, transformer: {
            to: (value: number) => value,
            from: (value: string) => parseFloat(value)
        }
    })
    valor: number;

    @Column({ name: 'fecha_pago', type: 'timestamp' })
    fechaPago: Date;

    @Column({ name: 'soporte_url', nullable: true })
    soporteUrl: string;

    @Column({ length: 50, default: 'MANUAL' })
    origen: string; // BANCO, MANUAL

    @Column({ type: 'text', nullable: true })
    observaciones: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
