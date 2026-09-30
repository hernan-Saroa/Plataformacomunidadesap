import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DocenteEntity } from './docente.entity';

@Entity({ name: 'produccion_intelectual', schema: 'rund' })
export class ProduccionIntelectualEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id_produccion' })
  idProduccion: string;

  @Column({ type: 'uuid', name: 'id_docente' })
  idDocente: string;

  @ManyToOne(() => DocenteEntity, (d) => d.producciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_docente' })
  docente: DocenteEntity;

  @Column({ type: 'varchar', length: 50, name: 'tipo_produccion' })
  tipoProduccion: string; // ARTICULO, LIBRO, CAPITULO_LIBRO, PONENCIA, PATENTE, SOFTWARE

  @Column({ type: 'varchar', length: 500, name: 'titulo' })
  titulo: string;

  @Column({ type: 'text', name: 'autores', nullable: true })
  autores?: string;

  @Column({ type: 'varchar', length: 255, name: 'revista_editorial', nullable: true })
  revistaEditorial?: string;

  @Column({ type: 'varchar', length: 50, name: 'issn_isbn', nullable: true })
  issnIsbn?: string;

  @Column({ type: 'int', name: 'ano_publicacion', nullable: true })
  anoPublicacion?: number;

  @Column({ type: 'varchar', length: 50, name: 'indexacion_tipo', nullable: true })
  indexacionTipo?: string; // SCOPUS, PUBLINDEX_A1, PUBLINDEX_A2, PUBLINDEX_B, PUBLINDEX_C, OTRO

  @Column({ type: 'text', name: 'link_doi', nullable: true })
  linkDoi?: string;

  @Column({ type: 'text', name: 'soporte_url', nullable: true })
  soporteUrl?: string;

  @Column({ type: 'varchar', length: 30, name: 'estado_validacion', default: 'PENDIENTE' })
  estadoValidacion: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
