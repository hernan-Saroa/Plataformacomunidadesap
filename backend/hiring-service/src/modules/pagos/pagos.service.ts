import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';

import {
  EstadoPago,
  NUMERAL_PAGOS,
  PagoContrato,
  SoportePago,
} from '../../entities/pago-contrato.entity';
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
  AnularPagoDto,
  AvalarPagoDto,
  CargarSoporteDto,
  DevolverPagoDto,
  RadicarPagoDto,
  TramitarPagoDto,
} from './dto/pagos.dto';

export { NUMERAL_PAGOS };

/** Los que todavía cuentan contra el valor del contrato. */
const ESTADOS_VIVOS: EstadoPago[] = ['RADICADO', 'AVALADO', 'TRAMITADO'];

/**
 * Cómo se nombra cada estado dentro de una frase.
 *
 * La entidad se llama «pago» y lo que el usuario ve es una «cuenta», así que
 * concatenar el estado en crudo produce «una cuenta devuelto». Se escriben en
 * femenino, que es como se leen los mensajes.
 */
const EN_FEMENINO: Record<EstadoPago, string> = {
  RADICADO: 'radicada',
  AVALADO: 'avalada',
  DEVUELTO: 'devuelta',
  TRAMITADO: 'tramitada',
  ANULADO: 'anulada',
};

/**
 * Si el contrato admite que se le radiquen cuentas de cobro.
 *
 * En ejecución, y esa es toda la dependencia de EFDS-1167: el criterio de la
 * historia empieza con «dado un contrato en ejecución», y antes del acta de
 * inicio no hay prestación que cobrar porque no ha empezado a correr.
 *
 * También liquidado. Desde EFDS-1175 el acta deja el contrato en LIQUIDADO, y
 * el acta cierra las cuentas pero no la tesorería: un pago rezagado —o el saldo
 * que la propia liquidación reconoce— se tramita después. El cierre financiero
 * (10.3) ya contaba con eso al congelar el cuadre. Lo que cierra la puerta es
 * CERRADO, no LIQUIDADO.
 *
 * **SUSPENDIDO queda fuera a propósito** (EFDS-1178): mientras el contrato está
 * detenido no hay prestación que cobrar. Es criterio del equipo —la historia no
 * lo dice— y por eso se enumera en vez de usar `alMenos`, que lo dejaría entrar
 * sin que nadie lo hubiera decidido.
 *
 * Función pura para poder probar la regla sin base de datos.
 */
export function admitePagos(estado: EstadoContrato): boolean {
  return estado === 'EJECUCION' || estado === 'LIQUIDADO';
}

/**
 * Si lo cobrado supera el valor del contrato.
 *
 * Se avisa en vez de bloquear, con el mismo criterio del CDP (EFDS-1148): un
 * cobro por encima del valor casi siempre es un error de digitación, pero la
 * decisión de pagarlo o no es de la entidad, no del sistema. Cuando existan las
 * adiciones (EFDS-1176) el tope dejará de ser el valor original y esta función
 * es el único sitio que cambia.
 */
export function cobradoCabeEnElContrato(
  cobrado: number,
  valorContrato: number,
): { cabe: boolean; advertencia: string | null } {
  if (cobrado <= valorContrato) return { cabe: true, advertencia: null };

  const exceso = cobrado - valorContrato;
  return {
    cabe: false,
    advertencia:
      `Lo cobrado supera el valor del contrato en ${exceso.toLocaleString('es-CO')} pesos; ` +
      'confirma la cifra o tramita primero una adición',
  };
}

/** Un documento tal como lo devuelve la consulta. */
interface DocumentoResumen {
  nombre: string;
  url: string;
}

/**
 * Una cuenta de cobro tal como la ve la pantalla.
 *
 * Declarada y no inferida porque la consulta tiene una salida temprana —el
 * proceso sin contrato— y sin un tipo comun las dos ramas se unifican en
 * `unknown[]`, que deja a quien consume sin forma.
 */
