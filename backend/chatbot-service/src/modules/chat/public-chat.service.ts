import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

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
    if (/certific|titulo|diploma|graduad/.test(pregunta)) {
      return { respuesta: 'En la portada puedes acceder a los servicios públicos de certificados laborales y verificación de títulos. Sigue los pasos de identificación y validación del servicio correspondiente. El asistente público no consulta certificados ni datos personales.' };
    }
    if (/docente|rund|autogestion|vincula/.test(pregunta)) {
      return { respuesta: 'La autogestión docente y los formularios de vinculación tienen sus propias instrucciones y validación de identidad. Completa el formulario correspondiente. Para consultar trámites personales o tu Plan de Trabajo Académico, inicia sesión con tu cuenta.' };
    }
    return { respuesta: 'Puedo orientarte sobre acceso a la plataforma, certificados y autogestión docente. Para consultar o gestionar información personal, inicia sesión. La orientación pública no tiene acceso a conversaciones privadas ni expedientes.' };
  }
}
