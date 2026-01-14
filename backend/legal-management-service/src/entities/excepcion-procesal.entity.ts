import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Expediente } from './expediente.entity';

export type TipoExcepcion = 'NULIDAD' | 'RECUSACION' | 'PRESCRIPCION' | 'IMPEDIMENTO' | 'OTRA';
export type EstadoExcepcion = 'PENDIENTE' | 'RESUELTA' | 'RECHAZADA';

@Entity('excepciones_procesales', { schema: 'legal_management' })
export class ExcepcionProcesal {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 50 })
    tipo: TipoExcepcion;

    @Column('text')
    descripcion: string;

    @Column('text', { nullable: true })
    fundamento: string;

    @Column({ length: 20, default: 'PENDIENTE' })
    estado: EstadoExcepcion;

    @Column('text', { nullable: true })
    resolucion: string;

    @Column({ name: 'fecha_presentacion', type: 'date', default: () => 'CURRENT_DATE' })
    fechaPresentacion: string;

    @Column({ name: 'fecha_resolucion', type: 'date', nullable: true })
    fechaResolucion: string;

    @Column({ name: 'presentado_por', length: 255, nullable: true })
    presentadoPor: string;

    @ManyToOne(() => Expediente)
    @JoinColumn({ name: 'expediente_id' })
    expediente: Expediente;

    @Column({ name: 'expediente_id' })
    expedienteId: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
