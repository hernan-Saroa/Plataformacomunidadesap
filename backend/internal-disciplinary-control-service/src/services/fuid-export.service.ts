import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';
import { resolveFrontendBaseUrl } from '../common/url-resolver.util';

// Clasificación archivística institucional (ESAP - Control Disciplinario)
export const FUID_ENTIDAD_PRODUCTORA = 'ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA (ESAP)';
export const FUID_PERIODO_INSTITUCIONAL = 'TRD V4';
export const FUID_UNIDAD_ADMINISTRATIVA = 'DESPACHO DE LA DIRECCIÓN NACIONAL';
export const FUID_OFICINA_PRODUCTORA = 'OFICINA DE CONTROL INTERNO DISCIPLINARIO';
export const FUID_CODIGO_OFICINA = 150;
export const FUID_OBJETO = 'Inventario Archivo de Gestión';
export const FUID_CODIGO_CCDU = '250';
export const FUID_CODIGO_SERIE_TVD = '250';
export const FUID_SERIE = 'PROCESOS JURÍDICOS';
export const FUID_SUBSERIE = 'PROCESOS DISCIPLINARIOS';

const FIRST_DATA_ROW = 13;
const TEMPLATE_CAPACITY_ROWS = 99; // Filas 13 a 111 reservadas en la plantilla original
const TEMPLATE_PIE_START_ROW = 112;
const FUID_DATA_FONT_SIZE = 11;
const FUID_DATA_COLUMNS = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB'];

