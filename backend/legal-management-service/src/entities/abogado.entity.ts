import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('abogados', { schema: 'legal_management' })
export class Abogado {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'nombre_completo' })
    nombreCompleto: string;

    @Column({ unique: true })
    email: string;

    @Column({ nullable: true })
    telefono: string;

    @Column({ nullable: true })
    especialidad: string;

    @Column({ name: 'fecha_ingreso', type: 'date' })
    fechaIngreso: Date;

    @Column({ default: 'ACTIVO' })
    estado: string; // 'ACTIVO' | 'INACTIVO' | 'LICENCIA'

    @Column({ name: 'foto_url', nullable: true })
    fotoUrl: string;

    @CreateDateColumn({ name: 'auditoria_created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'auditoria_updated_at' })
    updatedAt: Date;


}
