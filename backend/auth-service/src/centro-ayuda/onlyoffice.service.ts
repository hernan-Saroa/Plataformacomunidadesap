import { Injectable } from '@nestjs/common';

/**
 * Configuración del visor de OnlyOffice, igual a la de Control Interno
 * (EFDS-1080): la plataforma ya tiene OnlyOffice desplegado y abre cualquier
 * formato de ofimática.
 *
 * El archivo lo descarga el contenedor de OnlyOffice, no el navegador, así que
 * la URL debe ser alcanzable dentro de la red de Docker y sin sesión.
 */
@Injectable()
export class OnlyOfficeService {
  private readonly urlInterna: string;

  constructor() {
    this.urlInterna =
      process.env.ONLYOFFICE_BACKEND_URL ||
      process.env.BACKEND_URL ||
      `http://auth-service:${process.env.PORT || 3001}`;
  }

  private tipoDocumento(extension: string): 'word' | 'cell' | 'slide' | 'pdf' {
    if (['xls', 'xlsx', 'xlsm', 'csv', 'ods'].includes(extension)) return 'cell';
    if (['ppt', 'pptx', 'odp'].includes(extension)) return 'slide';
    if (extension === 'pdf') return 'pdf';
    return 'word';
  }

  puedePrevisualizar(nombreArchivo: string): boolean {
    return [
      'doc', 'docx', 'docm', 'dot', 'dotx', 'odt', 'rtf', 'txt',
      'xls', 'xlsx', 'xlsm', 'csv', 'ods',
      'ppt', 'pptx', 'odp',
      'pdf',
    ].includes(this.extension(nombreArchivo));
  }

  private extension(nombreArchivo: string): string {
    return (nombreArchivo.split('.').pop() || '').toLowerCase();
  }

  /**
   * @param rutaDescarga ruta pública que entrega el archivo
   * @param clave cambia cuando cambia el archivo, para que OnlyOffice no use su copia en caché
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
        key: clave.replace(/[^0-9a-zA-Z_-]/g, '').slice(0, 128),
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
