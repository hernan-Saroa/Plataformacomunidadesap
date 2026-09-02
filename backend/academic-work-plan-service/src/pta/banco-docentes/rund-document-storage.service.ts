import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { dirname, join, resolve, sep } from 'path';

export type StoredRundDocument = {
  provider: 'OPENKM' | 'LOCAL';
  storageId: string | null;
  storagePath: string;
};

@Injectable()
export class RundDocumentStorageService {
  private readonly logger = new Logger(RundDocumentStorageService.name);
  private readonly uploadsRoot = resolve(process.cwd(), 'uploads');

  private get openKmBaseUrl(): string | null {
    const value = String(process.env.OPENKM_BASE_URL || '').trim().replace(/\/$/, '');
    return value || null;
  }

  get provider(): 'OPENKM' | 'LOCAL' {
    return this.openKmBaseUrl ? 'OPENKM' : 'LOCAL';
  }

  private get localStorageAllowed(): boolean {
    const configured = String(process.env.RUND_DOCUMENT_ALLOW_LOCAL || '').trim().toLowerCase();
    if (configured) return configured === 'true';
    return String(process.env.NODE_ENV || 'development').toLowerCase() !== 'production';
  }

  async store(input: {
    content: Buffer;
    documentNumber: string;
    category: string;
    logicalId: string;
    version: number;
  }): Promise<StoredRundDocument> {
    const safeDocument = this.safeSegment(input.documentNumber || 'sin-documento');
    const safeCategory = this.safeSegment(input.category);
    const relativePath = `rund-documentos/${safeDocument}/${safeCategory}/${input.logicalId}/v${input.version}.pdf`;

    if (!this.openKmBaseUrl) {
      if (!this.localStorageAllowed) {
        throw new ServiceUnavailableException(
          'OpenKM es obligatorio en este ambiente y no está configurado.',
        );
      }
      const absolutePath = this.safeLocalPath(relativePath);
      await fs.mkdir(dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, input.content, { flag: 'wx' });
      return { provider: 'LOCAL', storageId: null, storagePath: relativePath };
    }

    const openKmPath = `/okm:root/RUND/${safeDocument}/${safeCategory}/${input.logicalId}/v${input.version}.pdf`;
    await this.ensureOpenKmFolders(openKmPath);
    const form = new FormData();
    form.append('docPath', openKmPath);
    form.append('content', new Blob([new Uint8Array(input.content)], { type: 'application/pdf' }), `v${input.version}.pdf`);
    await this.openKmRequest(
      'POST',
      '/services/rest/document/createSimple',
      form,
    );
    return { provider: 'OPENKM', storageId: openKmPath, storagePath: openKmPath };
  }

  async read(provider: string, storagePath: string): Promise<Buffer> {
    if (provider === 'OPENKM') {
      const response = await this.openKmRequest(
        'GET',
        `/services/rest/document/getContent?docId=${encodeURIComponent(storagePath)}`,
      );
      return Buffer.from(await response.arrayBuffer());
    }

    if (provider === 'LEGACY_LOCAL') {
      const relative = storagePath
        .replace(/^\/pta\/api\/v1\/uploads\//, '')
        .replace(/^\/uploads\//, '');
      return fs.readFile(this.safeLocalPath(relative));
    }

    return fs.readFile(this.safeLocalPath(storagePath));
  }

  async remove(provider: string, storagePath: string): Promise<void> {
    if (provider === 'OPENKM') {
      await this.openKmRequest(
        'DELETE',
        `/services/rest/document/delete?docId=${encodeURIComponent(storagePath)}`,
      );
      return;
    }

    const relative = provider === 'LEGACY_LOCAL'
      ? storagePath.replace(/^\/pta\/api\/v1\/uploads\//, '').replace(/^\/uploads\//, '')
      : storagePath;
    await fs.unlink(this.safeLocalPath(relative)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }

  private safeSegment(value: string): string {
    const normalized = String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return normalized || 'sin-clasificar';
  }

  private safeLocalPath(relativePath: string): string {
    const target = resolve(this.uploadsRoot, relativePath.replace(/^[/\\]+/, ''));
    if (target !== this.uploadsRoot && !target.startsWith(`${this.uploadsRoot}${sep}`)) {
      throw new Error('Ruta documental no permitida.');
    }
    return target;
  }

  private async ensureOpenKmFolders(documentPath: string): Promise<void> {
    const folderPath = documentPath.split('/').slice(0, -1).join('/');
    const parts = folderPath.split('/').filter(Boolean);
    let current = '';
    for (const part of parts) {
      current += `/${part}`;
      if (current === '/okm:root') continue;
      const response = await this.openKmRequest(
        'POST',
        '/services/rest/folder/createSimple',
        current,
        'application/json',
        true,
      );
      if (!response.ok) {
        const body = await response.text();
        if (!/exist|item.?exists/i.test(body)) {
          throw new ServiceUnavailableException(`OpenKM no pudo crear la carpeta documental: ${body || response.statusText}`);
        }
      }
    }
  }

  private async openKmRequest(
    method: string,
    endpoint: string,
    body?: BodyInit,
    contentType?: string,
    allowAlreadyExists = false,
  ): Promise<Response> {
    const baseUrl = this.openKmBaseUrl;
    if (!baseUrl) throw new ServiceUnavailableException('OpenKM no está configurado.');
    const username = String(process.env.OPENKM_USERNAME || '').trim();
    const password = String(process.env.OPENKM_PASSWORD || '');
    if (!username || !password) {
      throw new ServiceUnavailableException('Faltan las credenciales de OpenKM.');
    }

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: {
          Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
          ...(contentType ? { 'Content-Type': contentType } : {}),
        },
        body,
        signal: AbortSignal.timeout(Number(process.env.OPENKM_TIMEOUT_MS || 15000)),
      });
      if (!response.ok && !(allowAlreadyExists && response.status === 409)) {
        if (allowAlreadyExists) return response;
        const detail = await response.text();
        throw new Error(`${response.status} ${detail || response.statusText}`);
      }
      return response;
    } catch (error: any) {
      this.logger.error(`Fallo de integración OpenKM ${method} ${endpoint}: ${error?.message || error}`);
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(`No fue posible completar la operación en OpenKM: ${error?.message || error}`);
    }
  }
}
