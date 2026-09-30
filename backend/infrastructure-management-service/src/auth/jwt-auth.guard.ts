import { ExecutionContext, Injectable, Logger, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { AuthUser } from './types.js';

const norm = (s: string) => String(s || '').trim().toUpperCase();

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private fallbackWarnedAlready = false;

  constructor(
    private reflector: Reflector,
    @Optional() @InjectDataSource() private readonly dataSource?: DataSource,
  ) {
    super();
  }

  private parseCsvHeader(raw: unknown): string[] {
    if (raw == null) return [];
    const s = String(raw).trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x)).filter(Boolean);
      if (typeof parsed === 'object' && parsed != null) {
        const codes = [] as string[];
        if ('code' in parsed) codes.push(String((parsed as any).code));
        if ('codes' in parsed && Array.isArray((parsed as any).codes)) codes.push(...(parsed as any).codes);
        return codes.filter(Boolean);
      }
    } catch {}
    return s.split(/[,\s;|]+/).map((x) => x.trim()).filter(Boolean);
  }

  private async cargarPermisosDesdeBDPorRoles(roles: string[]): Promise<Set<string>> {
    const vacio = new Set<string>();
    if (!this.dataSource || !Array.isArray(roles) || roles.length === 0) return vacio;
    const rolesNorm = roles.map(norm).filter(Boolean);
    if (rolesNorm.length === 0) return vacio;
    if (rolesNorm.includes('SUPER_ADMIN')) {
      try {
        const todos = await this.dataSource.query(
          `SELECT p.code FROM auth.permission p WHERE p.is_active IS TRUE AND p.id_module = (SELECT m.id_module FROM auth.module m WHERE m.code = 'gestion-infraestructura' LIMIT 1)`,
        );
        return new Set<string>((todos || []).map((r: any) => norm(String(r.code || ''))).filter(Boolean));
      } catch (err: any) {
        if (!this.fallbackWarnedAlready) this.logger.warn(`[fallback-permisos] SUPER_ADMIN query falló: ${err?.message || String(err)}`);
        this.fallbackWarnedAlready = true;
        return vacio;
      }
    }
    try {
      const placeholders = rolesNorm.map(() => '?').join(', ');
      const rows = await this.dataSource.query(
        `SELECT DISTINCT p.code FROM auth.role r JOIN auth.role_permissions rp ON rp.id_rol = r.id JOIN auth.permission p ON p.id_permission = rp.id_permission WHERE r.is_active IS TRUE AND p.is_active IS TRUE AND rp.is_active IS TRUE AND UPPER(r.code) IN (${placeholders})`,
        rolesNorm,
      );
      return new Set<string>((rows || []).map((r: any) => norm(String(r.code || ''))).filter(Boolean));
    } catch (err: any) {
      if (!this.fallbackWarnedAlready) this.logger.warn(`[fallback-permisos] query roles falló: ${err?.message || String(err)}`);
      this.fallbackWarnedAlready = true;
      return vacio;
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const headerUserId = req.headers['x-user-id'];
    if (headerUserId) {
      const rolesRaw = req.headers['x-user-roles'] || req.headers['x-user-role'];
      const roles = this.parseCsvHeader(rolesRaw);
      const permisosRaw = req.headers['x-user-permissions'];
      let permissions: Set<string> = new Set(this.parseCsvHeader(permisosRaw).map(norm));
      if (permissions.size === 0) {
        permissions = await this.cargarPermisosDesdeBDPorRoles(roles);
      }
      const user: AuthUser = {
        userId: String(headerUserId),
        username: req.headers['x-user-username'] != null ? String(req.headers['x-user-username']) : undefined,
        email: req.headers['x-user-email'] != null ? String(req.headers['x-user-email']) : undefined,
        name: req.headers['x-user-name'] != null ? String(req.headers['x-user-name']) : undefined,
        roles,
        permissions,
        codigoTecnico: req.headers['x-user-technical-code'] != null ? String(req.headers['x-user-technical-code']).trim() : (req.headers['x-user-codigo-tecnico'] != null ? String(req.headers['x-user-codigo-tecnico']).trim() : undefined),
      };
      req.user = user;
      return true;
    }
    const ok = await Promise.resolve(super.canActivate(context));
    if (ok && req.user && typeof req.user === 'object' && !req.user.permissions) {
      const rolesRaw = (req.user as any).roles ?? [];
      const roles: string[] = Array.isArray(rolesRaw) ? rolesRaw.map(String).filter(Boolean) : [];
      req.user.permissions = await this.cargarPermisosDesdeBDPorRoles(roles);
    }
    return ok as boolean;
  }
}
