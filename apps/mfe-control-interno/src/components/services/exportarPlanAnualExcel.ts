import * as ExcelJS from 'exceljs';
import logoBase64 from '../../assets/esap-logo-institucional.b64?raw';

export async function exportarPlanAnualExcel(plan: any, options?: any) {
  try {
    console.log('Generando Excel del Plan Anual con el diseño solicitado...');

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ESAP';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('PLAN ANUAL AUDITORIA', {
      properties: { defaultRowHeight: 15.0 }
    });

    // 1. Cargar Logo Institucional
    try {
      const b64Data = logoBase64.replace(/\s/g, '');
      const imageId = workbook.addImage({
        base64: `data:image/png;base64,${b64Data}`,
        extension: 'png',
      });
      // Colocar el logo en la esquina superior izquierda (A1:B3)
      worksheet.addImage(imageId, {
        tl: { col: 0.1, row: 0.1 },
        ext: { width: 140, height: 50 }
      });
    } catch (err) {
      console.warn('No se pudo cargar el logo', err);
    }

    // 2. Configurar Anchos de Columnas (Total 12 columnas: A a L)
    const colWidths = [
      12,  // A: Idactividad
      22,  // B: Idrol
      40,  // C: Lista de actividades
      25,  // D: Responsable
      12,  // E: Fecha inicio
      12,  // F: Fecha final
      25,  // G: Control
      8,   // H: Estado
      35,  // I: Seguimiento y evaluación tareas
      12,  // J: Fecha
      10,  // K: Evaluación tarea
      20   // L: Evidencias
    ];
    colWidths.forEach((width, i) => {
      worksheet.getColumn(i + 1).width = width;
    });

    // 3. Crear Encabezados Institucionales (Filas 1 a 5)
    // Fila 1
    worksheet.mergeCells('A1:B3'); // Espacio para el logo
    worksheet.mergeCells('C1:J1');
    worksheet.getCell('C1').value = 'PLAN ANUAL DE AUDITORÍA INTERNA';
    worksheet.getCell('C1').font = { bold: true, size: 12, name: 'Arial' };
    worksheet.getCell('C1').alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.getCell('K1').value = 'ESTADO:';
    worksheet.getCell('K1').font = { bold: true, size: 9, name: 'Arial' };
    worksheet.getCell('K1').alignment = { horizontal: 'right', vertical: 'middle' };

    worksheet.getCell('L1').value = plan.estado || 'BORRADOR';
    worksheet.getCell('L1').font = { bold: true, size: 9, color: { argb: 'FF003DA5' }, name: 'Arial' };
    worksheet.getCell('L1').alignment = { horizontal: 'left', vertical: 'middle' };

    // Fila 2
    worksheet.mergeCells('C2:J2');
    worksheet.getCell('C2').value = 'Oficina de Control Interno de Gestión - OCI';
    worksheet.getCell('C2').font = { size: 10, name: 'Arial' };
    worksheet.getCell('C2').alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.getCell('K2').value = 'VERSIÓN:';
    worksheet.getCell('K2').font = { bold: true, size: 9, name: 'Arial' };
    worksheet.getCell('K2').alignment = { horizontal: 'right', vertical: 'middle' };

    worksheet.getCell('L2').value = plan.version || '1';
    worksheet.getCell('L2').font = { bold: true, size: 9, name: 'Arial' };
    worksheet.getCell('L2').alignment = { horizontal: 'left', vertical: 'middle' };

    // Fila 3
    worksheet.mergeCells('C3:J3');
    worksheet.getCell('C3').value = `Vigencia ${plan.vigencia || ''} — Versión ${plan.version || '1'}`;
    worksheet.getCell('C3').font = { bold: true, size: 11, color: { argb: 'FF003DA5' }, name: 'Arial' };
    worksheet.getCell('C3').alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.getCell('K3').value = 'FECHA:';
    worksheet.getCell('K3').font = { bold: true, size: 9, name: 'Arial' };
    worksheet.getCell('K3').alignment = { horizontal: 'right', vertical: 'middle' };

    worksheet.getCell('L3').value = new Date().toLocaleDateString('es-CO');
    worksheet.getCell('L3').font = { bold: true, size: 9, name: 'Arial' };
    worksheet.getCell('L3').alignment = { horizontal: 'left', vertical: 'middle' };

    // Fila 4
    worksheet.mergeCells('A4:L4');
    const jefeOCI = plan.jefeOCI?.nombre || 'No asignado';
    worksheet.getCell('A4').value = `PROCESO: EVALUACIÓN, CONTROL Y MEJORA — Jefe OCI: ${jefeOCI}`;
    worksheet.getCell('A4').font = { bold: true, size: 10, name: 'Arial' };
    worksheet.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
    worksheet.getCell('A4').alignment = { horizontal: 'left', vertical: 'middle' };

    // Fila 5 (Metadatos pequeños)
    worksheet.mergeCells('A5:L5');
    const totalActs = plan.roles?.reduce((sum: number, r: any) => sum + (r.actividades?.length || 0), 0) || 0;
    const numRoles = plan.roles?.length || 0;
    worksheet.getCell('A5').value = `Estado: ${plan.estado || 'BORRADOR'} | ${totalActs} actividades en ${numRoles} roles | Periodo: 01/01/${plan.vigencia || ''} - 31/12/${plan.vigencia || ''} | Generado: ${new Date().toLocaleString('es-CO')}`;
    worksheet.getCell('A5').font = { size: 8, italic: true, color: { argb: 'FF666666' }, name: 'Arial' };
    worksheet.getCell('A5').alignment = { horizontal: 'left', vertical: 'middle' };

    // Añadir bordes a encabezados 1-4
    for (let r = 1; r <= 4; r++) {
      for (let c = 1; c <= 12; c++) {
        worksheet.getCell(r, c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      }
    }

    // 4. Cabeceras de Datos (Fila 6)
    const headers = [
      'Id. Actividad',
      'Id Rol',
      'Lista de actividades',
      'Responsable',
      'Fecha\ninicio',
      'Fecha\nfinal',
      'Control',
      'Estado',
      'Seguimiento y evaluación tareas',
      'Fecha',
      'Evaluació\nn tarea',
      'Evidencias'
    ];

    const headerRow = worksheet.getRow(6);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9, name: 'Arial' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003DA5' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    headerRow.height = 30;

    // 5. Rellenar Datos
    let currentRow = 7;

    const formatearFecha = (fecha: string, forzarVigencia?: string | number) => {
      if (!fecha) return '';
      try {
        const d = new Date(fecha);
        if (isNaN(d.getTime())) return fecha;
        const year = forzarVigencia ? forzarVigencia : d.getFullYear();
        return `${d.getDate()}/${d.getMonth() + 1}/${year}`;
      } catch (e) {
        return fecha;
      }
    };

    const fixEncoding = (str: string) => {
      if (!str) return '';
      try {
        return decodeURIComponent(escape(str));
      } catch (e) {
        return str;
      }
    };

    const getResponsable = (act: any) => {
      if (act.responsable?.nombre) return fixEncoding(act.responsable.nombre);
      if (typeof act.responsable === 'string') return fixEncoding(act.responsable);
      return 'Sin asignar';
    };

    let totalActividadesGlobal = 0;
    let sumaAvanceGlobal = 0;

    if (plan.roles && Array.isArray(plan.roles)) {
      [...plan.roles].sort((a, b) => a.numero - b.numero).forEach((rol) => {
        let sumaAvanceRol = 0;
        let countActividades = 0;

        if (rol.actividades && Array.isArray(rol.actividades)) {
          rol.actividades.forEach((act: any, idx: number) => {
            countActividades++;
            totalActividadesGlobal++;
            const pct = act.porcentajeAvance || 0;
            sumaAvanceRol += pct;
            sumaAvanceGlobal += pct;

            // Extraer tareas para desagregar
            const tareas = act.tareasSeguimiento || act.puntosControl || [];

            if (tareas.length === 0) {
              // Fila única para la actividad
              const row = worksheet.getRow(currentRow);
              row.getCell(1).value = idx + 1;
              row.getCell(2).value = fixEncoding(rol.nombre || '');
              row.getCell(3).value = fixEncoding(act.nombre || '');
              row.getCell(4).value = getResponsable(act);
              row.getCell(5).value = formatearFecha(act.fechaInicio, plan.vigencia);
              row.getCell(6).value = formatearFecha(act.fechaFin, plan.vigencia);
              row.getCell(7).value = act.control || 'Se hace seguimiento';
              row.getCell(8).value = act.estado === 'COMPLETADA' ? 100 : pct;
              row.getCell(9).value = 'Sin tareas';
              row.getCell(10).value = '';
              row.getCell(11).value = 0;
              row.getCell(12).value = 'Sin evidencia';

              for (let c = 1; c <= 12; c++) {
                const cell = row.getCell(c);
                cell.alignment = { vertical: 'middle', wrapText: true };
                cell.border = { top: { style: 'thin', color: { argb: 'FFEEEEEE' } }, bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } } };
                if (c === 1 || c === 8 || c === 11) cell.alignment.horizontal = 'center';
              }
              currentRow++;
            } else {
              // Múltiples filas por tareas (duplicando info de la actividad para cada tarea, como en la imagen)
              tareas.forEach((tarea: any) => {
                const row = worksheet.getRow(currentRow);

                // Datos de la actividad
                row.getCell(1).value = idx + 1;
                row.getCell(2).value = fixEncoding(rol.nombre || '');
                row.getCell(3).value = fixEncoding(act.nombre || '');
                row.getCell(4).value = getResponsable(act);
                row.getCell(5).value = formatearFecha(act.fechaInicio, plan.vigencia);
                row.getCell(6).value = formatearFecha(act.fechaFin, plan.vigencia);
                row.getCell(7).value = act.control || 'Se hace seguimiento';
                row.getCell(8).value = act.estado === 'COMPLETADA' ? 100 : pct;

                // Datos de la tarea
                row.getCell(9).value = tarea.nombre || tarea.descripcion || '';
                row.getCell(10).value = formatearFecha(tarea.fechaLimite || tarea.fecha_limite || tarea.fechaSeguimiento);
                row.getCell(11).value = tarea.estado === 'Completada' ? 100 : (tarea.avance || 0);
                row.getCell(12).value = tarea.evidencia || 'Sin evidencia';

                for (let c = 1; c <= 12; c++) {
                  const cell = row.getCell(c);
                  cell.alignment = { vertical: 'middle', wrapText: true };
                  cell.border = { top: { style: 'thin', color: { argb: 'FFEEEEEE' } }, bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } } };
                  if (c === 1 || c === 8 || c === 11) cell.alignment.horizontal = 'center';
                }
                currentRow++;
              });
            }
          });
        }

        // Fila de SUBTOTAL
        const avancePromedio = countActividades > 0 ? Math.round(sumaAvanceRol / countActividades) : 0;
        const subtotalRow = worksheet.getRow(currentRow);
        worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
        const subCell = subtotalRow.getCell(1);
        subCell.value = `SUBTOTAL ROL: ${fixEncoding(rol.nombre || '')} — ${countActividades} actividades — Avance promedio: ${avancePromedio}%`;
        subCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9, name: 'Arial' };
        subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2962FF' } }; // Azul oscuro medio
        subCell.alignment = { horizontal: 'right', vertical: 'middle' };

        currentRow++;
      });

      // Fila ROJA TOTAL PLAN ANUAL
      const avanceGlobalPromedio = totalActividadesGlobal > 0 ? Math.round(sumaAvanceGlobal / totalActividadesGlobal) : 0;
      const totalRow = worksheet.getRow(currentRow);
      worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
      const totalCell = totalRow.getCell(1);
      totalCell.value = `TOTAL PLAN ANUAL — ${totalActividadesGlobal} actividades en ${plan.roles.length} roles — Avance promedio: ${avanceGlobalPromedio}%`;
      totalCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Arial' };
      totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD32F2F' } }; // Rojo oscuro
      totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
      totalRow.height = 25;
      currentRow += 2; // Dejar un espacio para el footer

      // Footer
      const footerRow = worksheet.getRow(currentRow);
      worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
      const footerCell = footerRow.getCell(1);
      footerCell.value = 'Escuela Superior de Administración Pública - ESAP | Oficina de Control Interno de Gestión';
      footerCell.font = { italic: true, color: { argb: 'FF888888' }, size: 8, name: 'Arial' };
      footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // 6. Generar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PlanAnualAuditoria_${plan.vigencia || ''}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('Exportación finalizada con éxito.');
    return { exito: true };

  } catch (error) {
    console.error('Error exportando Excel:', error);
    return {
      exito: false,
      error: error instanceof Error ? error.message : 'Error desconocido exportando Excel'
    };
  }
}

// Exportamos las columnas disponibles para mantener la compatibilidad con el Dashboard
export const COLUMNAS_DISPONIBLES = [
  { key: 'idactividad', label: 'Id. Actividad', defaultVisible: true },
  { key: 'idrol', label: 'Id Rol', defaultVisible: true },
  { key: 'lista_actividades', label: 'Lista de actividades', defaultVisible: true },
  { key: 'responsable', label: 'Responsable', defaultVisible: true },
  { key: 'fecha_inicio', label: 'Fecha inicio', defaultVisible: true },
  { key: 'fecha_final', label: 'Fecha final', defaultVisible: true },
  { key: 'control', label: 'Control', defaultVisible: true },
  { key: 'estado', label: 'Estado', defaultVisible: true },
  { key: 'seguimiento', label: 'Seguimiento y evaluación', defaultVisible: true },
  { key: 'fecha', label: 'Fecha', defaultVisible: true },
  { key: 'evaluacion_tarea', label: 'Evaluación tarea', defaultVisible: true },
  { key: 'evidencias', label: 'Evidencias', defaultVisible: true }
];