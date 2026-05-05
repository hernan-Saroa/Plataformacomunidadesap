import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// Valores sugeridos (no restrictivos)
export const ROLES_OCIG_SUGERIDOS = [
  'Jefe OCIG',
  'Auditor Sénior',
  'Auditor',
  'Auditor Júnior',
  'Apoyo Técnico',
];

@Entity('configuracion_profesionales_ocig', { schema: 'control_interno' })
@Index(['idTercero'], { unique: true })
@Index(['rolOcig'])
@Index(['activo'])
@Index(['puedeSerLider'])
export class ConfiguracionProfesionalOCIG {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_tercero', type: 'varchar', length: 36, nullable: false })
  idTercero: string;

  @Column({
    name: 'rol_ocig',
    type: 'varchar',
    length: 100,
    default: 'Auditor',
    nullable: false,
  })
  rolOcig: string;

  @Column({
    name: 'especialidades',
    type: 'text',
    array: true,
    default: '{}',
    nullable: false,
  })
  especialidades: string[];

  @Column({
    name: 'capacidad_maxima_auditorias',
    type: 'int',
    default: 4,
    nullable: false,
  })
  capacidadMaximaAuditorias: number;

  @Column({
    name: 'horas_mensuales_disponibles',
    type: 'int',
    default: 150,
    nullable: false,
  })
  horasMensualesDisponibles: number;

  @Column({
    name: 'puede_ser_lider',
    type: 'boolean',
    default: true,
    nullable: false,
  })
  puedeSerLider: boolean;

  @Column({
    name: 'activo',
    type: 'boolean',
    default: true,
    nullable: false,
  })
  activo: boolean;

  @Column({
    name: 'fecha_asignacion',
    type: 'date',
    default: () => 'CURRENT_DATE',
    nullable: false,
  })
  fechaAsignacion: Date;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;
}
