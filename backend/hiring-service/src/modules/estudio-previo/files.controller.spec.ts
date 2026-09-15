import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Cómo se sirve un documento del expediente (EFDS-1183).
 *
 * Hasta ahora salía siempre como `attachment` y sin `Content-Type`, y con eso
 * la única forma de mirar un soporte era bajarlo al disco: el abogado que
 * revisa un estudio previo con cuatro anexos hacía cuatro descargas para
 * leerlos, y el expediente electrónico acababa sirviendo de armario.
 *
 * El directorio se crea aquí y la clase se importa después: `STORAGE_PATH` se
 * resuelve al cargar el módulo, así que fijar la variable más tarde no llegaría
 * a tiempo.
 */
const almacen = mkdtempSync(join(tmpdir(), 'hiring-files-'));
process.env.HIRING_STORAGE_PATH = almacen;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { FilesController } = require('./files.controller');

/** Un `Response` que solo recuerda lo que le pusieron. */
function respuesta() {
  const cabeceras: Record<string, string> = {};
  return {
    cabeceras,
    setHeader: (clave: string, valor: string) => {
      cabeceras[clave] = valor;
    },
    // `pipe` escribe aquí; el contenido no importa para estas pruebas.
    on: () => undefined,
    once: () => undefined,
    emit: () => undefined,
    write: () => true,
    end: () => undefined,
  } as any;
}

describe('FilesController', () => {
  const controlador = new FilesController();

  beforeAll(() => {
    writeFileSync(join(almacen, 'a1b2c3.pdf'), '%PDF-1.4');
    writeFileSync(join(almacen, 'd4e5f6.docx'), 'PK');
  });

  it('sirve el documento para verlo, no para bajarlo', () => {
    const res = respuesta();
    controlador.descargar('a1b2c3.pdf', res);

    expect(res.cabeceras['Content-Disposition']).toContain('inline');
    // Sin el tipo, el visor recibe un blob que el navegador no sabe pintar y
    // el marco queda en blanco como si el documento no existiera.
    expect(res.cabeceras['Content-Type']).toBe('application/pdf');
  });

  it('lo baja cuando se lo piden', () => {
    const res = respuesta();
    controlador.descargar('a1b2c3.pdf', res, '1');

    expect(res.cabeceras['Content-Disposition']).toContain('attachment');
  });

  it('declara el tipo de los formatos de Office', () => {
    const res = respuesta();
    controlador.descargar('d4e5f6.docx', res);

    expect(res.cabeceras['Content-Type']).toContain('wordprocessingml');
  });

  it('no deja salir del directorio de almacenamiento', () => {
    // El nombre viene de la URL: un `../` leería cualquier archivo del host.
    expect(() => controlador.descargar('../secreto.env', respuesta())).toThrow();
  });

  it('no confirma que exista lo que no está', () => {
    expect(() => controlador.descargar('nohay.pdf', respuesta())).toThrow();
  });
});
