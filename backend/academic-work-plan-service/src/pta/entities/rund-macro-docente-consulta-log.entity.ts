import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * REQ-RUND-F020/F022 — Bitácora inmutable (solo INSERT) de toda consulta
 * al Macro Docente: quién consultó, con qué filtros y cuántos registros
 * devolvió. Independiente de RundAprobacionLog (BR-056), que audita
 * cambios sobre el registro de UN docente, no lecturas de reportes que
 * pueden abarcar muchos docentes a la vez.
 */
@Entity({ schema: 'academic_work_plan', name: 'RundMacroDocenteConsultaLog' })
export class RundMacroDocenteConsultaLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** MACRO_DOCENTE | CONSULTA_PUNTUAL | EXTERNA */
  @Column({ name: 'tipo_consulta', type: 'text' })
  tipoConsulta: string;

  @Column({ name: 'actor_id', type: 'text' })
  actorId: string;

  @Column({ type: 'text', array: true, nullable: true })
  roles: string[] | null;

  @Column({ name: 'acceso_externo_id', type: 'uuid', nullable: true })
  accesoExternoId: string | null;

  @Column({ name: 'docente_id', type: 'text', nullable: true })
  docenteId: string | null;

  @Column({ type: 'text', nullable: true })
  periodo: string | null;

  @Column({ type: 'jsonb', nullable: true })
  filtros: Record<string, any> | null;

  @Column({ name: 'total_resultados', type: 'int', nullable: true })
  totalResultados: number | null;

  @Column({ type: 'text', nullable: true })
  ip: string | null;

  @CreateDateColumn({ name: 'createdAt', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
