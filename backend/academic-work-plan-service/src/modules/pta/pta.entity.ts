import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, UpdateDateColumn
} from 'typeorm';

@Entity('plan_trabajo_academico')
export class PtaEntity {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    docenteId: string;

    @Column()
    titulo: string;

    @Column({ default: 'PENDIENTE' })
    estado: string;

    @Column({ nullable: true })
    aprobadoPor: string;

    @CreateDateColumn()
    creadoEn: Date;

    @UpdateDateColumn()
    actualizadoEn: Date;
}
