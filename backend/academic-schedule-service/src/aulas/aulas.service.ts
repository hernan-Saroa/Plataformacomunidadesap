import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Aulas y su disponibilidad — EFDS-1374.
 *
 * ⚠️ RN-07 ES CONFIDENCIALIDAD, NO PRESENTACIÓN. La disponibilidad de un aula
 * dice qué franjas están ocupadas —día y hora— y nada más: ni la asignatura, ni
 * el programa, ni el docente. Otra decanatura puede tener ahí una clase de
 * posgrado que este programador no debe ver. La garantía va en el DTO del
 * backend, no en que la UI oculte campos: aquí no se seleccionan esos campos.
 *
 * ⚠️ Datos de aulas PROVISIONALES (C-4) hasta que llegue el catálogo oficial.
 */

export interface AulaDto {
  codigo: string;
  nombre: string;
  sedeCodigo: string | null;
  capacidad: number | null;
  provisional: boolean;
}

/** Franja ocupada de un aula: SOLO día y hora. Sin grupo, asignatura ni docente. */
export interface FranjaOcupadaAula {
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
}

/** Tipos válidos del espacio: el mismo conjunto cerrado del CHECK de la tabla. */
export const TIPOS_AULA = ['aula', 'auditorio'] as const;
export type TipoAula = (typeof TIPOS_AULA)[number];

export interface CrearAulaDto {
  codigo: string;
  nombre: string;
  capacidad?: number | null;
  sedeCodigo?: string | null;
  tipo?: TipoAula | null;
  piso?: number | null;
}

/** Actualización parcial: el código es la PK y no se renombra (las franjas lo referencian). */
export interface ActualizarAulaDto {
  nombre?: string;
  capacidad?: number | null;
  sedeCodigo?: string | null;
  tipo?: TipoAula | null;
  piso?: number | null;
}

