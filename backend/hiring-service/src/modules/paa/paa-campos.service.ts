import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, LessThan } from 'typeorm';

import { PaaCampoVisible, PaaRegion, PaaVersion, PaaVigencia } from '../../entities/paa.entity';
import { NUMERAL_ESTUDIO_PREVIO } from '../../entities/proceso-actividad.entity';
import type { HiringAccess } from '../../auth/hiring-access';
import {
  CLAVES_SIEMPRE_VISIBLES,
  EN_ESTUDIO_PREVIO_POR_DEFECTO,
  OCULTAS_POR_DEFECTO,
  RECUADRO_MODALIDAD,
  camposDeLa31PorColumna,
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
  /** Si se ve al elegir la línea. */
  visible: boolean;
  /** Si llega a la 3.1: por su campo propio o en el bloque «Datos del PAA». */
  enEstudioPrevio: boolean;
  /**
   * El campo de la 3.1 que el PAA ya llena con esta columna (ver
   * `CAMPOS_CONTROLADOS`). Si lo hay, llega a la 3.1 siempre y no se repite
   * en el bloque.
   */
  yaEnEstudioPrevio: string | null;
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
 * Qué columnas del PAA ve quien crea el proceso y cuáles muestra la 3.1, por
 * región y vigencia.
 *
 * La configuración es de presentación: ocultar un campo no lo borra de la
 * línea ni cambia lo que el PAA le da al proceso —los campos que la 3.1 llena
 * desde el PAA (`CAMPOS_CONTROLADOS`) se llenan igual—. Cada vigencia tiene la suya,
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
      const previos = new Map(actuales.map((c) => [c.clave, c.enEstudioPrevio]));
      // Las que ya llenan un campo de la 3.1 no ocupan lugar en el bloque.
      const conCampoPropio = new Set(actuales.filter((c) => c.yaEnEstudioPrevio).map((c) => c.clave));

      const filas = [
        ...dto.campos.map((c) => ({
          clave: c.clave,
          visible: c.visible,
          enEstudioPrevio: c.enEstudioPrevio ?? previos.get(c.clave) ?? false,
          etiqueta: c.etiqueta?.trim() || null,
        })),
        ...resto.map((c) => ({
          clave: c.clave,
          visible: c.visible,
          enEstudioPrevio: c.enEstudioPrevio,
          etiqueta: c.etiqueta !== c.etiquetaFormato ? c.etiqueta : null,
        })),
      ].map((c, orden) => ({
        regionId: region.id,
        vigenciaId: vigencia.id,
        clave: c.clave,
        visible: CLAVES_SIEMPRE_VISIBLES.includes(c.clave) ? true : c.visible,
        enEstudioPrevio: conCampoPropio.has(c.clave) ? false : c.enEstudioPrevio,
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
        enEstudioPrevio: filas.filter((f) => f.enEstudioPrevio && !f.huerfana).map((f) => f.clave),
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

  /** Los campos que la 3.1 muestra en «Datos del PAA», en orden. */
  async delEstudioPrevio(regionId: string, vigencia: PaaVigencia) {
    const { campos } = await this.armar(this.dataSource.manager, regionId, vigencia);
    return campos.filter((c) => c.enEstudioPrevio && !c.yaEnEstudioPrevio && c.estado !== 'huerfana');
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

    const campo = (
      clave: string,
      visible: boolean,
      enEstudioPrevio: boolean,
      etiqueta: string | null,
      estado: CampoDelFormulario['estado'],
    ) => ({
      clave,
      etiquetaFormato: etiquetaDe(clave),
      etiqueta: etiqueta || etiquetaDe(clave),
      visible: CLAVES_SIEMPRE_VISIBLES.includes(clave) ? true : visible,
      enEstudioPrevio: ya.has(clave) ? true : enEstudioPrevio,
      yaEnEstudioPrevio: ya.get(clave) ?? null,
      orden: 0,
      uso: usoDe(clave),
      siempreVisible: CLAVES_SIEMPRE_VISIBLES.includes(clave),
      estado,
    });

    const ya = await this.yaEnLa31(em);
    const porDefecto = (clave: string): [boolean, boolean] => [
      !OCULTAS_POR_DEFECTO.includes(clave),
      EN_ESTUDIO_PREVIO_POR_DEFECTO.includes(clave),
    ];

    let campos: CampoDelFormulario[];
    if (origen === 'formato') {
      campos = disponibles.map((clave) => campo(clave, ...porDefecto(clave), null, 'normal'));
    } else {
      const configuradas = new Set(guardadas.map((g) => g.clave));
      const enArchivo = new Set(disponibles);
      // Una clave nueva solo es «nueva» frente a una configuración que ya
      // existía; si se está heredando, es nueva respecto del año anterior.
      campos = [
        ...guardadas.map((g) =>
          campo(g.clave, g.visible, g.enEstudioPrevio, g.etiqueta, enArchivo.has(g.clave) ? 'normal' : 'huerfana'),
        ),
        ...disponibles.filter((c) => !configuradas.has(c)).map((c) => campo(c, ...porDefecto(c), null, 'nueva')),
      ];
    }

    return { campos: campos.map((c, orden) => ({ ...c, orden })), origen };
  }

  /**
   * Por columna del PAA, el nombre del campo de la 3.1 que ya la muestra. Se
   * cruza con la configuración de la 3.1: si un campo se desactiva, su columna
   * deja de contar como mostrada y puede ir al bloque.
   */
  private async yaEnLa31(em: EntityManager): Promise<Map<string, string>> {
    const activos: { codigo: string; etiqueta: string }[] = await em.query(
      `SELECT codigo, etiqueta FROM hiring.campos_formulario WHERE numeral = $1 AND activo`,
      [NUMERAL_ESTUDIO_PREVIO],
    );
    const etiquetas = new Map(activos.map((c) => [c.codigo, c.etiqueta]));
    etiquetas.set(RECUADRO_MODALIDAD, 'Modalidad de contratación');

    const ya = new Map<string, string>();
    for (const [columna, campo] of camposDeLa31PorColumna()) {
      const etiqueta = etiquetas.get(campo);
      if (etiqueta) ya.set(columna, etiqueta);
    }
    return ya;
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
