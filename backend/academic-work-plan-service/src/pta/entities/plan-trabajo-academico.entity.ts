import { 
  Column,
  Entity,
  PrimaryGeneratedColumn,
  BeforeInsert, BeforeUpdate 
} from 'typeorm';

@Entity({ schema: 'academic_work_plan', name: 'PlanTrabajoAcademico' })
export class PlanTrabajoAcademicoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'docenteId', type: 'text' })
  docenteId: string;

  @Column({ type: 'text' })
  periodo: string;

  @Column({ type: 'text', default: 'BORRADOR' })
  estado: string;

  // OJO: es un contador COMPUESTO — se incrementa tanto en cada devolución/concertación
  // por componente dentro de un mismo ciclo de aprobación (pta.service.ts:
  // registrarDevolucionPorConcertacion, aprobarComponente) como al reabrir el PTA para
  // modificación post-cierre (HU-12, reabrirPtaParaModificacion). NO es un número de
  // versión "R01/R02" estable: tras varias concertaciones dentro del mismo ciclo puede
  // superar ampliamente el conteo real de reaperturas formales. Solo es fiable como
  // "R0X" en el instante justo de la reapertura (ver el toast en PtaBackofficeModule.tsx
  // que usa ptaReabierto.version recién calculado); no asumir que se mantiene estable
  // después de eso.
  @Column({ name: 'version', type: 'int', default: 1 })
  version: number;

  @Column({ name: 'horasTotales', type: 'int', default: 0 })
  horasTotales: number;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ name: 'motivoDevolucion', type: 'text', nullable: true })
  motivoDevolucion: string | null;

  @Column({ name: 'datosEstructurados', type: 'jsonb', nullable: true })
  datosEstructurados: any | null;

  @Column({ type: 'text', nullable: true })
  dedicacion: string | null;

  @Column({ name: 'horasAsignables', type: 'int', nullable: true })
  horasAsignables: number | null;

  @Column({ name: 'semanasVinculacion', type: 'int', nullable: true })
  semanasVinculacion: number | null;

  @Column({ name: 'tipoVinculacion', type: 'text', nullable: true })
  tipoVinculacion: string | null;

  /** Estado funcional conservado mientras el periodo del PTA está cerrado. */
  @Column({ name: 'estadoAntesCierrePeriodo', type: 'text', nullable: true })
  estadoAntesCierrePeriodo: string | null;

  /** Periodo cuya activación produjo el cierre reversible del PTA. */
  @Column({ name: 'cerradoPorPeriodo', type: 'text', nullable: true })
  cerradoPorPeriodo: string | null;

  @Column({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'updatedAt', type: 'timestamp' })
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
