import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * Formatos institucionales del Sistema Integrado de Gestión (Isolución).
 *
 * El estudio previo no se redacta en el sistema: la ESAP tiene formatos
 * aprobados que se diligencian en Word y se firman. El sistema ofrece el que
 * corresponde a la modalidad y controla que el documento firmado se adjunte.
 */
@Entity('plantillas', { schema: 'hiring' })
@Unique('uq_plantilla_codigo_version', ['codigo', 'version'])
export class Plantilla {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Código del SIG, p. ej. BS-FO-047. */
  @Column({ length: 40 })
  codigo: string;

  @Column({ length: 400 })
  nombre: string;

  @Column({ length: 20 })
  numeral: string;

  @Column({ length: 10 })
  version: string;

  @Column({ name: 'fecha_aprobacion', type: 'date', nullable: true })
  fechaAprobacion: string;

  /** Modalidades a las que aplica el formato; vacío = todas. */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  modalidades: string[];

  @Column({ name: 'archivo_url', type: 'text', nullable: true })
  archivoUrl: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
