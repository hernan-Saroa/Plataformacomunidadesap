import * as ExcelJS from 'exceljs';
import logoBase64 from '../../assets/esap-logo-certificaciones.b64?raw';
import {
  NOMBRE_BLOQUEO,
  semanasDeVigencia,
  type SemanaVigencia,
} from './calendarioVigencia';

const COL_PRIMERA_SEMANA = 3; // A: unidad auditada, B: responsable

export async function exportarAuditoriasTemplate(
  auditorias: any[],
  vigenciaActiva: string = new Date().getFullYear().toString(),
  // Versión del Programa Anual (EFDS-1919). No confundir con la VERSIÓN del
  // encabezado, que es la del formato EM-FO-001.
  opciones: { version?: number; fechaVersion?: string } = {}
): Promise<{ exito: boolean; nombreArchivo: string; mensaje?: string; error?: string }> {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ESAP';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('PLAN ANUAL AUDITORIA', {
      properties: { defaultRowHeight: 12.0 }
    });

    // Las semanas salen del calendario de la vigencia (EFDS-2132): así el número
    // de columnas, los meses y las semanas de Semana Santa y receso se acomodan
    // solos al año que se esté exportando.
    const añoVigencia = Number(vigenciaActiva) || new Date().getFullYear();
    // El helper trae varios años (para cronogramas que cruzan de año); el
    // documento solo tiene columnas de su vigencia.
    const semanasVigencia = semanasDeVigencia(añoVigencia).filter((s) => s.año === añoVigencia);
    const colUltimaSemana = COL_PRIMERA_SEMANA + semanasVigencia.length - 1;
    const colObsIni = colUltimaSemana + 1;
    const colObsFin = colUltimaSemana + 2;
    const totalCols = colObsFin;
    /** Columna del Excel para una semana de la vigencia; las de otros años no tienen. */
    const posicion = new Map(semanasVigencia.map((s, i) => [s.numero, i]));
    const colDeSemana = (numero: number) => {
      const i = posicion.get(numero);
      return i === undefined ? null : COL_PRIMERA_SEMANA + i;
    };

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
    for (let i = COL_PRIMERA_SEMANA; i <= colUltimaSemana; i++) {
      worksheet.getColumn(i).width = 8.71; // una por semana
    }
    worksheet.getColumn(colObsIni).width = 40.71;
    worksheet.getColumn(colObsFin).width = 56.86;

    // Alturas de filas fijas iniciales
    worksheet.getRow(1).height = 45.75;
    worksheet.getRow(2).height = 45.75;
    worksheet.getRow(3).height = 45.75;
    worksheet.getRow(4).height = 19.5;
    worksheet.getRow(5).height = 19.5;
    worksheet.getRow(6).height = 34.5;

    // Fila 1 a 3 (Vacía A1:A3 y FORMATO)
    worksheet.mergeCells('A1:A3');
    worksheet.mergeCells(1, 2, 3, colUltimaSemana);
    const b1 = worksheet.getCell('B1');
    b1.value = 'FORMATO \nPLAN ANUAL DE AUDITORÍAS DE EVALUACIÓN Y SEGUIMIENTO DE LA OFICINA DE CONTROL INTERNO - OCI';
    b1.font = { name: 'Arial', size: 12, bold: true };
    b1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    const datosFormato: Array<[string, string]> = [
      ['CÓDIGO', 'EM-FO-001'],
      ['VERSIÓN', '1.0'],
      ['FECHA', '2024-04-10'],
    ];
    datosFormato.forEach(([etiqueta, valor], i) => {
      const celdaEtiqueta = worksheet.getCell(i + 1, colObsIni);
      celdaEtiqueta.value = etiqueta;
      celdaEtiqueta.font = { name: 'Arial', size: 9, bold: true };
      celdaEtiqueta.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      const celdaValor = worksheet.getCell(i + 1, colObsFin);
      celdaValor.value = valor;
      celdaValor.font = { name: 'Arial', size: 9, bold: true };
      celdaValor.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    });

    // Fila 4 y 5
    worksheet.mergeCells(4, 1, 4, totalCols);
    const a4 = worksheet.getCell('A4');
    a4.value = 'Proceso: Evaluación Control y Mejora';
    a4.font = { name: 'Arial', size: 14, bold: true };
    a4.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

    worksheet.mergeCells(5, 1, 5, totalCols);
    const a5 = worksheet.getCell('A5');
    a5.value = 'Documento de referencia: Procedimiento de Auditorías internas EM-PT-004';
    a5.font = { name: 'Arial', size: 14, bold: true };
    a5.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

    // Bordes para encabezado
    for (let r = 1; r <= 5; r++) {
      const row = worksheet.getRow(r);
      for (let c = 1; c <= totalCols; c++) {
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

    // Un merge por mes, con las semanas que ese mes tenga en la vigencia
    const NOMBRES_MESES = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
    ];
    NOMBRES_MESES.forEach((label, mes) => {
      const delMes = semanasVigencia.filter((s) => s.mes === mes);
      if (!delMes.length) return;
      const desde = colDeSemana(delMes[0].numero);
      const hasta = colDeSemana(delMes[delMes.length - 1].numero);
      if (desde === null || hasta === null) return;
      if (hasta > desde) worksheet.mergeCells(6, desde, 6, hasta);
      const cell = worksheet.getCell(6, desde);
      cell.value = label;
      cell.font = { name: 'Arial', size: 9, bold: true };
    });

    worksheet.mergeCells(6, colObsIni, 6, colObsFin);
    worksheet.getCell(6, colObsIni).value = 'OBSERVACIONES';
    worksheet.getCell(6, colObsIni).font = { name: 'Arial', size: 9, bold: true };

    // Fila 6 Estilos
    for (let c = 1; c <= totalCols; c++) {
      const cell = worksheet.getCell(6, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorMeses } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
      if (c === 1 || c === 2) {
         worksheet.getCell(7, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorMeses } };
         worksheet.getCell(7, c).border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
      }
    }

    // Fila 7: Semanas de la vigencia, con Semana Santa, receso y festivos
    worksheet.getRow(7).height = 34.5; // Aproximado para wrap
    semanasVigencia.forEach((semana) => {
      const col = colDeSemana(semana.numero);
      if (col === null) return;
      const cell = worksheet.getCell(7, col);
      const lineas = [`Semana ${semana.numeroEnMes}`];
      if (semana.bloqueo) {
        lineas.push(NOMBRE_BLOQUEO[semana.bloqueo]);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
      } else if (semana.festivos.length) {
        lineas.push(`Festivo ${semana.festivos.map((f) => Number(f.fecha.slice(8, 10))).join(', ')}`);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2F1' } };
      }
      cell.value = lineas.join('\n');
      cell.note = semana.festivos.length
        ? semana.festivos.map((f) => `${f.fecha}: ${f.nombre}`).join('\n')
        : undefined;
      cell.font = { name: 'Arial', size: 9, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
    });

    worksheet.mergeCells(7, colObsIni, 7, colObsFin);
    worksheet.getCell(7, colObsIni).border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };

    let currentRow = 8;

    const renderSeccion = (titulo: string) => {
      worksheet.mergeCells(currentRow, 1, currentRow, totalCols);
      const cell = worksheet.getCell(`A${currentRow}`);
      cell.value = titulo;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD8D8D8' } };
      cell.font = { name: 'Arial', size: 18, bold: true };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
      for (let c = 1; c <= totalCols; c++) {
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

    /** Fecha (Date, ISO o dd/mm/aaaa) a YYYY-MM-DD, sin corrimiento de zona. */
    const aYMD = (dateVal: any): string | null => {
      if (!dateVal) return null;
      if (dateVal instanceof Date) {
        if (isNaN(dateVal.getTime())) return null;
        const y = dateVal.getFullYear();
        return `${y}-${String(dateVal.getMonth() + 1).padStart(2, '0')}-${String(dateVal.getDate()).padStart(2, '0')}`;
      }
      const texto = String(dateVal);
      if (texto.includes('/')) {
        const [d, m, y] = texto.split('/');
        if (!y) return null;
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
      const soloFecha = texto.split('T')[0];
      return /^\d{4}-\d{2}-\d{2}$/.test(soloFecha) ? soloFecha : null;
    };

    /**
     * Semana de la vigencia en la que cae la fecha (EFDS-2132). Antes se contaban
     * semanas desde el 1 de enero empezando en domingo, que no cuadra con el
     * encabezado por mes y corría las etapas de columna.
     */
    const semanaDeFecha = (dateVal: any): SemanaVigencia | null => {
      const ymd = aYMD(dateVal);
      if (!ymd) return null;
      return semanasVigencia.find((s) => ymd >= s.lunes && ymd <= s.domingo) || null;
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

        worksheet.mergeCells(currentRow, colObsIni, currentRow, colObsFin);
        const cObs = worksheet.getCell(currentRow, colObsIni);
        cObs.value = a.observaciones || '';
        cObs.font = { name: 'Arial', size: 9, bold: false };
        cObs.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        for (let c = 1; c <= totalCols; c++) {
           row.getCell(c).border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
           if (c >= COL_PRIMERA_SEMANA && c <= colUltimaSemana) {
             row.getCell(c).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
           }
        }

        // Semanas que esta auditoría sacó del cronograma (EFDS-2132)
        const excluidas = new Set<string>(Array.isArray(a.semanasExcluidas) ? a.semanasExcluidas : []);
        const sinProgramar = (semana: SemanaVigencia) => !!semana.bloqueo || excluidas.has(semana.lunes);

        if (esInformeOOtros && (a.fechaInicioPlaneacionRaw || a.fechaInicioRaw)) {
            const fechaVal = a.fechaInicioPlaneacionRaw || a.fechaInicioRaw;
            const semana = semanaDeFecha(fechaVal);
            const colInforme = semana ? colDeSemana(semana.numero) : null;
            if (semana && colInforme !== null) {
               const cell = row.getCell(colInforme);
               const d = (aYMD(fechaVal) || '').slice(8, 10);
               cell.value = `J-OCI\n${d}\nD-NAL\n${d}`;
               cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD8D8D8' } };
               cell.font = { name: 'Arial', size: 9, bold: false };
               cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            }
        } else {
            const sInicio = semanaDeFecha(a.fechaInicioRaw);
            const sFinP = semanaDeFecha(a.fechaFinPlaneacionRaw);
            const sInicioE = semanaDeFecha(a.fechaInicioEjecucionRaw);
            const sFinE = semanaDeFecha(a.fechaFinEjecucionRaw);
            const sInicioC = semanaDeFecha(a.fechaInicioComunicacionRaw);
            const sFin = semanaDeFecha(a.fechaFinRaw);

            if (sInicio && sFin) {
              // Semana Santa, receso y las semanas excluidas no llevan letra:
              // la etapa sigue en la columna siguiente.
              const pintarEtapa = (desde: SemanaVigencia, hasta: SemanaVigencia, letra: string, color: string) => {
                for (let n = desde.numero; n <= hasta.numero; n++) {
                   const semana = semanasVigencia.find((s) => s.numero === n);
                   const col = semana ? colDeSemana(n) : null;
                   if (!semana || col === null || sinProgramar(semana)) continue;
                   const cell = row.getCell(col);
                   cell.value = letra;
                   cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
                   cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF000000' } };
                   cell.alignment = { horizontal: 'center', vertical: 'middle' };
                }
              };

              if (sFinP && sInicioE && sFinE && sInicioC) {
                 pintarEtapa(sInicio, sFinP, 'P', 'FFBBDEFB'); // Azul claro
                 pintarEtapa(sInicioE, sFinE, 'E', 'FFFFF59D'); // Amarillo suave
                 pintarEtapa(sInicioC, sFin, 'C', 'FFA5D6A7'); // Verde claro
              } else {
                 // Sin las etapas intermedias se reparte el rango en 4-4-5,
                 // saltando también las semanas que no se programan.
                 const disponibles: SemanaVigencia[] = [];
                 for (let n = sInicio.numero; n <= sFin.numero; n++) {
                   const semana = semanasVigencia.find((s) => s.numero === n);
                   if (semana && !sinProgramar(semana)) disponibles.push(semana);
                 }
                 const totalSemanas = disponibles.length;
                 const cuentaP = Math.max(1, Math.round(totalSemanas * 4 / 13));
                 const cuentaE = Math.max(1, Math.round(totalSemanas * 4 / 13));

                 disponibles.forEach((semana, idx) => {
                   const colSemana = colDeSemana(semana.numero);
                   if (colSemana === null) return;
                   const cell = row.getCell(colSemana);
                   if (idx < cuentaP) {
                     cell.value = 'P';
                     cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBBDEFB' } };
                   } else if (idx < cuentaP + cuentaE) {
                     cell.value = 'E';
                     cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF59D' } };
                   } else {
                     cell.value = 'C';
                     cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA5D6A7' } };
                   }
                   cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF000000' } };
                   cell.alignment = { horizontal: 'center', vertical: 'middle' };
                 });
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
    worksheet.mergeCells(currentRow, 1, currentRow, totalCols);
    const fAct = worksheet.getCell(`A${currentRow}`);
    // Fecha en hora de Colombia: tomarla del ISO en UTC corría al día siguiente
    // las versiones generadas después de las 7 p. m.
    const fechaActualizado = new Date(opciones.fechaVersion || Date.now())
      .toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    fAct.value = opciones.version
      ? `Versión ${opciones.version} del Programa Anual - Actualizado el ${fechaActualizado}`
      : `Actualizado el ${fechaActualizado}`;
    fAct.font = { name: 'Arial', size: 9, bold: false };
    fAct.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    for (let c = 1; c <= totalCols; c++) {
      worksheet.getCell(currentRow, c).border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
    }
    currentRow++;

    renderSeccion('CONVENCIONES');

    // Filas Convenciones
    const renderConvencion = (texto: string, letra: string, color?: string) => {
       worksheet.mergeCells(currentRow, COL_PRIMERA_SEMANA, currentRow, totalCols);
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

       for (let c = 1; c <= totalCols; c++) {
         worksheet.getCell(currentRow, c).border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
       }
       currentRow++;
    };

    renderConvencion('ETAPA DE PLANEACIÓN', 'P', 'FFBBDEFB');
    renderConvencion('ETAPA DE EJECUCIÓN', 'E', 'FFFFF59D');
    renderConvencion('ETAPA DE INFORMACIÓN Y COMUNICACIÓN', 'C', 'FFA5D6A7');
    renderConvencion('SEMANA SANTA Y SEMANA DE RECESO (NO SE PROGRAMAN AUDITORÍAS)', '', 'FFFFC000');
    renderConvencion('SEMANA CON FESTIVO', '', 'FFE0F2F1');

    // Descargar
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    const nombreArchivo = opciones.version
      ? `PAI_${vigenciaActiva}_V${opciones.version}.xlsx`
      : `PAI_${vigenciaActiva}_Exportado.xlsx`;
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return {
      exito: true,
      nombreArchivo,
      mensaje: opciones.version
        ? `Programa Anual exportado (versión ${opciones.version}).`
        : `Plan Anual exportado con éxito.`
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
