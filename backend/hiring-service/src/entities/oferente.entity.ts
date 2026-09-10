import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * Una oferta recibida dentro del plazo, con su soporte.
 *
 * Al cerrarse la recepción, el conjunto de estas filas es la lista de oferentes
 * que se publica.
 */
@Entity('oferentes', { schema: 'hiring' })
@Unique('uq_oferente_numero', ['recepcionId', 'numero'])
@Unique('uq_oferente_identificacion', ['recepcionId', 'identificacion'])
export class Oferente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recepcion_id' })
  recepcionId: string;

  /** Consecutivo dentro de la recepción: la lista publicada numera por llegada. */
  @Column({ type: 'int' })
  numero: number;

  @Column({ length: 200 })
  nombre: string;

  @Column({ length: 40 })
  identificacion: string;

  /**
   * Cuándo se radicó la oferta ante la entidad, no cuándo se registró aquí.
   *
   * No hay integración con SECOP II ni está prevista: el gestor transcribe lo
   * que recibió, con su soporte, y la plataforma no puede saber por su cuenta
   * cuándo llegó una oferta.
   */
  @Column({ name: 'fecha_radicacion', type: 'timestamptz' })
  fechaRadicacion: Date;

  @Column({ name: 'soporte_documento_id' })
  soporteDocumentoId: string;

  /**
   * Valor de la oferta presentada.
   *
   * Nulo en las registradas antes de EFDS-1157, que no lo pedía: exigirlo hacia
   * atrás falsearía el expediente. Es un dato de la oferta y no un juicio: la
   * evaluación se hace por fuera de la plataforma, así que aquí no alimenta
   * ningún cálculo, pero es lo que deja leer el resultado que el comité trae.
   */
  @Column({ name: 'valor_ofertado', type: 'numeric', precision: 18, scale: 2, nullable: true })
  valorOfertado: string | null;

  @Column({ name: 'registrado_por', length: 200, nullable: true })
  registradoPor: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
