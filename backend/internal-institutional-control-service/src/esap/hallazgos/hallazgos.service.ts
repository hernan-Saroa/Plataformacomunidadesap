import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hallazgo, HallazgoCategoria, HallazgoEstado } from './entities/hallazgo.entity';
import { CreateHallazgoDto } from './dto/create-hallazgo.dto';
import { UpdateHallazgoDto } from './dto/update-hallazgo.dto';
import { Auditoria } from '../auditorias/entities/auditoria.entity';
import { HistorialAuditoria, TipoEvento } from '../auditorias/entities/historial-auditoria.entity';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { TipoNotificacion, PrioridadNotificacion } from '../notificaciones/entities/notificacion.entity';

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

@Injectable()
export class HallazgosService {
  constructor(
    @InjectRepository(Hallazgo)
    private readonly hallazgoRepository: Repository<Hallazgo>,
    @InjectRepository(Auditoria)
    private readonly auditoriaRepository: Repository<Auditoria>,
    @InjectRepository(HistorialAuditoria)
    private readonly historialRepository: Repository<HistorialAuditoria>,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  private async cargarAuditoria(auditoriaId: string): Promise<Auditoria | null> {
    return this.auditoriaRepository.findOne({ where: { id: auditoriaId } });
  }

  /**
   * Notifica al equipo OCI (auditor líder, jefe, equipo) — backoffice.
   * NO usar para el área auditada: ellos reciben aviso solo con notificarAuditadoPortal
   * (p. ej. al publicar el informe preliminar).
   */
  private async notificarEquipoOciHallazgo(
    hallazgo: Hallazgo,
    tipo: 'aceptado' | 'controversia',
  ): Promise<void> {
    if (!hallazgo.auditoriaId) return;
    const auditoria = await this.cargarAuditoria(hallazgo.auditoriaId);
    if (!auditoria) return;

    const area =
      auditoria.responsableAreaNombre?.trim() || 'el área auditada';
    const tituloHallazgo = hallazgo.titulo || hallazgo.codigo;

    const payload =
      tipo === 'aceptado'
        ? {
            evento: 'EVT-AUD-003',
            titulo: `Hallazgo aceptado — ${hallazgo.codigo}`,
            mensaje:
              `${area} aceptó el hallazgo "${tituloHallazgo}" en la auditoría ${auditoria.codigo}. ` +
              `No requiere decisión sobre controversia.`,
          }
        : {
            evento: 'EVT-AUD-001',
            titulo: `Controversia presentada — ${hallazgo.codigo}`,
            mensaje:
              `${area} presentó controversia sobre el hallazgo "${tituloHallazgo}" en la auditoría ${auditoria.codigo}. ` +
              `Debe registrar su decisión: ratificar, modificar o retirar.`,
          };

    const metadata = {
      hallazgoId: hallazgo.id,
      hallazgoCodigo: hallazgo.codigo,
      accionAuditado: tipo,
      responsableArea: area,
      eventoCode: payload.evento,
    };

    await this.notificacionesService.dispararEvento(payload.evento, {
      auditoriaId: auditoria.id,
      auditoriaCodigo: auditoria.codigo,
      tituloCustom: payload.titulo,
      mensajeCustom: payload.mensaje,
      metadata,
      url_accion: `/control-interno/auditorias/${auditoria.id}`,
    });

    // Asegurar que el auditor líder reciba la alerta (además del broadcast por roles).
    await this.notificarAuditorLiderDirecto(
      auditoria,
      payload.titulo,
      payload.mensaje,
      tipo === 'controversia'
        ? TipoNotificacion.CONTROVERSIA_HALLAZGO
        : TipoNotificacion.RECEPCION_DOCUMENTO,
      metadata,
    );
  }

  private async notificarAuditorLiderDirecto(
    auditoria: Auditoria,
    titulo: string,
    mensaje: string,
    tipo: TipoNotificacion,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const liderId = auditoria.auditorLiderId;
    if (!liderId) return;
    try {
      const rows = await this.auditoriaRepository.query(
        `SELECT u.id_user::text AS id_user
         FROM auth."user" u
         WHERE u.id_person = $1::uuid AND u.is_active = true
         LIMIT 1`,
        [liderId],
      );
      const idUser = rows?.[0]?.id_user;
      if (!idUser) {
        console.warn(
          `[HallazgosService] Sin id_user para auditor líder (id_person=${liderId}) auditoría ${auditoria.codigo}`,
        );
        return;
      }
      await this.notificacionesService.create({
        usuarioId: String(idUser),
        tipoNotificacion: tipo,
        titulo,
        mensaje,
        prioridad: PrioridadNotificacion.ALTA,
        metadata,
        accionUrl: `/control-interno/auditorias/${auditoria.id}`,
      });
    } catch (err) {
      console.error('[HallazgosService] Error notificando auditor líder:', err.message);
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
      
      // Sanitizar usuarioId: la columna es UUID, el JWT puede enviar un número
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const sanitizedUserId = usuarioId && uuidRegex.test(String(usuarioId)) ? String(usuarioId) : null;
      
      const historial = new HistorialAuditoria();
      historial.auditoriaId = auditoriaId;
      historial.tipoEvento = tipoEvento;
      historial.fecha = fecha;
      historial.hora = hora;
      historial.usuarioId = sanitizedUserId;
      historial.accion = accion;
      historial.descripcion = descripcion;
      historial.cambios = [];
      
      await this.historialRepository.save(historial);
    } catch (err) {
      console.error('[HallazgosService] Error registrando historial:', err);
    }
  }

  /**
   * Parsea una fecha string (YYYY-MM-DD) a Date sin conversión de zona horaria
   * Esto evita que las fechas se desplacen por diferencias de zona horaria
   */
  private parseDateOnly(dateString: string): Date {
    // Si la fecha viene en formato YYYY-MM-DD, parsearla manualmente
    // para evitar conversión de zona horaria
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Los meses en JS son 0-indexed
      const day = parseInt(parts[2], 10);
      // Crear fecha en hora local (no UTC) para evitar desplazamientos
      return new Date(year, month, day);
    }
    // Fallback: usar new Date normal si el formato no es el esperado
    return new Date(dateString);
  }

