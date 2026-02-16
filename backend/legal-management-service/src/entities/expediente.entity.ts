
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Actuacion } from './actuacion.entity';
import { DecisionDisciplinaria } from './decision-disciplinaria.entity';
import { Evidencia } from './evidencia.entity';
import { Documento } from './documento.entity';
import { Actor } from './actor.entity';

@Entity('expedientes', { schema: 'legal_management' })
export class Expediente {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToMany(() => Actor, (actor) => actor.expediente, { cascade: true })
    actors: Actor[];

    // Data populated manually by Service, no ORM relation
    actuaciones: Actuacion[];

    @OneToMany(() => DecisionDisciplinaria, (decision) => decision.expediente)
    decisiones: DecisionDisciplinaria[];

    @OneToMany(() => Documento, (doc) => doc.expediente)
    documentos: Documento[];

    @OneToMany(() => Evidencia, (evidencia) => evidencia.expediente)
    evidencias: Evidencia[];

    documentosCount: number = 0;

    @Column({ unique: true, length: 50 })
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

    @Column({ name: 'tipo_conteo_termino', default: 'HABILES' })
    tipoConteoTermino: string; // 'HABILES' (business days) or 'CALENDARIO' (calendar days)

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

    // Campos de contacto del demandante
    @Column({ name: 'demandante_direccion', length: 500, nullable: true })
    demandanteDireccion: string;

    @Column({ name: 'demandante_telefono', length: 50, nullable: true })
    demandanteTelefono: string;

    @Column({ name: 'demandante_email', length: 255, nullable: true })
    demandanteEmail: string;

    @Column({ name: 'demandante_apoderado', length: 255, nullable: true })
    demandanteApoderado: string;

    // Campos de contacto del demandado (opcional)
    @Column({ name: 'demandado_direccion', length: 500, nullable: true })
    demandadoDireccion: string;

    @Column({ name: 'demandado_telefono', length: 50, nullable: true })
    demandadoTelefono: string;

    @Column({ name: 'demandado_email', length: 255, nullable: true })
    demandadoEmail: string;

    @Column({ name: 'etapa_procesal', default: 'RADICACION' })
    etapaProcesal: string;

    @Column({ name: 'documentos_iniciales_urls', type: 'simple-array', nullable: true })
    documentosInicialesUrls: string[];

    // Campos específicos para Juzgamiento Disciplinario
    @Column({ nullable: true, length: 50 })
    etapa: string;

    @Column({ name: 'cargo_investigado', nullable: true, length: 255 })
    cargoInvestigado: string;

    @Column({ name: 'ley_aplicable', nullable: true, length: 100 })
    leyAplicable: string;

    @Column({ name: 'tipo_falta', nullable: true, length: 50 })
    tipoFalta: string;

    @Column({ name: 'dependencia_investigado', nullable: true, length: 150 })
    dependenciaInvestigado: string;

    @Column({ type: 'text', nullable: true })
    hechos: string;

    @Column({ name: 'fecha_limite_etapa', type: 'timestamp', nullable: true })
    fechaLimiteEtapa: Date;

    // Campos específicos para Control de Términos e Informes
    @Column({ name: 'tipo_solicitud', nullable: true, length: 100 })
    tipoSolicitud: string;

    @Column({ name: 'radicado_externo', nullable: true, length: 50 })
    radicadoExterno: string;

    @Column({ nullable: true, length: 255 })
    asunto: string;

    @Column({ name: 'datos_requeridos', type: 'text', nullable: true })
    datosRequeridos: string | null;

    // Campos para archivado/eliminado (soft-delete)
    @Column({ name: 'estado_archivo', default: 'ACTIVO' })
    estadoArchivo: string; // 'ACTIVO' | 'ARCHIVADO' | 'ELIMINADO'

    @Column({ name: 'fecha_archivo', type: 'timestamp', nullable: true })
    fechaArchivo: Date;

    @Column({ name: 'usuario_archivo', nullable: true })
    usuarioArchivo: string;

    @Column({ name: 'motivo_archivo', type: 'text', nullable: true })
    motivoArchivo: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
