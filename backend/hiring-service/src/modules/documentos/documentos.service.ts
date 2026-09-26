import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { DataSource, EntityManager, IsNull } from 'typeorm';

import { DocumentoProceso } from '../../entities/documento-proceso.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { CdpService } from '../cdp/cdp.service';
import {
  ArchivoRecibido,
  DocumentosActividadService,
} from '../documentos-actividad/documentos-actividad.service';

/** Actividad 5.1 de la matriz: la elaboración de documentos del proceso. */
export const NUMERAL_DOCUMENTOS = '5.1';

/**
 * La actividad 5.1: elaborar el aviso, el pliego o el acto de justificación
 * según la modalidad (EFDS-1149).
 *
 * Qué documentos pide lo dice el catálogo único, como en cualquier otra
 * actividad (EFDS-2066). Lo que sigue viviendo aquí es lo propio de la 5.1:
 * que hay modalidades que no la adelantan, que en contratación directa no se
 * elabora sin CDP, y que su estado lo deciden sus documentos —cargar el
 * último la cumple y sustituir uno la devuelve a borrador—.
 */
@Injectable()
export class DocumentosService implements OnModuleInit {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cdp: CdpService,
    private readonly catalogo: DocumentosActividadService,
  ) {}

  /** Las reglas de la 5.1 sobre sus documentos, para el catálogo único. */
  onModuleInit() {
    this.catalogo.registrarGuardia(NUMERAL_DOCUMENTOS, {
      antesDeCambiar: async (em, procesoId, cambio) => {
        const proceso = await this.exigirProceso(em, procesoId);

        const excluida = await this.exclusion(proceso.modalidad, em);
        if (excluida) {
          throw new BadRequestException(
            `Esta modalidad no elabora los documentos ordinarios del proceso: ${excluida.motivo}`,
          );
        }

        // En contratación directa el CDP se exige antes de elaborar (RF-EST-06).
        // Entrar por la carga directa no puede ser una forma de saltársela;
        // sustituir uno ya cargado no elabora nada nuevo.
        if (cambio === 'cargar') await this.cdp.exigirCdpParaDocumentos(procesoId, em);
      },
      despuesDeCambiar: (em, procesoId) => this.sincronizarActividad(em, procesoId),
    });
  }

  // ------------------------------------------------------- aplicabilidad ---

  /**
   * Si la modalidad elabora los documentos ordinarios del proceso.
   *
   * La exclusión vive en actividades_excluidas, igual que para el resto de la
   * etapa: es la misma matriz la que decide, y duplicar la regla aquí haría que
   * cambiarla en un sitio dejara el otro mintiendo.
   */
  private async exclusion(modalidad: string | null, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    if (!modalidad) return null;

    return manager.getRepository(ActividadExcluida).findOne({
      where: { numeral: NUMERAL_DOCUMENTOS, modalidad },
    });
  }

  // ------------------------------------------------------------- consulta --

  /**
   * Estado de la actividad: qué documentos exige la modalidad y cuáles ya están.
   *
   * Devuelve los requisitos aunque la actividad no se haya iniciado, porque
   * saber qué va a pedirse es lo que permite prepararlo. Iniciarla es un acto
   * de trazabilidad, no un permiso para consultar.
   */
  async estado(procesoId: string) {
    const proceso = await this.exigirProceso(this.dataSource.manager, procesoId);

    const excluida = await this.exclusion(proceso.modalidad);
    const modalidad = proceso.modalidad
      ? await this.dataSource
          .getRepository(Modalidad)
          .findOne({ where: { codigo: proceso.modalidad } })
      : null;

    const actividad = await this.dataSource.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_DOCUMENTOS },
    });

    const lista = await this.catalogo.estado(procesoId, NUMERAL_DOCUMENTOS);
    const documentos = lista.documentos;

    return {
      aplica: !excluida,
      motivoNoAplica: excluida?.motivo ?? null,
      modalidad: proceso.modalidad,
      modalidadNombre: modalidad?.nombre ?? proceso.modalidad,
      // No basta con que la fila exista: desde EFDS-1187 el proceso nace con
      // las 63 actividades de la matriz instanciadas. La elaboración empieza
      // cuando hay un documento cargado o cuando la actividad ya salió de
      // borrador, no cuando alguien crea el proceso.
      iniciada:
        !!actividad && (documentos.some((d) => d.cargado) || actividad.estado !== 'BORRADOR'),
      estado: actividad?.estado ?? 'PENDIENTE',
      documentos,
      // Misma cautela que en sincronizarActividad: una lista vacía de
      // requisitos no es una actividad completa.
      completa: documentos.some((d) => d.obligatorio) && lista.completo,
    };
  }

  // --------------------------------------------------------------- carga ---

  /**
   * Registra uno de los documentos que la actividad exige.
   *
   * Pasa por el catálogo, que aplica las reglas de la 5.1 registradas como su
   * guardia. Inicia la actividad si hacía falta: cargar el primer documento ya
   * demuestra que la elaboración empezó.
   */
  async cargar(
    procesoId: string,
    codigo: string,
    archivo: ArchivoRecibido,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.catalogo.cargar(procesoId, NUMERAL_DOCUMENTOS, codigo, archivo, hash, acceso);
    return this.estado(procesoId);
  }

  /** Deja sin efecto un documento cargado para poder sustituirlo. */
  async anular(procesoId: string, documentoProcesoId: string, acceso: HiringAccess) {
    await this.catalogo.anular(procesoId, NUMERAL_DOCUMENTOS, documentoProcesoId, acceso);
    return this.estado(procesoId);
  }

  // ----------------------------------------------------------- auxiliares --

  /**
   * Pone la actividad en el estado que reflejan sus documentos.
   *
   * Se recalcula en cada carga y en cada anulación en vez de avanzar en un solo
   * sentido: sustituir un documento devuelve la actividad a borrador, que es la
   * verdad —le falta uno— y no un retroceso que haya que explicar.
   */
  private async sincronizarActividad(em: EntityManager, procesoId: string) {
    const requeridos = await this.catalogo.requeridosDe(procesoId, NUMERAL_DOCUMENTOS, em);
    const cargados = await em.getRepository(DocumentoProceso).find({
      where: { procesoId, numeral: NUMERAL_DOCUMENTOS, anuladoAt: IsNull() },
    });

    const obligatorios = requeridos.filter((r) => r.obligatorio);

    // Sin un solo requisito la actividad NO está completa. `every` sobre una
    // lista vacía devuelve true, así que un proceso cuya modalidad no esté en
    // el catálogo —o que aún no la tenga— se daría por aprobado sin haber
    // cargado nada, y con el nombre de quien pasó por ahí como revisor.
    const completa =
      obligatorios.length > 0 &&
      obligatorios.every((r) => cargados.some((c) => c.codigo === r.codigo));

    const estado = completa ? 'APROBADO' : 'BORRADOR';

    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_DOCUMENTOS },
    });

    // No se toca revisadoPor: cargar el último documento no es revisarlo, y
    // firmar el expediente con el nombre de quien solo adjuntó atribuiría una
    // revisión que nadie hizo.
    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_DOCUMENTOS,
          estado: estado as any,
          datos: {},
        }),
      );
      return;
    }

    actividad.estado = estado as any;
    await em.save(actividad);
  }

  private async exigirProceso(em: EntityManager, procesoId: string): Promise<Proceso> {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');
    return proceso;
  }
}
