import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Un puesto del proceso (migración 109): un lugar que ocupa una persona,
 * como «Abogado», «Segundo abogado» o «Jefe».
 *
 * No es un rol. El rol dice quién PUEDE hacer algo en cualquier proceso; el
 * puesto dice quién lo HACE en este. Los crea y los nombra la Dirección en
 * Configuración, y las actividades apuntan a ellos para decir quién las hace o
 * quién aprueba un escalón. Así, cuando el área cambia de idea sobre quién
 * lleva qué, cambia la configuración y no el código.
 */
@Entity('puestos_proceso', { schema: 'hiring' })
export class PuestoProceso {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  /** Si un proceso recibido sin nadie en este puesto genera alerta. */
  @Column({ default: false })
  obligatorio: boolean;

  @Column({ type: 'int', default: 100 })
  orden: number;

  /** Archivado y no borrado: los procesos viejos lo nombran. */
  @Column({ default: true })
  activo: boolean;

  @Column({ name: 'created_by', length: 200, nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_by', length: 200, nullable: true })
  updatedBy: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

/**
 * Quién ocupa un puesto en un proceso. Cambiar es relevar con motivo: quien
 * lo ocupó hasta hoy respondió por lo que hizo.
 */
@Entity('asignaciones_puesto', { schema: 'hiring' })
export class AsignacionPuesto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id', type: 'uuid' })
  procesoId: string;

  @Column({ name: 'puesto_id', type: 'uuid' })
  puestoId: string;

  @Column({ name: 'usuario_id', type: 'uuid' })
  usuarioId: string;

  @Column({ name: 'usuario_nombre', length: 120 })
  usuarioNombre: string;

  @Column({ name: 'persona_id', type: 'uuid', nullable: true })
  personaId: string | null;

  @Column({ length: 200 })
  nombre: string;

  @Column({ length: 10, default: 'VIGENTE' })
  estado: 'VIGENTE' | 'RELEVADO';

  @Column({ name: 'asignado_por', length: 200, nullable: true })
  asignadoPor: string | null;

  @CreateDateColumn({ name: 'asignado_at', type: 'timestamptz' })
  asignadoAt: Date;

  @Column({ name: 'relevado_at', type: 'timestamptz', nullable: true })
  relevadoAt: Date | null;

  @Column({ name: 'relevado_por', length: 200, nullable: true })
  relevadoPor: string | null;

  @Column({ name: 'motivo_relevo', type: 'text', nullable: true })
  motivoRelevo: string | null;
}

export const ENTIDADES_PUESTOS = [PuestoProceso, AsignacionPuesto];
