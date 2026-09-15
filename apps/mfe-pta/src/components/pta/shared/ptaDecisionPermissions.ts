import type { PTADecisionPermissions } from '../../../services/api/ptaApi';

export function canDecidePtaComponent(
  permissions: PTADecisionPermissions | null,
  component: string,
  stage: 'aprobar' | 'revisar',
  subsection = 'general',
  pair?: { territorialId: string; nivel: string },
): boolean {
  if (!permissions) return false;
  const allowed = stage === 'aprobar'
    ? permissions.allowedComponents.includes(component)
    : permissions.allowedReviewSubsecciones.includes(`${component}:${subsection}`);
  if (!allowed) return false;
  if (component !== 'academica_territorial') return true;
  const pairs = permissions.territorial[stage].pairs;
  return pair
    ? pairs.some(p => String(p.territorialId) === String(pair.territorialId) && p.nivel === pair.nivel)
    : pairs.length > 0;
}
