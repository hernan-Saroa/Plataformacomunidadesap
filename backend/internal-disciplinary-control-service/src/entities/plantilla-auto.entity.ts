import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('plantilla_auto')
export class PlantillaAuto {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text')
    htmlContent: string;

    @Column('varchar', { length: 50, default: 'activo' })
    estado: string; // 'activo', 'inactivo'

    @Column('varchar', { length: 100, nullable: true })
    nombre: string;

    @Column('text', { nullable: true })
    descripcion: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}