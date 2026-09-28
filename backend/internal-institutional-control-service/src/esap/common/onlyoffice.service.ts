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

  constructor() {
    this.urlInterna =
      process.env.ONLYOFFICE_BACKEND_URL ||
      process.env.BACKEND_URL ||
      `http://internal-institutional-control-service:${process.env.PORT || 3007}`;
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
   */
  generarConfigVista(
    rutaDescarga: string,
    clave: string,
    nombreArchivo: string,
    usuario: { id: string; nombre: string },
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
        },
      },
    };
  }
}
