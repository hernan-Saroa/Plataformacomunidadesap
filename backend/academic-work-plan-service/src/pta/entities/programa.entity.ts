import {  Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn , BeforeInsert, BeforeUpdate } from 'typeorm';

@Entity({ schema: 'academic_work_plan', name: 'Programa' })
export class ProgramaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'text', default: 'ACTIVO' })
  estado: string;

  @Column({ type: 'text', default: 'PREGRADO' })
  nivel: string;

  @Column({ type: 'text', nullable: true })
  facultad: string | null;

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
