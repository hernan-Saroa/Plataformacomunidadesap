import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, Not } from 'typeorm';

import {
  CambiosDelDefinitivo,
  InformeDefinitivo,
} from '../../entities/informe-definitivo.entity';
import { ActoAdjudicacion } from '../../entities/acto-adjudicacion.entity';
import { InformeEvaluacion } from '../../entities/informe-evaluacion.entity';
import { Subsanacion } from '../../entities/subsanacion.entity';
import { ResultadoEvaluacion } from '../../entities/resultado-evaluacion.entity';
import { EvidenciaEvaluacion } from '../../entities/evidencia-evaluacion.entity';
import { AudienciaAdjudicacion } from '../../entities/audiencia-adjudicacion.entity';
import { Documento } from '../../entities/documento.entity';
import { Oferente } from '../../entities/oferente.entity';
import { Proceso } from '../../entities/proceso.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { congelarResultado } from '../traslado/congelar-resultado';
import {
  AdjudicacionBase,
  ArchivoCargado,
  NUMERAL_AUDIENCIA,
  NUMERAL_INFORME_DEFINITIVO,
} from './adjudicacion.base';
import { AnularDefinitivoDto, PublicarDefinitivoDto } from './dto/informe-definitivo.dto';
import { CierreActividadService } from '../cierre-actividad/cierre-actividad.service';

/**
 * Informe de evaluación definitivo — actividad 7.2 (EFDS-1159).
 *
 * El que se produce después de la audiencia y sobre el que se adjudica.
 *
 * Congela el resultado como el preliminar, pero toma el **vigente** del comité y
 * no el que se congeló al trasladar. Si el comité rectificó a raíz de una
 * subsanación aceptada, adjudicar sobre la foto vieja sería adjudicar contra lo
 * que la propia entidad aceptó. No es una excepción a la regla del congelado:
 * cada informe fotografía lo que era cierto el día en que se notificó, y son
 * días distintos.
 */
