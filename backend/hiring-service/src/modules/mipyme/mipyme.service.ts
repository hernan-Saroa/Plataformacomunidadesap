import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { ManifestacionMipyme } from '../../entities/manifestacion-mipyme.entity';
import { LimitacionMipyme } from '../../entities/limitacion-mipyme.entity';
import { ParametroMipyme, UnidadTope } from '../../entities/parametro-mipyme.entity';
import { Smmlv } from '../../entities/smmlv.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { HiringAccess, ROLES_PARTICIPACION } from '../../auth/hiring-access';
import { evaluarCondiciones } from './condiciones';
import { DecidirLimitacionDto, RegistrarManifestacionDto } from './dto/mipyme.dto';

/** Actividad 5.4 de la matriz: la limitación de la convocatoria a MIPYME. */
export const NUMERAL_MIPYME = '5.4';

@Injectable()
export class MipymeService {
  constructor(private readonly dataSource: DataSource) {}

  private hoy(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }

  async aplicaLimitacion(modalidad: string | null, em?: EntityManager): Promise<boolean> {
    if (!modalidad) return true;
    const manager = em ?? this.dataSource.manager;
    const excluida = await manager.getRepository(ActividadExcluida).findOne({
      where: { numeral: NUMERAL_MIPYME, modalidad },
    });
    return !excluida;
  }

  /** Los dos parámetros, en la forma en que los consume el cálculo. */
  private async parametros(em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    const filas = await manager.getRepository(ParametroMipyme).find();
    const porClave = new Map(filas.map((p) => [p.clave, p]));

    const tope = porClave.get('TOPE_VALOR');
    const minimo = porClave.get('MINIMO_MANIFESTACIONES');

    if (!tope || !minimo) {
      throw new ConflictException(
        'Las condiciones de la limitación a MIPYME no están configuradas',
      );
    }
    return { tope, minimo };
  }

  // ------------------------------------------------------------- consulta --

  /**
   * Manifestaciones, condiciones evaluadas y decisión, si ya se tomó.
   *
   * El cálculo se hace aquí y no en la pantalla porque es la regla de la que
   * depende restringir quién puede participar en un proceso público. Dos
   * implementaciones de eso terminan discrepando.
   */
  async estado(procesoId: string, em?: EntityManager, acceso?: HiringAccess) {
    const manager = em ?? this.dataSource.manager;
    const proceso = await this.exigirProceso(manager, procesoId);

    const puedeGestionar = ROLES_PARTICIPACION.some(
      (r) => acceso?.roles.includes(r) ?? false,
    );

    if (!(await this.aplicaLimitacion(proceso.modalidad, em))) {
      return {
        aplica: false,
        manifestaciones: [],
        condiciones: null,
        decision: null,
        advertencia: null,
        puedeGestionar,
      };
    }

    const { tope, minimo } = await this.parametros(em);

    const manifestaciones = await manager.getRepository(ManifestacionMipyme).find({
      where: { procesoId },
      order: { fechaPresentacion: 'ASC', createdAt: 'ASC' },
    });

    const smmlv = await this.salarioDelAnio(manager);

    const condiciones = evaluarCondiciones({
      valorProceso: proceso.valorEstimado ?? null,
      manifestaciones: manifestaciones.length,
      topeValor: tope.valor,
      unidadTope: (tope.unidad ?? 'PESOS') as UnidadTope,
      smmlv,
      minimoManifestaciones: minimo.valor,
    });

    const decision = await manager.getRepository(LimitacionMipyme).findOne({
      where: { procesoId },
    });

    return {
      aplica: true,
      manifestaciones,
      condiciones,
      decision,
      advertencia: this.advertencia(tope, minimo, smmlv),
      puedeGestionar,
    };
  }

