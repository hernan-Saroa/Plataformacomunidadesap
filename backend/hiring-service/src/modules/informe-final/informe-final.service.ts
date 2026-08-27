import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';

import {
  BalanceEjecucion,
  EntregableInforme,
  InformeFinal,
  NUMERAL_INFORME_FINAL,
} from '../../entities/informe-final.entity';
import { EstadoPago, PagoContrato } from '../../entities/pago-contrato.entity';
import { ActaInicio } from '../../entities/acta-inicio.entity';
import { Contrato, EstadoContrato } from '../../entities/contrato.entity';
import { SupervisionContrato } from '../../entities/supervision-contrato.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import {
  AgregarEntregableDto,
  AnularInformeFinalDto,
  ElaborarInformeFinalDto,
} from './dto/informe-final.dto';

export { NUMERAL_INFORME_FINAL };

/** Las cuentas que todavía esperan algo. */
const PENDIENTES: EstadoPago[] = ['RADICADO', 'AVALADO', 'DEVUELTO'];

/**
 * Si el contrato admite informe final.
 *
 * En ejecución, que es donde la historia lo sitúa: «un contrato próximo a
 * terminar». No se exige que esté efectivamente vencido —un contrato puede
 * terminar antes de su plazo, y esperar a la fecha dejaría sin salida al que
 * cumplió pronto—.
 *
 * También liquidado, porque desde EFDS-1175 el acta deja el contrato en
 * LIQUIDADO y anular esa acta para rehacerla exige poder tocar antes el informe
 * del que salió. Antes de ese cambio el contrato se quedaba en EJECUCION y esto
 * funcionaba solo; no es una regla nueva sino la misma de siempre.
 *
 * Función pura para poder probar la regla sin base de datos.
 */
export function admiteInformeFinal(estado: EstadoContrato): boolean {
  return estado === 'EJECUCION' || estado === 'LIQUIDADO';
}

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Informe final de ejecución — actividad 10.1 (EFDS-1171, RF-LIQ-01).
 *
 * El supervisor cierra su vigilancia con un informe que consolida qué se
 * entregó y cómo quedó el contrato en plata. Es lo que soporta la liquidación
 * (EFDS-1172), y por eso lo que dice tiene que quedar fijo.
 *
 * **El balance se congela al elaborar.** Mismo criterio del informe de
 * evaluación (EFDS-1158): el informe dice lo que era cierto ese día. Si entra
 * un pago rezagado, la salida no es que el informe cambie solo —eso reescribiría
 * un documento firmado— sino anularlo y elaborar otro.
 */
@Injectable()
export class InformeFinalService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, acceso: HiringAccess) {
    const contrato = await this.contratoDelProceso(this.dataSource.manager, procesoId);

    if (!contrato) {
      return {
        admiteInforme: false,
        motivoNoAdmite: 'el proceso todavía no tiene contrato generado',
        contrato: null,
        supervisor: null,
        esSupervisor: false,
        puedeElaborar: false,
        /** El balance de hoy, para ver contra qué se va a firmar. */
        balanceActual: null as BalanceEjecucion | null,
        advertencia: null as string | null,
        informe: null as unknown,
        historial: [] as unknown[],
      };
    }

    const admite = admiteInformeFinal(contrato.estado);
    const supervisor = await this.supervisorVigente(contrato.id);
    const vigente = await this.informeVigente(contrato.id);

    const balanceActual = await this.calcularBalance(this.dataSource.manager, contrato);
    const informes = await this.dataSource.getRepository(InformeFinal).find({
      where: { contratoId: contrato.id },
      order: { createdAt: 'DESC' },
    });

    const entregables = vigente ? await this.entregablesDe(vigente.id) : [];
    const documentos = await this.documentosDe(vigente, entregables);

