import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import { CetapEntity } from './cetap.entity';
import { ProgramaEntity } from './programa.entity';
import { PeriodoAcademicoEntity } from './periodo-academico.entity';

@Entity({ schema: 'academic_work_plan', name: 'oferta_cetap_programa' })
export class OfertaCetapProgramaEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'id_cetap', type: 'bigint' })
  idCetap: string;

  @ManyToOne(() => CetapEntity, { nullable: false })
  @JoinColumn({ name: 'id_cetap' })
  cetap: CetapEntity;

  @Column({ name: 'id_programa', type: 'bigint' })
  idPrograma: string;

  @ManyToOne(() => ProgramaEntity, { nullable: false })
  @JoinColumn({ name: 'id_programa' })
  programa: ProgramaEntity;

  @Column({ name: 'id_periodo_academico', type: 'bigint' })
  idPeriodoAcademico: string;

  @ManyToOne(() => PeriodoAcademicoEntity, { nullable: false })
  @JoinColumn({ name: 'id_periodo_academico' })
  periodoAcademico: PeriodoAcademicoEntity;

  @Column({ name: 'cupos_estimados', type: 'int', nullable: true })
  cuposEstimados: number | null;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

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
