import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { DataSource, EntityManager, IsNull } from 'typeorm';

import { Proceso } from '../../entities/proceso.entity';
import { SesionComiteContratacion } from '../../entities/comite-contratacion.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { DocumentoProceso } from '../../entities/documento-proceso.entity';
import { Revision } from '../../entities/revision.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { ParticipacionService } from '../participacion/participacion.service';
import { CdpService } from '../cdp/cdp.service';
import { AprobacionService } from '../aprobacion/aprobacion.service';
import { CierreActividadService } from '../cierre-actividad/cierre-actividad.service';
import {
  ArchivoRecibido,
  DocumentosActividadService,
} from '../documentos-actividad/documentos-actividad.service';
import { ComiteContratacionService, exigeObservaciones } from './comite-contratacion.service';
import { RegistrarSegundaSesionDto } from './dto/comite-contratacion.dto';
import {
  NUMERAL_SEGUNDA_SESION,
  cambiaronTrasElProyecto,
  estadoTrasLaSegundaSesion,
  motivoParaNoRegistrarLaSesion,
  requisitoDeLaSegundaSesion,
} from './segunda-sesion';

/** Los documentos del proceso son los de la 5.1; la 5.6.1 les sube versión. */
const NUMERAL_DOCUMENTOS = '5.1';

/** Estados en los que el abogado todavía puede ajustar el pliego definitivo. */
const EDITABLE = ['BORRADOR', 'DEVUELTO'];

/**
 * Pliego definitivo y segunda sesión del Comité — actividad 5.6.1 (113).
 *
 * En licitación pública el proceso va dos veces al Comité de Contratación. La
 * primera es la 3.7. La segunda llega después de atender las observaciones al
 * proyecto de pliego y repite el ciclo entero sobre las versiones definitivas:
 *
 * 1. El abogado del caso sube versión solo de los documentos de la 5.1 que
 *    cambian. Los demás conservan la versión aprobada, y el historial queda en
 *    el catálogo, que nunca borra una versión sustituida.
 * 2. Los envía por el trámite genérico de aprobación, con la cadena que rija
 *    para la 5.6.1 —abogado revisor y después la directora—. Ni se envía ni se
 *    aprueba sin el CDP cargado: es la condición que este servicio le registra.
 * 3. Transcribe lo que decidió el comité. El acta puede llegar después.
 *
 * La apertura (5.7) pregunta por el resultado con `requisitoDeLaSegundaSesion`.
 */
@Injectable()
export class SegundaSesionService implements OnModuleInit {
  constructor(
    private readonly dataSource: DataSource,
    private readonly participacion: ParticipacionService,
    private readonly cdp: CdpService,
    private readonly aprobacion: AprobacionService,
    private readonly cierre: CierreActividadService,
    private readonly catalogo: DocumentosActividadService,
    private readonly comite: ComiteContratacionService,
  ) {}

