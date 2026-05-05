/**
 * Helper para depurar problemas de autenticación y roles
 */

export function debugAuthToken() {
  const token = sessionStorage.getItem('esap_auth_token');
  
  if (!token) {
    console.warn('⚠️ No hay token de autenticación');
    return null;
  }

  try {
    // Decodificar JWT (sin verificar firma, solo para debug)
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('❌ Token JWT inválido');
      return null;
    }

    const payload = JSON.parse(atob(parts[1]));
    
    console.log('🔑 Información del Token JWT:', {
      userId: payload.sub || payload.userId,
      username: payload.username,
      email: payload.email,
      role: payload.role,
      roles: payload.roles,
      exp: payload.exp ? new Date(payload.exp * 1000).toLocaleString() : 'N/A',
      iat: payload.iat ? new Date(payload.iat * 1000).toLocaleString() : 'N/A'
    });

    return payload;
  } catch (error) {
    console.error('❌ Error al decodificar token:', error);
    return null;
  }
}

// Exportar para uso en consola del navegador
if (typeof window !== 'undefined') {
  (window as any).debugAuthToken = debugAuthToken;
}
