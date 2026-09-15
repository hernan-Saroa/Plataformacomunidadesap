import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { StorageService } from './storage.service';

/**
 * Patrón Adrian Castro: factory simple sin Nest TestBed.
 * Las reglas se prueban directamente contra la instancia, mockeando
 * ConfigService.get() y capturando new S3Client() por jest.mock.
 */

// Antes de cualquier cosa, mockeamos el constructor de S3Client para
// capturar el config que recibe cada instancia (endpoint, region, creds).
jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation((cfg) => ({ config: cfg })),
    HeadBucketCommand: class { constructor(public p: any) {} },
    CreateBucketCommand: class { constructor(public p: any) {} },
    PutBucketPolicyCommand: class { constructor(public p: any) {} },
    PutObjectCommand: class { constructor(public p: any) {} },
    GetObjectCommand: class { constructor(public p: any) {} },
    NotFound: class NotFound extends Error { name = 'NotFound' },
  };
});

// Lo mismo con getSignedUrl (firma)
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest
    .fn()
    .mockResolvedValue('https://localhost:9100/bucket/obj?X-Amz-SignedHeaders=host'),
}));

const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

function configService(map: Record<string, string>) {
  return {
    get: (k: string, def?: string) => (map[k] !== undefined ? map[k] : def),
  } as ConfigService;
}

// ---------------------------------------------------------------------------
// 2 clientes S3 separados (fix SignatureDoesNotMatch)
// ---------------------------------------------------------------------------
describe('cliente I/O vs cliente SIGNER separados', () => {
  beforeEach(() => {
    (S3Client as unknown as jest.Mock).mockClear();
  });

  it('client endpoint = red compose interna minio:9000 (PutObject/HeadBucket)', () => {
    const cfg = configService({
      MINIO_ENDPOINT: 'minio',
      MINIO_PORT: '9000',
      MINIO_PUBLIC_HOST: 'localhost',
      MINIO_PUBLIC_PORT: '9100',
    });
    new StorageService(cfg);
    const [clienteInterno, signer] = (S3Client as unknown as jest.Mock).mock.instances;
    expect(clienteInterno.config.endpoint.toString()).toMatch(/minio:9000/);
    expect(signer.config.endpoint.toString()).toMatch(/localhost:9100/);
  });

  it('firma usa el signer (no el interno) para evitar SignatureDoesNotMatch', async () => {
    const cfg = configService({
      MINIO_ENDPOINT: 'minio',
      MINIO_PORT: '9000',
      MINIO_PUBLIC_HOST: 'localhost',
      MINIO_PUBLIC_PORT: '9100',
      MINIO_ACCESS_KEY: 'minioadmin',
      MINIO_SECRET_KEY: 'minioadmin123',
    });
    const svc = new StorageService(cfg);
    const [, signer] = (S3Client as unknown as jest.Mock).mock.instances;
    getSignedUrl.mockClear();
    getSignedUrl.mockResolvedValueOnce('https://localhost:9100/b/obj?signed=1');
    const res = await svc.subirArchivo({
      rutaObjeto: 'mantenimiento/2026/09/abc.png',
      buffer: Buffer.from('hi'),
      mimeType: 'image/png',
      nombrePublico: 'evidencia1.png',
    });
    expect(getSignedUrl).toHaveBeenCalledWith(
      signer,
      expect.any(Object),
      expect.objectContaining({ expiresIn: 60 * 60 * 24 * 7 }),
    );
    expect(res.urlPresigned).toMatch(/^https?:\/\/localhost:9100\//);
    expect(res.vencimientoPresigned.getTime()).toBeGreaterThan(
      Date.now() + 6 * 24 * 60 * 60 * 1000,
    );
  });
});

// ---------------------------------------------------------------------------
// URL pública build string
// ---------------------------------------------------------------------------
describe('urlPublica construida con el endpoint público', () => {
  it('concatena endpoint público / bucket / rutaObjeto encodeada', async () => {
    const cfg = configService({
      MINIO_ENDPOINT: 'minio',
      MINIO_PORT: '9000',
      MINIO_PUBLIC_HOST: 'storage.esap.local',
      MINIO_PUBLIC_PORT: '8080',
    });
    const svc = new StorageService(cfg);
    (svc as any).client = { send: jest.fn().mockResolvedValue({}) };
    getSignedUrl.mockResolvedValueOnce('https://storage.esap.local:8080/b/o?x=y');
    const res = await svc.subirArchivo({
      rutaObjeto: 'mantenimiento/2026/09/DOC #12.pdf',
      buffer: Buffer.from('x'),
    });
    expect(res.urlPublica).toBe(
      'http://storage.esap.local:8080/infraestructura-evidencias/mantenimiento/2026/09/DOC%20%2312.pdf',
    );
  });
});

// ---------------------------------------------------------------------------
// Bucket auto-create
// ---------------------------------------------------------------------------
describe('inicializarBucketDefault auto-crea bucket + policy read-only', () => {
  it('cuando HeadBucket retorna NotFound → CreateBucket + PutBucketPolicy', async () => {
    const cfg = configService({});
    const svc = new StorageService(cfg);
    const envios: any[] = [];
    (svc as any).client = {
      send: jest.fn(async (cmd: any) => {
        envios.push(cmd.constructor.name);
        if (cmd.constructor.name === 'HeadBucketCommand') {
          const err: any = new Error('no existe');
          err.name = 'NotFound';
          err.$metadata = { httpStatusCode: 404 };
          throw err;
        }
        return {};
      }),
    };
    await svc.inicializarBucketDefault();
    expect(envios).toEqual(['HeadBucketCommand', 'CreateBucketCommand', 'PutBucketPolicyCommand']);
  });

  it('cuando HeadBucket retorna 200 no vuelve a crear', async () => {
    const cfg = configService({});
    const svc = new StorageService(cfg);
    const envios: any[] = [];
    (svc as any).client = {
      send: jest.fn(async (cmd: any) => {
        envios.push(cmd.constructor.name);
        return {};
      }),
    };
    await svc.inicializarBucketDefault();
    expect(envios).toEqual(['HeadBucketCommand']);
  });
});

// ---------------------------------------------------------------------------
// Regenerar URL
// ---------------------------------------------------------------------------
describe('regenerarUrlPresigned vuelve a firmar con el signer público', () => {
  it('usa el bucket por defecto cuando no se envía y firma 7 días', async () => {
    const cfg = configService({});
    const svc = new StorageService(cfg);
    const [, signer] = (S3Client as unknown as jest.Mock).mock.instances;
    getSignedUrl.mockClear();
    getSignedUrl.mockResolvedValueOnce('https://localhost:9100/b/o?refreshed=1');
    const r = await svc.regenerarUrlPresigned('carpeta/x.pdf', undefined, 604800);
    expect(getSignedUrl).toHaveBeenCalledWith(
      signer,
      expect.any(Object),
      expect.objectContaining({ expiresIn: 604800 }),
    );
    expect(r.urlPresigned).toContain('refreshed=1');
  });
});
