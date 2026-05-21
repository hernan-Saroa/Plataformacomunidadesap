import {  Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn , BeforeInsert, BeforeUpdate } from 'typeorm';

@Entity({ schema: 'academic_work_plan', name: 'programas' })
export class ProgramaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  codigo: string | null;

  @Column({ type: 'varchar', length: 500 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'varchar', length: 50, default: 'ACTIVO' })
  estado: string;

  @Column({ name: 'nivel_formacion', type: 'varchar', length: 255, nullable: true })
  nivel: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  facultad: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  modalidad: string | null;

  @Column({ type: 'int', nullable: true })
  duracion: number | null;

  @Column({ type: 'int', nullable: true })
  creditos: number | null;

  @Column({ name: 'costo_matricula', type: 'decimal', precision: 10, scale: 2, nullable: true })
  costoMatricula: string | null;

  @Column({ name: 'requisitos_de_ingreso', type: 'text', nullable: true })
  requisitosDeIngreso: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  jornada: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sede: string | null;

  @Column({ name: 'registro_calificado', type: 'jsonb', nullable: true })
  registroCalificado: Record<string, any> | null;

  @Column({ name: 'perfil_egresado', type: 'text', nullable: true })
  perfilEgresado: string | null;

  @CreateDateColumn({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
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