  /** Por qué el cálculo mostrado puede no ser de fiar. */
  private advertencia(
    tope: ParametroMipyme,
    minimo: ParametroMipyme,
    smmlv: number | null,
  ): string | null {
    if (tope.unidad === 'SMMLV' && smmlv === null) {
      return `No hay salario mínimo registrado para ${new Date().getFullYear()}: el tope en SMMLV no se puede convertir a pesos`;
    }
    if (!tope.confirmado || !minimo.confirmado) {
      // Presentar como definitivo un cálculo hecho sobre cifras que nadie
      // validó es peor que no calcularlo: induce a decidir con falsa confianza.
      return 'Las condiciones se están evaluando con parámetros provisionales, pendientes de confirmación por la Dirección de Contratación';
    }
    return null;
  }

  private async salarioDelAnio(manager: EntityManager): Promise<number | null> {
    const anio = Number(this.hoy().slice(0, 4));
    const salario = await manager.getRepository(Smmlv).findOne({ where: { anio } });
    return salario?.valor ?? null;
  }

  // ------------------------------------------------------ manifestaciones --

  /** Registra que una MIPYME manifestó interés en participar. */
  async registrarManifestacion(
    procesoId: string,
    dto: RegistrarManifestacionDto,
    archivo: { filename: string; originalname: string; mimetype: string; size: number } | null,
    hash: string | null,
    acceso: HiringAccess,
  ) {
    return this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);

      if (!(await this.aplicaLimitacion(proceso.modalidad, em))) {
        throw new BadRequestException(
          'Esta modalidad no admite limitación de la convocatoria a MIPYME',
        );
      }

      if (dto.fechaPresentacion > this.hoy()) {
        throw new BadRequestException(
          'La fecha de presentación no puede ser futura: se registra lo que ya se recibió',
        );
      }

      const repetida = await em.getRepository(ManifestacionMipyme).findOne({
        where: { procesoId, identificacion: dto.identificacion },
      });
      if (repetida) {
        // Contarla dos veces inflaría el número del que depende la decisión.
        throw new ConflictException(
          `La MIPYME ${dto.identificacion} ya manifestó interés en este proceso`,
        );
      }

      // Una decisión ya tomada se calculó sobre un conteo distinto: dejar
      // entrar más manifestaciones después la volvería inexplicable.
      const decidido = await em.getRepository(LimitacionMipyme).findOne({ where: { procesoId } });
      if (decidido) {
        throw new ConflictException(
          'La limitación ya fue decidida: registrar más manifestaciones cambiaría el conteo con el que se decidió',
        );
      }

      const documento = archivo
        ? await this.guardarSoporte(em, procesoId, archivo, hash!, acceso)
        : null;

      const manifestacion = await em.save(
        em.create(ManifestacionMipyme, {
          procesoId,
          nombre: dto.nombre,
          identificacion: dto.identificacion,
          fechaPresentacion: dto.fechaPresentacion,
          documentoId: documento?.id ?? null,
          registradoPor: acceso.userName,
        }),
      );

      await this.marcarActividad(em, procesoId, 'BORRADOR', acceso);
      await this.traza(em, procesoId, manifestacion.id, 'CREAR', acceso, {
        nombre: dto.nombre,
        identificacion: dto.identificacion,
      });

