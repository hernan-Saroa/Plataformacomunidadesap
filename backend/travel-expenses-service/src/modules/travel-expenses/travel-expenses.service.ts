import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ComisionadoEntity } from '../../entities/comisionado.entity';
import { SolicitudComisionEntity } from '../../entities/solicitud-comision.entity';
import { DocumentoSoporteEntity } from '../../entities/documento-soporte.entity';
import { EstadoSolicitud } from '../../entities/estado-solicitud.enum';
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

  async obtenerSolicitudes(
    usuarioId?: string,
    isSuperAdmin = false,
    page = 1,
    limit = 20,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    console.log(
      '[travel-expenses] service obtenerSolicitudes usuarioId=',
      usuarioId,
      'isSuperAdmin=',
      isSuperAdmin,
      'page=',
      page,
      'limit=',
      limit,
    );
    const query = this.solicitudRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.comisionado', 'comisionado');

    if (!isSuperAdmin && usuarioId) {
      query.andWhere('s.creadoPorUsuarioId = :usuarioId', { usuarioId });
    }

    query
      .orderBy('s.extemporanea', 'DESC')
      .addOrderBy('s.estadoSolicitud', 'ASC')
      .addOrderBy('s.creadoEn', 'DESC');

    const total = await query.getCount();
    const solicitudes = await query
      .offset((page - 1) * limit)
      .limit(limit)
      .getMany();
    console.log(
      '[travel-expenses] service obtenerSolicitudes count=',
      solicitudes.length,
      'total=',
      total,
    );

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
      esCreadoPorMi: isSuperAdmin
        ? s.creadoPorUsuarioId === usuarioId
        : undefined,
    }));

    return { data, total, page, limit };
  }

  async consultarComisionado(
    documento: string,
  ): Promise<ComisionadoEntity | null> {
    const comisionado = await this.comisionadoRepo.findOne({
      where: { numeroDocumento: documento },
    });

    if (!comisionado) {
      return null;
    }

    return comisionado;
  }

  async obtenerSolicitudCompleta(
    solicitudId: string,
  ): Promise<SolicitudComisionEntity> {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
      relations: ['comisionado', 'documentosSoporte'],
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    return solicitud;
  }

  async crearSolicitud(
    dto: CreateSolicitudDto,
  ): Promise<SolicitudComisionEntity> {
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
      comisionado.ipRegistroHabeasData =
        dto.ipRegistroHabeasData || getClientIp({ headers: {} } as any);
      await this.comisionadoRepo.save(comisionado);
    }

    const esBorrador = dto.modoBorrador === true;

    const datosFormulario: Record<string, any> = {
      objetoComision: dto.objetoComision,
      destinoCiudad: dto.destinoCiudad,
      destinoDepartamento: dto.destinoDepartamento,
      fechaInicio: dto.fechaInicio,
      fechaFin: dto.fechaFin,
      rubroPresupuestal: dto.rubroPresupuestal,
      prioridad: dto.prioridad,
      requiereTiquetes: dto.requiereTiquetes,
      montoViaticos: dto.montoViaticos,
      montoGastosViaje: dto.montoGastosViaje,
      diasComision: dto.diasComision,
    };

    const { camposFaltantes } = await this.validarCamposObligatorios(
      comisionado.tipoComisionado,
      datosFormulario,
    );

    if (camposFaltantes.length > 0) {
      throw new BadRequestException(
        `Faltan los siguientes campos obligatorios para el tipo de comisionado ${comisionado.tipoComisionado}: ${camposFaltantes.join(', ')}`,
      );
    }

    const config =
      await this.configService.obtenerConfiguracionPorTipo(comisionado.tipoComisionado);
    const camposOcultos = new Set(config?.camposOcultos ?? []);
    const camposOpcionales = new Set(config?.camposOpcionales ?? []);

    const objetoSanitizado = sanitizeObjetoComision(dto.objetoComision ?? '');
    const objetoEsObligatorio =
      !camposOcultos.has('objetoComision') && !camposOpcionales.has('objetoComision');
    if (objetoEsObligatorio && objetoSanitizado.length === 0) {
      throw new BadRequestException(
        'El objeto de la comisión debe contener al menos un carácter válido.',
      );
    }

    const fechaInicioStr = dto.fechaInicio as string;
    const fechaFinStr = dto.fechaFin as string;
    const fechaInicio = new Date(fechaInicioStr);
    const fechaFin = new Date(fechaFinStr);

    if (fechaFin < fechaInicio) {
      throw new BadRequestException(
        'La fecha fin no puede ser anterior a la fecha inicio.',
      );
    }

    const hoy = new Date();
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(
      hoy.getDate(),
    ).padStart(2, '0')}`;
    if (fechaInicioStr < hoyStr) {
      throw new BadRequestException(
        'La fecha de inicio no puede ser anterior a la fecha actual.',
      );
    }

    let extemporanea = false;
    let radicadoFueraJornada = false;
    let estadoSolicitud: EstadoSolicitud;

    if (!esBorrador) {
      const solapamiento = await this.solicitudRepo
        .createQueryBuilder('s')
        .where('s.comisionado_id = :comisionadoId', {
          comisionadoId: dto.comisionadoId,
        })
        .andWhere(
          `(s.fecha_inicio, s.fecha_fin) OVERLAPS (:fechaInicio, :fechaFin)`,
          { fechaInicio, fechaFin },
        )
        .getOne();

      if (solapamiento) {
        throw new ConflictException(
          `Las fechas indicadas (${this.formatearFecha(fechaInicio)} a ${this.formatearFecha(fechaFin)}) se cruzan con la solicitud ${solapamiento.id} en estado ${solapamiento.estadoSolicitud} (${this.formatearFecha(solapamiento.fechaInicio)} a ${this.formatearFecha(solapamiento.fechaFin)}). Ajuste las fechas de esta comisión o cancele/radique la solicitud conflictiva antes de continuar.`,
        );
      }

      const ahora = new Date();
      const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
      const esFinDeSemana = ahora.getDay() === 0 || ahora.getDay() === 6;
      radicadoFueraJornada = horaActual >= 16 * 60 + 30 || esFinDeSemana;

      const diasHabilesAnticipacion = contarDiasHabilesEntre(ahora, fechaInicio);
      extemporanea = diasHabilesAnticipacion < 14;
      estadoSolicitud = extemporanea
        ? EstadoSolicitud.EXTEMPORANEA
        : EstadoSolicitud.RADICADA;
    } else {
      estadoSolicitud = EstadoSolicitud.PENDIENTE;
    }

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

    const solicitud = this.solicitudRepo.create({
      consecutivoUnico,
      comisionadoId: dto.comisionadoId,
      destinoCiudad: dto.destinoCiudad ?? '',
      destinoDepartamento: dto.destinoDepartamento ?? '',
      fechaInicio,
      fechaFin,
      objetoComision: objetoSanitizado,
      prioridad: dto.prioridad ?? 'BAJA',
      rubroPresupuestal: dto.rubroPresupuestal ?? '',
      requiereTiquetes: dto.requiereTiquetes ?? false,
      montoViaticos: dto.montoViaticos ?? 0,
      montoGastosViaje: dto.montoGastosViaje ?? 0,
      diasComision: dto.diasComision ?? 1,
       estadoSolicitud,
       radicadoFueraJornada,
       extemporanea,
       esInternacional: dto.esInternacional ?? false,
       tipoComision: dto.esInternacional ? 'INTERNACIONAL' : (dto.tipoComision ?? 'TERRESTRE'),
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
          tipoMime: doc.tipoMime ?? 'application/pdf',
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

  async subirDocumento(
    solicitudId: string,
    dto: UploadDocumentoDto,
  ): Promise<DocumentoSoporteEntity> {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
    });

    if (!solicitud) {
      throw new BadRequestException('Solicitud no encontrada.');
    }

    const file = dto.file;
    const nombreArchivoOriginal =
      (file ? file.originalname : undefined) || dto.nombreArchivoOriginal;

    const tipoMime =
      dto.tipoMime ||
      (file ? file.mimetype : undefined) ||
      this.inferirTipoMime(nombreArchivoOriginal || '');

    if (!this.esTipoMimePdf(tipoMime)) {
      throw new BadRequestException(
        `El documento "${nombreArchivoOriginal || dto.tipoDocumento}" debe estar en formato PDF.`,
      );
    }

    const nombreArchivoSeguro =
      (file ? file.filename : undefined) || dto.nombreArchivoSeguro;
    const urlRepositorio = file
      ? `/uploads/${solicitudId}/${file.filename}`
      : dto.urlRepositorio;

    const entity = this.documentoRepo.create({
      solicitudId,
      tipoDocumento: dto.tipoDocumento,
      nombreArchivoOriginal,
      nombreArchivoSeguro: nombreArchivoSeguro,
      urlRepositorio,
      tipoMime,
    });

    return this.documentoRepo.save(entity);
  }

  async obtenerChecklistDocumentos(
    tipoComisionado: string,
  ): Promise<{
     obligatorios: Array<{ codigo: string; nombre: string; descripcion: string | null }>;
     opcionales: Array<{ codigo: string; nombre: string; descripcion: string | null }>;
  }> {
    const config =
      await this.configService.obtenerConfiguracionPorTipo(tipoComisionado);
    if (!config || !config.documentos) {
      return { obligatorios: [], opcionales: [] };
    }

    const obligatorios = config.documentos
      .filter((d) => d.tipoRequisito === 'OBLIGATORIO')
      .map((d) => d.tipoDocumentoSoporte)
      .filter((d): d is NonNullable<typeof d> => Boolean(d))
      .map((d) => ({ codigo: d.codigo, nombre: d.nombre, descripcion: d.descripcion }));

    const opcionales = config.documentos
      .filter((d) => d.tipoRequisito === 'OPCIONAL')
      .map((d) => d.tipoDocumentoSoporte)
      .filter((d): d is NonNullable<typeof d> => Boolean(d))
      .map((d) => ({ codigo: d.codigo, nombre: d.nombre, descripcion: d.descripcion }));

    return { obligatorios, opcionales };
  }

  async finalizarSolicitud(
    solicitudId: string,
  ): Promise<SolicitudComisionEntity & { warningMessage?: string }> {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
      relations: ['comisionado'],
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    if (solicitud.estadoSolicitud !== EstadoSolicitud.PENDIENTE) {
      throw new BadRequestException(
        `La solicitud tiene estado ${solicitud.estadoSolicitud} y no puede finalizarse.`,
      );
    }

    const documentos = await this.documentoRepo.find({
      where: { solicitudId: solicitud.id },
    });

    const tipoChecklist = solicitud.esInternacional
      ? 'INTERNACIONAL'
      : solicitud.comisionado?.tipoComisionado;

    const { faltantes, noPdf } = await this.validarChecklistCompleto(
      tipoChecklist,
      documentos,
    );

    if (faltantes.length > 0) {
      throw new BadRequestException(
        `No se puede radicar la solicitud. Faltan por cargar los siguientes soportes obligatorios en PDF: ${faltantes.join(', ')}.`,
      );
    }

    if (noPdf.length > 0) {
      throw new BadRequestException(
        `Los siguientes soportes obligatorios deben estar en formato PDF: ${noPdf.join(', ')}.`,
      );
    }

    const fechaInicio = solicitud.fechaInicio;
    const fechaFin = solicitud.fechaFin;

    const solapamiento = await this.solicitudRepo
      .createQueryBuilder('s')
      .where('s.comisionado_id = :comisionadoId', {
        comisionadoId: solicitud.comisionadoId,
      })
      .andWhere('s.id <> :solicitudId', { solicitudId: solicitud.id })
      .andWhere(
        `(s.fecha_inicio, s.fecha_fin) OVERLAPS (:fechaInicio, :fechaFin)`,
        { fechaInicio, fechaFin },
      )
      .getOne();

    if (solapamiento) {
      throw new ConflictException(
        `Las fechas indicadas (${this.formatearFecha(fechaInicio)} a ${this.formatearFecha(fechaFin)}) se cruzan con la solicitud ${solapamiento.id} en estado ${solapamiento.estadoSolicitud} (${this.formatearFecha(solapamiento.fechaInicio)} a ${this.formatearFecha(solapamiento.fechaFin)}). Ajuste las fechas de esta comisión o cancele/radique la solicitud conflictiva antes de continuar.`,
      );
    }

    const ahora = new Date();
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
    const esFinDeSemana = ahora.getDay() === 0 || ahora.getDay() === 6;
    const radicadoFueraJornada = horaActual >= 16 * 60 + 30 || esFinDeSemana;

    const diasHabilesAnticipacion = contarDiasHabilesEntre(ahora, fechaInicio);
    const extemporanea = diasHabilesAnticipacion < 14;

    solicitud.estadoSolicitud = extemporanea
      ? EstadoSolicitud.EXTEMPORANEA
      : EstadoSolicitud.RADICADA;
    solicitud.extemporanea = extemporanea;
    solicitud.radicadoFueraJornada = radicadoFueraJornada;

    const saved = await this.solicitudRepo.save(solicitud);
    const response: any = {
      ...saved,
      documentosSoporte: documentos,
    };
    if (radicadoFueraJornada) {
      response.warningMessage = 'El trámite iniciará el día hábil siguiente.';
    }

    return response;
  }

  private inferirTipoMime(nombreArchivo: string): string {
    const extension = nombreArchivo.split('.').pop()?.toLowerCase() || '';
    if (extension === 'pdf') return 'application/pdf';
    return 'application/octet-stream';
  }

  private formatearFecha(fecha: Date): string {
    if (!fecha) return 'N/D';
    return new Date(fecha).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private async validarChecklistCompleto(
    tipoComisionado: string,
    documentos: DocumentoSoporteEntity[],
  ): Promise<{ faltantes: string[]; noPdf: string[] }> {
    const config =
      await this.configService.obtenerConfiguracionPorTipo(
        tipoComisionado,
      );
    if (!config || !config.documentos) {
      return { faltantes: [], noPdf: [] };
    }

    const obligatorios = config.documentos
      .filter((d) => d.tipoRequisito === 'OBLIGATORIO')
      .map((d) => d.tipoDocumentoSoporte?.codigo)
      .filter((codigo): codigo is string => Boolean(codigo));

    const tiposCargados = documentos.map((d) => d.tipoDocumento);
    const faltantes = obligatorios.filter(
      (req) => !tiposCargados.includes(req),
    );

    const documentosPorTipo = new Map<string, DocumentoSoporteEntity[]>();
    for (const doc of documentos) {
      const lista = documentosPorTipo.get(doc.tipoDocumento) || [];
      lista.push(doc);
      documentosPorTipo.set(doc.tipoDocumento, lista);
    }

    const noPdf: string[] = [];
    for (const codigo of obligatorios) {
      const docs = documentosPorTipo.get(codigo) || [];
      if (docs.some((d) => !this.esTipoMimePdf(d.tipoMime))) {
        noPdf.push(codigo);
      }
    }

    return { faltantes, noPdf };
  }

  private esTipoMimePdf(tipoMime: string): boolean {
    if (!tipoMime) return false;
    const mime = tipoMime.toLowerCase();
    return (
      mime === 'application/pdf' ||
      mime === 'pdf' ||
      mime.endsWith('/pdf')
    );
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

  async obtenerParametrizacionPorCodigoFormulario(
    codigoFormulario: string,
  ): Promise<ConfigTipoComisionadoEntity | null> {
    return this.configService.obtenerConfiguracionPorCodigoFormulario(
      codigoFormulario,
    );
  }

  async validarDocumentosRequeridos(
    tipoComisionado: string,
    tiposDocumentos: string[],
  ): Promise<{ faltantes: string[] }> {
    const config =
      await this.configService.obtenerConfiguracionPorTipo(tipoComisionado);
    if (!config) {
      return { faltantes: [] };
    }

    const codigosObligatorios = (config.documentos || [])
      .filter((d) => d.tipoRequisito === 'OBLIGATORIO')
      .map((d) => d.tipoDocumentoSoporte?.codigo)
      .filter((codigo): codigo is string => Boolean(codigo));

    const faltantes = codigosObligatorios.filter(
      (req) => !tiposDocumentos.includes(req),
    );

    return { faltantes };
  }

  async validarCamposObligatorios(
    tipoComisionado: string,
    datosFormulario: Record<string, any>,
  ): Promise<{ camposFaltantes: string[] }> {
    const config =
      await this.configService.obtenerConfiguracionPorTipo(tipoComisionado);
    if (!config) {
      return { camposFaltantes: [] };
    }

    const camposOpcionales = new Set(config.camposOpcionales ?? []);
    const camposOcultos = new Set(config.camposOcultos ?? []);

    const camposEfectivamenteObligatorios = config.camposObligatorios.filter(
      (campo) => !camposOpcionales.has(campo) && !camposOcultos.has(campo),
    );

    const camposFaltantes = camposEfectivamenteObligatorios.filter((campo) => {
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

  async exportarFormato023(solicitudId: string): Promise<Buffer> {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id: solicitudId },
      relations: ['comisionado', 'documentosSoporte'],
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    const comisionado = solicitud.comisionado;
    const PDFDocument = require('pdfkit');

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'letter' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const drawHeader = () => {
        doc.fontSize(10).font('Helvetica-Bold');
        doc.fillColor('#003DA5');
        doc.text('ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP', { align: 'center' });
        doc.fontSize(9).font('Helvetica');
        doc.fillColor('#333333');
        doc.text('Sede Nacional - Bogotá - Calle 44 No. 53-37 CAN', { align: 'center' });
        doc.text('PBX: +57 (1) 220 2790 · www.esap.edu.co', { align: 'center' });
        doc.moveDown(0.5);

        doc.strokeColor('#003DA5').lineWidth(2).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
        doc.moveDown(1);
      };

      const       drawTitle = () => {
        doc.fillColor('#003DA5').fontSize(14).font('Helvetica-Bold');
        doc.text('FORMATO 023 — SOLICITUD DE COMISIÓN DE VIÁTICOS', { align: 'center' });
        doc.fontSize(10).font('Helvetica');
        doc.fillColor('#666666');
        doc.text('Código: EM-FO-023 · Versión: 1 · Fecha: 01/Ene/2026', { align: 'center' });
        doc.moveDown(1);
      };

      const drawSectionTitle = (title: string) => {
        doc.moveDown(0.5);
        doc.fillColor('#003DA5').fontSize(11).font('Helvetica-Bold');
        doc.text(title);
        doc.strokeColor('#CCCCCC').lineWidth(0.5).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
        doc.moveDown(0.5);
      };

      const drawField = (label: string, value: string) => {
        doc.fillColor('#333333').fontSize(9).font('Helvetica-Bold');
        doc.text(`${label}: `, { continued: true });
        doc.font('Helvetica').fillColor('#000000');
        doc.text(value || 'N/A');
      };

      const drawMultiLineField = (label: string, value: string) => {
        doc.fillColor('#333333').fontSize(9).font('Helvetica-Bold');
        doc.text(`${label}:`);
        doc.moveDown(0.3);
        doc.font('Helvetica').fillColor('#000000');
        doc.text(value || 'N/A', {
          width: 512,
          align: 'justify',
        });
        doc.moveDown(0.3);
      };

      const formatDate = (date: Date | string): string => {
        const d = new Date(date);
        return d.toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      };

      const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0,
        }).format(amount || 0);
      };

      const nombreCompleto = [
        comisionado?.primerNombre,
        comisionado?.segundoNombre,
        comisionado?.primerApellido,
        comisionado?.segundoApellido,
      ].filter(Boolean).join(' ');

      const tipoTransporte = solicitud.requiereTiquetes ? 'Aéreo / Terrestre' : 'Terrestre';
      const prioridad = solicitud.prioridad || 'MEDIA';
      const estado = solicitud.estadoSolicitud || 'RADICADA';

      drawHeader();
      drawTitle();

      drawSectionTitle('1. INFORMACIÓN DE LA SOLICITUD');
      drawField('No. Radicado', solicitud.consecutivoUnico);
      drawField('Fecha de Radicación', formatDate(solicitud.creadoEn));
      drawField('Estado de la Solicitud', estado);
      drawField('Prioridad', prioridad);
      drawField('Extemporánea', solicitud.extemporanea ? 'SÍ' : 'NO');
      drawField('Radicado Fuera de Jornada', solicitud.radicadoFueraJornada ? 'SÍ' : 'NO');
      doc.moveDown(0.3);

      drawSectionTitle('2. DATOS DEL COMISIONADO');
      drawField('Nombre Completo', nombreCompleto);
      drawField('No. Documento', comisionado?.numeroDocumento || 'N/A');
      drawField('Tipo de Comisionado', comisionado?.tipoComisionado || 'N/A');
      drawField('Correo Electrónico', comisionado?.email || 'N/A');
      drawField('Teléfono de Contacto', comisionado?.telefonoContacto || 'N/A');
      drawField('Origen de Datos', comisionado?.origenDatos || 'N/A');
      drawField('Autorización Hábeas Data', comisionado?.autorizacionHabeasData ? 'SÍ' : 'NO');
      doc.moveDown(0.3);

      drawSectionTitle('3. DATOS DE LA COMISIÓN');
      drawField('Ciudad Destino', solicitud.destinoCiudad);
      drawField('Departamento Destino', solicitud.destinoDepartamento);
      drawField('Fecha de Inicio', formatDate(solicitud.fechaInicio));
      drawField('Fecha de Finalización', formatDate(solicitud.fechaFin));
      drawField('Días de Comisión', String(solicitud.diasComision));
      drawField('Tipo de Transporte', tipoTransporte);
      drawField('Requiere Tiquetes', solicitud.requiereTiquetes ? 'SÍ' : 'NO');
      doc.moveDown(0.3);

      drawSectionTitle('4. OBJETO DE LA COMISIÓN');
      drawMultiLineField('Objeto / Justificación', solicitud.objetoComision);
      doc.moveDown(0.3);

      drawSectionTitle('5. INFORMACIÓN PRESUPUESTAL');
      drawField('Rubro Presupuestal', solicitud.rubroPresupuestal || 'N/A');
      drawField('Monto Viáticos', formatCurrency(Number(solicitud.montoViaticos)));
      drawField('Monto Gastos de Viaje', formatCurrency(Number(solicitud.montoGastosViaje)));
      drawField('Monto Total', formatCurrency(Number(solicitud.montoViaticos) + Number(solicitud.montoGastosViaje)));
      doc.moveDown(0.3);

      drawSectionTitle('6. DOCUMENTOS DE SOPORTE');
      if (solicitud.documentosSoporte && solicitud.documentosSoporte.length > 0) {
        solicitud.documentosSoporte.forEach((documento, index) => {
          doc.font('Helvetica-Bold').fillColor('#333333');
          doc.text(`  ${index + 1}. ${documento.tipoDocumento}`);
          doc.font('Helvetica').fillColor('#666666');
          doc.text(`     Archivo: ${documento.nombreArchivoOriginal || 'N/A'}`);
        });
      } else {
        doc.font('Helvetica').fillColor('#666666');
        doc.text('  No se han adjuntado documentos de soporte.');
      }
      doc.moveDown(0.5);

      drawSectionTitle('7. FIRMAS Y APROBACIONES');
      doc.moveDown(1);

      const firmaY = doc.y;
      doc.strokeColor('#333333').lineWidth(0.5);
      doc.moveTo(80, firmaY).lineTo(250, firmaY).stroke();
      doc.moveTo(350, firmaY).lineTo(520, firmaY).stroke();
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(8).fillColor('#333333');
      doc.text('Firma del Solicitante', 80, firmaY + 5);
      doc.text('Firma del Jefe Inmediato / Aprobación', 350, firmaY + 5);

      doc.moveDown(3);

      const fechaY = doc.y;
      doc.strokeColor('#333333').lineWidth(0.5);
      doc.moveTo(200, fechaY).lineTo(400, fechaY).stroke();
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(8).fillColor('#333333');
      doc.text('Firma Subdirector / Director', 220, fechaY + 5);

      doc.moveDown(3);

      doc.fontSize(8).font('Helvetica').fillColor('#999999');
      doc.text('─'.repeat(80), { align: 'center' });
      doc.moveDown(0.3);
      doc.text(
        `Documento generado automáticamente el ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO')}`,
        { align: 'center' },
      );
      doc.text('Sistema Integrado de Gestión ESAP — Módulo de Viáticos y Comisiones', { align: 'center' });

      doc.end();
    });
  }
}
