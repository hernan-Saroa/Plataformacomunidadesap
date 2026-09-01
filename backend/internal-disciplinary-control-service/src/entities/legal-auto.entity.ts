import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { DisciplinaryProcess } from './disciplinary-process.entity';
import { AutoVersion } from './auto-version.entity';

// AutoType enum for validation (legacy types kept for compatibility)
export enum AutoType {
  // Core types
  AUTO_NORMAL = 'AUTO_NORMAL',
  AUTO_ARCHIVO = 'AUTO_ARCHIVO',
  AUTO_PRORROGA = 'AUTO_PRORROGA',
  AUTO_FORMULACION_PLIEGO = 'AUTO_FORMULACION_PLIEGO',
  // Dynamic apertura types will be validated by pattern
  AUTO_APERTURA = 'AUTO_APERTURA', // Base type for validation

  // Legacy types (keeping for compatibility)
  AUTO_INDAGACION_PRELIMINAR = 'AUTO_INDAGACION_PRELIMINAR',
  AUTO_APERTURA_INVESTIGACION = 'AUTO_APERTURA_INVESTIGACION',
  AUTO_CIERRE = 'AUTO_CIERRE',
  FALLO_SANCION = 'FALLO_SANCION',
  FALLO_ABSOLUTORIO = 'FALLO_ABSOLUTORIO',
  PLIEGO_CARGOS = 'PLIEGO_CARGOS',
  AUTO_APERTURA_INDAGACION = 'AUTO_APERTURA_INDAGACION',
  RESOLUCION = 'RESOLUCION',
  AUTO_NO_PREVISTO = 'AUTO_NO_PREVISTO',
}

/**
 * Valida si un tipo de auto es válido (incluyendo tipos dinámicos)
 */
export function isValidAutoType(tipo: string): boolean {
  // Tipos estáticos
  const staticTypes = Object.values(AutoType);
  if (staticTypes.includes(tipo as AutoType)) {
    return true;
  }

  // Tipos dinámicos de apertura: AUTO_APERTURA_{NOMBRE_ETAPA}
  if (tipo.startsWith('AUTO_APERTURA_')) {
    // Validar que tenga al menos un carácter después del prefijo
    const etapaPart = tipo.substring('AUTO_APERTURA_'.length);
    return etapaPart.length > 0 && /^[A-Z_]+$/.test(etapaPart);
  }

  return false;
}

export enum AutoStatus {
  BORRADOR = 'BORRADOR',
  REVISION_JEFE = 'REVISION_JEFE',
  APROBADO = 'APROBADO',
  DEVUELTO = 'DEVUELTO',
  FIRMADO = 'FIRMADO',
  NOTIFICADO = 'NOTIFICADO',
}

@Entity('legal_autos')
export class LegalAuto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DisciplinaryProcess, (process) => process.autos, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'processId' })
  process: DisciplinaryProcess;

  @Column('uuid')
  processId: string;

  @Column({ type: 'varchar', length: 100 })
  tipo: string;

  @Column('uuid', { nullable: true })
  autoConfigurationId: string | null; // Plantilla exacta (autos_configuration.id) usada al crear el auto

  @Column({ type: 'varchar', length: 150, nullable: true })
  numero: string;

  @Column({ type: 'text' })
  contenido: string; // HTML/Rich Text

  @Column({
    type: 'enum',
    enum: AutoStatus,
    default: AutoStatus.BORRADOR,
  })
  estado: AutoStatus;

  @Column({ type: 'text', nullable: true })
  firmaUrl: string; // URL del PDF firmado

  @Column({ type: 'text', nullable: true })
  documentUrl: string;

  @Column({ type: 'text', nullable: true })
  documentName: string;

  @Column({ type: 'text', nullable: true })
  documentType: string;

  @Column({ type: 'int', nullable: true })
  documentSize: number;

  @Column({ type: 'timestamp', nullable: true })
  notificationDate: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  etapaDestino: string;

  // EFDS-1564: etapa en la que estaba el proceso justo antes de aprobar este auto.
  // Solo se guarda si la aprobacion efectivamente cambio la etapa; sirve para que
  // "Reversar aprobacion" devuelva el proceso a esa etapa.
  @Column({ type: 'varchar', length: 100, nullable: true })
  etapaPreviaAprobacion: string | null;

  @Column({ type: 'text', nullable: true })
  notificationEvidence: string; // URL del archivo de prueba de notificación

  @Column({ type: 'text', nullable: true })
  comentarios: string;

  @Column({ type: 'text', nullable: true })
  rejection_comments: string;

  @Column({ type: 'int', nullable: true })
  prorrogaMeses: number | null; // 3 o 6 — Solo aplica para AUTO_PRORROGA

  @Column({ type: 'timestamp', nullable: true })
  fechaVencimientoAnterior: Date | null; // Registro para historial de prórroga

  @Column({ type: 'timestamp', nullable: true })
  fechaVencimientoNueva: Date | null; // Registro para historial de prórroga

  @Column('uuid', { nullable: true })
  aprobadoPorId: string; // ID del jefe que aprobó

  @CreateDateColumn()
  createdAt: Date;



  @Column({ type: 'int', default: 1 })
  currentVersion: number;

  @OneToMany(() => AutoVersion, (version) => version.auto)
  versions: AutoVersion[];

  @UpdateDateColumn()
  updatedAt: Date;
}
