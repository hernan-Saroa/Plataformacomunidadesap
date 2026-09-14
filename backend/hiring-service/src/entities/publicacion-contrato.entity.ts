import { Column, CreateDateColumn, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Dónde se publicó el contrato.
 *
 * La historia (EFDS-1166) habla de SECOP II y la matriz llama a la actividad
 * 8.8 «Publicación en página web ESAP». Se registra el destino en vez de
 * suponer cuál de las dos manda: si resultan ser dos publicaciones, cada una
 * queda con su sitio.
 */
export type DestinoPublicacion = 'SECOP_II' | 'WEB_ESAP';

@Entity('publicaciones_contrato', { schema: 'hiring' })
export class PublicacionContrato {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contrato_id' })
  contratoId: string;

  @Column({ length: 20 })
  destino: DestinoPublicacion;

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
 * Plazo para publicar el contrato, parametrizable.
 *
 * Fila única: el plazo no varía por modalidad —a diferencia del de publicidad
 * del pliego—, así que una tabla de una fila dice la verdad mejor que once
 * filas iguales.
 */
@Entity('plazo_publicacion_contrato', { schema: 'hiring' })
export class PlazoPublicacionContrato {
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
