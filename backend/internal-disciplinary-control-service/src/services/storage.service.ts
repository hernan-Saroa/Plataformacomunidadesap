import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

interface FileData {
  buffer: Buffer;
  originalname: string;
}

@Injectable()
export class StorageService {
  private readonly uploadDir = './uploads/expedientes';

  /**
   * Guarda un archivo en disco local.
   * Renombra el archivo con formato YYYYMMDD_Tipo.ext
   */
  async saveFile(
    radicado: string,
    file: FileData,
    tipoDocumento: string,
  ): Promise<string> {
    try {
      const direccionExpediente = path.join(this.uploadDir, radicado);

      // Crear directorios si no existen
      await fs.mkdir(direccionExpediente, { recursive: true });

      // Generar nombre con formato YYYYMMDD_Tipo.ext
      const now = new Date();
      const fecha = now.toISOString().split('T')[0].replace(/-/g, '');
      const extension = path.extname(file.originalname);
      const nuevoNombre = `${fecha}_${tipoDocumento}${extension}`;
      const rutaCompleta = path.join(direccionExpediente, nuevoNombre);

      // Guardar archivo
      await fs.writeFile(rutaCompleta, file.buffer);

      // Retornar ruta relativa para almacenar en BD
      return path.join(radicado, nuevoNombre);
    } catch (error) {
      throw new Error(`Error al guardar archivo: ${error.message}`);
    }
  }

  /**
   * Guarda múltiples archivos
   */
  async saveMultipleFiles(
    radicado: string,
    files: FileData[],
  ): Promise<string[]> {
    const rutas: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const ruta = await this.saveFile(radicado, files[i], `DOCUMENTO_${i + 1}`);
      rutas.push(ruta);
    }

    return rutas;
  }

  /**
   * Obtiene la ruta completa de un archivo
   */
  getFullPath(rutaRelativa: string): string {
    return path.join(this.uploadDir, rutaRelativa);
  }

  /**
   * Elimina un archivo
   */
  async deleteFile(rutaRelativa: string): Promise<void> {
    try {
      const rutaCompleta = this.getFullPath(rutaRelativa);
      await fs.unlink(rutaCompleta);
    } catch (error) {
      throw new Error(`Error al eliminar archivo: ${error.message}`);
    }
  }

  /**
   * Elimina un directorio completo (expediente)
   */
  async deleteExpediente(radicado: string): Promise<void> {
    try {
      const rutaCompleta = path.join(this.uploadDir, radicado);
      await fs.rm(rutaCompleta, { recursive: true, force: true });
    } catch (error) {
      throw new Error(
        `Error al eliminar expediente: ${error.message}`,
      );
    }
  }
}
