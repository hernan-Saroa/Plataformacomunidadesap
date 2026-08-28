import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ComisionadoEntity } from '../../entities/comisionado.entity';
import { SolicitudComisionEntity } from '../../entities/solicitud-comision.entity';
import { DocumentoSoporteEntity } from '../../entities/documento-soporte.entity';
import { CreateSolicitudDto } from '../dto/create-solicitud.dto';
import { UploadDocumentoDto } from '../dto/upload-documento.dto';
import { sanitizeObjetoComision } from '../../common/sanitize.util';
import { getClientIp } from '../../common/ip.util';

@Injectable()
export class TravelExpensesService {
  constructor(
    @InjectRepository(ComisionadoEntity)
    private readonly comisionadoRepo: Repository<ComisionadoEntity>,
    @InjectRepository(SolicitudComisionEntity)
    private readonly solicitudRepo: Repository<SolicitudComisionEntity>,
    @InjectRepository(DocumentoSoporteEntity)
    private readonly documentoRepo: Repository<DocumentoSoporteEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async consultarComisionado(documento: string): Promise<ComisionadoEntity | null> {
    const comisionado = await this.comisionadoRepo.findOne({
      where: { numeroDocumento: documento },
    });

    if (!comisionado) {
      return null;
    }

    return comisionado;
  }

  async crearSolicitud(dto: CreateSolicitudDto): Promise<SolicitudComisionEntity> {
    const comisionado = await this.comisionadoRepo.findOne({
      where: { id: dto.comisionadoId },
    });

    if (!comisionado) {
      throw new BadRequestException('Comisionado no encontrado.');
    }

    if (!comisionado.autorizacionHabeasData && !dto.aceptaHabeasData) {
      throw new BadRequestException(
        'Debe aceptar el tratamiento de datos semiprivados (email y teléfono) según Ley 1581 de 2012 y Sentencia T-254 de 2024.',
      );
    }

    if (!comisionado.autorizacionHabeasData && dto.aceptaHabeasData) {
      comisionado.autorizacionHabeasData = true;
      comisionado.fechaAutorizacionHabeasData = new Date();
      comisionado.ipRegistroHabeasData = dto.ipRegistroHabeasData || getClientIp({ headers: {} } as any);
      await this.comisionadoRepo.save(comisionado);
    }

    const objetoSanitizado = sanitizeObjetoComision(dto.objetoComision);
    if (objetoSanitizado.length === 0) {
      throw new BadRequestException('El objeto de la comisión debe contener al menos un carácter válido.');
    }

    const fechaInicio = new Date(dto.fechaInicio);
    const fechaFin = new Date(dto.fechaFin);

    if (fechaFin < fechaInicio) {
      throw new BadRequestException('La fecha fin no puede ser anterior a la fecha inicio.');
    }

    const solapamiento = await this.solicitudRepo
      .createQueryBuilder('s')
      .where('s.comisionado_id = :comisionadoId', { comisionadoId: dto.comisionadoId })
      .andWhere(
        `(s.fecha_inicio, s.fecha_fin) OVERLAPS (:fechaInicio, :fechaFin)`,
        { fechaInicio, fechaFin },
      )
      .getOne();

    if (solapamiento) {
      throw new ConflictException('El comisionado ya tiene una solicitud activa en el rango de fechas indicado.');
    }

    const ahora = new Date();
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
    const esFinDeSemana = ahora.getDay() === 0 || ahora.getDay() === 6;
    const radicadoFueraJornada = horaActual >= 16 * 60 + 30 || esFinDeSemana;

    let consecutivoUnico: string;
    await this.dataSource.transaction(async (manager) => {
      const maxSolicitud = await manager
        .getRepository(SolicitudComisionEntity)
        .createQueryBuilder('s')
        .select('MAX(s.consecutivo_unico)', 'max')
        .where('s.consecutivo_unico LIKE :pattern', { pattern: 'COM-2026-%' })
        .getRawOne();

      let nextNumber = 1;
      if (maxSolicitud?.max) {
        const match = maxSolicitud.max.match(/COM-2026-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      consecutivoUnico = `COM-2026-${String(nextNumber).padStart(4, '0')}`;
    });

    const solicitud = this.solicitudRepo.create({
      consecutivoUnico,
      comisionadoId: dto.comisionadoId,
      destinoCiudad: dto.destinoCiudad,
      destinoDepartamento: dto.destinoDepartamento,
      fechaInicio,
      fechaFin,
      objetoComision: objetoSanitizado,
      prioridad: dto.prioridad,
      rubroPresupuestal: dto.rubroPresupuestal,
      requiereTiquetes: dto.requiereTiquetes ?? false,
      estadoSolicitud: 'RADICADA',
      radicadoFueraJornada: radicadoFueraJornada,
      creadoPorUsuarioId: dto.creadoPorUsuarioId,
    });

    const saved = await this.solicitudRepo.save(solicitud);

    if (dto.documentos && dto.documentos.length > 0) {
      const documentos = dto.documentos.map((doc) => {
        const entity = this.documentoRepo.create({
          solicitudId: saved.id,
          tipoDocumento: doc.tipoDocumento,
          nombreArchivoOriginal: doc.nombreArchivoOriginal,
          nombreArchivoSeguro: doc.nombreArchivoSeguro,
          urlRepositorio: doc.urlRepositorio,
        });
        return entity;
      });

      await this.documentoRepo.save(documentos);
      saved.documentosSoporte = documentos;
    }

    const response: any = saved;
    if (radicadoFueraJornada) {
      response.warningMessage = 'El trámite iniciará el día hábil siguiente.';
    }

    return response;
  }

  async subirDocumento(solicitudId: string, dto: UploadDocumentoDto): Promise<DocumentoSoporteEntity> {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
    });

    if (!solicitud) {
      throw new BadRequestException('Solicitud no encontrada.');
    }

    const entity = this.documentoRepo.create({
      solicitudId,
      tipoDocumento: dto.tipoDocumento,
      nombreArchivoOriginal: dto.nombreArchivoOriginal,
      nombreArchivoSeguro: dto.nombreArchivoSeguro,
      urlRepositorio: dto.urlRepositorio,
    });

    return this.documentoRepo.save(entity);
  }
}