  /**
   * Serializa una fecha Date o string a string YYYY-MM-DD para evitar problemas de zona horaria
   */
  private serializeDate(date: Date | string | undefined | null): string | undefined {
    if (!date) return undefined;
    
    // Si ya es un string en formato YYYY-MM-DD, devolverlo directamente
    if (typeof date === 'string') {
      // Si viene como ISO string (ej: "2024-12-29T00:00:00.000Z"), extraer solo la fecha
      const dateOnly = date.split('T')[0];
      // Validar formato YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
        return dateOnly;
      }
      // Si no tiene el formato esperado, intentar parsearlo
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return date; // Fallback: devolver el string original
    }
    
    // Si es un objeto Date
    if (date instanceof Date && !isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Fallback: convertir a string y extraer fecha
    const dateStr = String(date);
    const dateOnly = dateStr.split('T')[0];
    return dateOnly || dateStr;
  }

  /**
   * Serializa un hallazgo para la respuesta JSON
   */
  private serializeHallazgo(hallazgo: Hallazgo): any {
    return {
      ...hallazgo,
      fechaDeteccion: this.serializeDate(hallazgo.fechaDeteccion),
      fechaNotificacion: this.serializeDate(hallazgo.fechaNotificacion),
      fechaLimiteCorreccion: this.serializeDate(hallazgo.fechaLimiteCorreccion),
      fechaDecision: (hallazgo as any).fechaDecision
        ? new Date((hallazgo as any).fechaDecision).toISOString()
        : undefined,
    };
  }

  /**
   * Genera un código único para el hallazgo en formato HAL-YYYY-###
   */
  private async generarCodigo(intentos = 0): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `HAL-${year}-`;

    // Usar raw query para obtener el número máximo de forma confiable
    const result = await this.hallazgoRepository.query(
      `SELECT MAX(CAST(SUBSTRING(codigo FROM 'HAL-${year}-(\\d+)') AS INTEGER)) AS max_num 
       FROM control_interno.hallazgo 
       WHERE codigo LIKE $1`,
      [`${prefix}%`],
    );

