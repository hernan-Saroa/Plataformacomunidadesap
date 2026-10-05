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
const { FilesController, disposicionConNombre } = require('./files.controller');

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

/**
 * Una base que responde a la consulta del nombre original.
 *
 * Las filas se buscan por el final de `archivo_url`, así que basta con mirar
 * qué tabla preguntan y con qué sufijo.
 */
function baseCon(filas: { documentos?: Record<string, string>; plantillas?: Record<string, any> }) {
  return {
    query: async (sql: string, [sufijo]: [string]) => {
      const enDisco = sufijo.replace('%/', '');
      if (sql.includes('hiring.documentos')) {
        const nombre = filas.documentos?.[enDisco];
        return nombre ? [{ nombre }] : [];
      }
      const plantilla = filas.plantillas?.[enDisco];
      return plantilla ? [plantilla] : [];
    },
  };
}

describe('FilesController', () => {
  const controlador = new FilesController(
    baseCon({
      documentos: { 'a1b2c3.pdf': 'Resolución de apertura — 2026.pdf' },
      plantillas: { 'd4e5f6.docx': { codigo: 'BS-FO-047', nombre: 'Estudio previo', version: '2' } },
    }),
  );

  beforeAll(() => {
    writeFileSync(join(almacen, 'a1b2c3.pdf'), '%PDF-1.4');
    writeFileSync(join(almacen, 'd4e5f6.docx'), 'PK');
  });

  it('sirve el documento para verlo, no para bajarlo', async () => {
    const res = respuesta();
    await controlador.descargar('a1b2c3.pdf', res);

    expect(res.cabeceras['Content-Disposition']).toContain('inline');
    // Sin el tipo, el visor recibe un blob que el navegador no sabe pintar y
    // el marco queda en blanco como si el documento no existiera.
    expect(res.cabeceras['Content-Type']).toBe('application/pdf');
  });

  it('lo baja cuando se lo piden', async () => {
    const res = respuesta();
    await controlador.descargar('a1b2c3.pdf', res, '1');

    expect(res.cabeceras['Content-Disposition']).toContain('attachment');
  });

  it('declara el tipo de los formatos de Office', async () => {
    const res = respuesta();
    await controlador.descargar('d4e5f6.docx', res);

    expect(res.cabeceras['Content-Type']).toContain('wordprocessingml');
  });

  it('no deja salir del directorio de almacenamiento', async () => {
    // El nombre viene de la URL: un `../` leería cualquier archivo del host.
    await expect(controlador.descargar('../secreto.env', respuesta())).rejects.toThrow();
  });

  it('no confirma que exista lo que no está', async () => {
    await expect(controlador.descargar('nohay.pdf', respuesta())).rejects.toThrow();
  });

  it('a una pestaña le explica que el archivo ya no está, en vez del JSON', async () => {
    // Los enlaces abren la descarga en pestaña nueva: el JSON crudo dejaba una
    // pantalla negra cuando el archivo se perdía del disco (QA sin volumen).
    const enviado: { estado?: number; tipo?: string; cuerpo?: string } = {};
    const res: any = {
      status: (estado: number) => ((enviado.estado = estado), res),
      type: (tipo: string) => ((enviado.tipo = tipo), res),
      send: (cuerpo: string) => ((enviado.cuerpo = cuerpo), res),
    };
    const pestaña: any = { accepts: () => 'html' };

    await controlador.descargar('nohay.pdf', res, undefined, pestaña);

    expect(enviado.estado).toBe(404);
    expect(enviado.tipo).toBe('html');
    expect(enviado.cuerpo).toContain('El documento no está disponible');
  });

  it('al visor le sigue respondiendo el 404 en JSON', async () => {
    const visor: any = { accepts: () => 'json' };
    await expect(controlador.descargar('nohay.pdf', respuesta(), undefined, visor)).rejects.toThrow(
      'Documento no encontrado',
    );
  });

  /*
   * En disco cada archivo es un hexadecimal aleatorio, y ese era el nombre que
   * proponía la descarga: quien bajaba lo que acababa de subir recibía
   * «3befe4c0f8cc46bb1ab59ec4f340c8c9.pdf».
   */
  it('descarga con el nombre con el que se subió', async () => {
    const res = respuesta();
    await controlador.descargar('a1b2c3.pdf', res, '1');

    const cabecera = res.cabeceras['Content-Disposition'];
    expect(cabecera).not.toContain('a1b2c3');
    expect(cabecera).toContain(
      `filename*=UTF-8''${encodeURIComponent('Resolución de apertura — 2026.pdf')}`,
    );
    // Para los navegadores que solo leen `filename`, sin tildes ni rayas.
    expect(cabecera).toContain('filename="Resolucion de apertura _ 2026.pdf"');
  });

  it('nombra la plantilla por su código, nombre y versión', async () => {
    const res = respuesta();
    await controlador.descargar('d4e5f6.docx', res, '1');

    expect(res.cabeceras['Content-Disposition']).toContain(
      'filename="BS-FO-047 Estudio previo v2.docx"',
    );
  });

  it('deja el nombre de disco si ninguna fila reclama el archivo', async () => {
    const huerfano = new FilesController(baseCon({}));
    const res = respuesta();
    await huerfano.descargar('a1b2c3.pdf', res, '1');

    expect(res.cabeceras['Content-Disposition']).toContain('filename="a1b2c3.pdf"');
  });

  it('no deja que el nombre rompa la cabecera', () => {
    const salto = String.fromCharCode(13, 10);
    const cabecera = disposicionConNombre('attachment', `acta "final"${salto}(1).pdf`);
    expect(cabecera).toContain('filename="acta final(1).pdf"');
    expect(cabecera).toContain("filename*=UTF-8''acta%20final%281%29.pdf");
  });
});
