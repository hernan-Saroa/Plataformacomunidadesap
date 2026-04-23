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
interface TareaSeg {
  id: string;
  descripcion: string;
  completada: boolean;
  fechaCompletado?: string;
  responsables?: string[];
  observaciones?: string;
  adjuntosTarea?: { nombre: string }[];
  fechaEntrega?: string;
}

interface ObsCumplimiento {
  id: string;
  texto: string;
  fechaRegistro: string;
  registradoPor: string;
}

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
  fecha_corte?: string;
  fechaCorte?: string;
  observacionesCumplimiento?: ObsCumplimiento[] | string;
  tareasSeguimiento?: TareaSeg[];
  adjuntos?: { id: string; nombre: string; tipo?: string; fechaCarga?: string }[];
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
  jefeOCI?: { id?: string; nombre: string; cargo?: string };
  fechaCreacion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  roles: Rol[];
}

interface ResultadoExportacion {
  exito: boolean;
  nombreArchivo: string;
  error?: string;
}

// Definición de todas las columnas disponibles
export interface ColumnaExcel {
  key: string;
  label: string;
  defaultVisible: boolean;
}

export const COLUMNAS_DISPONIBLES: ColumnaExcel[] = [
  { key: 'rol', label: 'Rol', defaultVisible: true },
  { key: 'numero', label: 'Nº', defaultVisible: true },
  { key: 'actividad', label: 'Actividad', defaultVisible: true },
  { key: 'descripcion', label: 'Descripción', defaultVisible: true },
  { key: 'responsable', label: 'Responsable', defaultVisible: true },
  { key: 'fechaInicio', label: 'Fecha Inicio', defaultVisible: true },
  { key: 'fechaFin', label: 'Fecha Fin', defaultVisible: true },
  { key: 'fechaCorte', label: 'Fecha de Corte', defaultVisible: true },
  { key: 'estado', label: 'Estado', defaultVisible: true },
  { key: 'avance', label: '% Avance', defaultVisible: true },
  { key: 'control', label: 'Control', defaultVisible: true },
  { key: 'evaluacion', label: 'Evaluación', defaultVisible: true },
  { key: 'seguimiento', label: 'Seguimiento', defaultVisible: true },
  { key: 'observaciones', label: 'Observaciones', defaultVisible: true },
  { key: 'tareas', label: 'Tareas', defaultVisible: true },
  { key: 'obsTareas', label: 'Obs. Tareas', defaultVisible: false },
  { key: 'evidencias', label: 'Evidencias', defaultVisible: true },
];

export interface ExportOptions {
  columnasSeleccionadas?: string[]; // keys de columnas a incluir
}

/**
 * Exporta el Plan Anual a Excel con encabezado institucional y logo
 */
