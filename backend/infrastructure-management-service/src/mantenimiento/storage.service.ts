import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { join, dirname } from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  public readonly bucketDefault: string;
  public readonly endpointPublic: string;
  public readonly endpointPublicLegacy: string;
  public readonly uploadsDir: string;
  public readonly uploadPublicPrefix: string;

  constructor(private readonly config: ConfigService) {
    const port = parseInt(this.config.get<string>('PORT', '3014'), 10);
    const publicHost = this.config.get<string>('APP_PUBLIC_URL', `http://localhost:${port}`);
    this.endpointPublicLegacy = publicHost.replace(/\/$/, '');
    // URL publica por defecto: path relativo al Gateway Shell (mismo origin).
    // Cumple CSP img-src 'self' y evita Mixed Content en despliegues HTTPS.
    // El gateway NGINX Shell routea /services/ -> api-gateway:3000 -> microservicio por el prefix.
    this.uploadPublicPrefix = '/services/infraestructura/uploads';
    // Mantener endpointPublic como ruta base sin scheme/host para regenerar URLs de forma consistente
    this.endpointPublic = '';
    this.bucketDefault = this.config.get<string>(
      'MINIO_INFRAESTRUCTURA_BUCKET',
      'infraestructura-evidencias',
    );
    this.uploadsDir = this.config.get<string>(
      'UPLOADS_DIR',
      join(process.cwd(), 'uploads'),
    );

    this.inicializarBucketDefault().catch((err) =>
      this.logger.warn('No se pudo inicializar directorio de uploads: ' + (err as Error).message),
    );
  }

  /**
   * Asegura que el directorio raíz de uploads y la subcarpeta de mantenimiento existan automáticamente.
   */
  async inicializarBucketDefault(): Promise<void> {
    try {
      if (!fs.existsSync(this.uploadsDir)) {
        fs.mkdirSync(this.uploadsDir, { recursive: true });
      }
      const mantenimientoDir = join(this.uploadsDir, 'mantenimiento');
      if (!fs.existsSync(mantenimientoDir)) {
        fs.mkdirSync(mantenimientoDir, { recursive: true });
      }
      this.logger.log(`Directorio de uploads preparado automáticamente en: ${this.uploadsDir}`);
    } catch (err) {
      this.logger.error(`Error al asegurar directorio de almacenamiento local: ${(err as Error).message}`);
    }
  }

  /**
   * Obtiene la ruta absoluta en el sistema de archivos para una ruta de objeto relativa.
   */
  obtenerRutaAbsoluta(rutaObjeto: string): string {
    const normalizada = rutaObjeto.replace(/^[/\\]+/, '');
    return join(this.uploadsDir, normalizada);
  }

  /**
   * Sube/guarda un archivo (buffer Multer) en el almacenamiento local en disco.
   * Crea automáticamente cualquier subcarpeta necesaria.
   * Retorna metadata 100% compatible con la entidad y tabla solicitud_evidencia.
   */
  async subirArchivo(params: {
    rutaObjeto: string;
    buffer: Buffer;
    mimeType?: string;
    bucket?: string;
    nombrePublico?: string;
  }): Promise<{
    rutaObjeto: string;
    bucket: string;
    urlPublica: string;
    urlPresigned: string;
    vencimientoPresigned: Date;
  }> {
    const bucket = params.bucket ?? this.bucketDefault;
    const rutaAbsoluta = this.obtenerRutaAbsoluta(params.rutaObjeto);
    const carpetaContenedora = dirname(rutaAbsoluta);

    if (!fs.existsSync(carpetaContenedora)) {
      fs.mkdirSync(carpetaContenedora, { recursive: true });
    }

    await fs.promises.writeFile(rutaAbsoluta, params.buffer);

    const rutaRelativaNormalizada = params.rutaObjeto.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\//, '');
    // Path relativo bajo /services/infraestructura para que el Shell Gateway lo routee al backend
    // manteniendo mismo origin (img-src 'self' CSP valido, sin Mixed Content)
    const rutaEncoded = encodeURI(rutaRelativaNormalizada);
    const urlPublica = `${this.uploadPublicPrefix}/${rutaEncoded}`;
    // Almacenamiento local directo: la URL no expira, se proyecta a 10 años para consistencia en BD
    const vencimientoPresigned = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);
    const urlPresigned = urlPublica;

    return {
      rutaObjeto: params.rutaObjeto,
      bucket,
      urlPublica,
      urlPresigned,
      vencimientoPresigned,
    };
  }

  /**
   * Genera o retorna la URL pública/permanente de la evidencia.
   */
  async regenerarUrlPresigned(
    rutaObjeto: string,
    _bucket?: string,
    _expireSeconds = 604800,
  ): Promise<{ urlPresigned: string; vencimientoPresigned: Date }> {
    const rutaRelativaNormalizada = rutaObjeto.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\//, '');
    const urlPresigned = `${this.uploadPublicPrefix}/${encodeURI(rutaRelativaNormalizada)}`;
    return {
      urlPresigned,
      vencimientoPresigned: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Obtiene un ReadStream para streaming de archivo (utilizado en el empaquetado ZIP de evidencias).
   */
  obtenerStream(rutaObjeto: string): fs.ReadStream {
    const rutaAbsoluta = this.obtenerRutaAbsoluta(rutaObjeto);
    return fs.createReadStream(rutaAbsoluta);
  }

  /**
   * Verifica si el archivo existe físicamente en disco.
   */
  existeArchivo(rutaObjeto: string): boolean {
    const rutaAbsoluta = this.obtenerRutaAbsoluta(rutaObjeto);
    return fs.existsSync(rutaAbsoluta);
  }
}
