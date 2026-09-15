import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversacion } from './entities/conversacion.entity';
import { Mensaje } from './entities/mensaje.entity';
import { CreateConversacionDto } from './dto/create-conversacion.dto';
import { CreateMensajeDto } from './dto/create-mensaje.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversacion)
    private readonly conversacionRepo: Repository<Conversacion>,
    @InjectRepository(Mensaje)
    private readonly mensajeRepo: Repository<Mensaje>,
  ) {}

  async crearConversacion(dto: CreateConversacionDto): Promise<Conversacion> {
    const conversacion = this.conversacionRepo.create({
      titulo: dto.titulo || 'Nueva consulta',
      contexto: dto.contexto || 'general',
      usuarioId: dto.usuarioId,
      usuarioEmail: dto.usuarioEmail,
      usuarioNombre: dto.usuarioNombre,
    });

    const guardada = await this.conversacionRepo.save(conversacion);

    // Mensaje de bienvenida inicial del sistema
    const bienvenida = this.mensajeRepo.create({
      conversacionId: guardada.id,
      rol: 'assistant',
      contenido:
        '¡Hola! Soy el Asistente Virtual de la Escuela Superior de Administración Pública (ESAP). ¿En qué puedo orientarte hoy?',
    });
    await this.mensajeRepo.save(bienvenida);

    return this.obtenerConversacion(guardada.id);
  }

  async listarConversaciones(usuarioEmail?: string, todos?: boolean): Promise<Conversacion[]> {
    const query = this.conversacionRepo
      .createQueryBuilder('c')
      .where('c.is_activo = :activo', { activo: true })
      .orderBy('c.updated_at', 'DESC');

    if (usuarioEmail && !todos) {
      query.andWhere('(c.usuario_email = :email OR c.usuario_email IS NULL)', {
        email: usuarioEmail,
      });
    }

    return query.getMany();
  }

  async obtenerConversacion(id: string): Promise<Conversacion> {
    const conversacion = await this.conversacionRepo.findOne({
      where: { id, isActivo: true },
      relations: ['mensajes'],
      order: {
        mensajes: {
          createdAt: 'ASC',
        },
      },
    });

    if (!conversacion) {
      throw new NotFoundException(`Conversación con ID ${id} no encontrada`);
    }

    return conversacion;
  }

  async enviarMensaje(
    conversacionId: string,
    dto: CreateMensajeDto,
  ): Promise<{ userMessage: Mensaje; botMessage: Mensaje }> {
    const conversacion = await this.obtenerConversacion(conversacionId);

    // 1. Guardar mensaje del usuario
    const userMessage = this.mensajeRepo.create({
      conversacionId: conversacion.id,
      rol: dto.rol || 'user',
      contenido: dto.contenido,
      metadatos: dto.metadatos || {},
    });
    const savedUserMsg = await this.mensajeRepo.save(userMessage);

    // Actualizar título de la conversación si es el primer mensaje del usuario
    if (conversacion.titulo === 'Nueva conversación' || conversacion.titulo === 'Nueva consulta') {
      conversacion.titulo = dto.contenido.slice(0, 50) + (dto.contenido.length > 50 ? '...' : '');
    }
    conversacion.updatedAt = new Date();
    await this.conversacionRepo.save(conversacion);

    // 2. Generar respuesta institucional del Asistente Virtual
    const botResponseText = this.generarRespuestaInstitucional(dto.contenido, conversacion.contexto);

    const botMessage = this.mensajeRepo.create({
      conversacionId: conversacion.id,
      rol: 'assistant',
      contenido: botResponseText,
      metadatos: {
        motor: 'esap-knowledge-base',
        generado_en: new Date().toISOString(),
      },
    });
    const savedBotMsg = await this.mensajeRepo.save(botMessage);

    return {
      userMessage: savedUserMsg,
      botMessage: savedBotMsg,
    };
  }

  async eliminarConversacion(id: string): Promise<{ success: boolean }> {
    const conversacion = await this.conversacionRepo.findOne({ where: { id } });
    if (!conversacion) {
      throw new NotFoundException(`Conversación con ID ${id} no encontrada`);
    }

    conversacion.isActivo = false;
    await this.conversacionRepo.save(conversacion);
    return { success: true };
  }

  private generarRespuestaInstitucional(pregunta: string, contexto: string): string {
    const p = pregunta.toLowerCase();

    if (p.includes('viatico') || p.includes('gastos de viaje') || p.includes('comision')) {
      return 'Para la solicitud y legalización de viáticos y gastos de viaje en la ESAP, debes ingresar al módulo de **Viáticos** en el menú lateral. Recuerda adjuntar los soportes requeridos (resolución de comisión, tiquetes y facturas válidas) con anterioridad a las fechas del desplazamiento.';
    }

    if (p.includes('grado') || p.includes('titulo') || p.includes('diploma') || p.includes('acta')) {
      return 'Para temas de graduación y verificación de títulos, puedes acceder al módulo de **Graduados / Verificación de Títulos**. Allí puedes consultar el estado de tu postulación a grado y generar o validar constancias institucionales con código QR.';
    }

    if (p.includes('certificado') || p.includes('laboral')) {
      return 'Puedes descargar tus certificados laborales oficiales inmediatamente desde el módulo **Certificados Laborales**. El sistema genera documentos con firma digital y código de verificación institucional.';
    }

    if (p.includes('pta') || p.includes('plan de trabajo') || p.includes('docente')) {
      return 'El módulo **Plan de Trabajo Académico (PTA)** permite a los docentes estructurar su carga lectiva, investigación y extensión. Si requieres registrar o aprobar horas, accede a la sección correspondiente de PTA según tu rol.';
    }

    if (p.includes('disciplinario') || p.includes('proceso')) {
      return 'El módulo de **Control Disciplinario Interno** gestiona expedientes, etapas procesales y providencias de acuerdo al Código General Disciplinario. El acceso está restringido a funcionarios autorizados.';
    }

    if (p.includes('horario') || p.includes('programacion') || p.includes('aula')) {
      return 'La gestión de franjas horarias, asignaturas y asignación de aulas se encuentra en el módulo **Programación Académica**.';
    }

    return `He recibido tu consulta sobre "${pregunta.slice(0, 80)}". En la plataforma ESAP dispones de herramientas transversales para gestión académica, talento humano, soporte documental y control institucional. Si necesitas soporte adicional, indícame la temática o comunícate con la mesa de ayuda institucional.`;
  }
}
