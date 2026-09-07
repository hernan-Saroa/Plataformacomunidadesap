import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Entidad que representa la tabla maestra de dependencias ESAP en el
 * esquema `auth` (`auth.dependencias`).
 *
 * Esta tabla es TRANSVERSAL a toda la plataforma: la consumen el módulo
 * de viáticos (cupo presupuestal de tiquetes por dependencia), el módulo
 * de estructura organizacional, el de control interno disciplinario, etc.
 *
 * Campos base (alineados con `auth.DEPENDENCIAS` en schema.sql):
 *   - ID_DEPENDENCIA     NUMERIC(11) PK
 *   - COD_DEPENDENCIA    VARCHAR(20) UNIQUE
 *   - NOM_DEPENDENCIA    VARCHAR(250)
 *   - DIR_DEPENDENCIA    VARCHAR(250)
 *   - DIR_EMAIL          VARCHAR(250)
 *   - URL_DEPENDENCIA    VARCHAR(250)
 *   - ID_GEOPOLITICA     NUMERIC(11) FK
 *   - ID_SEDE            NUMERIC(11) FK
 *   - ID_CARGO           NUMERIC(11) FK responsable
 *   - TIP_UNIDAD         NUMERIC(1)
 *   - GEN_TIP_UNIDAD     VARCHAR(6)
 *   - ID_TERCERO         NUMERIC(11) responsable
 *
 * Campos nuevos añadidos por la Opción B (migration 002_create_dependencias_campos_app.sql):
 *   - DESCRIPCION        VARCHAR(500)  (opcional, texto libre)
 *   - ACTIVO             BOOLEAN       (soft delete; default TRUE)
 *   - CREADO_EN          TIMESTAMP
 *   - ACTUALIZADO_EN     TIMESTAMP
 *
 * Codificación de convenciones:
 *   - Las columnas reales en BD son UPPER_CASE (heredadas del schema.sql).
 *   - TypeORM serializa en camelCase hacia el frontend (la plataforma
 *     usa el interceptor de transformación global en main.ts).
 */
@Entity({ name: 'dependencias', schema: 'auth' })
@Index('idx_dependencias_codigo', ['codDependencia'], { unique: true })
@Index('idx_dependencias_activo', ['activo'])
export class Dependencia {
  @PrimaryColumn({ name: 'id_dependencia', type: 'bigint' })
  idDependencia: number;

  @Column({ name: 'id_empresa', type: 'bigint', default: 1 })
  idEmpresa: number;

  @Column({ name: 'cod_dependencia', length: 20, unique: true })
  codDependencia: string;

  @Column({ name: 'nom_dependencia', length: 250 })
  nomDependencia: string;

  @Column({ name: 'dir_dependencia', type: 'varchar', length: 250, nullable: true })
  dirDependencia: string | null;

  @Column({ name: 'dir_email', type: 'varchar', length: 250, nullable: true })
  dirEmail: string | null;

  @Column({ name: 'url_dependencia', type: 'varchar', length: 250, nullable: true })
  urlDependencia: string | null;

  @Column({ name: 'id_geopolitica', type: 'bigint', nullable: true })
  idGeopolitica: number | null;

  @Column({ name: 'id_sede', type: 'bigint', nullable: true })
  idSede: number | null;

  @Column({ name: 'id_cargo', type: 'bigint', nullable: true })
  idCargo: number | null;

  @Column({ name: 'id_tercero', type: 'bigint', nullable: true })
  idTercero: number | null;

  @Column({ name: 'tip_unidad', type: 'smallint', nullable: true })
  tipUnidad: number | null;

  @Column({ name: 'gen_tip_unidad', type: 'varchar', length: 6, nullable: true, default: 'TIUORG' })
  genTipUnidad: string | null;

  @Column({ name: 'descripcion', type: 'varchar', length: 500, nullable: true })
  descripcion: string | null;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}