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
  CargarEvidenciaDto,
  RectificarResultadoDto,
  RegistrarResultadoDto,
} from './dto/evaluacion.dto';

/** Actividad 6.3 de la matriz: la evaluación de las ofertas. */
export const NUMERAL_EVALUACION = '6.3';

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
}

/**
 * Evaluación de las ofertas — actividad 6.3 (EFDS-1157).
 *
 * **La plataforma no califica.** El comité evalúa por fuera, con sus formatos y
 * su cuadro comparativo, y elige la ganadora; lo que llega aquí es la decisión
 * ya tomada, su valoración y los documentos que la sustentan. Así lo dice la
 * matriz de roles del Comité Evaluador: "consulta y cargue de archivos".
 *
 * De ahí que este servicio no tenga ninguna regla de puntuación. Lo que sí
 * cuida es que el registro sea creíble: que haya comité designado, que quien
 * registra sea miembro de ese comité, que la ganadora sea una de las ofertas
 * recibidas y que el informe venga adjunto.
 */
@Injectable()
export class EvaluacionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly comite: ComiteService,
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

    const evidencias = vigente ? await this.evidenciasDe(vigente.id) : [];
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
      ofertas: oferentes.map((oferta) => ({
        id: oferta.id,
        numero: oferta.numero,
        nombre: oferta.nombre,
        identificacion: oferta.identificacion,
        valorOfertado: oferta.valorOfertado != null ? Number(oferta.valorOfertado) : null,
      })),
      resultado: vigente
        ? this.presentarResultado(vigente, porOferente, documentos, evidencias)
        : null,
      // Los rectificados se muestran: son los que explican que el expediente
      // tenga dos informes de evaluación del mismo proceso.
      rectificados: historial
        .filter((r) => r.estado === 'RECTIFICADO')
        .map((r) => this.presentarResultado(r, porOferente, documentos, [])),
    };
  }

  // ------------------------------------------------------------- registro --

  /**
   * Recibe el resultado de la evaluación con el informe del comité.
   *
   * No valida la valoración contra nada porque no hay contra qué: el cuadro
   * comparativo vive en el informe. Lo que se exige es que el registro tenga
   * quién responda por él —un miembro del comité designado— y que la ganadora
   * sea una de las ofertas que el proceso recibió.
   */
  async registrar(
    procesoId: string,
    dto: RegistrarResultadoDto,
    informe: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      await this.exigirQueAplique(em, proceso);

      // El cierre va primero porque es el paso anterior de la cadena: el comité
      // se designa sobre una lista en firme (EFDS-1156), así que con la
      // recepción abierta la falta no es el comité sino el cierre que nadie
      // hizo, y eso es lo que hay que decir.
      const { recepcionCerrada, oferentes } = await this.ofertasPublicadas(em, procesoId);
      if (!recepcionCerrada) {
        throw new ConflictException(
          'La recepción de ofertas sigue abierta: no hay resultado que registrar mientras la lista pueda cambiar',
        );
      }

      // Sin comité no hay evaluación: es el segundo criterio de EFDS-1156, ya
      // construido y probado allí. No se repite la regla.
      await this.comite.exigirComiteParaEvaluar(procesoId, em);
      await this.exigirQueSeaDelComite(procesoId, acceso);

      const ganadora = oferentes.find((o) => o.id === dto.oferenteId);
      if (!ganadora) {
        throw new NotFoundException('La oferta ganadora no está en la lista de este proceso');
      }

      if (await this.resultadoVigente(procesoId, em)) {
        throw new ConflictException(
          'El proceso ya tiene resultado registrado: para corregirlo se rectifica el actual y se registra otro',
        );
      }

      this.validarValoracion(dto);

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const doc = await this.guardarDocumento(
        em,
        expediente.id,
        'Informe de evaluación del comité',
        informe,
        hash,
        acceso,
      );

      const resultado = await em.save(
        em.create(ResultadoEvaluacion, {
          procesoId,
          oferenteId: ganadora.id,
          informeDocumentoId: doc.id,
          puntajeObtenido: dto.puntajeObtenido != null ? String(dto.puntajeObtenido) : null,
          puntajeMaximo: dto.puntajeMaximo != null ? String(dto.puntajeMaximo) : null,
          // Si el comité no corrigió la cifra, el valor evaluado es el que la
          // oferta presentó: se copia para que el resultado se lea solo.
          valorEvaluado:
            dto.valorEvaluado != null
              ? String(dto.valorEvaluado)
              : ganadora.valorOfertado != null
                ? String(ganadora.valorOfertado)
                : null,
          justificacion: dto.justificacion.trim(),
          estado: 'VIGENTE' as const,
          registradoPor: acceso.userName,
        }),
      );

      await this.marcarActividad(em, procesoId, acceso);

      await this.traza(em, procesoId, resultado.id, 'GUARDAR', acceso, {
        actividad: NUMERAL_EVALUACION,
        ganadora: ganadora.numero,
        puntaje: dto.puntajeObtenido ?? null,
        puntajeMaximo: dto.puntajeMaximo ?? null,
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

  /**
   * La valoración va completa o no va.
   *
   * Un puntaje sin la escala no se puede leer, y uno por encima del máximo es
   * un error de digitación que quedaría en el informe trasladado. La base tiene
   * el mismo control; aquí se atrapa antes para poder explicarlo.
   */
  private validarValoracion(dto: RegistrarResultadoDto) {
    const tieneObtenido = dto.puntajeObtenido != null;
    const tieneMaximo = dto.puntajeMaximo != null;

    if (tieneObtenido !== tieneMaximo) {
      throw new BadRequestException(
        'El puntaje va con su escala: un 85 sin saber sobre cuánto no dice nada',
      );
    }
    if (tieneObtenido && dto.puntajeObtenido! > dto.puntajeMaximo!) {
      throw new BadRequestException(
        `El puntaje obtenido (${dto.puntajeObtenido}) no puede superar el máximo (${dto.puntajeMaximo})`,
      );
    }
  }

  private presentarResultado(
    resultado: ResultadoEvaluacion,
    ofertas: Map<string, Oferente>,
    documentos: Map<string, Documento>,
    evidencias: EvidenciaEvaluacion[],
  ) {
    const ganadora = ofertas.get(resultado.oferenteId);
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

  private evidenciasDe(resultadoId: string) {
    return this.dataSource.getRepository(EvidenciaEvaluacion).find({
      where: { resultadoId },
      order: { createdAt: 'ASC' },
    });
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
  private async marcarActividad(em: EntityManager, procesoId: string, acceso: HiringAccess) {
    const registrado = !!(await this.resultadoVigente(procesoId, em));
    const estado = registrado ? 'APROBADO' : 'BORRADOR';

    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_EVALUACION },
    });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_EVALUACION,
          estado: estado as any,
          datos: {},
          ...(registrado ? { revisadoPor: acceso.userName, revisadoAt: new Date() } : {}),
        }),
      );
      return;
    }

    actividad.estado = estado as any;
    actividad.revisadoPor = registrado ? acceso.userName : null;
    actividad.revisadoAt = registrado ? new Date() : null;
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
