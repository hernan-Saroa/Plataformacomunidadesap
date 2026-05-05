/**
 * WRAPPER DE COMPATIBILIDAD
 * Este archivo redirige al módulo unificado
 */

import { CommunityPostsModuleUnified } from './CommunityPostsModuleUnified';

export function CommunityPostsModule() {
  return <CommunityPostsModuleUnified canModerate={false} />;
}

export default CommunityPostsModule;
