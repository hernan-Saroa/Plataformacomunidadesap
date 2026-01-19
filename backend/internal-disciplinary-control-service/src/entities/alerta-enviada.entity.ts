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
import { LegalAuto } from './legal-auto.entity';
import { DisciplinaryNews } from './disciplinary-news.entity';

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

  // -- TÉRMINOS (Opcional) --
  @Column('uuid', { name: 'termino_id', nullable: true })
  terminoId: string | null;

  @ManyToOne(() => TerminoProcesal, (termino) => termino.alertas, { nullable: true })
  @JoinColumn({ name: 'termino_id' })
  termino: TerminoProcesal | null;

  @Column('uuid', { name: 'regla_alerta_id', nullable: true })
  reglaAlertaId: string | null;

  @ManyToOne(() => ReglaAlerta, (regla) => regla.alertas, { nullable: true })
  @JoinColumn({ name: 'regla_alerta_id' })
  reglaAlerta: ReglaAlerta | null;

  // -- AUTOS (Opcional) --
  @Column('uuid', { name: 'auto_id', nullable: true })
  autoId: string | null;

  @ManyToOne(() => LegalAuto, { nullable: true })
  @JoinColumn({ name: 'auto_id' })
  auto: LegalAuto | null;

  // -- NOTICIAS DISCIPLINARIAS (Opcional) --
  @Column('uuid', { name: 'news_id', nullable: true })
  newsId: string | null;

  @ManyToOne(() => DisciplinaryNews, { nullable: true })
  @JoinColumn({ name: 'news_id' })
  news: DisciplinaryNews | null;

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

