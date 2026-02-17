/**
 * ============================================
 * SERVICIO: ENCABEZADO INSTITUCIONAL ESAP
 * ============================================
 * 
 * Genera el encabezado estándar para documentos oficiales de Control Interno
 * siguiendo el formato institucional EM-PT-004
 * 
 * FORMATO ENCABEZADO:
 * +--------+---------------------------+-----------------+
 * | LOGO   | PROCEDIMIENTO             | CÓDIGO: EM-PT-004|
 * | ESAP   | AUDITORÍAS INTERNAS       | VERSIÓN: 3       |
 * |        |                           | FECHA: 24/Oct/25 |
 * +--------+---------------------------+-----------------+
 * | PROCESO: EVALUACIÓN CONTROL Y MEJORA                 |
 * +------------------------------------------------------+
 */

import jsPDF from 'jspdf';

export interface ConfiguracionDocumento {
  codigo: string;           // ej: 'EM-PT-004', 'EM-FO-009'
  version: number;          // ej: 3
  fecha: string;            // ej: '24/Oct/2025'
  proceso?: string;         // Default: 'EVALUACIÓN CONTROL Y MEJORA'
  titulo?: string;          // Default: 'PROCEDIMIENTO AUDITORÍAS INTERNAS'
  logoImg?: string;         // Logo ESAP (opcional, para incluir en encabezado)
}

/**
 * Dibuja el encabezado institucional estándar
 * @param doc - Documento jsPDF
 * @param config - Configuración del documento
 * @param yInicio - Posición Y donde inicia el encabezado (default: 10)
 * @returns yPos - Posición Y donde termina el encabezado
 */
export function dibujarEncabezadoInstitucional(
  doc: jsPDF, 
  config: ConfiguracionDocumento,
  yInicio: number = 10
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = yInicio;

  // Configuración por defecto
  const titulo = config.titulo || 'PROCEDIMIENTO AUDITORÍAS INTERNAS';
  const proceso = config.proceso || 'EVALUACIÓN CONTROL Y MEJORA';

  try {
    // ============================================
    // ENCABEZADO CON FORMATO INSTITUCIONAL
    // ============================================
    
    // Dimensiones de las secciones
    const alturaEncabezado = 20;
    const logoWidth = 35;
    const tituloWidth = 100;
    const infoWidth = 45;
    const rowHeight = alturaEncabezado / 3;

    // Posiciones X
    const logoX = margin;
    const tituloX = logoX + logoWidth;
    const infoX = tituloX + tituloWidth;

    // ============================================
    // DIBUJAR BORDES DE LA TABLA
    // ============================================
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);

    // Contenedor exterior
    doc.rect(logoX, yPos, logoWidth + tituloWidth + infoWidth, alturaEncabezado);

    // Divisiones verticales
    doc.line(tituloX, yPos, tituloX, yPos + alturaEncabezado); // Línea entre logo y título
    doc.line(infoX, yPos, infoX, yPos + alturaEncabezado);     // Línea entre título e info

    // Divisiones horizontales en sección de info
    doc.line(infoX, yPos + rowHeight, logoX + logoWidth + tituloWidth + infoWidth, yPos + rowHeight);
    doc.line(infoX, yPos + (rowHeight * 2), logoX + logoWidth + tituloWidth + infoWidth, yPos + (rowHeight * 2));

    // ============================================
    // LOGO ESAP (IZQUIERDA)
    // ============================================
    if (config.logoImg) {
      try {
        const logoHeight = 18;
        const logoCenterX = logoX + (logoWidth / 2) - 8;
        const logoCenterY = yPos + (alturaEncabezado / 2) - (logoHeight / 2);
        doc.addImage(config.logoImg, 'PNG', logoCenterX, logoCenterY, 16, logoHeight);
      } catch (error) {
        console.warn('No se pudo cargar el logo, usando texto fallback');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 61, 165);
        doc.text('ESAP', logoX + (logoWidth / 2), yPos + (alturaEncabezado / 2), { align: 'center' });
      }
    } else {
      // Fallback: texto ESAP
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 61, 165);
      doc.text('ESAP', logoX + (logoWidth / 2), yPos + (alturaEncabezado / 2), { align: 'center' });
    }

    // ============================================
    // TÍTULO (CENTRO)
    // ============================================
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    
    // Dividir título en líneas si es muy largo
    const maxTituloWidth = tituloWidth - 4;
    const tituloLineas = doc.splitTextToSize(titulo, maxTituloWidth);
    const tituloY = yPos + (alturaEncabezado / 2) - ((tituloLineas.length - 1) * 2);
    doc.text(tituloLineas, tituloX + (tituloWidth / 2), tituloY, { align: 'center' });

    // ============================================
    // INFORMACIÓN DERECHA (CÓDIGO, VERSIÓN, FECHA)
    // ============================================
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    // CÓDIGO
    doc.setFont('helvetica', 'bold');
    doc.text('CÓDIGO:', infoX + 2, yPos + rowHeight - 2);
    doc.setFont('helvetica', 'normal');
    doc.text(config.codigo, infoX + infoWidth - 2, yPos + rowHeight - 2, { align: 'right' });

    // VERSIÓN
    doc.setFont('helvetica', 'bold');
    doc.text('VERSIÓN:', infoX + 2, yPos + (rowHeight * 2) - 2);
    doc.setFont('helvetica', 'normal');
    doc.text(config.version.toString(), infoX + infoWidth - 2, yPos + (rowHeight * 2) - 2, { align: 'right' });

    // FECHA
    doc.setFont('helvetica', 'bold');
    doc.text('FECHA:', infoX + 2, yPos + alturaEncabezado - 2);
    doc.setFont('helvetica', 'normal');
    doc.text(config.fecha, infoX + infoWidth - 2, yPos + alturaEncabezado - 2, { align: 'right' });

    yPos += alturaEncabezado;

    // ============================================
    // PROCESO (DEBAJO DEL ENCABEZADO)
    // ============================================
    const alturaProceso = 6;
    doc.rect(logoX, yPos, logoWidth + tituloWidth + infoWidth, alturaProceso);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('PROCESO:', logoX + 2, yPos + 4);
    doc.setFont('helvetica', 'normal');
    doc.text(proceso, logoX + 20, yPos + 4);

    yPos += alturaProceso + 3;

    return yPos;

  } catch (error) {
    console.error('Error al dibujar encabezado institucional:', error);
    // Fallback: encabezado simple
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 61, 165);
    doc.text(titulo, pageWidth / 2, yPos, { align: 'center' });
    return yPos + 10;
  }
}

