import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'academic_work_plan', name: 'HistorialEstadoPTA' })
export class HistorialEstadoPtaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ptaId', type: 'text' })
  ptaId: string;

  @Column({ name: 'estadoAnterior', type: 'text', nullable: true })
  estadoAnterior: string | null;

  @Column({ name: 'estadoNuevo', type: 'text' })
  estadoNuevo: string;

  @Column({ name: 'actorId', type: 'text', nullable: true })
  actorId: string | null;

  @Column({ name: 'actorRol', type: 'text', nullable: true })
  actorRol: string | null;

  @Column({ name: 'tipoAccion', type: 'text', nullable: true })
  tipoAccion: string | null;

  @Column({ name: 'comentarios', type: 'text', nullable: true })
  comentarios: string | null;

  @Column({ name: 'detallesTransicion', type: 'text', nullable: true })
  detallesTransicion: string | null;

  @Column({ name: 'snapshotPta', type: 'jsonb', nullable: true })
  snapshotPta: any | null;

  @Column({ name: 'version', type: 'int', nullable: true })
  version: number | null;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;
}