    const maxNum = result?.[0]?.max_num || 0;
    const siguiente = maxNum + 1 + intentos; // Sumar intentos para saltar duplicados

    return `${prefix}${String(siguiente).padStart(3, '0')}`;
  }

  /**
   * Ajusta el contador de hallazgos en la auditoría relacionada
   */
  private async ajustarContadorAuditoria(auditoriaId: string | undefined | null, delta: number) {
    if (!auditoriaId) return;
    const auditoria = await this.auditoriaRepository.findOne({ where: { id: auditoriaId } });
    if (!auditoria) return;

    const nuevoTotal = Math.max(0, (auditoria.hallazgos ?? 0) + delta);
    auditoria.hallazgos = nuevoTotal;
    await this.auditoriaRepository.save(auditoria);
  }

  async findAll(filters?: { categoria?: string; estado?: string; area?: string }): Promise<Hallazgo[]> {
    const query = this.hallazgoRepository.createQueryBuilder('hallazgo')
      .leftJoinAndSelect('hallazgo.auditoriaEntity', 'auditoria')
      .orderBy('hallazgo.createdAt', 'DESC');

    if (filters?.categoria) {
      query.andWhere('hallazgo.categoria = :categoria', { categoria: filters.categoria });
    }

    if (filters?.estado) {
      query.andWhere('hallazgo.estado = :estado', { estado: filters.estado });
    }

    if (filters?.area) {
      query.andWhere('hallazgo.area ILIKE :area', { area: `%${filters.area}%` });
    }

    const hallazgos = await query.getMany();
    // Serializar fechas para evitar problemas de zona horaria
    return hallazgos.map(h => this.serializeHallazgo(h));
  }

  async findOne(id: string): Promise<Hallazgo> {
    const hallazgo = await this.hallazgoRepository.findOne({
      where: { id },
      relations: ['auditoriaEntity'],
    });

    if (!hallazgo) {
      throw new NotFoundException(`Hallazgo con ID ${id} no encontrado`);
    }

    // Serializar fechas para evitar problemas de zona horaria
    return this.serializeHallazgo(hallazgo) as any;
  }

  async findByCodigo(codigo: string): Promise<Hallazgo | null> {
    const hallazgo = await this.hallazgoRepository.findOne({
      where: { codigo },
      relations: ['auditoriaEntity'],
    });
    
    if (!hallazgo) {
      return null;
    }
    
    // Serializar fechas para evitar problemas de zona horaria
    return this.serializeHallazgo(hallazgo) as any;
  }

  /**
   * Obtiene todos los hallazgos de una auditoría
   */
  async findByAuditoria(auditoriaId: string): Promise<Hallazgo[]> {
    const hallazgos = await this.hallazgoRepository.find({
      where: { auditoriaId },
      relations: ['auditoriaEntity'],
      order: { createdAt: 'DESC' },
    });

    // Serializar fechas para evitar problemas de zona horaria
    return hallazgos.map(h => this.serializeHallazgo(h));
  }

  async create(createDto: CreateHallazgoDto, usuarioId?: string, _retryCount = 0): Promise<Hallazgo> {
    try {
      const codigo = await this.generarCodigo(_retryCount);

      // Intentar enlazar la auditoría por ID o por código
      let auditoriaId: string | null = createDto.auditoriaId || null;
      if (!auditoriaId && createDto.auditoria) {
        const auditoria = await this.auditoriaRepository.findOne({
          where: { codigo: createDto.auditoria },
        });
        auditoriaId = auditoria?.id ?? null;
      }

      const hallazgo = this.hallazgoRepository.create({
        ...createDto,
        codigo,
        titulo: createDto.titulo || createDto.descripcion?.split('.')[0] || 'Hallazgo sin título',
        auditoriaId,
        categoria: createDto.categoria || HallazgoCategoria.BORRADOR,
        estado: createDto.estado || HallazgoEstado.BORRADOR,
        normativaRelacionada: createDto.normativaRelacionada || [],
        evidencias: createDto.evidencias || [],
        recomendaciones: createDto.recomendaciones || [],
        // Parsear fechas sin conversión de zona horaria
        fechaDeteccion: createDto.fechaDeteccion ? this.parseDateOnly(createDto.fechaDeteccion) : new Date(),
        fechaNotificacion: createDto.fechaNotificacion ? this.parseDateOnly(createDto.fechaNotificacion) : undefined,
        fechaLimiteCorreccion: createDto.fechaLimiteCorreccion ? this.parseDateOnly(createDto.fechaLimiteCorreccion) : undefined,
      });

      const saved = await this.hallazgoRepository.save(hallazgo);
      await this.ajustarContadorAuditoria(saved.auditoriaId, 1);

      // ✅ Registrar en historial de auditoría
      await this.registrarHistorial(
        saved.auditoriaId,
        TipoEvento.HALLAZGO,
        'Hallazgo creado',
        `Se creó el hallazgo ${saved.codigo} - ${saved.titulo}`,
        usuarioId,
      );

      // El hallazgo queda en BORRADOR: no se notifica al auditado (aún no es visible en el portal).
      // El área auditada recibe aviso al generar el informe preliminar (estado NOTIFICADO).

      return this.findOne(saved.id);
    } catch (err) {
      // Retry on unique constraint violations (duplicate codigo)
      if (err.code === '23505' && _retryCount < 3) {
        console.warn(`[HallazgosService] Código duplicado, reintentando (intento ${_retryCount + 1})...`);
        return this.create(createDto, usuarioId, _retryCount + 1);
      }
      console.error('[HallazgosService] ❌ Error creando hallazgo:', err.message || err);
      console.error('[HallazgosService] 📋 DTO recibido:', JSON.stringify(createDto, null, 2));
      throw err;
    }
  }

  async update(id: string, updateDto: UpdateHallazgoDto, usuarioId?: string): Promise<Hallazgo> {
    const hallazgo = await this.findOne(id);
    const auditoriaAnterior = hallazgo.auditoriaId;

    // Resolver nueva auditoría si se envía
    let nuevoAuditoriaId = hallazgo.auditoriaId;
    let nuevoCodigoAuditoria = hallazgo.auditoria;
    if (updateDto.auditoriaId) {
      const auditoria = await this.auditoriaRepository.findOne({
        where: { id: updateDto.auditoriaId },
      });
      if (!auditoria) {
        throw new BadRequestException(`Auditoría con ID ${updateDto.auditoriaId} no existe`);
      }
      nuevoAuditoriaId = auditoria.id;
      nuevoCodigoAuditoria = auditoria.codigo;
    } else if (updateDto.auditoria) {
      const auditoria = await this.auditoriaRepository.findOne({
        where: { codigo: updateDto.auditoria },
      });
      if (!auditoria) {
        throw new BadRequestException(`Auditoría con código ${updateDto.auditoria} no existe`);
      }
      nuevoAuditoriaId = auditoria.id;
      nuevoCodigoAuditoria = auditoria.codigo;
    }

    // Validar y parsear fechas sin conversión de zona horaria
    if (updateDto.fechaNotificacion) {
      const notif = this.parseDateOnly(updateDto.fechaNotificacion);
      if (isNaN(notif.getTime())) {
        throw new BadRequestException('fechaNotificacion no es una fecha válida');
      }
      hallazgo.fechaNotificacion = notif;
    }

    if (updateDto.fechaLimiteCorreccion) {
      const limite = this.parseDateOnly(updateDto.fechaLimiteCorreccion);
      if (isNaN(limite.getTime())) {
        throw new BadRequestException('fechaLimiteCorreccion no es una fecha válida');
      }
      hallazgo.fechaLimiteCorreccion = limite;
    }

    if (updateDto.fechaDeteccion) {
      const deteccion = this.parseDateOnly(updateDto.fechaDeteccion);
      if (isNaN(deteccion.getTime())) {
        throw new BadRequestException('fechaDeteccion no es una fecha válida');
      }
      hallazgo.fechaDeteccion = deteccion;
    }

    // Actualizar campos básicos primero
    if (updateDto.titulo !== undefined) hallazgo.titulo = updateDto.titulo;
    if (updateDto.descripcion !== undefined) hallazgo.descripcion = updateDto.descripcion;
    if (updateDto.criterioIncumplido !== undefined) hallazgo.criterioIncumplido = updateDto.criterioIncumplido;
    if (updateDto.causa !== undefined) hallazgo.causa = updateDto.causa;
    if (updateDto.efecto !== undefined) hallazgo.efecto = updateDto.efecto;
    if (updateDto.categoria !== undefined) hallazgo.categoria = updateDto.categoria as any;
    if (updateDto.estado !== undefined) hallazgo.estado = updateDto.estado as any;
    if (updateDto.area !== undefined) hallazgo.area = updateDto.area;
    if (updateDto.responsable !== undefined) hallazgo.responsable = updateDto.responsable;
    if (updateDto.normativaRelacionada !== undefined) hallazgo.normativaRelacionada = updateDto.normativaRelacionada;
    if (updateDto.evidencias !== undefined) hallazgo.evidencias = updateDto.evidencias;
    if (updateDto.recomendaciones !== undefined) hallazgo.recomendaciones = updateDto.recomendaciones;
    
    // SIEMPRE actualizar auditoría y auditoriaId con los valores resueltos
    hallazgo.auditoria = nuevoCodigoAuditoria;
    hallazgo.auditoriaId = nuevoAuditoriaId;
    
    // Asegurar que el título tenga un valor por defecto si no se proporcionó
    if (!hallazgo.titulo) {
      hallazgo.titulo = hallazgo.descripcion?.split('.')[0] || 'Hallazgo sin título';
    }

    const actualizado = await this.hallazgoRepository.save(hallazgo);

    // Ajustar contadores si cambió la auditoría
    if (auditoriaAnterior && auditoriaAnterior !== nuevoAuditoriaId) {
      await this.ajustarContadorAuditoria(auditoriaAnterior, -1);
    }
    if (nuevoAuditoriaId && auditoriaAnterior !== nuevoAuditoriaId) {
      await this.ajustarContadorAuditoria(nuevoAuditoriaId, 1);
    }

    // ✅ Registrar en historial de auditoría
    await this.registrarHistorial(
      actualizado.auditoriaId,
      TipoEvento.HALLAZGO,
      'Hallazgo actualizado',
      `Se actualizó el hallazgo ${actualizado.codigo} - ${actualizado.titulo}`,
      usuarioId,
    );

    return this.findOne(actualizado.id);
  }

  async delete(id: string, usuarioId?: string): Promise<void> {
    const hallazgo = await this.findOne(id);
    const auditoriaId = hallazgo.auditoriaId;
    const codigo = hallazgo.codigo;
    const titulo = hallazgo.titulo;
    
    await this.hallazgoRepository.remove(hallazgo);
    await this.ajustarContadorAuditoria(auditoriaId, -1);

    // ✅ Registrar en historial de auditoría
    await this.registrarHistorial(
      auditoriaId,
      TipoEvento.ELIMINACION,
      'Hallazgo eliminado',
      `Se eliminó el hallazgo ${codigo} - ${titulo}`,
      usuarioId,
    );
  }

  async findByCategoria(categoria: HallazgoCategoria): Promise<Hallazgo[]> {
    const hallazgos = await this.hallazgoRepository.find({
      where: { categoria },
      order: { createdAt: 'DESC' },
      relations: ['auditoriaEntity'],
    });
    // Serializar fechas para evitar problemas de zona horaria
    return hallazgos.map(h => this.serializeHallazgo(h));
  }

  /**
   * Área auditada acepta el hallazgo (estado → ACEPTADO)
   */
  async aceptar(id: string, usuarioId?: string): Promise<Hallazgo> {
    const hallazgo = await this.findOne(id);
    
    const isFirstTime = hallazgo.estado === HallazgoEstado.NOTIFICADO;
    const isEnControversiaTurnoAuditado = hallazgo.estado === HallazgoEstado.EN_CONTROVERSIA && (hallazgo as any).controversiaTurno === 'auditado';

    if (!isFirstTime && !isEnControversiaTurnoAuditado) {
      throw new BadRequestException(
        `Solo se puede aceptar un hallazgo en estado "notificado" o en controversia cuando es su turno. Estado actual: ${hallazgo.estado}`,
      );
    }

    hallazgo.estado = HallazgoEstado.ACEPTADO;
    (hallazgo as any).controversiaTurno = null; // Cierra la controversia
    const actualizado = await this.hallazgoRepository.save(hallazgo);

    await this.registrarHistorial(
      hallazgo.auditoriaId,
      TipoEvento.HALLAZGO,
      'Hallazgo/controversia aceptada',
      `El área auditada aceptó el hallazgo/controversia del hallazgo ${hallazgo.codigo}`,
      usuarioId,
    );

    try {
      await this.notificarEquipoOciHallazgo(hallazgo, 'aceptado');
    } catch (notifErr) {
      console.error('[HallazgosService] Error notificando aceptación al equipo OCI:', notifErr.message);
    }

    return this.findOne(actualizado.id);
  }

  /**
   * Área auditada presenta controversia (argumentos + documento adjunto)
   */
  async presentarControversia(
    id: string,
    argumentos: string,
    documentoId: string,
    documentoNombre: string,
    usuarioId?: string,
  ): Promise<Hallazgo> {
    const hallazgo = await this.findOne(id);
    
    const isFirstTime = hallazgo.estado === HallazgoEstado.NOTIFICADO;
    const isEnControversiaTurnoAuditado = hallazgo.estado === HallazgoEstado.EN_CONTROVERSIA && (hallazgo as any).controversiaTurno === 'auditado';

    if (!isFirstTime && !isEnControversiaTurnoAuditado) {
      throw new BadRequestException(
        `Solo se puede presentar controversia sobre un hallazgo en estado "notificado" o cuando es el turno del auditado. Estado actual: ${hallazgo.estado}`,
      );
    }

    if (!argumentos || !argumentos.trim()) {
      throw new BadRequestException('Los argumentos técnicos son obligatorios');
    }

    const hoyStr = new Date().toLocaleDateString('es-CO');
    const nuevosArgumentos = argumentos.trim();
    
    // Append to observations history if it's a reply
    if (!isFirstTime) {
      (hallazgo as any).observacionesControversia = (hallazgo as any).observacionesControversia 
        ? `${(hallazgo as any).observacionesControversia}\n\n[Auditado - ${hoyStr}]: ${nuevosArgumentos}`
        : `[Auditado - ${hoyStr}]: ${nuevosArgumentos}`;
    } else {
      (hallazgo as any).observacionesControversia = nuevosArgumentos;
    }

    (hallazgo as any).argumentosControversia = nuevosArgumentos; // Último argumento
    (hallazgo as any).documentoControversiaUrl = documentoId; // ID para URL de descarga
    (hallazgo as any).documentoControversiaNombre = documentoNombre;
    (hallazgo as any).controversiaTurno = 'auditor';
    hallazgo.estado = HallazgoEstado.EN_CONTROVERSIA;

    const actualizado = await this.hallazgoRepository.save(hallazgo);

    // Reset response time of the audit (fechaInicioComunicacion = today)
    if (hallazgo.auditoriaId) {
      try {
        const auditoria = await this.cargarAuditoria(hallazgo.auditoriaId);
        if (auditoria) {
          auditoria.fechaInicioComunicacion = new Date();
          await this.auditoriaRepository.save(auditoria);
        }
      } catch (err: any) {
        console.error('[HallazgosService] Error reseteando fechaInicioComunicacion en la auditoria:', err.message);
      }
    }

    await this.registrarHistorial(
      hallazgo.auditoriaId,
      TipoEvento.HALLAZGO,
      'Controversia presentada/devuelta con observaciones',
      `El área auditada presentó/devolvió controversia sobre el hallazgo ${hallazgo.codigo}`,
      usuarioId,
    );

    try {
      await this.notificarEquipoOciHallazgo(hallazgo, 'controversia');
    } catch (notifErr) {
      console.error('[HallazgosService] Error notificando controversia al equipo OCI:', notifErr.message);
    }

    return this.findOne(actualizado.id);
  }

  /**
   * Auditor toma decisión sobre controversia: ratificado | modificado | retirado | devolver
   */
  async decisionAuditor(
    id: string,
    tipoDecision: 'ratificado' | 'modificado' | 'retirado' | 'devolver',
    fundamentacionTecnica: string,
    auditorId?: number,
    usuarioId?: string,
  ): Promise<Hallazgo> {
    const hallazgo = await this.findOne(id);
    if (hallazgo.estado !== HallazgoEstado.EN_CONTROVERSIA) {
      throw new BadRequestException(
        `Solo se puede tomar decisión sobre un hallazgo en estado "en-controversia". Estado actual: ${hallazgo.estado}`,
      );
    }

    if (!fundamentacionTecnica || !fundamentacionTecnica.trim()) {
      throw new BadRequestException('La fundamentación técnica/observación es obligatoria');
    }

    const hoyStr = new Date().toLocaleDateString('es-CO');
    const observaciones = fundamentacionTecnica.trim();

    if (tipoDecision === 'devolver') {
      (hallazgo as any).controversiaTurno = 'auditado';
      (hallazgo as any).fundamentacionTecnica = observaciones;
      (hallazgo as any).observacionesControversia = (hallazgo as any).observacionesControversia
        ? `${(hallazgo as any).observacionesControversia}\n\n[Auditor - ${hoyStr}]: ${observaciones}`
        : `[Auditor - ${hoyStr}]: ${observaciones}`;
      
      // Reset response time of the audit (fechaInicioComunicacion = today)
      if (hallazgo.auditoriaId) {
        try {
          const auditoria = await this.cargarAuditoria(hallazgo.auditoriaId);
          if (auditoria) {
            auditoria.fechaInicioComunicacion = new Date();
            await this.auditoriaRepository.save(auditoria);
          }
        } catch (err: any) {
          console.error('[HallazgosService] Error reseteando fechaInicioComunicacion en la auditoria:', err.message);
        }
      }
    } else {
      const estadoMap = {
        ratificado: HallazgoEstado.RATIFICADO,
        modificado: HallazgoEstado.MODIFICADO,
        retirado: HallazgoEstado.RETIRADO,
      };

      (hallazgo as any).decisionAuditor = tipoDecision;
      (hallazgo as any).fundamentacionTecnica = observaciones;
      (hallazgo as any).fechaDecision = new Date();
      (hallazgo as any).auditorDecisionId = auditorId ?? 1;
      (hallazgo as any).controversiaTurno = null; // Cierra la controversia
      hallazgo.estado = estadoMap[tipoDecision];
    }

    const actualizado = await this.hallazgoRepository.save(hallazgo);

    await this.registrarHistorial(
      hallazgo.auditoriaId,
      TipoEvento.HALLAZGO,
      tipoDecision === 'devolver' ? 'Controversia devuelta con observaciones' : `Decisión del auditor: ${tipoDecision}`,
      tipoDecision === 'devolver'
        ? `El auditor devolvió el hallazgo ${hallazgo.codigo} con observaciones: ${observaciones.substring(0, 100)}...`
        : `El auditor ${tipoDecision} el hallazgo ${hallazgo.codigo}. Fundamentación: ${observaciones.substring(0, 100)}...`,
      usuarioId,
    );

    try {
      if (hallazgo.auditoriaId) {
        const auditoria = await this.cargarAuditoria(hallazgo.auditoriaId);
        if (auditoria?.responsableAreaEmail) {
          const tituloNotif = tipoDecision === 'devolver'
            ? `Observaciones sobre su controversia — ${hallazgo.codigo}`
            : `Decisión sobre su controversia — ${hallazgo.codigo}`;
          
          const mensajeNotif = tipoDecision === 'devolver'
            ? `El auditor ha devuelto con observaciones el hallazgo "${hallazgo.titulo || hallazgo.codigo}" en la auditoría ${auditoria.codigo}. Revise en el portal y responda.`
            : `La OCI ha ${tipoDecision === 'ratificado' ? 'ratificado' : tipoDecision === 'modificado' ? 'modificado' : 'retirado'} el hallazgo "${hallazgo.titulo || hallazgo.codigo}" en la auditoría ${auditoria.codigo}.`;

          await this.notificacionesService.notificarAuditadoPortal({
            responsableAreaEmail: auditoria.responsableAreaEmail,
            responsableAreaNombre: auditoria.responsableAreaNombre,
            auditoriaId: auditoria.id,
            auditoriaCodigo: auditoria.codigo,
            auditoriaNombre: auditoria.nombre,
            tipoNotificacion: TipoNotificacion.OTRO,
            titulo: tituloNotif,
            mensaje: mensajeNotif,
            prioridad: PrioridadNotificacion.ALTA,
            metadata: {
              hallazgoId: hallazgo.id,
              decision: tipoDecision,
              quienPresentoControversia: 'auditor',
            },
          });
        }
      }
    } catch (notifErr) {
      console.error('[HallazgosService] Error notificando decisión al auditado:', notifErr.message);
    }

    return this.findOne(actualizado.id);
  }

  /**
   * Verifica si hay controversias pendientes de decisión en una auditoría
   */
  async hayControversiasPendientes(auditoriaId: string): Promise<boolean> {
    const count = await this.hallazgoRepository.count({
      where: {
        auditoriaId,
        estado: HallazgoEstado.EN_CONTROVERSIA,
      },
    });
    return count > 0;
  }

  /**
   * Notifica hallazgos (actualiza BORRADOR → NOTIFICADO) al generar informe preliminar.
   * Solo los que están en BORRADOR pasan a NOTIFICADO. Los ya en aceptado/ratificado/modificado/retirado no se tocan.
   */
  async notificarHallazgosAuditoria(auditoriaId: string, usuarioId?: string): Promise<{ count: number; total: number }> {
    const [pendientes, todos] = await Promise.all([
      this.hallazgoRepository.find({ where: { auditoriaId, estado: HallazgoEstado.BORRADOR } }),
      this.hallazgoRepository.count({ where: { auditoriaId } }),
    ]);
    const hoy = new Date();
    for (const h of pendientes) {
      h.estado = HallazgoEstado.NOTIFICADO;
      h.fechaNotificacion = hoy;
      await this.hallazgoRepository.save(h);
    }
    await this.registrarHistorial(
      auditoriaId,
      TipoEvento.HALLAZGO,
      'Informe preliminar generado',
      `${pendientes.length} hallazgos notificados al área auditada`,
      usuarioId,
    );

    try {
      const auditoria = await this.cargarAuditoria(auditoriaId);
      if (auditoria?.responsableAreaEmail) {
        const n = pendientes.length;
        const mensajeHallazgos =
          n > 0
            ? `Se notificaron ${n} hallazgo(s). Tiene 5 días hábiles para aceptar cada uno o presentar controversia con documento adjunto.`
            : todos > 0
              ? `Los hallazgos de esta auditoría ya estaban en trámite. Revise el estado en el portal.`
              : `No hay hallazgos registrados aún; el área será informada cuando se publiquen.`;
        await this.notificacionesService.notificarAuditadoPortal({
          responsableAreaEmail: auditoria.responsableAreaEmail,
          responsableAreaNombre: auditoria.responsableAreaNombre,
          auditoriaId: auditoria.id,
          auditoriaCodigo: auditoria.codigo,
          auditoriaNombre: auditoria.nombre,
          tipoNotificacion: TipoNotificacion.HALLAZGO_IDENTIFICADO,
          titulo: `Informe preliminar disponible — ${auditoria.codigo}`,
          mensaje:
            `La OCI publicó el informe preliminar de la auditoría "${auditoria.nombre}" (${auditoria.codigo}). ` +
            mensajeHallazgos,
          prioridad: PrioridadNotificacion.CRITICA,
          metadata: {
            hallazgosNotificados: n,
            totalHallazgos: todos,
            plazoDiasHabiles: 5,
          },
        });
      }
    } catch (notifErr: any) {
      console.error('[HallazgosService] Error notificando informe preliminar al auditado:', notifErr.message);
    }

    return { count: pendientes.length, total: todos };
  }
}
