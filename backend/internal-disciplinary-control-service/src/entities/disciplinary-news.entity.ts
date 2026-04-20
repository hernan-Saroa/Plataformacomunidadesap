import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { DisciplinaryProcess } from './disciplinary-process.entity';

export enum NewsOrigin {
  ANONIMO = 'ANONIMO',
  QUEJOSO = 'QUEJOSO',
  OFICIO = 'OFICIO',
  REMISION = 'REMISION',
  POR_DETERMINAR = 'POR_DETERMINAR',
}

export enum NewsStatus {
  RADICADA = 'RADICADA',
  EN_VALORACION = 'EN_VALORACION',
  ASIGNADA = 'ASIGNADA',
  DEVUELTA = 'DEVUELTA',
  ARCHIVADA = 'ARCHIVADA',
  REMITIDA = 'REMITIDA',
  ASOCIADA = 'ASOCIADA',
}

// export interface Apoderado {
//   nombre?: string;
//   cedula?: string;
//   email?: string;
//   telefono?: string;
//   direccion?: string;
// }

export interface PersonInfo {
  nombre: string;
  cedula?: string;
  email?: string;
  cargo?: string;
  telefono?: string;
  direccion?: string;
  dependencia?: string;
  entidad?: string;
  // ✅ NUEVO: Campo opcional para almacenar información del apoderado
  // apoderado?: Apoderado;
}

@Entity('disciplinary_news')
export class DisciplinaryNews {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  radicado: string; // ND-2025-001

  @CreateDateColumn()
  fechaRecepcion: Date;

  @Column({ type: 'timestamp', nullable: true })
  fechaQueja?: Date;

   @Column({ type: 'varchar', length: 50, nullable: true })
   origen: string;

  @Column()
  territorial: string;

  @Column()
  dependenciaDenunciado: string;

  @Column({ type: 'jsonb', nullable: true })
  denunciante: PersonInfo;

  @Column({ type: 'jsonb', nullable: true })
  disciplinable: PersonInfo;

  @Column({ type: 'text' })
  hechos: string;

  @Column({ type: 'text', array: true, nullable: true })
  conductas?: string[];

   @Column({ type: 'varchar', length: 50, default: 'RADICADA' })
   estado: string;

  @Column({ type: 'text', array: true, nullable: true })
  adjuntos: string[];

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ type: 'uuid', nullable: true, name: 'radicador_id' })
  radicadorId: string | null;

  @Column({ type: 'uuid', nullable: true })
  kanbanStage: string | null;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  fechaHechos?: Date;

  @Column({ type: 'timestamp', nullable: true })
  fechaCaducidad?: Date;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  historialAuditoria: any[];

  // Relación con procesos disciplinarios
  @OneToMany(
    () => DisciplinaryProcess,
    (process) => process.news,
  )
  processes: DisciplinaryProcess[];

  // Nota: Relación con asociaciones noticia-proceso se maneja via consultas directas
  // para evitar dependencias circulares con DisciplinaryNewsProcess

  // Campos para asociar noticia a un proceso existente
  @Column({ name: 'proceso_asociado_id', type: 'uuid', nullable: true })
  procesoAsociadoId: string | null;

  @Column({ name: 'proceso_asociado_numero', type: 'varchar', length: 50, nullable: true })
  procesoAsociadoNumero: string | null;

  @Column({ name: 'proceso_asociado_fecha', type: 'timestamp', nullable: true })
  procesoAsociadoFecha: Date | null;

  @Column({ name: 'proceso_asociado_justificacion', type: 'text', nullable: true })
  procesoAsociadoJustificacion: string | null;

  // ============================================================
  // Campos para Remisión por Competencia
  // ============================================================
  @Column({ name: 'numero_rc', type: 'varchar', length: 50, nullable: true })
  numeroRC: string | null;

  @Column({ name: 'entidad_remision', type: 'varchar', length: 255, nullable: true })
  entidadRemision: string | null;

  @Column({ name: 'correo_entidad_remision', type: 'varchar', length: 255, nullable: true })
  correoEntidadRemision: string | null;

  @Column({ name: 'fecha_remision', type: 'timestamp', nullable: true })
  fechaRemision: Date | null;

  @Column({ name: 'tipo_remision', type: 'varchar', length: 100, nullable: true })
  tipoRemision: string | null;

  @Column({ name: 'justificacion_remision', type: 'text', nullable: true })
  justificacionRemision: string | null;

  @Column({ name: 'descripcion_remision', type: 'jsonb', nullable: true })
  descripcionRemision: any;
}