  /** Sin el CDP cargado el pliego definitivo ni se envía ni se aprueba. */
  onModuleInit() {
    this.aprobacion.registrarCondicion(NUMERAL_SEGUNDA_SESION, async (em, procesoId, momento) => {
      const { cumplido, motivo } = await this.requisitoCdp(procesoId, em);
      if (!cumplido) {
        throw new ConflictException(
          `${motivo}. Sin el CDP cargado el pliego definitivo no ${
            momento === 'ENVIAR' ? 'se envía a revisión' : 'se aprueba'
          } ni pasa a la segunda sesión del comité`,
        );
      }
    });
  }

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, acceso: HiringAccess) {
    const em = this.dataSource.manager;
    await this.exigirProceso(em, procesoId);

    const actividad = await this.actividad(em, procesoId);
    const estadoActual = actividad?.estado ?? 'BORRADOR';
    const aplica = estadoActual !== 'NO_APLICA';

    const cdp = await this.requisitoCdp(procesoId, em);
    const { responsable, puesto, motivo } = await this.participacion.quienHace(
      procesoId,
      acceso,
      NUMERAL_SEGUNDA_SESION,
    );

    const sesiones = await this.sesiones(em, procesoId);
    const ultima = sesiones[0]?.decision ?? null;
    const noRegistra = motivoParaNoRegistrarLaSesion(estadoActual, ultima);

    // Los documentos de la 5.1, con la marca de cuáles cambiaron desde que se
    // publicó el proyecto: es lo que el revisor, la directora y el comité
    // tienen que mirar de nuevo.
    const lista = aplica ? await this.catalogo.estado(procesoId, NUMERAL_DOCUMENTOS) : null;
    const publicadoEl = aplica ? await this.publicadoEl(em, procesoId) : null;

    return {
      aplica,
      estado: estadoActual,
      cdp,
      publicadoEl,
      documentos: (lista?.documentos ?? [])
        .filter((d) => !d.informativo)
        .map((d) => ({
          codigo: d.codigo,
          nombre: d.nombre,
          obligatorio: d.obligatorio,
          vigente: d.cargado,
          anteriores: d.anteriores,
          nuevaVersion: cambiaronTrasElProyecto(d.cargado?.cargadoAt ?? null, publicadoEl),
        })),
      /** Si quien mira puede subir versiones: le toca y la actividad está abierta. */
      puedeAjustar: aplica && motivo === null && EDITABLE.includes(estadoActual),
      /** Y retirarlo de revisión para corregir (el trámite exige que sea quien lo envió). */
      puedeRetirar: aplica && motivo === null && estadoActual === 'EN_REVISION',
      sesiones: sesiones.map((s) => ({
        id: s.id,
        fecha: s.fecha,
        decision: s.decision,
        condiciones: s.condiciones,
        observaciones: s.observaciones,
        tieneActa: s.actaDocumentoId !== null,
        registradoPor: s.registradoPor,
        createdAt: s.createdAt,
      })),
      puedeRegistrar: aplica && motivo === null && noRegistra === null && cdp.cumplido,
      motivoNoRegistra: noRegistra ?? (cdp.cumplido ? null : cdp.motivo),
      puedeCargarActa: motivo === null,
      motivoNoDecide: motivo,
      responsable: responsable ? { nombre: responsable.nombre, usuarioNombre: responsable.usuarioNombre } : null,
      puesto,
      /** Lo que la apertura le pregunta a esta actividad. */
      apertura: requisitoDeLaSegundaSesion(estadoActual, sesiones),
    };
  }

  // ------------------------------------------------- versiones definitivas --

  /**
   * Sube la versión definitiva de un documento de la 5.1.
   *
   * Si ya tenía versión cargada, la sustituye en la misma transacción: anular y
   * cargar por separado dejaría la 5.1 un instante en borrador. La anterior no
   * se borra; queda en el historial del documento.
   */
  async nuevaVersion(
    procesoId: string,
    codigo: string,
    archivo: ArchivoRecibido,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.exigirQueLeToque(procesoId, acceso);

    await this.dataSource.transaction(async (em) => {
      const actividad = await this.actividad(em, procesoId, true);
      if (!actividad || actividad.estado === 'NO_APLICA') {
        throw new ConflictException('Esta modalidad no tiene segunda sesión del comité');
      }
      if (!EDITABLE.includes(actividad.estado)) {
        throw new ConflictException(
          actividad.estado === 'EN_REVISION'
            ? 'El pliego definitivo está en revisión: retíralo de revisión para cambiar un documento'
            : 'El pliego definitivo ya fue aprobado: si el comité lo observa, vuelve a quedar abierto',
        );
      }

      const vigente = await em.getRepository(DocumentoProceso).findOne({
        where: { procesoId, numeral: NUMERAL_DOCUMENTOS, codigo, anuladoAt: IsNull() },
      });
      if (vigente) {
        await this.catalogo.anular(procesoId, NUMERAL_DOCUMENTOS, vigente.id, acceso, em);
      }
      await this.catalogo.cargar(procesoId, NUMERAL_DOCUMENTOS, codigo, archivo, hash, acceso, em);

      await this.traza(em, procesoId, actividad.id, 'ADJUNTAR', acceso, {
        actividad: NUMERAL_SEGUNDA_SESION,
        versionDefinitiva: codigo,
        sustituye: vigente?.documentoId ?? null,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Envía el pliego definitivo a su cadena de aprobación.
   *
   * Por aquí y no por el envío genérico: aquel pide «editar» en la actividad,
   * y la 5.6.1 la hace el abogado con «aprobar», como la 3.7. Lo que manda es
   * que ocupe el puesto que la hace; el CDP lo exige la condición registrada.
   */
  async enviar(procesoId: string, acceso: HiringAccess) {
    await this.exigirQueLeToque(procesoId, acceso);
    await this.aprobacion.enviar(procesoId, NUMERAL_SEGUNDA_SESION, acceso);
    return this.estado(procesoId, acceso);
  }

  /** Lo retira de revisión para corregirlo; el trámite exige que sea quien lo envió. */
  async retirar(procesoId: string, acceso: HiringAccess) {
    await this.exigirQueLeToque(procesoId, acceso);
    await this.aprobacion.retirar(procesoId, NUMERAL_SEGUNDA_SESION, acceso);
    return this.estado(procesoId, acceso);
  }

  // ------------------------------------------------------- la segunda sesión --

  /**
   * Transcribe lo que decidió el comité con el pliego definitivo.
   *
   * Aprobar —con o sin condiciones— habilita la apertura. Observar devuelve la
   * 5.6.1 a quien la envió: ajusta lo que el comité pidió y la cadena empieza
   * otra vez, porque el comité va a ver una versión distinta de la que avalaron
   * el revisor y la directora. Rechazar niega la actividad y el proceso.
   */
  async registrar(
    procesoId: string,
    dto: RegistrarSegundaSesionDto,
    archivo: ArchivoRecibido | null,
    hash: string | null,
    acceso: HiringAccess,
  ) {
    await this.exigirQueLeToque(procesoId, acceso);

    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId, true);
      if (proceso.estado !== 'EN_CURSO') {
        throw new ConflictException('El proceso ya no está en curso');
      }

      const actividad = await this.actividad(em, procesoId, true);
      if (!actividad) throw new NotFoundException('El proceso no tiene la actividad 5.6.1');

      const sesiones = await this.sesiones(em, procesoId);
      const noRegistra = motivoParaNoRegistrarLaSesion(actividad.estado, sesiones[0]?.decision ?? null);
      if (noRegistra) throw new ConflictException(noRegistra);

      const cdp = await this.requisitoCdp(procesoId, em);
      if (!cdp.cumplido) {
        throw new ConflictException(`${cdp.motivo}. Sin el CDP cargado el proceso no pasa a la segunda sesión del comité`);
      }

      if (dto.fecha > this.hoy()) {
        throw new BadRequestException('La sesión del comité no puede ser posterior a hoy');
      }

      const condiciones = dto.condiciones?.trim() || null;
      const observaciones = dto.observaciones?.trim() || null;
      if (dto.decision === 'APROBADO_CON_CONDICIONES' && !condiciones) {
        throw new BadRequestException(
          'Di a qué queda condicionada la aprobación: sin condiciones, es una aprobación a secas',
        );
      }
      if (exigeObservaciones(dto.decision, false) && !observaciones) {
        throw new BadRequestException(
          dto.decision === 'RECHAZADO'
            ? 'Escribe por qué el comité rechaza el proceso'
            : 'Escribe qué observó el comité: es lo que hay que ajustar en el pliego definitivo',
        );
      }

      const cierra = dto.decision !== 'OBSERVADO';
      if (cierra && (await this.cierre.exigeFirma(em, NUMERAL_SEGUNDA_SESION))) {
        this.cierre.exigirFirmaValida(dto.firma);
      }

      const acta =
        archivo && hash
          ? await this.comite.guardarActa(em, procesoId, NUMERAL_SEGUNDA_SESION, archivo, hash, acceso)
          : null;

      const sesion = await em.save(
        em.create(SesionComiteContratacion, {
          procesoId,
          sumision: 2,
          fecha: dto.fecha,
          decision: dto.decision,
          condiciones: dto.decision === 'APROBADO_CON_CONDICIONES' ? condiciones : null,
          observaciones: exigeObservaciones(dto.decision, false) ? observaciones : null,
          actaDocumentoId: acta?.id ?? null,
          registradoPor: acceso.userName,
          registradoPorId: acceso.userId ?? null,
        } as Partial<SesionComiteContratacion>),
      );

      const estado = estadoTrasLaSegundaSesion(dto.decision);
      if (estado !== actividad.estado) {
        actividad.estado = estado;
        actividad.revisadoPor = acceso.userName;
        actividad.revisadoAt = new Date();
      }
      if (cierra && dto.firma) {
        actividad.datos = { ...(actividad.datos ?? {}), firmaComite: dto.firma };
      }
      await em.save(ProcesoActividad, actividad);

      // La devolución queda como una revisión más: así le llega a quien envió
      // el pliego definitivo con la alerta de siempre, y la pantalla de la
      // actividad enseña qué observó el comité.
      if (dto.decision === 'OBSERVADO' || dto.decision === 'RECHAZADO') {
        await em.save(
          em.create(Revision, {
            procesoActividadId: actividad.id,
            decision: dto.decision === 'OBSERVADO' ? 'DEVUELTO' : 'NEGADO',
            observaciones,
            versionRevisada: actividad.version,
            revisadoPor: acceso.userName,
            revisadoPorId: acceso.userId,
            estadoAnterior: 'APROBADO',
            estadoResultante: estado,
          } as Partial<Revision>),
        );
      }

      await this.traza(
        em,
        procesoId,
        sesion.id,
        dto.decision === 'OBSERVADO' ? 'DEVOLVER' : dto.decision === 'RECHAZADO' ? 'RECHAZAR' : 'APROBAR',
        acceso,
        {
          actividad: NUMERAL_SEGUNDA_SESION,
          sumision: 2,
          decision: dto.decision,
          fecha: dto.fecha,
          condiciones,
          observaciones,
          actaPendiente: !acta,
        },
      );

      if (dto.decision === 'RECHAZADO') {
        await em.update(Proceso, { id: procesoId }, { estado: 'NEGADO' });
      }
    });

    return this.estado(procesoId, acceso);
  }

  // ----------------------------------------------------------- auxiliares --

  /** El CDP por el lado de la segunda sesión: el mismo respaldo que pide la apertura. */
  private async requisitoCdp(procesoId: string, em: EntityManager) {
    const respaldo = await this.cdp.estadoRespaldo(procesoId, em);
    return { cumplido: respaldo.puedeAbrirse, motivo: respaldo.motivo ?? null };
  }

  /** Cuándo se registró la publicación del proyecto de pliego en SECOP II (5.3). */
  private async publicadoEl(em: EntityManager, procesoId: string): Promise<string | null> {
    const [fila] = await em.query(
      `SELECT MIN(created_at) AS el
         FROM hiring.publicaciones_pliego
        WHERE proceso_id = $1 AND anulada_at IS NULL`,
      [procesoId],
    );
    return fila?.el ? new Date(fila.el).toISOString() : null;
  }

  private sesiones(em: EntityManager, procesoId: string) {
    return em.getRepository(SesionComiteContratacion).find({
      where: { procesoId, sumision: 2 },
      order: { fecha: 'DESC', createdAt: 'DESC' },
    });
  }

  private async exigirQueLeToque(procesoId: string, acceso: HiringAccess) {
    const { responsable, puesto, motivo } = await this.participacion.quienHace(
      procesoId,
      acceso,
      NUMERAL_SEGUNDA_SESION,
    );
    if (motivo === 'SIN_ASIGNAR') {
      throw new ConflictException(
        `Lo hace quien ocupe el puesto ${puesto} y en este proceso todavía no hay nadie: se asigna en la 3.3`,
      );
    }
    if (motivo === 'NO_ES_TUYO') {
      throw new ForbiddenException(
        `Lo hace ${responsable?.nombre ?? 'otra persona'}${puesto ? ` (${puesto})` : ''}`,
      );
    }
    if (motivo === 'SIN_PERMISO') {
      throw new ForbiddenException('No tienes permiso para trabajar el pliego definitivo');
    }
  }

  private async exigirProceso(em: EntityManager, procesoId: string, bloquear = false) {
    const consulta = em.getRepository(Proceso).createQueryBuilder('p').where('p.id = :procesoId', { procesoId });
    if (bloquear) consulta.setLock('pessimistic_write');
    const proceso = await consulta.getOne();
    if (!proceso) throw new NotFoundException('El proceso no existe');
    return proceso;
  }

  private actividad(em: EntityManager, procesoId: string, bloquear = false) {
    const consulta = em
      .getRepository(ProcesoActividad)
      .createQueryBuilder('a')
      .where('a.proceso_id = :procesoId AND a.numeral = :numeral', {
        procesoId,
        numeral: NUMERAL_SEGUNDA_SESION,
      });
    if (bloquear) consulta.setLock('pessimistic_write');
    return consulta.getOne();
  }

  protected hoy(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }

  private traza(
    em: EntityManager,
    procesoId: string,
    entidadId: string | null,
    accion: AccionTraza,
    acceso: HiringAccess,
    detalle: Record<string, unknown>,
  ) {
    return em.save(
      em.create(Trazabilidad, {
        procesoId,
        entidadId,
        entidad: 'comite_contratacion',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
