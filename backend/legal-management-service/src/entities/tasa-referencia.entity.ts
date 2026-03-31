import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum TipoTasaReferencia {
    USURA = 'USURA',
    DIAN = 'DIAN'
}

@Entity('tasas_referencia', { schema: 'legal_management' })
export class TasaReferencia {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'int' })
    anio: number;

    @Column({ type: 'int' })
    mes: number; // 1 to 12

    @Column({ type: 'decimal', precision: 5, scale: 2, name: 'valor_tasa' })
    valorTasa: number;

    @Column({
        type: 'enum',
        enum: TipoTasaReferencia,
        default: TipoTasaReferencia.DIAN,
        name: 'tipo_tasa'
    })
    tipoTasa: TipoTasaReferencia;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
