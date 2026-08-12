import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';

import { AperturaProceso } from '../../entities/apertura-proceso.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { CdpService } from '../cdp/cdp.service';
import { DocumentosService } from '../documentos/documentos.service';
import { RiesgosService } from '../riesgos/riesgos.service';
import { RegistrarAperturaDto } from './dto/apertura.dto';

/** Actividad 5.7 de la matriz: la apertura formal del proceso. */
export const NUMERAL_APERTURA = '5.7';

/** Archivo tal como lo entrega multer. */
interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class AperturaService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cdp: CdpService,
    private readonly documentos: DocumentosService,
    private readonly riesgos: RiesgosService,
  ) {}

  // ------------------------------------------------------------- consulta --

  /**
   * Qué falta para poder abrir el proceso, y con qué se abrió si ya está.
   *
   * Devuelve los requisitos por separado en vez de un solo booleano: "no se
   * puede abrir" sin decir qué falta obliga a adivinar entre el CDP, los
   * documentos y el rol.
   */
  async estado(procesoId: string) {
    const proceso = await this.exigirProceso(this.dataSource.manager, procesoId);

    const excluida = await this.dataSource.getRepository(ActividadExcluida).findOne({
      where: { numeral: NUMERAL_APERTURA, modalidad: proceso.modalidad ?? '' },
    });

    const modalidad = proceso.modalidad
      ? await this.dataSource
          .getRepository(Modalidad)
          .findOne({ where: { codigo: proceso.modalidad } })
      : null;

    const apertura = await this.dataSource.getRepository(AperturaProceso).findOne({
      where: { procesoId },
    });

    const respaldo = await this.cdp.estadoRespaldo(procesoId);
    const documentos = await this.documentos.estado(procesoId);
    const audiencia = await this.riesgos.requisitoParaApertura(procesoId);

    // Los tres documentos del acto, para que el panel pueda enseñarlos sin
    // pedir el expediente entero.
    const archivos = apertura
      ? await this.dataSource.getRepository(Documento).find({
          where: {
            id: In([
              apertura.resolucionDocumentoId,
              apertura.pliegoDocumentoId,
              apertura.evidenciaDocumentoId,
            ]),
          },
        })
      : [];

    const archivo = (id: string) => {
      const doc = archivos.find((d) => d.id === id);
      return doc
        ? { nombre: doc.archivoNombreOriginal ?? doc.nombre, url: doc.archivoUrl }
        : null;
    };

    return {
      aplica: !excluida,
      motivoNoAplica: excluida?.motivo ?? null,
      modalidad: proceso.modalidad,
      modalidadNombre: modalidad?.nombre ?? proceso.modalidad,
      abierta: !!apertura,
      apertura: apertura
        ? {
            resolucionNumero: apertura.resolucionNumero,
            resolucionFecha: apertura.resolucionFecha,
            secopUrl: apertura.secopUrl,
            abiertoPor: apertura.abiertoPor,
            abiertoAt: apertura.createdAt,
            resolucion: archivo(apertura.resolucionDocumentoId),
            pliegoDefinitivo: archivo(apertura.pliegoDocumentoId),
            evidencia: archivo(apertura.evidenciaDocumentoId),
          }
        : null,
      requisitos: {
        cdp: { cumplido: respaldo.puedeAbrirse, motivo: respaldo.motivo ?? null },
        // Los documentos de la 5.1 no bloquean la apertura —la historia solo
        // condiciona el CDP—, pero abrir con la elaboración a medias es una
        // señal de que algo se saltó, y callarlo no ayuda a nadie.
        documentos: { cumplido: !documentos.aplica || documentos.completa },
        // La audiencia de riesgos sí bloquea donde es obligatoria: es el
        // segundo criterio de EFDS-1153, y avanzar en la etapa 5 es abrir.
        audienciaRiesgos: audiencia,
      },
      puedeAbrir: !excluida && !apertura && respaldo.puedeAbrirse && audiencia.cumplido,
    };
  }

  // -------------------------------------------------------------- registro -

  /**
   * Registra la resolución de apertura y el pliego definitivo, y abre el proceso.
   *
   * Los dos documentos y la apertura entran en la misma transacción que el
   * cambio de etapa: si algo falla después, un proceso abierto sin la
   * resolución que lo respalda sería peor que no haberlo abierto.
   */
  async registrar(
    procesoId: string,
    dto: RegistrarAperturaDto,
    resolucion: ArchivoCargado,
    hashResolucion: string,
    pliego: ArchivoCargado,
    hashPliego: string,
    evidencia: ArchivoCargado,
    hashEvidencia: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);

      const excluida = await em.getRepository(ActividadExcluida).findOne({
        where: { numeral: NUMERAL_APERTURA, modalidad: proceso.modalidad ?? '' },
      });
      if (excluida) {
        throw new BadRequestException(
          `Esta modalidad no adelanta la apertura del proceso: ${excluida.motivo}`,
        );
      }

      const yaAbierto = await em.getRepository(AperturaProceso).findOne({ where: { procesoId } });
      if (yaAbierto) {
        throw new ConflictException(
          `El proceso ya fue abierto con la resolución ${yaAbierto.resolucionNumero}`,
        );
      }

      // RF-PUB-04: la audiencia obligatoria condiciona la apertura igual que el
      // CDP. Se comprueba aquí y no solo en la pantalla porque es una regla de
      // negocio: un cliente que llame la API directamente tampoco puede saltarla.
      const audiencia = await this.riesgos.requisitoParaApertura(procesoId, em);
      if (!audiencia.cumplido) {
        throw new ConflictException(`No se puede abrir el proceso: ${audiencia.motivo}`);
      }

      this.validarFecha(dto.resolucionFecha);

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const documentoResolucion = await this.guardarDocumento(
        em,
        expediente.id,
        'Resolución de apertura',
        resolucion,
        hashResolucion,
        acceso,
      );
      const documentoPliego = await this.guardarDocumento(
        em,
        expediente.id,
        'Pliego definitivo',
        pliego,
        hashPliego,
        acceso,
      );
      const documentoEvidencia = await this.guardarDocumento(
        em,
        expediente.id,
        'Evidencia de la publicación del pliego definitivo',
        evidencia,
        hashEvidencia,
        acceso,
      );

      const apertura = await em.save(
        em.create(AperturaProceso, {
          procesoId,
          resolucionNumero: dto.resolucionNumero,
          resolucionFecha: dto.resolucionFecha,
          resolucionDocumentoId: documentoResolucion.id,
          pliegoDocumentoId: documentoPliego.id,
          evidenciaDocumentoId: documentoEvidencia.id,
          secopUrl: dto.secopUrl ?? null,
          abiertoPor: acceso.userName,
        }),
      );

      // La mecánica de abrir vive en el ciclo del CDP desde EFDS-1148: valida
      // el respaldo presupuestal, mueve la etapa y da la actividad por
      // cumplida. Se le pasa el manager para que todo sea una sola transacción.
      await this.cdp.abrirProceso(procesoId, acceso, em);

      await this.traza(em, procesoId, apertura.id, 'PUBLICAR', acceso, {
        actividad: NUMERAL_APERTURA,
        resolucion: dto.resolucionNumero,
        fecha: dto.resolucionFecha,
        pliegoDefinitivo: documentoPliego.id,
        evidencia: evidencia.originalname,
      });
    });

    // Fuera de la transacción: el estado se lee por el manager del DataSource,
    // que no vería lo escrito hasta el commit.
    return this.estado(procesoId);
  }

  // ----------------------------------------------------------- auxiliares --

  /**
   * La resolución no puede ser del futuro.
   *
   * Es la fecha del acto administrativo, y de ella dependen los términos que
   * corren después: una fecha adelantada movería vencimientos que aún no han
   * empezado a contar.
   */
  private validarFecha(fecha: string) {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

    if (fecha > hoy) {
      throw new BadRequestException(
        'La fecha de la resolución no puede ser posterior a hoy: es la del acto ya firmado',
      );
    }
  }

  private guardarDocumento(
    em: EntityManager,
    expedienteId: string,
    nombre: string,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    return em.save(
      em.create(Documento, {
        expedienteId,
        numeral: NUMERAL_APERTURA,
        tipo: 'ADJUNTO',
        nombre,
        archivoUrl: `hiring/files/${archivo.filename}`,
        archivoNombreOriginal: archivo.originalname,
        archivoMimeType: archivo.mimetype,
        archivoTamano: archivo.size,
        hashSha256: hash,
        subidoPor: acceso.userName,
      } as Partial<Documento>),
    );
  }

  private async exigirProceso(em: EntityManager, procesoId: string): Promise<Proceso> {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');
    return proceso;
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
        entidad: 'aperturas_proceso',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
