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
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { HiringAccess } from '../../auth/hiring-access';
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
  constructor(private readonly dataSource: DataSource) {}

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

    return {
      numeral,
      etapa: parametro.etapa,
      exigeSoporte: parametro.exigeSoporte,
      // Se dice en la pantalla: una exigencia sin confirmar no se presenta como
      // si viniera de la norma.
      exigenciaConfirmada: parametro.confirmado,
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
        exigeSoporte: parametro.exigeSoporte,
        hoy: new Date().toISOString().slice(0, 10),
      });
      if (falta) throw new BadRequestException(falta);

      const yaHay = await em.getRepository(RegistroActividad).findOne({
        where: { procesoId, numeral, estado: 'VIGENTE' },
      });
      if (yaHay) {
        throw new BadRequestException(
          `La actividad ${numeral} ya tiene un registro vigente. Anúlelo antes de registrar otro.`,
        );
      }

      const documento = archivo
        ? await this.guardarSoporte(em, procesoId, numeral, archivo, hash as string, acceso)
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

      await this.marcarActividad(em, procesoId, numeral, true, acceso);
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

  private async guardarSoporte(
    em: EntityManager,
    procesoId: string,
    numeral: string,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    const expediente = await em.findOne(Expediente, { where: { procesoId } });
    if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

    return em.save(
      em.create(Documento, {
        expedienteId: expediente.id,
        numeral,
        tipo: 'ADJUNTO',
        nombre: `Soporte de la actividad ${numeral}`,
        archivoUrl: `hiring/files/${archivo.filename}`,
        archivoNombreOriginal: archivo.originalname,
        archivoMimeType: archivo.mimetype,
        archivoTamano: archivo.size,
        hashSha256: hash,
        subidoPor: acceso.userName,
      } as Partial<Documento>),
    );
  }

  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    numeral: string,
    cumplida: boolean,
    acceso: HiringAccess,
  ) {
    const actividad = await em
      .getRepository(ProcesoActividad)
      .findOne({ where: { procesoId, numeral } });

    const estado = cumplida ? 'APROBADO' : 'BORRADOR';

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral,
          estado: estado as any,
          datos: {},
          ...(cumplida ? { revisadoPor: acceso.userName, revisadoAt: new Date() } : {}),
        }),
      );
      return;
    }

    actividad.estado = estado as any;
    actividad.revisadoPor = cumplida ? acceso.userName : (null as any);
    actividad.revisadoAt = cumplida ? new Date() : (null as any);
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
