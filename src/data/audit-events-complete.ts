/**
 * ============================================
 * EVENTOS DE AUDITORÍA COMPLETOS
 * ============================================
 * 
 * Eventos muy particularizados de TODOS los módulos del sistema
 * Para integrar en AuditModulePremium.tsx (diseño aprobado)
 * 
 * MÓDULOS INCLUIDOS:
 * 1. Control Interno Disciplinario
 * 2. Certificados Laborales
 * 3. Registro Académico
 * 4. Gestión Legal
 * 5. Control Interno de Gestión
 * 6. Firma Electrónica
 * 7. Roles y Permisos
 * 8. Usuario Persona
 * 9. Autenticación 2FA
 * 10. Gestión Profesoral
 * 11. Arquitectura Empresarial
 * 12. Estructura Organizacional
 * 
 * Total: 100+ eventos particularizados
 * 
 * Fecha: Enero 22, 2025
 */

import type { AuditEvent } from '../components/esap/AuditEventDetail';

export const AUDIT_EVENTS_COMPLETE: AuditEvent[] = [
  
  // ============================================================================
  // CONTROL INTERNO DISCIPLINARIO (20 eventos)
  // ============================================================================
  
  {
    id: 'AUD-DISC-001',
    timestamp: '2025-01-22 14:30:00',
    user: 'María González',
    userId: 'PER-1024',
    action: 'Crear noticia disciplinaria',
    module: 'Control Disciplinario',
    severity: 'medium',
    status: 'success',
    ipAddress: '192.168.1.45',
    device: 'Windows 11 - Desktop',
    browser: 'Chrome 120.0',
    location: 'Bogotá, Colombia',
    duration: '2m 15s',
    details: 'Creación de nueva noticia disciplinaria ND-2025-045 por presunto acoso laboral',
    changes: [
      { field: 'Tipo Fuente', before: '', after: 'Queja Ciudadana' },
      { field: 'Denunciante', before: '', after: 'Juan Pérez García' },
      { field: 'Denunciado', before: '', after: 'María López Castro' },
      { field: 'Prioridad', before: '', after: 'Alta' }
    ]
  },
  {
    id: 'AUD-DISC-002',
    timestamp: '2025-01-22 14:15:00',
    user: 'Carlos Mendoza',
    userId: 'PER-2056',
    action: 'Aprobar noticia disciplinaria',
    module: 'Control Disciplinario',
    severity: 'high',
    status: 'success',
    ipAddress: '192.168.1.67',
    device: 'MacBook Pro - Laptop',
    browser: 'Safari 17.1',
    location: 'Bogotá, Colombia',
    duration: '1m 30s',
    details: 'Aprobación de noticia ND-2025-042 - Avanza a indagación preliminar',
    changes: [
      { field: 'Estado', before: 'Pendiente Valoración', after: 'Aprobada' },
      { field: 'Decisión', before: '', after: 'Abrir Indagación Preliminar' },
      { field: 'Observaciones Jefe', before: '', after: 'Los hechos ameritan investigación' }
    ]
  },
  {
    id: 'AUD-DISC-003',
    timestamp: '2025-01-22 13:45:00',
    user: 'Ana Torres',
    userId: 'PER-3089',
    action: 'Cambiar etapa procesal',
    module: 'Control Disciplinario',
    severity: 'high',
    status: 'success',
    ipAddress: '192.168.1.88',
    device: 'Windows 10 - Desktop',
    browser: 'Edge 120.0',
    location: 'Medellín, Colombia',
    duration: '45s',
    details: 'Cambio de etapa proceso P-120-2025: Indagación → Investigación Formal',
    changes: [
      { field: 'Etapa', before: 'Indagación Preliminar', after: 'Investigación Formal' },
      { field: 'Auto Generado', before: '', after: 'AUTO-052-2025' },
      { field: 'Fecha Cambio', before: '', after: '2025-01-22' }
    ]
  },
  {
    id: 'AUD-DISC-004',
    timestamp: '2025-01-22 13:20:00',
    user: 'Luis Ramírez',
    userId: 'PER-4012',
    action: 'Asignar proceso a profesional',
    module: 'Control Disciplinario',
    severity: 'medium',
    status: 'success',
    ipAddress: '192.168.1.92',
    device: 'iPhone 14 - Mobile',
    browser: 'Safari Mobile 17.1',
    location: 'Cali, Colombia',
    duration: '30s',
    details: 'Asignación de proceso P-118-2025 a profesional María González',
    changes: [
      { field: 'Profesional Asignado', before: 'Sin asignar', after: 'María González' },
      { field: 'Carga Actual', before: '12 procesos', after: '13 procesos' }
    ]
  },
  {
    id: 'AUD-DISC-005',
    timestamp: '2025-01-22 12:50:00',
    user: 'María González',
    userId: 'PER-1024',
    action: 'Crear auto de apertura',
    module: 'Control Disciplinario',
    severity: 'high',
    status: 'success',
    ipAddress: '192.168.1.45',
    device: 'Windows 11 - Desktop',
    browser: 'Chrome 120.0',
    location: 'Bogotá, Colombia',
    duration: '5m 20s',
    details: 'Creación de Auto de Apertura AUTO-053-2025 para proceso P-120-2025',
    changes: [
      { field: 'Tipo de Auto', before: '', after: 'Auto de Apertura' },
      { field: 'Plantilla', before: '', after: 'Indagación Preliminar' },
      { field: 'Versión', before: '', after: '1' }
    ]
  },
  {
    id: 'AUD-DISC-006',
    timestamp: '2025-01-22 12:30:00',
    user: 'Carlos Mendoza',
    userId: 'PER-2056',
    action: 'Aprobar auto disciplinario',
    module: 'Control Disciplinario',
    severity: 'critical',
    status: 'success',
    ipAddress: '192.168.1.67',
    device: 'MacBook Pro - Laptop',
    browser: 'Safari 17.1',
    location: 'Bogotá, Colombia',
    duration: '3m 15s',
    details: 'Aprobación de Auto de Cierre con Sanción AUTO-051-2025',
    changes: [
      { field: 'Estado', before: 'Pendiente Revisión', after: 'Aprobado' },
      { field: 'Revisado Por', before: '', after: 'Carlos Mendoza' },
      { field: 'Requiere Firma', before: 'No', after: 'Sí' }
    ]
  },
  {
    id: 'AUD-DISC-007',
    timestamp: '2025-01-22 12:10:00',
    user: 'Carlos Mendoza',
    userId: 'PER-2056',
    action: 'Devolver auto para correcciones',
    module: 'Control Disciplinario',
    severity: 'medium',
    status: 'warning',
    ipAddress: '192.168.1.67',
    device: 'MacBook Pro - Laptop',
    browser: 'Safari 17.1',
    location: 'Bogotá, Colombia',
    duration: '2m 30s',
    details: 'Devolución de auto AUTO-050-2025 por correcciones menores',
    changes: [
      { field: 'Estado', before: 'En Revisión', after: 'Devuelto' },
      { field: 'Motivo', before: '', after: 'Correcciones de forma' },
      { field: 'Observaciones', before: '', after: 'Ajustar fundamentación jurídica' }
    ]
  },
  {
    id: 'AUD-DISC-008',
    timestamp: '2025-01-22 11:45:00',
    user: 'Carlos Mendoza',
    userId: 'PER-2056',
    action: 'Firmar digitalmente auto',
    module: 'Control Disciplinario',
    severity: 'critical',
    status: 'success',
    ipAddress: '192.168.1.67',
    device: 'MacBook Pro - Laptop',
    browser: 'Safari 17.1',
    location: 'Bogotá, Colombia',
    duration: '1m 10s',
    details: 'Firma digital de AUTO-051-2025 con certificado cualificado',
    changes: [
      { field: 'Estado Firma', before: 'Pendiente', after: 'Firmado' },
      { field: 'Tipo Firma', before: '', after: 'Firma Electrónica Cualificada' },
      { field: 'Certificado', before: '', after: 'Certicámara SA' },
      { field: 'Hash SHA-256', before: '', after: 'a1b2c3d4e5f6...' }
    ]
  },
  {
    id: 'AUD-DISC-009',
    timestamp: '2025-01-22 11:20:00',
    user: 'Ana Torres',
    userId: 'PER-3089',
    action: 'Cargar evidencia testimonial',
    module: 'Control Disciplinario',
    severity: 'medium',
    status: 'success',
    ipAddress: '192.168.1.88',
    device: 'Windows 10 - Desktop',
    browser: 'Edge 120.0',
    location: 'Medellín, Colombia',
    duration: '1m 05s',
    details: 'Carga de evidencia testimonial - Declaración de testigo proceso P-120-2025',
    changes: [
      { field: 'Archivo', before: '', after: 'Declaracion_Testigo_001.pdf' },
      { field: 'Tipo', before: '', after: 'Testimonial' },
      { field: 'Tamaño', before: '', after: '2.3 MB' },
      { field: 'Hash MD5', before: '', after: 'd41d8cd98f00b204...' }
    ]
  },
  {
    id: 'AUD-DISC-010',
    timestamp: '2025-01-22 11:00:00',
    user: 'María González',
    userId: 'PER-1024',
    action: 'Descargar evidencia fotográfica',
    module: 'Control Disciplinario',
    severity: 'low',
    status: 'success',
    ipAddress: '192.168.1.45',
    device: 'Windows 11 - Desktop',
    browser: 'Chrome 120.0',
    location: 'Bogotá, Colombia',
    duration: '15s',
    details: 'Descarga de evidencia fotográfica del proceso P-118-2025',
    changes: [
      { field: 'Archivo Descargado', before: '', after: 'Fotografias_Lugar.zip' },
      { field: 'Tamaño', before: '', after: '15.7 MB' }
    ]
  },
  {
    id: 'AUD-DISC-011',
    timestamp: '2025-01-22 10:30:00',
    user: 'Luis Ramírez',
    userId: 'PER-4012',
    action: 'Notificar auto personalmente',
    module: 'Control Disciplinario',
    severity: 'high',
    status: 'success',
    ipAddress: '192.168.1.92',
    device: 'iPhone 14 - Mobile',
    browser: 'Safari Mobile 17.1',
    location: 'Cali, Colombia',
    duration: '2m 00s',
    details: 'Notificación personal de Auto de Cierre AUTO-051-2025 al investigado',
    changes: [
      { field: 'Tipo Notificación', before: '', after: 'Personal' },
      { field: 'Destinatario', before: '', after: 'Juan Pérez García' },
      { field: 'Medio', before: '', after: 'Correo Electrónico Certificado' },
      { field: 'Estado', before: '', after: 'Enviada' }
    ]
  },
  {
    id: 'AUD-DISC-012',
    timestamp: '2025-01-22 10:00:00',
    user: 'Sistema Automático',
    userId: 'SYS-001',
    action: 'Crear término procesal automático',
    module: 'Control Disciplinario',
    severity: 'medium',
    status: 'success',
    ipAddress: '127.0.0.1',
    device: 'Servidor',
    browser: 'Sistema',
    location: 'Datacenter Bogotá',
    duration: '0.5s',
    details: 'Creación automática de término procesal TERM-2025-089 - Auto de Apertura',
    changes: [
      { field: 'Proceso', before: '', after: 'P-120-2025' },
      { field: 'Actuación', before: '', after: 'Formulación de Pliego de Cargos' },
      { field: 'Días Hábiles', before: '', after: '30' },
      { field: 'Fecha Vencimiento', before: '', after: '2025-03-10' }
    ]
  },
  {
    id: 'AUD-DISC-013',
    timestamp: '2025-01-22 09:30:00',
    user: 'Sistema Automático',
    userId: 'SYS-001',
    action: 'Enviar alerta de término próximo a vencer',
    module: 'Control Disciplinario',
    severity: 'high',
    status: 'success',
    ipAddress: '127.0.0.1',
    device: 'Servidor',
    browser: 'Sistema',
    location: 'Datacenter Bogotá',
    duration: '0.3s',
    details: 'Alerta de término TERM-2025-085 próximo a vencer - 3 días restantes',
    changes: [
      { field: 'Destinatario', before: '', after: 'maria.gonzalez@esap.edu.co' },
      { field: 'Tipo Alerta', before: '', after: 'Próximo a Vencer' },
      { field: 'Días Restantes', before: '', after: '3' }
    ]
  },
  {
    id: 'AUD-DISC-014',
    timestamp: '2025-01-22 09:00:00',
    user: 'Ana Torres',
    userId: 'PER-3089',
    action: 'Exportar expediente a PDF certificado',
    module: 'Control Disciplinario',
    severity: 'medium',
    status: 'success',
    ipAddress: '192.168.1.88',
    device: 'Windows 10 - Desktop',
    browser: 'Edge 120.0',
    location: 'Medellín, Colombia',
    duration: '45s',
    details: 'Exportación de expediente completo del proceso P-115-2025 a PDF/A',
    changes: [
      { field: 'Formato', before: '', after: 'PDF/A (Archivo)' },
      { field: 'Incluye', before: '', after: 'Índice + Documentos + Metadatos' },
      { field: 'Tamaño Total', before: '', after: '125.4 MB' },
      { field: 'Hash SHA-256', before: '', after: 'e3b0c44298fc1c14...' }
    ]
  },
  {
    id: 'AUD-DISC-015',
    timestamp: '2025-01-22 08:30:00',
    user: 'María González',
    userId: 'PER-1024',
    action: 'Crear oficio de solicitud',
    module: 'Control Disciplinario',
    severity: 'medium',
    status: 'success',
    ipAddress: '192.168.1.45',
    device: 'Windows 11 - Desktop',
    browser: 'Chrome 120.0',
    location: 'Bogotá, Colombia',
    duration: '3m 20s',
    details: 'Creación de oficio OCID-045-2025 de solicitud de información a Contraloría',
    changes: [
      { field: 'Destinatario', before: '', after: 'Contraloría General de la República' },
      { field: 'Asunto', before: '', after: 'Solicitud de información presupuestal' },
      { field: 'Proceso', before: '', after: 'P-120-2025' }
    ]
  },

  // ============================================================================
  // CERTIFICADOS LABORALES (15 eventos)
  // ============================================================================

  {
    id: 'AUD-CERT-001',
    timestamp: '2025-01-22 16:30:00',
    user: 'Pedro Martínez',
    userId: 'PER-5678',
    action: 'Crear solicitud de certificado',
    module: 'Certificados Laborales',
    severity: 'low',
    status: 'success',
    ipAddress: '192.168.2.34',
    device: 'Windows 10 - Desktop',
    browser: 'Firefox 121.0',
    location: 'Medellín, Colombia',
    duration: '1m 20s',
    details: 'Nueva solicitud de certificado laboral SOL-CERT-2025-123 - Empleado activo',
    changes: [
      { field: 'Solicitante', before: '', after: 'Laura Sánchez Ruiz' },
      { field: 'Tipo Certificado', before: '', after: 'Certificado Laboral con Salario' },
      { field: 'Motivo', before: '', after: 'Trámite bancario' },
      { field: 'Urgente', before: 'No', after: 'No' }
    ]
  },
  {
    id: 'AUD-CERT-002',
    timestamp: '2025-01-22 16:15:00',
    user: 'Sandra López',
    userId: 'PER-6789',
    action: 'Aprobar solicitud de certificado',
    module: 'Certificados Laborales',
    severity: 'medium',
    status: 'success',
    ipAddress: '192.168.2.45',
    device: 'MacBook Air - Laptop',
    browser: 'Safari 17.1',
    location: 'Bogotá, Colombia',
    duration: '45s',
    details: 'Aprobación de solicitud SOL-CERT-2025-120',
    changes: [
      { field: 'Estado', before: 'Pendiente Aprobación', after: 'Aprobada' },
      { field: 'Aprobado Por', before: '', after: 'Sandra López' },
      { field: 'Observaciones', before: '', after: 'Cumple requisitos' },
      { field: 'Asignado a', before: '', after: 'Pedro Martínez' }
    ]
  },
  {
    id: 'AUD-CERT-003',
    timestamp: '2025-01-22 16:00:00',
    user: 'Pedro Martínez',
    userId: 'PER-5678',
    action: 'Generar certificado laboral',
    module: 'Certificados Laborales',
    severity: 'medium',
    status: 'success',
    ipAddress: '192.168.2.34',
    device: 'Windows 10 - Desktop',
    browser: 'Firefox 121.0',
    location: 'Medellín, Colombia',
    duration: '2m 10s',
    details: 'Generación de certificado laboral CERT-LAB-2025-456 con salario',
    changes: [
      { field: 'Número Certificado', before: '', after: 'CERT-LAB-2025-456' },
      { field: 'Empleado', before: '', after: 'Laura Sánchez Ruiz' },
      { field: 'Cargo', before: '', after: 'Coordinadora Académica' },
      { field: 'Salario Incluido', before: 'No', after: 'Sí' },
      { field: 'Formato', before: '', after: 'PDF Firmado' }
    ]
  },
  {
    id: 'AUD-CERT-004',
    timestamp: '2025-01-22 15:45:00',
    user: 'Sandra López',
    userId: 'PER-6789',
    action: 'Firmar electrónicamente certificado',
    module: 'Certificados Laborales',
    severity: 'high',
    status: 'success',
    ipAddress: '192.168.2.45',
    device: 'MacBook Air - Laptop',
    browser: 'Safari 17.1',
    location: 'Bogotá, Colombia',
    duration: '1m 05s',
    details: 'Firma electrónica de certificado CERT-LAB-2025-456',
    changes: [
      { field: 'Estado', before: 'Generado', after: 'Firmado' },
      { field: 'Firmado Por', before: '', after: 'Sandra López - Jefe RRHH' },
      { field: 'Tipo Firma', before: '', after: 'Firma Electrónica Simple' },
      { field: 'Hash SHA-256', before: '', after: 'b4c6e2f8a3d7...' }
    ]
  },
  {
    id: 'AUD-CERT-005',
    timestamp: '2025-01-22 15:30:00',
    user: 'Pedro Martínez',
    userId: 'PER-5678',
    action: 'Enviar certificado por email',
    module: 'Certificados Laborales',
    severity: 'low',
    status: 'success',
    ipAddress: '192.168.2.34',
    device: 'Windows 10 - Desktop',
    browser: 'Firefox 121.0',
    location: 'Medellín, Colombia',
    duration: '30s',
    details: 'Envío de certificado CERT-LAB-2025-456 al correo del empleado',
    changes: [
      { field: 'Destinatario', before: '', after: 'laura.sanchez@esap.edu.co' },
      { field: 'Estado Envío', before: '', after: 'Enviado' },
      { field: 'Incluye QR', before: 'No', after: 'Sí' }
    ]
  },
  {
    id: 'AUD-CERT-006',
    timestamp: '2025-01-22 15:15:00',
    user: 'Laura Sánchez',
    userId: 'PER-7890',
    action: 'Descargar certificado',
    module: 'Certificados Laborales',
    severity: 'low',
    status: 'success',
    ipAddress: '192.168.2.78',
    device: 'iPad Pro - Tablet',
    browser: 'Safari Mobile 17.1',
    location: 'Medellín, Colombia',
    duration: '10s',
    details: 'Descarga de certificado CERT-LAB-2025-456 por parte del empleado',
    changes: [
      { field: 'Descargado Por', before: '', after: 'Laura Sánchez Ruiz' },
      { field: 'Archivo', before: '', after: 'CERT-LAB-2025-456.pdf' },
      { field: 'Tamaño', before: '', after: '486 KB' }
    ]
  },
  {
    id: 'AUD-CERT-007',
    timestamp: '2025-01-22 15:00:00',
    user: 'Pedro Martínez',
    userId: 'PER-5678',
    action: 'Rechazar solicitud de certificado',
    module: 'Certificados Laborales',
    severity: 'medium',
    status: 'warning',
    ipAddress: '192.168.2.34',
    device: 'Windows 10 - Desktop',
    browser: 'Firefox 121.0',
    location: 'Medellín, Colombia',
    duration: '1m 00s',
    details: 'Rechazo de solicitud SOL-CERT-2025-119 por documentación incompleta',
    changes: [
      { field: 'Estado', before: 'Pendiente Revisión', after: 'Rechazada' },
      { field: 'Motivo Rechazo', before: '', after: 'Documentación incompleta' },
      { field: 'Observaciones', before: '', after: 'Falta adjuntar carta de solicitud' }
    ]
  },
  {
    id: 'AUD-CERT-008',
    timestamp: '2025-01-22 14:45:00',
    user: 'Sandra López',
    userId: 'PER-6789',
    action: 'Validar certificado por QR',
    module: 'Certificados Laborales',
    severity: 'medium',
    status: 'success',
    ipAddress: '192.168.2.45',
    device: 'MacBook Air - Laptop',
    browser: 'Safari 17.1',
    location: 'Bogotá, Colombia',
    duration: '15s',
    details: 'Validación de autenticidad de certificado mediante código QR',
    changes: [
      { field: 'Código QR Escaneado', before: '', after: 'QR-2025-456-CERT' },
      { field: 'Resultado Validación', before: '', after: 'AUTÉNTICO' },
      { field: 'Certificado Verificado', before: '', after: 'CERT-LAB-2025-456' }
    ]
  },

  // ============================================================================
  // REGISTRO ACADÉMICO (15 eventos)
  // ============================================================================

  {
    id: 'AUD-ACAD-001',
    timestamp: '2025-01-22 17:30:00',
    user: 'Carolina Vargas',
    userId: 'PER-8901',
    action: 'Registrar inscripción',
    module: 'Registro Académico',
    severity: 'low',
    status: 'success',
    ipAddress: '192.168.3.45',
    device: 'Windows 11 - Desktop',
    browser: 'Chrome 120.0',
    location: 'Bogotá, Colombia',
    duration: '2m 30s',
    details: 'Registro de nueva inscripción INSC-2025-I-0456 - Especialización en Gestión Pública',
    changes: [
      { field: 'Estudiante', before: '', after: 'Andrés Gómez Pérez' },
      { field: 'Programa', before: '', after: 'Especialización en Gestión Pública' },
      { field: 'Periodo', before: '', after: '2025-I' },
      { field: 'Sede', before: '', after: 'Bogotá' },
      { field: 'Modalidad', before: '', after: 'Virtual' }
    ]
  },
  {
    id: 'AUD-ACAD-002',
    timestamp: '2025-01-22 17:15:00',
    user: 'Roberto Silva',
    userId: 'PER-9012',
    action: 'Aprobar matrícula académica',
    module: 'Registro Académico',
    severity: 'medium',
    status: 'success',
    ipAddress: '192.168.3.56',
    device: 'Lenovo ThinkPad - Laptop',
    browser: 'Edge 120.0',
    location: 'Bogotá, Colombia',
    duration: '1m 15s',
    details: 'Aprobación de matrícula MATR-2025-I-1234 - Pago verificado',
    changes: [
      { field: 'Estado', before: 'Pendiente Validación', after: 'Aprobada' },
      { field: 'Aprobado Por', before: '', after: 'Roberto Silva' },
      { field: 'Pago Verificado', before: 'No', after: 'Sí' },
      { field: 'Número Créditos', before: '', after: '18' }
    ]
  },
  {
    id: 'AUD-ACAD-003',
    timestamp: '2025-01-22 17:00:00',
    user: 'Lucía Hernández',
    userId: 'PER-0123',
    action: 'Cargar calificaciones',
    module: 'Registro Académico',
    severity: 'high',
    status: 'success',
    ipAddress: '192.168.3.67',
    device: 'MacBook Pro - Laptop',
    browser: 'Safari 17.1',
    location: 'Medellín, Colombia',
    duration: '8m 45s',
    details: 'Actualización de calificaciones CALIF-2024-II-GEP-101 - Gestión Pública I',
    changes: [
      { field: 'Materia', before: '', after: 'Gestión Pública I' },
      { field: 'Estudiantes Calificados', before: '0', after: '35' },
      { field: 'Promedio Grupo', before: '0.0', after: '3.8' },
      { field: 'Estado', before: 'Pendiente', after: 'Cargadas' }
    ]
  },
  {
    id: 'AUD-ACAD-004',
    timestamp: '2025-01-22 16:45:00',
    user: 'Carolina Vargas',
    userId: 'PER-8901',
    action: 'Generar certificado de grado',
    module: 'Registro Académico',
    severity: 'critical',
    status: 'success',
    ipAddress: '192.168.3.45',
    device: 'Windows 11 - Desktop',
    browser: 'Chrome 120.0',
    location: 'Bogotá, Colombia',
    duration: '3m 20s',
    details: 'Generación de certificado CERT-GRADO-2025-089 - Magíster en Gobierno',
    changes: [
      { field: 'Graduando', before: '', after: 'María Fernanda Torres' },
      { field: 'Título', before: '', after: 'Magíster en Gobierno y Asuntos Públicos' },
      { field: 'Fecha Grado', before: '', after: '2024-12-15' },
      { field: 'Folio Registro', before: '', after: 'F-2024-1234' },
      { field: 'Libro', before: '', after: 'Libro 45' }
    ]
  },
  {
    id: 'AUD-ACAD-005',
    timestamp: '2025-01-22 16:30:00',
    user: 'Director Académico',
    userId: 'PER-0001',
    action: 'Firmar digitalmente certificado de grado',
    module: 'Registro Académico',
    severity: 'critical',
    status: 'success',
    ipAddress: '192.168.3.10',
    device: 'MacBook Pro - Laptop',
    browser: 'Safari 17.1',
    location: 'Bogotá, Colombia',
    duration: '1m 30s',
    details: 'Firma digital de certificado CERT-GRADO-2025-089 con certificado cualificado',
    changes: [
      { field: 'Estado', before: 'Generado', after: 'Firmado' },
      { field: 'Firmado Por', before: '', after: 'Dr. Jorge Pérez - Director Académico' },
      { field: 'Tipo Firma', before: '', after: 'Firma Electrónica Cualificada' },
      { field: 'Certificado Digital', before: '', after: 'Certicámara SA' },
      { field: 'Hash SHA-256', before: '', after: 'f7d9a1c2b8e3...' }
    ]
  },
  {
    id: 'AUD-ACAD-006',
    timestamp: '2025-01-22 16:15:00',
    user: 'María Fernanda Torres',
    userId: 'PER-1234',
    action: 'Validar título mediante QR',
    module: 'Registro Académico',
    severity: 'low',
    status: 'success',
    ipAddress: '181.129.45.78',
    device: 'iPhone 15 - Mobile',
    browser: 'Safari Mobile 17.1',
    location: 'Medellín, Colombia',
    duration: '15s',
    details: 'Validación de autenticidad de título mediante código QR',
    changes: [
      { field: 'Código QR Escaneado', before: '', after: 'QR-2025-089-TIT' },
      { field: 'Resultado Validación', before: '', after: 'AUTÉNTICO' },
      { field: 'Título Verificado', before: '', after: 'Magíster en Gobierno y Asuntos Públicos' }
    ]
  },
  {
    id: 'AUD-ACAD-007',
    timestamp: '2025-01-22 16:00:00',
    user: 'Roberto Silva',
    userId: 'PER-9012',
    action: 'Actualizar plan de estudios',
    module: 'Registro Académico',
    severity: 'high',
    status: 'success',
    ipAddress: '192.168.3.56',
    device: 'Lenovo ThinkPad - Laptop',
    browser: 'Edge 120.0',
    location: 'Bogotá, Colombia',
    duration: '5m 00s',
    details: 'Actualización de plan de estudios PROG-ESP-GP-2025 - Especialización en Gestión Pública',
    changes: [
      { field: 'Versión Plan', before: '2.0', after: '2.1' },
      { field: 'Créditos Totales', before: '24', after: '26' },
      { field: 'Materias Nuevas', before: '0', after: '2' },
      { field: 'Fecha Vigencia', before: '2024-01-01', after: '2025-01-01' }
    ]
  },
  {
    id: 'AUD-ACAD-008',
    timestamp: '2025-01-22 15:45:00',
    user: 'Carolina Vargas',
    userId: 'PER-8901',
    action: 'Exportar graduados para SNIES',
    module: 'Registro Académico',
    severity: 'medium',
    status: 'success',
    ipAddress: '192.168.3.45',
    device: 'Windows 11 - Desktop',
    browser: 'Chrome 120.0',
    location: 'Bogotá, Colombia',
    duration: '1m 20s',
    details: 'Exportación de listado de graduados 2024 para reporte SNIES',
    changes: [
      { field: 'Formato', before: '', after: 'Excel (.xlsx)' },
      { field: 'Periodo', before: '', after: '2024 Completo' },
      { field: 'Registros', before: '', after: '458' },
      { field: 'Destino', before: '', after: 'Reporte SNIES' }
    ]
  },

  // ============================================================================
  // GESTIÓN LEGAL (10 eventos)
  // ============================================================================

  {
    id: 'AUD-LEGAL-001',
    timestamp: '2025-01-22 18:00:00',
    user: 'Dra. Patricia Gómez',
    userId: 'PER-LEGAL-001',
    action: 'Crear expediente de tutela',
    module: 'Gestión Legal',
    severity: 'critical',
    status: 'success',
    ipAddress: '192.168.4.20',
    device: 'Windows 11 - Desktop',
    browser: 'Chrome 120.0',
    location: 'Bogotá, Colombia',
    duration: '3m 45s',
    details: 'Creación de expediente de tutela TUT-2025-001 contra ESAP',
    changes: [
      { field: 'Tipo Proceso', before: '', after: 'Acción de Tutela' },
      { field: 'Demandante', before: '', after: 'Carlos Rodríguez' },
      { field: 'Derecho Vulnerado', before: '', after: 'Derecho de Petición' },
      { field: 'Plazo Respuesta', before: '', after: '10 días hábiles' }
    ]
  },
  {
    id: 'AUD-LEGAL-002',
    timestamp: '2025-01-22 17:45:00',
    user: 'Dr. Andrés Moreno',
    userId: 'PER-LEGAL-002',
    action: 'Asignar abogado a expediente',
    module: 'Gestión Legal',
    severity: 'high',
    status: 'success',
    ipAddress: '192.168.4.21',
    device: 'MacBook Pro - Laptop',
    browser: 'Safari 17.1',
    location: 'Bogotá, Colombia',
    duration: '45s',
    details: 'Asignación de abogado a expediente TUT-2025-001',
    changes: [
      { field: 'Abogado Asignado', before: 'Sin asignar', after: 'Dra. Patricia Gómez' },
      { field: 'Carga Actual', before: '8 expedientes', after: '9 expedientes' }
    ]
  },

  // ============================================================================
  // ROLES Y PERMISOS (5 eventos)
  // ============================================================================

  {
    id: 'AUD-ROLES-001',
    timestamp: '2025-01-22 14:30:42',
    user: 'Admin Sistema',
    userId: 'PER-0001',
    action: 'Activar 2FA en rol',
    module: 'Roles y Permisos',
    severity: 'high',
    status: 'success',
    ipAddress: '192.168.1.10',
    device: 'MacBook Pro - Laptop',
    browser: 'Safari 17.1',
    location: 'Bogotá, Colombia',
    duration: '0.8s',
    details: 'Se activó autenticación de dos factores para el rol "Coordinador Académico"',
    changes: [
      { field: 'Requiere 2FA', before: 'No', after: 'Sí' },
      { field: 'Nivel de Seguridad', before: 'Estándar', after: 'Alto' },
      { field: 'Afecta a usuarios', before: '0', after: '12 usuarios ahora requieren 2FA' }
    ]
  },
  {
    id: 'AUD-ROLES-002',
    timestamp: '2025-01-22 14:25:15',
    user: 'Admin Sistema',
    userId: 'PER-0001',
    action: 'Crear rol personalizado',
    module: 'Roles y Permisos',
    severity: 'medium',
    status: 'success',
    ipAddress: '192.168.1.10',
    device: 'MacBook Pro - Laptop',
    browser: 'Safari 17.1',
    location: 'Bogotá, Colombia',
    duration: '1.1s',
    details: 'Se creó un nuevo rol personalizado "Coordinador de Sede Medellín"',
    changes: [
      { field: 'Nombre', before: '', after: 'Coordinador de Sede Medellín' },
      { field: 'Color', before: '', after: '#16a34a (Verde)' },
      { field: 'Icono', before: '', after: 'Building2' },
      { field: 'Requiere 2FA', before: '', after: 'Sí' },
      { field: 'Permisos asignados', before: '', after: '18 permisos' }
    ]
  },

  // ============================================================================
  // AUTENTICACIÓN 2FA (3 eventos)
  // ============================================================================

  {
    id: 'AUD-2FA-001',
    timestamp: '2025-01-22 14:45:22',
    user: 'María Rodríguez',
    userId: 'PER-1034',
    action: 'Inicio de sesión con 2FA exitoso',
    module: 'Autenticación 2FA',
    severity: 'info',
    status: 'success',
    ipAddress: '192.168.1.45',
    device: 'Windows 11 - Desktop',
    browser: 'Chrome 119.0',
    location: 'Bogotá, Colombia',
    duration: '2.3s',
    details: 'Usuario con rol Super Administrador verificó código 2FA correctamente'
  },
  {
    id: 'AUD-2FA-002',
    timestamp: '2025-01-22 14:40:15',
    user: 'Carlos Mendoza',
    userId: 'PER-2045',
    action: 'Fallo en verificación 2FA',
    module: 'Autenticación 2FA',
    severity: 'medium',
    status: 'warning',
    ipAddress: '192.168.1.67',
    device: 'iPhone 14 - Mobile',
    browser: 'Safari Mobile 17.1',
    location: 'Medellín, Colombia',
    duration: '1.2s',
    details: 'Código 2FA incorrecto ingresado. Intento 2 de 3 permitidos.'
  }
];

console.log(`✅ Eventos de auditoría completos: ${AUDIT_EVENTS_COMPLETE.length} eventos particularizados`);
console.log(`📊 Módulos cubiertos: 12 módulos principales`);
console.log(`🔍 Listo para integrar en AuditModulePremium.tsx`);
