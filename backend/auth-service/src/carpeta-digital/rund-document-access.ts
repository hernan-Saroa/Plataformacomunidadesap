import { ServiceUnavailableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import { posix } from 'path';
import type { Request, Response, NextFunction } from 'express';
import type { RundDocumentAccessApi } from './rund-client';

/** Contrato compartido con RUND: los permisos generales no elevan la visibilidad. */
export function rundDocumentActor(user: any) {
  const roles = (Array.isArray(user?.roles) ? user.roles : [user?.role])
    .map((role: any) => String(typeof role === 'string' ? role : role?.code || '').trim().toUpperCase()).filter(Boolean);
  return { actorId: String(user?.userId || user?.sub || 'NO_AUTENTICADO'), roles,
    fullAccess: roles.some((role: string) => ['GESTION_PROFESORAL', 'SUPER_ADMIN'].includes(role)),
  };
}

export function isRundFolderDocument(document: any): boolean {
  return Boolean(document.rund_soporte_id || document.rundSoporteId
    || String(document.origen || '').toLowerCase() === 'rund'
    || String(document.categoria || '').toLowerCase() === 'rund');
}

/** Identificador permanente: retirar el documento de la carpeta no vuelve público el archivo. */
export function rundOriginalResourceId(url: string): string {
  return createHash('sha256').update(String(url || '').toLowerCase()).digest('hex');
}

export async function auditRundDocuments(rund: Pick<RundDocumentAccessApi, 'registrarAcceso'>, user: any, endpoint: string, resourceId: string, denied = false) {
  const actor = rundDocumentActor(user);
  try {
    // La bitácora es del RUND: la escribe rund-service. Si no se puede registrar, no se continúa.
    await rund.registrarAcceso({
      actorId: actor.actorId, roles: actor.roles, endpoint, recursoId: resourceId,
      campos: ['DOCUMENTO_IDENTIDAD', 'PUNTAJE_SALARIAL'],
      resultado: denied ? 'DENEGADO' : actor.fullAccess ? 'COMPLETO' : 'ENMASCARADO',
    });
  } catch { throw new ServiceUnavailableException('No fue posible registrar el acceso a documentos RUND.'); }
}

export function protectRundFolderDocument(document: any, user: any) {
  if (!isRundFolderDocument(document)) return document;
  const fullAccess = rundDocumentActor(user).fullAccess;
  return { ...document, contenido_restringido: !fullAccess,
    ...(fullAccess ? {} : { nombre: 'Documento del perfil', comentarios: null, url_archivo: null }),
  };
}

/** Cubre copias de soportes RUND cargadas desde Carpeta Digital, sin bloquear adjuntos ajenos. */
/** Endpoints de Carpeta Digital cuyo registro marca un recurso como original RUND protegido. */
export const RUND_ORIGINAL_ENDPOINTS = ['CARPETA_DIGITAL_ORIGINAL_RUND', 'CARPETA_DIGITAL_CARGAR_RUND',
  'CARPETA_DIGITAL_RECLASIFICAR_RUND', 'CARPETA_DIGITAL_VALIDAR_RUND', 'CARPETA_DIGITAL_RETIRAR_RUND'];

export function rundFolderStaticAccess(db: { query: Function }, jwt: JwtService, rund: RundDocumentAccessApi) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // El portal admite adjuntos generales sin sesión. La identidad opcional solo
    // decide la visibilidad de los soportes RUND incluidos en sus respuestas.
    if (/\/carpeta-digital(?:\/|$)/i.test(req.path) && !/\/uploads\//i.test(req.path)) {
      const bearer = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
      const cookie = String(req.headers.cookie || '').split(';').map((part) => part.trim())
        .find((part) => part.startsWith('esap_access_token='))?.slice('esap_access_token='.length);
      try { const user = jwt.verify(bearer || cookie || ''); if (user.sub) (req as any).user = { ...user, userId: user.sub }; } catch { /* Sin elevación de visibilidad. */ }
      if (/\/documentos(?:\/|$)/i.test(req.path)) res.setHeader('Cache-Control', 'private, no-store');
      return next();
    }
    let path: string;
    try { path = posix.normalize(decodeURIComponent(req.path).replace(/\\/g, '/')); }
    catch { res.status(400).end(); return; }
    if (!/^\/uploads\/carpeta-digital\//i.test(path)) return next();
    try {
      const resourceId = rundOriginalResourceId('/auth/api/v1' + path);
      // Los adjuntos de auth se consultan aquí; los soportes y la bitácora del RUND, en rund-service.
      const rows = await db.query(`SELECT id_documento FROM auth.documento_carpeta_digital
        WHERE LOWER(url_archivo) = LOWER($1)
          AND (rund_soporte_id IS NOT NULL OR LOWER(categoria) = 'rund')
        LIMIT 1`, ['/auth/api/v1' + path]);
      const esRund = rows.length > 0 || await rund.esOriginalRund('/auth/api/v1' + path, resourceId, RUND_ORIGINAL_ENDPOINTS);
      if (!esRund) return next();
      const bearer = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
      const cookie = String(req.headers.cookie || '').split(';').map((v) => v.trim())
        .find((v) => v.startsWith('esap_access_token='))?.slice('esap_access_token='.length);
      let user: any;
      try { user = jwt.verify(bearer || cookie || ''); } catch { /* denegado */ }
      const allowed = Boolean(user?.sub && rundDocumentActor(user).fullAccess);
      res.setHeader('Cache-Control', 'private, no-store');
      await auditRundDocuments(rund, user, 'CARPETA_DIGITAL_ORIGINAL_RUND', resourceId, !allowed);
      if (!allowed) { res.status(user?.sub ? 403 : 401).json({ message: 'El original RUND está restringido para su rol.' }); return; }
      next();
    } catch { res.status(503).json({ message: 'No fue posible verificar el acceso al documento.' }); }
  };
}
