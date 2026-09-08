import { Column, CreateDateColumn, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Actividad 10.4 de la matriz: «Archivar expediente contractual».
 *
 * Cubre las dos mitades de RF-LIQ-04 —publicar el acta y archivar— porque la
 * matriz no le da numeral propio a la publicación y el requisito las enuncia
 * juntas. Es la última actividad del proceso.
 */
export const NUMERAL_ARCHIVO_EXPEDIENTE = '10.4';

/**
 * Dónde se publicó el acta.
 *
 * Mismo par que la publicación del contrato (EFDS-1166) y por la misma razón:
 * la historia habla de SECOP II y la matriz de la página web de la ESAP. Se
 * registra el sitio en vez de suponer cuál de los dos manda.
 */
export type DestinoPublicacionActa = 'SECOP_II' | 'WEB_ESAP';

/**
 * Publicación del acta de liquidación — actividad 10.4 (EFDS-1174, RF-LIQ-04).
 *
 * Apunta al acta y no al contrato: el acta se puede anular y en su lugar se
 * firma otra, y así queda dicho cuál de ellas fue la que se publicó.
 */
@Entity('publicaciones_acta', { schema: 'hiring' })
export class PublicacionActa {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'acta_id' })
  actaId: string;

  @Column({ length: 20 })
  destino: DestinoPublicacionActa;

  /** La real, no la del registro: es la que cuenta para el plazo. */
  @Column({ name: 'fecha_publicacion', type: 'date' })
  fechaPublicacion: string;

  /** Congelado al registrar: si mañana cambia el parámetro, esta no se mueve. */
  @Column({ name: 'plazo_dias_habiles', type: 'int', nullable: true })
  plazoDiasHabiles: number | null;

  @Column({ name: 'fecha_limite', type: 'date', nullable: true })
  fechaLimite: string | null;

  @Column({ name: 'secop_numero', length: 80, nullable: true })
  secopNumero: string | null;

  @Column({ name: 'secop_url', type: 'text', nullable: true })
  secopUrl: string | null;

  /** Sin soporte no hay publicación registrada, solo la afirmación de que se hizo. */
  @Column({ name: 'documento_id' })
  documentoId: string;

  @Column({ name: 'publicado_por', length: 200, nullable: true })
  publicadoPor: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

/**
 * Plazo para publicar el acta, parametrizable.
 *
 * Fila única, como el de la publicación del contrato: el plazo no varía por
 * modalidad, así que una tabla de una fila dice la verdad mejor que once filas
 * iguales.
 */
@Entity('plazo_publicacion_acta', { schema: 'hiring' })
export class PlazoPublicacionActa {
  @PrimaryColumn({ type: 'int', default: 1 })
  id: number;

  @Column({ name: 'dias_habiles', type: 'int' })
  diasHabiles: number;

  /** De dónde sale la cifra: norma o acta que la respalda. */
  @Column({ type: 'text', nullable: true })
  fundamento: string | null;

  /** False mientras la Dirección de Contratación no valide el número. */
  @Column({ default: false })
  confirmado: boolean;

  @Column({ name: 'actualizado_at', type: 'timestamptz' })
  actualizadoAt: Date;
}
