import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { dirname, resolve, sep } from 'path';
import { RUND_STANDARD_FOLDERS, rundDocumentFolder } from './rund-expediente';
import { createHash } from 'crypto';
import { requireRundDocumental, rundDocumentalEnabled } from './rund-documental-feature';

export type StoredRundDocument = {
  provider: 'OPENKM' | 'LOCAL';
  storageId: string | null;
  storagePath: string;
};

@Injectable()
export class RundDocumentStorageService {
  private readonly logger = new Logger(RundDocumentStorageService.name);
  private readonly uploadsRoot = resolve((rundDocumentalEnabled() && process.env.RUND_DOCUMENT_LOCAL_ROOT) || resolve(process.cwd(), 'uploads'));

  private get openKmBaseUrl(): string | null {
    const value = String(process.env.OPENKM_BASE_URL || '').trim().replace(/\/$/, '');
    return value || null;
  }

  get provider(): 'OPENKM' | 'LOCAL' {
    if (!rundDocumentalEnabled()) return this.openKmBaseUrl ? 'OPENKM' : 'LOCAL';
    const mode = String(process.env.RUND_DOCUMENT_PROVIDER || 'AUTO').trim().toUpperCase();
    if (!['AUTO', 'OPENKM', 'LOCAL'].includes(mode)) throw new ServiceUnavailableException('Proveedor documental mal configurado.');
    if (mode !== 'AUTO') return mode as 'OPENKM' | 'LOCAL';
    return this.openKmBaseUrl ? 'OPENKM' : 'LOCAL';
  }

  configurationStatus() {
    const provider = this.provider;
    const pending = provider === 'OPENKM'
      ? ['OPENKM_BASE_URL', 'OPENKM_USERNAME', 'OPENKM_PASSWORD'].filter(key => !process.env[key]?.trim())
      : this.localStorageAllowed ? [] : ['RUND_DOCUMENT_ALLOW_LOCAL'];
    return { proveedor: provider, escrituraConfigurada: pending.length === 0, conexionVerificada: false,
      almacenamientoProvisional: provider === 'LOCAL', pendientes: pending };
  }

  private get localStorageAllowed(): boolean {
    const configured = String(process.env.RUND_DOCUMENT_ALLOW_LOCAL || '').trim().toLowerCase();
    if (configured) return configured === 'true';
    const environment = String(process.env.NODE_ENV || 'development').toLowerCase();
    return rundDocumentalEnabled() ? ['development', 'test'].includes(environment) : environment !== 'production';
  }

  /** Repetible: completa también expedientes parcialmente creados tras un fallo. */
  async ensureExpediente(expedienteId: string): Promise<void> {
    requireRundDocumental();
    const id = this.requireSegment(expedienteId);
    if (this.provider === 'LOCAL') {
      this.assertLocalStorageAllowed();
      for (const folder of RUND_STANDARD_FOLDERS) {
        await fs.mkdir(this.safeLocalPath(`rund-documentos/expedientes/${id}/${folder}`), { recursive: true });
      }
      return;
    }
    const root = `/okm:root/RUND/expedientes/${id}`;
    await this.ensureOpenKmFolders(root);
    for (const folder of RUND_STANDARD_FOLDERS) await this.ensureOpenKmFolder(`${root}/${folder}`);
  }

  async store(input: {
    content: Buffer;
    expedienteId: string;
    documentNumber?: string;
    category: string;
    supportType?: string;
    logicalId: string;
    version: number;
    mimeType?: string;
  }): Promise<StoredRundDocument> {
    if (!rundDocumentalEnabled()) return this.storeExistingDocument(input);
    const expedienteId = this.requireSegment(input.expedienteId);
    const logicalId = this.requireSegment(input.logicalId);
    const safeCategory = this.requireSegment(rundDocumentFolder(input.category, input.supportType));
    if (!Number.isSafeInteger(input.version) || input.version < 1) throw new BadRequestException('Versión documental inválida.');
    const mimeType = input.mimeType || 'application/pdf';
    const extension = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' }[mimeType];
    if (!extension) throw new BadRequestException('Formato documental no permitido.');
    const fileName = `v${input.version}.${extension}`;
    const relativePath = `rund-documentos/expedientes/${expedienteId}/${safeCategory}/${logicalId}/${fileName}`;
    await this.ensureExpediente(expedienteId);

    if (this.provider === 'LOCAL') {
      const absolutePath = this.safeLocalPath(relativePath);
      await fs.mkdir(dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, input.content, { flag: 'wx' });
      return { provider: 'LOCAL', storageId: null, storagePath: relativePath };
    }

    const openKmPath = `/okm:root/RUND/expedientes/${expedienteId}/${safeCategory}/${logicalId}/${fileName}`;
    const categoryPath = `/okm:root/RUND/expedientes/${expedienteId}/${safeCategory}`;
    if (!(RUND_STANDARD_FOLDERS as readonly string[]).includes(safeCategory)) {
      await this.ensureOpenKmFolder(categoryPath);
    }
    await this.ensureOpenKmFolder(`${categoryPath}/${logicalId}`);
    const form = new FormData();
    form.append('docPath', openKmPath);
    form.append('content', new Blob([new Uint8Array(input.content)], { type: mimeType }), fileName);
    const response = await this.openKmRequest(
      'POST',
      '/services/rest/document/createSimple',
      form,
    );
    await this.verifyReturnedPath(response, openKmPath);
    return { provider: 'OPENKM', storageId: openKmPath, storagePath: openKmPath };
  }

