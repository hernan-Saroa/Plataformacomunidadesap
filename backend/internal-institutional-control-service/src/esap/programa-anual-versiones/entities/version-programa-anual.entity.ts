import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/** Fila del Programa Anual tal como la imprime el documento exportado. */
export interface FilaProgramaAnual {
  id: string;
  codigo: string;
  nombre: string;
  areaObjetivo: string | null;
  tipo: 'Regular' | 'Territorial' | 'Especial';
  territorial: string | null;
  responsableArea: string;
  observaciones: string;
  fechaInicio: string | null;
  fechaFinPlaneacion: string | null;
  fechaInicioEjecucion: string | null;
  fechaFinEjecucion: string | null;
  fechaInicioComunicacion: string | null;
  fechaFin: string | null;
}

export interface CambioCampo {
  campo: string;
  antes: string | null;
  despues: string | null;
}

/** Diferencia de una auditoría frente a la versión anterior. */
export interface CambioProgramaAnual {
  tipo: 'agregada' | 'eliminada' | 'modificada';
  codigo: string;
  nombre: string;
  campos?: CambioCampo[];
}

@Entity('version_programa_anual', { schema: 'control_interno' })
@Index(['vigencia', 'version'])
export class VersionProgramaAnual {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer' })
  vigencia: number;

  @Column({ type: 'integer' })
  version: number;

  @Column({ type: 'varchar', length: 64 })
  huella: string;

  @Column({ type: 'jsonb' })
  filas: FilaProgramaAnual[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  cambios: CambioProgramaAnual[];

  @Column({ type: 'text', nullable: true })
  motivo?: string | null;

  @Column({ name: 'generada_por', type: 'varchar', length: 255 })
  generadaPor: string;

  @Column({ name: 'generada_por_id', type: 'varchar', length: 64, nullable: true })
  generadaPorId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
