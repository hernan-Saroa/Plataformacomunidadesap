import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { PaaLinea, PaaRegion, PaaVersion, PaaVigencia } from '../../entities/paa.entity';
import { PaaCamposService } from './paa-campos.service';
import { LINEAS_POR_PAGINA } from './paa-admin.service';
import type { BuscarLineasDto } from './dto/paa.dto';

/**
 * Las líneas del PAA tal como las ve quien crea un proceso.
 *
 * Solo la versión activa de cada vigencia, y de una región a la vez: es lo que
 * impide mezclar regiones o años, o tomar una línea de un archivo que ya no
 * rige. Las líneas que ya originaron un proceso vivo se muestran marcadas en
 * vez de ocultarse: quien busca una línea y no la encuentra no sabe si no
 * existe o si alguien ya la usó.
 */
@Injectable()
export class PaaLineasService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly campos: PaaCamposService,
  ) {}

  /** Regiones y vigencias entre las que se puede elegir al crear un proceso. */
  async opciones() {
    const [regiones, vigencias] = await Promise.all([
      this.dataSource.getRepository(PaaRegion).find({ where: { activa: true }, order: { nombre: 'ASC' } }),
      this.dataSource.query(
        `SELECT g.id, g.anio, g.vigente, v.id AS "versionId", v.numero AS "versionNumero", v.activada_at AS "activadaAt"
           FROM hiring.paa_vigencias g
           JOIN hiring.paa_versiones v ON v.vigencia_id = g.id AND v.estado = 'ACTIVA'
          ORDER BY g.anio DESC`,
      ),
    ]);
    const vigente = vigencias.find((v: { vigente: boolean }) => v.vigente) ?? null;
    return {
      regiones,
      // Solo la vigente sirve para crear; las demás se listan para que se vea
      // por qué no aparecen sus líneas.
      vigencias,
      vigente,
      listo: !!vigente && regiones.length > 0,
      motivo: !vigente
        ? 'No hay un Plan Anual de Adquisiciones vigente con una versión activa. Lo carga la Dirección de Contratación en Configuración → Plan de adquisiciones.'
        : !regiones.length
          ? 'No hay regiones activas.'
          : null,
    };
  }

  async buscar(filtro: BuscarLineasDto) {
    const { version, vigencia } = await this.versionActiva(filtro.anio);
    const pagina = filtro.pagina ?? 1;

    const consulta = this.dataSource
      .getRepository(PaaLinea)
      .createQueryBuilder('l')
      .where('l.version_id = :version AND l.region_id = :region', { version: version.id, region: filtro.region });
    if (filtro.q?.trim()) {
      consulta.andWhere(`(l.codigo ILIKE :q OR l.valores->>'objeto' ILIKE :q OR l.valores->>'codigo_interno' ILIKE :q)`, {
        q: `%${filtro.q.trim()}%`,
      });
    }
    const [lineas, total] = await consulta
      .orderBy('l.fila', 'ASC')
      .skip((pagina - 1) * LINEAS_POR_PAGINA)
      .take(LINEAS_POR_PAGINA)
      .getManyAndCount();

    const usos = await this.procesosVivos(filtro.region, vigencia.anio, lineas.map((l) => l.codigo));
    return {
      vigencia: { id: vigencia.id, anio: vigencia.anio },
      version: { id: version.id, numero: version.numero },
      total,
      pagina,
      porPagina: LINEAS_POR_PAGINA,
      lineas: lineas.map((l) => ({
        id: l.id,
        codigo: l.codigo,
        objeto: l.valores.objeto ?? null,
        modalidad: l.valores.modalidad ?? null,
        valorTotal: l.valores.valor_total ?? null,
        enUso: usos.get(l.codigo) ?? null,
      })),
    };
  }

  /** Una línea con los campos que su región decidió mostrar, en su orden. */
  async detalle(lineaId: string) {
    const linea = await this.dataSource.getRepository(PaaLinea).findOne({ where: { id: lineaId } });
    if (!linea) throw new NotFoundException('La línea del PAA no existe');

    const version = await this.dataSource.getRepository(PaaVersion).findOneOrFail({ where: { id: linea.versionId } });
    const [vigencia, region] = await Promise.all([
      this.dataSource.getRepository(PaaVigencia).findOneOrFail({ where: { id: version.vigenciaId } }),
      this.dataSource.getRepository(PaaRegion).findOneOrFail({ where: { id: linea.regionId } }),
    ]);
    const visibles = await this.campos.visibles(region.id, vigencia);
    const usos = await this.procesosVivos(region.id, vigencia.anio, [linea.codigo]);

    return {
      id: linea.id,
      codigo: linea.codigo,
      region: { id: region.id, nombre: region.nombre },
      vigencia: { id: vigencia.id, anio: vigencia.anio, vigente: vigencia.vigente },
      version: { id: version.id, numero: version.numero, estado: version.estado },
      campos: visibles.map((c) => ({ clave: c.clave, etiqueta: c.etiqueta, valor: linea.valores[c.clave] ?? null })),
      enUso: usos.get(linea.codigo) ?? null,
    };
  }

  private async versionActiva(anio?: number) {
    const vigencia = await this.dataSource
      .getRepository(PaaVigencia)
      .findOne({ where: anio ? { anio } : { vigente: true } });
    if (!vigencia) {
      throw new NotFoundException(anio ? `La vigencia ${anio} no existe` : 'No hay una vigencia del PAA vigente');
    }
    const version = await this.dataSource.getRepository(PaaVersion).findOne({ where: { vigenciaId: vigencia.id, estado: 'ACTIVA' } });
    if (!version) throw new ConflictException(`La vigencia ${vigencia.anio} no tiene una versión del PAA activa`);
    return { vigencia, version };
  }

  /** Código → proceso vivo que lo ocupa. */
  private async procesosVivos(regionId: string, anio: number, codigos: string[]) {
    if (!codigos.length) return new Map<string, { procesoId: string; radicado: string }>();
    const filas: { id: string; radicado: string; paa_codigo: string }[] = await this.dataSource.query(
      `SELECT id, radicado, paa_codigo FROM hiring.procesos
        WHERE paa_region_id = $1 AND paa_anio = $2 AND paa_codigo = ANY($3)
          AND estado IN ('EN_CURSO', 'ADJUDICADO')`,
      [regionId, anio, codigos],
    );
    return new Map(filas.map((f) => [f.paa_codigo, { procesoId: f.id, radicado: f.radicado }]));
  }
}
