import { MAX_BYTES_ADJUNTO, MIME_DOCUMENTOS, MIME_ZIP, opcionesDeCarga } from './archivos';

/** La revisión de QA de la 6.1 (EFDS-1155): 50 MB y ofertas en .zip. */
describe('opcionesDeCarga', () => {
  const filtrar = (mimes: string[], file: { mimetype: string; originalname: string }) =>
    new Promise<boolean>((resolve) =>
      opcionesDeCarga(mimes, 'formato').fileFilter(null, file, (error: any, ok: boolean) =>
        resolve(!error && ok),
      ),
    );

  it('admite adjuntos de hasta 50 MB', () => {
    expect(opcionesDeCarga(MIME_DOCUMENTOS, 'formato').limits.fileSize).toBe(50 * 1024 * 1024);
    expect(MAX_BYTES_ADJUNTO).toBe(50 * 1024 * 1024);
  });

  it('acepta el .zip donde la actividad lo admite, con el tipo que mande el navegador', async () => {
    const conZip = [...MIME_DOCUMENTOS, ...MIME_ZIP];

    await expect(filtrar(conZip, { mimetype: 'application/zip', originalname: 'o.zip' })).resolves.toBe(true);
    await expect(
      filtrar(conZip, { mimetype: 'application/x-zip-compressed', originalname: 'o.zip' }),
    ).resolves.toBe(true);
    await expect(
      filtrar(conZip, { mimetype: 'application/octet-stream', originalname: 'Oferta.ZIP' }),
    ).resolves.toBe(true);
  });

  it('no deja pasar un binario cualquiera ni un .zip donde no se admite', async () => {
    const conZip = [...MIME_DOCUMENTOS, ...MIME_ZIP];

    await expect(
      filtrar(conZip, { mimetype: 'application/octet-stream', originalname: 'programa.exe' }),
    ).resolves.toBe(false);
    await expect(
      filtrar(MIME_DOCUMENTOS, { mimetype: 'application/zip', originalname: 'o.zip' }),
    ).resolves.toBe(false);
    await expect(
      filtrar(MIME_DOCUMENTOS, { mimetype: 'application/octet-stream', originalname: 'o.zip' }),
    ).resolves.toBe(false);
  });
});
