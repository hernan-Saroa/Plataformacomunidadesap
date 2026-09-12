import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

// Campos de clasificación archivística (TRD) del proceso "Control Disciplinario" —
// según Gestión Documental son fijos para todo expediente de este módulo, no dependen del caso.
const TRD_UNIDAD_ADMINISTRATIVA = 'DESPACHO DE LA DIRECCIÓN NACIONAL';
const TRD_UNIDAD_PRODUCTORA = 'OFICINA DE CONTROL INTERNO DISCIPLINARIO';
const TRD_SERIE = 'PROCESOS JURÍDICOS';
const TRD_SUBSERIE = 'PROCESOS DISCIPLINARIOS';
const TRD_CODIGO_IDENTIFICACION_EXPEDIENTE = '12_160_780_60';
const TRD_UBICACION_SOPORTE_FISICO = 'N/A';

const FIRST_DATA_ROW = 10;
const TEMPLATE_DATA_ROWS = 20; // filas 10-29 ya vienen numeradas y con bordes en la plantilla
const RESPONSABLES_TITLE_ROW = 30;

/**
 * Resuelve la ruta a un archivo de plantilla en entornos tanto de desarrollo (src) como compilados (dist).
 */
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

/**
 * Limpia identificadores únicos generados por el sistema (timestamp en ms y UUID)
 * para devolver el nombre final legible del archivo.
 * Ejemplo: 1789006090889_dde3901a-80dc-434a-9e96-7cd2b5b3cd6b_Formulario.docx -> Formulario.docx
 */
export function limpiarNombreArchivo(nombre?: string | null): string {
  if (!nombre || typeof nombre !== 'string') return '';

  let limpio = nombre.trim();

  // Si contiene rutas de carpetas (ej. uploads/... o dir/...)
  if (limpio.includes('/') || limpio.includes('\\')) {
    const lastPart = limpio.split(/[/\\]/).pop();
    if (lastPart && lastPart.includes('.')) {
      limpio = lastPart;
    }
  }

  // 1. Remover prefijo completo: timestamp_uuid_ (ej. 1789006090889_dde3901a-80dc-434a-9e96-7cd2b5b3cd6b_Nombre.docx)
  limpio = limpio.replace(
    /^\d{10,}_(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}|[0-9a-fA-F]{32})_/,
    '',
  );

  // 2. Remover prefijo solo uuid_ (ej. dde3901a-80dc-434a-9e96-7cd2b5b3cd6b_Nombre.docx)
  limpio = limpio.replace(
    /^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}|[0-9a-fA-F]{32})_/,
    '',
  );

  // 3. Remover prefijo solo timestamp_ (ej. 1789006090889_Nombre.docx)
  limpio = limpio.replace(/^\d{10,14}_/, '');

  return limpio;
}

export interface IndiceElectronicoDocumentoDto {
  descripcionPrincipal?: string;
  tipologiaDocumental?: string;
  anexos?: string;
  fechaCreacion?: string;
  fechaIncorporacion?: string;
  paginaInicio?: number | string;
  paginaFinal?: number | string;
  formato?: string;
  tamanoKB?: string;
  archivoAcceso?: string;
  urlAcceso?: string;
}

export interface IndiceElectronicoExpedienteDto {
  radicado: string;
  asunto?: string;
  responsable?: string;
}

