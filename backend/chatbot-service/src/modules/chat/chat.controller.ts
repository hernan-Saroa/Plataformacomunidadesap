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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateConversacionDto } from './dto/create-conversacion.dto';
import { CreateMensajeDto } from './dto/create-mensaje.dto';

@ApiTags('ChatBot')
@Controller('api/v1/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversaciones')
  @ApiOperation({ summary: 'Crear una nueva conversación de chat' })
  @ApiResponse({ status: 201, description: 'Conversación creada exitosamente' })
  crearConversacion(@Body() dto: CreateConversacionDto) {
    return this.chatService.crearConversacion(dto);
  }

  @Get('conversaciones')
  @ApiOperation({ summary: 'Listar conversaciones activas' })
  @ApiQuery({ name: 'email', required: false, description: 'Email del usuario' })
  @ApiQuery({ name: 'todos', required: false, description: 'Listar todas las conversaciones de todos los usuarios' })
  listarConversaciones(@Query('email') email?: string, @Query('todos') todos?: string) {
    const verTodos = todos === 'true' || todos === '1';
    return this.chatService.listarConversaciones(email, verTodos);
  }

  @Get('conversaciones/:id')
  @ApiOperation({ summary: 'Obtener el detalle de una conversación con sus mensajes' })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  obtenerConversacion(@Param('id') id: string) {
    return this.chatService.obtenerConversacion(id);
  }

  @Post('conversaciones/:id/mensajes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar mensaje y recibir respuesta del asistente virtual' })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  enviarMensaje(@Param('id') id: string, @Body() dto: CreateMensajeDto) {
    return this.chatService.enviarMensaje(id, dto);
  }

  @Delete('conversaciones/:id')
  @ApiOperation({ summary: 'Eliminar o desactivar una conversación' })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  eliminarConversacion(@Param('id') id: string) {
    return this.chatService.eliminarConversacion(id);
  }
}
