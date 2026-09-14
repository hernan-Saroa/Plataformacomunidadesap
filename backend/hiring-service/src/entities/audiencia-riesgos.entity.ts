import { Column, CreateDateColumn, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

/**
 * En qué modalidades la audiencia de riesgos es obligatoria (RF-PUB-04).
 *
 * En tabla y no en el código porque EFDS-1153 deja como supuesto a validar las
 * modalidades exactas: la aplicación funciona con el valor provisional y avisa
 * de que lo es, igual que con los umbrales de cuantía y los plazos de
 * publicidad. `confirmado` es lo que distingue el dato ratificado por
 * Contratación del que puso el equipo para poder avanzar.
 */
@Entity('audiencia_riesgos_config', { schema: 'hiring' })
export class AudienciaRiesgosConfig {
  @PrimaryColumn({ length: 60 })
  modalidad: string;

  /**
   * Obligatoria: sin la audiencia celebrada el proceso no puede abrirse.
   *
   * Distinto de que la actividad aplique. Donde aplica sin ser obligatoria, la
   * audiencia puede celebrarse y registrarse, pero no bloquea la apertura.
   */
  @Column({ default: false })
  obligatoria: boolean;

  @Column({ type: 'text', nullable: true })
  fundamento: string | null;

  @Column({ default: false })
  confirmado: boolean;

  @Column({ name: 'updated_by', length: 200, nullable: true })
  updatedBy: string | null;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

/**
 * La audiencia celebrada, con su acta y la matriz de riesgos que consolidó.
 *
 * Corregirla la anula y obliga a registrarla de nuevo: el acta anterior queda
 * en el expediente, como en la publicación del pliego.
 */
@Entity('audiencias_riesgos', { schema: 'hiring' })
export class AudienciaRiesgos {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id' })
  procesoId: string;

  /** La de celebración, no la del registro. */
  @Column({ name: 'fecha_celebracion', type: 'date' })
  fechaCelebracion: string;

  @Column({ name: 'acta_documento_id' })
  actaDocumentoId: string;

  @Column({ name: 'matriz_documento_id' })
  matrizDocumentoId: string;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ name: 'registrado_por', length: 200, nullable: true })
  registradoPor: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'anulada_at', type: 'timestamptz', nullable: true })
  anuladaAt: Date | null;

  @Column({ name: 'anulada_por', length: 200, nullable: true })
  anuladaPor: string | null;

  @Column({ name: 'motivo_anulacion', type: 'text', nullable: true })
  motivoAnulacion: string | null;
}
