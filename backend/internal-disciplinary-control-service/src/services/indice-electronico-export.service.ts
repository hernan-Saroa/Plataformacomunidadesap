import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';
import { resolveFrontendBaseUrl } from '../common/url-resolver.util';

// Campos de clasificación archivística (TRD/TVD) del proceso "Control Disciplinario" —
// según Gestión Documental (la misma fuente que alimenta las columnas J y K del FUID EI-FO-003):
export const TRD_UNIDAD_ADMINISTRATIVA = 'DESPACHO DE LA DIRECCIÓN NACIONAL';
export const TRD_UNIDAD_PRODUCTORA = 'OFICINA DE CONTROL INTERNO DISCIPLINARIO';
export const TRD_CODIGO_DEPENDENCIA = '150';
export const TRD_CODIGO_SERIE = '250';
export const TRD_NOMBRE_SERIE = 'PROCESOS JURÍDICOS';
export const TRD_SERIE = `${TRD_CODIGO_SERIE} – ${TRD_NOMBRE_SERIE}`;
export const TRD_CODIGO_SUBSERIE = '05';
export const TRD_NOMBRE_SUBSERIE = 'PROCESOS DISCIPLINARIOS';
export const TRD_SUBSERIE = `${TRD_CODIGO_SUBSERIE} – ${TRD_NOMBRE_SUBSERIE}`;
export const TRD_CODIGO_IDENTIFICACION_EXPEDIENTE = '12_150_250_05';
export const TRD_UBICACION_SOPORTE_FISICO = 'N/A';

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
  numeroExpediente?: string;
  codigoIdentificacionExpediente?: string;
  codigoDependencia?: string;
  nombreDependencia?: string;
  codigoSerie?: string;
  nombreSerie?: string;
  serie?: string;
  codigoSubserie?: string;
  nombreSubserie?: string;
  subserie?: string;
  tieneSubserie?: boolean;
  trdVersion?: string;
  fechaHechos?: string;
  fechaRadicacion?: string;
}

export interface TrdPeriodoInfo {
  version: string;
  nombre: string;
  periodo: string;
  tipo: 'TRD' | 'TVD';
  codigoDependencia: string;
  nombreDependencia: string;
  codigoSerie: string;
  nombreSerie: string;
  codigoSubserie: string;
  nombreSubserie: string;
  codigoIdentificacionExpediente: string;
}

