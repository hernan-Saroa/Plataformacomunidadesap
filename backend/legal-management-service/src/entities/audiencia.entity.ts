import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Expediente } from './expediente.entity';

@Entity('audiencias', { schema: 'legal_management' })
export class Audiencia {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'expediente_id' })
    expedienteId: string;

    @ManyToOne(() => Expediente)
    @JoinColumn({ name: 'expediente_id' })
    expediente: Expediente;

    @Column({ name: 'abogado_id' })
    abogadoId: string;

    @Column({ name: 'abogado_nombre', nullable: true })
    abogadoNombre: string;

    @Column({ name: 'abogado_email', nullable: true })
    abogadoEmail: string;

    @Column()
    titulo: string;

    @Column({ name: 'fecha_hora_inicio', type: 'timestamp' })
    fechaHoraInicio: Date;

    @Column({ name: 'duracion_minutos' })
    duracionMinutos: number;

    @Column()
    modalidad: string; // 'VIRTUAL' | 'PRESENCIAL'

    @Column({ nullable: true })
    ubicacion: string;

    @Column({ name: 'link_reunion', nullable: true })
    linkReunion: string;

    @Column({ default: 'PROGRAMADA' })
    estado: string; // 'PROGRAMADA', 'REALIZADA', 'CANCELADA', 'APLAZADA'

    @Column({ name: 'notas_preparacion', type: 'text', nullable: true })
    notasPreparacion: string;

    @Column({ type: 'jsonb', nullable: true })
    historial: any[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