  /** Copia recuperable: nunca sobrescribe ni borra una fuente o un destino. */
  async copyVerifiedToOpenKm(input: Parameters<RundDocumentStorageService['store']>[0]): Promise<StoredRundDocument> {
    requireRundDocumental();
    if (this.provider !== 'OPENKM') throw new ServiceUnavailableException('Seleccione OPENKM para migrar documentos.');
    const folder = this.requireSegment(rundDocumentFolder(input.category, input.supportType));
    const extension = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' }[input.mimeType || 'application/pdf'];
    if (!extension || !Number.isSafeInteger(input.version) || input.version < 1) throw new BadRequestException('Documento no migrable.');
    const path = `/okm:root/RUND/expedientes/${this.requireSegment(input.expedienteId)}/${folder}/${this.requireSegment(input.logicalId)}/v${input.version}.${extension}`;
    const digest = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex');
    const verify = async (): Promise<boolean> => {
      const response = await this.openKmRequest('GET', `/services/rest/document/getContent?docId=${encodeURIComponent(path)}`, undefined, undefined, false, true);
      if (response.status === 404) return false;
      const remote = Buffer.from(await response.arrayBuffer());
      if (remote.length !== input.content.length || digest(remote) !== digest(input.content)) {
        throw new ServiceUnavailableException('El destino existe con contenido diferente. Se conserva sin cambios.');
      }
      return true;
    };
    if (!await verify()) {
      try { await this.store(input); }
      catch (error) {
        // Un timeout puede ocurrir después de que OpenKM persista el archivo.
        if (!await verify()) throw error;
      }
      if (!await verify()) throw new ServiceUnavailableException('No fue posible verificar la copia documental.');
    }
    return { provider: 'OPENKM', storageId: path, storagePath: path };
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

    if (provider !== 'LOCAL') throw new ServiceUnavailableException('Proveedor documental desconocido.');
    return fs.readFile(this.safeLocalPath(storagePath));
  }

