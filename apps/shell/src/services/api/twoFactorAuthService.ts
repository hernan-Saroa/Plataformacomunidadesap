/**
 * Servicio de Autenticación de Dos Factores (2FA)
 */

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

interface Active2FACode {
  email: string;
  code: string;
  expiresAt: number;
}

class TwoFactorAuthService {
  private activeCode: Active2FACode | null = null;

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
      
      // Mantener el código solo en memoria. No persistir correo/código en storage del navegador.
      this.activeCode = {
        email,
        code: mockCode,
        expiresAt: Date.now() + 5 * 60 * 1000,
      };
      
      console.log('✅ Código 2FA generado (DEMO)');
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
      console.log(`🔐 Verificando código 2FA para ${email}`);
      
      // Simular llamada al API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verificar código mock en memoria
      const activeCode = this.activeCode;
      
      // Validaciones
      if (!activeCode) {
        return {
          success: false,
          message: 'No hay código de verificación activo'
        };
      }
      
      if (activeCode.email !== email) {
        return {
          success: false,
          message: 'El código no corresponde a este usuario'
        };
      }
      
      if (Date.now() > activeCode.expiresAt) {
        this.clearCode();
        return {
          success: false,
          message: 'El código ha expirado. Solicita uno nuevo.'
        };
      }
      
      if (code !== activeCode.code) {
        return {
          success: false,
          message: 'Código incorrecto. Verifica e intenta nuevamente.'
        };
      }
      
      // Código válido
      console.log('✅ Código 2FA verificado correctamente');
      
      // Limpiar código usado
      this.clearCode();
      
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
    this.clearCode();
    
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
    const expiresAt = this.activeCode?.expiresAt;
    if (!expiresAt) return 0;
    
    const remaining = expiresAt - Date.now();
    return remaining > 0 ? Math.floor(remaining / 1000) : 0;
  }

  /**
   * Verificar si hay un código activo
   */
  hasActiveCode(email: string): boolean {
    const activeCode = this.activeCode;
    
    if (!activeCode) return false;
    if (activeCode.email !== email) return false;
    if (Date.now() > activeCode.expiresAt) {
      this.clearCode();
      return false;
    }
    
    return true;
  }

  /**
   * Limpiar código almacenado
   */
  clearCode(): void {
    this.activeCode = null;

    try {
      sessionStorage.removeItem('2fa-code');
      sessionStorage.removeItem('2fa-email');
      sessionStorage.removeItem('2fa-expires');
    } catch {
      // Storage may be unavailable in restricted browser contexts.
    }
  }
}

export const twoFactorAuthService = new TwoFactorAuthService();
export default twoFactorAuthService;
