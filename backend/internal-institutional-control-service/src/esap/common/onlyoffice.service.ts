import { Injectable } from '@nestjs/common';

/**
 * Configuración para el visor de OnlyOffice (EFDS-1080).
 *
 * OnlyOffice previsualiza cualquier formato de ofimática, así que se usa en vez
 * del preview propio, que solo entrega imágenes y PDF.
 *
 * Importante: el archivo lo descarga el contenedor de OnlyOffice, no el
 * navegador, por eso la URL debe ser alcanzable dentro de la red de Docker y
 * sin sesión (los endpoints /download de documentos y evidencias son públicos).
 */
@Injectable()
export class OnlyOfficeService {
  private readonly urlInterna: string;
  /**
   * Document Server visto desde este backend (misma red de Docker). En dev, QA,
   * pre y prod el servicio de compose se llama `onlyoffice`; en local solo
   * responde el nombre del contenedor, `onlyoffice-server`.
   */
  private readonly urlsDocumentServer: string[];

  constructor() {
    this.urlInterna =
      process.env.ONLYOFFICE_BACKEND_URL ||
      process.env.BACKEND_URL ||
      `http://internal-institutional-control-service:${process.env.PORT || 3007}`;
    this.urlsDocumentServer = (
      process.env.ONLYOFFICE_DOCSERVER_URL ? [process.env.ONLYOFFICE_DOCSERVER_URL] : ['http://onlyoffice', 'http://onlyoffice-server']
    ).map((u) => u.replace(/\/+$/, ''));
  }

  /** Llama al servicio de conversión en el primer Document Server que responda. */
  private async pedirConversion(cuerpo: Record<string, unknown>): Promise<any> {
    let ultimoError: unknown = null;
    for (const base of this.urlsDocumentServer) {
      // /converter es la ruta actual; /ConvertService.ashx la de versiones anteriores
      for (const ruta of ['/converter', '/ConvertService.ashx']) {
        let res: Response;
        try {
          res = await fetch(`${base}${ruta}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(cuerpo),
            signal: AbortSignal.timeout(90_000),
          });
        } catch (error) {
          // Ese nombre no existe en esta red: se prueba el siguiente
          ultimoError = error;
          break;
        }
        if (res.status === 404) continue;
        if (!res.ok) throw new Error(`OnlyOffice respondió ${res.status} al convertir`);
        return res.json();
      }
    }
    throw new Error(
      `No se encontró el servicio de conversión de OnlyOffice${ultimoError instanceof Error ? ` (${ultimoError.message})` : ''}`,
    );
  }

  /**
   * Convierte a PDF, con el servicio de conversión del Document Server, un archivo
   * que se sirve sin sesión en `rutaDescarga`. Las hojas de cálculo salen en
   * horizontal y ajustadas al ancho de la página (EFDS-2320: Programa Anual en PDF).
   */
  async convertirAPdf(rutaDescarga: string, clave: string, nombreArchivo: string): Promise<Buffer> {
    const extension = this.extension(nombreArchivo);
    const cuerpo: Record<string, unknown> = {
      async: false,
      filetype: extension,
      key: `${clave}`.replace(/[^0-9a-zA-Z_-]/g, '').slice(0, 128),
      outputtype: 'pdf',
      title: nombreArchivo,
      url: `${this.urlInterna}${rutaDescarga}`,
    };
    if (this.tipoDocumento(extension) === 'cell') {
      // El Programa Anual tiene 53 columnas de semanas: en A3 horizontal se lee entero
      cuerpo.spreadsheetLayout = {
        orientation: 'landscape',
        fitToWidth: 1,
        fitToHeight: 0,
        // OnlyOffice toma el tamaño en vertical y lo gira con `orientation`
        pageSize: { width: '297mm', height: '420mm' },
        margins: { left: '8mm', right: '8mm', top: '8mm', bottom: '8mm' },
      };
    }

    const respuesta = await this.pedirConversion(cuerpo);
    if (respuesta.error) throw new Error(`OnlyOffice no pudo convertir el documento (código ${respuesta.error})`);
    if (!respuesta.endConvert || !respuesta.fileUrl) throw new Error('OnlyOffice no terminó la conversión');

    const pdf = await fetch(String(respuesta.fileUrl), { signal: AbortSignal.timeout(60_000) });
    if (!pdf.ok) throw new Error(`No se pudo traer el PDF convertido (${pdf.status})`);
    return Buffer.from(await pdf.arrayBuffer());
  }

  /** Tipo de documento que espera OnlyOffice según la extensión del archivo. */
  private tipoDocumento(extension: string): 'word' | 'cell' | 'slide' | 'pdf' {
    if (['xls', 'xlsx', 'xlsm', 'csv', 'ods'].includes(extension)) return 'cell';
    if (['ppt', 'pptx', 'odp'].includes(extension)) return 'slide';
    if (extension === 'pdf') return 'pdf';
    return 'word';
  }

  /** Formatos que OnlyOffice puede abrir; el resto se resuelve con descarga. */
  puedePrevisualizar(nombreArchivo: string): boolean {
    const ext = this.extension(nombreArchivo);
    return [
      'doc', 'docx', 'docm', 'dot', 'dotx', 'odt', 'rtf', 'txt',
      'xls', 'xlsx', 'xlsm', 'csv', 'ods',
      'ppt', 'pptx', 'odp',
      'pdf',
    ].includes(ext);
  }

  private extension(nombreArchivo: string): string {
    return (nombreArchivo.split('.').pop() || '').toLowerCase();
  }

  /**
   * @param rutaDescarga ruta del endpoint público que entrega el archivo,
   *        por ejemplo `/evidencias/<id>/download`
   * @param clave identificador de la versión del archivo (cambia si el archivo cambia)
   * @param opciones.ajustarAlAncho abre el documento ajustado al ancho del visor
   */
  generarConfigVista(
    rutaDescarga: string,
    clave: string,
    nombreArchivo: string,
    usuario: { id: string; nombre: string },
    opciones: { ajustarAlAncho?: boolean } = {},
  ) {
    const extension = this.extension(nombreArchivo);

    return {
      documentType: this.tipoDocumento(extension),
      document: {
        title: nombreArchivo,
        url: `${this.urlInterna}${rutaDescarga}`,
        fileType: extension,
        key: `${clave}`.replace(/[^0-9a-zA-Z_-]/g, '').slice(0, 128),
        permissions: {
          edit: false,
          download: true,
          print: true,
          review: false,
          comment: false,
          fillForms: false,
        },
      },
      editorConfig: {
        mode: 'view',
        lang: 'es',
        user: { id: usuario.id, name: usuario.nombre },
        customization: {
          chat: false,
          comments: false,
          help: false,
          plugins: false,
          toolbarNoTabs: true,
          hideRightMenu: true,
          // -2 = ajustar al ancho (el Programa Anual en PDF es una hoja muy ancha)
          ...(opciones.ajustarAlAncho ? { zoom: -2 } : {}),
        },
      },
    };
  }
}
