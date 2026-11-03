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
import { leerPaa, type RegionLeida } from './lector-paa';
import { compararVersiones } from './comparador-paa';
import { normalizar } from './estructura-paa';
import { nombreDeDocumento, ubicarArchivo } from './regiones-del-archivo';
import type { ActualizarRegionDto, LineasDeVersionDto } from './dto/paa.dto';

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

  async actualizarRegion(id: string, dto: ActualizarRegionDto, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const region = await em.findOne(PaaRegion, { where: { id } });
      if (!region) throw new NotFoundException('La región no existe');

      // El prefijo no se edita: sale del archivo, y las líneas y los procesos
      // ya lo llevan en su código.
      const antes = { ...region };
      Object.assign(region, {
        ...(dto.nombre !== undefined && { nombre: dto.nombre.trim() }),
        ...(dto.unidadContratacion !== undefined && { unidadContratacion: dto.unidadContratacion.trim() }),
        ...(dto.activa !== undefined && { activa: dto.activa }),
        updatedAt: new Date(),
      });
      await em.save(region);
      await this.traza(em, 'paa_regiones', id, 'CONFIGURAR', acceso, { antes, despues: dto });
      return region;
    });
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

  // ------------------------------------------------------------- versiones --

  /**
   * Carga el Excel de un territorio como versión nueva de su PAA del año.
   *
   * Basta con el archivo y el año: las regiones salen de sus líneas (el
   * prefijo del código y la unidad de contratación), y con ellas se sabe de
   * qué documento es. Un archivo con regiones nuevas las crea, y si ninguna
   * existía, crea también su documento; el año se abre si no estaba.
   *
   * Un archivo con errores queda `INVALIDA` con su reporte y no se guardan sus
   * líneas: no se puede activar, y guardarlas solo invitaría a usarlas. Uno
   * válido queda `VALIDADA` con su comparación; si ya había otra validada sin
   * activar, se descarta, porque dos candidatas a la vez es justo la ambigüedad
   * que el versionado quiere evitar.
   */
  async cargarPaa(
    anio: number,
    archivo: { filename: string; originalname: string },
    sha256: string,
    acceso: HiringAccess,
  ) {
    const contenido = await readFile(join(STORAGE_PATH, archivo.filename));
    const lectura = await leerPaa(contenido, { equivalencias: await this.equivalencias() });
    if (!lectura.regiones.length) {
      throw new BadRequestException(
        `No se pudo saber de qué territorio es el archivo: no se leyó ninguna línea con su región. ${resumenDeErrores(lectura.errores)}`,
      );
    }

    const [registradas, documentos] = await Promise.all([
      this.dataSource.getRepository(PaaRegion).find(),
      this.dataSource.getRepository(PaaDocumento).find(),
    ]);
    const ubicacion = ubicarArchivo(lectura.regiones, registradas, new Map(documentos.map((d) => [d.id, d.nombre])));
    if (ubicacion.errores.length && !ubicacion.documentoId) {
      throw new BadRequestException(resumenDeErrores(ubicacion.errores));
    }
    lectura.errores.unshift(...ubicacion.errores);

    const id = await this.dataSource.transaction(async (em) => {
      const documento = ubicacion.documentoId
        ? await em.findOneOrFail(PaaDocumento, { where: { id: ubicacion.documentoId } })
        : await this.crearDocumento(em, ubicacion.nuevas, acceso);

      // Con un error de regiones no se crea ninguna: el archivo queda inválido
      // en su documento y se corrige antes de que algo nazca de él.
      const regiones = registradas.filter((r) => r.documentoId === documento.id);
      const advertencias: HallazgoPaa[] = [...lectura.advertencias];
      if (!ubicacion.errores.length) {
        for (const leida of ubicacion.nuevas) {
          regiones.push(await this.crearRegion(em, leida, documento, acceso));
          advertencias.unshift({
            fila: leida.fila,
            columna: 'Descripción',
            valor: leida.prefijo,
            mensaje: `Región nueva: ${leida.unidadContratacion}, con el prefijo ${leida.prefijo} (${leida.lineas} líneas).`,
          });
        }
      }
      const regionDe = new Map(regiones.map((r) => [normalizar(r.prefijoLinea), r.id]));

      const vigencia = await this.vigenciaDelAnio(em, documento, anio, acceso);
      const vigenciaId = vigencia.id;

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
            lectura.lineas.slice(i, i + LOTE_DE_INSERCION).map((l) => ({
              versionId: version.id,
              regionId: regionDe.get(normalizar(l.prefijo))!,
              codigo: l.codigo,
              fila: l.fila,
              valores: l.valores,
              huella: l.huella,
            })),
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

  /** El documento de un territorio que carga su PAA por primera vez. */
  private async crearDocumento(em: EntityManager, regiones: RegionLeida[], acceso: HiringAccess) {
    const codigo = await this.codigoLibre(em, PaaDocumento, regiones.map((r) => r.prefijo).join('_'));
    const documento = await em.save(PaaDocumento, {
      codigo,
      nombre: nombreDeDocumento(regiones),
      createdBy: acceso.userName,
    } as Partial<PaaDocumento>);
    await this.traza(em, 'paa_documentos', documento.id, 'CREAR', acceso, { codigo, nombre: documento.nombre });
    return documento;
  }

  private async crearRegion(em: EntityManager, leida: RegionLeida, documento: PaaDocumento, acceso: HiringAccess) {
    const region = await em.save(PaaRegion, {
      codigo: await this.codigoLibre(em, PaaRegion, leida.prefijo),
      nombre: leida.unidadContratacion.trim(),
      prefijoLinea: leida.prefijo,
      unidadContratacion: leida.unidadContratacion.trim(),
      documentoId: documento.id,
      createdBy: acceso.userName,
    } as Partial<PaaRegion>);
    await this.traza(em, 'paa_regiones', region.id, 'CREAR', acceso, {
      prefijo: leida.prefijo,
      unidad: region.unidadContratacion,
      documento: documento.nombre,
      origen: 'archivo del PAA',
    });
    return region;
  }

  /** El código pedido, o con un sufijo si ya lo usa otro: «META», «META_2». */
  private async codigoLibre(em: EntityManager, entidad: typeof PaaDocumento | typeof PaaRegion, base: string) {
    const raiz = base.slice(0, 36);
    for (let n = 1; ; n++) {
      const codigo = n === 1 ? raiz : `${raiz}_${n}`;
      if (!(await em.findOne(entidad as typeof PaaRegion, { where: { codigo } }))) return codigo;
    }
  }

  /**
   * El año del documento; si no existía, se abre. Nace sin marca de vigente:
   * hasta que tenga una versión activa y alguien lo declare, los procesos del
   * territorio siguen saliendo del año anterior.
   */
  private async vigenciaDelAnio(em: EntityManager, documento: PaaDocumento, anio: number, acceso: HiringAccess) {
    const existente = await em.findOne(PaaVigencia, { where: { documentoId: documento.id, anio } });
    if (existente) return existente;
    const vigencia = await em.save(PaaVigencia, {
      documentoId: documento.id,
      anio,
      vigente: false,
      createdBy: acceso.userName,
    } as Partial<PaaVigencia>);
    await this.traza(em, 'paa_vigencias', vigencia.id, 'CREAR', acceso, { anio, documento: documento.nombre });
    return vigencia;
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

/** Los primeros errores, para un mensaje que no cabe en un reporte de versión. */
function resumenDeErrores(errores: HallazgoPaa[]): string {
  const primeros = errores.slice(0, 5).map((e) => (e.fila ? `Fila ${e.fila}: ${e.mensaje}` : e.mensaje));
  const resto = errores.length > 5 ? ` Y ${errores.length - 5} más.` : '';
  return primeros.join(' ') + resto;
}