export async function exportarPlanAnualExcel(plan: PlanAnual, options?: ExportOptions): Promise<ResultadoExportacion> {
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

  // ═══════════════════════════════════════════════════════════════════════
  // EXTRAER FECHAS MAESTRAS DEL PLAN (snake_case y camelCase)
  // Estas son la fuente de verdad — NUNCA hardcodeadas
  // ═══════════════════════════════════════════════════════════════════════
  const planAny = plan as any;
  const planFechaInicio = planAny.fecha_inicio || planAny.fechaInicio || '';
  const planFechaFin = planAny.fecha_fin || planAny.fechaFin || '';

  // Columnas activas (por defecto todas las que tienen defaultVisible)
  const columnKeys = options?.columnasSeleccionadas 
    ?? COLUMNAS_DISPONIBLES.filter(c => c.defaultVisible).map(c => c.key);
  const activeColumns = COLUMNAS_DISPONIBLES.filter(c => columnKeys.includes(c.key));
  const totalCols = activeColumns.length;

  // Datos dinámicos del plan
  const responsablePlan = plan.jefeOCI?.nombre 
    || (plan as any).jefe_oci?.nombre 
    || plan.responsable 
    || 'Sin asignar';
  const roles = plan.roles ?? [];

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

    // Helper: column letter from index (1-based)
    const colLetter = (n: number) => {
      let s = '';
      while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
      return s;
    };
    const lastCol = colLetter(totalCols);

    // ═══════════════════════════════════════════════════════════════════════
    // ENCABEZADO INSTITUCIONAL - DATOS DINÁMICOS DEL PLAN
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

    // --- SECCIÓN TÍTULO (dinámico) ---
    const infoStartCol = colLetter(totalCols - 1);
    const infoEndCol = lastCol;
    const titleEndCol = colLetter(totalCols - 2);

    ws.mergeCells(`C1:${titleEndCol}1`);
    const titleCell = ws.getCell('C1');
    titleCell.value = 'PLAN ANUAL DE AUDITORÍA INTERNA';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: '000000' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.border = { top: { style: 'thin' }, bottom: { style: 'thin' } };

    ws.mergeCells(`C2:${titleEndCol}2`);
    const subtitleCell = ws.getCell('C2');
    subtitleCell.value = 'Oficina de Control Interno de Gestión - OCI';
    subtitleCell.font = { name: 'Calibri', size: 10, color: { argb: '444444' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    subtitleCell.border = { bottom: { style: 'thin' } };

    ws.mergeCells(`C3:${titleEndCol}3`);
    const vigenciaCell = ws.getCell('C3');
    vigenciaCell.value = `Vigencia ${vigencia} — Versión ${(plan as any).version ?? 1}`;
    vigenciaCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: EXCEL_COLORS.primaryDark } };
    vigenciaCell.alignment = { horizontal: 'center', vertical: 'middle' };
    vigenciaCell.border = { bottom: { style: 'thin' } };

    // --- SECCIÓN INFO (últimas 2 columnas) ---
    ws.getCell(`${infoStartCol}1`).value = 'ESTADO:';
    ws.getCell(`${infoStartCol}1`).font = { name: 'Calibri', size: 9, bold: true };
    ws.getCell(`${infoStartCol}1`).alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getCell(`${infoStartCol}1`).border = { top: { style: 'thin' }, left: { style: 'thin' } };

    ws.getCell(`${infoEndCol}1`).value = plan.estado || 'BORRADOR';
    ws.getCell(`${infoEndCol}1`).font = { name: 'Calibri', size: 9, color: { argb: EXCEL_COLORS.primaryDark } };
    ws.getCell(`${infoEndCol}1`).alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getCell(`${infoEndCol}1`).border = { top: { style: 'thin' }, right: { style: 'thin' } };

    ws.getCell(`${infoStartCol}2`).value = 'VERSIÓN:';
    ws.getCell(`${infoStartCol}2`).font = { name: 'Calibri', size: 9, bold: true };
    ws.getCell(`${infoStartCol}2`).alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getCell(`${infoStartCol}2`).border = { left: { style: 'thin' } };

    ws.getCell(`${infoEndCol}2`).value = String((plan as any).version ?? 1);
    ws.getCell(`${infoEndCol}2`).font = { name: 'Calibri', size: 9 };
    ws.getCell(`${infoEndCol}2`).alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getCell(`${infoEndCol}2`).border = { right: { style: 'thin' } };

    ws.getCell(`${infoStartCol}3`).value = 'FECHA:';
    ws.getCell(`${infoStartCol}3`).font = { name: 'Calibri', size: 9, bold: true };
    ws.getCell(`${infoStartCol}3`).alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getCell(`${infoStartCol}3`).border = { left: { style: 'thin' }, bottom: { style: 'thin' } };

    ws.getCell(`${infoEndCol}3`).value = plan.fechaCreacion ? new Date(plan.fechaCreacion).toLocaleDateString('es-CO') : fechaCorta;
    ws.getCell(`${infoEndCol}3`).font = { name: 'Calibri', size: 9 };
    ws.getCell(`${infoEndCol}3`).alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getCell(`${infoEndCol}3`).border = { right: { style: 'thin' }, bottom: { style: 'thin' } };

    // --- FILA 4: PROCESO ---
    ws.mergeCells(`A4:${lastCol}4`);
    const procesoCell = ws.getCell('A4');
    procesoCell.value = `PROCESO: EVALUACIÓN, CONTROL Y MEJORA — Jefe OCI: ${responsablePlan}`;
    procesoCell.font = { name: 'Calibri', size: 9, bold: true };
    procesoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };
    procesoCell.alignment = { horizontal: 'left', vertical: 'middle' };
    procesoCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // --- FILA 5: Info del plan (datos dinámicos) ---
    ws.mergeCells(`A5:${lastCol}5`);
    const infoCell = ws.getCell('A5');
    const totalActividades = roles.reduce((s, r) => s + r.actividades.length, 0);
    const periodoStr = (planFechaInicio && planFechaFin)
      ? ` | Período: ${new Date(planFechaInicio).toLocaleDateString('es-CO')} — ${new Date(planFechaFin).toLocaleDateString('es-CO')}`
      : '';
    infoCell.value = `Estado: ${plan.estado || 'BORRADOR'} | ${totalActividades} actividades en ${roles.length} roles${periodoStr} | Generado: ${fechaGeneracion}`;
    infoCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: '666666' } };
    infoCell.alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(5).height = 18;

    // --- FILA 6: Espacio ---
    ws.getRow(6).height = 8;

    const COLUMN_WIDTHS: Record<string, number> = {
      rol: 22, numero: 5, actividad: 35, descripcion: 30, responsable: 22,
      fechaInicio: 12, fechaFin: 12, fechaCorte: 12, estado: 13, avance: 10,
      control: 25, evaluacion: 25, seguimiento: 35,
      observaciones: 35, tareas: 35, obsTareas: 30, evidencias: 28,
    };
    const TEXT_COLUMNS = new Set(['actividad', 'descripcion', 'control', 'evaluacion', 'seguimiento', 'observaciones', 'tareas', 'obsTareas', 'evidencias']);

    const headerRow = ws.getRow(7);
    activeColumns.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.label;
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

    // --- Anchos de columna (dinámicos) ---
    ws.columns = activeColumns.map(col => ({ width: COLUMN_WIDTHS[col.key] || 20 }));

    // --- DATOS DE ACTIVIDADES (empiezan en fila 8) ---
    let rowNum = 8;
    
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

        // ═══════════════════════════════════════════════════════════════════
        // RESPONSABLE: Prioridad → responsables[] (array moderno del backend)
        //              → responsable (string/objeto legacy) → 'No asignado'
        // ═══════════════════════════════════════════════════════════════════
        const actAny = a as any;
        let responsableNombre = '';
        // 1. responsables[] — array de objetos { id, nombre, cargo, email }
        const responsablesArray = actAny.responsables;
        if (Array.isArray(responsablesArray) && responsablesArray.length > 0) {
          responsableNombre = responsablesArray
            .map((r: any) => (typeof r === 'string' ? r : r.nombre || r.name || ''))
            .filter(Boolean)
            .join(', ');
        }
        // 2. responsable (legacy — string o { nombre })
        if (!responsableNombre && actAny.responsable) {
          if (typeof actAny.responsable === 'string') {
            responsableNombre = actAny.responsable;
          } else if (typeof actAny.responsable === 'object' && actAny.responsable.nombre) {
            responsableNombre = actAny.responsable.nombre;
          }
        }
        // 3. responsableNombre directo
        if (!responsableNombre && actAny.responsableNombre) {
          responsableNombre = actAny.responsableNombre;
        }
        // 4. Fallback explícito — NUNCA quemado
        if (!responsableNombre) {
          responsableNombre = 'No asignado';
        }

        // ═══════════════════════════════════════════════════════════════════
        // FECHAS: Siempre del PLAN si la actividad no tiene fechas propias
        // o si sus fechas no coinciden con la vigencia del plan.
        // Cadena: actividad.fecha_inicio → plan.fecha_inicio → vacío
        // ═══════════════════════════════════════════════════════════════════
        const actFechaInicioRaw = actAny.fechaInicio || actAny.fecha_inicio || '';
        const actFechaFinRaw = actAny.fechaFin || actAny.fecha_fin || '';
        // Usar fecha de actividad SOLO si existe y su año coincide con la vigencia;
        // de lo contrario, usar la fecha del plan (fuente de verdad)
        const fechaInicioStr = (actFechaInicioRaw && new Date(actFechaInicioRaw).getFullYear() === vigencia)
          ? actFechaInicioRaw
          : (planFechaInicio || actFechaInicioRaw || '');
        const fechaFinStr = (actFechaFinRaw && new Date(actFechaFinRaw).getFullYear() === vigencia)
          ? actFechaFinRaw
          : (planFechaFin || actFechaFinRaw || '');
        const fechaInicio = fechaInicioStr ? new Date(fechaInicioStr).toLocaleDateString('es-CO') : '';
        const fechaFin = fechaFinStr ? new Date(fechaFinStr).toLocaleDateString('es-CO') : '';

        // Porcentaje de avance (soporta camelCase y snake_case)
        const porcentaje = actAny.porcentajeAvance ?? actAny.porcentaje_avance ?? actAny.porcentaje ?? 0;
        sumaAvanceRol += porcentaje;
        sumaAvancePlan += porcentaje;
        totalActividadesPlan++;

        // Fecha de corte
        const fechaCorteStr = actAny.fecha_corte || actAny.fechaCorte || '';
        const fechaCorte = fechaCorteStr ? new Date(fechaCorteStr + 'T00:00:00').toLocaleDateString('es-CO') : '';

        // Observaciones de cumplimiento (texto concatenado)
        let obsTexto = '';
        const obsData = actAny.observacionesCumplimiento;
        if (Array.isArray(obsData) && obsData.length > 0) {
          obsTexto = obsData.map((ob: any, idx: number) => {
            const fecha = ob.fechaRegistro ? new Date(ob.fechaRegistro).toLocaleDateString('es-CO') : '';
            const autor = ob.registradoPor || '';
            return `${idx + 1}. ${ob.texto || ''}${autor ? ' — ' + autor : ''}${fecha ? ' (' + fecha + ')' : ''}`;
          }).join('\n');
        } else if (typeof obsData === 'string' && obsData.trim()) {
          obsTexto = obsData;
        }

        // Tareas de seguimiento
        const tareas: TareaSeg[] = actAny.tareasSeguimiento || [];
        let tareasTexto = '';
        let obsTareasTexto = '';
        if (tareas.length > 0) {
          tareasTexto = tareas.map((t, idx) => {
            const estado = t.completada ? '✓' : '✗';
            const fechaLim = t.fechaEntrega ? new Date(t.fechaEntrega).toLocaleDateString('es-CO') : 'Sin fecha';
            const resp = t.responsables?.join(', ') || '';
            return `${idx + 1}. [${estado}] ${t.descripcion} | Límite: ${fechaLim}${resp ? ' | ' + resp : ''}`;
          }).join('\n');
          // Observaciones de tareas
          const tareasConObs = tareas.filter(t => t.observaciones?.trim());
          if (tareasConObs.length > 0) {
            obsTareasTexto = tareasConObs.map((t, idx) => {
              return `${idx + 1}. ${t.descripcion}: ${t.observaciones}`;
            }).join('\n');
          }
        }

        // Evidencias (archivos adjuntos)
        const adjuntos = actAny.adjuntos || [];
        const adjuntosTareas = tareas.flatMap((t: TareaSeg) => (t.adjuntosTarea || []).map((a: any) => a.nombre || a));
        const todosAdjuntos = [...adjuntos.map((a: any) => a.nombre || a), ...adjuntosTareas].filter(Boolean);
        const evidenciasTexto = todosAdjuntos.length > 0
          ? todosAdjuntos.map((n: string) => `✓ ${n}`).join('\n')
          : 'Sin evidencia';

        // Map key → value for all possible columns
        const allValues: Record<string, any> = {
          rol: rol.nombre,
          numero: i + 1,
          actividad: a.nombre,
          descripcion: actAny.descripcion || '',
          responsable: responsableNombre,
          fechaInicio: fechaInicio,
          fechaFin: fechaFin,
          fechaCorte: fechaCorte,
          estado: actAny.estado || '',
          avance: porcentaje,
          control: actAny.control || '',
          evaluacion: actAny.evaluacion || '',
          seguimiento: actAny.seguimiento || '',
          observaciones: obsTexto,
          tareas: tareasTexto,
          obsTareas: obsTareasTexto,
          evidencias: evidenciasTexto,
        };

        // Only output selected columns
        activeColumns.forEach((col, colIdx) => {
          const cell = dataRow.getCell(colIdx + 1);
          let value = allValues[col.key] ?? '';

          // Formato porcentaje
          if (col.key === 'avance') value = `${value}%`;

          cell.value = value;
          cell.font = { name: 'Calibri', size: 10, color: { argb: EXCEL_COLORS.textDark } };
          const isTextCol = TEXT_COLUMNS.has(col.key);
          cell.alignment = {
            horizontal: isTextCol ? 'left' : 'center',
            vertical: 'top',
            wrapText: isTextCol
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
          if (col.key === 'estado' && value) {
            const estado = String(value).toUpperCase();
            if (estado === 'COMPLETADA') {
              cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: EXCEL_COLORS.success } };
            } else if (estado === 'EN_EJECUCION' || estado === 'EN EJECUCIÓN') {
              cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: EXCEL_COLORS.warning } };
            } else if (estado === 'PENDIENTE') {
              cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: EXCEL_COLORS.info } };
            }
          }
        });

        // Auto-height: más alto si hay tareas/observaciones
        const maxLines = Math.max(1, tareasTexto.split('\n').length, obsTexto.split('\n').length);
        dataRow.height = Math.max(25, maxLines * 14);
        rowNum++;
      }
      
      // ═══════════════════════════════════════════════════════════════════════
      // SUBTOTAL POR ROL
      // ═══════════════════════════════════════════════════════════════════════
      if (totalActividadesRol > 0) {
        const subtotalRow = ws.getRow(rowNum);
        const promedioRol = Math.round(sumaAvanceRol / totalActividadesRol);
        
        // Merge all columns and fill with subtotal style
        ws.mergeCells(`A${rowNum}:${lastCol}${rowNum}`);
        const subtotalLabelCell = subtotalRow.getCell(1);
        subtotalLabelCell.value = `SUBTOTAL ROL: ${rol.nombre} — ${totalActividadesRol} actividades — Avance promedio: ${promedioRol}%`;
        subtotalLabelCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: EXCEL_COLORS.white } };
        subtotalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.primaryLight } };
        subtotalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
        subtotalLabelCell.border = {
          top: { style: 'thin', color: { argb: EXCEL_COLORS.primaryDark } },
          bottom: { style: 'thin', color: { argb: EXCEL_COLORS.primaryDark } },
          left: { style: 'thin', color: { argb: EXCEL_COLORS.primaryDark } },
          right: { style: 'thin', color: { argb: EXCEL_COLORS.primaryDark } }
        };
        
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
    
    ws.mergeCells(`A${rowNum}:${lastCol}${rowNum}`);
    const totalLabelCell = totalRow.getCell(1);
    totalLabelCell.value = `TOTAL PLAN ANUAL — ${totalActividadesPlan} actividades en ${roles.length} roles — Avance promedio: ${promedioGeneral}%`;
    totalLabelCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: EXCEL_COLORS.white } };
    totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: promedioGeneral >= 75 ? EXCEL_COLORS.success : promedioGeneral >= 50 ? EXCEL_COLORS.warning : EXCEL_COLORS.danger } };
    totalLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalLabelCell.border = {
      top: { style: 'medium', color: { argb: '000000' } },
      bottom: { style: 'medium', color: { argb: '000000' } },
      left: { style: 'medium', color: { argb: '000000' } },
      right: { style: 'medium', color: { argb: '000000' } }
    };
    
    totalRow.height = 30;

    // --- PIE DE PÁGINA ---
    rowNum += 2;
    ws.mergeCells(`A${rowNum}:Q${rowNum}`);
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
