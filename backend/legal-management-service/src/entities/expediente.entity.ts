
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Actuacion } from './actuacion.entity';

@Entity('expedientes', { schema: 'legal_management' })
export class Expediente {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToMany(() => Actuacion, (actuacion) => actuacion.expediente)
    actuaciones: Actuacion[];

    @Column({ unique: true, length: 23 })
    radicado: string;

    @Column({ default: 'Disciplinaria' })
    jurisdiccion: string; // CIVIL, PENAL, ADMINISTRATIVO

    @Column({ name: 'tipo_proceso', default: 'Ordinario' })
    tipoProceso: string;

    @Column({ default: 'De Oficio' })
    demandante: string;

    @Column({ default: 'ESAP' })
    demandado: string;

    @Column({ default: 'RADICADO' })
    estado: string; // RADICADO, EN_TRAMITE, FALLO...

    @Column({ name: 'fecha_radicacion', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    fechaRadicacion: Date;

    @Column('numeric', { precision: 15, scale: 2, nullable: true })
    cuantia: number;

    // Campos adicionales para Dashboard
    @Column({ name: 'abogado_sustanciador', nullable: true })
    abogadoSustanciador: string;

    @Column({ name: 'fecha_prescripcion', type: 'timestamp', nullable: true })
    fechaPrescripcion: Date;

    @Column({ name: 'riesgo_prescripcion', default: false })
    riesgoPrescripcion: boolean;

    @Column({ name: 'termino_procesal_dias', nullable: true })
    terminoProcesalDias: number;

    @Column({ name: 'ultima_actuacion', nullable: true })
    ultimaActuacion: string;

    @Column({ name: 'ubicacion_fisica', nullable: true })
    ubicacionFisica: string;

    @Column({ name: 'sancion_proyectada', nullable: true })
    sancionProyectada: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
