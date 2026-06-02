/** Límites del DTO CreatePlanMejoramientoDto (class-validator) */
export const PM_MAX_AREA = 255;
export const PM_MAX_RESPONSABLE = 255;
export const PM_MAX_TITULO = 500;

/**
 * Convierte valores de auditoría/API (string, número u objeto) en texto plano para el backend.
 */
export function textoCampoPlanMejoramiento(
  valor: unknown,
  fallback = 'N/A',
  maxLen = PM_MAX_AREA,
): string {
  let s = '';
  if (typeof valor === 'string') {
    s = valor.trim();
  } else if (typeof valor === 'number' && Number.isFinite(valor)) {
    s = String(valor);
  } else if (valor && typeof valor === 'object') {
    const o = valor as Record<string, unknown>;
    s = String(
      o.nombre ??
        o.name ??
        o.label ??
        o.titulo ??
        o.descripcion ??
        o.codigo ??
        '',
    ).trim();
  }
  if (!s) s = fallback;
  if (maxLen > 0 && s.length > maxLen) {
    return s.slice(0, maxLen);
  }
  return s;
}

export function resolverAreaResponsableDesdeAuditoria(aud: Record<string, unknown> | null | undefined): string {
  return textoCampoPlanMejoramiento(
    aud?.areaResponsable ??
      aud?.areaObjetivo ??
      aud?.area ??
      aud?.procesoAuditado ??
      aud?.proceso,
    'Sin área',
    PM_MAX_AREA,
  );
}

const RE_CODIGO_AUDITORIA = /AUD-\d{4}-\d+/i;

/** Extrae AUD-YYYY-NNN del título u otro texto del plan. */
export function extraerCodigoAuditoriaDeTexto(texto: unknown): string | null {
  if (typeof texto !== 'string' || !texto.trim()) return null;
  const m = texto.match(RE_CODIGO_AUDITORIA);
  return m ? m[0].toUpperCase() : null;
}

/** Índices de auditorías que ya tienen plan (por id UUID y por código AUD-…). */
export function indexarAuditoriasConPlan(planes: unknown[]): {
  ids: Set<string>;
  codigos: Set<string>;
} {
  const ids = new Set<string>();
  const codigos = new Set<string>();

  for (const raw of planes) {
    const p = raw as Record<string, unknown>;
    const aud = p.auditoria as Record<string, unknown> | undefined;

    const id = p.auditoriaId ?? p.auditoria_id ?? aud?.id;
    if (id != null && String(id).length > 0) {
      ids.add(String(id));
    }

    const codigoAud =
      (typeof aud?.codigo === 'string' && aud.codigo) ||
      (typeof p.auditoriaCodigo === 'string' && p.auditoriaCodigo) ||
      extraerCodigoAuditoriaDeTexto(p.titulo) ||
      extraerCodigoAuditoriaDeTexto(p.auditoria);
    if (codigoAud) codigos.add(codigoAud.toUpperCase());
  }

  return { ids, codigos };
}

export function auditoriaYaTienePlan(
  auditoria: { id?: string; codigo?: string },
  index: { ids: Set<string>; codigos: Set<string> },
): boolean {
  if (auditoria.id && index.ids.has(String(auditoria.id))) return true;
  const cod = auditoria.codigo?.trim().toUpperCase();
  if (cod && index.codigos.has(cod)) return true;
  return false;
}

export function resolverResponsableImplementacionDesdeAuditoria(
  aud: Record<string, unknown> | null | undefined,
): string {
  const candidatos = [
    aud?.responsable,
    aud?.responsableImplementacion,
    typeof aud?.auditorLider === 'string' ? aud.auditorLider : (aud?.auditorLider as { nombre?: string })?.nombre,
    aud?.responsableAreaNombre,
  ];
  for (const c of candidatos) {
    const t = textoCampoPlanMejoramiento(c, '', PM_MAX_RESPONSABLE);
    if (t) return t;
  }
  return 'Sin responsable';
}
