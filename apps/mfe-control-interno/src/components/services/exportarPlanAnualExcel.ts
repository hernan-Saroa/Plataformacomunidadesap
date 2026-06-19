import * as ExcelJS from 'exceljs';
import { PlanAnual, Rol } from './PlanAnualTypes'; // O el tipo correspondiente

// Define the exported function
export async function exportarPlanAnualExcel(plan: any, options?: any) {
  try {
    console.log('Generando Excel del Plan Anual desde plantilla EM-FO-001...');

    const response = await fetch('/formatos/EM-FO-001.xlsx');
    if (!response.ok) {
      throw new Error(`No se pudo cargar la plantilla (HTTP ${response.status}).`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new Error('La plantilla no tiene hojas.');

    // 1. Limpiar datos dummy en la plantilla desde la fila 8 hasta la 60
    for (let i = 8; i <= 60; i++) {
      const r = worksheet.getRow(i);
      for (let j = 1; j <= 57; j++) {
        r.getCell(j).value = null;
      }
    }

    // Helper de semanas
    const getWeekNumber = (date: Date) => {
      const start = new Date(date.getFullYear(), 0, 1);
      const diff = date.getTime() - start.getTime() + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60000;
      const oneDay = 1000 * 60 * 60 * 24;
      const day = Math.floor(diff / oneDay);
      return Math.ceil((day + start.getDay() + 1) / 7);
    };

    let currentRow = 8;

    // 2. Iterar sobre los roles del Plan Anual
    if (plan.roles && Array.isArray(plan.roles)) {
      plan.roles.forEach((rol: any) => {
        // Escribir el Rol (ej. "Auditorías basadas en riesgos") en la columna 1
        const rowRol = worksheet.getRow(currentRow);
        rowRol.getCell(1).value = rol.nombre || 'Rol sin nombre';
        rowRol.getCell(1).font = { bold: true, size: 11 };
        // Opcional: fondo para el rol
        // rowRol.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
        currentRow++;

        // 3. Iterar sobre las actividades de ese rol
        const actividades = rol.actividades || rol.actividadesPlan || [];
        actividades.forEach((act: any) => {
          const rowAct = worksheet.getRow(currentRow);
          
          // Col A: Unidad Auditada (Actividad)
          rowAct.getCell(1).value = act.nombre || 'Actividad sin nombre';
          
          // Col B: Responsable
          const responsable = act.responsable?.nombre || act.responsableNombre || act.responsableAsignado?.nombre || 'Sin asignar';
          rowAct.getCell(2).value = responsable;

          // Lógica de Gantt (Semanas)
          if (act.fechaInicio && act.fechaFin) {
            const start = new Date(act.fechaInicio);
            const end = new Date(act.fechaFin);
            
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              let startWeek = getWeekNumber(start);
              let endWeek = getWeekNumber(end);
              
              if (startWeek < 1) startWeek = 1;
              if (endWeek > 53) endWeek = 53;
              if (endWeek < startWeek) endWeek = startWeek;

              const totalWeeks = endWeek - startWeek + 1;
              const planeacionWeeks = Math.max(1, Math.floor(totalWeeks * 0.3));
              const ejecucionWeeks = Math.max(1, Math.floor(totalWeeks * 0.5));
              
              for (let w = startWeek; w <= endWeek; w++) {
                const colIndex = 2 + w; // Semana 1 = Col C (índice 3)
                const weekRelative = w - startWeek + 1;
                
                let etapa = '';
                if (weekRelative <= planeacionWeeks) etapa = 'P';
                else if (weekRelative <= planeacionWeeks + ejecucionWeeks) etapa = 'E';
                else etapa = 'C';
                
                rowAct.getCell(colIndex).value = etapa;
                rowAct.getCell(colIndex).alignment = { horizontal: 'center', vertical: 'middle' };
              }
            }
          }

          // Col BD (índice 56): Observaciones (Avance, Riesgo, etc si aplica)
          const estado = act.estado || act.estadoActividad || 'Pendiente';
          const avance = act.porcentajeAvance || 0;
          rowAct.getCell(56).value = `Estado: ${estado} | Avance: ${avance}%`;

          currentRow++;
        });
      });
    } else {
      // Si por alguna razón no hay roles (falla el mapeo), al menos dejamos una advertencia
      worksheet.getRow(8).getCell(1).value = 'No se encontraron roles en el Plan Anual.';
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    const fecha = new Date().toISOString().split('T')[0];
    const vigencia = plan.vigencia || new Date().getFullYear();
    const nombreArchivo = `PAI_${vigencia}_EM-FO-001_${fecha}.xlsx`;
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return {
      exito: true,
      nombreArchivo,
      mensaje: 'Plan Anual exportado exitosamente usando la plantilla EM-FO-001.'
    };
  } catch (error) {
    console.error('Error al exportar Plan Anual con plantilla:', error);
    return {
      exito: false,
      nombreArchivo: '',
      error: error instanceof Error ? error.message : 'Error desconocido al exportar.'
    };
  }
}

// Mantenemos la constante COLUMNAS_DISPONIBLES para que no rompa la UI del Wizard 
// que permite seleccionar columnas, aunque ahora la plantilla es fija.
export const COLUMNAS_DISPONIBLES = [
  { id: 'rol', label: 'Rol' },
  { id: 'numero', label: 'N°' },
  { id: 'actividad', label: 'Actividad' },
  { id: 'descripcion', label: 'Descripción' },
  { id: 'responsable', label: 'Responsable' },
  { id: 'fechaInicio', label: 'Fecha Inicio' },
  { id: 'fechaFin', label: 'Fecha Fin' },
  { id: 'estado', label: 'Estado' },
  { id: 'avance', label: '% Avance' }
];