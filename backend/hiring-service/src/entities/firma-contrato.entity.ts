import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Las dos partes del vínculo contractual.
 *
 * El contrato no se perfecciona hasta que están ambas: firmar solo una deja el
 * contrato aceptado pero sin suscribir.
 */
export type ParteFirmante = 'ORDENADOR' | 'CONTRATISTA';

/**
 * Firma de una de las partes, con su evidencia (EFDS-1162).
 *
 * Firma registrada, no criptográfica: la entidad todavía no ha elegido
 * proveedor de firma electrónica. Lo que aquí se guarda es quién firmó, cuándo
 * y con qué respaldo documental, que es lo que el expediente tiene que probar
 * mientras la integración llega.
 */
@Entity('firmas_contrato', { schema: 'hiring' })
export class FirmaContrato {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contrato_id' })
  contratoId: string;

  @Column({ length: 20 })
  parte: ParteFirmante;

  /** Quien firma. Se copia: la firma dice quién firmó ese día. */
  @Column({ name: 'firmante_nombre', length: 300 })
  firmanteNombre: string;

  @Column({ name: 'firmante_documento', length: 40, nullable: true })
  firmanteDocumento: string | null;

  /**
   * La cuenta que registró la firma, que puede no ser la del firmante: el
   * gestor registra la del contratista con su evidencia.
   */
  @Column({ name: 'registrada_por', length: 200, nullable: true })
  registradaPor: string | null;

  /** La del acto, no la del registro. */
  @Column({ name: 'fecha_firma', type: 'date' })
  fechaFirma: string;

  @Column({ name: 'evidencia_documento_id' })
  evidenciaDocumentoId: string;

  @Column({ name: 'hash_documento', type: 'char', length: 64, nullable: true })
  hashDocumento: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
