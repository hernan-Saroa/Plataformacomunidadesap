import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import { FacultadEntity } from './facultad.entity';

@Entity({ schema: 'academic_work_plan', name: 'programa' })
export class ProgramaEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ name: 'nombre_excel', type: 'varchar', length: 100 })
  nombreExcel: string;

  @Column({ name: 'nombre_corto', type: 'varchar', length: 30 })
  nombreCorto: string;

  @Column({ name: 'id_facultad', type: 'bigint' })
  idFacultad: string;

  @ManyToOne(() => FacultadEntity, { nullable: false })
  @JoinColumn({ name: 'id_facultad' })
  facultadRel: FacultadEntity;

  @Column({ type: 'varchar', length: 20 })
  tipo: string; // 'pregrado' | 'especializacion' | 'maestria'

  @Column({ type: 'varchar', length: 20 })
  modalidad: string; // 'presencial' | 'distancia' | 'mixto'

  @Column({ name: 'horas_base_por_credito', type: 'int', default: 16 })
  horasBasePorCredito: number;

  @Column({ name: 'horas_pregrado_central', type: 'int', nullable: true })
  horasPregradoCentral: number | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: string | null;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: string | null;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'deleted_by', type: 'bigint', nullable: true })
  deletedBy: string | null;

  @BeforeInsert()
  setTimestamps() {
    this.createdAt = new Date();
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}
