import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import { ProgramaEntity } from './programa.entity';

@Entity({ schema: 'academic_work_plan', name: 'nucleo_tematico' })
export class NucleoTematicoEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  nombre: string;

  @Column({ name: 'id_programa', type: 'bigint', nullable: true })
  idPrograma: string | null;

  @ManyToOne(() => ProgramaEntity, { nullable: true })
  @JoinColumn({ name: 'id_programa' })
  programa: ProgramaEntity | null;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

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
