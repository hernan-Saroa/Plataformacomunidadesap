import React from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldAlert, Lock } from 'lucide-react';

interface PortalRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  requiredPermission?: string | string[];
  user?: any; // TODO: Tipo UsuarioPersona
}

/**
 * Componente Guard para proteger rutas del Portal
 * 
 * Verifica que el usuario tenga los roles/permisos necesarios
 * antes de permitir acceso a una ruta.
 */
export function PortalRoute({
  children,
  requiredRole,
  requiredPermission,
  user
}: PortalRouteProps) {
  // Verificar autenticación
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Verificar rol si se especifica
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRequiredRole = roles.some(role => user.roles?.includes(role));
    
    if (!hasRequiredRole) {
      return <AccessDenied 
        message={`Este servicio requiere uno de los siguientes roles: ${roles.join(', ')}`}
        type="role"
      />;
    }
  }

  // Verificar permiso si se especifica
  if (requiredPermission) {
    const permissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    const hasRequiredPermission = permissions.some(perm => user.permisos?.includes(perm));
    
    if (!hasRequiredPermission) {
      return <AccessDenied 
        message="No tienes permisos para acceder a este servicio"
        type="permission"
      />;
    }
  }

  return <>{children}</>;
}

/**
 * Componente de Acceso Denegado
 */
function AccessDenied({ message, type }: { message: string; type: 'role' | 'permission' }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E0EDFF] via-white to-[#FFF8E1] flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Card de Error */}
        <div className="bg-white rounded-xl shadow-lg border border-red-200 overflow-hidden">
          {/* Header Rojo */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                {type === 'role' ? (
                  <ShieldAlert className="w-8 h-8" />
                ) : (
                  <Lock className="w-8 h-8" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-light">Acceso Denegado</h1>
                <p className="text-sm text-white/80">Permisos insuficientes</p>
              </div>
            </div>
          </div>

          {/* Contenido */}
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">
                {message}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-[#E0EDFF] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs text-[#003DA5] font-medium">1</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                    Verifica tus roles
                  </h3>
                  <p className="text-sm text-gray-600">
                    Asegúrate de tener los roles necesarios asignados en tu perfil.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-[#E0EDFF] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs text-[#003DA5] font-medium">2</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                    Contacta al administrador
                  </h3>
                  <p className="text-sm text-gray-600">
                    Si crees que deberías tener acceso, contacta al administrador del sistema.
                  </p>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => window.history.back()}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Volver
              </button>
              <button
                onClick={() => window.location.href = '/portal'}
                className="flex-1 px-4 py-2 bg-[#2962FF] text-white rounded-lg hover:bg-[#003DA5] transition-colors text-sm font-medium"
              >
                Ir al Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Información de Ayuda */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            ¿Necesitas ayuda?{' '}
            <a 
              href="mailto:soporte@esap.edu.co" 
              className="text-[#2962FF] hover:underline font-medium"
            >
              Contacta a soporte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
