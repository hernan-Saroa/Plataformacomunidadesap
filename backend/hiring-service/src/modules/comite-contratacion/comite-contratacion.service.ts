import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';

import { EstadoProceso, Proceso } from '../../entities/proceso.entity';
import { Expediente } from '../../entities/expediente.entity';
import { Documento } from '../../entities/documento.entity';
import { Smmlv } from '../../entities/smmlv.entity';
import {
  DecisionComite,
  SesionComiteContratacion,
  UmbralComiteContratacion,
} from '../../entities/comite-contratacion.entity';
import { EstadoActividad, ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Revision } from '../../entities/revision.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { ParticipacionService } from '../participacion/participacion.service';
import { CdpService } from '../cdp/cdp.service';
import {
  NUMERALES_REABRIBLES_POR_COMITE,
  RegistrarSesionComiteDto,
} from './dto/comite-contratacion.dto';
import { CierreActividadService } from '../cierre-actividad/cierre-actividad.service';
import { FirmaOtpDto } from '../cierre-actividad/dto/firma-otp.dto';

/** Actividad 3.7 de la matriz —su 3.6—: el comité de contratación. */
export const NUMERAL_COMITE_CONTRATACION = '3.7';

/** Etapa en la que sesiona. */
export const ETAPA_COMITE = 3;

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/** Por qué el proceso no pasa por comité. */
export type MotivoNoVa = 'MODALIDAD' | 'NO_SUPERA_EL_UMBRAL';

/**
 * El «Va o No» de la matriz, que no es una decisión del comité sino la
 * condición que lo convoca.
 *
 * Dos filtros encadenados:
 *
 * - La **modalidad**, que ya resolvió la matriz al instanciar el proceso: en
 *   menor cuantía, mínima cuantía y enajenación por subasta la actividad nace
 *   en NO_APLICA y no hay nada que preguntar.
 * - La **cuantía**, que la matriz no puede expresar porque su celda es por
 *   modalidad y esto depende del valor de cada proceso: en contratación directa
 *   el comité solo conoce los que superan 1.000 SMMLV (RF-DOC-05).
 *
 * Sin umbral configurado para la modalidad, va siempre. Y con umbral pero sin
 * con qué comparar —un proceso sin valor estimado, o un año sin SMMLV cargado—
 * **también va**: equivocarse llevando al comité algo que no lo necesitaba
 * cuesta una revisión de más; equivocarse al revés salta un control.
 *
 * Función pura para poder fijar la regla sin base de datos.
 */
export function motivoParaNoIrAlComite(
  estadoActividad: EstadoActividad,
  valorEstimado: number | null,
  umbralEnPesos: number | null,
): MotivoNoVa | null {
  if (estadoActividad === 'NO_APLICA') return 'MODALIDAD';
  if (umbralEnPesos === null || valorEstimado === null) return null;
  return valorEstimado > umbralEnPesos ? null : 'NO_SUPERA_EL_UMBRAL';
}

/**
 * En qué queda la actividad según lo que el comité decidió.
 *
 * Aprobar cierra, y aprobar con condiciones también: la aprobación condicionada
 * es una aprobación —el proceso sigue— con una carga que queda en el
 * expediente. Tratarla como un no lo detendría sin que el comité lo hubiera
 * detenido.
 *
 * Observar devuelve. Es el desenlace que el registro de constancia no sabía
 * representar: cerraba en APROBADO pasara lo que pasara, así que un proceso
 * observado por el comité seguía su camino como si lo hubieran avalado.
 *
 * Rechazar niega, y NEGADO no es DEVUELTO por lo mismo que en la 3.4: devuelta,
 * la actividad se corrige y se reenvía; negada, no se toca más. Con un solo
 * estado el riel le ofrecería al abogado volver a llevar a comité un proceso
 * que el comité ya decidió que no sale al mercado.
 */
export function estadoTrasLaSesion(decision: DecisionComite): EstadoActividad {
  if (decision === 'OBSERVADO') return 'DEVUELTO';
  if (decision === 'RECHAZADO') return 'NEGADO';
  return 'APROBADO';
}

/**
 * Si la sesión termina el proceso, y con qué desenlace.
 *
 * Solo rechazar, y por la misma razón que negar el estudio previo: dejar el
 * proceso EN_CURSO con su comité rechazado haría que el listado y las
 * estadísticas contaran como vivo un expediente que nadie va a volver a tocar.
 *
 * Observar no lo termina: ahí el proceso sigue, corrige y vuelve a comité.
 */
