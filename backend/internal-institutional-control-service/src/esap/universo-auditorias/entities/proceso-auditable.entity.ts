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

  @Column({ type: 'varchar', length: 255, nullable: true })
  macroproceso?: string;

  @Column({ name: 'unidades_auditables', type: 'jsonb', nullable: true, default: '[]' })
  unidadesAuditables: { id: string; nombre: string; descripcion?: string }[];

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
    riesgoResidual: number; // riesgoInherente ÷ nivelControl (prioridad 0-100)
    nivelRiesgo: NivelRiesgo; // bajo, medio, alto
    madurezControl?: string;
    controles?: {
      preventivos: number;
      detectivos: number;
      correctivos: number;
    };
    factoresRiesgo?: string[];
    // Distribución de riesgos DAFP
    riesgosExtremos?: number;
    riesgosAltos?: number;
    riesgosModerados?: number;
    riesgosBajos?: number;
    totalRiesgos?: number;
    // Requerimientos especiales
    requerimientoComite?: boolean;
    requerimientoEntesReg?: boolean;
    // ═══════════════════════════════════════════════════════════════════════
    // CAMPOS DAFP CALCULADOS Y DECISIÓN (agregados 2026-02-20)
    // ═══════════════════════════════════════════════════════════════════════
    vigencia?: number;                    // Año de la evaluación
    fechaCorte?: string;                  // Fecha de corte de la evaluación
    ponderacionRiesgo?: string;           // 'EXTREMO' | 'ALTO' | 'MODERADO' | 'BAJO' (calculado)
    diasRotacion?: number;                // Días de rotación según plan
    decisionRotacion?: string;            // 'INCLUIR' | 'OMITIR' | 'PENDIENTE'
    decisionFinal?: string;               // 'INCLUIR PLAN ANUAL' | 'AUDITORÍA POSTERIOR'
    motivoDecision?: string;              // Justificación de la decisión
    prioridadRegla?: number;              // 1-5, qué regla DAFP aplicó
    // Score C+E-M (modelo simplificado 0-15)
    criticidad?: number;
    exposicion?: number;
    mitigantes?: number;
    scoreRiesgo?: number;
  };

  @Column({ name: 'frecuencia_auditoria', type: 'varchar', length: 255, nullable: false })
  frecuenciaAuditoria: string;

  @Column({ name: 'ultima_auditoria', type: 'date', nullable: true })
  ultimaAuditoria?: Date;

  @Column({ name: 'resultado_ultima_auditoria', type: 'varchar', length: 255, nullable: true })
  resultadoUltimaAuditoria?: string;

  @Column({ name: 'proxima_auditoria', type: 'date', nullable: true })
  proximaAuditoria?: Date;

  @Column({ type: 'integer', nullable: false })
  prioridad: number;

  @Column({ name: 'priorizacion_anos', type: 'integer', nullable: false })
  priorizacionAnos: number; // 1-4 años según nivel de riesgo

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

