import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';
import { access } from 'fs/promises';
import { basename, join } from 'path';

import { HiringAccess } from '../../auth/hiring-access';
import { AlcanceService } from '../../auth/alcance.service';
import { Documento } from '../../entities/documento.entity';
import { DocumentoProceso } from '../../entities/documento-proceso.entity';
import { DocumentoRequerido } from '../../entities/documento-requerido.entity';
import { Expediente } from '../../entities/expediente.entity';
import { Plantilla } from '../../entities/plantilla.entity';
import { Proceso } from '../../entities/proceso.entity';
import {
  NUMERAL_ESTUDIO_PREVIO,
  ProcesoActividad,
} from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { STORAGE_PATH } from '../archivos';
import { exigirExpedienteAbierto } from '../archivo-expediente/expediente-archivado';
import {
  aplicaAlProceso,
  GuardiaDeDocumentos,
  obligatoriosPendientes,
} from './requisitos';

/** Un archivo ya recibido por multer. */
export interface ArchivoRecibido {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/** Un documento que la actividad pide, con lo que se haya entregado de él. */
export interface DocumentoDeLaActividad {
  requisitoId: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  obligatorio: boolean;
  /**
   * Si el requisito es cita del formato oficial o lectura del equipo. Viaja
   * hasta la pantalla a propósito: a quien se le exige un documento le
   * corresponde saber de dónde sale la exigencia.
   */
  confirmado: boolean;
  estado: 'PENDIENTE' | 'CARGADO';
  /** La plantilla en blanco; null si el requisito no tiene o no se ha subido. */
  plantilla: {
    codigo: string;
    nombre: string;
    version: string;
    descargaUrl: string | null;
  } | null;
  cargado: {
    /** La fila de documentos_proceso: es lo que se anula para sustituirlo. */
    id: string;
    documentoId: string;
    nombre: string;
    descargaUrl: string | null;
    subidoPor: string | null;
    cargadoAt: string;
  } | null;
}

/**
 * Los documentos que pide cada actividad y lo que el proceso ha entregado de
 * ellos (EFDS-2066).
 *
 * Un solo catálogo para las sesenta y tres: `documentos_requeridos` dice qué
 * se pide, dónde, a qué modalidades y tipologías, si es obligatorio y con qué
 * plantilla; `documentos_proceso` dice qué archivo cubre cada requisito. Antes
 * lo mismo se decía de tres maneras —la lista fija de la 3.1, la de la 5.1 y
 * los formatos asignados en la biblioteca—, cada una con su servicio.
 *
 * Lo que se sube sin corresponder a ningún requisito se guarda igual, como
 * adicional: hay anexos que ninguna lista previó.
 */
@Injectable()
export class DocumentosActividadService {
  /** Las reglas propias de algunas actividades, por numeral. */
  private readonly guardias = new Map<string, GuardiaDeDocumentos>();

  constructor(
    private readonly dataSource: DataSource,
    /** Quién puede cargar en cada actividad (migración 083). */
    private readonly alcance: AlcanceService,
  ) {}

  /**
   * Registra las reglas propias de una actividad.
   *
   * Lo llama el módulo dueño de la actividad al arrancar, así el catálogo no
   * tiene que importarlo: ese módulo ya importa este para preguntar qué falta.
   */
  registrarGuardia(numeral: string, guardia: GuardiaDeDocumentos) {
    this.guardias.set(numeral, guardia);
  }

  // -------------------------------------------------------------- catálogo --

  /**
   * Lo que la actividad le pide a este proceso.
   *
   * La tipología sale de los datos de la 3.1, que es donde el área la elige;
   * mientras no la elija, los requisitos que declaran tipología no aplican.
   */
  async requeridosDe(
    procesoId: string,
    numeral: string,
    em?: EntityManager,
  ): Promise<DocumentoRequerido[]> {
    const manager = em ?? this.dataSource.manager;
    const proceso = await this.exigirProceso(manager, procesoId);
    const tipologia = await this.tipologiaDe(manager, procesoId);

    const todos = await manager.getRepository(DocumentoRequerido).find({
      where: { numeral, activo: true },
      order: { orden: 'ASC', nombre: 'ASC' },
    });

    return todos.filter((r) => aplicaAlProceso(r, proceso.modalidad, tipologia));
  }

