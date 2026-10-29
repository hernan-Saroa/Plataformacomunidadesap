import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';

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
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { ComiteService } from '../comite/comite.service';
import {
  ActualizarInformeDto,
  CargarEvidenciaDto,
  DimensionInforme,
  NOMBRE_DIMENSION,
  RectificarResultadoDto,
  RegistrarResultadoDto,
} from './dto/evaluacion.dto';
import { CierreActividadService } from '../cierre-actividad/cierre-actividad.service';
import { FirmaOtpDto } from '../cierre-actividad/dto/firma-otp.dto';

/** Actividad 6.3 de la matriz: la evaluación de las ofertas. */
export const NUMERAL_EVALUACION = '6.3';

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
}

/** Un archivo del informe con su hash, como lo entrega el controller. */
export interface ArchivoDelInforme {
  archivo: ArchivoCargado;
  hash: string;
}

/**
 * Evaluación preliminar de las ofertas — actividad 6.3 (EFDS-1157).
 *
 * **La plataforma no califica.** El comité evalúa por fuera y entrega un
 * informe consolidado, en uno o varios archivos (jurídico, técnico, financiero
 * y económico). En este punto la evaluación es preliminar y todavía no se sabe
 * qué oferta gana, así que no se registran puntajes ni ganadora: eso se decide
 * en el informe definitivo (7.2). El informe se carga una vez y alimenta la 6.3
 * y la 6.4; si tiene un error se vuelve a cargar, y el anterior queda en el
 * historial con su motivo.
 *
 * Lo que este servicio cuida es que el registro sea creíble: que haya comité
 * designado, que quien registra sea miembro de ese comité y que el informe
 * venga adjunto.
 */
