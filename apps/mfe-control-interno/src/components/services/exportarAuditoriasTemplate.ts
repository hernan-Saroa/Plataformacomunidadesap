import * as ExcelJS from 'exceljs';
import type { AuditoriaExcel } from './exportarAuditoriasExcel';

export async function exportarAuditoriasTemplate(
  auditorias: AuditoriaExcel[]
): Promise<{ exito: boolean; nombreArchivo: string; mensaje?: string; error?: string }> {
  try {
    console.log('Generando Excel desde la plantilla EM-FO-001...');

    // 1. Cargar la plantilla desde la carpeta public
    // Se asume que el archivo fue copiado a /formatos/EM-FO-001.xlsx
    const response = await fetch('/formatos/EM-FO-001.xlsx');
    if (!response.ok) {
      throw new Error(`No se pudo cargar la plantilla (HTTP ${response.status}). Asegúrese de que el archivo EM-FO-001.xlsx esté en la carpeta public/formatos.`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // 2. Obtener la primera hoja de cálculo
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('La plantilla de Excel no tiene hojas de cálculo.');
    }

    // 3. Fila inicial de datos (según análisis de la plantilla)
    const START_ROW = 9;
    
    // Limpiar celdas existentes (para borrar datos dummy de la plantilla) sin perder el formato base
    for (let i = START_ROW; i <= 60; i++) {
      const r = worksheet.getRow(i);
      for (let j = 2; j <= 57; j++) {
        r.getCell(j).value = null;
      }
    }

    // Helper para obtener número de semana (1 a 53)
    const getWeekNumber = (date: Date) => {
      const start = new Date(date.getFullYear(), 0, 1);
      const diff = date.getTime() - start.getTime() + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60000;
      const oneDay = 1000 * 60 * 60 * 24;
      const day = Math.floor(diff / oneDay);
      return Math.ceil((day + start.getDay() + 1) / 7);
    };

    // 4. Llenar los datos
    auditorias.forEach((auditoria, index) => {
      const rowIndex = START_ROW + index;
      const row = worksheet.getRow(rowIndex);

      // Columna A (índice 1): Unidad Auditada / Título
      row.getCell(1).value = auditoria.titulo || 'Sin título';
      
      // Columna B (índice 2): Responsable
      row.getCell(2).value = auditoria.auditorLider?.nombre || 'No asignado';

      // Lógica de Gantt (Columnas 3 a 55, que representan las semanas)
      if (auditoria.fechaInicio && auditoria.fechaFin) {
        const start = new Date(auditoria.fechaInicio);
        const end = new Date(auditoria.fechaFin);
        
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
            const colIndex = 2 + w; // La semana 1 está en el índice 3 de la fila (Col C)
            const weekRelative = w - startWeek + 1;
            
            let etapa = '';
            if (weekRelative <= planeacionWeeks) {
              etapa = 'P'; // Planeación
            } else if (weekRelative <= planeacionWeeks + ejecucionWeeks) {
              etapa = 'E'; // Ejecución
            } else {
              etapa = 'C'; // Comunicación
            }
            
            row.getCell(colIndex).value = etapa;
            // Opcional: centrar el texto
            row.getCell(colIndex).alignment = { horizontal: 'center', vertical: 'middle' };
          }
        }
      }

      // Columna BD (índice 56): Observaciones
      row.getCell(56).value = `Estado: ${auditoria.estado} | Avance: ${auditoria.progreso}% | Riesgo: ${auditoria.riesgo}`;
    });

    // 5. Descargar el archivo modificado
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = `PAI_2025_ETAPAS_AUDITORIA_${fecha}.xlsx`;
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return {
      exito: true,
      nombreArchivo,
      mensaje: `Plantilla exportada correctamente con ${auditorias.length} auditorías.`
    };
  } catch (error) {
    console.error('Error al exportar plantilla:', error);
    return {
      exito: false,
      nombreArchivo: '',
      error: error instanceof Error ? error.message : 'Error desconocido al generar la plantilla.'
    };
  }
}

export default exportarAuditoriasTemplate;