export function desenlaceTrasLaSesion(decision: DecisionComite): EstadoProceso | null {
  return decision === 'RECHAZADO' ? 'NEGADO' : null;
}

/**
 * Si la sesión cierra la actividad, sea aprobando o rechazando.
 *
 * Lo que decide si se pide la firma y si hay etapa que pueda cerrar, que no es
 * lo mismo: aprobar cierra la actividad **y** la etapa; rechazar cierra la
 * actividad y termina el proceso, así que no hay CDP que radicar.
 */
export function laSesionCierra(decision: DecisionComite): boolean {
  return decision !== 'OBSERVADO';
}

/**
 * Si esta sesión tiene que decir qué objetó el comité.
 *
 * Observar y rechazar siempre: la primera para que haya qué corregir, la
 * segunda porque a quien le rechazan un proceso no le queda ocasión de
 * preguntar por qué. Y aprobar solo cuando además reabre algo, que si no le
 * llegaría a su responsable una actividad devuelta sin decir qué validar.
 *
 * Función pura para poder fijar la regla sin base de datos.
 */
export function exigeObservaciones(decision: DecisionComite, reabreAlguna: boolean): boolean {
  return decision === 'OBSERVADO' || decision === 'RECHAZADO' || reabreAlguna;
}

/**
 * Si la sesión puede reabrir actividades anteriores.
 *
 * Todas menos el rechazo. Un proceso rechazado queda negado, y una actividad
 * devuelta dentro de un expediente muerto es trabajo que se le pide a alguien
 * para nada: si lo que procede es corregir, el desenlace era observar.
 */
export function laSesionAdmiteReabrir(decision: DecisionComite): boolean {
  return decision !== 'RECHAZADO';
}

/**
 * El comité de contratación — actividad 3.7, la 3.6 de la matriz (RF-DOC-05).
 *
 * La matriz no la describe como un trámite del que solo llega un papel, sino
 * como tres decisiones: «Va o No / observa o no / aprueba o no». Mientras se
 * cumplió con el registro de constancia, el expediente no podía decir si el
 * comité aprobó, si aprobó con condiciones —ni cuáles— o si devolvió los
 * documentos; y como el registro cerraba la actividad pasara lo que pasara, un
 * proceso observado avanzaba como si lo hubieran avalado.
 *
 * El «aprueba o no» son cuatro desenlaces y no tres. Al lado de la observación
 * —que devuelve para corregir— está el **rechazo**, que es el comité diciendo
 * que el proceso no sale al mercado: niega la actividad y termina el proceso,
 * como negar el estudio previo en la 3.4. Y cualquiera de los cuatro puede
 * **reabrir** actividades anteriores ya cerradas, para corregirlas cuando el
 * comité observa o para que se las validen cuando aprueba.
 *
 * El comité sesiona en la Dirección de Contratación y es un cuerpo colegiado:
 * la plataforma no lo reemplaza, transcribe lo que decidió y guarda el acta.
 * Quien transcribe es el abogado que lleva el proceso, como en la 3.4, la 3.5 y
 * la 3.6 —antes bastaba con `actividad.edit`, que también tiene el área
 * solicitante: la que lleva sus documentos al comité no puede ser la que
 * certifica qué dijo el comité—.
 */
