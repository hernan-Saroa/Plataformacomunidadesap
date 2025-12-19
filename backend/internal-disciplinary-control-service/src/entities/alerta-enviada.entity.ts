import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TerminoProcesal } from './termino-procesal.entity';
import { ReglaAlerta } from './regla-alerta.entity';

export enum TipoAlerta {
  EMAIL = 'email',
  VISUAL = 'visual',
  SISTEMA = 'sistema',
}

export enum EstadoAlerta {
  ENVIADA = 'enviada',
  PENDIENTE = 'pendiente',
  ERROR = 'error',
}

@Entity('alertas_enviadas', { schema: 'internal_disciplinary_control' })
@Index(['terminoId'])
@Index(['reglaAlertaId'])
@Index(['estado'])
@Index(['fechaEnvio'])
export class AlertaEnviada {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'termino_id' })
  terminoId: string;

  @ManyToOne(() => TerminoProcesal, (termino) => termino.alertas, { nullable: false })
  @JoinColumn({ name: 'termino_id' })
  termino: TerminoProcesal;

  @Column('uuid', { name: 'regla_alerta_id' })
  reglaAlertaId: string;

  @ManyToOne(() => ReglaAlerta, (regla) => regla.alertas, { nullable: false })
  @JoinColumn({ name: 'regla_alerta_id' })
  reglaAlerta: ReglaAlerta;

  @Column({
    type: 'enum',
    enum: TipoAlerta,
  })
  tipo: TipoAlerta;

  @Column({ type: 'varchar', length: 200 })
  destinatario: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  asunto: string | null;

  @Column({ type: 'text', nullable: true })
  mensaje: string | null;

  @Column({
    type: 'enum',
    enum: EstadoAlerta,
    default: EstadoAlerta.PENDIENTE,
  })
  estado: EstadoAlerta;

  @CreateDateColumn({ name: 'fecha_envio' })
  fechaEnvio: Date;

  @Column({ type: 'timestamp', name: 'fecha_lectura', nullable: true })
  fechaLectura: Date | null; // Si es visual

  @Column({ type: 'text', name: 'error_mensaje', nullable: true })
  errorMensaje: string | null; // Si estado = 'error'

  @Column('uuid', { name: 'creado_por_id', nullable: true })
  creadoPorId: string | null; // Sistema si es automático, usuario si es manual

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;
}

