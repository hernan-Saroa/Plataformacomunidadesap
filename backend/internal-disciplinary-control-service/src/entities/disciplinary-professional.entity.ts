import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('disciplinary_professional')
export class DisciplinaryProfessional {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'nombre_completo' })
    nombreCompleto: string;

    @Column({ unique: true })
    email: string;

    @Column({ nullable: true })
    telefono: string;

    @Column()
    cargo: string; // 'Jefe de Oficina', 'Profesional Universitario', etc.

    @Column({ nullable: true })
    especialidad: string;

    @Column({ name: 'tipo_contrato', nullable: true })
    tipoContrato: string;

    @Column({ nullable: true })
    territorial: string;

    @Column({ name: 'capacidad_maxima', default: 10 })
    capacidadMaxima: number;

    @Column({ name: 'firma_url', nullable: true })
    firmaUrl: string;

    @Column({ name: 'id_user', type: 'uuid', nullable: true })
    idUser: string | null;

    @Column({ default: 'ACTIVO' })
    estado: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
