import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ComisionadoEntity } from '../../entities/comisionado.entity';
import { SolicitudComisionEntity } from '../../entities/solicitud-comision.entity';
import { DocumentoSoporteEntity } from '../../entities/documento-soporte.entity';
import { CreateSolicitudDto } from '../../dto/create-solicitud.dto';
import { UploadDocumentoDto } from '../../dto/upload-documento.dto';
import { sanitizeObjetoComision } from '../../common/sanitize.util';
import { getClientIp } from '../../common/ip.util';
import { ConfigService } from '../config/config.service';
import { ConfigTipoComisionadoEntity } from '../../entities/config/config-tipo-comisionado.entity';

function esDiaHabil(fecha: Date): boolean {
  const dia = fecha.getDay();
  return dia !== 0 && dia !== 6;
}

function contarDiasHabilesEntre(fechaInicio: Date, fechaFin: Date): number {
  let count = 0;
  const fecha = new Date(fechaInicio);
  while (fecha <= fechaFin) {
    if (esDiaHabil(fecha)) {
      count++;
    }
    fecha.setDate(fecha.getDate() + 1);
  }
  return count;
}

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
    private readonly configService: ConfigService,
  ) {}

  async obtenerSolicitudes(usuarioId?: string, isSuperAdmin = false, page = 1, limit = 20): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    console.log('[travel-expenses] service obtenerSolicitudes usuarioId=', usuarioId, 'isSuperAdmin=', isSuperAdmin, 'page=', page, 'limit=', limit);
    const query = this.solicitudRepo.createQueryBuilder('s')
      .leftJoinAndSelect('s.comisionado', 'comisionado');

    if (!isSuperAdmin && usuarioId) {
      query.andWhere('s.creadoPorUsuarioId = :usuarioId', { usuarioId });
    }

    query.orderBy('s.extemporanea', 'DESC')
      .addOrderBy('s.estadoSolicitud', 'ASC')
      .addOrderBy('s.creadoEn', 'DESC');

    const total = await query.getCount();
    const solicitudes = await query.offset((page - 1) * limit).limit(limit).getMany();
    console.log('[travel-expenses] service obtenerSolicitudes count=', solicitudes.length, 'total=', total);

    const data = solicitudes.map((s) => ({
      id: s.id,
      consecutivoUnico: s.consecutivoUnico,
      comisionadoId: s.comisionadoId,
      comisionado: s.comisionado
        ? {
            id: s.comisionado.id,
            numeroDocumento: s.comisionado.numeroDocumento,
            primerNombre: s.comisionado.primerNombre,
            segundoNombre: s.comisionado.segundoNombre,
            primerApellido: s.comisionado.primerApellido,
            segundoApellido: s.comisionado.segundoApellido,
            tipoComisionado: s.comisionado.tipoComisionado,
            email: s.comisionado.email,
            telefonoContacto: s.comisionado.telefonoContacto,
            autorizacionHabeasData: s.comisionado.autorizacionHabeasData,
          }
        : null,
      destinoCiudad: s.destinoCiudad,
      destinoDepartamento: s.destinoDepartamento,
      fechaInicio: s.fechaInicio.toISOString(),
      fechaFin: s.fechaFin.toISOString(),
      objetoComision: s.objetoComision,
      prioridad: s.prioridad,
      rubroPresupuestal: s.rubroPresupuestal,
      requiereTiquetes: s.requiereTiquetes,
      montoViaticos: Number(s.montoViaticos || 0),
      montoGastosViaje: Number(s.montoGastosViaje || 0),
      diasComision: s.diasComision ?? 1,
      estadoSolicitud: s.estadoSolicitud,
      radicadoFueraJornada: s.radicadoFueraJornada,
      extemporanea: s.extemporanea,
      creadoEn: s.creadoEn.toISOString(),
      actualizadoEn: s.actualizadoEn.toISOString(),
      creadoPorUsuarioId: s.creadoPorUsuarioId,
      esCreadoPorMi: isSuperAdmin ? s.creadoPorUsuarioId === usuarioId : undefined,
    }));

    return { data, total, page, limit };
  }

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

    const hoy = new Date();
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(
      hoy.getDate(),
    ).padStart(2, '0')}`;
    if (dto.fechaInicio < hoyStr) {
      throw new BadRequestException('La fecha de inicio no puede ser anterior a la fecha actual.');
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

    const diasHabilesAnticipacion = contarDiasHabilesEntre(ahora, fechaInicio);
    const extemporanea = diasHabilesAnticipacion < 14;

    let consecutivoUnico = '';
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

    const estadoSolicitud = extemporanea ? 'EXTEMPORANEA' : 'RADICADA';

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
      montoViaticos: dto.montoViaticos ?? 0,
      montoGastosViaje: dto.montoGastosViaje ?? 0,
      diasComision: dto.diasComision ?? 1,
      estadoSolicitud: estadoSolicitud,
      radicadoFueraJornada: radicadoFueraJornada,
      extemporanea: extemporanea,
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

  async obtenerParametrizacionFormulario(): Promise<{
    campos: any[];
    configuraciones: Record<string, ConfigTipoComisionadoEntity>;
  }> {
    const [campos, configs] = await Promise.all([
      this.configService.obtenerCamposFormulario(),
      this.configService.obtenerTodasConfiguraciones(),
    ]);

    const configuraciones: Record<string, ConfigTipoComisionadoEntity> = {};
    for (const config of configs) {
      configuraciones[config.tipoComisionado] = config;
    }

    return { campos, configuraciones };
  }

  async obtenerParametrizacionPorCodigoFormulario(codigoFormulario: string): Promise<ConfigTipoComisionadoEntity | null> {
    return this.configService.obtenerConfiguracionPorCodigoFormulario(codigoFormulario);
  }

  async validarDocumentosRequeridos(
    tipoComisionado: string,
    tiposDocumentos: string[],
  ): Promise<{ faltantes: string[] }> {
    const config = await this.configService.obtenerConfiguracionPorTipo(tipoComisionado);
    if (!config) {
      return { faltantes: [] };
    }

    const codigosObligatorios = (config.documentos || [])
      .filter((d) => d.tipoRequisito === 'OBLIGATORIO')
      .map((d) => d.tipoDocumentoSoporte?.codigo)
      .filter((codigo): codigo is string => Boolean(codigo));

    const faltantes = codigosObligatorios.filter((req) => !tiposDocumentos.includes(req));

    return { faltantes };
  }

  async validarCamposObligatorios(
    tipoComisionado: string,
    datosFormulario: Record<string, any>,
  ): Promise<{ camposFaltantes: string[] }> {
    const config = await this.configService.obtenerConfiguracionPorTipo(tipoComisionado);
    if (!config) {
      return { camposFaltantes: [] };
    }

    const camposFaltantes = config.camposObligatorios.filter((campo) => {
      const valor = datosFormulario[campo];
      if (valor === undefined || valor === null || valor === '') {
        return true;
      }
      if (Array.isArray(valor) && valor.length === 0) {
        return true;
      }
      return false;
    });

    return { camposFaltantes };
  }
}
