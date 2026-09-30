/**
 * SERVICIO DE NOTIFICACIONES PTA
 * 
 * Sistema completo de notificaciones según Documento Maestro v3.0 - Sección 17
 * Implementa Email + In-app notifications con plantillas predefinidas
 * 
 * Fecha: 23 de diciembre de 2024
 */

export type TipoNotificacionPTA = 
  | 'PTA_ENVIADO_APROBACION'
  | 'PTA_APROBADO_NIVEL_1'
  | 'PTA_APROBADO_NIVEL_2'
  | 'PTA_DEVUELTO'
  | 'PTA_EN_FIRME'
  | 'FECHA_LIMITE_CERCANA'
  | 'PTA_SIN_CREAR'
  | 'CONSOLIDADO_TERRITORIAL_BAJO'
  | 'ERROR_VALIDACION_CRITICO'
  | 'NUEVA_ASIGNACION_ACTIVIDAD';

export type PrioridadNotificacion = 'BAJA' | 'MEDIA' | 'ALTA';

export type CanalNotificacion = 'EMAIL' | 'IN_APP' | 'AMBOS';

export interface NotificacionPTA {
  id: string;
  tipo: TipoNotificacionPTA;
  destinatario: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  };
  asunto: string;
  mensaje: string;
  mensajeHTML?: string;
  prioridad: PrioridadNotificacion;
  canal: CanalNotificacion;
  datos: {
    pta_id?: string;
    periodo?: string;
    docente_nombre?: string;
    aprobador_nombre?: string;
    aprobador_cargo?: string;
    observaciones?: string;
    fecha_limite?: string;
    territorial?: string;
    porcentaje_consolidado?: number;
    [key: string]: any;
  };
  leida: boolean;
  timestamp: string;
  url_accion?: string;
}

export interface PlantillaEmail {
  asunto: string;
  cuerpo: string;
  cuerpoHTML: string;
}

/**
 * MATRIZ DE NOTIFICACIONES (Documento Maestro Sección 17.1)
 */
export const MATRIZ_NOTIFICACIONES: Record<TipoNotificacionPTA, {
  destinatario: string;
  canal: CanalNotificacion;
  prioridad: PrioridadNotificacion;
  descripcion: string;
}> = {
  PTA_ENVIADO_APROBACION: {
    destinatario: 'Coordinador Académico',
    canal: 'AMBOS',
    prioridad: 'MEDIA',
    descripcion: 'Notifica cuando un docente envía su PTA a aprobación'
  },
  PTA_APROBADO_NIVEL_1: {
    destinatario: 'Director/Decano + Docente',
    canal: 'AMBOS',
    prioridad: 'MEDIA',
    descripcion: 'Notifica aprobación del Coordinador Académico'
  },
  PTA_APROBADO_NIVEL_2: {
    destinatario: 'Subdirección + Docente',
    canal: 'AMBOS',
    prioridad: 'MEDIA',
    descripcion: 'Notifica aprobación del Director Territorial/Decano'
  },
  PTA_DEVUELTO: {
    destinatario: 'Docente',
    canal: 'AMBOS',
    prioridad: 'ALTA',
    descripcion: 'Notifica cuando el PTA es devuelto con observaciones'
  },
  PTA_EN_FIRME: {
    destinatario: 'Docente + GGP',
    canal: 'AMBOS',
    prioridad: 'MEDIA',
    descripcion: 'Notifica cuando el PTA pasa a estado En Firme'
  },
  FECHA_LIMITE_CERCANA: {
    destinatario: 'Docente',
    canal: 'AMBOS',
    prioridad: 'ALTA',
    descripcion: 'Notifica 5 días antes de la fecha límite'
  },
  PTA_SIN_CREAR: {
    destinatario: 'Docente',
    canal: 'EMAIL',
    prioridad: 'MEDIA',
    descripcion: 'Notifica al inicio del período si no ha creado PTA'
  },
  CONSOLIDADO_TERRITORIAL_BAJO: {
    destinatario: 'Director Territorial',
    canal: 'AMBOS',
    prioridad: 'MEDIA',
    descripcion: 'Alerta cuando el consolidado territorial está bajo'
  },
  ERROR_VALIDACION_CRITICO: {
    destinatario: 'Docente',
    canal: 'IN_APP',
    prioridad: 'ALTA',
    descripcion: 'Notifica errores críticos de validación'
  },
  NUEVA_ASIGNACION_ACTIVIDAD: {
    destinatario: 'Docente',
    canal: 'AMBOS',
    prioridad: 'MEDIA',
    descripcion: 'Notifica cuando se le asigna una nueva actividad'
  }
};

