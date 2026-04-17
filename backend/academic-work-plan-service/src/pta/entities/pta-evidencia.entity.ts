import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'academic_work_plan', name: 'PtaEvidencia' })
export class PtaEvidenciaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ptaId', type: 'text' })
  ptaId: string;

  @Column({ name: 'nombre', type: 'text' })
  nombre: string;

  @Column({ name: 'tipoArchivo', type: 'text' })
  tipoArchivo: string;

  @Column({ name: 'tamanioBytes', type: 'int', default: 0 })
  tamanioBytes: number;

  @Column({ name: 'categoria', type: 'text', nullable: true })
  categoria: string | null;

  @Column({ name: 'componentePta', type: 'text', nullable: true })
  componentePta: string | null;

  @Column({ name: 'horasAvance', type: 'int', default: 0 })
  horasAvance: number;

  @Column({ name: 'storageUrl', type: 'text', nullable: true })
  storageUrl: string | null;

  @Column({ name: 'subidoPor', type: 'text', nullable: true })
  subidoPor: string | null;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ name: 'estado', type: 'text', default: 'activo' })
  estado: string;

  @Column({ name: 'estadoRevision', type: 'text', default: 'pendiente' })
  estadoRevision: string;

  @Column({ name: 'revisadoPor', type: 'text', nullable: true })
  revisadoPor: string | null;

  @Column({ name: 'comentarioRevision', type: 'text', nullable: true })
  comentarioRevision: string | null;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamptz' })
  updatedAt: Date;
}
