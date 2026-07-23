import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CorreoJuridico } from './correo-juridico.entity';

@Entity('comentarios_correo', { schema: 'legal_management' })
export class ComentarioCorreo {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'correo_id' })
    correoId: string;

    @ManyToOne(() => CorreoJuridico, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'correo_id' })
    correo: CorreoJuridico;

    @Column()
    mensaje: string;

    @Column()
    usuario: string;

    @Column({ nullable: true })
    cargo: string;

    @CreateDateColumn({ name: 'fecha' })
    fecha: Date;
}
