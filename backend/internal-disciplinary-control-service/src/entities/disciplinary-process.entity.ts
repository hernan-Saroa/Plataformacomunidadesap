import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { DisciplinaryNews } from './disciplinary-news.entity';
import { LegalAuto } from './legal-auto.entity';
import { DisciplinaryProfessional } from './disciplinary-professional.entity';
import { Evidence } from './evidence.entity';

export enum ProcessStage {
  RECEPCION = 'RECEPCION',
  VALORACION = 'VALORACION',
  INDAGACION_PREVIA = 'INDAGACION_PREVIA',
  INVESTIGACION = 'INVESTIGACION',
  EVALUACION = 'EVALUACION',
  JUZGAMIENTO = 'JUZGAMIENTO',
  INDAGACION = 'INDAGACION',
  FALLO = 'FALLO',
  SEGUNDA_INSTANCIA = 'SEGUNDA_INSTANCIA',
}

export enum ProcessStatus {
  ACTIVO = 'ACTIVO',
  SUSPENDIDO = 'SUSPENDIDO',
  ARCHIVADO = 'ARCHIVADO',
  CERRADO = 'CERRADO',
  PRESCRITO = 'PRESCRITO',
}

@Entity('disciplinary_processes')
export class DisciplinaryProcess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  radicadoProceso: string; // P-###-YYYY

  @ManyToOne(() => DisciplinaryNews, (news) => news.processes, {
    eager: true,
  })
  @JoinColumn({ name: 'newsId' })
  news: DisciplinaryNews;

  @Column('uuid')
  newsId: string;

  @ManyToOne(() => DisciplinaryProfessional, {
    eager: true,
    nullable: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'abogado_asignado_id' })
  abogadoAsignado: DisciplinaryProfessional;

  @Column({ name: 'abogado_asignado_id', nullable: true })
  abogadoAsignadoId: string;

  @Column({
    type: 'varchar',
    length: 100,
    default: 'EVALUACION',
  })
  etapaActual: string;

  @Column({ type: 'uuid', nullable: true })
  kanbanStage: string | null;

  @Column({ type: 'text', nullable: true })
  kanbanNotice: string | null;

  @Column({
    type: 'enum',
    enum: ProcessStatus,
    default: ProcessStatus.ACTIVO,
  })
  estado: ProcessStatus;

  @Column({ type: 'timestamp', nullable: true })
  fechaPrescripcion: Date;

  @Column({ type: 'timestamp', nullable: true })
  fechaVencimientoEtapa: Date;

  @Column({ type: 'timestamp', nullable: true })
  fechaInicioEtapa: Date;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ type: 'text', array: true, nullable: true })
  pruebas: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relación con autos
  @OneToMany(() => LegalAuto, (auto) => auto.process)
  autos: LegalAuto[];

  // Relación con pruebas
  @OneToMany(() => Evidence, (evidence) => evidence.process)
  evidence: Evidence[];

  // Nota: Relación con asociaciones noticia-proceso se maneja via consultas directas
  // para evitar dependencias circulares con DisciplinaryNewsProcess

  // ✅ NUEVO: Campos para asociar proceso a otro proceso
  // Campos para cierre por Pliego de Cargos
  @Column({ name: 'fecha_cierre', type: 'timestamp', nullable: true })
  fechaCierre: Date | null;

  @Column({ name: 'etapa_al_cierre', type: 'varchar', length: 100, nullable: true })
  etapaAlCierre: string | null;

  @Column({ name: 'cerrado_por_id', type: 'uuid', nullable: true })
  cerradoPorId: string | null;

  @Column({ name: 'correo_juridica_enviado', type: 'boolean', default: false })
  correoJuridicaEnviado: boolean;

  @Column({ name: 'correo_juridica_fecha_envio', type: 'timestamp', nullable: true })
  correoJuridicaFechaEnvio: Date | null;

  @Column({ name: 'proceso_asociado_id', type: 'uuid', nullable: true })
  procesoAsociadoId: string | null;

  @Column({ name: 'proceso_asociado_numero', type: 'varchar', length: 50, nullable: true })
  procesoAsociadoNumero: string | null;

  @Column({ name: 'proceso_asociado_tipo', type: 'varchar', length: 20, nullable: true })
  procesoAsociadoTipo: 'conexo' | 'similar' | 'consolidado' | null;

  @Column({ name: 'proceso_asociado_fecha', type: 'timestamp', nullable: true })
  procesoAsociadoFecha: Date | null;

  @Column({ name: 'proceso_asociado_justificacion', type: 'text', nullable: true })
  procesoAsociadoJustificacion: string | null;

  // ✅ NUEVO: Campos para trazabilidad de consolidación
  @Column({ name: 'procesos_consolidados', type: 'text', array: true, nullable: true })
  procesosConsolidados: string[] | null;

  @Column({ name: 'proceso_consolidado_principal', type: 'uuid', nullable: true })
  procesoConsolidadoPrincipal: string | null;

  @Column({ name: 'informacion_consolidada', type: 'jsonb', nullable: true })
  informacionConsolidada: {
    radicado: string;
    fechaInicio: string;
    hechos: string;
    disciplinable: any;
  } | null;
}
