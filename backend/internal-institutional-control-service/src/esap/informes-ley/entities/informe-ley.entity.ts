import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { EntregaInformeLey } from './entrega-informe-ley.entity';

@Entity('informe_ley', { schema: 'control_interno' })
@Index(['codigo'], { unique: true })
@Index(['categoria'])
@Index(['periodicidad'])
@Index(['activo'])
export class InformeLey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false, name: 'codigo' })
  codigo: string; // INF-CHIP, INF-SECOP, etc.

  @Column({ type: 'varchar', length: 255, name: 'codigo_corto', nullable: true })
  codigoCorto?: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  nombre: string;

  @Column({ type: 'text', nullable: false })
  descripcion: string;

  @Column({ type: 'text', name: 'normativa', nullable: true })
  normativa?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  categoria: 'financiero' | 'administrativo' | 'contractual' | 'talento-humano' | 'transparencia' | 'control';

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  periodicidad: 'mensual' | 'bimestral' | 'trimestral' | 'cuatrimestral' | 'semestral' | 'anual';

  @Column({ type: 'varchar', length: 50, name: 'tipo', nullable: true })
  tipo?: 'ley' | 'normativo' | 'interno';

  @Column({ type: 'integer', name: 'dia_presentacion', nullable: false })
  diaPresentacion: number; // Día del mes/periodo para presentar

  @Column({ type: 'varchar', length: 500, name: 'entidad_destino', nullable: true })
  entidadDestino?: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  responsable: string;

  @Column({ type: 'varchar', length: 255, name: 'area', nullable: false })
  area: string;

  @Column({ type: 'varchar', length: 255, name: 'area_responsable', nullable: true })
  areaResponsable?: string;

  // Plantilla
  @Column({ type: 'boolean', name: 'tiene_plantilla', default: false })
  tienePlantilla: boolean;

  @Column({ type: 'varchar', length: 500, name: 'url_plantilla', nullable: true })
  urlPlantilla?: string;

  // Configuración
  @Column({ type: 'boolean', name: 'requiere_aprobacion', default: false })
  requiereAprobacion: boolean;

  @Column({ type: 'integer', name: 'dias_anticipacion_alerta', default: 7 })
  diasAnticipacionAlerta: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  // Campos adicionales del schema original (opcionales)
  @Column({ type: 'date', name: 'fecha_vencimiento', nullable: true })
  fechaVencimiento?: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  estado?: string;

  @Column({ type: 'integer', name: 'dias_restantes', nullable: true })
  diasRestantes?: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  alerta?: string;

  @Column({ type: 'jsonb', name: 'acciones_sugeridas', nullable: true })
  accionesSugeridas?: any[];

  @Column({ type: 'jsonb', name: 'historial', nullable: true })
  historial?: any[];

  @Column({ type: 'timestamp', name: 'proximo_recordatorio', nullable: true })
  proximoRecordatorio?: Date;

  @Column({ type: 'integer', name: 'recordatorios_enviados', default: 0 })
  recordatoriosEnviados?: number;

  @Column({ type: 'varchar', length: 255, name: 'formato_template', nullable: true })
  formatoTemplate?: string;

  @Column({ type: 'jsonb', name: 'datos_integrados', nullable: true })
  datosIntegrados?: any;

  // Relaciones
  @OneToMany(() => EntregaInformeLey, (entrega) => entrega.informeLey, { cascade: true })
  entregas: EntregaInformeLey[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

