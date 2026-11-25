import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';

import { esSuperAdmin, HiringAccess } from '../../auth/hiring-access';
import { AlcanceService } from '../../auth/alcance.service';
import { Accion } from '../../auth/alcance';
import { Cdp } from '../../entities/cdp.entity';
import { Contrato } from '../../entities/contrato.entity';
import { Documento } from '../../entities/documento.entity';
import { DocumentoRequerido } from '../../entities/documento-requerido.entity';
import { Expediente } from '../../entities/expediente.entity';
import {
  ModificacionContrato,
  NUMERAL_MODIFICACIONES,
} from '../../entities/modificacion-contrato.entity';
import { Proceso } from '../../entities/proceso.entity';
import { RegistroPresupuestal } from '../../entities/registro-presupuestal.entity';
import { SupervisionContrato } from '../../entities/supervision-contrato.entity';
import {
  CadenaModificacion,
  ClaseDocumentoTramite,
  DocumentoTramiteModificacion,
  EventoTramiteModificacion,
  FaseCadenaModificacion,
  RondaModificacion,
  TipoDeModificacion,
  TramiteModificacion,
} from '../../entities/tramite-modificacion.entity';
import { ModificacionesService } from '../modificaciones/modificaciones.service';
import { Campana } from '../notificaciones/campana';
import {
  CambioDto,
  CerrarModificacionDto,
  DecidirModificacionDto,
  PerfeccionarModificacionDto,
  PublicarModificacionTramiteDto,
  RadicarModificacionDto,
  RecibirNotificacionDto,
  ReenviarModificacionDto,
  AsignarModificacionDto,
} from './dto/tramites-modificacion.dto';
import {
  abrirRonda,
  ESTADOS_FINALES,
  esResponsable,
  motivoParaNoDecidir,
  NOMBRE_ESTADO,
  porQueNoAdmiteEfecto,
  porQueNoSeCombinan,
  radicadoDe,
  requisitosPara,
  requisitosQueFaltan,
  trasDecidir,
} from './reglas';

/** Un archivo que multer ya dejó en disco. */
export interface ArchivoSubido {
  fieldname: string;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  hash: string;
}

/** Hasta dónde llega el área: después de perfeccionada ya no se desiste. */
const SE_PUEDE_DESISTIR = ['RADICADA', 'EN_REVISION', 'DEVUELTA', 'MINUTA', 'EN_VISTO_BUENO', 'EN_FIRMA'];

/**
 * El trámite de modificaciones contractuales fuera del proceso (150).
 *
 * Dos caminos según el vínculo, que se decide al radicar y no cambia:
 *
 *   sin contrato  RADICADA → RECIBIDA. Una notificación: Contratación la da por
 *                 recibida y tramita por fuera.
 *   con contrato  RADICADA → (asignar) EN_REVISION ⇄ DEVUELTA → MINUTA →
 *                 EN_VISTO_BUENO ⇄ MINUTA → EN_FIRMA → PERFECCIONADA →
 *                 PUBLICADA. Cambia el contrato al perfeccionarse.
 *
 * Cualquiera de los dos puede terminar DESISTIDA (el área) o NEGADA (un
 * escalón que niega).
 */
@Injectable()
export class TramitesModificacionService {
  private readonly logger = new Logger(TramitesModificacionService.name);
  private readonly campana: Campana;

  constructor(
    private readonly dataSource: DataSource,
    private readonly modificaciones: ModificacionesService,
    private readonly alcance: AlcanceService,
  ) {
    this.campana = new Campana(dataSource, this.logger);
  }

  // ------------------------------------------------------- para radicar --

