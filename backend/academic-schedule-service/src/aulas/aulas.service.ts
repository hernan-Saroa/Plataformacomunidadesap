import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import {
  cargarFranjasCruceables, ciclosSeSolapan, cicloDelGrupo, cicloDelPeriodo, type CicloFechas,
} from '../horarios/choque.js';
import { parsearPeriodo } from '../periodos/periodo-ref.js';

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

/** Aula con su ubicación (territorial y CETAP) y, si se filtró por oferta, la oferta que le corresponde. */
export interface AulaConUbicacionDto extends AulaDto {
  tipo: string | null;
  piso: number | null;
  territorial: { codigo: string; nombre: string | null } | null;
  cetap: { codigo: string; nombre: string | null } | null;
  /** Id de la oferta CETAP (programa + CETAP + periodo) que se deduce al elegir esta aula; null sin filtro de oferta. */
  idOfertaCetap: string | null;
}

export interface FiltroAulas {
  cetap?: string;
  grupo?: string;
  asignatura?: string;
  periodo?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  /** Código de la territorial (DT-xxx). Se elige de un selector, no se escribe. */
  sedeCodigo?: string | null;
  /** Código del CETAP (CET-xxxx), filtrado por la territorial. Selector, no texto. */
  codigoCetap?: string | null;
  tipo?: TipoAula | null;
  piso?: number | null;
}

export interface TerritorialDto { id: number; codigo: string; nombre: string; }
export interface CetapDto { codigo: string; nombre: string; }

/** Actualización parcial: el código es la PK y no se renombra (las franjas lo referencian). */
export interface ActualizarAulaDto {
  nombre?: string;
  capacidad?: number | null;
  sedeCodigo?: string | null;
  codigoCetap?: string | null;
  tipo?: TipoAula | null;
  piso?: number | null;
}