@Injectable()
export class IndiceElectronicoExportService {
  async generar(
    expediente: IndiceElectronicoExpedienteDto,
    documentos: IndiceElectronicoDocumentoDto[],
  ): Promise<ExcelJS.Workbook> {
    const templatePath = resolveTemplateAssetPath('EI-FO-020.xlsx');
    const logoPath = resolveTemplateAssetPath('logo-esap.png');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.getWorksheet('Formato EI-FO-020');
    if (!worksheet) {
      throw new Error('La plantilla del Índice Electrónico (EI-FO-020) no tiene la hoja esperada');
    }

    // 1. Limpiar explícitamente celdas A1:B3 para eliminar cualquier error residual #VALC (#VALUE!)
    ['A1', 'B1', 'A2', 'B2', 'A3', 'B3'].forEach((cellAddr) => {
      const cell = worksheet.getCell(cellAddr);
      cell.value = null;
    });

    // 2. Reinsertar logo flotante sobre A1:B3
    if (fs.existsSync(logoPath)) {
      const logoImageId = workbook.addImage({
        buffer: fs.readFileSync(logoPath) as any,
        extension: 'png',
      });
      worksheet.addImage(logoImageId, 'A1:B3');
    }

    worksheet.getCell('A6').value = `CÓDIGO IDENTIFICACIÓN EXPEDIENTE: ${TRD_CODIGO_IDENTIFICACION_EXPEDIENTE}`;
    worksheet.getCell('C6').value = `UNIDAD ADMINISTRATIVA: ${TRD_UNIDAD_ADMINISTRATIVA}`;
    worksheet.getCell('F6').value = `UNIDAD PRODUCTORA: ${TRD_UNIDAD_PRODUCTORA}`;
    worksheet.getCell('A7').value = `SERIE: ${TRD_SERIE}`;
    worksheet.getCell('C7').value = `SUBSERIE: ${TRD_SUBSERIE}`;
    // El expediente de este módulo es 100% electrónico (sin soporte físico) → siempre se marca NO.
    worksheet.getCell('E7').value = 'EXPEDIENTE HÍBRIDO:\n[  ] SI      [X] NO';
    worksheet.getCell('F7').value = `UBICACIÓN EXPEDIENTE EN SOPORTE FÍSICO: ${TRD_UBICACION_SOPORTE_FISICO}`;
    worksheet.getCell('A8').value = `ASUNTO: ${expediente.asunto || ''}`;

    const extraRows = documentos.length - TEMPLATE_DATA_ROWS;
    if (extraRows > 0) {
      worksheet.duplicateRow(FIRST_DATA_ROW + TEMPLATE_DATA_ROWS - 1, extraRows, true);
    }

    // Ajustar ancho de columna K para facilitar visualización del acceso
    const colK = worksheet.getColumn('K');
    if (colK && (!colK.width || colK.width < 30)) {
      colK.width = 32;
    }

    documentos.forEach((doc, index) => {
      const r = FIRST_DATA_ROW + index;
      worksheet.getCell(`A${r}`).value = index + 1;

      // 3. DESCRIPCIÓN DEL DOCUMENTO PRINCIPAL: mostrar nombre final limpio sin números únicos
      const descLimpia = limpiarNombreArchivo(doc.descripcionPrincipal || '');
      worksheet.getCell(`B${r}`).value = descLimpia;

      worksheet.getCell(`C${r}`).value = doc.tipologiaDocumental || '';
      worksheet.getCell(`D${r}`).value = doc.anexos || '';
      worksheet.getCell(`E${r}`).value = doc.fechaCreacion || '';
      worksheet.getCell(`F${r}`).value = doc.fechaIncorporacion || '';
      worksheet.getCell(`G${r}`).value = doc.paginaInicio ?? '';
      worksheet.getCell(`H${r}`).value = doc.paginaFinal ?? '';
      worksheet.getCell(`I${r}`).value = doc.formato || '';
      worksheet.getCell(`J${r}`).value = doc.tamanoKB || '';

      // 4. ACCESO: hipervínculo funcional hacia el documento (conservando el nombre completo del archivo)
      const cellK = worksheet.getCell(`K${r}`);
      const nombreCompleto = (doc.archivoAcceso || '').trim();
      const textK = nombreCompleto || descLimpia || 'Ver documento';

      let linkUrl = '';
      const baseUrl =
        process.env.PUBLIC_APP_URL ||
        process.env.PUBLIC_API_URL ||
        (process.env.API_GATEWAY_URL && !process.env.API_GATEWAY_URL.includes('api-gateway:')
          ? process.env.API_GATEWAY_URL
          : 'http://localhost:4000');

      if (doc.urlAcceso && /^https?:\/\//i.test(doc.urlAcceso)) {
        linkUrl = doc.urlAcceso;
      } else if (doc.urlAcceso) {
        const cleanPath = doc.urlAcceso.startsWith('/') ? doc.urlAcceso : `/${doc.urlAcceso}`;
        linkUrl = cleanPath.startsWith('/control-disciplinario')
          ? `${baseUrl}${cleanPath}`
          : `${baseUrl}/control-disciplinario${cleanPath}`;
      } else if (nombreCompleto && /^https?:\/\//i.test(nombreCompleto)) {
        linkUrl = nombreCompleto;
      } else if (nombreCompleto) {
        linkUrl = `${baseUrl}/control-disciplinario/files/${encodeURIComponent(nombreCompleto)}`;
      }

      if (linkUrl) {
        cellK.value = {
          text: textK,
          hyperlink: linkUrl,
          tooltip: `Abrir documento: ${textK}`,
        };
        cellK.font = {
          name: 'Calibri',
          size: 9,
          color: { argb: 'FF0563C1' },
          underline: true,
        };
      } else {
        cellK.value = textK;
      }
    });

    const responsablesTitleRow = RESPONSABLES_TITLE_ROW + Math.max(0, extraRows);
    const nombreRow = responsablesTitleRow + 2;
    worksheet.getCell(`B${nombreRow}`).value = expediente.responsable || '';

    return workbook;
  }
}
