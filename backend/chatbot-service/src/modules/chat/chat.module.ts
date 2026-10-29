import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversacion } from './entities/conversacion.entity';
import { Mensaje } from './entities/mensaje.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { JwtModule } from '@nestjs/jwt';
import { ChatbotAuthGuard } from '../../auth/chatbot-auth.guard';
import { PublicChatController } from './public-chat.controller';
import { PublicChatService } from './public-chat.service';
import { IsolucionModule } from '../isolucion/isolucion.module';
import { ChatbotEnabledGuard } from '../../auth/chatbot-enabled.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Conversacion, Mensaje]), JwtModule.register({}), IsolucionModule],
  controllers: [ChatController, PublicChatController],
  providers: [ChatService, ChatbotAuthGuard, ChatbotEnabledGuard, PublicChatService],
  exports: [ChatService],
})
export class ChatModule {}