@Injectable()
export class AulasService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async listar(): Promise<AulaDto[]> {
    const filas = await this.dataSource.query(
      `SELECT codigo, nombre, sede_codigo, capacidad, provisional
         FROM "academic-schedule".aula ORDER BY codigo`,
    );
    return filas.map((a: any) => ({
      codigo: a.codigo,
      nombre: a.nombre,
      sedeCodigo: a.sede_codigo ?? null,
      capacidad: a.capacidad ?? null,
      provisional: a.provisional,
    }));
  }

  /**
   * Ocupación de un aula: SOLO día y hora. La consulta no trae id_grupo,
   * asignatura ni docente a propósito (RN-07). Es imposible filtrar en el
   * cliente lo que nunca salió del servidor.
   */
  async disponibilidad(aulaCodigo: string): Promise<{ aula: string; ocupada: FranjaOcupadaAula[] }> {
    const aula = await this.dataSource.query(
      `SELECT codigo FROM "academic-schedule".aula WHERE codigo = $1`,
      [aulaCodigo],
    );
    if (!aula?.length) throw new NotFoundException(`El aula ${aulaCodigo} no existe.`);

    const ocupada = await this.dataSource.query(
      `SELECT dia_semana AS "diaSemana", hora_inicio AS "horaInicio", hora_fin AS "horaFin"
         FROM "academic-schedule".franja_horaria
        WHERE aula_codigo = $1
        ORDER BY dia_semana, hora_inicio`,
      [aulaCodigo],
    );
    return {
      aula: aulaCodigo,
      ocupada: ocupada.map((f: any) => ({
        diaSemana: f.diaSemana,
        horaInicio: String(f.horaInicio).slice(0, 5),
        horaFin: String(f.horaFin).slice(0, 5),
      })),
    };
  }

  /**
   * Publica la oferta del grupo. Exige AULA en todas sus franjas — reposición de
   * la garantía que dejó de dar el esquema cuando 1371 volvió `aula_codigo`
   * nullable (el horario se arma antes de asignar salón). Sin franjas o con
   * alguna sin aula, no se publica.
   */
  async publicarGrupo(idGrupo: string): Promise<{ publicado: boolean; publicadoEn: string }> {
    const grupo = await this.dataSource.query(
      `SELECT id_grupo FROM "academic-schedule".grupo WHERE id_grupo = $1`,
      [idGrupo],
    );
    if (!grupo?.length) throw new NotFoundException('El grupo no existe.');

    const franjas = await this.dataSource.query(
      `SELECT id_franja, aula_codigo FROM "academic-schedule".franja_horaria WHERE id_grupo = $1`,
      [idGrupo],
    );
    if (!franjas.length) {
      throw new BadRequestException('No se puede publicar un grupo sin franjas de horario.');
    }
    const sinAula = franjas.filter((f: any) => !f.aula_codigo);
    if (sinAula.length > 0) {
      throw new BadRequestException(
        `No se puede publicar: ${sinAula.length} de ${franjas.length} sesión(es) no tienen aula asignada.`,
      );
    }

    const r = await this.dataSource.query(
      `UPDATE "academic-schedule".grupo
          SET publicado_en = NOW(), estado = 'PUBLICADO', updated_at = NOW()
        WHERE id_grupo = $1
      RETURNING publicado_en`,
      [idGrupo],
    );
    return { publicado: true, publicadoEn: r[0].publicado_en };
  }

  // ─── CRUD de aulas y capacidad (EFDS-1942) ─────────────────────────────────
  //
  // Es administración del dato maestro de espacios: se exige el permiso de
  // administración en el controlador, no aquí. Un aula creada a mano NO es
  // provisional (C-4): la registra el administrador como infraestructura real,
  // por eso `provisional=false` y `origen='gestion-manual'`.

  /** Valida y normaliza los campos comunes a crear y actualizar. */
  private validarCampos(v: { nombre?: string; capacidad?: number | null; tipo?: string | null }): void {
    if (v.nombre !== undefined) {
      if (!v.nombre.trim()) throw new BadRequestException('El nombre del aula es obligatorio.');
      if (v.nombre.length > 120) throw new BadRequestException('El nombre no puede superar 120 caracteres.');
    }
    if (v.capacidad !== undefined && v.capacidad !== null) {
      if (!Number.isInteger(v.capacidad) || v.capacidad < 0) {
        throw new BadRequestException('La capacidad debe ser un entero mayor o igual a cero.');
      }
    }
    if (v.tipo !== undefined && v.tipo !== null && !TIPOS_AULA.includes(v.tipo as TipoAula)) {
      throw new BadRequestException(`El tipo debe ser uno de: ${TIPOS_AULA.join(', ')}.`);
    }
  }

  async crear(dto: CrearAulaDto): Promise<AulaDto> {
    const codigo = String(dto?.codigo ?? '').trim();
    const nombre = String(dto?.nombre ?? '').trim();
    if (!codigo) throw new BadRequestException('El código del aula es obligatorio.');
    if (codigo.length > 40) throw new BadRequestException('El código no puede superar 40 caracteres.');
    this.validarCampos({ nombre, capacidad: dto.capacidad, tipo: dto.tipo });

    const previo = await this.dataSource.query(
      `SELECT 1 FROM "academic-schedule".aula WHERE codigo = $1`, [codigo]);
    if (previo.length) throw new ConflictException(`Ya existe un aula con el código ${codigo}.`);

    const filas = await this.dataSource.query(
      `INSERT INTO "academic-schedule".aula
              (codigo, nombre, sede_codigo, capacidad, tipo, piso, provisional, origen)
       VALUES ($1, $2, $3, $4, $5, $6, false, 'gestion-manual')
       RETURNING codigo, nombre, sede_codigo, capacidad, provisional`,
      [codigo, nombre, dto.sedeCodigo ?? null, dto.capacidad ?? null, dto.tipo ?? null, dto.piso ?? null],
    );
    return this.aDto(filas[0]);
  }

  async actualizar(codigo: string, dto: ActualizarAulaDto): Promise<AulaDto> {
    const existe = await this.dataSource.query(
      `SELECT 1 FROM "academic-schedule".aula WHERE codigo = $1`, [codigo]);
    if (!existe.length) throw new NotFoundException(`El aula ${codigo} no existe.`);
    this.validarCampos({ nombre: dto.nombre, capacidad: dto.capacidad, tipo: dto.tipo });

    // Actualización parcial: solo se tocan los campos presentes en el DTO. El
    // código (PK) nunca se cambia porque las franjas lo referencian por valor.
    const sets: string[] = [];
    const params: any[] = [];
    const push = (col: string, val: any) => { params.push(val); sets.push(`${col} = $${params.length}`); };
    if (dto.nombre !== undefined) push('nombre', dto.nombre.trim());
    if (dto.capacidad !== undefined) push('capacidad', dto.capacidad);
    if (dto.sedeCodigo !== undefined) push('sede_codigo', dto.sedeCodigo);
    if (dto.tipo !== undefined) push('tipo', dto.tipo);
    if (dto.piso !== undefined) push('piso', dto.piso);
    if (sets.length === 0) throw new BadRequestException('No hay campos para actualizar.');

    params.push(codigo);
    const filas = await this.dataSource.query(
      `UPDATE "academic-schedule".aula SET ${sets.join(', ')}
        WHERE codigo = $${params.length}
      RETURNING codigo, nombre, sede_codigo, capacidad, provisional`,
      params,
    );
    return this.aDto(filas[0]);
  }

  /**
   * Elimina un aula. GUARDA: no se borra un aula referenciada por alguna franja
   * —no hay FK que lo impida (aula_codigo es texto), así que se verifica a mano—.
   * Borrarla dejaría franjas apuntando a un salón inexistente.
   */
  async eliminar(codigo: string): Promise<{ eliminado: true }> {
    const existe = await this.dataSource.query(
      `SELECT 1 FROM "academic-schedule".aula WHERE codigo = $1`, [codigo]);
    if (!existe.length) throw new NotFoundException(`El aula ${codigo} no existe.`);

    const refs = await this.dataSource.query(
      `SELECT COUNT(*)::int AS n FROM "academic-schedule".franja_horaria WHERE aula_codigo = $1`,
      [codigo],
    );
    if (refs[0].n > 0) {
      throw new ConflictException(
        `No se puede eliminar el aula ${codigo}: ${refs[0].n} franja(s) la tienen asignada.`,
      );
    }

    await this.dataSource.query(`DELETE FROM "academic-schedule".aula WHERE codigo = $1`, [codigo]);
    return { eliminado: true };
  }

  private aDto(a: any): AulaDto {
    return {
      codigo: a.codigo,
      nombre: a.nombre,
      sedeCodigo: a.sede_codigo ?? null,
      capacidad: a.capacidad ?? null,
      provisional: a.provisional,
    };
  }
}
