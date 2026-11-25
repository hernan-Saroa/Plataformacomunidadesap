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
import { Contrato } from '../../entities/contrato.entity';
import { Documento } from '../../entities/documento.entity';
import { DocumentoRequerido } from '../../entities/documento-requerido.entity';
import { Expediente } from '../../entities/expediente.entity';
import { NUMERAL_LIQUIDACION } from '../../entities/acta-liquidacion.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { PublicacionActa } from '../../entities/publicacion-acta.entity';
import { SupervisionContrato } from '../../entities/supervision-contrato.entity';
import {
  CadenaLiquidacion,
  ClaseDocumentoLiquidacion,
  ClaseTramiteLiquidacion,
  DocumentoTramiteLiquidacion,
  EventoTramiteLiquidacion,
  FaseCadenaLiquidacion,
  RondaLiquidacion,
  TramiteLiquidacion,
} from '../../entities/tramite-liquidacion.entity';
import { CierreDefinitivoService } from '../cierre-definitivo/cierre-definitivo.service';
import { admiteLiquidacion, LiquidacionService } from '../liquidacion/liquidacion.service';
import { Campana } from '../notificaciones/campana';
import {
  AsignarLiquidacionDto,
  DecidirLiquidacionDto,
  DesistirLiquidacionDto,
  DevolverAlAreaDto,
  EvidenciaSecopDto,
  PerfeccionarLiquidacionDto,
  ReenviarLiquidacionDto,
} from './dto/tramites-liquidacion.dto';
import { etapa10AbiertaEn, situacionDeLaEtapa9 } from './etapa-10';
import {
  abrirRonda,
  claseDelContrato,
  ESTADOS_FINALES,
  esResponsable,
  faltanDeLaEtapa9,
  motivoParaNoDecidir,
  NOMBRE_CLASE,
  NOMBRE_ESTADO,
  radicadoDe,
  requisitosPara,
  requisitosQueFaltan,
  SE_PUEDE_DESISTIR,
  TRAMITE_DE_LA_CLASE,
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

/**
 * El trámite de liquidación y de cierre del contrato (151), dentro del proceso.
 *
 *   LIQUIDACIÓN  RADICADA → (asignar) EN_REVISION ⇄ DEVUELTA → ACTA →
 *                EN_VISTO_BUENO ⇄ ACTA → EN_FIRMA → PERFECCIONADA → PUBLICADA.
 *                El contrato queda liquidado al subir el acta firmada.
 *   CIERRE       RADICADA → (asignar) EN_REVISION → CERRADA, con devoluciones
 *                al área antes de asignar (el asignador) y en la revisión (el
 *                abogado). El contrato queda cerrado al cargar la evidencia.
 *
 * Los dos pueden terminar DESISTIDA, antes de la firma.
 */
@Injectable()
export class TramitesLiquidacionService {
  private readonly logger = new Logger(TramitesLiquidacionService.name);
  private readonly campana: Campana;

  constructor(
    private readonly dataSource: DataSource,
    private readonly alcance: AlcanceService,
    private readonly liquidacion: LiquidacionService,
    private readonly cierre: CierreDefinitivoService,
  ) {
    this.campana = new Campana(dataSource, this.logger);
  }

  // ------------------------------------------------- desde el proceso --

  /**
   * Lo que el proceso muestra antes y durante el trámite: qué clase le toca,
   * si ya se puede radicar y qué falta, los documentos que se piden y el
   * trámite vivo, si lo hay.
   */
  async situacion(procesoId: string, acceso: HiringAccess) {
    const em = this.dataSource.manager;
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe o fue eliminado');
    const contrato = await this.contratoDelProceso(em, procesoId);

    const vivo = contrato ? await this.tramiteVivo(em, contrato.id) : null;
    const etapa10Abierta = await etapa10AbiertaEn(em, procesoId);

    if (!contrato) {
      return {
        clase: null,
        claseNombre: null,
        puedeRadicar: false,
        motivoNoPuede: 'el proceso todavía no tiene contrato (se genera en la 8.1)',
        faltan: [] as string[],
        requisitos: [],
        etapa10Abierta,
        tramite: null,
        anteriores: [],
      };
    }

    const clase = claseDelContrato(proceso.causal, contrato.contratistaTipo);
    const faltan = vivo ? [] : await this.faltanParaRadicar(em, proceso, contrato);
    const puedeRadicarPorRol = await this.puedeRadicar(acceso, clase, proceso);
    const anteriores = await em.getRepository(TramiteLiquidacion).find({
      where: { contratoId: contrato.id, estado: 'DESISTIDA' },
      order: { radicadaAt: 'DESC' },
    });

    return {
      clase,
      claseNombre: NOMBRE_CLASE[clase],
      puedeRadicar: !vivo && faltan.length === 0 && puedeRadicarPorRol,
      motivoNoPuede: vivo
        ? null
        : faltan.length
          ? `antes hay que terminar: ${faltan.join('; ')}`
          : !puedeRadicarPorRol
            ? `radica la ${NOMBRE_CLASE[clase].toLowerCase()} el área radicadora o quien creó el proceso`
            : null,
      faltan,
      requisitos: requisitosPara(await this.requisitos(em), clase).map((r) => ({
        id: r.id,
        nombre: r.nombre,
        descripcion: r.descripcion ?? null,
        obligatorio: r.obligatorio,
        plantillaCodigo: r.plantillaCodigo,
      })),
      etapa10Abierta,
      tramite: vivo ? await this.detalle(vivo.id, acceso) : null,
      anteriores: anteriores.map((t) => this.resumen(t)),
    };
  }

  /** Lo que falta para radicar, en palabras; vacío si nada. */
  private async faltanParaRadicar(em: EntityManager, proceso: Proceso, contrato: Contrato): Promise<string[]> {
    const faltan: string[] = [];
    if (!admiteLiquidacion(contrato.estado) || contrato.estado === 'LIQUIDADO') {
      faltan.push(
        contrato.estado === 'SUSPENDIDO'
          ? 'el contrato está suspendido: se reanuda o se termina antes'
          : contrato.estado === 'LIQUIDADO' || contrato.estado === 'CERRADO'
            ? `el contrato ya está ${contrato.estado === 'LIQUIDADO' ? 'liquidado' : 'cerrado'}`
            : 'el contrato todavía no está en ejecución',
      );
    }
    const etapa9 = await situacionDeLaEtapa9(em, proceso.id, contrato.id);
    faltan.push(...faltanDeLaEtapa9(etapa9.pasos, etapa9.modificacionEnCurso));
    return faltan;
  }

  // ----------------------------------------------------------- consulta --

  /**
   * La bandeja. Quien asigna o puede ser abogado ve todas las de su clase; el
   * área, las que radicó y las de los procesos que creó.
   */
  async bandeja(acceso: HiringAccess) {
    const clasesQueVe: ClaseTramiteLiquidacion[] = [];
    for (const clase of ['LIQUIDACION', 'CIERRE'] as ClaseTramiteLiquidacion[]) {
      if (esSuperAdmin(acceso) || (await this.puede(acceso, 'decidir', clase)) || (await this.puede(acceso, 'aprobar', clase))) {
        clasesQueVe.push(clase);
      }
    }

    const consulta = this.dataSource
      .getRepository(TramiteLiquidacion)
      .createQueryBuilder('t')
      .orderBy('t.radicada_at', 'DESC');

    consulta.where(
      `(${clasesQueVe.length ? 't.clase IN (:...clases) OR ' : ''}t.radicada_por_id = :uid OR t.abogado_id = :uid OR t.lider_id = :uid
        OR t.proceso_id IN (SELECT id FROM hiring.procesos WHERE created_by = :nombre))`,
      { clases: clasesQueVe, uid: acceso.userId, nombre: acceso.userName },
    );

    const tramites = await consulta.getMany();
    const pendientes = await this.pendientesDe(tramites, acceso);
    const procesos = tramites.length
      ? await this.dataSource.getRepository(Proceso).find({ where: { id: In([...new Set(tramites.map((t) => t.procesoId))]) } })
      : [];
    const contratos = tramites.length
      ? await this.dataSource.getRepository(Contrato).find({ where: { id: In([...new Set(tramites.map((t) => t.contratoId))]) } })
      : [];

    return tramites.map((t) => ({
      ...this.resumen(t),
      radicadoProceso: procesos.find((p) => p.id === t.procesoId)?.radicado ?? null,
      contratoNumero: contratos.find((c) => c.id === t.contratoId)?.numero ?? null,
      contratistaNombre: contratos.find((c) => c.id === t.contratoId)?.contratistaNombre ?? null,
      meToca: pendientes.has(t.id),
    }));
  }

  async detalle(id: string, acceso: HiringAccess) {
    const em = this.dataSource.manager;
    const tramite = await this.exigirTramite(em, id);
    await this.exigirVer(tramite, acceso);

    const contrato = await em.getRepository(Contrato).findOne({ where: { id: tramite.contratoId } });
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: tramite.procesoId } });
    const documentos = await em.getRepository(DocumentoTramiteLiquidacion).find({
      where: { tramiteId: id },
      order: { createdAt: 'ASC' },
    });
    const requisitos = requisitosPara(await this.requisitos(em), tramite.clase);
    const rondas = await em.getRepository(RondaLiquidacion).find({ where: { tramiteId: id }, order: { iniciadaAt: 'ASC' } });
    const eventos = await em.getRepository(EventoTramiteLiquidacion).find({ where: { tramiteId: id }, order: { at: 'ASC' } });
    const vigentes = documentos.filter((d) => d.vigente);

    return {
      ...this.resumen(tramite),
      observaciones: tramite.observaciones,
      tipoActa: tramite.tipoActa,
      fechaActa: tramite.fechaActa,
      proceso: proceso ? { id: proceso.id, radicado: proceso.radicado, objeto: proceso.objeto } : null,
      contrato: contrato
        ? {
            id: contrato.id,
            numero: contrato.numero,
            objeto: contrato.objeto,
            estado: contrato.estado,
            valor: contrato.valor,
            contratistaNombre: contrato.contratistaNombre,
          }
        : null,
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

  /** Quiénes pueden ser abogado: los que tienen «aprobar» en el trámite de esa clase. */
  async candidatos(clase: ClaseTramiteLiquidacion) {
    const filas: { id: string; nombre: string }[] = await this.dataSource.query(
      `SELECT DISTINCT u.id_user::text AS id,
              COALESCE(p.nom_largo, p.nom_tercero, u.username) AS nombre
         FROM auth.user_roles ur
         JOIN auth."user" u ON u.id_user = ur.id_user
         LEFT JOIN auth.personas p ON p.id_person = u.id_person
         JOIN hiring.alcances_permiso a
           ON a.rol_id = ur.id_rol AND a.activo AND a.accion = 'aprobar'
          AND (a.tramite = $1 OR (a.etapa IS NULL AND a.numeral IS NULL AND a.tramite IS NULL))
        WHERE u.is_active AND COALESCE(ur.is_active, true)
        ORDER BY 2`,
      [TRAMITE_DE_LA_CLASE[clase]],
    );
    return filas;
  }

  // ------------------------------------------------------------ radicar --

  async radicar(procesoId: string, observaciones: string | null, archivos: ArchivoSubido[], acceso: HiringAccess) {
    const id = await this.dataSource.transaction(async (em) => {
      const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
      if (!proceso) throw new NotFoundException('El proceso no existe o fue eliminado');
      const contrato = await this.contratoDelProceso(em, procesoId, true);
      if (!contrato) throw new NotFoundException('El proceso todavía no tiene contrato: se genera en la 8.1');

      const clase = claseDelContrato(proceso.causal, contrato.contratistaTipo);
      if (!(await this.puedeRadicar(acceso, clase, proceso))) {
        throw new ForbiddenException(`Radica la ${NOMBRE_CLASE[clase].toLowerCase()} el área radicadora o quien creó el proceso`);
      }
      if (await this.tramiteVivo(em, contrato.id)) {
        throw new ConflictException('El contrato ya tiene un trámite de liquidación o de cierre en curso');
      }

      const faltan = await this.faltanParaRadicar(em, proceso, contrato);
      if (faltan.length) throw new ConflictException(`Todavía no se puede radicar: ${faltan.join('; ')}`);

      const requisitos = requisitosPara(await this.requisitos(em), clase);
      const faltanDocs = requisitosQueFaltan(requisitos, archivos.map((a) => a.fieldname));
      if (faltanDocs.length) throw new BadRequestException(`Faltan documentos: ${faltanDocs.join(', ')}`);
      const sobran = archivos.filter((a) => !requisitos.some((r) => r.id === a.fieldname));
      if (sobran.length) {
        throw new BadRequestException(
          `Hay archivos que no corresponden a ningún documento del trámite: ${sobran.map((a) => a.originalname).join(', ')}`,
        );
      }

      const [{ n }] = await em.query(`SELECT nextval('hiring.seq_radicado_liquidacion')::int AS n`);
      const tramite = await em.save(
        em.create(TramiteLiquidacion, {
          radicado: radicadoDe(clase, Number(this.hoy().slice(0, 4)), n),
          clase,
          procesoId,
          contratoId: contrato.id,
          estado: 'RADICADA',
          observaciones,
          radicadaPor: acceso.userName,
          radicadaPorId: acceso.userId || null,
        } as Partial<TramiteLiquidacion>),
      );

      for (const archivo of archivos) {
        const requisito = requisitos.find((r) => r.id === archivo.fieldname)!;
        await this.guardarArchivo(em, tramite.id, 'REQUISITO', requisito.nombre, archivo, acceso, requisito.id);
      }

      // Un PSPAG no se liquida: la 10.2 queda dicha como «no aplica» para que
      // la etapa siga sin esperarla.
      if (clase === 'CIERRE') await this.marcar102(em, procesoId, 'NO_APLICA');

      await this.evento(em, tramite.id, 'RADICAR', acceso, observaciones, { clase });
      return tramite.id;
    });

    const tramite = await this.exigirTramite(this.dataSource.manager, id);
    await this.avisarA(
      await this.cuentasConAccion('decidir', tramite.clase),
      `${NOMBRE_CLASE[tramite.clase]} por asignar`,
      `${tramite.radicado}: ${acceso.userName} radicó la ${NOMBRE_CLASE[tramite.clase].toLowerCase()} del contrato.`,
      tramite,
    );
    return this.detalle(id, acceso);
  }

  /** Reemplaza o agrega el documento de un requisito mientras el área puede corregir. */
  async subirDocumento(id: string, requisitoId: string, archivo: ArchivoSubido, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const tramite = await this.exigirTramite(em, id, true);
      await this.exigirArea(tramite, acceso);
      if (!['RADICADA', 'DEVUELTA'].includes(tramite.estado)) {
        throw new ConflictException('Los documentos se corrigen antes de la asignación o cuando el trámite vuelve al área');
      }
      const requisito = requisitosPara(await this.requisitos(em), tramite.clase).find((r) => r.id === requisitoId);
      if (!requisito) throw new NotFoundException('Ese documento no se pide en este trámite');

      await this.guardarArchivo(em, tramite.id, 'REQUISITO', requisito.nombre, archivo, acceso, requisito.id);
      await this.evento(em, tramite.id, 'CORREGIR_DOCUMENTO', acceso, null, { documento: requisito.nombre });
    });
    return this.detalle(id, acceso);
  }

  // ------------------------------------------------------- la asignación --

  /**
   * El asignador líder elige al abogado (paso 2 de los dos flujos). Quien
   * asigna queda como la líder: en la liquidación revisa después del abogado y
   * da el primer visto bueno.
   */
  async asignar(id: string, dto: AsignarLiquidacionDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const tramite = await this.exigirTramite(em, id, true);
      await this.exigirAccion(acceso, 'decidir', tramite.clase, `Asigna la ${NOMBRE_CLASE[tramite.clase].toLowerCase()} el asignador líder`);
      if (tramite.estado !== 'RADICADA') throw new ConflictException('El trámite ya fue asignado');
      if (dto.abogadoId === acceso.userId && tramite.clase === 'LIQUIDACION') {
        throw new BadRequestException('En la liquidación el abogado y la líder que asigna tienen que ser personas distintas');
      }

      const abogado = (await this.candidatos(tramite.clase)).find((c) => c.id === dto.abogadoId);
      if (!abogado) {
        throw new BadRequestException(
          `El abogado tiene que poder revisar la ${NOMBRE_CLASE[tramite.clase].toLowerCase()} («aprobar» en su trámite)`,
        );
      }

      tramite.abogadoId = abogado.id;
      tramite.abogadoNombre = abogado.nombre;
      tramite.liderId = acceso.userId || null;
      tramite.liderNombre = acceso.userName;
      tramite.asignadaAt = new Date();
      tramite.estado = 'EN_REVISION';
      await this.guardar(em, tramite);
      await this.evento(em, tramite.id, 'ASIGNAR', acceso, null, { abogado: abogado.nombre, lider: acceso.userName });
      if (tramite.clase === 'LIQUIDACION') await this.abrir(em, tramite, 'REVISION', acceso);
    });

    await this.avisarPendiente(id);
    return this.detalle(id, acceso);
  }

  /**
   * Devolver al área sin pasar por una cadena: el asignador antes de asignar y,
   * en el cierre, el abogado mientras revisa. En la liquidación las
   * devoluciones de la revisión van por la cadena (`decidir`).
   */
  async devolverAlArea(id: string, dto: DevolverAlAreaDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const tramite = await this.exigirTramite(em, id, true);
      if (tramite.estado === 'RADICADA') {
        await this.exigirAccion(acceso, 'decidir', tramite.clase, 'Antes de asignar, devuelve el asignador líder');
        if (tramite.clase !== 'CIERRE') {
          throw new ConflictException('La liquidación se asigna y la devuelve el abogado en la revisión');
        }
      } else if (tramite.estado === 'EN_REVISION' && tramite.clase === 'CIERRE') {
        if (tramite.abogadoId !== acceso.userId && !esSuperAdmin(acceso)) {
          throw new ForbiddenException('Devuelve el cierre el abogado asignado');
        }
      } else {
        throw new ConflictException('El trámite no está en un punto en que se devuelva al área');
      }

      tramite.estado = 'DEVUELTA';
      await this.guardar(em, tramite);
      await this.evento(em, tramite.id, 'DEVOLVER', acceso, dto.observaciones.trim());
    });

    const tramite = await this.exigirTramite(this.dataSource.manager, id);
    await this.avisarA(
      [tramite.radicadaPorId],
      `${NOMBRE_CLASE[tramite.clase]} devuelta`,
      `${tramite.radicado}: te devolvieron la ${NOMBRE_CLASE[tramite.clase].toLowerCase()} para corregir.`,
      tramite,
    );
    return this.detalle(id, acceso);
  }

  // ---------------------------------------------- las cadenas (liquidación) --

  /** Aprobar o devolver el escalón pendiente de la ronda en curso. */
  async decidir(id: string, dto: DecidirLiquidacionDto, acceso: HiringAccess) {
    const observaciones = dto.observaciones?.trim() || null;
    if (dto.accion === 'DEVOLVER' && !observaciones) throw new BadRequestException('Di qué hay que corregir para devolverla');

    let tras: ReturnType<typeof trasDecidir> | null = null;
    let fase: FaseCadenaLiquidacion | null = null;
    await this.dataSource.transaction(async (em) => {
      const tramite = await this.exigirTramite(em, id, true);
      const ronda = await this.rondaEnCurso(em, id);
      if (!ronda) throw new ConflictException('El trámite no está esperando una decisión');

      const escalon = ronda.escalones.find((e) => e.estado === 'PENDIENTE');
      const motivo = motivoParaNoDecidir(escalon, dto.accion, { usuarioId: acceso.userId, roles: acceso.roles }, tramite);
      if (motivo) throw new ForbiddenException(motivo);

      fase = ronda.fase;
      tras = trasDecidir(ronda.fase, ronda.escalones, dto.accion, { nombre: acceso.userName, usuarioId: acceso.userId }, new Date().toISOString());
      ronda.escalones = tras.escalones;
      ronda.estado = tras.ronda;
      ronda.escalonActual = tras.escalonActual;
      if (tras.ronda !== 'EN_CURSO') ronda.cerradaAt = new Date();
      await em.save(ronda);

      tramite.estado = tras.tramite;
      await this.guardar(em, tramite);
      await this.evento(em, tramite.id, dto.accion, acceso, observaciones, { fase: ronda.fase, escalon: escalon!.nombre }, ronda.id, escalon!.orden);
    });

    const tramite = await this.exigirTramite(this.dataSource.manager, id);
    const t = tras as ReturnType<typeof trasDecidir> | null;
    if (t?.ronda === 'EN_CURSO') await this.avisarPendiente(id);
    else if (t?.tramite === 'DEVUELTA' || t?.tramite === 'EN_FIRMA') {
      await this.avisarA(
        [tramite.radicadaPorId],
        t.tramite === 'EN_FIRMA' ? 'Acta de liquidación lista para firma' : 'Liquidación devuelta',
        `${tramite.radicado}: ${NOMBRE_ESTADO[tramite.estado]}.`,
        tramite,
      );
    } else if (t?.tramite === 'ACTA') {
      await this.avisarA(
        [tramite.abogadoId],
        fase === 'VISTO_BUENO' ? 'Acta devuelta en el visto bueno' : 'Ajusta el acta de liquidación',
        `${tramite.radicado}: ${fase === 'VISTO_BUENO' ? 'el visto bueno devolvió el acta' : 'la revisión quedó aprobada; incorpora los ajustes y envíala al visto bueno'}.`,
        tramite,
      );
    }
    return this.detalle(id, acceso);
  }

  /**
   * El área corrigió lo devuelto.
   *
   * La liquidación vuelve a la revisión desde el primer escalón. El cierre va
   * directo al mismo abogado si ya lo tenía, o al asignador si la devolvió él
   * antes de asignar: repartir otra vez algo que ya tiene abogado no aporta.
   */
  async reenviar(id: string, dto: ReenviarLiquidacionDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const tramite = await this.exigirTramite(em, id, true);
      await this.exigirArea(tramite, acceso);
      if (tramite.estado !== 'DEVUELTA') throw new ConflictException('El trámite no está devuelto al área');

      const faltan = requisitosQueFaltan(
        requisitosPara(await this.requisitos(em), tramite.clase),
        (await this.documentosVigentes(em, id, 'REQUISITO')).map((d) => d.requisitoId ?? ''),
      );
      if (faltan.length) throw new BadRequestException(`Faltan documentos: ${faltan.join(', ')}`);

      tramite.estado = tramite.abogadoId ? 'EN_REVISION' : 'RADICADA';
      await this.guardar(em, tramite);
      await this.evento(em, tramite.id, 'REENVIAR', acceso, dto.observaciones?.trim() || null);
      if (tramite.clase === 'LIQUIDACION' && tramite.abogadoId) await this.abrir(em, tramite, 'REVISION', acceso);
    });

    const tramite = await this.exigirTramite(this.dataSource.manager, id);
    if (tramite.estado === 'RADICADA') {
      await this.avisarA(
        await this.cuentasConAccion('decidir', tramite.clase),
        `${NOMBRE_CLASE[tramite.clase]} por asignar`,
        `${tramite.radicado}: el área corrigió y reenvió la ${NOMBRE_CLASE[tramite.clase].toLowerCase()}.`,
        tramite,
      );
    } else {
      await this.avisarPendiente(id);
    }
    return this.detalle(id, acceso);
  }

  /** El abogado incorpora los ajustes al acta y la manda al visto bueno (pasos 5-7). */
  async enviarActa(id: string, archivo: ArchivoSubido, observaciones: string | null, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const tramite = await this.exigirTramite(em, id, true);
      if (tramite.abogadoId !== acceso.userId && !esSuperAdmin(acceso)) {
        throw new ForbiddenException('El acta la ajusta el abogado asignado');
      }
      if (tramite.estado !== 'ACTA') throw new ConflictException('La liquidación no está en el ajuste del acta');

      await this.guardarArchivo(em, tramite.id, 'ACTA', 'Acta de liquidación para visto bueno', archivo, acceso);
      tramite.estado = 'EN_VISTO_BUENO';
      await this.guardar(em, tramite);
      await this.evento(em, tramite.id, 'ENVIAR_ACTA', acceso, observaciones);
      await this.abrir(em, tramite, 'VISTO_BUENO', acceso);
    });

    await this.avisarPendiente(id);
    return this.detalle(id, acceso);
  }

  // -------------------------------------------------------- la firma --

  /**
   * El área sube el acta firmada (paso 12): la liquidación queda registrada
   * como en la 10.2 —acta vigente, balance congelado, contrato LIQUIDADO— y
   * con las mismas exigencias, la del informe final entre ellas.
   */
  async perfeccionar(
    id: string,
    dto: PerfeccionarLiquidacionDto,
    acta: ArchivoSubido,
    pazYSalvo: ArchivoSubido | null,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const tramite = await this.exigirTramite(em, id, true);
      await this.exigirArea(tramite, acceso);
      if (tramite.estado !== 'EN_FIRMA') throw new ConflictException('El acta todavía no está lista para firma');

      await this.guardarArchivo(em, tramite.id, 'ACTA_FIRMADA', 'Acta de liquidación firmada', acta, acceso);
      if (pazYSalvo) await this.guardarArchivo(em, tramite.id, 'PAZ_Y_SALVO', 'Paz y salvo', pazYSalvo, acceso);

      const registro = await this.liquidacion.registrarActa(
        em,
        tramite.procesoId,
        { tipo: dto.tipo, fechaActa: dto.fechaActa, pazYSalvo: dto.pazYSalvo, observaciones: dto.observaciones },
        acta,
        acta.hash,
        pazYSalvo,
        pazYSalvo?.hash ?? null,
        acceso,
      );

      tramite.estado = 'PERFECCIONADA';
      tramite.tipoActa = dto.tipo;
      tramite.fechaActa = dto.fechaActa;
      tramite.actaLiquidacionId = registro.id;
      tramite.perfeccionadaPor = acceso.userName;
      tramite.perfeccionadaAt = new Date();
      await this.guardar(em, tramite);
      await this.evento(em, tramite.id, 'PERFECCIONAR', acceso, null, {
        tipo: dto.tipo,
        fechaActa: dto.fechaActa,
        saldo: registro.balance?.saldo ?? null,
      });
    });

    const tramite = await this.exigirTramite(this.dataSource.manager, id);
    await this.avisarA(
      [tramite.abogadoId],
      'Publica la liquidación en SECOP',
      `${tramite.radicado}: el área subió el acta firmada; falta cargarla en SECOP II.`,
      tramite,
    );
    return this.detalle(id, acceso);
  }

  /**
   * El abogado carga la liquidación en SECOP II (paso 13). Cuenta también como
   * la publicación del acta que pide el archivo del expediente (10.4), y se le
   * avisa al supervisor.
   */
  async publicar(id: string, dto: EvidenciaSecopDto, archivo: ArchivoSubido, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const tramite = await this.exigirTramite(em, id, true);
      this.exigirAbogado(tramite, acceso, 'La liquidación la carga en SECOP el abogado asignado');
      if (tramite.estado !== 'PERFECCIONADA') throw new ConflictException('El acta todavía no está firmada');
      this.validarFecha(dto.fecha, tramite.fechaActa, 'No se puede publicar antes de la fecha del acta');

      const evidencia = await this.guardarArchivo(em, tramite.id, 'EVIDENCIA_SECOP', 'Evidencia de publicación en SECOP II', archivo, acceso);
      const expediente = await em.findOne(Expediente, { where: { procesoId: tramite.procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente');
      const enExpediente = await em.save(
        em.create(Documento, {
          expedienteId: expediente.id,
          numeral: NUMERAL_LIQUIDACION,
          tipo: 'ADJUNTO',
          nombre: `${tramite.radicado} · evidencia de publicación en SECOP II`,
          archivoUrl: evidencia.archivoUrl,
          archivoNombreOriginal: evidencia.archivoNombreOriginal,
          archivoMimeType: evidencia.archivoMimeType,
          archivoTamano: evidencia.archivoTamano,
          hashSha256: evidencia.hashSha256,
          subidoPor: acceso.userName,
        } as Partial<Documento>),
      );
      if (tramite.actaLiquidacionId) {
        const yaEsta = await em.getRepository(PublicacionActa).findOne({
          where: { actaId: tramite.actaLiquidacionId, destino: 'SECOP_II' },
        });
        if (!yaEsta) {
          await em.save(
            em.create(PublicacionActa, {
              actaId: tramite.actaLiquidacionId,
              destino: 'SECOP_II',
              fechaPublicacion: dto.fecha,
              plazoDiasHabiles: null,
              fechaLimite: null,
              secopNumero: dto.secopNumero?.trim() || null,
              secopUrl: dto.secopUrl?.trim() || null,
              documentoId: enExpediente.id,
              publicadoPor: acceso.userName,
            } as Partial<PublicacionActa>),
          );
        }
      }

      this.anotarSecop(tramite, dto, acceso);
      tramite.estado = 'PUBLICADA';
      await this.guardar(em, tramite);
      await this.evento(em, tramite.id, 'PUBLICAR', acceso, dto.observaciones?.trim() || null, {
        fecha: dto.fecha,
        secopNumero: tramite.secopNumero,
      });
    });

    const tramite = await this.exigirTramite(this.dataSource.manager, id);
    const correo = await this.correoAlSupervisor(tramite, 'liquidación');
    await this.evento(this.dataSource.manager, tramite.id, 'CORREO_SUPERVISOR', acceso, null, correo);
    return this.detalle(id, acceso);
  }

  // ------------------------------------------------------------ el cierre --

  /**
   * El abogado cierra en SECOP II y carga la evidencia (pasos 3 y 4 del
   * cierre): el contrato queda cerrado sin acta de liquidación, con los mismos
   * controles del cierre definitivo sobre los amparos.
   */
  async cerrarEnSecop(id: string, dto: EvidenciaSecopDto, archivo: ArchivoSubido, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const tramite = await this.exigirTramite(em, id, true);
      if (tramite.clase !== 'CIERRE') throw new ConflictException('La liquidación se cierra al publicar el acta');
      this.exigirAbogado(tramite, acceso, 'El cierre en SECOP lo carga el abogado asignado');
      if (tramite.estado !== 'EN_REVISION') throw new ConflictException('El cierre no está en revisión del abogado');
      this.validarFecha(dto.fecha, null, '');

      await this.guardarArchivo(em, tramite.id, 'EVIDENCIA_SECOP', 'Evidencia del cierre en SECOP II', archivo, acceso);
      const registro = await this.cierre.registrarCierre(
        em,
        tramite.procesoId,
        { fechaCierre: dto.fecha, observaciones: dto.observaciones?.trim() || `Cerrado en SECOP II por el trámite ${tramite.radicado}` },
        archivo,
        archivo.hash,
        acceso,
        { exigeLiquidacion: false },
      );

      this.anotarSecop(tramite, dto, acceso);
      tramite.estado = 'CERRADA';
      tramite.cierreContratoId = registro.id;
      await this.guardar(em, tramite);
      await this.evento(em, tramite.id, 'CERRAR_EN_SECOP', acceso, dto.observaciones?.trim() || null, {
        fecha: dto.fecha,
        secopNumero: tramite.secopNumero,
      });
    });

    const tramite = await this.exigirTramite(this.dataSource.manager, id);
    await this.avisarA(
      [tramite.radicadaPorId],
      'Contrato cerrado',
      `${tramite.radicado}: el contrato quedó cerrado en SECOP II.`,
      tramite,
    );
    const correo = await this.correoAlSupervisor(tramite, 'cierre');
    await this.evento(this.dataSource.manager, tramite.id, 'CORREO_SUPERVISOR', acceso, null, correo);
    return this.detalle(id, acceso);
  }

  /** El área ya no lo quiere, antes de la firma o del cierre. */
  async desistir(id: string, dto: DesistirLiquidacionDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const tramite = await this.exigirTramite(em, id, true);
      await this.exigirArea(tramite, acceso);
      if (!SE_PUEDE_DESISTIR.includes(tramite.estado)) {
        throw new ConflictException('Con el acta firmada o el contrato cerrado ya no se desiste: se anula o se revierte');
      }

      await this.cancelarRonda(em, id);
      tramite.estado = 'DESISTIDA';
      tramite.motivoCierre = dto.motivo.trim();
      tramite.cerradaPor = acceso.userName;
      tramite.cerradaAt = new Date();
      await this.guardar(em, tramite);
      // El «no aplica» de la 10.2 lo puso la radicación del cierre: se quita, y
      // con él la etapa 10 vuelve a esperar un trámite.
      if (tramite.clase === 'CIERRE') {
        await em.query(
          `DELETE FROM hiring.proceso_actividades WHERE proceso_id = $1 AND numeral = $2 AND estado = 'NO_APLICA'`,
          [tramite.procesoId, NUMERAL_LIQUIDACION],
        );
      }
      await this.evento(em, tramite.id, 'DESISTIR', acceso, tramite.motivoCierre);
    });
    return this.detalle(id, acceso);
  }

  // ---------------------------------------------------------- las rondas --

  private async abrir(em: EntityManager, tramite: TramiteLiquidacion, fase: FaseCadenaLiquidacion, acceso: HiringAccess) {
    const cadena = await em.getRepository(CadenaLiquidacion).findOne({ where: { fase } });
    if (!cadena?.escalones?.length) {
      throw new ConflictException(`La cadena de ${fase === 'REVISION' ? 'revisión' : 'visto bueno'} de la liquidación no está configurada`);
    }
    await this.cancelarRonda(em, tramite.id);
    const anteriores = await em.getRepository(RondaLiquidacion).count({ where: { tramiteId: tramite.id, fase } });
    return em.save(
      em.create(RondaLiquidacion, {
        tramiteId: tramite.id,
        fase,
        ronda: anteriores + 1,
        estado: 'EN_CURSO',
        escalonActual: 1,
        escalones: abrirRonda(cadena.escalones),
        iniciadaPor: acceso.userName,
      } as Partial<RondaLiquidacion>),
    );
  }

  private rondaEnCurso(em: EntityManager, tramiteId: string) {
    return em
      .getRepository(RondaLiquidacion)
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

  // ------------------------------------------------------- qué puede hacer --

  private async accionesPara(tramite: TramiteLiquidacion, rondas: RondaLiquidacion[], acceso: HiringAccess) {
    const esArea = await this.esArea(tramite, acceso);
    const asigna = esSuperAdmin(acceso) || (await this.puede(acceso, 'decidir', tramite.clase));
    const viva = rondas.find((r) => r.estado === 'EN_CURSO');
    const escalon = viva?.escalones.find((e) => e.estado === 'PENDIENTE');
    const decide = !!escalon && esResponsable(escalon, { usuarioId: acceso.userId, roles: acceso.roles }, tramite);
    const esAbogado = tramite.abogadoId === acceso.userId || esSuperAdmin(acceso);
    const cierre = tramite.clase === 'CIERRE';

    return {
      asignar: asigna && tramite.estado === 'RADICADA',
      devolverAlArea:
        (cierre && asigna && tramite.estado === 'RADICADA') || (cierre && esAbogado && tramite.estado === 'EN_REVISION'),
      decidir: decide ? escalon!.acciones : [],
      escalonPendiente: escalon ? { nombre: escalon.nombre, fase: viva!.fase } : null,
      corregirDocumentos: esArea && ['RADICADA', 'DEVUELTA'].includes(tramite.estado),
      reenviar: esArea && tramite.estado === 'DEVUELTA',
      enviarActa: esAbogado && tramite.estado === 'ACTA',
      perfeccionar: esArea && tramite.estado === 'EN_FIRMA',
      publicar: esAbogado && tramite.estado === 'PERFECCIONADA',
      cerrarEnSecop: cierre && esAbogado && tramite.estado === 'EN_REVISION',
      desistir: esArea && SE_PUEDE_DESISTIR.includes(tramite.estado),
    };
  }

  /** Los trámites que esperan algo de quien mira, para marcarlos en la bandeja. */
  private async pendientesDe(tramites: TramiteLiquidacion[], acceso: HiringAccess) {
    const ids = new Set<string>();
    const vivos = tramites.filter((t) => !ESTADOS_FINALES.includes(t.estado));
    if (!vivos.length) return ids;

    const asigna = {
      LIQUIDACION: esSuperAdmin(acceso) || (await this.puede(acceso, 'decidir', 'LIQUIDACION')),
      CIERRE: esSuperAdmin(acceso) || (await this.puede(acceso, 'decidir', 'CIERRE')),
    };
    const rondas = await this.dataSource.getRepository(RondaLiquidacion).find({
      where: { tramiteId: In(vivos.map((t) => t.id)), estado: 'EN_CURSO' },
    });

    for (const t of vivos) {
      const esArea = t.radicadaPorId === acceso.userId;
      const esAbogado = t.abogadoId === acceso.userId;
      const escalon = rondas.find((r) => r.tramiteId === t.id)?.escalones.find((e) => e.estado === 'PENDIENTE');
      if (
        (asigna[t.clase] && t.estado === 'RADICADA') ||
        (escalon && esResponsable(escalon, { usuarioId: acceso.userId, roles: acceso.roles }, t)) ||
        (esArea && ['DEVUELTA', 'EN_FIRMA'].includes(t.estado)) ||
        (esAbogado && ['ACTA', 'PERFECCIONADA'].includes(t.estado)) ||
        (esAbogado && t.clase === 'CIERRE' && t.estado === 'EN_REVISION')
      ) {
        ids.add(t.id);
      }
    }
    return ids;
  }

  private async puedeRadicar(acceso: HiringAccess, clase: ClaseTramiteLiquidacion, proceso: Proceso) {
    return esSuperAdmin(acceso) || (await this.puede(acceso, 'editar', clase)) || proceso.createdBy === acceso.userName;
  }

  private async esArea(tramite: TramiteLiquidacion, acceso: HiringAccess) {
    if (esSuperAdmin(acceso)) return true;
    if (tramite.radicadaPorId && tramite.radicadaPorId === acceso.userId) return true;
    if (await this.puede(acceso, 'editar', tramite.clase)) return true;
    const proceso = await this.dataSource.getRepository(Proceso).findOne({ where: { id: tramite.procesoId } });
    return proceso?.createdBy === acceso.userName;
  }

  private async exigirArea(tramite: TramiteLiquidacion, acceso: HiringAccess) {
    if (!(await this.esArea(tramite, acceso))) throw new ForbiddenException('Esto lo hace el área que radicó el trámite');
  }

  private exigirAbogado(tramite: TramiteLiquidacion, acceso: HiringAccess, mensaje: string) {
    if (tramite.abogadoId !== acceso.userId && !esSuperAdmin(acceso)) throw new ForbiddenException(mensaje);
  }

  private async exigirVer(tramite: TramiteLiquidacion, acceso: HiringAccess) {
    if (
      esSuperAdmin(acceso) ||
      [tramite.radicadaPorId, tramite.abogadoId, tramite.liderId].includes(acceso.userId) ||
      (await this.puede(acceso, 'ver', tramite.clase)) ||
      (await this.esArea(tramite, acceso))
    ) {
      return;
    }
    throw new ForbiddenException('No tienes acceso a este trámite');
  }

  private async exigirAccion(acceso: HiringAccess, accion: Accion, clase: ClaseTramiteLiquidacion, mensaje: string) {
    if (!esSuperAdmin(acceso) && !(await this.puede(acceso, accion, clase))) throw new ForbiddenException(mensaje);
  }

  private puede(acceso: HiringAccess, accion: Accion, clase: ClaseTramiteLiquidacion) {
    return this.alcance.puedeEn(acceso, accion, TRAMITE_DE_LA_CLASE[clase]);
  }

  // ------------------------------------------------------------- avisos --

  /** Avisa en la campana a quien le toca: el escalón pendiente o, en el cierre, el abogado. */
  private async avisarPendiente(id: string) {
    const tramite = await this.exigirTramite(this.dataSource.manager, id);
    if (tramite.clase === 'CIERRE') {
      if (tramite.estado === 'EN_REVISION') {
        await this.avisarA([tramite.abogadoId], 'Cierre por revisar', `${tramite.radicado}: revisa el cierre y ciérralo en SECOP II.`, tramite);
      }
      return;
    }

    const ronda = await this.dataSource.getRepository(RondaLiquidacion).findOne({ where: { tramiteId: id, estado: 'EN_CURSO' } });
    const escalon = ronda?.escalones.find((e) => e.estado === 'PENDIENTE');
    if (!escalon) return;

    const cuentas =
      escalon.papel === 'ABOGADO'
        ? [tramite.abogadoId]
        : escalon.papel === 'LIDER'
          ? [tramite.liderId]
          : await this.cuentasConRoles(escalon.roles);
    await this.avisarA(
      cuentas,
      ronda!.fase === 'REVISION' ? 'Liquidación por revisar' : 'Liquidación por visto bueno',
      `${tramite.radicado} espera tu decisión: ${escalon.nombre}.`,
      tramite,
    );
  }

  private async avisarA(cuentas: (string | null)[], titulo: string, mensaje: string, tramite: TramiteLiquidacion) {
    const destinos = [...new Set(cuentas.filter((c): c is string => !!c))];
    if (!destinos.length) return;
    try {
      await this.campana.enviar(
        destinos.map((id) => ({
          id_usuario_destinatario: id,
          tipo_notificacion: 'contratacion_liquidacion',
          titulo,
          mensaje,
          prioridad: 'Media' as const,
          datos_adicionales: { tramiteLiquidacionId: tramite.id, procesoId: tramite.procesoId, radicado: tramite.radicado },
        })),
      );
    } catch (error: any) {
      // Un aviso que no sale no deshace el trámite.
      this.logger.warn(`No se pudo avisar de ${tramite.radicado}: ${error.message}`);
    }
  }

  private async cuentasConAccion(accion: Accion, clase: ClaseTramiteLiquidacion): Promise<string[]> {
    const filas = await this.dataSource.query(
      `SELECT DISTINCT ur.id_user::text AS id
         FROM auth.user_roles ur
         JOIN hiring.alcances_permiso a
           ON a.rol_id = ur.id_rol AND a.activo AND a.accion = $1 AND a.tramite = $2
        WHERE COALESCE(ur.is_active, true)`,
      [accion, TRAMITE_DE_LA_CLASE[clase]],
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

  /**
   * El correo al supervisor vigente (el flujo pide verificar si la plataforma
   * le avisa al publicar). No lanza.
   */
  private async correoAlSupervisor(tramite: TramiteLiquidacion, que: 'liquidación' | 'cierre'): Promise<Record<string, unknown>> {
    try {
      const supervision = await this.dataSource.getRepository(SupervisionContrato).findOne({
        where: { contratoId: tramite.contratoId, estado: 'VIGENTE' },
        order: { createdAt: 'DESC' },
      });
      if (!supervision?.email) return { enviado: false, motivo: 'el supervisor vigente no tiene correo' };
      const contrato = await this.dataSource.getRepository(Contrato).findOne({ where: { id: tramite.contratoId } });

      const salio = await this.campana.correoConAdjuntos(
        supervision.email,
        {
          titulo: `${que === 'cierre' ? 'Cierre' : 'Liquidación'} del contrato ${contrato?.numero ?? ''}`.trim(),
          mensaje:
            `Se ${que === 'cierre' ? 'cerró' : 'publicó la liquidación de'} el contrato ${contrato?.numero ?? ''} en SECOP II` +
            (tramite.fechaPublicacion ? ` el ${tramite.fechaPublicacion}` : '') +
            (tramite.secopUrl ? `. Consulta: ${tramite.secopUrl}` : '.'),
        },
        [],
        que === 'cierre' ? 'contratacion_cierre_publicado' : 'contratacion_liquidacion_publicada',
      );
      return { enviado: salio, para: supervision.email };
    } catch (error: any) {
      this.logger.warn(`No se pudo avisar al supervisor de ${tramite.radicado}: ${error.message}`);
      return { enviado: false, motivo: 'ocurrió un error al prepararlo' };
    }
  }

  // ----------------------------------------------------------- auxiliares --

  private requisitos(em: EntityManager) {
    return em.getRepository(DocumentoRequerido).find({
      where: { numeral: NUMERAL_LIQUIDACION, activo: true },
      order: { orden: 'ASC', nombre: 'ASC' },
    });
  }

  /** Deja la 10.2 como «no aplica», salvo que ya esté aprobada. */
  private async marcar102(em: EntityManager, procesoId: string, estado: 'NO_APLICA') {
    const repo = em.getRepository(ProcesoActividad);
    const actividad = await repo.findOne({ where: { procesoId, numeral: NUMERAL_LIQUIDACION } });
    if (!actividad) {
      await repo.save(repo.create({ procesoId, numeral: NUMERAL_LIQUIDACION, estado: estado as any, datos: {} }));
      return;
    }
    if (actividad.estado === 'APROBADO') return;
    actividad.estado = estado as any;
    await repo.save(actividad);
  }

  private anotarSecop(tramite: TramiteLiquidacion, dto: EvidenciaSecopDto, acceso: HiringAccess) {
    tramite.fechaPublicacion = dto.fecha;
    tramite.secopNumero = dto.secopNumero?.trim() || null;
    tramite.secopUrl = dto.secopUrl?.trim() || null;
    tramite.publicadaPor = acceso.userName;
    tramite.publicadaAt = new Date();
  }

  private validarFecha(fecha: string, minima: string | null, mensajeMinima: string) {
    if (fecha > this.hoy()) throw new BadRequestException('La fecha no puede ser futura: es la de un hecho ya ocurrido');
    if (minima && fecha < minima) throw new BadRequestException(mensajeMinima);
  }

  private async contratoDelProceso(em: EntityManager, procesoId: string, bloquear = false) {
    const consulta = em
      .getRepository(Contrato)
      .createQueryBuilder('c')
      .where('c.proceso_id = :procesoId', { procesoId })
      .andWhere("c.estado <> 'RECHAZADO'");
    if (bloquear) consulta.setLock('pessimistic_write');
    return consulta.getOne();
  }

  private tramiteVivo(em: EntityManager, contratoId: string) {
    return em
      .getRepository(TramiteLiquidacion)
      .createQueryBuilder('t')
      .where('t.contrato_id = :contratoId', { contratoId })
      .andWhere("t.estado <> 'DESISTIDA'")
      .getOne();
  }

  private resumen(t: TramiteLiquidacion) {
    return {
      id: t.id,
      radicado: t.radicado,
      clase: t.clase,
      claseNombre: NOMBRE_CLASE[t.clase],
      procesoId: t.procesoId,
      contratoId: t.contratoId,
      estado: t.estado,
      estadoNombre: NOMBRE_ESTADO[t.estado],
      abogadoNombre: t.abogadoNombre,
      liderNombre: t.liderNombre,
      fechaPublicacion: t.fechaPublicacion,
      secopNumero: t.secopNumero,
      secopUrl: t.secopUrl,
      motivoCierre: t.motivoCierre,
      radicadaPor: t.radicadaPor,
      radicadaAt: t.radicadaAt,
      updatedAt: t.updatedAt,
    };
  }

  private verDocumento(d: DocumentoTramiteLiquidacion) {
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

  private documentosVigentes(em: EntityManager, tramiteId: string, clase: ClaseDocumentoLiquidacion) {
    return em.getRepository(DocumentoTramiteLiquidacion).find({ where: { tramiteId, clase, vigente: true } });
  }

  /** Guarda un archivo del trámite; si reemplaza otro del mismo requisito o clase, sube la versión. */
  private async guardarArchivo(
    em: EntityManager,
    tramiteId: string,
    clase: ClaseDocumentoLiquidacion,
    nombre: string,
    archivo: ArchivoSubido,
    acceso: HiringAccess,
    requisitoId: string | null = null,
  ) {
    const repo = em.getRepository(DocumentoTramiteLiquidacion);
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
      em.create(EventoTramiteLiquidacion, {
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

  private guardar(em: EntityManager, tramite: TramiteLiquidacion) {
    tramite.updatedAt = new Date();
    return em.save(tramite);
  }

  private async exigirTramite(em: EntityManager, id: string, bloquear = false) {
    const consulta = em.getRepository(TramiteLiquidacion).createQueryBuilder('t').where('t.id = :id', { id });
    if (bloquear) consulta.setLock('pessimistic_write');
    const tramite = await consulta.getOne();
    if (!tramite) throw new NotFoundException('El trámite no existe');
    return tramite;
  }

  private hoy() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }
}
