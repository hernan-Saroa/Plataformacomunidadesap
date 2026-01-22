import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync, mkdirSync } from 'fs';

interface FileData {
  buffer: Buffer;
  originalname: string;
}

@Injectable()
export class StorageService {
  private readonly uploadDir = './uploads';

  constructor() {
    // Asegurar que el directorio existe
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Guarda un archivo en disco local.
   * Usa el nombre original del archivo con un prefijo de timestamp para evitar colisiones.
   * SIMPLIFICADO: Guarda en ./uploads/ directamente (igual que otros módulos)
   */
  async saveFile(
    _radicado: string, // Ya no se usa para carpetas
    file: FileData,
    _tipoDocumento: string, // Ya no se usa para renombrar
  ): Promise<string> {
    try {
      // Generar nombre único: timestamp + nombre original
      const timestamp = Date.now();
      const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const nuevoNombre = `${timestamp}_${safeOriginalName}`;
      const rutaCompleta = path.join(this.uploadDir, nuevoNombre);

      // Guardar archivo
      await fs.writeFile(rutaCompleta, file.buffer);

      // Retornar SOLO el nombre del archivo (para URL simple /files/{filename})
      return nuevoNombre;
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
    const nombres: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const nombre = await this.saveFile(radicado, files[i], `DOC_${i + 1}`);
      nombres.push(nombre);
    }

    return nombres;
  }

  /**
   * Obtiene la ruta completa de un archivo
   */
  getFullPath(filename: string): string {
    return path.join(this.uploadDir, filename);
  }

  /**
   * Elimina un archivo
   */
  async deleteFile(filename: string): Promise<void> {
    try {
      const rutaCompleta = this.getFullPath(filename);
      await fs.unlink(rutaCompleta);
    } catch (error) {
      throw new Error(`Error al eliminar archivo: ${error.message}`);
    }
  }

  /**
   * Elimina archivos por patrón (para limpiar archivos de un expediente)
   */
  async deleteExpediente(_radicado: string): Promise<void> {
    // Ya no usamos carpetas de expediente, así que este método no hace nada
    // Los archivos se mantienen en ./uploads/
    console.log('deleteExpediente: Ya no se usa sistema de carpetas por radicado');
  }
}
