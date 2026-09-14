import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Un documento con que el comité sustenta su evaluación (EFDS-1157).
 *
 * Las verificaciones jurídica, financiera y técnica, el cuadro comparativo, las
 * actas de reunión. Entidad aparte y no una columna más en el resultado porque
 * son varias, llegan en momentos distintos y cada una la sube quien la produjo:
 * es el "cargue de archivos" que la matriz de roles le reconoce al comité.
 */
@Entity('evidencias_evaluacion', { schema: 'hiring' })
export class EvidenciaEvaluacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'resultado_id' })
  resultadoId: string;

  @Column({ name: 'documento_id' })
  documentoId: string;

  /** Qué es lo que se cargó: una lista de archivos sin decir cuál es cuál no sustenta nada. */
  @Column({ length: 300 })
  descripcion: string;

  @Column({ name: 'cargada_por', length: 200, nullable: true })
  cargadaPor: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