  /**
   * Los obligatorios que el proceso aún no entrega en esta actividad.
   *
   * Es la pregunta que hacen los que deciden si la actividad puede avanzar
   * —enviar el estudio previo, aprobar, registrar—. Recibe el manager porque
   * la hacen dentro de su transacción, y el del DataSource no vería lo que
   * esa misma transacción acaba de escribir.
   */
  async faltantes(
    procesoId: string,
    numeral: string,
    em?: EntityManager,
  ): Promise<DocumentoRequerido[]> {
    const manager = em ?? this.dataSource.manager;
    const requeridos = await this.requeridosDe(procesoId, numeral, manager);
    const entregados = await this.vigentesDe(manager, procesoId, numeral);
    return obligatoriosPendientes(
      requeridos,
      entregados.map((e) => e.codigo),
    );
  }

  // -------------------------------------------------------------- consulta --

  /**
   * Qué pide la actividad y qué se ha entregado ya.
   *
   * Responde aunque no haya requisitos: la lista vacía es la respuesta
   * correcta para las actividades que no piden documentos, y obliga a la
   * pantalla a distinguirla de un fallo.
   */
  async estado(procesoId: string, numeral: string, acceso?: HiringAccess) {
    const em = this.dataSource.manager;
    const proceso = await this.exigirProceso(em, procesoId);
    const tipologia = await this.tipologiaDe(em, procesoId);

    const requeridos = await this.requeridosDe(procesoId, numeral, em);
    const vigentes = await this.vigentesDe(em, procesoId, numeral);
    const plantillas = await this.plantillasVigentes(
      em,
      requeridos.map((r) => r.plantillaCodigo).filter((c): c is string => !!c),
    );

    const expediente = await em.getRepository(Expediente).findOne({ where: { procesoId } });
    const archivos = expediente
      ? await em.getRepository(Documento).find({
          where: { expedienteId: expediente.id, numeral, tipo: 'ADJUNTO' },
          order: { createdAt: 'DESC' },
        })
      : [];
    const porId = new Map(archivos.map((d) => [d.id, d]));

    const documentos: DocumentoDeLaActividad[] = await Promise.all(
      requeridos.map(async (req) => {
        const entregado = vigentes.find((v) => v.codigo === req.codigo);
        const archivo = entregado ? porId.get(entregado.documentoId) : undefined;
        const plantilla = req.plantillaCodigo ? plantillas.get(req.plantillaCodigo) : undefined;

        return {
          requisitoId: req.id,
          codigo: req.codigo,
          nombre: req.nombre,
          descripcion: req.descripcion ?? null,
          obligatorio: req.obligatorio,
          confirmado: req.confirmado,
          estado: entregado ? 'CARGADO' : 'PENDIENTE',
          plantilla: plantilla
            ? {
                codigo: plantilla.codigo,
                nombre: plantilla.nombre,
                version: plantilla.version,
                // Solo si el archivo está de verdad en disco. Un enlace que
                // devuelve 404 es peor que no ofrecerlo: el gestor no sabe si
                // falló la red, si perdió el permiso o si el formato no existe.
                descargaUrl: (await this.archivoExiste(plantilla.archivoUrl))
                  ? this.rutaDescarga(plantilla.archivoUrl)
                  : null,
              }
            : null,
          cargado: entregado
            ? {
                id: entregado.id,
                documentoId: entregado.documentoId,
                nombre: archivo?.archivoNombreOriginal ?? archivo?.nombre ?? '',
                descargaUrl: this.rutaDescarga(archivo?.archivoUrl),
                subidoPor: entregado.cargadoPor ?? null,
                cargadoAt: entregado.createdAt.toISOString(),
              }
            : null,
        };
      }),
    );

    /*
     * Lo que se subió sin requisito detrás.
     *
     * Quedan fuera los que alguna vez cubrieron uno, aunque se hayan
     * sustituido: un memorando anulado no pasa a ser un anexo más, sigue
     * siendo la versión anterior del memorando.
     */
    const conRequisito = new Set(
      (
        await em.getRepository(DocumentoProceso).find({ where: { procesoId, numeral } })
      ).map((d) => d.documentoId),
    );
    const adicionales = archivos
      .filter((d) => !conRequisito.has(d.id))
      .map((d) => ({
        id: d.id,
        nombre: d.archivoNombreOriginal ?? d.nombre,
        descargaUrl: this.rutaDescarga(d.archivoUrl),
        subidoPor: d.subidoPor ?? null,
        cargadoAt: d.createdAt.toISOString(),
      }));

    const faltantes = obligatoriosPendientes(
      documentos,
      documentos.filter((d) => d.cargado).map((d) => d.codigo),
    );

    return {
      numeral,
      modalidad: proceso.modalidad,
      tipologia,
      documentos,
      adicionales,
      faltantes: faltantes.map((f) => ({ codigo: f.codigo, nombre: f.nombre })),
      /** Si no falta ningún obligatorio. */
      completo: faltantes.length === 0,
      /*
       * Si quien mira puede cargar y retirar.
       *
       * Lo resuelve el servidor y no la pantalla: ofrecerle «Cargar documento»
       * a quien solo aprueba es ofrecerle un botón que el servicio va a
       * rechazarle con un 403, y el gestor no sabría por qué no pasa nada.
       * Las reglas propias de la actividad —el estudio previo en revisión, el
       * CDP de la 5.1— no se reflejan aquí: esas las explica el servicio al
       * intentarlo, con su motivo.
       */
      puedeCargar: acceso ? await this.alcance.puedeEn(acceso, 'editar', numeral) : true,
    };
  }

