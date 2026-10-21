import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ schema: 'travel_expenses', name: 'config_jornada_laboral' })
@Index('idx_config_jornada_laboral_codigo', ['codigo'], { unique: true })
@Index('idx_config_jornada_laboral_activo', ['activo'])
export class ConfigJornadaLaboralEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({
    name: 'codigo',
    type: 'varchar',
    length: 50,
    unique: true,
    default: 'DEFAULT',
  })
  codigo: string;

  @Column({
    name: 'nombre',
    type: 'varchar',
    length: 100,
    default: 'Jornada Laboral Institucional',
  })
  nombre: string;

  @Column({
    name: 'hora_inicio',
    type: 'varchar',
    length: 5,
    default: '08:00',
  })
  horaInicio: string;

  @Column({
    name: 'hora_fin',
    type: 'varchar',
    length: 5,
    default: '16:30',
  })
  horaFin: string;

  /**
   * Días hábiles o laborales de la semana:
   * 0 = Domingo, 1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves, 5 = Viernes, 6 = Sábado
   * Por defecto: [1, 2, 3, 4, 5] (Lunes a Viernes)
   */
  @Column({
    name: 'dias_laborales',
    type: 'jsonb',
    default: [1, 2, 3, 4, 5],
  })
  diasLaborales: number[];

  /**
   * Días hábiles mínimos requeridos de anticipación para radicar una comisión ordinaria (RF-EXT-001).
   * Por defecto: 14 días hábiles.
   */
  @Column({
    name: 'dias_anticipacion_minima',
    type: 'int',
    default: 14,
  })
  diasAnticipacionMinima: number;

  /**
   * Días hábiles de umbral para determinar expedición de RP como anticipo (AVANCE) vs RECONOCIMIENTO_POSTERIOR (RF-PRE-003).
   * Por defecto: 5 días hábiles.
   */
  @Column({
    name: 'dias_umbral_avance',
    type: 'int',
    default: 5,
  })
  diasUmbralAvance: number;

  @Column({
    name: 'activo',
    type: 'boolean',
    default: true,
  })
  activo: boolean;

  @Column({
    name: 'descripcion',
    type: 'text',
    nullable: true,
  })
  descripcion?: string | null;

  @Column({
    name: 'actualizado_por',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  actualizadoPor?: string | null;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
