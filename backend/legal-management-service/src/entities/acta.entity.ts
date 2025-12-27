import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Expediente } from './expediente.entity';

@Entity('actas')
export class Acta {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'expediente_id' })
    expedienteId: string;

    @ManyToOne(() => Expediente)
    @JoinColumn({ name: 'expediente_id' })
    expediente: Expediente;

    @Column({ name: 'numero_acta', nullable: true })
    numeroActa: string;

    @Column({ type: 'date', nullable: true })
    fecha: string;

    @Column({ nullable: true })
    horario: string;

    @Column({ nullable: true })
    duracion: string;

    @Column({ nullable: true })
    lugar: string;

    @Column({ nullable: true })
    presidente: string;

    @Column({ type: 'text', nullable: true })
    participantes: string;

    @Column({ type: 'text', nullable: true })
    resumen: string;

    @Column({ name: 'decisiones_tomadas', type: 'text', nullable: true })
    decisionesTomadas: string;

    @Column({ default: 'Programada' })
    estado: string;

    @Column({ name: 'archivo_nombre', nullable: true })
    archivoNombre: string;

    @Column({ name: 'archivo_url', type: 'text', nullable: true })
    archivoUrl: string;

    @Column({ name: 'archivo_tamano', nullable: true })
    archivoTamano: number;

    @Column({ nullable: true })
    tipo: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