      return this.estado(procesoId, em, acceso);
    });
  }

  // ----------------------------------------------------------- decisión ----

  /**
   * Registra la decisión de limitar o no la convocatoria.
   *
   * La entidad puede apartarse del cálculo: la limitación es una potestad suya
   * y puede haber razones que el sistema no ve. Lo que no puede es apartarse en
   * silencio, porque el expediente quedaría sin explicación.
   */
  async decidir(
    procesoId: string,
    dto: DecidirLimitacionDto,
    archivo: { filename: string; originalname: string; mimetype: string; size: number } | null,
    hash: string | null,
    acceso: HiringAccess,
  ) {
    return this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      const estado = await this.estado(procesoId, em, acceso);

      if (!estado.aplica) {
        throw new BadRequestException(
          'Esta modalidad no admite limitación de la convocatoria a MIPYME',
        );
      }

      const cumplidas = estado.condiciones!.cumplidas;

      if (dto.limitado !== cumplidas && !dto.motivo?.trim()) {
        throw new BadRequestException(
          cumplidas
            ? 'Las condiciones se cumplen y la convocatoria no se limita: indica el motivo'
            : 'Las condiciones no se cumplen y la convocatoria se limita: indica el motivo',
        );
      }

      // Limitar restringe quién puede presentarse a un proceso público, así que
      // exige el acto que lo sustente. No limitar es mantener las cosas como
      // están y no siempre produce documento.
      if (dto.limitado && !archivo) {
        throw new BadRequestException(
          'Adjunta el acto administrativo que sustenta la limitación de la convocatoria',
        );
      }

      const { tope, minimo } = await this.parametros(em);
      const documento = archivo
        ? await this.guardarSoporte(em, procesoId, archivo, hash!, acceso)
        : null;

      const repo = em.getRepository(LimitacionMipyme);
      const previa = await repo.findOne({ where: { procesoId } });
      const decision = previa ?? repo.create({ procesoId });

      decision.limitado = dto.limitado;
      decision.condicionesCumplidas = cumplidas;
      // Se congela todo lo que entró en el cálculo: si mañana se corrigen los
      // parámetros, esta decisión debe seguir explicándose con los de hoy.
      decision.manifestacionesContadas = estado.manifestaciones.length;
      decision.valorProceso = proceso.valorEstimado ?? null;
      decision.topeValorAplicado = tope.valor;
      decision.unidadTopeAplicada = tope.unidad;
      decision.minimoManifestaciones = minimo.valor;
      decision.motivo = dto.motivo?.trim() || null;
      if (documento) decision.documentoId = documento.id;
      decision.decididoPor = acceso.userName;
      decision.decididoAt = new Date();
      decision.updatedAt = new Date();

      await em.save(decision);

      await this.marcarActividad(em, procesoId, 'APROBADO', acceso);
      await this.traza(em, procesoId, decision.id, previa ? 'GUARDAR' : 'APROBAR', acceso, {
        limitado: dto.limitado,
        condicionesCumplidas: cumplidas,
        manifestaciones: decision.manifestacionesContadas,
        rectifica: previa ? { limitado: previa.limitado } : undefined,
      });

      return this.estado(procesoId, em, acceso);
    });
  }

  // ------------------------------------------------------------ auxiliares --

  private async guardarSoporte(
    em: EntityManager,
    procesoId: string,
    archivo: { filename: string; originalname: string; mimetype: string; size: number },
    hash: string,
    acceso: HiringAccess,
  ) {
    const expediente = await em.findOne(Expediente, { where: { procesoId } });
    if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

    return em.save(
      em.create(Documento, {
        expedienteId: expediente.id,
        numeral: NUMERAL_MIPYME,
        tipo: 'ADJUNTO',
        nombre: archivo.originalname,
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

  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    estado: 'BORRADOR' | 'APROBADO',
    acceso: HiringAccess,
  ) {
    const cumplida = estado === 'APROBADO';
    const revisadoPor = (cumplida ? acceso.userName : null) as any;
    const revisadoAt = (cumplida ? new Date() : null) as any;

    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_MIPYME },
    });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_MIPYME,
          estado,
          datos: {},
          revisadoPor,
          revisadoAt,
        }),
      );
      return;
    }

    actividad.estado = estado;
    actividad.revisadoPor = revisadoPor;
    actividad.revisadoAt = revisadoAt;
    await em.save(actividad);
  }

  private traza(
    em: EntityManager,
    procesoId: string,
    entidadId: string,
    accion: AccionTraza,
    acceso: HiringAccess,
    detalle?: Record<string, any>,
  ) {
    return em.save(Trazabilidad, {
      procesoId,
      entidad: 'limitacion_mipyme',
      entidadId,
      accion,
      detalle,
      usuarioId: acceso.userId,
      usuarioNombre: acceso.userName,
    } as Partial<Trazabilidad>);
  }
}
