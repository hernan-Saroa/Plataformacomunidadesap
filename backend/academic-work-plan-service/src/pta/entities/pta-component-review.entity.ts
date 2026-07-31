import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  BeforeInsert,
  BeforeUpdate,
  Unique,
  Index,
} from 'typeorm';

@Unique(['ptaId', 'componente', 'subseccion'])
@Index(['ptaId'])
@Entity({ schema: 'academic_work_plan', name: 'PtaComponentReview' })
export class PtaComponentReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'pta_id', type: 'uuid' })
  ptaId: string;

  @Column({ name: 'componente', type: 'varchar', length: 100 })
  componente: string;

  // 'general' para componentes de revisión única (investigacion, ext_*);
  // 'pregrado'|'posgrado' para academica; 'docencia'|'academico_administrativas'
  // para complementarias.
  @Column({ name: 'subseccion', type: 'varchar', length: 50, default: 'general' })
  subseccion: string;

  @Column({ name: 'estado', type: 'varchar', length: 50, default: 'pendiente' })
  estado: string;

  @Column({ name: 'revisor_id', type: 'varchar', length: 100, nullable: true })
  revisorId: string | null;

  @Column({ name: 'revisor_nombre', type: 'varchar', length: 200, nullable: true })
  revisorNombre: string | null;

  @Column({ name: 'revisor_rol', type: 'varchar', length: 100, nullable: true })
  revisorRol: string | null;

  @Column({ name: 'comentarios', type: 'text', nullable: true })
  comentarios: string | null;

  // Respuesta del docente al reenviar tras una devolución en la etapa de revisión
  // (mismo propósito que el campo homónimo en PtaComponentApproval).
  @Column({ name: 'respuesta_docente', type: 'text', nullable: true })
  respuestaDocente: string | null;

  @Column({ name: 'fecha_revision', type: 'timestamp', nullable: true })
  fechaRevision: Date | null;

  @Column({ name: 'scope', type: 'varchar', length: 50, nullable: true })
  scope: string | null;

  @Column({ name: 'scope_id', type: 'varchar', length: 100, nullable: true })
  scopeId: string | null;

  @Column({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @BeforeInsert()
  setTimestamps() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}
