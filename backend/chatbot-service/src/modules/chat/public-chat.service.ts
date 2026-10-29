import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { institutionalGuidance } from './institutional-guidance';

@Injectable()
export class PublicChatService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async configuracion(): Promise<{ activo: boolean }> {
    try {
      const [module] = await this.dataSource.query('SELECT is_active FROM auth.module WHERE code = $1 LIMIT 1', ['chatbot']);
      return { activo: module?.is_active === true };
    } catch {
      throw new ServiceUnavailableException('No fue posible comprobar la disponibilidad del asistente.');
    }
  }

  // Orientación sin identidad, historial ni escritura en la base de datos.
  async consultar(contenido: string): Promise<{ respuesta: string }> {
    if (!(await this.configuracion()).activo) throw new NotFoundException('El asistente no está habilitado.');
    const pregunta = contenido.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (/contrasena|clave|sesion|ingresar|acceso|login/.test(pregunta)) {
      return { respuesta: 'Para acceder a tus gestiones personales, utiliza Iniciar sesión. Si olvidaste tu contraseña, usa la opción de recuperación de acceso de esa pantalla. No compartas tu contraseña en el chat.' };
    }
    if (/\brund\b|autogestion|vincula/.test(pregunta)) {
      return { respuesta: 'La autogestión docente y los formularios de vinculación tienen sus propias instrucciones y validación de identidad. Completa el formulario correspondiente. El asistente ofrece orientación general y no consulta expedientes personales.' };
    }
    return { respuesta: institutionalGuidance(contenido, 'general') };
  }
}
