/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVICIO: EXPORTACIÓN DE AUDITORÍAS A EXCEL
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Genera el documento Excel con listado de auditorías del Tablero Kanban
 * - Logo ESAP institucional
 * - Encabezado tipo formulario con CÓDIGO, VERSIÓN, FECHA
 * - Colores corporativos (#003DA5)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import ExcelJS from 'exceljs';

// Importar logo ESAP
import logoESAP from '@/assets/cropped-favicon-32x32.png';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

export interface AuditoriaExcel {
  codigo: string;
  titulo: string;
  tipo: string;
  estado: string;
  territorial: string;
  auditorLider?: { nombre: string };
  fechaInicio: string;
  fechaFin: string;
  progreso: number;
  hallazgos: number;
  riesgo: string;
}

export interface ResultadoExportacion {
  exito: boolean;
  nombreArchivo: string;
  mensaje?: string;
  error?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// COLORES ESAP
// ════════════════════════════════════════════════════════════════════════════

const ESAP_BLUE = '003DA5';
const ESAP_BLUE_LIGHT = 'E3F2FD';
const ESAP_GRAY = 'F0F4F8';

// ════════════════════════════════════════════════════════════════════════════
// CACHE DEL LOGO
// ════════════════════════════════════════════════════════════════════════════

let _logoCache: string | null = null;

async function getLogoBase64(): Promise<string> {
  if (_logoCache) return _logoCache;
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        _logoCache = dataUrl.split(',')[1]; // Solo el base64 sin prefijo
        resolve(_logoCache);
      } else {
        reject(new Error('No se pudo obtener el contexto del canvas'));
      }
    };
    img.onerror = reject;
    img.src = logoESAP;
  });
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export async function exportarAuditoriasExcel(
  auditorias: AuditoriaExcel[]
): Promise<ResultadoExportacion> {
  try {
    console.log('📊 Generando Excel de Auditorías...');

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ESAP - OCIG';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Auditorías OCIG', {
      pageSetup: {
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0
      }
    });

    // ════════════════════════════════════════════════════════════════════════
    // LOGO ESAP
    // ════════════════════════════════════════════════════════════════════════
    
    try {
      const logoBase64 = await getLogoBase64();
      const logoImageId = workbook.addImage({
        base64: logoBase64,
        extension: 'png',
      });
      
      worksheet.addImage(logoImageId, {
        tl: { col: 0.3, row: 0.3 },
        ext: { width: 50, height: 50 }
      });
    } catch (error) {
      console.warn('No se pudo cargar el logo ESAP:', error);
    }

    // ════════════════════════════════════════════════════════════════════════
    // ENCABEZADO INSTITUCIONAL
    // ════════════════════════════════════════════════════════════════════════

    // Fila 1: Título y código
    worksheet.mergeCells('A1:B3'); // Espacio para logo
    
    worksheet.mergeCells('C1:I1');
    const titleCell = worksheet.getCell('C1');
    titleCell.value = 'TABLERO DE AUDITORÍAS - OFICINA DE CONTROL INTERNO DE GESTIÓN';
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF' + ESAP_BLUE } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    worksheet.mergeCells('C2:I2');
    const subtitleCell = worksheet.getCell('C2');
    subtitleCell.value = 'Escuela Superior de Administración Pública - ESAP';
    subtitleCell.font = { size: 11, color: { argb: 'FF666666' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    worksheet.mergeCells('C3:I3');
    const totalCell = worksheet.getCell('C3');
    totalCell.value = `Total: ${auditorias.length} auditorías`;
    totalCell.font = { size: 10, italic: true };
    totalCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Columna de información (CÓDIGO, VERSIÓN, FECHA)
    worksheet.mergeCells('J1:K1');
    const codigoLabel = worksheet.getCell('J1');
    codigoLabel.value = 'CÓDIGO: EM-FO-014';
    codigoLabel.font = { bold: true, size: 9 };
    codigoLabel.alignment = { horizontal: 'center', vertical: 'middle' };
    codigoLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + ESAP_GRAY } };
    
    worksheet.mergeCells('J2:K2');
    const versionLabel = worksheet.getCell('J2');
    versionLabel.value = 'VERSIÓN: 1';
    versionLabel.font = { bold: true, size: 9 };
    versionLabel.alignment = { horizontal: 'center', vertical: 'middle' };
    versionLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + ESAP_GRAY } };
    
    worksheet.mergeCells('J3:K3');
    const fechaLabel = worksheet.getCell('J3');
    const fechaActual = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    fechaLabel.value = `FECHA: ${fechaActual}`;
    fechaLabel.font = { bold: true, size: 9 };
    fechaLabel.alignment = { horizontal: 'center', vertical: 'middle' };
    fechaLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + ESAP_GRAY } };

    // Fila 4: PROCESO
    worksheet.mergeCells('A4:K4');
    const procesoCell = worksheet.getCell('A4');
    procesoCell.value = 'PROCESO: Evaluación, Control y Mejora';
    procesoCell.font = { bold: true, size: 10 };
    procesoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + ESAP_BLUE_LIGHT } };
    procesoCell.alignment = { horizontal: 'left', vertical: 'middle' };
    procesoCell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Altura de filas del encabezado
    worksheet.getRow(1).height = 20;
    worksheet.getRow(2).height = 18;
    worksheet.getRow(3).height = 18;
    worksheet.getRow(4).height = 22;

    // ════════════════════════════════════════════════════════════════════════
    // ENCABEZADOS DE TABLA (Fila 6)
    // ════════════════════════════════════════════════════════════════════════

    const headerRow = 6;
    const headers = [
      'Código',
      'Título',
      'Tipo',
      'Estado',
      'Territorial',
      'Auditor Líder',
      'Fecha Inicio',
      'Fecha Fin',
      'Progreso',
      'Hallazgos',
      'Riesgo'
    ];

    headers.forEach((header, index) => {
      const cell = worksheet.getCell(headerRow, index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + ESAP_BLUE } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    worksheet.getRow(headerRow).height = 25;

    // ════════════════════════════════════════════════════════════════════════
    // DATOS DE AUDITORÍAS
    // ════════════════════════════════════════════════════════════════════════

    auditorias.forEach((auditoria, index) => {
      const rowIndex = headerRow + 1 + index;
      const row = worksheet.getRow(rowIndex);

      row.getCell(1).value = auditoria.codigo;
      row.getCell(2).value = auditoria.titulo;
      row.getCell(3).value = auditoria.tipo;
      row.getCell(4).value = auditoria.estado;
      row.getCell(5).value = auditoria.territorial;
      row.getCell(6).value = auditoria.auditorLider?.nombre || 'No asignado';
      row.getCell(7).value = auditoria.fechaInicio;
      row.getCell(8).value = auditoria.fechaFin;
      row.getCell(9).value = `${auditoria.progreso}%`;
      row.getCell(10).value = auditoria.hallazgos;
      row.getCell(11).value = auditoria.riesgo;

      // Estilo alternado de filas
      const fillColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF5F5F5';

      for (let col = 1; col <= 11; col++) {
        const cell = row.getCell(col);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
        };
        cell.alignment = { vertical: 'middle' };
      }

      // Alineación específica
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }; // Código
      row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' }; // Fecha inicio
      row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' }; // Fecha fin
      row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' }; // Progreso
      row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' }; // Hallazgos

      // Color según riesgo
      const riesgoCell = row.getCell(11);
      const riesgo = auditoria.riesgo.toLowerCase();
      if (riesgo === 'alto' || riesgo === 'critical') {
        riesgoCell.font = { bold: true, color: { argb: 'FFDC2626' } };
      } else if (riesgo === 'medio' || riesgo === 'medium') {
        riesgoCell.font = { bold: true, color: { argb: 'FFF59E0B' } };
      } else if (riesgo === 'bajo' || riesgo === 'low') {
        riesgoCell.font = { bold: true, color: { argb: 'FF22C55E' } };
      }

      row.height = 22;
    });

    // ════════════════════════════════════════════════════════════════════════
    // ANCHO DE COLUMNAS
    // ════════════════════════════════════════════════════════════════════════

    worksheet.getColumn(1).width = 15;  // Código
    worksheet.getColumn(2).width = 45;  // Título
    worksheet.getColumn(3).width = 15;  // Tipo
    worksheet.getColumn(4).width = 15;  // Estado
    worksheet.getColumn(5).width = 20;  // Territorial
    worksheet.getColumn(6).width = 25;  // Auditor Líder
    worksheet.getColumn(7).width = 15;  // Fecha Inicio
    worksheet.getColumn(8).width = 15;  // Fecha Fin
    worksheet.getColumn(9).width = 12;  // Progreso
    worksheet.getColumn(10).width = 12; // Hallazgos
    worksheet.getColumn(11).width = 12; // Riesgo

    // ════════════════════════════════════════════════════════════════════════
    // PIE DE PÁGINA
    // ════════════════════════════════════════════════════════════════════════

    const footerRow = headerRow + auditorias.length + 2;
    worksheet.mergeCells(`A${footerRow}:K${footerRow}`);
    const footerCell = worksheet.getCell(`A${footerRow}`);
    footerCell.value = `Documento generado el ${new Date().toLocaleString('es-CO')} - Oficina de Control Interno de Gestión OCIG`;
    footerCell.font = { size: 9, italic: true, color: { argb: 'FF666666' } };
    footerCell.alignment = { horizontal: 'center' };

    // ════════════════════════════════════════════════════════════════════════
    // GENERAR ARCHIVO
    // ════════════════════════════════════════════════════════════════════════

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const nombreArchivo = `Auditorias_OCIG_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.href = url;
    link.download = nombreArchivo;
    link.click();
    window.URL.revokeObjectURL(url);

    console.log('✅ Excel de auditorías generado exitosamente');

    return {
      exito: true,
      nombreArchivo,
      mensaje: `${auditorias.length} auditorías exportadas correctamente a Excel`
    };

  } catch (error) {
    console.error('❌ Error al generar Excel de auditorías:', error);
    return {
      exito: false,
      nombreArchivo: '',
      error: error instanceof Error ? error.message : 'Error desconocido al generar Excel'
    };
  }
}

export default exportarAuditoriasExcel;
