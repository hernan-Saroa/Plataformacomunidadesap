import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import {
  ActividadConSoporte,
  RegistroActividad,
} from '../../entities/registro-actividad.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { Plantilla } from '../../entities/plantilla.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { AprobacionService } from '../aprobacion/aprobacion.service';
import { admiteRegistro, faltaParaRegistrar } from './admite-registro';
import { AnularRegistroDto, RegistrarActividadDto } from './dto/registro-actividad.dto';

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Registro con soporte de las actividades sin historia propia (migración 051).
 *
 * Un solo servicio para las once. Lo que las distingue —qué documento produce
 * el sorteo, qué informa la 6.7— no cambia lo que la plataforma hace con ellas:
 * dejar constancia de que ocurrieron y de con qué se respaldan. Modelarlas por
 * separado habría multiplicado por once el mismo código sin agregar una regla.
 */
@Injectable()
export class RegistroActividadService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly aprobacion: AprobacionService,
  ) {}

  /**
   * Si la actividad tiene un formato del SIG asignado que le aplique.
   *
   * Un formato asignado exige el documento por sí solo, sin regla aparte: «el
   * sistema ofrece el que corresponde y controla que el documento firmado se
   * adjunte», dice la entidad. Pedir además una regla era el segundo paso que
   * nadie daba —hay cuatro formatos asignados y una sola regla, ambos sobre la
   * misma actividad, y treinta y siete actividades sin ninguna de las dos.
   *
   * El formato sin archivo subido cuenta igual: lo que obliga es que el
   * documento se entregue, no que Contratación ya haya publicado la plantilla.
   */
  private async tieneFormatoAsignado(
    em: EntityManager,
    numeral: string,
    modalidad: string | null,
  ): Promise<boolean> {
    return (await this.formatosAplicables(em, numeral, modalidad)).length > 0;
  }

  /**
   * Si queda algún formato de la actividad sin entregar.
   *
   * Es lo que decide si el formulario pide soporte: exigirlo por el solo hecho
   * de que exista el formato dejaba atascada la corrección de una actividad
   * devuelta, cuyo documento ya estaba cargado.
   */
  private async formatoPendiente(
    em: EntityManager,
    procesoId: string,
    numeral: string,
    modalidad: string | null,
  ): Promise<boolean> {
    const formatos = await this.formatosAplicables(em, numeral, modalidad);
    if (!formatos.length) return false;

    const expediente = await em.findOne(Expediente, { where: { procesoId } });
    if (!expediente) return true;

    const entregados = await em.getRepository(Documento).find({
      where: { expedienteId: expediente.id, numeral, tipo: 'ADJUNTO' },
    });

    return formatos.some((f) => !entregados.some((d) => d.plantillaId === f.id));
  }

  /**
   * Los formatos que esta actividad pide para esta modalidad.
   *
   * Alcance vacío significa todas; si el formato declara modalidades, la de
   * este proceso tiene que estar. Es el mismo criterio con el que se listan.
   */
  private async formatosAplicables(
    em: EntityManager,
    numeral: string,
    modalidad: string | null,
  ): Promise<Plantilla[]> {
    const formatos = await em.getRepository(Plantilla).find({
      where: { numeral, activo: true },
      order: { codigo: 'ASC' },
    });

    return formatos.filter(
      (f) =>
        f.modalidades.length === 0 || (modalidad !== null && f.modalidades.includes(modalidad)),
    );
  }

  // -------------------------------------------------------------- consulta --

  async estado(procesoId: string, numeral: string) {
    const em = this.dataSource.manager;
    const proceso = await this.exigirProceso(em, procesoId);
    const parametro = await this.exigirActividad(em, numeral);

    const excluida = await em.getRepository(ActividadExcluida).findOne({
      where: { numeral, modalidad: proceso.modalidad ?? '' },
    });

    const vigente = await em.getRepository(RegistroActividad).findOne({
      where: { procesoId, numeral, estado: 'VIGENTE' },
    });

    const anulados = await em.getRepository(RegistroActividad).find({
      where: { procesoId, numeral, estado: 'ANULADO' },
      order: { registradoAt: 'DESC' },
    });

    const soporte = vigente?.documentoId
      ? await em.getRepository(Documento).findOne({ where: { id: vigente.documentoId } })
      : null;

    /*
     * Quién pide el soporte, y si todavía hace falta.
     *
     * Dos exigencias apuntan al mismo papel: la de esta tabla, marcada por el
     * equipo, y la del formato asignado en la biblioteca. Sumarlas pedía el
     * documento dos veces —el formulario por un lado y el bloque de formatos
     * por otro—, y al corregir una actividad devuelta el botón de registrar
     * quedaba muerto porque reclamaba un archivo que ya estaba cargado.
     *
     * Donde hay formato manda el formato: si ya se entregó, no hay nada
     * pendiente. Donde no lo hay, la exigencia de la tabla sigue sola.
     */
    const conFormato = await this.tieneFormatoAsignado(em, numeral, proceso.modalidad ?? null);
    const pendientePorFormato = conFormato
      ? await this.formatoPendiente(em, procesoId, numeral, proceso.modalidad ?? null)
      : false;

    return {
      numeral,
      etapa: parametro.etapa,
      exigeSoporte: conFormato ? pendientePorFormato : parametro.exigeSoporte,
      // Se dice en la pantalla: una exigencia sin confirmar no se presenta como
      // si viniera de la norma. Un formato asignado sí es decisión del área
      // —alguien entró a la biblioteca y lo puso en esta actividad—, así que
      // presentarlo como pendiente de confirmar sería decir algo falso.
      exigenciaConfirmada:
        parametro.confirmado ||
        (await this.tieneFormatoAsignado(em, numeral, proceso.modalidad ?? null)),
      notaFuente: parametro.notaFuente,
      aplica: !excluida,
      motivoNoAplica: excluida?.motivo ?? null,
      registro: vigente
        ? {
            id: vigente.id,
            fecha: vigente.fecha,
            nota: vigente.nota,
            datos: vigente.datos,
            registradoPor: vigente.registradoPor,
            registradoAt: vigente.registradoAt,
            soporte: soporte
              ? { nombre: soporte.nombre, url: `/hiring/documentos/${soporte.id}/descargar` }
              : null,
          }
        : null,
      historial: anulados.map((r) => ({
        fecha: r.fecha,
        nota: r.nota,
        anuladoAt: r.anuladoAt,
        anuladoPor: r.anuladoPor,
        motivoAnulacion: r.motivoAnulacion,
      })),
    };
  }

  // ------------------------------------------------------------- escritura --

  async registrar(
    procesoId: string,
    numeral: string,
    dto: RegistrarActividadDto,
    archivo: ArchivoCargado | null,
    hash: string | null,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      const parametro = await this.exigirActividad(em, numeral);

      const excluida = await em.getRepository(ActividadExcluida).findOne({
        where: { numeral, modalidad: proceso.modalidad ?? '' },
      });
      if (excluida) {
        throw new BadRequestException(
          `Esta modalidad no adelanta la actividad ${numeral}: ${excluida.motivo}`,
        );
      }

      const falta = faltaParaRegistrar({
        fecha: dto.fecha,
        nota: dto.nota,
        tieneSoporte: archivo !== null,
        // El formato asignado exige igual que la matriz: si se comprobara solo
        // al consultar, la pantalla pediría el soporte y el servicio lo dejaría
        // pasar, que es la peor de las dos respuestas.
        // La misma regla que al consultar: donde hay formato manda el formato.
        // Si difirieran, la pantalla dejaría registrar y el servicio no.
        exigeSoporte: (await this.tieneFormatoAsignado(em, numeral, proceso.modalidad ?? null))
          ? await this.formatoPendiente(em, procesoId, numeral, proceso.modalidad ?? null)
          : parametro.exigeSoporte,
        hoy: new Date().toISOString().slice(0, 10),
      });
      if (falta) throw new BadRequestException(falta);

      const yaHay = await em.getRepository(RegistroActividad).findOne({
        where: { procesoId, numeral, estado: 'VIGENTE' },
      });
      if (yaHay) {
        /*
         * Devuelta: el registro anterior se anula solo y este lo reemplaza.
         *
         * La pantalla le dice al gestor «corrige lo señalado y vuelve a
         * registrar la actividad», pero el registro vigente se lo impedía y la
         * actividad quedaba atascada en DEVUELTO sin salida: ni podía
         * reenviarla ni el revisor tenía qué resolver. Pedirle que anule a
         * mano lo que el revisor acaba de rechazar es un paso que no aporta.
         *
         * Fuera de ese caso la regla sigue: un registro vigente se anula antes
         * de poner otro, para que el expediente diga por qué cambió.
         */
        const actividadPrevia = await em.getRepository(ProcesoActividad).findOne({
          where: { procesoId, numeral },
        });

        if (actividadPrevia?.estado !== 'DEVUELTO') {
          throw new BadRequestException(
            `La actividad ${numeral} ya tiene un registro vigente. Anúlelo antes de registrar otro.`,
          );
        }

        yaHay.estado = 'ANULADO';
        yaHay.anuladoPor = acceso.userName;
        yaHay.anuladoAt = new Date();
        yaHay.motivoAnulacion = 'Se corrigió tras la devolución del revisor';
        await em.save(RegistroActividad, yaHay);
      }

      const documento = archivo
        ? await this.guardarSoporte(
            em,
            procesoId,
            numeral,
            archivo,
            hash as string,
            acceso,
            proceso.modalidad ?? null,
          )
        : null;

      const registro = await em.save(
        em.create(RegistroActividad, {
          procesoId,
          numeral,
          fecha: dto.fecha,
          nota: dto.nota,
          documentoId: documento?.id ?? null,
          datos: dto.datos ?? {},
          estado: 'VIGENTE',
          registradoPor: acceso.userName,
        } as Partial<RegistroActividad>),
      );

      await this.marcarActividad(
        em,
        procesoId,
        numeral,
        true,
        acceso,
        proceso.modalidad ?? null,
      );
      await this.traza(
        em,
        procesoId,
        registro.id,
        'GUARDAR',
        { numeral, fecha: dto.fecha, conSoporte: documento !== null },
        acceso,
      );
    });

    return this.estado(procesoId, numeral);
  }

  /**
   * Anular y no borrar, como el resto del módulo: lo que se corrigió queda a la
   * vista. La actividad vuelve al riel en BORRADOR, porque dejar de tener
   * constancia es dejar de estar cumplida.
   */
  async anular(procesoId: string, numeral: string, dto: AnularRegistroDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      await this.exigirProceso(em, procesoId);
      await this.exigirActividad(em, numeral);

      const vigente = await em.getRepository(RegistroActividad).findOne({
        where: { procesoId, numeral, estado: 'VIGENTE' },
      });
      if (!vigente) {
        throw new NotFoundException(`La actividad ${numeral} no tiene un registro vigente`);
      }

      vigente.estado = 'ANULADO';
      vigente.anuladoAt = new Date();
      vigente.anuladoPor = acceso.userName;
      vigente.motivoAnulacion = dto.motivo;
      await em.save(vigente);

      await this.marcarActividad(em, procesoId, numeral, false, acceso);
      await this.traza(em, procesoId, vigente.id, 'ANULAR', { numeral, motivo: dto.motivo }, acceso);
    });

    return this.estado(procesoId, numeral);
  }

  // ---------------------------------------------------------------- apoyos --

  private async exigirProceso(em: EntityManager, procesoId: string) {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');
    return proceso;
  }

  private async exigirActividad(em: EntityManager, numeral: string) {
    if (!admiteRegistro(numeral)) {
      throw new BadRequestException(
        `La actividad ${numeral} no se cumple por registro: tiene su propio trámite en la plataforma.`,
      );
    }

    const parametro = await em.getRepository(ActividadConSoporte).findOne({ where: { numeral } });
    if (!parametro) {
      throw new NotFoundException(`La actividad ${numeral} no está parametrizada`);
    }
    return parametro;
  }

  /**
   * Guarda el soporte que pide el formulario de la actividad.
   *
   * Si la actividad tiene formatos asignados, el soporte cumple el primero que
   * siga pendiente. Sin esa atadura el documento quedaba suelto: el requisito
   * del formato seguía sin cumplirse, el bloque de abajo volvía a pedir el
   * mismo papel —la doble carga que se veía en pantalla— y la actividad podía
   * aprobarse con el formato en blanco.
   */
  private async guardarSoporte(
    em: EntityManager,
    procesoId: string,
    numeral: string,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
    modalidad: string | null,
  ) {
    const expediente = await em.findOne(Expediente, { where: { procesoId } });
    if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

    const formatos = await this.formatosAplicables(em, numeral, modalidad);
    const entregados = formatos.length
      ? await em.getRepository(Documento).find({
          where: { expedienteId: expediente.id, numeral, tipo: 'ADJUNTO' },
        })
      : [];
    const pendiente = formatos.find(
      (f) => !entregados.some((d) => d.plantillaId === f.id),
    );

    return em.save(
      em.create(Documento, {
        expedienteId: expediente.id,
        numeral,
        tipo: 'ADJUNTO',
        nombre: pendiente?.nombre ?? `Soporte de la actividad ${numeral}`,
        archivoUrl: `hiring/files/${archivo.filename}`,
        archivoNombreOriginal: archivo.originalname,
        archivoMimeType: archivo.mimetype,
        archivoTamano: archivo.size,
        hashSha256: hash,
        plantillaId: pendiente?.id ?? null,
        subidoPor: acceso.userName,
      } as Partial<Documento>),
    );
  }

  /**
   * En qué estado queda la actividad al registrarla.
   *
   * El registro es el único punto que sabe si el trabajo está hecho: comprueba
   * la fecha, la nota y el soporte antes de guardar. Por eso es el que decide,
   * y no un envío aparte que no comprueba nada.
   *
   * Si la matriz le configuró aprobadores, el registro la deja EN_REVISION y
   * quien decide la encuentra en su bandeja. Si no, la cierra en APROBADO como
   * hasta ahora, que es la otra forma de terminar que existe: donde nadie
   * revisa, el propio registro es el cierre.
   *
   * Antes se cerraba siempre en APROBADO, hubiera o no quien revisara, así que
   * una actividad con aprobador configurado se daba por buena sin que nadie la
   * mirara y el envío quedaba como un paso que ya no cambiaba nada.
   */
  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    numeral: string,
    cumplida: boolean,
    acceso: HiringAccess,
    modalidad: string | null = null,
  ) {
    const actividad = await em
      .getRepository(ProcesoActividad)
      .findOne({ where: { procesoId, numeral } });

    const revisan = cumplida
      ? await this.aprobacion.aprobadoresDe(numeral, modalidad, em)
      : null;
    const estado = !cumplida ? 'BORRADOR' : revisan ? 'EN_REVISION' : 'APROBADO';

    // Solo quien revisa aprueba: en EN_REVISION nadie ha decidido todavía, y
    // sellar ahí al gestor como revisor sería firmar en nombre de otro.
    const cierra = cumplida && !revisan;

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral,
          estado: estado as any,
          datos: {},
          ...(cumplida ? { enviadoPor: acceso.userName } : {}),
          ...(cierra ? { revisadoPor: acceso.userName, revisadoAt: new Date() } : {}),
        }),
      );
      return;
    }

    actividad.estado = estado as any;
    if (cumplida) {
      actividad.enviadoPor = acceso.userName;
      (actividad as any).enviadoPorId = acceso.userId;
    }
    actividad.revisadoPor = cierra ? acceso.userName : (null as any);
    actividad.revisadoAt = cierra ? new Date() : (null as any);
    await em.save(actividad);
  }

  private async traza(
    em: EntityManager,
    procesoId: string,
    entidadId: string,
    accion: 'GUARDAR' | 'ANULAR',
    detalle: Record<string, unknown>,
    acceso: HiringAccess,
  ) {
    await em.save(
      em.create(Trazabilidad, {
        procesoId,
        entidadId,
        entidad: 'registros_actividad',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}