  // ----------------------------------------------------------------- carga --

  /**
   * Guarda un documento de la actividad.
   *
   * Con `codigo` cubre ese requisito; sin él es un anexo adicional. Es la
   * misma carga en los dos casos —lo que cambia es si cumple algo o no—.
   *
   * Acepta el manager de quien llama para que otro flujo —el soporte del
   * registro de actividad— pueda guardar el archivo como parte de su propia
   * transacción.
   */
  async cargar(
    procesoId: string,
    numeral: string,
    codigo: string | undefined,
    archivo: ArchivoRecibido,
    hash: string,
    acceso: HiringAccess,
    em?: EntityManager,
  ): Promise<Documento> {
    const trabajo = async (m: EntityManager) => {
      await this.exigirProceso(m, procesoId);
      await this.guardias.get(numeral)?.antesDeCambiar?.(m, procesoId, 'cargar', acceso);

      let requisito: DocumentoRequerido | undefined;
      if (codigo) {
        requisito = (await this.requeridosDe(procesoId, numeral, m)).find(
          (r) => r.codigo === codigo,
        );
        if (!requisito) {
          throw new BadRequestException(
            `El documento "${codigo}" no está entre los que la actividad ${numeral} pide a este proceso`,
          );
        }

        const vigente = await m.getRepository(DocumentoProceso).findOne({
          where: { procesoId, numeral, codigo, anuladoAt: IsNull() },
        });
        if (vigente) {
          throw new ConflictException(
            `${requisito.nombre} ya está cargado. Sustitúyelo si necesitas cambiarlo.`,
          );
        }
      }

      // Un expediente archivado no recibe documentos (EFDS-1174).
      const expediente = await exigirExpedienteAbierto(m, procesoId);
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      // Qué versión del formato estaba vigente al diligenciarlo: el requisito
      // cita el código, el documento recuerda la versión (migración 063).
      const plantilla = requisito?.plantillaCodigo
        ? (await this.plantillasVigentes(m, [requisito.plantillaCodigo])).get(
            requisito.plantillaCodigo,
          )
        : undefined;

      const documento = await m.save(
        m.create(Documento, {
          expedienteId: expediente.id,
          numeral,
          tipo: 'ADJUNTO',
          nombre: requisito?.nombre ?? archivo.originalname,
          archivoUrl: `hiring/files/${archivo.filename}`,
          archivoNombreOriginal: archivo.originalname,
          archivoMimeType: archivo.mimetype,
          archivoTamano: archivo.size,
          hashSha256: hash,
          plantillaId: plantilla?.id ?? null,
          subidoPor: acceso.userName,
        } as Partial<Documento>),
      );

      if (requisito) {
        await m.save(
          m.create(DocumentoProceso, {
            procesoId,
            numeral,
            codigo: requisito.codigo,
            documentoId: documento.id,
            cargadoPor: acceso.userName,
          }),
        );
      }

      await this.traza(m, procesoId, documento.id, 'ADJUNTAR', acceso, {
        numeral,
        documento: requisito?.codigo ?? null,
        formato: plantilla ? `${plantilla.codigo} v${plantilla.version}` : null,
        archivo: archivo.originalname,
      });

      await this.guardias.get(numeral)?.despuesDeCambiar?.(m, procesoId);
      return documento;
    };

    return em ? trabajo(em) : this.dataSource.transaction(trabajo);
  }

