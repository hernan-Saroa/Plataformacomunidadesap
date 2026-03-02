import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DisciplinaryNews, NewsStatus, NewsOrigin } from '../entities/disciplinary-news.entity';
import { DisciplinaryProcess } from '../entities/disciplinary-process.entity';
import { CreateDisciplinaryNewsDto } from '../dtos/create-disciplinary-news.dto';
import { ReturnNewsDto } from '../dtos/return-news.dto';
import { SequenceService } from './sequence.service';
import { StorageService } from './storage.service';

interface FileData {
  buffer: Buffer;
  originalname: string;
}

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(DisciplinaryNews)
    private newsRepository: Repository<DisciplinaryNews>,
    @InjectRepository(DisciplinaryProcess)
    private processRepository: Repository<DisciplinaryProcess>,
    private sequenceService: SequenceService,
    private storageService: StorageService,
  ) { }

  /**
   * Radica una nueva noticia disciplinaria
   */
  async create(
    createNewsDto: CreateDisciplinaryNewsDto,
    files?: FileData[],
  ): Promise<DisciplinaryNews> {
    try {
      // Generar radicado único
      const radicado = await this.sequenceService.generateNewsRadicado();

      // Procesar archivos adjuntos
      const adjuntos: string[] = Array.isArray(createNewsDto.adjuntos)
        ? [...createNewsDto.adjuntos]
        : [];
      if (files && files.length > 0) {
        const stored = await this.storageService.saveMultipleFiles(radicado, files);
        adjuntos.push(...stored);
      }

      // Crear historial inicial
      const initialHistory = [{
        id: Date.now().toString(),
        tipo: 'radicacion',
        usuario: 'Sistema', // TODO: Get actual user
        fecha: new Date().toISOString(),
        observaciones: 'Radicación exitosa en el sistema',
      }];

      // Calcular fecha de caducidad (5 años desde la fecha de los hechos - Ley 734/2002 Art. 30)
      let fechaCaducidad: Date | undefined;
      if (createNewsDto.fechaHechos) {
        fechaCaducidad = new Date(createNewsDto.fechaHechos);
        fechaCaducidad.setFullYear(fechaCaducidad.getFullYear() + 5);
      }

      // Crear y guardar noticia
      const noticia = this.newsRepository.create({
        radicado,
        ...createNewsDto,
        adjuntos,
        fechaCaducidad,
        estado: NewsStatus.RADICADA,
        kanbanStage: 'RECEPCION',
        historialAuditoria: initialHistory,
      });

      return await this.newsRepository.save(noticia);
    } catch (error) {
      throw new HttpException(
        `Error al radicar noticia: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene todas las noticias
   */
  async findAll(): Promise<DisciplinaryNews[]> {
    return await this.newsRepository.find();
  }

  /**
   * Obtiene una noticia por ID
   */
  async findById(id: string): Promise<DisciplinaryNews> {
    const noticia = await this.newsRepository.findOne({ where: { id } });
    if (!noticia) {
      throw new HttpException('Noticia no encontrada', HttpStatus.NOT_FOUND);
    }
    return noticia;
  }

  /**
   * Obtiene una noticia por radicado
   */
  async findByRadicado(radicado: string): Promise<DisciplinaryNews> {
    const noticia = await this.newsRepository.findOne({ where: { radicado } });
    if (!noticia) {
      throw new HttpException(
        `Radicado ${radicado} no encontrado`,
        HttpStatus.NOT_FOUND,
      );
    }
    return noticia;
  }

  /**
   * Obtiene noticias pendientes de asignación (estado RADICADA)
   */
  async findPendingAssignment(): Promise<DisciplinaryNews[]> {
    return await this.newsRepository.find({
      where: { estado: NewsStatus.RADICADA },
      order: { fechaRecepcion: 'DESC' },
    });
  }

  /**
   * Actualiza los datos de una noticia (edición por Profesional)
   * Registra los cambios en el historial de auditoría
   */
  async update(id: string, data: any): Promise<DisciplinaryNews> {
    const noticia = await this.findById(id);

    // Rastrear campos modificados para trazabilidad
    const cambios: string[] = [];
    if (data.origen && data.origen !== noticia.origen) {
      cambios.push(`Origen: ${noticia.origen} → ${data.origen}`);
    }
    if (data.territorial && data.territorial !== noticia.territorial) {
      cambios.push(`Territorial: ${noticia.territorial} → ${data.territorial}`);
    }
    if (data.hechos && data.hechos !== noticia.hechos) {
      cambios.push('Hechos modificados');
    }
    if (data.fechaHechos === null) {
      cambios.push('Fecha de hechos: eliminada (por determinar)');
    } else if (data.fechaHechos) {
      cambios.push(`Fecha de hechos: ${data.fechaHechos}`);
    }
    if (data.denunciante) cambios.push('Datos de denunciante modificados');
    if (data.disciplinable) cambios.push('Datos de disciplinable modificados');

    // Aplicar cambios (todos los valores del enum incluido POR_DETERMINAR)
    const validOrigens = Object.values(NewsOrigin);
    if (data.origen !== undefined) {
      if (validOrigens.includes(data.origen)) noticia.origen = data.origen;
    }
    if (data.territorial) noticia.territorial = data.territorial;
    if (data.dependenciaDenunciado) noticia.dependenciaDenunciado = data.dependenciaDenunciado;
    if (data.hechos) noticia.hechos = data.hechos;
    if (data.fechaQueja) noticia.fechaQueja = new Date(data.fechaQueja);
    if (data.denunciante) noticia.denunciante = data.denunciante;
    if (data.disciplinable) noticia.disciplinable = data.disciplinable;
    if (data.conductas) noticia.conductas = data.conductas;
    if (data.fechaHechos === null) {
      // Limpiar fecha cuando el usuario selecciona "Por determinar"
      (noticia as any).fechaHechos = null;
      (noticia as any).fechaCaducidad = null;
    } else if (data.fechaHechos) {
      noticia.fechaHechos = new Date(data.fechaHechos);
      noticia.fechaCaducidad = new Date(data.fechaHechos);
      noticia.fechaCaducidad.setFullYear(noticia.fechaCaducidad.getFullYear() + 5);
    }

    // Registrar en historial de auditoría
    const historyEntry = {
      id: Date.now().toString(),
      tipo: 'edicion',
      usuario: data.usuario || 'Profesional',
      fecha: new Date().toISOString(),
      observaciones: cambios.length > 0
        ? `Campos modificados: ${cambios.join(', ')}`
        : 'Noticia actualizada',
    };
    noticia.historialAuditoria = [...(noticia.historialAuditoria || []), historyEntry];

    return await this.newsRepository.save(noticia);
  }

  /**
   * Actualiza el estado de una noticia
   */
  async updateStatus(
    id: string,
    nuevoEstado: NewsStatus,
  ): Promise<DisciplinaryNews> {
    const noticia = await this.findById(id);
    noticia.estado = nuevoEstado;

    // Log history
    const historyEntry = {
      id: Date.now().toString(),
      tipo: 'edicion',
      usuario: 'Sistema', // TODO: Get actual user
      fecha: new Date().toISOString(),
      observaciones: `Cambio de estado a ${nuevoEstado}`,
    };
    noticia.historialAuditoria = [...(noticia.historialAuditoria || []), historyEntry];

    return await this.newsRepository.save(noticia);
  }

  /**
   * Devuelve una noticia con observaciones
   */
  async returnNews(id: string, returnNewsDto: ReturnNewsDto): Promise<DisciplinaryNews> {
    const noticia = await this.findById(id);
    noticia.estado = NewsStatus.DEVUELTA;
    noticia.observaciones = returnNewsDto.observaciones;

    // Log history
    const historyEntry = {
      id: Date.now().toString(),
      tipo: 'devolucion',
      usuario: 'Sistema',
      fecha: new Date().toISOString(),
      observaciones: returnNewsDto.observaciones,
    };
    noticia.historialAuditoria = [...(noticia.historialAuditoria || []), historyEntry];

    return await this.newsRepository.save(noticia);
  }

  /**
   * Archiva una noticia
   */
  async archive(id: string, reason: string): Promise<DisciplinaryNews> {
    const noticia = await this.findById(id);
    noticia.estado = NewsStatus.ARCHIVADA;
    noticia.observaciones = reason;

    // Log history
    const historyEntry = {
      id: Date.now().toString(),
      tipo: 'archivo',
      usuario: 'Sistema',
      fecha: new Date().toISOString(),
      observaciones: reason,
    };
    noticia.historialAuditoria = [...(noticia.historialAuditoria || []), historyEntry];

    return await this.newsRepository.save(noticia);
  }

  /**
   * Actualiza la etapa Kanban de una noticia
   */
  async updateKanbanStage(id: string, kanbanStage?: string): Promise<DisciplinaryNews> {
    const noticia = await this.findById(id);
    if (kanbanStage) {
      noticia.kanbanStage = kanbanStage;
    }
    return await this.newsRepository.save(noticia);
  }

  /**
   * Actualiza el historial de auditoría de una noticia
   */
  async updateHistory(id: string, historyEntry: any): Promise<DisciplinaryNews> {
    const noticia = await this.findById(id);
    noticia.historialAuditoria = [...(noticia.historialAuditoria || []), historyEntry];
    return await this.newsRepository.save(noticia);
  }

  /**
   * Elimina una noticia (y sus archivos)
   */
  async delete(id: string): Promise<void> {
    const noticia = await this.findById(id);
    await this.storageService.deleteExpediente(noticia.radicado);
    await this.newsRepository.delete(id);
  }

  /**
   * Asocia una noticia a un proceso existente
   */
  async associateNewsToProcess(
    newsId: string,
    procesoDestinoId: string,
    justificacion: string,
  ): Promise<DisciplinaryNews> {
    const noticia = await this.findById(newsId);

    const proceso = await this.processRepository.findOne({
      where: { id: procesoDestinoId },
    });
    if (!proceso) {
      throw new HttpException('Proceso destino no encontrado', HttpStatus.NOT_FOUND);
    }

    noticia.procesoAsociadoId = procesoDestinoId;
    noticia.procesoAsociadoNumero = proceso.radicadoProceso;
    noticia.procesoAsociadoFecha = new Date();
    noticia.procesoAsociadoJustificacion = justificacion;

    // Registrar en auditoría
    const historyEntry = {
      id: Date.now().toString(),
      tipo: 'asociacion',
      usuario: 'Sistema',
      fecha: new Date().toISOString(),
      observaciones: `Noticia asociada al proceso ${proceso.radicadoProceso}. Justificación: ${justificacion}`,
    };
    noticia.historialAuditoria = [...(noticia.historialAuditoria || []), historyEntry];

    console.log('✅ Asociando noticia a proceso:', {
      newsId,
      procesoDestinoId,
      radicadoProceso: proceso.radicadoProceso,
    });

    return await this.newsRepository.save(noticia);
  }

  /**
   * Construye el contenido HTML del correo de remisión por competencia
   */
  buildRemisionEmailContent(
    noticia: DisciplinaryNews,
    entidadDestino: string,
    justificacion: string,
  ): string {
    const formatDate = (date: Date | string | undefined): string => {
      if (!date) return 'No especificada';
      return new Date(date).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const formatPersonInfo = (person: any): string => {
      if (!person) return 'No disponible';
      let info = `<strong>${person.nombre || 'Sin nombre'}</strong>`;
      if (person.cedula) info += `<br>C.C.: ${person.cedula}`;
      if (person.cargo) info += `<br>Cargo: ${person.cargo}`;
      if (person.dependencia) info += `<br>Dependencia: ${person.dependencia}`;
      if (person.entidad) info += `<br>Entidad: ${person.entidad}`;
      if (person.email) info += `<br>Email: ${person.email}`;
      if (person.telefono) info += `<br>Teléfono: ${person.telefono}`;
      return info;
    };

    return `
      <div style="font-family: 'Inter', Arial, sans-serif; background: #f5f7fb; padding: 24px; color: #1f2937;">
        <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 700px; border: 1px solid #0b68d1; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.3);">
          <tr>
            <td style="background: linear-gradient(135deg, #003DA5 0%, #0b68d1 100%); padding: 18px 24px; color: #ffffff; font-weight: 700; font-size: 18px;">
              Remisión por Competencia - Control Interno Disciplinario ESAP
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
              Información de la Remisión
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 16px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
              <table width="100%" cellspacing="0" cellpadding="8" style="background: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="font-weight: 600; color: #374151;">Entidad de Destino:</td>
                  <td style="color: #111827;">${entidadDestino}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #374151;">Fecha de Remisión:</td>
                  <td style="color: #111827;">${formatDate(new Date())}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #374151;">Radicado Original:</td>
                  <td style="color: #111827;">${noticia.radicado}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
              Justificación de la Remisión
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 16px 24px; font-size: 14px; color: #4b5563; line-height: 1.6; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0;">
              ${justificacion}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
              Datos del Denunciante
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 16px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
              ${formatPersonInfo(noticia.denunciante)}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
              Datos del Disciplinable
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 16px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
              ${formatPersonInfo(noticia.disciplinable)}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
              Hechos de la Noticia
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 16px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
              ${noticia.hechos || 'No especificados'}
            </td>
          </tr>
          ${noticia.conductas && noticia.conductas.length > 0 ? `
          <tr>
            <td style="padding: 16px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
              Conductasallegadas
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 16px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
              <ul style="margin: 0; padding-left: 20px;">
                ${noticia.conductas.map(c => `<li>${c}</li>`).join('')}
              </ul>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 16px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
              Información Adicional
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 16px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
              <table width="100%" cellspacing="0" cellpadding="8" style="background: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="font-weight: 600; color: #374151;">Origen:</td>
                  <td style="color: #111827;">${noticia.origen || 'No especificado'}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #374151;">Territorial:</td>
                  <td style="color: #111827;">${noticia.territorial || 'No especificada'}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #374151;">Dependencia del Denunciado:</td>
                  <td style="color: #111827;">${noticia.dependenciaDenunciado || 'No especificada'}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #374151;">Fecha de Recepción:</td>
                  <td style="color: #111827;">${formatDate(noticia.fechaRecepcion)}</td>
                </tr>
                ${noticia.fechaQueja ? `
                <tr>
                  <td style="font-weight: 600; color: #374151;">Fecha de los Hechos:</td>
                  <td style="color: #111827;">${formatDate(noticia.fechaQueja)}</td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>
          ${noticia.adjuntos && noticia.adjuntos.length > 0 ? `
          <tr>
            <td style="padding: 16px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
              Archivos Adjuntos
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 16px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
              ${noticia.adjuntos.length} archivo(s) adjunto(s) en el sistema
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 24px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; text-align: center;">
              ESAP - Escuela Superior de Administración Pública<br>
              Sistema de Control Interno Disciplinario<br>
              Este correo fue generado automáticamente.
            </td>
          </tr>
        </table>
      </div>
    `;
  }
}
