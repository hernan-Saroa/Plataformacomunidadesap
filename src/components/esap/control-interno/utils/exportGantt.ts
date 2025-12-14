/**
 * UTILIDADES DE EXPORTACIÓN - GANTT CHART
 * Funciones para exportar la vista Gantt como imagen o PDF
 */

/**
 * Exportar vista Gantt como imagen PNG
 * @param elementId ID del elemento DOM a exportar
 * @param filename Nombre del archivo de salida
 */
export async function exportGanttAsImage(elementId: string, filename: string = 'programa-anual-gantt.png') {
  try {
    // Importar html2canvas dinámicamente (solo en cliente)
    const html2canvas = (await import('html2canvas')).default;
    
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Elemento con ID "${elementId}" no encontrado`);
    }

    // Generar canvas
    const canvas = await html2canvas(element, {
      scale: 2, // Mayor resolución
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    });

    // Convertir a blob y descargar
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Error al generar la imagen');
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });

    return true;
  } catch (error) {
    console.error('Error al exportar Gantt:', error);
    return false;
  }
}

/**
 * Exportar vista Gantt como PDF
 * @param elementId ID del elemento DOM a exportar
 * @param filename Nombre del archivo de salida
 */
export async function exportGanttAsPDF(elementId: string, filename: string = 'programa-anual-gantt.pdf') {
  try {
    // Importar bibliotecas dinámicamente
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');
    
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Elemento con ID "${elementId}" no encontrado`);
    }

    // Generar canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Configurar PDF en landscape (horizontal)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calcular dimensiones para mantener aspecto
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgWidth / imgHeight;
    
    let finalWidth = pdfWidth;
    let finalHeight = pdfWidth / ratio;
    
    if (finalHeight > pdfHeight) {
      finalHeight = pdfHeight;
      finalWidth = pdfHeight * ratio;
    }

    // Centrar imagen
    const x = (pdfWidth - finalWidth) / 2;
    const y = (pdfHeight - finalHeight) / 2;

    pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
    pdf.save(filename);

    return true;
  } catch (error) {
    console.error('Error al exportar Gantt como PDF:', error);
    return false;
  }
}

/**
 * Generar datos para exportación Excel
 * @param auditorias Array de auditorías programadas
 */
export function generateGanttExcelData(auditorias: any[]) {
  return auditorias.map(auditoria => ({
    'Código': auditoria.codigo,
    'Proceso Auditable': auditoria.procesoAuditable,
    'Tipo Proceso': auditoria.tipoProceso,
    'Sede/Territorial': auditoria.tipoSede === 'Territorial' 
      ? `Territorial - ${auditoria.territorial}` 
      : 'Sede Principal',
    'Nivel de Riesgo': auditoria.nivelRiesgo,
    'Auditor Líder': auditoria.auditorLider || 'Sin asignar',
    'Equipo Auditor': auditoria.equipoAuditor?.join(', ') || '',
    'Inicio Planeación': auditoria.fechas.planeacion.inicio,
    'Fin Planeación': auditoria.fechas.planeacion.fin,
    'Días Planeación': auditoria.fechas.planeacion.duracionDias,
    'Inicio Ejecución': auditoria.fechas.ejecucion.inicio,
    'Fin Ejecución': auditoria.fechas.ejecucion.fin,
    'Días Ejecución': auditoria.fechas.ejecucion.duracionDias,
    'Inicio Comunicación': auditoria.fechas.comunicacion.inicio,
    'Fin Comunicación': auditoria.fechas.comunicacion.fin,
    'Días Comunicación': auditoria.fechas.comunicacion.duracionDias,
    'Estado': auditoria.estado,
    'Observaciones': auditoria.observaciones || '',
  }));
}

/**
 * Exportar a Excel
 * @param auditorias Array de auditorías
 * @param filename Nombre del archivo
 */
export async function exportGanttAsExcel(auditorias: any[], filename: string = 'programa-anual-gantt.xlsx') {
  try {
    const XLSX = await import('xlsx');
    
    const data = generateGanttExcelData(auditorias);
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Aplicar estilos a la hoja
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Ancho de columnas
    const columnWidths = [
      { wch: 15 }, // Código
      { wch: 30 }, // Proceso
      { wch: 15 }, // Tipo
      { wch: 20 }, // Sede
      { wch: 15 }, // Riesgo
      { wch: 25 }, // Auditor
      { wch: 30 }, // Equipo
      { wch: 15 }, // Fechas...
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 }, // Estado
      { wch: 30 }, // Observaciones
    ];
    worksheet['!cols'] = columnWidths;
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Programa Anual');
    
    XLSX.writeFile(workbook, filename);
    
    return true;
  } catch (error) {
    console.error('Error al exportar Excel:', error);
    return false;
  }
}
