import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { ComiteEvaluador } from '../../entities/comite-evaluador.entity';
import { MiembroComite } from '../../entities/miembro-comite.entity';
import { RecepcionOfertas } from '../../entities/recepcion-ofertas.entity';
import { Oferente } from '../../entities/oferente.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { DesignarComiteDto, RevocarComiteDto } from './dto/comite.dto';

/** Actividad 6.2 de la matriz: la designación del comité evaluador. */
export const NUMERAL_COMITE = '6.2';

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class ComiteService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, acceso: HiringAccess) {
    const proceso = await this.exigirProceso(this.dataSource.manager, procesoId);

    const excluida = await this.dataSource.getRepository(ActividadExcluida).findOne({
      where: { numeral: NUMERAL_COMITE, modalidad: proceso.modalidad ?? '' },
    });

    const modalidad = proceso.modalidad
      ? await this.dataSource
          .getRepository(Modalidad)
          .findOne({ where: { codigo: proceso.modalidad } })
      : null;

    const { recepcionCerrada, totalOferentes } = await this.estadoDeLaRecepcion(
      this.dataSource.manager,
      procesoId,
    );

    const comite = await this.comiteVigente(procesoId);
    const miembros = comite ? await this.miembrosDe(this.dataSource.manager, comite.id) : [];
    const memorando = comite
      ? await this.dataSource
          .getRepository(Documento)
          .findOne({ where: { id: comite.memorandoDocumentoId } })
      : null;

    // En qué dimensiones evalúa quien está consultando. Va en el estado y no en
    // un endpoint aparte porque la pantalla lo necesita en la misma carga.
    const misDimensiones = comite
      ? await this.dimensionesEnElComite(comite.id, acceso)
      : [];

    return {
      aplica: !excluida,
      motivoNoAplica: excluida?.motivo ?? null,
      modalidad: proceso.modalidad,
      modalidadNombre: modalidad?.nombre ?? proceso.modalidad,
      soyEvaluador: misDimensiones.length > 0,
      misDimensiones,
      // Las dos condiciones del criterio 1, por separado: la pantalla necesita
      // decir cuál de las dos falta, no solo que no se puede.
      recepcionCerrada,
      totalOferentes,
      designado: !!comite,
      puedeDesignar: !excluida && recepcionCerrada && totalOferentes > 0 && !comite,
      comite: comite
        ? {
            id: comite.id,
            fechaDesignacion: comite.fechaDesignacion,
            designadoPor: comite.designadoPor,
            designadoAt: comite.createdAt,
            memorando: memorando
              ? { nombre: memorando.archivoNombreOriginal ?? memorando.nombre, url: memorando.archivoUrl }
              : null,
          }
        : null,
      miembros: miembros.map((m) => ({
        id: m.id,
        personaId: m.personaId,
        nombre: m.nombre,
        rol: m.rol,
      })),
    };
  }

  // ---------------------------------------------------------- designación --

  /**
   * Registra la designación del comité con su memorando.
   *
   * Se exige la recepción cerrada porque designar antes sería nombrar
   * evaluadores para una lista de ofertas que todavía puede cambiar; y se exige
   * al menos un oferente porque un comité sin nada que evaluar no es una
   * designación, es un trámite vacío.
   */
  async designar(
    procesoId: string,
    dto: DesignarComiteDto,
    memorando: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      await this.exigirQueAplique(em, proceso);

      const { recepcionCerrada, totalOferentes } = await this.estadoDeLaRecepcion(em, procesoId);

      if (!recepcionCerrada) {
        throw new ConflictException(
          'La recepción de ofertas todavía no se ha cerrado: el comité se designa sobre una lista de oferentes en firme',
        );
      }
      if (totalOferentes === 0) {
        throw new ConflictException(
          'El proceso cerró sin ofertas recibidas: no hay nada que evaluar',
        );
      }

      if (await this.comiteVigente(procesoId, em)) {
        throw new ConflictException(
          'El proceso ya tiene comité designado: para cambiarlo se revoca el actual y se designa otro',
        );
      }

      this.validarFecha(dto.fechaDesignacion);
      this.validarMiembros(dto);

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const doc = await this.guardarDocumento(
        em,
        expediente.id,
        'Memorando de designación del comité evaluador',
        memorando,
        hash,
        acceso,
      );

      const comite = await em.save(
        em.create(ComiteEvaluador, {
          procesoId,
          memorandoDocumentoId: doc.id,
          fechaDesignacion: dto.fechaDesignacion,
          designadoPor: acceso.userName,
          estado: 'VIGENTE' as const,
        }),
      );

      await em.save(
        dto.miembros.map((m) =>
          em.create(MiembroComite, {
            comiteId: comite.id,
            personaId: m.personaId,
            nombre: m.nombre,
            rol: m.rol,
          }),
        ),
      );

      await this.marcarActividad(em, procesoId, acceso);

      await this.traza(em, procesoId, comite.id, 'DESIGNAR', acceso, {
        actividad: NUMERAL_COMITE,
        fechaDesignacion: dto.fechaDesignacion,
        miembros: dto.miembros.map((m) => ({ personaId: m.personaId, rol: m.rol })),
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Revoca la designación vigente.
   *
   * No se borra: un comité revocado existió y pudo evaluar, así que el
   * expediente conserva los dos memorandos y el motivo por el que se cambió.
   */
  async revocar(procesoId: string, dto: RevocarComiteDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const comite = await this.comiteVigente(procesoId, em);
      if (!comite) throw new NotFoundException('El proceso no tiene comité designado');

      comite.estado = 'REVOCADO';
      comite.revocadoAt = new Date();
      comite.revocadoPor = acceso.userName;
      comite.motivoRevocacion = dto.motivo;
      await em.save(comite);

      await this.marcarActividad(em, procesoId, acceso);

      await this.traza(em, procesoId, comite.id, 'REVOCAR', acceso, {
        actividad: NUMERAL_COMITE,
        motivo: dto.motivo,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ------------------------------------------------- quién puede evaluar --

  /**
   * En qué dimensiones evalúa este usuario dentro del proceso.
   *
   * Es la pregunta que hará la evaluación (EFDS-1157) en cada petición, y la
   * respuesta se deriva de la membresía del comité vigente: **no se escriben
   * roles en `auth.user_roles`**. Dos razones. La primera es de propiedad: ese
   * esquema es de otro equipo y repartir permisos globales desde contratación
   * sería pisarlo. La segunda es de fondo: ser evaluador no es una condición de
   * la persona sino de la persona *en este proceso*, y un rol global no sabría
   * distinguir en cuál puede evaluar y en cuál no.
   *
   * Lista vacía significa que no evalúa aquí, sea porque no está designado o
   * porque su cuenta no está enlazada a ninguna persona del directorio.
   */
  async dimensionesDe(procesoId: string, acceso: HiringAccess) {
    const comite = await this.comiteVigente(procesoId);
    if (!comite) return [];

    return this.dimensionesEnElComite(comite.id, acceso);
  }

  /**
   * Exige que haya comité designado antes de evaluar.
   *
   * Segundo criterio de la historia. La evaluación es EFDS-1157 y todavía no
   * existe, así que esto queda expuesto y probado a la espera de que la
   * consuma, en vez de duplicar la regla cuando llegue.
   */
  async exigirComiteParaEvaluar(procesoId: string, em?: EntityManager) {
    const comite = await this.comiteVigente(procesoId, em);

    if (!comite) {
      throw new ConflictException(
        'El proceso no tiene comité evaluador designado: la evaluación no puede iniciarse sin él',
      );
    }

    return comite;
  }

  private async dimensionesEnElComite(comiteId: string, acceso: HiringAccess) {
    const personaId = await this.personaDelUsuario(acceso.userId);
    if (!personaId) return [];

    const miembros = await this.dataSource
      .getRepository(MiembroComite)
      .find({ where: { comiteId, personaId } });

    return miembros.map((m) => m.rol);
  }

  /**
   * La persona del directorio detrás de la cuenta que consulta.
   *
   * `auth.user.id_person` es lo que enlaza la cuenta con la persona a la que el
   * memorando designó. Se consulta en crudo y no por una entidad porque
   * `auth.user` es de otro equipo: mapearla aquí la volvería nuestra, y
   * cualquier cambio suyo de esquema rompería este servicio al arrancar.
   */
  private async personaDelUsuario(userId: string): Promise<string | null> {
    if (!userId) return null;

    const [fila] = await this.dataSource.query(
      `SELECT id_person FROM auth."user" WHERE id_user = $1`,
      [userId],
    );

    return fila?.id_person ?? null;
  }

  // ----------------------------------------------------------- auxiliares --

  /** El memorando ya se firmó; no se designa hacia el futuro. */
  private validarFecha(fecha: string) {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

    if (fecha > hoy) {
      throw new BadRequestException(
        'La fecha de designación no puede ser posterior a hoy: es la del memorando ya firmado',
      );
    }
  }

  /**
   * Una persona no repite el mismo rol dentro del comité.
   *
   * Sí puede llevar dos roles distintos: en una entidad pequeña es corriente
   * que quien evalúa lo técnico evalúe también lo financiero, y RF-SIS-02 no
   * dice que sean excluyentes. La restricción está también en la base; aquí se
   * comprueba para responder con un mensaje de negocio y no con un error de
   * llave duplicada.
   */
  private validarMiembros(dto: DesignarComiteDto) {
    const vistos = new Set<string>();

    for (const miembro of dto.miembros) {
      const clave = `${miembro.personaId}|${miembro.rol}`;
      if (vistos.has(clave)) {
        throw new BadRequestException(
          `${miembro.nombre} aparece dos veces como evaluador ${miembro.rol.toLowerCase()}`,
        );
      }
      vistos.add(clave);
    }
  }

  /**
   * Si la recepción cerró y con cuántas ofertas.
   *
   * Se leen las entidades de la actividad 6.1 en vez de llamar a su servicio: lo
   * que hace falta son dos datos, y pedirlos por el estado completo ataría esta
   * actividad a la forma de la respuesta de la otra.
   */
  private async estadoDeLaRecepcion(em: EntityManager, procesoId: string) {
    const recepcion = await em.getRepository(RecepcionOfertas).findOne({ where: { procesoId } });

    if (!recepcion) return { recepcionCerrada: false, totalOferentes: 0 };

    const totalOferentes = await em
      .getRepository(Oferente)
      .count({ where: { recepcionId: recepcion.id } });

    return { recepcionCerrada: recepcion.estado === 'CERRADA', totalOferentes };
  }

  private async exigirQueAplique(em: EntityManager, proceso: Proceso) {
    const excluida = await em.getRepository(ActividadExcluida).findOne({
      where: { numeral: NUMERAL_COMITE, modalidad: proceso.modalidad ?? '' },
    });
    if (excluida) {
      throw new BadRequestException(
        `Esta modalidad no designa comité evaluador: ${excluida.motivo}`,
      );
    }
  }

  private comiteVigente(procesoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager
      .getRepository(ComiteEvaluador)
      .findOne({ where: { procesoId, estado: 'VIGENTE' } });
  }

  private miembrosDe(em: EntityManager, comiteId: string) {
    return em.getRepository(MiembroComite).find({
      where: { comiteId },
      order: { rol: 'ASC', nombre: 'ASC' },
    });
  }

  /**
   * La actividad se cumple cuando hay comité vigente.
   *
   * Al revocar vuelve a quedar en curso: el proceso se queda sin quién evalúe
   * hasta que se designe otro, y el riel tiene que decirlo.
   */
  private async marcarActividad(em: EntityManager, procesoId: string, acceso: HiringAccess) {
    const aprobado = !!(await this.comiteVigente(procesoId, em));
    const estado = aprobado ? 'APROBADO' : 'BORRADOR';

    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_COMITE },
    });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_COMITE,
          estado: estado as any,
          datos: {},
          ...(aprobado ? { revisadoPor: acceso.userName, revisadoAt: new Date() } : {}),
        }),
      );
      return;
    }

    actividad.estado = estado as any;
    actividad.revisadoPor = aprobado ? acceso.userName : null;
    actividad.revisadoAt = aprobado ? new Date() : null;
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
        numeral: NUMERAL_COMITE,
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
        entidad: 'comite_evaluador',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
