import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, Not } from 'typeorm';

import { InformeEvaluacion, ResultadoInforme } from '../../entities/informe-evaluacion.entity';
import { PlazoTraslado } from '../../entities/plazo-traslado.entity';
import { ResultadoEvaluacion } from '../../entities/resultado-evaluacion.entity';
import { EvidenciaEvaluacion } from '../../entities/evidencia-evaluacion.entity';
import { RecepcionOfertas } from '../../entities/recepcion-ofertas.entity';
import { Oferente } from '../../entities/oferente.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { DiaNoHabil } from '../../entities/dia-no-habil.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { festivosEntre } from '../publicacion/festivos-colombia';
import { diasHabilesRestantes, estadoDelPlazo, sumarDiasHabiles } from '../publicacion/dias-habiles';
import { congelarResultado } from './congelar-resultado';
import { AnularInformeDto, GenerarInformeDto, TrasladarInformeDto } from './dto/traslado.dto';

/** Actividad 6.4 de la matriz: publicación y traslado del informe preliminar. */
export const NUMERAL_TRASLADO = '6.4';

export interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
}

/**
 * Traslado del informe de evaluación — actividad 6.4 (EFDS-1158, RF-PUB-08).
 *
 * Evaluadas las ofertas, la entidad publica el informe preliminar, lo traslada
 * a los oferentes y abre el término para que subsanen y observen. Es el debido
 * proceso previo a la adjudicación: sin traslado, el oferente se entera de que
 * quedó fuera cuando ya no puede hacer nada.
 *
 * **El informe congela su resultado.** El del comité se rectifica —corrige,
 * registra otro y el anterior queda como rectificado—, y así debe ser. Pero el
 * informe es una pieza notificada: si mañana el comité rectifica, lo que
 * recibió el oferente no puede cambiar detrás de él.
 *
 * Trasladar es de la entidad y no del comité: el comité evaluó, y nadie corre
 * el traslado de su propia evaluación.
 */
