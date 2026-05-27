import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('consultas_juridicas', { schema: 'legal_management' })
export class ConsultaJuridica {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'numero_radicado', unique: true, nullable: true })
    numeroRadicado: string;

    @Column({ name: 'fecha_recepcion', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    fechaRecepcion: Date;

    @Column({ name: 'canal_entrada', nullable: true })
    canalEntrada: string; // correo_electronico, active_document, ventanilla_unica

    @Column({ name: 'tipo_solicitud', nullable: true })
    tipoSolicitud: string; // consulta, concepto_juridico, control_legalidad

    @Column({ name: 'dependencia_solicitante', nullable: true })
    dependenciaSolicitante: string;

    @Column({ name: 'nombre_solicitante', nullable: true })
    nombreSolicitante: string;

    @Column({ name: 'cargo_solicitante', nullable: true })
    cargoSolicitante: string;

    @Column({ name: 'email_solicitante', nullable: true })
    emailSolicitante: string;

    @Column({ name: 'telefono_solicitante', nullable: true })
    telefonoSolicitante: string;

    @Column({ name: 'tipo_usuario', default: 'interno' })
    tipoUsuario: string; // interno, externo

    @Column({ name: 'materia_juridica', nullable: true })
    materiaJuridica: string; // laboral, contractual, administrativo, disciplinario, presupuestal, academico, otra

    @Column({ type: 'text', nullable: true })
    descripcion: string;

    @Column({ type: 'text', nullable: true })
    antecedentes: string;

    @Column({ name: 'abogado_asignado_id', type: 'uuid', nullable: true })
    abogadoAsignadoId: string | null;

    @Column({ name: 'abogado_asignado_nombre', nullable: true, length: 500 })
    abogadoAsignadoNombre: string;

    @Column({ name: 'fecha_asignacion', type: 'timestamp', nullable: true })
    fechaAsignacion: Date;

    @Column({ default: 'media' })
    prioridad: string; // alta, media, baja

    @Column({ nullable: true })
    complejidad: string; // alta, media, baja

    @Column({ name: 'termino_legal_dias', default: 30 })
    terminoLegalDias: number;

    @Column({ name: 'fecha_maxima_respuesta', type: 'timestamp', nullable: true })
    fechaMaximaRespuesta: Date;

    @Column({ default: 'en_radicacion' })
    estado: string; // en_radicacion, asignado, en_analisis, en_revision, respondido, cerrado, vencido

    @Column({ name: 'numero_oficio_respuesta', nullable: true })
    numeroOficioRespuesta: string;

    @Column({ name: 'fecha_respuesta', type: 'timestamp', nullable: true })
    fechaRespuesta: Date;

    @Column({ name: 'tipo_respuesta', nullable: true })
    tipoRespuesta: string; // favorable, con_observaciones, desfavorable, informativa

    @Column({ name: 'documento_respuesta_url', type: 'text', nullable: true })
    documentoRespuestaUrl: string;

    @Column({ type: 'text', nullable: true })
    respuesta: string;

    @Column({ name: 'destinatarios_adicionales', type: 'text', nullable: true })
    destinatariosAdicionales: string; // JSON array de emails adicionales

    @Column({ name: 'comentario_devolucion_jefe', type: 'text', nullable: true })
    comentarioDevolucionJefe: string;

    @Column({ type: 'text', nullable: true })
    observaciones: string;

    // Campos para sistema de archivo
    @Column({ name: 'estado_archivo', type: 'varchar', default: 'ACTIVO' })
    estadoArchivo: string; // ACTIVO, ARCHIVADO, ELIMINADO

    @Column({ name: 'fecha_archivo', type: 'timestamp', nullable: true })
    fechaArchivo: Date;

    @Column({ name: 'usuario_archivo', type: 'varchar', nullable: true })
    usuarioArchivo: string;

    @Column({ name: 'motivo_archivo', type: 'text', nullable: true })
    motivoArchivo: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
