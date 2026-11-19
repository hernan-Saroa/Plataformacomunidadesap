import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { revisarZip } from './zip';
import { zipDePrueba } from './zip.prueba';

describe('revisarZip (BUG-004)', () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'zip-'));
  });
  afterAll(() => rm(dir, { recursive: true, force: true }));

  const revisar = async (contenido: Buffer) => {
    const ruta = join(dir, `${Math.random()}.zip`);
    await writeFile(ruta, contenido);
    return revisarZip(ruta);
  };

  it('acepta un .zip sano y cuenta sus documentos', async () => {
    const r = await revisar(zipDePrueba([{ nombre: 'propuesta.pdf' }, { nombre: 'anexos/rut.pdf' }]));
    expect(r).toEqual({ problema: null, archivos: 2 });
  });

  it('rechaza el que viene con contraseña', async () => {
    const r = await revisar(zipDePrueba([{ nombre: 'propuesta.pdf', cifrada: true }]));
    expect(r.problema).toMatch(/protegido con contraseña/);
  });

  it('rechaza el que trae un ejecutable', async () => {
    const r = await revisar(zipDePrueba([{ nombre: 'propuesta.pdf' }, { nombre: 'abrir.EXE' }]));
    expect(r.problema).toMatch(/ejecutable.*abrir\.EXE/);
  });

  it('rechaza el que llegó cortado o no es un .zip', async () => {
    const sano = zipDePrueba([{ nombre: 'propuesta.pdf' }]);
    expect((await revisar(sano.subarray(0, sano.length - 10))).problema).toMatch(/no es un \.zip válido|cortado/);
    expect((await revisar(Buffer.from('%PDF-1.7 esto no es un zip'))).problema).toMatch(/no es un \.zip válido/);
  });

  it('rechaza el vacío', async () => {
    expect((await revisar(zipDePrueba([]))).problema).toMatch(/no trae ningún documento/);
  });
});
