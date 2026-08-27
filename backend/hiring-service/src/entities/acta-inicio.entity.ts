import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Reunión de inicio del contrato y su acta (EFDS-1167, actividad 9.1).
 *
 * Lo que arranca la ejecución es la reunión, no el papel: la matriz describe el
 * acta como «firmada por ambas partes, si fue pactada en el contrato», así que
 * hay contratos que empiezan sin ella. Se registra la reunión siempre y el acta
 * cuando el contrato la pactó, que es lo único que reconcilia la matriz con la
 * historia sin dejar arrancar contratos sin soporte ni bloquear los que la ley
 * no obliga a suscribirla.
 */
@Entity('actas_inicio', { schema: 'hiring' })
export class ActaInicio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contrato_id' })
  contratoId: string;

  /**
   * La de la reunión, no la del registro: es desde cuándo el contrato está en
   * ejecución y desde donde corre su plazo.
   */
  @Column({ name: 'fecha_inicio', type: 'date' })
  fechaInicio: string;

  /** Alcance, cronograma y entregables: lo que la matriz pide socializar. */
  @Column({ name: 'temas_tratados', type: 'text' })
  temasTratados: string;

  /**
   * En texto libre porque el contratista no es usuario del sistema: por la
   * entidad va quien delegue el ordenador, y por la otra parte su
   * representante, que no está en el directorio.
   */
  @Column({ type: 'text', nullable: true })
  asistentes: string | null;

  /** El acta firmada. Nula cuando el contrato no la pactó. */
  @Column({ name: 'acta_documento_id', nullable: true })
  actaDocumentoId: string | null;

  /**
   * Si el contrato pactó acta de inicio. Congelado al registrar: de él depende
   * que el documento fuera exigible en ese momento.
   */
  @Column({ name: 'acta_pactada', default: true })
  actaPactada: boolean;

  @Column({ name: 'registrado_por', length: 200, nullable: true })
  registradoPor: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
