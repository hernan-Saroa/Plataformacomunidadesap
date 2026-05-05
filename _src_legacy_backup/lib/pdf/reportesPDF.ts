/**
 * Generador de Reportes PDF
 * Crea reportes descargables del histórico de validaciones
 */

export interface DatosReporte {
  tipo: 'HISTORICO' | 'ANALITICO' | 'AUDITORIA';
  periodo: {
    inicio: string;
    fin: string;
  };
  filtros?: {
    resultado?: string;
    metodo?: string;
    ubicacion?: string;
  };
  validaciones?: any[];
  estadisticas?: {
    total: number;
    validos: number;
    invalidos: number;
    vencidos: number;
    anulados: number;
    tiempoPromedio: number;
  };
  graficas?: {
    incluirGraficaTendencias: boolean;
    incluirGraficaDistribucion: boolean;
    incluirGraficaUbicaciones: boolean;
  };
}

export interface ConfiguracionPDF {
  titulo: string;
  subtitulo?: string;
  incluirPortada: boolean;
  incluirResumenEjecutivo: boolean;
  incluirTablaDetallada: boolean;
  incluirGraficas: boolean;
  incluirRecomendaciones: boolean;
  formato: 'A4' | 'LETTER' | 'LEGAL';
  orientacion: 'portrait' | 'landscape';
  logo?: boolean;
}

/**
 * Genera un reporte PDF del histórico de validaciones
 */
export async function generarReportePDF(
  datos: DatosReporte,
  configuracion: ConfiguracionPDF
): Promise<Blob> {
  try {
    console.log('Generando reporte PDF...', { datos, configuracion });

    // En producción, aquí se usaría una librería como:
    // - jsPDF + jspdf-autotable para PDFs simples
    // - pdfmake para PDFs más complejos con layout avanzado
    // - react-pdf o @react-pdf/renderer para PDFs desde React

    // Simular generación del PDF
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock de PDF (en producción sería el PDF real)
    const pdfContent = generarContenidoPDFMock(datos, configuracion);
    
    // Crear Blob
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    
    return blob;
  } catch (error) {
    console.error('Error al generar reporte PDF:', error);
    throw new Error('Error al generar el reporte PDF');
  }
}

/**
 * Mock de contenido PDF (en producción sería el PDF real)
 */
function generarContenidoPDFMock(datos: DatosReporte, config: ConfiguracionPDF): string {
  const content = `
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/MediaBox [0 0 612 792]
/Contents 5 0 R
>>
endobj

4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

5 0 obj
<<
/Length 200
>>
stream
BT
/F1 24 Tf
50 750 Td
(REPORTE DE VALIDACIONES ESAP) Tj
0 -30 Td
/F1 12 Tf
(Período: ${datos.periodo.inicio} - ${datos.periodo.fin}) Tj
0 -20 Td
(Total validaciones: ${datos.estadisticas?.total || 0}) Tj
ET
endstream
endobj

xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000274 00000 n
0000000361 00000 n
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
611
%%EOF
  `;

  return content;
}

/**
 * Descarga el reporte PDF generado
 */
