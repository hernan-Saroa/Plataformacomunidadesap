import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  BeforeInsert,
  BeforeUpdate,
  Index,
  Unique,
} from 'typeorm';

/**
 * Revisión (preaprobación) del componente `academica_territorial` desagregada
 * por territorial y por nivel (pregrado/posgrado): espejo de
 * PtaTerritorialApprovalEntity para la etapa de Revisión. Antes de esta tabla,
 * revisarComponente exigía que el revisor tuviera alcance sobre TODAS las
 * territoriales/niveles del PTA antes de poder marcar "revisado" — bloqueo
 * total en vez de partición. Ver revisarComponenteTerritorialParcial en
 * pta.service.ts.
 *
 * La fila única por componente en PtaComponentReview sigue existiendo y solo se
 * considera "revisado" en su totalidad cuando TODAS las filas (territorial,
 * nivel) de esta tabla quedan en 'revisado'.
 */
@Unique(['ptaId', 'componente', 'territorialId', 'nivel'])
@Index(['ptaId'])
@Entity({ schema: 'academic_work_plan', name: 'PtaTerritorialReview' })
export class PtaTerritorialReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // PlanTrabajoAcademico.id es TEXT (gen_random_uuid()::text), no uuid.
  @Column({ name: 'pta_id', type: 'text' })
  ptaId: string;

  // EFDS-1353: espejo de PtaTerritorialApproval.componente — distingue la
  // revisión de Docencia territorial de la de Complementarias territoriales
  // (migración 401).
  @Column({ name: 'componente', type: 'varchar', length: 60, default: 'academica_territorial' })
  componente: string;

  @Column({ name: 'territorial_id', type: 'text' })
  territorialId: string;

  @Column({ name: 'territorial_nombre', type: 'text', nullable: true })
  territorialNombre: string | null;

  // 'pregrado' | 'posgrado' — mismo criterio de clasificación que ya usa
  // clasificarAsignaturasDocencia para Sede Central (programa.tipo).
  @Column({ name: 'nivel', type: 'varchar', length: 20, default: 'pregrado' })
  nivel: string;

  // pendiente | revisado | devuelto
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

  @Column({ name: 'fecha_revision', type: 'timestamp', nullable: true })
  fechaRevision: Date | null;

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
