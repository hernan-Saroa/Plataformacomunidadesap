import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('sequences', { schema: 'legal_management' })
export class Sequence {
    @PrimaryColumn({ type: 'varchar', length: 100 })
    name: string; // Ej: "TERM_2026"

    @Column({ name: 'current_value', type: 'int', default: 0 })
    currentValue: number;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
    updatedAt: Date;
}
