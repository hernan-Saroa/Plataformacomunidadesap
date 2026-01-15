import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditClientService {
  private readonly logger = new Logger(AuditClientService.name);
  private readonly auditServiceUrl: string;

  constructor(private readonly httpService: HttpService) {
    // URL del servicio de auditoría
    this.auditServiceUrl =
      process.env.AUDIT_SERVICE_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'http://audit-service:3011'
        : 'http://localhost:3011');
  }

  async logRequest(logData: CreateAuditLogDto): Promise<void> {
    try {
      // Enviar de forma asíncrona sin bloquear
      // Usar timeout corto para no afectar performance
      await firstValueFrom(
        this.httpService.post(`${this.auditServiceUrl}/logs`, logData, {
          timeout: 500, // 500ms timeout
        }),
      );
    } catch (error: any) {
      // No lanzar error para no afectar la petición original
      // Solo loggear en desarrollo
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn(
          `Error al enviar log a audit service: ${error.message}`,
        );
      }
    }
  }
}


