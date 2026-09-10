import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * Borrador es el informe generado y todavía no publicado; trasladado es el que
 * ya se les notificó a los oferentes y tiene término corriendo; cerrado es el
 * que agotó el traslado. Anulado no se borra: es el que explica por qué hubo
 * que rehacerlo.
 */
export type EstadoInforme = 'BORRADOR' | 'TRASLADADO' | 'CERRADO' | 'ANULADO';

/**
 * Una oferta recibida, como aparece en el informe.
 *
 * La plataforma no dice quién quedó habilitado —eso lo decide el comité por
 * fuera (EFDS-1157)—, así que de cada oferta se congela lo que sí consta:
 * quién es, por cuánto ofertó y si es la que el comité eligió.
 */
export interface OfertaEnInforme {
  oferenteId: string;
  numero: number;
  nombre: string;
  identificacion: string | null;
  valorOfertado: number | null;
  ganadora: boolean;
}

/** Una evidencia del comité, congelada con su descripción. */
export interface EvidenciaEnInforme {
  documentoId: string;
  descripcion: string;
}

/**
 * El resultado del comité congelado, con el contexto que hace falta para leerlo
 * sin volver a consultar nada.
 *
 * Copia y no referencia: los nombres viajan con el resultado para que el
 * informe trasladado se lea igual aunque después se rectifique la evaluación.
 */
export interface ResultadoInforme {
  modalidad: string | null;
  /** El resultado que se congeló, para poder rastrear de cuál salió. */
  resultadoId: string;
  ganadora: {
    oferenteId: string;
    nombre: string;
    identificacion: string | null;
  };
  puntajeObtenido: number | null;
  puntajeMaximo: number | null;
  valorEvaluado: number | null;
  justificacion: string;
  /** El informe del comité, que es lo que se traslada. */
  informeDocumentoId: string;
  evidencias: EvidenciaEnInforme[];
  ofertas: OfertaEnInforme[];
}

/**
 * Informe de evaluación del proceso (actividad 6.4, EFDS-1158).
 *
 * Congela su resultado a propósito. El resultado de la evaluación se rectifica
 * —el comité corrige, registra otro y el anterior queda como rectificado—, y
 * así debe ser. Pero el informe es una pieza notificada: si mañana el comité
 * rectifica, lo que recibió el oferente no puede cambiar detrás de él. Lo que
 * se mueve es el resultado vigente; el informe queda como estaba.
 */
@Entity('informes_evaluacion', { schema: 'hiring' })
@Unique('uq_informe_numero', ['procesoId', 'numero'])
export class InformeEvaluacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id' })
  procesoId: string;

  /** Consecutivo dentro del proceso: un informe anulado y su reemplazo. */
  @Column({ type: 'int' })
  numero: number;

  /**
   * El resultado que este informe traslada.
   *
   * La clave foránea dice cuál se trasladó; el jsonb de abajo dice cómo se veía
   * ese día. Las dos cosas hacen falta: sin la primera no se sabe de dónde
   * salió, sin la segunda el expediente cambia cuando el comité rectifica.
   */
  @Column({ name: 'resultado_id' })
  resultadoId: string;

  @Column({ type: 'jsonb' })
  resultado: ResultadoInforme;

  /**
   * Cuántas ofertas había recibido el proceso al generarlo.
   *
   * Sale del resultado, pero se guarda aparte porque es la pregunta que decide
   * si el proceso sigue o se declara desierto, y no se responde escarbando un
   * jsonb. No es "habilitadas": quién queda habilitado lo decide el comité por
   * fuera y la plataforma no lo calcula.
   */
  @Column({ name: 'ofertas_recibidas', type: 'int', default: 0 })
  ofertasRecibidas: number;

  /**
   * Lo que la entidad advierte sobre el informe, aparte de lo que trajo el
   * comité. Columna propia y no dentro del jsonb: el jsonb es la copia de lo
   * que dijo el comité, y esto lo dice la entidad.
   */
  @Column({ name: 'observacion_entidad', type: 'text', nullable: true })
  observacionEntidad: string | null;

  @Column({ length: 20, default: 'BORRADOR' })
  estado: EstadoInforme;

  @Column({ name: 'informe_documento_id', type: 'uuid', nullable: true })
  informeDocumentoId: string | null;

  /** Soporte de la publicación: no hay integración con SECOP II. */
  @Column({ name: 'evidencia_documento_id', type: 'uuid', nullable: true })
  evidenciaDocumentoId: string | null;

  @Column({ name: 'generado_por', length: 120, nullable: true })
  generadoPor: string | null;

  @Column({ name: 'generado_at', type: 'timestamptz', default: () => 'now()' })
  generadoAt: Date;

  @Column({ name: 'trasladado_por', length: 120, nullable: true })
  trasladadoPor: string | null;

  @Column({ name: 'trasladado_at', type: 'timestamptz', nullable: true })
  trasladadoAt: Date | null;

  /** Plazo aplicado, congelado al trasladar. */
  @Column({ name: 'plazo_dias_habiles', type: 'int', nullable: true })
  plazoDiasHabiles: number | null;

  /**
   * Hasta cuándo se reciben subsanaciones, sin hora.
   *
   * A diferencia del plazo de ofertas, este término se cuenta en días hábiles y
   * vence al final del día: `YYYY-MM-DD` como el resto de plazos del módulo.
   */
  @Column({ name: 'vence_el', type: 'date', nullable: true })
  venceEl: string | null;

  @Column({ name: 'cerrado_por', length: 120, nullable: true })
  cerradoPor: string | null;

  @Column({ name: 'cerrado_at', type: 'timestamptz', nullable: true })
  cerradoAt: Date | null;

  /**
   * Lo que no cabe en las respuestas: que nadie presentó nada, o que el comité
   * rectificó a raíz de una subsanación aceptada.
   */
  @Column({ name: 'nota_cierre', type: 'text', nullable: true })
  notaCierre: string | null;

  @Column({ name: 'anulado_at', type: 'timestamptz', nullable: true })
  anuladoAt: Date | null;

  @Column({ name: 'motivo_anulacion', type: 'text', nullable: true })
  motivoAnulacion: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
