import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type AccionTraza =
  | 'CREAR'
  | 'GUARDAR'
  | 'ENVIAR'
  | 'ADJUNTAR'
  | 'APROBAR'
  | 'DEVOLVER'
  // Ciclo del CDP (etapa 4). La columna es varchar, así que ampliar esta
  // unión no exige migración.
  | 'SOLICITAR'
  | 'VERIFICAR'
  | 'EXPEDIR'
  | 'RECHAZAR'
  // Publicación del proyecto de pliego (etapa 5).
  | 'PUBLICAR'
  | 'ANULAR'
  // Recepción de ofertas (etapa 6).
  | 'CERRAR'
  | 'RETIRAR'
  // Designación del comité evaluador (etapa 6).
  | 'DESIGNAR'
  | 'REVOCAR'
  // Contrato electrónico y legalización (etapa 8).
  | 'ACEPTAR'
  | 'FIRMAR'
  | 'LEGALIZAR';

@Entity('trazabilidad', { schema: 'hiring' })
export class Trazabilidad {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ name: 'proceso_id', type: 'uuid', nullable: true })
  procesoId: string;

  @Column({ length: 80 })
  entidad: string;

  @Column({ name: 'entidad_id', type: 'uuid', nullable: true })
  entidadId: string;

  @Column({ length: 60 })
  accion: AccionTraza;

  @Column({ type: 'jsonb', nullable: true })
  detalle: Record<string, any>;

  @Column({ name: 'usuario_id', length: 120, nullable: true })
  usuarioId: string;

  @Column({ name: 'usuario_nombre', length: 200, nullable: true })
  usuarioNombre: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
