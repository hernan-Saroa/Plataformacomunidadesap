import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * En qué punto va el caso.
 *
 * `REPORTADO` lo abre el supervisor (EFDS-1180): constata el hecho y lo
 * reporta. Los tres siguientes los mueve el trámite sancionatorio del área
 * jurídica (EFDS-1181), que EFDS-1180 dejó anunciado y ya existe.
 *
 * Dos desenlaces y no uno: un caso archivado no es lo mismo que uno decidido, y
 * el expediente tiene que poder distinguir el incumplimiento que se declaró del
 * que se examinó y no prosperó.
 */
export type EstadoCasoIncumplimiento =
  | 'REPORTADO'
  | 'EN_TRAMITE'
  | 'DECIDIDO'
  | 'ARCHIVADO';

/**
 * Presunto incumplimiento del contrato (EFDS-1180, RF-INC-01).
 *
 * Es «presunto» y no «incumplimiento» a secas en toda la historia: el
 * supervisor reporta lo que observa, y quien declara el incumplimiento es el
 * área jurídica al final de su trámite. El nombre de la entidad conserva esa
 * distinción para que nadie lea el reporte como una declaración.
 *
 * El caso no se borra nunca: un incumplimiento reportado existió aunque
 * después se descarte, y el expediente tiene que poder explicar por qué se
 * abrió. Mismo criterio de la minuta rechazada (EFDS-1161) y del supervisor
 * relevado (EFDS-1165).
 */
@Entity('casos_incumplimiento', { schema: 'hiring' })
export class CasoIncumplimiento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contrato_id' })
  contratoId: string;

  /**
   * Qué se observó.
   *
   * Se pide siempre y con holgura: es lo que el área jurídica lee para decidir
   * si abre trámite, y «incumplió» sin más no le sirve para nada.
   */
  @Column({ type: 'text' })
  motivo: string;

  /**
   * Cuándo ocurrió el hecho, no cuándo se registró.
   *
   * De esta fecha cuelgan los términos del trámite sancionatorio, así que un
   * hecho de marzo reportado en abril tiene que seguir siendo de marzo.
   */
  @Column({ name: 'fecha_hecho', type: 'date' })
  fechaHecho: string;

  /**
   * El soporte, cuando lo hay.
   *
   * Es opcional a propósito: un incumplimiento se constata a veces sin
   * documento a la mano —una obra que no avanza, un entregable que no llega—,
   * y exigir uno dejaría al supervisor sin poder reportar lo que está viendo.
   * Mismo criterio del cierre financiero (EFDS-1571).
   */
  @Column({ name: 'documento_id', type: 'uuid', nullable: true })
  documentoId: string | null;

  @Column({ length: 20 })
  estado: EstadoCasoIncumplimiento;

  @Column({ name: 'reportado_por', length: 200, nullable: true })
  reportadoPor: string | null;

  /**
   * Qué supervisión lo respaldaba al reportarlo.
   *
   * El supervisor de entonces puede no ser el de ahora, y el expediente tiene
   * que decir quién vigilaba el día que se constató el hecho.
   */
  @Column({ name: 'supervision_id', type: 'uuid', nullable: true })
  supervisionId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
