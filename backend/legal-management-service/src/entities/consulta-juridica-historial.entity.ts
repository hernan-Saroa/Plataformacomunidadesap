import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ConsultaJuridica } from './consulta-juridica.entity';

@Entity('consulta_juridica_historial', { schema: 'legal_management' })
export class ConsultaJuridicaHistorial {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'consulta_id' })
    consultaId: string;

    @ManyToOne(() => ConsultaJuridica, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'consulta_id' })
    consulta: ConsultaJuridica;

    @Column({ name: 'tipo_evento' })
    tipoEvento: string; // ASIGNACION, CAMBIO_ETAPA, RESPUESTA, etc.

    @Column('text')
    descripcion: string;

    @Column('text', { nullable: true })
    detalle: string;

    @Column({ nullable: true })
    usuario: string;

    @CreateDateColumn({ type: 'timestamp', name: 'fecha' })
    fecha: Date;
}
