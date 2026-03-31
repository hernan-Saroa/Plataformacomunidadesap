import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ProcesoCoactivoAdjunto } from './proceso-coactivo-adjunto.entity';
import { TipoTasaReferencia } from './tasa-referencia.entity';

export type EstadoProcesoCoactivo = 'PERSUASIVA' | 'COACTIVA' | 'MEDIDAS_CAUTELARES' | 'EXCEPCIONES' | 'LIQUIDACION';

export interface DeudorInfo {
    nombre: string;
    identificacion: string;
    telefono?: string;
    email?: string;
    direccion?: string;
}

export interface ObligacionInfo {
    concepto: string;
    valor: number;
    fechaVencimiento: string;
}

@Entity({ name: 'procesos_coactivos', schema: 'legal_management' })
export class ProcesoCoactivo {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    radicado: string;

    @Column({ type: 'jsonb' })
    deudor: DeudorInfo;

    @Column({ type: 'jsonb' })
    obligacion: ObligacionInfo;

    @Column({
        type: 'enum',
        enumName: 'estado_proceso_coactivo',
        enum: ['PERSUASIVA', 'COACTIVA', 'MEDIDAS_CAUTELARES', 'EXCEPCIONES', 'LIQUIDACION'],
        default: 'PERSUASIVA'
    })
    estado: EstadoProcesoCoactivo;

    @Column({ nullable: true })
    responsable: string;

    @Column({ name: 'documentos_adjuntos', type: 'int', default: 0 })
    documentosAdjuntos: number;

    @OneToMany(() => ProcesoCoactivoAdjunto, adjunto => adjunto.proceso)
    adjuntos: ProcesoCoactivoAdjunto[];



    @Column({
        name: 'valor_pagado', type: 'numeric', precision: 15, scale: 2, default: 0, transformer: {
            to: (value: number) => value,
            from: (value: string) => parseFloat(value)
        }
    })
    valorPagado: number;

    @Column({
        name: 'saldo_pendiente', type: 'numeric', precision: 15, scale: 2, default: 0, transformer: {
            to: (value: number) => value,
            from: (value: string) => parseFloat(value)
        }
    })
    saldoPendiente: number;

    // Campos añadidos para Resolución 492 / Manual de Cartera
    @Column({ name: 'fecha_ejecutoria', type: 'timestamp', nullable: true })
    fechaEjecutoria: Date | null;

    @Column({
        type: 'enum',
        enum: TipoTasaReferencia,
        default: TipoTasaReferencia.DIAN,
        name: 'tipo_interes_aplicable',
        nullable: true
    })
    tipoInteresAplicable: TipoTasaReferencia;

    @Column({
        name: 'valor_costas', type: 'numeric', precision: 15, scale: 2, default: 0, transformer: {
            to: (value: number) => value,
            from: (value: string) => parseFloat(value)
        }
    })
    valorCostas: number;

    @Column({ name: 'notificaciones_enviadas', type: 'int', default: 0 })
    notificacionesEnviadas: number;

    @Column({ type: 'text', nullable: true })
    observaciones: string;

    @Column({ name: 'ultima_actuacion', type: 'timestamp', nullable: true })
    ultimaActuacion: Date;

    @CreateDateColumn({ name: 'fecha_creacion' })
    fechaCreacion: Date;

    @Column({ name: 'estado_archivo', type: 'varchar', length: 20, default: 'ACTIVO' })
    estadoArchivo: 'ACTIVO' | 'ARCHIVADO' | 'ELIMINADO';

    @Column({ name: 'fecha_archivo', type: 'timestamp', nullable: true })
    fechaArchivo: Date | null;

    @Column({ name: 'usuario_archivo', type: 'varchar', length: 150, nullable: true })
    usuarioArchivo: string | null;

    @Column({ name: 'motivo_archivo', type: 'text', nullable: true })
    motivoArchivo: string | null;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
