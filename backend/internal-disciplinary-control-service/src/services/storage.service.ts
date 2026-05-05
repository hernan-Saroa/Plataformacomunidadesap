import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

interface FileData {
  buffer: Buffer;
  originalname: string;
}

export const DEFAULT_UPLOAD_DIR = './uploads';

export const ensureUploadDirExists = (uploadDir: string = DEFAULT_UPLOAD_DIR): string => {
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  return uploadDir;
};

export const buildStoredFileName = (originalname: string): string => {
  const safeOriginalName = path.basename(originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${Date.now()}_${randomUUID()}_${safeOriginalName}`;
};

@Injectable()
export class StorageService {
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(DEFAULT_UPLOAD_DIR);
    ensureUploadDirExists(this.uploadDir);
  }

  async saveFile(
    _radicado: string,
    file: FileData,
    _tipoDocumento: string,
  ): Promise<string> {
    try {
      const nuevoNombre = buildStoredFileName(file.originalname);
      const rutaCompleta = path.join(this.uploadDir, nuevoNombre);

      await fs.writeFile(rutaCompleta, file.buffer);

      return nuevoNombre;
    } catch (error) {
      throw new Error(`Error al guardar archivo: ${error.message}`);
    }
  }

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

  getFullPath(filename: string): string {
    const normalizedFilename = filename
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/^(files|uploads)\//, '');

    return path.resolve(this.uploadDir, normalizedFilename);
  }

  async deleteFile(filename: string): Promise<void> {
    try {
      const rutaCompleta = this.getFullPath(filename);
      await fs.unlink(rutaCompleta);
    } catch (error) {
      throw new Error(`Error al eliminar archivo: ${error.message}`);
    }
  }

  async deleteExpediente(_radicado: string): Promise<void> {
    console.log('deleteExpediente: Ya no se usa sistema de carpetas por radicado');
  }
}