@Injectable()
export class InformeDefinitivoService extends AdjudicacionBase {
  constructor(dataSource: DataSource, cierre: CierreActividadService) {
    super(dataSource, cierre);
  }

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string) {
    const em = this.dataSource.manager;
    const proceso = await this.exigirProceso(em, procesoId);

    const excluida = await this.excluida(em, proceso, NUMERAL_INFORME_DEFINITIVO);

    const informes = await em
      .getRepository(InformeDefinitivo)
      .find({ where: { procesoId }, order: { generadoAt: 'DESC' } });
    const vigente = informes.find((i) => i.estado !== 'ANULADO') ?? null;

    const documentos = await this.documentosDe(
      informes.flatMap((i) => [
        i.informeDocumentoId,
        i.evidenciaDocumentoId,
        ...(i.versiones ?? []).flatMap((v) => [v.documentoId, v.evidenciaDocumentoId]),
      ]),
    );

    const preliminar = await this.preliminarEnJuego(em, procesoId);
    const audienciaPendiente = await this.audienciaPendiente(em, proceso);
    const resultado = await this.resultadoVigente(em, procesoId);

    return {
      aplica: !excluida,
      motivoNoAplica: excluida?.motivo ?? null,
      trasladoCerrado: preliminar?.estado === 'CERRADO',
      // Cuál de los pasos falta se dice por separado: son actividades distintas
      // del riel y se resuelven en pantallas distintas.
      audienciaPendiente,
      hayResultado: !!resultado,
      puedeGenerar:
        !excluida &&
        preliminar?.estado === 'CERRADO' &&
        !audienciaPendiente &&
        !!resultado &&
        (!vigente ||
          vigente.estado === 'BORRADOR' ||
          (vigente.estado === 'PUBLICADO' && !(await this.hayActo(em, procesoId)))),
      // Actualizar un informe que ya existe pide motivo: queda en su historial.
      actualizarPideMotivo: !!vigente,
      puedePublicar:
        !excluida && !!vigente && vigente.estado === 'BORRADOR' && !!vigente.informeDocumentoId,
      informe: vigente ? this.presentar(vigente, documentos) : null,
      anulados: informes
        .filter((i) => i.estado === 'ANULADO')
        .map((i) => this.presentar(i, documentos)),
    };
  }

  // -------------------------------------------------------------- informe --

  /**
   * Genera el definitivo congelando el resultado vigente del comité.
   *
   * Regenerar un borrador vuelve a tomar la fotografía, con el mismo criterio
   * del preliminar: mientras no se publique, nadie lo ha leído.
   */
  async generar(
    procesoId: string,
    archivo: ArchivoCargado | null,
    hash: string | null,
    acceso: HiringAccess,
    motivo?: string,
    decision: { oferenteId?: string; valorEvaluado?: number; justificacion?: string } = {},
  ) {
    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      await this.exigirQueNoEsteDesierto(em, procesoId);
      await this.exigirQueAplique(em, proceso, NUMERAL_INFORME_DEFINITIVO);

      const preliminar = await this.exigirTrasladoCerrado(em, procesoId);
      await this.exigirAudiencia(em, proceso);

      const resultado = await this.resultadoVigente(em, procesoId);
      if (!resultado) {
        throw new ConflictException(
          'El proceso no tiene resultado de evaluación vigente: el comité rectificó y todavía no registró otro',
        );
      }

      const previo = await this.definitivoEnJuego(em, procesoId);
      // Publicado también se actualiza (EFDS-1159): el informe cambia después
      // de la audiencia. Lo que ya no se mueve es lo adjudicado sobre él.
      if (previo && previo.estado === 'PUBLICADO' && (await this.hayActo(em, procesoId))) {
        throw new ConflictException(
          'El proceso ya se adjudicó sobre este informe: para cambiarlo hay que revocar el acto',
        );
      }
      const elMotivo = motivo?.trim() || null;
      if (previo && !elMotivo) {
        throw new BadRequestException(
          'Di por qué se actualiza el informe definitivo: queda en su historial de versiones',
        );
      }

      const oferentes = await this.ofertasDe(em, procesoId);
      const evidencias = await em
        .getRepository(EvidenciaEvaluacion)
        .find({ where: { resultadoId: resultado.id }, order: { createdAt: 'ASC' } });

      // La ganadora se decide aquí (EFDS-1157). Al actualizar sin nombrarla se
      // conserva la que ya tenía el informe, con su valor y su justificación.
      const anterior = previo?.resultado ?? null;
      const ganadoraId = decision.oferenteId ?? anterior?.ganadora?.oferenteId ?? null;
      if (!ganadoraId) {
        throw new BadRequestException(
          'Di cuál oferta gana: la evaluación preliminar no la nombra, se decide en el informe definitivo',
        );
      }
      const mismaGanadora = ganadoraId === anterior?.ganadora?.oferenteId;
      const snapshot = congelarResultado(proceso.modalidad, resultado, oferentes, evidencias, {
        oferenteId: ganadoraId,
        valorEvaluado:
          decision.valorEvaluado ?? (mismaGanadora ? anterior?.valorEvaluado : undefined),
        justificacion:
          decision.justificacion ?? (mismaGanadora ? anterior?.justificacion : undefined),
      });
      const cambios = await this.calcularCambios(em, preliminar, resultado, oferentes, ganadoraId);

      const documentoId = archivo
        ? (
            await this.guardarDocumento(
              em,
              procesoId,
              NUMERAL_INFORME_DEFINITIVO,
              'Informe de evaluación definitivo',
              archivo,
              hash as string,
              acceso,
            )
          ).id
        : (previo?.informeDocumentoId ?? null);

      const informe = previo ?? em.create(InformeDefinitivo, { procesoId });

      informe.informePreliminarId = preliminar.id;
      informe.resultadoId = resultado.id;
      informe.resultado = snapshot;
      informe.cambios = cambios;
      informe.ofertasRecibidas = snapshot.ofertas.length;
      informe.informeDocumentoId = documentoId;
      informe.estado = 'BORRADOR';
      informe.generadoPor = acceso.userName;
      informe.generadoAt = new Date();
      // Una versión actualizada se publica otra vez: la publicación anterior
      // queda en su versión del historial.
      informe.evidenciaDocumentoId = null;
      informe.enlacePublicacion = null;
      informe.publicadoAt = null;
      informe.publicadoPor = null;
      const versiones = previo?.versiones ?? [];
      informe.versiones = [
        ...versiones,
        {
          numero: versiones.length + 1,
          documentoId,
          generadoAt: informe.generadoAt.toISOString(),
          generadoPor: acceso.userName,
          motivo: elMotivo,
          evidenciaDocumentoId: null,
          enlacePublicacion: null,
          publicadoAt: null,
          publicadoPor: null,
        },
      ];

      const guardado = await em.save(informe);

      await this.marcarActividad(em, procesoId, NUMERAL_INFORME_DEFINITIVO, false, acceso);
      await this.traza(
        em,
        procesoId,
        guardado.id,
        'informe_definitivo',
        previo ? 'GUARDAR' : 'CREAR',
        acceso,
        {
          actividad: NUMERAL_INFORME_DEFINITIVO,
          resultado: resultado.id,
          // Que el desenlace cambiara respecto de lo notificado es el hecho que
          // hay que poder rastrear después.
          huboRectificacion: cambios.huboRectificacion,
          cambioLaGanadora: cambios.cambioLaGanadora,
          version: informe.versiones.length,
          motivo: elMotivo,
          estabaPublicado: previo?.estado === 'PUBLICADO',
        },
      );
    });

    return this.estado(procesoId);
  }

  /** Publica el definitivo con el soporte de la publicación. */
  async publicar(
    procesoId: string,
    dto: PublicarDefinitivoDto,
    evidencia: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      await this.exigirProceso(em, procesoId);

      const informe = await this.definitivoEnJuego(em, procesoId);
      if (!informe) throw new NotFoundException('Primero se genera el informe definitivo');
      if (informe.estado !== 'BORRADOR') {
        throw new ConflictException('Este informe definitivo ya se publicó');
      }
      if (!informe.informeDocumentoId) {
        throw new ConflictException(
          'Adjunta el informe definitivo antes de publicarlo: lo que se publica es el documento',
        );
      }

      const doc = await this.guardarDocumento(
        em,
        procesoId,
        NUMERAL_INFORME_DEFINITIVO,
        'Evidencia de la publicación del informe definitivo',
        evidencia,
        hash,
        acceso,
      );

      informe.estado = 'PUBLICADO';
      informe.evidenciaDocumentoId = doc.id;
      informe.enlacePublicacion = dto.enlace.trim();
      informe.publicadoPor = acceso.userName;
      informe.publicadoAt = new Date();
      // La publicación se anota en la versión vigente, que es la última.
      const versiones = [...(informe.versiones ?? [])];
      const ultima = versiones[versiones.length - 1];
      if (ultima) {
        versiones[versiones.length - 1] = {
          ...ultima,
          evidenciaDocumentoId: doc.id,
          enlacePublicacion: informe.enlacePublicacion,
          publicadoAt: informe.publicadoAt.toISOString(),
          publicadoPor: acceso.userName,
        };
      }
      informe.versiones = versiones;
      await em.save(informe);

      await this.marcarActividad(
        em,
        procesoId,
        NUMERAL_INFORME_DEFINITIVO,
        true,
        acceso,
        dto.firma,
      );
      await this.traza(em, procesoId, informe.id, 'informe_definitivo', 'PUBLICAR', acceso, {
        actividad: NUMERAL_INFORME_DEFINITIVO,
        enlace: dto.enlace.trim(),
      });
    });

    return this.estado(procesoId);
  }

  /** Anula el definitivo en juego para poder rehacerlo. */
  async anular(procesoId: string, dto: AnularDefinitivoDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      await this.exigirProceso(em, procesoId);

      const informe = await this.definitivoEnJuego(em, procesoId);
      if (!informe) throw new NotFoundException('El proceso no tiene informe definitivo');

      informe.estado = 'ANULADO';
      informe.anuladoAt = new Date();
      informe.motivoAnulacion = dto.motivo.trim();
      await em.save(informe);

      await this.marcarActividad(em, procesoId, NUMERAL_INFORME_DEFINITIVO, false, acceso);
      await this.traza(em, procesoId, informe.id, 'informe_definitivo', 'ANULAR', acceso, {
        actividad: NUMERAL_INFORME_DEFINITIVO,
        motivo: dto.motivo.trim(),
      });
    });

    return this.estado(procesoId);
  }

  // ----------------------------------------------------------- auxiliares --

  /** Si ya hay acto de adjudicación vigente: sobre él el informe no se mueve. */
  private async hayActo(em: EntityManager, procesoId: string) {
    return (
      (await em
        .getRepository(ActoAdjudicacion)
        .count({ where: { procesoId, estado: 'VIGENTE' } })) > 0
    );
  }

  /**
   * Qué cambió entre lo que se notificó y lo que se va a adjudicar.
   *
   * Se guarda resuelto y no se deduce comparando dos jsonb a mano: es la
   * pregunta que hace el oferente que no ganó, y el expediente tiene que poder
   * responderla sin que nadie ponga los dos informes lado a lado.
   */
  protected async calcularCambios(
    em: EntityManager,
    preliminar: InformeEvaluacion,
    vigente: ResultadoEvaluacion,
    oferentes: Oferente[],
    ganadoraId: string,
  ): Promise<CambiosDelDefinitivo> {
    const escritos = await em
      .getRepository(Subsanacion)
      .find({ where: { informeId: preliminar.id }, order: { fechaPresentacion: 'ASC' } });

    const aceptadas = escritos.filter((e) => e.aceptada === true);
    const porOferta = new Map(oferentes.map((o) => [o.id, o]));

    // El resultado que se trasladó puede ya no ser el vigente. Si lo
    // rectificaron, su motivo es lo que explica el cambio.
    const rectificado =
      preliminar.resultadoId !== vigente.id
        ? await em
            .getRepository(ResultadoEvaluacion)
            .findOne({ where: { id: preliminar.resultadoId } })
        : null;

    return {
      huboRectificacion: preliminar.resultadoId !== vigente.id,
      motivoRectificacion: rectificado?.motivoRectificacion ?? null,
      // Desde la 120 el preliminar no nombra ganadora: solo cambia si la nombró.
      cambioLaGanadora:
        !!preliminar.resultado?.ganadora &&
        preliminar.resultado.ganadora.oferenteId !== ganadoraId,
      subsanacionesAceptadas: aceptadas.map((e) => ({
        id: e.id,
        oferente: porOferta.get(e.oferenteId)?.nombre ?? 'Oferta retirada',
        asunto: e.asunto,
      })),
      escritosPresentados: escritos.length,
    };
  }

  private presentar(informe: InformeDefinitivo, documentos: Map<string, Documento>) {
    const doc = informe.informeDocumentoId ? documentos.get(informe.informeDocumentoId) : undefined;
    const evidencia = informe.evidenciaDocumentoId
      ? documentos.get(informe.evidenciaDocumentoId)
      : undefined;

    return {
      id: informe.id,
      estado: informe.estado,
      informePreliminarId: informe.informePreliminarId,
      resultadoId: informe.resultadoId,
      resultado: informe.resultado,
      cambios: informe.cambios,
      ofertasRecibidas: informe.ofertasRecibidas,
      informe: doc ? { id: doc.id, nombre: doc.nombre, archivoUrl: doc.archivoUrl } : null,
      evidencia: evidencia
        ? { id: evidencia.id, nombre: evidencia.nombre, archivoUrl: evidencia.archivoUrl }
        : null,
      enlacePublicacion: informe.enlacePublicacion,
      versiones: (informe.versiones ?? []).map((v) => {
        const documento = v.documentoId ? documentos.get(v.documentoId) : undefined;
        const soporte = v.evidenciaDocumentoId ? documentos.get(v.evidenciaDocumentoId) : undefined;
        return {
          numero: v.numero,
          generadoAt: v.generadoAt,
          generadoPor: v.generadoPor,
          motivo: v.motivo,
          informe: documento
            ? { id: documento.id, nombre: documento.nombre, archivoUrl: documento.archivoUrl }
            : null,
          evidencia: soporte
            ? { id: soporte.id, nombre: soporte.nombre, archivoUrl: soporte.archivoUrl }
            : null,
          enlacePublicacion: v.enlacePublicacion,
          publicadoAt: v.publicadoAt,
          publicadoPor: v.publicadoPor,
        };
      }),
      generadoPor: informe.generadoPor,
      generadoAt: informe.generadoAt,
      publicadoPor: informe.publicadoPor,
      publicadoAt: informe.publicadoAt,
      anuladoAt: informe.anuladoAt,
      motivoAnulacion: informe.motivoAnulacion,
    };
  }

  /**
   * Donde la modalidad tiene audiencia, el definitivo va después de ella: la
   * matriz dice que es "el informe que se genera luego de la audiencia".
   * Donde no la tiene, no hay nada que esperar.
   */
  private async exigirAudiencia(em: EntityManager, proceso: Proceso) {
    if (await this.audienciaPendiente(em, proceso)) {
      throw new ConflictException(
        'La audiencia de adjudicación todavía no se ha registrado: el informe definitivo se genera después de ella',
      );
    }
  }

  private async audienciaPendiente(em: EntityManager, proceso: Proceso): Promise<boolean> {
    const excluida = await this.excluida(em, proceso, NUMERAL_AUDIENCIA);
    if (excluida) return false;

    const audiencia = await em
      .getRepository(AudienciaAdjudicacion)
      .findOne({ where: { procesoId: proceso.id, estado: Not('ANULADA') } });

    return !audiencia;
  }

  protected definitivoEnJuego(em: EntityManager, procesoId: string) {
    return em
      .getRepository(InformeDefinitivo)
      .findOne({ where: { procesoId, estado: Not('ANULADO') } });
  }

  private async preliminarEnJuego(em: EntityManager, procesoId: string) {
    const informes = await em
      .getRepository(InformeEvaluacion)
      .find({ where: { procesoId }, order: { numero: 'DESC' } });

    return informes.find((i) => i.estado !== 'ANULADO') ?? null;
  }

  protected resultadoVigente(em: EntityManager, procesoId: string) {
    return em
      .getRepository(ResultadoEvaluacion)
      .findOne({ where: { procesoId, estado: 'VIGENTE' } });
  }
}
