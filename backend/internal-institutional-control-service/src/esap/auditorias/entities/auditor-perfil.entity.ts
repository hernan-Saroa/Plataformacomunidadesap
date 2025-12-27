import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum NivelExperiencia {
  JUNIOR = 'Junior',
  INTERMEDIO = 'Intermedio',
  SENIOR = 'Senior',
  LIDER = 'Líder',
  JEFE = 'Jefe',
}

export enum EstadoDisponibilidad {
  DISPONIBLE = 'Disponible',
  PARCIAL = 'Parcial',
  NO_DISPONIBLE = 'No disponible',
  EN_LICENCIA = 'En licencia',
}

@Entity('auditor_perfil', { schema: 'control_interno' })
@Index(['personaId'], { unique: true })
@Index(['especialidad'])
@Index(['estadoDisponibilidad'])
@Index(['activo'])
export class AuditorPerfil {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'persona_id', type: 'bigint', unique: true, nullable: false })
  personaId: number; // FK a auth.personas

  @Column({ type: 'varchar', length: 255, nullable: true })
  especialidad?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cargo?: string;

  @Column({
    name: 'nivel_experiencia',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  nivelExperiencia?: NivelExperiencia;

  @Column({
    name: 'estado_disponibilidad',
    type: 'varchar',
    length: 50,
    default: EstadoDisponibilidad.DISPONIBLE,
  })
  estadoDisponibilidad: EstadoDisponibilidad;

  @Column({ name: 'fecha_ultima_actividad', type: 'date', nullable: true })
  fechaUltimaActividad?: Date;

  @Column({ type: 'text', nullable: true })
  observaciones?: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}