export function descargarPDF(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Genera y descarga un reporte completo
 */
export async function generarYDescargarReporte(
  datos: DatosReporte,
  configuracion: Partial<ConfiguracionPDF> = {}
): Promise<void> {
  const configCompleta: ConfiguracionPDF = {
    titulo: 'Reporte de Validaciones de Certificados Laborales',
    subtitulo: `Período: ${new Date(datos.periodo.inicio).toLocaleDateString('es-CO')} - ${new Date(datos.periodo.fin).toLocaleDateString('es-CO')}`,
    incluirPortada: true,
    incluirResumenEjecutivo: true,
    incluirTablaDetallada: true,
    incluirGraficas: true,
    incluirRecomendaciones: true,
    formato: 'A4',
    orientacion: 'portrait',
    logo: true,
    ...configuracion
  };

  try {
    const blob = await generarReportePDF(datos, configCompleta);
    
    const nombreArchivo = `Reporte_Validaciones_${new Date().toISOString().split('T')[0]}.pdf`;
    descargarPDF(blob, nombreArchivo);
  } catch (error) {
    console.error('Error al generar y descargar reporte:', error);
    throw error;
  }
}

/**
 * Genera reporte en formato CSV (alternativa ligera)
 */
export function generarReporteCSV(validaciones: any[]): string {
  const headers = [
    'ID',
    'Fecha/Hora',
    'Código QR',
    'Resultado',
    'Empleado',
    'Documento',
    'Ubicación',
    'Método',
    'Tiempo (ms)'
  ];

  const rows = validaciones.map(v => [
    v.id,
    v.fechaHora,
    v.qrCode,
    v.resultado,
    v.certificado?.empleado || '-',
    v.certificado?.documento || '-',
    v.origen.ubicacion,
    v.metodo,
    v.duracion
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
}

/**
 * Descarga reporte en formato CSV
 */
export function descargarReporteCSV(validaciones: any[], nombreArchivo: string = 'reporte_validaciones.csv'): void {
  const csvContent = generarReporteCSV(validaciones);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  descargarPDF(blob, nombreArchivo);
}

/**
 * Genera reporte en formato Excel (XLSX)
 */
export async function generarReporteExcel(validaciones: any[]): Promise<Blob> {
  // En producción, se usaría una librería como xlsx o exceljs
  console.log('Generando reporte Excel...', validaciones);
  
  // Simular generación
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Por ahora retornamos CSV como fallback
  const csvContent = generarReporteCSV(validaciones);
  return new Blob([csvContent], { type: 'application/vnd.ms-excel' });
}

/**
 * Genera un resumen ejecutivo en formato JSON
 */
export function generarResumenEjecutivo(datos: DatosReporte): {
  periodo: string;
  metricas: any;
  insights: string[];
  recomendaciones: string[];
} {
  const stats = datos.estadisticas || {
    total: 0,
    validos: 0,
    invalidos: 0,
    vencidos: 0,
    anulados: 0,
    tiempoPromedio: 0
  };

  const tasaExito = stats.total > 0 ? (stats.validos / stats.total * 100).toFixed(2) : 0;
  const tasaError = stats.total > 0 ? (stats.invalidos / stats.total * 100).toFixed(2) : 0;

  const insights: string[] = [];
  const recomendaciones: string[] = [];

  // Generar insights automáticos
  if (parseFloat(tasaExito as string) < 80) {
    insights.push(`La tasa de éxito (${tasaExito}%) está por debajo del objetivo del 80%`);
    recomendaciones.push('Revisar los certificados que están siendo rechazados frecuentemente');
  }

  if (parseFloat(tasaError as string) > 10) {
    insights.push(`Alta tasa de validaciones inválidas (${tasaError}%)`);
    recomendaciones.push('Implementar alertas tempranas para detectar posibles intentos fraudulentos');
  }

  if (stats.tiempoPromedio > 300) {
    insights.push(`El tiempo promedio de validación (${stats.tiempoPromedio}ms) supera el objetivo de 300ms`);
    recomendaciones.push('Optimizar el rendimiento del servicio de validación');
  }

  if (stats.vencidos > stats.total * 0.05) {
    insights.push(`Número significativo de certificados vencidos (${stats.vencidos})`);
    recomendaciones.push('Enviar notificaciones automáticas antes del vencimiento de certificados');
  }

  return {
    periodo: `${datos.periodo.inicio} - ${datos.periodo.fin}`,
    metricas: {
      totalValidaciones: stats.total,
      tasaExito: `${tasaExito}%`,
      tasaError: `${tasaError}%`,
      tiempoPromedio: `${stats.tiempoPromedio}ms`,
      distribucion: {
        validos: stats.validos,
        invalidos: stats.invalidos,
        vencidos: stats.vencidos,
        anulados: stats.anulados
      }
    },
    insights,
    recomendaciones
  };
}

/**
 * Plantilla HTML para previsualización del reporte
 */
export function generarVistaPreviaHTML(datos: DatosReporte): string {
  const resumen = generarResumenEjecutivo(datos);
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reporte de Validaciones - ESAP</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #003DA5 0%, #0052CC 100%);
          color: white;
          padding: 30px;
          border-radius: 10px;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .header p {
          margin: 10px 0 0 0;
          opacity: 0.9;
        }
        .metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .metric-card {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #003DA5;
        }
        .metric-card h3 {
          margin: 0 0 10px 0;
          color: #666;
          font-size: 14px;
          text-transform: uppercase;
        }
        .metric-card .value {
          font-size: 32px;
          font-weight: bold;
          color: #003DA5;
        }
        .section {
          margin-bottom: 30px;
        }
        .section h2 {
          color: #003DA5;
          border-bottom: 2px solid #003DA5;
          padding-bottom: 10px;
        }
        .insight {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 10px 0;
        }
        .recommendation {
          background: #d1ecf1;
          border-left: 4px solid #17a2b8;
          padding: 15px;
          margin: 10px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background: #003DA5;
          color: white;
        }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 2px solid #ddd;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Reporte de Validaciones de Certificados Laborales</h1>
        <p>Escuela Superior de Administración Pública - ESAP</p>
        <p>Período: ${resumen.periodo}</p>
      </div>

      <div class="section">
        <h2>Resumen Ejecutivo</h2>
        <div class="metrics">
          <div class="metric-card">
            <h3>Total Validaciones</h3>
            <div class="value">${resumen.metricas.totalValidaciones}</div>
          </div>
          <div class="metric-card">
            <h3>Tasa de Éxito</h3>
            <div class="value">${resumen.metricas.tasaExito}</div>
          </div>
          <div class="metric-card">
            <h3>Tiempo Promedio</h3>
            <div class="value">${resumen.metricas.tiempoPromedio}</div>
          </div>
          <div class="metric-card">
            <h3>Tasa de Error</h3>
            <div class="value">${resumen.metricas.tasaError}</div>
          </div>
        </div>
      </div>

      ${resumen.insights.length > 0 ? `
        <div class="section">
          <h2>Insights Clave</h2>
          ${resumen.insights.map(insight => `
            <div class="insight">${insight}</div>
          `).join('')}
        </div>
      ` : ''}

      ${resumen.recomendaciones.length > 0 ? `
        <div class="section">
          <h2>Recomendaciones</h2>
          ${resumen.recomendaciones.map(rec => `
            <div class="recommendation">✓ ${rec}</div>
          `).join('')}
        </div>
      ` : ''}

      <div class="footer">
        <p>Generado automáticamente el ${new Date().toLocaleString('es-CO')}</p>
        <p>Sistema de Gestión de Certificados Laborales - ESAP</p>
      </div>
    </body>
    </html>
  `;
}