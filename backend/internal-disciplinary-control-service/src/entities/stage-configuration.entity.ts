import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('stage_configuration')
export class StageConfiguration {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'enum', enum: ['EVALUACION', 'INDAGACION_PREVIA', 'INVESTIGACION', 'JUZGAMIENTO'], default: 'EVALUACION' })
    etapa: string; // EVALUACION, INDAGACION_PREVIA, INVESTIGACION, JUZGAMIENTO

    @Column({ name: 'diasHabiles', type: 'int', default: 30 })
    diasHabiles: number;

    @Column({ type: 'text', nullable: true })
    descripcion: string;

    @Column({ default: true })
    activo: boolean;

    @CreateDateColumn({ name: 'createdAt' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updatedAt' })
    updatedAt: Date;
}
