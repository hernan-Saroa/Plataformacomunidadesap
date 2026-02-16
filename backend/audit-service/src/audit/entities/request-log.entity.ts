import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('request_logs', { schema: 'audit' })
@Index(['timestamp'])
@Index(['method'])
@Index(['module'])
@Index(['action'])
@Index(['userId'])
@Index(['ipAddress'])
@Index(['statusCode'])
export class RequestLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10 })
  method: string; // GET, POST, PUT, DELETE, PATCH

  @Column({ type: 'text' })
  url: string;

  @Column({ type: 'text' })
  path: string;

  @Column({ name: 'query_params', type: 'jsonb', nullable: true })
  queryParams?: any;

  @Column({ type: 'varchar', length: 100, nullable: true })
  module?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  submodule?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  action?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  version?: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'text', nullable: true })
  origin?: string;

  @Column({ type: 'text', nullable: true })
  referer?: string;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId?: number;

  @Column({ name: 'user_email', type: 'varchar', length: 255, nullable: true })
  userEmail?: string;

  @Column({ name: 'user_role', type: 'varchar', length: 100, nullable: true })
  userRole?: string;

  @Column({ name: 'status_code', type: 'integer' })
  statusCode: number;

  @Column({ name: 'response_time_ms', type: 'integer' })
  responseTimeMs: number;

  @Column({ name: 'response_size_bytes', type: 'integer', default: 0 })
  responseSizeBytes: number;

  @Column({ name: 'request_body', type: 'jsonb', nullable: true })
  requestBody?: any;

  @Column({ name: 'request_body_size', type: 'integer', default: 0 })
  requestBodySize: number;

  @Column({ name: 'has_large_body', type: 'boolean', default: false })
  hasLargeBody: boolean;

  @Column({ name: 'response_body', type: 'jsonb', nullable: true })
  responseBody?: any;

  @Column({ name: 'response_body_size', type: 'integer', default: 0 })
  responseBodySize: number;

  @Column({ name: 'has_large_response', type: 'boolean', default: false })
  hasLargeResponse: boolean;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ name: 'error_stack', type: 'text', nullable: true })
  errorStack?: string;

  // Campos para tracking de cambios (datos viejos y nuevos)
  @Column({ name: 'entity_name', type: 'varchar', length: 100, nullable: true })
  entityName?: string; // Nombre de la entidad/tabla modificada

  @Column({ name: 'entity_id', type: 'varchar', length: 100, nullable: true })
  entityId?: string; // ID del registro modificado

  @Column({ name: 'previous_data', type: 'jsonb', nullable: true })
  previousData?: any; // Datos ANTES de la modificación (payload viejo)

  @Column({ name: 'new_data', type: 'jsonb', nullable: true })
  newData?: any; // Datos DESPUÉS de la modificación (payload nuevo)

  @Column({ name: 'changes', type: 'jsonb', nullable: true })
  changes?: Array<{
    field: string;        // Nombre del campo
    oldValue: any;        // Valor anterior
    newValue: any;        // Valor nuevo
  }>; // Resumen de cambios específicos

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

