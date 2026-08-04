import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ schema: 'academic_work_plan', name: 'programa' })
export class ProgramaAcademico {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ name: 'nombre_excel', type: 'varchar', length: 100 })
  nombreExcel: string;

  @Column({ name: 'nombre_corto', type: 'varchar', length: 30 })
  nombreCorto: string;

  @Column({ name: 'id_facultad', type: 'bigint' })
  idFacultad: string;

  @Column({ type: 'varchar', length: 20 })
  tipo: string; // 'pregrado' | 'especializacion' | 'maestria'

  @Column({ type: 'varchar', length: 20 })
  modalidad: string; // 'presencial' | 'distancia' | 'mixto'

  @Column({ name: 'horas_base_por_credito', type: 'int', default: 16 })
  horasBasePorCredito: number;

  @Column({ name: 'horas_pregrado_central', type: 'int', nullable: true })
  horasPregradoCentral: number | null;

  @Column({ name: 'categoria_horas_circular003', type: 'varchar', length: 50, nullable: true })
  categoriaHorasCircular003: string | null;

  @Column({ name: 'descripcion_categoria_circular003', type: 'text', nullable: true })
  descripcionCategoriaCircular003: string | null;

  @Column({ name: 'horas_pta_referencia_circular003', type: 'varchar', length: 150, nullable: true })
  horasPtaReferenciaCircular003: string | null;

  @Column({ name: 'formula_calculo_horas', type: 'text', nullable: true })
  formulaCalculoHoras: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'created_at', type: 'timestamp without time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp without time zone', nullable: true })
  updatedAt: Date | null;

  // Compatibility fields for the frontend (simulating the old schema columns)
  estado?: string;
  nivelFormacion?: string;
  descripcion?: string;
  duracion?: number;
  creditos?: number;
  sede?: string;
  facultad?: string;
  totalAsignaturas?: number;
  creditosPlan?: number;
}

