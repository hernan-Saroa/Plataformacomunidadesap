import * as ExcelJS from 'exceljs';
import type { AuditoriaExcel } from './exportarAuditoriasExcel';

export async function exportarAuditoriasTemplate(
  auditorias: AuditoriaExcel[]
): Promise<{ exito: boolean; nombreArchivo: string; mensaje?: string; error?: string }> {
  try {
    console.log('Generando Excel desde cero (sin plantilla)...');

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ESAP';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Programa Anual');

    // Configurar columnas y anchos
    worksheet.getColumn(1).width = 40; // Unidad Auditada
    worksheet.getColumn(2).width = 30; // Responsable
    
    // Semanas (1 a 53)
    for (let i = 3; i <= 55; i++) {
      worksheet.getColumn(i).width = 5;
    }
    worksheet.getColumn(56).width = 50; // Observaciones

    // Fila 1: Título principal
    worksheet.mergeCells('A1:BD1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'PROGRAMA ANUAL DE AUDITORÍAS';
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003DA5' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 30;

    // Fila 2: Cabeceras
    const headerRow = worksheet.getRow(2);
    headerRow.height = 25;
    headerRow.getCell(1).value = 'Unidad Auditada / Título';
    headerRow.getCell(2).value = 'Responsable';
    
    for (let w = 1; w <= 53; w++) {
      headerRow.getCell(w + 2).value = `S${w}`;
    }
    headerRow.getCell(56).value = 'Observaciones';

    // Estilo de las cabeceras
    for (let col = 1; col <= 56; col++) {
      const cell = headerRow.getCell(col);
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2962FF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    }

    // Helper para obtener número de semana (1 a 53)
    const getWeekNumber = (date: Date) => {
      const start = new Date(date.getFullYear(), 0, 1);
      const diff = date.getTime() - start.getTime() + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60000;
      const oneDay = 1000 * 60 * 60 * 24;
      const day = Math.floor(diff / oneDay);
      return Math.ceil((day + start.getDay() + 1) / 7);
    };

    // Llenar los datos
    const START_ROW = 3;
    auditorias.forEach((auditoria, index) => {
      const rowIndex = START_ROW + index;
      const row = worksheet.getRow(rowIndex);

      row.getCell(1).value = auditoria.titulo || 'Sin título';
      row.getCell(1).alignment = { vertical: 'middle', wrapText: true };
      row.getCell(1).font = { size: 10 };
      
      row.getCell(2).value = auditoria.auditorLider?.nombre || 'No asignado';
      row.getCell(2).alignment = { vertical: 'middle', wrapText: true };
      row.getCell(2).font = { size: 10 };

      // Lógica de Gantt
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
            const colIndex = 2 + w;
            const weekRelative = w - startWeek + 1;
            
            let etapa = '';
            let color = 'FFFFFFFF';
            let fontColor = 'FF000000';

            if (weekRelative <= planeacionWeeks) {
              etapa = 'P';
              color = 'FFDBEAFE'; // Azul claro
              fontColor = 'FF1E40AF';
            } else if (weekRelative <= planeacionWeeks + ejecucionWeeks) {
              etapa = 'E';
              color = 'FFFEF08A'; // Amarillo claro
              fontColor = 'FF854D0E';
            } else {
              etapa = 'C';
              color = 'FFD1FAE5'; // Verde claro
              fontColor = 'FF065F46';
            }
            
            const cell = row.getCell(colIndex);
            cell.value = etapa;
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.font = { bold: true, color: { argb: fontColor }, size: 9 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
          }
        }
      }

      // Observaciones
      row.getCell(56).value = `Estado: ${auditoria.estado} | Avance: ${auditoria.progreso}% | Riesgo: ${auditoria.riesgo}`;
      row.getCell(56).alignment = { vertical: 'middle', wrapText: true };
      row.getCell(56).font = { size: 10 };

      // Bordes suaves para todas las celdas de la fila
      for (let col = 1; col <= 56; col++) {
        row.getCell(col).border = {
          top: { style: 'thin', color: { argb: 'FFEEEEEE' } },
          bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } },
          left: { style: 'thin', color: { argb: 'FFEEEEEE' } },
          right: { style: 'thin', color: { argb: 'FFEEEEEE' } }
        };
      }
    });

    // Descargar el archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = `Programa_Anual_Auditorias_${fecha}.xlsx`;
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return {
      exito: true,
      nombreArchivo,
      mensaje: `Excel generado correctamente con ${auditorias.length} auditorías.`
    };
  } catch (error) {
    console.error('Error al exportar Excel:', error);
    return {
      exito: false,
      nombreArchivo: '',
      error: error instanceof Error ? error.message : 'Error desconocido al generar el archivo Excel.'
    };
  }
}

export default exportarAuditoriasTemplate;
