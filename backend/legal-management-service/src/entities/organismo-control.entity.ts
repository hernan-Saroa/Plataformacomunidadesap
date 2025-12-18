import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Requerimiento } from './requerimiento.entity';

@Entity({ schema: 'requerimientos_oc', name: 'cat_organismos_control' })
export class OrganismoControl {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 255, unique: true })
    nombre: string;

    @Column({ length: 50 })
    sigla: string;

    @Column({ length: 50 })
    tipo: string; // CONTRALORIA, PROCURADURIA, MINISTERIO, SUPERINTENDENCIA, OTROS

    @Column({ length: 50 })
    nivel: string; // NACIONAL, DEPARTAMENTAL, MUNICIPAL

    @Column({ default: true })
    activo: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relación con requerimientos
    @OneToMany(() => Requerimiento, (requerimiento) => requerimiento.entidad)
    requerimientos: Requerimiento[];
}

