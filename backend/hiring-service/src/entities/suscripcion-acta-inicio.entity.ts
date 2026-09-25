import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Acta de inicio suscrita por las dos partes — actividad 8.7 (migración 089).
 *
 * Hasta la 089 el acta vivía dentro de la reunión de inicio (`ActaInicio`,
 * 9.1) y las dos actividades abrían la misma pantalla. En la matriz son dos
 * pasos de dos etapas: el acta cierra la legalización y la reunión abre la
 * ejecución. La reunión sigue siendo de donde el resto del módulo toma la
 * fecha de inicio; esto guarda solo el acta.
 *
 * Si el acta aplica no lo decide nadie en la pantalla: lo dice la matriz SÍ/NO
 * por modalidad, con la 8.7 excluida donde no se suscribe.
 */
@Entity('suscripciones_acta_inicio', { schema: 'hiring' })
export class SuscripcionActaInicio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contrato_id' })
  contratoId: string;

  /** Cuándo firmaron las dos partes, que no es cuándo se cargó. */
  @Column({ name: 'fecha_suscripcion', type: 'date' })
  fechaSuscripcion: string;

  @Column({ name: 'acta_documento_id' })
  actaDocumentoId: string;

  @Column({ name: 'registrado_por', type: 'varchar', length: 200, nullable: true })
  registradoPor: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
