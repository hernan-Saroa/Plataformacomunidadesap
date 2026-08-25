import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Vigente y relevado, no un borrado.
 *
 * Cambiar de supervisor es relevar al anterior y designar otro: quien vigiló
 * los primeros meses respondió por ellos, así que borrarlo dejaría el
 * expediente contando otra historia. De ahí que un contrato pueda tener varios
 * supervisores y solo uno vigente.
 */
export type EstadoSupervision = 'VIGENTE' | 'RELEVADO';

/**
 * Supervisor del contrato, designado por acto administrativo (EFDS-1165).
 *
 * Mismo modelo que el comité evaluador y por la misma razón: el acto no es un
 * adjunto más, es lo que convierte un nombre en un supervisor.
 */
@Entity('supervisiones_contrato', { schema: 'hiring' })
export class SupervisionContrato {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contrato_id' })
  contratoId: string;

  /** El acto que designa. Sin él hay un nombre, no un supervisor. */
  @Column({ name: 'acto_documento_id' })
  actoDocumentoId: string;

  /** La del acto, no la del registro: es cuando la entidad designó. */
  @Column({ name: 'fecha_designacion', type: 'date' })
  fechaDesignacion: string;

  /** `id_person` de auth.personas; sin FK porque ese esquema es de otro equipo. */
  @Column({ name: 'persona_id' })
  personaId: string;

  /** Copia del nombre al designar: el acto nombró a esa persona ese día. */
  @Column({ length: 200 })
  nombre: string;

  @Column({ length: 200, nullable: true })
  cargo: string | null;

  @Column({ length: 200, nullable: true })
  email: string | null;

  @Column({ name: 'designado_por', length: 200, nullable: true })
  designadoPor: string | null;

  @Column({ length: 20, default: 'VIGENTE' })
  estado: EstadoSupervision;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  /**
   * Cuándo se le avisó de su designación.
   *
   * Nulo mientras el aviso siga pendiente. El módulo no envía correos todavía,
   * y marcarlo como enviado sin haberlo enviado dejaría al supervisor sin
   * enterarse y al expediente afirmando lo contrario.
   */
  @Column({ name: 'alerta_enviada_at', type: 'timestamptz', nullable: true })
  alertaEnviadaAt: Date | null;

  @Column({ name: 'relevado_at', type: 'timestamptz', nullable: true })
  relevadoAt: Date | null;

  @Column({ name: 'relevado_por', length: 200, nullable: true })
  relevadoPor: string | null;

  @Column({ name: 'motivo_relevo', type: 'text', nullable: true })
  motivoRelevo: string | null;
}
