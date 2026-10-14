import { randomUUID } from 'crypto';
import crypto from 'crypto';
import * as fs from 'fs';
import { join, resolve, sep } from 'path';
import { isVersionableLocalUrl, readCarpetaOriginal, storeCarpetaOriginal } from './carpeta-document-storage';

describe('almacenamiento del historial Auth', () => {
  let directory: string;
  const persona = randomUUID();
  beforeEach(() => {
    const parent = resolve(__dirname, '../../../../tmp'); fs.mkdirSync(parent, { recursive: true });
    directory = fs.mkdtempSync(join(parent, 'auth-version-storage-'));
    jest.spyOn(process, 'cwd').mockReturnValue(directory);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    const parent = resolve(__dirname, '../../../../tmp');
    if (resolve(directory).startsWith(parent + sep)) fs.rmSync(directory, { recursive: true, force: true });
  });
  it('un fallo después de escribir bytes limpia el archivo nuevo, conserva el anterior y cierra el descriptor', async () => {
    const dest = join(directory, 'uploads/carpeta-digital', persona); fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(join(dest, 'anterior.pdf'), 'ANTERIOR');
    const open = fs.promises.open.bind(fs.promises);
    let close: jest.SpyInstance;
    jest.spyOn(fs.promises, 'open').mockImplementation(async (...args: Parameters<typeof fs.promises.open>) => {
      const handle = await open(...args), write = handle.writeFile.bind(handle);
      close = jest.spyOn(handle, 'close');
      jest.spyOn(handle, 'writeFile').mockImplementation(async () => { await write(Buffer.from('PARCIAL')); throw new Error('Fallo de disco ficticio'); });
      return handle;
    });
    await expect(storeCarpetaOriginal(persona, { originalname: 'Nuevo.pdf', buffer: Buffer.from('NUEVO') })).rejects.toThrow('Fallo de disco ficticio');
    expect(fs.readdirSync(dest)).toEqual(['anterior.pdf']); expect(fs.readFileSync(join(dest, 'anterior.pdf'), 'utf8')).toBe('ANTERIOR');
    expect(close!).toHaveBeenCalled();
  });
  it('una colisión al abrir con wx conserva el archivo existente', async () => {
    const uuid = randomUUID(), dest = join(directory, 'uploads/carpeta-digital', persona);
    fs.mkdirSync(dest, { recursive: true }); fs.writeFileSync(join(dest, uuid + '.pdf'), 'CONSERVAR');
    jest.spyOn(crypto, 'randomUUID').mockReturnValue(uuid);
    await expect(storeCarpetaOriginal(persona, { originalname: 'Nuevo.pdf', buffer: Buffer.from('NUEVO') })).rejects.toThrow();
    expect(fs.readFileSync(join(dest, uuid + '.pdf'), 'utf8')).toBe('CONSERVAR');
  });
  it('rechaza rutas ajenas o codificadas y no crea directorios con una identidad inválida', async () => {
    expect(isVersionableLocalUrl('/pta/api/v1/uploads/doc.pdf')).toBe(false);
    expect(isVersionableLocalUrl(`/auth/api/v1/uploads/carpeta-digital/${persona}/%2e%2e.pdf`)).toBe(false);
    await expect(readCarpetaOriginal('/auth/api/v1/uploads/carpeta-digital/../../secreto.pdf')).rejects.toThrow();
    await expect(storeCarpetaOriginal('../../fuera', { originalname: 'Archivo.pdf', buffer: Buffer.from('NUEVO') })).rejects.toThrow();
    expect(fs.existsSync(join(directory, 'uploads'))).toBe(false);
  });
});
