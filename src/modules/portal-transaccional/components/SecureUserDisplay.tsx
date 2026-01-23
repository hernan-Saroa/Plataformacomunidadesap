import React from 'react';
import { sanitizeName } from '../security/xssProtection';

/**
 * 🔒 COMPONENTE SEGURO: Display de Usuario
 * 
 * Muestra información del usuario con sanitización XSS automática.
 * Previene inyección de código malicioso en nombres y datos.
 */

interface SecureUserDisplayProps {
  nombres?: string;
  apellidos?: string;
  email?: string;
  className?: string;
}

export function SecureUserDisplay({
  nombres = '',
  apellidos = '',
  email = '',
  className = ''
}: SecureUserDisplayProps) {
  // 🔒 Sanitizar todos los inputs antes de renderizar
  const safeNombres = sanitizeName(nombres);
  const safeApellidos = sanitizeName(apellidos);
  
  // No renderizar si no hay datos válidos
  if (!safeNombres && !safeApellidos) {
    return null;
  }

  return (
    <span className={className}>
      {safeNombres} {safeApellidos}
    </span>
  );
}

/**
 * Hook para datos de usuario sanitizados
 */
export function useSanitizedUser(user: any) {
  return React.useMemo(() => {
    if (!user) return null;

    return {
      ...user,
      nombres: sanitizeName(user.nombres),
      apellidos: sanitizeName(user.apellidos),
      email: user.email?.toLowerCase().trim() || ''
    };
  }, [user]);
}
