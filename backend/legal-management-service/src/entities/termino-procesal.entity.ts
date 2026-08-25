
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('terminos_procesales', { schema: 'legal_management' })
export class TerminoProcesal {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'origen_modulo', length: 50 })
    @Index()
    origenModulo: string; // 'DEFENSA', 'JUZGAMIENTO', 'ASESORIA', 'MANUAL'

    @Column({ name: 'referencia_id', type: 'uuid', nullable: true })
    @Index()
    referenciaId: string | null;

    @Column({ name: 'numero_radicado', type: 'varchar', length: 100, nullable: true })
    numeroRadicado: string | null;

    @Column({ name: 'nombre_actuacion', length: 255 })
    nombreActuacion: string;

    @Column({ name: 'fecha_base', type: 'timestamp with time zone' })
    fechaBase: Date;

    @Column({ name: 'dias_termino', type: 'int' })
    diasTermino: number;

    @Column({ name: 'tipo_dias', length: 20, default: 'HABILES' })
    tipoDias: string;

    @Column({ name: 'fecha_vencimiento', type: 'timestamp with time zone' })
    @Index()
    fechaVencimiento: Date;

    @Column({ name: 'fecha_alerta_preventiva', type: 'timestamp with time zone', nullable: true })
    fechaAlertaPreventiva: Date | null;

    @Column({ name: 'fecha_alerta_critica', type: 'timestamp with time zone', nullable: true })
    fechaAlertaCritica: Date | null;

    // Si está seteada, este término ignora las reglas globales de terminos_reglas_alerta
    // y el scheduler usa únicamente este umbral (horas antes del vencimiento).
    @Column({ name: 'horas_anticipacion_alerta_personalizada', type: 'int', nullable: true })
    horasAnticipacionAlertaPersonalizada: number | null;

    // Recordatorio programado manualmente por el usuario (envío único); el scheduler
    // lo limpia a null después de enviarlo.
    @Column({ name: 'recordatorio_manual_horas_anticipacion', type: 'int', nullable: true })
    recordatorioManualHorasAnticipacion: number | null;

    @Column({ length: 20, default: 'PENDIENTE' })
    @Index()
    estado: string;

    @Column({ length: 10, default: 'MEDIA' })
    prioridad: string;

    @Column({ name: 'responsable_id', type: 'uuid', nullable: true })
    @Index()
    responsableId: string | null;

    @Column({ name: 'responsable_nombre', type: 'varchar', length: 255, nullable: true })
    responsableNombre: string | null;

    @Column({ name: 'destinatario', type: 'varchar', length: 255, nullable: true })
    destinatario: string | null;

    @Column({ name: 'ente_solicitante', type: 'varchar', length: 255, nullable: true })
    enteSolicitante: string | null;

    @Column({ name: 'fundamento_normativo', type: 'jsonb', nullable: true })
    fundamentoNormativo: Array<{ tipo: string; cita: string; actualizacionPeriodica: boolean; mesRecordatorio?: number }> | null;

    @Column({ type: 'text', nullable: true })
    observaciones: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
    updatedAt: Date;

    @Column({ name: 'closed_at', type: 'timestamp with time zone', nullable: true })
    closedAt: Date;
}
