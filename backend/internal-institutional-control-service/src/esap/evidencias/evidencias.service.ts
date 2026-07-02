import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EvidenciaDocumento, EstadoValidacion } from './entities/evidencia-documento.entity';
import { CreateEvidenciaDto } from './dto/create-evidencia.dto';
import { ValidarEvidenciaDto } from './dto/validar-evidencia.dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { TipoNotificacion, PrioridadNotificacion, CanalNotificacion } from '../notificaciones/entities/notificacion.entity';
import { HistorialAuditoria, TipoEvento } from '../auditorias/entities/historial-auditoria.entity';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const COLOMBIA_TIME_ZONE = 'America/Bogota';

function getFechaHoraColombia(): { fecha: Date; hora: string } {
  const ahora = new Date();
  const fechaString = new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
  const hora = new Intl.DateTimeFormat('en-GB', {
    timeZone: COLOMBIA_TIME_ZONE,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(ahora);
  const [year, month, day] = fechaString.split('-').map(Number);

  return { fecha: new Date(year, month - 1, day, 12), hora };
}

// Tipo para el archivo subido
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

@Injectable()
export class EvidenciasService {
  private readonly uploadPath = process.env.UPLOAD_PATH || './uploads/evidencias';

  constructor(
    @InjectRepository(EvidenciaDocumento)
    private readonly evidenciaRepository: Repository<EvidenciaDocumento>,
    @InjectRepository(HistorialAuditoria)
    private readonly historialRepository: Repository<HistorialAuditoria>,
    private readonly notificacionesService: NotificacionesService,
    private readonly dataSource: DataSource,
  ) {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  /**
   * Registra evento en el historial de la auditoría
   */
  private async registrarHistorial(
    auditoriaId: string | null | undefined,
    tipoEvento: TipoEvento,
    accion: string,
    descripcion: string,
    usuarioId?: string,
  ): Promise<void> {
    if (!auditoriaId) return;
    
    try {
      const { fecha, hora } = getFechaHoraColombia();
      
      const historial = new HistorialAuditoria();
      historial.auditoriaId = auditoriaId;
      historial.tipoEvento = tipoEvento;
      historial.fecha = fecha;
      historial.hora = hora;
      historial.usuarioId = usuarioId || null;
      historial.accion = accion;
      historial.descripcion = descripcion;
      historial.cambios = [];
      
      await this.historialRepository.save(historial);
    } catch (err) {
      console.error('[EvidenciasService] Error registrando historial:', err);
    }
  }

  /**
   * Crea una nueva evidencia/documento
   */
  async create(
    file: MulterFile,
    createDto: CreateEvidenciaDto,
    subidoPor: string,
    subidoPorId?: number,
    usuarioId?: string,
  ): Promise<EvidenciaDocumento> {
    // Validar que al menos una vinculación esté presente
    const vinculaciones = [
      createDto.hallazgoId,
      createDto.accionCorrectivaId,
      createDto.planMejoramientoId,
      createDto.auditoriaId,
    ].filter(Boolean);

    if (vinculaciones.length === 0) {
      throw new BadRequestException(
        'Debe especificar al menos una vinculación (hallazgoId, accionCorrectivaId, planMejoramientoId o auditoriaId)',
      );
    }

    if (vinculaciones.length > 1) {
      throw new BadRequestException(
        'Solo puede especificar una vinculación a la vez',
      );
    }

    // Generar ruta del archivo
    const rutaArchivo = this.generarRutaArchivo(
      file.originalname,
      createDto.hallazgoId,
      createDto.accionCorrectivaId,
      createDto.planMejoramientoId,
    );

    // Calcular hash del archivo
    const hashArchivo = await this.calcularHashArchivo(file.path);

    // Mover archivo a la ruta final
    const dir = path.dirname(rutaArchivo);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.renameSync(file.path, rutaArchivo);

    // Si viene por hallazgo, resolver auditoría para indexar en expediente
    let auditoriaIdResuelta = createDto.auditoriaId || null;
    if (!auditoriaIdResuelta && createDto.hallazgoId) {
      auditoriaIdResuelta = await this.obtenerAuditoriaDeHallazgo(createDto.hallazgoId);
    }

    // Crear entidad
    const evidencia = this.evidenciaRepository.create({
      nombre: createDto.nombre,
      descripcion: createDto.descripcion,
      tipoDocumento: createDto.tipoDocumento,
      hallazgoId: createDto.hallazgoId || null,
      accionCorrectivaId: createDto.accionCorrectivaId || null,
      planMejoramientoId: createDto.planMejoramientoId || null,
      auditoriaId: auditoriaIdResuelta,
      rutaArchivo,
      nombreArchivoOriginal: file.originalname,
      tipoMime: file.mimetype,
      tamanioBytes: file.size,
      hashArchivo,
      subidoPor,
      subidoPorId,
    });

    const savedEvidencia = await this.evidenciaRepository.save(evidencia);

    // ✅ Registrar en historial de auditoría (si está vinculada a una auditoría directamente o a través de hallazgo)
    const auditoriaIdParaHistorial = savedEvidencia.auditoriaId || await this.obtenerAuditoriaDeHallazgo(savedEvidencia.hallazgoId);
    await this.registrarHistorial(
      auditoriaIdParaHistorial,
      TipoEvento.DOCUMENTO,
      'Evidencia cargada',
      `Se cargó el documento "${savedEvidencia.nombre}" (${savedEvidencia.nombreArchivoOriginal})`,
      usuarioId,
    );

    // Crear notificaciones después de guardar la evidencia
    try {
      await this.crearNotificacionesDocumentoAdjuntado(savedEvidencia);
    } catch (notifError) {
      // No fallar la creación si las notificaciones fallan
      console.error('[EvidenciasService.create] Error al crear notificaciones:', notifError);
    }

    return savedEvidencia;
  }

  /**
   * Valida una evidencia (US-032)
   */
  async validar(
    id: string,
    validarDto: ValidarEvidenciaDto,
    validadoPor: string,
  ): Promise<EvidenciaDocumento> {
    const evidencia = await this.findOne(id);

    evidencia.estadoValidacion = validarDto.estadoValidacion;
    evidencia.validadoPor = validadoPor;
    evidencia.fechaValidacion = new Date();
    evidencia.observacionesValidacion = validarDto.observacionesValidacion;

    return this.evidenciaRepository.save(evidencia);
  }

  /**
   * Obtiene evidencias por acción correctiva
   */
  async findByAccion(accionId: string): Promise<EvidenciaDocumento[]> {
    return this.evidenciaRepository.find({
      where: { accionCorrectivaId: accionId },
      order: { fechaSubida: 'DESC' },
    });
  }

  /**
   * Obtiene evidencias por hallazgo
   */
  async findByHallazgo(hallazgoId: string): Promise<EvidenciaDocumento[]> {
    return this.evidenciaRepository.find({
      where: { hallazgoId },
      order: { fechaSubida: 'DESC' },
    });
  }

  /**
   * Obtiene evidencias por plan
   */
  async findByPlan(planId: string): Promise<EvidenciaDocumento[]> {
    return this.evidenciaRepository.find({
      where: { planMejoramientoId: planId },
      order: { fechaSubida: 'DESC' },
    });
  }

  /**
   * Obtiene evidencias por auditoría
   */
  async findByAuditoria(auditoriaId: string): Promise<EvidenciaDocumento[]> {
    return this.evidenciaRepository
      .createQueryBuilder('evidencia')
      .leftJoin('evidencia.hallazgo', 'hallazgo')
      .where('evidencia.auditoriaId = :auditoriaId', { auditoriaId })
      .orWhere('hallazgo.auditoriaId = :auditoriaId', { auditoriaId })
      .orderBy('evidencia.fechaSubida', 'DESC')
      .getMany();
  }

  /**
   * Obtiene el ID de auditoría a partir de un hallazgo
   */
  private async obtenerAuditoriaDeHallazgo(hallazgoId: string | null | undefined): Promise<string | null> {
    if (!hallazgoId) return null;
    
    try {
      const result = await this.dataSource.query(
        'SELECT auditoria_id FROM control_interno.hallazgo WHERE id = $1',
        [hallazgoId]
      );
      return result?.[0]?.auditoria_id || null;
    } catch (err) {
      console.error('[EvidenciasService] Error obteniendo auditoría de hallazgo:', err);
      return null;
    }
  }

  /**
   * Obtiene una evidencia por ID
   */
  async findOne(id: string): Promise<EvidenciaDocumento> {
    const evidencia = await this.evidenciaRepository.findOne({
      where: { id },
    });

    if (!evidencia) {
      throw new NotFoundException(`Evidencia con ID ${id} no encontrada`);
    }

    return evidencia;
  }

  /**
   * Elimina una evidencia
   */
  async remove(id: string): Promise<void> {
    const evidencia = await this.findOne(id);

    // Eliminar archivo físico
    if (fs.existsSync(evidencia.rutaArchivo)) {
      fs.unlinkSync(evidencia.rutaArchivo);
    }

    await this.evidenciaRepository.remove(evidencia);
  }

  // Métodos privados auxiliares
  private generarRutaArchivo(
    nombreOriginal: string,
    hallazgoId?: string,
    accionId?: string,
    planId?: string,
  ): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(nombreOriginal);
    const nombreBase = path.basename(nombreOriginal, extension);
    const nombreUnico = `${nombreBase}_${timestamp}_${random}${extension}`;

    let ruta = this.uploadPath;
    if (accionId) {
      ruta = path.join(ruta, 'acciones', accionId);
    } else if (hallazgoId) {
      ruta = path.join(ruta, 'hallazgos', hallazgoId);
    } else if (planId) {
      ruta = path.join(ruta, 'planes', planId);
    } else {
      ruta = path.join(ruta, 'general');
    }

    if (!fs.existsSync(ruta)) {
      fs.mkdirSync(ruta, { recursive: true });
    }

    return path.join(ruta, nombreUnico);
  }

  private async calcularHashArchivo(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Crea notificaciones cuando se adjunta un documento/evidencia
   */
  private async crearNotificacionesDocumentoAdjuntado(evidencia: EvidenciaDocumento): Promise<void> {
    console.log(`[EvidenciasService.crearNotificacionesDocumentoAdjuntado] Documento adjuntado: ${evidencia.nombre}`);
    
    const usuariosNotificar: string[] = [];

    // Obtener usuarios relacionados según la vinculación
    if (evidencia.auditoriaId) {
      try {
        const auditoria = await this.dataSource.query(
          `SELECT auditor_lider_id, auditor_asignado_id, supervisor_asignado_id FROM control_interno.auditoria WHERE id = $1`,
          [evidencia.auditoriaId]
        );
        if (auditoria && auditoria.length > 0) {
          const a = auditoria[0];
          if (a.auditor_lider_id) usuariosNotificar.push(String(a.auditor_lider_id));
          if (a.auditor_asignado_id) usuariosNotificar.push(String(a.auditor_asignado_id));
          if (a.supervisor_asignado_id) usuariosNotificar.push(String(a.supervisor_asignado_id));
        }
      } catch (error) {
        console.error(`[EvidenciasService.crearNotificacionesDocumentoAdjuntado] Error al obtener auditoría:`, error);
      }
    }

    // Obtener Jefes de Control Interno
    try {
      const jefesOCI = await this.obtenerJefesControlInterno();
      usuariosNotificar.push(...jefesOCI);
    } catch (error) {
      console.error(`[EvidenciasService.crearNotificacionesDocumentoAdjuntado] Error al obtener Jefes:`, error);
    }

    const usuariosUnicos = [...new Set(usuariosNotificar)];

    for (const usuarioId of usuariosUnicos) {
      try {
        await this.notificacionesService.create({
          usuarioId,
          tipoNotificacion: TipoNotificacion.RECEPCION_DOCUMENTO,
          titulo: `Documento Adjuntado: ${evidencia.nombre}`,
          mensaje: `Se ha adjuntado el documento "${evidencia.nombre}"${evidencia.auditoriaId ? ' a una auditoría' : evidencia.planMejoramientoId ? ' a un plan de mejoramiento' : evidencia.hallazgoId ? ' a un hallazgo' : ''}.`,
          prioridad: PrioridadNotificacion.NORMAL,
          canal: CanalNotificacion.SISTEMA,
          metadata: {
            evidenciaId: evidencia.id,
            nombreDocumento: evidencia.nombre,
            auditoriaId: evidencia.auditoriaId || undefined,
            planMejoramientoId: evidencia.planMejoramientoId || undefined,
            hallazgoId: evidencia.hallazgoId || undefined,
          },
        });
      } catch (error) {
        console.error(`[EvidenciasService.crearNotificacionesDocumentoAdjuntado] Error al crear notificación:`, error);
      }
    }
  }

  /**
   * Obtiene los IDs de usuarios con rol JEFE_CONTROL_INTERNO
   */
  private async obtenerJefesControlInterno(): Promise<string[]> {
    try {
      const result = await this.dataSource.query(`
        SELECT DISTINCT u.id_tercero
        FROM auth."user" u
        INNER JOIN auth.user_roles ur ON ur.id_user = u.id_user
        INNER JOIN auth.role r ON r.id = ur.id_rol
        WHERE r.code = 'JEFE_CONTROL_INTERNO'
          AND ur.is_active = true
          AND u.is_active = true
      `);

      return result.map((row: any) => String(row.id_tercero));
    } catch (error) {
      console.error('[EvidenciasService.obtenerJefesControlInterno] Error:', error);
      return [];
    }
  }
}