  /**
   * Deja sin efecto la entrega de un requisito para poder sustituirla.
   *
   * No la borra: el expediente responde ante entes de control, y que hubo una
   * versión anterior es parte de lo que prueba.
   */
  async anular(
    procesoId: string,
    numeral: string,
    documentoProcesoId: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      await this.exigirProceso(em, procesoId);
      await this.guardias.get(numeral)?.antesDeCambiar?.(em, procesoId, 'anular', acceso);
      await exigirExpedienteAbierto(em, procesoId);

      const entregado = await em.getRepository(DocumentoProceso).findOne({
        where: { id: documentoProcesoId, procesoId, numeral, anuladoAt: IsNull() },
      });
      if (!entregado) {
        throw new NotFoundException('El documento no existe o ya fue sustituido');
      }

      entregado.anuladoAt = new Date();
      entregado.anuladoPor = acceso.userName;
      await em.save(entregado);

      await this.traza(em, procesoId, entregado.documentoId, 'ANULAR', acceso, {
        numeral,
        documento: entregado.codigo,
      });

      await this.guardias.get(numeral)?.despuesDeCambiar?.(em, procesoId);
    });

    return { anulado: true };
  }

  /**
   * Retira un anexo adicional.
   *
   * Se borra la fila porque no cumplía ningún requisito: el expediente ya
   * guarda la traza de que se cargó y de que se retiró, con quién y cuándo.
   * Lo que sí cubre un requisito no se retira por aquí sino que se anula, para
   * que la versión anterior siga en el expediente.
   */
  async retirar(procesoId: string, documentoId: string, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const expediente = await exigirExpedienteAbierto(em, procesoId);
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const documento = await em.getRepository(Documento).findOne({
        where: { id: documentoId, expedienteId: expediente.id },
      });
      if (!documento) throw new NotFoundException('El documento no está en este expediente');

      // El snapshot del formulario no es un adjunto que alguien pueda quitar:
      // es la copia de lo que se envió, y sin ella la revisión no prueba nada.
      if (documento.tipo !== 'ADJUNTO') {
        throw new BadRequestException(
          'Este registro no es un adjunto: es la copia de lo que se envió a revisión',
        );
      }

      const cubre = await em.getRepository(DocumentoProceso).findOne({
        where: { documentoId: documento.id },
      });
      if (cubre) {
        throw new ConflictException(
          'Este documento cubre un requisito de la actividad: sustitúyelo en lugar de retirarlo',
        );
      }

      await this.guardias
        .get(documento.numeral)
        ?.antesDeCambiar?.(em, procesoId, 'anular', acceso);

      await this.traza(em, procesoId, documento.id, 'ANULAR', acceso, {
        numeral: documento.numeral,
        archivo: documento.archivoNombreOriginal ?? documento.nombre,
      });

      await em.getRepository(Documento).remove(documento);

      return { retirado: true };
    });
  }

  // ------------------------------------------------------------ auxiliares --

  /** Lo entregado y vigente; lo sustituido queda fuera por `anuladoAt`. */
  private vigentesDe(em: EntityManager, procesoId: string, numeral: string) {
    return em.getRepository(DocumentoProceso).find({
      where: { procesoId, numeral, anuladoAt: IsNull() },
    });
  }

  /**
   * La tipología contractual que el área eligió en la 3.1.
   *
   * Se lee de los datos del estudio previo y no de una columna del proceso
   * porque es ahí donde vive: es un campo configurable del formulario.
   */
  private async tipologiaDe(em: EntityManager, procesoId: string): Promise<string | null> {
    const estudio = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_ESTUDIO_PREVIO },
    });
    const valor = (estudio?.datos as Record<string, unknown> | undefined)?.tipologia_contractual;
    return typeof valor === 'string' && valor.trim() ? valor : null;
  }

  /**
   * La versión activa más reciente de cada código.
   *
   * La biblioteca conserva las versiones anteriores para los procesos viejos;
   * lo que se ofrece para diligenciar hoy es la última.
   */
  private async plantillasVigentes(
    em: EntityManager,
    codigos: string[],
  ): Promise<Map<string, Plantilla>> {
    if (codigos.length === 0) return new Map();

    const filas = await em.getRepository(Plantilla).find({
      where: { codigo: In([...new Set(codigos)]), activo: true },
      order: { createdAt: 'DESC' },
    });

    const vigentes = new Map<string, Plantilla>();
    for (const p of filas) if (!vigentes.has(p.codigo)) vigentes.set(p.codigo, p);
    return vigentes;
  }

  private async exigirProceso(em: EntityManager, procesoId: string): Promise<Proceso> {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');
    return proceso;
  }

  /**
   * La ruta con la que la pantalla descarga el archivo.
   *
   * La columna guarda prefijos distintos segun que modulo escribiera: los
   * paneles ponen `hiring/files/` y la biblioteca de formatos `/files/`. El
   * cliente le antepone el prefijo del servicio a lo que reciba, asi que
   * devolver la columna cruda da un 404 en la mitad de los casos. Se rearma
   * desde el nombre, que es lo unico que el controlador necesita.
   */
  private rutaDescarga(url: string | null | undefined): string | null {
    return url ? `/files/${basename(url)}` : null;
  }

  /**
   * Si el archivo del formato está en disco.
   *
   * La ruta guardada y el archivo pueden separarse: una restauración de base
   * sin los adjuntos, un despliegue con volumen nuevo, o un borrado a mano.
   * Ofrecer entonces «Descargar la plantilla» lleva a un 404 crudo, y el
   * gestor no puede distinguirlo de un fallo de la plataforma.
   */
  private async archivoExiste(url: string | null | undefined): Promise<boolean> {
    if (!url) return false;

    // Solo el nombre: el basename iguala los prefijos y evita que una ruta
    // manipulada salga de STORAGE_PATH.
    try {
      await access(join(STORAGE_PATH, basename(url)));
      return true;
    } catch {
      return false;
    }
  }

  private traza(
    em: EntityManager,
    procesoId: string,
    entidadId: string,
    accion: AccionTraza,
    acceso: HiringAccess,
    detalle: Record<string, unknown>,
  ) {
    return em.save(
      em.create(Trazabilidad, {
        procesoId,
        entidadId,
        entidad: 'documentos_proceso',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}

