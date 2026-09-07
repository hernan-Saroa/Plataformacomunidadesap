import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Auditoría de excepciones autorizadas por la Dirección Nacional o el
 * Sindicato para saltar la restricción de ruta corta o de presupuesto
 * agotado (RF-LIQ-003 / RF-LIQ-004).
 *
 * Tabla física: `travel_expenses.excepciones_autorizadas_tiquetes`.
 */
@Entity({
  schema: 'travel_expenses',
  name: 'excepciones_autorizadas_tiquetes',
})
@Index('idx_excep_tiquetes_solicitud', ['solicitudId'])
@Index('idx_excep_tiquetes_tipo', ['tipoExcepcion'])
export class ExcepcionTiqueteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'solicitud_id', type: 'uuid' })
  solicitudId: string;

  /**
   * 'RUTA_CORTA' | 'PRESUPUESTO_AGOTADO'
   */
  @Column({ name: 'tipo_excepcion', type: 'varchar', length: 50 })
  tipoExcepcion: string;

  /**
   * 'DIRECTOR_NACIONAL' | 'SINDICATO'
   */
  @Column({ name: 'autorizado_por', type: 'varchar', length: 150 })
  autorizadoPor: string;

  @Column({ name: 'numero_documento_soporte', type: 'varchar', length: 100 })
  numeroDocumentoSoporte: string;

  @Column({
    name: 'documento_soporte_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  documentoSoporteUrl: string | null;

  @Column({ name: 'comentarios', type: 'text', nullable: true })
  comentarios: string | null;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
