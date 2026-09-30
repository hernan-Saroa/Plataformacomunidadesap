import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { FormacionAcademicaEntity } from './formacion-academica.entity';
import { ExperienciaDocenteEntity } from './experiencia-docente.entity';
import { ProduccionIntelectualEntity } from './produccion-intelectual.entity';
import { SituacionAdministrativaEntity } from './situacion-administrativa.entity';
import { SoporteDocumentalEntity } from './soporte-documental.entity';
import { TarjetaRundLogEntity } from './tarjeta-rund-log.entity';

@Entity({ name: 'docente', schema: 'rund' })
export class DocenteEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id_docente' })
  idDocente: string;

  @Column({ type: 'uuid', name: 'id_persona', nullable: true })
  idPersona?: string;

  @Column({ type: 'varchar', length: 50, name: 'numero_documento' })
  numeroDocumento: string;

  @Column({ type: 'varchar', length: 20, name: 'tipo_documento', default: 'CC' })
  tipoDocumento: string;

  @Column({ type: 'varchar', length: 150, name: 'nombres' })
  nombres: string;

  @Column({ type: 'varchar', length: 150, name: 'apellidos' })
  apellidos: string;

  @Column({ type: 'varchar', length: 150, name: 'correo_institucional', nullable: true })
  correoInstitucional?: string;

  @Column({ type: 'varchar', length: 150, name: 'correo_personal', nullable: true })
  correoPersonal?: string;

  @Column({ type: 'varchar', length: 50, name: 'telefono', nullable: true })
  telefono?: string;

  @Column({ type: 'varchar', length: 50, name: 'celular', nullable: true })
  celular?: string;

  @Column({ type: 'varchar', length: 255, name: 'direccion', nullable: true })
  direccion?: string;

  @Column({ type: 'varchar', length: 10, name: 'departamento_codigo', nullable: true })
  departamentoCodigo?: string;

  @Column({ type: 'varchar', length: 100, name: 'departamento_nombre', nullable: true })
  departamentoNombre?: string;

  @Column({ type: 'varchar', length: 10, name: 'municipio_codigo', nullable: true })
  municipioCodigo?: string;

  @Column({ type: 'varchar', length: 100, name: 'municipio_nombre', nullable: true })
  municipioNombre?: string;

  @Column({ type: 'varchar', length: 50, name: 'escalafon_docente', default: 'INSTRUCTOR' })
  escalafonDocente: string;

  @Column({ type: 'varchar', length: 50, name: 'categoria_minciencias', default: 'SIN_CATEGORIA' })
  categoriaMinciencias: string;

  @Column({ type: 'varchar', length: 30, name: 'estado_rund', default: 'ACTIVO' })
  estadoRund: string;

  @Column({ type: 'varchar', length: 50, name: 'numero_tarjeta_rund', unique: true, nullable: true })
  numeroTarjetaRund?: string;

  @Column({ type: 'timestamptz', name: 'fecha_expedicion_rund', nullable: true })
  fechaExpedicionRund?: Date;

  @Column({ type: 'int', name: 'horas_semanales_max', default: 40 })
  horasSemanalesMax: number;

  @Column({ type: 'varchar', length: 50, name: 'sede_principal_id', nullable: true })
  sedePrincipalId?: string;

  @Column({ type: 'varchar', length: 150, name: 'sede_principal_nombre', nullable: true })
  sedePrincipalNombre?: string;

  @Column({ type: 'date', name: 'fecha_ingreso_esap', nullable: true })
  fechaIngresoEsap?: string;

  @Column({ type: 'boolean', name: 'es_par_evaluador', default: false })
  esParEvaluador: boolean;

  @Column({ type: 'text', name: 'foto_perfil_url', nullable: true })
  fotoPerfilUrl?: string;

  @Column({ type: 'text', name: 'observaciones', nullable: true })
  observaciones?: string;

  @Column({ type: 'jsonb', name: 'metadata', default: {} })
  metadata: Record<string, any>;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ type: 'uuid', name: 'updated_by', nullable: true })
  updatedBy?: string;

  @OneToMany(() => FormacionAcademicaEntity, (f) => f.docente)
  formaciones: FormacionAcademicaEntity[];

  @OneToMany(() => ExperienciaDocenteEntity, (e) => e.docente)
  experiencias: ExperienciaDocenteEntity[];

  @OneToMany(() => ProduccionIntelectualEntity, (p) => p.docente)
  producciones: ProduccionIntelectualEntity[];

  @OneToMany(() => SituacionAdministrativaEntity, (s) => s.docente)
  situaciones: SituacionAdministrativaEntity[];

  @OneToMany(() => SoporteDocumentalEntity, (doc) => doc.docente)
  soportes: SoporteDocumentalEntity[];

  @OneToMany(() => TarjetaRundLogEntity, (t) => t.docente)
  tarjetasLog: TarjetaRundLogEntity[];
}
