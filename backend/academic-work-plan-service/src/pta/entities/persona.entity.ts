import {  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn , BeforeInsert, BeforeUpdate } from 'typeorm';
import { UsuarioEntity } from './usuario.entity';

@Entity({ schema: 'academic_work_plan', name: 'Persona' })
export class PersonaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usuarioId', type: 'text' })
  usuarioId: string;

  @ManyToOne(() => UsuarioEntity, { nullable: false })
  @JoinColumn({ name: 'usuarioId' })
  usuario: UsuarioEntity;

  @Column({ type: 'text', nullable: true })
  identificacion: string | null;

  @Column({ type: 'text', nullable: true })
  tipo_identificacion: string | null;

  @Column({ type: 'text', nullable: true })
  telefono: string | null;

  @Column({ type: 'text', nullable: true })
  direccion: string | null;

  @Column({ type: 'text', nullable: true })
  primer_nombre: string | null;

  @Column({ type: 'text', nullable: true })
  segundo_nombre: string | null;

  @Column({ type: 'text', nullable: true })
  primer_apellido: string | null;

  @Column({ type: 'text', nullable: true })
  segundo_apellido: string | null;

  @Column({ type: 'text', nullable: true })
  genero: string | null;

  @Column({ type: 'timestamp', nullable: true })
  fecha_nacimiento: Date | null;

  @Column({ type: 'text', nullable: true })
  extension_telefonica: string | null;

  @Column({ type: 'text', nullable: true })
  correo_alternativo: string | null;

  @Column({ type: 'text', nullable: true })
  tipo_usuario: string | null;

  @Column({ type: 'timestamp', nullable: true })
  fecha_fin_contrato: Date | null;

  @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @BeforeInsert()
  setTimestamps() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}
