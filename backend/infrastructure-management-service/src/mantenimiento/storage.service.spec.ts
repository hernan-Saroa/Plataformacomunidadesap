import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import * as fs from 'fs';
import { join } from 'path';

function configService(map: Record<string, string>) {
  return {
    get: (k: string, def?: string) => (map[k] !== undefined ? map[k] : def),
  } as ConfigService;
}

describe('StorageService - Almacenamiento local en disco (uploads/)', () => {
  const testUploadsDir = join(process.cwd(), 'uploads_test_' + Date.now());

  afterAll(() => {
    try {
      if (fs.existsSync(testUploadsDir)) {
        fs.rmSync(testUploadsDir, { recursive: true, force: true });
      }
    } catch {}
  });

  it('inicializa directorio uploads y subcarpeta mantenimiento automáticamente', async () => {
    const cfg = configService({
      PORT: '3014',
      APP_PUBLIC_URL: 'http://localhost:3014',
      UPLOADS_DIR: testUploadsDir,
    });
    const svc = new StorageService(cfg);
    await svc.inicializarBucketDefault();

    expect(fs.existsSync(testUploadsDir)).toBe(true);
    expect(fs.existsSync(join(testUploadsDir, 'mantenimiento'))).toBe(true);
  });

  it('guarda archivo en disco y retorna metadata compatible con solicitud_evidencia', async () => {
    const cfg = configService({
      PORT: '3014',
      APP_PUBLIC_URL: 'http://localhost:3014',
      UPLOADS_DIR: testUploadsDir,
    });
    const svc = new StorageService(cfg);

    const buffer = Buffer.from('contenido de prueba evidencia');
    const res = await svc.subirArchivo({
      rutaObjeto: 'mantenimiento/2026/09/foto-test.txt',
      buffer,
      mimeType: 'text/plain',
      nombrePublico: 'foto-test.txt',
    });

    expect(res.rutaObjeto).toBe('mantenimiento/2026/09/foto-test.txt');
    expect(res.bucket).toBe('infraestructura-evidencias');
    expect(res.urlPublica).toContain('/uploads/mantenimiento/2026/09/foto-test.txt');
    expect(res.urlPresigned).toBe(res.urlPublica);
    expect(res.vencimientoPresigned).toBeInstanceOf(Date);

    // Verificar que existe físicamente en disco
    const rutaFisica = join(testUploadsDir, 'mantenimiento/2026/09/foto-test.txt');
    expect(fs.existsSync(rutaFisica)).toBe(true);
    expect(fs.readFileSync(rutaFisica, 'utf-8')).toBe('contenido de prueba evidencia');
  });

  it('regenerarUrlPresigned retorna URL estática permanente', async () => {
    const cfg = configService({
      PORT: '3014',
      APP_PUBLIC_URL: 'http://localhost:3014',
      UPLOADS_DIR: testUploadsDir,
    });
    const svc = new StorageService(cfg);

    const re = await svc.regenerarUrlPresigned('mantenimiento/2026/09/foto-test.txt');
    expect(re.urlPresigned).toContain('/uploads/mantenimiento/2026/09/foto-test.txt');
    expect(re.vencimientoPresigned.getTime()).toBeGreaterThan(Date.now());
  });

  it('obtenerStream y existeArchivo funcionan con archivos existentes y no existentes', async () => {
    const cfg = configService({
      PORT: '3014',
      APP_PUBLIC_URL: 'http://localhost:3014',
      UPLOADS_DIR: testUploadsDir,
    });
    const svc = new StorageService(cfg);

    expect(svc.existeArchivo('mantenimiento/2026/09/foto-test.txt')).toBe(true);
    expect(svc.existeArchivo('archivo_inexistente.bin')).toBe(false);

    const stream = svc.obtenerStream('mantenimiento/2026/09/foto-test.txt');
    expect(stream).toBeDefined();
    await new Promise<void>((resolve) => {
      stream.on('data', () => {});
      stream.on('end', resolve);
      stream.on('error', () => resolve());
    });
  });
});