  /** Los tipos activos y los documentos de la 9.5, para armar el formulario. */
  async paraRadicar() {
    const tipos = await this.dataSource.getRepository(TipoDeModificacion).find({
      where: { activo: true },
      order: { orden: 'ASC', nombre: 'ASC' },
    });
    const requisitos = await this.requisitos();
    return {
      tipos: tipos.map((t) => ({
        codigo: t.codigo,
        nombre: t.nombre,
        descripcion: t.descripcion,
        efecto: t.efecto,
        vaSola: t.vaSola,
      })),
      requisitos: requisitos.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        descripcion: r.descripcion ?? null,
        obligatorio: r.obligatorio,
        plantillaCodigo: r.plantillaCodigo,
        tiposModificacion: r.tiposModificacion ?? [],
      })),
    };
  }

  /**
   * El contrato de la plataforma con ese número, si lo hay, y qué tipos admite.
   *
   * Es lo que decide el vínculo: si no aparece, la modificación se radica como
   * notificación de un contrato antiguo.
   */
  async buscarContrato(numero: string) {
    const limpio = (numero ?? '').trim();
    if (!limpio) throw new BadRequestException('Escribe el número del contrato');

    const contrato = await this.dataSource
      .getRepository(Contrato)
      .createQueryBuilder('c')
      .where('upper(trim(c.numero)) = upper(:numero)', { numero: limpio })
      .andWhere("c.estado <> 'RECHAZADO'")
      .getOne();
    if (!contrato) return { encontrado: false as const, numero: limpio };

    const proceso = await this.dataSource.getRepository(Proceso).findOne({ where: { id: contrato.procesoId } });
    const suspension = await this.modificaciones.suspensionVigente(this.dataSource.manager, contrato.id);
    const tipos = await this.dataSource.getRepository(TipoDeModificacion).find({
      where: { activo: true },
      order: { orden: 'ASC' },
    });

    return {
      encontrado: true as const,
      numero: contrato.numero,
      contrato: {
        id: contrato.id,
        numero: contrato.numero,
        objeto: contrato.objeto,
        estado: contrato.estado,
        valor: contrato.valor,
        plazoDias: contrato.plazoDias,
        contratistaNombre: contrato.contratistaNombre,
        contratistaDocumento: contrato.contratistaDocumento,
        procesoId: contrato.procesoId,
        radicadoProceso: proceso?.radicado ?? null,
        suspendido: suspension !== null,
      },
      tipos: tipos.map((t) => {
        const motivo = porQueNoAdmiteEfecto(
          { estado: contrato.estado, suspendido: suspension !== null },
          t.efecto,
        );
        return { codigo: t.codigo, puede: motivo === null, motivo };
      }),
    };
  }

  /** Quiénes pueden ser abogado o revisor: los que tienen «aprobar» en Modificaciones. */
  async candidatos() {
    const filas: { id: string; nombre: string }[] = await this.dataSource.query(
      `SELECT DISTINCT u.id_user::text AS id,
              COALESCE(p.nom_largo, p.nom_tercero, u.username) AS nombre
         FROM auth.user_roles ur
         JOIN auth."user" u ON u.id_user = ur.id_user
         LEFT JOIN auth.personas p ON p.id_person = u.id_person
         JOIN hiring.alcances_permiso a
           ON a.rol_id = ur.id_rol AND a.activo AND a.accion = 'aprobar'
          AND (a.tramite = 'MOD' OR (a.etapa IS NULL AND a.numeral IS NULL AND a.tramite IS NULL))
        WHERE u.is_active AND COALESCE(ur.is_active, true)
        ORDER BY 2`,
    );
    return filas;
  }

  // ----------------------------------------------------------- consulta --

  /**
   * La bandeja. Contratación ve todas; el área, las que radicó o las de los
   * procesos que creó; el abogado y el revisor, también las suyas.
   */
  async bandeja(acceso: HiringAccess) {
    const verTodo =
      esSuperAdmin(acceso) ||
      (await this.puede(acceso, 'decidir')) ||
      (await this.puede(acceso, 'aprobar'));

    const consulta = this.dataSource
      .getRepository(TramiteModificacion)
      .createQueryBuilder('t')
      .orderBy('t.radicada_at', 'DESC');

    if (!verTodo) {
      consulta.where(
        `(t.radicada_por_id = :uid OR t.abogado_id = :uid OR t.revisor_id = :uid
          OR t.proceso_id IN (SELECT id FROM hiring.procesos WHERE created_by = :nombre))`,
        { uid: acceso.userId, nombre: acceso.userName },
      );
    }

    const tramites = await consulta.getMany();
    const nombres = await this.nombresDeTipos();
    const pendientes = await this.pendientesDe(tramites, acceso);

    return tramites.map((t) => ({
      ...this.resumen(t, nombres),
      meToca: pendientes.has(t.id),
    }));
  }

  async detalle(id: string, acceso: HiringAccess) {
    const em = this.dataSource.manager;
    const tramite = await this.exigirTramite(em, id);
    await this.exigirVer(tramite, acceso);

    const nombres = await this.nombresDeTipos();
    const cambios = tramite.contratoId
      ? await em.getRepository(ModificacionContrato).find({ where: { tramiteId: id }, order: { createdAt: 'ASC' } })
      : [];
    const contrato = tramite.contratoId
      ? await em.getRepository(Contrato).findOne({ where: { id: tramite.contratoId } })
      : null;
    const documentos = await em.getRepository(DocumentoTramiteModificacion).find({
      where: { tramiteId: id },
      order: { createdAt: 'ASC' },
    });
    const requisitos = requisitosPara(await this.requisitos(), tramite.tipos);
    const rondas = await em.getRepository(RondaModificacion).find({
      where: { tramiteId: id },
      order: { iniciadaAt: 'ASC' },
    });
    const eventos = await em.getRepository(EventoTramiteModificacion).find({
      where: { tramiteId: id },
      order: { at: 'ASC' },
    });
    const cdps = cambios.length
      ? await em.getRepository(Cdp).find({ where: { modificacionId: In(cambios.map((c) => c.id)) } })
      : [];

    const vigentes = documentos.filter((d) => d.vigente);
    return {
      ...this.resumen(tramite, nombres),
      justificacion: tramite.justificacion,
      datosContrato: tramite.datosContrato,
      contrato: contrato
        ? {
            id: contrato.id,
            numero: contrato.numero,
            objeto: contrato.objeto,
            estado: contrato.estado,
            valor: contrato.valor,
            plazoDias: contrato.plazoDias,
            contratistaNombre: contrato.contratistaNombre,
            procesoId: contrato.procesoId,
          }
        : null,
      cambios: cambios.map((c) => ({
        id: c.id,
        tipoCodigo: c.tipoCodigo,
        tipoNombre: nombres.get(c.tipoCodigo ?? '') ?? c.tipo,
        efecto: c.tipo,
        estado: c.estado,
        valorAdicionado: c.valorAdicionado,
        cdp: cdps.find((x) => x.modificacionId === c.id)
          ? {
              numero: cdps.find((x) => x.modificacionId === c.id)!.numero,
              valor: cdps.find((x) => x.modificacionId === c.id)!.valor,
              estado: cdps.find((x) => x.modificacionId === c.id)!.estado,
            }
          : null,
        diasProrroga: c.diasProrroga,
        cesionarioNombre: c.cesionarioNombre,
        cesionarioDocumento: c.cesionarioDocumento,
        suspensionDesde: c.suspensionDesde,
        suspensionHasta: c.suspensionHasta,
        reanudadaEl: c.reanudadaEl,
        terminacionCausal: c.terminacionCausal,
        terminacionEl: c.terminacionEl,
        descripcion: c.descripcion,
        valorAntes: c.valorContratoAntes,
        valorDespues: c.valorContratoDespues,
        plazoAntes: c.plazoDiasAntes,
        plazoDespues: c.plazoDiasDespues,
      })),
      requisitos: requisitos.map((r) => {
        const cargado = vigentes.find((d) => d.clase === 'REQUISITO' && d.requisitoId === r.id);
        return {
          id: r.id,
          nombre: r.nombre,
          descripcion: r.descripcion ?? null,
          obligatorio: r.obligatorio,
          plantillaCodigo: r.plantillaCodigo,
          documento: cargado ? this.verDocumento(cargado) : null,
        };
      }),
      documentos: documentos.map((d) => this.verDocumento(d)),
      rondas: rondas.map((r) => ({
        id: r.id,
        fase: r.fase,
        ronda: r.ronda,
        estado: r.estado,
        escalonActual: r.escalonActual,
        escalones: r.escalones,
        iniciadaAt: r.iniciadaAt,
        cerradaAt: r.cerradaAt,
      })),
      eventos: eventos.map((e) => ({
        id: e.id,
        accion: e.accion,
        observaciones: e.observaciones,
        detalle: e.detalle,
        por: e.por,
        at: e.at,
      })),
      acciones: await this.accionesPara(tramite, rondas, acceso),
    };
  }

  // ------------------------------------------------------------ radicar --

  async radicar(dto: RadicarModificacionDto, archivos: ArchivoSubido[], acceso: HiringAccess) {
    if (!esSuperAdmin(acceso) && !(await this.puede(acceso, 'editar'))) {
      // Quien creó el proceso también radica, aunque no sea del área radicadora.
      const creador = dto.contratoId ? await this.creadorDelProceso(dto.contratoId) : null;
      if (!creador || creador !== acceso.userName) {
        throw new ForbiddenException('Radica una modificación el área radicadora o quien creó el proceso');
      }
    }

    const id = await this.dataSource.transaction(async (em) => {
      const tipos = await this.tiposDe(em, dto.cambios.map((c) => c.tipo));
      const combinacion = porQueNoSeCombinan(tipos);
      if (combinacion) throw new BadRequestException(combinacion);

      const requisitos = requisitosPara(await this.requisitos(em), tipos.map((t) => t.codigo));
      const faltan = requisitosQueFaltan(
        requisitos,
        archivos.map((a) => a.fieldname),
      );
      if (faltan.length) throw new BadRequestException(`Faltan documentos: ${faltan.join(', ')}`);
      const sobran = archivos.filter((a) => !requisitos.some((r) => r.id === a.fieldname));
      if (sobran.length) {
        throw new BadRequestException(
          `Hay archivos que no corresponden a ningún documento de estos tipos: ${sobran.map((a) => a.originalname).join(', ')}`,
        );
      }

      let contrato: Contrato | null = null;
      if (dto.contratoId) {
        contrato = await em
          .getRepository(Contrato)
          .createQueryBuilder('c')
          .where('c.id = :id', { id: dto.contratoId })
          .setLock('pessimistic_write')
          .getOne();
        if (!contrato) throw new NotFoundException('El contrato que se quiere vincular no existe');
        if (contrato.numero.trim().toUpperCase() !== dto.contratoNumero.trim().toUpperCase()) {
          throw new BadRequestException('El número no coincide con el del contrato que se vincula');
        }
      }

      const [{ n }] = await em.query(`SELECT nextval('hiring.seq_radicado_modificacion')::int AS n`);
      const anio = Number(this.hoy().slice(0, 4));

      const tramite = await em.save(
        em.create(TramiteModificacion, {
          radicado: radicadoDe(anio, n),
          contratoNumero: contrato?.numero ?? dto.contratoNumero.trim(),
          contratoId: contrato?.id ?? null,
          procesoId: contrato?.procesoId ?? null,
          tipos: tipos.map((t) => t.codigo),
          justificacion: dto.justificacion.trim(),
          datosContrato: contrato ? {} : (dto.datosContrato ?? {}),
          estado: 'RADICADA',
          radicadaPor: acceso.userName,
          radicadaPorId: acceso.userId || null,
        } as Partial<TramiteModificacion>),
      );

      if (contrato) {
        const suspension = await this.modificaciones.suspensionVigente(em, contrato.id);
        for (const cambio of dto.cambios) {
          const tipo = tipos.find((t) => t.codigo === cambio.tipo)!;
          const motivo = porQueNoAdmiteEfecto({ estado: contrato.estado, suspendido: suspension !== null }, tipo.efecto);
          if (motivo) throw new ConflictException(`No se puede radicar «${tipo.nombre}»: ${motivo}`);
          await this.crearCambio(em, tramite, contrato, tipo, cambio, suspension?.id ?? null, acceso);
        }
      }

      for (const archivo of archivos) {
        const requisito = requisitos.find((r) => r.id === archivo.fieldname)!;
        await this.guardarArchivo(em, tramite.id, 'REQUISITO', requisito.nombre, archivo, acceso, requisito.id);
      }

      await this.evento(em, tramite.id, 'RADICAR', acceso, null, {
        vinculada: !!contrato,
        tipos: tramite.tipos,
      });
      return tramite.id;
    });

    const tramite = await this.exigirTramite(this.dataSource.manager, id);
    await this.avisarA(
      await this.cuentasConAccion('decidir'),
      tramite.contratoId ? 'Modificación por asignar' : 'Notificación de modificación',
      `${tramite.radicado}: ${acceso.userName} radicó una modificación del contrato ${tramite.contratoNumero}.`,
      tramite,
    );
    return this.detalle(id, acceso);
  }

  /**
   * Un cambio del trámite: una fila de `modificaciones_contrato` en trámite,
   * con los datos que pide su efecto.
   */
  private async crearCambio(
    em: EntityManager,
    tramite: TramiteModificacion,
    contrato: Contrato,
    tipo: TipoDeModificacion,
    cambio: CambioDto,
    suspensionId: string | null,
    acceso: HiringAccess,
  ) {
    const propio: Partial<ModificacionContrato> = {};
    const falta = (que: string) => new BadRequestException(`«${tipo.nombre}» necesita ${que}`);

    switch (tipo.efecto) {
      case 'ADICION':
        if (!cambio.valorAdicionado) throw falta('el valor adicionado');
        if (!cambio.cdp) throw falta('los datos del CDP que respalda el valor adicionado');
        propio.valorAdicionado = cambio.valorAdicionado;
        break;
      case 'PRORROGA':
        if (!cambio.diasProrroga) throw falta('los días de prórroga');
        propio.diasProrroga = cambio.diasProrroga;
        break;
      case 'CESION':
        if (!cambio.cesionario) throw falta('los datos del cesionario');
        propio.cesionarioDocumento = cambio.cesionario.documento.trim();
        propio.cesionarioNombre = cambio.cesionario.nombre.trim();
        propio.cesionarioTipo = cambio.cesionario.tipo;
        break;
      case 'SUSPENSION':
        if (!cambio.suspensionDesde) throw falta('la fecha desde la que se suspende');
        if (cambio.suspensionHasta && cambio.suspensionHasta < cambio.suspensionDesde) {
          throw new BadRequestException('La suspensión no puede terminar antes de empezar');
        }
        propio.suspensionDesde = cambio.suspensionDesde;
        propio.suspensionHasta = cambio.suspensionHasta ?? null;
        break;
      case 'REANUDACION':
        if (!cambio.reanudadaEl) throw falta('la fecha de reanudación');
        if (!suspensionId) throw new ConflictException('El contrato no tiene una suspensión vigente que reanudar');
        propio.reanudadaEl = cambio.reanudadaEl;
        propio.reanudaModificacionId = suspensionId;
        break;
      case 'TERMINACION_ANTICIPADA':
        if (!cambio.terminacionCausal || !cambio.terminacionEl) throw falta('la causal y la fecha de terminación');
        propio.terminacionCausal = cambio.terminacionCausal;
        propio.terminacionEl = cambio.terminacionEl;
        break;
      case 'OTRO':
        if (!cambio.descripcion?.trim()) throw falta('una descripción del cambio');
        break;
      default:
        break;
    }

    const registro = await em.save(
      em.create(ModificacionContrato, {
        contratoId: contrato.id,
        tramiteId: tramite.id,
        tipoCodigo: tipo.codigo,
        tipo: tipo.efecto,
        justificacion: tramite.justificacion,
        descripcion: cambio.descripcion?.trim() || null,
        objetoContrato: contrato.objeto,
        estado: 'EN_TRAMITE',
        solicitadaPor: acceso.userName,
        ...propio,
      } as Partial<ModificacionContrato>),
    );

    // El CDP de la adición se carga, no se solicita (103): lo trae el área.
    if (tipo.efecto === 'ADICION' && cambio.cdp) {
      await em.save(
        em.create(Cdp, {
          procesoId: contrato.procesoId,
          modificacionId: registro.id,
          numero: cambio.cdp.numero.trim(),
          valor: cambio.cdp.valor,
          rubro: cambio.cdp.rubro.trim(),
          fechaExpedicion: cambio.cdp.fechaExpedicion,
          estado: 'EXPEDIDO',
          solicitadoPor: acceso.userName,
          solicitadoAt: new Date(),
          expedidoPor: acceso.userName,
        } as Partial<Cdp>),
      );
    }
  }

  /** Reemplaza o agrega el documento de un requisito mientras el área puede corregir. */
  async subirDocumento(id: string, requisitoId: string, archivo: ArchivoSubido, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const tramite = await this.exigirTramite(em, id, true);
      await this.exigirArea(tramite, acceso);
      if (!['RADICADA', 'DEVUELTA'].includes(tramite.estado)) {
        throw new ConflictException(
          'Los documentos se corrigen antes de la asignación o cuando la modificación vuelve al área',
        );
      }
      const requisito = requisitosPara(await this.requisitos(em), tramite.tipos).find((r) => r.id === requisitoId);
      if (!requisito) throw new NotFoundException('Ese documento no se pide para esta modificación');

      await this.guardarArchivo(em, tramite.id, 'REQUISITO', requisito.nombre, archivo, acceso, requisito.id);
      await this.evento(em, tramite.id, 'CORREGIR_DOCUMENTO', acceso, null, { documento: requisito.nombre });
    });
    return this.detalle(id, acceso);
  }

  // --------------------------------------------------- la notificación --

  async recibir(id: string, dto: RecibirNotificacionDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const tramite = await this.exigirTramite(em, id, true);
      await this.exigirAccion(acceso, 'decidir', 'Da por recibida una notificación quien asigna las modificaciones');
      if (tramite.contratoId) {
        throw new ConflictException('Esta modificación está vinculada a un contrato: se asigna, no se da por recibida');
      }
      if (tramite.estado !== 'RADICADA') throw new ConflictException('La notificación ya no está pendiente');

      tramite.estado = 'RECIBIDA';
      tramite.notaRecibido = dto.nota?.trim() || null;
      tramite.recibidaPor = acceso.userName;
      tramite.recibidaAt = new Date();
      await this.guardar(em, tramite);
      await this.evento(em, tramite.id, 'RECIBIR', acceso, tramite.notaRecibido);
    });

    const tramite = await this.exigirTramite(this.dataSource.manager, id);
    await this.avisarA(
      [tramite.radicadaPorId],
      'Notificación recibida',
      `${tramite.radicado}: Contratación recibió la modificación del contrato ${tramite.contratoNumero}.`,
      tramite,
    );
    return this.detalle(id, acceso);
  }

  // ------------------------------------------------------ el flujo --

  async asignar(id: string, dto: AsignarModificacionDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const tramite = await this.exigirTramite(em, id, true);
      await this.exigirAccion(acceso, 'decidir', 'Asigna las modificaciones quien tenga «decidir» en Modificaciones');
      if (!tramite.contratoId) throw new ConflictException('Una notificación no se asigna: se da por recibida');
      if (tramite.estado !== 'RADICADA') throw new ConflictException('La modificación ya fue asignada');
      if (dto.abogadoId === dto.revisorId) {
        throw new BadRequestException('El abogado y el revisor tienen que ser personas distintas');
      }

      const candidatos = await this.candidatos();
      const abogado = candidatos.find((c) => c.id === dto.abogadoId);
      const revisor = candidatos.find((c) => c.id === dto.revisorId);
      if (!abogado || !revisor) {
        throw new BadRequestException('El abogado y el revisor tienen que poder revisar modificaciones («aprobar» en Modificaciones)');
      }

      tramite.abogadoId = abogado.id;
      tramite.abogadoNombre = abogado.nombre;
      tramite.revisorId = revisor.id;
      tramite.revisorNombre = revisor.nombre;
      tramite.asignadaPor = acceso.userName;
      tramite.asignadaAt = new Date();
      tramite.estado = 'EN_REVISION';
      await this.guardar(em, tramite);
      await this.evento(em, tramite.id, 'ASIGNAR', acceso, null, { abogado: abogado.nombre, revisor: revisor.nombre });
      await this.abrir(em, tramite, 'REVISION', acceso);
    });

    await this.avisarPendiente(id);
    return this.detalle(id, acceso);
  }

  /** Aprobar, devolver o negar el escalón pendiente de la ronda en curso. */
  async decidir(id: string, dto: DecidirModificacionDto, acceso: HiringAccess) {
    const observaciones = dto.observaciones?.trim() || null;
    if (dto.accion !== 'APROBAR' && !observaciones) {
      throw new BadRequestException(
        dto.accion === 'DEVOLVER' ? 'Di qué hay que corregir para devolverla' : 'Di por qué se niega la modificación',
      );
    }

    let tras: ReturnType<typeof trasDecidir> | null = null;
    let fase: FaseCadenaModificacion | null = null;
    await this.dataSource.transaction(async (em) => {
      const tramite = await this.exigirTramite(em, id, true);
      const ronda = await this.rondaEnCurso(em, id);
      if (!ronda) throw new ConflictException('La modificación no está esperando una decisión');

      const escalon = ronda.escalones.find((e) => e.estado === 'PENDIENTE');
      const motivo = motivoParaNoDecidir(
        escalon,
        dto.accion,
        { usuarioId: acceso.userId, roles: acceso.roles },
        tramite,
      );
      if (motivo) throw new ForbiddenException(motivo);

      fase = ronda.fase;
      tras = trasDecidir(ronda.fase, ronda.escalones, dto.accion, { nombre: acceso.userName, usuarioId: acceso.userId }, new Date().toISOString());
      ronda.escalones = tras.escalones;
      ronda.estado = tras.ronda;
      ronda.escalonActual = tras.escalonActual;
      if (tras.ronda !== 'EN_CURSO') ronda.cerradaAt = new Date();
      await em.save(ronda);

      tramite.estado = tras.tramite;
      if (tras.tramite === 'NEGADA') {
        tramite.motivoCierre = observaciones;
        tramite.cerradaPor = acceso.userName;
        tramite.cerradaAt = new Date();
        await this.dejarSinCurso(em, tramite.id);
      }
      await this.guardar(em, tramite);
      await this.evento(em, tramite.id, dto.accion, acceso, observaciones, {
        fase: ronda.fase,
        escalon: escalon!.nombre,
      }, ronda.id, escalon!.orden);
    });

    const tramite = await this.exigirTramite(this.dataSource.manager, id);
    const t = tras as ReturnType<typeof trasDecidir> | null;
    if (t?.ronda === 'EN_CURSO') await this.avisarPendiente(id);
    else if (t?.tramite === 'DEVUELTA' || t?.tramite === 'NEGADA' || t?.tramite === 'EN_FIRMA') {
      await this.avisarA(
        [tramite.radicadaPorId],
        t.tramite === 'EN_FIRMA' ? 'Modificación lista para firma' : t.tramite === 'NEGADA' ? 'Modificación negada' : 'Modificación devuelta',
        `${tramite.radicado} (contrato ${tramite.contratoNumero}): ${NOMBRE_ESTADO[tramite.estado]}.`,
        tramite,
      );
    } else if (t?.tramite === 'MINUTA') {
      await this.avisarA(
        [tramite.abogadoId],
        fase === 'VISTO_BUENO' ? 'Minuta devuelta' : 'Elabora la minuta',
        `${tramite.radicado} (contrato ${tramite.contratoNumero}): ${fase === 'VISTO_BUENO' ? 'el visto bueno devolvió la minuta' : 'la revisión quedó aprobada'}.`,
        tramite,
      );
    }
    return this.detalle(id, acceso);
  }

  /** El área corrigió lo devuelto: la revisión empieza otra vez desde el primer escalón. */
  async reenviar(id: string, dto: ReenviarModificacionDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const tramite = await this.exigirTramite(em, id, true);
      await this.exigirArea(tramite, acceso);
      if (tramite.estado !== 'DEVUELTA') throw new ConflictException('La modificación no está devuelta al área');

      const faltan = requisitosQueFaltan(
        requisitosPara(await this.requisitos(em), tramite.tipos),
        (await this.documentosVigentes(em, id, 'REQUISITO')).map((d) => d.requisitoId ?? ''),
      );
      if (faltan.length) throw new BadRequestException(`Faltan documentos: ${faltan.join(', ')}`);

      tramite.estado = 'EN_REVISION';
      await this.guardar(em, tramite);
      await this.evento(em, tramite.id, 'REENVIAR', acceso, dto.observaciones?.trim() || null);
      await this.abrir(em, tramite, 'REVISION', acceso);
    });

    await this.avisarPendiente(id);
    return this.detalle(id, acceso);
  }

  /** El abogado sube la minuta y la manda al visto bueno. */
  async enviarMinuta(id: string, archivo: ArchivoSubido, observaciones: string | null, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const tramite = await this.exigirTramite(em, id, true);
      if (tramite.abogadoId !== acceso.userId && !esSuperAdmin(acceso)) {
        throw new ForbiddenException('La minuta la elabora el abogado asignado');
      }
      if (tramite.estado !== 'MINUTA') throw new ConflictException('La modificación no está en la elaboración de la minuta');

      await this.guardarArchivo(em, tramite.id, 'MINUTA', 'Minuta de la modificación', archivo, acceso);
      tramite.estado = 'EN_VISTO_BUENO';
      await this.guardar(em, tramite);
      await this.evento(em, tramite.id, 'ENVIAR_MINUTA', acceso, observaciones);
      await this.abrir(em, tramite, 'VISTO_BUENO', acceso);
    });

    await this.avisarPendiente(id);
    return this.detalle(id, acceso);
  }

  /**
   * El área sube la minuta firmada: la modificación queda perfeccionada y el
   * contrato cambia. Es el único momento en que eso pasa.
   */
  async perfeccionar(id: string, dto: PerfeccionarModificacionDto, archivo: ArchivoSubido, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const tramite = await this.exigirTramite(em, id, true);
      await this.exigirArea(tramite, acceso);
      if (tramite.estado !== 'EN_FIRMA') throw new ConflictException('La modificación no está esperando la firma');

      const contrato = await em
        .getRepository(Contrato)
        .createQueryBuilder('c')
        .where('c.id = :id', { id: tramite.contratoId })
        .setLock('pessimistic_write')
        .getOne();
      if (!contrato) throw new NotFoundException('El contrato vinculado ya no existe');

      const cambios = await em
        .getRepository(ModificacionContrato)
        .find({ where: { tramiteId: id }, order: { createdAt: 'ASC' } });

      // Entre la radicación y la firma el contrato pudo suspenderse o terminarse.
      const suspension = await this.modificaciones.suspensionVigente(em, contrato.id);
      for (const cambio of cambios) {
        const motivo = porQueNoAdmiteEfecto({ estado: contrato.estado, suspendido: suspension !== null }, cambio.tipo);
        if (motivo) throw new ConflictException(`No se puede perfeccionar: ${motivo}`);
      }

      const adicion = cambios.find((c) => c.tipo === 'ADICION');
      if (adicion) {
        if (!dto.rpNumero?.trim() || !dto.rpFechaExpedicion) {
          throw new BadRequestException('La adición necesita el número y la fecha del RP del valor adicionado');
        }
        await em.save(
          em.create(RegistroPresupuestal, {
            contratoId: contrato.id,
            modificacionId: adicion.id,
            numero: dto.rpNumero.trim(),
            valor: adicion.valorAdicionado,
            fechaExpedicion: dto.rpFechaExpedicion,
            estado: 'EXPEDIDO',
            solicitadoPor: acceso.userName,
            solicitadoAt: new Date(),
            expedidoPor: acceso.userName,
          } as Partial<RegistroPresupuestal>),
        );
      }

      const firmada = await this.guardarArchivo(em, tramite.id, 'MINUTA_FIRMADA', `Minuta firmada · ${dto.numero}`, archivo, acceso);

      // El acto firmado también va al expediente del proceso: es lo que la 9.5
      // y el expediente muestran de la modificación.
      const expediente = await em.findOne(Expediente, { where: { procesoId: contrato.procesoId } });
      if (!expediente) throw new NotFoundException('El proceso del contrato no tiene expediente');
      const enExpediente = await em.save(
        em.create(Documento, {
          expedienteId: expediente.id,
          numeral: NUMERAL_MODIFICACIONES,
          tipo: 'ADJUNTO',
          nombre: `Contrato ${contrato.numero} · ${dto.numero}`,
          archivoUrl: firmada.archivoUrl,
          archivoNombreOriginal: firmada.archivoNombreOriginal,
          archivoMimeType: firmada.archivoMimeType,
          archivoTamano: firmada.archivoTamano,
          hashSha256: firmada.hashSha256,
          subidoPor: acceso.userName,
        } as Partial<Documento>),
      );

      const efectos: Record<string, unknown>[] = [];
      for (const cambio of cambios) {
        efectos.push(
          await this.modificaciones.perfeccionarCambio(
            em,
            contrato.procesoId,
            contrato,
            cambio,
            { numero: dto.numero, fechaSuscripcion: dto.fechaSuscripcion, documentoId: enExpediente.id },
            acceso,
          ),
        );
      }
      await this.modificaciones.reflejarEnLaActividad(em, contrato.procesoId, contrato.id, acceso);

      tramite.estado = 'PERFECCIONADA';
      tramite.numeroModificacion = dto.numero.trim();
      tramite.fechaSuscripcion = dto.fechaSuscripcion;
      tramite.perfeccionadaPor = acceso.userName;
      tramite.perfeccionadaAt = new Date();
      await this.guardar(em, tramite);
      await this.evento(em, tramite.id, 'PERFECCIONAR', acceso, null, { numero: dto.numero, efectos });
    });

    const tramite = await this.exigirTramite(this.dataSource.manager, id);
    await this.avisarA(
      [tramite.abogadoId],
      'Publica la modificación en SECOP',
      `${tramite.radicado} (contrato ${tramite.contratoNumero}) quedó perfeccionada: falta publicarla en SECOP II.`,
      tramite,
    );
    return this.detalle(id, acceso);
  }

  /** El abogado carga la evidencia de SECOP y se le avisa al supervisor. */
  async publicar(id: string, dto: PublicarModificacionTramiteDto, archivo: ArchivoSubido, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const tramite = await this.exigirTramite(em, id, true);
      if (tramite.abogadoId !== acceso.userId && !esSuperAdmin(acceso)) {
        throw new ForbiddenException('La publicación en SECOP la carga el abogado asignado');
      }
      if (tramite.estado !== 'PERFECCIONADA') throw new ConflictException('La modificación todavía no está perfeccionada');
      if (dto.fechaPublicacion > this.hoy()) throw new BadRequestException('La fecha de publicación no puede ser futura');
      if (tramite.fechaSuscripcion && dto.fechaPublicacion < tramite.fechaSuscripcion) {
        throw new BadRequestException('No se puede publicar antes de la firma');
      }

      await this.guardarArchivo(em, tramite.id, 'EVIDENCIA_SECOP', 'Evidencia de publicación en SECOP II', archivo, acceso);
      tramite.estado = 'PUBLICADA';
      tramite.fechaPublicacion = dto.fechaPublicacion;
      tramite.secopNumero = dto.secopNumero?.trim() || null;
      tramite.secopUrl = dto.secopUrl?.trim() || null;
      tramite.publicadaPor = acceso.userName;
      tramite.publicadaAt = new Date();
      await this.guardar(em, tramite);
      await this.evento(em, tramite.id, 'PUBLICAR', acceso, null, {
        fechaPublicacion: dto.fechaPublicacion,
        secopNumero: tramite.secopNumero,
      });
    });

    const tramite = await this.exigirTramite(this.dataSource.manager, id);
    const correo = await this.correoAlSupervisor(tramite);
    await this.evento(this.dataSource.manager, tramite.id, 'CORREO_SUPERVISOR', acceso, null, correo);
    return this.detalle(id, acceso);
  }

  /** El área ya no la quiere. Antes de perfeccionarse; después, lo que procede es otra modificación. */
  async desistir(id: string, dto: CerrarModificacionDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const tramite = await this.exigirTramite(em, id, true);
      await this.exigirArea(tramite, acceso);
      if (!SE_PUEDE_DESISTIR.includes(tramite.estado)) {
        throw new ConflictException('Una modificación perfeccionada o cerrada ya no se desiste');
      }

      await this.cancelarRonda(em, id);
      tramite.estado = 'DESISTIDA';
      tramite.motivoCierre = dto.motivo.trim();
      tramite.cerradaPor = acceso.userName;
      tramite.cerradaAt = new Date();
      await this.dejarSinCurso(em, tramite.id);
      await this.guardar(em, tramite);
      await this.evento(em, tramite.id, 'DESISTIR', acceso, tramite.motivoCierre);
    });
    return this.detalle(id, acceso);
  }

  /** El archivo de un documento del trámite, para descargarlo. */
  async archivo(id: string, documentoId: string, acceso: HiringAccess) {
    const tramite = await this.exigirTramite(this.dataSource.manager, id);
    await this.exigirVer(tramite, acceso);
    const documento = await this.dataSource
      .getRepository(DocumentoTramiteModificacion)
      .findOne({ where: { id: documentoId, tramiteId: id } });
    if (!documento) throw new NotFoundException('El documento no existe');
    return documento;
  }

  // ---------------------------------------------------------- las rondas --

  private async abrir(em: EntityManager, tramite: TramiteModificacion, fase: FaseCadenaModificacion, acceso: HiringAccess) {
    const cadena = await em.getRepository(CadenaModificacion).findOne({ where: { fase } });
    if (!cadena?.escalones?.length) {
      throw new ConflictException(`La cadena de ${fase === 'REVISION' ? 'revisión' : 'visto bueno'} no está configurada`);
    }
    await this.cancelarRonda(em, tramite.id);
    const anteriores = await em.getRepository(RondaModificacion).count({ where: { tramiteId: tramite.id, fase } });
    return em.save(
      em.create(RondaModificacion, {
        tramiteId: tramite.id,
        fase,
        ronda: anteriores + 1,
        estado: 'EN_CURSO',
        escalonActual: 1,
        escalones: abrirRonda(cadena.escalones),
        iniciadaPor: acceso.userName,
      } as Partial<RondaModificacion>),
    );
  }

  private rondaEnCurso(em: EntityManager, tramiteId: string) {
    return em
      .getRepository(RondaModificacion)
      .createQueryBuilder('r')
      .where('r.tramite_id = :tramiteId', { tramiteId })
      .andWhere("r.estado = 'EN_CURSO'")
      .setLock('pessimistic_write')
      .getOne();
  }

  private async cancelarRonda(em: EntityManager, tramiteId: string) {
    const viva = await this.rondaEnCurso(em, tramiteId);
    if (!viva) return;
    viva.estado = 'CANCELADA';
    viva.escalones = viva.escalones.map((e) =>
      e.estado === 'PENDIENTE' || e.estado === 'BLOQUEADO' ? { ...e, estado: 'ANULADO' as const } : e,
    );
    viva.cerradaAt = new Date();
    await em.save(viva);
  }

  /** Los cambios en trámite dejan de estarlo, y el CDP que trajeron la adición se anula. */
  private async dejarSinCurso(em: EntityManager, tramiteId: string) {
    const cambios = await em.getRepository(ModificacionContrato).find({ where: { tramiteId, estado: 'EN_TRAMITE' } });
    if (!cambios.length) return;
    await em.update(ModificacionContrato, { id: In(cambios.map((c) => c.id)) }, { estado: 'RECHAZADA' });
    await em.update(Cdp, { modificacionId: In(cambios.map((c) => c.id)) }, { estado: 'ANULADO' });
  }

  // ------------------------------------------------------- qué puede hacer --

  private async accionesPara(tramite: TramiteModificacion, rondas: RondaModificacion[], acceso: HiringAccess) {
    const esArea = await this.esArea(tramite, acceso);
    const asigna = esSuperAdmin(acceso) || (await this.puede(acceso, 'decidir'));
    const viva = rondas.find((r) => r.estado === 'EN_CURSO');
    const escalon = viva?.escalones.find((e) => e.estado === 'PENDIENTE');
    const decide =
      !!escalon && esResponsable(escalon, { usuarioId: acceso.userId, roles: acceso.roles }, tramite);
    const esAbogado = tramite.abogadoId === acceso.userId || esSuperAdmin(acceso);

    return {
      recibir: asigna && !tramite.contratoId && tramite.estado === 'RADICADA',
      asignar: asigna && !!tramite.contratoId && tramite.estado === 'RADICADA',
      decidir: decide ? escalon!.acciones : [],
      escalonPendiente: escalon ? { nombre: escalon.nombre, fase: viva!.fase } : null,
      corregirDocumentos: esArea && ['RADICADA', 'DEVUELTA'].includes(tramite.estado),
      reenviar: esArea && tramite.estado === 'DEVUELTA',
      enviarMinuta: esAbogado && tramite.estado === 'MINUTA',
      perfeccionar: esArea && tramite.estado === 'EN_FIRMA',
      pideRp: tramite.tipos.length > 0 && (await this.tieneAdicion(tramite)),
      publicar: esAbogado && tramite.estado === 'PERFECCIONADA',
      desistir: esArea && SE_PUEDE_DESISTIR.includes(tramite.estado),
    };
  }

  private async tieneAdicion(tramite: TramiteModificacion) {
    const tipos = await this.dataSource
      .getRepository(TipoDeModificacion)
      .find({ where: { codigo: In(tramite.tipos) } });
    return tipos.some((t) => t.efecto === 'ADICION');
  }

  /** Los trámites que esperan algo de quien mira, para marcarlos en la bandeja. */
  private async pendientesDe(tramites: TramiteModificacion[], acceso: HiringAccess) {
    const ids = new Set<string>();
    const vivos = tramites.filter((t) => !ESTADOS_FINALES.includes(t.estado));
    if (!vivos.length) return ids;

    const asigna = esSuperAdmin(acceso) || (await this.puede(acceso, 'decidir'));
    const rondas = await this.dataSource.getRepository(RondaModificacion).find({
      where: { tramiteId: In(vivos.map((t) => t.id)), estado: 'EN_CURSO' },
    });

    for (const t of vivos) {
      const esArea = t.radicadaPorId === acceso.userId;
      const escalon = rondas.find((r) => r.tramiteId === t.id)?.escalones.find((e) => e.estado === 'PENDIENTE');
      if (
        (asigna && t.estado === 'RADICADA') ||
        (escalon && esResponsable(escalon, { usuarioId: acceso.userId, roles: acceso.roles }, t)) ||
        (esArea && ['DEVUELTA', 'EN_FIRMA'].includes(t.estado)) ||
        (t.abogadoId === acceso.userId && ['MINUTA', 'PERFECCIONADA'].includes(t.estado))
      ) {
        ids.add(t.id);
      }
    }
    return ids;
  }

  private async esArea(tramite: TramiteModificacion, acceso: HiringAccess) {
    if (esSuperAdmin(acceso)) return true;
    if (tramite.radicadaPorId && tramite.radicadaPorId === acceso.userId) return true;
    if (await this.puede(acceso, 'editar')) return true;
    if (tramite.contratoId) return (await this.creadorDelProceso(tramite.contratoId)) === acceso.userName;
    return false;
  }

  private async exigirArea(tramite: TramiteModificacion, acceso: HiringAccess) {
    if (!(await this.esArea(tramite, acceso))) {
      throw new ForbiddenException('Esto lo hace el área que radicó la modificación');
    }
  }

  private async exigirVer(tramite: TramiteModificacion, acceso: HiringAccess) {
    if (
      esSuperAdmin(acceso) ||
      [tramite.radicadaPorId, tramite.abogadoId, tramite.revisorId].includes(acceso.userId) ||
      (await this.puede(acceso, 'ver')) ||
      (await this.esArea(tramite, acceso))
    ) {
      return;
    }
    throw new ForbiddenException('No tienes acceso a esta modificación');
  }

  private async exigirAccion(acceso: HiringAccess, accion: Accion, mensaje: string) {
    if (!esSuperAdmin(acceso) && !(await this.puede(acceso, accion))) throw new ForbiddenException(mensaje);
  }

  private puede(acceso: HiringAccess, accion: Accion) {
    return this.alcance.puedeEn(acceso, accion, 'MOD');
  }

  private async creadorDelProceso(contratoId: string): Promise<string | null> {
    const [fila] = await this.dataSource.query(
      `SELECT p.created_by AS creador FROM hiring.contratos c JOIN hiring.procesos p ON p.id = c.proceso_id WHERE c.id = $1`,
      [contratoId],
    );
    return fila?.creador ?? null;
  }

  // ------------------------------------------------------------- avisos --

  /** Avisa en la campana a quien tiene que decidir el escalón pendiente. */
  private async avisarPendiente(id: string) {
    const tramite = await this.exigirTramite(this.dataSource.manager, id);
    const ronda = await this.dataSource
      .getRepository(RondaModificacion)
      .findOne({ where: { tramiteId: id, estado: 'EN_CURSO' } });
    const escalon = ronda?.escalones.find((e) => e.estado === 'PENDIENTE');
    if (!escalon) return;

    const cuentas =
      escalon.papel === 'ABOGADO'
        ? [tramite.abogadoId]
        : escalon.papel === 'REVISOR'
          ? [tramite.revisorId]
          : await this.cuentasConRoles(escalon.roles);
    await this.avisarA(
      cuentas,
      ronda!.fase === 'REVISION' ? 'Modificación por revisar' : 'Modificación por visto bueno',
      `${tramite.radicado} (contrato ${tramite.contratoNumero}) espera tu decisión: ${escalon.nombre}.`,
      tramite,
    );
  }

  private async avisarA(cuentas: (string | null)[], titulo: string, mensaje: string, tramite: TramiteModificacion) {
    const destinos = [...new Set(cuentas.filter((c): c is string => !!c))];
    if (!destinos.length) return;
    try {
      await this.campana.enviar(
        destinos.map((id) => ({
          id_usuario_destinatario: id,
          tipo_notificacion: 'contratacion_modificacion',
          titulo,
          mensaje,
          prioridad: 'Media' as const,
          datos_adicionales: { tramiteModificacionId: tramite.id, radicado: tramite.radicado },
        })),
      );
    } catch (error: any) {
      // Un aviso que no sale no deshace el trámite.
      this.logger.warn(`No se pudo avisar de ${tramite.radicado}: ${error.message}`);
    }
  }

  private async cuentasConAccion(accion: Accion): Promise<string[]> {
    const filas = await this.dataSource.query(
      `SELECT DISTINCT ur.id_user::text AS id
         FROM auth.user_roles ur
         JOIN hiring.alcances_permiso a
           ON a.rol_id = ur.id_rol AND a.activo AND a.accion = $1 AND a.tramite = 'MOD'
        WHERE COALESCE(ur.is_active, true)`,
      [accion],
    );
    return filas.map((f: any) => f.id);
  }

  private async cuentasConRoles(roles: string[]): Promise<string[]> {
    if (!roles.length) return [];
    const filas = await this.dataSource.query(
      `SELECT DISTINCT ur.id_user::text AS id
         FROM auth.user_roles ur JOIN auth.role r ON r.id = ur.id_rol
        WHERE r.code = ANY($1::text[]) AND COALESCE(ur.is_active, true)`,
      [roles],
    );
    return filas.map((f: any) => f.id);
  }

  /** El correo al supervisor vigente con la modificación publicada. No lanza. */
  private async correoAlSupervisor(tramite: TramiteModificacion): Promise<Record<string, unknown>> {
    try {
      if (!tramite.contratoId) return { enviado: false, motivo: 'sin contrato vinculado' };
      const supervision = await this.dataSource.getRepository(SupervisionContrato).findOne({
        where: { contratoId: tramite.contratoId, estado: 'VIGENTE' },
        order: { createdAt: 'DESC' },
      });
      if (!supervision?.email) return { enviado: false, motivo: 'el supervisor vigente no tiene correo' };

      const salio = await this.campana.correoConAdjuntos(
        supervision.email,
        {
          titulo: `Modificación ${tramite.numeroModificacion ?? ''} del contrato ${tramite.contratoNumero}`.trim(),
          mensaje:
            `Se publicó en SECOP II la ${tramite.numeroModificacion ?? 'modificación'} del contrato ${tramite.contratoNumero}` +
            (tramite.fechaSuscripcion ? `, suscrita el ${tramite.fechaSuscripcion}` : '') +
            (tramite.secopUrl ? `. Consulta: ${tramite.secopUrl}` : '.'),
        },
        [],
        'contratacion_modificacion_publicada',
      );
      return { enviado: salio, para: supervision.email };
    } catch (error: any) {
      this.logger.warn(`No se pudo avisar al supervisor de ${tramite.radicado}: ${error.message}`);
      return { enviado: false, motivo: 'ocurrió un error al prepararlo' };
    }
  }

  // ----------------------------------------------------------- auxiliares --

  private async requisitos(em?: EntityManager) {
    return (em ?? this.dataSource.manager).getRepository(DocumentoRequerido).find({
      where: { numeral: NUMERAL_MODIFICACIONES, activo: true },
      order: { orden: 'ASC', nombre: 'ASC' },
    });
  }

  private async tiposDe(em: EntityManager, codigos: string[]) {
    const unicos = [...new Set(codigos)];
    if (unicos.length !== codigos.length) {
      throw new BadRequestException('Cada tipo va una sola vez en la modificación');
    }
    const tipos = await em.getRepository(TipoDeModificacion).find({ where: { codigo: In(unicos), activo: true } });
    const faltan = unicos.filter((c) => !tipos.some((t) => t.codigo === c));
    if (faltan.length) throw new BadRequestException(`Tipos que no existen o están retirados: ${faltan.join(', ')}`);
    return unicos.map((c) => tipos.find((t) => t.codigo === c)!);
  }

  private async nombresDeTipos() {
    const tipos = await this.dataSource.getRepository(TipoDeModificacion).find();
    return new Map(tipos.map((t) => [t.codigo, t.nombre]));
  }

  private resumen(t: TramiteModificacion, nombres: Map<string, string>) {
    return {
      id: t.id,
      radicado: t.radicado,
      contratoNumero: t.contratoNumero,
      vinculada: !!t.contratoId,
      procesoId: t.procesoId,
      tipos: t.tipos.map((c) => ({ codigo: c, nombre: nombres.get(c) ?? c })),
      estado: t.estado,
      estadoNombre: NOMBRE_ESTADO[t.estado],
      abogadoNombre: t.abogadoNombre,
      revisorNombre: t.revisorNombre,
      numeroModificacion: t.numeroModificacion,
      fechaSuscripcion: t.fechaSuscripcion,
      fechaPublicacion: t.fechaPublicacion,
      secopNumero: t.secopNumero,
      secopUrl: t.secopUrl,
      notaRecibido: t.notaRecibido,
      motivoCierre: t.motivoCierre,
      radicadaPor: t.radicadaPor,
      radicadaAt: t.radicadaAt,
      updatedAt: t.updatedAt,
    };
  }

  private verDocumento(d: DocumentoTramiteModificacion) {
    return {
      id: d.id,
      clase: d.clase,
      requisitoId: d.requisitoId,
      nombre: d.nombre,
      archivoUrl: d.archivoUrl,
      archivoNombreOriginal: d.archivoNombreOriginal,
      version: d.version,
      vigente: d.vigente,
      subidoPor: d.subidoPor,
      createdAt: d.createdAt,
    };
  }

  private documentosVigentes(em: EntityManager, tramiteId: string, clase: ClaseDocumentoTramite) {
    return em.getRepository(DocumentoTramiteModificacion).find({ where: { tramiteId, clase, vigente: true } });
  }

  /** Guarda un archivo del trámite; si reemplaza otro del mismo requisito o clase, sube la versión. */
  private async guardarArchivo(
    em: EntityManager,
    tramiteId: string,
    clase: ClaseDocumentoTramite,
    nombre: string,
    archivo: ArchivoSubido,
    acceso: HiringAccess,
    requisitoId: string | null = null,
  ) {
    const repo = em.getRepository(DocumentoTramiteModificacion);
    const anterior = await repo.findOne({
      where: requisitoId ? { tramiteId, clase, requisitoId, vigente: true } : { tramiteId, clase, vigente: true },
    });
    if (anterior) {
      anterior.vigente = false;
      await repo.save(anterior);
    }
    return repo.save(
      repo.create({
        tramiteId,
        clase,
        requisitoId,
        nombre,
        archivoUrl: `hiring/files/${archivo.filename}`,
        archivoNombreOriginal: archivo.originalname,
        archivoMimeType: archivo.mimetype,
        archivoTamano: archivo.size,
        hashSha256: archivo.hash,
        version: (anterior?.version ?? 0) + 1,
        vigente: true,
        subidoPor: acceso.userName,
      }),
    );
  }

  private evento(
    em: EntityManager,
    tramiteId: string,
    accion: string,
    acceso: HiringAccess,
    observaciones: string | null,
    detalle: Record<string, unknown> = {},
    rondaId: string | null = null,
    escalon: number | null = null,
  ) {
    return em.save(
      em.create(EventoTramiteModificacion, {
        tramiteId,
        accion,
        observaciones,
        detalle,
        rondaId,
        escalon,
        por: acceso.userName,
        porId: acceso.userId || null,
      }),
    );
  }

  private guardar(em: EntityManager, tramite: TramiteModificacion) {
    tramite.updatedAt = new Date();
    return em.save(tramite);
  }

  private async exigirTramite(em: EntityManager, id: string, bloquear = false) {
    const consulta = em.getRepository(TramiteModificacion).createQueryBuilder('t').where('t.id = :id', { id });
    if (bloquear) consulta.setLock('pessimistic_write');
    const tramite = await consulta.getOne();
    if (!tramite) throw new NotFoundException('La modificación no existe');
    return tramite;
  }

  private hoy() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }
}

