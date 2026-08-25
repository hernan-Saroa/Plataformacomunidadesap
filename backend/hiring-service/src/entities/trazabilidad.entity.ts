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
  // Resultado de la evaluación (etapa 6): rectificar no es anular, porque el
  // resultado rectificado sigue en el expediente con su informe.
  | 'RECTIFICAR'
  // Traslado del informe de evaluación (etapa 6). Trasladar no es publicar: la
  // publicación es el medio, y lo que el traslado abre es un término.
  | 'TRASLADAR'
  | 'RESPONDER'
  // Adjudicación (etapa 7). Adjudicar es el desenlace del proceso; revocar no
  // lo borra, porque el acto pudo notificarse y publicarse.
  | 'ADJUDICAR'
  | 'REVOCAR_ACTO'
  | 'CELEBRAR'
  | 'ABRIR'
  // Declaratoria desierta (etapa 7): el otro desenlace. Tiene acción propia y
  // no reusa ANULAR, porque el proceso no se anula: termina sin contrato.
  | 'DECLARAR_DESIERTO'
  | 'REVOCAR_DECLARATORIA'
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
