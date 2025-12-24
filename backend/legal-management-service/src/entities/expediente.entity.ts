
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

    @Column({ name: 'medio_control', nullable: true })
    medioControl: string;

    @Column({ name: 'juzgado_conocimiento', nullable: true })
    juzgadoConocimiento: string;

    @Column({ name: 'pretension_demandante', type: 'text', nullable: true })
    pretensionDemandante: string;

    @Column({ name: 'acto_administrativo_demandado', type: 'text', nullable: true })
    actoAdministrativoDemandado: string;

    @Column({ name: 'fecha_notificacion', type: 'timestamp', nullable: true })
    fechaNotificacion: Date;

    @Column({ name: 'fecha_admision', type: 'timestamp', nullable: true })
    fechaAdmision: Date;

    @Column({ name: 'fecha_vencimiento_termino', type: 'timestamp', nullable: true })
    fechaVencimientoTermino: Date;

    @Column({ name: 'tipo_id_demandante', nullable: true })
    tipoIdDemandante: string;

    @Column({ name: 'numero_id_demandante', nullable: true })
    numeroIdDemandante: string;

    @Column({ name: 'tipo_id_demandado', nullable: true })
    tipoIdDemandado: string;

    @Column({ name: 'numero_id_demandado', nullable: true })
    numeroIdDemandado: string;

    @Column({ name: 'etapa_procesal', default: 'RADICACION' })
    etapaProcesal: string;

    @Column({ name: 'documentos_iniciales_urls', type: 'simple-array', nullable: true })
    documentosInicialesUrls: string[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
