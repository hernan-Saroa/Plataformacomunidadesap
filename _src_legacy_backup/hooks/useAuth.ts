/**
 * Hook personalizado para autenticación
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { authService } from '../services/api';
import type { AuthUser, LoginCredentials } from '../types';
import { toast } from 'sonner';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  refreshUser: () => Promise<void>;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Verificar token actual al montar
   */
  useEffect(() => {
    const verifyAuth = async () => {
      if (!authService.isAuthenticated()) {
        setLoading(false);
        return;
      }

      try {
        const userData = await authService.verifyToken();
        setUser(userData);
      } catch (err) {
        // Token inválido, limpiar
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, []);

  /**
   * Login
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      
      toast.success('Bienvenido', {
        description: `Hola ${response.user.firstName}!`,
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Error al iniciar sesión';
      setError(errorMessage);
      toast.error('Error de autenticación', { description: errorMessage });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    setLoading(true);

    try {
      await authService.logout();
      setUser(null);
      
      toast.info('Sesión cerrada', {
        description: 'Has cerrado sesión correctamente',
      });
    } catch (err: any) {
      console.error('Error al cerrar sesión:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refrescar datos del usuario
   */
  const refreshUser = useCallback(async () => {
    try {
      const userData = await authService.verifyToken();
      setUser(userData);
    } catch (err) {
      console.error('Error al refrescar usuario:', err);
    }
  }, []);

  /**
   * Verificar permiso
   */
  const hasPermission = useCallback((permission: string): boolean => {
    return authService.hasPermission(permission);
  }, []);

  /**
   * Verificar rol
   */
  const hasRole = useCallback((role: string): boolean => {
    return authService.hasRole(role);
  }, []);

  /**
   * Verificar algún permiso
   */
  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    return authService.hasAnyPermission(permissions);
  }, []);

  /**
   * Verificar todos los permisos
   */
  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    return authService.hasAllPermissions(permissions);
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAllPermissions,
    refreshUser,
  };
}

export default useAuth;
