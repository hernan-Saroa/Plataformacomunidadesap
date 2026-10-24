import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate } from 'typeorm';

@Entity({ schema: 'academic_work_plan', name: 'periodo_academico' })
export class PeriodoAcademicoEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 10, unique: true })
  codigo: string;

  @Column({ type: 'int' })
  anio: number;

  /** 1 o 2 en los semestrales; null en los personalizados (EFDS-2346). */
  @Column({ type: 'smallint', nullable: true })
  semestre: number | null;

  /** 'semestral' | 'personalizado' (EFDS-2346). */
  @Column({ type: 'varchar', length: 20, default: 'semestral' })
  tipo: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  nombre: string | null;

  /** Segundo periodo en curso, activado como excepción (EFDS-2346). El activo es el principal. */
  @Column({ type: 'boolean', default: false })
  extraordinario: boolean;

  @Column({ name: 'motivo_extraordinario', type: 'text', nullable: true })
  motivoExtraordinario: string | null;

  @Column({ name: 'extraordinario_por', type: 'varchar', length: 120, nullable: true })
  extraordinarioPor: string | null;

  @Column({ name: 'extraordinario_en', type: 'timestamptz', nullable: true })
  extraordinarioEn: Date | null;

  @Column({ name: 'fecha_inicio', type: 'date' })
  fechaInicio: Date;

  @Column({ name: 'fecha_fin', type: 'date' })
  fechaFin: Date;

  @Column({ type: 'varchar', length: 20, default: 'planeacion' })
  estado: string; // 'planeacion' | 'concertacion' | 'en_curso' | 'cerrado'

  @CreateDateColumn({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: string | null;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: string | null;

  @BeforeInsert()
  setTimestamps() {
    this.createdAt = new Date();
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}
