import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { INTERNAL_SERVICE_ALLOWED_KEY } from '../decorators/internal-service.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const isInternalServiceAllowed =
      this.reflector.getAllAndOverride<boolean>(INTERNAL_SERVICE_ALLOWED_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    if (isInternalServiceAllowed && this.hasValidInternalServiceToken(context)) {
      return true;
    }

    return super.canActivate(context);
  }

  private hasValidInternalServiceToken(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<
        Request & {
          user?: {
            userId: string;
            username: string;
            roles: string[];
            internalService: boolean;
          };
        }
      >();
    const providedToken = request.header('x-internal-service-token');
    const expectedToken =
      process.env.INTERNAL_SERVICE_TOKEN || process.env.JWT_SECRET;

    if (!providedToken || !expectedToken || providedToken !== expectedToken) {
      return false;
    }

    request.user = {
      userId: 'internal-service',
      username: 'internal-service',
      roles: ['INTERNAL_SERVICE'],
      internalService: true,
    };

    return true;
  }
}