@Injectable()
export class AulasService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Territoriales activas para el selector del formulario de aulas (§3.3). */
  async territoriales(): Promise<TerritorialDto[]> {
    return this.dataSource.query(
      `SELECT id, codigo, nombre FROM academic_work_plan.direccion_territorial
        WHERE activo = true ORDER BY orden_visualizacion, nombre`,
    );
  }

  /**
   * CETAPs de una territorial, para el selector encadenado (§3.3). Sin
   * territorial devuelve vacío: el CETAP siempre se elige dentro de su
   * territorial, nunca se escribe a mano.
   */
  async cetaps(idDireccionTerritorial: number): Promise<CetapDto[]> {
    if (!idDireccionTerritorial) return [];
    return this.dataSource.query(
      `SELECT codigo, nombre FROM academic_work_plan.cetap
        WHERE id_direccion_territorial = $1 AND activo = true
        ORDER BY nombre`,
      [idDireccionTerritorial],
    );
  }

  /**
   * Aulas con su territorial y CETAP, y —si se pide— SOLO las que sirven para una oferta.
   *
   * Filtros (todos opcionales, combinables):
   *   · `cetap`  — código del CETAP (CET-xxxx).
   *   · `grupo`  — las aulas válidas para ese grupo: si el grupo ya tiene oferta, las de su
   *                CETAP; si no, las de los CETAP que tienen oferta activa del programa de
   *                su asignatura en su periodo.
   *   · `asignatura` + `periodo` — lo mismo cuando el grupo todavía no existe.
   * Con `grupo` o `asignatura`+`periodo`, cada aula trae `idOfertaCetap`: como hay UNA
   * oferta por programa, CETAP y periodo, elegir el aula deduce la oferta. Sin esos
   * filtros el campo es null y la lista es la de siempre (aditivo).
   *
   * Una lista vacía con filtro de oferta significa «ninguna aula es válida»: el
   * servidor rechaza las demás al guardar, así que no se ofrecen.
   */
  async listar(filtros: FiltroAulas = {}): Promise<AulaConUbicacionDto[]> {
    const ofertaPorCetap = await this.ofertasParaFiltro(filtros);
    const params: any[] = [];
    const condiciones: string[] = [];
    if (filtros.cetap) {
      params.push(String(filtros.cetap).trim());
      condiciones.push(`au.codigo_cetap = $${params.length}`);
    }
    if (ofertaPorCetap) {
      params.push([...ofertaPorCetap.keys()]);
      condiciones.push(`au.codigo_cetap = ANY($${params.length}::text[])`);
    }
    const filas = await this.dataSource.query(
      `SELECT au.codigo, au.nombre, au.sede_codigo, au.capacidad, au.provisional, au.tipo, au.piso,
              au.codigo_cetap, c.nombre AS cetap_nombre,
              COALESCE(dt.codigo, dts.codigo) AS territorial_codigo,
              COALESCE(dt.nombre, dts.nombre) AS territorial_nombre
         FROM "academic-schedule".aula au
         LEFT JOIN academic_work_plan.cetap c ON c.codigo = au.codigo_cetap
         LEFT JOIN academic_work_plan.direccion_territorial dt ON dt.id = c.id_direccion_territorial
         LEFT JOIN academic_work_plan.direccion_territorial dts ON dts.codigo = au.sede_codigo
        ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
        ORDER BY au.codigo`,
      params,
    );
    return filas.map((a: any) => ({
      codigo: a.codigo,
      nombre: a.nombre,
      sedeCodigo: a.sede_codigo ?? null,
      capacidad: a.capacidad ?? null,
      provisional: a.provisional,
      tipo: a.tipo ?? null,
      piso: a.piso ?? null,
      territorial: a.territorial_codigo ? { codigo: a.territorial_codigo, nombre: a.territorial_nombre } : null,
      cetap: a.codigo_cetap ? { codigo: a.codigo_cetap, nombre: a.cetap_nombre ?? null } : null,
      idOfertaCetap: ofertaPorCetap?.get(a.codigo_cetap) ?? null,
    }));
  }

  /**
   * Para el filtro de oferta: CETAP (código) -> id de la oferta activa que le corresponde.
   * `null` = no hay filtro de oferta (se devuelven todas las aulas). Un grupo de un periodo
   * legado no tiene ofertas: tampoco se filtra.
   */
  private async ofertasParaFiltro(filtros: FiltroAulas): Promise<Map<string, string> | null> {
    let idPrograma: string | null = null;
    let idPeriodo: string | null = null;
    let idOfertaDelGrupo: string | null = null;

    if (filtros.grupo) {
      if (!UUID.test(String(filtros.grupo))) throw new BadRequestException('El grupo debe ser un UUID.');
      const g = await this.dataSource.query(
        `SELECT g.id_oferta_cetap::text AS oferta, g.id_periodo_academico::text AS periodo, a.id_programa::text AS programa
           FROM "academic-schedule".grupo g
           JOIN academic_work_plan.asignatura a ON a.id = g.id_asignatura
          WHERE g.id_grupo = $1`,
        [filtros.grupo],
      );
      if (!g.length) throw new NotFoundException('El grupo no existe.');
      idOfertaDelGrupo = g[0].oferta;
      idPeriodo = g[0].periodo;
      idPrograma = g[0].programa;
      if (!idPeriodo) return null;
    } else if (filtros.asignatura || filtros.periodo) {
      const ref = parsearPeriodo(filtros.periodo);
      if (!filtros.asignatura || !/^\d+$/.test(String(filtros.asignatura)) || ref?.modelo !== 'plataforma') {
        throw new BadRequestException('Para filtrar por oferta indique `grupo`, o `asignatura` y `periodo` (ids numéricos).');
      }
      const a = await this.dataSource.query(
        `SELECT id_programa::text AS programa FROM academic_work_plan.asignatura WHERE id = $1::bigint`,
        [filtros.asignatura],
      );
      if (!a.length) throw new NotFoundException('La asignatura no existe.');
      idPrograma = a[0].programa;
      idPeriodo = ref.id;
    } else {
      return null;
    }

    const ofertas = await this.dataSource.query(
      `SELECT o.id::text AS id, c.codigo AS cetap
         FROM academic_work_plan.oferta_cetap_programa o
         JOIN academic_work_plan.cetap c ON c.id = o.id_cetap
        WHERE o.activa = TRUE AND o.deleted_at IS NULL
          AND o.id_programa = $1::bigint AND o.id_periodo_academico = $2::bigint
          AND ($3::bigint IS NULL OR o.id = $3::bigint)`,
      [idPrograma, idPeriodo, idOfertaDelGrupo],
    );
    return new Map(ofertas.map((o: any) => [o.cetap, o.id] as [string, string]));
  }

  /**
   * Ocupación de un aula: SOLO día y hora. La consulta no trae id_grupo,
   * asignatura ni docente a propósito (RN-07). Es imposible filtrar en el
   * cliente lo que nunca salió del servidor.
   */
  async disponibilidad(
    aulaCodigo: string,
    filtros: { periodo?: string; grupo?: string } = {},
  ): Promise<{ aula: string; ocupada: FranjaOcupadaAula[] }> {
    const aula = await this.dataSource.query(
      `SELECT codigo FROM "academic-schedule".aula WHERE codigo = $1`,
      [aulaCodigo],
    );
    if (!aula?.length) throw new NotFoundException(`El aula ${aulaCodigo} no existe.`);

    // Ocupada = ocupada EN ESE CICLO. Con `grupo` se mide contra el ciclo del grupo (o el de
    // su periodo); con `periodo`, contra las fechas del periodo. Sin ninguno, todo lo que
    // tenga el aula (comportamiento anterior). La regla de choque es la única de `choque.ts`.
    let referencia: CicloFechas | null = null;
    if (filtros.grupo) {
      if (!UUID.test(String(filtros.grupo))) throw new BadRequestException('El grupo debe ser un UUID.');
      const existe = await this.dataSource.query(
        `SELECT 1 FROM "academic-schedule".grupo WHERE id_grupo = $1`, [filtros.grupo]);
      if (!existe.length) throw new NotFoundException('El grupo no existe.');
      referencia = await cicloDelGrupo(this.dataSource, filtros.grupo);
    } else if (filtros.periodo) {
      const ref = parsearPeriodo(filtros.periodo);
      if (!ref) throw new BadRequestException('El periodo no es válido.');
      referencia = await cicloDelPeriodo(this.dataSource, ref);
    }

    const franjas = await cargarFranjasCruceables(this.dataSource, 'f.aula_codigo = $1', [aulaCodigo]);
    const ocupada = franjas
      .filter((f) => !referencia || ciclosSeSolapan(referencia, f))
      .sort((a, b) => (a.diaSemana < b.diaSemana ? -1 : a.diaSemana > b.diaSemana ? 1 : a.horaInicio < b.horaInicio ? -1 : a.horaInicio > b.horaInicio ? 1 : 0));
    return {
      aula: aulaCodigo,
      ocupada: ocupada.map((f) => ({
        diaSemana: f.diaSemana,
        horaInicio: f.horaInicio,
        horaFin: f.horaFin,
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
              (codigo, nombre, sede_codigo, codigo_cetap, capacidad, tipo, piso, provisional, origen)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, 'gestion-manual')
       RETURNING codigo, nombre, sede_codigo, capacidad, provisional`,
      [codigo, nombre, dto.sedeCodigo ?? null, dto.codigoCetap ?? null,
       dto.capacidad ?? null, dto.tipo ?? null, dto.piso ?? null],
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
    if (dto.codigoCetap !== undefined) push('codigo_cetap', dto.codigoCetap);
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
