/**
 * Servicio de Autenticación de Dos Factores (2FA)
 */

import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../../config/environment';

interface Send2FACodeResponse {
  success: boolean;
  message: string;
  expiresIn: number; // segundos
}

interface Verify2FACodeResponse {
  success: boolean;
  message: string;
  token?: string;
}

class TwoFactorAuthService {
  /**
   * Enviar código de verificación al correo del usuario
   */
  async sendVerificationCode(email: string, roleId?: string): Promise<Send2FACodeResponse> {
    try {
      // Mock implementation - en producción llamaría al API
      console.log(`📧 Enviando código 2FA a ${email} para rol ${roleId || 'default'}`);
      
      // Simular llamada al API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generar código mock (en producción esto se hace en el backend)
      const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Guardar código en sessionStorage para demostración
      sessionStorage.setItem('2fa-code', mockCode);
      sessionStorage.setItem('2fa-email', email);
      sessionStorage.setItem('2fa-expires', (Date.now() + 5 * 60 * 1000).toString());
      
      console.log(`✅ Código 2FA generado (DEMO): ${mockCode}`);
      console.log(`⏱️ Expira en 5 minutos`);
      
      return {
        success: true,
        message: `Código de verificación enviado a ${email}`,
        expiresIn: 300 // 5 minutos
      };
      
      // En producción sería algo como:
      // return apiClient.post<Send2FACodeResponse>(API_ENDPOINTS.AUTH.SEND_2FA_CODE, {
      //   email,
      //   roleId
      // });
    } catch (error) {
      console.error('Error enviando código 2FA:', error);
      return {
        success: false,
        message: 'Error al enviar el código de verificación',
        expiresIn: 0
      };
    }
  }

  /**
   * Verificar código de autenticación
   */
  async verifyCode(email: string, code: string): Promise<Verify2FACodeResponse> {
    try {
      // Mock implementation
      console.log(`🔐 Verificando código 2FA para ${email}: ${code}`);
      
      // Simular llamada al API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verificar código mock
      const storedCode = sessionStorage.getItem('2fa-code');
      const storedEmail = sessionStorage.getItem('2fa-email');
      const expiresAt = sessionStorage.getItem('2fa-expires');
      
      // Validaciones
      if (!storedCode || !storedEmail || !expiresAt) {
        return {
          success: false,
          message: 'No hay código de verificación activo'
        };
      }
      
      if (storedEmail !== email) {
        return {
          success: false,
          message: 'El código no corresponde a este usuario'
        };
      }
      
      if (Date.now() > parseInt(expiresAt)) {
        sessionStorage.removeItem('2fa-code');
        sessionStorage.removeItem('2fa-email');
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
      sessionStorage.removeItem('2fa-email');
      sessionStorage.removeItem('2fa-expires');
      
      return {
        success: true,
        message: 'Código verificado correctamente',
        token: 'mock-2fa-token-' + Date.now()
      };
      
      // En producción sería algo como:
      // return apiClient.post<Verify2FACodeResponse>(API_ENDPOINTS.AUTH.VERIFY_2FA_CODE, {
      //   email,
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
  async resendCode(email: string, roleId?: string): Promise<Send2FACodeResponse> {
    // Limpiar código anterior
    sessionStorage.removeItem('2fa-code');
    sessionStorage.removeItem('2fa-email');
    sessionStorage.removeItem('2fa-expires');
    
    // Enviar nuevo código
    return this.sendVerificationCode(email, roleId);
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
  hasActiveCode(email: string): boolean {
    const storedEmail = sessionStorage.getItem('2fa-email');
    const expiresAt = sessionStorage.getItem('2fa-expires');
    
    if (!storedEmail || !expiresAt) return false;
    if (storedEmail !== email) return false;
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
    sessionStorage.removeItem('2fa-email');
    sessionStorage.removeItem('2fa-expires');
  }
}

export const twoFactorAuthService = new TwoFactorAuthService();
export default twoFactorAuthService;
