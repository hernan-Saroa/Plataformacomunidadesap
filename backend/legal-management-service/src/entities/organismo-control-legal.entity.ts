import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';

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

    @Column({ default: true })
    activo: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    // Relación uno a muchos con requerimientos
    @OneToMany(() => require('./requerimiento-oc.entity').RequerimientoOC, (req: any) => req.organismo)
    requerimientos: any[];
}