/**
 * PLANTILLAS DE EMAIL (Documento Maestro Sección 17.2)
 */
export class PlantillasEmailPTA {
  
  /**
   * Plantilla: PTA Devuelto
   * Documento Maestro Sección 17.2 - Ejemplo oficial
   */
  static ptaDevuelto(datos: {
    nombre_docente: string;
    periodo: string;
    nombre_aprobador: string;
    cargo_aprobador: string;
    observaciones: string;
    fecha_limite: string;
    url_pta: string;
  }): PlantillaEmail {
    const asunto = `[ACCIÓN REQUERIDA] Tu PTA período ${datos.periodo} ha sido devuelto`;
    
    const cuerpo = `
Estimado(a) ${datos.nombre_docente},

Tu Plan de Trabajo Académico para el período ${datos.periodo} ha sido devuelto 
por ${datos.nombre_aprobador} (${datos.cargo_aprobador}) con las siguientes observaciones:

"${datos.observaciones}"

Por favor ingresa al sistema para realizar los ajustes necesarios 
antes de ${datos.fecha_limite}.

Ingresa al sistema: ${datos.url_pta}

Cordialmente,
Sistema de Gestión Profesoral - ESAP
Subdirección Nacional de Servicios Académicos
Grupo de Gestión Profesoral
    `.trim();
    
    const cuerpoHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #1B4F72; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .observaciones { background-color: #FEF3CD; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .button { display: inline-block; background-color: #1B4F72; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
    .urgent { color: #DC2626; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">⚠️ PTA Devuelto - Acción Requerida</h2>
    </div>
    
    <div class="content">
      <p>Estimado(a) <strong>${datos.nombre_docente}</strong>,</p>
      
      <p>Tu Plan de Trabajo Académico para el período <strong>${datos.periodo}</strong> ha sido devuelto 
      por <strong>${datos.nombre_aprobador}</strong> (${datos.cargo_aprobador}).</p>
      
      <div class="observaciones">
        <strong>Observaciones:</strong><br>
        "${datos.observaciones}"
      </div>
      
      <p class="urgent">Por favor ingresa al sistema para realizar los ajustes necesarios antes de ${datos.fecha_limite}.</p>
      
      <a href="${datos.url_pta}" class="button">REVISAR MI PTA</a>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Si tienes alguna duda sobre las observaciones, por favor contacta directamente a ${datos.nombre_aprobador}.
      </p>
    </div>
    
    <div class="footer">
      <p style="margin: 5px 0;">Sistema de Gestión Profesoral - ESAP</p>
      <p style="margin: 5px 0;">Subdirección Nacional de Servicios Académicos</p>
      <p style="margin: 5px 0;">Grupo de Gestión Profesoral</p>
    </div>
  </div>
</body>
</html>
    `.trim();
    
    return { asunto, cuerpo, cuerpoHTML };
  }
  
  /**
   * Plantilla: PTA Enviado a Aprobación
   */
  static ptaEnviadoAprobacion(datos: {
    nombre_coordinador: string;
    docente_nombre: string;
    periodo: string;
    territorial: string;
    url_pta: string;
  }): PlantillaEmail {
    const asunto = `Nuevo PTA pendiente de revisión - ${datos.docente_nombre}`;
    
    const cuerpo = `
Estimado(a) ${datos.nombre_coordinador},

El docente ${datos.docente_nombre} de la Territorial ${datos.territorial} ha enviado 
su Plan de Trabajo Académico del período ${datos.periodo} para tu revisión.

Por favor revisa y aprueba o devuelve el PTA con observaciones.

Ingresa al sistema: ${datos.url_pta}

Cordialmente,
Sistema de Gestión Profesoral - ESAP
    `.trim();
    
    const cuerpoHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2E86AB; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .info-box { background-color: #EBF5FB; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .button { display: inline-block; background-color: #2E86AB; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">📋 Nuevo PTA Pendiente de Revisión</h2>
    </div>
    
    <div class="content">
      <p>Estimado(a) <strong>${datos.nombre_coordinador}</strong>,</p>
      
      <p>El docente <strong>${datos.docente_nombre}</strong> ha enviado su Plan de Trabajo Académico 
      del período <strong>${datos.periodo}</strong> para tu revisión.</p>
      
      <div class="info-box">
        <strong>Información del PTA:</strong><br>
        • Docente: ${datos.docente_nombre}<br>
        • Territorial: ${datos.territorial}<br>
        • Período: ${datos.periodo}<br>
        • Estado: En Aprobación - Nivel 1
      </div>
      
      <p>Por favor revisa el PTA y procede a aprobarlo o devolverlo con observaciones.</p>
      
      <a href="${datos.url_pta}" class="button">REVISAR PTA</a>
    </div>
    
    <div class="footer">
      <p style="margin: 5px 0;">Sistema de Gestión Profesoral - ESAP</p>
    </div>
  </div>
</body>
</html>
    `.trim();
    
    return { asunto, cuerpo, cuerpoHTML };
  }
  
  /**
   * Plantilla: PTA Aprobado
   */
  static ptaAprobado(datos: {
    nombre_docente: string;
    periodo: string;
    nivel: number;
    aprobador_nombre: string;
    siguiente_paso?: string;
    url_pta: string;
  }): PlantillaEmail {
    const asunto = `✅ Tu PTA período ${datos.periodo} ha sido aprobado - Nivel ${datos.nivel}`;
    
    const cuerpo = `
Estimado(a) ${datos.nombre_docente},

Te informamos que tu Plan de Trabajo Académico para el período ${datos.periodo} 
ha sido aprobado por ${datos.aprobador_nombre} (Nivel ${datos.nivel}).

${datos.siguiente_paso ? `Siguiente paso: ${datos.siguiente_paso}` : 'Tu PTA está ahora en estado En Firme y puedes comenzar la ejecución.'}

Puedes consultar tu PTA en: ${datos.url_pta}

Cordialmente,
Sistema de Gestión Profesoral - ESAP
    `.trim();
    
    const cuerpoHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #10B981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .success-box { background-color: #D1FAE5; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .button { display: inline-block; background-color: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">✅ PTA Aprobado</h2>
    </div>
    
    <div class="content">
      <p>Estimado(a) <strong>${datos.nombre_docente}</strong>,</p>
      
      <p>Te informamos que tu Plan de Trabajo Académico para el período <strong>${datos.periodo}</strong> 
      ha sido <strong>aprobado</strong>.</p>
      
      <div class="success-box">
        <strong>Detalles de la aprobación:</strong><br>
        • Nivel: ${datos.nivel}<br>
        • Aprobado por: ${datos.aprobador_nombre}<br>
        • Estado: ${datos.siguiente_paso ? 'Pendiente siguiente nivel' : 'En Firme'}
      </div>
      
      ${datos.siguiente_paso ? 
        `<p><strong>Siguiente paso:</strong> ${datos.siguiente_paso}</p>` : 
        '<p style="color: #059669;">🎉 <strong>Felicidades!</strong> Tu PTA está ahora en estado En Firme y puedes comenzar la ejecución de las actividades programadas.</p>'
      }
      
      <a href="${datos.url_pta}" class="button">VER MI PTA</a>
    </div>
    
    <div class="footer">
      <p style="margin: 5px 0;">Sistema de Gestión Profesoral - ESAP</p>
    </div>
  </div>
</body>
</html>
    `.trim();
    
    return { asunto, cuerpo, cuerpoHTML };
  }
  
  /**
   * Plantilla: Fecha Límite Cercana (5 días)
   */
  static fechaLimiteCercana(datos: {
    nombre_docente: string;
    dias_restantes: number;
    fecha_limite: string;
    periodo: string;
    url_crear_pta: string;
  }): PlantillaEmail {
    const asunto = `⏰ URGENTE: ${datos.dias_restantes} días para completar tu PTA ${datos.periodo}`;
    
    const cuerpo = `
Estimado(a) ${datos.nombre_docente},

Te recordamos que faltan ${datos.dias_restantes} días para la fecha límite de 
entrega del Plan de Trabajo Académico del período ${datos.periodo}.

Fecha límite: ${datos.fecha_limite}

Por favor ingresa al sistema y completa tu PTA a la brevedad.

Ingresa al sistema: ${datos.url_crear_pta}

Cordialmente,
Sistema de Gestión Profesoral - ESAP
Grupo de Gestión Profesoral
    `.trim();
    
    const cuerpoHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #DC2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .urgente { background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; border-radius: 4px; text-align: center; }
    .countdown { font-size: 48px; font-weight: bold; color: #DC2626; margin: 10px 0; }
    .button { display: inline-block; background-color: #DC2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">⏰ URGENTE: Fecha Límite Cercana</h2>
    </div>
    
    <div class="content">
      <p>Estimado(a) <strong>${datos.nombre_docente}</strong>,</p>
      
      <div class="urgente">
        <p style="margin: 0;">Faltan solo</p>
        <div class="countdown">${datos.dias_restantes}</div>
        <p style="margin: 0;">días para la fecha límite</p>
      </div>
      
      <p>La fecha límite para completar tu Plan de Trabajo Académico del período 
      <strong>${datos.periodo}</strong> es el <strong>${datos.fecha_limite}</strong>.</p>
      
      <p style="color: #DC2626;"><strong>Por favor ingresa al sistema y completa tu PTA a la brevedad.</strong></p>
      
      <a href="${datos.url_crear_pta}" class="button">CREAR MI PTA AHORA</a>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Recuerda que el PTA es obligatorio para todos los docentes de Tiempo Completo y Medio Tiempo.
      </p>
    </div>
    
    <div class="footer">
      <p style="margin: 5px 0;">Sistema de Gestión Profesoral - ESAP</p>
    </div>
  </div>
</body>
</html>
    `.trim();
    
    return { asunto, cuerpo, cuerpoHTML };
  }
  
  /**
   * Plantilla: PTA Sin Crear
   */
  static ptaSinCrear(datos: {
    nombre_docente: string;
    periodo: string;
    fecha_limite: string;
    url_crear_pta: string;
  }): PlantillaEmail {
    const asunto = `Recuerda crear tu PTA para el período ${datos.periodo}`;
    
    const cuerpo = `
Estimado(a) ${datos.nombre_docente},

Ha iniciado el período académico ${datos.periodo} y aún no hemos recibido tu 
Plan de Trabajo Académico.

Fecha límite de entrega: ${datos.fecha_limite}

Por favor ingresa al sistema y crea tu PTA.

Ingresa al sistema: ${datos.url_crear_pta}

Cordialmente,
Sistema de Gestión Profesoral - ESAP
    `.trim();
    
    const cuerpoHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #F59E0B; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .info-box { background-color: #FEF3CD; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .button { display: inline-block; background-color: #F59E0B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">📝 Recuerda Crear tu PTA</h2>
    </div>
    
    <div class="content">
      <p>Estimado(a) <strong>${datos.nombre_docente}</strong>,</p>
      
      <p>Ha iniciado el período académico <strong>${datos.periodo}</strong> y aún no hemos 
      recibido tu Plan de Trabajo Académico.</p>
      
      <div class="info-box">
        <strong>Información importante:</strong><br>
        • Período: ${datos.periodo}<br>
        • Fecha límite: ${datos.fecha_limite}<br>
        • Estado: Pendiente de creación
      </div>
      
      <p>Por favor ingresa al sistema y crea tu PTA a la brevedad.</p>
      
      <a href="${datos.url_crear_pta}" class="button">CREAR MI PTA</a>
    </div>
    
    <div class="footer">
      <p style="margin: 5px 0;">Sistema de Gestión Profesoral - ESAP</p>
    </div>
  </div>
</body>
</html>
    `.trim();
    
    return { asunto, cuerpo, cuerpoHTML };
  }
  
  /**
   * Plantilla: Consolidado Territorial Bajo
   */
  static consolidadoTerritorialBajo(datos: {
    nombre_director: string;
    territorial: string;
    porcentaje: number;
    ptas_pendientes: number;
    total_docentes: number;
    periodo: string;
    url_dashboard: string;
  }): PlantillaEmail {
    const asunto = `⚠️ Alerta: Consolidado PTA ${datos.territorial} en ${datos.porcentaje}%`;
    
    const cuerpo = `
Estimado(a) ${datos.nombre_director},

El consolidado de PTAs de la Territorial ${datos.territorial} para el período ${datos.periodo} 
se encuentra en ${datos.porcentaje}%.

Docentes con PTA pendiente: ${datos.ptas_pendientes} de ${datos.total_docentes}

Por favor realiza seguimiento con los docentes que aún no han completado su PTA.

Ingresa al dashboard: ${datos.url_dashboard}

Cordialmente,
Sistema de Gestión Profesoral - ESAP
Grupo de Gestión Profesoral
    `.trim();
    
    const cuerpoHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #DC2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .stats { background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .stat-item { margin: 10px 0; font-size: 18px; }
    .stat-number { font-size: 32px; font-weight: bold; color: #DC2626; }
    .button { display: inline-block; background-color: #DC2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">⚠️ Alerta: Consolidado PTA Bajo</h2>
    </div>
    
    <div class="content">
      <p>Estimado(a) <strong>${datos.nombre_director}</strong>,</p>
      
      <p>El consolidado de PTAs de la Territorial <strong>${datos.territorial}</strong> 
      se encuentra actualmente en un nivel bajo.</p>
      
      <div class="stats">
        <div class="stat-item">
          Porcentaje de avance:<br>
          <span class="stat-number">${datos.porcentaje}%</span>
        </div>
        <div class="stat-item">
          PTAs pendientes: <strong>${datos.ptas_pendientes} de ${datos.total_docentes}</strong> docentes
        </div>
        <div class="stat-item">
          Período: <strong>${datos.periodo}</strong>
        </div>
      </div>
      
      <p style="color: #DC2626;"><strong>Se recomienda realizar seguimiento inmediato con los docentes pendientes.</strong></p>
      
      <a href="${datos.url_dashboard}" class="button">VER DASHBOARD TERRITORIAL</a>
    </div>
    
    <div class="footer">
      <p style="margin: 5px 0;">Sistema de Gestión Profesoral - ESAP</p>
    </div>
  </div>
</body>
</html>
    `.trim();
    
    return { asunto, cuerpo, cuerpoHTML };
  }
}

/**
 * Servicio de envío de notificaciones
 */
export class PTANotificationsService {
  