export interface PagoResumen {
  id: string;
  numero: number;
  periodoDesde: string;
  periodoHasta: string;
  valor: number;
  estado: EstadoPago;
  radicadoAt: Date;
  radicadoPor: string | null;
  avaladoAt: Date | null;
  avaladoPor: string | null;
  observacionAval: string | null;
  devueltoAt: Date | null;
  motivoDevolucion: string | null;
  tramitadoAt: Date | null;
  referenciaPago: string | null;
  motivoAnulacion: string | null;
  factura: DocumentoResumen | null;
  informe: DocumentoResumen | null;
  soportes: Array<{
    id: string;
    tipo: SoportePago['tipo'];
    descripcion: string | null;
    documento: DocumentoResumen | null;
  }>;
}

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Trámite de pagos del contrato — actividad 9.4 (EFDS-1170, RF-EJE-04).
 *
 * El contratista presenta factura e informe de actividades, el supervisor avala
 * y la Dirección Financiera tramita. Tres actos y tres responsables, que es lo
 * que este servicio cuida que no se confundan.
 *
 * **La plataforma no paga.** Registra que el pago se tramitó y con qué
 * referencia; el giro ocurre en el sistema financiero de la entidad, igual que
 * la publicación ocurre en SECOP.
 *
 * **Sin integración con Click** (decisión de alcance): la seguridad social, el
 * RUT y la certificación bancaria se cargan a mano como soportes. Es la carga
 * triple que la historia quería evitar, y queda registrada como lo que es en
 * vez de disimularse.
 */
@Injectable()
export class PagosService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, acceso: HiringAccess) {
    const contrato = await this.contratoDelProceso(this.dataSource.manager, procesoId);

    if (!contrato) {
      return {
        admitePagos: false,
        motivoNoAdmite: 'el proceso todavía no tiene contrato generado',
        contrato: null,
        supervisor: null,
        puedeRadicar: false,
        esSupervisor: false,
        integracionClick: false,
        pagos: [] as PagoResumen[],
        resumen: { cobrado: 0, tramitado: 0, saldo: 0, advertencia: null as string | null },
      };
    }

    const admite = admitePagos(contrato.estado);
    const supervisor = await this.supervisorVigente(contrato.id);
    const acta = await this.actaVigente(contrato.id);

    const pagos = await this.dataSource.getRepository(PagoContrato).find({
      where: { contratoId: contrato.id },
      order: { numero: 'DESC' },
    });

    const soportes = await this.soportesDe(pagos.map((p) => p.id));
    const documentos = await this.documentosDe(pagos, soportes);

    const cobrado = this.sumar(pagos, ESTADOS_VIVOS);
    const tramitado = this.sumar(pagos, ['TRAMITADO']);

