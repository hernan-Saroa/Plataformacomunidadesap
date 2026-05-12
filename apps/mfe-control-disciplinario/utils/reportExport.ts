/**
 * Utilidades para Generación y Exportación de Reportes
 * Genera datos de ejemplo y exporta a múltiples formatos
 */

// ============ TIPOS ============
export interface ReportField {
  id: string;
  name: string;
  type: 'text' | 'select' | 'date' | 'number';
}

export interface ReportData {
  name: string;
  description: string;
  source: string;
  fields: string[];
  filters: any[];
  exportFormat: 'excel' | 'pdf' | 'csv' | 'json';
  dateRange: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============ GENERADORES DE DATOS DE EJEMPLO ============

const nombres = [
  'Juan Pérez García', 'María López Rodríguez', 'Carlos Martínez Sánchez',
  'Ana Gómez Torres', 'Luis Hernández Díaz', 'Laura Ramírez Cruz',
  'Pedro González Morales', 'Carmen Silva Vega', 'Jorge Castro Ruiz',
  'Diana Ortiz Flores', 'Roberto Méndez Santos', 'Patricia Vargas Luna',
  'Miguel Ángel Rojas', 'Isabel Moreno Ríos', 'Francisco Jiménez Paz',
  'Elena Gutiérrez Campos', 'Alberto Navarro Gil', 'Sofía Herrera Núñez',
  'Diego Romero Castro', 'Valentina Soto Peña', 'Andrés Reyes Molina',
  'Camila Torres Blanco', 'Sebastián Durán Aguirre', 'Daniela Vásquez Ortega',
  'Mateo Muñoz Carrillo', 'Lucía Paredes Cortés', 'Santiago Figueroa León',
  'Gabriela Mendoza Suárez', 'Nicolás Cárdenas Rivera', 'Isabella Acosta Vera'
];

const departamentos = [
  'Cundinamarca', 'Antioquia', 'Valle del Cauca', 'Atlántico', 'Bolívar',
  'Santander', 'Tolima', 'Huila', 'Meta', 'Boyacá', 'Caldas', 'Risaralda',
  'Quindío', 'Norte de Santander', 'Magdalena', 'Cesar', 'Córdoba', 'Sucre',
  'La Guajira', 'Nariño', 'Cauca', 'Putumayo', 'Caquetá', 'Casanare'
];

const roles = [
  'Administrador', 'Estudiante', 'Docente', 'Graduado', 'Coordinador',
  'Decano', 'Director de Programa', 'Secretario Académico'
];

const estados = ['Activo', 'Inactivo', 'Pendiente', 'Suspendido'];

const programas = [
  'Administración Pública', 'Derecho Público', 'Ciencias Políticas',
  'Gestión Pública', 'Economía', 'Gobierno y Relaciones Internacionales',
  'Maestría en Administración Pública', 'Especialización en Gerencia Pública'
];

const tiposEvento = [
  'Inicio de Sesión', 'Cierre de Sesión', 'Creación de Usuario', 'Modificación de Usuario',
  'Eliminación de Usuario', 'Cambio de Rol', 'Asignación de Permiso', 'Revocación de Permiso',
  'Generación de Reporte', 'Descarga de Documento', 'Actualización de Perfil', 'Cambio de Contraseña'
];

const severidades = ['Baja', 'Media', 'Alta', 'Crítica'];

const modulos = [
  'Usuarios', 'Roles y Permisos', 'Auditoría', 'Reportes', 'Graduados',
  'Bolsa de Empleo', 'Gestión Profesoral', 'Certificados', 'Documentos'
];

/**
 * Genera un valor aleatorio basado en el tipo de campo
 */
function generateFieldValue(fieldId: string, fieldType: string): any {
  const now = new Date();
  
  switch (fieldId) {
    // Campos de usuarios
    case 'nombre':
      return nombres[Math.floor(Math.random() * nombres.length)];
    case 'email':
      const name = nombres[Math.floor(Math.random() * nombres.length)];
      const emailName = name.toLowerCase().replace(/\s+/g, '.').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return `${emailName}@esap.edu.co`;
    case 'rol':
      return roles[Math.floor(Math.random() * roles.length)];
    case 'estado':
      return estados[Math.floor(Math.random() * estados.length)];
    case 'departamento':
      return departamentos[Math.floor(Math.random() * departamentos.length)];
    case 'programa':
      return programas[Math.floor(Math.random() * programas.length)];
    case 'fechaCreacion':
    case 'fecha':
      const daysAgo = Math.floor(Math.random() * 365);
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      return date.toLocaleDateString('es-CO');
    case 'ultimoAcceso':
      const hoursAgo = Math.floor(Math.random() * 720);
      const lastAccess = new Date(now);
      lastAccess.setHours(lastAccess.getHours() - hoursAgo);
      return lastAccess.toLocaleDateString('es-CO');
    
    // Campos de roles
    case 'nombreRol':
      return roles[Math.floor(Math.random() * roles.length)];
    case 'descripcion':
      return 'Descripción del rol con permisos específicos del sistema';
    case 'cantidadUsuarios':
      return Math.floor(Math.random() * 500) + 1;
    case 'permisos':
      return Math.floor(Math.random() * 50) + 5;
    case 'nivel':
      return ['Básico', 'Medio', 'Avanzado', 'Administrador'][Math.floor(Math.random() * 4)];
    
    // Campos de auditoría
    case 'evento':
    case 'tipoEvento':
      return tiposEvento[Math.floor(Math.random() * tiposEvento.length)];
    case 'usuario':
      return nombres[Math.floor(Math.random() * nombres.length)];
    case 'severidad':
      return severidades[Math.floor(Math.random() * severidades.length)];
    case 'modulo':
      return modulos[Math.floor(Math.random() * modulos.length)];
    case 'ip':
      return 'IP interna protegida';
    
    // Campos de actividad del sistema
    case 'sesiones':
      return Math.floor(Math.random() * 1000) + 10;
    case 'acciones':
      return Math.floor(Math.random() * 5000) + 50;
    case 'errores':
      return Math.floor(Math.random() * 100);
    case 'tiempoRespuesta':
      return (Math.random() * 2).toFixed(2) + 's';
    
    default:
      if (fieldType === 'date') {
        return now.toLocaleDateString('es-CO');
      } else if (fieldType === 'number') {
        return Math.floor(Math.random() * 1000);
      } else if (fieldType === 'select') {
        return ['Opción 1', 'Opción 2', 'Opción 3'][Math.floor(Math.random() * 3)];
      }
      return 'Dato de ejemplo';
  }
}

/**
 * Genera datos de ejemplo para el reporte
 */
export function generateReportData(
  reportConfig: ReportData,
  availableFields: ReportField[],
  recordCount: number = 50
): any[] {
  const data: any[] = [];
  
  // Generar registros
  for (let i = 0; i < recordCount; i++) {
    const record: any = {};
    
    // Generar valores para cada campo seleccionado
    reportConfig.fields.forEach(fieldId => {
      const field = availableFields.find(f => f.id === fieldId);
      if (field) {
        record[field.name] = generateFieldValue(fieldId, field.type);
      }
    });
    
    data.push(record);
  }
  
  // Aplicar ordenamiento si está configurado
  if (reportConfig.sortBy) {
    const sortField = availableFields.find(f => f.id === reportConfig.sortBy);
    if (sortField) {
      data.sort((a, b) => {
        const aVal = a[sortField.name];
        const bVal = b[sortField.name];
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return reportConfig.sortOrder === 'asc' 
            ? aVal.localeCompare(bVal) 
            : bVal.localeCompare(aVal);
        }
        
        return reportConfig.sortOrder === 'asc' 
          ? aVal - bVal 
          : bVal - aVal;
      });
    }
  }
  
