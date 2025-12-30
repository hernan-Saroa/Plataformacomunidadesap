import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { PeiIndicador } from './pei-indicador.entity';

@Entity('pei_registros_avance', { schema: 'legal_management' })
export class PeiRegistroAvance {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'indicador_id' })
    indicadorId: number;

    @ManyToOne(() => PeiIndicador, (indicador) => indicador.registros)
    @JoinColumn({ name: 'indicador_id' })
    indicador: PeiIndicador;

    @Column({ name: 'valor_reportado', type: 'decimal', precision: 10, scale: 2 })
    valorReportado: number;

    @Column({ name: 'porcentaje_avance', type: 'decimal', precision: 5, scale: 2, nullable: true })
    porcentajeAvance: number;

    @Column('text', { nullable: true })
    observaciones: string;

    @Column({ name: 'evidencia_url', type: 'text', nullable: true })
    evidenciaUrl: string;

    @CreateDateColumn({ name: 'fecha_registro' })
    fechaRegistro: Date;

    @Column({ name: 'usuario_registra_id', type: 'uuid', nullable: true })
    usuarioRegistraId: string;
}
