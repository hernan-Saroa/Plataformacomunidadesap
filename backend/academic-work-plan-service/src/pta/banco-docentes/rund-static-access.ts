import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import { posix } from 'path';
import type { Request, Response, NextFunction } from 'express';
import { recordRundAccess, rundRequestActor } from './rund-access-audit';
import { RUND_SENSITIVE_FIELDS } from './banco-docentes-sensitive-data';

export function normalizedUploadPath(rawPath: string): string {
  return posix.normalize(decodeURIComponent(rawPath.split('?')[0]).replace(/\\/g, '/'));
}

export function isProtectedRundUpload(path: string): boolean {
  return /^\/uploads\/rund-documentos(?:\/|$)/i.test(path)
    || /^\/uploads\/carpeta-digital\/.*\/rund(?:\/|$)/i.test(path);
}

/** Conserva URLs históricas y adjuntos ajenos al RUND; autentica/audita antes del servidor estático. */
export function rundStaticAccess(db: Parameters<typeof recordRundAccess>[0], jwt: JwtService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (/\/(banco-docentes|macro-docente)(\/|$)/i.test(req.path)) {
      res.setHeader('Cache-Control', 'private, no-store');
    }
    let path: string;
    try { path = normalizedUploadPath(req.path); }
    catch { res.status(400).json({ message: 'Ruta de archivo inválida.' }); return; }
    if (!isProtectedRundUpload(path)) return next();
    res.setHeader('Cache-Control', 'private, no-store');
    const bearer = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
    const cookie = String(req.headers.cookie || '').split(';').map((part) => part.trim())
      .find((part) => part.startsWith('esap_access_token='))?.slice('esap_access_token='.length);
    let authenticated = false;
    try {
      const payload = jwt.verify(bearer || cookie || '');
      if (payload.sub) { (req as any).user = { ...payload, userId: payload.sub }; authenticated = true; }
    } catch { /* La decisión denegada también queda auditada. */ }
    const actor = rundRequestActor(req);
    try {
      await recordRundAccess(db, { ...actor, fields: RUND_SENSITIVE_FIELDS,
        endpoint: 'CONSULTAR_ARCHIVO_RUND_HISTORICO',
        resourceId: createHash('sha256').update(path).digest('hex'),
        result: authenticated && actor.fullAccess ? 'COMPLETO' : 'DENEGADO',
      });
    } catch { res.status(503).json({ message: 'No fue posible registrar el acceso al archivo.' }); return; }
    if (!authenticated || !actor.fullAccess) {
      res.status(authenticated ? 403 : 401).json({ message: 'El archivo original requiere un rol autorizado para datos sensibles.' });
      return;
    }
    next();
  };
}
