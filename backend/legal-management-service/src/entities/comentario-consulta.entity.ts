
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ConsultaJuridica } from './consulta-juridica.entity';

@Entity('comentarios_consulta', { schema: 'legal_management' })
export class ComentarioConsulta {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'consulta_id' })
    consultaId: string;

    @ManyToOne(() => ConsultaJuridica)
    @JoinColumn({ name: 'consulta_id' })
    consulta: ConsultaJuridica;

    @Column()
    mensaje: string;

    @Column()
    usuario: string;

    @Column({ nullable: true })
    cargo: string;

    @CreateDateColumn({ name: 'fecha' })
    fecha: Date;
}
