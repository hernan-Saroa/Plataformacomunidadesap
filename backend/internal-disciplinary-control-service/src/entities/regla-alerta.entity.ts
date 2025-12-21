import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  Unique,
} from 'typeorm';
import { AlertaEnviada } from './alerta-enviada.entity';

@Entity('reglas_alerta', { schema: 'internal_disciplinary_control' })
@Index(['activa'])
@Unique(['nombre'])
export class ReglaAlerta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  nombre: string;

  @Column({ name: 'dias_anticipacion', type: 'int' })
  diasAnticipacion: number; // CHECK: >= 0 AND <= 30 (0 = immediate/vencido)


  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @Column({ name: 'enviar_email', type: 'boolean', default: false })
  enviarEmail: boolean;

  @Column({ name: 'mostrar_panel', type: 'boolean', default: true })
  mostrarPanel: boolean;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column('uuid', { name: 'creado_por_id', nullable: true })
  creadoPorId: string | null; // FK a personas (nullable for system-generated rules)

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion' })
  fechaActualizacion: Date;

  // Relación con alertas enviadas
  @OneToMany(() => AlertaEnviada, (alerta) => alerta.reglaAlerta)
  alertas: AlertaEnviada[];
}

