import { Column, Entity, PrimaryGeneratedColumn, BeforeInsert, Index } from 'typeorm';

@Index(['ptaId'])
@Index(['docenteId'])
@Index(['sistemaOrigen'])
@Index(['createdAt'])
@Entity({ schema: 'academic_work_plan', name: 'PtaEvento' })
export class PtaEventoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ptaId', type: 'text' })
  ptaId: string;

  @Column({ name: 'docenteId', type: 'text', nullable: true })
  docenteId: string | null;

  @Column({ name: 'docenteNombre', type: 'text', nullable: true })
  docenteNombre: string | null;

  // cambio_estado | notificacion | respuesta_docente | escalamiento | edicion_admin | guardado
  @Column({ name: 'tipo', type: 'text' })
  tipo: string;

  @Column({ name: 'estadoAnterior', type: 'text', nullable: true })
  estadoAnterior: string | null;

  @Column({ name: 'estadoNuevo', type: 'text', nullable: true })
  estadoNuevo: string | null;

  @Column({ name: 'actor', type: 'text', nullable: true })
  actor: string | null;

  @Column({ name: 'actorRol', type: 'text', nullable: true })
  actorRol: string | null;

  // backoffice | portal
  @Column({ name: 'sistemaOrigen', type: 'text', default: 'sistema' })
  sistemaOrigen: string;

  @Column({ name: 'mensaje', type: 'text', nullable: true })
  mensaje: string | null;

  @Column({ name: 'leidoBackoffice', type: 'boolean', default: false })
  leidoBackoffice: boolean;

  @Column({ name: 'leidoPortal', type: 'boolean', default: false })
  leidoPortal: boolean;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: any | null;

  @Column({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @BeforeInsert()
  setTimestamp() {
    this.createdAt = new Date();
  }
}
