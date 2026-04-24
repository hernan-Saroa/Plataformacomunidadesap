/**
 * Stub de `supabaseService` para el MFE `mfe-pta`.
 *
 * Durante la migración a NestJS, reemplazaremos estas llamadas por el API Gateway
 * (microservicio `academic-work-plan-service` + `auth-service`/`estructura`).
 */

type ServiceResult<T> = { success: boolean; data?: T; message?: string };

export const supabaseService = {
  personas: {
    async getAll(): Promise<ServiceResult<any[]>> {
      return { success: false, data: [], message: 'supabaseService deshabilitado en mfe-pta (pendiente migración a API)' };
    },
    async bulkCreateDocentes(_rows: any[]): Promise<ServiceResult<any>> {
      return { success: false, message: 'bulkCreateDocentes pendiente migración a API' };
    },
  },
} as const;

export const personasService = supabaseService.personas;

export const authService = {
  async login(): Promise<ServiceResult<any>> {
    return { success: false, message: 'authService (supabase) no aplica en mfe-pta' };
  },
  async logout(): Promise<ServiceResult<any>> {
    return { success: true };
  },
  async refresh(): Promise<ServiceResult<any>> {
    return { success: false, message: 'refresh pendiente migración a auth-service' };
  },
} as const;

export function resetAuthInvalidation() {}
export function isAuthInvalidated() {
  return false;
}
