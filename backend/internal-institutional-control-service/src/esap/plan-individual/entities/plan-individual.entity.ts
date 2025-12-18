import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AuditoriaProgramada } from '../../programa-anual/entities/auditoria-programada.entity';

export enum EstadoPlanIndividual {
  BORRADOR = 'borrador',
  ENVIADO = 'enviado',
  ACEPTADO = 'aceptado',
}

@Entity('plan_individual', { schema: 'control_interno' })
@Index(['auditoriaId'])
@Index(['estado'])
@Index(['codigo'], { unique: true })
export class PlanIndividual {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  codigo: string;

  @Column({ name: 'auditoria_id', type: 'uuid', nullable: false })
  auditoriaId: string;

  @ManyToOne(() => AuditoriaProgramada, { nullable: false })
  @JoinColumn({ name: 'auditoria_id' })
  auditoria: AuditoriaProgramada;

  @Column({ name: 'auditoria_codigo', type: 'varchar', length: 255, nullable: false })
  auditoriaCodigo: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  nombre: string;

  @Column({ type: 'text', nullable: false })
  alcance: string;

  @Column({ type: 'text', nullable: false })
  objetivo: string;

  @Column({ name: 'proceso_auditar', type: 'varchar', length: 255, nullable: false })
  procesoAuditar: string;

  @Column({ type: 'jsonb', nullable: false })
  riesgos: Array<{
    descripcion: string;
    probabilidad: number;
    impacto: number;
    nivel: 'alto' | 'medio' | 'bajo';
    controles: string[];
  }>;

  @Column({ name: 'criterios_auditoria', type: 'jsonb', nullable: false })
  criteriosAuditoria: Array<{
    codigo: string;
    descripcion: string;
    normativa: string;
    tipo: 'cumplimiento' | 'eficiencia' | 'eficacia' | 'economia';
  }>;

  @Column({ name: 'normativa_aplicable', type: 'jsonb', nullable: false })
  normativaAplicable: Array<{
    tipo: string;
    numero: string;
    nombre: string;
    articulo?: string;
  }>;

  @Column({ name: 'equipo_auditor', type: 'jsonb', nullable: false })
  equipoAuditor: {
    auditorLider: {
      nombre: string;
      cargo: string;
      email: string;
      telefono?: string;
    };
    auditores: Array<{
      nombre: string;
      cargo: string;
      email: string;
      telefono?: string;
    }>;
    profesionalesEspecializados?: Array<{
      nombre: string;
      especialidad: string;
      email: string;
    }>;
  };

  @Column({ type: 'jsonb', nullable: false })
  documentos: Array<{
    tipo: string;
    nombre: string;
    descripcion?: string;
    fechaGeneracion?: string;
    estado: 'pendiente' | 'generado' | 'enviado';
  }>;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: EstadoPlanIndividual.BORRADOR,
  })
  estado: EstadoPlanIndividual;

  @Column({ name: 'fecha_creacion', type: 'date', nullable: false })
  fechaCreacion: Date;

  @Column({ name: 'fecha_envio', type: 'date', nullable: true })
  fechaEnvio?: Date;

  @Column({ name: 'enviado_por', type: 'varchar', length: 255, nullable: true })
  enviadoPor?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

