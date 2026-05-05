/**
 * API Client para Certificados Laborales ESAP
 * Maneja todas las operaciones de backend relacionadas con certificados
 * @version 1.0.1 - Fixed: Removed process.env, using import.meta.env instead
 */

// Tipos
export interface CertificadoValidacionRequest {
  qrCode: string;
  includeDetails?: boolean;
  trackValidation?: boolean;
}

export interface CertificadoValidacionResponse {
  success: boolean;
  data?: {
    isValid: boolean;
    certificado?: {
      id: string;
      consecutivo: string;
      codigoQR: string;
      estado: 'VIGENTE' | 'VENCIDO' | 'ANULADO';
      empleado: {
        nombre: string;
        documento: string;
        cargo: string;
        dependencia: string;
      };
      fechaEmision: string;
      fechaVigencia?: string;
      firmante: {
        nombre: string;
        cargo: string;
      };
    };
    metadata?: {
      validatedAt: string;
      validationSource: string;
      requestId: string;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

// NUEVOS TIPOS PARA SOLICITUD DESDE PORTAL
export interface ValidacionEmpleadoRequest {
  numeroDocumento: string;
}

export interface ValidacionEmpleadoResponse {
  existe: boolean;
  datos?: {
    nombre: string;
    documento: string;
    cargo: string;
    dependencia: string;
    fechaIngreso: string;
    tipoContrato: string;
    salario?: number;
  };
}

export interface SolicitudCertificadoRequest {
  tipoDocumento: string;
  numeroDocumento: string;
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  email: string;
  telefono?: string;
  tipoCertificado: string;
  motivoSolicitud?: string;
  datosEmpleado?: any;
}

export interface CertificadoGeneradoResponse {
  id: string;
  consecutivo: string;
  qrCode: string;
  pdfUrl: string;
  estado: 'GENERADO' | 'PENDIENTE_VALIDACION';
}

export interface HistoricoValidacion {
  id: string;
  fechaHora: string;
  qrCode: string;
  resultado: 'VALIDO' | 'INVALIDO' | 'VENCIDO' | 'ANULADO';
  certificado?: {
    consecutivo: string;
    empleado: string;
    documento: string;
  };
  origen: {
    ip: string;
    ubicacion: string;
    dispositivo: string;
    navegador: string;
  };
  metodo: 'WEB' | 'API' | 'MOBILE' | 'QR_SCANNER';
  duracion: number;
}

export interface Certificado {
  id: string;
  consecutivo: string;
  empleado: {
    nombre: string;
    documento: string;
    cargo: string;
    dependencia: string;
  };
  estado: string;
  tipoSolicitud: 'AUTOSERVICIO' | 'GESTION_MANUAL';
  fechaSolicitud: string;
  fechaGeneracion?: string;
  solicitante: string;
  pdfUrl?: string;
  qrCode?: string;
}

// Configuración de la API
const API_BASE_URL = 'https://api.esap.edu.co/v1';
const API_TIMEOUT = 30000; // 30 segundos

// Función helper para hacer fetch con timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = API_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Función helper para obtener info del cliente
function getClientInfo() {
  return {
    ip: '0.0.0.0', // En producción se obtiene del servidor
    ubicacion: 'Desconocida',
    dispositivo: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
    navegador: navigator.userAgent.split(' ').pop() || 'Unknown'
  };
}

/**
 * Valida un certificado laboral por su código QR
 */
export async function validarCertificado(
  request: CertificadoValidacionRequest
): Promise<CertificadoValidacionResponse> {
  const startTime = Date.now();

  try {
    // En producción, esto haría una llamada real al backend
    // Por ahora, simulamos con lógica local
    
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Validación básica del formato
    if (!request.qrCode || request.qrCode.length < 10) {
      return {
        success: false,
        error: {
          code: 'INVALID_QR_FORMAT',
          message: 'El código QR no tiene un formato válido'
        }
      };
    }

    // Mock de datos - En producción vendría de la BD
    const mockCertificados = [
      {
        id: 'cert-001',
        consecutivo: '001-2025-TH',
        codigoQR: 'ESAP-CERT-2025-ABC123XYZ',
        estado: 'VIGENTE' as const,
        empleado: {
          nombre: 'María Fernanda Rodríguez López',
          documento: '52.345.678',
          cargo: 'Docente Tiempo Completo',
          dependencia: 'Dirección Territorial Bogotá'
        },
        fechaEmision: '2025-11-20T08:35:00Z',
        fechaVigencia: '2026-11-20',
        firmante: {
          nombre: 'Dr. Jorge Luis Ramírez Mora',
          cargo: 'Director Nacional de Talento Humano'
        }
      },
      {
        id: 'cert-002',
        consecutivo: '045-2024-TH',
        codigoQR: 'ESAP-CERT-2024-DEF456GHI',
        estado: 'VENCIDO' as const,
        empleado: {
          nombre: 'Carlos Alberto Martínez Gómez',
          documento: '79.876.543',
          cargo: 'Coordinador GIT',
          dependencia: 'Dirección de Talento Humano'
        },
        fechaEmision: '2024-01-15T10:20:00Z',
        fechaVigencia: '2025-01-15',
        firmante: {
          nombre: 'Dr. Jorge Luis Ramírez Mora',
          cargo: 'Director Nacional de Talento Humano'
        }
      },
      {
        id: 'cert-003',
        consecutivo: '099-2025-TH',
        codigoQR: 'ESAP-CERT-2025-JKL789MNO',
        estado: 'ANULADO' as const,
        empleado: {
          nombre: 'Jorge Enrique Pérez Vargas',
          documento: '80.123.456',
          cargo: 'Director Territorial',
          dependencia: 'Dirección Territorial Valle'
        },
        fechaEmision: '2025-10-10T14:30:00Z',
        firmante: {
          nombre: 'Dr. Jorge Luis Ramírez Mora',
          cargo: 'Director Nacional de Talento Humano'
        }
      }
    ];

    // Buscar certificado
    const certificado = mockCertificados.find(c => 
      c.codigoQR.toLowerCase() === request.qrCode.toLowerCase()
    );

    const duration = Date.now() - startTime;

    if (!certificado) {
      // Registrar intento de validación fallido
      if (request.trackValidation) {
        await registrarValidacion({
          qrCode: request.qrCode,
          resultado: 'INVALIDO',
          duracion: duration,
          origen: getClientInfo(),
          metodo: 'WEB'
        });
      }

      return {
        success: false,
        error: {
          code: 'CERTIFICADO_NO_ENCONTRADO',
          message: 'No se encontró ningún certificado con el código QR proporcionado'
        }
      };
    }

    // Certificado encontrado - registrar validación exitosa
    if (request.trackValidation) {
      await registrarValidacion({
        qrCode: request.qrCode,
        resultado: certificado.estado === 'VIGENTE' ? 'VALIDO' : 
                   certificado.estado === 'VENCIDO' ? 'VENCIDO' : 'ANULADO',
        certificado: {
          consecutivo: certificado.consecutivo,
          empleado: certificado.empleado.nombre,
          documento: certificado.empleado.documento
        },
        duracion: duration,
        origen: getClientInfo(),
        metodo: 'WEB'
      });
    }

    return {
      success: true,
      data: {
        isValid: certificado.estado === 'VIGENTE',
        certificado: request.includeDetails ? certificado : {
          ...certificado,
          // Ofuscar algunos datos si no se requieren detalles completos
          empleado: {
            ...certificado.empleado,
            documento: certificado.empleado.documento.replace(/\d(?=\d{3})/g, '*')
          }
        },
        metadata: {
          validatedAt: new Date().toISOString(),
          validationSource: 'WEB_PORTAL',
          requestId: `req_${Date.now()}_${Math.random().toString(36).substring(7)}`
        }
      }
    };

  } catch (error) {
    console.error('Error en validación de certificado:', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ocurrió un error al validar el certificado. Por favor intenta nuevamente.'
      }
    };
  }
}

/**
 * Registra una validación en el histórico
 */
async function registrarValidacion(data: {
  qrCode: string;
  resultado: 'VALIDO' | 'INVALIDO' | 'VENCIDO' | 'ANULADO';
  certificado?: {
    consecutivo: string;
    empleado: string;
    documento: string;
  };
  duracion: number;
  origen: {
    ip: string;
    ubicacion: string;
    dispositivo: string;
    navegador: string;
  };
  metodo: 'WEB' | 'API' | 'MOBILE' | 'QR_SCANNER';
}): Promise<void> {
  try {
    // En producción, esto guardaría en la base de datos
    console.log('Registrando validación:', data);
    
    // Simular guardado
    await new Promise(resolve => setTimeout(resolve, 100));

    // Disparar notificaciones si están configuradas
    await dispararNotificaciones(data);
  } catch (error) {
    console.error('Error al registrar validación:', error);
    // No lanzamos error para no interrumpir el flujo principal
  }
}

/**
 * Dispara notificaciones configuradas
 */
async function dispararNotificaciones(validacion: any): Promise<void> {
  try {
    // En producción, esto consultaría los canales de notificación configurados
    // y enviaría las notificaciones correspondientes
    
    console.log('Disparando notificaciones para:', validacion);

    // Ejemplo: si es un intento fraudulento, enviar alerta
    if (validacion.resultado === 'INVALIDO') {
      // Enviar email/SMS/webhook a administradores
      console.log('⚠️ ALERTA: Posible intento fraudulento detectado');
    }
  } catch (error) {
    console.error('Error al disparar notificaciones:', error);
  }
}

/**
 * Obtiene el histórico de validaciones
 */
export async function obtenerHistoricoValidaciones(
  filtros?: {
    resultado?: string;
    metodo?: string;
    fechaInicio?: string;
    fechaFin?: string;
    limit?: number;
    offset?: number;
  }
): Promise<HistoricoValidacion[]> {
  try {
    // En producción, esto consultaría la base de datos
    // Por ahora retornamos datos mock
    
    await new Promise(resolve => setTimeout(resolve, 800));

    const mockHistorico: HistoricoValidacion[] = [
      {
        id: 'VAL-2025-001',
        fechaHora: '2025-11-25T14:30:25',
        qrCode: 'ESAP-CERT-2025-ABC123',
        resultado: 'VALIDO',
        certificado: {
          consecutivo: '001-2025-TH',
          empleado: 'María Fernanda Rodríguez López',
          documento: '52.345.678'
        },
        origen: {
          ip: '190.85.123.45',
          ubicacion: 'Bogotá, Colombia',
          dispositivo: 'Desktop',
          navegador: 'Chrome 120.0'
        },
        metodo: 'WEB',
        duracion: 245
      },
      // ... más registros
    ];

    // Aplicar filtros
    let resultado = mockHistorico;

    if (filtros?.resultado && filtros.resultado !== 'TODOS') {
      resultado = resultado.filter(v => v.resultado === filtros.resultado);
    }

    if (filtros?.metodo && filtros.metodo !== 'TODOS') {
      resultado = resultado.filter(v => v.metodo === filtros.metodo);
    }

    return resultado;
  } catch (error) {
    console.error('Error al obtener histórico:', error);
    return [];
  }
}

/**
 * Obtiene todos los certificados (para backoffice)
 */
export async function obtenerCertificados(
  filtros?: {
    estado?: string;
    tipoSolicitud?: string;
    fechaInicio?: string;
    fechaFin?: string;
  }
): Promise<Certificado[]> {
  try {
    // Mock data
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockCertificados: Certificado[] = [
      {
        id: 'CERT-2025-001',
        consecutivo: '001-2025-TH',
        empleado: {
          nombre: 'María Fernanda Rodríguez López',
          documento: '52.345.678',
          cargo: 'Docente Tiempo Completo',
          dependencia: 'Dirección Territorial Bogotá'
        },
        estado: 'FIRMADO_ELECTRONICAMENTE',
        tipoSolicitud: 'AUTOSERVICIO',
        fechaSolicitud: '2025-11-20T08:30:00',
        fechaGeneracion: '2025-11-20T08:35:00',
        solicitante: 'María Fernanda Rodríguez',
        pdfUrl: '/certificados/001-2025-TH.pdf',
        qrCode: 'ESAP-CERT-2025-ABC123XYZ'
      },
      // ... más certificados
    ];

    return mockCertificados;
  } catch (error) {
    console.error('Error al obtener certificados:', error);
    return [];
  }
}

/**
 * Genera un nuevo certificado
 */
export async function generarCertificado(data: {
  empleadoId: string;
  tipoDocumento: string;
  incluyeSalario: boolean;
  incluyeHistorial: boolean;
}): Promise<{ success: boolean; certificado?: Certificado; error?: string }> {
  try {
    // Simular generación
    await new Promise(resolve => setTimeout(resolve, 3000));

    const nuevoCertificado: Certificado = {
      id: `CERT-2025-${Math.floor(Math.random() * 1000)}`,
      consecutivo: `${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}-2025-TH`,
      empleado: {
        nombre: 'Empleado Generado',
        documento: '12.345.678',
        cargo: 'Cargo de Prueba',
        dependencia: 'Dependencia Test'
      },
      estado: 'GENERADO',
      tipoSolicitud: 'GESTION_MANUAL',
      fechaSolicitud: new Date().toISOString(),
      fechaGeneracion: new Date().toISOString(),
      solicitante: 'Admin Sistema',
      qrCode: `ESAP-CERT-2025-${Math.random().toString(36).substring(2, 11).toUpperCase()}`
    };

    return {
      success: true,
      certificado: nuevoCertificado
    };
  } catch (error) {
    console.error('Error al generar certificado:', error);
    return {
      success: false,
      error: 'Error al generar el certificado'
    };
  }
}

/**
 * NUEVA FUNCIÓN: Valida si un empleado existe en la base de datos de RRHH
 * Esta es la función clave del flujo de solicitud desde el portal
 */
export async function validarEmpleadoEnBD(numeroDocumento: string): Promise<ValidacionEmpleadoResponse> {
  try {
    console.log('Validando empleado en BD de RRHH:', numeroDocumento);
    
    // Simular llamada al Web Service de RRHH
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock de base de datos de empleados
    // En producción, esto consultaría el WS de RRHH
    const empleadosMock = [
      {
        documento: '52345678',
        nombre: 'María Fernanda Rodríguez López',
        cargo: 'Docente Tiempo Completo',
        dependencia: 'Dirección Territorial Bogotá',
        fechaIngreso: '2018-03-15',
        tipoContrato: 'Término Indefinido',
        salario: 5800000
      },
      {
        documento: '79876543',
        nombre: 'Carlos Alberto Martínez Gómez',
        cargo: 'Coordinador GIT - Nómina-Contratación',
        dependencia: 'Dirección de Talento Humano',
        fechaIngreso: '2015-01-10',
        tipoContrato: 'Término Indefinido',
        salario: 6200000
      },
      {
        documento: '1234567890',
        nombre: 'Test User ESAP',
        cargo: 'Asistente Administrativo',
        dependencia: 'Dirección Territorial Antioquia',
        fechaIngreso: '2020-06-01',
        tipoContrato: 'Término Fijo',
        salario: 3500000
      }
    ];

    // Buscar empleado (sin puntos ni comas)
    const docLimpio = numeroDocumento.replace(/[.,\s-]/g, '');
    const empleado = empleadosMock.find(e => e.documento === docLimpio);

    if (empleado) {
      console.log('✅ Empleado encontrado en BD:', empleado.nombre);
      return {
        existe: true,
        datos: empleado
      };
    } else {
      console.log('❌ Empleado NO encontrado en BD');
      return {
        existe: false
      };
    }

  } catch (error) {
    console.error('Error al validar empleado en BD:', error);
    // En caso de error, asumimos que no existe para que quede en revisión manual
    return {
      existe: false
    };
  }
}

/**
 * NUEVA FUNCIÓN: Genera un certificado automáticamente desde el portal
 * Se ejecuta cuando el empleado SÍ existe en la BD
 */
export async function generarCertificadoAutomatico(
  request: SolicitudCertificadoRequest
): Promise<CertificadoGeneradoResponse> {
  try {
    console.log('Generando certificado automático...', request);

    // Simular generación del PDF con datos reales
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generar consecutivo único
    const consecutivo = `${Math.floor(Math.random() * 900 + 100)}-${new Date().getFullYear()}-TH`;

    // Generar código QR único
    const qrCode = `ESAP-CERT-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

    // En producción, aquí se:
    // 1. Genera el PDF del certificado con los datos del empleado
    // 2. Inserta en BD el registro del certificado
    // 3. Genera el código QR y lo embebe en el PDF
    // 4. Sube el PDF a almacenamiento (S3, Azure Blob, etc.)
    // 5. Envía notificación por correo al solicitante

    const certificadoGenerado: CertificadoGeneradoResponse = {
      id: `CERT-${Date.now()}`,
      consecutivo: consecutivo,
      qrCode: qrCode,
      pdfUrl: `/api/certificados/${consecutivo}.pdf`,
      estado: 'GENERADO'
    };

    console.log('✅ Certificado generado exitosamente:', certificadoGenerado);

    return certificadoGenerado;

  } catch (error) {
    console.error('Error al generar certificado automático:', error);
    throw new Error('Error al generar el certificado automáticamente');
  }
}

/**
 * NUEVA FUNCIÓN: Crea una solicitud pendiente de validación manual
 * Se ejecuta cuando el empleado NO existe en la BD
 */
export async function crearSolicitudPendiente(
  request: SolicitudCertificadoRequest
): Promise<{ radicado: string; estado: string }> {
  try {
    console.log('Creando solicitud pendiente...', request);

    // Simular guardado en BD
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generar radicado único
    const radicado = `CL-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // En producción, aquí se:
    // 1. Inserta el registro en BD con estado PENDIENTE_VALIDACION
    // 2. Crea una tarea para el área de Talento Humano
    // 3. Envía notificación al solicitante informando que su solicitud está en revisión
    // 4. Envía alerta a coordinadores de programa

    console.log('✅ Solicitud creada como pendiente. Radicado:', radicado);

    return {
      radicado: radicado,
      estado: 'PENDIENTE_VALIDACION'
    };

  } catch (error) {
    console.error('Error al crear solicitud pendiente:', error);
    throw new Error('Error al crear la solicitud');
  }
}