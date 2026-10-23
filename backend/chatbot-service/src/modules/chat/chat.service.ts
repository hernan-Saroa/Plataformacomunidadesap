import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversacion } from './entities/conversacion.entity';
import { Mensaje } from './entities/mensaje.entity';
import { CreateConversacionDto } from './dto/create-conversacion.dto';
import { CreateMensajeDto } from './dto/create-mensaje.dto';
import type { ChatbotAuthContext } from '../../auth/chatbot-auth.guard';
import { IsolucionService, searchTerms } from '../isolucion/isolucion.service';

export type ConversacionVisible = Omit<Conversacion, 'propietarioUsuarioId'> & { puedeEscribir: boolean };

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversacion)
    private readonly conversacionRepo: Repository<Conversacion>,
    @InjectRepository(Mensaje)
    private readonly mensajeRepo: Repository<Mensaje>,
    private readonly isolucion: IsolucionService,
  ) {}

  async crearConversacion(dto: CreateConversacionDto, actor: ChatbotAuthContext): Promise<ConversacionVisible> {
    this.exigirSesion(actor);
    const conversacion = this.conversacionRepo.create({
      titulo: dto.titulo || 'Nueva consulta',
      contexto: dto.contexto || 'general',
      propietarioUsuarioId: actor.userId,
      usuarioId: actor.userId,
      usuarioEmail: actor.email,
      usuarioNombre: actor.name?.slice(0, 255),
    });

    const guardada = await this.conversacionRepo.manager.transaction(async (manager) => {
      const guardada = await manager.getRepository(Conversacion).save(conversacion);
      const mensajes = manager.getRepository(Mensaje);
      await mensajes.save(mensajes.create({
        conversacionId: guardada.id,
        rol: 'assistant',
        contenido: '¡Hola! Soy el Asistente Virtual de la Escuela Superior de Administración Pública (ESAP). ¿En qué puedo orientarte hoy?',
      }));
      return guardada;
    });

    return this.obtenerConversacion(guardada.id, actor);
  }

  async listarConversaciones(actor: ChatbotAuthContext, todos = false, email?: string): Promise<ConversacionVisible[]> {
    this.exigirSesion(actor);
    if (todos && !actor.canReadAll) {
      throw new ForbiddenException('No tienes permiso para consultar el historial institucional.');
    }
    const query = this.conversacionRepo
      .createQueryBuilder('c')
      .where('c.is_activo = :activo', { activo: true })
      .orderBy('c.updated_at', 'DESC');

    if (!todos) {
      query.andWhere('c.propietario_usuario_id = :userId', { userId: actor.userId });
    } else if (email) {
      query.andWhere('c.usuario_email = :email', { email });
    }

    return (await query.getMany()).map((conversacion) => this.presentarConversacion(conversacion, actor));
  }

  async obtenerConversacion(id: string, actor: ChatbotAuthContext): Promise<ConversacionVisible> {
    const conversacion = await this.buscarConversacion(id, actor);
    return this.presentarConversacion(conversacion, actor);
  }

  private async buscarConversacion(id: string, actor: ChatbotAuthContext, soloPropia = false, incluirMensajes = true): Promise<Conversacion> {
    this.exigirSesion(actor);
    const conversacion = await this.conversacionRepo.findOne({
      where: {
        id,
        isActivo: true,
        ...((soloPropia || !actor.canReadAll) ? { propietarioUsuarioId: actor.userId } : {}),
      },
      relations: incluirMensajes ? ['mensajes'] : [],
      order: incluirMensajes ? {
        mensajes: {
          createdAt: 'ASC',
        },
      } : {},
    });

    if (!conversacion) {
      // No revelar si el ID existe y pertenece a otra cuenta.
      throw new NotFoundException('Conversación no encontrada.');
    }

    return conversacion;
  }

  async enviarMensaje(
    conversacionId: string,
    dto: CreateMensajeDto,
    actor: ChatbotAuthContext,
  ): Promise<{ userMessage: Mensaje; botMessage: Mensaje }> {
    // El permiso de lectura institucional nunca concede escritura sobre consultas ajenas.
    const conversacion = await this.buscarConversacion(conversacionId, actor, true, false);
    // La consulta externa no mantiene una transacción ni un bloqueo de PostgreSQL.
    const response = await this.generarRespuesta(dto.contenido, conversacion.contexto);
    return this.conversacionRepo.manager.transaction(async (manager) => {
      const conversaciones = manager.getRepository(Conversacion);
      const mensajes = manager.getRepository(Mensaje);
      // Revalidar tras la consulta externa y serializar envíos de otras pestañas.
      const vigente = await conversaciones.findOne({
        where: { id: conversacionId, propietarioUsuarioId: actor.userId, isActivo: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!vigente) throw new NotFoundException('Conversación no encontrada.');
      // now() es idéntico dentro de una transacción de PostgreSQL. Fechas explícitas
      // y crecientes conservan el orden usuario/respuesta y entre envíos concurrentes.
      const timestamp = Math.max(Date.now(), vigente.updatedAt.getTime() + 1);
      const userMessage = await mensajes.save(mensajes.create({
        conversacionId, rol: 'user', contenido: dto.contenido,
        metadatos: dto.metadatos || {}, createdAt: new Date(timestamp),
      }));
      const botMessage = await mensajes.save(mensajes.create({
        conversacionId, rol: 'assistant', contenido: response.contenido,
        createdAt: new Date(timestamp + 1),
        metadatos: { ...response.metadatos, generado_en: new Date().toISOString() },
      }));
      // No guardar una entidad con relaciones: cascade puede desvincular mensajes.
      await conversaciones.update(vigente.id, {
        updatedAt: new Date(timestamp + 1),
        ...(['Nueva conversación', 'Nueva consulta'].includes(vigente.titulo)
          ? { titulo: dto.contenido.slice(0, 50) + (dto.contenido.length > 50 ? '...' : '') } : {}),
      });
      return { userMessage, botMessage };
    });
  }

  async eliminarConversacion(id: string, actor: ChatbotAuthContext): Promise<{ success: boolean }> {
    this.exigirSesion(actor);
    const result = await this.conversacionRepo.update({ id, propietarioUsuarioId: actor.userId, isActivo: true }, { isActivo: false });
    if (!result.affected) throw new NotFoundException('Conversación no encontrada.');
    return { success: true };
  }

  private exigirSesion(actor: ChatbotAuthContext): void {
    if (!actor?.userId) throw new UnauthorizedException('Sesión requerida.');
  }

  private presentarConversacion(conversacion: Conversacion, actor: ChatbotAuthContext): ConversacionVisible {
    const { propietarioUsuarioId, ...datos } = conversacion;
    return { ...datos, puedeEscribir: propietarioUsuarioId === actor.userId };
  }

  private async generarRespuesta(pregunta: string, contexto: string) {
    if (!this.isolucion.isSearchEnabled() || !searchTerms(pregunta).length) {
      return {
        contenido: this.generarRespuestaInstitucional(pregunta, contexto),
        metadatos: { motor: 'esap-knowledge-base' },
      };
    }
    try {
      const sources = await this.isolucion.search(pregunta);
      if (!sources.length) return {
        contenido: 'No encontré documentos habilitados de Isolución que coincidan con tu consulta. Puedes indicar el nombre del procedimiento o palabras más específicas. No tengo una respuesta documental verificada para esa pregunta.',
        metadatos: { motor: 'isolucion-documentos', fuentes: [], estado_fuente: 'sin_coincidencias' },
      };
      return {
        contenido: 'Encontré estos extractos en la fuente documental de Isolución:\n\n' + sources.map((source, index) =>
          `[${index + 1}] ${source.titulo}\nCódigo: ${source.id}${source.version ? ` · Versión: ${source.version}` : ''}\n${source.extracto}${source.url ? `\nFuente: ${source.url}` : ''}`,
        ).join('\n\n'),
        metadatos: { motor: 'isolucion-documentos', fuentes: sources, estado_fuente: 'consultada' },
      };
    } catch {
      // La falta de red nunca se presenta como ausencia de documentos ni expone errores SQL.
      return {
        contenido: 'No pude consultar la fuente documental de Isolución en este momento. No puedo verificar una respuesta con sus documentos. Intenta nuevamente más tarde.',
        metadatos: { motor: 'isolucion-documentos', fuentes: [], estado_fuente: 'no_disponible' },
      };
    }
  }

  private generarRespuestaInstitucional(pregunta: string, contexto: string): string {
    const p = pregunta.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    if (/\bviaticos?\b|\bgastos de viaje\b|\bcomision(?:es)?\b/.test(p)) {
      return 'Para solicitar o legalizar viáticos, ingresa al módulo de **Viáticos** con tu cuenta. Sigue los campos, soportes y validaciones que indique el formulario disponible para tu rol.';
    }

    if (/\b(?:grados?|titulos?|diplomas?|actas?|graduad[oa]s?)\b/.test(p)) {
      return 'Para consultar títulos y documentos de grado, abre el servicio de **Verificación de Títulos** y sigue sus pasos de identificación y validación. Las opciones disponibles dependen de los registros y permisos del servicio.';
    }

    if (p.includes('certificado') || p.includes('laboral')) {
      return 'Para solicitar tu certificado laboral, abre el servicio de **Certificados Laborales** y sigue sus pasos de identificación y validación. La disponibilidad del documento depende de tus registros y del resultado de esa validación.';
    }

    if (/\bpta\b|\bplan de trabajo\b|\bdocentes?\b/.test(p)) {
      return 'El módulo **Plan de Trabajo Académico (PTA)** permite a los docentes estructurar su carga lectiva, investigación y extensión. Si requieres registrar o aprobar horas, accede a la sección correspondiente de PTA según tu rol.';
    }

    if (/\bdisciplinari[oa]s?\b/.test(p)) {
      return 'El módulo de **Control Disciplinario Interno** gestiona expedientes, etapas procesales y providencias de acuerdo al Código General Disciplinario. El acceso está restringido a funcionarios autorizados.';
    }

    if (p.includes('horario') || p.includes('programacion') || p.includes('aula')) {
      return 'La gestión de franjas horarias, asignaturas y asignación de aulas se encuentra en el módulo **Programación Académica**.';
    }

    return `He recibido tu consulta sobre "${pregunta.slice(0, 80)}". En la plataforma ESAP dispones de herramientas transversales para gestión académica, talento humano, soporte documental y control institucional. Si necesitas soporte adicional, indícame la temática o comunícate con la mesa de ayuda institucional.`;
  }
}
