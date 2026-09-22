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

import { jsPDF } from 'jspdf';
import { LOGO_CERTIFICACIONES_ESAP_B64 } from './logoCertificacionesESAP';

// Logo institucional en Base64 para máxima compatibilidad y nitidez
const LOGO_ESAP_B64 = 'data:image/png;base64,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';

/**
 * Función para obtener el logo ESAP como base64
 * Ahora retorna directamente la constante para evitar errores de carga
 */
export async function getLogoESAP(): Promise<string> {
  return LOGO_ESAP_B64;
}

// Para compatibilidad con código existente
export async function getLogoESAPBase64(): Promise<string> {
  return LOGO_ESAP_B64;
}

// Exportar la constante para uso directo
// El encabezado institucional lleva el logo con los sellos Icontec e IQNET (EFDS-1630)
export const LOGO_ESAP_URL = LOGO_CERTIFICACIONES_ESAP_B64;

export interface ConfiguracionDocumento {
  codigo: string;           // ej: 'EM-PT-004', 'EM-FO-009'
  version: number;          // ej: 3
  fecha: string;            // ej: '24/Oct/2025'
  proceso?: string;         // Default: 'EVALUACIÓN CONTROL Y MEJORA'
  titulo?: string;          // Default: 'PROCEDIMIENTO AUDITORÍAS INTERNAS'
  logoImg?: string;         // Logo ESAP (opcional, para incluir en encabezado)
  /** Fila extra debajo de proceso: "Documento de referencia: ..." */
  documentoReferencia?: string;
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
    // Usar logo proporcionado o cargar dinámicamente
    const logoToUse = config.logoImg || LOGO_ESAP_URL;
    try {
      // Proporción real del logo institucional (450x171), para que no se deforme
      const imgWidth = 31;
      const imgHeight = 11.8;
      const logoCenterX = logoX + (logoWidth / 2) - (imgWidth / 2);
      const logoCenterY = yPos + (alturaEncabezado / 2) - (imgHeight / 2);
      doc.addImage(logoToUse, 'auto', logoCenterX, logoCenterY, imgWidth, imgHeight);
    } catch (error) {
      console.warn('No se pudo cargar el logo, usando texto fallback');
      // Fallback: Dibujar círculo con letras ESAP
      doc.setFillColor(0, 61, 165);
      doc.circle(logoX + logoWidth / 2, yPos + alturaEncabezado / 2, 8, 'F');
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('ESAP', logoX + (logoWidth / 2), yPos + (alturaEncabezado / 2) + 1, { align: 'center' });
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

    yPos += alturaProceso;

    // ============================================
    // DOCUMENTO DE REFERENCIA (fila opcional)
    // ============================================
    if (config.documentoReferencia) {
      const alturaRef = 6;
      doc.rect(logoX, yPos, logoWidth + tituloWidth + infoWidth, alturaRef);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Documento de referencia:', logoX + 2, yPos + 4);
      doc.setFont('helvetica', 'normal');
      doc.text(config.documentoReferencia, logoX + 42, yPos + 4);
      yPos += alturaRef;
    }

    yPos += 3;
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
  doc.setTextColor(0, 0, 0);

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
  },
  INFORME_AUDITORIA_OCI: {
    codigo: 'EM-FO-003',
    version: 2,
    fecha: '24/02/2025',
    titulo: 'INFORME DE AUDITORIA INTERNA OCI',
    proceso: 'EVALUACIÓN CONTROL Y MEJORA',
    documentoReferencia: 'Procedimiento Auditorías Internas basadas en riesgos EM-PT-004'
  },
  INFORME_EJECUTIVO_OCI: {
    codigo: 'EM-FO-011',
    version: 3,
    fecha: '24/Oct/2025',
    titulo: 'INFORME EJECUTIVO DE AUDITORÍA INTERNA',
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
