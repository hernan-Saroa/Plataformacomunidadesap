import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, LessThan } from 'typeorm';

import { PaaCampoVisible, PaaRegion, PaaVersion, PaaVigencia } from '../../entities/paa.entity';
import type { HiringAccess } from '../../auth/hiring-access';
import {
  CLAVES_SIEMPRE_VISIBLES,
  OCULTAS_POR_DEFECTO,
  clavesConocidas,
  etiquetaDe,
  usoDe,
} from './estructura-paa';
import { PaaAdminService } from './paa-admin.service';
import type { GuardarCamposDto } from './dto/paa.dto';

/**
 * - `guardada`: la región ya configuró esta vigencia.
 * - `vigencia_anterior`: no la ha configurado; se propone lo del año anterior.
 * - `formato`: ni eso; se propone lo que trae el formato.
 */
export type OrigenConfiguracion = 'guardada' | 'vigencia_anterior' | 'formato';

export interface CampoDelFormulario {
  clave: string;
  /** El nombre del formato, para que la pantalla muestre de qué columna sale. */
  etiquetaFormato: string;
  /** El que verá quien crea el proceso. */
  etiqueta: string;
  visible: boolean;
  orden: number;
  uso: ReturnType<typeof usoDe>;
  siempreVisible: boolean;
  /**
   * - `nueva`: el archivo la trae y la configuración guardada no la conocía.
   * - `huerfana`: está configurada y el archivo ya no la trae.
   */
  estado: 'normal' | 'nueva' | 'huerfana';
}

/**
 * Qué columnas del PAA ve quien crea el proceso, por región y vigencia.
 *
 * La configuración es de presentación: ocultar un campo no lo borra de la
 * línea ni cambia lo que el PAA le da al proceso. Cada vigencia tiene la suya,
 * y la de un año nuevo parte de la del anterior sin tocarla: guardar crea filas
 * propias de la vigencia nueva.
 */
