import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CarpetaDigital } from './carpeta-digital.entity';

@Entity('tipo_documento')
export class TipoDocumento {
  @PrimaryGeneratedColumn('uuid', { name: 'id_tipo_documento' })
  id: string;

  @Column({ name: 'carpeta_digital_id', type: 'uuid', nullable: true })
  carpetaDigitalId: string | null;

  @ManyToOne(() => CarpetaDigital, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'carpeta_digital_id' })
  carpetaDigital: CarpetaDigital | null;

  @Column({ name: 'nombre', type: 'varchar', length: 150 })
  nombre: string;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ name: 'categoria', type: 'varchar', length: 80, default: 'otros' })
  categoria: string;

  @Column({ name: 'icono', type: 'varchar', length: 80, default: 'file-text' })
  icono: string;

  @Column({ name: 'color', type: 'varchar', length: 20, default: '#2962FF' })
  color: string;

  @Column({ name: 'obligatorio', type: 'boolean', default: false })
  obligatorio: boolean;

  @Column({ name: 'requiere_validacion', type: 'boolean', default: true })
  requiereValidacion: boolean;

  @Column({ name: 'formatos_permitidos', type: 'text', array: true, default: () => "ARRAY['pdf']::text[]" })
  formatosPermitidos: string[];

  @Column({ name: 'tamano_max_mb', type: 'int', default: 10 })
  tamanoMaxMb: number;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'es_sistema', type: 'boolean', default: false })
  esSistema: boolean;

  @Column({ name: 'rol_validador', type: 'varchar', length: 120, nullable: true })
  rolValidador: string | null;

  @Column({ name: 'orden', type: 'int', default: 0 })
  orden: number;

  @Column({ name: 'asignacion_tipo', type: 'varchar', length: 40, default: 'todos' })
  asignacionTipo: string;

  @Column({ name: 'asignacion_valor', type: 'varchar', length: 255, nullable: true })
  asignacionValor: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
