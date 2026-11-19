import { mkdtempSync, rmSync } from 'fs';
import { readdir, readFile, writeFile } from 'fs/promises';
import { createHash } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';

import { zipDePrueba } from './zip.prueba';

// El almacenamiento se fija al importar `archivos`: se apunta a una carpeta
// temporal antes de cargar el servicio.
const ALMACEN = mkdtempSync(join(tmpdir(), 'cargas-'));
process.env.HIRING_STORAGE_PATH = ALMACEN;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { CargasService, TAMANO_PARTE, VIDA_CARGA_MS, carpetaDeCarga } = require('./cargas.service');

const PROCESO = '11111111-1111-4111-8111-111111111111';
const ana = { userId: 'u-ana', userName: 'ana', roles: [] };
const otro = { userId: 'u-otro', userName: 'otro', roles: [] };

/** Lo que haría multer: deja la parte `n` en la carpeta de la carga. */
async function mandarParte(servicio: any, id: string, n: number, datos: Buffer, quien = ana) {
  const ruta = join(carpetaDeCarga(id), `parte-${n}`);
  await writeFile(ruta, datos);
  return servicio.recibirParte(PROCESO, '6.1', id, n, { path: ruta, size: datos.length }, quien);
}

/** Sube un archivo completo en partes del tamaño del servidor. */
async function subir(servicio: any, nombre: string, contenido: Buffer, tipo = 'application/zip') {
  const { id, partes } = await servicio.iniciar(PROCESO, '6.1', { nombre, tipo, tamano: contenido.length }, ana);
  for (let n = 0; n < partes; n++) {
    await mandarParte(servicio, id, n, contenido.subarray(n * TAMANO_PARTE, (n + 1) * TAMANO_PARTE));
  }
  return id as string;
}

describe('CargasService · cargas por partes (BUG-004)', () => {
  const servicio = new CargasService();
  afterAll(() => rmSync(ALMACEN, { recursive: true, force: true }));

  it('dice cuántas partes espera y rechaza lo que no admite la actividad', async () => {
    const r = await servicio.iniciar(PROCESO, '6.1', { nombre: 'o.zip', tipo: 'application/zip', tamano: TAMANO_PARTE * 2 + 1 }, ana);
    expect(r).toMatchObject({ partes: 3, tamanoParte: TAMANO_PARTE });

    await expect(
      servicio.iniciar(PROCESO, '6.1', { nombre: 'o.exe', tipo: 'application/x-msdownload', tamano: 10 }, ana),
    ).rejects.toThrow(/PDF, Word, Excel o un \.zip/);
    await expect(
      servicio.iniciar(PROCESO, '6.1', { nombre: 'o.zip', tipo: 'application/zip', tamano: 201 * 1024 * 1024 }, ana),
    ).rejects.toThrow(/máximo son 200 MB/);
  });

  it('un .zip sin tipo se reconoce por la extensión', async () => {
    const r = await servicio.iniciar(PROCESO, '6.1', { nombre: 'oferta.zip', tipo: '', tamano: 10 }, ana);
    expect(r.partes).toBe(1);
  });

  it('une las partes en orden, con el hash del archivo entero, y revisa el .zip', async () => {
    // Más de una parte: el contenido del .zip va relleno hasta pasar los 5 MB.
    const zip = zipDePrueba([{ nombre: 'propuesta.pdf', contenido: 'a'.repeat(TAMANO_PARTE + 1234) }]);
    const id = await subir(servicio, 'oferta empresa 4.zip', zip);

    const r = await servicio.completar(PROCESO, '6.1', id, ana);
    expect(r).toMatchObject({ nombre: 'oferta empresa 4.zip', tamano: zip.length, archivos: 1 });

    const tomada = await servicio.tomar(PROCESO, '6.1', id, ana);
    const final = await readFile(join(ALMACEN, tomada.archivo.filename));
    expect(final.equals(zip)).toBe(true);
    expect(tomada.hash).toBe(createHash('sha256').update(zip).digest('hex'));
    expect(tomada.archivo).toMatchObject({ originalname: 'oferta empresa 4.zip', mimetype: 'application/zip' });

    // Las partes ya no están: solo la ficha, hasta que la oferta se registre.
    expect(await readdir(carpetaDeCarga(id))).toEqual(['meta.json']);
    await servicio.consumir(id);
    await expect(servicio.tomar(PROCESO, '6.1', id, ana)).rejects.toThrow(/no existe o ya venció/);
  });

  it('una parte cortada se descarta para volver a mandarla, y sin todas no se completa', async () => {
    const contenido = Buffer.alloc(TAMANO_PARTE + 10, 1);
    const { id } = await servicio.iniciar(PROCESO, '6.1', { nombre: 'o.pdf', tipo: 'application/pdf', tamano: contenido.length }, ana);

    await expect(mandarParte(servicio, id, 0, Buffer.alloc(100))).rejects.toThrow(/incompleta/);
    await expect(servicio.completar(PROCESO, '6.1', id, ana)).rejects.toThrow(/Faltan 2 de 2 partes/);

    // Reintentar la misma parte la reemplaza, no la duplica.
    await mandarParte(servicio, id, 0, contenido.subarray(0, TAMANO_PARTE));
    await mandarParte(servicio, id, 0, contenido.subarray(0, TAMANO_PARTE));
    await mandarParte(servicio, id, 1, contenido.subarray(TAMANO_PARTE));
    const r = await servicio.completar(PROCESO, '6.1', id, ana);
    expect(r).toMatchObject({ tamano: contenido.length, archivos: null });
  });

  it('un .zip con ejecutable se rechaza al completar y no deja nada en disco', async () => {
    const zip = zipDePrueba([{ nombre: 'instalar.bat' }]);
    const id = await subir(servicio, 'oferta.zip', zip);
    const antes = await readdir(ALMACEN);

    await expect(servicio.completar(PROCESO, '6.1', id, ana)).rejects.toThrow(/ejecutable/);
    expect(await readdir(ALMACEN)).toEqual(antes);
  });

  it('la carga es de quien la empezó', async () => {
    const id = await subir(servicio, 'o.zip', zipDePrueba([{ nombre: 'a.pdf' }]));
    await expect(servicio.completar(PROCESO, '6.1', id, otro)).rejects.toThrow(/otra persona/);
    await expect(servicio.tomar(PROCESO, '6.1', id, ana)).rejects.toThrow(/todavía no terminó/);
  });

  it('borra las cargas de más de un día que nadie usó, con su archivo', async () => {
    const id = await subir(servicio, 'vieja.zip', zipDePrueba([{ nombre: 'a.pdf' }]));
    const { archivo } = await servicio.completar(PROCESO, '6.1', id, ana).then(() => servicio.tomar(PROCESO, '6.1', id, ana));

    expect(await servicio.limpiarVencidas(Date.now())).toBe(0);
    expect(await servicio.limpiarVencidas(Date.now() + VIDA_CARGA_MS + 1000)).toBeGreaterThanOrEqual(1);
    expect((await readdir(ALMACEN)).includes(archivo.filename)).toBe(false);
  });
});
