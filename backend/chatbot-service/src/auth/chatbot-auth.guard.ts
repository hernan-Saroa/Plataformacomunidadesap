import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import type { Request } from 'express';
import { DataSource } from 'typeorm';

export const READ_ALL_CONVERSATIONS = 'chatbot.conversaciones.read_all';

export interface ChatbotAuthContext {
  userId: string;
  email?: string;
  name?: string;
  canReadAll: boolean;
}

export type ChatbotRequest = Request & { chatbotAuth: ChatbotAuthContext };

@Injectable()
export class ChatbotAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ChatbotRequest>();
    // No confiar en x-user-*, roles o permisos enviados por el navegador.
    const authorization = request.headers.authorization;
    const token = authorization
      ? /^Bearer\s+(.+)$/i.exec(authorization)?.[1]?.trim()
      : request.headers.cookie?.split(';')
          .map((part) => part.trim())
          .find((part) => part.startsWith('esap_access_token='))
          ?.slice('esap_access_token='.length);

    if (!token) throw new UnauthorizedException('Inicia sesión para consultar tus conversaciones.');

    const secret = process.env.JWT_SECRET;
    // La configuración ausente es un fallo del servicio, no una sesión vencida.
    if (!secret?.trim()) throw new ServiceUnavailableException('El servicio del chatbot no está disponible temporalmente.');

    let userId: string;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret,
        algorithms: ['HS256'],
      });
      userId = payload.sub;
      if (typeof userId !== 'string' || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(userId)) {
        throw new Error('Invalid subject');
      }
    } catch {
      throw new UnauthorizedException('La sesión es inválida o ha expirado.');
    }

    // Consultar asignaciones vigentes: una sesión puede contener roles ya revocados.
    const [actor]: ChatbotAuthContext[] = await this.dataSource.query(
      `SELECT u.id_user AS "userId", p.dir_email AS email,
              COALESCE(NULLIF(p.nom_largo, ''), u.username) AS name,
              EXISTS (
                SELECT 1 FROM auth.user_roles ur
                JOIN auth.role r ON r.id = ur.id_rol AND r.is_active = true
                JOIN auth.role_permissions rp ON rp.id_rol = r.id AND rp.is_active = true
                JOIN auth.permission ap ON ap.id_permission = rp.id_permission AND ap.is_active = true
                WHERE ur.id_user = u.id_user AND ur.is_active = true AND ap.code = $2
              ) AS "canReadAll"
         FROM auth."user" u
         LEFT JOIN auth.personas p ON p.id_person = u.id_person
        WHERE u.id_user = $1::uuid AND u.is_active = true`,
      [userId, READ_ALL_CONVERSATIONS],
    );
    if (!actor) throw new UnauthorizedException('La cuenta no está activa.');

    request.chatbotAuth = actor;
    return true;
  }
}
