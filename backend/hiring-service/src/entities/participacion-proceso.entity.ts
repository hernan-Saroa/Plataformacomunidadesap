import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Con qué papel está alguien en un proceso (EFDS-1183).
 *
 * - `CONTRATACION`: quien lo tomó de la bandeja en la 3.3 y responde por él
 *   dentro de la Dirección. Sube los documentos de ahí en adelante.
 * - `ABOGADO`: quien revisa en la 3.4 y aprueba, devuelve o niega.
 *
 * Dos papeles y no dos tablas: lo que se guarda de cada uno es idéntico —una
 * cuenta, desde cuándo, quién la puso y por qué salió—, y separarlos obligaría
 * a escribir dos veces el relevo, que es la parte con reglas.
 */
export type PapelEnProceso = 'CONTRATACION' | 'ABOGADO';

/**
 * Vigente y relevado, no un borrado.
 *
 * Cambiar de responsable es relevar al anterior y poner otro: quien llevó el
 * proceso hasta hoy respondió por lo que hizo en él, y un expediente que solo
 * recuerda al último no puede explicar quién revisó qué.
 */
export type EstadoParticipacion = 'VIGENTE' | 'RELEVADO';

/**
 * Quién está en un proceso (EFDS-1183).
 *
 * Es lo que permite decir «el abogado de este expediente» en vez de «quien
 * tenga permiso de aprobar». No sustituye a los permisos: los recorta al
 * proceso propio.
 *
 * Mismo modelo que la supervisión del contrato (EFDS-1165) pero sin su acto
 * administrativo, que es donde se separan: la supervisión produce efectos
 * frente al contratista, esto es reparto interno de trabajo.
 */
@Entity('participaciones_proceso', { schema: 'hiring' })
export class ParticipacionProceso {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id' })
  procesoId: string;

  @Column({ length: 20 })
  papel: PapelEnProceso;

  /** `id_user` de auth."user", que es lo que el JWT trae en `sub`. */
  @Column({ name: 'usuario_id', type: 'uuid', nullable: true })
  usuarioId: string | null;

  /**
   * El `username` de la cuenta.
   *
   * Es el identificador que usan los listados: `procesos.created_by` guarda ese
   * mismo username, así que «los que radiqué o los que me tocan» se responde
   * comparando lo mismo en los dos lados.
   */
  @Column({ name: 'usuario_nombre', length: 120 })
  usuarioNombre: string;

  /** `id_person` del directorio; nulo si la cuenta no tiene persona enlazada. */
  @Column({ name: 'persona_id', type: 'uuid', nullable: true })
  personaId: string | null;

  /** Copia del nombre al entrar: el reparto se hizo sobre esa persona ese día. */
  @Column({ length: 200 })
  nombre: string;

  @Column({ length: 200, nullable: true })
  cargo: string | null;

  @Column({ length: 200, nullable: true })
  email: string | null;

  /**
   * Quién lo puso ahí.
   *
   * En el papel `CONTRATACION` es la propia persona: el proceso no se lo
   * entrega nadie, lo toma de la bandeja compartida.
   */
  @Column({ name: 'asignado_por', length: 200, nullable: true })
  asignadoPor: string | null;

  @Column({ name: 'asignado_at', type: 'timestamptz' })
  asignadoAt: Date;

  @Column({ length: 20, default: 'VIGENTE' })
  estado: EstadoParticipacion;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'relevado_at', type: 'timestamptz', nullable: true })
  relevadoAt: Date | null;

  @Column({ name: 'relevado_por', length: 200, nullable: true })
  relevadoPor: string | null;

  @Column({ name: 'motivo_relevo', type: 'text', nullable: true })
  motivoRelevo: string | null;
}
