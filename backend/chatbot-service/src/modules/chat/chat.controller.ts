import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  ParseUUIDPipe,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateConversacionDto } from './dto/create-conversacion.dto';
import { CreateMensajeDto } from './dto/create-mensaje.dto';
import { ChatbotAuthGuard } from '../../auth/chatbot-auth.guard';
import type { ChatbotRequest } from '../../auth/chatbot-auth.guard';
import { ChatbotEnabledGuard } from '../../auth/chatbot-enabled.guard';

@ApiTags('ChatBot')
@ApiBearerAuth()
@UseGuards(ChatbotAuthGuard, ChatbotEnabledGuard)
// El gateway elimina /:service/api/v1; conservar también la ruta directa anterior.
@Controller(['chat', 'api/v1/chat'])
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('acceso')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Consultar el acceso vigente al historial institucional' })
  obtenerAcceso(@Req() req: ChatbotRequest) {
    return { puedeVerTodas: req.chatbotAuth.canReadAll };
  }

  @Post('conversaciones')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Crear una nueva conversación de chat' })
  @ApiResponse({ status: 201, description: 'Conversación creada exitosamente' })
  crearConversacion(@Body() dto: CreateConversacionDto, @Req() req: ChatbotRequest) {
    return this.chatService.crearConversacion(dto, req.chatbotAuth);
  }

  @Get('conversaciones')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Listar conversaciones activas' })
  @ApiQuery({ name: 'email', required: false, description: 'Filtro opcional del historial institucional autorizado' })
  @ApiQuery({ name: 'todos', required: false, description: 'Listar todas las conversaciones de todos los usuarios' })
  listarConversaciones(@Req() req: ChatbotRequest, @Query('email') email?: string, @Query('todos') todos?: string) {
    const verTodos = todos === 'true' || todos === '1';
    return this.chatService.listarConversaciones(req.chatbotAuth, verTodos, email);
  }

  @Get('conversaciones/:id')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Obtener el detalle de una conversación con sus mensajes' })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  obtenerConversacion(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: ChatbotRequest) {
    return this.chatService.obtenerConversacion(id, req.chatbotAuth);
  }

  @Post('conversaciones/:id/mensajes')
  @Header('Cache-Control', 'private, no-store')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar mensaje y recibir respuesta del asistente virtual' })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  enviarMensaje(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: CreateMensajeDto, @Req() req: ChatbotRequest) {
    return this.chatService.enviarMensaje(id, dto, req.chatbotAuth);
  }

  @Delete('conversaciones/:id')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Eliminar o desactivar una conversación' })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  eliminarConversacion(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: ChatbotRequest) {
    return this.chatService.eliminarConversacion(id, req.chatbotAuth);
  }
}
