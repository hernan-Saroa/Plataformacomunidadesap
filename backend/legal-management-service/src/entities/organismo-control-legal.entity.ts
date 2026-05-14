import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, UpdateDateColumn } from 'typeorm';

@Entity('organismos_control', { schema: 'legal_management' })
export class OrganismoControlOC {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 20, unique: true })
    sigla: string;

    @Column({ length: 200 })
    nombre: string;

    @Column({ type: 'text', nullable: true })
    descripcion: string;

    @Column({ type: 'jsonb', default: [] })
    correos: string[];

    @Column({ default: true })
    activo: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relación uno a muchos con requerimientos
    @OneToMany(() => require('./requerimiento-oc.entity').RequerimientoOC, (req: any) => req.organismo)
    requerimientos: any[];
}
