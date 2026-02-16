import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ProcesoCoactivoAdjunto } from './proceso-coactivo-adjunto.entity';

export type EstadoProcesoCoactivo = 'IDENTIFICADO' | 'PERSUASIVO' | 'PREJURIDICO' | 'MANDAMIENTO' | 'EMBARGO' | 'FINALIZADO';

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
        enum: ['IDENTIFICADO', 'PERSUASIVO', 'PREJURIDICO', 'MANDAMIENTO', 'EMBARGO', 'FINALIZADO'],
        default: 'IDENTIFICADO'
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

    @Column({ name: 'notificaciones_enviadas', type: 'int', default: 0 })
    notificacionesEnviadas: number;

    @Column({ type: 'text', nullable: true })
    observaciones: string;

    @Column({ name: 'ultima_actuacion', type: 'timestamp', nullable: true })
    ultimaActuacion: Date;

    @CreateDateColumn({ name: 'fecha_creacion' })
    fechaCreacion: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
