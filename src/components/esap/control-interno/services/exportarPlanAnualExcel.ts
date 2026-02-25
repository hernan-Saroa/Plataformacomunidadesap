/**
 * ============================================
 * EXPORTAR PLAN ANUAL A EXCEL CON LOGO
 * ============================================
 * 
 * Genera Excel del Plan Anual de Auditoría con:
 * - Encabezado institucional formato EM-PT-004
 * - Logo ESAP
 * - Estructura: Logo | Título | Código/Versión/Fecha
 * 
 * Usa ExcelJS para soporte de imágenes
 */

import ExcelJS from 'exceljs';

// Importar logo ESAP dinámicamente
import logoESAP from '@/assets/cropped-favicon-32x32.png';

// Cache del logo en base64
let _logoCache: string | null = null;

/**
 * Convierte el logo a base64 para uso en Excel
 */
async function getLogoBase64(): Promise<string> {
  if (_logoCache) return _logoCache;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        _logoCache = canvas.toDataURL('image/png');
        resolve(_logoCache);
      } else {
        resolve(logoESAP);
      }
    };
    img.onerror = () => resolve(logoESAP);
    img.src = logoESAP;
  });
}

// Colores corporativos ESAP
const EXCEL_COLORS = {
  primaryDark: 'FF003DA5',  // Azul ESAP
  primaryLight: 'FF2962FF',
  white: 'FFFFFFFF',
  grayLight: 'FFF5F5F5',
  textDark: 'FF333333',
  success: 'FF22C55E',
  warning: 'FFFBBF24',
  danger: 'FFEF4444',
  info: 'FF3B82F6',
};

// Tipos
interface Actividad {
  nombre: string;
  descripcion?: string;
  responsable?: { nombre: string } | string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  estado?: string;
  porcentajeAvance?: number;
  control?: string;
  evaluacion?: string;
  seguimiento?: string;
}

interface Rol {
  nombre: string;
  actividades: Actividad[];
}

interface PlanAnual {
  id: string;
  vigencia?: number;
  año?: number;
  estado?: string;
  responsable?: string;
  fechaCreacion?: string;
  roles: Rol[];
}

interface ResultadoExportacion {
  exito: boolean;
  nombreArchivo: string;
  error?: string;
}

/**
 * Exporta el Plan Anual a Excel con encabezado institucional y logo
 */
