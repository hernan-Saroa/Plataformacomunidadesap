import { CallHandler, ExecutionContext, Injectable, NestInterceptor, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { mergeMap } from 'rxjs/operators';
import { findRundSensitiveFields, protectRundSensitiveData } from './banco-docentes-sensitive-data';
import { recordRundAccess, rundRequestActor } from './rund-access-audit';

/** Protege también docentes incluidos en respuestas de PTA, sin alterar sus catálogos públicos. */
@Injectable()
export class PtaRundSensitiveInterceptor implements NestInterceptor {
  constructor(private readonly db: DataSource, private readonly jwt: JwtService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(mergeMap(async (payload) => {
      const fields = findRundSensitiveFields(payload);
      if (!fields.length) return payload;
      const req = context.switchToHttp().getRequest();
      if (!req.user) {
        const bearer = String(req.headers?.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
        const cookie = String(req.headers?.cookie || '').split(';').map((part) => part.trim())
          .find((part) => part.startsWith('esap_access_token='))?.slice('esap_access_token='.length);
        try {
          const user = this.jwt.verify(bearer || cookie || '');
          if (!user.sub) throw new Error('No user');
          req.user = { ...user, userId: user.sub };
        } catch { throw new UnauthorizedException('Debe iniciar sesión para consultar información docente.'); }
      }
      const actor = rundRequestActor(req);
      const docenteIds = new Set<string>();
      const collect = (value: any) => {
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value)) { value.forEach(collect); return; }
        const id = value.docenteId || value.docente_id ||
          (value.persona && findRundSensitiveFields(value.persona).length ? value.id : undefined);
        if (id) docenteIds.add(String(id));
        Object.values(value).forEach(collect);
      };
      collect(payload);
      await recordRundAccess(this.db, { ...actor, fields,
        endpoint: `PTA:${context.getHandler().name}`,
        docenteIds: [...docenteIds],
      });
      context.switchToHttp().getResponse().setHeader('Cache-Control', 'private, no-store');
      return protectRundSensitiveData(payload, actor.fullAccess);
    }));
  }
}
