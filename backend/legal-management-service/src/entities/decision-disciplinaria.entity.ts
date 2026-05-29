
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Expediente } from './expediente.entity';

@Entity('decisiones_disciplinarias', { schema: 'legal_management' })
export class DecisionDisciplinaria {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tipo_decision', nullable: true })
    tipoDecision: string;

    @Column({ name: 'tipo_fallo', nullable: true })
    tipoFallo: string; // Sancionatoria | Absolutoria

    @Column({ nullable: true })
    sancion: string;

    @Column('text', { nullable: true })
    consideraciones: string;

    @Column('text', { name: 'fundamentos_juridicos', nullable: true })
    fundamentosJuridicos: string;

    @Column({ nullable: true })
    responsable: string;

    @Column({ name: 'cargo_responsable', nullable: true })
    cargoResponsable: string;

    @Column({ type: 'date', default: () => 'CURRENT_DATE' })
    fecha: string;

    @ManyToOne(() => Expediente)
    @JoinColumn({ name: 'expediente_id' })
    expediente: Expediente;

    @Column({ name: 'expediente_id' })
    expedienteId: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
