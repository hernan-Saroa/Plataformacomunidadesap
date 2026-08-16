import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Quién realizó la afiliación.
 *
 * La matriz distingue los dos casos en 8.5: «cuando la entidad realiza la
 * afiliación o cuando la realiza directamente el contratista».
 */
export type AfiliadoPor = 'ENTIDAD' | 'CONTRATISTA';

/**
 * Afiliación a riesgos laborales del contratista persona natural (EFDS-1164).
 *
 * Que se exija o no se deriva de `contratos.contratistaTipo`, guardado al
 * contratar: es el criterio 2 de la historia y no puede depender de que alguien
 * se acuerde de marcar una casilla.
 */
@Entity('afiliaciones_arl', { schema: 'hiring' })
export class AfiliacionArl {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contrato_id' })
  contratoId: string;

  @Column({ name: 'afiliado_por', length: 20 })
  afiliadoPor: AfiliadoPor;

  @Column({ length: 200 })
  administradora: string;

  @Column({ name: 'numero_afiliacion', length: 80, nullable: true })
  numeroAfiliacion: string | null;

  @Column({ name: 'fecha_afiliacion', type: 'date' })
  fechaAfiliacion: string;

  @Column({ name: 'soporte_documento_id' })
  soporteDocumentoId: string;

  @Column({ name: 'registrada_por', length: 200, nullable: true })
  registradaPor: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
