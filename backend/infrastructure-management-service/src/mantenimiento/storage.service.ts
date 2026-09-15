import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  NotFound as S3NotFound,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly signer: S3Client;
  public readonly bucketDefault: string;
  public readonly endpointPublic: string;
  public readonly region: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'minio');
    const port = parseInt(this.config.get<string>('MINIO_PORT', '9000'), 10);
    const useSsl = this.config.get<string>('MINIO_USE_SSL', 'false').toLowerCase() === 'true';
    this.region = this.config.get<string>('MINIO_REGION', 'us-east-1');
    this.bucketDefault = this.config.get<string>(
      'MINIO_INFRAESTRUCTURA_BUCKET',
      'infraestructura-evidencias',
    );
    const accessKey = this.config.get<string>('MINIO_ACCESS_KEY', 'minioadmin');
    const secretKey = this.config.get<string>('MINIO_SECRET_KEY', 'minioadmin');
    const endpointProto = useSsl ? 'https' : 'http';
    const endpointBase = `${endpointProto}://${endpoint}:${port}`;
    // Cliente INTERNO: operaciones de IO (PutObject, HeadBucket, CreateBucket) dentro de red compose -> hostname minio:9000
    this.client = new S3Client({
      region: this.region,
      endpoint: endpointBase,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true,
    });
    // Para uso en navegador (red host local - localhost:9100 es el puerto mapeado de MinIO API)
    const publicHost = this.config.get<string>('MINIO_PUBLIC_HOST', 'localhost');
    const publicPort = parseInt(this.config.get<string>('MINIO_PUBLIC_PORT', '9100'), 10);
    this.endpointPublic = `${endpointProto}://${publicHost}:${publicPort}`;
    // Cliente SIGNER: exclusivo para getSignedUrl -> firma contra localhost:9100 PÚBLICO para que el Host final coincida con el request real del navegador.
    // (AWS S3 v4 signature incluye el header Host; si firmamos contra minio:9000 y luego reescribimos el host la firma NO cuadra = SignatureDoesNotMatch).
    this.signer = new S3Client({
      region: this.region,
      endpoint: this.endpointPublic,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true,
    });
    this.inicializarBucketDefault().catch((err) =>
      this.logger.warn('No se pudo inicializar bucket de evidencias: ' + (err as Error).message),
    );
  }

  async inicializarBucketDefault(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucketDefault }));
    } catch (err) {
      if (err instanceof S3NotFound || (err as any)?.name === 'NotFound' || (err as any)?.$metadata?.httpStatusCode === 404) {
        this.logger.log(`Bucket ${this.bucketDefault} no existe, creando...`);
        await this.client.send(
          new CreateBucketCommand({ Bucket: this.bucketDefault, ObjectLockEnabledForBucket: false }),
        );
        const policyRead = {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'AllowPublicReadForObjects',
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketDefault}/*`],
            },
          ],
        };
        try {
          await this.client.send(
            new PutBucketPolicyCommand({
              Bucket: this.bucketDefault,
              Policy: JSON.stringify(policyRead),
            }),
          );
          this.logger.log(`Bucket ${this.bucketDefault} creado y con policy read-only listo.`);
        } catch (policyErr) {
          this.logger.warn(
            `Bucket ${this.bucketDefault} creado, pero la policy no se pudo aplicar: ${(policyErr as Error).message}. Solo URLs pre-firmadas servirán.`,
          );
        }
      } else {
        throw err;
      }
    }
  }

  /**
   * Sube un archivo (buffer Multer) al bucket, retorna ruta objeto y URLs.
   * No guarda metadata en PostgreSQL — eso lo hace SolicitudEvidencia service.
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
    const expireSeconds = 60 * 60 * 24 * 7;
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: params.rutaObjeto,
        Body: params.buffer,
        ContentType: params.mimeType,
        ContentDisposition: params.nombrePublico
          ? `inline; filename*=UTF-8''${encodeURIComponent(params.nombrePublico)}`
          : undefined,
      }),
    );
    const urlPublica = `${this.endpointPublic}/${bucket}/${encodeURI(params.rutaObjeto.replace(/\/+/g, '/'))}`;
    const vencimientoPresigned = new Date(Date.now() + expireSeconds * 1000);
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: params.rutaObjeto });
    // Firmamos con el cliente PUBLICO (localhost:9100) para que el header Host del signature coincida EXACTAMENTE con el Host que el navegador enviara luego al dar clic.
    // Si firmamos con cliente interno (minio:9000) el host va minio:9000 en AWS4-HMAC-SHA256 -> SignatureDoesNotMatch cuando el navegador pide contra localhost:9100.
    const urlPresigned = await getSignedUrl(this.signer, cmd, { expiresIn: expireSeconds });
    return {
      rutaObjeto: params.rutaObjeto,
      bucket,
      urlPublica,
      urlPresigned,
      vencimientoPresigned,
    };
  }

  /**
   * Regenera URL pre-firmada actual (usada cuando la anterior ya venció).
   */
  async regenerarUrlPresigned(
    rutaObjeto: string,
    bucket?: string,
    expireSeconds = 604800,
  ): Promise<{ urlPresigned: string; vencimientoPresigned: Date }> {
    const bk = bucket ?? this.bucketDefault;
    const cmd = new GetObjectCommand({ Bucket: bk, Key: rutaObjeto });
    const urlPresigned = await getSignedUrl(this.signer, cmd, { expiresIn: expireSeconds });
    return {
      urlPresigned,
      vencimientoPresigned: new Date(Date.now() + expireSeconds * 1000),
    };
  }
}