export async function exportarPlanAnualExcel(plan: PlanAnual): Promise<ResultadoExportacion> {
  const vigencia = plan.vigencia ?? plan.año ?? new Date().getFullYear();
  const nombreArchivo = `Plan_Anual_Auditoria_${vigencia}_ESAP.xlsx`;
  const fechaCorta = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  const fechaGeneracion = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ESAP - Control Interno';
    workbook.created = new Date();

    // Cargar logo
    let logoImageId: number | null = null;
    try {
      const logoBase64 = await getLogoBase64();
      const base64Data = logoBase64.includes(',') ? logoBase64.split(',')[1] : logoBase64;
      logoImageId = workbook.addImage({
        base64: base64Data,
        extension: 'png',
      });
    } catch (e) {
      console.warn('No se pudo cargar el logo para Excel:', e);
    }

    // Crear hoja
    const ws = workbook.addWorksheet('Plan Anual', {
      properties: { tabColor: { argb: EXCEL_COLORS.primaryDark } },
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // ENCABEZADO INSTITUCIONAL TIPO EM-PT-004 CON LOGO
    // ═══════════════════════════════════════════════════════════════════════

    // Configurar altura de filas del encabezado
    ws.getRow(1).height = 22;
    ws.getRow(2).height = 22;
    ws.getRow(3).height = 22;
    ws.getRow(4).height = 20;

    // --- SECCIÓN LOGO (Columnas A-B, Filas 1-3) ---
    ws.mergeCells('A1:B3');
    const logoCell = ws.getCell('A1');
    logoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    logoCell.border = {
      top: { style: 'thin', color: { argb: '000000' } },
      left: { style: 'thin', color: { argb: '000000' } },
      bottom: { style: 'thin', color: { argb: '000000' } },
      right: { style: 'thin', color: { argb: '000000' } }
    };

    // Agregar imagen del logo
    if (logoImageId !== null) {
      ws.addImage(logoImageId, {
        tl: { col: 0.3, row: 0.3 },
        ext: { width: 55, height: 55 }
      });
    } else {
      logoCell.value = 'ESAP';
      logoCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: EXCEL_COLORS.primaryDark } };
      logoCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // --- SECCIÓN TÍTULO (Columnas C-H, Filas 1-3) ---
    ws.mergeCells('C1:H1');
    const titleCell = ws.getCell('C1');
    titleCell.value = 'PLAN ANUAL DE AUDITORÍA INTERNA';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: '000000' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.border = { top: { style: 'thin' }, bottom: { style: 'thin' } };

    ws.mergeCells('C2:H2');
    const subtitleCell = ws.getCell('C2');
    subtitleCell.value = 'Oficina de Control Interno de Gestión - OCIG';
    subtitleCell.font = { name: 'Calibri', size: 10, color: { argb: '444444' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    subtitleCell.border = { bottom: { style: 'thin' } };

    ws.mergeCells('C3:H3');
    const vigenciaCell = ws.getCell('C3');
    vigenciaCell.value = `Vigencia ${vigencia}`;
    vigenciaCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: EXCEL_COLORS.primaryDark } };
    vigenciaCell.alignment = { horizontal: 'center', vertical: 'middle' };
    vigenciaCell.border = { bottom: { style: 'thin' } };

    // --- SECCIÓN INFO (Columnas I-J, Filas 1-3) ---
    ws.getCell('I1').value = 'CÓDIGO:';
    ws.getCell('I1').font = { name: 'Calibri', size: 9, bold: true };
    ws.getCell('I1').alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getCell('I1').border = { top: { style: 'thin' }, left: { style: 'thin' } };

    ws.getCell('J1').value = 'EM-PT-004';
    ws.getCell('J1').font = { name: 'Calibri', size: 9, color: { argb: EXCEL_COLORS.primaryDark } };
    ws.getCell('J1').alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getCell('J1').border = { top: { style: 'thin' }, right: { style: 'thin' } };

    ws.getCell('I2').value = 'VERSIÓN:';
    ws.getCell('I2').font = { name: 'Calibri', size: 9, bold: true };
    ws.getCell('I2').alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getCell('I2').border = { left: { style: 'thin' } };

    ws.getCell('J2').value = '3';
    ws.getCell('J2').font = { name: 'Calibri', size: 9 };
    ws.getCell('J2').alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getCell('J2').border = { right: { style: 'thin' } };

    ws.getCell('I3').value = 'FECHA:';
    ws.getCell('I3').font = { name: 'Calibri', size: 9, bold: true };
    ws.getCell('I3').alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getCell('I3').border = { left: { style: 'thin' }, bottom: { style: 'thin' } };

    ws.getCell('J3').value = fechaCorta;
    ws.getCell('J3').font = { name: 'Calibri', size: 9 };
    ws.getCell('J3').alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getCell('J3').border = { right: { style: 'thin' }, bottom: { style: 'thin' } };

    // --- FILA 4: PROCESO ---
    ws.mergeCells('A4:J4');
    const procesoCell = ws.getCell('A4');
    procesoCell.value = 'PROCESO: EVALUACIÓN, CONTROL Y MEJORA';
    procesoCell.font = { name: 'Calibri', size: 9, bold: true };
    procesoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };
    procesoCell.alignment = { horizontal: 'left', vertical: 'middle' };
    procesoCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // --- FILA 5: Info del plan ---
    ws.mergeCells('A5:J5');
    const infoCell = ws.getCell('A5');
    infoCell.value = `Estado: ${plan.estado || 'BORRADOR'} | Responsable: ${plan.responsable || 'Sin asignar'} | Generado: ${fechaGeneracion}`;
    infoCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: '666666' } };
    infoCell.alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(5).height = 18;

    // --- FILA 6: Espacio ---
    ws.getRow(6).height = 8;

    // --- FILA 7: HEADERS DE TABLA ---
    const headers = ['Rol', 'Nº', 'Actividad', 'Descripción', 'Responsable', 'Fecha Inicio', 'Fecha Fin', 'Estado', '% Avance', 'Control'];
    const headerRow = ws.getRow(7);

    headers.forEach((header, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: EXCEL_COLORS.white } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.primaryDark } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: EXCEL_COLORS.primaryDark } },
        bottom: { style: 'thin', color: { argb: EXCEL_COLORS.primaryDark } },
        left: { style: 'thin', color: { argb: EXCEL_COLORS.primaryDark } },
        right: { style: 'thin', color: { argb: EXCEL_COLORS.primaryDark } }
      };
    });
    headerRow.height = 30;

    // --- Anchos de columna ---
    ws.columns = [
      { width: 25 },  // Rol
      { width: 5 },   // Nº
      { width: 40 },  // Actividad
      { width: 35 },  // Descripción
      { width: 25 },  // Responsable
      { width: 12 },  // Fecha Inicio
      { width: 12 },  // Fecha Fin
      { width: 15 },  // Estado
      { width: 10 },  // % Avance
      { width: 20 },  // Control
    ];

    // --- DATOS DE ACTIVIDADES (empiezan en fila 8) ---
    let rowNum = 8;
    const roles = plan.roles ?? [];
    
    // Variables para el cálculo del total general
    let totalActividadesPlan = 0;
    let sumaAvancePlan = 0;

    for (const rol of roles) {
      const actividades = rol.actividades ?? [];
      
      // Variables para subtotal del rol
      let sumaAvanceRol = 0;
      const totalActividadesRol = actividades.length;
      
      for (let i = 0; i < actividades.length; i++) {
        const a = actividades[i];
        const dataRow = ws.getRow(rowNum);
        const isEven = (rowNum - 8) % 2 === 0;

        // Obtener nombre del responsable
        let responsableNombre = '';
        if (a.responsable) {
          if (typeof a.responsable === 'string') {
            responsableNombre = a.responsable;
          } else if (typeof a.responsable === 'object' && a.responsable.nombre) {
            responsableNombre = a.responsable.nombre;
          }
        }

        // Formatear fechas
        const fechaInicio = a.fechaInicio ? new Date(a.fechaInicio).toLocaleDateString('es-CO') : '';
        const fechaFin = a.fechaFin ? new Date(a.fechaFin).toLocaleDateString('es-CO') : '';

        // Porcentaje de avance
        const porcentaje = a.porcentajeAvance ?? 0;
        sumaAvanceRol += porcentaje;
        sumaAvancePlan += porcentaje;
        totalActividadesPlan++;

        const rowData = [
          rol.nombre,
          i + 1,
          a.nombre,
          a.descripcion || '',
          responsableNombre,
          fechaInicio,
          fechaFin,
          a.estado || '',
          porcentaje,
          a.control || ''
        ];

        rowData.forEach((value, colIdx) => {
          const cell = dataRow.getCell(colIdx + 1);
          cell.value = value;
          cell.font = { name: 'Calibri', size: 10, color: { argb: EXCEL_COLORS.textDark } };
          cell.alignment = {
            horizontal: colIdx === 2 || colIdx === 3 ? 'left' : 'center',
            vertical: 'middle',
            wrapText: colIdx === 2 || colIdx === 3
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' }
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
            bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
            left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
            right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
          };

          // Color especial para estado
          if (colIdx === 7 && value) {
            const estado = String(value).toUpperCase();
            if (estado === 'COMPLETADA') {
              cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: EXCEL_COLORS.success } };
            } else if (estado === 'EN_EJECUCION' || estado === 'EN EJECUCIÓN') {
              cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: EXCEL_COLORS.warning } };
            } else if (estado === 'PENDIENTE') {
              cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: EXCEL_COLORS.info } };
            }
          }

          // Formato porcentaje
          if (colIdx === 8) {
            cell.value = `${value}%`;
          }
        });

        dataRow.height = 25;
        rowNum++;
      }
      
      // ═══════════════════════════════════════════════════════════════════════
      // SUBTOTAL POR ROL
      // ═══════════════════════════════════════════════════════════════════════
      if (totalActividadesRol > 0) {
        const subtotalRow = ws.getRow(rowNum);
        const promedioRol = Math.round(sumaAvanceRol / totalActividadesRol);
        
        ws.mergeCells(`A${rowNum}:G${rowNum}`);
        const subtotalLabelCell = subtotalRow.getCell(1);
        subtotalLabelCell.value = `SUBTOTAL ROL: ${rol.nombre} (${totalActividadesRol} actividades)`;
        subtotalLabelCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: EXCEL_COLORS.white } };
        subtotalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.primaryLight } };
        subtotalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
        subtotalLabelCell.border = {
          top: { style: 'thin', color: { argb: EXCEL_COLORS.primaryDark } },
          bottom: { style: 'thin', color: { argb: EXCEL_COLORS.primaryDark } },
          left: { style: 'thin', color: { argb: EXCEL_COLORS.primaryDark } },
          right: { style: 'thin', color: { argb: EXCEL_COLORS.primaryDark } }
        };

        subtotalRow.getCell(8).value = '';
        subtotalRow.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.primaryLight } };
        subtotalRow.getCell(8).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        
        const avanceRolCell = subtotalRow.getCell(9);
        avanceRolCell.value = `${promedioRol}%`;
        avanceRolCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: EXCEL_COLORS.white } };
        avanceRolCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: promedioRol >= 75 ? EXCEL_COLORS.success : promedioRol >= 50 ? EXCEL_COLORS.warning : EXCEL_COLORS.info } };
        avanceRolCell.alignment = { horizontal: 'center', vertical: 'middle' };
        avanceRolCell.border = {
          top: { style: 'thin', color: { argb: EXCEL_COLORS.primaryDark } },
          bottom: { style: 'thin', color: { argb: EXCEL_COLORS.primaryDark } },
          left: { style: 'thin', color: { argb: EXCEL_COLORS.primaryDark } },
          right: { style: 'thin', color: { argb: EXCEL_COLORS.primaryDark } }
        };

        subtotalRow.getCell(10).value = '';
        subtotalRow.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.primaryLight } };
        subtotalRow.getCell(10).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        
        subtotalRow.height = 25;
        rowNum++;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TOTAL GENERAL DEL PLAN
    // ═══════════════════════════════════════════════════════════════════════
    rowNum++;
    const totalRow = ws.getRow(rowNum);
    const promedioGeneral = totalActividadesPlan > 0 ? Math.round(sumaAvancePlan / totalActividadesPlan) : 0;
    
    ws.mergeCells(`A${rowNum}:G${rowNum}`);
    const totalLabelCell = totalRow.getCell(1);
    totalLabelCell.value = `TOTAL PLAN ANUAL (${totalActividadesPlan} actividades en ${roles.length} roles)`;
    totalLabelCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: EXCEL_COLORS.white } };
    totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.primaryDark } };
    totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
    totalLabelCell.border = {
      top: { style: 'medium', color: { argb: '000000' } },
      bottom: { style: 'medium', color: { argb: '000000' } },
      left: { style: 'medium', color: { argb: '000000' } },
      right: { style: 'medium', color: { argb: '000000' } }
    };

    totalRow.getCell(8).value = 'PROMEDIO';
    totalRow.getCell(8).font = { name: 'Calibri', size: 10, bold: true, color: { argb: EXCEL_COLORS.white } };
    totalRow.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.primaryDark } };
    totalRow.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
    totalRow.getCell(8).border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };
    
    const totalAvanceCell = totalRow.getCell(9);
    totalAvanceCell.value = `${promedioGeneral}%`;
    totalAvanceCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: EXCEL_COLORS.white } };
    totalAvanceCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: promedioGeneral >= 75 ? EXCEL_COLORS.success : promedioGeneral >= 50 ? EXCEL_COLORS.warning : EXCEL_COLORS.danger } };
    totalAvanceCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalAvanceCell.border = {
      top: { style: 'medium', color: { argb: '000000' } },
      bottom: { style: 'medium', color: { argb: '000000' } },
      left: { style: 'medium', color: { argb: '000000' } },
      right: { style: 'medium', color: { argb: '000000' } }
    };

    totalRow.getCell(10).value = '';
    totalRow.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.primaryDark } };
    totalRow.getCell(10).border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };
    
    totalRow.height = 30;

    // --- PIE DE PÁGINA ---
    rowNum += 2;
    ws.mergeCells(`A${rowNum}:J${rowNum}`);
    const footerCell = ws.getCell(`A${rowNum}`);
    footerCell.value = 'Escuela Superior de Administración Pública - ESAP | Oficina de Control Interno de Gestión';
    footerCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: '888888' } };
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // --- Generar y descargar ---
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    link.click();
    window.URL.revokeObjectURL(url);

    return {
      exito: true,
      nombreArchivo
    };

  } catch (error) {
    console.error('Error al generar Excel:', error);
    return {
      exito: false,
      nombreArchivo,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}