function resolveTemplateAssetPath(filename: string): string {
  const candidates = [
    path.join(__dirname, '..', '..', 'templates', 'indice-electronico', filename),
    path.join(__dirname, '..', 'templates', 'indice-electronico', filename),
    path.join(__dirname, 'templates', 'indice-electronico', filename),
    path.join(process.cwd(), 'src', 'templates', 'indice-electronico', filename),
    path.join(process.cwd(), 'dist', 'templates', 'indice-electronico', filename),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

export interface FuidItemDto {
  radicado: string;
  nombreDisciplinado?: string;
  asunto?: string;
  descriptorIdentificacion?: string;
  fechaExtremaInicial?: string; // Formato esperado: AAAA/MM/DD
  fechaExtremaFinal?: string;   // Formato esperado: AAAA/MM/DD
  codigoCCDU?: string;
  codigoSerieTVD?: string;
  codigoSerie?: string;
  nombreSerie?: string;
  serie?: string;
  codigoSubserie?: string;
  nombreSubserie?: string;
  subserie?: string;
  ubicacion?: string;
  cantidadDocumentos?: number;
  tamanoDocumentos?: string;
  notas?: string; // Estado del expediente (Indagación, Valoración, Finalizado, etc.)
  /**
   * Indica si el proceso está cerrado (finalizado/archivado). Si es `false`, el proceso
   * sigue activo y la Fecha Extrema Final y el Descriptor de identificación quedan vacíos.
   * Si no se envía, se conserva el comportamiento anterior (se asume cerrado).
   */
  cerrado?: boolean;
}

export interface FuidHeaderDto {
  unidadAdministrativa?: string;
  oficinaProductora?: string;
  codigoOficina?: string | number;
  periodo?: string;
  objeto?: string;
  elaboradoPor?: string;
  cargoElaboradoPor?: string;
}

@Injectable()
export class FuidExportService {
  async generar(
    items: FuidItemDto[],
    header?: FuidHeaderDto,
  ): Promise<ExcelJS.Workbook> {
    const templatePath = resolveTemplateAssetPath('EI-FO-003.xlsx');
    if (!fs.existsSync(templatePath)) {
      throw new Error(`No se encontró la plantilla oficial FUID (EI-FO-003.xlsx) en ${templatePath}`);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    const worksheet = workbook.getWorksheet('TVD PERIODO 1') || workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('La plantilla del FUID (EI-FO-003) no tiene la hoja TVD PERIODO 1');
    }

    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const anio = String(hoy.getFullYear());
    const fechaActualFormato = `${dia}/${mes}/${anio}`;

    // 1. Encabezado institucional (filas 1 a 6)
    worksheet.getCell('X3').value = `FECHA: ${fechaActualFormato}`;
    worksheet.getCell('E5').value = FUID_ENTIDAD_PRODUCTORA;
    worksheet.getCell('H5').value = header?.periodo || FUID_PERIODO_INSTITUCIONAL;
    worksheet.getCell('J5').value = header?.unidadAdministrativa || FUID_UNIDAD_ADMINISTRATIVA;
    worksheet.getCell('J6').value = header?.oficinaProductora || FUID_OFICINA_PRODUCTORA;
    worksheet.getCell('O6').value = header?.codigoOficina ?? FUID_CODIGO_OFICINA;
    worksheet.getCell('E6').value = header?.objeto || FUID_OBJETO;

    // 2. Si son más expedientes que los 99 que la plantilla reserva (filas 13 a 111),
    // duplicamos la fila 111 para desplazar el pie sin sobrescribir las firmas.
    const totalExpedientes = items.length;
    const extraRows = Math.max(0, totalExpedientes - TEMPLATE_CAPACITY_ROWS);
    if (extraRows > 0) {
      worksheet.duplicateRow(111, extraRows, true);
    }

    const pieStartRow = TEMPLATE_PIE_START_ROW + extraRows;

    // 3. Rellenar filas de detalle
    const baseUrl =
      process.env.PUBLIC_APP_URL ||
      process.env.PUBLIC_API_URL ||
      (process.env.API_GATEWAY_URL && !process.env.API_GATEWAY_URL.includes('api-gateway:')
        ? process.env.API_GATEWAY_URL
        : resolveFrontendBaseUrl());

    items.forEach((item, index) => {
      const r = FIRST_DATA_ROW + index;

      // Col B: Consecutivo (1 en fila 13, fórmula B{r-1}+1 en subsecuentes)
      if (r === FIRST_DATA_ROW) {
        worksheet.getCell(`B${r}`).value = 1;
      } else {
        worksheet.getCell(`B${r}`).value = { formula: `B${r - 1}+1`, result: index + 1 };
      }

      // Col C: Periodo institucional (=H5 en fila 13, =C{r-1} en subsecuentes)
      if (r === FIRST_DATA_ROW) {
        worksheet.getCell(`C${r}`).value = { formula: 'H5', result: FUID_PERIODO_INSTITUCIONAL };
      } else {
        worksheet.getCell(`C${r}`).value = { formula: `C${r - 1}`, result: FUID_PERIODO_INSTITUCIONAL };
      }

      // Col D: Identificación de la unidad documental (P-###-AAAA)
      worksheet.getCell(`D${r}`).value = item.radicado;

      // Col E: Nombre de la unidad documental
      worksheet.getCell(`E${r}`).value = `Expediente ${item.radicado}`;

      // Un proceso activo (no cerrado) aún no tiene fecha final ni descriptor definitivo
      const procesoCerrado = item.cerrado !== false;

      // Col F: Descriptor de identificación (NED / Asunto) — vacío si el proceso sigue activo
      const descriptor = procesoCerrado
        ? (item.descriptorIdentificacion ||
          (item.nombreDisciplinado ? `NED: ${item.nombreDisciplinado}` : (item.asunto || 'Expediente Disciplinario')))
        : '';
      worksheet.getCell(`F${r}`).value = descriptor;

      // Col G / H: Fechas extremas inicial / final (AAAA/MM/DD) — final vacía si el proceso sigue activo
      worksheet.getCell(`G${r}`).value = item.fechaExtremaInicial || '';
      worksheet.getCell(`H${r}`).value = procesoCerrado
        ? (item.fechaExtremaFinal || item.fechaExtremaInicial || '')
        : '';

      // Col I: Código CCDU
      const codCCDU = String(item.codigoCCDU || item.codigoSerie || FUID_CODIGO_CCDU).trim();
      worksheet.getCell(`I${r}`).value = codCCDU;

      // Col J: Código serie TVD
      const codSerieTVD = String(item.codigoSerieTVD || item.codigoSerie || codCCDU || FUID_CODIGO_SERIE_TVD).trim();
      worksheet.getCell(`J${r}`).value = codSerieTVD;

      // Col K: Serie con número correspondiente
      let serieTexto = (item.serie || item.nombreSerie || FUID_SERIE).trim();
      const codParaSerie = codSerieTVD || codCCDU || FUID_CODIGO_SERIE_TVD;
      if (codParaSerie && !new RegExp(`^${codParaSerie.replace('.', '\\.')}\\s*[-–]`, 'i').test(serieTexto)) {
        serieTexto = `${codParaSerie} – ${serieTexto}`;
      }
      worksheet.getCell(`K${r}`).value = serieTexto;

      // Col L: Subserie con número correspondiente
      let subserieTexto = (item.subserie || item.nombreSubserie || FUID_SUBSERIE).trim();
      const codParaSubserie = String(
        item.codigoSubserie ||
        (codParaSerie === '1330' ? '60' : codParaSerie === '68' ? '22' : codParaSerie === '75' ? '01' : '05'),
      ).trim();
      if (subserieTexto.toUpperCase() === 'N/A' || subserieTexto.toUpperCase() === 'NO APLICA') {
        subserieTexto = 'N/A';
      } else if (codParaSubserie && !new RegExp(`^${codParaSubserie.replace('.', '\\.')}\\s*[-–]`, 'i').test(subserieTexto)) {
        subserieTexto = `${codParaSubserie} – ${subserieTexto}`;
      }
      worksheet.getCell(`L${r}`).value = subserieTexto;

      // Col M / N: Soporte Físico / Electrónico (X en electrónico)
      worksheet.getCell(`M${r}`).value = null;
      worksheet.getCell(`N${r}`).value = 'X';

      // Col O a T: Conservación física (vacío para electrónico)
      for (const colLetter of ['O', 'P', 'Q', 'R', 'S', 'T']) {
        worksheet.getCell(`${colLetter}${r}`).value = null;
      }

      // Col U: Ubicación (URL del expediente en la plataforma)
      const expUrl = item.ubicacion || `${baseUrl}/control-disciplinario/expedientes?radicado=${encodeURIComponent(item.radicado)}`;
      const cellU = worksheet.getCell(`U${r}`);
      cellU.value = {
        text: expUrl,
        hyperlink: expUrl,
        tooltip: `Abrir expediente ${item.radicado}`,
      };
      cellU.font = {
        name: 'Arial',
        size: FUID_DATA_FONT_SIZE,
        color: { argb: 'FF0563C1' },
        underline: false,
      };

      // Col V: Cantidad de documentos electrónicos
      worksheet.getCell(`V${r}`).value = item.cantidadDocumentos ?? 0;

      // Col W: Tamaño de los documentos electrónicos
      worksheet.getCell(`W${r}`).value = item.tamanoDocumentos || '0 KB';

      // Col X: Notas / observaciones (Estado del expediente)
      worksheet.getCell(`X${r}`).value = item.notas || '';

      // Col AB: Rótulo (vacío)
      worksheet.getCell(`AB${r}`).value = null;

      // Fuente legible: tamaño 11 y sin subrayado en todas las celdas de detalle
      for (const col of FUID_DATA_COLUMNS) {
        if (col === 'U') continue; // ya configurada arriba (hipervínculo)
        const cell = worksheet.getCell(`${col}${r}`);
        cell.font = {
          ...(cell.font || {}),
          size: FUID_DATA_FONT_SIZE,
          underline: false,
        };
      }
    });

    // 4. Limpiar filas restantes de la reserva de 100 que no tengan datos (limpiar D..AB, conservando fórmulas en B y C)
    const lastFilledRow = FIRST_DATA_ROW + totalExpedientes - 1;
    for (let r = lastFilledRow + 1; r < pieStartRow; r++) {
      ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB'].forEach((col) => {
        const c = worksheet.getCell(`${col}${r}`);
        if (c.value !== null) {
          c.value = null;
        }
      });
    }

    // 5. Pie de página y firmas (ELABORADO POR, cargo y fecha)
    const elaboradoTexto = header?.elaboradoPor
      ? `ELABORADO POR: ${header.elaboradoPor.trim()}`
      : 'ELABORADO POR: ';
    worksheet.getCell(`B${pieStartRow}`).value = elaboradoTexto;

    if (header?.cargoElaboradoPor) {
      worksheet.getCell(`E${pieStartRow + 1}`).value = header.cargoElaboradoPor;
    }

    worksheet.getCell(`B${pieStartRow + 4}`).value = `FECHA: ${fechaActualFormato}`;

    // 6. Eliminar definiciones de tablas de las hojas auxiliares
    // ExcelJS tiene un bug conocido al re-serializar tablas (/xl/tables/table*.xml)
    // omitiendo atributos requeridos y provocando la advertencia de reparación de Excel.
    // Al limpiar ws.tables se conservan intactos todos los datos, fórmulas, estilos y celdas
    // pero se evita la generación de los archivos XML de tabla defectuosos.
    for (const ws of workbook.worksheets) {
      const anyWs = ws as any;
      if (anyWs.tables) {
        for (const tableName of Object.keys(anyWs.tables)) {
          delete anyWs.tables[tableName];
        }
      }
    }

    return workbook;
  }
}
