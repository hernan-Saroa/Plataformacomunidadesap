import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, LessThan, Not } from 'typeorm';
import { readFile } from 'fs/promises';
import { join } from 'path';

import {
  PaaComparacion,
  PaaDocumento,
  PaaLinea,
  PaaRegion,
  PaaVersion,
  PaaVigencia,
  type HallazgoPaa,
  type TipoComparacionPaa,
} from '../../entities/paa.entity';
import { Trazabilidad, type AccionTraza } from '../../entities/trazabilidad.entity';
import type { HiringAccess } from '../../auth/hiring-access';
import { STORAGE_PATH } from '../archivos';
import { leerPaa } from './lector-paa';
import { compararVersiones } from './comparador-paa';
import { normalizar } from './estructura-paa';
import type {
  ActualizarRegionDto,
  CrearRegionDto,
  CrearVigenciaDto,
  LineasDeVersionDto,
} from './dto/paa.dto';

/** Líneas por página al consultar una versión: el PAA real tiene 1.500. */
export const LINEAS_POR_PAGINA = 50;

/** Cuántas líneas se insertan por sentencia: 1.500 de una vez superan el límite de parámetros. */
const LOTE_DE_INSERCION = 300;

/**
 * Administración del Plan Anual de Adquisiciones: regiones, vigencias y la
 * carga y consulta de versiones.
 *
 * Cargar no activa. Una versión que pasa la validación queda `VALIDADA` con su
 * comparación contra la activa, y alguien con `aprobar` en el PAA decide si la
 * activa después de ver qué cambia y a qué procesos toca (`PaaActivacionService`).
 */
@Injectable()
export class PaaAdminService {
  constructor(private readonly dataSource: DataSource) {}

  // -------------------------------------------------------------- regiones --

  listarRegiones() {
    return this.dataSource.getRepository(PaaRegion).find({ order: { nombre: 'ASC' } });
  }

