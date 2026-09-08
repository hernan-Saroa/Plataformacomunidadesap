import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * SOLICITADO → VERIFICADO → EXPEDIDO
 *           ↘ RECHAZADO (no hay disponibilidad en el rubro)
 *
 * ANULADO queda fuera del flujo: cubre el CDP que se deja sin efecto.
 */
export type EstadoCdp = 'SOLICITADO' | 'VERIFICADO' | 'EXPEDIDO' | 'RECHAZADO' | 'ANULADO';

/** Los que ocupan el cupo de "CDP en curso" de un proceso. */
export const ESTADOS_CDP_EN_CURSO: EstadoCdp[] = ['SOLICITADO', 'VERIFICADO', 'EXPEDIDO'];

/** `numeric` llega como string desde el driver; se devuelve como número. */
const aNumero = {
  to: (valor: number | null) => valor,
  from: (valor: string | null) => (valor === null ? null : Number(valor)),
};

/**
 * Certificado de Disponibilidad Presupuestal.
 *
 * Certifica que hay recursos y queda afectado al proceso: es el respaldo
 * presupuestal previo a comprometer a la entidad (RF-EST-05). Sin él expedido,
 * el proceso no puede abrirse.
 */
@Entity('cdp', { schema: 'hiring' })
export class Cdp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id', type: 'uuid' })
  procesoId: string;

  /** Lo asigna la Dirección Financiera al expedirlo; antes no existe. */
  @Column({ length: 60, nullable: true })
  numero: string | null;

  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true, transformer: aNumero })
  valor: number | null;

  @Column({ length: 160, nullable: true })
  rubro: string | null;

  @Column({ name: 'fecha_expedicion', type: 'date', nullable: true })
  fechaExpedicion: string | null;

  /** Vigencia fiscal a la que se imputa. Un CDP no cruza vigencias. */
  @Column({ name: 'vigencia_fiscal', type: 'int', nullable: true })
  vigenciaFiscal: number | null;

  @Column({ length: 20, default: 'SOLICITADO' })
  estado: EstadoCdp;

  /**
   * Por qué la Financiera lo rechazó. Sin esto el solicitante no sabe si
   * corregir el rubro, esperar o reducir el alcance.
   */
  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  /**
   * Soporte documental en el expediente (actividad 4.4). Null mientras no se
   * haya cargado: el CDP puede estar expedido y su PDF aún no adjunto.
   */
  @Column({ name: 'documento_id', type: 'uuid', nullable: true })
  documentoId: string | null;

  @Column({ name: 'solicitado_por', length: 160, nullable: true })
  solicitadoPor: string | null;

  @Column({ name: 'solicitado_at', type: 'timestamptz' })
  solicitadoAt: Date;

  @Column({ name: 'expedido_por', length: 160, nullable: true })
  expedidoPor: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;

  /**
   * La adición que este CDP respalda; nulo si es el CDP del proceso (EFDS-1176).
   *
   * Es lo que distingue los de una modificación de los originales. Toda
   * consulta que busque «el CDP del proceso» tiene que exigirlo nulo.
   */
  @Column({ name: 'modificacion_id', type: 'uuid', nullable: true })
  modificacionId: string | null;
}