/**
 * Dibuja el pie de página institucional
 * @param doc - Documento jsPDF
 * @param numeroPagina - Número de página actual
 * @param incluirContacto - Si incluir información de contacto (default: true)
 */
export function dibujarPieInstitucional(
  doc: jsPDF, 
  numeroPagina: number,
  incluirContacto: boolean = true
): void {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const yPie = pageHeight - 15;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);

  if (incluirContacto) {
    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, yPie - 3, pageWidth - margin, yPie - 3);

    // Información de contacto
    doc.text('Sede Nacional - Bogotá - Calle 44 No. 53-37 CAN', margin, yPie);
    doc.text('PBX: (+57 601) 7956110', margin, yPie + 3);
    doc.text('Correo: ventanillaunica@esap.edu.co', margin, yPie + 6);
  }

  // Número de página (derecha)
  doc.setFont('helvetica', 'normal');
  doc.text(`Página ${numeroPagina}`, pageWidth - margin, yPie + 6, { align: 'right' });
}

/**
 * Configuraciones predefinidas para documentos comunes
 */
export const DOCUMENTOS_PREDEFINIDOS = {
  CARTA_REPRESENTACION: {
    codigo: 'EM-FO-010',
    version: 3,
    fecha: '24/Oct/2025',
    titulo: 'CARTA DE REPRESENTACIÓN OCI',
    proceso: 'EVALUACIÓN CONTROL Y MEJORA'
  },
  CARTA_COMPROMISO: {
    codigo: 'EM-FO-009',
    version: 3,
    fecha: '24/Oct/2025',
    titulo: 'CARTA DE COMPROMISO OCI',
    proceso: 'EVALUACIÓN CONTROL Y MEJORA'
  },
  OFICIO_ANUNCIO: {
    codigo: 'EM-FO-008',
    version: 3,
    fecha: '24/Oct/2025',
    titulo: 'OFICIO DE ANUNCIO',
    proceso: 'EVALUACIÓN CONTROL Y MEJORA'
  },
  PROGRAMA_INDIVIDUAL: {
    codigo: 'EM-FO-011',
    version: 3,
    fecha: '24/Oct/2025',
    titulo: 'PROGRAMA INDIVIDUAL DE AUDITORÍA',
    proceso: 'EVALUACIÓN CONTROL Y MEJORA'
  },
  PLAN_ANUAL: {
    codigo: 'EM-PT-004',
    version: 3,
    fecha: '24/Oct/2025',
    titulo: 'PLAN ANUAL DE AUDITORÍA INTERNA',
    proceso: 'EVALUACIÓN CONTROL Y MEJORA'
  }
};

/**
 * Utilidad para agregar nueva página con encabezado y pie
 */
export function agregarPaginaConEncabezado(
  doc: jsPDF,
  config: ConfiguracionDocumento,
  numeroPagina: number
): number {
  doc.addPage();
  const yPos = dibujarEncabezadoInstitucional(doc, config);
  dibujarPieInstitucional(doc, numeroPagina);
  return yPos;
}
