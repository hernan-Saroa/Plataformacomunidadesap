import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seccional } from './seccional.entity';
import { Sede } from './sede.entity';

export interface Territorial {
  id: string;
  nombre: string;
}

export interface CETAP {
  id: string;
  nombre: string;
  territorialId: string;
}

export interface ProgramaAcademico {
  id: string;
  nombre: string;
  codigo: string;
}

@Injectable()
export class DatosMaestrosService {
  constructor(
    @InjectRepository(Seccional)
    private readonly seccionalRepo: Repository<Seccional>,
    @InjectRepository(Sede)
    private readonly sedeRepo: Repository<Sede>,
  ) {}

  /**
   * Obtiene las territoriales (seccionales) del módulo de Estructura Organizacional.
   * Ya NO usa datos mock: consulta directamente auth.seccionales.
   */
  async getTerritoriales(): Promise<Territorial[]> {
    const seccionales = await this.seccionalRepo.find({
      order: { nomSeccional: 'ASC' },
    });
    return seccionales.map(s => ({
      id: String(s.idSeccional),
      nombre: s.nomSeccional,
    }));
  }

  /**
   * Obtiene los CETAPs (sedes) del módulo de Estructura Organizacional,
   * filtrados por seccional/territorial si se especifica.
   */
  async getCETAPs(territorialId?: string): Promise<CETAP[]> {
    const where: any = {};
    if (territorialId) {
      where.idSeccional = Number(territorialId);
    }
    const sedes = await this.sedeRepo.find({
      where,
      order: { nomSede: 'ASC' },
    });
    return sedes.map(s => ({
      id: String(s.idSede),
      nombre: s.nomSede || `Sede ${s.codSede}`,
      territorialId: String(s.idSeccional),
    }));
  }

  /**
   * Obtiene los programas académicos de la tabla auth.programas_academicos.
   * Usa query directa pues la entidad puede estar en otro módulo.
   */
  async getProgramasAcademicos(sedeId?: string): Promise<ProgramaAcademico[]> {
    const mapRows = (rows: any[]) => (rows || []).map((r: any) => ({
      id: String(r.id),
      nombre: r.nombre,
      codigo: r.codigo || '',
    }));

    try {
      if (sedeId) {
        // Estrategia 1: vía sede_cetap_mapping (columna correcta: id_cetap)
        try {
          const rows = await this.seccionalRepo.manager.query(
            `SELECT DISTINCT p.id, p.codigo, p.nombre
             FROM academic_work_plan.programa p
             JOIN academic_work_plan.oferta_cetap_programa ocp ON ocp.id_programa = p.id AND ocp.activa = TRUE
             JOIN academic_work_plan.cetap c ON c.id = ocp.id_cetap
             JOIN auth.sede_cetap_mapping scm ON scm.id_cetap = c.id
             WHERE scm.id_sede = $1 AND p.activo = TRUE
             ORDER BY p.nombre ASC`,
            [Number(sedeId)],
          );
          if (rows && rows.length > 0) return mapRows(rows);
        } catch (e) {
          console.warn('[DatosMaestros] sede_cetap_mapping query falló:', e.message);
        }

        // Estrategia 2: match por nombre de sede ↔ nombre de cetap
        const sede = await this.sedeRepo.findOne({ where: { idSede: Number(sedeId) } });
        if (sede && sede.nomSede) {
          // Limpiar nombre: quitar prefijo "CETAP " si lo tiene
          const cleanName = sede.nomSede.replace(/^CETAP\s*/i, '').trim();
          // Normalizar para comparación: quitar tildes, lowercase
          const normalized = cleanName
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

          const rows = await this.seccionalRepo.manager.query(
            `SELECT DISTINCT p.id, p.codigo, p.nombre
             FROM academic_work_plan.programa p
             JOIN academic_work_plan.oferta_cetap_programa ocp ON ocp.id_programa = p.id AND ocp.activa = TRUE
             JOIN academic_work_plan.cetap c ON c.id = ocp.id_cetap
             WHERE (
               LOWER(c.nombre) = LOWER($1)
               OR c.nombre_normalizado = $2
               OR LOWER(c.nombre) LIKE LOWER($3)
             ) AND p.activo = TRUE
             ORDER BY p.nombre ASC`,
            [cleanName, normalized, `%${cleanName}%`],
          );
          if (rows && rows.length > 0) return mapRows(rows);
        }
      }

      // Sin filtro o sin resultados: todos los programas activos
      const rows = await this.seccionalRepo.manager.query(
        `SELECT id, codigo, nombre FROM academic_work_plan.programa WHERE activo = TRUE ORDER BY nombre ASC`,
      );
      return mapRows(rows);
    } catch (error) {
      console.warn('[DatosMaestros] Error cargando programas académicos:', error.message);
      return [];
    }
  }
}