    return {
      admiteInforme: admite,
      motivoNoAdmite: admite ? null : this.porQueNoAdmite(contrato.estado),
      contrato: {
        numero: contrato.numero,
        objeto: contrato.objeto,
        estado: contrato.estado,
        valor: contrato.valor,
      },
      supervisor: supervisor
        ? { nombre: supervisor.nombre, cargo: supervisor.cargo, personaId: supervisor.personaId }
        : null,
      esSupervisor: this.esElSupervisor(supervisor, acceso),
      puedeElaborar: admite && !!supervisor && !vigente,
      balanceActual,
      /**
       * Se avisa y no se bloquea, con el criterio del resto del módulo: un
       * informe final con cuentas sin tramitar no cuadrará con la liquidación,
       * pero cerrar la ejecución con un cobro en disputa es decisión de la
       * entidad, no del sistema.
       */
      advertencia: this.advertirPendientes(balanceActual),
      informe: vigente
        ? {
            id: vigente.id,
            fechaElaboracion: vigente.fechaElaboracion,
            conclusion: vigente.conclusion,
            balance: vigente.balance,
            elaboradoPor: vigente.elaboradoPor,
            documento: documentos.get(vigente.informeDocumentoId) ?? null,
            entregables: entregables.map((e) => ({
              id: e.id,
              descripcion: e.descripcion,
              fechaEntrega: e.fechaEntrega,
              observacion: e.observacion,
              documento: e.documentoId ? documentos.get(e.documentoId) ?? null : null,
            })),
          }
        : null,
      historial: informes
        .filter((i) => i.estado === 'ANULADO')
        .map((i) => ({
          fechaElaboracion: i.fechaElaboracion,
          balance: i.balance,
          anuladoAt: i.anuladoAt,
          anuladoPor: i.anuladoPor,
          motivoAnulacion: i.motivoAnulacion,
        })),
    };
  }

  // ----------------------------------------------------------- elaboración --

  /**
   * Elabora el informe final y congela el balance de la ejecución.
   *
   * El balance se calcula aquí dentro y no se guarda una referencia: lo que
   * queda en el informe es la cifra, no la forma de obtenerla.
   */
  async elaborar(
    procesoId: string,
    dto: ElaborarInformeFinalDto,
    informe: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoEnEjecucion(em, procesoId);
      await this.exigirSupervisor(em, contrato.id, acceso);

      if (await this.informeVigente(contrato.id, em)) {
        throw new ConflictException(
          'El contrato ya tiene informe final: para rehacerlo se anula el vigente y se elabora otro',
        );
      }

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const doc = await this.guardarDocumento(
        em,
        expediente.id,
        `Contrato ${contrato.numero} · informe final de ejecución`,
        informe,
        hash,
        acceso,
      );

      const balance = await this.calcularBalance(em, contrato);

      const registro = await em.save(
        em.create(InformeFinal, {
          contratoId: contrato.id,
          informeDocumentoId: doc.id,
          fechaElaboracion: dto.fechaElaboracion,
          conclusion: dto.conclusion,
          balance,
          estado: 'VIGENTE' as const,
          elaboradoPor: acceso.userName,
        } as Partial<InformeFinal>),
      );

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, registro.id, 'CERRAR', acceso, {
        actividad: NUMERAL_INFORME_FINAL,
        contrato: contrato.numero,
        valorPagado: balance.valorPagado,
        saldo: balance.saldo,
        cuentasPendientes: balance.cuentasPendientes,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Suma un entregable al consolidado del informe vigente.
   *
   * Se agregan de a uno y después de elaborar porque así se arma un informe:
   * primero el documento y la conclusión, y el detalle se completa mientras se
   * revisa el expediente.
   */
  async agregarEntregable(
    procesoId: string,
    dto: AgregarEntregableDto,
    archivo: ArchivoCargado | null,
    hash: string | null,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoEnEjecucion(em, procesoId);
      await this.exigirSupervisor(em, contrato.id, acceso);

      const informe = await this.informeVigente(contrato.id, em);
      if (!informe) {
        throw new NotFoundException(
          'El contrato no tiene informe final vigente: elabóralo antes de consolidar los entregables',
        );
      }

      let documentoId: string | null = null;
      if (archivo && hash) {
        const expediente = await em.findOne(Expediente, { where: { procesoId } });
        if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

        const doc = await this.guardarDocumento(
          em,
          expediente.id,
          `Contrato ${contrato.numero} · entregable del informe final`,
          archivo,
          hash,
          acceso,
        );
        documentoId = doc.id;
      }

      await em.save(
        em.create(EntregableInforme, {
          informeId: informe.id,
          descripcion: dto.descripcion,
          fechaEntrega: dto.fechaEntrega ?? null,
          observacion: dto.observacion ?? null,
          documentoId,
        } as Partial<EntregableInforme>),
      );

      await this.traza(em, procesoId, informe.id, 'ADJUNTAR', acceso, {
        actividad: NUMERAL_INFORME_FINAL,
        entregable: dto.descripcion,
        // Que no tenga fecha no es un olvido: es lo que faltó por entregar.
        entregado: !!dto.fechaEntrega,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Anula el informe vigente para poder elaborar otro.
   *
   * No se borra: pudo haberse remitido para la liquidación, y el balance que
   * declaró es lo que explica que ahora haya otro distinto.
   */
  async anular(procesoId: string, dto: AnularInformeFinalDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoEnEjecucion(em, procesoId);
      await this.exigirSupervisor(em, contrato.id, acceso);

      const informe = await this.informeVigente(contrato.id, em);
      if (!informe) throw new NotFoundException('El contrato no tiene informe final vigente');

      informe.estado = 'ANULADO';
      informe.anuladoAt = new Date();
      informe.anuladoPor = acceso.userName;
      informe.motivoAnulacion = dto.motivo;
      await em.save(informe);

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, informe.id, 'ANULAR', acceso, {
        actividad: NUMERAL_INFORME_FINAL,
        contrato: contrato.numero,
        motivo: dto.motivo,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ----------------------------------------------- lo que consumen otras --

  /**
   * El informe final vigente del contrato, o nulo si no hay.
   *
   * Lo consultará la liquidación (EFDS-1172): no se liquida un contrato sin el
   * informe que dice cómo se ejecutó.
   */
  informeVigente(contratoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager
      .getRepository(InformeFinal)
      .findOne({ where: { contratoId, estado: 'VIGENTE' } });
  }

  // ----------------------------------------------------------- auxiliares --

  /**
   * El balance de la ejecución tal como está ahora.
   *
   * Se usa dos veces y con sentidos distintos: en la consulta es el estado de
   * hoy —lo que el supervisor ve antes de firmar— y al elaborar es lo que queda
   * congelado en el informe. Una sola función para que no puedan discrepar.
   */
  private async calcularBalance(
    em: EntityManager,
    contrato: Contrato,
  ): Promise<BalanceEjecucion> {
    const pagos = await em
      .getRepository(PagoContrato)
      .find({ where: { contratoId: contrato.id } });

    const tramitados = pagos.filter((p) => p.estado === 'TRAMITADO');
    const valorPagado = tramitados.reduce((total, p) => total + Number(p.valor), 0);
    const acta = await em
      .getRepository(ActaInicio)
      .findOne({ where: { contratoId: contrato.id } });

    return {
      valorContrato: contrato.valor,
      // Lo tramitado y no lo cobrado: el informe habla de plata que salió.
      valorPagado,
      saldo: contrato.valor - valorPagado,
      cuentasTramitadas: tramitados.length,
      cuentasPendientes: pagos.filter((p) => PENDIENTES.includes(p.estado)).length,
      fechaInicio: acta?.fechaInicio ?? null,
    };
  }

  private advertirPendientes(balance: BalanceEjecucion | null): string | null {
    if (!balance || balance.cuentasPendientes === 0) return null;

    const n = balance.cuentasPendientes;
    return (
      `Quedan ${n} ${n === 1 ? 'cuenta de cobro' : 'cuentas de cobro'} sin tramitar; ` +
      'el balance del informe no incluirá ese valor'
    );
  }

  private porQueNoAdmite(estado: EstadoContrato): string {
    if (estado === 'RECHAZADO') return 'el proponente rechazó la minuta y no hay contrato';
    if (estado === 'LEGALIZADO') {
      return 'el contrato todavía no tiene acta de inicio: no ha empezado a ejecutarse (9.1)';
    }
    return 'el contrato todavía no está legalizado';
  }

  private esElSupervisor(
    supervisor: SupervisionContrato | null,
    acceso: HiringAccess,
  ): boolean {
    if (!supervisor) return false;
    return supervisor.personaId === acceso.userId || supervisor.nombre === acceso.userName;
  }

  /**
   * Exige que quien actúa sea el supervisor vigente de este contrato.
   *
   * Misma regla del aval del pago (EFDS-1170): el informe final es la
   * conclusión de su vigilancia, y quien no vigiló no la puede firmar.
   */
  private async exigirSupervisor(em: EntityManager, contratoId: string, acceso: HiringAccess) {
    if (acceso.roles?.includes('SUPER_ADMIN')) return;

    const supervisor = await this.supervisorVigente(contratoId, em);
    if (!supervisor) {
      throw new ConflictException(
        'El contrato no tiene supervisor designado: no hay quien elabore el informe final',
      );
    }

    if (!this.esElSupervisor(supervisor, acceso)) {
      throw new ForbiddenException(
        'No eres el supervisor de este contrato: el informe final lo firma quien vigiló la ejecución',
      );
    }
  }

  private entregablesDe(informeId: string) {
    return this.dataSource
      .getRepository(EntregableInforme)
      .find({ where: { informeId }, order: { createdAt: 'ASC' } });
  }

  private async documentosDe(informe: InformeFinal | null, entregables: EntregableInforme[]) {
    const ids = [
      informe?.informeDocumentoId,
      ...entregables.map((e) => e.documentoId),
    ].filter(Boolean) as string[];

    if (ids.length === 0) return new Map<string, { nombre: string; url: string }>();

    const docs = await this.dataSource
      .getRepository(Documento)
      .find({ where: { id: In(ids) } });

    return new Map(
      docs.map((d) => [
        d.id,
        { nombre: d.archivoNombreOriginal ?? d.nombre, url: d.archivoUrl },
      ]),
    );
  }

  private supervisorVigente(contratoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager
      .getRepository(SupervisionContrato)
      .findOne({ where: { contratoId, estado: 'VIGENTE' } });
  }

  private async contratoDelProceso(em: EntityManager, procesoId: string, bloquear = false) {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');

    const consulta = em
      .getRepository(Contrato)
      .createQueryBuilder('c')
      .where('c.proceso_id = :procesoId', { procesoId })
      .andWhere("c.estado <> 'RECHAZADO'");

    if (bloquear) consulta.setLock('pessimistic_write');

    return consulta.getOne();
  }

  private async exigirContratoEnEjecucion(em: EntityManager, procesoId: string) {
    const contrato = await this.contratoDelProceso(em, procesoId, true);
    if (!contrato) throw new NotFoundException('El proceso no tiene contrato generado');

    if (!admiteInformeFinal(contrato.estado)) {
      throw new ConflictException(
        `No se puede elaborar el informe final: ${this.porQueNoAdmite(contrato.estado)}`,
      );
    }

    return contrato;
  }

  /** La actividad se cumple cuando hay informe vigente. */
  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    contratoId: string,
    acceso: HiringAccess,
  ) {
    const cumplida = !!(await this.informeVigente(contratoId, em));
    const estado = cumplida ? 'APROBADO' : 'BORRADOR';

    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_INFORME_FINAL },
    });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_INFORME_FINAL,
          estado: estado as any,
          datos: {},
          ...(cumplida ? { revisadoPor: acceso.userName, revisadoAt: new Date() } : {}),
        }),
      );
      return;
    }

    actividad.estado = estado as any;
    actividad.revisadoPor = cumplida ? acceso.userName : null;
    actividad.revisadoAt = cumplida ? new Date() : null;
    await em.save(actividad);
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
        numeral: NUMERAL_INFORME_FINAL,
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
        entidad: 'informe_final',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
