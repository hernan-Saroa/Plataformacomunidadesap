import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { Proceso } from '../../entities/proceso.entity';
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
import { HiringAccess } from '../../auth/hiring-access';
import { ParticipacionService } from '../participacion/participacion.service';
import { CdpService } from '../cdp/cdp.service';
import { RegistrarSesionComiteDto } from './dto/comite-contratacion.dto';

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
 */
export function estadoTrasLaSesion(decision: DecisionComite): EstadoActividad {
  return decision === 'OBSERVADO' ? 'DEVUELTO' : 'APROBADO';
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
    const { abogado, motivo } = await this.participacion.quienDecide(procesoId, acceso);

    // Cerrada por una sesión que aprobó: no se registra otra. Reabrirla
    // reescribiría una etapa que pudo cerrar y radicar el CDP.
    const yaAprobo = estadoActual === 'APROBADO';

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
      /** A quien mira le toca transcribir lo que el comité decidió. */
      puedeRegistrar: noVa === null && motivo === null && !yaAprobo,
      /** Y, cuando no va, dejar constancia de por qué no fue. */
      puedeDejarConstancia:
        noVa === 'NO_SUPERA_EL_UMBRAL' && motivo === null && estadoActual !== 'NO_APLICA',
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
   * se pregunta por el CDP porque no cerró nada.
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

      // La fecha de la sesión, no la de la transcripción: puede ser anterior,
      // nunca futura. Un comité no sesiona mañana.
      if (dto.fecha > this.hoy()) {
        throw new BadRequestException('La sesión del comité no puede ser posterior a hoy');
      }

      const condiciones = dto.condiciones?.trim() || null;
      const observaciones = dto.observaciones?.trim() || null;

      // Lo que hace legible cada desenlace. La base tiene los mismos CHECK; el
      // mensaje está aquí porque un error de restricción no le dice a nadie qué
      // le falta al formulario.
      if (dto.decision === 'APROBADO_CON_CONDICIONES' && !condiciones) {
        throw new BadRequestException(
          'Di a qué queda condicionada la aprobación: sin condiciones, es una aprobación a secas',
        );
      }
      if (dto.decision === 'OBSERVADO' && !observaciones) {
        throw new BadRequestException(
          'Escribe las observaciones de fondo: sin ellas el proceso queda devuelto sin saber qué corregir',
        );
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
          observaciones: dto.decision === 'OBSERVADO' ? observaciones : null,
          actaDocumentoId: acta.id,
          registradoPor: acceso.userName,
          registradoPorId: acceso.userId ?? null,
        } as Partial<SesionComiteContratacion>),
      );

      const estado = estadoTrasLaSesion(dto.decision);
      await this.marcar(em, procesoId, estado, acceso);

      await this.traza(
        em,
        procesoId,
        sesion.id,
        dto.decision === 'OBSERVADO' ? 'DEVOLVER' : 'APROBAR',
        acceso,
        {
          actividad: NUMERAL_COMITE_CONTRATACION,
          decision: dto.decision,
          fecha: dto.fecha,
          condiciones,
          observaciones,
        },
      );

      // Aprobar cierra la actividad, y con ella la etapa 3 en las modalidades
      // que pasan por comité: la solicitud de CDP nace ahí. Observar no cierra
      // nada, así que no se pregunta.
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
      if (estadoActual === 'APROBADO') {
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
    const { abogado, motivo } = await this.participacion.quienDecide(procesoId, acceso);

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
   * Quien transcribe queda como revisor solo cuando la sesión cierra: una
   * devolución del comité deja la actividad abierta, y sellar ahí a quien la
   * escribió diría que él la revisó.
   */
  private async marcar(
    em: EntityManager,
    procesoId: string,
    estado: EstadoActividad,
    acceso: HiringAccess,
  ) {
    const cierra = estado === 'APROBADO';
    const actividad = await em
      .getRepository(ProcesoActividad)
      .findOne({ where: { procesoId, numeral: NUMERAL_COMITE_CONTRATACION } });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_COMITE_CONTRATACION,
          estado,
          datos: {},
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
    await em.save(ProcesoActividad, actividad);
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
