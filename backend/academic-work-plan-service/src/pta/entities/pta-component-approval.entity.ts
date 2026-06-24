import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  BeforeInsert,
  BeforeUpdate,
  Unique,
  Index,
} from 'typeorm';

@Unique(['ptaId', 'componente'])
@Index(['ptaId'])
@Entity({ schema: 'academic_work_plan', name: 'PtaComponentApproval' })
export class PtaComponentApprovalEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // PlanTrabajoAcademico.id es UUID, por lo que pta_id debe ser uuid.
  @Column({ name: 'pta_id', type: 'uuid' })
  ptaId: string;

  @Column({ name: 'componente', type: 'varchar', length: 100 })
  componente: string;

  @Column({ name: 'estado', type: 'varchar', length: 50, default: 'pendiente' })
  estado: string;

  @Column({ name: 'aprobador_id', type: 'varchar', length: 100, nullable: true })
  aprobadorId: string | null;

  @Column({ name: 'aprobador_nombre', type: 'varchar', length: 200, nullable: true })
  aprobadorNombre: string | null;

  @Column({ name: 'aprobador_rol', type: 'varchar', length: 100, nullable: true })
  aprobadorRol: string | null;

  @Column({ name: 'comentarios', type: 'text', nullable: true })
  comentarios: string | null;

  @Column({ name: 'fecha_aprobacion', type: 'timestamp', nullable: true })
  fechaAprobacion: Date | null;

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