@Injectable()
export class ComiteContratacionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly participacion: ParticipacionService,
    private readonly cdp: CdpService,
    private readonly cierre: CierreActividadService,
  ) {}

  /** Aparte para poder fijar el año en las pruebas. */
  protected hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, acceso: HiringAccess) {
    const em = this.dataSource.manager;
    const proceso = await this.exigirProceso(em, procesoId);

    const actividad = await this.actividad(em, procesoId);
    const estadoActual = actividad?.estado ?? 'BORRADOR';

    const { umbral, enPesos, smmlv } = await this.umbralDe(em, proceso.modalidad);
    const noVa = motivoParaNoIrAlComite(estadoActual, proceso.valorEstimado, enPesos);

    const sesiones = await em.getRepository(SesionComiteContratacion).find({
      where: { procesoId },
      order: { fecha: 'DESC', createdAt: 'DESC' },
    });
    const { abogado, motivo } = await this.participacion.quienDecide(procesoId, acceso, NUMERAL_COMITE_CONTRATACION);

    // Cerrada por una sesión que aprobó o que rechazó: no se registra otra.
    // Reabrir una aprobación reescribiría una etapa que pudo cerrar y radicar
    // el CDP, y reabrir un rechazo resucitaría un proceso ya negado.
    const yaSePronuncio = estadoActual === 'APROBADO' || estadoActual === 'NEGADO';

    // Qué actividades anteriores podría reabrir esta sesión. Se calculan aquí
    // y no se dan por hechas en la pantalla: la lista fija de cuatro numerales
    // dice cuáles son reabribles *en general*, pero solo están APROBADO las
    // que este proceso en concreto ya cerró, y ofrecer las demás sería ofrecer
    // un botón que el servicio va a rechazar.
    const reabribles = await this.reabribles(em, procesoId);

    return {
      /** Si la matriz marca el comité en la modalidad del proceso. */
      aplica: noVa !== 'MODALIDAD',
      /** Si además de aplicar, este proceso en concreto tiene que ir. */
      va: noVa === null,
      motivoNoVa: noVa,
      estado: estadoActual,
      valorEstimado: proceso.valorEstimado,
      /**
       * La condición de cuantía de la modalidad, ya resuelta a pesos.
       *
       * Viaja entera —cifra, unidad, fundamento y si está confirmada— porque un
       * «no pasa por comité» sin decir contra qué se comparó es una decisión
       * que nadie puede revisar.
       */
      umbral: umbral
        ? {
            valor: umbral.valor,
            unidad: umbral.unidad,
            enPesos,
            fundamento: umbral.fundamento,
            confirmado: umbral.confirmado,
            smmlvAplicado: smmlv,
          }
        : null,
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
      /**
       * Qué actividades anteriores puede reabrir esta sesión, ya filtradas por
       * las que este proceso tiene cerradas.
       */
      reabribles,
      /** A quien mira le toca transcribir lo que el comité decidió. */
      puedeRegistrar: noVa === null && motivo === null && !yaSePronuncio,
      /** Y, cuando no va, dejar constancia de por qué no fue. */
      puedeDejarConstancia:
        noVa === 'NO_SUPERA_EL_UMBRAL' &&
        motivo === null &&
        estadoActual !== 'NO_APLICA' &&
        !yaSePronuncio,
      motivoNoDecide: motivo,
      abogado: abogado
        ? { nombre: abogado.nombre, usuarioNombre: abogado.usuarioNombre }
        : null,
    };
  }

  // ----------------------------------------------------------- el abogado --

  /**
   * Transcribe una sesión del comité.
   *
   * Aprobar —con o sin condiciones— cierra la actividad, y con ella puede
   * cerrarse la etapa 3: en licitación y en las demás modalidades que pasan por
   * comité, esta es la última que aplica. Observar la devuelve, y entonces no
   * se pregunta por el CDP porque no cerró nada. Rechazar la niega y con ella
   * el proceso, y tampoco hay etapa que celebrar: lo que terminó no es la
   * etapa, es la contratación.
   *
   * Los cuatro desenlaces pueden traer actividades que reabrir. Al observar es
   * obligatorio —una devolución sin nada editable donde aplicarla no sirve de
   * nada—; al aprobar es opcional, y es el comité pidiendo que le validen un
   * punto sin frenar el proceso. Al rechazar no se admite ninguna: no se
   * reabre para corregir un expediente que acaba de quedar negado.
   */
  async registrar(
    procesoId: string,
    dto: RegistrarSesionComiteDto,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.exigirQueLeToque(procesoId, acceso);

    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId, true);

      if (proceso.estado !== 'EN_CURSO') {
        throw new ConflictException(
          'El proceso ya no está en curso: lo que terminó no es la etapa, es la contratación',
        );
      }

      const actividad = await this.actividad(em, procesoId, true);
      const estadoActual = actividad?.estado ?? 'BORRADOR';

      const { enPesos } = await this.umbralDe(em, proceso.modalidad);
      const noVa = motivoParaNoIrAlComite(estadoActual, proceso.valorEstimado, enPesos);

      if (noVa === 'MODALIDAD') {
        throw new ConflictException(
          'La matriz no lleva esta modalidad al comité de contratación',
        );
      }
      if (noVa === 'NO_SUPERA_EL_UMBRAL') {
        throw new ConflictException(
          'Este proceso no supera el umbral de cuantía que lo llevaría al comité: deja constancia de que no pasó por él',
        );
      }
      if (estadoActual === 'APROBADO') {
        throw new ConflictException(
          'El comité ya aprobó este proceso: registrar otra sesión reescribiría una etapa que pudo cerrarse',
        );
      }
      if (estadoActual === 'NEGADO') {
        throw new ConflictException(
          'El comité ya rechazó este proceso: lo que terminó no es la etapa, es la contratación',
        );
      }

      // La fecha de la sesión, no la de la transcripción: puede ser anterior,
      // nunca futura. Un comité no sesiona mañana.
      if (dto.fecha > this.hoy()) {
        throw new BadRequestException('La sesión del comité no puede ser posterior a hoy');
      }

      const condiciones = dto.condiciones?.trim() || null;
      const observaciones = dto.observaciones?.trim() || null;
      // Sin duplicados y en el orden de la matriz, que es como se leen después
      // en la traza y en el expediente.
      const numerales = NUMERALES_REABRIBLES_POR_COMITE.filter((n) =>
        (dto.numeralesReabrir ?? []).includes(n),
      );

      // Lo que hace legible cada desenlace. La base tiene los mismos CHECK; el
      // mensaje está aquí porque un error de restricción no le dice a nadie qué
      // le falta al formulario.
      if (dto.decision === 'APROBADO_CON_CONDICIONES' && !condiciones) {
        throw new BadRequestException(
          'Di a qué queda condicionada la aprobación: sin condiciones, es una aprobación a secas',
        );
      }
      if (exigeObservaciones(dto.decision, numerales.length > 0) && !observaciones) {
        throw new BadRequestException(
          dto.decision === 'RECHAZADO'
            ? 'Escribe por qué el comité rechaza el proceso: a quien se lo rechazan no le queda ocasión de preguntarlo corrigiendo'
            : dto.decision === 'OBSERVADO'
              ? 'Escribe las observaciones de fondo: sin ellas el proceso queda devuelto sin saber qué corregir'
              : 'Escribe qué hay que validar: la actividad que reabres le llega a su responsable sin decirle qué mirar',
        );
      }
      // Qué actividades se reabren (EFDS-2068). Sin esto, observar devolvía la
      // 3.7 pero la 3.1 y las demás seguían APROBADO: la corrección que pidió
      // el comité no tenía dónde aplicarse.
      if (dto.decision === 'OBSERVADO' && numerales.length === 0) {
        throw new BadRequestException(
          'Di a qué actividades vuelve el proceso: sin eso la corrección no tiene dónde aplicarse',
        );
      }
      // Y al rechazar no se reabre nada: el proceso queda negado, y una
      // actividad devuelta dentro de un expediente muerto es trabajo que se le
      // pide a alguien para nada.
      if (!laSesionAdmiteReabrir(dto.decision) && numerales.length > 0) {
        throw new BadRequestException(
          'Un proceso rechazado no deja actividades que corregir: si lo que procede es devolver para corregir, el desenlace es observar',
        );
      }

      // Solo cuando la sesión cierra la actividad: observar no la cierra, y
      // no exige la firma de quien responde por lo que quedó cerrado. Rechazar
      // sí la exige: niega el proceso, y eso lo firma quien lo transcribe.
      if (
        laSesionCierra(dto.decision) &&
        (await this.cierre.exigeFirma(em, NUMERAL_COMITE_CONTRATACION))
      ) {
        this.cierre.exigirFirmaValida(dto.firma);
      }

      const acta = await this.guardarActa(em, procesoId, archivo, hash, acceso);

      const sesion = await em.save(
        em.create(SesionComiteContratacion, {
          procesoId,
          fecha: dto.fecha,
          decision: dto.decision,
          // Cada desenlace guarda lo suyo y nada más: unas condiciones colgadas
          // de una devolución no se sabría después si el comité las impuso o
          // alguien las escribió por error en el campo de al lado.
          condiciones: dto.decision === 'APROBADO_CON_CONDICIONES' ? condiciones : null,
          // Observar y rechazar son las dos formas de objetar, y las dos
          // guardan aquí lo que el comité dijo; una aprobación solo lo guarda
          // cuando reabrió algo, que es lo que esa actividad tendrá que
          // validar.
          observaciones: exigeObservaciones(dto.decision, numerales.length > 0)
            ? observaciones
            : null,
          actaDocumentoId: acta.id,
          registradoPor: acceso.userName,
          registradoPorId: acceso.userId ?? null,
        } as Partial<SesionComiteContratacion>),
      );

      const estado = estadoTrasLaSesion(dto.decision);
      await this.marcar(
        em,
        procesoId,
        estado,
        acceso,
        laSesionCierra(dto.decision) ? dto.firma : undefined,
      );

      // La decisión sobre la 3.7 no reabre por sí sola lo que el comité
      // señaló: sin esto, corregir «lo que hay que cambiar» —o validar lo que
      // pidió validar— no tenía ninguna actividad editable donde hacerse.
      for (const numeral of numerales) {
        await this.reabrirActividad(em, procesoId, numeral, observaciones!, acceso);
      }

      await this.traza(
        em,
        procesoId,
        sesion.id,
        dto.decision === 'OBSERVADO'
          ? 'DEVOLVER'
          : dto.decision === 'RECHAZADO'
            ? 'RECHAZAR'
            : 'APROBAR',
        acceso,
        {
          actividad: NUMERAL_COMITE_CONTRATACION,
          decision: dto.decision,
          fecha: dto.fecha,
          condiciones,
          observaciones,
          reabiertas: numerales,
        },
      );

      // El proceso termina con la actividad cuando el comité la rechaza.
      const desenlace = desenlaceTrasLaSesion(dto.decision);
      if (desenlace) {
        await em.update(Proceso, { id: procesoId }, { estado: desenlace });
      }

      // Aprobar cierra la actividad, y con ella la etapa 3 en las modalidades
      // que pasan por comité: la solicitud de CDP nace ahí. Observar no cierra
      // nada y rechazar cierra el proceso entero, así que ninguno de los dos
      // pregunta.
      if (estado === 'APROBADO') {
        await this.cdp.crearSolicitudSiCerroLaEtapa3(em, procesoId, acceso);
      }
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Deja constancia de que el proceso no pasó por comité.
   *
   * Solo cuando la cuantía dice que no: si el proceso supera el umbral, saltarse
   * el comité no es una constancia, es omitir un control. Por eso no hay un «no
   * va» a discreción —el «Va o No» de la matriz lo resuelve la regla— y lo que
   * el abogado hace aquí es dar fe de que la regla se aplicó a este expediente.
   *
   * La actividad queda en NO_APLICA, que es lo que ya usan las modalidades que
   * no pasan por comité: no es trabajo pendiente, es trabajo que no hubo. Y como
   * NO_APLICA cuenta como cerrada, la etapa 3 puede cerrar y radicar el CDP.
   */
  async noVaAlComite(procesoId: string, acceso: HiringAccess) {
    await this.exigirQueLeToque(procesoId, acceso);

    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId, true);

      if (proceso.estado !== 'EN_CURSO') {
        throw new ConflictException('El proceso ya no está en curso');
      }

      const actividad = await this.actividad(em, procesoId, true);
      const estadoActual = actividad?.estado ?? 'BORRADOR';

      if (estadoActual === 'NO_APLICA') {
        throw new ConflictException('Ya está constando que este proceso no pasa por comité');
      }
      if (estadoActual === 'APROBADO' || estadoActual === 'NEGADO') {
        throw new ConflictException(
          'El comité ya se pronunció sobre este proceso: no puede constar que no fue',
        );
      }

      const { umbral, enPesos } = await this.umbralDe(em, proceso.modalidad);
      const noVa = motivoParaNoIrAlComite(estadoActual, proceso.valorEstimado, enPesos);

      if (noVa !== 'NO_SUPERA_EL_UMBRAL') {
        throw new ConflictException(
          noVa === 'MODALIDAD'
            ? 'Esta modalidad ya no pasa por comité según la matriz: no hay constancia que dejar'
            : 'Este proceso sí pasa por comité: registra lo que decidió, no que no fue',
        );
      }

      await this.marcar(em, procesoId, 'NO_APLICA', acceso);

      // Con qué se comparó, congelado en la traza: el umbral y el salario
      // cambian, y dentro de dos años esta constancia tiene que seguir
      // explicándose sola.
      await this.traza(em, procesoId, null, 'GUARDAR', acceso, {
        actividad: NUMERAL_COMITE_CONTRATACION,
        noVaAlComite: true,
        valorEstimado: proceso.valorEstimado,
        umbral: umbral ? { valor: umbral.valor, unidad: umbral.unidad, enPesos } : null,
      });

      await this.cdp.crearSolicitudSiCerroLaEtapa3(em, procesoId, acceso);
    });

    return this.estado(procesoId, acceso);
  }

  // ---------------------------------------------------------- auxiliares ---

  /**
   * El umbral de la modalidad, ya resuelto a pesos.
   *
   * Sin SMMLV del año no se convierte y devuelve `null`, que `motivoParaNoIr`
   * lee como «va a comité»: un umbral que no se puede comparar no puede excluir
   * a nadie. Devolver el salario aplicado permite que la pantalla lo diga.
   */
  private async umbralDe(em: EntityManager, modalidad: string | null) {
    if (!modalidad) return { umbral: null, enPesos: null, smmlv: null };

    const umbral = await em
      .getRepository(UmbralComiteContratacion)
      .findOne({ where: { modalidad } });
    if (!umbral) return { umbral: null, enPesos: null, smmlv: null };

    if (umbral.unidad === 'PESOS') {
      return { umbral, enPesos: umbral.valor, smmlv: null };
    }

    const anio = Number(this.hoy().slice(0, 4));
    const salario = await em.getRepository(Smmlv).findOne({ where: { anio } });
    const smmlv = salario
      ? { anio: salario.anio, valor: salario.valor, confirmado: salario.confirmado }
      : null;

    return {
      umbral,
      enPesos: salario ? umbral.valor * salario.valor : null,
      smmlv,
    };
  }

  /** Lo transcribe el abogado del proceso, como el resto de la etapa 3. */
  private async exigirQueLeToque(procesoId: string, acceso: HiringAccess) {
    const { abogado, motivo } = await this.participacion.quienDecide(procesoId, acceso, NUMERAL_COMITE_CONTRATACION);

    if (motivo === 'SIN_ABOGADO') {
      throw new ConflictException(
        'Este proceso todavía no tiene abogado asignado: se reparte en la actividad 3.3',
      );
    }
    if (motivo === 'NO_ES_TUYO') {
      throw new ForbiddenException(
        `Este proceso lo lleva ${abogado!.nombre}: lo que decidió el comité lo transcribe el abogado al que se le asignó`,
      );
    }
    if (motivo === 'SIN_PERMISO') {
      throw new ForbiddenException('No tienes permiso para resolver actividades del proceso');
    }
  }

  private async guardarActa(
    em: EntityManager,
    procesoId: string,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    const expediente = await em.findOne(Expediente, { where: { procesoId } });
    if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

    return em.save(
      em.create(Documento, {
        expedienteId: expediente.id,
        numeral: NUMERAL_COMITE_CONTRATACION,
        tipo: 'ADJUNTO',
        nombre: 'Acta del comité de contratación',
        archivoUrl: `hiring/files/${archivo.filename}`,
        archivoNombreOriginal: archivo.originalname,
        archivoMimeType: archivo.mimetype,
        archivoTamano: archivo.size,
        hashSha256: hash,
        subidoPor: acceso.userName,
      } as Partial<Documento>),
    );
  }

  private async exigirProceso(em: EntityManager, procesoId: string, bloquear = false) {
    const consulta = em
      .getRepository(Proceso)
      .createQueryBuilder('p')
      .where('p.id = :procesoId', { procesoId });

    if (bloquear) consulta.setLock('pessimistic_write');

    const proceso = await consulta.getOne();
    if (!proceso) throw new NotFoundException('El proceso no existe');
    return proceso;
  }

  private async actividad(em: EntityManager, procesoId: string, bloquear = false) {
    const consulta = em
      .getRepository(ProcesoActividad)
      .createQueryBuilder('a')
      .where('a.proceso_id = :procesoId AND a.numeral = :numeral', {
        procesoId,
        numeral: NUMERAL_COMITE_CONTRATACION,
      });

    if (bloquear) consulta.setLock('pessimistic_write');

    return consulta.getOne();
  }

  /**
   * Deja la actividad en el estado que corresponda a lo que pasó.
   *
   * Quien transcribe queda como revisor solo cuando la sesión cierra —aprobando
   * o rechazando, que las dos concluyen la revisión—: una devolución del comité
   * deja la actividad abierta, y sellar ahí a quien la escribió diría que él la
   * revisó.
   */
  private async marcar(
    em: EntityManager,
    procesoId: string,
    estado: EstadoActividad,
    acceso: HiringAccess,
    firma?: FirmaOtpDto,
  ) {
    const cierra = estado === 'APROBADO' || estado === 'NEGADO';
    const actividad = await em
      .getRepository(ProcesoActividad)
      .findOne({ where: { procesoId, numeral: NUMERAL_COMITE_CONTRATACION } });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_COMITE_CONTRATACION,
          estado,
          datos: firma ? { firma } : {},
          enviadoPor: acceso.userName,
          enviadoPorId: acceso.userId ?? null,
          ...(cierra ? { revisadoPor: acceso.userName, revisadoAt: new Date() } : {}),
        } as Partial<ProcesoActividad>),
      );
      return;
    }

    actividad.estado = estado;
    actividad.enviadoPor = acceso.userName;
    actividad.enviadoPorId = acceso.userId ?? null;
    actividad.revisadoPor = cierra ? acceso.userName : (null as any);
    actividad.revisadoAt = cierra ? new Date() : (null as any);
    if (firma) {
      actividad.datos = { ...(actividad.datos ?? {}), firma };
    }
    await em.save(ProcesoActividad, actividad);
  }

  /**
   * Qué actividades anteriores tiene este proceso en condiciones de reabrirse.
   *
   * Las cuatro reabribles de la matriz, filtradas por las que este expediente
   * ya cerró: el comité no puede reabrir lo que todavía está en curso, y
   * ofrecerlo en la pantalla sería ofrecer algo que `reabrirActividad` va a
   * rechazar cuando lo marquen.
   */
  private async reabribles(em: EntityManager, procesoId: string): Promise<string[]> {
    const cerradas = await em.getRepository(ProcesoActividad).find({
      where: {
        procesoId,
        numeral: In([...NUMERALES_REABRIBLES_POR_COMITE]),
        estado: 'APROBADO',
      },
    });

    // En el orden de la matriz, no en el que los devuelva la consulta: es el
    // orden en que se leen en la pantalla y en la traza.
    return NUMERALES_REABRIBLES_POR_COMITE.filter((n) =>
      cerradas.some((a) => a.numeral === n),
    );
  }

  /**
   * Reabre una actividad anterior ya cerrada (EFDS-2068).
   *
   * `proceso_actividades` y `revisiones` son las mismas tablas que ya usan el
   * estudio previo y la aprobación configurable: no hace falta un mecanismo
   * nuevo por actividad, solo escribir en el sitio que cada pantalla ya lee.
   * Al numeral se le exige estar APROBADO —si sigue en curso o ya fue devuelto
   * por otro camino, no es el comité quien tiene algo que reabrir ahí—.
   *
   * Lo mismo sirve para corregir y para validar: en los dos casos la actividad
   * vuelve a manos de quien la trabajó con un texto que dice qué mirar, y lo
   * que cambia es si la 3.7 quedó devuelta o aprobada al lado.
   */
  private async reabrirActividad(
    em: EntityManager,
    procesoId: string,
    numeral: string,
    observaciones: string,
    acceso: HiringAccess,
  ) {
    const actividad = await em
      .getRepository(ProcesoActividad)
      .findOne({ where: { procesoId, numeral } });

    if (!actividad) {
      throw new NotFoundException(`El proceso no tiene la actividad ${numeral} para devolver`);
    }
    if (actividad.estado !== 'APROBADO') {
      throw new ConflictException(
        `La actividad ${numeral} no está aprobada: no hay nada ahí que el comité pueda devolver`,
      );
    }

    actividad.estado = 'DEVUELTO';
    actividad.revisadoPor = acceso.userName;
    actividad.revisadoAt = new Date();
    await em.save(ProcesoActividad, actividad);

    await em.save(
      em.create(Revision, {
        procesoActividadId: actividad.id,
        decision: 'DEVUELTO',
        observaciones,
        versionRevisada: actividad.version,
        revisadoPor: acceso.userName,
        revisadoPorId: acceso.userId,
      } as Partial<Revision>),
    );

    await this.traza(em, procesoId, actividad.id, 'DEVOLVER', acceso, {
      numeral,
      observaciones,
      origen: 'comite_contratacion',
    });
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