  return data;
}

/**
 * Exporta datos a formato CSV
 */
export function exportToCSV(data: any[], filename: string): void {
  if (data.length === 0) {
    throw new Error('No hay datos para exportar');
  }
  
  // Obtener headers
  const headers = Object.keys(data[0]);
  
  // Crear contenido CSV
  const csvContent = [
    // Headers
    headers.join(','),
    // Rows
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]?.toString() || '';
        // Escapar comas y comillas
        return value.includes(',') || value.includes('"') 
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
      }).join(',')
    )
  ].join('\n');
  
  // Crear blob y descargar
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Exporta datos a formato Excel (usando CSV compatible con Excel)
 */
export function exportToExcel(data: any[], filename: string): void {
  // Por ahora usamos CSV que Excel puede abrir
  // En una implementación real, usaríamos una librería como xlsx
  exportToCSV(data, filename);
}

/**
 * Exporta datos a formato JSON
 */
export function exportToJSON(data: any[], filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  downloadBlob(blob, `${filename}.json`);
}

/**
 * Exporta datos a formato PDF (versión simplificada)
 */
export function exportToPDF(data: any[], filename: string, reportConfig: ReportData): void {
  // Crear contenido HTML para el PDF
  const headers = data.length > 0 ? Object.keys(data[0]) : [];
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${reportConfig.name}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #003DA5;
    }
    .header h1 {
      color: #003DA5;
      margin: 0 0 10px 0;
      font-size: 24px;
    }
    .header p {
      color: #666;
      margin: 5px 0;
      font-size: 14px;
    }
    .meta-info {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 12px;
    }
    .meta-info strong {
      color: #003DA5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      font-size: 11px;
    }
    th {
      background: #003DA5;
      color: white;
      padding: 12px 8px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #002d7a;
    }
    td {
      padding: 10px 8px;
      border: 1px solid #ddd;
    }
    tr:nth-child(even) {
      background: #f9f9f9;
    }
    tr:hover {
      background: #f0f0f0;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 10px;
      color: #999;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎓 Escuela Superior de Administración Pública - ESAP</h1>
    <h2 style="color: #003DA5; margin: 10px 0;">${reportConfig.name}</h2>
    <p>${reportConfig.description || 'Reporte Personalizado'}</p>
  </div>
  
  <div class="meta-info">
    <strong>Fecha de Generación:</strong> ${new Date().toLocaleString('es-CO', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}<br>
    <strong>Total de Registros:</strong> ${data.length}<br>
    <strong>Fuente de Datos:</strong> ${reportConfig.source}<br>
    <strong>Período:</strong> ${reportConfig.dateRange === '7d' ? 'Últimos 7 días' : 
                                reportConfig.dateRange === '30d' ? 'Últimos 30 días' : 
                                reportConfig.dateRange === '90d' ? 'Últimos 90 días' : 
                                reportConfig.dateRange === '1y' ? 'Último año' : 'Todo el historial'}
  </div>
  
  <table>
    <thead>
      <tr>
        ${headers.map(h => `<th>${h}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${data.map(row => `
        <tr>
          ${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <p>Reporte generado por el Sistema de Gestión ESAP - Backoffice Administrativo</p>
    <p>© ${new Date().getFullYear()} ESAP - Todos los derechos reservados</p>
  </div>
  
  <script class="no-print">
    // Auto-print cuando se carga la página
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;
  
  // Crear blob y abrir en nueva ventana para imprimir/guardar como PDF
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const newWindow = window.open(url, '_blank');
  
  if (newWindow) {
    newWindow.onload = function() {
      // Limpiar URL después de un tiempo
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    };
  }
}

/**
 * Descarga un blob como archivo
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Limpiar URL
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Función principal para exportar reportes
 */
export function exportReport(
  reportConfig: ReportData,
  availableFields: ReportField[],
  recordCount: number = 50
): void {
  // Generar datos
  const data = generateReportData(reportConfig, availableFields, recordCount);
  
  // Crear nombre de archivo sanitizado
  const timestamp = new Date().toISOString().split('T')[0];
  const safeName = reportConfig.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 50);
  const filename = `reporte_${safeName}_${timestamp}`;
  
  // Exportar según el formato seleccionado
  switch (reportConfig.exportFormat) {
    case 'csv':
      exportToCSV(data, filename);
      break;
    case 'excel':
      exportToExcel(data, filename);
      break;
    case 'json':
      exportToJSON(data, filename);
      break;
    case 'pdf':
      exportToPDF(data, filename, reportConfig);
      break;
    default:
      throw new Error(`Formato no soportado: ${reportConfig.exportFormat}`);
  }
}
