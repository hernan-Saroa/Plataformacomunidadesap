import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import { UbicacionSemestralEntity } from './ubicacion-semestral.entity';
import { ProgramaEntity } from './programa.entity';
import { NucleoTematicoEntity } from './nucleo-tematico.entity';
import { FacultadEntity } from './facultad.entity';

@Entity({ schema: 'academic_work_plan', name: 'asignatura' })
export class AsignaturaEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 200 })
  nombre: string;

  @Column({ name: 'nombre_base', type: 'varchar', length: 200, nullable: true })
  nombreBase: string | null;

  @Column({ name: 'modalidad_sufijo', type: 'varchar', length: 30, nullable: true })
  modalidadSufijo: string | null;

  @Column({ type: 'varchar', length: 30, default: 'sin_definir' })
  modalidad: string; // 'presencial' | 'presencial_dia' | 'presencial_noche' | 'virtual' | 'distancia' | 'mixta' | 'sin_definir'

  @Column({ name: 'requiere_revision_modalidad', type: 'boolean', default: false })
  requiereRevisionModalidad: boolean;

  @Column({ type: 'smallint' })
  creditos: number;

  @Column({ name: 'id_ubicacion_semestral', type: 'smallint' })
  idUbicacionSemestral: number;

  @ManyToOne(() => UbicacionSemestralEntity, { nullable: false })
  @JoinColumn({ name: 'id_ubicacion_semestral' })
  ubicacionSemestralRel: UbicacionSemestralEntity;

  @Column({ name: 'id_programa', type: 'bigint' })
  idPrograma: string;

  @ManyToOne(() => ProgramaEntity, { nullable: false })
  @JoinColumn({ name: 'id_programa' })
  programaRel: ProgramaEntity;

  @Column({ name: 'id_nucleo_tematico', type: 'bigint' })
  idNucleoTematico: string;

  @ManyToOne(() => NucleoTematicoEntity, { nullable: false })
  @JoinColumn({ name: 'id_nucleo_tematico' })
  nucleoTematicoRel: NucleoTematicoEntity;

  @Column({ name: 'id_facultad', type: 'bigint' })
  idFacultad: string;

  @ManyToOne(() => FacultadEntity, { nullable: false })
  @JoinColumn({ name: 'id_facultad' })
  facultadRel: FacultadEntity;

  @Column({ name: 'horas_fijas_pta', type: 'int', nullable: true })
  horasFijasPta: number | null;

  @Column({ name: 'tipo_asignatura', type: 'varchar', length: 30, default: 'teorica' })
  tipoAsignatura: string;

  @Column({ name: 'tipo_excepcion', type: 'varchar', length: 40, nullable: true })
  tipoExcepcion: string | null; // 'seminario_enfasis' | 'opciones_grado_ap' | 'seminario_opciones_apt'

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

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