  /**
   * Crea la región y, si publica su propio Excel, su documento.
   *
   * Es lo normal: cada territorio carga su PAA. Que sus líneas lleguen dentro
   * del Excel de otro, como las de Chocó en el de la Sede Central, es la
   * excepción, y se dice eligiendo ese documento.
   */
  async crearRegion(dto: CrearRegionDto, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      await this.exigirRegionLibre(em, dto.codigo, dto.prefijoLinea);

      let documento: PaaDocumento | null;
      if (dto.documentoId) {
        documento = await em.findOne(PaaDocumento, { where: { id: dto.documentoId } });
        if (!documento) throw new NotFoundException('El documento del PAA no existe');
      } else {
        if (await em.findOne(PaaDocumento, { where: { codigo: dto.codigo } })) {
          throw new ConflictException(`Ya hay un documento del PAA con el código ${dto.codigo}`);
        }
        documento = await em.save(PaaDocumento, {
          codigo: dto.codigo,
          nombre: dto.nombre.trim(),
          createdBy: acceso.userName,
        } as Partial<PaaDocumento>);
        await this.traza(em, 'paa_documentos', documento.id, 'CREAR', acceso, { codigo: dto.codigo, nombre: documento.nombre });
      }

      const region = await em.save(PaaRegion, {
        codigo: dto.codigo,
        nombre: dto.nombre.trim(),
        prefijoLinea: dto.prefijoLinea,
        unidadContratacion: dto.unidadContratacion.trim(),
        documentoId: documento.id,
        createdBy: acceso.userName,
      } as Partial<PaaRegion>);
      await this.traza(em, 'paa_regiones', region.id, 'CONFIGURAR', acceso, { creada: dto, documento: documento.nombre });
      return region;
    });
  }

  async actualizarRegion(id: string, dto: ActualizarRegionDto, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const region = await em.findOne(PaaRegion, { where: { id } });
      if (!region) throw new NotFoundException('La región no existe');

      if (dto.prefijoLinea && dto.prefijoLinea !== region.prefijoLinea) {
        // Las líneas guardadas llevan el prefijo en su código y los procesos lo
        // llevan en `paa_codigo`: cambiarlo dejaría a los dos hablando de
        // códigos que el archivo ya no trae.
        const conLineas = await em.count(PaaLinea, { where: { regionId: id } });
        if (conLineas) {
          throw new ConflictException(
            'La región ya tiene líneas cargadas con su prefijo. Si el PAA cambió de prefijo, cree otra región.',
          );
        }
        await this.exigirRegionLibre(em, null, dto.prefijoLinea, id);
      }

      const antes = { ...region };
      Object.assign(region, {
        ...(dto.nombre !== undefined && { nombre: dto.nombre.trim() }),
        ...(dto.prefijoLinea !== undefined && { prefijoLinea: dto.prefijoLinea }),
        ...(dto.unidadContratacion !== undefined && { unidadContratacion: dto.unidadContratacion.trim() }),
        ...(dto.activa !== undefined && { activa: dto.activa }),
        updatedAt: new Date(),
      });
      await em.save(region);
      await this.traza(em, 'paa_regiones', id, 'CONFIGURAR', acceso, { antes, despues: dto });
      return region;
    });
  }

  private async exigirRegionLibre(em: EntityManager, codigo: string | null, prefijo: string, salvo?: string) {
    const choque = await em.findOne(PaaRegion, {
      where: [
        ...(codigo ? [{ codigo }] : []),
        { prefijoLinea: prefijo, ...(salvo && { id: Not(salvo) }) },
      ],
    });
    if (choque) {
      throw new ConflictException(
        choque.prefijoLinea === prefijo
          ? `El prefijo ${prefijo} ya es de ${choque.nombre}`
          : `Ya hay una región con el código ${codigo}`,
      );
    }
  }

  // ------------------------------------------------------------- vigencias --

  /**
   * Cada documento con sus regiones y sus vigencias, y cada vigencia con sus
   * versiones, de la más reciente a la más antigua.
   */
  async listarDocumentos() {
    const [documentos, regiones, vigencias] = await Promise.all([
      this.dataSource.getRepository(PaaDocumento).find({ order: { nombre: 'ASC' } }),
      this.listarRegiones(),
      this.dataSource.getRepository(PaaVigencia).find({ order: { anio: 'DESC' } }),
    ]);
    const versiones = vigencias.length
      ? await this.dataSource.getRepository(PaaVersion).find({
          where: { vigenciaId: In(vigencias.map((v) => v.id)) },
          order: { numero: 'DESC' },
        })
      : [];

    return documentos.map((d) => ({
      ...d,
      regiones: regiones.filter((r) => r.documentoId === d.id),
      vigencias: vigencias
        .filter((v) => v.documentoId === d.id)
        .map((v) => {
          const suyas = versiones.filter((x) => x.vigenciaId === v.id).map((x) => this.resumenVersion(x));
          return { ...v, activa: suyas.find((x) => x.estado === 'ACTIVA') ?? null, versiones: suyas };
        }),
    }));
  }

  async crearVigencia(dto: CrearVigenciaDto, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const documento = await em.findOne(PaaDocumento, { where: { id: dto.documentoId } });
      if (!documento) throw new NotFoundException('El documento del PAA no existe');
      if (await em.findOne(PaaVigencia, { where: { documentoId: documento.id, anio: dto.anio } })) {
        throw new ConflictException(`El PAA ${dto.anio} de ${documento.nombre} ya existe`);
      }
      // Nace sin marca de vigente: hasta que tenga una versión activa y alguien
      // la declare, los procesos del territorio siguen saliendo del año anterior.
      const vigencia = await em.save(PaaVigencia, {
        documentoId: documento.id,
        anio: dto.anio,
        vigente: false,
        createdBy: acceso.userName,
      } as Partial<PaaVigencia>);
      await this.traza(em, 'paa_vigencias', vigencia.id, 'CREAR', acceso, { anio: dto.anio, documento: documento.nombre });
      return vigencia;
    });
  }

  // ------------------------------------------------------------- versiones --

  /**
   * Carga un archivo como versión nueva de la vigencia.
   *
   * Un archivo con errores queda `INVALIDA` con su reporte y no se guardan sus
   * líneas: no se puede activar, y guardarlas solo invitaría a usarlas. Uno
   * válido queda `VALIDADA` con su comparación; si ya había otra validada sin
   * activar, se descarta, porque dos candidatas a la vez es justo la ambigüedad
   * que el versionado quiere evitar.
   */
  async cargarVersion(
    vigenciaId: string,
    archivo: { filename: string; originalname: string },
    sha256: string,
    acceso: HiringAccess,
  ) {
    const vigencia = await this.dataSource.getRepository(PaaVigencia).findOne({ where: { id: vigenciaId } });
    if (!vigencia) throw new NotFoundException('La vigencia no existe');

    const [documento, todas, equivalencias] = await Promise.all([
      this.dataSource.getRepository(PaaDocumento).findOneOrFail({ where: { id: vigencia.documentoId } }),
      this.dataSource.getRepository(PaaRegion).find({ where: { activa: true } }),
      this.equivalencias(),
    ]);
    // Solo las regiones de este documento: una línea de otro territorio en
    // este Excel es un error del archivo, no una línea que se reparte sola.
    const regiones = todas.filter((r) => r.documentoId === documento.id);
    if (!regiones.length) {
      throw new BadRequestException(
        `${documento.nombre} no tiene regiones activas: sin ellas no se puede repartir ninguna línea.`,
      );
    }
    const nombresDocumento = new Map(
      (await this.dataSource.getRepository(PaaDocumento).find()).map((d) => [d.id, d.nombre]),
    );

    const contenido = await readFile(join(STORAGE_PATH, archivo.filename));
    const lectura = await leerPaa(contenido, {
      regiones,
      equivalencias,
      documento: documento.nombre,
      ajenas: todas
        .filter((r) => r.documentoId !== documento.id)
        .map((r) => ({ prefijoLinea: r.prefijoLinea, nombre: r.nombre, documento: nombresDocumento.get(r.documentoId) ?? '' })),
    });

    const id = await this.dataSource.transaction(async (em) => {
      // Bloquea la vigencia: dos cargas simultáneas no pueden sacar el mismo número.
      await em
        .createQueryBuilder(PaaVigencia, 'v')
        .setLock('pessimistic_write')
        .where('v.id = :id', { id: vigenciaId })
        .getOne();

      const [{ max }] = await em.query(
        `SELECT COALESCE(MAX(numero), 0) AS max FROM hiring.paa_versiones WHERE vigencia_id = $1`,
        [vigenciaId],
      );
      const numero = Number(max) + 1;
      const valida = lectura.errores.length === 0;

      const advertencias: HallazgoPaa[] = [...lectura.advertencias];
      const activa = await em.findOne(PaaVersion, { where: { vigenciaId, estado: 'ACTIVA' } });
      if (activa?.sha256 === sha256) {
        advertencias.unshift({
          fila: null,
          columna: null,
          valor: null,
          mensaje: `El archivo es idéntico a la versión ${activa.numero}, que es la activa.`,
        });
      }

      const version = await em.save(PaaVersion, {
        vigenciaId,
        numero,
        nombreArchivo: archivo.originalname,
        rutaArchivo: archivo.filename,
        sha256,
        encabezados: lectura.encabezados,
        estado: valida ? 'VALIDADA' : 'INVALIDA',
        errores: lectura.errores,
        advertencias,
        totalLineas: valida ? lectura.lineas.length : 0,
        cargadaPor: acceso.userName,
        cargadaPorId: acceso.userId || null,
      } as Partial<PaaVersion>);

      if (valida) {
        for (let i = 0; i < lectura.lineas.length; i += LOTE_DE_INSERCION) {
          await em.insert(
            PaaLinea,
            lectura.lineas.slice(i, i + LOTE_DE_INSERCION).map((l) => ({ ...l, versionId: version.id })),
          );
        }

        await em.update(
          PaaVersion,
          { vigenciaId, estado: 'VALIDADA', id: Not(version.id) },
          {
            estado: 'DESCARTADA',
            descartadaPor: acceso.userName,
            descartadaAt: new Date(),
            motivoDescarte: `Se cargó la versión ${numero} antes de activarla.`,
          },
        );

        await this.compararConLaAnterior(em, version, vigencia);
      }

      await this.traza(em, 'paa_versiones', version.id, 'CARGAR', acceso, {
        documento: documento.nombre,
        anio: vigencia.anio,
        numero,
        archivo: archivo.originalname,
        estado: version.estado,
        errores: lectura.errores.length,
        advertencias: advertencias.length,
        lineas: version.totalLineas,
      });
      return version.id;
    });

    return this.obtenerVersion(id);
  }

  /**
   * Compara contra la activa de la misma vigencia; si la vigencia todavía no
   * tiene, contra la activa del año anterior más cercano del mismo documento,
   * como referencia.
   */
  private async compararConLaAnterior(em: EntityManager, version: PaaVersion, vigencia: PaaVigencia) {
    let base = await em.findOne(PaaVersion, { where: { vigenciaId: vigencia.id, estado: 'ACTIVA' } });
    let tipo: TipoComparacionPaa = 'MISMA_VIGENCIA';

    if (!base) {
      const anterior = await em.findOne(PaaVigencia, {
        where: { documentoId: vigencia.documentoId, anio: LessThan(vigencia.anio) },
        order: { anio: 'DESC' },
      });
      base = anterior
        ? await em.findOne(PaaVersion, { where: { vigenciaId: anterior.id, estado: 'ACTIVA' } })
        : null;
      tipo = 'CAMBIO_VIGENCIA';
    }
    if (!base) return null;

    const [lineasBase, lineasNueva] = await Promise.all([
      em.find(PaaLinea, { where: { versionId: base.id } }),
      em.find(PaaLinea, { where: { versionId: version.id } }),
    ]);
    const comparacion = compararVersiones(lineasBase, lineasNueva, tipo);

    return em.save(PaaComparacion, {
      versionBaseId: base.id,
      versionNuevaId: version.id,
      tipo,
      confiable: comparacion.confiable,
      resumen: comparacion.resumen as unknown as Record<string, unknown>,
      detalle: comparacion.detalle as unknown as Record<string, unknown>,
    } as Partial<PaaComparacion>);
  }

  async obtenerVersion(id: string) {
    const version = await this.dataSource.getRepository(PaaVersion).findOne({ where: { id } });
    if (!version) throw new NotFoundException('La versión no existe');

    const vigencia = await this.dataSource.getRepository(PaaVigencia).findOneOrFail({ where: { id: version.vigenciaId } });
    const [documento, porRegion, comparacion] = await Promise.all([
      this.dataSource.getRepository(PaaDocumento).findOneOrFail({ where: { id: vigencia.documentoId } }),
      this.dataSource.query(
        `SELECT r.id, r.nombre, count(l.id)::int AS lineas
           FROM hiring.paa_lineas l JOIN hiring.paa_regiones r ON r.id = l.region_id
          WHERE l.version_id = $1
          GROUP BY r.id, r.nombre ORDER BY r.nombre`,
        [id],
      ),
      this.comparacionDe(id),
    ]);

    return {
      ...version,
      documento: { id: documento.id, nombre: documento.nombre },
      anio: vigencia.anio,
      vigente: vigencia.vigente,
      porRegion,
      comparacion: comparacion && {
        id: comparacion.id,
        tipo: comparacion.tipo,
        confiable: comparacion.confiable,
        resumen: comparacion.resumen,
        avisos: (comparacion.detalle as { avisos?: string[] }).avisos ?? [],
        base: comparacion.base,
      },
    };
  }

  /** La comparación de una versión contra la que la precedía, con el detalle completo. */
  async comparacion(versionId: string) {
    const comparacion = await this.comparacionDe(versionId);
    if (!comparacion) {
      throw new NotFoundException('Esta versión no tiene con qué compararse: es la primera que se carga.');
    }
    const regiones = await this.listarRegiones();
    return { ...comparacion, regiones: regiones.map((r) => ({ id: r.id, nombre: r.nombre })) };
  }

  private async comparacionDe(versionNuevaId: string) {
    const comparacion = await this.dataSource
      .getRepository(PaaComparacion)
      .findOne({ where: { versionNuevaId }, order: { createdAt: 'DESC' } });
    if (!comparacion) return null;
    const [base] = await this.dataSource.query(
      `SELECT v.id, v.numero, g.anio FROM hiring.paa_versiones v
         JOIN hiring.paa_vigencias g ON g.id = v.vigencia_id WHERE v.id = $1`,
      [comparacion.versionBaseId],
    );
    return { ...comparacion, base: base ?? null };
  }

  async lineasDeVersion(versionId: string, filtro: LineasDeVersionDto) {
    const pagina = filtro.pagina ?? 1;
    const consulta = this.dataSource
      .getRepository(PaaLinea)
      .createQueryBuilder('l')
      .where('l.version_id = :versionId', { versionId });
    if (filtro.region) consulta.andWhere('l.region_id = :region', { region: filtro.region });
    if (filtro.q?.trim()) {
      consulta.andWhere(`(l.codigo ILIKE :q OR l.valores->>'objeto' ILIKE :q)`, { q: `%${filtro.q.trim()}%` });
    }
    const [lineas, total] = await consulta
      .orderBy('l.fila', 'ASC')
      .skip((pagina - 1) * LINEAS_POR_PAGINA)
      .take(LINEAS_POR_PAGINA)
      .getManyAndCount();
    return { lineas, total, pagina, porPagina: LINEAS_POR_PAGINA };
  }

  async descartar(versionId: string, motivo: string, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const version = await em.findOne(PaaVersion, { where: { id: versionId } });
      if (!version) throw new NotFoundException('La versión no existe');
      if (version.estado !== 'VALIDADA') {
        throw new ConflictException(
          'Solo se descarta una versión validada que no se ha activado. Una activa se reemplaza cargando otra.',
        );
      }
      Object.assign(version, {
        estado: 'DESCARTADA',
        descartadaPor: acceso.userName,
        descartadaAt: new Date(),
        motivoDescarte: motivo.trim(),
      });
      await em.save(version);
      await this.traza(em, 'paa_versiones', versionId, 'DESCARTAR', acceso, { numero: version.numero, motivo });
      return this.resumenVersion(version);
    });
  }

  // ------------------------------------------------------------- de apoyo --

  /** Texto normalizado de la modalidad en el PAA → código del catálogo. */
  async equivalencias(): Promise<Map<string, string>> {
    const filas: { texto_normalizado: string; modalidad: string }[] = await this.dataSource.query(
      `SELECT e.texto_normalizado, e.modalidad
         FROM hiring.paa_equivalencias_modalidad e
         JOIN hiring.modalidades m ON m.codigo = e.modalidad AND m.activa`,
    );
    return new Map(filas.map((f) => [normalizar(f.texto_normalizado), f.modalidad]));
  }

  resumenVersion(v: PaaVersion) {
    return {
      id: v.id,
      numero: v.numero,
      estado: v.estado,
      nombreArchivo: v.nombreArchivo,
      totalLineas: v.totalLineas,
      errores: v.errores.length,
      advertencias: v.advertencias.length,
      cargadaPor: v.cargadaPor,
      cargadaAt: v.cargadaAt,
      activadaPor: v.activadaPor,
      activadaAt: v.activadaAt,
      descartadaPor: v.descartadaPor,
      descartadaAt: v.descartadaAt,
      motivoDescarte: v.motivoDescarte,
      reemplazadaAt: v.reemplazadaAt,
    };
  }

  async traza(
    em: EntityManager,
    entidad: string,
    entidadId: string,
    accion: AccionTraza,
    acceso: HiringAccess,
    detalle: Record<string, unknown>,
    procesoId: string | null = null,
  ) {
    await em.save(
      em.create(Trazabilidad, {
        procesoId,
        entidad,
        entidadId,
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
