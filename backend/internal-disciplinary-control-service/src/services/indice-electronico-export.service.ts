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

const TEMPLATE_PATH = path.join(__dirname, '..', '..', 'templates', 'indice-electronico', 'EI-FO-020.xlsx');
// El logo original está insertado con la función "Imagen en la celda" de Excel
// (Rich Data), que exceljs no soporta leer/escribir — al reescribir la plantilla el
// logo se pierde. Se reinserta como imagen flotante (sí soportada por exceljs) sobre
// las mismas celdas A1:B3.
const LOGO_PATH = path.join(__dirname, '..', '..', 'templates', 'indice-electronico', 'logo-esap.png');

const FIRST_DATA_ROW = 10;
const TEMPLATE_DATA_ROWS = 20; // filas 10-29 ya vienen numeradas y con bordes en la plantilla
const RESPONSABLES_TITLE_ROW = 30;

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
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(TEMPLATE_PATH);
    const worksheet = workbook.getWorksheet('Formato EI-FO-020');
    if (!worksheet) {
      throw new Error('La plantilla del Índice Electrónico (EI-FO-020) no tiene la hoja esperada');
    }

    if (fs.existsSync(LOGO_PATH)) {
      const logoImageId = workbook.addImage({
        buffer: fs.readFileSync(LOGO_PATH) as any,
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

    documentos.forEach((doc, index) => {
      const r = FIRST_DATA_ROW + index;
      worksheet.getCell(`A${r}`).value = index + 1;
      worksheet.getCell(`B${r}`).value = doc.descripcionPrincipal || '';
      worksheet.getCell(`C${r}`).value = doc.tipologiaDocumental || '';
      worksheet.getCell(`D${r}`).value = doc.anexos || '';
      worksheet.getCell(`E${r}`).value = doc.fechaCreacion || '';
      worksheet.getCell(`F${r}`).value = doc.fechaIncorporacion || '';
      worksheet.getCell(`G${r}`).value = doc.paginaInicio ?? '';
      worksheet.getCell(`H${r}`).value = doc.paginaFinal ?? '';
      worksheet.getCell(`I${r}`).value = doc.formato || '';
      worksheet.getCell(`J${r}`).value = doc.tamanoKB || '';
      worksheet.getCell(`K${r}`).value = doc.archivoAcceso || '';
    });

    const responsablesTitleRow = RESPONSABLES_TITLE_ROW + Math.max(0, extraRows);
    const nombreRow = responsablesTitleRow + 2;
    worksheet.getCell(`B${nombreRow}`).value = expediente.responsable || '';

    return workbook;
  }
}
