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
 * Aprobación del componente `academica_territorial` desagregada por territorial
 * Y por nivel (pregrado/posgrado): cuando un PTA tiene asignaturas dictadas en
 * 2+ Direcciones Territoriales distintas (ej. Antioquia y Bolívar), o mezcla
 * pregrado y posgrado dentro de la misma territorial, cada combinación
 * (territorial, nivel) se aprueba/devuelve de forma independiente. Ver
 * assertAlcanceTerritorial y aprobarComponenteTerritorialParcial en pta.service.ts.
 *
 * La fila única por componente en PtaComponentApproval sigue existiendo y se
 * consolida (aprobado) solo cuando TODAS las filas (territorial, nivel) de esta
 * tabla quedan en 'aprobado'.
 */
@Unique(['ptaId', 'componente', 'territorialId', 'nivel'])
@Index(['ptaId'])
@Entity({ schema: 'academic_work_plan', name: 'PtaTerritorialApproval' })
export class PtaTerritorialApprovalEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // PlanTrabajoAcademico.id es TEXT (gen_random_uuid()::text), no uuid.
  @Column({ name: 'pta_id', type: 'text' })
  ptaId: string;

  // EFDS-1353: qué componente territorial aprueba esta fila
  // ('academica_territorial' | 'complementarias_territorial'). Sin esta columna,
  // la Docencia y la Complementaria de una misma territorial/nivel colisionarían
  // en la misma fila (migración 401).
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

  // pendiente | aprobado | devuelto
  @Column({ name: 'estado', type: 'varchar', length: 50, default: 'pendiente' })
  estado: string;

  @Column({ name: 'actor_id', type: 'varchar', length: 100, nullable: true })
  actorId: string | null;

  @Column({ name: 'actor_nombre', type: 'varchar', length: 200, nullable: true })
  actorNombre: string | null;

  @Column({ name: 'actor_rol', type: 'varchar', length: 100, nullable: true })
  actorRol: string | null;

  @Column({ name: 'comentarios', type: 'text', nullable: true })
  comentarios: string | null;

  @Column({ name: 'fecha_decision', type: 'timestamp', nullable: true })
  fechaDecision: Date | null;

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
