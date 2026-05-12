/**
 * Helper para depurar problemas de autenticación y roles
 */

export function debugAuthToken() {
  const user = (window as any).__esap_auth_cache;

  if (!user) {
    console.warn('⚠️ No hay usuario en cache de autenticación');
    return null;
  }

  console.log('🔑 Información del Usuario en cache:', {
    userId: user.id || user.userId || user.sub,
    username: user.username,
    email: user.email,
    roles: user.roles,
  });

  return user;
}

// Exportar para uso en consola del navegador
if (typeof window !== 'undefined') {
  (window as any).debugAuthToken = debugAuthToken;
}
