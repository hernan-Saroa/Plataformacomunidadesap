import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { ResultadoInforme } from './informe-evaluacion.entity';

export type EstadoInformeDefinitivo = 'BORRADOR' | 'PUBLICADO' | 'ANULADO';

/**
 * Qué cambió entre el informe preliminar y el definitivo.
 *
 * Se guarda resuelto y no se deduce comparando dos jsonb a mano: es la pregunta
 * que el expediente tiene que responder solo, y quien la hace suele ser un
 * oferente que quiere saber por qué el desenlace no es el que se le notificó.
 */
export interface CambiosDelDefinitivo {
  /** True si el comité registró otro resultado después del traslado. */
  huboRectificacion: boolean;
  /** El motivo que el comité dio al rectificar, si lo hubo. */
  motivoRectificacion: string | null;
  /** Si la ganadora del definitivo no es la que se trasladó. */
  cambioLaGanadora: boolean;
  /** Lo aceptado durante el traslado, que es lo que suele explicar el cambio. */
  subsanacionesAceptadas: {
    id: string;
    oferente: string;
    asunto: string;
  }[];
  /** Cuántos escritos se presentaron en total contra el preliminar. */
  escritosPresentados: number;
}

/**
 * Informe de evaluación definitivo — actividad 7.3 (EFDS-1159).
 *
 * Congela su resultado como el preliminar, pero toma el **vigente** del comité
 * y no el que se congeló al trasladar: si el comité rectificó a raíz de una
 * subsanación aceptada, adjudicar sobre la foto vieja sería adjudicar contra lo
 * que la propia entidad aceptó. Cada informe fotografía lo que era cierto el
 * día en que se notificó, y son días distintos.
 *
 * Tabla aparte de `informes_evaluacion` a propósito: aquel lleva plazo,
 * traslado y subsanaciones colgando, y este no tiene término que correr.
 * Juntarlos dejaría la mitad de las columnas de cada uno siempre en nulo.
 */
@Entity('informes_definitivos', { schema: 'hiring' })
export class InformeDefinitivo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id' })
  procesoId: string;

  /** El preliminar que este viene a reemplazar: no existe suelto. */
  @Column({ name: 'informe_preliminar_id' })
  informePreliminarId: string;

  @Column({ name: 'resultado_id' })
  resultadoId: string;

  @Column({ type: 'jsonb' })
  resultado: ResultadoInforme;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  cambios: CambiosDelDefinitivo;

  @Column({ name: 'ofertas_recibidas', type: 'int', default: 0 })
  ofertasRecibidas: number;

  @Column({ length: 20, default: 'BORRADOR' })
  estado: EstadoInformeDefinitivo;

  @Column({ name: 'informe_documento_id', type: 'uuid', nullable: true })
  informeDocumentoId: string | null;

  /** Soporte de la publicación: no hay integración con SECOP II. */
  @Column({ name: 'evidencia_documento_id', type: 'uuid', nullable: true })
  evidenciaDocumentoId: string | null;

  @Column({ name: 'generado_por', length: 200, nullable: true })
  generadoPor: string | null;

  @Column({ name: 'generado_at', type: 'timestamptz', default: () => 'now()' })
  generadoAt: Date;

  @Column({ name: 'publicado_por', length: 200, nullable: true })
  publicadoPor: string | null;

  @Column({ name: 'publicado_at', type: 'timestamptz', nullable: true })
  publicadoAt: Date | null;

  @Column({ name: 'anulado_at', type: 'timestamptz', nullable: true })
  anuladoAt: Date | null;

  @Column({ name: 'motivo_anulacion', type: 'text', nullable: true })
  motivoAnulacion: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