@Injectable()
export class TrasladoService {
  // Protegido y no privado: la actividad 6.5 (EFDS-1464) extiende este servicio
  // para reusar el proceso, el expediente, la traza y el calendario.
  constructor(protected readonly dataSource: DataSource) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, acceso: HiringAccess) {
    const proceso = await this.exigirProceso(this.dataSource.manager, procesoId);

    const excluida = await this.excluida(this.dataSource.manager, proceso);
    const modalidad = proceso.modalidad
      ? await this.dataSource
          .getRepository(Modalidad)
          .findOne({ where: { codigo: proceso.modalidad } })
      : null;

    const plazo = proceso.modalidad
      ? await this.dataSource
          .getRepository(PlazoTraslado)
          .findOne({ where: { modalidad: proceso.modalidad } })
      : null;

    const resultado = await this.resultadoVigente(procesoId);
    const informes = await this.dataSource.getRepository(InformeEvaluacion).find({
      where: { procesoId },
      order: { numero: 'DESC' },
    });
    const vigente = informes.find((i) => i.estado !== 'ANULADO') ?? null;

    const documentos = await this.documentosDe(
      informes.flatMap((i) => [i.informeDocumentoId, i.evidenciaDocumentoId]),
    );

    let restantes: number | null = null;
    if (vigente?.estado === 'TRASLADADO' && vigente.venceEl) {
      const hoy = this.hoy();
      const festivos = await this.calendarioPara(undefined, hoy, vigente.venceEl);
      restantes = diasHabilesRestantes(hoy, vigente.venceEl, festivos);
    }

    return {
      aplica: !excluida,
      motivoNoAplica: excluida?.motivo ?? null,
      modalidad: proceso.modalidad,
      modalidadNombre: modalidad?.nombre ?? proceso.modalidad,
      // Sin fila no se inventa un término: la pantalla lo dice y el traslado se
      // bloquea. Mismo criterio que el plazo de ofertas (EFDS-1430).
      plazo: plazo
        ? {
            diasHabiles: plazo.diasHabiles,
            fundamento: plazo.fundamento,
            confirmado: plazo.confirmado,
          }
        : null,
      // Que el resultado exista es la condición de la actividad: sin evaluación
      // registrada no hay informe que trasladar.
      hayResultado: !!resultado,
      puedeGenerar: !excluida && !!resultado && (!vigente || vigente.estado === 'BORRADOR'),
      puedeTrasladar:
        !excluida && !!vigente && vigente.estado === 'BORRADOR' && !!vigente.informeDocumentoId,
      informe: vigente ? this.presentar(vigente, documentos, restantes) : null,
      // Los anulados se muestran: son los que explican por qué hubo que
      // trasladar dos veces.
      anulados: informes
        .filter((i) => i.estado === 'ANULADO')
        .map((i) => this.presentar(i, documentos, null)),
    };
  }

  // -------------------------------------------------------------- informe --

  /**
   * Genera el informe preliminar, congelando el resultado del comité.
   *
   * Regenerar un borrador vuelve a tomar la fotografía en vez de crear otro
   * número: mientras no se traslade, nadie lo ha recibido, así que no hay nada
   * que preservar. Después del traslado ya no se regenera —se anula y se hace
   * otro—, porque ahí sí hay un oferente que lo leyó.
   */
  async generar(
    procesoId: string,
    dto: GenerarInformeDto,
    archivo: ArchivoCargado | null,
    hash: string | null,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      await this.exigirQueAplique(em, proceso);

      const resultado = await this.resultadoVigente(procesoId, em);
      if (!resultado) {
        throw new ConflictException(
          'El proceso no tiene resultado de evaluación registrado: no hay informe que trasladar',
        );
      }

      const previo = await this.informeEnJuego(procesoId, em);
      if (previo && previo.estado !== 'BORRADOR') {
        throw new ConflictException(
          'El informe ya fue trasladado: para rehacerlo hay que anularlo y generar otro',
        );
      }

      const snapshot = await this.congelar(em, proceso, resultado);

      const documentoId = archivo
        ? (
            await this.guardarDocumento(
              em,
              procesoId,
              'Informe de evaluación preliminar',
              archivo,
              hash as string,
              acceso,
            )
          ).id
        : (previo?.informeDocumentoId ?? null);

      const informe =
        previo ??
        em.create(InformeEvaluacion, {
          procesoId,
          numero: await this.siguienteNumero(procesoId, em),
        });

      informe.resultadoId = resultado.id;
      informe.resultado = snapshot;
      informe.ofertasRecibidas = snapshot.ofertas.length;
      informe.observacionEntidad = dto.observacion?.trim() || null;
      informe.informeDocumentoId = documentoId;
      informe.estado = 'BORRADOR';
      informe.generadoPor = acceso.userName;
      informe.generadoAt = new Date();

      const guardado = await em.save(informe);

      await this.marcarActividad(em, procesoId, acceso);
      await this.traza(em, procesoId, guardado.id, previo ? 'GUARDAR' : 'CREAR', acceso, {
        actividad: NUMERAL_TRASLADO,
        numero: guardado.numero,
        resultado: resultado.id,
        ofertasRecibidas: guardado.ofertasRecibidas,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Publica el informe, lo traslada y abre el término de subsanaciones.
   *
   * El plazo y su vencimiento se congelan en vez de recalcularse en cada
   * consulta, igual que en la recepción de ofertas: si mañana se corrige el
   * término de la modalidad, los traslados en curso conservan el suyo.
   */
  async trasladar(
    procesoId: string,
    dto: TrasladarInformeDto,
    evidencia: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      await this.exigirQueAplique(em, proceso);

      const informe = await this.informeEnJuego(procesoId, em);
      if (!informe) {
        throw new NotFoundException('Primero se genera el informe preliminar');
      }
      if (informe.estado !== 'BORRADOR') {
        throw new ConflictException('Este informe ya fue trasladado');
      }
      if (!informe.informeDocumentoId) {
        throw new BadRequestException(
          'Adjunta el informe preliminar antes de trasladarlo: lo que se notifica es el documento',
        );
      }

      const plazo = proceso.modalidad
        ? await em.getRepository(PlazoTraslado).findOne({ where: { modalidad: proceso.modalidad } })
        : null;
      if (!plazo) {
        throw new ConflictException(
          'Esta modalidad no tiene plazo de traslado parametrizado: confírmalo antes de trasladar (EFDS-1467)',
        );
      }

      const desde = this.hoy();
      const festivos = await this.calendarioPara(em, desde);

      const doc = await this.guardarDocumento(
        em,
        procesoId,
        'Evidencia de la publicación del informe de evaluación',
        evidencia,
        hash,
        acceso,
      );

      informe.estado = 'TRASLADADO';
      informe.evidenciaDocumentoId = doc.id;
      informe.trasladadoPor = acceso.userName;
      informe.trasladadoAt = new Date();
      informe.plazoDiasHabiles = plazo.diasHabiles;
      informe.venceEl = sumarDiasHabiles(desde, plazo.diasHabiles, festivos);
      await em.save(informe);

      await this.marcarActividad(em, procesoId, acceso);
      await this.traza(em, procesoId, informe.id, 'TRASLADAR', acceso, {
        actividad: NUMERAL_TRASLADO,
        numero: informe.numero,
        medio: dto.medioPublicacion.trim(),
        plazoDiasHabiles: plazo.diasHabiles,
        venceEl: informe.venceEl,
        // Que el plazo aplicado sea un supuesto del equipo queda en la traza:
        // si mañana Contratación lo corrige, se puede saber cuáles corrieron
        // con la cifra sin confirmar.
        plazoConfirmado: plazo.confirmado,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Anula el informe en juego para poder rehacerlo.
   *
   * No se borra: pudo haberse trasladado, y entonces hay oferentes que lo
   * leyeron y subsanaciones colgando de él. Queda con su motivo y el proceso
   * vuelve a quedar sin informe hasta que se genere otro.
   */
  async anular(procesoId: string, dto: AnularInformeDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      await this.exigirProceso(em, procesoId);

      const informe = await this.informeEnJuego(procesoId, em);
      if (!informe) throw new NotFoundException('El proceso no tiene informe de evaluación');

      informe.estado = 'ANULADO';
      informe.anuladoAt = new Date();
      informe.motivoAnulacion = dto.motivo.trim();
      await em.save(informe);

      await this.marcarActividad(em, procesoId, acceso);
      await this.traza(em, procesoId, informe.id, 'ANULAR', acceso, {
        actividad: NUMERAL_TRASLADO,
        numero: informe.numero,
        motivo: dto.motivo.trim(),
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ----------------------------------------------------------- auxiliares --

  /**
   * La fotografía del resultado que se traslada.
   *
   * La regla de copiar en vez de referenciar vive en `congelarResultado`, que
   * comparten los dos informes —este y el definitivo de la etapa 7—. Aquí solo
   * se trae de la base lo que esa función necesita.
   */
  private async congelar(
    em: EntityManager,
    proceso: Proceso,
    resultado: ResultadoEvaluacion,
  ): Promise<ResultadoInforme> {
    const oferentes = await this.ofertasDe(em, proceso.id);
    const evidencias = await em.getRepository(EvidenciaEvaluacion).find({
      where: { resultadoId: resultado.id },
      order: { createdAt: 'ASC' },
    });

    return congelarResultado(proceso.modalidad, resultado, oferentes, evidencias);
  }

  private presentar(
    informe: InformeEvaluacion,
    documentos: Map<string, Documento>,
    diasRestantes: number | null,
  ) {
    const doc = informe.informeDocumentoId ? documentos.get(informe.informeDocumentoId) : undefined;
    const evidencia = informe.evidenciaDocumentoId
      ? documentos.get(informe.evidenciaDocumentoId)
      : undefined;

    return {
      id: informe.id,
      numero: informe.numero,
      estado: informe.estado,
      resultadoId: informe.resultadoId,
      resultado: informe.resultado,
      ofertasRecibidas: informe.ofertasRecibidas,
      observacionEntidad: informe.observacionEntidad,
      informe: doc ? { id: doc.id, nombre: doc.nombre, archivoUrl: doc.archivoUrl } : null,
      evidencia: evidencia
        ? { id: evidencia.id, nombre: evidencia.nombre, archivoUrl: evidencia.archivoUrl }
        : null,
      generadoPor: informe.generadoPor,
      generadoAt: informe.generadoAt,
      trasladadoPor: informe.trasladadoPor,
      trasladadoAt: informe.trasladadoAt,
      plazoDiasHabiles: informe.plazoDiasHabiles,
      venceEl: informe.venceEl,
      diasRestantes,
      estadoPlazo: estadoDelPlazo(diasRestantes),
      cerradoPor: informe.cerradoPor,
      cerradoAt: informe.cerradoAt,
      anuladoAt: informe.anuladoAt,
      motivoAnulacion: informe.motivoAnulacion,
    };
  }

  /** El informe que no está anulado. Solo puede haber uno (índice parcial). */
  protected informeEnJuego(procesoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager
      .getRepository(InformeEvaluacion)
      .findOne({ where: { procesoId, estado: Not('ANULADO') } });
  }

  private async siguienteNumero(procesoId: string, em: EntityManager): Promise<number> {
    const ultimo = await em.getRepository(InformeEvaluacion).find({
      where: { procesoId },
      order: { numero: 'DESC' },
      take: 1,
    });
    return (ultimo[0]?.numero ?? 0) + 1;
  }

  private resultadoVigente(procesoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager
      .getRepository(ResultadoEvaluacion)
      .findOne({ where: { procesoId, estado: 'VIGENTE' } });
  }

  private async ofertasDe(em: EntityManager, procesoId: string): Promise<Oferente[]> {
    const recepcion = await em.getRepository(RecepcionOfertas).findOne({ where: { procesoId } });
    if (!recepcion) return [];

    return em.getRepository(Oferente).find({
      where: { recepcionId: recepcion.id },
      order: { numero: 'ASC' },
    });
  }

  protected async documentosDe(ids: (string | null)[]): Promise<Map<string, Documento>> {
    const unicos = [...new Set(ids.filter((id): id is string => !!id))];
    if (unicos.length === 0) return new Map();

    const documentos = await this.dataSource
      .getRepository(Documento)
      .find({ where: { id: In(unicos) } });

    return new Map(documentos.map((d) => [d.id, d]));
  }

  private excluida(em: EntityManager, proceso: Proceso) {
    return em.getRepository(ActividadExcluida).findOne({
      where: { numeral: NUMERAL_TRASLADO, modalidad: proceso.modalidad ?? '' },
    });
  }

  private async exigirQueAplique(em: EntityManager, proceso: Proceso) {
    const excluida = await this.excluida(em, proceso);
    if (excluida) {
      throw new BadRequestException(
        `Esta modalidad no traslada informe de evaluación: ${excluida.motivo}`,
      );
    }
  }

  /**
   * La actividad queda cumplida cuando el informe se traslada, no cuando se
   * genera: un borrador es trabajo interno y nadie lo ha recibido.
   */
  private async marcarActividad(em: EntityManager, procesoId: string, acceso: HiringAccess) {
    const informe = await this.informeEnJuego(procesoId, em);
    const trasladado = informe?.estado === 'TRASLADADO' || informe?.estado === 'CERRADO';
    const estado = trasladado ? 'APROBADO' : 'BORRADOR';

    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_TRASLADO },
    });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_TRASLADO,
          estado: estado as any,
          datos: {},
          ...(trasladado ? { revisadoPor: acceso.userName, revisadoAt: new Date() } : {}),
        }),
      );
      return;
    }

    actividad.estado = estado as any;
    actividad.revisadoPor = trasladado ? acceso.userName : null;
    actividad.revisadoAt = trasladado ? new Date() : null;
    await em.save(actividad);
  }

  protected async guardarDocumento(
    em: EntityManager,
    procesoId: string,
    nombre: string,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
    numeral: string = NUMERAL_TRASLADO,
  ) {
    const expediente = await em.findOne(Expediente, { where: { procesoId } });
    if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

    return em.save(
      em.create(Documento, {
        expedienteId: expediente.id,
        numeral,
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

  // ------------------------------------------------------------ calendario --

  /**
   * Días no hábiles que aplican a un rango de años.
   *
   * Mismo criterio que la publicación del pliego: los festivos nacionales se
   * calculan y la tabla solo aporta los días que la entidad declare por su
   * cuenta. Se repite aquí y no se importa el privado de aquel servicio porque
   * son dos actividades distintas; el conteo vive en `dias-habiles`, que sí es
   * compartido y está probado.
   */
  private async calendario(desdeAnio: number, hastaAnio: number, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    const dias = festivosEntre(desdeAnio, hastaAnio);

    for (const propio of await manager.getRepository(DiaNoHabil).find()) {
      dias.add(propio.fecha);
    }
    return dias;
  }

  protected calendarioPara(em: EntityManager | undefined, ...fechas: string[]) {
    const anios = fechas.map((f) => Number(f.slice(0, 4)));
    return this.calendario(Math.min(...anios), Math.max(...anios) + 1, em);
  }

  /**
   * Hoy en Bogotá, que es la zona en la que corren los términos del proceso.
   *
   * Pasar por UTC daría el día siguiente para cualquier hora posterior a las
   * 19:00 locales, y ahí un día de diferencia es un plazo mal contado.
   */
  protected hoy(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }

  protected async exigirProceso(em: EntityManager, procesoId: string): Promise<Proceso> {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');
    return proceso;
  }

  protected traza(
    em: EntityManager,
    procesoId: string,
    entidadId: string,
    accion: AccionTraza,
    acceso: HiringAccess,
    detalle: Record<string, unknown>,
    entidad: string = 'informe_evaluacion',
  ) {
    return em.save(
      em.create(Trazabilidad, {
        procesoId,
        entidadId,
        entidad,
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
