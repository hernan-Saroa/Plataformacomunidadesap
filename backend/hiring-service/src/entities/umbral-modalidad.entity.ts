import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Modalidad } from './modalidad.entity';

export type UnidadUmbral = 'SMMLV' | 'PESOS';

/** `numeric` llega como string desde el driver; se devuelve como número. */
const aNumero = {
  to: (valor: number | null) => valor,
  from: (valor: string | null) => (valor === null ? null : Number(valor)),
};

/**
 * Rango de cuantía que sugiere una modalidad.
 *
 * El intervalo es semiabierto `[inferior, superior)`: el límite superior
 * pertenece al tramo siguiente, para que dos umbrales contiguos no se solapen
 * justo en la frontera. Un `null` significa "sin piso" o "sin techo".
 *
 * Los umbrales no se editan: se cierran con `vigenciaHasta` y se abre otro. Un
 * proceso creado en marzo debe poder explicarse con las reglas de marzo.
 */
@Entity('umbrales_modalidad', { schema: 'hiring' })
export class UmbralModalidad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 60 })
  modalidad: string;

  @ManyToOne(() => Modalidad)
  @JoinColumn({ name: 'modalidad' })
  modalidadRef?: Modalidad;

  @Column({
    name: 'limite_inferior',
    type: 'numeric',
    precision: 18,
    scale: 2,
    nullable: true,
    transformer: aNumero,
  })
  limiteInferior: number | null;

  @Column({
    name: 'limite_superior',
    type: 'numeric',
    precision: 18,
    scale: 2,
    nullable: true,
    transformer: aNumero,
  })
  limiteSuperior: number | null;

  /**
   * SMMLV para lo que la ley define en salarios (Ley 1150 de 2007), PESOS para
   * los topes que la entidad fije en cifra cerrada.
   */
  @Column({ length: 10, default: 'SMMLV' })
  unidad: UnidadUmbral;

  @Column({ name: 'vigencia_desde', type: 'date' })
  vigenciaDesde: string;

  /** Null mientras el umbral esté vigente. */
  @Column({ name: 'vigencia_hasta', type: 'date', nullable: true })
  vigenciaHasta: string | null;

  /** False mientras la Dirección de Contratación no confirme la cifra. */
  @Column({ type: 'boolean', default: false })
  confirmado: boolean;

  @Column({ name: 'created_by', length: 160, nullable: true })
  createdBy: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