    return {
      admitePagos: admite,
      motivoNoAdmite: admite ? null : this.porQueNoAdmite(contrato.estado),
      contrato: {
        numero: contrato.numero,
        objeto: contrato.objeto,
        estado: contrato.estado,
        valor: contrato.valor,
        fechaInicio: acta?.fechaInicio ?? null,
      },
      supervisor: supervisor
        ? { nombre: supervisor.nombre, cargo: supervisor.cargo, personaId: supervisor.personaId }
        : null,
      puedeRadicar: admite,
      /**
       * Si quien consulta es el supervisor de **este** contrato.
       *
       * La pantalla lo necesita para ofrecer el aval solo a quien puede darlo:
       * tener el rol no basta, y un botón que siempre falla es peor que no
       * mostrarlo. La regla de verdad la aplica `exigirSupervisor`.
       */
      esSupervisor: this.esElSupervisor(supervisor, acceso),
      /** Mientras sea falso, los soportes se cargan a mano. */
      integracionClick: false,
      pagos: pagos.map((pago): PagoResumen => ({
        id: pago.id,
        numero: pago.numero,
        periodoDesde: pago.periodoDesde,
        periodoHasta: pago.periodoHasta,
        valor: pago.valor,
        estado: pago.estado,
        radicadoAt: pago.radicadoAt,
        radicadoPor: pago.radicadoPor,
        avaladoAt: pago.avaladoAt,
        avaladoPor: pago.avaladoPor,
        observacionAval: pago.observacionAval,
        devueltoAt: pago.devueltoAt,
        motivoDevolucion: pago.motivoDevolucion,
        tramitadoAt: pago.tramitadoAt,
        referenciaPago: pago.referenciaPago,
        motivoAnulacion: pago.motivoAnulacion,
        factura: documentos.get(pago.facturaDocumentoId) ?? null,
        informe: documentos.get(pago.informeDocumentoId) ?? null,
        soportes: soportes
          .filter((s) => s.pagoId === pago.id)
          .map((s) => ({
            id: s.id,
            tipo: s.tipo,
            descripcion: s.descripcion,
            documento: documentos.get(s.documentoId) ?? null,
          })),
      })),
      resumen: {
        cobrado,
        tramitado,
        saldo: contrato.valor - cobrado,
        advertencia: cobradoCabeEnElContrato(cobrado, contrato.valor).advertencia,
      },
    };
  }

  // ------------------------------------------------------------ radicación --

  /**
   * Radica la cuenta de cobro con su factura y su informe.
   *
   * Los dos documentos son obligatorios porque son los dos que el criterio de
   * la historia nombra: la factura es lo que se cobra y el informe es lo que
   * sustenta que se prestó.
   */
  async radicar(
    procesoId: string,
    dto: RadicarPagoDto,
    factura: ArchivoCargado,
    hashFactura: string,
    informe: ArchivoCargado,
    hashInforme: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoEnEjecucion(em, procesoId);

      const acta = await this.actaVigente(contrato.id, em);
      this.validarPeriodo(dto, acta?.fechaInicio ?? null);

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      // Se numera dentro de la transacción y sobre la fila bloqueada del
      // contrato: dos radicaciones simultáneas leerían el mismo último número
      // y la segunda chocaría contra el único, no contra una regla.
      const numero = await this.siguienteNumero(em, contrato.id);

      const docFactura = await this.guardarDocumento(
        em,
        expediente.id,
        `Contrato ${contrato.numero} · factura del pago ${numero}`,
        factura,
        hashFactura,
        acceso,
      );
      const docInforme = await this.guardarDocumento(
        em,
        expediente.id,
        `Contrato ${contrato.numero} · informe de actividades del pago ${numero}`,
        informe,
        hashInforme,
        acceso,
      );

      const pago = await em.save(
        em.create(PagoContrato, {
          contratoId: contrato.id,
          numero,
          periodoDesde: dto.periodoDesde,
          periodoHasta: dto.periodoHasta,
          valor: dto.valor,
          facturaDocumentoId: docFactura.id,
          informeDocumentoId: docInforme.id,
          estado: 'RADICADO' as const,
          radicadoPor: acceso.userName,
        } as Partial<PagoContrato>),
      );

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, pago.id, 'SOLICITAR', acceso, {
        actividad: NUMERAL_PAGOS,
        contrato: contrato.numero,
        pago: numero,
        periodo: `${dto.periodoDesde} a ${dto.periodoHasta}`,
        valor: dto.valor,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Suma un soporte a una cuenta que todavía no se tramitó.
   *
   * La seguridad social y el RUT entran por aquí. Cuando exista la integración
   * con Click dejarán de pedirse, pero el resto de anexos seguirá llegando así.
   */
  async cargarSoporte(
    procesoId: string,
    pagoId: string,
    dto: CargarSoporteDto,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoEnEjecucion(em, procesoId);
      const pago = await this.exigirPago(em, contrato.id, pagoId);

      if (pago.estado === 'TRAMITADO' || pago.estado === 'ANULADO') {
        throw new ConflictException(
          'La cuenta ya se cerró: no admite soportes nuevos',
        );
      }

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const doc = await this.guardarDocumento(
        em,
        expediente.id,
        `Contrato ${contrato.numero} · soporte del pago ${pago.numero}`,
        archivo,
        hash,
        acceso,
      );

      await em.save(
        em.create(SoportePago, {
          pagoId: pago.id,
          documentoId: doc.id,
          tipo: dto.tipo,
          descripcion: dto.descripcion ?? null,
          cargadoPor: acceso.userName,
        } as Partial<SoportePago>),
      );

      await this.traza(em, procesoId, pago.id, 'ADJUNTAR', acceso, {
        actividad: NUMERAL_PAGOS,
        pago: pago.numero,
        soporte: dto.tipo,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ------------------------------------------------------------ el aval ----

  /**
   * El supervisor avala la cuenta.
   *
   * Es el núcleo de la historia y por eso la regla no es de rol sino de
   * persona: lo avala el supervisor **vigente de este contrato**, con el mismo
   * criterio del comité evaluador (EFDS-1438). Un supervisor de otro contrato
   * tiene el rol y no puede avalar aquí, que es exactamente lo correcto.
   */
  async avalar(procesoId: string, pagoId: string, dto: AvalarPagoDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoEnEjecucion(em, procesoId);
      await this.exigirSupervisor(em, contrato.id, acceso);

      const pago = await this.exigirPago(em, contrato.id, pagoId);
      this.exigirEstado(pago, ['RADICADO'], 'avalar');

      pago.estado = 'AVALADO';
      pago.avaladoAt = new Date();
      pago.avaladoPor = acceso.userName;
      pago.observacionAval = dto.observacion ?? null;
      // Si venía de una devolución corregida, el rastro del rechazo se conserva
      // en la traza; lo que deja de ser cierto es el estado.
      await em.save(pago);

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, pago.id, 'APROBAR', acceso, {
        actividad: NUMERAL_PAGOS,
        pago: pago.numero,
        valor: pago.valor,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * El supervisor devuelve la cuenta.
   *
   * No se borra: el periodo y los documentos que el contratista presentó
   * existieron, y el motivo es lo que le dice qué arreglar.
   *
   * **La devuelta no se reabre.** La factura y el informe se fijan al radicar y
   * no hay forma de reemplazarlos, así que corregir es radicar una cuenta
   * nueva; la devuelta queda como la constancia de por qué hubo dos. De ahí que
   * `avalar` solo acepte una cuenta recién radicada.
   */
  async devolver(procesoId: string, pagoId: string, dto: DevolverPagoDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoEnEjecucion(em, procesoId);
      await this.exigirSupervisor(em, contrato.id, acceso);

      const pago = await this.exigirPago(em, contrato.id, pagoId);
      this.exigirEstado(pago, ['RADICADO', 'AVALADO'], 'devolver');

      pago.estado = 'DEVUELTO';
      pago.devueltoAt = new Date();
      pago.devueltoPor = acceso.userName;
      pago.motivoDevolucion = dto.motivo;
      // Se limpia el aval: una cuenta devuelta no está avalada, y dejar la
      // fecha permitiría tramitarla saltándose la corrección.
      pago.avaladoAt = null;
      pago.avaladoPor = null;
      await em.save(pago);

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, pago.id, 'DEVOLVER', acceso, {
        actividad: NUMERAL_PAGOS,
        pago: pago.numero,
        motivo: dto.motivo,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ---------------------------------------------------------- el trámite ---

  /**
   * La Dirección Financiera tramita el pago avalado.
   *
   * La plataforma no gira: registra que se tramitó y con qué referencia, que es
   * lo que permite encontrarlo en el sistema financiero.
   */
  async tramitar(procesoId: string, pagoId: string, dto: TramitarPagoDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoEnEjecucion(em, procesoId);
      const pago = await this.exigirPago(em, contrato.id, pagoId);

      if (pago.estado !== 'AVALADO') {
        throw new ConflictException(
          pago.estado === 'RADICADO'
            ? 'La cuenta todavía no la ha avalado el supervisor: sin su aval no hay quien responda por la prestación'
            : `No se puede tramitar una cuenta ${EN_FEMENINO[pago.estado]}`,
        );
      }

      pago.estado = 'TRAMITADO';
      pago.tramitadoAt = new Date();
      pago.tramitadoPor = acceso.userName;
      pago.referenciaPago = dto.referenciaPago;
      await em.save(pago);

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, pago.id, 'EXPEDIR', acceso, {
        actividad: NUMERAL_PAGOS,
        pago: pago.numero,
        valor: pago.valor,
        referencia: dto.referenciaPago,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /** Anula una cuenta que no debió radicarse. */
  async anular(procesoId: string, pagoId: string, dto: AnularPagoDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoEnEjecucion(em, procesoId);
      const pago = await this.exigirPago(em, contrato.id, pagoId);

      if (pago.estado === 'TRAMITADO') {
        throw new ConflictException(
          'La cuenta ya se tramitó: el pago salió y anularlo aquí no lo devuelve',
        );
      }
      this.exigirEstado(pago, ['RADICADO', 'AVALADO', 'DEVUELTO'], 'anular');

      pago.estado = 'ANULADO';
      pago.anuladoAt = new Date();
      pago.anuladoPor = acceso.userName;
      pago.motivoAnulacion = dto.motivo;
      await em.save(pago);

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, pago.id, 'ANULAR', acceso, {
        actividad: NUMERAL_PAGOS,
        pago: pago.numero,
        motivo: dto.motivo,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ----------------------------------------------------------- auxiliares --

  private sumar(pagos: PagoContrato[], estados: EstadoPago[]): number {
    return pagos
      .filter((p) => estados.includes(p.estado))
      .reduce((total, p) => total + Number(p.valor), 0);
  }

  /**
   * El periodo cobrado tiene que caber en la ejecución.
   *
   * No se cobra lo que no había empezado: antes del acta de inicio el contrato
   * no corría, y una factura por ese periodo es un error de digitación o algo
   * peor.
   */
  private validarPeriodo(dto: RadicarPagoDto, fechaInicio: string | null) {
    if (dto.periodoHasta < dto.periodoDesde) {
      throw new BadRequestException('El fin del periodo no puede ser anterior a su inicio');
    }

    if (fechaInicio && dto.periodoDesde < fechaInicio) {
      throw new BadRequestException(
        `El contrato empezó a ejecutarse el ${fechaInicio}: no se cobra un periodo anterior`,
      );
    }
  }

  private async siguienteNumero(em: EntityManager, contratoId: string): Promise<number> {
    const { maximo } = await em
      .getRepository(PagoContrato)
      .createQueryBuilder('p')
      .select('COALESCE(MAX(p.numero), 0)', 'maximo')
      .where('p.contrato_id = :contratoId', { contratoId })
      .getRawOne();

    return Number(maximo) + 1;
  }

  private porQueNoAdmite(estado: EstadoContrato): string {
    if (estado === 'RECHAZADO') return 'el proponente rechazó la minuta y no hay contrato';
    if (estado === 'LEGALIZADO') {
      return 'el contrato todavía no tiene acta de inicio: no ha empezado a ejecutarse (9.1)';
    }
    return 'el contrato todavía no está legalizado';
  }

  /** Si el usuario que consulta es el supervisor vigente del contrato. */
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
   * La membresía manda sobre el rol, como en la evaluación (EFDS-1438). Se
   * acepta también al super admin, que es rol de soporte y tiene que poder
   * destrabar un contrato cuyo supervisor perdió el acceso.
   */
  private async exigirSupervisor(em: EntityManager, contratoId: string, acceso: HiringAccess) {
    if (acceso.roles?.includes('SUPER_ADMIN')) return;

    const supervisor = await this.supervisorVigente(contratoId, em);
    if (!supervisor) {
      throw new ConflictException(
        'El contrato no tiene supervisor designado: no hay quien avale la cuenta',
      );
    }

    if (!this.esElSupervisor(supervisor, acceso)) {
      throw new ForbiddenException(
        'No eres el supervisor de este contrato: el aval lo da quien vigila su ejecución',
      );
    }
  }

  private exigirEstado(pago: PagoContrato, admitidos: EstadoPago[], accion: string) {
    if (admitidos.includes(pago.estado)) return;

    throw new ConflictException(
      `No se puede ${accion} una cuenta ${EN_FEMENINO[pago.estado]}`,
    );
  }

  private async exigirPago(em: EntityManager, contratoId: string, pagoId: string) {
    const pago = await em
      .getRepository(PagoContrato)
      .findOne({ where: { id: pagoId, contratoId } });

    // Se busca por contrato y no solo por id: así una cuenta de otro contrato
    // devuelve "no existe" en vez de dejarse tocar desde el proceso equivocado.
    if (!pago) throw new NotFoundException('La cuenta de cobro no existe en este contrato');
    return pago;
  }

  private soportesDe(pagoIds: string[]) {
    if (pagoIds.length === 0) return Promise.resolve([] as SoportePago[]);
    return this.dataSource.getRepository(SoportePago).find({
      where: { pagoId: In(pagoIds) },
      order: { createdAt: 'ASC' },
    });
  }

  /** Los documentos de todos los pagos, en una consulta y no una por fila. */
  private async documentosDe(pagos: PagoContrato[], soportes: SoportePago[]) {
    const ids = [
      ...pagos.map((p) => p.facturaDocumentoId),
      ...pagos.map((p) => p.informeDocumentoId),
      ...soportes.map((s) => s.documentoId),
    ].filter(Boolean);

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
      .findOne({ where: { contratoId } });
  }

  private actaVigente(contratoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager
      .getRepository(ActaInicio)
      .findOne({ where: { contratoId } });
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

    if (!admitePagos(contrato.estado)) {
      throw new ConflictException(
        `No se puede tramitar el pago: ${this.porQueNoAdmite(contrato.estado)}`,
      );
    }

    return contrato;
  }

  /**
   * La actividad se cumple cuando hay al menos un pago tramitado.
   *
   * No es «terminada» en el sentido de las demás: un contrato paga varias veces
   * a lo largo de su ejecución. Lo que el riel dice con el verde es que el
   * trámite ya funcionó al menos una vez; mientras solo haya cuentas radicadas
   * o devueltas, sigue en curso.
   */
  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    contratoId: string,
    acceso: HiringAccess,
  ) {
    const tramitados = await em
      .getRepository(PagoContrato)
      .count({ where: { contratoId, estado: 'TRAMITADO' } });
    const cumplida = tramitados > 0;
    const estado = cumplida ? 'APROBADO' : 'BORRADOR';

    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_PAGOS },
    });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_PAGOS,
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
        numeral: NUMERAL_PAGOS,
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
        entidad: 'pago_contrato',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