  async readVerifiedLocal(provider: string, storagePath: string, checksum: string, size: number): Promise<Buffer> {
    if (!['LOCAL', 'LEGACY_LOCAL'].includes(provider) || !/^[a-f0-9]{64}$/i.test(checksum || '') || !Number.isSafeInteger(size) || size <= 0) {
      throw new BadRequestException('La fuente no tiene metadatos verificables para migrar.');
    }
    const relative = provider === 'LEGACY_LOCAL'
      ? storagePath.replace(/^\/pta\/api\/v1\/uploads\//, '').replace(/^\/uploads\//, '') : storagePath;
    if (!/^(rund-documentos|carpeta-digital)\//.test(relative) || /[%\\?#\x00-\x1f]/.test(relative)) throw new BadRequestException('Ruta de origen no migrable.');
    const root = await fs.realpath(this.uploadsRoot);
    const path = await fs.realpath(this.safeLocalPath(relative));
    if (!path.startsWith(`${root}${sep}`)) throw new BadRequestException('La fuente sale del almacenamiento permitido.');
    const buffer = await fs.readFile(path);
    if (buffer.length !== size || createHash('sha256').update(buffer).digest('hex') !== checksum.toLowerCase()) {
      throw new BadRequestException('La huella o el tamaño de la fuente no coinciden.');
    }
    return buffer;
  }

  async remove(provider: string, storagePath: string): Promise<void> {
    if (provider === 'OPENKM') {
      await this.openKmRequest(
        'DELETE',
        `/services/rest/document/delete?docId=${encodeURIComponent(storagePath)}`,
      );
      return;
    }

    if (!['LOCAL', 'LEGACY_LOCAL'].includes(provider)) throw new ServiceUnavailableException('Proveedor documental desconocido.');
    const relative = provider === 'LEGACY_LOCAL'
      ? storagePath.replace(/^\/pta\/api\/v1\/uploads\//, '').replace(/^\/uploads\//, '')
      : storagePath;
    await fs.unlink(this.safeLocalPath(relative)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }

  /** Mantiene las rutas y selección de proveedor del CRUD F010 anterior. */
  private async storeExistingDocument(input: Parameters<RundDocumentStorageService['store']>[0]): Promise<StoredRundDocument> {
    const normalize = (value: string) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'sin-clasificar';
    const folder = `${normalize(input.documentNumber || 'sin-documento')}/${normalize(input.category)}/${this.requireSegment(input.logicalId)}`;
    if (!Number.isSafeInteger(input.version) || input.version < 1) throw new BadRequestException('Versión documental inválida.');
    const fileName = `v${input.version}.pdf`;
    if (this.provider === 'LOCAL') {
      this.assertLocalStorageAllowed();
      const storagePath = `rund-documentos/${folder}/${fileName}`;
      const absolutePath = this.safeLocalPath(storagePath);
      await fs.mkdir(dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, input.content, { flag: 'wx' });
      return { provider: 'LOCAL', storageId: null, storagePath };
    }
    const storagePath = `/okm:root/RUND/${folder}/${fileName}`;
    await this.ensureOpenKmFolders(`/okm:root/RUND/${folder}`);
    const form = new FormData();
    form.append('docPath', storagePath);
    form.append('content', new Blob([new Uint8Array(input.content)], { type: 'application/pdf' }), fileName);
    const response = await this.openKmRequest('POST', '/services/rest/document/createSimple', form);
    await this.verifyReturnedPath(response, storagePath);
    return { provider: 'OPENKM', storageId: storagePath, storagePath };
  }

  private requireSegment(value: string): string {
    if (!/^[a-zA-Z0-9_-]+$/.test(value || '')) throw new BadRequestException('Identificador documental inválido.');
    return value;
  }

  private assertLocalStorageAllowed(): void {
    if (!this.localStorageAllowed) throw new ServiceUnavailableException('OpenKM es obligatorio en este ambiente y no está configurado.');
  }

  private safeLocalPath(relativePath: string): string {
    const target = resolve(this.uploadsRoot, relativePath.replace(/^[/\\]+/, ''));
    if (target !== this.uploadsRoot && !target.startsWith(`${this.uploadsRoot}${sep}`)) {
      throw new Error('Ruta documental no permitida.');
    }
    return target;
  }

  private async ensureOpenKmFolders(folderPath: string): Promise<void> {
    const parts = folderPath.split('/').filter(Boolean);
    let current = '';
    for (const part of parts) {
      current += `/${part}`;
      if (current === '/okm:root') continue;
      await this.ensureOpenKmFolder(current);
    }
  }

  private async ensureOpenKmFolder(path: string): Promise<void> {
    let response = await this.openKmRequest('POST', '/services/rest/folder/createSimple', path, 'application/json', true);
    if (!response.ok) {
      const body = await response.text();
      if (![409, 500].includes(response.status) || (response.status !== 409 && !/\bItemExistsException\b/.test(body))) {
        throw new ServiceUnavailableException('OpenKM no pudo crear la carpeta documental.');
      }
      // Un conflicto no prueba que exista una carpeta accesible en esa ruta.
      response = await this.openKmRequest('GET', `/services/rest/folder/getProperties?fldId=${encodeURIComponent(path)}`);
    }
    await this.verifyReturnedPath(response, path);
  }

  private async verifyReturnedPath(response: Response, path: string): Promise<void> {
    try {
      const metadata = await response.json();
      if (metadata?.path !== path) throw new Error();
    } catch { throw new ServiceUnavailableException('OpenKM no confirmó la ubicación solicitada.'); }
  }

  private async openKmRequest(
    method: string,
    endpoint: string,
    body?: BodyInit,
    contentType?: string,
    allowAlreadyExists = false,
    allowMissing = false,
  ): Promise<Response> {
    const baseUrl = this.openKmBaseUrl;
    if (!baseUrl) throw new ServiceUnavailableException('OpenKM no está configurado.');
    const username = String(process.env.OPENKM_USERNAME || '').trim();
    const password = String(process.env.OPENKM_PASSWORD || '');
    if (!username || !password) {
      throw new ServiceUnavailableException('Faltan las credenciales de OpenKM.');
    }

    const timeout = Number(process.env.OPENKM_TIMEOUT_MS || 15000);
    try {
      const url = new URL(baseUrl);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash
        || !Number.isInteger(timeout) || timeout < 1 || timeout > 60000) throw new Error();
    } catch { throw new ServiceUnavailableException('URL o tiempo de espera de OpenKM inválidos.'); }

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method,
        redirect: 'error',
        headers: {
          Accept: endpoint.startsWith('/services/rest/document/getContent?') ? 'application/octet-stream' : 'application/json',
          Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
          ...(contentType ? { 'Content-Type': contentType } : {}),
        },
        body,
        signal: AbortSignal.timeout(timeout),
      });
      // OpenKM CE usa GenericException (HTTP 500) también para rutas ausentes.
      if (allowMissing && response.status === 500 && /^PathNotFoundException:/.test((await response.clone().text()).trim())) {
        return new Response(null, { status: 404 });
      }
      if (!response.ok && !(allowAlreadyExists && response.status === 409) && !(allowMissing && response.status === 404)) {
        if (allowAlreadyExists) return response;
        throw new Error(`HTTP ${response.status}`);
      }
      return response;
    } catch (error: any) {
      this.logger.error(`Fallo de integración OpenKM ${method} ${endpoint.split('?')[0]}`);
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('No fue posible completar la operación en OpenKM.');
    }
  }
}