  /**
   * Crear una notificación
   */
  static crearNotificacion(
    tipo: TipoNotificacionPTA,
    destinatario: NotificacionPTA['destinatario'],
    datos: NotificacionPTA['datos']
  ): NotificacionPTA {
    const config = MATRIZ_NOTIFICACIONES[tipo];
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Generar mensaje según tipo
    let asunto = '';
    let mensaje = '';
    
    switch (tipo) {
      case 'PTA_DEVUELTO':
        asunto = `Tu PTA del período ${datos.periodo} ha sido devuelto`;
        mensaje = `Tu PTA ha sido devuelto con observaciones. Por favor revísalo y realiza los ajustes necesarios.`;
        break;
      case 'PTA_ENVIADO_APROBACION':
        asunto = `Nuevo PTA pendiente de revisión`;
        mensaje = `El docente ${datos.docente_nombre} ha enviado su PTA para revisión.`;
        break;
      case 'PTA_APROBADO_NIVEL_1':
      case 'PTA_APROBADO_NIVEL_2':
        asunto = `Tu PTA ha sido aprobado`;
        mensaje = `Tu PTA del período ${datos.periodo} ha sido aprobado por ${datos.aprobador_nombre}.`;
        break;
      case 'FECHA_LIMITE_CERCANA':
        asunto = `⏰ Fecha límite cercana: ${datos.fecha_limite}`;
        mensaje = `Recuerda completar tu PTA antes del ${datos.fecha_limite}.`;
        break;
      case 'PTA_SIN_CREAR':
        asunto = `Recuerda crear tu PTA del período ${datos.periodo}`;
        mensaje = `Aún no has creado tu Plan de Trabajo Académico para el período en curso.`;
        break;
      default:
        asunto = `Notificación del Sistema PTA`;
        mensaje = `Tienes una nueva notificación del sistema.`;
    }
    
    return {
      id,
      tipo,
      destinatario,
      asunto,
      mensaje,
      prioridad: config.prioridad,
      canal: config.canal,
      datos,
      leida: false,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Enviar notificación por email (MOCK - En producción conectar con servicio real)
   */
  static async enviarEmail(notificacion: NotificacionPTA): Promise<boolean> {
    console.log('[PTANotifications] Enviando email:', {
      para: notificacion.destinatario.email,
      asunto: notificacion.asunto,
      prioridad: notificacion.prioridad
    });
    
    // TODO: En producción, conectar con servicio de email real (SendGrid, AWS SES, etc.)
    // const response = await fetch('/api/email/send', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     to: notificacion.destinatario.email,
    //     subject: notificacion.asunto,
    //     html: notificacion.mensajeHTML,
    //     text: notificacion.mensaje
    //   })
    // });
    
    // MOCK: Simular envío exitoso
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('[PTANotifications] ✅ Email enviado exitosamente');
        resolve(true);
      }, 500);
    });
  }
  
  /**
   * Guardar notificación in-app (persistente)
   */
  static async guardarNotificacionInApp(notificacion: NotificacionPTA): Promise<boolean> {
    console.log('[PTANotifications] Guardando notificación in-app:', notificacion);
    
    // TODO: En producción, guardar en base de datos
    // const response = await fetch('/api/notifications', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(notificacion)
    // });
    
    // MOCK: Guardar en localStorage
    try {
      const existentes = this.obtenerNotificacionesInApp(notificacion.destinatario.id);
      const nuevas = [notificacion, ...existentes];
      localStorage.setItem(
        `pta_notifications_${notificacion.destinatario.id}`,
        JSON.stringify(nuevas)
      );
      return true;
    } catch (error) {
      console.error('[PTANotifications] Error al guardar notificación:', error);
      return false;
    }
  }
  
  /**
   * Obtener notificaciones in-app de un usuario
   */
  static obtenerNotificacionesInApp(usuarioId: string): NotificacionPTA[] {
    try {
      const data = localStorage.getItem(`pta_notifications_${usuarioId}`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[PTANotifications] Error al obtener notificaciones:', error);
      return [];
    }
  }
  
  /**
   * Marcar notificación como leída
   */
  static marcarComoLeida(usuarioId: string, notificacionId: string): boolean {
    try {
      const notificaciones = this.obtenerNotificacionesInApp(usuarioId);
      const actualizadas = notificaciones.map(n => 
        n.id === notificacionId ? { ...n, leida: true } : n
      );
      localStorage.setItem(
        `pta_notifications_${usuarioId}`,
        JSON.stringify(actualizadas)
      );
      return true;
    } catch (error) {
      console.error('[PTANotifications] Error al marcar como leída:', error);
      return false;
    }
  }
  
  /**
   * Enviar notificación completa (email + in-app según configuración)
   */
  static async enviarNotificacion(notificacion: NotificacionPTA): Promise<{
    emailEnviado: boolean;
    inAppGuardada: boolean;
  }> {
    const config = MATRIZ_NOTIFICACIONES[notificacion.tipo];
    
    let emailEnviado = false;
    let inAppGuardada = false;
    
    // Enviar por email si el canal lo requiere
    if (config.canal === 'EMAIL' || config.canal === 'AMBOS') {
      emailEnviado = await this.enviarEmail(notificacion);
    }
    
    // Guardar in-app si el canal lo requiere
    if (config.canal === 'IN_APP' || config.canal === 'AMBOS') {
      inAppGuardada = await this.guardarNotificacionInApp(notificacion);
    }
    
    return { emailEnviado, inAppGuardada };
  }
}
