import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TipoProceso {
  ESTRATEGICO = 'estrategico',
  MISIONAL = 'misional',
  APOYO = 'apoyo',
  EVALUACION = 'evaluacion',
}

export enum NivelRiesgo {
  BAJO = 'bajo',
  MEDIO = 'medio',
  ALTO = 'alto',
}

@Entity('proceso_auditable', { schema: 'control_interno' })
@Index(['codigo'], { unique: true })
@Index(['tipo'])
@Index(['macroproceso'])
@Index(['prioridad'])
export class ProcesoAuditable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  codigo: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  nombre: string;

  @Column({ type: 'text', nullable: false })
  descripcion: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  tipo: TipoProceso;

  @Column({ type: 'varchar', length: 255, nullable: false })
  macroproceso: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  responsable: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  dependencia: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  territorial?: string;

  @Column({
    name: 'evaluacion_riesgo',
    type: 'jsonb',
    nullable: false,
  })
  evaluacionRiesgo: {
    probabilidad: number; // 1-3
    impacto: number; // 1-3
    nivelControl: number; // 1-3
    riesgoInherente: number; // probabilidad * impacto
    riesgoResidual: number; // riesgoInherente * nivelControl
    nivelRiesgo: NivelRiesgo; // bajo, medio, alto
    madurezControl?: string;
    controles?: {
      preventivos: number;
      detectivos: number;
      correctivos: number;
    };
    factoresRiesgo?: string[];
  };

  @Column({ name: 'frecuencia_auditoria', type: 'varchar', length: 255, nullable: false })
  frecuenciaAuditoria: string;

  @Column({ name: 'ultima_auditoria', type: 'date', nullable: true })
  ultimaAuditoria?: Date;

  @Column({ name: 'proxima_auditoria', type: 'date', nullable: true })
  proximaAuditoria?: Date;

  @Column({ type: 'integer', nullable: false })
  prioridad: number;

  @Column({ name: 'priorizacion_anos', type: 'integer', nullable: false })
  priorizacionAnos: number; // 1-4 años según nivel de riesgo

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

