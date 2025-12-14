/**
 * Servicio de Autenticación de Dos Factores (2FA)
 */

import { apiClient } from './client';

interface Enable2FAResponse {
  success: boolean;
  message: string;
  qrCode: string;
}

interface Verify2FACodeResponse {
  success: boolean;
  message: string;
  token?: string;
}

class TwoFactorAuthService {
  /**
   * Habilitar 2FA para un usuario
   */
  async enable2FA(userId: string): Promise<Enable2FAResponse> {
    try {
      // Mock implementation - en producción llamaría al API
      console.log(`📧 Habilitando 2FA para usuario ${userId}`);
      
      // Simular llamada al API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generar código mock (en producción esto se hace en el backend)
      const mockQRCode = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIA...';
      
      console.log(`✅ QR Code 2FA generado (DEMO): ${mockQRCode}`);
      
      return {
        success: true,
        message: `2FA habilitado para usuario ${userId}`,
        qrCode: mockQRCode
      };
      
      // En producción sería algo como:
      // return apiClient.post<Enable2FAResponse>(API_ENDPOINTS.AUTH.ENABLE_2FA, {
      //   userId
      // });
    } catch (error) {
      console.error('Error habilitando 2FA:', error);
      return {
        success: false,
        message: 'Error al habilitar 2FA',
        qrCode: ''
      };
    }
  }

  /**
   * Verificar código de autenticación
   */
  async verifyCode(userId: string, code: string): Promise<Verify2FACodeResponse> {
    try {
      // Mock implementation
      console.log(`🔐 Verificando código 2FA para usuario ${userId}: ${code}`);
      
      // Simular llamada al API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verificar código mock
      const storedCode = sessionStorage.getItem('2fa-code');
      const storedUserId = sessionStorage.getItem('2fa-userId');
      const expiresAt = sessionStorage.getItem('2fa-expires');
      
      // Validaciones
      if (!storedCode || !storedUserId || !expiresAt) {
        return {
          success: false,
          message: 'No hay código de verificación activo'
        };
      }
      
      if (storedUserId !== userId) {
        return {
          success: false,
          message: 'El código no corresponde a este usuario'
        };
      }
      
      if (Date.now() > parseInt(expiresAt)) {
        sessionStorage.removeItem('2fa-code');
        sessionStorage.removeItem('2fa-userId');
        sessionStorage.removeItem('2fa-expires');
        return {
          success: false,
          message: 'El código ha expirado. Solicita uno nuevo.'
        };
      }
      
      if (code !== storedCode) {
        return {
          success: false,
          message: 'Código incorrecto. Verifica e intenta nuevamente.'
        };
      }
      
      // Código válido
      console.log('✅ Código 2FA verificado correctamente');
      
      // Limpiar código usado
      sessionStorage.removeItem('2fa-code');
      sessionStorage.removeItem('2fa-userId');
      sessionStorage.removeItem('2fa-expires');
      
      return {
        success: true,
        message: 'Código verificado correctamente',
        token: 'mock-2fa-token-' + Date.now()
      };
      
      // En producción sería algo como:
      // return apiClient.post<Verify2FACodeResponse>(API_ENDPOINTS.AUTH.VERIFY_2FA_CODE, {
      //   userId,
      //   code
      // });
    } catch (error) {
      console.error('Error verificando código 2FA:', error);
      return {
        success: false,
        message: 'Error al verificar el código'
      };
    }
  }

  /**
   * Reenviar código de verificación
   */
  async resendCode(userId: string): Promise<Enable2FAResponse> {
    // Limpiar código anterior
    sessionStorage.removeItem('2fa-code');
    sessionStorage.removeItem('2fa-userId');
    sessionStorage.removeItem('2fa-expires');
    
    // Enviar nuevo código
    return this.enable2FA(userId);
  }

  /**
   * Verificar si un rol requiere 2FA
   */
  async roleRequires2FA(roleId: string): Promise<boolean> {
    try {
      // Mock implementation - en producción consultaría al API
      // Aquí deberíamos consultar la configuración del rol
      console.log(`🔍 Verificando si rol ${roleId} requiere 2FA`);
      
      // Por ahora retornamos true para roles administrativos (demo)
      const roles2FA = ['1', '4', '7']; // Super Admin, Administrativo, Coordinador Regional
      return roles2FA.includes(roleId);
      
      // En producción:
      // const response = await apiClient.get<{requires2FA: boolean}>(
      //   API_ENDPOINTS.ROLES.REQUIRES_2FA(roleId)
      // );
      // return response.requires2FA;
    } catch (error) {
      console.error('Error verificando requisito 2FA:', error);
      return false;
    }
  }

  /**
   * Obtener tiempo restante del código actual
   */
  getCodeTimeRemaining(): number {
    const expiresAt = sessionStorage.getItem('2fa-expires');
    if (!expiresAt) return 0;
    
    const remaining = parseInt(expiresAt) - Date.now();
    return remaining > 0 ? Math.floor(remaining / 1000) : 0;
  }

  /**
   * Verificar si hay un código activo
   */
  hasActiveCode(userId: string): boolean {
    const storedUserId = sessionStorage.getItem('2fa-userId');
    const expiresAt = sessionStorage.getItem('2fa-expires');
    
    if (!storedUserId || !expiresAt) return false;
    if (storedUserId !== userId) return false;
    if (Date.now() > parseInt(expiresAt)) {
      this.clearCode();
      return false;
    }
    
    return true;
  }

  /**
   * Limpiar código almacenado
   */
  clearCode(): void {
    sessionStorage.removeItem('2fa-code');
    sessionStorage.removeItem('2fa-userId');
    sessionStorage.removeItem('2fa-expires');
  }
}

export const twoFactorAuthService = new TwoFactorAuthService();
export default twoFactorAuthService;