@Injectable()
export class PaaCamposService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly admin: PaaAdminService,
  ) {}

  async campos(regionId: string, anio: number) {
    const { region, vigencia } = await this.regionYVigencia(regionId, anio);
    const { campos, origen } = await this.armar(this.dataSource.manager, region.id, vigencia);
    return { region, vigencia, origen, campos };
  }

  async guardar(regionId: string, anio: number, dto: GuardarCamposDto, acceso: HiringAccess) {
    const { region, vigencia } = await this.regionYVigencia(regionId, anio);

    return this.dataSource.transaction(async (em) => {
      const { campos: actuales } = await this.armar(em, region.id, vigencia);
      const conocidas = new Set(actuales.map((c) => c.clave));
      const desconocidas = dto.campos.filter((c) => !conocidas.has(c.clave)).map((c) => c.clave);
      if (desconocidas.length) {
        throw new BadRequestException(`Estos campos no existen en el PAA: ${desconocidas.join(', ')}`);
      }
      const repetidas = dto.campos.map((c) => c.clave).filter((c, i, a) => a.indexOf(c) !== i);
      if (repetidas.length) {
        throw new BadRequestException(`Campos repetidos: ${[...new Set(repetidas)].join(', ')}`);
      }

      // Los que la pantalla no mandó conservan su visibilidad y van al final.
      const enviados = new Set(dto.campos.map((c) => c.clave));
      const resto = actuales.filter((c) => !enviados.has(c.clave));
      const huerfanas = new Set(actuales.filter((c) => c.estado === 'huerfana').map((c) => c.clave));

      const filas = [
        ...dto.campos.map((c) => ({ clave: c.clave, visible: c.visible, etiqueta: c.etiqueta?.trim() || null })),
        ...resto.map((c) => ({
          clave: c.clave,
          visible: c.visible,
          etiqueta: c.etiqueta !== c.etiquetaFormato ? c.etiqueta : null,
        })),
      ].map((c, orden) => ({
        regionId: region.id,
        vigenciaId: vigencia.id,
        clave: c.clave,
        visible: CLAVES_SIEMPRE_VISIBLES.includes(c.clave) ? true : c.visible,
        etiqueta: c.etiqueta,
        orden,
        huerfana: huerfanas.has(c.clave),
        updatedBy: acceso.userName,
        updatedAt: new Date(),
      }));

      await em.delete(PaaCampoVisible, { regionId: region.id, vigenciaId: vigencia.id });
      await em.insert(PaaCampoVisible, filas);
      await this.admin.traza(em, 'paa_campos_visibles', region.id, 'CONFIGURAR', acceso, {
        region: region.nombre,
        anio: vigencia.anio,
        visibles: filas.filter((f) => f.visible).map((f) => f.clave),
      });

      const { campos, origen } = await this.armar(em, region.id, vigencia);
      return { region, vigencia, origen, campos };
    });
  }

  /** Los campos que ve quien crea el proceso, en orden. */
  async visibles(regionId: string, vigencia: PaaVigencia) {
    const { campos } = await this.armar(this.dataSource.manager, regionId, vigencia);
    return campos.filter((c) => c.visible && c.estado !== 'huerfana');
  }

  // ------------------------------------------------------------------------

  private async armar(
    em: EntityManager,
    regionId: string,
    vigencia: PaaVigencia,
  ): Promise<{ campos: CampoDelFormulario[]; origen: OrigenConfiguracion }> {
    const disponibles = await this.clavesDisponibles(em, regionId, vigencia.id);

    let origen: OrigenConfiguracion = 'guardada';
    let guardadas = await em.find(PaaCampoVisible, {
      where: { regionId, vigenciaId: vigencia.id },
      order: { orden: 'ASC' },
    });

    if (!guardadas.length) {
      const anterior = await em.findOne(PaaVigencia, {
        where: { documentoId: vigencia.documentoId, anio: LessThan(vigencia.anio) },
        order: { anio: 'DESC' },
      });
      guardadas = anterior
        ? await em.find(PaaCampoVisible, { where: { regionId, vigenciaId: anterior.id }, order: { orden: 'ASC' } })
        : [];
      origen = guardadas.length ? 'vigencia_anterior' : 'formato';
    }

    const campo = (clave: string, visible: boolean, etiqueta: string | null, estado: CampoDelFormulario['estado']) => ({
      clave,
      etiquetaFormato: etiquetaDe(clave),
      etiqueta: etiqueta || etiquetaDe(clave),
      visible: CLAVES_SIEMPRE_VISIBLES.includes(clave) ? true : visible,
      orden: 0,
      uso: usoDe(clave),
      siempreVisible: CLAVES_SIEMPRE_VISIBLES.includes(clave),
      estado,
    });

    let campos: CampoDelFormulario[];
    if (origen === 'formato') {
      campos = disponibles.map((clave) => campo(clave, !OCULTAS_POR_DEFECTO.includes(clave), null, 'normal'));
    } else {
      const configuradas = new Set(guardadas.map((g) => g.clave));
      const enArchivo = new Set(disponibles);
      // Una clave nueva solo es «nueva» frente a una configuración que ya
      // existía; si se está heredando, es nueva respecto del año anterior.
      campos = [
        ...guardadas.map((g) => campo(g.clave, g.visible, g.etiqueta, enArchivo.has(g.clave) ? 'normal' : 'huerfana')),
        ...disponibles
          .filter((c) => !configuradas.has(c))
          .map((c) => campo(c, !OCULTAS_POR_DEFECTO.includes(c), null, 'nueva')),
      ];
    }

    return { campos: campos.map((c, orden) => ({ ...c, orden })), origen };
  }

  /**
   * Las claves que trae la versión activa de la vigencia para esa región; si no
   * hay activa, la última validada; si no hay ninguna, las del formato.
   */
  private async clavesDisponibles(em: EntityManager, regionId: string, vigenciaId: string): Promise<string[]> {
    const version =
      (await em.findOne(PaaVersion, { where: { vigenciaId, estado: 'ACTIVA' } })) ??
      (await em.findOne(PaaVersion, { where: { vigenciaId, estado: 'VALIDADA' }, order: { numero: 'DESC' } }));
    const formato = clavesConocidas();
    if (!version) return formato;

    const filas: { clave: string }[] = await em.query(
      `SELECT DISTINCT jsonb_object_keys(valores) AS clave
         FROM hiring.paa_lineas WHERE version_id = $1 AND region_id = $2`,
      [version.id, regionId],
    );
    if (!filas.length) return formato;
    const enArchivo = new Set(filas.map((f) => f.clave));
    // Primero en el orden del formato, después las que sobran en el archivo.
    return [...formato.filter((c) => enArchivo.has(c)), ...[...enArchivo].filter((c) => !formato.includes(c)).sort()];
  }

  private async regionYVigencia(regionId: string, anio: number) {
    const region = await this.dataSource.getRepository(PaaRegion).findOne({ where: { id: regionId } });
    if (!region) throw new NotFoundException('La región no existe');
    // El año es el del documento de la región: cada territorio abre los suyos.
    const vigencia = await this.dataSource
      .getRepository(PaaVigencia)
      .findOne({ where: { documentoId: region.documentoId, anio } });
    if (!vigencia) throw new NotFoundException(`${region.nombre} no tiene PAA ${anio}`);
    return { region, vigencia };
  }
}
