import { Entity, PrimaryColumn, Column } from 'typeorm';

/**
 * Vista de SOLO LECTURA del catálogo de programas, cuyo dueño es
 * `academic_work_plan` (academic-work-plan-service / auth-service).
 *
 * Este microservicio comparte instancia de base de datos (DB_NAME=esap_db), así
 * que lee el catálogo directamente en vez de replicarlo. RN-01/RN-02 declaran
 * estos datos autoritativos del SNIES: replicarlos crearía una segunda fuente de
 * verdad, que es justo el patrón que ya costó los bugs EFDS-1536 y EFDS-1539.
 *
 * NUNCA escribir por aquí: `synchronize` está apagado y el dueño del esquema es
 * otro servicio. Solo se exponen los campos que necesita la programación.
 */
@Entity({ schema: 'academic_work_plan', name: 'programa' })
export class ProgramaCatalogoEntity {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 20 })
  codigo: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  /** 'pregrado' | 'tecnico_profesional' | 'tecnologico' | 'especializacion' | 'maestria' | 'doctorado' */
  @Column({ type: 'varchar', length: 20 })
  tipo: string;

  @Column({ type: 'varchar', length: 20 })
  modalidad: string;

  @Column({ name: 'horas_base_por_credito', type: 'int', default: 16 })
  horasBasePorCredito: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
