import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { EntregaInformeLey } from './entrega-informe-ley.entity';

@Entity('datos_automaticos_informe', { schema: 'control_interno' })
@Index(['entregaId'])
@Index(['tipoDato'])
export class DatosAutomaticosInforme {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'entrega_id', nullable: false })
  entregaId: string;

  @ManyToOne(() => EntregaInformeLey, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entrega_id' })
  entrega: EntregaInformeLey;

  @Column({ type: 'varchar', length: 100, name: 'tipo_dato', nullable: false })
  tipoDato: string; // 'auditorias', 'planes_mejoramiento', 'indicadores', 'hallazgos', etc.

  @Column({ type: 'jsonb', nullable: false, default: {} })
  datos: Record<string, any>;

  @Column({ type: 'timestamp', name: 'fecha_generacion', default: () => 'CURRENT_TIMESTAMP' })
  fechaGeneracion: Date;

  @Column({ type: 'varchar', length: 255, name: 'fuente_datos', nullable: true })
  fuenteDatos?: string; // 'sistema', 'api_externa', 'manual'

  @Column({ type: 'varchar', length: 50, name: 'version_datos', default: '1.0' })
  versionDatos: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