@Injectable()
export class EvaluacionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly comite: ComiteService,
    private readonly cierre: CierreActividadService,
  ) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, acceso: HiringAccess) {
    const proceso = await this.exigirProceso(this.dataSource.manager, procesoId);

    const excluida = await this.dataSource.getRepository(ActividadExcluida).findOne({
      where: { numeral: NUMERAL_EVALUACION, modalidad: proceso.modalidad ?? '' },
    });

    const modalidad = proceso.modalidad
      ? await this.dataSource
          .getRepository(Modalidad)
          .findOne({ where: { codigo: proceso.modalidad } })
      : null;

    const { recepcionCerrada, oferentes } = await this.ofertasPublicadas(
      this.dataSource.manager,
      procesoId,
    );

    const misDimensiones = await this.comite.dimensionesDe(procesoId, acceso);
    const comiteDesignado = (await this.comite.estado(procesoId, acceso)).designado;

    const historial = await this.dataSource.getRepository(ResultadoEvaluacion).find({
      where: { procesoId },
      order: { registradoAt: 'DESC' },
    });
    const vigente = historial.find((r) => r.estado === 'VIGENTE') ?? null;

    // Las de todos: en un informe rectificado son sus archivos, y el historial
    // tiene que poder abrirlos (EFDS-1157).
    const evidencias = historial.length
      ? await this.dataSource.getRepository(EvidenciaEvaluacion).find({
          where: { resultadoId: In(historial.map((r) => r.id)) },
          order: { createdAt: 'ASC' },
        })
      : [];
    const evidenciasDe = (id: string) => evidencias.filter((e) => e.resultadoId === id);
    const documentos = await this.documentosDe([
      ...historial.map((r) => r.informeDocumentoId),
      ...evidencias.map((e) => e.documentoId),
    ]);

    const porOferente = new Map(oferentes.map((o) => [o.id, o]));

    return {
      aplica: !excluida,
      motivoNoAplica: excluida?.motivo ?? null,
      modalidad: proceso.modalidad,
      modalidadNombre: modalidad?.nombre ?? proceso.modalidad,
      recepcionCerrada,
      comiteDesignado,
      // En qué dimensiones fue designado quien consulta. Vacío significa que no
      // integra el comité de este proceso, así que mira y no registra.
      misDimensiones,
      esMiembroDelComite: misDimensiones.length > 0,
      puedeRegistrar:
        !excluida &&
        recepcionCerrada &&
        comiteDesignado &&
        oferentes.length > 0 &&
        misDimensiones.length > 0 &&
        !vigente,
      // Volver a cargar el informe si tiene un error u omisión (EFDS-1157).
      puedeActualizar: !excluida && misDimensiones.length > 0 && !!vigente,
      ofertas: oferentes.map((oferta) => ({
        id: oferta.id,
        numero: oferta.numero,
        nombre: oferta.nombre,
        identificacion: oferta.identificacion,
        valorOfertado: oferta.valorOfertado != null ? Number(oferta.valorOfertado) : null,
      })),
      resultado: vigente
        ? this.presentarResultado(vigente, porOferente, documentos, evidenciasDe(vigente.id))
        : null,
      // Los rectificados se muestran: son los que explican que el expediente
      // tenga dos informes de evaluación del mismo proceso.
      rectificados: historial
        .filter((r) => r.estado === 'RECTIFICADO')
        .map((r) => this.presentarResultado(r, porOferente, documentos, evidenciasDe(r.id))),
    };
  }

  // ------------------------------------------------------------- registro --

  /**
   * Recibe el informe de evaluación preliminar del comité.
   *
   * No hay valoración que validar: la evaluación es preliminar y el cuadro
   * comparativo vive en el informe. Lo que se exige es que el registro tenga
   * quién responda por él —un miembro del comité designado— y el informe.
   */
  async registrar(
    procesoId: string,
    dto: RegistrarResultadoDto,
    informes: ArchivoDelInforme[],
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      await this.exigirQueSePuedaCargar(em, procesoId, acceso);

      if (await this.resultadoVigente(procesoId, em)) {
        throw new ConflictException(
          'El proceso ya tiene el informe preliminar cargado: si tiene un error, vuelve a cargarlo',
        );
      }

      if (await this.cierre.exigeFirma(em, NUMERAL_EVALUACION)) {
        this.cierre.exigirFirmaValida(dto.firma);
      }

      const resultado = await this.crearResultado(em, procesoId, dto, informes, acceso);
      await this.marcarActividad(em, procesoId, acceso, dto.firma);

      await this.traza(em, procesoId, resultado.id, 'GUARDAR', acceso, {
        actividad: NUMERAL_EVALUACION,
        archivos: informes.length,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Vuelve a cargar el informe preliminar (EFDS-1157).
   *
   * El vigente queda rectificado con el motivo, la fecha y el usuario, y el
   * nuevo toma su lugar en la misma transacción: el proceso no queda ni un
   * momento sin informe. Lo que ya se trasladó no cambia: el traslado congeló
   * lo que se notificó.
   */
  async actualizar(
    procesoId: string,
    dto: ActualizarInformeDto,
    informes: ArchivoDelInforme[],
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      await this.exigirProceso(em, procesoId);
      await this.exigirQueSeaDelComite(procesoId, acceso);

      const vigente = await this.resultadoVigente(procesoId, em);
      if (!vigente) {
        throw new NotFoundException('Todavía no se ha cargado el informe preliminar');
      }

      const motivo = dto.motivo.trim();
      vigente.estado = 'RECTIFICADO';
      vigente.rectificadoAt = new Date();
      vigente.rectificadoPor = acceso.userName;
      vigente.motivoRectificacion = motivo;
      await em.save(vigente);

      const nuevo = await this.crearResultado(em, procesoId, dto, informes, acceso);
      await this.marcarActividad(em, procesoId, acceso, dto.firma);

      await this.traza(em, procesoId, nuevo.id, 'RECTIFICAR', acceso, {
        actividad: NUMERAL_EVALUACION,
        motivo,
        anterior: vigente.id,
        archivos: informes.length,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Rectifica el resultado vigente para poder registrar otro.
   *
   * No se borra ni se edita: el resultado anterior pudo trasladarse a los
   * oferentes y tiene su informe en el expediente. Queda con su motivo, y el
   * proceso vuelve a quedar sin resultado hasta que se registre el nuevo.
   */
  async rectificar(procesoId: string, dto: RectificarResultadoDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      await this.exigirProceso(em, procesoId);
      await this.exigirQueSeaDelComite(procesoId, acceso);

      const vigente = await this.resultadoVigente(procesoId, em);
      if (!vigente) {
        throw new NotFoundException('El proceso no tiene resultado de evaluación registrado');
      }

      vigente.estado = 'RECTIFICADO';
      vigente.rectificadoAt = new Date();
      vigente.rectificadoPor = acceso.userName;
      vigente.motivoRectificacion = dto.motivo.trim();
      await em.save(vigente);

      await this.marcarActividad(em, procesoId, acceso);

      await this.traza(em, procesoId, vigente.id, 'RECTIFICAR', acceso, {
        actividad: NUMERAL_EVALUACION,
        motivo: dto.motivo.trim(),
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Suma un documento de soporte al resultado vigente.
   *
   * Las verificaciones jurídica, financiera y técnica, el cuadro comparativo,
   * las actas. Llegan de a una y en momentos distintos, cada una de quien la
   * produjo: es el cargue de archivos que la matriz le reconoce al comité.
   */
  async agregarEvidencia(
    procesoId: string,
    dto: CargarEvidenciaDto,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      await this.exigirProceso(em, procesoId);
      await this.exigirQueSeaDelComite(procesoId, acceso);

      const vigente = await this.resultadoVigente(procesoId, em);
      if (!vigente) {
        throw new ConflictException(
          'Primero se registra el resultado con su informe; las evidencias lo sustentan',
        );
      }

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const doc = await this.guardarDocumento(
        em,
        expediente.id,
        dto.descripcion.trim(),
        archivo,
        hash,
        acceso,
      );

      const evidencia = await em.save(
        em.create(EvidenciaEvaluacion, {
          resultadoId: vigente.id,
          documentoId: doc.id,
          descripcion: dto.descripcion.trim(),
          cargadaPor: acceso.userName,
        }),
      );

      await this.traza(em, procesoId, evidencia.id, 'ADJUNTAR', acceso, {
        actividad: NUMERAL_EVALUACION,
        descripcion: dto.descripcion.trim(),
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ----------------------------------------------------------- auxiliares --

  /**
   * Registra quien integra el comité de **este** proceso.
   *
   * El rol del token solo abre la pantalla. Un evaluador designado en otro
   * proceso llega hasta aquí y no puede registrar nada, que es lo correcto:
   * evaluar es una condición de la persona en el proceso, no una credencial.
   * La regla es la misma de EFDS-1438; lo que cambió es qué se registra.
   */
  private async exigirQueSeaDelComite(procesoId: string, acceso: HiringAccess) {
    const mias = await this.comite.dimensionesDe(procesoId, acceso);

    if (mias.length === 0) {
      throw new ForbiddenException(
        'No fuiste designado en el comité evaluador de este proceso: el resultado lo registra quien evaluó',
      );
    }
  }

  /** Lo que piden cargar y volver a cargar: proceso, recepción en firme, comité y ser de él. */
  private async exigirQueSePuedaCargar(em: EntityManager, procesoId: string, acceso: HiringAccess) {
    const proceso = await this.exigirProceso(em, procesoId);
    await this.exigirQueAplique(em, proceso);

    // El cierre va primero porque es el paso anterior de la cadena: el comité
    // se designa sobre una lista en firme (EFDS-1156).
    const { recepcionCerrada } = await this.ofertasPublicadas(em, procesoId);
    if (!recepcionCerrada) {
      throw new ConflictException(
        'La recepción de ofertas sigue abierta: no hay nada que evaluar mientras la lista pueda cambiar',
      );
    }

    // Sin comité no hay evaluación (EFDS-1156). No se repite la regla.
    await this.comite.exigirComiteParaEvaluar(procesoId, em);
    await this.exigirQueSeaDelComite(procesoId, acceso);
  }

  /**
   * Guarda el informe —todos sus archivos— y el resultado que lo agrupa.
   *
   * El primer archivo es el informe del resultado, que es el que se traslada y
   * se congela; todos, el primero incluido, quedan como sus archivos con la
   * dimensión que sustentan.
   */
  private async crearResultado(
    em: EntityManager,
    procesoId: string,
    dto: RegistrarResultadoDto,
    informes: ArchivoDelInforme[],
    acceso: HiringAccess,
  ) {
    if (!informes.length) {
      throw new BadRequestException(
        'Adjunta el informe del comité: sin él la evaluación es la opinión de quien la digitó',
      );
    }
    const dimensiones = dto.dimensiones ?? [];
    if (dimensiones.length && dimensiones.length !== informes.length) {
      throw new BadRequestException('Di de qué es cada archivo: una dimensión por archivo');
    }

    const expediente = await em.findOne(Expediente, { where: { procesoId } });
    if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

    const nombres = informes.map((_, i) => {
      const dimension: DimensionInforme = dimensiones[i] ?? 'CONSOLIDADO';
      const repetidas = dimensiones.filter((d) => d === dimension).length;
      const base = NOMBRE_DIMENSION[dimension];
      // Sin dimensiones, todos son partes del consolidado y se numeran.
      return !dimensiones.length && informes.length > 1
        ? `${base} (${i + 1} de ${informes.length})`
        : repetidas > 1
          ? `${base} (${dimensiones.slice(0, i + 1).filter((d) => d === dimension).length})`
          : base;
    });

    const documentos = [];
    // Uno tras otro: comparten la transacción.
    for (const [i, { archivo, hash }] of informes.entries()) {
      documentos.push(
        await this.guardarDocumento(em, expediente.id, nombres[i], archivo, hash, acceso),
      );
    }

    const resultado = await em.save(
      em.create(ResultadoEvaluacion, {
        procesoId,
        oferenteId: null,
        informeDocumentoId: documentos[0].id,
        puntajeObtenido: null,
        puntajeMaximo: null,
        valorEvaluado: null,
        justificacion: dto.observacion?.trim() || null,
        estado: 'VIGENTE' as const,
        registradoPor: acceso.userName,
      }),
    );

    await em.save(
      documentos.map((doc, i) =>
        em.create(EvidenciaEvaluacion, {
          resultadoId: resultado.id,
          documentoId: doc.id,
          descripcion: nombres[i],
          cargadaPor: acceso.userName,
        }),
      ),
    );

    return resultado;
  }

  private presentarResultado(
    resultado: ResultadoEvaluacion,
    ofertas: Map<string, Oferente>,
    documentos: Map<string, Documento>,
    evidencias: EvidenciaEvaluacion[],
  ) {
    const ganadora = resultado.oferenteId ? ofertas.get(resultado.oferenteId) : undefined;
    const informe = documentos.get(resultado.informeDocumentoId);

    return {
      id: resultado.id,
      estado: resultado.estado,
      ganadora: ganadora
        ? {
            id: ganadora.id,
            numero: ganadora.numero,
            nombre: ganadora.nombre,
            identificacion: ganadora.identificacion,
            valorOfertado: ganadora.valorOfertado != null ? Number(ganadora.valorOfertado) : null,
          }
        : null,
      puntajeObtenido: resultado.puntajeObtenido != null ? Number(resultado.puntajeObtenido) : null,
      puntajeMaximo: resultado.puntajeMaximo != null ? Number(resultado.puntajeMaximo) : null,
      valorEvaluado: resultado.valorEvaluado != null ? Number(resultado.valorEvaluado) : null,
      justificacion: resultado.justificacion,
      informe: informe
        ? { id: informe.id, nombre: informe.nombre, archivoUrl: informe.archivoUrl }
        : null,
      registradoPor: resultado.registradoPor,
      registradoAt: resultado.registradoAt,
      rectificadoPor: resultado.rectificadoPor,
      rectificadoAt: resultado.rectificadoAt,
      motivoRectificacion: resultado.motivoRectificacion,
      evidencias: evidencias.map((e) => {
        const doc = documentos.get(e.documentoId);
        return {
          id: e.id,
          descripcion: e.descripcion,
          cargadaPor: e.cargadaPor,
          cargadaAt: e.createdAt,
          nombre: doc?.archivoNombreOriginal ?? doc?.nombre ?? null,
          archivoUrl: doc?.archivoUrl ?? null,
        };
      }),
    };
  }

  /** La lista de oferentes publicada, y si la recepción ya cerró. */
  private async ofertasPublicadas(em: EntityManager, procesoId: string) {
    const recepcion = await em.getRepository(RecepcionOfertas).findOne({ where: { procesoId } });

    if (!recepcion) return { recepcionCerrada: false, oferentes: [] as Oferente[] };

    const oferentes = await em.getRepository(Oferente).find({
      where: { recepcionId: recepcion.id },
      order: { numero: 'ASC' },
    });

    return { recepcionCerrada: recepcion.estado === 'CERRADA', oferentes };
  }

  private resultadoVigente(procesoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager
      .getRepository(ResultadoEvaluacion)
      .findOne({ where: { procesoId, estado: 'VIGENTE' } });
  }

  private async documentosDe(ids: string[]): Promise<Map<string, Documento>> {
    const unicos = [...new Set(ids.filter(Boolean))];
    if (unicos.length === 0) return new Map();

    const documentos = await this.dataSource
      .getRepository(Documento)
      .find({ where: { id: In(unicos) } });

    return new Map(documentos.map((d) => [d.id, d]));
  }

  private async exigirQueAplique(em: EntityManager, proceso: Proceso) {
    const excluida = await em.getRepository(ActividadExcluida).findOne({
      where: { numeral: NUMERAL_EVALUACION, modalidad: proceso.modalidad ?? '' },
    });
    if (excluida) {
      throw new BadRequestException(`Esta modalidad no evalúa ofertas: ${excluida.motivo}`);
    }
  }

  /**
   * La actividad queda cumplida con el resultado registrado, y vuelve a quedar
   * en curso si se rectifica: el proceso se queda sin resultado hasta que se
   * registre otro, y el riel tiene que decirlo. Mismo criterio del comité.
   */
  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    acceso: HiringAccess,
    firma?: FirmaOtpDto,
  ) {
    const registrado = !!(await this.resultadoVigente(procesoId, em));

    if (!registrado) {
      const actividad = await em.getRepository(ProcesoActividad).findOne({
        where: { procesoId, numeral: NUMERAL_EVALUACION },
      });
      if (!actividad) {
        await em.save(
          em.create(ProcesoActividad, {
            procesoId,
            numeral: NUMERAL_EVALUACION,
            estado: 'BORRADOR' as any,
            datos: {},
          }),
        );
        return;
      }
      actividad.estado = 'BORRADOR' as any;
      actividad.revisadoPor = null;
      actividad.revisadoAt = null;
      await em.save(actividad);
      return;
    }

    const proceso = await this.exigirProceso(em, procesoId);
    await this.cierre.resolverCierre(
      em,
      procesoId,
      NUMERAL_EVALUACION,
      proceso.modalidad,
      acceso,
      firma,
    );
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
        numeral: NUMERAL_EVALUACION,
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

  private async exigirProceso(em: EntityManager, procesoId: string): Promise<Proceso> {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');
    return proceso;
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
        entidad: 'resultado_evaluacion',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
