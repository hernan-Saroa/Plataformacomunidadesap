import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { DisciplinaryProcess } from './disciplinary-process.entity';
import { AlertaEnviada } from './alerta-enviada.entity';

export enum TerminoEstado {
  PENDIENTE = 'pendiente',
  PROXIMO_VENCER = 'proximo_vencer',
  VENCIDO = 'vencido',
  CUMPLIDO = 'cumplido',
}

@Entity('terminos_procesales', { schema: 'internal_disciplinary_control' })
@Index(['procesoId'])
@Index(['responsableId'])
@Index(['estado'])
@Index(['fechaVencimiento'])
@Index(['diasRestantes'])
export class TerminoProcesal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'proceso_id' })
  procesoId: string;

  @ManyToOne(() => DisciplinaryProcess, { nullable: false })
  @JoinColumn({ name: 'proceso_id' })
  proceso: DisciplinaryProcess;

  @Column({ type: 'varchar', name: 'numero_proceso', length: 20, nullable: true })
  numeroProceso: string | null; // Puede venir vacío si aún no hay radicado visible

  @Column({ type: 'varchar', length: 200 })
  actuacion: string; // Tipo de actuación procesal

  @Column('uuid', { name: 'responsable_id' })
  responsableId: string; // FK a personas (tabla externa)

  @Column({ type: 'varchar', name: 'responsable_nombre', length: 200 })
  responsableNombre: string; // Denormalizado para performance

  @Column({ type: 'varchar', name: 'email_responsable', length: 100 })
  emailResponsable: string;

  @Column({ type: 'date', name: 'fecha_inicio' })
  fechaInicio: Date;

  @Column({ name: 'dias_habiles', type: 'int' })
  diasHabiles: number; // CHECK: > 0 AND <= 180

  @Column({ type: 'date', name: 'fecha_vencimiento' })
  fechaVencimiento: Date;

  @Column({ name: 'dias_restantes', type: 'int' })
  diasRestantes: number; // CHECK: >= -365 (permite hasta 1 año vencido)

  @Column({
    type: 'enum',
    enum: TerminoEstado,
    default: TerminoEstado.PENDIENTE,
  })
  estado: TerminoEstado;

  @Column({ name: 'alerta_enviada', type: 'boolean', default: false })
  alertaEnviada: boolean;

  @Column({ type: 'date', name: 'fecha_cumplimiento', nullable: true })
  fechaCumplimiento: Date | null;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @Column('uuid', { name: 'creado_por_id' })
  creadoPorId: string; // FK a personas

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion' })
  fechaActualizacion: Date;

  // Relación con alertas enviadas
  @OneToMany(() => AlertaEnviada, (alerta) => alerta.termino)
  alertas: AlertaEnviada[];
}

