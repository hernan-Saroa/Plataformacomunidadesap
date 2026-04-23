/**
 * ============================================
 * EXPORTAR PLAN ANUAL A EXCEL CON LOGO
 * ============================================
 * 
 * Genera Excel del Plan Anual de Auditoría con:
 * - Encabezado institucional formato EM-PT-004
 * - Logo ESAP
 * - 11 columnas: Rol, Actividad, Inicio, Fin, Responsable, Control, Est., Responsable tarea, Seguimiento, Fecha, Eval.
 * - Datos de actividad REPETIDOS en cada fila de tarea
 * - Rol agrupado (solo primera actividad del rol)
 * - Responsables de tarea incluidos
 * 
 * Usa ExcelJS para soporte de imágenes
 */

import ExcelJS from 'exceljs';

// Importar logo ESAP dinámicamente
import logoESAP from '@/assets/cropped-favicon-32x32.png';

// Cache del logo en base64
let _logoCache: string | null = null;

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

const EXCEL_COLORS = {
  primaryDark: 'FF003DA5',
  primaryLight: 'FF2962FF',
  white: 'FFFFFFFF',
  textDark: 'FF333333',
  success: 'FF22C55E',
  warning: 'FFFBBF24',
  danger: 'FFEF4444',
  info: 'FF3B82F6',
};

interface PlanAnual {
  id: string;
  vigencia?: number;
  año?: number;
  estado?: string;
  responsable?: string;
  jefeOCI?: { id?: string; nombre: string; cargo?: string };
  fechaCreacion?: string;
  roles: { id?: number; nombre: string; actividades: any[] }[];
}

interface ResultadoExportacion {
  exito: boolean;
  nombreArchivo: string;
  error?: string;
}

function formatearFechaExportacion(valor: unknown): string {
  if (!valor) return '-';
  if (typeof valor !== 'string') return '-';
  const limpio = valor.trim();
  if (!limpio || limpio === '-') return '-';
  const fecha = new Date(limpio);
  if (Number.isNaN(fecha.getTime())) return limpio;
  return fecha.toLocaleDateString('es-CO');
}

function extraerResponsablesTarea(tarea: any): string {
  const fuente = tarea?.responsables ?? tarea?.responsable;
  if (Array.isArray(fuente)) {
    const valores = fuente
      .map((r: any) => (typeof r === 'string' ? r : r?.nombre || r?.name || r?.email || ''))
      .filter(Boolean);
    return valores.length ? valores.join(', ') : '-';
  }
  if (typeof fuente === 'object' && fuente) {
    return fuente.nombre || fuente.name || fuente.email || '-';
  }
  if (typeof fuente === 'string' && fuente.trim()) return fuente;
  return '-';
}

function extraerFechaTarea(tarea: any, actividad: any): string {
  // En BD (tareas_seguimiento) el campo oficial de fecha es fechaLimite.
  const fechaLimite = tarea?.fechaLimite || tarea?.fecha_limite;
  if (fechaLimite) return formatearFechaExportacion(fechaLimite);
  const tieneDatosTarea = !!tarea && typeof tarea === 'object' && Object.keys(tarea).length > 0;
  if (tieneDatosTarea) return '-';

  const puntosControl = actividad?.puntosControl || actividad?.puntos_control || [];
  if (Array.isArray(puntosControl) && puntosControl.length > 0) {
    const fechas = puntosControl
      .map((pc: any) => pc?.fechaSeguimiento || pc?.fecha_seguimiento)
      .filter(Boolean)
      .map((f: any) => formatearFechaExportacion(f))
      .filter((f: string) => f !== '-');
    if (fechas.length > 0) return fechas.join('\n');
  }
  return '-';
}

