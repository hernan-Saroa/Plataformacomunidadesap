import * as ExcelJS from 'exceljs';
import logoBase64 from '../../assets/esap-logo-institucional.b64?raw';

export async function exportarAuditoriasTemplate(
  auditorias: any[],
  vigenciaActiva: string = new Date().getFullYear().toString()
): Promise<{ exito: boolean; nombreArchivo: string; mensaje?: string; error?: string }> {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ESAP';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('PLAN ANUAL AUDITORIA', {
      properties: { defaultRowHeight: 12.0 }
    });

    // Cargar logo en Base64 directamente (para evitar fallos de fetch en MFE)
    try {
      const b64Data = logoBase64.replace(/\s/g, '');
      const imageId = workbook.addImage({
        base64: `data:image/png;base64,${b64Data}`,
        extension: 'png',
      });
      
      // Ajustar logo a las celdas A1:A3 (aproximadamente)
      worksheet.addImage(imageId, {
        tl: { col: 0.2, row: 0.2 },
        ext: { width: 320, height: 130 }
      });
    } catch (err) {
      console.warn('No se pudo cargar el logo institucional para el Excel', err);
    }

    // Anchos de columnas
    worksheet.getColumn(1).width = 78.29; // A
    worksheet.getColumn(2).width = 40.71; // B
    for (let i = 3; i <= 55; i++) {
      worksheet.getColumn(i).width = 8.71; // C hasta BC
    }
    worksheet.getColumn(56).width = 40.71; // BD
    worksheet.getColumn(57).width = 56.86; // BE

    // Alturas de filas fijas iniciales
    worksheet.getRow(1).height = 45.75;
    worksheet.getRow(2).height = 45.75;
    worksheet.getRow(3).height = 45.75;
    worksheet.getRow(4).height = 19.5;
    worksheet.getRow(5).height = 19.5;
    worksheet.getRow(6).height = 34.5;

    // Fila 1 a 3 (Vacía A1:A3 y FORMATO)
    worksheet.mergeCells('A1:A3');
    worksheet.mergeCells('B1:BC3');
    const b1 = worksheet.getCell('B1');
    b1.value = 'FORMATO \nPLAN ANUAL DE AUDITORÍAS DE EVALUACIÓN Y SEGUIMIENTO DE LA OFICINA DE CONTROL INTERNO - OCI';
    b1.font = { name: 'Arial', size: 12, bold: true };
    b1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    worksheet.getCell('BD1').value = 'CÓDIGO';
    worksheet.getCell('BD1').font = { name: 'Arial', size: 9, bold: true };
    worksheet.getCell('BD1').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    worksheet.getCell('BE1').value = 'EM-FO-001';
    worksheet.getCell('BE1').font = { name: 'Arial', size: 9, bold: true };
    worksheet.getCell('BE1').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

    worksheet.getCell('BD2').value = 'VERSIÓN';
    worksheet.getCell('BD2').font = { name: 'Arial', size: 9, bold: true };
    worksheet.getCell('BD2').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    worksheet.getCell('BE2').value = '1.0';
    worksheet.getCell('BE2').font = { name: 'Arial', size: 9, bold: true };
    worksheet.getCell('BE2').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

    worksheet.getCell('BD3').value = 'FECHA';
    worksheet.getCell('BD3').font = { name: 'Arial', size: 9, bold: true };
    worksheet.getCell('BD3').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    worksheet.getCell('BE3').value = '2024-04-10';
    worksheet.getCell('BE3').font = { name: 'Arial', size: 9, bold: true };
    worksheet.getCell('BE3').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

    // Fila 4 y 5
    worksheet.mergeCells('A4:BE4');
    const a4 = worksheet.getCell('A4');
    a4.value = 'Proceso: Evaluación Control y Mejora';
    a4.font = { name: 'Arial', size: 14, bold: true };
    a4.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

    worksheet.mergeCells('A5:BE5');
    const a5 = worksheet.getCell('A5');
    a5.value = 'Documento de referencia: Procedimiento de Auditorías internas EM-PT-004';
    a5.font = { name: 'Arial', size: 14, bold: true };
    a5.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

    // Bordes para encabezado
    for (let r = 1; r <= 5; r++) {
      const row = worksheet.getRow(r);
      for (let c = 1; c <= 57; c++) {
        row.getCell(c).border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
      }
    }

    // Fila 6: Encabezados de meses
    const colorMeses = 'FFCCCCFF';
    worksheet.mergeCells('A6:A7');
    worksheet.getCell('A6').value = 'UNIDAD AUDITADA';
    worksheet.getCell('A6').font = { name: 'Arial', size: 16, bold: true };
    
    worksheet.mergeCells('B6:B7');
    worksheet.getCell('B6').value = 'RESPONSABLE';
    worksheet.getCell('B6').font = { name: 'Arial', size: 16, bold: true };

    const configMeses = [
      { merge: 'C6:G6',  label: 'ENERO' },
      { merge: 'H6:K6',  label: 'FEBRERO' },
      { merge: 'L6:O6',  label: 'MARZO' },
      { merge: 'P6:T6',  label: 'ABRIL' },
      { merge: 'U6:X6',  label: 'MAYO' },
      { merge: 'Y6:AB6', label: 'JUNIO' },
      { merge: 'AC6:AG6',label: 'JULIO' },
      { merge: 'AH6:AK6',label: 'AGOSTO' },
      { merge: 'AL6:AP6',label: 'SEPTIEMBRE' },
      { merge: 'AQ6:AT6',label: 'OCTUBRE' },
      { merge: 'AU6:AX6',label: 'NOVIEMBRE' },
      { merge: 'AY6:BC6',label: 'DICIEMBRE' },
    ];

    configMeses.forEach(m => {
      worksheet.mergeCells(m.merge);
      const cell = worksheet.getCell(m.merge.split(':')[0]);
      cell.value = m.label;
      cell.font = { name: 'Arial', size: 9, bold: true };
    });

    worksheet.mergeCells('BD6:BE6');
    worksheet.getCell('BD6').value = 'OBSERVACIONES';
    worksheet.getCell('BD6').font = { name: 'Arial', size: 9, bold: true };

    // Fila 6 Estilos
    for (let c = 1; c <= 57; c++) {
      const cell = worksheet.getCell(6, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorMeses } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
      if (c === 1 || c === 2) {
         worksheet.getCell(7, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorMeses } };
         worksheet.getCell(7, c).border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
      }
    }

    // Fila 7: Semanas
    worksheet.getRow(7).height = 34.5; // Aproximado para wrap
    const colsSemanas = [
      'C','D','E','F','G',
      'H','I','J','K',
      'L','M','N','O',
      'P','Q','R','S','T',
      'U','V','W','X',
      'Y','Z','AA','AB',
      'AC','AD','AE','AF','AG',
      'AH','AI','AJ','AK',
      'AL','AM','AN','AO','AP',
      'AQ','AR','AS','AT',
      'AU','AV','AW','AX',
      'AY','AZ','BA','BB','BC'
    ];

    let mesIdx = 0;
    let semanaLocal = 1;
    let colIndexSemanas = 3;

    for (let i = 0; i < colsSemanas.length; i++) {
      const colLetter = colsSemanas[i];
      let txt = `Semana ${semanaLocal}`;
      
      // Casos especiales
      if (colLetter === 'R') {
        txt = 'Semana 3\nSemana Santa';
        worksheet.getCell(`${colLetter}7`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
      } else if (colLetter === 'AQ') {
        txt = 'Semana 1\nSemana de Receso';
        worksheet.getCell(`${colLetter}7`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
      }

      const cell = worksheet.getCell(`${colLetter}7`);
      cell.value = txt;
      cell.font = { name: 'Arial', size: 9, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };

      semanaLocal++;
      // Resetear semana si cambiamos de mes. El arreglo tiene tamaños de mes: 5,4,4,5,4,4,5,4,5,4,4,5
      const numSemanasPorMes = [5, 4, 4, 5, 4, 4, 5, 4, 5, 4, 4, 5];
      if (semanaLocal > numSemanasPorMes[mesIdx]) {
        semanaLocal = 1;
        mesIdx++;
      }
    }

    // Merge y border BD7:BE7
    worksheet.mergeCells('BD7:BE7');
    worksheet.getCell('BD7').border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };

    let currentRow = 8;

    const renderSeccion = (titulo: string) => {
      worksheet.mergeCells(`A${currentRow}:BE${currentRow}`);
      const cell = worksheet.getCell(`A${currentRow}`);
      cell.value = titulo;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD8D8D8' } };
      cell.font = { name: 'Arial', size: 18, bold: true };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
      for (let c = 1; c <= 57; c++) {
        worksheet.getCell(currentRow, c).border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
      }
      worksheet.getRow(currentRow).height = 30; // Aproximado
      currentRow++;
    };

    const grupos = {
      sedeCentral: [] as any[],
      territoriales: [] as any[],
      especiales: [] as any[],
      informesLey: [] as any[],
      otrosRoles: [] as any[]
    };

    // Mapeo
    auditorias.forEach(a => {
      const cat = (a.tipoCategoria || a.tipo || '').toLowerCase();
      if (cat.includes('sede central')) grupos.sedeCentral.push(a);
      else if (cat.includes('territorial')) grupos.territoriales.push(a);
      else if (cat.includes('especial')) grupos.especiales.push(a);
      else if (cat.includes('ley') || cat.includes('seguimiento')) grupos.informesLey.push(a);
      else if (cat.includes('otros roles')) grupos.otrosRoles.push(a);
      else grupos.sedeCentral.push(a); // Fallback
    });

    const getWeekNumber = (dateVal: any) => {
      if (!dateVal) return null;
      let dateObj;
      if (typeof dateVal === 'string') {
        if (dateVal.includes('/')) {
          const parts = dateVal.split('/');
          dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`);
        } else {
          dateObj = new Date(`${dateVal.split('T')[0]}T12:00:00Z`);
        }
      } else if (dateVal instanceof Date) {
        dateObj = dateVal;
      } else {
        dateObj = new Date(dateVal);
      }
      
      if (isNaN(dateObj.getTime())) return null;
      
      const start = new Date(dateObj.getFullYear(), 0, 1);
      const diff = dateObj.getTime() - start.getTime() + (start.getTimezoneOffset() - dateObj.getTimezoneOffset()) * 60000;
      const oneDay = 1000 * 60 * 60 * 24;
      const day = Math.floor(diff / oneDay);
      return Math.ceil((day + start.getDay() + 1) / 7);
    };

    const cleanName = (name: string) => {
      if (!name) return '';
      return name.replace(/\([^)]*\)/g, '').trim();
    };

    const formatResponsables = (responsableObj: any) => {
      if (!responsableObj) return '';
      if (typeof responsableObj === 'string') return responsableObj;
      if (Array.isArray(responsableObj)) {
         return responsableObj.map((r:any) => r?.nombre || r).join('\n');
      }
      return responsableObj?.nombre || '';
    };

    const renderAuditorias = (lista: any[], esInformeOOtros: boolean) => {
      lista.forEach(a => {
        const row = worksheet.getRow(currentRow);
        const nameClean = cleanName(a.titulo || a.nombre);
        const resps = formatResponsables(a.responsables || a.responsableArea || a.responsable);

        const cA = row.getCell(1);
        cA.value = nameClean;
        cA.font = { name: 'Arial', size: esInformeOOtros ? 10 : 12, bold: false };
        cA.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        const cB = row.getCell(2);
        cB.value = resps;
        cB.font = { name: 'Arial', size: 12, bold: false };
        cB.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        worksheet.mergeCells(`BD${currentRow}:BE${currentRow}`);
        const cObs = worksheet.getCell(`BD${currentRow}`);
        cObs.value = a.observaciones || '';
        cObs.font = { name: 'Arial', size: 9, bold: false };
        cObs.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        for (let c = 1; c <= 57; c++) {
           row.getCell(c).border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
           if (c >= 3 && c <= 55) {
             row.getCell(c).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
           }
        }

        if (esInformeOOtros && (a.fechaInicioPlaneacionRaw || a.fechaInicioRaw)) {
            const fechaVal = a.fechaInicioPlaneacionRaw || a.fechaInicioRaw;
            const w = getWeekNumber(fechaVal);
            if (w !== null && w >= 1 && w <= 53) {
               const cell = row.getCell(w + 2);
               let d = '';
               if (typeof fechaVal === 'string') {
                  d = fechaVal.includes('/') ? fechaVal.split('/')[0] : fechaVal.split('T')[0].split('-')[2];
               } else if (fechaVal instanceof Date) {
                  d = fechaVal.getDate().toString().padStart(2, '0');
               }
               cell.value = `J-OCI\n${d}\nD-NAL\n${d}`;
               cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD8D8D8' } };
               cell.font = { name: 'Arial', size: 9, bold: false };
               cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            }
        } else {
            const wInicio = getWeekNumber(a.fechaInicioRaw);
            const wFinP = getWeekNumber(a.fechaFinPlaneacionRaw);
            const wInicioE = getWeekNumber(a.fechaInicioEjecucionRaw);
            const wFinE = getWeekNumber(a.fechaFinEjecucionRaw);
            const wInicioC = getWeekNumber(a.fechaInicioComunicacionRaw);
            const wFin = getWeekNumber(a.fechaFinRaw);

            if (wInicio !== null && wFin !== null) {
              if (wFinP !== null && wInicioE !== null && wFinE !== null && wInicioC !== null) {
                 const pintarEtapa = (inicio: number, fin: number, letra: string, color: string) => {
                   const realStart = Math.max(1, inicio);
                   const realEnd = Math.min(53, Math.max(realStart, fin));
                   for (let w = realStart; w <= realEnd; w++) {
                      const cell = row.getCell(w + 2);
                      cell.value = letra;
                      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
                      cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF000000' } };
                      cell.alignment = { horizontal: 'center', vertical: 'middle' };
                   }
                 };

                 pintarEtapa(wInicio, wFinP, 'P', 'FFBBDEFB'); // Azul claro
                 pintarEtapa(wInicioE, wFinE, 'E', 'FFFFF59D'); // Amarillo suave
                 pintarEtapa(wInicioC, wFin, 'C', 'FFA5D6A7'); // Verde claro
              } else {
                 let realStart = Math.max(1, wInicio);
                 let realEnd = Math.min(53, Math.max(realStart, wFin));

                 const totalWeeks = realEnd - realStart + 1;
                 const pWeeksCount = Math.max(1, Math.floor(totalWeeks * 0.3));
                 const eWeeksCount = Math.max(1, Math.floor(totalWeeks * 0.5));

                 for (let w = realStart; w <= realEnd; w++) {
                   const cell = row.getCell(w + 2);
                   const relativeW = w - realStart + 1;

                   if (relativeW <= pWeeksCount) {
                     cell.value = 'P';
                     cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBBDEFB' } };
                   } else if (relativeW <= pWeeksCount + eWeeksCount) {
                     cell.value = 'E';
                     cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF59D' } };
                   } else {
                     cell.value = 'C';
                     cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA5D6A7' } };
                   }
                   cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF000000' } };
                   cell.alignment = { horizontal: 'center', vertical: 'middle' };
                 }
              }
            }
        }

        currentRow++;
      });
    };

    renderSeccion('Auditorías basadas en riesgos - Sede Central');
    renderAuditorias(grupos.sedeCentral, false);

    renderSeccion('Auditorías basadas en riesgos - Territoriales');
    renderAuditorias(grupos.territoriales, false);

    renderSeccion('Auditorías basadas en riesgos - Especiales');
    renderAuditorias(grupos.especiales, false);

    // Secciones eliminadas a petición: Informes de ley y Desarrollo de otros roles

    renderSeccion('APROBACIÓN DEL PLAN POR PARTE DEL COMITÉ INSTITUCIONAL DE COORDINACIÓN DE CONTROL INTERNO');
    
    // Fila Actualizado
    worksheet.mergeCells(`A${currentRow}:BE${currentRow}`);
    const fAct = worksheet.getCell(`A${currentRow}`);
    fAct.value = `Actualizado el ${new Date().toISOString().split('T')[0]}`;
    fAct.font = { name: 'Arial', size: 9, bold: false };
    fAct.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    for (let c = 1; c <= 57; c++) {
      worksheet.getCell(currentRow, c).border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
    }
    currentRow++;

    renderSeccion('CONVENCIONES');

    // Filas Convenciones
    const renderConvencion = (texto: string, letra: string, color?: string) => {
       worksheet.mergeCells(`C${currentRow}:BE${currentRow}`);
       const cA = worksheet.getCell(`A${currentRow}`);
       cA.value = texto;
       cA.font = { name: 'Arial', size: 14, bold: false };
       cA.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

       const cB = worksheet.getCell(`B${currentRow}`);
       cB.value = letra;
       cB.font = { name: 'Arial', size: 14, bold: false };
       cB.alignment = { horizontal: 'center', vertical: 'middle' };
       if (color) {
         cB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
       }

       for (let c = 1; c <= 57; c++) {
         worksheet.getCell(currentRow, c).border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
       }
       currentRow++;
    };

    renderConvencion('ETAPA DE PLANEACIÓN', 'P', 'FFBBDEFB');
    renderConvencion('ETAPA DE EJECUCIÓN', 'E', 'FFFFF59D');
    renderConvencion('ETAPA DE INFORMACIÓN Y COMUNICACIÓN', 'C', 'FFA5D6A7');

    // Descargar
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    const nombreArchivo = `PAI_${vigenciaActiva}_Exportado.xlsx`;
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return {
      exito: true,
      nombreArchivo,
      mensaje: `Plan Anual exportado con éxito.`
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
