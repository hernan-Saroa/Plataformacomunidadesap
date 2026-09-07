import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Proceso } from './proceso.entity';

/**
 * Los dos estados del expediente.
 *
 * Nace abierto con el proceso y se archiva al final de la etapa 10 (EFDS-1174).
 * Hasta la migración 047 la columna no tenía CHECK y admitía cualquier cadena.
 */
export type EstadoExpediente = 'ABIERTO' | 'ARCHIVADO';

/**
 * Una entrada del índice documental congelado.
 *
 * Lleva el hash porque el índice no está para contar documentos sino para
 * probar cuáles eran: un documento sustituido conserva el nombre y cambia el
 * hash.
 */
export interface EntradaIndice {
  id: string;
  nombre: string;
  numeral: string | null;
  hashSha256: string;
  createdAt: string;
}

/**
 * Lo que contenía el expediente el día en que se archivó.
 *
 * Congelado, con el criterio del informe final, el acta de liquidación y el
 * cierre financiero. Calcularlo al consultar diría siempre que todo está en
 * orden, que es justo lo que la custodia no puede dar por supuesto.
 */
export interface IndiceDocumental {
  generadoAt: string;
  totalDocumentos: number;
  documentos: EntradaIndice[];
}

/** Expediente electrónico único del proceso (RF-SIS-04). */
@Entity('expedientes', { schema: 'hiring' })
export class Expediente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id', type: 'uuid', unique: true })
  procesoId: string;

  @OneToOne(() => Proceso, (p) => p.expediente, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'proceso_id' })
  proceso?: Proceso;

  @Column({ name: 'numero_expediente', length: 60, unique: true })
  numeroExpediente: string;

  @Column({ length: 40, default: 'ABIERTO' })
  estado: EstadoExpediente;

  @Column({ name: 'fecha_apertura', type: 'timestamptz', default: () => 'now()' })
  fechaApertura: Date;

  // ------------------------------------------------------------ archivo --

  @Column({ name: 'archivado_at', type: 'timestamptz', nullable: true })
  archivadoAt: Date | null;

  @Column({ name: 'archivado_por', length: 200, nullable: true })
  archivadoPor: string | null;

  /** Qué contenía el expediente el día en que se cerró. */
  @Column({ name: 'indice_documental', type: 'jsonb', nullable: true })
  indiceDocumental: IndiceDocumental | null;

  /**
   * El radicado que devuelve Active Document, transcrito.
   *
   * No hay integración (RF-SIS-04), igual que con SECOP II y KLIC en el resto
   * del módulo: mientras no exista, es la única prueba de que el archivo
   * documental se tramitó.
   */
  @Column({ name: 'radicado_active_document', length: 120, nullable: true })
  radicadoActiveDocument: string | null;

  @Column({ name: 'observaciones_archivo', type: 'text', nullable: true })
  observacionesArchivo: string | null;

  // ---------------------------------------------------------- reapertura --

  /** La última reapertura; el historial completo vive en trazabilidad. */
  @Column({ name: 'reabierto_at', type: 'timestamptz', nullable: true })
  reabiertoAt: Date | null;

  @Column({ name: 'reabierto_por', length: 200, nullable: true })
  reabiertoPor: string | null;

  @Column({ name: 'motivo_reapertura', type: 'text', nullable: true })
  motivoReapertura: string | null;
}
