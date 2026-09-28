import * as ExcelJS from 'exceljs';
import logoBase64 from '../../assets/esap-logo-certificaciones.b64?raw';
import { fechaSeguimientoTarea } from './fechaSeguimientoTarea';

/**
 * Columnas del informe en el orden en que se escriben. Es la única fuente: alimenta
 * tanto el selector de columnas de la pantalla como la exportación.
 */
const CATALOGO_COLUMNAS: { key: string; label: string; header: string; width: number; centrada?: boolean }[] = [
  { key: 'idactividad',      label: 'ID',                       header: 'ID',                              width: 12, centrada: true },
  { key: 'idrol',            label: 'Rol',                      header: 'Rol',                             width: 22 },
  { key: 'lista_actividades',label: 'Lista de actividades',     header: 'Lista de actividades',            width: 40 },
  { key: 'responsable',      label: 'Responsable',              header: 'Responsable',                     width: 25 },
  { key: 'fecha_inicio',     label: 'Fecha inicio',             header: 'Fecha\ninicio',                   width: 12 },
  { key: 'fecha_final',      label: 'Fecha final',              header: 'Fecha\nfinal',                    width: 12 },
  { key: 'control',          label: 'Control',                  header: 'Control',                         width: 25 },
  { key: 'estado',           label: 'Estado',                   header: 'Estado',                          width: 8,  centrada: true },
  { key: 'seguimiento',      label: 'Seguimiento y evaluación', header: 'Seguimiento y evaluación tareas', width: 35 },
  { key: 'fecha',            label: 'Fecha seguimiento',        header: 'Fecha seguimiento',               width: 12 },
  { key: 'evaluacion_tarea', label: 'Evaluación tarea',         header: 'Evaluació\nn tarea',              width: 10, centrada: true },
  { key: 'evidencias',       label: 'Evidencias',               header: 'Evidencias',                      width: 20 },
];

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
        ext: { width: 150, height: 57 }
      });
    } catch (err) {
      console.warn('No se pudo cargar el logo', err);
    }

    // 2. Columnas del informe: solo se escriben las que el usuario dejó marcadas,
    // en el orden del catálogo. Sin selección se exporta el informe completo.
    const seleccionadas: string[] = Array.isArray(options?.columnasSeleccionadas) && options.columnasSeleccionadas.length > 0
      ? options.columnasSeleccionadas
      : CATALOGO_COLUMNAS.map((c) => c.key);
    const columnas = CATALOGO_COLUMNAS.filter((c) => seleccionadas.includes(c.key));
    const totalColumnas = columnas.length;

    columnas.forEach((col, i) => {
      worksheet.getColumn(i + 1).width = col.width;
    });

    /** Combina un rango solo si abarca más de una celda (ExcelJS falla con rangos de una). */
    const combinar = (r1: number, c1: number, r2: number, c2: number) => {
      if (c2 < c1 || r2 < r1 || (r1 === r2 && c1 === c2)) return;
      worksheet.mergeCells(r1, c1, r2, c2);
    };

    // Los rótulos de estado, versión y fecha van a la derecha; con pocas columnas
    // no caben y esa información queda en la línea de metadatos (fila 5).
    const hayEspacioLogo = totalColumnas >= 3;
    const conMetadatosDerecha = totalColumnas >= 6;
    const colTitulo = hayEspacioLogo ? 3 : 1;
    const finTitulo = conMetadatosDerecha ? totalColumnas - 2 : totalColumnas;
    const colEtiqueta = totalColumnas - 1;
    const colValor = totalColumnas;

    // 3. Crear Encabezados Institucionales (Filas 1 a 5)
    if (hayEspacioLogo) combinar(1, 1, 3, 2); // Espacio para el logo

    const rotuloDerecha = (fila: number, etiqueta: string, valor: string, colorValor?: string) => {
      if (!conMetadatosDerecha) return;
      const celdaEtiqueta = worksheet.getCell(fila, colEtiqueta);
      celdaEtiqueta.value = etiqueta;
      celdaEtiqueta.font = { bold: true, size: 9, name: 'Arial' };
      celdaEtiqueta.alignment = { horizontal: 'right', vertical: 'middle' };

      const celdaValor = worksheet.getCell(fila, colValor);
      celdaValor.value = valor;
      celdaValor.font = { bold: true, size: 9, name: 'Arial', ...(colorValor ? { color: { argb: colorValor } } : {}) };
      celdaValor.alignment = { horizontal: 'left', vertical: 'middle' };
    };

    const tituloCentrado = (fila: number, texto: string, font: Partial<ExcelJS.Font>) => {
      combinar(fila, colTitulo, fila, finTitulo);
      const celda = worksheet.getCell(fila, colTitulo);
      celda.value = texto;
      celda.font = { name: 'Arial', ...font };
      celda.alignment = { horizontal: 'center', vertical: 'middle' };
    };

    // Fila 1
    tituloCentrado(1, 'PLAN ANUAL DE AUDITORÍA INTERNA', { bold: true, size: 12 });
    rotuloDerecha(1, 'ESTADO:', plan.estado || 'BORRADOR', 'FF003DA5');

    // Fila 2
    tituloCentrado(2, 'Oficina de Control Interno', { size: 10 });
    rotuloDerecha(2, 'VERSIÓN:', String(plan.version || '1'));

    // Fila 3
    tituloCentrado(3, `Vigencia ${plan.vigencia || ''} — Versión ${plan.version || '1'}`, { bold: true, size: 11, color: { argb: 'FF003DA5' } });
    rotuloDerecha(3, 'FECHA:', new Date().toLocaleDateString('es-CO'));

    // Fila 4
    combinar(4, 1, 4, totalColumnas);
    const jefeOCI = plan.jefeOCI?.nombre || 'No asignado';
    worksheet.getCell(4, 1).value = `PROCESO: EVALUACIÓN, CONTROL Y MEJORA — Jefe OCI: ${jefeOCI}`;
    worksheet.getCell(4, 1).font = { bold: true, size: 10, name: 'Arial' };
    worksheet.getCell(4, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
    worksheet.getCell(4, 1).alignment = { horizontal: 'left', vertical: 'middle' };

    // Fila 5 (Metadatos pequeños)
    combinar(5, 1, 5, totalColumnas);
    const totalActs = plan.roles?.reduce((sum: number, r: any) => sum + (r.actividades?.length || 0), 0) || 0;
    const numRoles = plan.roles?.length || 0;
    worksheet.getCell(5, 1).value = `Estado: ${plan.estado || 'BORRADOR'} | Versión ${plan.version || '1'} | ${totalActs} actividades en ${numRoles} roles | Periodo: 01/01/${plan.vigencia || ''} - 31/12/${plan.vigencia || ''} | Generado: ${new Date().toLocaleString('es-CO')}`;
    worksheet.getCell(5, 1).font = { size: 8, italic: true, color: { argb: 'FF666666' }, name: 'Arial' };
    worksheet.getCell(5, 1).alignment = { horizontal: 'left', vertical: 'middle' };

    // Añadir bordes a encabezados 1-4
    for (let r = 1; r <= 4; r++) {
      for (let c = 1; c <= totalColumnas; c++) {
        worksheet.getCell(r, c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      }
    }

    // 4. Cabeceras de Datos (Fila 6)
    const headerRow = worksheet.getRow(6);
    columnas.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = col.header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9, name: 'Arial' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003DA5' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    headerRow.height = 30;

    // 5. Rellenar Datos
    let currentRow = 7;

    // Las fechas se exportan tal como se parametrizaron: no se fuerza el año de la
    // vigencia y las ISO (YYYY-MM-DD) se leen sin pasar por UTC, que restaba un día.
    const formatearFecha = (fecha?: string) => {
      if (!fecha) return '';
      try {
        const iso = String(fecha).split('T')[0];
        const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
        if (partes) return `${Number(partes[3])}/${Number(partes[2])}/${partes[1]}`;
        const d = new Date(fecha);
        if (isNaN(d.getTime())) return fecha;
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
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

    /** Valor de una columna para una fila de actividad (con o sin tarea asociada). */
    const valorColumna = (
      key: string,
      ctx: { rol: any; act: any; idx: number; pct: number; tarea?: any },
    ): string | number => {
      const { rol, act, idx, pct, tarea } = ctx;
      switch (key) {
        case 'idactividad': return idx + 1;
        case 'idrol': return fixEncoding(rol.nombre || '');
        case 'lista_actividades': return fixEncoding(act.nombre || '');
        case 'responsable': return getResponsable(act);
        case 'fecha_inicio': return formatearFecha(act.fechaInicio || act.fecha_inicio);
        case 'fecha_final': return formatearFecha(act.fechaFin || act.fecha_fin);
        case 'control': return act.control || 'Se hace seguimiento';
        case 'estado': return act.estado === 'COMPLETADA' ? 100 : pct;
        case 'seguimiento': return tarea ? (tarea.nombre || tarea.descripcion || '') : 'Sin tareas';
        case 'fecha': return formatearFecha(fechaSeguimientoTarea(act, tarea));
        case 'evaluacion_tarea': return tarea ? (tarea.estado === 'Completada' ? 100 : (tarea.avance || 0)) : 0;
        case 'evidencias': return tarea ? (tarea.evidencia || 'Sin evidencia') : 'Sin evidencia';
        default: return '';
      }
    };

    /** Escribe una fila de datos usando solo las columnas seleccionadas. */
    const escribirFila = (ctx: { rol: any; act: any; idx: number; pct: number; tarea?: any }) => {
      const row = worksheet.getRow(currentRow);
      columnas.forEach((col, i) => {
        const cell = row.getCell(i + 1);
        cell.value = valorColumna(col.key, ctx);
        cell.alignment = { vertical: 'middle', wrapText: true, ...(col.centrada ? { horizontal: 'center' } : {}) };
        cell.border = { top: { style: 'thin', color: { argb: 'FFEEEEEE' } }, bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } } };
      });
      currentRow++;
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
              escribirFila({ rol, act, idx, pct });
            } else {
              // Múltiples filas por tareas (duplicando info de la actividad para cada tarea, como en la imagen)
              tareas.forEach((tarea: any) => {
                escribirFila({ rol, act, idx, pct, tarea });
              });
            }
          });
        }

        // Fila de SUBTOTAL
        const avancePromedio = countActividades > 0 ? Math.round(sumaAvanceRol / countActividades) : 0;
        const subtotalRow = worksheet.getRow(currentRow);
        combinar(currentRow, 1, currentRow, totalColumnas);
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
      combinar(currentRow, 1, currentRow, totalColumnas);
      const totalCell = totalRow.getCell(1);
      totalCell.value = `TOTAL PLAN ANUAL — ${totalActividadesGlobal} actividades en ${plan.roles.length} roles — Avance promedio: ${avanceGlobalPromedio}%`;
      totalCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Arial' };
      totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD32F2F' } }; // Rojo oscuro
      totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
      totalRow.height = 25;
      currentRow += 2; // Dejar un espacio para el footer

      // Footer
      const footerRow = worksheet.getRow(currentRow);
      combinar(currentRow, 1, currentRow, totalColumnas);
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

// Columnas que ofrece el selector de la pantalla: las mismas que escribe la exportación.
export const COLUMNAS_DISPONIBLES = CATALOGO_COLUMNAS.map(({ key, label }) => ({
  key,
  label,
  defaultVisible: true,
}));