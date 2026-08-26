import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * SOLICITADO → VERIFICADO → EXPEDIDO
 *           ↘ RECHAZADO
 *
 * Mismo ciclo que el CDP porque es el mismo trámite en otro momento: la
 * Financiera no debería aprender dos flujos distintos para lo mismo. `ANULADO`
 * queda fuera del camino normal y cubre el RP que se deja sin efecto.
 */
export type EstadoRp = 'SOLICITADO' | 'VERIFICADO' | 'EXPEDIDO' | 'RECHAZADO' | 'ANULADO';

/**
 * Registro presupuestal del contrato (EFDS-1163).
 *
 * El CDP aparta la partida; el RP la compromete. Por eso el CDP se exige antes
 * de abrir el proceso y el RP solo después de firmarlo.
 */
@Entity('registros_presupuestales', { schema: 'hiring' })
export class RegistroPresupuestal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contrato_id' })
  contratoId: string;

  /** Lo asigna la Financiera al expedir; no existe mientras está solicitado. */
  @Column({ length: 60, nullable: true })
  numero: string | null;

  /**
   * `numeric` llega como string desde el driver; el transformer lo devuelve como
   * número para que la comparación con el valor del contrato no compare cadenas.
   */
  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    nullable: true,
    transformer: {
      to: (valor: number | null) => valor,
      from: (valor: string | null) => (valor === null ? null : Number(valor)),
    },
  })
  valor: number | null;

  @Column({ length: 160, nullable: true })
  rubro: string | null;

  @Column({ name: 'fecha_expedicion', type: 'date', nullable: true })
  fechaExpedicion: string | null;

  /** Vigencia fiscal a la que se imputa. Un RP no cruza vigencias. */
  @Column({ name: 'vigencia_fiscal', type: 'int', nullable: true })
  vigenciaFiscal: number | null;

  @Column({ length: 20, default: 'SOLICITADO' })
  estado: EstadoRp;

  /** Por qué se rechazó. Sin esto, quien solicita no sabe qué corregir. */
  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ name: 'documento_id', type: 'uuid', nullable: true })
  documentoId: string | null;

  @Column({ name: 'solicitado_por', length: 200, nullable: true })
  solicitadoPor: string | null;

  @Column({ name: 'solicitado_at', type: 'timestamptz' })
  solicitadoAt: Date;

  @Column({ name: 'expedido_por', length: 200, nullable: true })
  expedidoPor: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
  /**
   * La adición que este RP compromete; nulo si es el RP del contrato (EFDS-1176).
   *
   * Es lo que distingue los de una modificación de los originales. Toda
   * consulta que busque «el RP del contrato» tiene que exigirlo nulo.
   */
  @Column({ name: 'modificacion_id', type: 'uuid', nullable: true })
  modificacionId: string | null;
}
