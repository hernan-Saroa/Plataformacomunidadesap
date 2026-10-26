import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';
import { PublicChatService } from '../modules/chat/public-chat.service';

@Injectable()
export class ChatbotEnabledGuard implements CanActivate {
  constructor(private readonly availability: PublicChatService) {}

  async canActivate(): Promise<boolean> {
    if (!(await this.availability.configuracion()).activo) {
      throw new NotFoundException('El asistente no está habilitado.');
    }
    return true;
  }
}
