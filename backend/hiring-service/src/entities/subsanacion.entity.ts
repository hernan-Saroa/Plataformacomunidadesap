import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Una subsanación aporta lo que faltaba y puede cambiar la habilitación; una
 * observación cuestiona la evaluación, propia o de otro. No son lo mismo y no
 * se responden igual: con una sola etiqueta habría que adivinar cuál es cuál.
 */
export type TipoSubsanacion = 'SUBSANACION' | 'OBSERVACION';

/**
 * Lo que presenta un oferente durante el traslado del informe (actividad 6.5,
 * EFDS-1158).
 *
 * Llega por SECOP II y la plataforma no habla con SECOP, así que el gestor lo
 * transcribe con su soporte. Lo que la entidad debe poder demostrar es que lo
 * recibió, cuándo, y qué respondió.
 */
@Entity('subsanaciones', { schema: 'hiring' })
export class Subsanacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * El informe trasladado, no solo el proceso: si un informe se anula y se
   * traslada otro, cada uno conserva lo que se presentó contra él.
   */
  @Column({ name: 'informe_id' })
  informeId: string;

  /** La oferta a la que se refiere: es lo que permite reevaluarla. */
  @Column({ name: 'oferente_id' })
  oferenteId: string;

  @Column({ length: 20 })
  tipo: TipoSubsanacion;

  @Column({ name: 'presentado_por', length: 200 })
  presentadoPor: string;

  @Column({ length: 60, nullable: true })
  identificacion: string | null;

  /**
   * Cuándo lo presentó el oferente, no cuándo se registró: es la que decide si
   * llegó en término, y el gestor puede transcribirlo días después.
   */
  @Column({ name: 'fecha_presentacion', type: 'date' })
  fechaPresentacion: string;

  /**
   * Resuelto al registrar y no calculado al consultar, por la misma razón que
   * el vencimiento se congela.
   *
   * Extemporáneo **no** significa rechazado: quien decide si lo acepta es la
   * entidad, y el sistema no puede borrar el hecho de que el oferente presentó.
   */
  @Column({ type: 'boolean', default: false })
  extemporanea: boolean;

  @Column({ length: 300 })
  asunto: string;

  @Column({ type: 'text' })
  contenido: string;

  @Column({ name: 'soporte_documento_id' })
  soporteDocumentoId: string;

  @Column({ type: 'text', nullable: true })
  respuesta: string | null;

  /** La matriz pide respuesta documentada por dimensión. */
  @Column({ name: 'respuesta_documento_id', type: 'uuid', nullable: true })
  respuestaDocumentoId: string | null;

  /**
   * Nulo mientras no se responde. True: se aceptó, y el comité puede corregir
   * su juicio con lo aportado.
   */
  @Column({ type: 'boolean', nullable: true })
  aceptada: boolean | null;

  @Column({ name: 'respondida_por', length: 120, nullable: true })
  respondidaPor: string | null;

  @Column({ name: 'respondida_at', type: 'timestamptz', nullable: true })
  respondidaAt: Date | null;

  @Column({ name: 'registrado_por', length: 120, nullable: true })
  registradoPor: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