export async function exportarPlanAnualExcel(plan: PlanAnual): Promise<ResultadoExportacion> {
  const vigencia = plan.vigencia ?? plan.año ?? new Date().getFullYear();
  const nombreArchivo = `Plan_Anual_Auditoria_${vigencia}_ESAP.xlsx`;
  const fechaCorta = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  const fechaGeneracion = new Date().toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ESAP - Control Interno';
    workbook.created = new Date();

    let logoImageId: number | null = null;
    try {
      const logoBase64 = await getLogoBase64();
      const base64Data = logoBase64.includes(',') ? logoBase64.split(',')[1] : logoBase64;
      logoImageId = workbook.addImage({ base64: base64Data, extension: 'png' });
    } catch (e) {
      console.warn('No se pudo cargar el logo para Excel:', e);
    }

    const ws = workbook.addWorksheet('Plan Anual', {
      properties: { tabColor: { argb: EXCEL_COLORS.primaryDark } },
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true }
    });

    // ═══════════════ ENCABEZADO INSTITUCIONAL ═══════════════
    ws.getRow(1).height = 22;
    ws.getRow(2).height = 22;
    ws.getRow(3).height = 22;
    ws.getRow(4).height = 20;

    // Logo
    ws.mergeCells('A1:B3');
    const logoCell = ws.getCell('A1');
    logoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    logoCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    if (logoImageId !== null) {
      ws.addImage(logoImageId, { tl: { col: 0.3, row: 0.3 }, ext: { width: 55, height: 55 } });
    } else {
      logoCell.value = 'ESAP';
      logoCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: EXCEL_COLORS.primaryDark } };
      logoCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Título
    ws.mergeCells('C1:I1');
    const titleCell = ws.getCell('C1');
    titleCell.value = 'PLAN ANUAL DE AUDITORÍA INTERNA';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: '000000' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('C2:I2');
    ws.getCell('C2').value = 'Oficina de Control Interno de Gestión - OCI';
    ws.getCell('C2').font = { name: 'Calibri', size: 10, color: { argb: '444444' } };
    ws.getCell('C2').alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('C3:I3');
    ws.getCell('C3').value = `Vigencia ${vigencia}`;
    ws.getCell('C3').font = { name: 'Calibri', size: 11, bold: true, color: { argb: EXCEL_COLORS.primaryDark } };
    ws.getCell('C3').alignment = { horizontal: 'center', vertical: 'middle' };

    // Info
    ws.getCell('J1').value = 'CÓDIGO:'; ws.getCell('K1').value = 'EM-PT-004';
    ws.getCell('J2').value = 'VERSIÓN:'; ws.getCell('K2').value = '3';
    ws.getCell('J3').value = 'FECHA:'; ws.getCell('K3').value = fechaCorta;
    ['J', 'K'].forEach(c => [1,2,3].forEach(r => {
      ws.getCell(`${c}${r}`).font = { name: 'Calibri', size: 9, bold: c === 'J' };
      ws.getCell(`${c}${r}`).alignment = { horizontal: c === 'J' ? 'right' : 'left', vertical: 'middle' };
    }));

    // Proceso
    ws.mergeCells('A4:K4');
    const proc = ws.getCell('A4');
    proc.value = 'PROCESO: EVALUACIÓN, CONTROL Y MEJORA';
    proc.font = { name: 'Calibri', size: 9, bold: true };
    proc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };
    proc.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    // Info plan
    ws.mergeCells('A5:K5');
    const responsablePlan = plan.jefeOCI?.nombre || (plan as any).jefe_oci?.nombre || plan.responsable || 'Sin asignar';
    ws.getCell('A5').value = `Estado: ${plan.estado || 'BORRADOR'} | Responsable: ${responsablePlan} | Generado: ${fechaGeneracion}`;
    ws.getCell('A5').font = { name: 'Calibri', size: 9, italic: true, color: { argb: '666666' } };
    ws.getRow(5).height = 18;
    ws.getRow(6).height = 8;

    // ═══════════════ HEADERS (11 columnas) ═══════════════
    const headers = [
      'Rol / Macroproceso', 
      'Lista de actividades', 
      'Inicio', 
      'Fin', 
      'Resp. Actividad', 
      'Control', 
      'Est.', 
      'Resp. Tarea', 
      'Seguimiento y evaluación tareas', 
      'Fecha Tarea', 
      'Eval.'
    ];
    const headerRow = ws.getRow(7);
    headers.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = h;
      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: EXCEL_COLORS.white } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.primaryDark } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    headerRow.height = 35;
    ws.columns = [
      { width: 22 }, // Rol
      { width: 35 }, // Actividad
      { width: 12 }, // Inicio
      { width: 12 }, // Fin
      { width: 20 }, // Resp. Act
      { width: 18 }, // Control
      { width: 8 },  // Est
      { width: 20 }, // Resp. Tarea (NUEVA)
      { width: 45 }, // Seguimiento/Tarea
      { width: 12 }, // Fecha Tarea
      { width: 8 }   // Eval
    ];

    // ═══════════════ DATOS ═══════════════
    let rowNum = 8;
    const roles = plan.roles ?? [];
    let totalActividadesPlan = 0;
    let sumaAvancePlan = 0;
    let absoluteRowCounter = 0;

    const pintarFila = (data: any[], count: number) => {
      const isEven = count % 2 === 0;
      const row = ws.getRow(rowNum);
      data.forEach((val, ci) => {
        const cell = row.getCell(ci + 1);
        cell.value = val;
        cell.font = { name: 'Calibri', size: 9, color: { argb: EXCEL_COLORS.textDark } };
        // Estilo especial para la Actividad (Columna 3)
        if (ci === 2) cell.font = { ...cell.font, bold: true };
        
        cell.alignment = { 
          horizontal: [0, 1, 4, 7, 8].includes(ci) ? 'left' : 'center', 
          vertical: 'middle', 
          wrapText: [0, 1, 4, 7, 8].includes(ci) 
        };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF9FAFB' } };
        cell.border = { 
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } }, 
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, 
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } }, 
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } } 
        };

        if (ci === 6 || ci === 10) { // Est. o Eval.
          const n = typeof val === 'string' ? Number(val.replace('%', '')) : 0;
          if (n >= 100) cell.font = { ...cell.font, color: { argb: EXCEL_COLORS.success }, bold: true };
        }
      });
      row.height = 30;
      rowNum++;
    };

    for (const rol of roles) {
      const actividades = rol.actividades ?? [];
      let sumaAvanceRol = 0;
      const totalActividadesRol = actividades.length;

      for (const act of actividades) {
        totalActividadesPlan++;
        const actAny = act as any;
        const tareas = actAny.tareasSeguimiento || actAny.tareas_seguimiento || [];
        const respActividad = act.responsableNombre || (actAny.responsable?.nombre) || 'Sin asignar';

        const fI = actAny.fechaInicio || actAny.fecha_inicio ? new Date(actAny.fechaInicio || actAny.fecha_inicio).toLocaleDateString('es-CO') : '';
        const fF = actAny.fechaFin || actAny.fecha_fin ? new Date(actAny.fechaFin || actAny.fecha_fin).toLocaleDateString('es-CO') : '';
        const pct = actAny.porcentajeAvance ?? actAny.porcentaje_avance ?? actAny.porcentaje ?? 0;
        sumaAvanceRol += pct;
        sumaAvancePlan += pct;

        if (tareas.length === 0) {
          absoluteRowCounter++;
          pintarFila([
            rol.nombre, 
            act.nombre, 
            fI, fF,
            respActividad, 
            actAny.control || 'Seguimiento', 
            `${pct}%`,
            '-', // Resp Tarea
            actAny.seguimiento || 'Sin tareas registradas', 
            '-', 
            '0%'
          ], absoluteRowCounter);
        } else {
          tareas.forEach((t: any) => {
            absoluteRowCounter++;
            const fEnt = extraerFechaTarea(t, actAny);
            
            const pctT = (t.completada || t.estado === 'completada') ? '100%' : '0%';
            const respT = extraerResponsablesTarea(t);

            pintarFila([
              rol.nombre, // Siempre mostrar el nombre del rol (desagrupado)
              act.nombre, 
              fI, fF,
              respActividad, 
              actAny.control || 'Seguimiento', 
              `${pct}%`,
              respT,
              t.descripcion || t.nombre || '', 
              fEnt, 
              pctT
            ], absoluteRowCounter);
          });
        }
      }

      // Subtotal por rol (Ajustado a 12 columnas)
      if (totalActividadesRol > 0) {
        const prom = Math.round(sumaAvanceRol / totalActividadesRol);
        const sRow = ws.getRow(rowNum);
        ws.mergeCells(`A${rowNum}:F${rowNum}`);
        sRow.getCell(1).value = `SUBTOTAL ROL: ${rol.nombre} (${totalActividadesRol} actividades)`;
        sRow.getCell(1).font = { name: 'Calibri', size: 9, bold: true, color: { argb: EXCEL_COLORS.white } };
        sRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.primaryLight } };
        sRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
        sRow.getCell(7).value = `${prom}%`;
        sRow.getCell(7).font = { name: 'Calibri', size: 10, bold: true, color: { argb: EXCEL_COLORS.white } };
        sRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: prom >= 75 ? EXCEL_COLORS.success : prom >= 50 ? EXCEL_COLORS.warning : EXCEL_COLORS.info } };
        sRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
        
        // Celdas vacías del subtotal
        [8, 9, 10, 11].forEach(c => {
          sRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.primaryLight } };
        });
        sRow.height = 22;
        rowNum++;
      }
    }

    // ═══════════════ TOTAL GENERAL ═══════════════
    rowNum++;
    const tRow = ws.getRow(rowNum);
    const promGen = totalActividadesPlan > 0 ? Math.round(sumaAvancePlan / totalActividadesPlan) : 0;
    ws.mergeCells(`A${rowNum}:E${rowNum}`);
    tRow.getCell(1).value = `TOTAL PLAN ANUAL (${totalActividadesPlan} actividades en ${roles.length} roles)`;
    tRow.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: EXCEL_COLORS.white } };
    tRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.primaryDark } };
    tRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    tRow.getCell(1).border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };
    tRow.getCell(6).value = 'PROMEDIO';
    tRow.getCell(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: EXCEL_COLORS.white } };
    tRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.primaryDark } };
    tRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    tRow.getCell(6).border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };
    tRow.getCell(7).value = `${promGen}%`;
    tRow.getCell(7).font = { name: 'Calibri', size: 12, bold: true, color: { argb: EXCEL_COLORS.white } };
    tRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: promGen >= 75 ? EXCEL_COLORS.success : promGen >= 50 ? EXCEL_COLORS.warning : EXCEL_COLORS.danger } };
    tRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
    tRow.getCell(7).border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };
    [8, 9, 10, 11].forEach(c => {
      tRow.getCell(c).value = '';
      tRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.primaryDark } };
      tRow.getCell(c).border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };
    });
    tRow.height = 30;

    // Pie
    rowNum += 2;
    ws.mergeCells(`A${rowNum}:K${rowNum}`);
    ws.getCell(`A${rowNum}`).value = 'Escuela Superior de Administración Pública - ESAP | Oficina de Control Interno de Gestión';
    ws.getCell(`A${rowNum}`).font = { name: 'Calibri', size: 9, italic: true, color: { argb: '888888' } };
    ws.getCell(`A${rowNum}`).alignment = { horizontal: 'center', vertical: 'middle' };

    // Descargar
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    link.click();
    window.URL.revokeObjectURL(url);

    return { exito: true, nombreArchivo };
  } catch (error) {
    console.error('Error al generar Excel:', error);
    return { exito: false, nombreArchivo, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}
