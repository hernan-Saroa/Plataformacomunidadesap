function auditLocation(value: string) {
  let origin = '', path = String(value || '').split(/[?#]/)[0];
  if (/^(?:https?:)?\/\//i.test(value)) {
    try {
      const parsed = new URL(value, 'http://audit.invalid');
      origin = value.startsWith('//') ? `//${parsed.host}` : parsed.origin;
      path = parsed.pathname; // Nunca conservar credenciales de la autoridad de la URL.
    } catch { /* Una ruta inválida también se redacta si el caller ya conoce su propietario. */ }
  }
  try { path = decodeURIComponent(path); } catch { /* Segmentos inválidos no coinciden con literales permitidos. */ }
  return { origin, path };
}

export function isRundAuditUrl(url: string): boolean {
  const { path } = auditLocation(url);
  const normalized = path.replace(/^\/services(?=\/)/i, '');
  return /^\/(?:rund|rund-service)(?:\/|$)/i.test(normalized)
    || /^\/(?:pta|academic-work-plan-service)\/api\/(?:v\d+\/)?rund(?:\/|$)/i.test(normalized)
    || /^\/(?:auth|auth-service)\/api\/(?:v\d+\/)?(?:(?:portal|internal)\/)?(?:carpeta-digital|uploads\/carpeta-digital)(?:\/|$)/i.test(normalized)
    || /^\/(?:auth|auth-service)\/uploads\/carpeta-digital(?:\/|$)/i.test(normalized)
    || /^\/(?:(?:portal|internal)\/)?carpeta-digital(?:\/|$)/i.test(normalized)
    || /^\/uploads\/carpeta-digital(?:\/|$)/i.test(normalized)
    // Compatibilidad con las rutas PTA y destinos internos del banco anterior.
    || /\/(?:banco-docentes|macro-docente|docentes-disponibles|autogestion\/docentes)(?:\/|$)/i.test(normalized)
    // Conservar también la heurística previa si la referencia histórica venía en la consulta.
    || /\/(?:banco-docentes|macro-docente|docentes-disponibles|autogestion\/docentes)(?:\/|\?|$)/i.test(url);
}

// Solo literales de operación en logs; no es un catálogo de rutas públicas ni de permisos.
const operations = new Set(`services rund rund-service auth auth-service pta academic-work-plan-service api portal internal
  carpeta-digital uploads files banco-docentes macro-docente docentes-disponibles docentes docente documento documentos soporte soportes
  trayectoria formacion experiencia produccion situaciones-admin tarjeta-digital estadisticas dashboard verificar estado validar vigentes emitir
  stats consulta invitaciones accesos-externos externo proximos-vencer validar-unicidad admin sync-all-soportes reparar-soportes-db sync-check
  by-persona tarjeta-rund detectar-duplicado bulk historial sync-auth sync-from-auth otp request validate drafts autogestion me submit
  categorias contenido reemplazo validacion-documental batch bloques aprobar devolver revision activacion cabezote auditoria
  persona personas perfiles perfiles-rund interoperabilidad versiones restaurar reclassify upload estado-rund tipos-documentos
  evidencias validacion extraccion notificaciones campo campos evidencia`.split(/\s+/).filter(Boolean));
const alwaysParameter = new Set(['drafts', 'submit', 'me', 'externo', 'verificar', 'persona', 'personas', 'by-persona',
  'docente', 'documento', 'perfiles', 'versiones', 'accesos-externos', 'bloques']);
const collectionOperations: Record<string, Set<string>> = {
  'banco-docentes': new Set('stats invitaciones soportes validar-unicidad admin reparar-soportes-db by-persona detectar-duplicado bulk sync-auth sync-from-auth otp drafts autogestion submit documentos'.split(' ')),
  docentes: new Set(['documento']),
  soportes: new Set(['docente', 'proximos-vencer', 'autogestion']),
  documentos: new Set(['upload', 'categorias', 'documento', 'soporte']),
  'carpeta-digital': new Set(['persona', 'personas', 'documentos', 'upload', 'estadisticas', 'tipos-documentos']),
};

/** El segundo argumento conserva el contexto RUND al registrar el destino interno sin prefijo. */
export function redactRundAuditUrl(url: string, protectedRequest = false): string {
  if (!protectedRequest && !isRundAuditUrl(url)) return url;
  const { origin, path } = auditLocation(url);
  // Si solo la consulta activaba la heurística antigua, conservar la operación ajena sin su consulta.
  if (!protectedRequest && !isRundAuditUrl(url.split(/[?#]/)[0])) return origin + path;
  const segments = path.split('/');
  let originalFile = false;
  const redacted = segments.map((segment, index) => {
    if (!segment) return '';
    const lower = segment.toLowerCase(), previous = segments[index - 1]?.toLowerCase();
    if (originalFile) return '[REDACTED]';
    if (alwaysParameter.has(previous) || (collectionOperations[previous] && !collectionOperations[previous].has(lower))) return '[REDACTED]';
    if (lower === 'uploads' || lower === 'files') originalFile = true;
    return operations.has(lower) || (previous === 'api' && /^v\d+$/.test(lower)) ? lower : '[REDACTED]';
  }).join('/');
  return origin + (redacted || '/[REDACTED]');
}
