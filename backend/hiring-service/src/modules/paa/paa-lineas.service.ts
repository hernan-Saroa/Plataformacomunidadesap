import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { PaaLinea, PaaRegion, PaaVersion, PaaVigencia } from '../../entities/paa.entity';
import { PaaCamposService } from './paa-campos.service';
import { LINEAS_POR_PAGINA } from './paa-admin.service';
import type { BuscarLineasDto } from './dto/paa.dto';

/**
 * Las líneas del PAA tal como las ve quien crea un proceso.
 *
 * Solo la versión activa del PAA vigente de la región —el de su documento,
 * porque cada territorio carga el suyo—, y de una región a la vez: es lo que
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

  /**
   * Las regiones de las que se puede crear un proceso, cada una con el PAA del
   * que saldría: el vigente de su documento, si tiene versión activa.
   *
   * Cada territorio carga su PAA y cambia de año por su cuenta, así que una
   * región puede estar lista y otra no. Las que no lo están se listan igual,
   * con el porqué, en vez de desaparecer.
   */
  async opciones() {
    const [regiones, vigentes] = await Promise.all([
      this.dataSource.getRepository(PaaRegion).find({ where: { activa: true }, order: { nombre: 'ASC' } }),
      this.dataSource.query(
        `SELECT g.documento_id AS "documentoId", d.nombre AS documento, g.id, g.anio,
                v.id AS "versionId", v.numero AS "versionNumero", v.activada_at AS "activadaAt"
           FROM hiring.paa_vigencias g
           JOIN hiring.paa_documentos d ON d.id = g.documento_id
           LEFT JOIN hiring.paa_versiones v ON v.vigencia_id = g.id AND v.estado = 'ACTIVA'
          WHERE g.vigente`,
      ),
    ]);
    const vigenteDe = new Map(vigentes.map((v: { documentoId: string }) => [v.documentoId, v]));

    const conPaa = regiones.map((r) => {
      const v = vigenteDe.get(r.documentoId) as
        | { documento: string; id: string; anio: number; versionId: string | null; versionNumero: number | null }
        | undefined;
      const vigente = v?.versionId ? { id: v.id, anio: v.anio, versionId: v.versionId, versionNumero: v.versionNumero! } : null;
      return {
        ...r,
        documento: v?.documento ?? null,
        vigente,
        motivo: vigente
          ? null
          : `${r.nombre} no tiene un PAA vigente con una versión activa. Lo carga la Dirección de Contratación en Configuración → Plan de adquisiciones.`,
      };
    });
    const listo = conPaa.some((r) => r.vigente);
    return {
      regiones: conPaa,
      listo,
      motivo: listo
        ? null
        : !regiones.length
          ? 'No hay regiones activas.'
          : 'Ninguna región tiene un Plan Anual de Adquisiciones vigente con una versión activa. Lo carga la Dirección de Contratación en Configuración → Plan de adquisiciones.',
    };
  }

  async buscar(filtro: BuscarLineasDto) {
    const { version, vigencia } = await this.versionActiva(filtro.region, filtro.anio);
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

  /** La versión activa del PAA de la región: el de su documento, del año pedido o del vigente. */
  private async versionActiva(regionId: string, anio?: number) {
    const region = await this.dataSource.getRepository(PaaRegion).findOne({ where: { id: regionId } });
    if (!region) throw new NotFoundException('La región no existe');
    const vigencia = await this.dataSource
      .getRepository(PaaVigencia)
      .findOne({ where: { documentoId: region.documentoId, ...(anio ? { anio } : { vigente: true }) } });
    if (!vigencia) {
      throw new NotFoundException(
        anio ? `${region.nombre} no tiene PAA ${anio}` : `${region.nombre} no tiene un PAA vigente`,
      );
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
