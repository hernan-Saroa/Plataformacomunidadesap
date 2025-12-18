import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Sede } from '../users/sede.entity';
import { RegistroCalificado } from './registro-calificado.entity';
import { AcreditacionPrograma } from './acreditacion.entity';

@Entity({ schema: 'auth', name: 'programas_academicos' })
export class ProgramaAcademico {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'text', unique: true })
  codigo: string;

  @Column({ type: 'text' })
  nombre: string;

  @Column({ name: 'nivel_formacion', type: 'text' })
  nivelFormacion: string;

  @Column({ type: 'text' })
  modalidad: string;

  @Column({ type: 'text' })
  jornada: string;

  @Column({ name: 'duracion_semestres', type: 'int' })
  duracionSemestres: number;

  @Column({ type: 'int' })
  creditos: number;

  @Column({ name: 'facultad', type: 'text', nullable: true })
  facultad?: string;

  @Column({ type: 'text', default: 'Activo' })
  estado: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ name: 'perfil_egresado', type: 'text', nullable: true })
  perfilEgresado?: string;

  @Column({ name: 'requisitos_ingreso', type: 'text', array: true, nullable: true })
  requisitosIngreso?: string[];

  @Column({ name: 'costo_matricula', type: 'numeric', precision: 14, scale: 2, nullable: true })
  costoMatricula?: number;

  @Column({ name: 'estudiantes_activos', type: 'int', default: 0 })
  estudiantesActivos: number;

  @Column({ type: 'int', default: 0 })
  graduados: number;

  @Column({ name: 'docentes_asignados', type: 'int', default: 0 })
  docentesAsignados: number;

  @Column({ name: 'fecha_creacion', type: 'date', nullable: true })
  fechaCreacion?: string;

  @Column({ name: 'ultima_actualizacion', type: 'date', nullable: true })
  ultimaActualizacion?: string;

  @ManyToOne(() => Sede, { eager: true })
  @JoinColumn({ name: 'sede_id' })
  sede: Sede;

  @OneToOne(() => RegistroCalificado, (rc) => rc.programa, { cascade: true, eager: true })
  registroCalificado?: RegistroCalificado;

  @OneToMany(() => AcreditacionPrograma, (ac) => ac.programa, {
    cascade: true,
    eager: true,
  })
  acreditaciones?: AcreditacionPrograma[];
}