export function resolverTrdPeriodo(
  fecha?: string | Date | null,
  radicado?: string,
  versionExplicit?: string,
): TrdPeriodoInfo {
  const vUpper = (versionExplicit || '').trim().toUpperCase();
  if (vUpper.includes('V1') || vUpper.includes('TVD')) {
    return {
      version: 'TRD V1',
      nombre: 'Tabla de Valoración Documental (TVD) - Periodo 1998 a 2006',
      periodo: '1998 a 2006',
      tipo: 'TVD',
      codigoDependencia: '1101',
      nombreDependencia: 'OFICINA DE CONTROL INTERNO DISCIPLINARIO',
      codigoSerie: '75',
      nombreSerie: 'PROCESOS',
      codigoSubserie: '01',
      nombreSubserie: 'PROCESOS DISCIPLINARIOS',
      codigoIdentificacionExpediente: '1101-75-01',
    };
  }
  if (vUpper.includes('V2')) {
    return {
      version: 'TRD V2',
      nombre: 'Tabla de Retención Documental (TRD) - Periodo 2007 a 2014',
      periodo: '2007 a 2014',
      tipo: 'TRD',
      codigoDependencia: '10200',
      nombreDependencia: 'OFICINA DE CONTROL INTERNO DISCIPLINARIO',
      codigoSerie: '68',
      nombreSerie: 'PROCESOS JURÍDICOS',
      codigoSubserie: '22',
      nombreSubserie: 'PROCESOS DISCIPLINARIOS',
      codigoIdentificacionExpediente: '10200.68.22',
    };
  }
  if (vUpper.includes('V3')) {
    return {
      version: 'TRD V3',
      nombre: 'Tabla de Retención Documental (TRD) - Periodo 2015 a 2020',
      periodo: '2015 a 2020',
      tipo: 'TRD',
      codigoDependencia: '130.2',
      nombreDependencia: 'OFICINA DE CONTROL INTERNO DISCIPLINARIO',
      codigoSerie: '1330',
      nombreSerie: 'PROCESOS JURÍDICOS',
      codigoSubserie: '60',
      nombreSubserie: 'PROCESOS DISCIPLINARIOS',
      codigoIdentificacionExpediente: '130.2.1330.60',
    };
  }
  if (vUpper.includes('V4')) {
    return {
      version: 'TRD V4',
      nombre: 'Tabla de Retención Documental (TRD) - Periodo 2021 a Actualidad',
      periodo: '2021 a Actualidad',
      tipo: 'TRD',
      codigoDependencia: '150',
      nombreDependencia: 'OFICINA DE CONTROL INTERNO DISCIPLINARIO',
      codigoSerie: '250',
      nombreSerie: 'PROCESOS JURÍDICOS',
      codigoSubserie: '05',
      nombreSubserie: 'PROCESOS DISCIPLINARIOS',
      codigoIdentificacionExpediente: '12_150_250_05',
    };
  }

  // Extraer año de la fecha o radicado
  let anio: number | null = null;
  if (fecha) {
    const d = new Date(fecha);
    if (!isNaN(d.getTime())) {
      anio = d.getFullYear();
    } else {
      const match = String(fecha).match(/\b(19\d\d|20\d\d)\b/);
      if (match) anio = parseInt(match[1], 10);
    }
  }
  if (!anio && radicado) {
    const match = String(radicado).match(/-(19\d\d|20\d\d)\b/);
    if (match) anio = parseInt(match[1], 10);
  }

  if (anio) {
    if (anio <= 2006) {
      return {
        version: 'TRD V1',
        nombre: 'Tabla de Valoración Documental (TVD) - Periodo 1998 a 2006',
        periodo: '1998 a 2006',
        tipo: 'TVD',
        codigoDependencia: '1101',
        nombreDependencia: 'OFICINA DE CONTROL INTERNO DISCIPLINARIO',
        codigoSerie: '75',
        nombreSerie: 'PROCESOS',
        codigoSubserie: '01',
        nombreSubserie: 'PROCESOS DISCIPLINARIOS',
        codigoIdentificacionExpediente: '1101-75-01',
      };
    }
    if (anio >= 2007 && anio <= 2014) {
      return {
        version: 'TRD V2',
        nombre: 'Tabla de Retención Documental (TRD) - Periodo 2007 a 2014',
        periodo: '2007 a 2014',
        tipo: 'TRD',
        codigoDependencia: '10200',
        nombreDependencia: 'OFICINA DE CONTROL INTERNO DISCIPLINARIO',
        codigoSerie: '68',
        nombreSerie: 'PROCESOS JURÍDICOS',
        codigoSubserie: '22',
        nombreSubserie: 'PROCESOS DISCIPLINARIOS',
        codigoIdentificacionExpediente: '10200.68.22',
      };
    }
    if (anio >= 2015 && anio <= 2020) {
      return {
        version: 'TRD V3',
        nombre: 'Tabla de Retención Documental (TRD) - Periodo 2015 a 2020',
        periodo: '2015 a 2020',
        tipo: 'TRD',
        codigoDependencia: '130.2',
        nombreDependencia: 'OFICINA DE CONTROL INTERNO DISCIPLINARIO',
        codigoSerie: '1330',
        nombreSerie: 'PROCESOS JURÍDICOS',
        codigoSubserie: '60',
        nombreSubserie: 'PROCESOS DISCIPLINARIOS',
        codigoIdentificacionExpediente: '130.2.1330.60',
      };
    }
  }

  return {
    version: 'TRD V4',
    nombre: 'Tabla de Retención Documental (TRD) - Periodo 2021 a Actualidad',
    periodo: '2021 a Actualidad',
    tipo: 'TRD',
    codigoDependencia: '150',
    nombreDependencia: 'OFICINA DE CONTROL INTERNO DISCIPLINARIO',
    codigoSerie: '250',
    nombreSerie: 'PROCESOS JURÍDICOS',
    codigoSubserie: '05',
    nombreSubserie: 'PROCESOS DISCIPLINARIOS',
    codigoIdentificacionExpediente: '12_150_250_05',
  };
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

    // Determinar instrumento archivístico (TRD/TVD) y periodo según fechas/radicado
    const infoPeriodo = resolverTrdPeriodo(
      expediente?.fechaHechos || expediente?.fechaRadicacion,
      expediente?.numeroExpediente || expediente?.radicado,
      expediente?.trdVersion,
    );

    const numeroExpediente = (expediente?.numeroExpediente || expediente?.radicado || '').trim();
    const codigoIdentificacion = (expediente?.codigoIdentificacionExpediente || infoPeriodo.codigoIdentificacionExpediente || TRD_CODIGO_IDENTIFICACION_EXPEDIENTE).trim();
    const instrumentoTexto = `${infoPeriodo.version} - ${infoPeriodo.tipo} (${infoPeriodo.periodo})`;

    // Fila 4: Mostrar Proceso e Instrumento Archivístico según fechas parametrizadas
    worksheet.getCell('A4').value = `Proceso: Efectividad Institucional | ${infoPeriodo.tipo}: ${infoPeriodo.version} (Periodo ${infoPeriodo.periodo})`;

    // Bloque de identificación:
    // NÚMERO DE EXPEDIENTE (P-XXXX-AAAA), CÓDIGO IDENTIFICACIÓN EXPEDIENTE e INSTRUMENTO ARCHIVÍSTICO
    const cellA6 = worksheet.getCell('A6');
    cellA6.value = `NÚMERO DE EXPEDIENTE: ${numeroExpediente}\nCÓDIGO IDENTIFICACIÓN EXPEDIENTE: ${codigoIdentificacion}\nINSTRUMENTO ARCHIVÍSTICO: ${instrumentoTexto}`;
    cellA6.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    worksheet.getRow(6).height = 42;

    worksheet.getCell('C6').value = `UNIDAD ADMINISTRATIVA: ${TRD_UNIDAD_ADMINISTRATIVA}`;

    // Unidad Productora con su código correspondiente:
    const codDep = (expediente?.codigoDependencia || infoPeriodo.codigoDependencia || TRD_CODIGO_DEPENDENCIA).trim();
    const nomDep = (expediente?.nombreDependencia || infoPeriodo.nombreDependencia || TRD_UNIDAD_PRODUCTORA).trim();
    worksheet.getCell('F6').value = `UNIDAD PRODUCTORA: ${codDep} – ${nomDep}`;

    // SERIE: [Código serie] – [Nombre serie]
    let serieTexto = '';
    if (expediente?.serie && expediente.serie.trim()) {
      serieTexto = expediente.serie.trim();
    } else if (expediente?.codigoSerie || expediente?.nombreSerie) {
      const cod = (expediente.codigoSerie || infoPeriodo.codigoSerie || TRD_CODIGO_SERIE).trim();
      const nom = (expediente.nombreSerie || infoPeriodo.nombreSerie || TRD_NOMBRE_SERIE).trim();
      serieTexto = cod ? `${cod} – ${nom}` : nom;
    } else {
      serieTexto = `${infoPeriodo.codigoSerie} – ${infoPeriodo.nombreSerie}`;
    }
    const cleanSerie = serieTexto.replace(/^SERIE:\s*/i, '').trim();
    worksheet.getCell('A7').value = `SERIE: ${cleanSerie}`;

    // SUBSERIE: [Código subserie] – [Nombre subserie]
    let subserieTexto = '';
    if (
      expediente?.tieneSubserie === false ||
      (expediente?.subserie &&
        (expediente.subserie.trim().toUpperCase() === 'N/A' ||
          expediente.subserie.trim().toUpperCase() === 'NO APLICA')) ||
      (expediente?.codigoSubserie &&
        (expediente.codigoSubserie.trim().toUpperCase() === 'N/A' ||
          expediente.codigoSubserie.trim().toUpperCase() === 'NO APLICA'))
    ) {
      subserieTexto = 'N/A';
    } else if (expediente?.subserie && expediente.subserie.trim()) {
      subserieTexto = expediente.subserie.trim();
    } else if (expediente?.codigoSubserie || expediente?.nombreSubserie) {
      const cod = (expediente.codigoSubserie || infoPeriodo.codigoSubserie || TRD_CODIGO_SUBSERIE).trim();
      const nom = (expediente.nombreSubserie || infoPeriodo.nombreSubserie || TRD_NOMBRE_SUBSERIE).trim();
      subserieTexto = cod ? `${cod} – ${nom}` : nom;
    } else {
      subserieTexto = `${infoPeriodo.codigoSubserie} – ${infoPeriodo.nombreSubserie}`;
    }
    const cleanSubserie = subserieTexto.replace(/^SUBSERIE:\s*/i, '').trim();
    worksheet.getCell('C7').value = cleanSubserie.toUpperCase() === 'N/A' ? 'SUBSERIE: N/A' : `SUBSERIE: ${cleanSubserie}`;

    // El expediente de este módulo es 100% electrónico (sin soporte físico) → siempre se marca NO.
    worksheet.getCell('E7').value = 'EXPEDIENTE HÍBRIDO:\n[  ] SI      [X] NO';
    worksheet.getCell('F7').value = `UBICACIÓN EXPEDIENTE EN SOPORTE FÍSICO: ${TRD_UBICACION_SOPORTE_FISICO} | INSTRUMENTO: ${infoPeriodo.version} (${infoPeriodo.periodo})`;
    worksheet.getCell('A8').value = `ASUNTO: ${expediente?.asunto || ''}`;
    worksheet.getCell('C8').value = expediente?.asunto || '';

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
          : resolveFrontendBaseUrl());

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
