import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

import type { CambioDeAdenda } from '../modules/cronograma/cronograma-actividades';

/** A qué afecta la adenda: al contenido del pliego o a sus fechas. */
export type TipoAdenda = 'FONDO' | 'CRONOGRAMA';

/**
 * Emitida y publicada son dos hechos distintos: una adenda emitida existe en el
 * expediente con su documento firmado, pero no produce efectos hasta que se
 * publica. De ahí que el cronograma se mueva al publicar y no al emitir.
 */
export type EstadoAdenda = 'EMITIDA' | 'PUBLICADA' | 'ANULADA';

@Entity('adendas', { schema: 'hiring' })
@Unique('uq_adenda_numero', ['procesoId', 'numero'])
export class Adenda {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id' })
  procesoId: string;

  /** Consecutivo dentro del proceso: las adendas se citan por su número. */
  @Column({ type: 'int' })
  numero: number;

  @Column({ length: 20 })
  tipo: TipoAdenda;

  /** Qué cambia la adenda; es lo que se lee en el listado del expediente. */
  @Column({ type: 'text' })
  objeto: string;

  @Column({ name: 'documento_id' })
  documentoId: string;

  @Column({ length: 20, default: 'EMITIDA' })
  estado: EstadoAdenda;

  @Column({ name: 'emitida_por', length: 200, nullable: true })
  emitidaPor: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'fecha_publicacion', type: 'date', nullable: true })
  fechaPublicacion: string | null;

  @Column({ name: 'evidencia_documento_id', nullable: true })
  evidenciaDocumentoId: string | null;

  @Column({ name: 'publicada_por', length: 200, nullable: true })
  publicadaPor: string | null;

  /**
   * De qué fecha a qué fecha movió el plazo, solo en las de cronograma.
   *
   * Se guardan las dos: con la nueva sola no habría forma de saber qué se
   * prorrogó, y el expediente tiene que mostrar el cambio, no solo el resultado.
   */
  @Column({ name: 'vencimiento_anterior', type: 'date', nullable: true })
  vencimientoAnterior: string | null;

  @Column({ name: 'vencimiento_nuevo', type: 'date', nullable: true })
  vencimientoNuevo: string | null;

  /**
   * La hora del cierre de ofertas antes y después, en Bogotá (HH:MM:SS).
   *
   * Solo cuando lo que se prorroga es el cierre: el plazo de observaciones no
   * tiene hora. La nueva es opcional; sin ella se conserva la del cronograma.
   */
  @Column({ name: 'hora_anterior', type: 'time', nullable: true })
  horaAnterior: string | null;

  @Column({ name: 'hora_nueva', type: 'time', nullable: true })
  horaNueva: string | null;

  /**
   * Las fechas del cronograma (5.2) que mueve una de cronograma (139).
   *
   * Se fijan al emitirla, como el nuevo cierre, y se aplican al publicarla:
   * ahí cada una guarda también la fecha que tenía antes.
   */
  @Column({ name: 'cambios_cronograma', type: 'jsonb', default: () => "'[]'::jsonb" })
  cambiosCronograma: CambioDeAdenda[];

  @Column({ name: 'anulada_at', type: 'timestamptz', nullable: true })
  anuladaAt: Date | null;

  @Column({ name: 'anulada_por', length: 200, nullable: true })
  anuladaPor: string | null;

  @Column({ name: 'motivo_anulacion', type: 'text', nullable: true })
  motivoAnulacion: string | null;
}
