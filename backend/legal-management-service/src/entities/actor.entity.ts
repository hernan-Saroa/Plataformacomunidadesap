
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Expediente } from './expediente.entity';

@Entity('actors', { schema: 'legal_management' })
export class Actor {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    expediente_id: string;

    @ManyToOne(() => Expediente, (expediente) => expediente.actors, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'expediente_id' })
    expediente: Expediente;

    @Column({ length: 255 })
    nombre: string;

    @Column({ name: 'tipo_persona', length: 50 })
    tipoPersona: string; // NATURAL, JURIDICA

    @Column({ length: 50, nullable: true })
    identificacion: string;

    @Column({ length: 50 })
    rol: string; // DEMANDANTE, DEMANDADO, OTRO

    @Column({ length: 100, nullable: true })
    cargo: string;

    @Column({ length: 255, nullable: true })
    email: string;

    @Column({ length: 50, nullable: true })
    telefono: string;

    @Column({ length: 255, nullable: true })
    direccion: string;

    @Column({ length: 255, nullable: true })
    apoderado: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
