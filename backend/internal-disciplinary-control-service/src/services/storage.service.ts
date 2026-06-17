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

export const getUploadRootDir = (): string =>
  process.env.DISCIPLINARY_STORAGE_PATH ||
  process.env.FILES_UPLOAD_BASE_PATH ||
  process.env.UPLOAD_DIR ||
  DEFAULT_UPLOAD_DIR;

export const ensureUploadDirExists = (uploadDir: string = getUploadRootDir()): string => {
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  return uploadDir;
};

export const sanitizeProcessFolderName = (radicadoProceso?: string): string | null => {
  const sanitized = radicadoProceso
    ?.trim()
    .replace(/[\\/]+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return sanitized || null;
};

export const getProcessYearFolderName = (radicadoProceso?: string): string | null => {
  const processFolder = sanitizeProcessFolderName(radicadoProceso);
  const year = processFolder?.split('-').at(-1);

  return year && /^\d{4}$/.test(year) ? year : null;
};

export const getProcessUploadDir = (radicadoProceso?: string): string => {
  const processFolder = sanitizeProcessFolderName(radicadoProceso);
  if (!processFolder) {
    return path.resolve(getUploadRootDir());
  }

  const yearFolder = getProcessYearFolderName(processFolder);
  return yearFolder
    ? path.resolve(getUploadRootDir(), yearFolder, processFolder)
    : path.resolve(getUploadRootDir(), processFolder);
};

export const getProcessStorageRelativePath = (
  radicadoProceso: string | undefined,
  filename: string,
): string => {
  const safeFilename = path.basename(filename);
  const processFolder = sanitizeProcessFolderName(radicadoProceso);
  if (!processFolder) {
    return safeFilename;
  }

  const yearFolder = getProcessYearFolderName(processFolder);
  return yearFolder
    ? path.join(yearFolder, processFolder, safeFilename)
    : path.join(processFolder, safeFilename);
};

export const buildStoredFileName = (originalname: string): string => {
  const safeOriginalName = path.basename(originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${Date.now()}_${randomUUID()}_${safeOriginalName}`;
};

@Injectable()
export class StorageService {
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(getUploadRootDir());
    ensureUploadDirExists(this.uploadDir);
  }

  async saveFile(
    _radicado: string,
    file: FileData,
    _tipoDocumento: string,
  ): Promise<string> {
    try {
      const nuevoNombre = buildStoredFileName(file.originalname);
      const uploadDir = getProcessUploadDir(_radicado);
      ensureUploadDirExists(uploadDir);
      const rutaCompleta = path.join(uploadDir, nuevoNombre);

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
